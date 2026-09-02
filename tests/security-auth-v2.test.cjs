const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');
const backendSource = fs.readFileSync(path.join(repoRoot, 'Code.js'), 'utf8');
const testWaSource = fs.readFileSync(path.join(repoRoot, 'TestWA.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const portalSource = fs.readFileSync(path.join(repoRoot, 'portal.html'), 'utf8');

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
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

function extractArrayDeclaration(source, name) {
  const match = new RegExp('var\\s+' + name + '\\s*=\\s*\\[').exec(source);
  assert.ok(match, 'Array not found: ' + name);
  const end = source.indexOf('];', match.index);
  assert.notEqual(end, -1);
  return source.slice(match.index, end + 2);
}

function createProperties() {
  const values = new Map();
  return {
    values,
    api: {
      getProperty: key => values.has(key) ? values.get(key) : null,
      setProperty(key, value) { values.set(key, String(value)); return this; },
      deleteProperty(key) { values.delete(key); return this; },
      getProperties: () => Object.fromEntries(values)
    }
  };
}

function signedBytes(buffer) {
  return Array.from(buffer, value => value > 127 ? value - 256 : value);
}

function createAuthHarness(extraRows = []) {
  const properties = createProperties();
  const mails = [];
  const clock = { now: Date.UTC(2026, 8, 2, 1, 0, 0) };
  let uuidCounter = 0;
  class FakeDate extends Date {
    constructor(...args) { super(args.length ? args[0] : clock.now); }
    static now() { return clock.now; }
  }
  const rows = [
    ['TIMESTAMP', 'EMAIL', 'NAMA', 'IC', 'TELEFON', 'ALAMAT', 'FAHAM', 'ROLE'],
    ['', 'admin@example.test', 'Admin Canonical', '', '', '', '', 'ADMIN'],
    ['', 'guru@example.test', 'Guru Canonical', '', '', '', '', 'GURU'],
    ['', 'viewer@example.test', 'Viewer', '', '', '', '', 'VIEWER'],
    ...extraRows
  ];
  const sheet = {
    getLastRow: () => rows.length,
    getDataRange: () => ({ getValues: () => rows })
  };
  const context = {
    Array,
    Date: FakeDate,
    JSON,
    Math,
    RegExp,
    String,
    TAB: { GURU: 'Maklumat Guru' },
    COL_GURU: { EMAIL: 1, NAMA: 2, ROLE: 7 },
    SPREADSHEET_ID: 'test-only',
    PropertiesService: { getScriptProperties: () => properties.api },
    SpreadsheetApp: { openById: () => ({ getSheetByName: name => name === 'Maklumat Guru' ? sheet : null }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: message => mails.push(message) },
    Logger: { log() {} },
    Utilities: {
      Charset: { UTF_8: 'UTF_8' },
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      getUuid: () => crypto.createHash('sha256').update('uuid-' + (++uuidCounter)).digest('hex').slice(0, 32),
      computeDigest: (_algorithm, value) => signedBytes(crypto.createHash('sha256').update(String(value)).digest()),
      computeHmacSha256Signature: (value, secret) => signedBytes(crypto.createHmac('sha256', String(secret)).update(String(value)).digest()),
      base64EncodeWebSafe: bytes => Buffer.from(bytes.map(value => value & 255)).toString('base64url')
    },
    cariTabGuru: name => 'TAB-' + name
  };
  vm.createContext(context);
  Object.assign(context, {
    STAFF_AUTH_V2_OTP_TTL_MS_: 5 * 60 * 1000,
    STAFF_AUTH_V2_OTP_COOLDOWN_MS_: 60 * 1000,
    STAFF_AUTH_V2_ACCOUNT_SEND_LIMIT_: 5,
    STAFF_AUTH_V2_GLOBAL_SEND_LIMIT_: 100,
    STAFF_AUTH_V2_RATE_WINDOW_MS_: 60 * 60 * 1000,
    STAFF_AUTH_V2_IDLE_MS_: 30 * 60 * 1000,
    STAFF_AUTH_V2_ABSOLUTE_MS_: 8 * 60 * 60 * 1000,
    STAFF_AUTH_V2_OTP_PREFIX_: 'STAFF_LOGIN_OTP_V2_',
    STAFF_AUTH_V2_RATE_PREFIX_: 'STAFF_LOGIN_RATE_V2_',
    STAFF_AUTH_V2_SESSION_PREFIX_: 'STAFF_SESSION_V2_',
    STAFF_AUTH_V2_GLOBAL_RATE_KEY_: 'STAFF_LOGIN_RATE_V2_GLOBAL',
    STAFF_AUTH_V2_SECRET_KEY_: 'STAFF_AUTH_V2_HMAC_SECRET',
    STAFF_AUTH_V2_REQUEST_MESSAGE_: 'Jika e-mel layak, kod log masuk akan dihantar.',
    STAFF_AUTH_V2_CONFIRM_MESSAGE_: 'Kod log masuk tidak sah atau telah tamat tempoh.'
  });
  [
    'loginGuru', 'normalizeStaffEmail_', 'escapeStaffAuthHtml_', 'getStaffAuthHmacSecret_',
    'staffAuthHmac_', 'staffAuthDigest_', 'generateStaffLoginOtp_', 'generateStaffSessionToken_',
    'getStaffLoginOtpKey_', 'getStaffLoginRateKey_', 'getStaffSessionKey_', 'getCurrentStaffIdentity_',
    'readStaffAuthRecord_', 'consumeStaffLoginSendLimit_', 'sendStaffLoginOtpEmail_',
    'requestStaffLoginOtp', 'issueStaffSessionV2_', 'confirmStaffLoginOtp',
    'validateToken', 'renewSession', 'logout'
  ].forEach(name => {
    try {
      vm.runInContext(extractFunction(backendSource, name), context);
    } catch (error) {
      throw new Error(name + ': ' + error.message);
    }
  });
  return { context, properties, mails, clock, rows };
}

function requestedOtp(harness, email = 'admin@example.test') {
  harness.context.requestStaffLoginOtp({ email });
  assert.equal(harness.mails.length, 1);
  const match = harness.mails[0].htmlBody.match(/>(\d{6})</);
  assert.ok(match, 'OTP not found in captured test e-mail');
  return match[1];
}

test('known, unknown and ineligible staff OTP requests return the same generic response', () => {
  const known = createAuthHarness();
  const unknown = createAuthHarness();
  const ineligible = createAuthHarness();
  const a = known.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  const b = unknown.context.requestStaffLoginOtp({ email: 'unknown@example.test' });
  const c = ineligible.context.requestStaffLoginOtp({ email: 'viewer@example.test' });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(c)));
  assert.equal(known.mails.length, 1);
  assert.equal(unknown.mails.length, 0);
  assert.equal(ineligible.mails.length, 0);
});

test('staff OTP is stored as an HMAC digest and staff HTML is escaped', () => {
  const harness = createAuthHarness([['', 'escaped@example.test', '<Admin & Co>', '', '', '', '', 'ADMIN']]);
  const otp = requestedOtp(harness, 'escaped@example.test');
  const otpEntry = [...harness.properties.values.entries()].find(([key]) => key.startsWith('STAFF_LOGIN_OTP_V2_') && !key.endsWith('GLOBAL_RATE'));
  assert.ok(otpEntry);
  assert.doesNotMatch(otpEntry[1], new RegExp(otp));
  assert.match(otpEntry[1], /otpDigest/);
  assert.match(harness.mails[0].htmlBody, /&lt;Admin &amp; Co&gt;/);
});

test('staff OTP expires after five minutes', () => {
  const harness = createAuthHarness();
  const otp = requestedOtp(harness);
  harness.clock.now += 5 * 60 * 1000 + 1;
  assert.equal(harness.context.confirmStaffLoginOtp({ email: 'admin@example.test', otp }).success, false);
});

test('three failed attempts lock the OTP and valid OTP cannot bypass the lock', () => {
  const harness = createAuthHarness();
  const otp = requestedOtp(harness);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(harness.context.confirmStaffLoginOtp({ email: 'admin@example.test', otp: '000000' }).success, false);
  }
  assert.equal(harness.context.confirmStaffLoginOtp({ email: 'admin@example.test', otp }).success, false);
});

