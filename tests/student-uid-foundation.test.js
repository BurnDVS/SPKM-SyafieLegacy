const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');
const names = [
  'isStudentUid_', 'makeStudentUidFingerprint_', 'getStudentUidHmacSecret_', 'indexStudentUidRegistry_',
  'readStudentUidRegistry_', 'generateStudentUid_', 'resolveStudentUidOwnership_',
  'getStudentUidIdentityKey_', 'validateStudentUidRoster_',
  'validateStudentUidForNativeMonth_', 'prepareStudentUidRegistrationRow_',
  'previewStudentUidMigration_', 'getStudentUidMigrationPreflight_'
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
    STUDENT_UID_HMAC_PROPERTY_: 'STUDENT_UID_HMAC_SECRET_V1',
    STUDENT_UID_REGISTRY_HEADERS_: [
      'STUDENT_UID', 'TYPE', 'NAMA', 'IDENTITY_FINGERPRINT', 'VERIFY_METHOD', 'STATUS', 'CREATED_AT', 'UPDATED_AT'
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
function registryRecord(uid, fingerprint, name = 'ALI', status = 'ACTIVE', method = 'OFFICIAL_ID') {
  return {
    STUDENT_UID: uid, TYPE: uid.split(':')[0], NAMA: name,
    IDENTITY_FINGERPRINT: fingerprint, VERIFY_METHOD: method, STATUS: status,
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
  assert.throws(() => ctx.indexStudentUidRegistry_([{ ...first, IDENTITY_FINGERPRINT: '' }]), /tidak sah/);
  assert.throws(() => ctx.indexStudentUidRegistry_([{ ...first, VERIFY_METHOD: 'MANUAL_ROSTER' }]), /tidak sah/);
  const manual = registryRecord(adultUid, '', 'BIBI', 'REMOVED', 'MANUAL_ROSTER');
  assert.equal(ctx.indexStudentUidRegistry_([manual]).byUid[adultUid].IDENTITY_FINGERPRINT, '');
  assert.equal(Object.keys(ctx.indexStudentUidRegistry_([manual, registryRecord(childUid, '', 'CICI', 'ACTIVE', 'MANUAL_ROSTER')]).byFingerprint).length, 0);
});

test('private fingerprint is HMAC-derived, versioned and omits the source identifier', () => {
  const ctx = context({ Utilities: { computeHmacSha256Signature: () => Array(32).fill(-1) } });
  const fingerprint = ctx.makeStudentUidFingerprint_('KANAK:' + '0'.repeat(12), 'A'.repeat(64));
  assert.equal(fingerprint, 'H1:' + 'FF'.repeat(32));
  assert.doesNotMatch(fingerprint, /000000000000/);
  assert.throws(() => ctx.makeStudentUidFingerprint_('KANAK:' + '0'.repeat(12), 'short'), /rahsia/);
  assert.throws(() => ctx.makeStudentUidFingerprint_('KANAK:' + '0'.repeat(12), 'Z'.repeat(64)), /rahsia/);
});

test('missing HMAC configuration fails closed without creating a secret', () => {
  const ctx = context({ PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) } });
  assert.throws(() => ctx.getStudentUidHmacSecret_(), /belum tersedia/);
  assert.doesNotMatch(extract('getStudentUidHmacSecret_'), /setProperty|deleteProperty/);
});

