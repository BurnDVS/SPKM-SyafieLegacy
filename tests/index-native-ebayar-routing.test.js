const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const indexSource = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

function extractFunction(source, name) {
  const match = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(source);
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

function makeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
    toggle(name, force) {
      if (force === undefined ? !values.has(name) : force) values.add(name);
      else values.delete(name);
    }
  };
}

function makeElement(overrides = {}) {
  const attributes = {};
  return Object.assign({
    attributes,
    classList: makeClassList(),
    style: {},
    textContent: '',
    value: '',
    disabled: false,
    children: [],
    appendChild(child) { this.children.push(child); },
    addEventListener() {},
    setAttribute(name, value) { attributes[name] = String(value); },
    removeAttribute(name) { delete attributes[name]; delete this[name]; },
    scrollIntoView() {},
    reset() {}
  }, overrides);
}

function loadFunctions(context, names) {
  vm.createContext(context);
  names.forEach(name => vm.runInContext(extractFunction(indexSource, name), context));
  return context;
}

test('January through August retain their exact Legacy Google Form routes in the dynamic renderer', () => {
  const expected = [
    'https://forms.gle/DuzmZnoSu1JxY95fA',
    'https://forms.gle/Ue9jHfgP7ZR5tvWv6',
    'https://forms.gle/TMYXVccPVT6ziVi8A',
    'https://forms.gle/8t2uKNnp3x13ekH67',
    'https://forms.gle/1sfLDT5iM9DUTLaE8',
    'https://forms.gle/bdvhV9n8hT9PDmso6',
    'https://forms.gle/sRwXkUCxKex4ak499',
    'https://forms.gle/JGydXBHTj4e88QXW6'
  ];
  const map = /var legacyEbayarLinks2026 = \[([\s\S]*?)\];/.exec(indexSource);
  assert.ok(map);
  expected.forEach(url => assert.ok(map[1].includes("'" + url + "'")));
  assert.match(indexSource, /id="ebayarCards"/);
});

test('month cards come from backend year configuration and future months are locked', () => {
  assert.match(indexSource, /id="ebayarYearSelect"/);
  assert.doesNotMatch(indexSource, /id="ecard-0"/);
  const renderer = extractFunction(indexSource, 'renderEbayarYear');
  assert.match(renderer, /month\.state === 'UPCOMING'/);
  assert.match(renderer, /month\.routeType === 'LEGACY'/);
  assert.match(renderer, /openNativeEbayarForm\(month\.bulanKey\)/);
});

test('Malaysia-date routing opens only the applicable Native month', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(extractFunction(indexSource, 'getEbayarMonthRouting'), context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getEbayarMonthRouting(8, '2026-08-31'))),
    { monthKey: '2026-09', routeType: 'NATIVE', isOpen: false, isCurrent: false, isFuture: true }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getEbayarMonthRouting(8, '2026-09-01'))),
    { monthKey: '2026-09', routeType: 'NATIVE', isOpen: true, isCurrent: true, isFuture: false }
  );
  assert.equal(context.getEbayarMonthRouting(9, '2026-09-01').isFuture, true);
  assert.equal(context.getEbayarMonthRouting(8, '2026-10-01').isOpen, true);
  assert.equal(context.getEbayarMonthRouting(9, '2026-10-01').isCurrent, true);
  assert.equal(context.getEbayarMonthRouting(10, '2026-10-01').isFuture, true);
});

test('September 2026 current Native month renders aggregate stats from its year', async () => {
  const elements = {};
  const createElement = () => makeElement({
    append(...children) { this.children.push(...children); children.forEach(child => { if (child.id) elements[child.id] = child; }); },
    appendChild(child) { this.children.push(child); if (child.id) elements[child.id] = child; },
    replaceChildren() { this.children = []; }
  });
  elements.ebayarCards = createElement();
  elements.ebayarYearSelect = makeElement({ value: '2026' });
  const months = Array.from({ length: 12 }, (_, index) => ({
    bulanKey: '2026-' + String(index + 1).padStart(2, '0'), label: 'Bulan ' + index,
    routeType: index < 8 ? 'LEGACY' : 'NATIVE',
    state: index < 8 ? 'CLOSED' : index === 8 ? 'OPEN' : 'UPCOMING'
  }));
  const stats = Array.from({ length: 12 }, () => ({ jumlahDaftar: 187, selesai: 105, belum: 82 }));
  const context = {
    ebayarYearConfig: { years: [{ year: 2026, months }] },
    legacyEbayarLinks2026: Array(8).fill('https://forms.gle/example'),
    document: { getElementById: id => elements[id] || null, createElement },
    callGASPromise: async () => ({ success: true, stats }),
    console
  };
  loadFunctions(context, ['renderEbayarYear']);
  await context.renderEbayarYear(2026);
  assert.match(elements['ebadge-8'].innerHTML, /105 selesai/);
  assert.match(elements['ebadge-8'].innerHTML, /82 belum/);
  assert.match(elements['ebadge-8'].innerHTML, /56% daripada 187 murid/);
  assert.equal(elements['ebtn-9'].textContent, 'Akan Datang');
  assert.equal(elements['ebtn-0'].href, 'https://forms.gle/example');

  context.ebayarYearConfig.years.push({ year: 2027, months: months.map(month => ({
    ...month, bulanKey: month.bulanKey.replace('2026', '2027'), routeType: 'NATIVE', state: 'UPCOMING'
  })) });
  elements.ebayarYearSelect.value = '2027';
  await context.renderEbayarYear(2027);
  assert.equal(elements.ebayarCards.children.length, 12);
  assert.equal(elements['ebtn-0'].textContent, 'Akan Datang');
  assert.equal(elements['ebtn-0'].href, undefined);
});

