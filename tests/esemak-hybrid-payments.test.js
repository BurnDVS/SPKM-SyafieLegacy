const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backendSource = fs.readFileSync(path.resolve(__dirname, '..', 'Code.js'), 'utf8');
const frontendSource = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(source, name) {
  const match = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(source);
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

function makeSheet(rows) {
  return {
    getLastRow: () => rows.length + 1,
    getLastColumn: () => Math.max(12, ...rows.map(row => row.length)),
    getRange(row, column, rowCount, columnCount) {
      return {
        getValues() {
          return rows.slice(row - 2, row - 2 + rowCount).map(sourceRow => {
            const values = [];
            for (let i = 0; i < columnCount; i += 1) values.push(sourceRow[column - 1 + i] ?? '');
            return values;
          });
        }
      };
    }
  };
}

function legacyPaymentRow(name, receiptUrl) {
  const row = Array(12).fill('');
  row[2] = name;
  row[11] = receiptUrl;
  return row;
}

function createBackendContext() {
  const sheetReads = [];
  const sheets = {
    JAN2026: makeSheet([legacyPaymentRow('ALI BIN AMIN', 'https://legacy.example/jan.pdf')]),
    SEPT2026: makeSheet([legacyPaymentRow('LEGACY SEPTEMBER', 'https://legacy.example/sept.pdf')]),
    'NAMA MURID': makeSheet([
      ['', 'ALI BIN AMIN', '', '', '', ''],
      ['', 'BUDI BIN BAKAR', '', '', '', ''],
      ['', 'CICI BINTI CAKAP', '', '', '', '']
    ])
  };
  const canonicalRows = [
    { BULAN_KEY: '2026-01', NAMA_MURID_NORM: 'ALI BIN AMIN', STATUS: 'SELESAI', RESIT_URL: 'https://v2.example/jan.pdf' },
    { BULAN_KEY: '2026-09', NAMA_MURID_NORM: 'ALI BIN AMIN', STATUS: 'SELESAI', RESIT_URL: 'http://invalid.example/sept.pdf' },
    { BULAN_KEY: '2026-09', NAMA_MURID_NORM: 'ALI BIN AMIN', STATUS: 'SELESAI', RESIT_URL: 'https://native.example/sept.pdf' },
    { BULAN_KEY: '2026-09', NAMA_MURID_NORM: 'BUDI BIN BAKAR', STATUS: 'PENDING', RESIT_URL: 'https://native.example/pending.pdf' },
    { BULAN_KEY: '2026-09', NAMA_MURID_NORM: 'CICI BINTI CAKAP', STATUS: 'SELESAI', RESIT_URL: '' }
  ];
  const eligible = [
    { nama: 'ALI BIN AMIN' },
    { nama: 'BUDI BIN BAKAR' },
    { nama: 'CICI BINTI CAKAP' }
  ];
  const context = {
    getNative2026EligibleDirectory_: () => Object.fromEntries(eligible.map((student, i) =>
      ['KANAK:' + (i + 1), { ...student, studentType: 'KANAK' }])),
    YURAN_SS_ID: 'YURAN',
    SpreadsheetApp: {
      openById(id) {
        assert.equal(id, 'YURAN');
        return {
          getSheetByName(name) {
            sheetReads.push(name);
            return sheets[name] || null;
          }
        };
      }
    },
    sanitizeInput: value => value,
    normalizeYuranNameV2_: value => (value || '').toString().replace(/\\s+/g, ' ').trim().toUpperCase(),
    makeBulanKeyV2_: (year, month) => `${year}-${month}`,
    getPaymentsRowsV2_: () => ({ rows: canonicalRows }),
    getEligibleYuranStudentsV2_: () => eligible,
    Logger: { log() {} }
  };
  vm.createContext(context);
  canonicalRows.forEach(row => { row.STUDENT_TYPE = 'KANAK'; });
  ['resolveNative2026PaymentStudent_', 'getNativeEbayarPaidStudentIds_'].forEach(name =>
    vm.runInContext(extractFunction(backendSource, name), context));
  vm.runInContext(extractFunction(backendSource, 'getYuranParent'), context);
  return { context, sheetReads };
}

test('January through August remain Legacy-only and ignore migrated Payments rows', () => {
  const setup = createBackendContext();
  const result = setup.context.getYuranParent({ keyword: 'ALI' });

  const january = result.found.filter(row => row.bulan === 'Januari 2026');
  assert.equal(january.length, 1);
  assert.equal(january[0].resitUrl, 'https://legacy.example/jan.pdf');
  assert.doesNotMatch(JSON.stringify(result.found), /v2\.example\/jan/);
  assert.deepEqual(JSON.parse(JSON.stringify(result.belumBayar.JAN2026)), [
    'BUDI BIN BAKAR',
    'CICI BINTI CAKAP'
  ]);
});

test('September ignores its Legacy sheet and displays the canonical Native payment', () => {
  const setup = createBackendContext();
  const result = setup.context.getYuranParent({ keyword: 'ALI' });

  const september = result.found.filter(row => row.bulan === 'September 2026');
  assert.equal(september.length, 1);
  assert.equal(september[0].nama, 'ALI BIN AMIN');
  assert.equal(setup.sheetReads.includes('SEPT2026'), false);
});

test('canonical HTTPS RESIT_URL is preferred across duplicate student-month rows', () => {
  const result = createBackendContext().context.getYuranParent({ keyword: 'ALI' });
  const september = result.found.find(row => row.bulan === 'September 2026');

  assert.equal(september.resitUrl, 'https://native.example/sept.pdf');
  assert.equal(result.found.filter(row => row.nama === 'ALI BIN AMIN' && row.bulan === 'September 2026').length, 1);
});

test('non-SELESAI canonical rows are excluded from history and remain unpaid', () => {
  const result = createBackendContext().context.getYuranParent({ keyword: 'BUDI' });

  assert.equal(result.found.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result.belumBayar.SEPT2026)), ['BUDI BIN BAKAR']);
});

test('September unpaid calculation uses canonical paid rows and official eligible students', () => {
  const result = createBackendContext().context.getYuranParent({ keyword: '' });

  assert.deepEqual(JSON.parse(JSON.stringify(result.belumBayar.SEPT2026)), ['BUDI BIN BAKAR']);
  assert.equal(result.belumBayar.SEPT2026.includes('ALI BIN AMIN'), false);
  assert.equal(result.belumBayar.SEPT2026.includes('CICI BINTI CAKAP'), false);
});

test('renderer links only HTTPS receipts and preserves non-HTTPS payment rows', () => {
  const resultElement = { innerHTML: '' };
  const context = {
    document: { getElementById: () => resultElement },
    escHtml(value) {
      return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(frontendSource, 'renderEsemakResult'), context);

  context.renderEsemakResult([
    { nama: 'ALI BIN AMIN', bulan: 'September 2026', resitUrl: 'https://native.example/sept.pdf' },
    { nama: 'ALI BIN AMIN', bulan: 'Ogos 2026', resitUrl: 'javascript:alert(1)' }
  ], 'ALI');

  assert.match(resultElement.innerHTML, /href="https:\/\/native\.example\/sept\.pdf"/);
  assert.match(resultElement.innerHTML, /rel="noopener noreferrer"/);
  assert.doesNotMatch(resultElement.innerHTML, /href="javascript:/);
  assert.match(resultElement.innerHTML, /Ogos 2026/);
  assert.equal((resultElement.innerHTML.match(/>[^<]*Resit<\/a>/g) || []).length, 1);
});
