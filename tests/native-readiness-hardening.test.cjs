const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const test = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');

function fixture() {
  const secret = 'A'.repeat(64);
  const ctx = vm.createContext({
    Logger: { log() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => key === 'EBAYAR_MASTER_SS_ID' ? 'master' : null }) },
    Utilities: {
      formatDate(_date, _zone, format) { return format === 'yyyy-MM' ? '2027-12' : '2027-01-10'; },
      computeHmacSha256Signature(value, key) { return Array.from(crypto.createHmac('sha256', key).update(value).digest()); }
    }
  });
  vm.runInContext(source, ctx);
  const uid = 'KANAK:U11111';
  const row = Array(20).fill('');
  row[0] = 1; row[4] = 'ALI'; row[5] = '010101010101'; row[18] = 'AKTIF'; row[19] = uid;
  const roster = { KANAK: [row], DEWASA: [] };
  const registryRows = [[uid, 'KANAK', 'ALI', ctx.makeStudentUidFingerprint_('KANAK:010101010101', secret), 'OFFICIAL_ID', 'ACTIVE', '', '']];
  const sheet = (rows, header) => ({
    getLastRow: () => rows.length + 1, getLastColumn: () => 20,
    getRange(r, c, n, w) { return {
      getValue: () => c === 20 ? 'STUDENT_UID' : '',
      getValues: () => r === 1 ? [header] : rows.slice(r - 2, r - 2 + n).map(x => x.slice(c - 1, c - 1 + w))
    }; }
  });
  ctx.SpreadsheetApp = { openById: () => ({ getSheetByName: name => sheet(name === ctx.TAB.KANAK ? roster.KANAK : roster.DEWASA) }) };
  ctx.getEbayarMasterSpreadsheet_ = () => ({ getSheetByName: name => name === 'StudentUidRegistry'
    ? sheet(registryRows, Array.from(ctx.STUDENT_UID_REGISTRY_HEADERS_)) : null });
  ctx.getStudentUidHmacSecret_ = () => secret;
  ctx.getEbayarYearConfigs_ = () => ({ '2027': { status: 'ACTIVE', mode: 'NATIVE', startMonth: 1, endMonth: 12 } });
  ctx.getTelefonMapV2_ = () => ({});
  ctx.requireEbayarPaymentPolicy_ = () => ({});
  ctx.authorizePrivilegedHandler_ = () => ({ valid: true });
  const payments = [];
  ctx.getPaymentsRowsV2_ = () => ({ rows: payments });
  const student = { studentKey: uid, nama: 'ALI', studentType: 'KANAK' };
  const payload = { bulanKey: '2027-01', students: [{ studentKey: uid, namaMurid: 'ALI' }],
    tarikhBayaran: '2027-01-10', jumlahKeseluruhan: '30.00', fileName: 'slip.pdf', mimeType: 'application/pdf', fileSize: 100 };
  return { ctx, uid, row, roster, registryRows, payments, student, payload,
    ownership: () => ctx.requireNativeStudentUidOwnership_('2027-01', [student]),
    preflight: () => ctx.validateNativeEbayarSubmissionV2_(payload) };
}

test('official ownership passes with real HMAC comparison and no mutation', () => {
  const f = fixture(); const before = JSON.stringify([f.roster, f.registryRows]);
  assert.equal(f.ownership(), true);
  assert.equal(f.preflight().readyToSubmit, true);
  assert.equal(JSON.stringify([f.roster, f.registryRows]), before);
});

for (const [label, change] of [
  ['wrong registry name', f => { f.registryRows[0][2] = 'OTHER'; }],
  ['wrong registry type', f => { f.registryRows[0][1] = 'DEWASA'; }],
  ['missing registry entry', f => { f.registryRows.length = 0; }],
  ['missing roster entry', f => { f.roster.KANAK.length = 0; }],
  ['fingerprint mismatch', f => { f.registryRows[0][3] = 'H1:' + 'B'.repeat(64); }],
  ['registry inactive', f => { f.registryRows[0][5] = 'INACTIVE'; }],
  ['roster inactive', f => { f.row[18] = 'TIDAK AKTIF'; }],
  ['duplicate roster UID', f => { f.roster.KANAK.push(f.row.slice()); }],
  ['duplicate registry UID', f => { f.registryRows.push(f.registryRows[0].slice()); }],
  ['missing HMAC secret', f => { f.ctx.getStudentUidHmacSecret_ = () => { throw new Error('Missing secret'); }; }],
  ['wrong selected type', f => { f.student.studentType = 'DEWASA'; }],
  ['manual evidence unavailable', f => { f.registryRows[0][3] = ''; f.registryRows[0][4] = 'MANUAL_ROSTER'; }]
]) test('ownership rejects ' + label, () => {
  const f = fixture(); change(f); assert.throws(f.ownership);
});

test('missing registry sheet fails closed', () => {
  const f = fixture(); f.ctx.getEbayarMasterSpreadsheet_ = () => ({ getSheetByName: () => null });
  assert.throws(f.ownership, /registry/i);
});

