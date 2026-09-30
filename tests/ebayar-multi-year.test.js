const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const code = fs.readFileSync(path.resolve(__dirname, '..', 'Code.js'), 'utf8');
const index = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const portal = fs.readFileSync(path.resolve(__dirname, '..', 'portal.html'), 'utf8');
const months = Array.from({ length: 12 }, (_, i) => ({
  key: String(i + 1).padStart(2, '0'), label: 'Month ' + (i + 1)
}));

function extract(source, name) {
  const match = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(source);
  assert.ok(match, 'Missing ' + name);
  let depth = 0, quote = '', escaped = false;
  for (let i = source.indexOf('{', match.index); i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth++;
    if (char === '}' && --depth === 0) return source.slice(match.index, i + 1);
  }
  throw new Error('Unterminated ' + name);
}

function load(names, globals = {}) {
  const context = vm.createContext({ EBAYAR_MONTHS_V2: months, ...globals });
  names.forEach(name => vm.runInContext(extract(code, name), context));
  return context;
}

const years = {
  '2026': { year: 2026, status: 'ACTIVE', mode: 'MIXED', startMonth: 1, endMonth: 12 },
  '2027': { year: 2027, status: 'ACTIVE', mode: 'NATIVE', startMonth: 1, endMonth: 12 }
};

test('2026 keeps Legacy Jan–Aug and Native Sep–Dec; 2027 has twelve Native months', () => {
  const ctx = load(['getEbayarMonthConfig_']);
  for (let m = 1; m <= 12; m++) {
    const suffix = String(m).padStart(2, '0');
    assert.equal(ctx.getEbayarMonthConfig_('2026-' + suffix, years, '2026-09-29').routeType, m <= 8 ? 'LEGACY' : 'NATIVE');
    assert.equal(ctx.getEbayarMonthConfig_('2027-' + suffix, years, '2026-09-29').routeType, 'NATIVE');
  }
  assert.equal(ctx.getEbayarMonthConfig_('2026-09', years, '2026-09-29').state, 'OPEN');
  assert.equal(ctx.getEbayarMonthConfig_('2026-10', years, '2026-09-29').state, 'UPCOMING');
  assert.equal(ctx.getEbayarMonthConfig_('2027-01', years, '2027-02-01').state, 'CLOSED');
  assert.equal(ctx.getEbayarMonthConfig_('2027-02', years, '2027-02-01').state, 'OPEN');
  assert.equal(ctx.getEbayarMonthConfig_('2027-03', years, '2027-02-01').state, 'UPCOMING');
});

test('2026 stats retain their original Legacy and Native calculation blocks', () => {
  const stats = extract(code, 'getEbayarStats');
  const compatibility = stats.slice(stats.indexOf('var BULAN_2026 ='));
  assert.match(compatibility, /collectNativeEligible\(kanakData, COL_KANAK, 'KANAK'\)/);
  assert.match(compatibility, /collectNativeEligible\(dewasaData, COL_DEWASA, 'DEWASA'\)/);
  assert.match(compatibility, /getNativeEbayarPaidStudentIds_\(nativeMonthKey, nativePaymentRows, eligibleById\)/);
  assert.doesNotMatch(compatibility, /getNativeEbayarMonthStats_/);
});

test('public year endpoint exposes only year, route and state metadata', () => {
  const ctx = load(['getEbayarMonthConfig_', 'getPublicEbayarYears'], {
    getEbayarYearConfigs_: () => years,
    Utilities: { formatDate: () => '2026-09-29' },
    Logger: { log() {} }
  });
  const response = ctx.getPublicEbayarYears();
  assert.equal(response.success, true);
  assert.equal(response.defaultYear, 2026);
  assert.deepEqual(Array.from(response.years, item => item.year), [2026, 2027]);
  assert.equal(response.years[1].months.length, 12);
  assert.equal(response.years[1].months[0].state, 'UPCOMING');
  assert.doesNotMatch(JSON.stringify(response), /student|nama|payment|mykid|telefon/i);
});