test('returning student reuses permanent UID; possible matches require review', () => {
  const ctx = context();
  const registry = ctx.indexStudentUidRegistry_([registryRecord(childUid, fingerprintA, 'OLD NAME', 'REMOVED')]);
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', 'OFFICIAL_ID', fingerprintA, 'NEW NAME').uid, childUid);
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', 'OFFICIAL_ID', fingerprintB, 'OLD NAME', { confirmedNewIdentity: true, approvalId: 'A1' }).decision, 'REVIEW');
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', 'OFFICIAL_ID', fingerprintB, 'UNSEEN NAME').decision, 'REVIEW');
  assert.equal(ctx.resolveStudentUidOwnership_(registry, 'KANAK', 'OFFICIAL_ID', fingerprintB, 'UNSEEN NAME', { confirmedNewIdentity: true, approvalId: 'A1' }).decision, 'NEW');
  const manual = ctx.indexStudentUidRegistry_([registryRecord(childUid, '', 'OLD NAME', 'REMOVED', 'MANUAL_ROSTER')]);
  assert.equal(ctx.resolveStudentUidOwnership_(manual, 'KANAK', 'MANUAL_ROSTER', '', 'OLD NAME').decision, 'REVIEW');
  assert.equal(ctx.resolveStudentUidOwnership_(manual, 'KANAK', 'MANUAL_ROSTER', '', 'CHANGED NAME').decision, 'REVIEW');
  assert.equal(ctx.resolveStudentUidOwnership_(manual, 'KANAK', 'MANUAL_ROSTER', '', 'CHANGED NAME',
    { verifiedHistoricalUid: childUid, approvalId: 'VERIFIED-EVIDENCE' }).uid, childUid);
  assert.equal(ctx.resolveStudentUidOwnership_(manual, 'KANAK', 'MANUAL_ROSTER', '', 'NEW STUDENT',
    { confirmedNewIdentity: true, approvalId: 'APPROVED-NEW' }).decision, 'NEW');
  assert.throws(() => ctx.resolveStudentUidOwnership_(manual, 'KANAK', 'OFFICIAL_ID', '', 'NEW STUDENT'), /tidak sah/);
});

test('registration preparation is pure and independent of Bil and row position', () => {
  const ctx = context();
  const registry = ctx.indexStudentUidRegistry_([registryRecord(childUid, fingerprintA, 'OLD NAME', 'INACTIVE')]);
  const original = row('KANAK', 'NEW NAME', '', '', '1');
  const moved = row('KANAK', 'NEW NAME', '', '', '999');
  const a = ctx.prepareStudentUidRegistrationRow_(original, 'KANAK', registry, 'OFFICIAL_ID', fingerprintA);
  const b = ctx.prepareStudentUidRegistrationRow_(moved, 'KANAK', registry, 'OFFICIAL_ID', fingerprintA);
  assert.equal(a[19], childUid);
  assert.equal(b[19], childUid);
  assert.equal(original[19], '');
  assert.throws(() => ctx.prepareStudentUidRegistrationRow_(a, 'KANAK', registry, 'OFFICIAL_ID', fingerprintA), /tidak sah/);
  assert.throws(() => ctx.prepareStudentUidRegistrationRow_(original, 'KANAK', registry, 'OFFICIAL_ID', fingerprintB), /semakan/);
});

test('approved manual roster identity can receive UID with blank fingerprint', () => {
  const ctx = context({ Utilities: { getUuid: () => uuidA } });
  const registry = ctx.indexStudentUidRegistry_([]);
  const original = row('KANAK', 'LEGITIMATE STUDENT', '');
  assert.throws(() => ctx.prepareStudentUidRegistrationRow_(original, 'KANAK', registry,
    'MANUAL_ROSTER', '', {}), /semakan/);
  const prepared = ctx.prepareStudentUidRegistrationRow_(original, 'KANAK', registry,
    'MANUAL_ROSTER', '', { confirmedNewIdentity: true, approvalId: 'RESTRICTED-MANIFEST-1' });
  assert.equal(prepared[19], childUid);
  assert.equal(original[19], '');
});

test('2027 validation rejects missing UID and conflicting registry owner; 2026 bypasses only UID check', () => {
  const ctx = context();
  const registry = ctx.indexStudentUidRegistry_([registryRecord(childUid, fingerprintA)]);
  const official = { uid: childUid, studentType: 'KANAK', verifyMethod: 'OFFICIAL_ID', fingerprint: fingerprintA };
  assert.equal(ctx.validateStudentUidForNativeMonth_('2026-09', [{ ...official, uid: '' }]), true);
  assert.throws(() => ctx.validateStudentUidForNativeMonth_('2027-01', [{ ...official, uid: '' }], registry), /tiada/);
  assert.equal(ctx.validateStudentUidForNativeMonth_('2027-01', [official], registry), true);
  assert.throws(() => ctx.validateStudentUidRoster_([official, official], registry), /berganda/);
  assert.throws(() => ctx.validateStudentUidRoster_([{ ...official, studentType: 'DEWASA' }], registry), /jenis/);
  assert.throws(() => ctx.validateStudentUidRoster_([{ ...official, fingerprint: fingerprintB }], registry), /bercanggah/);
  assert.throws(() => ctx.validateStudentUidRoster_([official], null), /Registry/);
  const manualRegistry = ctx.indexStudentUidRegistry_([registryRecord(childUid, '', 'ALI', 'ACTIVE', 'MANUAL_ROSTER')]);
  const manual = { uid: childUid, studentType: 'KANAK', verifyMethod: 'MANUAL_ROSTER', fingerprint: '', manualApprovalId: 'APPROVED-1' };
  assert.throws(() => ctx.validateStudentUidRoster_([manual], manualRegistry), /bercanggah/);
  assert.equal(ctx.validateStudentUidRoster_([manual], manualRegistry, { [childUid]: 'APPROVED-1' }), true);
});

