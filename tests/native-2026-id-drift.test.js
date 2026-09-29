const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');

function fixture() {
  const ctx = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    Logger: { log() {} },
    Utilities: { formatDate(date, zone, format) {
      assert.equal(zone, 'Asia/Kuala_Lumpur');
      if (format === 'yyyy-MM') return '2026-09';
      return '2026-09-29';
    } }
  });
  vm.runInContext(source, ctx);
  const roster = { KANAK: [], DEWASA: [] };
  function student(bil, name, type = 'KANAK', date = '', status = 'AKTIF') {
    const row = Array(19).fill('');
    row[0] = bil; row[1] = date; row[type === 'KANAK' ? 4 : 3] = name; row[18] = status;
    roster[type].push(row);
  }
  student(132, 'RAYFAL'); student(134, 'RAYKA'); student(139, 'OTHER CHILD');
  const rows = [];
  const sheet = values => ({
    getLastRow: () => values.length + 1,
    getLastColumn: () => 19,
    getRange: (r, c, n, w) => ({ getValues: () => values.slice(r - 2, r - 2 + n).map(row => row.slice(c - 1, c - 1 + w)) })
  });
  ctx.SpreadsheetApp = { openById: id => ({ getSheetByName: name => {
    if (id === ctx.SPREADSHEET_ID) return sheet(name === ctx.TAB.KANAK ? roster.KANAK : roster.DEWASA);
    if (name.startsWith('Calculation')) return sheet([['', '', '', 'RAYFAL']]);
    return null;
  } }) };
  ctx.getPaymentsRowsV2_ = () => ({ rows });
  ctx.getEbayarYearConfigs_ = () => ({});
  ctx.getTelefonMapV2_ = () => ({});
  const payment = (id, name, extra = {}) => ({ BULAN_KEY: '2026-09', STUDENT_ID: id,
    STUDENT_TYPE: 'KANAK', NAMA_MURID_NORM: name, STATUS: 'SELESAI', ...extra });
  const directory = () => ctx.getNative2026EligibleDirectory_('2026-09');
  const resolve = row => ctx.resolveNative2026PaymentStudent_('2026-09', row, directory());
  const preflight = (key, name) => ctx.validateNativeEbayarSubmissionV2_({
    bulanKey: '2026-09', students: [{ studentKey: key, namaMurid: name }],
    tarikhBayaran: '2026-09-29', jumlahKeseluruhan: '30.00', fileName: 'slip.pdf',
    mimeType: 'application/pdf', fileSize: 100
  });
  return { ctx, roster, rows, student, payment, directory, resolve, preflight };
}

test('2026 exact ID plus normalized name and type resolves paid', () => {
  const f = fixture(); const row = f.payment('KANAK:132', '  rayfal  ');
  assert.equal(f.resolve(row).status, 'EXACT');
  assert.deepEqual(Object.keys(f.ctx.getNativeEbayarPaidStudentIds_('2026-09', [row], f.directory())), ['KANAK:132']);
});

test('missing old ID safely falls back to unique same type and name', () => {
  const f = fixture(); const match = f.resolve(f.payment('KANAK:141', 'RAYKA'));
  assert.equal(match.status, 'NAME_FALLBACK'); assert.equal(match.studentKey, 'KANAK:134');
});

test('drifted ID never credits its new owner; payment is not mutated', () => {
  const f = fixture(); const row = Object.freeze(f.payment('KANAK:139', 'RAYFAL'));
  assert.equal(f.resolve(row).studentKey, 'KANAK:132');
  const paid = f.ctx.getNativeEbayarPaidStudentIds_('2026-09', [row, row], f.directory());
  assert.deepEqual(Object.keys(paid), ['KANAK:132']); assert.equal(row.STUDENT_ID, 'KANAK:139');
});

test('duplicate normalized name fails closed even if mutable ID matches', () => {
  const f = fixture(); f.student(160, '  RAYFAL ');
  const row = f.payment('KANAK:132', 'RAYFAL'); f.rows.push(row);
  assert.equal(f.resolve(row).status, 'AMBIGUOUS');
  assert.equal(Object.keys(f.ctx.getNativeEbayarPaidStudentIds_('2026-09', f.rows, f.directory())).length, 0);
  assert.equal(f.preflight('KANAK:132', 'RAYFAL').readyToSubmit, false);
  assert.equal(f.ctx.getNativeEbayarStudentLookup({ bulanKey: '2026-09', keyword: 'RAYFAL' }).results.length, 0);
});

test('removed student history remains readable without crediting reused ID', () => {
  const f = fixture(); const row = f.payment('KANAK:139', 'FORMER CHILD', { RESIT_URL: 'https://example.test/old.pdf' });
  f.rows.push(row);
  assert.equal(f.resolve(row).status, 'UNMATCHED');
  assert.equal(Object.keys(f.ctx.getNativeEbayarPaidStudentIds_('2026-09', f.rows, f.directory())).length, 0);
  const result = f.ctx.getYuranParent({ keyword: 'FORMER' });
  assert.equal(result.success, true); assert.equal(result.found[0].resitUrl, row.RESIT_URL);
  assert.equal(result.belumBayar.SEPT2026.includes('OTHER CHILD'), true);
});

