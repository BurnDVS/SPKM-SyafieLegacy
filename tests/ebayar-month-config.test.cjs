const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync('Code.js', 'utf8');
const portal = fs.readFileSync('portal.html', 'utf8');
function harness() {
  let rows = null, role = 'ADMIN', lockHook = () => {}, writes = 0, reads = 0, release = 0, formulas = [];
  const sheet = {
    getDataRange: () => ({ getValues: () => rows, getFormulas: () => formulas }), getLastColumn: () => Math.max(...rows.map(r => r.length)),
    getLastRow: () => rows.length,
    getRange: (r, c, n, w) => ({ setValues(values) { writes++; values.forEach((v, i) => { rows[r - 1 + i] = Array.from(v); }); } })
  };
  let auditRows = null;
  const auditSheet = { getLastRow: () => auditRows.length, getLastColumn: () => 14,
    getDataRange: () => ({ getValues: () => auditRows, getFormulas: () => [] }),
    getRange: r => ({ setNumberFormat() {}, setValues(values) { values.forEach((row, i) => { auditRows[r - 1 + i] = Array.from(row); }); } }) };
  const database = { getSheetByName(name) { reads++; return name === 'AdminConfigAudit' ? (auditRows ? auditSheet : null) : name === 'MonthConfig' && rows ? sheet : null; },
    insertSheet(name) { if (name === 'AdminConfigAudit') { auditRows = []; return auditSheet; } assert.equal(name, 'MonthConfig'); rows = []; return sheet; } };
  const ctx = vm.createContext({ PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'folder' }) },
    Logger: { log() {} }, SpreadsheetApp: { flush() {} },
    LockService: { getScriptLock: () => ({ tryLock() { lockHook(); return true; }, releaseLock() { release++; } }) },
    Utilities: { getUuid: require('node:crypto').randomUUID, formatDate: (_d, _z, format) => format === 'yyyy-MM' ? '2026-09' : '2026-09-30 13:00:00', base64Decode: () => [1, 2, 3] } });
  vm.runInContext(source, ctx);
  ctx.validateToken = (token, options) => {
    assert.equal(options.revalidateStaff, true);
    return token === 'valid' && role ? { valid: true, user: { role, email: 'server@example.test', nama: 'Server' } } : { valid: false };
  };
  ctx.getEbayarMasterSpreadsheet_ = () => database;
  ctx.getEbayarYearConfigs_ = () => ({ 2026: { year: 2026, status: 'ACTIVE', mode: 'MIXED', startMonth: 1, endMonth: 12 },
    2027: { year: 2027, status: 'ACTIVE', mode: 'NATIVE', startMonth: 1, endMonth: 12 } });
  ctx.getEbayarPortalModeState_ = () => ({ resolvedMode: 'NATIVE' });
  const payload = { token: 'valid', bulanKey: '2026-09', paymentPolicy: 'BLOCKED', reason: 'Semakan bank', revision: 0,
    _authActor: { email: 'forged@example.test', role: 'ADMIN' }, updatedBy: 'forged@example.test' };
  return { ctx, payload, setRows(v) { rows = v; }, rows: () => rows, writes: () => writes, reads: () => reads,
    role(v) { role = v; }, lock(v) { lockHook = v; }, release: () => release, setFormulas(v) { formulas = v; },
    validRows(policy = 'BLOCKED') { return [Array.from(ctx.EBAYAR_MONTH_CONFIG_HEADERS_), ['2026-09', policy, 'Semakan bank', 1, '2026-09-30 13:00:00', 'server@example.test']]; } };
}

test('missing MonthConfig defaults AUTO; calendar and routing are independent', () => {
  const h = harness();
  assert.equal(h.ctx.resolveEbayarPaymentPolicy_('2026-09').canPay, true);
  assert.equal(h.ctx.resolveEbayarPaymentPolicy_('2026-09').paymentPolicy, 'AUTO');
  assert.equal(h.ctx.resolveEbayarPaymentPolicy_('2027-01').canPay, false);
  assert.equal(h.ctx.getEbayarMonthConfig_('2026-08').routeType, 'LEGACY');
  assert.equal(h.ctx.getEbayarMonthConfig_('2026-09').state, 'OPEN');
  assert.equal(h.ctx.getEbayarMonthManagement({ token: 'valid' }).years[0].months[7].supported, false);
});

