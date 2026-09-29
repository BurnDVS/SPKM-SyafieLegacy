const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '..', 'Code.js'), 'utf8');
const setup = code.slice(code.indexOf('function setupStudentUidInfrastructure_('), code.indexOf('function indexStudentUidRegistry_('));
const headers = ['STUDENT_UID', 'TYPE', 'NAMA', 'IDENTITY_FINGERPRINT', 'VERIFY_METHOD', 'STATUS', 'CREATED_AT', 'UPDATED_AT'];
function fixture() {
  const writes = [];
  const props = { MASTER: 'master' };
  let released = 0, randomCalls = 0;
  function sheet(width, rows) {
    const cells = rows.map(r => r.slice());
    const formulas = {};
    return {
      cells, formulas,
      getMaxColumns: () => width,
      getLastRow: () => cells.length,
      getLastColumn: () => cells.reduce((max, r) => Math.max(max, r.reduce((n, v, i) => v !== '' ? i + 1 : n, 0)), 0),
      insertColumnsAfter: (at, count) => { assert.equal(at, width); width += count; writes.push('column'); },
      getRange(row, col, count = 1, size = 1) {
        const values = () => Array.from({ length: count }, (_, r) => Array.from({ length: size }, (_, c) => cells[row - 1 + r]?.[col - 1 + c] ?? ''));
        const formulaValues = () => Array.from({ length: count }, (_, r) => Array.from({ length: size }, (_, c) => formulas[(row + r) + ':' + (col + c)] || ''));
        const set = data => {
          writes.push({ row, col, count, size });
          data.forEach((r, ri) => r.forEach((value, ci) => {
            cells[row - 1 + ri] ||= [];
            cells[row - 1 + ri][col - 1 + ci] = value;
          }));
        };
        return { getValues: values, getFormulas: formulaValues, getValue: () => values()[0][0],
          getFormula: () => formulaValues()[0][0], setValues: set, setValue: v => set([[v]]) };
      }
    };
  }
  const rosters = { Kanak: sheet(19, [Array(19).fill('header'), Array(19).fill('existing')]),
    Dewasa: sheet(20, [Array(19).fill('header'), Array(19).fill('existing')]) };
  const registry = {};
  const master = {
    getSheetByName: name => registry[name] || null,
    insertSheet: name => { writes.push('registry'); return registry[name] = sheet(26, []); }
  };
  const ctx = vm.createContext({
    STUDENT_UID_REGISTRY_TAB_: 'StudentUidRegistry', STUDENT_UID_REGISTRY_HEADERS_: headers,
    STUDENT_UID_HMAC_PROPERTY_: 'SECRET', EBAYAR_MASTER_PROP_KEY_V2: 'MASTER',
    SPREADSHEET_ID: 'roster', TAB: { KANAK: 'Kanak', DEWASA: 'Dewasa' },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => released++ }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => Object.hasOwn(props, k) ? props[k] : null,
      setProperty: (k, v) => { writes.push('property'); props[k] = v; }
    }) },
    SpreadsheetApp: { openById: id => id === 'master' ? master : { getSheetByName: name => rosters[name] }, flush() {} },
    Utilities: { getUuid: () => (++randomCalls).toString(16).padStart(8, '0') + '-abcd-4abc-8abc-abcdefabcdef' }
  });
  vm.runInContext(setup, ctx);
  return { run: () => ctx.setupStudentUidInfrastructure_(), writes, props, rosters, registry, sheet,
    released: () => released, randomCalls: () => randomCalls };
}
test('first run creates only infrastructure and returns no secret', () => {
  const f = fixture();
  const result = f.run();
  assert.equal(result.success, true);
  assert.equal(result.registry_created, true);
  assert.deepEqual(f.registry.StudentUidRegistry.cells[0], headers);
  assert.equal(f.rosters.Kanak.cells[0][19], 'STUDENT_UID');
  assert.equal(f.rosters.Dewasa.cells[0][19], 'STUDENT_UID');
  assert.equal(f.rosters.Kanak.cells[1].length, 19);
  assert.match(f.props.SECRET, /^[0-9A-F]{64}$/);
  assert.equal(f.randomCalls(), 8);
  assert.equal(JSON.stringify(result).includes(f.props.SECRET), false);
  assert.equal(f.released(), 1);
});
test('second run performs no writes and preserves registry, roster UIDs and HMAC', () => {
  const f = fixture();
  f.run();
  f.registry.StudentUidRegistry.cells.push(['KANAK:U00001', 'KANAK', 'EXISTING']);
  f.rosters.Kanak.cells[1][19] = 'KANAK:U00001';
  const count = f.writes.length, secret = f.props.SECRET;
  assert.equal(f.run().registry_created, false);
  assert.equal(f.writes.length, count);
  assert.equal(f.props.SECRET, secret);
  assert.equal(f.randomCalls(), 8);
  assert.equal(f.rosters.Kanak.cells[1][19], 'KANAK:U00001');
});
test('invalid existing registry schema fails before any mutation', () => {
  const f = fixture();
  f.registry.StudentUidRegistry = f.sheet(26, [['WRONG']]);
  assert.equal(f.run().success, false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.released(), 1);
});
test('wrong roster T header fails before creating registry or secret', () => {
  const f = fixture();
  f.rosters.Dewasa.cells[0][19] = 'OTHER';
  assert.equal(f.run().success, false);
  assert.equal(f.writes.length, 0);
});
test('blank T header above existing data or formulas fails closed', () => {
  for (const formula of [false, true]) {
    const f = fixture();
    if (formula) f.rosters.Dewasa.formulas['2:20'] = '=IF(TRUE,"","")';
    else f.rosters.Dewasa.cells[1][19] = 'existing';
    assert.equal(f.run().success, false);
    assert.equal(f.writes.length, 0);
  }
});
test('existing valid HMAC is preserved; invalid existing HMAC is never replaced', () => {
  const f = fixture();
  f.props.SECRET = 'B'.repeat(64);
  assert.equal(f.run().success, true);
  assert.equal(f.props.SECRET, 'B'.repeat(64));
  assert.equal(f.randomCalls(), 0);
  const invalid = fixture();
  invalid.props.SECRET = '';
  assert.equal(invalid.run().success, false);
  assert.equal(invalid.props.SECRET, '');
  assert.equal(invalid.writes.length, 0);
});