test('type separates same-name students and missing or wrong type never guesses', () => {
  const f = fixture(); f.student(1, 'RAYFAL', 'DEWASA');
  assert.equal(f.resolve(f.payment('KANAK:139', 'RAYFAL')).studentKey, 'KANAK:132');
  assert.equal(f.resolve(f.payment('KANAK:132', 'RAYKA', { STUDENT_TYPE: 'DEWASA' })).status, 'UNMATCHED');
  assert.equal(f.resolve(f.payment('KANAK:132', 'RAYFAL', { STUDENT_TYPE: '' })).status, 'UNMATCHED');
});

test('lookup and preflight block both drifted paid students but allow wrong ID owner', () => {
  const f = fixture(); f.rows.push(f.payment('KANAK:139', 'RAYFAL'), f.payment('KANAK:141', 'RAYKA'));
  assert.equal(f.ctx.getNativeEbayarStudentLookup({ bulanKey: '2026-09', keyword: 'RAY' }).results.length, 0);
  assert.equal(f.preflight('KANAK:132', 'RAYFAL').hasDuplicate, true);
  assert.equal(f.preflight('KANAK:134', 'RAYKA').hasDuplicate, true);
  assert.equal(f.preflight('KANAK:139', 'OTHER CHILD').readyToSubmit, true);
});

test('duplicate guard still blocks pending payments while stats require SELESAI', () => {
  const f = fixture(); f.rows.push(f.payment('KANAK:139', 'RAYFAL', { STATUS: 'PENDING' }));
  assert.equal(f.preflight('KANAK:132', 'RAYFAL').hasDuplicate, true);
  assert.equal(f.ctx.getNativeEbayarMonthStats_('2026-09', f.rows).selesai, 0);
});

test('cards, Native stats, dashboard and both unpaid readers agree after ID drift', () => {
  const f = fixture(); f.rows.push(f.payment('KANAK:139', 'RAYFAL'), f.payment('KANAK:141', 'RAYKA'));
  const card = f.ctx.getEbayarStats().stats[8];
  assert.equal(card.jumlahDaftar, 3); assert.equal(card.selesai, 2); assert.equal(card.belum, 1);
  assert.equal(f.ctx.getNativeEbayarMonthStats_('2026-09', f.rows).selesai, 2);
  const dashboard = f.ctx.getYuranStatsV2({ bulanKey: '2026-09', tahun: '2026', requireExactSelesai: true });
  assert.equal(dashboard.success, true); assert.equal(dashboard.sudahBayar, 2);
  assert.deepEqual(Array.from(dashboard.belumBayar, s => s.nama), ['OTHER CHILD']);
  assert.deepEqual(Array.from(f.ctx.getYuranParent({}).belumBayar.SEPT2026), ['OTHER CHILD']);
  assert.deepEqual(Array.from(f.ctx.getYuranParentV2({}).belumBayar['2026-09']), ['OTHER CHILD']);
});

test('resolver applies only Sep-Dec 2026 and other months do not borrow payments', () => {
  const f = fixture(); const row = f.payment('KANAK:139', 'RAYFAL');
  for (const month of ['2026-09', '2026-10', '2026-11', '2026-12']) {
    assert.equal(f.ctx.resolveNative2026PaymentStudent_(month, row, f.directory()).studentKey, 'KANAK:132');
  }
  for (const month of ['2026-01', '2026-08', '2027-01', '2027-12']) {
    assert.equal(f.ctx.resolveNative2026PaymentStudent_(month, row, f.directory()).status, 'NOT_APPLICABLE');
  }
  assert.equal(Object.keys(f.ctx.getNativeEbayarPaidStudentIds_('2026-10', [row], f.directory())).length, 0);
});

test('2027 stable UID paid path bypasses 2026 resolver', () => {
  const f = fixture(); f.ctx.resolveNative2026PaymentStudent_ = () => { throw new Error('2026 resolver reached'); };
  const id = 'KANAK:U7A3F1';
  const paid = f.ctx.getNativeEbayarPaidStudentIds_('2027-01', [f.payment(id, 'RENAMED', { BULAN_KEY: '2027-01' })],
    { [id]: { nama: 'CURRENT NAME', studentType: 'KANAK' } });
  assert.deepEqual(Object.keys(paid), [id]);
});

test('Jan-Aug card calculations still use Legacy Calculation and ignore Native rows', () => {
  const f = fixture(); f.rows.push(f.payment('KANAK:139', 'RAYKA', { BULAN_KEY: '2026-01' }));
  const stats = f.ctx.getEbayarStats().stats;
  for (let i = 0; i < 8; i++) { assert.equal(stats[i].selesai, 1); assert.equal(stats[i].belum, 2); }
});

test('inactive and registered-later students are excluded from compatibility directory', () => {
  const f = fixture(); f.student(160, 'INACTIVE', 'KANAK', '', 'TIDAK AKTIF');
  f.student(161, 'LATER', 'KANAK', '01/10/2026');
  // Use actual date formatting for eligibility in this test.
  f.ctx.Utilities.formatDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit' }).format(date);
  assert.equal(Object.keys(f.directory()).length, 3);
});
