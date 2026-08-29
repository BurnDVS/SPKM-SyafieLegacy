const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');
const portalSource = fs.readFileSync(path.join(repoRoot, 'portal.html'), 'utf8');
const backendSource = fs.readFileSync(path.join(repoRoot, 'Code.js'), 'utf8');

function extractFunction(source, name) {
  const match = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(source);
  assert.ok(match, 'Function not found: ' + name);
  const start = match.index;
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('Unterminated function: ' + name);
}

function makeConfirmContext(overrides = {}) {
  const elements = {
    ebayarV2SyncModal: {
      classList: { remove() {} },
      setAttribute() {}
    },
    ebayarV2SyncContinueBtn: { disabled: false },
    ebayarV2AutoSyncBtn: { disabled: false, textContent: 'Auto Sync', dataset: {} }
  };
  const results = [];
  const loading = [];
  const context = {
    Array,
    Promise,
    console,
    currentRole: 'ADMIN',
    loggedInGuru: 'Admin',
    ebayarV2MaintenanceData: { bulanKey: 'OGOS2026' },
    ebayarV2SyncBusy: false,
    ebayarV2SyncPreview: {
      selectedGroups: 2,
      selectedPaymentGroupIds: ['PG-2026-OGOS2026-48', 'PG-2026-OGOS2026-49']
    },
    document: { getElementById: id => elements[id] || null },
    setEbayarV2MaintenanceButtonLoading: (id, busy, text) => loading.push({ id, busy, text }),
    showEbayarV2MaintenanceResult: (message, isError) => results.push({ message, isError }),
    getEbayarV2SyncErrorMessage: (data, fallback) => (data && data.message) || fallback,
    closeEbayarV2SyncModal() {},
    formatEbayarV2Amount: value => 'RM ' + Number(value || 0).toFixed(2),
    loadEbayarV2MaintenanceStatus: async () => {},
    verifyCurrentMonthEbayarPanel: async () => {},
    ...overrides
  };
  context.__elements = elements;
  context.__results = results;
  context.__loading = loading;
  vm.createContext(context);
  vm.runInContext(extractFunction(portalSource, 'confirmEbayarV2AutoSync'), context);
  return context;
}

test('confirmed Auto Sync submits the exact preview IDs and refreshes status on success', async () => {
  const calls = [];
  let refreshes = 0;
  let verifications = 0;
  const context = makeConfirmContext({
    callGASPromise: async (action, payload, timeoutMs) => {
      calls.push({ action, payload, timeoutMs });
      return {
        success: true,
        mode: 'V2_CURRENT_MONTH_SYNC_GUARDED_WRITE',
        appendedGroups: 2,
        appendedChildRows: 3,
        appendedTotalAmount: 100
      };
    },
    loadEbayarV2MaintenanceStatus: async force => {
      assert.equal(force, true);
      refreshes += 1;
    },
    verifyCurrentMonthEbayarPanel: async () => { verifications += 1; }
  });

  await context.confirmEbayarV2AutoSync();

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    action: 'syncCurrentMonthEbayarV2',
    payload: {
      allowWrite: true,
      paymentGroupIds: ['PG-2026-OGOS2026-48', 'PG-2026-OGOS2026-49']
    },
    timeoutMs: 120000
  }]);
  assert.equal(refreshes, 1);
  assert.equal(verifications, 1);
  assert.match(context.__results.at(-1).message, /Sync berjaya/);
  assert.equal(context.ebayarV2SyncBusy, false);
  assert.equal(context.__elements.ebayarV2SyncContinueBtn.disabled, false);
  assert.equal(context.__loading.at(-1).busy, false);
});

test('backend failure message is displayed and loading always clears', async () => {
  const context = makeConfirmContext({
    callGASPromise: async () => ({ success: false, message: 'Batch preview sudah berubah.' })
  });

  await context.confirmEbayarV2AutoSync();

  assert.deepEqual(context.__results.at(-1), {
    message: 'Batch preview sudah berubah.',
    isError: true
  });
  assert.equal(context.ebayarV2SyncBusy, false);
  assert.equal(context.__elements.ebayarV2SyncContinueBtn.disabled, false);
  assert.equal(context.__loading.at(-1).busy, false);
});

