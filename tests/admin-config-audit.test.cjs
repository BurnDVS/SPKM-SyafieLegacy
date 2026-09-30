const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const test = require('node:test');
const code = fs.readFileSync('Code.js', 'utf8');
const portal = fs.readFileSync('portal.html', 'utf8');

function harness() {
  const tables = new Map(), events = [];
  let role = 'ADMIN', actor = 'server@example.test', lockHook = () => {}, writeHook = () => {}, flushHook = () => {}, released = 0;
  function sheet(name, rows = []) {
    return { rows, getLastRow: () => rows.length, getLastColumn: () => Math.max(0, ...rows.map(row => row.length)),
      getDataRange: () => ({ getValues: () => rows, getFormulas: () => [] }),
      getRange(r, c, n = 1, w = 1) {
        return { setNumberFormat(value) { assert.equal(value, '@'); },
          getValues: () => Array.from({ length: n }, (_, i) => Array.from({ length: w }, (_, j) => (rows[r - 1 + i] || [])[c - 1 + j] ?? '')),
          setValues(values) {
            writeHook(name, r, values);
            values.forEach((row, i) => { rows[r - 1 + i] ||= []; row.forEach((value, j) => { rows[r - 1 + i][c - 1 + j] = value; }); });
            events.push({ name, r, values: JSON.parse(JSON.stringify(values)) });
          }
        };
      }
    };
  }
  const db = { getSheetByName: name => tables.get(name) || null,
    insertSheet(name) { assert.ok(['Config', 'MonthConfig', 'AdminConfigAudit'].includes(name)); const result = sheet(name); tables.set(name, result); return result; } };
  const ctx = vm.createContext({ Logger: { log() {} }, PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    SpreadsheetApp: { flush: () => flushHook() },
    LockService: { getScriptLock: () => ({ tryLock() { lockHook(); return true; }, releaseLock() { released++; } }) },
    Utilities: { getUuid: crypto.randomUUID, formatDate: (_d, _z, format) => format === 'yyyy' ? '2026' : format === 'yyyy-MM' ? '2026-09' : format === 'yyyy-MM-dd' ? '2026-09-30' : '2026-09-30 13:00:00' } });
  vm.runInContext(code, ctx);
  ctx.getEbayarMasterSpreadsheet_ = () => db;
  ctx.getPaymentsRowsV2_ = () => ({ rows: [] });
  ctx.validateToken = (token, options) => {
    assert.equal(options.revalidateStaff, true);
    return token === 'valid' && role ? { valid: true, user: { role, email: actor, nama: 'Server Admin' } } : { valid: false };
  };
  const payload = { token: 'valid', request_id: 'request-0001', year: 2028, reason: 'Pelancaran tahun',
    _authActor: { email: 'forged@example.test', nama: 'Attacker', role: 'ADMIN' }, email: 'forged@example.test', role: 'ADMIN', otp: 'secret-otp', session: 'secret-session', mykid: 'secret-mykid' };
  return { ctx, payload, tables, events, sheet,
    audit: () => ctx.readAdminConfigAudit_().records, configWrites: () => events.filter(e => e.name !== 'AdminConfigAudit'),
    role(value) { role = value; }, actor(value) { actor = value; }, lock(value) { lockHook = value; },
    write(value) { writeHook = value; }, flush(value) { flushHook = value; }, released: () => released };
}

test('year create writes PENDING before config and SUCCESS after verification; actor is server-owned', () => {
  const h = harness(); const result = h.ctx.createEbayarYear(h.payload);
  assert.equal(result.success, true, JSON.stringify(result)); assert.equal(result.outcome, 'SUCCESS');
  const record = h.audit()[0];
  assert.equal(record.ACTOR_EMAIL, 'server@example.test'); assert.equal(record.ACTOR_NAME, 'Server Admin'); assert.equal(record.ACTOR_ROLE, 'ADMIN');
  assert.equal(record.BEFORE_JSON, 'null');
  assert.deepEqual(JSON.parse(record.AFTER_JSON), { year: 2028, status: 'ACTIVE', mode: 'NATIVE', startMonth: 1, endMonth: 12 });
  const pending = h.events.findIndex(e => e.name === 'AdminConfigAudit' && e.values[0][11] === 'PENDING');
  const config = h.events.findIndex(e => e.name === 'Config');
  const success = h.events.findIndex(e => e.name === 'AdminConfigAudit' && e.values[0][11] === 'SUCCESS');
  assert.ok(pending < config && config < success); assert.equal(h.released(), 1);
  assert.doesNotMatch(JSON.stringify(record), /forged|secret-|token|otp|session|mykid|mykad|student/i);
});