test('a Config row exposes a future Native year without source changes', () => {
  let logged = '';
  const values = [
    ['YEAR', 'STATUS', 'MODE', 'START_MONTH', 'END_MONTH', 'CREATED_AT', 'UPDATED_AT'],
    [2028, 'ACTIVE', 'NATIVE', 1, 12, '2026-09-29', '2026-09-29']
  ];
  const ctx = load(['getEbayarYearConfigs_', 'getEbayarMonthConfig_', 'getPublicEbayarYears'], {
    EBAYAR_YEAR_CONFIG_HEADERS_: values[0],
    getEbayarMasterSpreadsheet_: () => ({ getSheetByName: () => ({
      getLastRow: () => values.length, getDataRange: () => ({ getValues: () => values })
    }) }),
    Utilities: { formatDate: () => '2028-01-10' }, Logger: { log(value) { logged = value; } }
  });
  const response = ctx.getPublicEbayarYears();
  assert.equal(response.success, true, logged);
  assert.equal(response.defaultYear, 2028);
  assert.deepEqual(Array.from(response.years, item => item.year), [2026, 2027, 2028]);
  assert.equal(response.years[2].months.length, 12);
  assert.equal(response.years[2].months[0].routeType, 'NATIVE');
});

test('2027 public stats use Payments and return aggregates only for opened months', () => {
  const ctx = load(['getEbayarStats'], {
    getEbayarYearConfigs_: () => years,
    getPaymentsRowsV2_: () => ({ rows: [{ BULAN_KEY: '2027-01', STATUS: 'SELESAI', STUDENT_ID: 'KANAK:1' }] }),
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => ({ getLastRow: () => 1 }) }) },
    SPREADSHEET_ID: 'roster', TAB: { KANAK: 'Kanak', DEWASA: 'Dewasa' },
    getEbayarMonthConfig_: key => ({ routeType: 'NATIVE', state: key === '2027-01' ? 'OPEN' : 'UPCOMING' }),
    getNativeEbayarMonthStats_: () => ({ jumlahDaftar: 2, selesai: 1, belum: 1, peratus: 50 }),
    Logger: { log() {} }
  });
  const result = ctx.getEbayarStats({ year: 2027 });
  assert.equal(result.success, true);
  assert.equal(result.stats.length, 12);
  assert.equal(result.stats[0].selesai, 1);
  assert.equal(result.stats[1].error, 'Akan Datang');
  assert.doesNotMatch(JSON.stringify(result), /KANAK:1|nama|resit|telefon/i);
});

test('eligibility keeps 2026 BIL identity but uses stable UID from 2027 onward', () => {
  function rosterRow(bil, nama, timestamp, status, uid) {
    const row = Array(20).fill('');
    row[0] = bil;
    row[1] = nama;
    row[2] = timestamp;
    row[3] = status;
    row[19] = uid;
    return row;
  }

  const kanak = [
    rosterRow('1', 'ALI',   '2026-12-15', 'AKTIF',        'KANAK:U11111'),
    rosterRow('2', 'BAKAR', '2027-02-02', 'AKTIF',        'KANAK:U22222'),
    rosterRow('3', 'CICI',  '',           '',             'KANAK:U33333'),
    rosterRow('4', 'DANI',  '2026-01-01', 'TIDAK AKTIF', 'KANAK:U44444')
  ];

  const fakeSheet = rows => ({
    getLastRow: () => rows.length + 1,
    getRange: () => ({
      getValues: () => rows
    })
  });

  const ctx = load([
    'isStudentRegisteredForEbayarMonth_',
    'isStudentUid_',
    'getNativeEbayarOfficialStudentsV2_'
  ], {
    SPREADSHEET_ID: 'master',
    TAB: {
      KANAK: 'Kanak',
      DEWASA: 'Dewasa'
    },
    COL_KANAK: {
      BIL: 0,
      NAMA: 1,
      TIMESTAMP: 2,
      STATUS: 3,
      GURU: 3,
      STUDENT_UID: 19
    },
    COL_DEWASA: {
      BIL: 0,
      NAMA: 1,
      TIMESTAMP: 2,
      STATUS: 3,
      GURU: 3,
      STUDENT_UID: 19
    },
    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: name =>
          fakeSheet(name === 'Kanak' ? kanak : [])
      })
    },
    normalizeYuranNameV2_: value =>
      String(value || '').trim().toUpperCase(),
    Utilities: {
      formatDate: date =>
        date.getFullYear() +
        '-' +
        String(date.getMonth() + 1).padStart(2, '0')
    }
  });

  // 2026 compatibility kekal BIL-based.
  assert.deepEqual(
    Object.keys(
      ctx.getNativeEbayarOfficialStudentsV2_('2026-11').byKey
    ),
    ['KANAK:1', 'KANAK:2', 'KANAK:3']
  );

  // 2027+ mesti guna permanent STUDENT_UID.
  assert.deepEqual(
    Object.keys(
      ctx.getNativeEbayarOfficialStudentsV2_('2027-01').byKey
    ),
    ['KANAK:U11111', 'KANAK:U33333']
  );

  assert.deepEqual(
    Object.keys(
      ctx.getNativeEbayarOfficialStudentsV2_('2027-02').byKey
    ),
    ['KANAK:U11111', 'KANAK:U22222', 'KANAK:U33333']
  );
});