test('registry reader only reads the specified schema and never creates a Sheet', () => {
  let reads = 0;
  const record = registryRecord(childUid, fingerprintA);
  const headers = ['STUDENT_UID', 'TYPE', 'NAMA', 'IDENTITY_FINGERPRINT', 'VERIFY_METHOD', 'STATUS', 'CREATED_AT', 'UPDATED_AT'];
  const sheet = {
    getLastColumn: () => 8, getLastRow: () => 2,
    getRange: row => ({ getValues: () => { reads++; return row === 1 ? [headers] : [headers.map(h => record[h])]; } })
  };
  const ctx = context({ getEbayarMasterSpreadsheet_: () => ({ getSheetByName: () => sheet }) });
  assert.equal(ctx.readStudentUidRegistry_().byUid[childUid].STATUS, 'ACTIVE');
  assert.equal(reads, 2);
  assert.throws(() => context({ getEbayarMasterSpreadsheet_: () => ({ getSheetByName: () => ({ getLastColumn: () => 7 }) }) })
    .readStudentUidRegistry_(), /belum tersedia/);
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
  assert.deepEqual(JSON.parse(JSON.stringify(result.totals)), { AUTO_MATCH: 2, REVIEW: 0, CONFLICT: 3, OFFICIAL_ID: 1, MANUAL_ROSTER: 1 });
  assert.equal(result.candidates[2].reasons[0], 'INVALID_OR_WRONG_TYPE_UID');
  assert.doesNotMatch(JSON.stringify(result), /111111111111|444444444444|999999999999/);
  const malformed = ctx.previewStudentUidMigration_({ KANAK: [row('KANAK', 'FIFI', '1'.repeat(10))], DEWASA: [] });
  assert.equal(malformed.candidates[0].verificationMethod, 'MANUAL_ROSTER');
  assert.equal(malformed.candidates[0].classification, 'AUTO_MATCH');
  assert.equal(malformed.candidates[0].reasons[0], 'MANUAL_ROSTER_INVALID_OFFICIAL_ID');
  const ambiguous = ctx.previewStudentUidMigration_({
    KANAK: [row('KANAK', 'SAME NAME', ''), row('KANAK', 'SAME NAME', '')], DEWASA: []
  });
  assert.equal(ambiguous.totals.REVIEW, 2);
  assert.equal(ambiguous.totals.MANUAL_ROSTER, 0);
  const sameInvalidNumber = ctx.previewStudentUidMigration_({
    KANAK: [row('KANAK', 'FIRST', '1'.repeat(10)), row('KANAK', 'SECOND', '1'.repeat(10))], DEWASA: []
  });
  assert.equal(sameInvalidNumber.totals.REVIEW, 2);
  assert.equal(sameInvalidNumber.candidates[0].reasons[0], 'DUPLICATE_UNUSABLE_IDENTITY');
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

test('migration preflight reads only, blocks missing registry, column and HMAC', () => {
  const raw = row('KANAK', 'ALI', '1'.repeat(12)).slice(0, 19);
  const sheet = (hasStudent) => ({
    getLastRow: () => hasStudent ? 2 : 1,
    getLastColumn: () => 19,
    getRange: () => ({ getValues: () => [raw] })
  });
  const ctx = context({
    SPREADSHEET_ID: 'roster', TAB: { KANAK: 'PendaftaranBaru', DEWASA: 'KelasDewasa' },
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => sheet(name === 'PendaftaranBaru') }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'SHA_256' }, computeDigest: () => Array(32).fill(0) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) }
  });
  ctx.readStudentUidRegistry_ = () => { throw new Error('Registry absent'); };
  const result = ctx.getStudentUidMigrationPreflight_({
    snapshotHash: '00'.repeat(32), kanakRows: 1, dewasaRows: 0,
    AUTO_MATCH: 1, REVIEW: 0, CONFLICT: 0, OFFICIAL_ID: 1, MANUAL_ROSTER: 0
  });
  assert.equal(result.status, 'BLOCKED');
  assert.deepEqual(Array.from(result.blockers).sort(), [
    'DEWASA_UID_COLUMN_MISSING', 'HMAC_MISSING_OR_INVALID',
    'KANAK_UID_COLUMN_MISSING', 'REGISTRY_MISSING_OR_INVALID'
  ].sort());
  assert.doesNotMatch(extract('getStudentUidMigrationPreflight_'), /appendRow|setValue|setValues|insertSheet|setProperty/);
});