for (const policy of ['AUTO', 'BLOCKED']) test('valid policy ' + policy, () => {
  const h = harness(); h.setRows(h.validRows(policy));
  assert.equal(h.ctx.resolveEbayarPaymentPolicy_('2026-09').canPay, policy === 'AUTO');
});

for (const kind of ['schema', 'empty sheet', 'duplicate', 'policy', 'key', 'revision', 'reason', 'formula', 'evaluated formula', 'metadata', 'invalid metadata', 'extra column']) test('malformed config fails closed: ' + kind, () => {
  const h = harness(); const rows = h.validRows();
  if (kind === 'schema') rows[0][0] = 'MONTH';
  if (kind === 'empty sheet') rows.splice(0);
  if (kind === 'duplicate') rows.push([...rows[1]]);
  if (kind === 'policy') rows[1][1] = 'OPEN';
  if (kind === 'key') rows[1][0] = '2026-8';
  if (kind === 'revision') rows[1][3] = '1';
  if (kind === 'reason') rows[1][2] = ' ';
  if (kind === 'formula') rows[1][2] = '=IMPORTXML("x")';
  if (kind === 'evaluated formula') h.setFormulas([[], ['="2026-09"']]);
  if (kind === 'metadata') rows[1][5] = '';
  if (kind === 'invalid metadata') { rows[1][4] = 'invalid'; rows[1][5] = 'forged'; }
  if (kind === 'extra column') rows[0].push('EXTRA');
  h.setRows(rows);
  assert.throws(() => h.ctx.requireEbayarPaymentPolicy_('2026-09'));
  assert.equal(h.ctx.updateEbayarMonthPolicy(h.payload).success, false);
  assert.equal(h.writes(), 0);
  const publicResult = h.ctx.getPublicEbayarYears();
  assert.equal(publicResult.success, true);
  assert.equal(publicResult.years[0].months[8].canPay, false);
  assert.equal(publicResult.years[0].months[7].routeType, 'LEGACY');
});

test('Admin mutation ignores forged actor, verifies write and rejects stale revision', () => {
  const h = harness();
  assert.equal(h.ctx.updateEbayarMonthPolicy(h.payload).success, true);
  assert.equal(h.rows()[1][5], 'server@example.test');
  assert.equal(h.rows()[1][3], 1);
  const count = h.writes();
  assert.equal(h.ctx.updateEbayarMonthPolicy(h.payload).success, false);
  assert.equal(h.writes(), count);
  assert.equal(h.ctx.updateEbayarMonthPolicy({ ...h.payload, revision: 1, paymentPolicy: 'AUTO', reason: '' }).success, true);
  assert.equal(h.rows()[1][3], 2);
  assert.equal(h.ctx.requireEbayarPaymentPolicy_('2026-09').canPay, true);
});

test('non Admin and missing/expired token reject before config reads; revoked after lock rejects', () => {
  for (const token of ['', 'expired']) {
    const h = harness();
    assert.equal(h.ctx.updateEbayarMonthPolicy({ ...h.payload, token }).success, false);
    assert.equal(h.ctx.getEbayarMonthManagement({ token }).success, false);
    assert.equal(h.reads(), 0); assert.equal(h.writes(), 0);
  }
  const h = harness(); h.role('GURU');
  assert.equal(h.ctx.updateEbayarMonthPolicy(h.payload).success, false);
  assert.equal(h.reads(), 0);
  h.role('ADMIN'); h.lock(() => h.role('GURU'));
  assert.equal(h.ctx.updateEbayarMonthPolicy(h.payload).success, false);
  assert.equal(h.writes(), 0); assert.equal(h.release(), 1);
});

test('Legacy update is rejected and empty reason cannot block', () => {
  const h = harness();
  assert.equal(h.ctx.updateEbayarMonthPolicy({ ...h.payload, bulanKey: '2026-08' }).success, false);
  assert.equal(h.ctx.updateEbayarMonthPolicy({ ...h.payload, reason: '' }).success, false);
  assert.equal(h.writes(), 0);
});

test('read-back failure reports uncertain result without retry', () => {
  const h = harness();
  h.ctx.SpreadsheetApp.flush = () => { if (h.rows() && h.rows()[1]) h.rows()[1][3] = 99; };
  const result = h.ctx.updateEbayarMonthPolicy(h.payload);
  assert.equal(result.success, false); assert.equal(result.uncertainOutcome, true);
  assert.equal(h.writes(), 2); assert.match(result.message, /Jangan ulang/);
});

