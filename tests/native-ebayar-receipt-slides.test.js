const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const backendSource = fs.readFileSync(path.resolve(__dirname, '..', 'Code.js'), 'utf8');

function extractFunction(source, name) {
  const match = new RegExp('function\\s+' + name + '\\s*\\(').exec(source);
  assert.ok(match, 'Function not found: ' + name);
  const start = match.index;
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      i += 1;
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

function makeMappingContext() {
  const context = {
    getMonthMetaV2_: bulanKey => ({
      '2026-09': { label: 'September' },
      '2026-10': { label: 'Oktober' }
    })[bulanKey] || null
  };
  vm.createContext(context);
  [
    'balanceNativeEbayarReceiptNamesV2_',
    'getNativeEbayarReceiptDisplayReferenceV2_',
    'formatNativeEbayarReceiptDateV2_',
    'buildNativeEbayarReceiptTemplateDataV2_'
  ].forEach(name => vm.runInContext(extractFunction(backendSource, name), context));
  return context;
}

function sampleGroup(students) {
  return {
    paymentGroupId: 'NATIVE-202609-20260901100000-AAAAAAAAAA',
    bulanKey: '2026-09',
    paymentDate: '2026-09-01',
    amountTotal: 100,
    students: students || [
      { nama: 'MUHAMMAD ADAM BIN AHMAD' },
      { nama: 'NUR AISYAH BINTI AHMAD' }
    ]
  };
}

test('Slides placeholder mapping uses bare template values and Malaysian formatting', () => {
  const context = makeMappingContext();
  const result = context.buildNativeEbayarReceiptTemplateDataV2_(sampleGroup(), {});
  const placeholders = JSON.parse(JSON.stringify(result.placeholders));

  assert.deepEqual(placeholders, {
    '<<NAMA PENUH ANAK>>': 'MUHAMMAD ADAM BIN AHMAD\nNUR AISYAH BINTI AHMAD',
    '<<BULAN>>': 'SEPTEMBER',
    '<<NO RESIT>>': '01100000',
    '<<TARIKH>>': '1 September 2026',
    '<<BAYARAN>>': '100.00'
  });
  assert.doesNotMatch(placeholders['<<NO RESIT>>'], /SL|SEPTEMBER|2026/);
  assert.doesNotMatch(placeholders['<<BAYARAN>>'], /RM/i);
  assert.equal(result.nameFontSize, 8);
});

test('multiple children are balanced across two readable lines with local font reduction', () => {
  const context = makeMappingContext();
  const students = [
    'ANAK SATU BIN CONTOH',
    'ANAK DUA BINTI CONTOH',
    'ANAK TIGA BIN CONTOH',
    'ANAK EMPAT BINTI CONTOH',
    'ANAK LIMA BIN CONTOH'
  ].map(nama => ({ nama }));
  const result = context.buildNativeEbayarReceiptTemplateDataV2_(sampleGroup(students), {});

  assert.equal(result.nameText.split('\n').length, 2);
  students.forEach(student => assert.match(result.nameText, new RegExp(student.nama)));
  assert.equal(result.nameFontSize, 7);
});

test('placeholder mapping ignores private payment and implementation fields', () => {
  const context = makeMappingContext();
  const group = {
    ...sampleGroup(),
    noMykidMykad: 'SECRET-MYKID',
    phone: 'SECRET-PHONE',
    email: 'SECRET-EMAIL',
    address: 'SECRET-ADDRESS',
    slipUrl: 'SECRET-SLIP-URL',
    sourceHash: 'SECRET-HASH',
    rowNumbers: [123],
    nativeNoteText: 'SECRET-NOTE'
  };
  const serialized = JSON.stringify(context.buildNativeEbayarReceiptTemplateDataV2_(group, {}));

  ['SECRET-MYKID', 'SECRET-PHONE', 'SECRET-EMAIL', 'SECRET-ADDRESS', 'SECRET-SLIP-URL',
    'SECRET-HASH', 'SECRET-NOTE', '123'].forEach(secret => assert.doesNotMatch(serialized, new RegExp(secret)));
});

function makePdfBlobContext(shouldFail) {
  const events = [];
  const tempFile = {
    getId: () => 'TEMP_PRESENTATION_ID',
    getAs: mime => {
      events.push(['getAs', mime]);
      return { mime };
    },
    setTrashed: value => events.push(['setTrashed', value])
  };
  const templateFile = {
    makeCopy: title => {
      events.push(['makeCopy', title]);
      return tempFile;
    }
  };
  const presentation = {
    saveAndClose: () => events.push(['saveAndClose'])
  };
  const context = {
    DriveApp: {
      getFileById: id => {
        events.push(['getFileById', id]);
        return templateFile;
      }
    },
    SlidesApp: {
      openById: id => {
        events.push(['openById', id]);
        return presentation;
      }
    },
    MimeType: { PDF: 'application/pdf' },
    Logger: { log: message => events.push(['log', message]) },
    populateNativeEbayarReceiptPresentationV2_: () => {
      events.push(['populate']);
      if (shouldFail) throw new Error('Synthetic population failure');
    }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(backendSource, 'createNativeEbayarReceiptPdfBlobV2_'), context);
  return { context, events };
}

test('temporary Slides copy is trashed after successful PDF export', () => {
  const { context, events } = makePdfBlobContext(false);
  const result = context.createNativeEbayarReceiptPdfBlobV2_('TEMPLATE_ID', sampleGroup(), {});

  assert.equal(result.mime, 'application/pdf');
  assert.deepEqual(events.at(-1), ['setTrashed', true]);
  assert.ok(events.some(event => event[0] === 'openById' && event[1] === 'TEMP_PRESENTATION_ID'));
  assert.ok(!events.some(event => event[0] === 'openById' && event[1] === 'TEMPLATE_ID'));
});

test('temporary Slides copy is trashed when population or export fails', () => {
  const { context, events } = makePdfBlobContext(true);

  assert.throws(
    () => context.createNativeEbayarReceiptPdfBlobV2_('TEMPLATE_ID', sampleGroup(), {}),
    /Synthetic population failure/
  );
  assert.deepEqual(events.at(-1), ['setTrashed', true]);
});

test('one payment group writes the same receipt URL to every child row', () => {
  const context = {};
  vm.createContext(context);
  vm.runInContext(extractFunction(backendSource, 'applyNativeEbayarReceiptUrlToValuesV2_'), context);
  const values = [['old-a'], ['old-b'], ['unrelated']];
  const result = context.applyNativeEbayarReceiptUrlToValuesV2_(values, 40, [40, 41], 'https://drive.google.com/receipt');

  assert.deepEqual(JSON.parse(JSON.stringify(result)), [
    ['https://drive.google.com/receipt'],
    ['https://drive.google.com/receipt'],
    ['unrelated']
  ]);
});

test('synthetic preview helper stays outside Payments and uses the real Slides-to-PDF layer', () => {
  const source = extractFunction(backendSource, 'testCreateNativeEbayarReceiptSlidesPreviewV2_');
  assert.match(source, /NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID/);
  assert.match(source, /createNativeEbayarReceiptPdfBlobV2_/);
  assert.match(source, /CONTOH/);
  assert.doesNotMatch(source, /getEbayarMasterSpreadsheetForImportV2_|setValues\(|RESIT_URL\s*=/);
});