test('resend cooldown and per-account hourly send limit are enforced', () => {
  const harness = createAuthHarness();
  harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  assert.equal(harness.mails.length, 1);
  for (let send = 1; send < 5; send += 1) {
    harness.clock.now += 60 * 1000 + 1;
    harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  }
  assert.equal(harness.mails.length, 5);
  harness.clock.now += 60 * 1000 + 1;
  harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  assert.equal(harness.mails.length, 5);
});

test('global send limit protects MailApp quota', () => {
  const harness = createAuthHarness([['', 'second@example.test', 'Second', '', '', '', '', 'ADMIN']]);
  harness.context.STAFF_AUTH_V2_GLOBAL_SEND_LIMIT_ = 1;
  harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  harness.context.requestStaffLoginOtp({ email: 'second@example.test' });
  assert.equal(harness.mails.length, 1);
});

test('mail delivery failure preserves per-account throttling but invalidates the OTP', () => {
  const harness = createAuthHarness();
  harness.context.MailApp.sendEmail = () => { throw new Error('simulated delivery failure'); };
  harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  const otpKeys = [...harness.properties.values.keys()].filter(key => key.startsWith('STAFF_LOGIN_OTP_V2_'));
  const rateKeys = [...harness.properties.values.keys()].filter(key => key.startsWith('STAFF_LOGIN_RATE_V2_'));
  assert.equal(otpKeys.length, 0);
  assert.ok(rateKeys.length >= 2, 'account and global rate records must remain');

  harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  assert.equal(harness.mails.length, 0, 'cooldown remains active after delivery failure');
  harness.clock.now += 60 * 1000 + 1;
  harness.context.MailApp.sendEmail = message => harness.mails.push(message);
  harness.context.requestStaffLoginOtp({ email: 'admin@example.test' });
  assert.equal(harness.mails.length, 1);
  const accountRateKey = rateKeys.find(key => key !== 'STAFF_LOGIN_RATE_V2_GLOBAL');
  assert.equal(JSON.parse(harness.properties.api.getProperty(accountRateKey)).sendCount, 2);
});