test('2027 Native search uses the selected month and hides paid students', () => {
  let rosterMonth = '';
  const ctx = load(['getNativeEbayarStudentLookup'], {
    normalizeYuranNameV2_: value => String(value || '').trim().toUpperCase(),
    getEbayarMonthConfig_: key => ({ routeType: 'NATIVE', state: key === '2027-02' ? 'UPCOMING' : 'OPEN' }),
    getNativeEbayarOfficialStudentsV2_: key => {
      rosterMonth = key;
      return { byKey: {
        'KANAK:1': { studentKey: 'KANAK:1', nama: 'ALI A', studentType: 'KANAK', guru: 'GURU' },
        'KANAK:2': { studentKey: 'KANAK:2', nama: 'ALI B', studentType: 'KANAK', guru: 'GURU' }
      } };
    },
    getPaymentsRowsV2_: () => ({ rows: [
      { BULAN_KEY: '2027-01', STUDENT_ID: 'KANAK:1' },
      { BULAN_KEY: '2026-09', STUDENT_ID: 'KANAK:2' }
    ] }),
    normalizeBulanKeyV2_: value => value,
    Logger: { log() {} }
  });
  const january = ctx.getNativeEbayarStudentLookup({ bulanKey: '2027-01', keyword: 'ALI' });
  assert.equal(january.success, true);
  assert.equal(rosterMonth, '2027-01');
  assert.deepEqual(Array.from(january.results, item => item.studentKey), ['KANAK:2']);
  assert.equal(ctx.getNativeEbayarStudentLookup({ bulanKey: '2027-02', keyword: 'ALI' }).success, false);
});

test('Native paid set accepts exact SELESAI, deduplicates IDs, and falls back only on a unique name', () => {
  const directory = {
    'KANAK:1': { nama: 'ALI' }, 'KANAK:2': { nama: 'SAMA' }, 'KANAK:3': { nama: 'SAMA' },
    'DEWASA:4': { nama: 'BIBI' }
  };
  const rows = [
    { BULAN_KEY: '2027-01', STATUS: 'SELESAI', STUDENT_ID: 'KANAK:1' },
    { BULAN_KEY: '2027-01', STATUS: 'SELESAI', STUDENT_ID: 'KANAK:1' },
    { BULAN_KEY: '2027-01', STATUS: 'PENDING', STUDENT_ID: 'DEWASA:4' },
    { BULAN_KEY: '2027-01', STATUS: 'SELESAI', STUDENT_ID: 'KANAK:99' },
    { BULAN_KEY: '2027-01', STATUS: 'SELESAI', NAMA_MURID_RAW: 'SAMA' },
    { BULAN_KEY: '2027-01', STATUS: 'SELESAI', NAMA_MURID_RAW: 'BIBI' },
    { BULAN_KEY: '2027-02', STATUS: 'SELESAI', STUDENT_ID: 'KANAK:2' }
  ];
  const ctx = load(['getNativeEbayarPaidStudentIds_', 'getNativeEbayarMonthStats_'], {
    getNativeEbayarOfficialStudentsV2_: () => ({ byKey: directory }),
    normalizeYuranNameV2_: value => String(value || '').trim().toUpperCase()
  });
  assert.deepEqual(Object.keys(ctx.getNativeEbayarPaidStudentIds_('2027-01', rows, directory)).sort(), ['DEWASA:4', 'KANAK:1']);
  const stats = ctx.getNativeEbayarMonthStats_('2027-01', rows);
  assert.equal(stats.jumlahDaftar, 4);
  assert.equal(stats.selesai, 2);
  assert.equal(stats.belum, 2);
  assert.equal(stats.peratus, 50);
});