test('an open Native month reveals the embedded form without creating exec navigation', () => {
  const openedMonths = [];
  function makeButton() {
    return makeElement({ href: undefined, target: undefined, rel: undefined, onclick: null });
  }
  const buttons = { 'ebtn-8': makeButton(), 'ebtn-9': makeButton() };
  const context = {
    document: { getElementById: id => buttons[id] || null },
    openNativeEbayarForm: monthKey => openedMonths.push(monthKey)
  };
  loadFunctions(context, ['applyNativeEbayarMonthRoute']);

  context.applyNativeEbayarMonthRoute(8, {
    monthKey: '2026-09', routeType: 'NATIVE', isOpen: true, isFuture: false
  });
  assert.equal(buttons['ebtn-8'].href, undefined);
  assert.equal(buttons['ebtn-8'].target, undefined);
  assert.equal(buttons['ebtn-8'].rel, undefined);
  assert.equal(buttons['ebtn-8'].attributes['aria-disabled'], 'false');
  assert.equal(typeof buttons['ebtn-8'].onclick, 'function');
  buttons['ebtn-8'].onclick({ preventDefault() {} });
  assert.deepEqual(openedMonths, ['2026-09']);

  context.applyNativeEbayarMonthRoute(9, {
    monthKey: '2026-10', routeType: 'NATIVE', isOpen: false, isFuture: true
  });
  assert.equal(buttons['ebtn-9'].href, undefined);
  assert.equal(buttons['ebtn-9'].attributes['aria-disabled'], 'true');
  assert.equal(buttons['ebtn-9'].textContent, 'Akan Datang');
});

test('Native API transport sends JSON by POST and keeps Base64 out of the URL', async () => {
  const calls = [];
  const context = {
    _gasUrlReady: Promise.resolve(),
    window: { GAS_URL: 'https://script.google.com/macros/s/PRODUCTION_ID/exec' },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ success: true }) };
    }
  };
  loadFunctions(context, ['postNativeEbayarAction']);

  await context.postNativeEbayarAction('submitNativeEbayarPayment', {
    bulanKey: '2026-09',
    fileDataBase64: 'QUJDRA=='
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://script.google.com/macros/s/PRODUCTION_ID/exec');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'text/plain;charset=UTF-8');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    action: 'submitNativeEbayarPayment',
    bulanKey: '2026-09',
    fileDataBase64: 'QUJDRA=='
  });
  assert.doesNotMatch(calls[0].url, /QUJDRA|fileDataBase64|\?/);
});

test('student lookup uses the Native POST action and renders safe result text', async () => {
  const apiCalls = [];
  const elements = {
    nativeEbayarStudentSearch: makeElement({ value: 'ALI' }),
    nativeEbayarMonth: makeElement({ value: '2026-09' }),
    nativeEbayarStudentResults: makeElement()
  };
  const context = {
    nativeEbayarSelectedStudents: [],
    nativeEbayarSearchTimer: null,
    nativeEbayarSearchSequence: 0,
    clearTimeout() {},
    setTimeout(fn) { Promise.resolve().then(fn); return 1; },
    document: {
      getElementById: id => elements[id] || null,
      createElement: tag => makeElement({ tagName: tag.toUpperCase() })
    },
    hideNativeEbayarConfirmation() {},
    clearNativeEbayarStudentChecks() {},
    postNativeEbayarAction: async (action, payload) => {
      apiCalls.push({ action, payload });
      return {
        success: true,
        results: [{ studentKey: 'KANAK:7', nama: 'ALI BIN AMIN', studentType: 'KANAK', guru: 'USTAZ A' }],
        cappedAt: 20
      };
    }
  };
  loadFunctions(context, ['renderNativeEbayarStudentResults', 'queueNativeEbayarStudentSearch']);

  context.queueNativeEbayarStudentSearch();
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(apiCalls.length, 1);
  assert.equal(apiCalls[0].action, 'getNativeEbayarStudentLookup');
  assert.equal(apiCalls[0].payload.keyword, 'ALI');
  assert.equal(apiCalls[0].payload.bulanKey, '2026-09');
  const resultButton = elements.nativeEbayarStudentResults.children.at(-1);
  assert.equal(resultButton.children[0].textContent, 'ALI BIN AMIN');
  assert.equal(resultButton.children[1].textContent, 'KANAK · Guru: USTAZ A');
});