test('year update has correct before/after and immutable create audit', () => {
  const h = harness(); h.ctx.createEbayarYear(h.payload);
  const result = h.ctx.updateEbayarYear({ ...h.payload, request_id: 'request-0002', status: 'INACTIVE', reason: 'Tangguh' });
  assert.equal(result.success, true);
  const record = h.audit()[1]; assert.equal(record.ACTION, 'UPDATE_EBAYAR_YEAR');
  assert.equal(JSON.parse(record.BEFORE_JSON).status, 'ACTIVE'); assert.equal(JSON.parse(record.AFTER_JSON).status, 'INACTIVE');
  assert.equal(JSON.parse(h.audit()[0].AFTER_JSON).status, 'ACTIVE');
});

test('month block/unblock capture effective default, revision and server metadata', () => {
  const h = harness(); const payload = { ...h.payload, bulanKey: '2026-09', paymentPolicy: 'BLOCKED', revision: 0, reason: 'Semakan bank' };
  const blocked = h.ctx.updateEbayarMonthPolicy(payload); assert.equal(blocked.success, true, JSON.stringify(blocked));
  const record = h.audit()[0]; assert.equal(record.ACTION, 'UPDATE_EBAYAR_MONTH_POLICY'); assert.equal(record.TARGET_TYPE, 'MONTH');
  assert.deepEqual(JSON.parse(record.BEFORE_JSON), { bulanKey: '2026-09', paymentPolicy: 'AUTO', reason: '', revision: 0 });
  const after = JSON.parse(record.AFTER_JSON); assert.equal(after.revision, 1); assert.equal(after.updatedBy, 'server@example.test'); assert.equal(after.reason, 'Semakan bank');
  assert.equal(h.ctx.updateEbayarMonthPolicy({ ...payload, request_id: 'request-0002', paymentPolicy: 'AUTO', reason: '', revision: 1 }).success, true);
  assert.equal(JSON.parse(h.audit()[1].BEFORE_JSON).paymentPolicy, 'BLOCKED'); assert.equal(JSON.parse(h.audit()[1].AFTER_JSON).revision, 2);
});

for (const kind of ['year', 'month']) test('same request ID reuses SUCCESS without config writes: ' + kind, () => {
  const h = harness();
  const fn = kind === 'year' ? h.ctx.createEbayarYear : h.ctx.updateEbayarMonthPolicy;
  const payload = kind === 'year' ? h.payload : { ...h.payload, bulanKey: '2026-09', paymentPolicy: 'BLOCKED', reason: 'Semakan bank', revision: 0 };
  const first = fn(payload); const count = h.configWrites().length;
  const second = fn(payload);
  assert.equal(second.success, true); assert.equal(second.reused, true); assert.equal(first.auditId, second.auditId);
  assert.equal(h.audit().length, 1); assert.equal(h.configWrites().length, count);
});

for (const kind of ['year', 'reason', 'action', 'actor', 'month revision']) test('conflicting request ID rejects: ' + kind, () => {
  const h = harness(); h.ctx.createEbayarYear(h.payload);
  let payload = { ...h.payload }, fn = h.ctx.createEbayarYear;
  if (kind === 'year') payload.year = 2029;
  if (kind === 'reason') payload.reason = 'Khác';
  if (kind === 'action') { fn = h.ctx.updateEbayarYear; payload.status = 'INACTIVE'; }
  if (kind === 'actor') h.actor('other@example.test');
  if (kind === 'month revision') {
    payload = { ...h.payload, request_id: 'month-0001', bulanKey: '2026-09', paymentPolicy: 'BLOCKED', reason: 'Semakan', revision: 0 };
    h.ctx.updateEbayarMonthPolicy(payload); payload.revision = 1; fn = h.ctx.updateEbayarMonthPolicy;
  }
  const count = h.configWrites().length; const result = fn(payload);
  assert.equal(result.success, false); assert.equal(result.errorCode, 'REQUEST_ID_CONFLICT'); assert.equal(h.configWrites().length, count);
});