test('2027 submission validation accepts configured Native month and rejects duplicates in that BULAN_KEY', () => {
  let rows = [];
  let currentMonth = '2027-01';
  const ctx = load(['validateNativeEbayarSubmissionV2_'], {
    getEbayarMonthConfig_: key => ({ routeType: 'NATIVE', state: key > currentMonth ? 'UPCOMING' : 'OPEN' }),
    getNativeEbayarOfficialStudentsV2_: () => ({ byKey: { 'KANAK:1': { studentKey: 'KANAK:1', nama: 'ALI' } } }),
    normalizeYuranNameV2_: value => String(value || '').trim().toUpperCase(),
    getMonthMetaV2_: key => ({ label: months[Number(key.slice(5, 7)) - 1].label }),
    getPaymentsRowsV2_: () => ({ rows }),
    normalizeBulanKeyV2_: value => value,
    parseEbayarAmountV2_: Number,
    Utilities: { formatDate: (_date, _tz, format) => format === 'yyyy-MM-dd' ? currentMonth + '-10' : currentMonth },
    NATIVE_EBAYAR_MVP_MAX_FILE_SIZE_V2: 3 * 1024 * 1024,
    sanitizeNativeEbayarReferenceV2_: value => value,
    sanitizeNativeEbayarFileNameV2_: value => value,
    Logger: { log() {} }
  });
  const payload = { bulanKey: '2027-01', students: [{ studentKey: 'KANAK:1', namaMurid: 'ALI' }],
    tarikhBayaran: '2027-01-10', jumlahKeseluruhan: '30.00', noRujukan: '',
    fileName: 'slip.pdf', mimeType: 'application/pdf', fileSize: 100 };
  assert.equal(ctx.validateNativeEbayarSubmissionV2_(payload).bulanLabel, 'Month 1 2027');
  assert.equal(ctx.validateNativeEbayarSubmissionV2_(payload).readyToSubmit, true,
    JSON.stringify(ctx.validateNativeEbayarSubmissionV2_(payload)));
  for (let month = 1; month <= 12; month++) {
    currentMonth = '2027-' + String(month).padStart(2, '0');
    payload.bulanKey = currentMonth;
    payload.tarikhBayaran = currentMonth + '-10';
    assert.equal(ctx.validateNativeEbayarSubmissionV2_(payload).readyToSubmit, true, currentMonth);
  }
  currentMonth = '2027-01';
  payload.bulanKey = '2027-02';
  payload.tarikhBayaran = '2027-01-10';
  assert.equal(ctx.validateNativeEbayarSubmissionV2_(payload).readyToSubmit, false);
  payload.bulanKey = '2027-01';
  rows = [{ BULAN_KEY: '2027-01', STUDENT_ID: 'KANAK:1', STATUS: 'SELESAI' }];
  assert.equal(ctx.validateNativeEbayarSubmissionV2_(payload).hasDuplicate, true);
  rows = [{ BULAN_KEY: '2026-09', STUDENT_ID: 'KANAK:1', STATUS: 'SELESAI' }];
  assert.equal(ctx.validateNativeEbayarSubmissionV2_(payload).readyToSubmit, true);
});

test('both frontends select Native months from backend and keep future months unavailable', () => {
  for (const source of [index, portal]) {
    assert.match(source, /getPublicEbayarYears/);
    assert.match(source, /id="nativeEbayarMonth" required><\/select>/);
    assert.doesNotMatch(source, /<option value="2026-09">/);
  }
});

test('year management writes only Config, rejects duplicates, and protects 2026', () => {
  const rows = [];
  let writes = 0;
  const sheet = {
    getLastRow: () => rows.length,
    getRange(row, col, count, width) {
      return {
        getValues: () => rows.slice(row - 1, row - 1 + count).map(value => value.slice(col - 1, col - 1 + width)),
        setValues(values) { values.forEach((value, index) => { rows[row - 1 + index] = value; writes++; }); },
        setValue(value) { rows[row - 1][col - 1] = value; writes++; }
      };
    }
  };
  const ctx = load(['writeEbayarYearConfig_', 'createEbayarYear', 'updateEbayarYear'], {
    EBAYAR_YEAR_CONFIG_HEADERS_: ['YEAR', 'STATUS', 'MODE', 'START_MONTH', 'END_MONTH', 'CREATED_AT', 'UPDATED_AT'],
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    getEbayarMasterSpreadsheet_: () => ({ getSheetByName: () => sheet }),
    getEbayarYearConfigs_: () => years,
    getEbayarYearManagementCore_: () => ({ success: true }),
    authorizePrivilegedHandler_: () => ({ valid: true }),
    getPaymentsRowsV2_: () => ({ rows: [] }),
    Utilities: { formatDate: (_date, _tz, format) => format === 'yyyy' ? '2026' : '2026-09-29 10:00:00' },
    SpreadsheetApp: { flush() {} }, Logger: { log() {} }
  });
  assert.equal(ctx.createEbayarYear({ year: 2028 }).success, true);
  assert.equal(rows[1][0], 2028);
  assert.equal(rows[1][2], 'NATIVE');
  assert.equal(rows[1][3], 1);
  assert.equal(rows[1][4], 12);
  const before = writes;
  assert.equal(ctx.createEbayarYear({ year: 2028 }).success, false);
  assert.equal(ctx.updateEbayarYear({ year: 2026, status: 'INACTIVE' }).success, false);
  assert.equal(writes, before);
});

