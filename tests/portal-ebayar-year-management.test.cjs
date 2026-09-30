const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'portal.html'), 'utf8');

function extract(name) {
  const start = source.search(new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\('));
  assert.notEqual(start, -1, name);
  let depth = 0, quote = '', escaped = false;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unclosed ' + name);
}

function element(tag = 'div') {
  return {
    tag, children: [], style: { display: 'none' }, attributes: {}, disabled: false, textContent: '',
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelectorAll(tagName) {
      return this.children.flatMap(child => [
        ...(child.tag === tagName ? [child] : []), ...child.querySelectorAll(tagName)
      ]);
    }
  };
}

const configs = [
  { year: 2026, mode: 'MIXED', status: 'ACTIVE' },
  { year: 2027, mode: 'NATIVE', status: 'ACTIVE' },
  { year: 2028, mode: 'NATIVE', status: 'INACTIVE' }
];

function setup(options = {}) {
  const ids = {
    btnEbayarYears: element('button'), ebayarYearsAdmin: element(), ebayarYearsList: element(),
    btnCreateEbayarYear: element('button'), ebayarYearsMessage: element('p'),
    btnAdminConfigAudit: element('button'), adminConfigAuditPanel: element(),
    adminConfigAuditList: element(), adminConfigAuditMessage: element('p')
  };
  ids.btnCreateEbayarYear.disabled = true;
  ids.ebayarYearsAdmin.appendChild(ids.ebayarYearsList);
  ids.ebayarYearsAdmin.appendChild(ids.btnCreateEbayarYear);
  let token = options.token === undefined ? 'admin-token' : options.token;
  let promptValue = options.input === undefined ? '2029' : options.input;
  let promptCount = 0;
  const calls = [];
  const context = vm.createContext({
    currentRole: options.role || 'ADMIN', loggedInGuru: 'Admin',
    document: { getElementById: id => ids[id] || null, createElement: element },
    _spkm_st: { getItem: key => { assert.equal(key, 'spkm_token'); return token; } },
    window: { prompt() { promptCount++; return promptValue; } },
    getNativeEbayarMalaysiaDateParts: () => ({ dateKey: (options.year || 2026) + '-09-30' }),
    callGASPromise(action, payload, timeout) {
      calls.push({ action, payload: JSON.parse(JSON.stringify(payload)), timeout });
      return options.request ? options.request(action, payload) : Promise.resolve({ success: true, years: configs });
    }
  });
  vm.runInContext('let ebayarYearsBusy = false; let ebayarYearsLoaded = false;', context);
  for (const name of ['makeAdminConfigRequestId_', 'setLoginState', 'showEbayarYearsMessage', 'setEbayarYearsBusy',
    'getEbayarYearAdminToken_', 'isEbayarYearAdminSessionCurrent_', 'renderEbayarYearManagement',
    'loadEbayarYearManagement', 'saveEbayarYearAdmin_', 'createNewEbayarYear', 'updateEbayarYearAdmin']) {
    vm.runInContext(extract(name), context);
  }
  return { context, ids, calls, promptCount: () => promptCount,
    setInput(value) { promptValue = value; }, setToken(value) { token = value; } };
}

test('portal includes one hidden Admin year button and panel with status and disabled create control', () => {
  for (const id of ['btnEbayarYears', 'ebayarYearsAdmin', 'ebayarYearsList', 'btnCreateEbayarYear', 'ebayarYearsMessage']) {
    assert.equal((source.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, id);
  }
  assert.match(source, /id="btnEbayarYears"[^>]*style="display:none/);
  assert.match(source, /id="ebayarYearsAdmin"[^>]*style="display:none/);
  assert.match(source, /id="btnCreateEbayarYear"[^>]*disabled/);
  assert.match(source, /id="ebayarYearsMessage" role="status" aria-live="polite"/);
});

test('Admin sees entry; Guru/logout hide controls, clear list and cannot send actions', async () => {
  const h = setup();
  h.context.setLoginState(true);
  assert.equal(h.ids.btnEbayarYears.style.display, '');
  assert.equal(h.ids.btnAdminConfigAudit.style.display, '');
  h.ids.adminConfigAuditPanel.style.display = '';
  h.ids.adminConfigAuditList.appendChild(element());
  await h.context.loadEbayarYearManagement();
  assert.equal(h.ids.ebayarYearsAdmin.style.display, '');
  h.context.currentRole = 'GURU';
  h.context.setLoginState(true);
  assert.equal(h.ids.btnEbayarYears.style.display, 'none');
  assert.equal(h.ids.ebayarYearsAdmin.style.display, 'none');
  assert.equal(h.ids.btnAdminConfigAudit.style.display, 'none');
  assert.equal(h.ids.adminConfigAuditPanel.style.display, 'none');
  assert.equal(h.ids.adminConfigAuditList.children.length, 0);
  assert.equal(h.ids.ebayarYearsList.children.length, 0);
  await h.context.loadEbayarYearManagement();
  await h.context.createNewEbayarYear();
  await h.context.updateEbayarYearAdmin(2028, 'ACTIVE');
  assert.equal(h.calls.length, 1);
  h.context.currentRole = 'ADMIN';
  h.context.setLoginState(false);
  assert.equal(h.ids.btnEbayarYears.style.display, 'none');
});

test('list/create/update send explicit session tokens and preserve backend fields', async () => {
  const h = setup();
  await h.context.loadEbayarYearManagement();
  await h.context.createNewEbayarYear();
  await h.context.updateEbayarYearAdmin(2028, 'ACTIVE');
  await h.context.updateEbayarYearAdmin(2028, 'INACTIVE');
  h.calls.slice(1).forEach(call => assert.match(call.payload.request_id, /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/));
  assert.deepEqual(h.calls.map(call => [call.action, Object.fromEntries(Object.entries(call.payload).filter(([key]) => key !== 'request_id'))]), [
    ['getEbayarYearManagement', { token: 'admin-token' }],
    ['createEbayarYear', { token: 'admin-token', year: 2029 }],
    ['updateEbayarYear', { token: 'admin-token', year: 2028, status: 'ACTIVE' }],
    ['updateEbayarYear', { token: 'admin-token', year: 2028, status: 'INACTIVE' }]
  ]);
  assert.match(h.ids.ebayarYearsMessage.textContent, /dikemaskini/);
});

test('missing token rejects locally; expired session surfaces backend message without success', async () => {
  const missing = setup({ token: null });
  await missing.context.loadEbayarYearManagement();
  await missing.context.createNewEbayarYear();
  await missing.context.updateEbayarYearAdmin(2028, 'ACTIVE');
  assert.equal(missing.calls.length, 0);
  assert.match(missing.ids.ebayarYearsMessage.textContent, /Sesi Admin.*log masuk semula/);
  const expired = setup({ request: () => Promise.resolve({ success: false, message: 'Token tamat tempoh. Sila log masuk semula.' }) });
  await expired.context.loadEbayarYearManagement();
  assert.match(expired.ids.ebayarYearsMessage.textContent, /Token tamat tempoh/);
  assert.equal(expired.ids.btnCreateEbayarYear.disabled, true);
  assert.equal(expired.ids.btnEbayarYears.disabled, false);
});

test('create validates four-digit future years, minimum 2028, and prompt cancellation', async () => {
  const h = setup({ year: 2028 });
  await h.context.loadEbayarYearManagement();
  for (const input of ['2026', '2027', '2028', 'abc', '2029.0', '10000', '']) {
    h.setInput(input);
    await h.context.createNewEbayarYear();
    assert.match(h.ids.ebayarYearsMessage.textContent, /selepas tahun semasa.*2028/);
  }
  h.setInput(null);
  await h.context.createNewEbayarYear();
  assert.equal(h.calls.length, 1);
  h.setInput(' 2029 ');
  await h.context.createNewEbayarYear();
  assert.equal(h.calls.at(-1).payload.year, 2029);
  assert.match(h.ids.ebayarYearsMessage.textContent, /Native Januari–Disember/);
});

test('2026 never has toggle even with earlier client year; current/past years are protected', async () => {
  const h = setup({ year: 2025 });
  await h.context.loadEbayarYearManagement();
  assert.equal(h.ids.ebayarYearsList.children[0].querySelectorAll('button').length, 0);
  assert.match(h.ids.ebayarYearsList.children[0].children[0].textContent, /2026.*Dilindungi/);
  await h.context.updateEbayarYearAdmin(2026, 'INACTIVE');
  assert.equal(h.calls.length, 1);
  const current = setup({ year: 2028 });
  await current.context.loadEbayarYearManagement();
  assert.equal(current.ids.ebayarYearsList.querySelectorAll('button').length, 0);
  await current.context.updateEbayarYearAdmin(2028, 'INACTIVE');
  assert.equal(current.calls.length, 1);
});

test('list request disables controls and duplicate loading dispatches once', async () => {
  let resolve;
  const h = setup({ request: () => new Promise(done => { resolve = done; }) });
  const pending = h.context.loadEbayarYearManagement();
  assert.equal(h.ids.btnEbayarYears.disabled, true);
  assert.equal(h.ids.btnCreateEbayarYear.disabled, true);
  assert.equal(h.ids.ebayarYearsAdmin.attributes['aria-busy'], 'true');
  assert.match(h.ids.ebayarYearsMessage.textContent, /Memuatkan/);
  await h.context.loadEbayarYearManagement();
  assert.equal(h.calls.length, 1);
  resolve({ success: true, years: configs });
  await pending;
  assert.equal(h.ids.btnCreateEbayarYear.disabled, false);
  assert.equal(h.ids.ebayarYearsAdmin.attributes['aria-busy'], 'false');
});

for (const mutation of ['create', 'toggle']) {
  test(`${mutation} disables all controls, suppresses double-clicks, and restores them on success`, async () => {
    let resolve;
    const h = setup({ request: action => action === 'getEbayarYearManagement' ?
      Promise.resolve({ success: true, years: configs }) : new Promise(done => { resolve = done; }) });
    await h.context.loadEbayarYearManagement();
    const invoke = () => mutation === 'create' ? h.context.createNewEbayarYear() : h.context.updateEbayarYearAdmin(2028, 'ACTIVE');
    const pending = invoke();
    assert.equal(h.ids.btnCreateEbayarYear.disabled, true);
    assert.ok(h.ids.ebayarYearsList.querySelectorAll('button').every(button => button.disabled));
    assert.match(h.ids.ebayarYearsMessage.textContent, /Menyimpan/);
    await invoke();
    assert.equal(h.calls.length, 2);
    assert.equal(h.promptCount(), mutation === 'create' ? 1 : 0);
    resolve({ success: true, years: configs });
    await pending;
    assert.equal(h.ids.btnCreateEbayarYear.disabled, false);
    assert.ok(h.ids.ebayarYearsList.querySelectorAll('button').every(button => !button.disabled));
  });
}

test('uncertain mutation is never retried; only a successful fresh list unlocks writes', async () => {
  const h = setup({ request: action => action === 'getEbayarYearManagement' ?
    Promise.resolve({ success: true, years: configs }) : Promise.reject(new Error('Permintaan timeout')) });
  await h.context.loadEbayarYearManagement();
  await h.context.createNewEbayarYear();
  assert.equal(h.calls.length, 2);
  assert.match(h.ids.ebayarYearsMessage.textContent, /timeout.*Jangan ulang perubahan.*dimuat semula/);
  assert.equal(h.ids.btnCreateEbayarYear.disabled, true);
  assert.ok(h.ids.ebayarYearsList.querySelectorAll('button').every(button => button.disabled));
  assert.equal(h.ids.btnEbayarYears.disabled, false);
  await h.context.createNewEbayarYear();
  await h.context.updateEbayarYearAdmin(2028, 'ACTIVE');
  assert.equal(h.calls.length, 2);
  await h.context.loadEbayarYearManagement();
  assert.equal(h.calls.length, 3);
  assert.equal(h.ids.btnCreateEbayarYear.disabled, false);
});

test('mutation backend rejection preserves error and blocks further mutations', async () => {
  const h = setup({ request: action => Promise.resolve(action === 'getEbayarYearManagement' ?
    { success: true, years: configs } : { success: false, message: 'Tahun mempunyai sejarah bayaran.' }) });
  await h.context.loadEbayarYearManagement();
  await h.context.updateEbayarYearAdmin(2028, 'INACTIVE');
  assert.match(h.ids.ebayarYearsMessage.textContent, /Tahun mempunyai sejarah bayaran/);
  assert.equal(h.ids.btnCreateEbayarYear.disabled, true);
  assert.equal(h.ids.ebayarYearsMessage.style.color, 'var(--error)');
});

test('late list response after logout cannot redisplay Admin data', async () => {
  let resolve;
  const h = setup({ request: () => new Promise(done => { resolve = done; }) });
  const pending = h.context.loadEbayarYearManagement();
  h.context.loggedInGuru = null;
  h.setToken(null);
  h.context.setLoginState(false);
  resolve({ success: true, years: configs });
  await pending;
  assert.equal(h.ids.ebayarYearsAdmin.style.display, 'none');
  assert.equal(h.ids.ebayarYearsList.children.length, 0);
  assert.equal(h.ids.btnCreateEbayarYear.disabled, true);
});

test('all portal inline JavaScript parses', () => {
  for (const script of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (script[1].trim()) new vm.Script(script[1], { filename: 'portal.html' });
  }
});