test('staff OTP is one-time use and issues a Session V2 record', () => {
  const harness = createAuthHarness();
  const otp = requestedOtp(harness);
  const result = harness.context.confirmStaffLoginOtp({ email: 'admin@example.test', otp });
  assert.equal(result.success, true);
  assert.equal(result.role, 'ADMIN');
  assert.equal(harness.context.confirmStaffLoginOtp({ email: 'admin@example.test', otp }).success, false);
  assert.ok(!harness.properties.values.has('session_' + result.token));
  const sessionEntry = [...harness.properties.values.entries()].find(([key]) => key.startsWith('STAFF_SESSION_V2_'));
  assert.ok(sessionEntry);
  assert.ok(!sessionEntry[0].includes(result.token));
  const session = JSON.parse(sessionEntry[1]);
  assert.equal(session.version, 2);
  for (const field of ['email', 'nama', 'role', 'issuedAt', 'lastSeen', 'idleExpiry', 'absoluteExpiry']) {
    assert.ok(session[field], 'missing session field ' + field);
  }
});

test('legacy sessions fail closed', () => {
  const harness = createAuthHarness();
  harness.properties.api.setProperty('session_legacy-token', JSON.stringify({ expiry: harness.clock.now + 10000 }));
  assert.equal(harness.context.validateToken('legacy-token').valid, false);
});

test('idle and eight-hour absolute expiry both invalidate sessions', () => {
  const idleHarness = createAuthHarness();
  const idle = idleHarness.context.issueStaffSessionV2_({ email: 'admin@example.test', nama: 'Admin Canonical', role: 'ADMIN' }, idleHarness.clock.now);
  idleHarness.clock.now += 30 * 60 * 1000 + 1;
  assert.equal(idleHarness.context.validateToken(idle.token).valid, false);

  const absoluteHarness = createAuthHarness();
  const absolute = absoluteHarness.context.issueStaffSessionV2_({ email: 'admin@example.test', nama: 'Admin Canonical', role: 'ADMIN' }, absoluteHarness.clock.now);
  const key = absoluteHarness.context.getStaffSessionKey_(absolute.token);
  const record = JSON.parse(absoluteHarness.properties.api.getProperty(key));
  record.idleExpiry = record.absoluteExpiry;
  absoluteHarness.properties.api.setProperty(key, JSON.stringify(record));
  absoluteHarness.clock.now = record.absoluteExpiry + 1;
  assert.equal(absoluteHarness.context.validateToken(absolute.token).valid, false);
});