test('manual runtime refuses browser-supplied approvals', () => {
  const f = fixture(); f.registryRows[0][3] = ''; f.registryRows[0][4] = 'MANUAL_ROSTER';
  f.student.manualApprovalId = 'FORGED';
  assert.throws(f.ownership, /approved binding\/manifest/);
  assert.equal(f.preflight().readyToSubmit, false);
});

test('2026 bypasses UID ownership and does not read registry', () => {
  const f = fixture(); f.ctx.readStudentUidRegistry_ = () => { throw new Error('Unexpected registry read'); };
  assert.equal(f.ctx.requireNativeStudentUidOwnership_('2026-09', [{ studentKey: 'KANAK:1' }]), true);
});

test('2027 rejects BIL/name-only input and historical names require review', () => {
  const f = fixture(); f.payload.students[0].studentKey = 'KANAK:1';
  assert.equal(f.preflight().readyToSubmit, false);
  f.payload.students[0].studentKey = f.uid;
  f.payments.push({ BULAN_KEY: '2027-01', NAMA_MURID_NORM: 'ALI', STUDENT_ID: '', STATUS: 'SELESAI' });
  const result = f.preflight();
  assert.equal(result.readyToSubmit, false);
  assert.match(result.message, /semakan/);
  assert.equal(result.hasDuplicate, false);
  assert.deepEqual(Object.keys(f.ctx.getNativeEbayarPaidStudentIds_('2027-01', f.payments,
    { [f.uid]: f.student })), [f.uid]);
});

test('lookup enforces ownership on server results', () => {
  const f = fixture();
  assert.equal(f.ctx.getNativeEbayarStudentLookup({ bulanKey: '2027-01', keyword: 'ALI' }).success, true);
  f.registryRows[0][3] = 'H1:' + 'B'.repeat(64);
  assert.equal(f.ctx.getNativeEbayarStudentLookup({ bulanKey: '2027-01', keyword: 'ALI' }).success, false);
});

test('online revalidates ownership under lock before any upload or write', () => {
  const f = fixture(); let locks = 0;
  f.ctx.getEbayarPortalModeState_ = () => ({ resolvedMode: 'NATIVE' });
  f.ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => 'SLIP-FOLDER' }) };
  f.payload.fileDataBase64 = 'QUJDRA=='; f.payload.fileSize = 4;
  f.ctx.Utilities.base64Decode = () => [1, 2, 3, 4];
  f.ctx.isNativeEbayarFileSignatureValidV2_ = () => true;
  f.ctx.LockService = { getScriptLock: () => ({ tryLock() {
    locks++; f.registryRows[0][5] = 'REMOVED'; return true;
  }, releaseLock() {} }) };
  f.ctx.DriveApp = { getFolderById() { assert.fail('Upload after ownership revoked'); } };
  f.ctx.getEbayarMasterSpreadsheetForImportV2_ = () => assert.fail('Write after ownership revoked');
  const result = f.ctx.submitNativeEbayarPayment(f.payload);
  assert.equal(locks, 1); assert.equal(result.success, false);
});

test('dashboard routes Jan/Jun/Dec 2027 Native and preserves 2026 boundary', () => {
  const f = fixture(); const calls = [];
  f.ctx.getYuranStats = p => { calls.push(['LEGACY', p]); return { success: true }; };
  f.ctx.getYuranStatsV2 = p => { calls.push(['NATIVE', p]); return { success: true }; };
  for (const month of ['01', '06', '12']) assert.equal(f.ctx.getYuranStatsForDashboard_({ bulanKey: '2027-' + month }).success, true);
  f.ctx.getYuranStatsForDashboard_({ bulan: 'JAN2026' });
  f.ctx.getYuranStatsForDashboard_({ bulan: 'SEPT2026' });
  assert.deepEqual(calls.map(c => c[0]), ['NATIVE', 'NATIVE', 'NATIVE', 'LEGACY', 'NATIVE']);
  assert.equal(f.ctx.getYuranStatsForDashboard_({ bulanKey: '2028-01' }).success, false);
});

test('Native reader totals exclude blank/unknown and count each group once', () => {
  const f = fixture();
  for (const [id, status, group, amount] of [[f.uid, 'SELESAI', 'G1', 60], [f.uid, 'SELESAI', 'G1', 60],
    [f.uid, '', 'G2', 20], [f.uid, 'UNKNOWN', 'G3', 30], [f.uid, 'PENDING', 'G4', 40]]) {
    f.payments.push({ BULAN_KEY: '2027-01', STUDENT_ID: id, NAMA_MURID_NORM: 'ALI', STATUS: status,
      PAYMENT_GROUP_ID: group, AMOUNT_TOTAL: amount });
  }
  const summary = f.ctx.getMonthlyPaymentSummaryV2({ tahun: '2027' }).summaries[0];
  assert.equal(summary.totalKutipan, 60); assert.equal(summary.paymentGroups, 1); assert.equal(summary.selesai, 1);
  const dashboard = f.ctx.getYuranStatsV2({ tahun: '2027', bulanKey: '2027-01' });
  assert.equal(dashboard.totalKutipan, 60); assert.equal(dashboard.sudahBayar, 1);
  assert.equal(f.ctx.getYuranParentV2({ tahun: '2027', keyword: 'ALI' }).found.length, 1);
  f.payments.splice(0, 2);
  assert.equal(f.ctx.getNativeEbayarMonthStats_('2027-01', f.payments).selesai, 0);
  assert.equal(f.ctx.getYuranStatsV2({ tahun: '2027', bulanKey: '2027-01' }).totalKutipan, 0);
});