test('preflight sends canonical student keys and reveals confirmation only when ready', async () => {
  const apiCalls = [];
  const confirmation = makeElement();
  const elements = {
    nativeEbayarMonth: makeElement({ value: '2026-09', selectedIndex: 0, options: [{ disabled: false }] }),
    nativeEbayarDate: makeElement({ value: '2026-09-01' }),
    nativeEbayarAmount: makeElement({ value: '60.00' }),
    nativeEbayarReference: makeElement({ value: 'MBB-123' }),
    nativeEbayarSubmitBtn: makeElement(),
    nativeEbayarConfirmation: confirmation,
    nativeEbayarConfirmStudents: makeElement(),
    nativeEbayarConfirmMonth: makeElement(),
    nativeEbayarConfirmDate: makeElement(),
    nativeEbayarConfirmAmount: makeElement(),
    nativeEbayarConfirmFile: makeElement()
  };
  const context = {
    nativeEbayarSelectedStudents: [{ studentKey: 'KANAK:7', nama: 'ALI BIN AMIN' }],
    nativeEbayarSelectedFile: { name: 'slip.pdf', type: 'application/pdf', size: 1024 },
    nativeEbayarPendingSubmission: null,
    document: {
      getElementById: id => elements[id] || null,
      createElement: tag => makeElement({ tagName: tag.toUpperCase() })
    },
    postNativeEbayarAction: async (action, payload) => {
      apiCalls.push({ action, payload });
      return {
        success: true,
        readyToSubmit: true,
        students: ['ALI BIN AMIN'],
        studentChecks: [{ studentKey: 'KANAK:7', nama: 'ALI BIN AMIN', duplicate: false }],
        bulanKey: '2026-09', bulanLabel: 'September 2026', tarikhBayaran: '2026-09-01',
        jumlahKeseluruhan: 60, noRujukan: 'MBB-123', fileName: 'slip.pdf',
        mimeType: 'application/pdf', fileSize: 1024, hasDuplicate: false
      };
    }
  };
  Object.assign(context, {
    hideNativeEbayarConfirmation() { confirmation.classList.remove('show'); context.nativeEbayarPendingSubmission = null; },
    clearNativeEbayarStudentChecks() {},
    renderNativeEbayarStudentChecks() {},
    showNativeEbayarMessage() {}
  });
  loadFunctions(context, ['formatEbayarV2Amount', 'submitNativeEbayarPreflight']);

  await context.submitNativeEbayarPreflight({ preventDefault() {} });

  assert.equal(apiCalls.length, 1);
  assert.equal(apiCalls[0].action, 'preflightNativeEbayarSubmission');
  assert.equal(apiCalls[0].payload.students.length, 1);
  assert.equal(apiCalls[0].payload.students[0].studentKey, 'KANAK:7');
  assert.equal(apiCalls[0].payload.students[0].namaMurid, 'ALI BIN AMIN');
  assert.equal(apiCalls[0].payload.fileDataBase64, undefined);
  assert.equal(confirmation.classList.contains('show'), true);
  assert.equal(context.nativeEbayarPendingSubmission.bulanKey, '2026-09');
});