test('renewal slides idle expiry but never beyond absolute expiry and returns canonical identity', () => {
  const harness = createAuthHarness();
  const session = harness.context.issueStaffSessionV2_({ email: 'admin@example.test', nama: 'Old Name', role: 'GURU' }, harness.clock.now);
  const key = harness.context.getStaffSessionKey_(session.token);
  const original = JSON.parse(harness.properties.api.getProperty(key));
  original.idleExpiry = original.absoluteExpiry;
  harness.properties.api.setProperty(key, JSON.stringify(original));
  harness.clock.now = original.absoluteExpiry - 10 * 60 * 1000;
  const result = harness.context.renewSession({ token: session.token });
  assert.equal(result.success, true);
  assert.equal(result.user, 'Admin Canonical');
  assert.equal(result.role, 'ADMIN');
  assert.equal(result.idleExpiry, original.absoluteExpiry);
});

test('logout invalidates the digest-derived session', () => {
  const harness = createAuthHarness();
  const session = harness.context.issueStaffSessionV2_({ email: 'admin@example.test', nama: 'Admin Canonical', role: 'ADMIN' }, harness.clock.now);
  assert.equal(harness.context.logout({ token: session.token }).success, true);
  assert.equal(harness.context.validateToken(session.token).valid, false);
});

function createPolicyHarness(role) {
  const context = { JSON, Math: { random: () => 1 }, Logger: { log() {} } };
  vm.createContext(context);
  ['ALLOWED_ACTIONS', 'AUTH_REQUIRED_ACTIONS', 'PUBLIC_ACTIONS', 'ADMIN_REQUIRED_ACTIONS']
    .forEach(name => vm.runInContext(extractArrayDeclaration(backendSource, name), context));
  context.validateToken = () => ({ valid: true, user: { email: role.toLowerCase() + '@example.test', nama: role, role } });
  vm.runInContext(extractFunction(backendSource, 'authorizeAction_'), context);
  context.recordCash = payload => ({ success: true, actor: payload._authActor });
  vm.runInContext(extractFunction(backendSource, 'doAction'), context);
  return context;
}

test('GURU is denied from every Admin-only action', () => {
  const context = createPolicyHarness('GURU');
  for (const action of context.ADMIN_REQUIRED_ACTIONS) {
    const payload = { token: 'test-token' };
    const result = context.authorizeAction_(action, payload);
    assert.equal(result.valid, false, action);
    assert.match(result.message, /Admin/, action);
  }
});

test('ADMIN reaches the existing handler and browser adminEmail cannot spoof actor identity', () => {
  const context = createPolicyHarness('ADMIN');
  const result = context.doAction('recordCash', { token: 'test-token', adminEmail: 'spoofed@example.test', _authActor: { email: 'spoofed@example.test' } });
  assert.equal(result.success, true);
  assert.equal(result.actor.email, 'admin@example.test');
  assert.notEqual(result.actor.email, 'spoofed@example.test');
  assert.doesNotMatch(extractFunction(backendSource, 'tukarGuruMurid'), /params\.adminEmail/);
  assert.doesNotMatch(extractFunction(backendSource, 'assignGuruMurid'), /params\.adminEmail/);
});

test('doPost, doGet and doAction converge on the same central policy', () => {
  const doPost = extractFunction(backendSource, 'doPost');
  const doGet = extractFunction(backendSource, 'doGet');
  const doAction = extractFunction(backendSource, 'doAction');
  assert.match(doPost, /doAction\(action, body\)/);
  assert.match(doGet, /doAction\(action, payload\)/);
  assert.match(doAction, /authorizeAction_\(action, payload\)/);
  const guru = createPolicyHarness('GURU');
  assert.equal(guru.doAction('recordCash', { token: 'test-token' }).success, false);
  const admin = createPolicyHarness('ADMIN');
  assert.equal(admin.doAction('recordCash', { token: 'test-token' }).success, true);
});

