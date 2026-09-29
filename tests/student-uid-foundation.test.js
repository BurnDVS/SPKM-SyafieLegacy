const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');
const names = [
  'isStudentUid_', 'makeStudentUidFingerprint_', 'indexStudentUidRegistry_',
  'readStudentUidRegistry_', 'generateStudentUid_', 'resolveStudentUidOwnership_',
  'getStudentUidIdentityKey_', 'validateStudentUidRoster_',
  'validateStudentUidForNativeMonth_', 'prepareStudentUidRegistrationRow_',
  'previewStudentUidMigration_'
];
function extract(name) {
  const start = code.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name);
  let depth = 0;
  for (let i = code.indexOf('{', start); i < code.length; i++) {
    if (code[i] === '{') depth++;
    if (code[i] === '}' && --depth === 0) return code.slice(start, i + 1);
  }
  throw new Error('Unclosed ' + name);
}
function context(extra = {}) {
  const ctx = vm.createContext({
    COL_KANAK: { BIL: 0, NAMA: 4, NO_MYKID: 5, STATUS: 18, STUDENT_UID: 19 },
    COL_DEWASA: { BIL: 0, NAMA: 3, NO_MYKAD: 5, STATUS: 18, STUDENT_UID: 19 },
    STUDENT_UID_REGISTRY_TAB_: 'StudentUidRegistry',
    STUDENT_UID_REGISTRY_HEADERS_: [
      'STUDENT_UID', 'TYPE', 'NAMA', 'IDENTITY_FINGERPRINT', 'STATUS', 'CREATED_AT', 'UPDATED_AT'
    ],
    normalizeYuranNameV2_: value => String(value || '').trim().toUpperCase(),
    ...extra
  });
  names.forEach(name => vm.runInContext(extract(name), ctx));
  return ctx;
}
const uuidA = 'aaaaa123-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const uuidB = 'bbbbb123-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const childUid = 'KANAK:UAAAAA';
const adultUid = 'DEWASA:UBBBBB';
const fingerprintA = 'H1:' + 'A'.repeat(64);
const fingerprintB = 'H1:' + 'B'.repeat(64);
function registryRecord(uid, fingerprint, name = 'ALI', status = 'ACTIVE') {
  return {
    STUDENT_UID: uid, TYPE: uid.split(':')[0], NAMA: name,
    IDENTITY_FINGERPRINT: fingerprint, STATUS: status,
    CREATED_AT: '2026-09-29', UPDATED_AT: '2026-09-29'
  };
}
function row(type, name, officialId, uid = '', bil = '1') {
  const cells = Array(20).fill('');
  cells[0] = bil;
  cells[type === 'KANAK' ? 4 : 3] = name;
  cells[5] = officialId;
  cells[18] = 'AKTIF';
  cells[19] = uid;
  return cells;
}

test('short UID has uppercase type prefix and exactly five hex characters', () => {
  const ctx = context({ Utilities: { getUuid: () => uuidA } });
  const registry = ctx.indexStudentUidRegistry_([]);
  assert.equal(ctx.generateStudentUid_('KANAK', registry), childUid);
  assert.equal(ctx.generateStudentUid_('DEWASA', registry), 'DEWASA:UAAAAA');
  assert.equal(ctx.isStudentUid_('KANAK:U00001', 'KANAK'), true);
  assert.equal(ctx.isStudentUid_('DEWASA:UFFFFF', 'DEWASA'), true);
  for (const bad of ['KANAK:UAAAA', 'KANAK:UAAAAAA', 'KANAK:UAAAAG', 'KANAK:Uaaaaa', 'KANAK:AAAAA']) {
    assert.equal(ctx.isStudentUid_(bad), false, bad);
  }
  assert.equal(ctx.isStudentUid_(childUid, 'DEWASA'), false);
});

test('generation retries registry collisions, including removed students, and is bounded', () => {
  let next = 0;
  const ctx = context({ Utilities: { getUuid: () => [uuidA, uuidB][next++] } });
  const registry = ctx.indexStudentUidRegistry_([registryRecord(childUid, fingerprintA, 'FORMER', 'REMOVED')]);
  assert.equal(ctx.generateStudentUid_('KANAK', registry), 'KANAK:UBBBBB');
  next = 0;
  assert.equal(ctx.generateStudentUid_('DEWASA', registry), 'DEWASA:UAAAAA');
  assert.throws(() => ctx.generateStudentUid_('KANAK', {}), /Registry/);
  const alwaysCollide = context({ Utilities: { getUuid: () => uuidA } });
  assert.throws(() => alwaysCollide.generateStudentUid_('KANAK', registry), /unik tidak dapat/);
});