function createConfirmationContext(responseFactory) {
  const apiCalls = [];
  const messages = [];
  const revokedPreviewUrls = [];
  const elements = {
    nativeEbayarCancelBtn: makeElement(),
    nativeEbayarConfirmSubmitBtn: makeElement(),
    nativeEbayarConfirmation: makeElement(),
    nativeEbayarSuccess: makeElement(),
    nativeEbayarSuccessGroupId: makeElement(),
    nativeEbayarSuccessStudents: makeElement(),
    nativeEbayarSuccessMonth: makeElement(),
    nativeEbayarSuccessAmount: makeElement(),
    nativeEbayarReceiptStatus: makeElement(),
    nativeEbayarReceiptLink: makeElement({ href: undefined }),
    nativeEbayarForm: makeElement(),
    nativeEbayarFileName: makeElement(),
    nativeEbayarImagePreview: makeElement({ src: 'blob:slip-preview', style: { display: 'block' } })
  };
  const context = {
    nativeEbayarSubmissionBusy: false,
    nativeEbayarPendingSubmission: {
      students: [{ studentKey: 'KANAK:7', namaMurid: 'ALI BIN AMIN' }],
      bulanKey: '2026-09', tarikhBayaran: '2026-09-01', jumlahKeseluruhan: '60.00',
      noRujukan: 'MBB-123', fileName: 'slip.pdf', mimeType: 'application/pdf', fileSize: 4
    },
    nativeEbayarSelectedFile: { name: 'slip.pdf', type: 'application/pdf', size: 4 },
    nativeEbayarSelectedStudents: [{ studentKey: 'KANAK:7', nama: 'ALI BIN AMIN' }],
    nativeEbayarPreviewUrl: 'blob:slip-preview',
    URL: { revokeObjectURL: url => revokedPreviewUrls.push(url) },
    document: { getElementById: id => elements[id] || null },
    readNativeEbayarFileBase64V2_: async () => 'QUJDRA==',
    postNativeEbayarAction: async (action, payload) => {
      apiCalls.push({ action, payload });
      return responseFactory();
    },
    showNativeEbayarMessage: (message, isError) => messages.push({ message, isError }),
    renderNativeEbayarSelectedStudents() {},
    initNativeEbayarForm() {}
  };
  loadFunctions(context, ['formatEbayarV2Amount', 'renderNativeEbayarSubmissionSuccess', 'hideNativeEbayarConfirmation', 'confirmNativeEbayarSubmission']);
  return { context, elements, apiCalls, messages, revokedPreviewUrls };
}

test('confirmation lock permits only one payment submission and sends Base64 in its POST payload', async () => {
  let release;
  const responsePromise = new Promise(resolve => { release = resolve; });
  const setup = createConfirmationContext(() => responsePromise);

  const first = setup.context.confirmNativeEbayarSubmission();
  const second = setup.context.confirmNativeEbayarSubmission();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(setup.apiCalls.length, 1);
  assert.equal(setup.apiCalls[0].action, 'submitNativeEbayarPayment');
  assert.equal(setup.apiCalls[0].payload.fileDataBase64, 'QUJDRA==');

  release({
    success: true, mode: 'NATIVE_EBAYAR_SUBMISSION_COMPLETED', paymentGroupId: 'NATIVE-1',
    students: ['ALI BIN AMIN'], bulanKey: '2026-09', bulanLabel: 'September 2026',
    jumlahKeseluruhan: 60, receiptReady: false, receiptUrl: '',
    receiptMode: 'NATIVE_EBAYAR_RECEIPT_GENERATION_FAILED', message: 'Bayaran berjaya dihantar.'
  });
  await Promise.all([first, second]);
  assert.equal(setup.apiCalls.length, 1);
});

test('successful submission exposes only a ready HTTPS receipt using safe link attributes', async () => {
  const setup = createConfirmationContext(() => ({
    success: true, mode: 'NATIVE_EBAYAR_SUBMISSION_COMPLETED', paymentGroupId: 'NATIVE-2',
    students: ['ALI BIN AMIN'], bulanKey: '2026-09', bulanLabel: 'September 2026',
    jumlahKeseluruhan: 60, receiptReady: true, receiptUrl: 'https://drive.google.com/receipt.pdf',
    receiptMode: 'NATIVE_EBAYAR_RECEIPT_READY', message: 'Bayaran berjaya dihantar dan resit telah dijana.'
  }));

  await setup.context.confirmNativeEbayarSubmission();

  assert.equal(setup.elements.nativeEbayarReceiptLink.href, 'https://drive.google.com/receipt.pdf');
  assert.equal(setup.elements.nativeEbayarReceiptLink.attributes.rel, 'noopener noreferrer');
  assert.equal(setup.elements.nativeEbayarReceiptLink.attributes.target, '_blank');
  assert.equal(setup.elements.nativeEbayarReceiptLink.style.display, 'inline-flex');
  assert.equal(setup.elements.nativeEbayarSuccessGroupId.textContent, 'NATIVE-2');
  assert.deepEqual(setup.revokedPreviewUrls, ['blob:slip-preview']);
  assert.equal(setup.context.nativeEbayarPreviewUrl, '');
  assert.equal(setup.elements.nativeEbayarImagePreview.src, undefined);
  assert.equal(setup.elements.nativeEbayarImagePreview.style.display, 'none');
});