test('transport rejection shows the no-retry warning and clears loading', async () => {
  const context = makeConfirmContext({
    callGASPromise: async () => { throw new Error('Bridge did not settle.'); }
  });

  await context.confirmEbayarV2AutoSync();

  assert.match(context.__results.at(-1).message, /Jangan cuba semula/);
  assert.equal(context.__results.at(-1).isError, true);
  assert.equal(context.ebayarV2SyncBusy, false);
  assert.equal(context.__elements.ebayarV2SyncContinueBtn.disabled, false);
  assert.equal(context.__loading.at(-1).busy, false);
});

test('duplicate confirmation clicks dispatch only one write request', async () => {
  let resolveRequest;
  let calls = 0;
  const context = makeConfirmContext({
    callGASPromise: () => {
      calls += 1;
      return new Promise(resolve => { resolveRequest = resolve; });
    }
  });

  const first = context.confirmEbayarV2AutoSync();
  const second = context.confirmEbayarV2AutoSync();
  assert.equal(calls, 1);
  resolveRequest({ success: false, message: 'Stopped for test.' });
  await Promise.all([first, second]);
  assert.equal(context.ebayarV2SyncBusy, false);
});

test('callGASPromise rejects an unresolved Apps Script bridge call after its timeout', async () => {
  let dispatches = 0;
  const runner = {
    withSuccessHandler() { return this; },
    withFailureHandler() { return this; },
    doAction() { dispatches += 1; }
  };
  const context = {
    Promise,
    Error,
    setTimeout,
    clearTimeout,
    _isGAS: true,
    _spkm_st: { getItem: () => 'token' },
    google: { script: { run: runner } }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(portalSource, 'callGASPromise'), context);

  await assert.rejects(
    context.callGASPromise('syncCurrentMonthEbayarV2', { allowWrite: true }, 10),
    error => error && error.code === 'GAS_REQUEST_TIMEOUT'
  );
  assert.equal(dispatches, 1);
});

test('backend write route requires and forwards the exact requested IDs', () => {
  const forwarded = [];
  const context = {
    Array,
    authorizeEbayarV2MaintenanceAdmin_: () => ({ valid: true }),
    getCurrentEbayarMonthMetaV2_: () => ({ success: true, bulanKey: 'OGOS2026' }),
    syncCurrentMonthEbayarV2Core_: (...args) => {
      forwarded.push(args);
      return { success: true };
    }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(backendSource, 'validateCurrentMonthSyncRequestedIdsV2_'), context);
  vm.runInContext(extractFunction(backendSource, 'syncCurrentMonthEbayarV2'), context);

  const ids = ['PG-2026-OGOS2026-48', 'PG-2026-OGOS2026-49'];
  assert.equal(context.syncCurrentMonthEbayarV2({ allowWrite: true }).success, false);
  assert.equal(context.syncCurrentMonthEbayarV2({ allowWrite: true, paymentGroupIds: ids }).success, true);
  assert.deepEqual(Array.from(forwarded[0][2]), ids);
  assert.equal(forwarded[0][1], true);
  assert.match(backendSource, /action === 'syncCurrentMonthEbayarV2'/);
});

test('backend rejects duplicate IDs and batches over 25 groups', () => {
  const context = { Array };
  vm.createContext(context);
  vm.runInContext(extractFunction(backendSource, 'validateCurrentMonthSyncRequestedIdsV2_'), context);

  const duplicate = context.validateCurrentMonthSyncRequestedIdsV2_(['PG-1', 'PG-1']);
  assert.equal(duplicate.success, false);
  assert.match(duplicate.message, /pendua/);

  const tooMany = context.validateCurrentMonthSyncRequestedIdsV2_(
    Array.from({ length: 26 }, (_, index) => 'PG-' + index)
  );
  assert.equal(tooMany.success, false);
  assert.match(tooMany.message, /maksimum 25/);
});