test('blocked lookup, preflight and submission stop before roster, slip or payment writes', () => {
  const h = harness(); h.setRows(h.validRows());
  h.ctx.normalizeYuranNameV2_ = value => value.toUpperCase();
  h.ctx.getNative2026EligibleDirectory_ = () => { throw new Error('roster must not be read'); };
  const payload = { bulanKey: '2026-09', keyword: 'TEST', students: [{ studentKey: 'KANAK:1', namaMurid: 'TEST' }] };
  assert.match(h.ctx.getNativeEbayarStudentLookup(payload).message, /Semakan bank/);
  assert.match(h.ctx.preflightNativeEbayarSubmission(payload).message, /Semakan bank/);
  assert.match(h.ctx.submitNativeEbayarPayment(payload).message, /Semakan bank/);
  assert.equal(h.writes(), 0);
});

test('submission rechecks policy after ScriptLock before any payment write', () => {
  const h = harness();
  h.ctx.getNative2026EligibleDirectory_ = () => ({ 'KANAK:132': { studentKey: 'KANAK:132', nama: 'ALI', studentType: 'KANAK' } });
  h.ctx.getPaymentsRowsV2_ = () => ({ rows: [] });
  h.ctx.Utilities.formatDate = (_d, _z, format) => format === 'yyyy-MM' ? '2026-09' : '2026-09-30';
  let validations = 0;
  const validate = h.ctx.validateNativeEbayarSubmissionV2_;
  h.ctx.validateNativeEbayarSubmissionV2_ = params => { validations++; return validate(params); };
  h.ctx.isNativeEbayarFileSignatureValidV2_ = () => true;
  h.lock(() => h.setRows(h.validRows()));
  const payload = { bulanKey: '2026-09', students: [{ studentKey: 'KANAK:132', namaMurid: 'ALI' }],
    tarikhBayaran: '2026-09-30', jumlahKeseluruhan: '30.00', fileSize: 3, mimeType: 'application/pdf', fileName: 'slip.pdf', fileDataBase64: 'AQID' };
  assert.equal(validate(payload).readyToSubmit, true, JSON.stringify(validate(payload)));
  const result = h.ctx.submitNativeEbayarPayment(payload);
  assert.equal(result.success, false); assert.match(result.message, /Semakan bank/);
  assert.equal(validations, 2); assert.equal(h.writes(), 0); assert.equal(h.release(), 1);
});

function uiFunction(name) {
  const start = portal.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  assert.notEqual(start, -1);
  let depth = 0, quote = '', escaped = false;
  for (let i = portal.indexOf('{', start); i < portal.length; i++) {
    const c = portal[i];
    if (quote) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return portal.slice(start, i + 1);
  }
  throw new Error(name);
}
function uiHarness(request, token = 'valid', role = 'ADMIN') {
  const controls = [{ id: 'btnReloadEbayarMonths' }, { id: 'ebayarMonthsYear' }, { id: 'toggle' }];
  const ids = Object.fromEntries(['ebayarMonthsMessage', 'ebayarMonthsAdmin', 'btnEbayarMonths', 'ebayarMonthsList'].map(id => [id, { style: {}, replaceChildren() {}, setAttribute() {}, querySelectorAll: () => controls }]));
  const calls = [];
  const ctx = vm.createContext({ loggedInGuru: true, currentRole: role,
    document: { getElementById: id => ids[id] }, _spkm_st: { getItem: () => token },
    window: { prompt: () => 'Semakan bank' }, callGASPromise(action, payload) { calls.push({ action, payload }); return request(); },
    isEbayarYearAdminSessionCurrent_: t => t === token && ctx.currentRole === 'ADMIN' });
  vm.runInContext('let ebayarMonthsBusy=false; let ebayarMonthsData={years:[]};', ctx);
  for (const name of ['makeAdminConfigRequestId_', 'getEbayarMonthAdminToken_', 'showEbayarMonthsMessage', 'setEbayarMonthsBusy', 'loadEbayarMonthManagement', 'updateEbayarMonthAdmin']) vm.runInContext(uiFunction(name), ctx);
  ctx.renderEbayarMonthManagement = data => { if (!data.success) throw new Error(data.message); vm.runInContext('ebayarMonthsData={years:[]}', ctx); };
  return { ctx, ids, calls, controls };
}

