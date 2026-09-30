const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const test = require('node:test');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');

function fixture(officialCount = 0) {
  const logs = [];
  const secret = 'A'.repeat(64);
  const ctx = vm.createContext({ Logger: { log: x => logs.push(x) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    Utilities: { computeHmacSha256Signature: (s, k) => Array.from(crypto.createHmac('sha256', k).update(s).digest()) } });
  vm.runInContext(code, ctx);
  const bindings = ctx.getApprovedManualUidBindings_();
  const owners = Object.values(bindings);
  const roster = { KANAK: [], DEWASA: [] };
  const registryRecords = [];
  const students = [];
  function add(uid, type, name, method, officialId = '') {
    const row = Array(20).fill('');
    row[type === 'KANAK' ? 4 : 3] = name; row[5] = officialId; row[18] = 'AKTIF'; row[19] = uid;
    roster[type].push(row);
    registryRecords.push({ STUDENT_UID: uid, TYPE: type, NAMA: name, STATUS: 'ACTIVE', VERIFY_METHOD: method,
      IDENTITY_FINGERPRINT: method === 'OFFICIAL_ID' ? ctx.makeStudentUidFingerprint_(type + ':' + officialId, secret) : '' });
    students.push({ studentKey: uid, studentType: type, nama: name });
  }
  owners.forEach(b => add(b.uid, b.type, b.nama, b.verifyMethod));
  for (let i = 0; i < officialCount; i++) add('KANAK:U' + (0xA0000 + i).toString(16).toUpperCase(), 'KANAK', 'OFFICIAL ' + i,
    'OFFICIAL_ID', String(100000000000 + i));
  const sheet = rows => ({ getLastColumn: () => 20, getLastRow: () => rows.length + 1,
    getRange: () => ({ getValue: () => 'STUDENT_UID', getValues: () => rows }) });
  ctx.SpreadsheetApp = { openById: () => ({ getSheetByName: name => sheet(name === ctx.TAB.KANAK ? roster.KANAK : roster.DEWASA) }) };
  ctx.readStudentUidRegistry_ = () => ctx.indexStudentUidRegistry_(registryRecords);
  ctx.getStudentUidHmacSecret_ = () => secret;
  const verify = studentsToVerify => ctx.requireNativeStudentUidOwnership_('2027-01', studentsToVerify || students);
  return { ctx, bindings, roster, registryRecords, students, verify, logs, secret };
}

test('all twelve approved manual owners pass runtime without data mutation', () => {
  const f = fixture(); assert.equal(f.students.length, 12);
  const before = JSON.stringify([f.roster, f.registryRecords]);
  for (const student of f.students) assert.equal(f.verify([student]), true, student.studentKey);
  assert.equal(f.verify(), true);
  assert.equal(JSON.stringify([f.roster, f.registryRecords]), before);
});

for (const [name, change] of [
  ['wrong name in roster and registry', f => { f.roster.KANAK[0][4] = 'FORGED'; f.registryRecords[0].NAMA = 'FORGED'; f.students[0].nama = 'FORGED'; }],
  ['wrong requested type', f => { f.students[0].studentType = 'DEWASA'; }],
  ['registry method changed to official', f => { f.registryRecords[0].VERIFY_METHOD = 'OFFICIAL_ID'; f.registryRecords[0].IDENTITY_FINGERPRINT = 'H1:' + 'B'.repeat(64); }],
  ['unapproved UID with forged browser approval', f => { f.roster.KANAK[0][19] = 'KANAK:U11111'; f.registryRecords[0].STUDENT_UID = 'KANAK:U11111'; f.students[0].studentKey = 'KANAK:U11111'; f.students[0].approved = true; }],
  ['inactive registry', f => { f.registryRecords[0].STATUS = 'INACTIVE'; }],
  ['inactive roster', f => { f.roster.KANAK[0][18] = 'TIDAK AKTIF'; }],
  ['later registration', f => { f.roster.KANAK[0][1] = '2028-01-01'; }]
]) test('manual runtime rejects ' + name, () => { const f = fixture(); change(f); assert.throws(() => f.verify([f.students[0]])); });

test('approved manifest rejects duplicate UID and duplicate canonical owner', () => {
  const f = fixture(); const row = ['KANAK:U09B34', 'KANAK', 'ABID RIZQI SIREGAR BIN MD RAWI', 'MANUAL_ROSTER'];
  assert.throws(() => f.ctx.indexApprovedManualUidBindings_([row, row.slice()]), /berganda/);
  assert.throws(() => f.ctx.indexApprovedManualUidBindings_([row, ['KANAK:U11111', ...row.slice(1)]]), /berganda/);
  assert.throws(() => f.ctx.indexApprovedManualUidBindings_([[row[0], 'DEWASA', row[2], row[3]]]));
});

test('whole-roster verification returns 185/173/12 with no secrets and no mutation', () => {
  const f = fixture(173); const before = JSON.stringify([f.roster, f.registryRecords]);
  const result = f.ctx.verifyCurrentNativeUidOwnership_('2027-01');
  assert.equal(result.success, true); assert.equal(result.total, 185); assert.equal(result.registryCount, 185);
  assert.equal(result.OFFICIAL_ID, 173); assert.equal(result.MANUAL_ROSTER, 12);
  assert.equal(result.verified, 185); assert.equal(result.failureCount, 0); assert.equal(result.failures.length, 0);
  assert.equal(JSON.stringify([f.roster, f.registryRecords]), before);
  const output = JSON.stringify([result, f.logs]);
  assert.doesNotMatch(output, /H1:|IDENTITY_FINGERPRINT|100000000000/); assert.ok(!output.includes(f.secret));
});

test('whole-roster failure identifies source row without logging raw HMAC error', () => {
  const f = fixture(173); f.registryRecords[12].IDENTITY_FINGERPRINT = 'H1:' + 'B'.repeat(64);
  const result = f.ctx.verifyCurrentNativeUidOwnership_('2027-01');
  assert.equal(result.success, false); assert.equal(result.verified, 184); assert.equal(result.failureCount, 1);
  assert.equal(result.failures[0].uid, f.students[12].studentKey); assert.equal(result.failures[0].sourceRow, 12);
  f.ctx.getStudentUidHmacSecret_ = () => { throw new Error(f.secret); };
  assert.ok(!JSON.stringify(f.ctx.verifyCurrentNativeUidOwnership_('2027-01')).includes(f.secret));
});

test('2026 skips registry and manifest while official HMAC behaviour is preserved', () => {
  const f = fixture(1); assert.equal(f.verify([f.students[12]]), true);
  f.registryRecords[12].IDENTITY_FINGERPRINT = 'H1:' + 'B'.repeat(64);
  assert.throws(() => f.verify([f.students[12]]));
  f.ctx.readStudentUidRegistry_ = () => { throw new Error('must not read'); };
  assert.equal(f.ctx.requireNativeStudentUidOwnership_('2026-09', [{ studentKey: 'KANAK:1' }]), true);
});

test('read-only registry mode requires configured ID before discovery or mutation', () => {
  const f = fixture();
  const start = code.indexOf('function readStudentUidRegistry_(');
  vm.runInContext(code.slice(start, code.indexOf('\nfunction generateStudentUid_(', start)), f.ctx);
  f.ctx.getEbayarMasterSpreadsheet_ = () => assert.fail('Must not discover master');
  assert.throws(() => f.ctx.readStudentUidRegistry_({ readOnly: true }), /configuration/);
  const result = f.ctx.verifyCurrentNativeUidOwnership_('2027-01');
  assert.equal(result.success, false); assert.equal(result.verified, 0);
  assert.equal(result.failureCount, 1);
});

test('read-only registry passes explicit configured ID and only reads cells', () => {
  const f = fixture();
  const start = code.indexOf('function readStudentUidRegistry_(');
  vm.runInContext(code.slice(start, code.indexOf('\nfunction generateStudentUid_(', start)), f.ctx);
  f.ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => 'MASTER',
    setProperty: () => assert.fail('Property mutation') }) };
  const header = Array.from(f.ctx.STUDENT_UID_REGISTRY_HEADERS_);
  f.ctx.getEbayarMasterSpreadsheet_ = options => {
    assert.equal(options.spreadsheetId, 'MASTER');
    return { getSheetByName: () => ({ getLastColumn: () => 8, getLastRow: () => 13,
      getRange: r => ({ getValues: () => r === 1 ? [header] : f.registryRecords.map(record => header.map(h => record[h] || '')) }) }) };
  };
  assert.equal(Object.keys(f.ctx.readStudentUidRegistry_({ readOnly: true }).byUid).length, 12);
});