test('request ID generated for old clients and invalid IDs reject without writes', () => {
  const h = harness(); const result = h.ctx.createEbayarYear({ ...h.payload, request_id: undefined });
  assert.match(result.requestId, /^[a-f0-9-]{36}$/); assert.equal(h.audit()[0].REQUEST_ID, result.requestId);
  for (const request_id of ['short', '=formula123', 'x'.repeat(81), 123, {}, 'request with spaces']) {
    const invalid = harness(); assert.equal(invalid.ctx.createEbayarYear({ ...invalid.payload, request_id }).errorCode, 'REQUEST_ID_INVALID'); assert.equal(invalid.events.length, 0);
  }
});

test('valid request IDs resembling object property names dedupe normally', () => {
  const h = harness();
  assert.equal(h.ctx.createEbayarYear({ ...h.payload, request_id: 'constructor' }).success, true);
  assert.equal(h.ctx.createEbayarYear({ ...h.payload, request_id: 'constructor' }).reused, true);
});

test('formula reasons are rejected before writes', () => {
  const h = harness();
  assert.equal(h.ctx.createEbayarYear({ ...h.payload, reason: '=IMPORTXML("secret")' }).success, false);
  assert.equal(h.events.length, 0);
});

test('verified SUCCESS stays SUCCESS when refreshing the management response fails', () => {
  const h = harness(); h.ctx.getEbayarYearManagementCore_ = () => { throw new Error('Read unavailable'); };
  const result = h.ctx.createEbayarYear(h.payload);
  assert.equal(result.success, true); assert.equal(result.outcome, 'SUCCESS'); assert.equal(result.refreshRequired, true);
  assert.equal(h.audit()[0].OUTCOME, 'SUCCESS');
});

test('non Admin, expired and missing token reject without audit writes; role revoked after lock rejects', () => {
  for (const token of ['', 'expired']) { const h = harness(); assert.equal(h.ctx.createEbayarYear({ ...h.payload, token }).success, false); assert.equal(h.events.length, 0); }
  const h = harness(); h.role('GURU'); assert.equal(h.ctx.createEbayarYear(h.payload).success, false); assert.equal(h.events.length, 0);
  h.role('ADMIN'); h.lock(() => h.role('GURU')); assert.equal(h.ctx.createEbayarYear(h.payload).success, false); assert.equal(h.events.length, 0); assert.equal(h.released(), 1);
});

test('FAILED before config write is durable and cannot be retried with same ID', () => {
  const h = harness(); h.ctx.createEbayarYear(h.payload); const count = h.configWrites().length;
  const duplicate = { ...h.payload, request_id: 'request-0002' };
  const result = h.ctx.createEbayarYear(duplicate);
  assert.equal(result.outcome, 'FAILED'); assert.equal(h.audit()[1].OUTCOME, 'FAILED'); assert.equal(h.configWrites().length, count);
  const reused = h.ctx.createEbayarYear(duplicate); assert.equal(reused.reused, true); assert.equal(reused.outcome, 'FAILED'); assert.equal(h.audit().length, 2);
});

test('stale month revision records FAILED without config change', () => {
  const h = harness(); const payload = { ...h.payload, bulanKey: '2026-09', paymentPolicy: 'BLOCKED', reason: 'Semakan', revision: 0 };
  h.ctx.updateEbayarMonthPolicy(payload); const count = h.configWrites().length;
  const result = h.ctx.updateEbayarMonthPolicy({ ...payload, request_id: 'request-0002' });
  assert.equal(result.outcome, 'FAILED'); assert.equal(h.configWrites().length, count); assert.equal(JSON.parse(h.audit()[1].BEFORE_JSON).revision, 1);
});

for (const kind of ['year', 'month']) test('failed read-back records UNCERTAIN and reuse never writes: ' + kind, () => {
  const h = harness(); const payload = kind === 'year' ? h.payload : { ...h.payload, bulanKey: '2026-09', paymentPolicy: 'BLOCKED', reason: 'Semakan', revision: 0 };
  const fn = kind === 'year' ? h.ctx.createEbayarYear : h.ctx.updateEbayarMonthPolicy;
  h.flush(() => { const sheet = h.tables.get(kind === 'year' ? 'Config' : 'MonthConfig'); if (sheet && sheet.rows[1]) sheet.rows[1][kind === 'year' ? 1 : 3] = kind === 'year' ? 'INACTIVE' : 99; });
  const result = fn(payload); assert.equal(result.outcome, 'UNCERTAIN'); assert.equal(result.uncertainOutcome, true); assert.equal(h.audit()[0].OUTCOME, 'UNCERTAIN');
  const count = h.configWrites().length; assert.equal(fn(payload).reused, true); assert.equal(h.configWrites().length, count);
});