test('PUBLIC actions never overlap protected classifications and invalid overlap fails closed', () => {
  const context = createPolicyHarness('ADMIN');
  const publicSet = new Set(Array.from(context.PUBLIC_ACTIONS));
  const authenticatedSet = new Set(Array.from(context.AUTH_REQUIRED_ACTIONS));
  const adminSet = new Set(Array.from(context.ADMIN_REQUIRED_ACTIONS));
  assert.deepEqual([...publicSet].filter(action => authenticatedSet.has(action)), []);
  assert.deepEqual([...publicSet].filter(action => adminSet.has(action)), []);
  assert.deepEqual([...adminSet].filter(action => !authenticatedSet.has(action)), []);

  context.AUTH_REQUIRED_ACTIONS.push('login');
  assert.equal(context.authorizeAction_('login', {}).valid, false);
});

test('role changes and removal revoke effective privileged access', () => {
  const harness = createAuthHarness();
  const session = harness.context.issueStaffSessionV2_({ email: 'admin@example.test', nama: 'Admin Canonical', role: 'ADMIN' }, harness.clock.now);
  harness.rows[1][7] = 'GURU';
  const changed = harness.context.validateToken(session.token, { revalidateStaff: true });
  assert.equal(changed.valid, true);
  assert.equal(changed.user.role, 'GURU');
  harness.rows.splice(1, 1);
  assert.equal(harness.context.validateToken(session.token, { revalidateStaff: true }).valid, false);
});

test('legacy phone login fails closed and active test credentials are sanitized', () => {
  const harness = createAuthHarness();
  assert.equal(harness.context.loginGuru({ email: 'admin@example.test', phone: '123456' }).success, false);
  assert.doesNotMatch(backendSource, /loginGuru\s*\(\s*\{[^}]*email\s*:\s*['"][^'"]+['"][^}]*phone\s*:\s*['"]\d{6,}['"]/s);
  assert.doesNotMatch(testWaSource, /var\s+nombor\s*=\s*['"]\+?\d{8,}['"]/);
  assert.match(testWaSource, /TEST_WA_NUMBER/);
  assert.match(backendSource, /TEST_STAFF_EMAIL/);
});

test('existing Native eBayar guards and Phase 2 eSemak marker remain present', () => {
  assert.match(backendSource, /LockService\.getScriptLock\(\)/);
  assert.match(backendSource, /params\.students\.length\s*>\s*5/);
  assert.match(backendSource, /postWriteVerified/);
  assert.match(backendSource, /Phase 2 FIX NOW:[^\n]*public eSemak/);
});

test('both frontends retire active legacy staff phone login calls', () => {
  for (const [name, source] of [['index.html', indexSource], ['portal.html', portalSource]]) {
    assert.doesNotMatch(source, /callGAS(?:Promise)?\(\s*['"]login['"]/s, name);
    assert.doesNotMatch(source, /id=["']loginPhone(?:Modal)?["']/s, name);
    assert.doesNotMatch(source, /last\s*6|6\s*digit\s*terakhir\s*telefon/i, name);
  }
});

test('header and mobile login flows wire Staff OTP V2 in both frontends', () => {
  for (const [name, source] of [['index.html', indexSource], ['portal.html', portalSource]]) {
    const header = extractFunction(source, 'handleLogin');
    const mobile = extractFunction(source, 'handleLoginModal');
    for (const flow of [header, mobile]) {
      assert.match(flow, /requestStaffLoginOtp/, name);
      assert.match(flow, /confirmStaffLoginOtp/, name);
    }
    assert.match(source, /id=["']loginOtp["']/, name);
    assert.match(source, /id=["']loginOtpModal["']/, name);
  }
});

test('successful OTP confirmation stores V2 session state and both frontends renew periodically', () => {
  for (const [name, source] of [['index.html', indexSource], ['portal.html', portalSource]]) {
    const completion = extractFunction(source, 'completeStaffLogin_');
    const renewal = extractFunction(source, 'startStaffSessionRenewal_');
    assert.match(completion, /_spkm_st\.setItem\(['"]spkm_token['"],\s*data\.token\)/, name);
    assert.match(completion, /localStorage\.setItem\(SPKM_LS_USER/, name);
    assert.match(completion, /role:\s*currentRole/, name);
    assert.match(renewal, /renewSession/, name);
    assert.match(renewal, /20\s*\*\s*60\s*\*\s*1000/, name);
    assert.match(extractFunction(source, 'tryAutoLogin'), /data\.role\s*\|\|\s*u\.role/, name);
  }
});