test('blank-status compatibility is only pre-Native historical', () => {
  const f = fixture();
  f.payments.push({ BULAN_KEY: '2026-08', NAMA_MURID_NORM: 'OLD', STATUS: '', AMOUNT_TOTAL: 20 });
  f.payments.push({ BULAN_KEY: '2027-01', NAMA_MURID_NORM: 'ALI', STATUS: '', AMOUNT_TOTAL: 30 });
  const summaries = f.ctx.getMonthlyPaymentSummaryV2({}).summaries;
  assert.equal(summaries[0].selesai, 1); assert.equal(summaries[0].totalKutipan, 20);
  assert.equal(summaries[1].selesai, 0); assert.equal(summaries[1].totalKutipan, 0);
});

test('both eSemak readers keep same-name distinct UIDs without leaking IDs', () => {
  const f = fixture(); const other = f.row.slice(); other[0] = 2; other[19] = 'KANAK:U22222';
  f.roster.KANAK.push(other);
  for (const [uid, receipt] of [[f.uid, 'one'], ['KANAK:U22222', 'two'], [f.uid, 'one']]) {
    f.payments.push({ BULAN_KEY: '2027-01', STUDENT_ID: uid, NAMA_MURID_NORM: 'ALI', STATUS: 'SELESAI', RESIT_URL: 'https://example.test/' + receipt });
  }
  const getRoster = f.ctx.SpreadsheetApp.openById;
  f.ctx.SpreadsheetApp.openById = id => id === f.ctx.SPREADSHEET_ID ? getRoster(id) : { getSheetByName: () => null };
  for (const result of [f.ctx.getYuranParent({ keyword: 'ALI' }), f.ctx.getYuranParentV2({ tahun: '2027', keyword: 'ALI' })]) {
    assert.equal(result.success, true, JSON.stringify(result));
    assert.equal(result.found.length, 2);
    assert.deepEqual(Array.from(result.found, r => r.resitUrl), ['https://example.test/one', 'https://example.test/two']);
    assert.doesNotMatch(JSON.stringify(result), /KANAK:|STUDENT_ID|_identityKey/);
  }
});

function receipt(channel, method, sourceSheet) {
  const f = fixture(); const groupId = 'NATIVE-202701-20270110000000-AAAAAAAAAA';
  f.payments.push({ PAYMENT_GROUP_ID: groupId, BULAN_KEY: '2027-01', STUDENT_ID: f.uid,
    STUDENT_TYPE: 'KANAK', NAMA_MURID_NORM: 'ALI', STATUS: 'SELESAI', AMOUNT_TOTAL: 30,
    KAEDAH: method, SOURCE_SHEET: sourceSheet, SOURCE_ROW_HASH: 'hash', _rowNumber: 2,
    NOTE: JSON.stringify({ channel, paymentDate: '2027-01-10' }) });
  return { f, groupId };
}

for (const tuple of [['NATIVE_EBAYAR', 'NATIVE_EBAYAR', 'NATIVE_EBAYAR'], ['NATIVE_CASH', 'CASH', 'NATIVE_CASH']]) {
  test('receipt allowlist accepts isolated tuple ' + tuple[0], () => {
    const { f, groupId } = receipt(...tuple);
    assert.ok(f.ctx.parseNativeEbayarNoteV2_(f.payments[0].NOTE));
    assert.equal(f.ctx.validateNativeEbayarReceiptGroupV2_(groupId).success, true);
  });
}

for (const tuple of [['NATIVE_EBAYAR', 'CASH', 'NATIVE_EBAYAR'], ['NATIVE_CASH', 'NATIVE_EBAYAR', 'NATIVE_CASH'],
  ['NATIVE_CASH', 'CASH', 'NATIVE_EBAYAR'], ['UNKNOWN', 'CASH', 'NATIVE_CASH']]) {
  test('receipt rejects mismatched tuple ' + tuple.join('/'), () => {
    const { f, groupId } = receipt(...tuple);
    assert.equal(f.ctx.validateNativeEbayarReceiptGroupV2_(groupId).success, false);
  });
}

test('receipt rejects mixed-channel rows within one group', () => {
  const { f, groupId } = receipt('NATIVE_EBAYAR', 'NATIVE_EBAYAR', 'NATIVE_EBAYAR');
  f.payments.push({ ...f.payments[0], STUDENT_ID: 'KANAK:U22222', KAEDAH: 'CASH', SOURCE_SHEET: 'NATIVE_CASH',
    NOTE: JSON.stringify({ channel: 'NATIVE_CASH', paymentDate: '2027-01-10' }) });
  assert.equal(f.ctx.validateNativeEbayarReceiptGroupV2_(groupId).success, false);
});