test('audit failure before PENDING verification prevents all config writes', () => {
  const h = harness(); h.write((name, row) => { if (name === 'AdminConfigAudit' && row === 2) throw new Error('Audit unavailable'); });
  const result = h.ctx.createEbayarYear(h.payload); assert.equal(result.success, false); assert.equal(result.errorCode, 'AUDIT_UNAVAILABLE'); assert.equal(h.configWrites().length, 0);
});

test('audit finalize failure leaves PENDING; repeated request does not execute again', () => {
  const h = harness(); h.write((name, _row, values) => { if (name === 'AdminConfigAudit' && ['SUCCESS', 'UNCERTAIN'].includes(values[0][11])) throw new Error('Cannot finalize'); });
  const result = h.ctx.createEbayarYear(h.payload); assert.equal(result.outcome, 'UNCERTAIN'); assert.equal(result.errorCode, 'AUDIT_FINALIZE_UNVERIFIED');
  assert.equal(h.audit()[0].OUTCOME, 'PENDING'); const count = h.configWrites().length;
  const reused = h.ctx.createEbayarYear(h.payload); assert.equal(reused.outcome, 'PENDING'); assert.equal(reused.reused, true); assert.equal(h.configWrites().length, count);
});

test('read API is Admin-only, latest first, filtered and limited', () => {
  const h = harness();
  h.ctx.createEbayarYear(h.payload);
  h.ctx.updateEbayarYear({ ...h.payload, request_id: 'request-0002', status: 'INACTIVE' });
  h.ctx.updateEbayarMonthPolicy({ ...h.payload, request_id: 'request-0003', bulanKey: '2026-09', paymentPolicy: 'BLOCKED', reason: 'Semakan', revision: 0 });
  assert.equal(h.ctx.getAdminConfigAudit({ token: 'valid', limit: 1 }).records[0].TARGET_TYPE, 'MONTH');
  assert.equal(h.ctx.getAdminConfigAudit({ token: 'valid', targetType: 'YEAR', targetKey: '2028', outcome: 'SUCCESS' }).records.length, 2);
  assert.equal(h.ctx.getAdminConfigAudit({ token: 'valid', outcome: 'FAILED' }).records.length, 0);
  h.role('GURU'); assert.equal(h.ctx.getAdminConfigAudit({ token: 'valid' }).success, false);
  h.role('ADMIN'); assert.equal(h.ctx.getAdminConfigAudit({ token: '' }).success, false);
});

test('invalid audit filters and limits reject; absent tab remains read-only', () => {
  const h = harness(); assert.equal(h.ctx.getAdminConfigAudit({ token: 'valid' }).records.length, 0); assert.equal(h.events.length, 0);
  for (const filter of [{ limit: 0 }, { limit: 101 }, { limit: '10' }, { limit: 1.5 }, { targetType: 'PAYMENT' }, { targetKey: '2026-13' }, { outcome: 'OPEN' }]) assert.equal(h.ctx.getAdminConfigAudit({ token: 'valid', ...filter }).success, false);
});

test('corrupted audit schema or snapshot fails closed without exposing secret fields', () => {
  const h = harness(); h.ctx.createEbayarYear(h.payload);
  h.tables.get('AdminConfigAudit').rows[1][9] = JSON.stringify({ token: 'secret-token' });
  const response = h.ctx.getAdminConfigAudit({ token: 'valid' }); assert.equal(response.success, false); assert.doesNotMatch(JSON.stringify(response), /secret-token/);
  assert.equal(h.ctx.createEbayarYear({ ...h.payload, request_id: 'request-0002', year: 2029 }).success, false);
  assert.equal(h.configWrites().length, 2);
});

test('2026 protection and future rules reject without config mutation', () => {
  const h = harness();
  assert.equal(h.ctx.createEbayarYear({ ...h.payload, year: 2027 }).success, false);
  assert.equal(h.ctx.updateEbayarYear({ ...h.payload, year: 2026, status: 'INACTIVE' }).success, false);
  assert.equal(h.configWrites().length, 0);
});

