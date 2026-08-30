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

function getButtonMarkup(index) {
  const match = new RegExp('<a[^>]+id="ebtn-' + index + '"[^>]*>[^<]*</a>').exec(indexSource);
  assert.ok(match, 'Button not found: ebtn-' + index);
  return match[0];
}

test('January through August retain their exact Legacy Google Form routes', () => {
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
  expected.forEach((url, index) => assert.match(getButtonMarkup(index), new RegExp('href="' + url + '"')));
});

test('September through December are static fail-closed Native cards', () => {
  [8, 9, 10, 11].forEach((index) => {
    const markup = getButtonMarkup(index);
    assert.doesNotMatch(markup, /forms\.gle|href=/);
    assert.match(markup, /class="ebayar-btn native-route"/);
    assert.match(markup, /aria-disabled="true"/);
  });
});

test('one production Native URL constant is used and it is never a dev URL', () => {
  const declarations = indexSource.match(/const NATIVE_EBAYAR_PRODUCTION_URL\s*=\s*'([^']+)'/g) || [];
  assert.equal(declarations.length, 1);
  assert.match(declarations[0], /https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/);
  assert.doesNotMatch(declarations[0], /\/dev/);
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

test('an open Native month points to production while a future month has no href', () => {
  const constantMatch = /const NATIVE_EBAYAR_PRODUCTION_URL\s*=\s*'([^']+)'/.exec(indexSource);
  assert.ok(constantMatch);
  function makeButton() {
    const attributes = {};
    return {
      attributes,
      classList: { add() {} },
      setAttribute(name, value) { attributes[name] = String(value); },
      removeAttribute(name) { delete attributes[name]; if (name === 'href') delete this.href; },
      textContent: '',
      href: undefined,
      target: undefined,
      rel: undefined
    };
  }
  const buttons = { 'ebtn-8': makeButton(), 'ebtn-9': makeButton() };
  const context = {
    NATIVE_EBAYAR_PRODUCTION_URL: constantMatch[1],
    document: { getElementById: id => buttons[id] || null }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(indexSource, 'getNativeEbayarProductionUrl'), context);
  vm.runInContext(extractFunction(indexSource, 'applyNativeEbayarMonthRoute'), context);

  context.applyNativeEbayarMonthRoute(8, {
    monthKey: '2026-09', routeType: 'NATIVE', isOpen: true, isFuture: false
  });
  assert.equal(buttons['ebtn-8'].href, constantMatch[1]);
  assert.equal(buttons['ebtn-8'].target, '_blank');
  assert.equal(buttons['ebtn-8'].rel, 'noopener noreferrer');
  assert.equal(buttons['ebtn-8'].attributes['aria-disabled'], 'false');

  context.applyNativeEbayarMonthRoute(9, {
    monthKey: '2026-10', routeType: 'NATIVE', isOpen: false, isFuture: true
  });
  assert.equal(buttons['ebtn-9'].href, undefined);
  assert.equal(buttons['ebtn-9'].attributes['aria-disabled'], 'true');
  assert.equal(buttons['ebtn-9'].textContent, 'Akan Datang');
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