test('receipt metadata includes future year while 2026 month text stays compatible', () => {
  const ctx = load(['buildNativeEbayarReceiptTemplateDataV2_'], {
    getMonthMetaV2_: () => ({ label: 'Januari' }),
    balanceNativeEbayarReceiptNamesV2_: names => names.join(', '),
    getNativeEbayarReceiptDisplayReferenceV2_: () => 'REF-1',
    formatNativeEbayarReceiptDateV2_: () => '10 Januari 2027'
  });
  const group = { bulanKey: '2027-01', paymentGroupId: 'NATIVE-202701-20270110000000-AAAAAAAAAA',
    paymentDate: '2027-01-10', amountTotal: 30, students: [{ nama: 'ALI' }] };
  assert.equal(ctx.buildNativeEbayarReceiptTemplateDataV2_(group).placeholders['<<BULAN>>'], 'JANUARI');
  group.bulanKey = '2026-01';
  assert.equal(ctx.buildNativeEbayarReceiptTemplateDataV2_(group).placeholders['<<BULAN>>'], 'JANUARI');
  assert.match(code, /RESIT_SPKM_' \+ group\.bulanKey\.replace\('-', '_'\)/);
  assert.match(extract(code, 'populateNativeEbayarReceiptPresentationV2_'), /replaceAllText\('2026', receiptYear\)/);
});

test('2027 receipt replaces both literal 2026 labels in a temporary slide', () => {
  const shapes = [
    { content: 'No: SL/<<BULAN>>/<<NO RESIT>>/2026\nKELAS <<BULAN>> 2026' },
    { content: '<<NAMA PENUH ANAK>>' },
    { content: '<<TARIKH>> RM<<BAYARAN>>' }
  ].map(shape => ({
    getText() { return { asString: () => shape.content, getTextStyle: () => ({ setFontSize() {} }) }; },
    replace(a, b) {
      const count = shape.content.split(a).length - 1;
      shape.content = shape.content.split(a).join(b);
      return count;
    }
  }));
  const presentation = {
    getSlides: () => [{ getShapes: () => shapes }],
    replaceAllText: (a, b) => shapes.reduce((total, shape) => total + shape.replace(a, b), 0)
  };
  const ctx = load(['buildNativeEbayarReceiptTemplateDataV2_', 'populateNativeEbayarReceiptPresentationV2_'], {
    getMonthMetaV2_: () => ({ label: 'Januari' }),
    balanceNativeEbayarReceiptNamesV2_: names => names.join(', '),
    getNativeEbayarReceiptDisplayReferenceV2_: () => 'REF-1',
    formatNativeEbayarReceiptDateV2_: () => '10 Januari 2027'
  });
  ctx.populateNativeEbayarReceiptPresentationV2_(presentation, {
    bulanKey: '2027-01', paymentGroupId: 'NATIVE-202701-20270110000000-AAAAAAAAAA',
    paymentDate: '2027-01-10', amountTotal: 30, students: [{ nama: 'ALI' }]
  });
  const text = shapes.map(shape => shape.getText().asString()).join(' ');
  assert.match(text, /JANUARI\/REF-1\/2027/);
  assert.match(text, /KELAS JANUARI 2027/);
  assert.doesNotMatch(text, /2026|<</);
});

test('Native payment fields derive year and month from validated BULAN_KEY', () => {
  const submit = extract(code, 'submitNativeEbayarPayment');
  assert.match(submit, /TAHUN: freshValidation\.bulanKey\.slice\(0, 4\)/);
  assert.match(submit, /BULAN_KEY: freshValidation\.bulanKey/);
  assert.match(submit, /SOURCE_YEAR: freshValidation\.bulanKey\.slice\(0, 4\)/);
  assert.match(submit, /STATUS: 'SELESAI'/);
  assert.match(submit, /STUDENT_ID: student\.studentKey/);
});

test('both frontend inline scripts parse as JavaScript', () => {
  for (const [name, source] of [['index.html', index], ['portal.html', portal]]) {
    for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
      if (match[1].trim()) new vm.Script(match[1], { filename: name });
    }
  }
});
