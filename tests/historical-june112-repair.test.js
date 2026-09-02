const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backendSource = fs.readFileSync(path.resolve(__dirname, '..', 'Code.js'), 'utf8');

const paymentHeaders = [
  'PAYMENT_ID', 'PAYMENT_GROUP_ID', 'TIMESTAMP', 'TAHUN', 'BULAN', 'BULAN_KEY',
  'NAMA_MURID_RAW', 'NAMA_MURID_NORM', 'STUDENT_ID', 'NO_MYKID_MYKAD',
  'STUDENT_TYPE', 'JUMLAH', 'AMOUNT_TOTAL', 'AMOUNT_ALLOCATED', 'STATUS', 'KAEDAH',
  'RESIT_URL', 'SOURCE_YEAR', 'SOURCE_SHEET', 'SOURCE_ROW', 'SOURCE_ROW_HASH',
  'MATCH_STATUS', 'MATCH_CONFIDENCE', 'NOTE', 'CREATED_AT', 'UPDATED_AT'
];

const preserveHash = 'c15975677b4b9c18beb1d63a6f4c83806c77a42e59e8c1874a8e050e79b7e930';
const obsoleteHash = 'e8ada66407f1b7873e4adacc6cf510dbcfd823007ff0663b9acccb3fad144b59';

