const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const code = fs.readFileSync(
  path.join(__dirname, '..', 'Code.js'),
  'utf8'
);

function extract(name) {
  const start = code.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name);

  let depth = 0;

  for (let i = code.indexOf('{', start); i < code.length; i++) {
    if (code[i] === '{') depth++;

    if (code[i] === '}' && --depth === 0) {
      return code.slice(start, i + 1);
    }
  }

  throw new Error('Unclosed ' + name);
}

function createContext() {
  let rosterWrites = 0;
  let registryWrites = 0;

  const dewasaSheet = {
    getLastColumn: () => 20,
    getLastRow: () => 41,
    getRange: (row, col) => ({
      getValue: () => {
        if (row === 1 && col === 20) {
          return 'STUDENT_UID';
        }
        return '';
      }
    }),
    appendRow: () => {
      rosterWrites++;
    }
  };

  const registrySheet = {
    appendRow: () => {
      registryWrites++;
    }
  };

  const lock = {
    tryLock: () => true,
    releaseLock: () => {}
  };

  const ctx = vm.createContext({
    SPREADSHEET_ID: 'TEST_ROSTER',
    TAB: {
      DEWASA: 'KelasDewasa'
    },
    COL_DEWASA: {
      BIL: 0,
      TIMESTAMP: 1,
      EMAIL: 2,
      NAMA: 3,
      TELEFON: 4,
      NO_MYKAD: 5,
      PAKEJ: 6,
      KAEDAH: 7,
      ALAMAT: 8,
      TAHAP: 9,
      FAHAM: 10,
      STATUS: 18,
      STUDENT_UID: 19
    },

    LockService: {
      getScriptLock: () => lock
    },

    SpreadsheetApp: {
      openById: () => ({
        getSheetByName: () => dewasaSheet
      }),
      flush: () => {}
    },

    Utilities: {
      formatDate: () => '30/09/2026 08:00:00'
    },

    Logger: {
      log: () => {}
    },

    sanitizeInput: value => String(value),

    findExistingDewasaByMykad_: () => null,

    duplicateDewasaMessage_: () => ({
      success: false,
      message: 'duplicate'
    }),

    getStudentUidIdentityKey_: () => null,

    getStudentUidHmacSecret_: () => {
      throw new Error('HMAC should not be reached');
    },

    makeStudentUidFingerprint_: () => {
      throw new Error('fingerprint should not be reached');
    },

    readStudentUidRegistry_: () => {
      throw new Error('registry read should not be reached');
    },

    resolveStudentUidOwnership_: () => {
      throw new Error('resolver should not be reached');
    },

    generateStudentUid_: () => {
      throw new Error('UID generation should not be reached');
    },

    getEbayarMasterSpreadsheet_: () => ({
      getSheetByName: () => registrySheet
    }),

    STUDENT_UID_REGISTRY_TAB_: 'StudentUidRegistry',

    simpanNotifikasi: () => {}
  });

  vm.runInContext(extract('saveDewasaWithStudentUid_'), ctx);
  vm.runInContext(extract('registerDewasa'), ctx);

  return {
    ctx,
    getRosterWrites: () => rosterWrites,
    getRegistryWrites: () => registryWrites
  };
}

test('registerDewasa rejects invalid MYKAD without roster or registry write', () => {
  const env = createContext();

  const result = env.ctx.registerDewasa({
    nama: 'TEST UID GUARD DEWASA',
    telefon: '0123456789',
    email: 'test@example.com',
    alamat: 'TEST',
    tahap: 'TEST',
    mykad: '12345',
    pakej: 'TEST',
    kaedah: 'TEST'
  });

  assert.equal(result.success, false);
  assert.match(result.message, /MYKAD mesti nombor 12 digit/);

  assert.equal(env.getRosterWrites(), 0);
  assert.equal(env.getRegistryWrites(), 0);
});