test('migration preflight passes an approved unchanged snapshot with ready schema', () => {
  const child = row('KANAK', 'ALI', '1'.repeat(12));
  const sheet = hasStudent => ({
    getLastRow: () => hasStudent ? 2 : 1,
    getLastColumn: () => 20,
    getRange: (r) => ({
      getValue: () => 'STUDENT_UID',
      getValues: () => r === 2 ? [child] : []
    })
  });
  const ctx = context({
    SPREADSHEET_ID: 'roster', TAB: { KANAK: 'PendaftaranBaru', DEWASA: 'KelasDewasa' },
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => sheet(name === 'PendaftaranBaru') }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'SHA_256' }, computeDigest: () => Array(32).fill(0) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'A'.repeat(64) }) }
  });
  ctx.readStudentUidRegistry_ = () => ctx.indexStudentUidRegistry_([]);
  const result = ctx.getStudentUidMigrationPreflight_({
    snapshotHash: '00'.repeat(32), kanakRows: 1, dewasaRows: 0,
    AUTO_MATCH: 1, REVIEW: 0, CONFLICT: 0, OFFICIAL_ID: 1, MANUAL_ROSTER: 0
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.registryCount, 0);
});

test('manual roster candidate needs approval manifest, not an official number', () => {
  const child = row('KANAK', 'ALI', '');
  const sheet = hasStudent => ({
    getLastRow: () => hasStudent ? 2 : 1,
    getLastColumn: () => 20,
    getRange: r => ({ getValue: () => 'STUDENT_UID', getValues: () => r === 2 ? [child] : [] })
  });
  const ctx = context({
    SPREADSHEET_ID: 'roster', TAB: { KANAK: 'PendaftaranBaru', DEWASA: 'KelasDewasa' },
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => sheet(name === 'PendaftaranBaru') }) },
    Utilities: { DigestAlgorithm: { SHA_256: 'SHA_256' }, computeDigest: () => Array(32).fill(0) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'A'.repeat(64) }) }
  });
  ctx.readStudentUidRegistry_ = () => ctx.indexStudentUidRegistry_([]);
  const result = ctx.getStudentUidMigrationPreflight_({
    snapshotHash: '00'.repeat(32), kanakRows: 1, dewasaRows: 0,
    AUTO_MATCH: 1, REVIEW: 0, CONFLICT: 0, OFFICIAL_ID: 0, MANUAL_ROSTER: 1
  });
  assert.deepEqual(Array.from(result.blockers), ['MANUAL_ROSTER_APPROVALS_REQUIRED']);
  const approved = ctx.getStudentUidMigrationPreflight_({
    snapshotHash: '00'.repeat(32), kanakRows: 1, dewasaRows: 0,
    AUTO_MATCH: 1, REVIEW: 0, CONFLICT: 0, OFFICIAL_ID: 0, MANUAL_ROSTER: 1,
    manualApprovals: [{
      snapshotHash: '00'.repeat(32), studentType: 'KANAK', rowNumber: 2,
      name: 'ALI', decision: 'APPROVE_UID', approvalId: 'APPROVAL-1',
      reviewer: 'ADMIN', approvedAt: '2026-09-29', evidenceRef: 'PRIVATE-MANIFEST'
    }]
  });
  assert.equal(approved.status, 'PASS');
});

test('2026 compatibility stays BIL-based while 2027 uses stable STUDENT_UID', () => {
  const start = code.indexOf('function getNativeEbayarOfficialStudentsV2_(');
  const end = code.indexOf('function getNativeEbayarStudentLookup(', start);
  const block = code.slice(start, end);

  assert.match(block, /studentType \+ ':' \+ bil/);
  assert.match(block, /STUDENT_UID/);
  assert.match(block, /studentKey = uid/);

  assert.match(code, /var BULAN_2026 = \[/);
  assert.match(code, /STUDENT_ID: student\.studentKey/);
});