test('registry rejects duplicate UID, duplicate fingerprint, wrong prefix and malformed records', () => {
  const ctx = context();
  const first = registryRecord(childUid, fingerprintA);
  assert.equal(ctx.indexStudentUidRegistry_([first]).byUid[childUid].STATUS, 'ACTIVE');
  assert.throws(() => ctx.indexStudentUidRegistry_([first, first]), /berganda/);
  assert.throws(() => ctx.indexStudentUidRegistry_([first, registryRecord(adultUid, fingerprintA)]), /berganda/);
  assert.throws(() => ctx.indexStudentUidRegistry_([{ ...first, TYPE: 'DEWASA' }]), /tidak sah/);
  assert.throws(() => ctx.indexStudentUidRegistry_([{ ...first, STUDENT_UID: 'KANAK:148' }]), /tidak sah/);
});

test('private fingerprint is HMAC-derived, versioned and omits the source identifier', () => {
  const ctx = context({ Utilities: { computeHmacSha256Signature: () => Array(32).fill(-1) } });
  const fingerprint = ctx.makeStudentUidFingerprint_('KANAK:' + '0'.repeat(12), 's'.repeat(32));
  assert.equal(fingerprint, 'H1:' + 'FF'.repeat(32));
  assert.doesNotMatch(fingerprint, /000000000000/);
  assert.throws(() => ctx.makeStudentUidFingerprint_('KANAK:' + '0'.repeat(12), 'short'), /rahsia/);
});

test('returning student reuses permanent UID; possible matches require review', () => {
  const ctx = context();
  const registry = ctx.indexStudentUidRegistry_([registryRecord(childUid, fingerprintA, 'OLD NAME', 'REMOVED')]);
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', fingerprintA, 'NEW NAME').uid, childUid);
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', fingerprintB, 'OLD NAME', true).decision, 'REVIEW');
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', fingerprintB, 'UNSEEN NAME').decision, 'REVIEW');
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', fingerprintB, 'UNSEEN NAME', true).decision, 'NEW');
});

test('registration preparation is pure and independent of Bil and row position', () => {
  const ctx = context();
  const registry = ctx.indexStudentUidRegistry_([registryRecord(childUid, fingerprintA, 'OLD NAME', 'INACTIVE')]);
  const original = row('KANAK', 'NEW NAME', '', '', '1');
  const moved = row('KANAK', 'NEW NAME', '', '', '999');
  const a = ctx.prepareStudentUidRegistrationRow_(original, 'KANAK', registry, fingerprintA);
  const b = ctx.prepareStudentUidRegistrationRow_(moved, 'KANAK', registry, fingerprintA);
  assert.equal(a[19], childUid);
  assert.equal(b[19], childUid);
  assert.equal(original[19], '');
  assert.throws(() => ctx.prepareStudentUidRegistrationRow_(a, 'KANAK', registry, fingerprintA), /tidak sah/);
  assert.throws(() => ctx.prepareStudentUidRegistrationRow_(original, 'KANAK', registry, fingerprintB), /semakan/);
});

test('2027 validation rejects missing UID and conflicting registry owner; 2026 bypasses only UID check', () => {
  const ctx = context();
  const registry = ctx.indexStudentUidRegistry_([registryRecord(childUid, fingerprintA)]);
  const official = { uid: childUid, studentType: 'KANAK', fingerprint: fingerprintA };
  assert.equal(ctx.validateStudentUidForNativeMonth_('2026-09', [{ ...official, uid: '' }]), true);
  assert.throws(() => ctx.validateStudentUidForNativeMonth_('2027-01', [{ ...official, uid: '' }], registry), /tiada/);
  assert.equal(ctx.validateStudentUidForNativeMonth_('2027-01', [official], registry), true);
  assert.throws(() => ctx.validateStudentUidRoster_([official, official], registry), /berganda/);
  assert.throws(() => ctx.validateStudentUidRoster_([{ ...official, studentType: 'DEWASA' }], registry), /jenis/);
  assert.throws(() => ctx.validateStudentUidRoster_([{ ...official, fingerprint: fingerprintB }], registry), /bercanggah/);
  assert.throws(() => ctx.validateStudentUidRoster_([official], null), /Registry/);
});