test('audit UI is hidden for non Admin, token sent, text rendering and read-only actions', () => {
  assert.match(portal, /id="adminConfigAuditPanel" style="display:none/);
  assert.match(portal, /auditButton\.style\.display = isAdmin \? '' : 'none'/);
  assert.match(portal, /if \(!isAdmin && auditPanel\)/);
  const body = portal.slice(portal.indexOf('  async function loadAdminConfigAudit()'), portal.indexOf('  function getEbayarMonthAdminToken_()'));
  assert.match(body, /currentRole !== 'ADMIN'/);
  assert.match(body, /'getAdminConfigAudit', \{ token: _spkm_st\.getItem\('spkm_token'\), limit: 50 \}/);
  assert.match(body, /summary\.textContent/); assert.match(body, /isEbayarYearAdminSessionCurrent_/);
  assert.doesNotMatch(body, /innerHTML|createEbayarYear|updateEbayar|delete|\.setValues/);
  assert.match(portal, /request_id: makeAdminConfigRequestId_\(\)/);
  assert.match(portal, /payload\.request_id = makeAdminConfigRequestId_\(\)/);
});

function portalFunction(name) {
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
function uiHarness(request, role = 'ADMIN', token = 'valid') {
  function element() { return { style: { display: 'none' }, children: [], textContent: '', disabled: false,
    replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); }, setAttribute() {} }; }
  const ids = Object.fromEntries(['adminConfigAuditPanel', 'adminConfigAuditMessage', 'adminConfigAuditList', 'btnAdminConfigAudit', 'btnRefreshAdminConfigAudit'].map(id => [id, element()]));
  const calls = [];
  const ctx = vm.createContext({ loggedInGuru: true, currentRole: role,
    document: { getElementById: id => ids[id], createElement: element }, _spkm_st: { getItem: () => token },
    callGASPromise(action, payload) { calls.push({ action, payload }); return request(); },
    isEbayarYearAdminSessionCurrent_: t => t === token && ctx.currentRole === 'ADMIN' && ctx.loggedInGuru });
  vm.runInContext('let adminConfigAuditBusy=false;', ctx);
  vm.runInContext(portalFunction('loadAdminConfigAudit'), ctx);
  return { ctx, ids, calls };
}

test('audit UI refuses Guru/missing token and displays backend expiry errors', async () => {
  for (const [role, token] of [['GURU', 'valid'], ['ADMIN', '']]) {
    const h = uiHarness(() => Promise.resolve({ success: true, records: [] }), role, token);
    await h.ctx.loadAdminConfigAudit(); assert.equal(h.calls.length, 0);
  }
  const h = uiHarness(() => Promise.resolve({ success: false, message: 'Token tamat tempoh' }));
  await h.ctx.loadAdminConfigAudit(); assert.match(h.ids.adminConfigAuditMessage.textContent, /tamat tempoh/);
});

test('audit UI sends token once while busy and renders literal read-only text', async () => {
  let resolve;
  const h = uiHarness(() => new Promise(done => { resolve = done; }));
  const pending = h.ctx.loadAdminConfigAudit();
  await h.ctx.loadAdminConfigAudit(); assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].action, 'getAdminConfigAudit'); assert.equal(h.calls[0].payload.token, 'valid'); assert.equal(h.calls[0].payload.limit, 50);
  assert.equal(h.ids.btnRefreshAdminConfigAudit.disabled, true);
  resolve({ success: true, records: [{ CREATED_AT: '2026-09-30', ACTOR_NAME: '<img src=x>', ACTOR_EMAIL: 'admin@example.test', ACTION: 'UPDATE_EBAYAR_YEAR', TARGET_TYPE: 'YEAR', TARGET_KEY: '2028', OUTCOME: 'SUCCESS', REASON: '<script>bad()</script>', REQUEST_ID: 'request-0001', ERROR_CODE: '' }] });
  await pending;
  const row = h.ids.adminConfigAuditList.children[0];
  assert.match(row.children[0].textContent, /<img src=x>/); assert.match(row.children[1].textContent, /<script>/);
  assert.equal(h.ids.btnRefreshAdminConfigAudit.disabled, false);
});

test('late audit response after logout cannot render Admin data', async () => {
  let resolve;
  const h = uiHarness(() => new Promise(done => { resolve = done; }));
  const pending = h.ctx.loadAdminConfigAudit(); h.ctx.loggedInGuru = false;
  resolve({ success: true, records: [{ ACTOR_EMAIL: 'private@example.test' }] }); await pending;
  assert.equal(h.ids.adminConfigAuditList.children.length, 0);
});
