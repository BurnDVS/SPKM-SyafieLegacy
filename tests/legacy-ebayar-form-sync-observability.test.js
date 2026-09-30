const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'Code.js'), 'utf8');
const OGOS_FORM_ID = '1wT-UU2ZxOn_tTnDFo-8B5rHI5u07R_sObUaXXdwINMw';

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

function studentRow(name) {
  const row = Array(19).fill('');
  row[0] = name;
  row[1] = 'AKTIF';
  return row;
}

function createContext(options = {}) {
  const logs = [];
  const openedFormIds = [];
  const setCalls = [];
  const mainSheets = {
    KANAK: {
      getLastRow: () => 3,
      getRange: () => ({ getValues: () => [studentRow('PAID STUDENT'), studentRow('UNPAID STUDENT')] })
    },
    DEWASA: { getLastRow: () => 1 }
  };

  function calculationSheet(name) {
    if (options.unreadableCalculation === name) {
      return { getLastRow: () => 2, getRange: () => { throw new Error('Calculation read denied'); } };
    }
    return {
      getLastRow: () => 2,
      getRange: () => ({ getValues: () => [['PAID STUDENT']] })
    };
  }

  function checkboxItem() {
    let written = [];
    return {
      getTitle: () => 'NAMA PENUH MURID',
      asCheckboxItem() { return this; },
      setChoiceValues(values) {
        written = values.slice();
        setCalls.push(values.slice());
      },
      getChoices() {
        let values = written.slice();
        if (options.readBackMode === 'count-mismatch') values = [];
        if (options.readBackMode === 'paid-name-present') values = ['PAID STUDENT'];
        return values.map(value => ({ getValue: () => value }));
      }
    };
  }

  const context = {
    SPREADSHEET_ID: 'MAIN',
    YURAN_SS_ID: 'YURAN',
    TAB: { KANAK: 'KANAK', DEWASA: 'DEWASA' },
    COL_KANAK: { NAMA: 0, STATUS: 1, TIMESTAMP: 2 },
    COL_DEWASA: { NAMA: 0, STATUS: 1, TIMESTAMP: 2 },
    Logger: { log: message => logs.push(String(message)) },
    SpreadsheetApp: {
      openById(id) {
        if (id === 'MAIN') return { getSheetByName: name => mainSheets[name] || null };
        assert.equal(id, 'YURAN');
        return { getSheetByName: name => calculationSheet(name) };
      }
    },
    FormApp: {
      ItemType: { CHECKBOX: 'CHECKBOX' },
      openById(id) {
        openedFormIds.push(id);
        return { getItems: () => [checkboxItem()] };
      }
    }
  };
  vm.createContext(context);
  [
    'normalizeLegacyEbayarName_',
    'logLegacyEbayarFormSyncDiagnostic_',
    'getLegacyEbayarCalculationTabName_',
    'syncNamaMuridToAllFormsCore_',
    'syncFormMinusBayarCore_'
  ].forEach(name => vm.runInContext(extractFunction(name), context));
  return { context, logs, openedFormIds, setCalls };
}

test('all-month sync reports verified 12/12 success and logs non-sensitive diagnostics', () => {
  const setup = createContext();
  const result = setup.context.syncNamaMuridToAllFormsCore_();

  assert.equal(result.success, true);
  assert.equal(result.updated, 12);
  assert.equal(result.totalForms, 12);
  assert.deepEqual(JSON.parse(JSON.stringify(result.errors)), []);
  assert.equal(setup.setCalls.length, 12);
  assert.ok(setup.logs.some(line => line.includes('action=syncForms')
    && line.includes('month=OGOS2026')
    && line.includes('formId=' + OGOS_FORM_ID)
    && line.includes('calculationTab=CalculationOgos2026')
    && line.includes('paidCount=1')
    && line.includes('generatedChoiceCount=1')
    && line.includes('readBackChoiceCount=1')
    && line.includes('verificationResult=PASS')));
});

test('all-month sync skips a Form when its Calculation source cannot be read', () => {
  const setup = createContext({ unreadableCalculation: 'CalculationOgos2026' });
  const result = setup.context.syncNamaMuridToAllFormsCore_();

  assert.equal(result.success, false);
  assert.equal(result.updated, 11);
  assert.equal(result.totalForms, 12);
  assert.equal(setup.openedFormIds.includes(OGOS_FORM_ID), false);
  assert.equal(setup.setCalls.length, 11);
  assert.ok(result.errors.some(error => error.includes('OGOS2026') && error.includes('CalculationOgos2026')));
  assert.match(result.message, /11\/12/);
});

test('single-month sync verifies matching read-back choices and excludes paid names', () => {
  const setup = createContext();
  const result = setup.context.syncFormMinusBayarCore_({ bulan: 'OGOS2026' });

  assert.equal(result.success, true);
  assert.equal(result.diagnostic.action, 'syncFormBulanIni');
  assert.equal(result.diagnostic.month, 'OGOS2026');
  assert.equal(result.diagnostic.formId, OGOS_FORM_ID);
  assert.equal(result.diagnostic.calculationTab, 'CalculationOgos2026');
  assert.equal(result.diagnostic.paidCount, 1);
  assert.equal(result.diagnostic.generatedChoiceCount, 1);
  assert.equal(result.diagnostic.readBackChoiceCount, 1);
  assert.equal(result.diagnostic.paidNamesPresentCount, 0);
  assert.equal(result.diagnostic.verificationResult, true);
});

test('single-month sync fails when the read-back count does not match', () => {
  const setup = createContext({ readBackMode: 'count-mismatch' });
  const result = setup.context.syncFormMinusBayarCore_({ bulan: 'OGOS2026' });

  assert.equal(result.success, false);
  assert.equal(result.diagnostic.generatedChoiceCount, 1);
  assert.equal(result.diagnostic.readBackChoiceCount, 0);
  assert.equal(result.diagnostic.verificationResult, false);
  assert.match(result.message, /Pengesahan Form OGOS2026 gagal/);
});

test('single-month sync fails when a normalized paid name remains in read-back choices', () => {
  const setup = createContext({ readBackMode: 'paid-name-present' });
  const result = setup.context.syncFormMinusBayarCore_({ bulan: 'OGOS2026' });

  assert.equal(result.success, false);
  assert.equal(result.diagnostic.generatedChoiceCount, 1);
  assert.equal(result.diagnostic.readBackChoiceCount, 1);
  assert.equal(result.diagnostic.paidNamesPresentCount, 1);
  assert.equal(result.diagnostic.verificationResult, false);
  assert.match(result.message, /nama berbayar masih ada: 1/);
});
