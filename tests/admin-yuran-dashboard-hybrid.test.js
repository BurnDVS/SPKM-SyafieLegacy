const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backendSource = fs.readFileSync(path.resolve(__dirname, '..', 'Code.js'), 'utf8');
const frontendSource = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(source, name) {
  const match = new RegExp('function\\s+' + name + '\\s*\\(').exec(source);
  assert.ok(match, 'Function not found: ' + name);
  const start = match.index;
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
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

function createDispatcherContext() {
  const legacyCalls = [];
  const v2Calls = [];
  const context = {
    getYuranStats: params => {
      legacyCalls.push(params);
      return { success: true, source: 'LEGACY' };
    },
    getYuranStatsV2: params => {
      v2Calls.push(params);
      return { success: true, source: 'PAYMENTS' };
    }
  };
  vm.createContext(context);
  vm.runInContext(backendSource.slice(backendSource.indexOf('var EBAYAR_MONTHS_V2 ='), backendSource.indexOf('var EBAYAR_YEAR_CONFIG_HEADERS_')), context);
  ['makeBulanKeyV2_', 'normalizeBulanKeyV2_'].forEach(name => vm.runInContext(extractFunction(backendSource, name), context));
  context.getEbayarMonthConfig_ = () => ({ routeType: 'NATIVE' });
  vm.runInContext(extractFunction(backendSource, 'getYuranStatsForDashboard_'), context);
  return { context, legacyCalls, v2Calls };
}

test('frontend keeps the existing getYuranStats action', () => {
  const loadSource = extractFunction(frontendSource, 'loadYuranStats');
  assert.match(loadSource, /callGAS\('getYuranStats',\s*\{\s*bulan:\s*bulan\s*\}/);
  assert.doesNotMatch(loadSource, /getYuranStatsV2/);
});

test('January through August delegate unchanged to Legacy getYuranStats', () => {
  const setup = createDispatcherContext();
  ['JAN2026', 'FEB2026', 'MAC2026', 'APRIL2026', 'MEI2026', 'JUN2026', 'JULAI2026', 'OGOS2026']
    .forEach(bulan => assert.equal(setup.context.getYuranStatsForDashboard_({ bulan }).source, 'LEGACY'));

  assert.equal(setup.legacyCalls.length, 8);
  assert.equal(setup.v2Calls.length, 0);
  assert.deepEqual(setup.legacyCalls.map(call => call.bulan), [
    'JAN2026', 'FEB2026', 'MAC2026', 'APRIL2026', 'MEI2026', 'JUN2026', 'JULAI2026', 'OGOS2026'
  ]);
});

test('September through December map to canonical Payments month keys', () => {
  const setup = createDispatcherContext();
  const expected = {
    SEPT2026: '2026-09',
    OKT2026: '2026-10',
    NOV2026: '2026-11',
    DIS2026: '2026-12'
  };

  Object.keys(expected).forEach(bulan => {
    assert.equal(setup.context.getYuranStatsForDashboard_({ bulan }).source, 'PAYMENTS');
  });
  assert.deepEqual(JSON.parse(JSON.stringify(setup.v2Calls)), Object.keys(expected).map(bulan => ({
    tahun: '2026',
    bulanKey: expected[bulan],
    requireExactSelesai: true
  })));
  assert.equal(setup.legacyCalls.length, 0);
});

function runV2Stats(requireExactSelesai, bulanKey = '2026-09') {
  const rows = [
    { BULAN_KEY: '2026-09', PAYMENT_GROUP_ID: 'PG-1', NAMA_MURID_NORM: 'ALI', STATUS: 'SELESAI', AMOUNT_TOTAL: 100, RESIT_URL: 'https://example.test/resit.pdf' },
    { BULAN_KEY: '2026-09', PAYMENT_GROUP_ID: 'PG-1', NAMA_MURID_NORM: 'AISYAH', STATUS: 'SELESAI', AMOUNT_TOTAL: 100, RESIT_URL: 'https://example.test/resit.pdf' },
    { BULAN_KEY: '2026-09', PAYMENT_GROUP_ID: 'PG-2', NAMA_MURID_NORM: 'BUDI', STATUS: '', AMOUNT_TOTAL: 50 },
    { BULAN_KEY: '2026-09', PAYMENT_GROUP_ID: 'PG-3', NAMA_MURID_NORM: 'CICI', STATUS: 'PENDING', AMOUNT_TOTAL: 60 },
    { BULAN_KEY: '2026-10', PAYMENT_GROUP_ID: 'PG-4', NAMA_MURID_NORM: 'DINI', STATUS: 'SELESAI', AMOUNT_TOTAL: 40 }
  ];
  const context = {
    normalizeBulanKeyV2_: value => value,
    makeBulanKeyV2_: () => '',
    normalizeYuranNameV2_: value => (value || '').toString().trim().toUpperCase(),
    getPaymentsRowsV2_: () => ({ rows }),
    getEligibleYuranStudentsV2_: () => ['ALI', 'AISYAH', 'BUDI', 'CICI'].map((nama, i) => ({ nama, studentKey: 'KANAK:' + (i + 1) })),
    getNative2026EligibleDirectory_: () => Object.fromEntries(['ALI', 'AISYAH', 'BUDI', 'CICI'].map((nama, i) =>
      ['KANAK:' + (i + 1), { nama, studentType: 'KANAK' }])),
    getTelefonMapV2_: () => ({}),
    Logger: { log() {} }
  };
  vm.createContext(context);
  rows.forEach(row => { row.STUDENT_TYPE = 'KANAK'; if (row.BULAN_KEY === '2026-09') row.BULAN_KEY = bulanKey; });
  ['resolveNative2026PaymentStudent_', 'getNativeEbayarPaidStudentIds_'].forEach(name =>
    vm.runInContext(extractFunction(backendSource, name), context));
  vm.runInContext(extractFunction(backendSource, 'getYuranStatsV2'), context);
  return context.getYuranStatsV2({ tahun: '2026', bulanKey, requireExactSelesai });
}

test('Native dashboard path counts only exact SELESAI rows and each group amount once', () => {
  const result = runV2Stats(true);

  assert.equal(result.success, true);
  assert.equal(result.sudahBayar, 2);
  assert.equal(result.totalKutipan, 100);
  assert.deepEqual(JSON.parse(JSON.stringify(result.listNamaBayar)), ['AISYAH', 'ALI']);
  assert.equal(result.listResit.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(result.belumBayar)), [
    { nama: 'BUDI', telefon: '' },
    { nama: 'CICI', telefon: '' }
  ]);
});

test('Legacy V2 callers retain their previous blank-status behaviour', () => {
  const result = runV2Stats(false, '2026-08');
  assert.equal(result.sudahBayar, 3);
  assert.equal(result.totalKutipan, 150);
  assert.equal(result.listNamaBayar.includes('BUDI'), true);
});

test('central getYuranStats route uses the dashboard dispatcher without changing auth policy', () => {
  const routeMatches = backendSource.match(/action === 'getYuranStats'[^\n]+getYuranStatsForDashboard_\(/g) || [];
  assert.equal(routeMatches.length, 1);
  assert.match(backendSource, /function doPost[\s\S]*?doAction\(action, body\)/);
  assert.match(backendSource, /function doGet[\s\S]*?doAction\(action, payload\)/);
  assert.match(backendSource, /AUTH_REQUIRED_ACTIONS[\s\S]*?'getYuranStats'/);
});