function extractFunction(source, name) {
  const match = new RegExp('function\\s+' + name + '\\s*\\(').exec(source);
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

function createContext() {
  const context = {
    Array,
    Date,
    JSON,
    Math,
    Number,
    Object,
    parseFloat,
    parseInt,
    EBAYAR_PAYMENTS_HEADERS_V2: paymentHeaders,
    Utilities: {
      formatDate(value, timezone, pattern) {
        assert.equal(timezone, 'Asia/Singapore');
        assert.equal(pattern, 'MMMYYYY');
        return 'Jun2026';
      }
    },
    normalizeBulanKeyV2_(value, year, month) {
      if (value instanceof Date) return '2026-06';
      if (String(value || '') === '2026-09') return '2026-09';
      if (String(value || '') === '2026-06') return '2026-06';
      return String(year) === '2026' && String(month || '').toUpperCase().startsWith('JUN') ? '2026-06' : '';
    },
    normalizeYuranNameV2_: value => String(value || '').replace(/\s+/g, ' ').trim().toUpperCase()
  };
  vm.createContext(context);
  [
    'getHistoricalJune112RepairConfigV2_',
    'normalizeHistoricalJune112SourceSheetV2_',
    'stableHistoricalJune112ValueV2_',
    'fingerprintHistoricalJune112ValuesV2_',
    'getHistoricalJune112RowMonthKeyV2_',
    'isHistoricalJune112SourceLocationV2_',
    'isHistoricalJune112ExactIdentityV2_',
    'isHistoricalJune112RelatedIdentityV2_',
    'publicHistoricalJune112RowV2_',
    'validateHistoricalJune112SnapshotV2_',
    'clearHistoricalJune112ObsoleteRecordV2_'
  ].forEach(name => vm.runInContext(extractFunction(backendSource, name), context));
  return context;
}

function makeRow(hash, rowNumber, overrides = {}) {
  const row = {
    _rowNumber: rowNumber,
    PAYMENT_ID: 'PAY-2026-JUN2026-112-1',
    PAYMENT_GROUP_ID: 'PG-2026-JUN2026-112',
    TIMESTAMP: new Date('2026-06-29T23:41:34.000Z'),
    TAHUN: 2026,
    BULAN: 'JUN',
    BULAN_KEY: '2026-06',
    NAMA_MURID_RAW: 'AIDAH MD TAIB',
    NAMA_MURID_NORM: 'AIDAH MD TAIB',
    STUDENT_ID: '',
    NO_MYKID_MYKAD: '',
    STUDENT_TYPE: '',
    JUMLAH: 10,
    AMOUNT_TOTAL: 10,
    AMOUNT_ALLOCATED: '',
    STATUS: 'SELESAI',
    KAEDAH: '',
    RESIT_URL: 'https://drive.google.com/open?id=receipt',
    SOURCE_YEAR: 2026,
    SOURCE_SHEET: 'JUN2026',
    SOURCE_ROW: 112,
    SOURCE_ROW_HASH: hash,
    MATCH_STATUS: 'UNMATCHED',
    MATCH_CONFIDENCE: '',
    NOTE: 'Dry-run only; no import/write performed.',
    CREATED_AT: rowNumber === 749 ? '2026-07-02 15:50:17' : '2026-07-07 09:15:46',
    UPDATED_AT: rowNumber === 749 ? '2026-07-02 15:50:17' : '2026-07-07 09:15:46',
    ...overrides
  };
  row._values = paymentHeaders.map(header => row[header]);
  return row;
}

function makeSource(overrides = {}) {
  return {
    sourceSheet: 'JUN2026',
    sourceRow: 112,
    sourceValues: [],
    PAYMENT_ID: 'PAY-2026-JUN2026-112-1',
    PAYMENT_GROUP_ID: 'PG-2026-JUN2026-112',
    TAHUN: '2026',
    BULAN: 'JUN',
    BULAN_KEY: '2026-06',
    NAMA_MURID_RAW: 'AIDAH MD TAIB',
    NAMA_MURID_NORM: 'AIDAH MD TAIB',
    JUMLAH: 10,
    AMOUNT_TOTAL: 10,
    STATUS: 'SELESAI',
    SOURCE_YEAR: 2026,
    SOURCE_SHEET: 'JUN2026',
    SOURCE_ROW: 112,
    SOURCE_ROW_HASH: preserveHash,
    splitNames: ['AIDAH MD TAIB'],
    ...overrides
  };
}

function makeComparison(overrides = {}) {
  return {
    success: true,
    legacy: { sudahBayar: 172, totalKutipan: 5780 },
    v2: { sudahBayar: 172, totalKutipan: 5780 },
    diff: { sudahBayar: 0, totalKutipan: 0, onlyLegacy: [], onlyV2: [] },
    ...overrides
  };
}

function makeSnapshot(overrides = {}) {
  return {
    lastRow: 1783,
    lastColumn: 26,
    headers: paymentHeaders.slice(),
    rows: [makeRow(obsoleteHash, 749), makeRow(preserveHash, 1571)],
    source: makeSource(),
    metrics: { paymentRows: 175, distinctGroups: 111, distinctPaidNames: 172, totalCollection: 5780 },
    comparison: makeComparison(),
    ...overrides
  };
}

function createSourceReconstructionContext() {
  const timestamp = {
    toString: () => 'Tue Jun 30 2026 07:41:34 GMT+0800 (Singapore Standard Time)'
  };
  const headers = [
    'Timestamp', 'Email address', 'NAMA PENUH MURID', 'BAYARAN YURAN BAGI BULAN',
    'TAHUN', 'TARIKH BAYARAN DIBUAT', 'JUMLAH BAYARAN (RM)', 'MUAT NAIK RESIT BAYARAN',
    'NO RESIT', 'STATUS', 'Merged Doc ID - RESIT JUN 2026',
    'Merged Doc URL - RESIT JUN 2026', 'Link to merged Doc - RESIT JUN 2026',
    'Document Merge Status - RESIT JUN 2026'
  ];
  const values = [
    timestamp, 'syafiefarah@gmail.com', 'AIDAH MD TAIB', 'JUN', 2026,
    new Date('2026-06-29T16:00:00.000Z'), 10,
    'https://drive.google.com/open?id=1vHnw2jsc1nqCKW-vwdvVZHemYW0iaWKg',
    '111', 'SELESAI', 'doc-id', 'doc-url', 'doc-link', 'merged'
  ];
  const sourceSheet = {
    getName: () => 'JUN2026',
    getLastRow: () => 112,
    getLastColumn: () => 14,
    getRange(row) {
      return { getValues: () => [row === 1 ? headers.slice() : values.slice()] };
    }
  };
  const context = {
    Array,
    Date,
    Number,
    Object,
    parseFloat,
    parseInt,
    YURAN_SS_ID: 'YURAN',
    SpreadsheetApp: {
      openById: id => {
        assert.equal(id, 'YURAN');
        return { getSheetByName: name => name === 'JUN2026' ? sourceSheet : null };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      computeDigest(algorithm, raw) {
        assert.equal(algorithm, 'SHA_256');
        return Array.from(crypto.createHash('sha256').update(raw).digest(), byte => byte > 127 ? byte - 256 : byte);
      },
      formatDate: () => 'Jun2026'
    },
    Logger: { log() {} },
    EBAYAR_MONTHS_V2: [
      { key: '06', short: 'JUN', label: 'Jun', legacy: 'JUN2026' }
    ],
    normalizeYuranNameV2_: value => String(value || '').replace(/\s+/g, ' ').trim().toUpperCase()
  };
  vm.createContext(context);
  [
    'getHistoricalJune112RepairConfigV2_',
    'normalizeHistoricalJune112SourceSheetV2_',
    'detectEbayarSourceColumnsV2_',
    'compactDetectedColumnsV2_',
    'getDetectedCellV2_',
    'splitEbayarNamesDryRunV2_',
    'parseEbayarAmountV2_',
    'makePaymentGroupIdDryRunV2_',
    'makeImportPaymentGroupIdV2_',
    'makeImportPaymentIdV2_',
    'makeSourceRowHashDryRunV2_',
    'makeBulanKeyV2_',
    'makeBulanKeyDryRunV2_',
    'reconstructHistoricalJune112SourceV2_'
  ].forEach(name => vm.runInContext(extractFunction(backendSource, name), context));
  return context;
}

test('exact verified anomaly passes preview validation and resolves dynamic rows', () => {
  const context = createContext();
  const result = context.validateHistoricalJune112SnapshotV2_(makeSnapshot(), 'BEFORE');
  assert.equal(result.success, true);
  assert.equal(result.safeToWrite, true);
  assert.equal(result.diagnostic.obsoleteRowNumber, 749);
  assert.equal(result.diagnostic.preserveRowNumber, 1571);
  assert.deepEqual(Array.from(result.diagnostic.errors), []);
});

test('legacy JUN2026 row 112 reconstructs through production logic to the preserve hash', () => {
  const context = createSourceReconstructionContext();
  const source = context.reconstructHistoricalJune112SourceV2_();
  assert.equal(source.PAYMENT_ID, 'PAY-2026-JUN2026-112-1');
  assert.equal(source.PAYMENT_GROUP_ID, 'PG-2026-JUN2026-112');
  assert.equal(source.BULAN_KEY, '2026-06');
  assert.equal(source.NAMA_MURID_NORM, 'AIDAH MD TAIB');
  assert.equal(source.AMOUNT_TOTAL, 10);
  assert.equal(source.SOURCE_ROW_HASH, preserveHash);
});

test('exact required post-write state passes with only the preserved hash', () => {
  const context = createContext();
  const result = context.validateHistoricalJune112SnapshotV2_(makeSnapshot({
    rows: [makeRow(preserveHash, 1571)],
    metrics: { paymentRows: 174, distinctGroups: 111, distinctPaidNames: 172, totalCollection: 5780 }
  }), 'AFTER');
  assert.equal(result.success, true);
  assert.equal(result.safeToWrite, false);
  assert.equal(result.diagnostic.identityRowCount, 1);
  assert.equal(result.diagnostic.preserveHashCount, 1);
  assert.equal(result.diagnostic.obsoleteHashCount, 0);
  assert.equal(result.diagnostic.preserveRowNumber, 1571);
});

test('third duplicate fails closed', () => {
  const context = createContext();
  const snapshot = makeSnapshot();
  snapshot.rows.push(makeRow('third-hash', 1700));
  const result = context.validateHistoricalJune112SnapshotV2_(snapshot, 'BEFORE');
  assert.equal(result.success, false);
  assert.ok(result.diagnostic.errors.includes('IDENTITY_ROW_COUNT_MISMATCH'));
});

test('missing preserve hash fails closed', () => {
  const context = createContext();
  const result = context.validateHistoricalJune112SnapshotV2_(
    makeSnapshot({ rows: [makeRow(obsoleteHash, 749)] }),
    'BEFORE'
  );
  assert.equal(result.success, false);
  assert.ok(result.diagnostic.errors.includes('PRESERVE_HASH_COUNT_MISMATCH'));
});

test('missing obsolete hash fails closed', () => {
  const context = createContext();
  const result = context.validateHistoricalJune112SnapshotV2_(
    makeSnapshot({ rows: [makeRow(preserveHash, 1571)] }),
    'BEFORE'
  );
  assert.equal(result.success, false);
  assert.ok(result.diagnostic.errors.includes('OBSOLETE_HASH_COUNT_MISMATCH'));
});

test('live source reconstruction or hash drift fails closed', () => {
  const context = createContext();
  const result = context.validateHistoricalJune112SnapshotV2_(
    makeSnapshot({ source: makeSource({ SOURCE_ROW_HASH: 'changed-source-hash' }) }),
    'BEFORE'
  );
  assert.equal(result.success, false);
  assert.ok(result.diagnostic.errors.includes('SOURCE_RECONSTRUCTION_MISMATCH'));
});

test('Payments schema mismatch fails closed', () => {
  const context = createContext();
  const headers = paymentHeaders.slice();
  headers[20] = 'SOURCE_HASH_WRONG';
  const result = context.validateHistoricalJune112SnapshotV2_(makeSnapshot({ headers }), 'BEFORE');
  assert.equal(result.success, false);
  assert.ok(result.diagnostic.errors.includes('PAYMENTS_SCHEMA_MISMATCH'));
});

test('June metric mismatch fails closed', () => {
  const context = createContext();
  const result = context.validateHistoricalJune112SnapshotV2_(makeSnapshot({
    metrics: { paymentRows: 176, distinctGroups: 111, distinctPaidNames: 172, totalCollection: 5780 }
  }), 'BEFORE');
  assert.equal(result.success, false);
  assert.ok(result.diagnostic.errors.includes('JUNE_METRIC_MISMATCH_PAYMENTROWS'));
});

test('September or Native identity involvement fails closed', () => {
  const context = createContext();
  const snapshot = makeSnapshot();
  snapshot.rows.push(makeRow('native-related-hash', 1770, {
    PAYMENT_ID: 'NATIVE-PAYMENT',
    SOURCE_YEAR: 2026,
    SOURCE_SHEET: 'NATIVE_EBAYAR',
    SOURCE_ROW: '',
    BULAN: 'SEPTEMBER',
    BULAN_KEY: '2026-09',
    KAEDAH: 'NATIVE_EBAYAR'
  }));
  const result = context.validateHistoricalJune112SnapshotV2_(snapshot, 'BEFORE');
  assert.equal(result.success, false);
  assert.ok(result.diagnostic.errors.includes('SEPTEMBER_OR_NATIVE_IDENTITY_INVOLVED'));
});

test('clear operation rereads both rows and clears only A:Z without structural deletion', () => {
  const context = createContext();
  const snapshot = makeSnapshot();
  const validation = context.validateHistoricalJune112SnapshotV2_(snapshot, 'BEFORE');
  const calls = [];
  let clearCount = 0;
  snapshot.sheet = {
    getRange(row, column, rowCount, columnCount) {
      calls.push({ row, column, rowCount, columnCount });
      const target = snapshot.rows.find(item => item._rowNumber === row);
      assert.ok(target, 'Unexpected target row ' + row);
      return {
        getValues: () => [target._values.slice()],
        clearContent() { clearCount += 1; }
      };
    }
  };

  const result = context.clearHistoricalJune112ObsoleteRecordV2_(snapshot, validation);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { clearedRowNumber: 749, preservedRowNumber: 1571 });
  assert.equal(clearCount, 1);
  assert.deepEqual(calls, [
    { row: 749, column: 1, rowCount: 1, columnCount: 26 },
    { row: 1571, column: 1, rowCount: 1, columnCount: 26 },
    { row: 749, column: 1, rowCount: 1, columnCount: 26 }
  ]);

  const clearSource = extractFunction(backendSource, 'clearHistoricalJune112ObsoleteRecordV2_');
  assert.match(clearSource, /\.clearContent\(\)/);
  assert.doesNotMatch(clearSource, /deleteRows?\s*\(/);
});

test('helpers stay private and are absent from every web/API route', () => {
  const previewSource = extractFunction(backendSource, 'previewHistoricalJune112RepairV2_');
  const writeSource = extractFunction(backendSource, 'repairHistoricalJune112DuplicateV2_');
  const reconstructSource = extractFunction(backendSource, 'reconstructHistoricalJune112SourceV2_');
  assert.match(writeSource, /LockService\.getScriptLock\(\)/);
  assert.match(writeSource, /previewHistoricalJune112RepairV2_\(\)/);
  assert.doesNotMatch(previewSource, /clearContent|setValues|appendRow|deleteRows?/);
  assert.match(reconstructSource, /detectEbayarSourceColumnsV2_/);
  assert.match(reconstructSource, /makeSourceRowHashDryRunV2_/);
  assert.match(reconstructSource, /makeBulanKeyDryRunV2_/);

  const routeNames = [
    'previewHistoricalJune112RepairV2',
    'repairHistoricalJune112DuplicateV2'
  ];
  routeNames.forEach(name => {
    assert.doesNotMatch(backendSource, new RegExp("action\\s*===\\s*['\"]" + name));
    assert.doesNotMatch(backendSource, new RegExp("['\"]" + name + "['\"]\\s*,"));
  });
});