test('registry reader only reads the specified schema and never creates a Sheet', () => {
  let reads = 0;
  const record = registryRecord(childUid, fingerprintA);
  const headers = ['STUDENT_UID', 'TYPE', 'NAMA', 'IDENTITY_FINGERPRINT', 'STATUS', 'CREATED_AT', 'UPDATED_AT'];
  const sheet = {
    getLastColumn: () => 7, getLastRow: () => 2,
    getRange: row => ({ getValues: () => { reads++; return row === 1 ? [headers] : [headers.map(h => record[h])]; } })
  };
  const ctx = context({ getEbayarMasterSpreadsheet_: () => ({ getSheetByName: () => sheet }) });
  assert.equal(ctx.readStudentUidRegistry_().byUid[childUid].STATUS, 'ACTIVE');
  assert.equal(reads, 2);
  assert.throws(() => context({ getEbayarMasterSpreadsheet_: () => ({ getSheetByName: () => null }) })
    .readStudentUidRegistry_(), /belum tersedia/);
  assert.doesNotMatch(extract('readStudentUidRegistry_'), /appendRow|setValue|setValues|insertSheet/);
});

test('migration preview classifies candidates without exposing official identifiers', () => {
  const ctx = context();
  const result = ctx.previewStudentUidMigration_({
    KANAK: [row('KANAK', 'ALI', '1'.repeat(12)), row('KANAK', 'BIBI', ''),
      row('KANAK', 'CICI', '9'.repeat(12), adultUid)],
    DEWASA: [row('DEWASA', 'DANI', '4'.repeat(12)), row('DEWASA', 'ELI', '4'.repeat(12))]
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.totals)), { AUTO_MATCH: 1, REVIEW: 1, CONFLICT: 3 });
  assert.equal(result.candidates[2].reasons[0], 'INVALID_OR_WRONG_TYPE_UID');
  assert.doesNotMatch(JSON.stringify(result), /111111111111|444444444444|999999999999/);
  const malformed = ctx.previewStudentUidMigration_({ KANAK: [row('KANAK', 'FIFI', '1'.repeat(10))], DEWASA: [] });
  assert.equal(malformed.candidates[0].reasons[0], 'INVALID_OFFICIAL_IDENTITY');
});

test('preview reads both 19-column rosters and makes no write', () => {
  let reads = 0;
  const raw = row('KANAK', 'ALI', '1'.repeat(12)).slice(0, 19);
  const getSheetByName = name => ({
    getLastRow: () => name === 'PendaftaranBaru' ? 2 : 1,
    getLastColumn: () => 19,
    getRange: (_r, _c, _n, width) => {
      reads++;
      assert.equal(width, 19);
      return { getValues: () => [raw] };
    }
  });
  const ctx = context({
    SPREADSHEET_ID: 'roster', TAB: { KANAK: 'PendaftaranBaru', DEWASA: 'KelasDewasa' },
    SpreadsheetApp: { openById: () => ({ getSheetByName }) }
  });
  assert.equal(ctx.previewStudentUidMigration_().totals.AUTO_MATCH, 1);
  assert.equal(reads, 1);
  assert.equal(raw.length, 19);
  assert.doesNotMatch(extract('previewStudentUidMigration_'), /appendRow|setValue|setValues|insertColumn|deleteRow/);
});

test('2026 compatibility and current 2027 payment identity paths remain untouched', () => {
  const start = code.indexOf('function getNativeEbayarOfficialStudentsV2_(');
  const end = code.indexOf('function getNativeEbayarStudentLookup(', start);
  assert.match(code.slice(start, end), /studentType \+ ':' \+ bil/);
  assert.match(code, /var BULAN_2026 = \[/);
  assert.match(code, /STUDENT_ID: student\.studentKey/);
  assert.doesNotMatch(code.slice(start, end), /STUDENT_UID/);
});
