const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');
const waSource = fs.readFileSync(path.join(__dirname, '..', 'TestWA.js'), 'utf8');

function harness(role = 'ADMIN') {
  let now = Date.parse('2026-09-30T05:00:00Z');
  const properties = new Map();
  const writes = [];
  const businessReads = [];
  const staffRows = [[], []];
  const props = {
    getProperty: key => properties.get(key) || null,
    setProperty: (key, value) => properties.set(key, value),
    deleteProperty: key => properties.delete(key),
    getProperties: () => Object.fromEntries(properties)
  };
  function sheet(name, rows = []) {
    return {
      rows,
      getLastRow: () => rows.length,
      getLastColumn: () => Math.max(0, ...rows.map(row => row.length)),
      getDataRange: () => ({ getValues: () => rows }),
      setFrozenRows() {},
      appendRow(row) { writes.push(name); rows.push(row); },
      getRange(row, col, count = 1, width = 1) {
        return {
          getValues: () => Array.from({ length: count }, (_, i) =>
            Array.from({ length: width }, (_, j) => (rows[row - 1 + i] || [])[col - 1 + j] || '')),
          setValues(values) {
            writes.push(name);
            values.forEach((valuesRow, i) => {
              rows[row - 1 + i] ||= [];
              valuesRow.forEach((value, j) => { rows[row - 1 + i][col - 1 + j] = value; });
            });
          },
          setValue(value) { this.setValues([[value]]); }
        };
      }
    };
  }
  const tables = new Map();
  const database = {
    getSheetByName(name) {
      if (name === 'Maklumat Guru') return sheet(name, staffRows);
      businessReads.push(name);
      return tables.get(name) || null;
    },
    insertSheet(name) { writes.push(name); const value = sheet(name); tables.set(name, value); return value; },
    getId: () => 'MOCK_MASTER', getName: () => 'MOCK_MASTER'
  };
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const ctx = vm.createContext({
    Date: ClockDate,
    PropertiesService: { getScriptProperties: () => props },
    SpreadsheetApp: { openById: () => database, flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (algorithm, value) => [...crypto.createHash(algorithm).update(value).digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
      formatDate: (_date, _zone, format) => format === 'yyyy' ? '2026' :
        format === 'yyyy-MM' ? '2026-09' : format === 'yyyy-MM-dd' ? '2026-09-30' : '2026-09-30 13:00:00'
    },
    Logger: { log() {} },
    ScriptApp: {
      AuthMode: { FULL: 'FULL' }, EventType: { CLOCK: 'CLOCK', ON_FORM_SUBMIT: 'FORM' },
      getProjectTriggers: () => []
    }
  });
  vm.runInContext(source + '\n' + waSource, ctx);
  staffRows[1][ctx.COL_GURU.EMAIL] = 'admin@example.test';
  staffRows[1][ctx.COL_GURU.NAMA] = 'Server Identity';
  staffRows[1][ctx.COL_GURU.ROLE] = role;
  const session = ctx.issueStaffSessionV2_({ email: 'admin@example.test', nama: 'Old Name', role }, now);
  ctx.getEbayarMasterSpreadsheet_ = () => database;
  // Notifications and scheduled setup are outside these unit tests; never send messages.
  ctx.simpanNotifikasi_ = () => {};
  ctx.setupBlastTrigger_ = () => {};
  return { ctx, session, writes, businessReads, tables, sheet, staffRows,
    expire() { now += ctx.STAFF_AUTH_V2_IDLE_MS_ + 1; } };
}

const handlerByAction = {
  syncForms: 'syncNamaMuridToAllForms', syncFormBulanIni: 'syncFormMinusBayar'
};
const adminActions = Array.from(harness().ctx.ADMIN_REQUIRED_ACTIONS);

for (const scenario of ['missing', 'expired', 'GURU', 'downgraded', 'removed', 'forged']) {
  test(`every direct Admin handler rejects ${scenario} before business reads or writes`, () => {
    for (const action of adminActions) {
      const h = harness(scenario === 'GURU' ? 'GURU' : 'ADMIN');
      if (scenario === 'expired') h.expire();
      if (scenario === 'downgraded') h.staffRows[1][h.ctx.COL_GURU.ROLE] = 'GURU';
      if (scenario === 'removed') h.staffRows.splice(1);
      const payload = {
        token: ['missing', 'forged'].includes(scenario) ? '' : h.session.token,
        year: 2028, status: 'ACTIVE', allowWrite: true, create: true,
        nama: 'TEST', jumlah: 30, tarikh: '2026-09-30', bulan: 'OGOS2026',
        mesejTemplate: 'TEST', muridList: [{ nama: 'TEST', telefon: '000' }],
        _authActor: { email: 'attacker@example.test', role: 'ADMIN' },
        adminEmail: 'attacker@example.test', role: 'ADMIN'
      };
      const result = h.ctx[handlerByAction[action] || action](payload);
      assert.equal(result.success, false, action);
      assert.equal(payload._authActor, null, action);
      assert.deepEqual(h.writes, [], action);
      assert.deepEqual(h.businessReads, [], action);
    }
  });
}

test('valid Admin replaces forged actor using live Session V2 identity', () => {
  const h = harness();
  const payload = { token: h.session.token, _authActor: { email: 'attacker@example.test', role: 'ADMIN' } };
  let received;
  h.ctx.getEbayarYearManagementCore_ = params => { received = params; return { success: true, years: [] }; };
  assert.equal(h.ctx.getEbayarYearManagement(payload).success, true);
  assert.equal(received._authActor.email, 'admin@example.test');
  assert.equal(received._authActor.nama, 'Server Identity');
  assert.equal(received._authActor.role, 'ADMIN');
});

test('valid Admin can directly create and update a year; 2026 remains protected', () => {
  const h = harness();
  const token = h.session.token;
  assert.equal(h.ctx.createEbayarYear({ token, year: 2028 }).success, true);
  assert.equal(h.ctx.getEbayarYearManagement({ token }).years.find(y => y.year === 2028).mode, 'NATIVE');
  assert.equal(h.ctx.updateEbayarYear({ token, year: 2028, status: 'INACTIVE' }).success, true);
  assert.equal(h.ctx.updateEbayarYear({ token, year: 2028, status: 'ACTIVE' }).success, true);
  const before = h.writes.length;
  assert.equal(h.ctx.createEbayarYear({ token, year: 2028 }).success, false);
  assert.equal(h.ctx.updateEbayarYear({ token, year: 2026, status: 'INACTIVE' }).success, false);
  assert.equal(h.writes.length, before);
});

test('valid Admin preserves cash, queue and master-schema writes', () => {
  for (const handler of ['recordCash', 'queueWABlast', 'ensureEbayarMasterSchemaV2']) {
    const h = harness();
    h.tables.set('OGOS2026', h.sheet('OGOS2026', [[]]));
    const result = h.ctx[handler]({ token: h.session.token, nama: 'TEST', jumlah: 30,
      tarikh: '2026-09-30', bulan: 'OGOS2026', mesejTemplate: 'TEST',
      muridList: [{ nama: 'TEST', telefon: '000' }] });
    assert.equal(result.success, true, handler + ': ' + result.message);
    assert.ok(h.writes.length > 0, handler);
  }
});

test('valid Admin sync endpoint delegates once; registration and trigger retain private core calls', () => {
  const h = harness();
  let calls = 0;
  h.ctx.syncNamaMuridToAllFormsCore_ = () => { calls++; return { success: true, updated: 12 }; };
  assert.equal(h.ctx.syncNamaMuridToAllForms({ token: h.session.token }).updated, 12);
  assert.equal(calls, 1);
  assert.match(source, /action === 'syncForms'[^\n]*syncNamaMuridToAllForms\(payload\)/);
  assert.match(source, /syncFormMinusBayarCore_\(\{ bulan: bulanKey \}\)/);
  assert.equal((source.match(/syncNamaMuridToAllFormsCore_\(\);/g) || []).length, 3);
});

test('all protected staff writes reject missing, expired and removed sessions while Guru role stays valid', () => {
  const handlers = ['attendance', 'uploadGuruGambar', 'updateGuru', 'updateStatusMurid', 'simpanKehadiran', 'simpanDeviceToken', 'getNotifikasi'];
  for (const name of handlers) {
    for (const scenario of ['missing', 'expired', 'removed']) {
      const h = harness('GURU');
      if (scenario === 'expired') h.expire();
      if (scenario === 'removed') h.staffRows.splice(1);
      assert.equal(h.ctx[name]({ token: scenario === 'missing' ? '' : h.session.token }).success, false, name);
      assert.deepEqual(h.writes, [], name);
      assert.deepEqual(h.businessReads, [], name);
    }
  }
  const h = harness('GURU');
  assert.equal(h.ctx.authorizePrivilegedHandler_({ token: h.session.token }, false).valid, true);
});

test('identity lookup failure fails closed and erases forged actor', () => {
  const h = harness();
  h.ctx.getCurrentStaffIdentity_ = () => { throw new Error('staff unavailable'); };
  const payload = { token: h.session.token, year: 2028, _authActor: { role: 'ADMIN' } };
  assert.equal(h.ctx.createEbayarYear(payload).success, false);
  assert.equal(payload._authActor, null);
  assert.deepEqual(h.writes, []);
});

// Model the documented Apps Script RPC boundary: underscore functions are private.
function rpc(ctx, name, payload) {
  if (name.endsWith('_') || typeof ctx[name] !== 'function') throw new Error('RPC unavailable');
  return ctx[name](payload);
}

test('writer, importer, setup, messaging and test helpers have no public RPC alias', () => {
  const h = harness();
  const helpers = [
    'generateSlipKanak', 'hantarEmailSlip', 'hantarWhatsApp', 'hantarFCM', 'simpanNotifikasi', 'getFCMAccessToken',
    'createTriggers', 'removeTriggers', 'setScriptProperties', 'setFonnteToken', 'createWhatsAppTriggers',
    'createCleanupTrigger', 'createEbayarTriggers', 'createKhatamTriggers', 'setupBlastTrigger', 'deleteBlastTrigger',
    'ensureLogPertukaranGuruSheet', 'ensureBlastQueueSheet', 'ensureDeviceTokensSheet', 'ensureNotifikasiSheet',
    'importJuly2026CatchupGuardedV2', 'importAugust2026CatchupGuardedV2', 'importEbayarPaymentsToMasterV2',
    'runJulyCatchupBatch2SafeV2', 'testSyncNamaMuridManual', 'testSyncFormManual', 'testSyncOgosManual',
    'testFonnteToken', 'testCreateNativeEbayarReceiptSlidesPreviewV2', 'testImportJuly2026CatchupBatch1WriteV2',
    'testImportJuly2026CatchupBatch2WriteV2', 'testImportAugust2026CatchupBatch1WriteV2',
    'testImportAugust2026CatchupBatch2WriteV2', 'testImportEbayarPayments2026SmallBatchV2',
    'testImportEbayarPayments2026NextBatchV2', 'testImportEbayarPayments2026NextBatch25V2',
    'testImportEbayarPayments2025NextBatch25V2', 'testRegisterKanak', 'testRegisterDewasa',
    'testAttendance', 'testGenerateSlip', 'testLogin', 'testLoginDirect', 'testRequestStaffLoginOtpV2', 'testWA'
  ];
  for (const name of helpers) {
    assert.equal(typeof h.ctx[name], 'undefined', name);
    assert.equal(typeof h.ctx[name + '_'], 'function', name);
    assert.throws(() => rpc(h.ctx, name, { allowWrite: true }), /RPC unavailable/);
    assert.throws(() => rpc(h.ctx, name + '_', { allowWrite: true }), /RPC unavailable/);
  }
  for (const name of ['writeEbayarYearConfig_', 'syncCurrentMonthEbayarV2Core_', 'setupStudentUidInfrastructure_',
    'syncNamaMuridToAllFormsCore_', 'syncFormMinusBayarCore_', 'cleanupExpiredPropertiesCore_']) {
    assert.throws(() => rpc(h.ctx, name, { allowWrite: true }), /RPC unavailable/);
  }
  assert.deepEqual(h.writes, []);
});

test('installed trigger names reject missing and forged events without writes', () => {
  const h = harness();
  for (const name of ['onNewRowKanak', 'onEbayarSubmit', 'onKhatamSubmit', 'notifikasiKetidakhadiran',
    'blastQueueProcessor', 'cleanupExpiredProperties', 'cleanOldSessions']) {
    assert.equal(rpc(h.ctx, name).success, false, name);
    assert.equal(rpc(h.ctx, name, { triggerUid: 'forged', authMode: 'FULL', namedValues: {} }).success, false, name);
  }
  assert.deepEqual(h.writes, []);
  assert.deepEqual(h.businessReads, []);
});

test('trigger guard matches server registration and native spreadsheet source; clock ID is a server-side capability', () => {
  const h = harness();
  const registration = { getUniqueId: () => 'server-only-uid', getHandlerFunction: () => 'onEbayarSubmit',
    getEventType: () => 'FORM', getTriggerSourceId: () => 'SOURCE' };
  h.ctx.ScriptApp.getProjectTriggers = () => [registration];
  const event = { triggerUid: 'server-only-uid', authMode: 'FULL',
    range: { getSheet() {} }, source: { getId: () => 'SOURCE' } };
  assert.equal(h.ctx.authorizeInstalledTrigger_('onEbayarSubmit', event, true), true);
  assert.equal(h.ctx.authorizeInstalledTrigger_('onKhatamSubmit', event, true), false);
  assert.equal(h.ctx.authorizeInstalledTrigger_('onEbayarSubmit', JSON.parse(JSON.stringify(event)), true), false);
  event.source.getId = () => 'OTHER';
  assert.equal(h.ctx.authorizeInstalledTrigger_('onEbayarSubmit', event, true), false);
  registration.getHandlerFunction = () => 'blastQueueProcessor';
  registration.getEventType = () => 'CLOCK';
  assert.equal(h.ctx.authorizeInstalledTrigger_('blastQueueProcessor', { triggerUid: 'server-only-uid', authMode: 'FULL' }, false), true);
  assert.equal(h.ctx.authorizeInstalledTrigger_('blastQueueProcessor', { triggerUid: 'guessed', authMode: 'FULL' }, false), false);
});

test('intended public read and parent/payment actions stay outside Admin policy', () => {
  const h = harness();
  for (const name of ['getPublicEbayarYears', 'getEbayarPortalMode', 'getEbayarStats', 'getYuranParent',
    'getNativeEbayarStudentLookup', 'preflightNativeEbayarSubmission', 'submitNativeEbayarPayment',
    'registerKanak', 'registerDewasa', 'requestStaffLoginOtp', 'confirmStaffLoginOtp']) {
    assert.equal(h.ctx.PUBLIC_ACTIONS.includes(name), true, name);
    assert.equal(h.ctx.ADMIN_REQUIRED_ACTIONS.includes(name), false, name);
    assert.equal(typeof h.ctx[name], 'function', name);
  }
});
