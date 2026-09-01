const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');
const backendSource = fs.readFileSync(path.join(repoRoot, 'Code.js'), 'utf8');
const helperName = 'backfillOgos2026Rows69To71GuardedV2';

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
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
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
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error('Unterminated function: ' + name);
}

const paymentGroupIds = [
  'PG-2026-OGOS2026-69',
  'PG-2026-OGOS2026-70',
  'PG-2026-OGOS2026-71'
];
const allowedAnomaly = {
  type: 'GROUP_ID_MULTIPLE_STAGED_HASHES',
  key: 'PG-2026-JUN2026-112',
  stagedLocations: ['2026|Jun2026|112'],
  stagedHashes: [
    'e8ada66407f1b7873e4adacc6cf510dbcfd823007ff0663b9acccb3fad144b59',
    'c15975677b4b9c18beb1d63a6f4c83806c77a42e59e8c1874a8e050e79b7e930'
  ]
};

function validPreview() {
  return {
    success: true,
    existingUnchangedGroups: 67,
    changedExistingGroups: 0,
    genuinelyNewGroups: 3,
    projectedChildRows: 5,
    uniquePaidNamesCount: 5,
    projectedTotalAmount: 120,
    projectedPaidStatusAmount: 120,
    highestExistingAugustSourceRow: 68,
    genuinelyNewCandidates: paymentGroupIds.map(paymentGroupId => ({ paymentGroupId })),
    anomalies: [{
      ...allowedAnomaly,
      stagedLocations: [...allowedAnomaly.stagedLocations],
      stagedHashes: [...allowedAnomaly.stagedHashes]
    }]
  };
}

function runHelper(preview) {
  const calls = [];
  const logs = [];
  const context = {
    Session: {
      getEffectiveUser: () => ({ getEmail: () => 'shafielegacykelasmengaji@gmail.com' })
    },
    previewAugust2026CatchupV2: () => preview,
    syncCurrentMonthEbayarV2Core_: (...args) => {
      calls.push(args);
      return { success: true, appendedGroups: 3, appendedChildRows: 5 };
    },
    Logger: { log: value => logs.push(value) }
  };
  vm.createContext(context);
  vm.runInContext(extractFunction(backendSource, helperName), context);
  const result = context[helperName]();
  return { result: JSON.parse(JSON.stringify(result)), calls, logs };
}

test('allowlisted unrelated anomaly permits the exact guarded core request', () => {
  const run = runHelper(validPreview());

  assert.equal(run.result.success, true);
  assert.equal(run.calls.length, 1);
  const [meta, allowWrite, requestedIds] = run.calls[0];
  assert.deepEqual(JSON.parse(JSON.stringify(meta)), {
    success: true,
    tahun: 2026,
    bulanNumber: '08',
    bulanKey: '2026-08',
    bulanLabel: 'Ogos 2026',
    sourceSheet: 'OGOS2026'
  });
  assert.equal(allowWrite, true);
  assert.deepEqual(Array.from(requestedIds), paymentGroupIds);
  assert.deepEqual(JSON.parse(run.logs.at(-1)), run.result);
});

test('unexpected anomaly aborts before the guarded core', () => {
  const preview = validPreview();
  preview.anomalies.push({ type: 'UNEXPECTED', key: 'legacy-other-group' });
  const run = runHelper(preview);

  assert.equal(run.result.success, false);
  assert.match(run.result.message, /allowlist/);
  assert.equal(run.calls.length, 0);
});

test('anomaly intersecting Ogos rows 69-71 aborts before the guarded core', () => {
  const preview = validPreview();
  preview.anomalies.push({
    type: 'GROUP_ID_MULTIPLE_STAGED_HASHES',
    key: 'PG-2026-OGOS2026-70',
    stagedLocations: ['2026|OGOS2026|70'],
    stagedHashes: ['candidate-hash-a', 'candidate-hash-b']
  });
  const run = runHelper(preview);

  assert.equal(run.result.success, false);
  assert.match(run.result.message, /baris 69-71/);
  assert.equal(run.result.candidateAnomalies.length, 1);
  assert.equal(run.calls.length, 0);
});

test('every exact preview mismatch aborts before the guarded core', () => {
  const mismatches = [
    ['existingUnchangedGroups', 66],
    ['changedExistingGroups', 1],
    ['genuinelyNewGroups', 4],
    ['projectedChildRows', 4],
    ['uniquePaidNamesCount', 4],
    ['projectedTotalAmount', 119],
    ['projectedPaidStatusAmount', 119],
    ['highestExistingAugustSourceRow', 69]
  ];

  mismatches.forEach(([field, value]) => {
    const preview = validPreview();
    preview[field] = value;
    const run = runHelper(preview);
    assert.equal(run.result.success, false, field);
    assert.equal(run.result.previewMismatches[0].field, field);
    assert.equal(run.calls.length, 0, field);
  });

  const preview = validPreview();
  preview.genuinelyNewCandidates[2].paymentGroupId = 'PG-2026-OGOS2026-72';
  const run = runHelper(preview);
  assert.equal(run.result.success, false);
  assert.equal(run.result.previewMismatches[0].field, 'genuinelyNewPaymentGroupIds');
  assert.equal(run.calls.length, 0);
});

test('editor-only helper has no additional backend reference that could expose it', () => {
  const references = backendSource.match(new RegExp(helperName, 'g')) || [];
  assert.equal(references.length, 1);
});