test('payment success without a ready receipt never exposes a receipt URL', async () => {
  const setup = createConfirmationContext(() => ({
    success: true, mode: 'NATIVE_EBAYAR_SUBMISSION_COMPLETED', paymentGroupId: 'NATIVE-3',
    students: ['ALI BIN AMIN'], bulanKey: '2026-09', bulanLabel: 'September 2026',
    jumlahKeseluruhan: 60, receiptReady: false, receiptUrl: 'https://unexpected.example/receipt.pdf',
    receiptMode: 'NATIVE_EBAYAR_RECEIPT_GENERATION_FAILED', message: 'Bayaran berjaya dihantar.'
  }));

  await setup.context.confirmNativeEbayarSubmission();

  assert.equal(setup.elements.nativeEbayarReceiptLink.href, undefined);
  assert.equal(setup.elements.nativeEbayarReceiptLink.style.display, 'none');
  assert.match(setup.elements.nativeEbayarReceiptStatus.textContent, /belum tersedia/i);
});

test('uncertain backend result is not retried automatically', async () => {
  const setup = createConfirmationContext(() => ({
    success: false,
    mode: 'NATIVE_EBAYAR_POST_WRITE_VERIFICATION_FAILED',
    message: 'Write mungkin telah berlaku.'
  }));

  await setup.context.confirmNativeEbayarSubmission();

  assert.equal(setup.apiCalls.length, 1);
  assert.match(setup.messages.at(-1).message, /Jangan cuba semula/i);
  assert.equal(setup.messages.at(-1).isError, true);
});

test('network failure is not retried automatically', async () => {
  const setup = createConfirmationContext(() => Promise.reject(new Error('network down')));

  await setup.context.confirmNativeEbayarSubmission();

  assert.equal(setup.apiCalls.length, 1);
  assert.match(setup.messages.at(-1).message, /Jangan cuba semula/i);
  assert.equal(setup.messages.at(-1).isError, true);
});

test('PWA exposes one hidden-by-default eBayar V2 Maintenance shortcut', () => {
  const shortcut = /<button[^>]+id="btnEbayarV2Maintenance"[^>]*>[\s\S]*?eBayar V2 Maintenance[\s\S]*?<\/button>/.exec(indexSource);
  assert.ok(shortcut, 'Maintenance shortcut button not found');
  assert.match(shortcut[0], /onclick="openEbayarV2Maintenance\(\)"/);
  assert.match(shortcut[0], /style="[^"]*display:none/);

  const loginStateSource = extractFunction(indexSource, 'setLoginState');
  assert.match(loginStateSource, /currentRole === 'ADMIN'/);
  assert.match(loginStateSource, /btnEbayarV2Maintenance\.style\.display = isAdmin \? '' : 'none'/);
});

test('maintenance shortcut reuses configured production exec URL and blocks non-admin use', async () => {
  function makeContext(role, gasUrl) {
    const opened = [];
    const alerts = [];
    const context = {
      currentRole: role,
      _gasUrlReady: Promise.resolve(),
      alert: message => alerts.push(message),
      window: {
        GAS_URL: gasUrl,
        open: (...args) => {
          opened.push(args);
          return { opener: 'original' };
        }
      }
    };
    vm.createContext(context);
    vm.runInContext(extractFunction(indexSource, 'getEbayarV2MaintenanceUrl'), context);
    vm.runInContext(extractFunction(indexSource, 'openEbayarV2Maintenance'), context);
    return { context, opened, alerts };
  }

  const productionUrl = 'https://script.google.com/macros/s/PRODUCTION_ID/exec';
  const nonAdmin = makeContext('GURU', productionUrl);
  assert.equal(await nonAdmin.context.openEbayarV2Maintenance(), false);
  assert.equal(nonAdmin.opened.length, 0);

  const admin = makeContext('ADMIN', productionUrl);
  assert.equal(await admin.context.openEbayarV2Maintenance(), true);
  assert.deepEqual(admin.opened, [[productionUrl, '_blank', 'noopener,noreferrer']]);
  assert.equal(admin.alerts.length, 0);

  const devTarget = makeContext('ADMIN', 'https://script.google.com/macros/s/TEST_ID/dev');
  assert.equal(await devTarget.context.openEbayarV2Maintenance(), false);
  assert.equal(devTarget.opened.length, 0);
  assert.equal(devTarget.alerts.length, 1);
});
