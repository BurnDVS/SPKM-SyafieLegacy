const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const indexSource = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(source, name) {
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

function createContext() {
  const elements = {
    btnSyncMinusBayar: { disabled: false, textContent: '' },
    syncMinusSuccess: { style: { display: '' } },
    syncMinusError: { style: { display: 'none' } },
    syncMinusErrorMsg: { textContent: '', innerHTML: 'unchanged' },
    syncMinusSuccessMsg: { textContent: '' },
    yuranBulan: { value: 'OGOS2026' }
  };
  let request;
  const context = {
    document: { getElementById: id => elements[id] || null },
    callGAS(action, payload, onSuccess, onError) {
      request = { action, payload, onSuccess, onError };
    }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(indexSource, 'getSyncFormMinusBayarErrorMessage'), context);
  vm.runInContext(extractFunction(indexSource, 'syncFormMinusBayar'), context);
  return { context, elements, getRequest: () => request };
}

test('backend failure displays its message safely and clears loading state', () => {
  const setup = createContext();
  setup.context.syncFormMinusBayar();

  const request = setup.getRequest();
  assert.equal(request.action, 'syncFormBulanIni');
  assert.deepEqual(JSON.parse(JSON.stringify(request.payload)), { bulan: 'OGOS2026' });
  request.onSuccess({ success: false, message: '<b>Token tamat tempoh</b>' });

  assert.equal(setup.elements.syncMinusErrorMsg.textContent, '<b>Token tamat tempoh</b>');
  assert.equal(setup.elements.syncMinusErrorMsg.innerHTML, 'unchanged');
  assert.equal(setup.elements.syncMinusError.style.display, '');
  assert.equal(setup.elements.btnSyncMinusBayar.disabled, false);
  assert.equal(setup.elements.btnSyncMinusBayar.textContent, '🧹 Kemas Form (Tolak Dah Bayar)');
});

test('transport failure displays the actual error and clears loading state', () => {
  const setup = createContext();
  setup.context.syncFormMinusBayar();

  setup.getRequest().onError(new Error('Failed to fetch'));

  assert.equal(setup.elements.syncMinusErrorMsg.textContent, 'Failed to fetch');
  assert.equal(setup.elements.syncMinusError.style.display, '');
  assert.equal(setup.elements.btnSyncMinusBayar.disabled, false);
  assert.equal(setup.elements.btnSyncMinusBayar.textContent, '🧹 Kemas Form (Tolak Dah Bayar)');
});

test('generic fallback is retained when no useful message exists', () => {
  const backendSetup = createContext();
  backendSetup.context.syncFormMinusBayar();
  backendSetup.getRequest().onSuccess({ success: false, message: '   ' });
  assert.equal(
    backendSetup.elements.syncMinusErrorMsg.textContent,
    'Gagal kemas form. Sila cuba semula.'
  );

  const transportSetup = createContext();
  transportSetup.context.syncFormMinusBayar();
  transportSetup.getRequest().onError({});
  assert.equal(
    transportSetup.elements.syncMinusErrorMsg.textContent,
    'Gagal kemas form. Sila cuba semula.'
  );
});

test('successful sync keeps the existing success response', () => {
  const setup = createContext();
  setup.context.syncFormMinusBayar();
  setup.getRequest().onSuccess({
    success: true,
    bulan: 'OGOS2026',
    sudahBayar: 104,
    namaInForm: 82
  });

  assert.match(setup.elements.syncMinusSuccessMsg.textContent, /Form OGOS2026 dikemaskini/);
  assert.equal(setup.elements.syncMinusSuccess.style.display, '');
  assert.equal(setup.elements.syncMinusError.style.display, 'none');
  assert.equal(setup.elements.btnSyncMinusBayar.disabled, false);
});