test('UI blocks concurrent mutation, sends token/revision, disables controls and requires reload after failure', async () => {
  let reject;
  const h = uiHarness(() => new Promise((_resolve, fail) => { reject = fail; }));
  const month = { supported: true, bulanKey: '2026-09', paymentPolicy: 'AUTO', revision: 4 };
  const pending = h.ctx.updateEbayarMonthAdmin(month);
  assert.ok(h.controls.every(control => control.disabled));
  await h.ctx.updateEbayarMonthAdmin(month);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].payload.token, 'valid'); assert.equal(h.calls[0].payload.revision, 4);
  reject(new Error('Timeout')); await pending;
  assert.equal(h.controls[0].disabled, false); assert.equal(h.controls[2].disabled, true);
  await h.ctx.updateEbayarMonthAdmin(month); assert.equal(h.calls.length, 1);
  assert.match(h.ids.ebayarMonthsMessage.textContent, /Jangan ulang/);
});

test('UI requires reason, refuses Guru/missing token, and reports expired session response', async () => {
  const month = { supported: true, bulanKey: '2026-09', paymentPolicy: 'AUTO', revision: 0 };
  const empty = uiHarness(() => Promise.resolve({ success: true })); empty.ctx.window.prompt = () => ' ';
  await empty.ctx.updateEbayarMonthAdmin(month); assert.equal(empty.calls.length, 0);
  for (const [token, role] of [['', 'ADMIN'], ['valid', 'GURU']]) {
    const h = uiHarness(() => Promise.resolve({ success: true }), token, role);
    await h.ctx.loadEbayarMonthManagement(); await h.ctx.updateEbayarMonthAdmin(month); assert.equal(h.calls.length, 0);
  }
  const expired = uiHarness(() => Promise.resolve({ success: false, message: 'Token tamat tempoh' }));
  await expired.ctx.loadEbayarMonthManagement(); assert.match(expired.ids.ebayarMonthsMessage.textContent, /tamat tempoh/);
  const good = uiHarness(() => Promise.resolve({ success: true }));
  await good.ctx.loadEbayarMonthManagement(); assert.equal(good.calls[0].payload.token, 'valid');
});

test('future AUTO remains rejected at lookup and submission validation', () => {
  const h = harness();
  const payload = { bulanKey: '2027-01', keyword: 'TEST', students: [{}] };
  assert.match(h.ctx.getNativeEbayarStudentLookup(payload).message, /akan datang/);
  assert.match(h.ctx.preflightNativeEbayarSubmission(payload).message, /akan datang/);
});

test('policy helper does not enter history, receipt, identity or cash paths', () => {
  const h = harness();
  for (const name of ['getYuranParent', 'getYuranParentV2', 'getEbayarStats', 'getYuranStatsV2', 'recordCash', 'getEbayarMonthConfig_', 'getEligibleYuranStudentsV2_']) {
    assert.doesNotMatch(h.ctx[name].toString(), /readEbayarMonthPolicies_|requireEbayarPaymentPolicy_/);
  }
  assert.ok(h.ctx.requireEbayarPaymentPolicy_);
  assert.match(source, /function readEbayarMonthPolicies_\(/);
});

test('Admin panel exists, token and revision sent; reason required, loading and no retry', () => {
  assert.match(portal, /id="ebayarMonthsAdmin" style="display:none/);
  assert.match(portal, /monthButton\.style\.display = isAdmin \? '' : 'none'/);
  assert.match(portal, /monthPanel\.style\.display = 'none'; ebayarMonthsData = null/);
  assert.match(portal, /'getEbayarMonthManagement', \{ token: _spkm_st\.getItem\('spkm_token'\)/);
  assert.match(portal, /'updateEbayarMonthPolicy', \{ token: _spkm_st\.getItem\('spkm_token'\)/);
  assert.match(portal, /revision: month\.revision/);
  assert.match(portal, /policy === 'BLOCKED' && !reason/);
  assert.match(portal, /control\.disabled = busy/);
  assert.match(portal, /if \(ebayarMonthsBusy \|\| !ebayarMonthsData/);
  assert.match(portal, /Jangan ulang perubahan; muat semula/);
});
