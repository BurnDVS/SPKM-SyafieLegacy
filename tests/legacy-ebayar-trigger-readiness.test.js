const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'Code.js'), 'utf8');

function extractFunction(name) {
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

function createContext(calculationSnapshots) {
  let readIndex = 0;
  const sleeps = [];
  const syncCalls = [];
  const logs = [];
  const context = {
    authorizeInstalledTrigger_: () => true,
    YURAN_SS_ID: 'YURAN',
    SpreadsheetApp: {
      openById(id) {
        assert.equal(id, 'YURAN');
        const snapshot = calculationSnapshots[Math.min(readIndex, calculationSnapshots.length - 1)] || [];
        readIndex += 1;
        return {
          getSheetByName(name) {
            assert.equal(name, 'CalculationOgos2026');
            return {
              getLastRow: () => snapshot.length + 1,
              getRange: () => ({ getValues: () => snapshot.map(value => [value]) })
            };
          }
        };
      }
    },
    Utilities: { sleep: ms => sleeps.push(ms) },
    Logger: { log: message => logs.push(message) },
    syncFormMinusBayarCore_(params) {
      syncCalls.push(params);
      return { success: true, bulan: params.bulan };
    }
  };
  vm.createContext(context);
  [
    'normalizeLegacyEbayarName_',
    'getLegacyEbayarCalculationTabName_',
    'getLegacyEbayarSubmittedNames_',
    'waitForLegacyEbayarCalculationReady_',
    'onEbayarSubmit'
  ].forEach(name => vm.runInContext(extractFunction(name), context));
  return { context, sleeps, syncCalls, logs, getReadCount: () => readIndex };
}

function ogosEvent(names) {
  return {
    namedValues: {
      'BAYARAN YURAN BAGI BULAN': ['Ogos'],
      'NAMA PENUH MURID': [names]
    }
  };
}

test('Calculation ready immediately rebuilds the Form exactly once', () => {
  const setup = createContext([['AHMAD KAMSANI BIN ADNAN']]);
  const result = setup.context.onEbayarSubmit(ogosEvent('AHMAD KAMSANI BIN ADNAN'));

  assert.equal(result.success, true);
  assert.equal(setup.getReadCount(), 1);
  assert.equal(setup.sleeps.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(setup.syncCalls)), [{ bulan: 'OGOS2026' }]);
});

test('Calculation becoming ready after retries rebuilds the Form exactly once', () => {
  const setup = createContext([
    [],
    ['AHMAD KAMSANI BIN ADNAN'],
    ['AHMAD KAMSANI BIN ADNAN', 'PADILLAH']
  ]);
  const result = setup.context.onEbayarSubmit(ogosEvent('AHMAD KAMSANI BIN ADNAN, PADILLAH'));

  assert.equal(result.success, true);
  assert.equal(setup.getReadCount(), 3);
  assert.deepEqual(setup.sleeps, [3000, 3000]);
  assert.equal(setup.syncCalls.length, 1);
});

test('Calculation never becoming ready does not rebuild the Form', () => {
  const setup = createContext([[]]);
  const result = setup.context.onEbayarSubmit(ogosEvent('AHMAD KAMSANI BIN ADNAN'));

  assert.equal(result.success, false);
  assert.equal(result.mode, 'LEGACY_EBAYAR_CALCULATION_NOT_READY');
  assert.equal(result.attempts, 6);
  assert.deepEqual(JSON.parse(JSON.stringify(result.missingNames)), ['AHMAD KAMSANI BIN ADNAN']);
  assert.equal(setup.getReadCount(), 6);
  assert.deepEqual(setup.sleeps, [3000, 3000, 3000, 3000, 3000]);
  assert.equal(setup.syncCalls.length, 0);
  assert.match(result.message, /Form tidak dibina semula/);
});

test('Ogos submission maps to OGOS2026 and CalculationOgos2026', () => {
  const setup = createContext([['PADILLAH']]);
  const result = setup.context.onEbayarSubmit(ogosEvent('PADILLAH'));

  assert.equal(result.bulan, 'OGOS2026');
  assert.equal(setup.context.getLegacyEbayarCalculationTabName_('OGOS2026'), 'CalculationOgos2026');
  assert.deepEqual(JSON.parse(JSON.stringify(setup.syncCalls)), [{ bulan: 'OGOS2026' }]);
});

test('submitted and Calculation names use sync-compatible trim and uppercase normalization', () => {
  const setup = createContext([['AHMAD  KAMSANI BIN ADNAN']]);
  const event = ogosEvent('  ahmad  kamsani bin adnan  ,  PADILLAH ');
  const names = setup.context.getLegacyEbayarSubmittedNames_(event);

  assert.deepEqual(JSON.parse(JSON.stringify(names)), ['AHMAD  KAMSANI BIN ADNAN', 'PADILLAH']);
  assert.equal(setup.context.normalizeLegacyEbayarName_('  ahmad  kamsani bin adnan  '), 'AHMAD  KAMSANI BIN ADNAN');
});
