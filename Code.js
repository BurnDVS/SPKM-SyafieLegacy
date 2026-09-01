// ============================================================
// Code.gs — Sistem Pengurusan Kelas Mengaji
// Spreadsheet ID: 1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU
// Fasa 1: Login, Pendaftaran Kanak-kanak & Dewasa, Kehadiran
// ============================================================

var SPREADSHEET_ID = '1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU';

// Nama tab dalam spreadsheet
var TAB = {
  GURU:             'Maklumat Guru',
  KANAK:            'PendaftaranBaru',
  DEWASA:           'KelasDewasa',
  KEHADIRAN:        'Kehadiran',
  BLAST_QUEUE:      'BlastQueue',
  DEVICE_TOKENS:    'DeviceTokens',
  NOTIFIKASI:       'Notifikasi',
  LOG_PERTUKARAN:   'LogPertukaranGuru'
};

// Kolum tab BlastQueue (0-indexed)
var COL_BLAST = {
  TIMESTAMP:  0,  // A — Masa queue dibuat
  NAMA:       1,  // B — Nama murid
  TELEFON:    2,  // C — Nombor telefon
  MESEJ:      3,  // D — Mesej penuh
  STATUS:     4,  // E — PENDING / SENT / FAILED
  BLASTED_AT: 5   // F — Masa mesej dihantar
};
function testKehadiranStats() {
  var r = getMuridByGuru({namaGuru: 'MUHAMMAD SHAFIE BIN BAHARI'});
  Logger.log('enrolment: ' + r.murid.length); // expect ~71
  Logger.log(JSON.stringify(r.murid)); // kini [{nama,peranan},...] — OK untuk debug

  var s = getKehadiranStats({bulan:'06', tahun:'2026', namaGuru:'MUHAMMAD SHAFIE BIN BAHARI'});
  Logger.log('totalMurid: ' + s.totalMurid + ' | totalSesi: ' + s.totalSesi);
  Logger.log('unmatched: ' + JSON.stringify(s.unmatched));
}

function testGuruBackup() {
  var namaBackup = 'ZARUL SUZAIMI BIN ZAILI';
  var r = getMuridByGuru({namaGuru: namaBackup});
  Logger.log('backup murid count: ' + r.murid.length + ' (expect > 0)');
  Logger.log(JSON.stringify(r.murid));
  var backupCount = r.murid.filter(function(m){ return m.peranan === 'BACKUP'; }).length;
  var tetapCount  = r.murid.filter(function(m){ return m.peranan === 'TETAP';  }).length;
  Logger.log('TETAP: ' + tetapCount + ', BACKUP: ' + backupCount + ' (expect BACKUP > 0)');
}

function testSyncNamaMuridManual() {
  var result = syncNamaMuridToAllForms();
  Logger.log(JSON.stringify(result));
}

function testSyncFormManual() {
  var result = syncFormMinusBayar({ bulan: 'JUN2026' });
  Logger.log(JSON.stringify(result));
}

function debugListAllTabs() {
  var yuranSS = SpreadsheetApp.openById('1AUH-ZwrbDjB5l2J5H8t2MBlbzkITMJp66J2VDLZF9CM');
  var sheets = yuranSS.getSheets();
  sheets.forEach(function(s) {
    Logger.log(s.getName());
  });
}

function debugCalculationJun() {
  var yuranSS = SpreadsheetApp.openById('1AUH-ZwrbDjB5l2J5H8t2MBlbzkITMJp66J2VDLZF9CM');
  var sheet = yuranSS.getSheetByName('CalculationJun2026');
  if (!sheet) { Logger.log('Tab tak jumpa!'); return; }
  
  // Tengok 5 baris pertama, 8 kolum
  var data = sheet.getRange(1, 1, 5, 8).getValues();
  for (var i = 0; i < data.length; i++) {
    Logger.log('Row ' + (i+1) + ': ' + JSON.stringify(data[i]));
  }
}

// Kolum tab PendaftaranBaru (0-indexed) — disahkan dari sheet sebenar
var COL_KANAK = {
  BIL:        0,
  TIMESTAMP:  1,
  NAMA_IBU:   2,
  TELEFON:    3,
  NAMA:       4,
  NO_MYKID:   5,
  EMAIL:      6,
  ALAMAT:     7,
  TAHAP:      8,
  FAHAM:      9,
  PAKEJ:     10,
  KAEDAH:    11,
  MERGED_ID:  12,
  MERGED_URL: 13,
  GURU:       16, // Q — Nama Guru        ← TAMBAH BARIS NI
  GURU_BACKUP:17, // R — Guru Backup
  STATUS:     18
};

// Kolum tab KelasDewasa (0-indexed) — disahkan dari sheet sebenar
var COL_DEWASA = {
  BIL:        0,  // A — Bil
  TIMESTAMP:  1,  // B — Timestamp
  EMAIL:      2,  // C — Email Address
  NAMA:       3,  // D — Nama
  TELEFON:    4,  // E — Nombor Telefon
  NO_MYKAD:   5,  // F — No. MYKAD
  PAKEJ:      6,  // G — Pilihan Pakej
  KAEDAH:     7,  // H — Kaedah Pengajian
  ALAMAT:     8,  // I — Alamat Penuh
  TAHAP:      9,  // J — Tahap Pengajian
  FAHAM:     10,  // K — Saya Faham
  MERGED_ID: 13,  // N — Merged Doc ID
  MERGED_URL:14,  // O — Merged Doc URL
  GURU:      17,  // R — Nama Guru
  STATUS:    18   // S — Status (AKTIF / TIDAK AKTIF)
};

// Kolum tab Maklumat Guru (0-indexed)
var COL_GURU = {
  TIMESTAMP:  0,
  EMAIL:      1,
  NAMA:       2,
  IC:         3,
  TELEFON:    4,
  ALAMAT:     5,
  SAYA_FAHAM: 6,  // G — Saya Faham
  ROLE:       7,  // H — ROLE (GURU / ADMIN)
  JAWATAN:    8,  // I — Pengasas / AJK / Guru
  GAMBAR:     9   // J — URL gambar passport dari Google Drive
};

// Kolum tab Kehadiran (0-indexed)
var COL_KEHADIRAN = {
  TARIKH:     0,
  NAMA_GURU:  1,
  NAMA_MURID: 2,
  STATUS:     3
};

// Kolum tab DeviceTokens (0-indexed)
var COL_TOKEN = {
  TIMESTAMP: 0,  // A
  EMAIL:     1,  // B
  TOKEN:     2,  // C
  DEVICE:    3   // D
};

// Kolum tab Notifikasi (0-indexed)
var COL_NOTIF = {
  ID:        0,  // A — UUID
  TIMESTAMP: 1,  // B
  TYPE:      2,  // C — kanak/dewasa/kehadiran/yuran
  TITLE:     3,  // D
  BODY:      4,  // E
  DATA:      5   // F — JSON string
};

// ============================================================
// AUTOCRAT CONFIG
// Gantikan nilai di bawah dengan Template ID & Output Folder ID
// ============================================================
var AUTOCRAT_CONFIG = {
  TEMPLATE_ID:    PropertiesService.getScriptProperties().getProperty('SLIP_TEMPLATE_ID') || 'GANTI_DENGAN_TEMPLATE_DOC_ID',
  OUTPUT_FOLDER:  PropertiesService.getScriptProperties().getProperty('SLIP_FOLDER_ID')   || 'GANTI_DENGAN_FOLDER_ID',
  SHARE_ANYONE:   true   // Buat dokumen boleh diakses sesiapa yang ada link
};

// ============================================================
// ENTRY POINT: doPost (dipanggil oleh portal.html via fetch)
// ============================================================
var ALLOWED_ACTIONS = [
  'login', 'registerKanak', 'registerDewasa',
  'sendOTPKanak', 'sendOTPDewasa', 'confirmRegisterKanak', 'confirmRegisterDewasa',
  'attendance', 'getDashboardStats', 'getKehadiranHariIni', 'getMuridList',
  'getGuru', 'getYuranStats', 'getEbayarStats', 'getYuranParent',
  'getNativeEbayarStudentLookup', 'preflightNativeEbayarSubmission', 'submitNativeEbayarPayment',
  'getEbayarPortalMode', 'setEbayarPortalMode',
  'recordCash', 'syncForms', 'syncFormBulanIni', 'updateStatusMurid', 'getMuridListAll',
  'getKehadiranStats', 'getKehadiranRekod', 'getMuridByGuru', 'simpanKehadiran',
  'uploadGuruGambar', 'updateGuru', 'getOrgChart', 'hantarWAYuran',
  'queueWABlast', 'getBlastStatus', 'logout',
  'simpanDeviceToken', 'getNotifikasi',
  'searchSijilKhatam',
  'renewSession',
  'ensureEbayarMasterSchemaV2', 'listEbayarYears', 'getMonthlyPaymentSummaryV2',
  'getYuranStatsV2', 'getYuranParentV2', 'compareYuranLegacyVsV2',
  'getEbayarV2MaintenanceStatus', 'previewCurrentMonthEbayarV2', 'verifyCurrentMonthLegacyVsV2',
  'syncCurrentMonthEbayarV2',
  'auditEbayarSourceTabsV2',
  'getMuridByGuruUntukTukar', 'tukarGuruMurid',
  'getMuridTanpaGuru', 'assignGuruMurid'
];

var AUTH_REQUIRED_ACTIONS = [
  'attendance', 'getDashboardStats', 'getKehadiranHariIni', 'getMuridList',
  'getGuru', 'getYuranStats', 'recordCash', 'syncForms', 'syncFormBulanIni', 'updateStatusMurid',
  'getMuridListAll', 'getKehadiranStats', 'getKehadiranRekod', 'getMuridByGuru', 'simpanKehadiran',
  'uploadGuruGambar', 'updateGuru', 'getOrgChart', 'hantarWAYuran',
  'queueWABlast', 'getBlastStatus',
  'simpanDeviceToken', 'getNotifikasi',
  'ensureEbayarMasterSchemaV2', 'listEbayarYears', 'getMonthlyPaymentSummaryV2',
  'getYuranStatsV2', 'getYuranParentV2', 'compareYuranLegacyVsV2',
  'getEbayarV2MaintenanceStatus', 'previewCurrentMonthEbayarV2', 'verifyCurrentMonthLegacyVsV2',
  'syncCurrentMonthEbayarV2', 'setEbayarPortalMode',
  'auditEbayarSourceTabsV2',
  'getMuridByGuruUntukTukar', 'tukarGuruMurid',
  'getMuridTanpaGuru', 'assignGuruMurid'
];

function doPost(e) {
  try {
    // Sokong dua format: URLSearchParams (application/x-www-form-urlencoded)
    // dan JSON text/plain — kedua-dua simple CORS request
    var body;
    if (e.parameter && e.parameter.data) {
      body = JSON.parse(e.parameter.data);
    } else if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, message: 'Permintaan tidak sah.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = (body.action || '').toString().trim();

    if (ALLOWED_ACTIONS.indexOf(action) === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, message: 'Tindakan tidak dibenarkan.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (AUTH_REQUIRED_ACTIONS.indexOf(action) !== -1) {
      var authCheck = validateToken(body.token);
      if (!authCheck.valid) {
        return ContentService
          .createTextOutput(JSON.stringify({ success: false, message: 'Token tidak sah atau tamat tempoh. Sila log masuk semula.' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Cleanup automatik ~10% request — elak Properties penuh
    if (Math.random() < 0.1) { try { cleanupExpiredProperties(); } catch(e) {} }

    var result;
    if      (action === 'login')                  result = loginGuru(body);
    else if (action === 'registerKanak')          result = registerKanak(body);
    else if (action === 'registerDewasa')         result = registerDewasa(body);
    else if (action === 'sendOTPKanak')           result = sendOTPKanak(body);
    else if (action === 'sendOTPDewasa')          result = sendOTPDewasa(body);
    else if (action === 'confirmRegisterKanak')   result = confirmRegisterKanak(body);
    else if (action === 'confirmRegisterDewasa')  result = confirmRegisterDewasa(body);
    else if (action === 'attendance')             result = attendance(body);
    else if (action === 'getDashboardStats')      result = getDashboardStats();
    else if (action === 'getKehadiranHariIni')    result = getKehadiranHariIni();
    else if (action === 'getMuridList')           result = getMuridList();
    else if (action === 'getGuru')                result = getGuru();
    else if (action === 'getYuranStats')          result = getYuranStats(body);
    else if (action === 'getEbayarStats')         result = getEbayarStats();
    else if (action === 'getYuranParent')         result = getYuranParent(body);
    else if (action === 'getNativeEbayarStudentLookup') result = getNativeEbayarStudentLookup(body);
    else if (action === 'preflightNativeEbayarSubmission') result = preflightNativeEbayarSubmission(body);
    else if (action === 'submitNativeEbayarPayment') result = submitNativeEbayarPayment(body);
    else if (action === 'getEbayarPortalMode')     result = getEbayarPortalMode(body);
    else if (action === 'setEbayarPortalMode')     result = setEbayarPortalMode(body);
    else if (action === 'recordCash')             result = recordCash(body);
    else if (action === 'syncForms')              result = syncNamaMuridToAllForms();
    else if (action === 'syncFormBulanIni')       result = syncFormMinusBayar(body);
    else if (action === 'updateStatusMurid')      result = updateStatusMurid(body);
    else if (action === 'getMuridListAll')        result = getMuridListAll();
    else if (action === 'getKehadiranStats')      result = getKehadiranStats(body);
    else if (action === 'getKehadiranRekod')      result = getKehadiranRekod(body);
    else if (action === 'getMuridByGuru')         result = getMuridByGuru(body);
    else if (action === 'simpanKehadiran')        result = simpanKehadiran(body);
    else if (action === 'uploadGuruGambar')       result = uploadGuruGambar(body);
    else if (action === 'updateGuru')             result = updateGuru(body);
    else if (action === 'getOrgChart')            result = getOrgChart();
    else if (action === 'hantarWAYuran')          result = hantarWAYuran(body);
    else if (action === 'queueWABlast')           result = queueWABlast(body);
    else if (action === 'getBlastStatus')         result = getBlastStatus(body);
    else if (action === 'logout')                 result = logout(body);
    else if (action === 'simpanDeviceToken')      result = simpanDeviceToken(body);
    else if (action === 'getNotifikasi')          result = getNotifikasi(body);
    else if (action === 'searchSijilKhatam')           result = searchSijilKhatam(body);
    else if (action === 'renewSession')                result = renewSession(body);
    else if (action === 'ensureEbayarMasterSchemaV2')  result = ensureEbayarMasterSchemaV2(body);
    else if (action === 'listEbayarYears')             result = listEbayarYears(body);
    else if (action === 'getMonthlyPaymentSummaryV2')  result = getMonthlyPaymentSummaryV2(body);
    else if (action === 'getYuranStatsV2')             result = getYuranStatsV2(body);
    else if (action === 'getYuranParentV2')            result = getYuranParentV2(body);
    else if (action === 'compareYuranLegacyVsV2')      result = compareYuranLegacyVsV2(body);
    else if (action === 'getEbayarV2MaintenanceStatus') result = getEbayarV2MaintenanceStatus(body);
    else if (action === 'previewCurrentMonthEbayarV2')  result = previewCurrentMonthEbayarV2(body);
    else if (action === 'verifyCurrentMonthLegacyVsV2') result = verifyCurrentMonthLegacyVsV2(body);
    else if (action === 'syncCurrentMonthEbayarV2')      result = syncCurrentMonthEbayarV2(body);
    else if (action === 'auditEbayarSourceTabsV2')     result = auditEbayarSourceTabsV2(body);
    else if (action === 'getMuridByGuruUntukTukar')    result = getMuridByGuruUntukTukar(body);
    else if (action === 'tukarGuruMurid')              result = tukarGuruMurid(body);
    else if (action === 'getMuridTanpaGuru')           result = getMuridTanpaGuru();
    else if (action === 'assignGuruMurid')             result = assignGuruMurid(body);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: 'Ralat pelayan: ' + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// doGet — serve portal HTML, atau JSONP API call via ?action=&payload=&callback=
function doGet(e) {
  try {
    // Parse params dari e.parameter ATAU e.queryString (fallback)
    var params = {};
    if (e && e.parameter) {
      Object.keys(e.parameter).forEach(function(k) { params[k] = e.parameter[k]; });
    }
    if (!params.action && e && e.queryString) {
      e.queryString.split('&').forEach(function(pair) {
        var idx = pair.indexOf('=');
        if (idx > 0) {
          var k = decodeURIComponent(pair.slice(0, idx));
          var v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
          params[k] = v;
        }
      });
    }

    if (params.action) {
      var action   = params.action.toString().trim();
      var callback = (params.callback || '').toString().trim();
      var payload  = params.payload ? JSON.parse(params.payload) : {};
      payload.action = action;

      if (ALLOWED_ACTIONS.indexOf(action) === -1) {
        var errJson = JSON.stringify({ success: false, message: 'Tindakan tidak dibenarkan.' });
        return ContentService
          .createTextOutput(callback ? callback + '(' + errJson + ')' : errJson)
          .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
      }
      if (AUTH_REQUIRED_ACTIONS.indexOf(action) !== -1) {
        var authCheck = validateToken(payload.token);
        if (!authCheck.valid) {
          var authErr = JSON.stringify({ success: false, message: 'Token tidak sah atau tamat tempoh. Sila log masuk semula.' });
          return ContentService
            .createTextOutput(callback ? callback + '(' + authErr + ')' : authErr)
            .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
        }
      }

      var result  = JSON.stringify(doAction(action, payload));
      return ContentService
        .createTextOutput(callback ? callback + '(' + result + ')' : result)
        .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
    }
  } catch (err) {
    Logger.log('doGet API error: ' + err.message);
    var srvErr = JSON.stringify({ success: false, message: 'Ralat pelayan: ' + err.message });
    var cb = params.callback || '';
    return ContentService
      .createTextOutput(cb ? cb + '(' + srvErr + ')' : srvErr)
      .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  }

  return HtmlService.createHtmlOutputFromFile('portal')
    .setTitle('Sistem Pengurusan Kelas Mengaji')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// doOptions — preflight CORS handler (GAS mungkin tak route OPTIONS ke sini,
// tapi ContentService pun tak support setHeader — CORS headers ditambah
// automatik oleh Google infrastructure bila deployment = "Anyone" access)
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// Dipanggil oleh google.script.run dari portal.html
function doAction(action, payload) {
  payload = payload || {};
  action  = (action || '').toString().trim();

  if (ALLOWED_ACTIONS.indexOf(action) === -1) {
    return { success: false, message: 'Tindakan tidak dibenarkan.' };
  }

  if (AUTH_REQUIRED_ACTIONS.indexOf(action) !== -1) {
    var authCheck = validateToken(payload.token);
    if (!authCheck.valid) {
      return { success: false, message: 'Token tidak sah atau tamat tempoh. Sila log masuk semula.' };
    }
  }

  if      (action === 'login')                 return loginGuru(payload);
  else if (action === 'registerKanak')         return registerKanak(payload);
  else if (action === 'registerDewasa')        return registerDewasa(payload);
  else if (action === 'sendOTPKanak')          return sendOTPKanak(payload);
  else if (action === 'sendOTPDewasa')         return sendOTPDewasa(payload);
  else if (action === 'confirmRegisterKanak')  return confirmRegisterKanak(payload);
  else if (action === 'confirmRegisterDewasa') return confirmRegisterDewasa(payload);
  else if (action === 'attendance')            return attendance(payload);
  else if (action === 'getDashboardStats')     return getDashboardStats();
  else if (action === 'getKehadiranHariIni')   return getKehadiranHariIni();
  else if (action === 'getMuridList')          return getMuridList();
  else if (action === 'getGuru')               return getGuru();
  else if (action === 'getYuranStats')         return getYuranStats(payload);
  else if (action === 'getEbayarStats')        return getEbayarStats();
  else if (action === 'getYuranParent')        return getYuranParent(payload);
  else if (action === 'getNativeEbayarStudentLookup') return getNativeEbayarStudentLookup(payload);
  else if (action === 'preflightNativeEbayarSubmission') return preflightNativeEbayarSubmission(payload);
  else if (action === 'submitNativeEbayarPayment') return submitNativeEbayarPayment(payload);
  else if (action === 'getEbayarPortalMode')     return getEbayarPortalMode(payload);
  else if (action === 'setEbayarPortalMode')     return setEbayarPortalMode(payload);
  else if (action === 'recordCash')            return recordCash(payload);
  else if (action === 'syncForms')             return syncNamaMuridToAllForms();
  else if (action === 'syncFormBulanIni')      return syncFormMinusBayar(payload);
  else if (action === 'updateStatusMurid')     return updateStatusMurid(payload);
  else if (action === 'getMuridListAll')       return getMuridListAll();
  else if (action === 'getKehadiranStats')     return getKehadiranStats(payload);
  else if (action === 'getKehadiranRekod')     return getKehadiranRekod(payload);
  else if (action === 'getMuridByGuru')        return getMuridByGuru(payload);
  else if (action === 'simpanKehadiran')       return simpanKehadiran(payload);
  else if (action === 'uploadGuruGambar')      return uploadGuruGambar(payload);
  else if (action === 'updateGuru')            return updateGuru(payload);
  else if (action === 'getOrgChart')           return getOrgChart();
  else if (action === 'hantarWAYuran')         return hantarWAYuran(payload);
  else if (action === 'queueWABlast')          return queueWABlast(payload);
  else if (action === 'getBlastStatus')        return getBlastStatus(payload);
  else if (action === 'simpanDeviceToken')     return simpanDeviceToken(payload);
  else if (action === 'getNotifikasi')         return getNotifikasi(payload);
  else if (action === 'searchSijilKhatam')            return searchSijilKhatam(payload);
  else if (action === 'renewSession')                 return renewSession(payload);
  else if (action === 'ensureEbayarMasterSchemaV2')   return ensureEbayarMasterSchemaV2(payload);
  else if (action === 'listEbayarYears')              return listEbayarYears(payload);
  else if (action === 'getMonthlyPaymentSummaryV2')   return getMonthlyPaymentSummaryV2(payload);
  else if (action === 'getYuranStatsV2')              return getYuranStatsV2(payload);
  else if (action === 'getYuranParentV2')             return getYuranParentV2(payload);
  else if (action === 'compareYuranLegacyVsV2')       return compareYuranLegacyVsV2(payload);
  else if (action === 'getEbayarV2MaintenanceStatus') return getEbayarV2MaintenanceStatus(payload);
  else if (action === 'previewCurrentMonthEbayarV2')  return previewCurrentMonthEbayarV2(payload);
  else if (action === 'verifyCurrentMonthLegacyVsV2') return verifyCurrentMonthLegacyVsV2(payload);
  else if (action === 'syncCurrentMonthEbayarV2')     return syncCurrentMonthEbayarV2(payload);
  else if (action === 'auditEbayarSourceTabsV2')      return auditEbayarSourceTabsV2(payload);
  else if (action === 'getMuridByGuruUntukTukar')     return getMuridByGuruUntukTukar(payload);
  else if (action === 'tukarGuruMurid')               return tukarGuruMurid(payload);
  else if (action === 'getMuridTanpaGuru')            return getMuridTanpaGuru();
  else if (action === 'assignGuruMurid')              return assignGuruMurid(payload);
}

// ============================================================
// 1. loginGuru
// Semak email + telefon dari tab Maklumat Guru
// Input:  { email, phone }
// Output: { success, user } atau { success: false, message }
// ============================================================
function loginGuru(params) {
  params = params || {};
  try {
    var email = sanitizeInput((params.email || '').trim().toLowerCase());
    var phone = normalizePhone(params.phone || '').slice(-6);

    if (!email || !phone) {
      return { success: false, message: 'E-mel dan nombor telefon diperlukan.' };
    }

    var props    = PropertiesService.getScriptProperties();
    var attKey   = 'login_attempts_' + email.replace(/[^a-z0-9]/g, '_');
    var tsKey    = 'login_ts_'       + email.replace(/[^a-z0-9]/g, '_');
    var now      = new Date().getTime();
    var attempts = parseInt(props.getProperty(attKey) || '0', 10);
    var firstTs  = parseInt(props.getProperty(tsKey)  || '0', 10);

    if (attempts >= 5) {
      if (now - firstTs < 15 * 60 * 1000) {
        return { success: false, message: 'Akaun disekat 15 minit. Sila cuba selepas 15 minit.' };
      }
      props.deleteProperty(attKey);
      props.deleteProperty(tsKey);
      attempts = 0;
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.GURU);
    if (!sheet) return { success: false, message: 'Tab Maklumat Guru tidak dijumpai.' };

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var rowEmail = (data[i][COL_GURU.EMAIL]   || '').toString().trim().toLowerCase();
      var rowPhone = normalizePhone((data[i][COL_GURU.TELEFON] || '').toString()).slice(-6);
      var rowNama  = (data[i][COL_GURU.NAMA]    || '').toString().trim();

      Logger.log('Baris ' + i + ': rowPhone="' + rowPhone + '" vs input phone="' + phone + '" | rowEmail="' + rowEmail + '" vs input email="' + email + '"');

      if (rowEmail === email && rowPhone === phone) {
        var rowRole = (data[i][COL_GURU.ROLE] || '').toString().trim().toUpperCase() || 'GURU';
        props.deleteProperty(attKey);
        props.deleteProperty(tsKey);

        var token  = Utilities.getUuid();
        var expiry = now + 30 * 60 * 1000;
        props.setProperty('session_' + token, JSON.stringify({ email: email, nama: rowNama, expiry: expiry }));

        var tabKehadiran = cariTabGuru(rowNama);
        Logger.log('Login berjaya: ' + rowNama + ' (' + rowRole + ') tabKehadiran=' + tabKehadiran);
        return { success: true, user: rowNama, role: rowRole, token: token, tabKehadiran: tabKehadiran };
      }
    }

    if (attempts === 0) props.setProperty(tsKey, now.toString());
    props.setProperty(attKey, String(attempts + 1));
    return { success: false, message: 'E-mel atau nombor WhatsApp tidak sepadan.' };

  } catch (err) {
    Logger.log('loginGuru error: ' + err.message);
    return { success: false, message: 'Ralat semasa log masuk.' };
  }
}

// ============================================================
// 2. registerKanak
// Simpan pendaftaran murid kanak-kanak ke tab PendaftaranBaru
// Input:  { namaIbu, telefon, namaAnak, mykid, email, alamat,
//           tahap, faham, pakej, kaedah }
// Output: { success, bil } atau { success: false, message }
// ============================================================
function registerKanak(params) {
  params = params || {};
  try {
    ['namaIbu','telefon','namaAnak','mykid','email','alamat','tahap','faham','pakej','kaedah'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });
    var required = ['telefon','namaAnak','mykid','email','alamat','tahap','pakej','kaedah'];
    for (var r = 0; r < required.length; r++) {
      if (!params[required[r]] || !params[required[r]].toString().trim()) {
        return { success: false, message: 'Medan "' + required[r] + '" diperlukan.' };
      }
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.KANAK);
    if (!sheet) return { success: false, message: 'Tab PendaftaranBaru tidak dijumpai.' };

    var existing = findExistingKanakByMykid_(sheet, params.mykid);
    if (existing) return duplicateKanakMessage_(params.mykid, existing);

    var lastRow   = sheet.getLastRow();
    var nextBil   = lastRow;
    var timestamp = new Date();

    // BIL kolum A dikira oleh formula SEQUENCE dalam sheet — jangan tulis ke kolum A
    var newRow = new Array(19).fill('');
    newRow[COL_KANAK.TIMESTAMP] = Utilities.formatDate(timestamp, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    newRow[COL_KANAK.NAMA_IBU]  = (params.namaIbu || '').trim().toUpperCase();
    newRow[COL_KANAK.TELEFON]   = params.telefon.trim();
    newRow[COL_KANAK.NAMA]      = params.namaAnak.trim().toUpperCase();
    newRow[COL_KANAK.NO_MYKID]  = params.mykid.trim();
    newRow[COL_KANAK.EMAIL]     = params.email.trim();
    newRow[COL_KANAK.ALAMAT]    = params.alamat.trim();
    newRow[COL_KANAK.TAHAP]     = params.tahap.trim();
    newRow[COL_KANAK.FAHAM]     = (params.faham || '').trim();
    newRow[COL_KANAK.PAKEJ]     = params.pakej.trim();
    newRow[COL_KANAK.KAEDAH]    = params.kaedah.trim();
    newRow[COL_KANAK.STATUS]    = 'AKTIF';

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    Logger.log('registerKanak berjaya: Bil ' + nextBil + ' — ' + params.namaAnak);

    // Cuba jana slip terus (jika tidak guna trigger)
    var slipRow = sheet.getLastRow();
    generateSlipKanak(slipRow);

    try { simpanNotifikasi('kanak', 'Murid Baru Didaftarkan', (params.namaAnak || '') + ' — ' + (params.tahap || ''), { bil: String(nextBil) }); } catch(e) {}

    return { success: true, bil: nextBil };

  } catch (err) {
    Logger.log('registerKanak error: ' + err.message);
    return { success: false, message: 'Ralat semasa mendaftar: ' + err.message };
  }
}

// ============================================================
// 3. registerDewasa
// Simpan pendaftaran murid dewasa ke tab KelasDewasa
// Input:  { nama, telefon, email, alamat, tahap, guru }
// Output: { success, id } atau { success: false, message }
// ============================================================
function registerDewasa(params) {
  params = params || {};
  try {
    ['nama','telefon','email','alamat','tahap','mykad','pakej','kaedah'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });
    var required = ['nama','telefon','email','alamat','tahap','mykad','pakej','kaedah'];
    for (var r = 0; r < required.length; r++) {
      if (!params[required[r]] || !params[required[r]].toString().trim()) {
        return { success: false, message: 'Medan "' + required[r] + '" diperlukan.' };
      }
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.DEWASA);
    if (!sheet) return { success: false, message: 'Tab KelasDewasa tidak dijumpai.' };

    var existing = findExistingDewasaByMykad_(sheet, params.mykad);
    if (existing) return duplicateDewasaMessage_(params.mykad, existing);

    var lastRow   = sheet.getLastRow();
    var nextBil   = lastRow;
    var timestamp = new Date();

    // BIL kolum A dikira oleh formula SEQUENCE dalam sheet — jangan tulis ke kolum A
    var newRow = new Array(19).fill('');
    newRow[COL_DEWASA.TIMESTAMP] = Utilities.formatDate(timestamp, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    newRow[COL_DEWASA.EMAIL]     = params.email.trim();
    newRow[COL_DEWASA.NAMA]      = params.nama.trim().toUpperCase();
    newRow[COL_DEWASA.TELEFON]   = params.telefon.trim();
    newRow[COL_DEWASA.NO_MYKAD]  = (params.mykad  || '').trim();
    newRow[COL_DEWASA.PAKEJ]     = (params.pakej   || '').trim();
    newRow[COL_DEWASA.KAEDAH]    = (params.kaedah  || '').trim();
    newRow[COL_DEWASA.ALAMAT]    = params.alamat.trim();
    newRow[COL_DEWASA.TAHAP]     = params.tahap.trim();
    newRow[COL_DEWASA.FAHAM]     = (params.faham   || '').trim();
    newRow[COL_DEWASA.STATUS]    = 'AKTIF';

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    // Jana ID selepas appendRow supaya nombor baris adalah tepat
    var actualRow = sheet.getLastRow();
    var muridId = 'D' + Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyyMMdd') + '-' + actualRow;

    Logger.log('registerDewasa berjaya: ' + params.nama + ' (' + muridId + ')');

    try { simpanNotifikasi('dewasa', 'Murid Dewasa Didaftarkan', (params.nama || '') + ' — ' + (params.tahap || ''), { id: muridId }); } catch(e) {}

    return { success: true, id: muridId };

  } catch (err) {
    Logger.log('registerDewasa error: ' + err.message);
    return { success: false, message: 'Ralat semasa mendaftar: ' + err.message };
  }
}

// ============================================================
// 4. attendance
// Rekod kehadiran murid ke tab Kehadiran
// Input:  { guru, murid, status, tarikh }
// Output: { success } atau { success: false, message }
// ============================================================
function attendance(params) {
  params = params || {};
  try {
    ['guru','murid','status','tarikh'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });
    var required = ['guru','murid','status','tarikh'];
    for (var r = 0; r < required.length; r++) {
      if (!params[required[r]] || !params[required[r]].toString().trim()) {
        return { success: false, message: 'Medan "' + required[r] + '" diperlukan.' };
      }
    }

    var validStatus = ['Hadir','Tidak Hadir','Cuti','Lambat'];
    if (validStatus.indexOf(params.status) === -1) {
      return { success: false, message: 'Status tidak sah. Gunakan: ' + validStatus.join(', ') };
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.KEHADIRAN);
    if (!sheet) return { success: false, message: 'Tab Kehadiran tidak dijumpai.' };

    var newRow = new Array(4).fill('');
    newRow[COL_KEHADIRAN.TARIKH]     = params.tarikh.trim();
    newRow[COL_KEHADIRAN.NAMA_GURU]  = params.guru.trim();
    newRow[COL_KEHADIRAN.NAMA_MURID] = params.murid.trim();
    newRow[COL_KEHADIRAN.STATUS]     = params.status.trim();

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    Logger.log('Kehadiran rekod: ' + params.murid + ' — ' + params.status + ' (' + params.tarikh + ')');
    try { simpanNotifikasi('kehadiran', '✅ Kehadiran Direkod', 'Kehadiran direkod oleh ' + params.guru.trim(), { murid: params.murid.trim(), tarikh: params.tarikh.trim() }); } catch(e) {}

    return { success: true };

  } catch (err) {
    Logger.log('attendance error: ' + err.message);
    return { success: false, message: 'Ralat merekod kehadiran: ' + err.message };
  }
}

// ============================================================
// 5. generateSlipKanak
// Jana slip pendaftaran menggunakan template Google Docs
// Dipanggil terus dari registerKanak() ATAU oleh onFormSubmit()
// Parameter: rowNum = nombor baris dalam tab PendaftaranBaru
// ============================================================
function generateSlipKanak(rowNum) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.KANAK);
    if (!sheet) { Logger.log('generateSlipKanak: Tab tidak dijumpai'); return; }

    var rowData = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];

    var templateId   = AUTOCRAT_CONFIG.TEMPLATE_ID;
    var outputFolder = AUTOCRAT_CONFIG.OUTPUT_FOLDER;

    // Validate template & folder ID bukan placeholder
    if (templateId.indexOf('GANTI') !== -1 || outputFolder.indexOf('GANTI') !== -1) {
      Logger.log('generateSlipKanak: Template atau folder ID belum dikonfigurasi. Set dalam Script Properties.');
      return;
    }

    // Salin template
    var template = DriveApp.getFileById(templateId);
    var namaAnak = rowData[COL_KANAK.NAMA] || 'Murid';
    var bil      = rowData[COL_KANAK.BIL]       || rowNum;
    var newName  = 'Slip_Pendaftaran_' + namaAnak + '_Bil' + bil;
    var newFile  = template.makeCopy(newName, DriveApp.getFolderById(outputFolder));

    // Gantikan placeholder dalam dokumen
    var doc  = DocumentApp.openById(newFile.getId());
    var body = doc.getBody();

    var replacements = {
      '{{BIL}}':          bil.toString(),
      '{{TIMESTAMP}}':    rowData[COL_KANAK.TIMESTAMP]  || '',
      '{{NAMA_IBU}}':     rowData[COL_KANAK.NAMA_IBU]   || '',
      '{{TELEFON}}':      rowData[COL_KANAK.TELEFON]    || '',
      '{{EMAIL}}':        rowData[COL_KANAK.EMAIL]      || '',
      '{{ALAMAT}}':       rowData[COL_KANAK.ALAMAT]     || '',
      '{{NAMA_ANAK}}':    rowData[COL_KANAK.NAMA]       || '',
      '{{NO_MYKID}}':     rowData[COL_KANAK.NO_MYKID]   || '',
      '{{TAHAP}}':        rowData[COL_KANAK.TAHAP]      || '',
      '{{PAKEJ}}':        rowData[COL_KANAK.PAKEJ]      || '',
      '{{KAEDAH}}':       rowData[COL_KANAK.KAEDAH]     || '',
      '{{TARIKH_DAFTAR}}':Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd MMMM yyyy')
    };

    for (var key in replacements) {
      body.replaceText(key, replacements[key]);
    }
    doc.saveAndClose();

    // Set sharing supaya link boleh dibuka
    if (AUTOCRAT_CONFIG.SHARE_ANYONE) {
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    var fileId  = newFile.getId();
    var fileUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

    // Tulis ID & URL balik ke spreadsheet
    sheet.getRange(rowNum, COL_KANAK.MERGED_ID  + 1).setValue(fileId);
    sheet.getRange(rowNum, COL_KANAK.MERGED_URL + 1).setValue(fileUrl);
    SpreadsheetApp.flush();

    // Hantar e-mel ke parent dengan slip
    var emailParent = rowData[COL_KANAK.EMAIL];
    if (emailParent) {
      hantarEmailSlip(emailParent, namaAnak, bil, fileUrl, newFile.getId());
    }

    Logger.log('Slip dijana: ' + newName + ' → ' + fileUrl);
    return { docId: fileId, docUrl: fileUrl };

  } catch (err) {
    Logger.log('generateSlipKanak error (baris ' + rowNum + '): ' + err.message);
  }
}

// ============================================================
// 6. hantarEmailSlip
// Hantar e-mel kepada ibu bapa dengan slip pendaftaran
// ============================================================
function hantarEmailSlip(emailTo, namaAnak, bil, slipUrl, fileId) {
  try {
    var attachment = DriveApp.getFileById(fileId).getAs(MimeType.PDF);
    var subject    = '[Kelas Mengaji] Slip Pendaftaran — ' + namaAnak;
    var htmlBody   =
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
      '<div style="background:#1A5C3A;padding:24px;text-align:center;">' +
      '<h2 style="color:#FFFFFF;margin:0;font-size:20px;">Sistem Pengurusan Kelas Mengaji</h2>' +
      '</div>' +
      '<div style="padding:24px;background:#FAF7F0;">' +
      '<p>Assalamualaikum,</p>' +
      '<p>Alhamdulillah, pendaftaran murid <strong>' + namaAnak + '</strong> (Bil: ' + bil + ') telah berjaya didaftarkan.</p>' +
      '<p>Sila klik pautan di bawah untuk memuat turun slip pendaftaran:</p>' +
      '<p style="text-align:center;margin:24px 0;">' +
      '<a href="' + slipUrl + '" style="background:#1A5C3A;color:#FFFFFF;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">📄 Lihat / Muat Turun Slip</a>' +
      '</p>' +
      '<p style="color:#888;font-size:13px;">Slip pendaftaran juga disertakan sebagai lampiran e-mel ini dalam format PDF.</p>' +
      '<p>Sebarang pertanyaan, sila hubungi pihak kami. Terima kasih.</p>' +
      '</div>' +
      '<div style="background:#2D7A52;padding:12px;text-align:center;">' +
      '<p style="color:rgba(255,255,255,0.8);font-size:12px;margin:0;">Sistem Pengurusan Kelas Mengaji · Dikuasakan oleh Google Apps Script</p>' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({
      to:          emailTo,
      subject:     subject,
      htmlBody:    htmlBody,
      attachments: [attachment]
    });

    Logger.log('E-mel slip dihantar ke: ' + emailTo);

  } catch (err) {
    Logger.log('hantarEmailSlip error: ' + err.message);
  }
}

// ============================================================
// 7. onFormSubmit (TRIGGER)
// Dipanggil secara automatik bila ada row baru dalam
// tab PendaftaranBaru (melalui Google Form atau appendRow)
//
// CARA PASANG TRIGGER:
//   Jalankan fungsi createTriggers() sekali dari editor GAS
//   ATAU: Extensions > Apps Script > Triggers > + Add Trigger
//         Function: onNewRowKanak | Event: On form submit
// ============================================================
function onNewRowKanak(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Trigger dari Google Form: e.range ada
    if (e && e.range) {
      var rowNum = e.range.getRow();
      var sheet  = e.range.getSheet();

      // Pastikan trigger dari tab yang betul
      if (sheet.getName() !== TAB.KANAK) {
        Logger.log('onNewRowKanak: Trigger dari tab lain (' + sheet.getName() + '), skip.');
        return;
      }

      Logger.log('onNewRowKanak: Baris baru ' + rowNum + ' dalam ' + TAB.KANAK);
      generateSlipKanak(rowNum);

    } else {
      // Dipanggil manual — jana slip untuk baris terakhir
      var kanakSheet = ss.getSheetByName(TAB.KANAK);
      if (!kanakSheet) return;
      var lastRow = kanakSheet.getLastRow();
      Logger.log('onNewRowKanak (manual): Jana slip untuk baris ' + lastRow);
      generateSlipKanak(lastRow);
    }

  } catch (err) {
    Logger.log('onNewRowKanak error: ' + err.message);
  }
}

// ============================================================
// 8. createTriggers
// Jalankan fungsi ini SEKALI dari editor untuk pasang trigger
// ============================================================
function createTriggers() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Semak trigger sedia ada (elak duplikasi)
  var existing = ScriptApp.getProjectTriggers();
  var hasFormTrigger = existing.some(function(t) {
    return t.getHandlerFunction() === 'onNewRowKanak';
  });

  if (hasFormTrigger) {
    Logger.log('Trigger onNewRowKanak sudah wujud. Tiada perubahan.');
    return;
  }

  // Pasang trigger onFormSubmit untuk spreadsheet
  ScriptApp.newTrigger('onNewRowKanak')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  Logger.log('Trigger onNewRowKanak berjaya dipasang.');
}

// ============================================================
// 9. removeTriggers (utiliti — jalankan jika perlu buang trigger)
// ============================================================
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'onNewRowKanak') {
      ScriptApp.deleteTrigger(t);
      Logger.log('Trigger dibuang: ' + t.getHandlerFunction());
    }
  });
}

// ============================================================
// 10. setScriptProperties
// Jalankan SEKALI untuk simpan ID template & folder dalam
// Script Properties (lebih selamat dari hardcode)
// Gantikan nilai di bawah sebelum jalankan.
// ============================================================
function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    'SLIP_TEMPLATE_ID': 'GANTI_DENGAN_TEMPLATE_DOC_ID',
    'SLIP_FOLDER_ID':   'GANTI_DENGAN_OUTPUT_FOLDER_ID',
    // Form IDs untuk eBayar (12 bulan 2026)
    'FORM_JAN2026':   '1v0OkAu1LU7SCxI5CCYO9Fjwskd4Oz0A3PoQIyeNQBwA',
    'FORM_FEB2026':   '1gmlORBMHc-eGAXFtVV_tDHnMrZouUMMWYCsTi6Xepqw',
    'FORM_MAC2026':   '1Z6oGu7sPhkYmLKLFxHTi-1392hOIkE106xTBHisqBEs',
    'FORM_APRIL2026': '1d60MHkiapXdMxNJtCSZtTc1-ybFm2JDSGwDDvtLjMIQ',
    'FORM_MEI2026':   '1rapRxUcIXX6X4b2eCmQ2Ky8PzsH_fzOlOFGyuVhmnYE',
    'FORM_JUN2026':   '1bEbRSaDbZbcpmGoFOeABoLElOX1lhYkQSB7Cuj0GIYM',
    'FORM_JULAI2026': '1U4Ecr40vB7_HssJxVPwCzq6lElCxjEGWDJGZqXOMKXw',
    'FORM_OGOS2026':  '1wT-UU2ZxOn_tTnDFo-8B5rHI5u07R_sObUaXXdwINMw',
    'FORM_SEPT2026':  '15xIeRZ4uNzvrjTCQRZHZclgzy8gORtB9A_bPvxZl-Tw',
    'FORM_OKT2026':   '1goZKtfWL2GpaZFb42TMEdolA8K3_3B0Siyqnn3jCBr0',
    'FORM_NOV2026':   '1QoV63w2Ecl2lipapwrsvMYXKMtD9M1HeLfJsRN27zFY',
    'FORM_DIS2026':   '1gvcn6djuF9Xlatoe6b78RrGU0TVFFXpGIhiA1ML5O24'
  });
  Logger.log('Script properties dikemaskini.');
}

// ============================================================
// HELPER: Normalize nombor telefon — format portal (0xx...)
// ============================================================
function normalizePhone(phone) {
  var cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+60')) cleaned = '0' + cleaned.substring(3);
  if (cleaned.startsWith('60') && cleaned.length > 10) cleaned = '0' + cleaned.substring(2);
  return cleaned;
}

// ============================================================
// HELPER: Sanitasi input — buang tag HTML, karakter khas & trim
// ============================================================
function sanitizeInput(str) {
  var s = (str || '').toString().substring(0, 500);
  s = s.replace(/<[^>]*>/g, '');
  s = s.replace(/[<>"'&;(){}]/g, '');
  return s.trim();
}

function normalizeMykid_(mykid) {
  return (mykid || '').toString().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function findExistingKanakByMykid_(sheet, mykid) {
  var needle = normalizeMykid_(mykid);
  if (!needle || !sheet || sheet.getLastRow() <= 1) return null;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 19).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizeMykid_(data[i][COL_KANAK.NO_MYKID]) === needle) {
      return {
        row: i + 2,
        nama: (data[i][COL_KANAK.NAMA] || '').toString().trim(),
        status: (data[i][COL_KANAK.STATUS] || '').toString().trim().toUpperCase()
      };
    }
  }
  return null;
}

function duplicateKanakMessage_(mykid, existing) {
  var nama = existing && existing.nama ? ' untuk ' + existing.nama : '';
  if (existing && existing.status === 'TIDAK AKTIF') {
    return {
      success: false,
      duplicate: true,
      inactive: true,
      message: 'Murid ini pernah berdaftar' + nama + ' tetapi status tidak aktif. Sila hubungi admin untuk aktifkan semula. No. MYKID ' + mykid + ' telah wujud dalam sistem.'
    };
  }
  return {
    success: false,
    duplicate: true,
    message: 'Murid ini sudah berdaftar' + nama + '. No. MYKID ' + mykid + ' telah wujud dalam sistem.'
  };
}

function normalizeMykad_(mykad) {
  return (mykad || '').toString().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function findExistingDewasaByMykad_(sheet, mykad) {
  var needle = normalizeMykad_(mykad);
  if (!needle || !sheet || sheet.getLastRow() <= 1) return null;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 19).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizeMykad_(data[i][COL_DEWASA.NO_MYKAD]) === needle) {
      return {
        row: i + 2,
        nama: (data[i][COL_DEWASA.NAMA] || '').toString().trim(),
        status: (data[i][COL_DEWASA.STATUS] || '').toString().trim().toUpperCase()
      };
    }
  }
  return null;
}

function duplicateDewasaMessage_(mykad, existing) {
  var nama = existing && existing.nama ? ' untuk ' + existing.nama : '';
  if (existing && existing.status === 'TIDAK AKTIF') {
    return {
      success: false,
      duplicate: true,
      inactive: true,
      message: 'Murid dewasa ini pernah berdaftar' + nama + ' tetapi status tidak aktif. Sila hubungi admin untuk aktifkan semula. No. MYKAD ' + mykad + ' telah wujud dalam sistem.'
    };
  }
  return {
    success: false,
    duplicate: true,
    message: 'Murid dewasa ini sudah berdaftar' + nama + '. No. MYKAD ' + mykad + ' telah wujud dalam sistem.'
  };
}

// ============================================================
// HELPER: Validate session token
// ============================================================
function validateToken(token) {
  if (!token) return { valid: false };
  var props = PropertiesService.getScriptProperties();
  var key   = 'session_' + token;
  var raw   = props.getProperty(key);
  if (!raw) return { valid: false };
  try {
    var data = JSON.parse(raw);
    if (new Date().getTime() > data.expiry) {
      props.deleteProperty(key);
      return { valid: false };
    }
    return { valid: true, user: data };
  } catch (e) {
    props.deleteProperty(key);
    return { valid: false };
  }
}

// ============================================================
// HELPER: renewSession — lanjut expiry 30 minit
// ============================================================
function renewSession(params) {
  params = params || {};
  var token = (params.token || '').toString().trim();
  if (!token) return { success: false };
  var props = PropertiesService.getScriptProperties();
  var key = 'session_' + token;
  var raw = props.getProperty(key);
  if (!raw) return { success: false, message: 'Session tidak dijumpai atau dah expire.' };
  try {
    var data = JSON.parse(raw);
    var now = new Date().getTime();
    if (now > data.expiry) {
      props.deleteProperty(key);
      return { success: false, message: 'Session dah expire.' };
    }
    data.expiry = now + 30 * 60 * 1000;
    props.setProperty(key, JSON.stringify(data));
    Logger.log('renewSession: token ' + token.substring(0,8) + '... diperbaharui');
    return { success: true, user: data.nama, email: data.email };
  } catch(e) {
    props.deleteProperty(key);
    return { success: false, message: 'Data session rosak.' };
  }
}

// ============================================================
// HELPER: Logout — buang session token semasa
// ============================================================
function logout(params) {
  var token = (params && params.token) ? params.token.toString().trim() : '';
  if (!token) return { success: false, message: 'Token diperlukan.' };
  var props = PropertiesService.getScriptProperties();
  var key   = 'session_' + token;
  if (props.getProperty(key)) {
    props.deleteProperty(key);
    Logger.log('Logout: session ' + token.substring(0, 8) + '... dibuang.');
  }
  return { success: true };
}

// ============================================================
// 11. getDashboardStats
// Returns { totalKanak, totalDewasa, hadirHariIni }
// ============================================================
function getDashboardStats() {
  try {
    var ss           = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet   = ss.getSheetByName(TAB.KANAK);
    var dewasaSheet  = ss.getSheetByName(TAB.DEWASA);
    var hadirSheet   = ss.getSheetByName(TAB.KEHADIRAN);

    var totalKanak  = kanakSheet  ? Math.max(0, kanakSheet.getLastRow()  - 1) : 0;
    var totalDewasa = dewasaSheet ? Math.max(0, dewasaSheet.getLastRow() - 1) : 0;
    var hadirHariIni = 0;

    if (hadirSheet && hadirSheet.getLastRow() > 1) {
      var tarikhHari = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy');
      var data = hadirSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][COL_KEHADIRAN.TARIKH] === tarikhHari) hadirHariIni++;
      }
    }

    return { success: true, totalKanak: totalKanak, totalDewasa: totalDewasa, hadirHariIni: hadirHariIni };
  } catch (err) {
    Logger.log('getDashboardStats error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 12. getKehadiranHariIni
// Returns { rows: [{tarikh, guru, murid, status}] }
// ============================================================
function getKehadiranHariIni() {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.KEHADIRAN);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

    var tarikhHari = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy');
    var data = sheet.getDataRange().getValues();
    var rows = [];

    for (var i = 1; i < data.length; i++) {
      if (data[i][COL_KEHADIRAN.TARIKH] === tarikhHari) {
        rows.push({
          tarikh: data[i][COL_KEHADIRAN.TARIKH],
          guru:   data[i][COL_KEHADIRAN.NAMA_GURU],
          murid:  data[i][COL_KEHADIRAN.NAMA_MURID],
          status: data[i][COL_KEHADIRAN.STATUS]
        });
      }
    }

    return { success: true, rows: rows };
  } catch (err) {
    Logger.log('getKehadiranHariIni error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 13. getMuridList
// Returns { kanak: [...], dewasa: [...] }
// ============================================================
function getMuridList() {
  try {
    var ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet  = ss.getSheetByName(TAB.KANAK);
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);

    var kanak = [];
    if (kanakSheet && kanakSheet.getLastRow() > 1) {
      var kData = kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, kanakSheet.getLastColumn()).getValues();
      kanak = kData
        .filter(function(r) {
          var s = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
          return !s || s === 'AKTIF';
        })
        .map(function(r) {
          return {
            bil:      r[COL_KANAK.BIL],
            namaAnak: r[COL_KANAK.NAMA],
            namaIbu:  r[COL_KANAK.NAMA_IBU] || '',
            telefon:  r[COL_KANAK.TELEFON],
            tahap:    r[COL_KANAK.TAHAP],
            pakej:    r[COL_KANAK.PAKEJ]
          };
        });
    }

    var dewasa = [];
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues();
      dewasa = dData
        .filter(function(r) {
          var s = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
          return !s || s === 'AKTIF';
        })
        .map(function(r) {
          return {
            nama:    r[COL_DEWASA.NAMA],
            telefon: r[COL_DEWASA.TELEFON],
            email:   r[COL_DEWASA.EMAIL],
            tahap:   r[COL_DEWASA.TAHAP],
            guru:    r[COL_DEWASA.GURU] || ''
          };
        });
    }

    // Flat combined list {nama, telefon} — deduplicated by name, sorted A-Z
    var muridMap = {};
    kanak.forEach(function(r) {
      var n = (r.namaAnak || '').toString().trim().toUpperCase();
      if (n && !muridMap[n]) muridMap[n] = { nama: n, telefon: (r.telefon || '').toString().trim() };
    });
    dewasa.forEach(function(r) {
      var n = (r.nama || '').toString().trim().toUpperCase();
      if (n && !muridMap[n]) muridMap[n] = { nama: n, telefon: (r.telefon || '').toString().trim() };
    });
    var murid = Object.keys(muridMap).sort().map(function(k) { return muridMap[k]; });

    return { success: true, kanak: kanak, dewasa: dewasa, murid: murid };
  } catch (err) {
    Logger.log('getMuridList error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 14. normalizePhoneForWA
// Tukar sebarang format → 60xxxxxxxxx (untuk Fonnte)
// ============================================================
function normalizePhoneForWA(phone) {
  var c = (phone || '').toString().replace(/[\s\-\(\)]/g, '');
  if (c.startsWith('+60')) return c.substring(3);
  if (c.startsWith('60'))  return c.substring(2);
  if (c.startsWith('0'))   return c.substring(1);
  return c;
}

// ============================================================
// 15. hantarWhatsApp
// Hantar mesej WA via Fonnte API
// Token disimpan dalam Script Properties: FONNTE_TOKEN
// ============================================================
function hantarWhatsApp(noTelefon, mesej) {
  try {
    var token = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
    if (!token) {
      Logger.log('hantarWhatsApp: FONNTE_TOKEN tidak dijumpai dalam Script Properties.');
      return false;
    }
    var options = {
      method:      'post',
      headers:     { 'Authorization': token },
      payload:     JSON.stringify({ target: normalizePhoneForWA(noTelefon), message: mesej, countryCode: '60' }),
      contentType: 'application/json',
      muteHttpExceptions: true
    };
    var resp   = UrlFetchApp.fetch('https://api.fonnte.com/send', options);
    var result = JSON.parse(resp.getContentText());
    Logger.log('WA → ' + noTelefon + ': ' + JSON.stringify(result));
    return result.status === true;
  } catch (err) {
    Logger.log('hantarWhatsApp error: ' + err.message);
    return false;
  }
}

// ============================================================
// 15b. hantarWAYuran
// Hantar WA peringatan yuran belum bayar via Fonnte
// Nombor telefon diambil dari tab WARemind (B3:B=nama, D3:D=telefon)
// Input:  { token, bulan, namaBelumBayar: ['NAMA1','NAMA2',...] }
// Output: { success, berjaya, gagal, tidakJumpa }
// ============================================================
function hantarWAYuran(params) {
  params = params || {};
  try {
    var bulan          = (params.bulan || '').toString().trim();
    var namaBelumBayar = params.namaBelumBayar || [];

    if (!bulan || !namaBelumBayar.length) {
      return { success: false, message: 'bulan dan namaBelumBayar diperlukan.' };
    }

    // Baca tab WARemind — B3:D (nama=col B, telefon=col D)
    var ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
    var waSheet = ss.getSheetByName('WARemind');
    if (!waSheet) return { success: false, message: 'Tab WARemind tidak dijumpai.' };

    var lastRow = waSheet.getLastRow();
    if (lastRow < 3) return { success: false, message: 'Tiada data dalam tab WARemind.' };

    var waData = waSheet.getRange(3, 2, lastRow - 2, 3).getValues(); // B3:D
    var telefonMap = {};
    waData.forEach(function(r) {
      var nama = (r[0] || '').toString().trim().toUpperCase(); // col B
      var tel  = (r[2] || '').toString().trim();               // col D
      if (nama && tel) telefonMap[nama] = tel;
    });

    var portalUrl = ScriptApp.getService().getUrl();
    var berjaya = 0, gagal = 0, tidakJumpa = 0;

    namaBelumBayar.forEach(function(nama) {
      var namaUpper = (nama || '').toString().trim().toUpperCase();
      var telefon   = telefonMap[namaUpper];
      if (!telefon) { tidakJumpa++; return; }

      var mesej = 'Assalamualaikum, yuran ' + bulan + ' belum dikemaskini.\n' +
                  'Sila kemaskini bayaran di: ' + portalUrl;
      var ok = hantarWhatsApp(telefon, mesej);
      if (ok) berjaya++; else gagal++;
    });

    Logger.log('hantarWAYuran ' + bulan + ': ' + berjaya + ' berjaya, ' + gagal + ' gagal, ' + tidakJumpa + ' tidak jumpa');
    return { success: true, berjaya: berjaya, gagal: gagal, tidakJumpa: tidakJumpa };

  } catch (err) {
    Logger.log('hantarWAYuran error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 16. notifikasiKetidakhadiran
// Semak Kehadiran hari ini, hantar WA ke ibu bapa yang anaknya
// "Tidak Hadir". Dipanggil oleh trigger harian jam 9pm.
// ============================================================
function notifikasiKetidakhadiran() {
  try {
    var ss           = SpreadsheetApp.openById(SPREADSHEET_ID);
    var hadirSheet   = ss.getSheetByName(TAB.KEHADIRAN);
    var kanakSheet   = ss.getSheetByName(TAB.KANAK);
    if (!hadirSheet || !kanakSheet) return;

    var tarikhHari = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy');
    var hadirData  = hadirSheet.getDataRange().getValues();
    var kanakData  = kanakSheet.getDataRange().getValues();

    // Bina peta nama murid → telefon ibu bapa
    var telefonMap = {};
    for (var k = 1; k < kanakData.length; k++) {
      var nama = (kanakData[k][COL_KANAK.NAMA] || '').toString().trim().toLowerCase();
      if (nama) telefonMap[nama] = (kanakData[k][COL_KANAK.TELEFON] || '').toString().trim();
    }

    var hantar = 0;
    for (var i = 1; i < hadirData.length; i++) {
      if (hadirData[i][COL_KEHADIRAN.TARIKH]  !== tarikhHari)  continue;
      if (hadirData[i][COL_KEHADIRAN.STATUS]  !== 'Tidak Hadir') continue;
      var namaMurid = (hadirData[i][COL_KEHADIRAN.NAMA_MURID] || '').toString().trim();
      var telefon   = telefonMap[namaMurid.toLowerCase()];
      if (!telefon) continue;
      var mesej = 'Assalamualaikum. Makluman: ' + namaMurid +
                  ' tidak hadir ke kelas mengaji hari ini (' + tarikhHari + '). ' +
                  'Sila hubungi guru untuk maklumat lanjut.';
      hantarWhatsApp(telefon, mesej);
      hantar++;
    }
    Logger.log('notifikasiKetidakhadiran: ' + hantar + ' notifikasi dihantar (' + tarikhHari + ')');
  } catch (err) {
    Logger.log('notifikasiKetidakhadiran error: ' + err.message);
  }
}

// ============================================================
// 17. setFonnteToken
// Jalankan SEKALI dari editor untuk simpan token Fonnte.
// Gantikan nilai sebelum menjalankan.
// ============================================================
function setFonnteToken() {
  PropertiesService.getScriptProperties().setProperty('FONNTE_TOKEN', 'GANTI_DENGAN_TOKEN_FONNTE');
  Logger.log('FONNTE_TOKEN telah disimpan dalam Script Properties.');
}

// ============================================================
// 17b. testFonnteToken
// Jalankan dari editor untuk test token — hantar pada nombor anda sahaja.
// ============================================================
function testFonnteToken() {
  var token = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN');
  Logger.log('Token dalam Properties: [' + token + '] (panjang: ' + (token ? token.length : 0) + ')');
  var result = hantarWhatsApp('60172875136', '[TEST] Token Fonnte berjaya. Boleh abaikan mesej ini.');
  Logger.log('Test result: ' + result);
}

// ============================================================
// 18. createWhatsAppTriggers
// Pasang trigger harian untuk notifikasiKetidakhadiran jam 9pm.
// Jalankan SEKALI dari editor.
// ============================================================
function createWhatsAppTriggers() {
  var existing = ScriptApp.getProjectTriggers();
  var sudahAda = existing.some(function(t) {
    return t.getHandlerFunction() === 'notifikasiKetidakhadiran';
  });
  if (sudahAda) {
    Logger.log('Trigger notifikasiKetidakhadiran sudah wujud.');
    return;
  }
  ScriptApp.newTrigger('notifikasiKetidakhadiran')
    .timeBased()
    .atHour(21)
    .everyDays(1)
    .create();
  Logger.log('Trigger WA dipasang: notifikasiKetidakhadiran setiap hari jam 9pm.');
}

// ============================================================
// 18b. cleanupExpiredProperties
// Buang session, OTP & login tracker yang dah tamat tempoh
// dari Script Properties secara automatik.
// Dipanggil oleh trigger harian DAN secara rawak dalam doPost.
// ============================================================
function cleanupExpiredProperties() {
  var props  = PropertiesService.getScriptProperties();
  var all    = props.getProperties();
  var now    = new Date().getTime();
  var deleted = 0;

  for (var key in all) {
    // Session token — expired jika now > expiry
    if (key.startsWith('session_')) {
      try {
        var data = JSON.parse(all[key]);
        if (now > data.expiry) { props.deleteProperty(key); deleted++; }
      } catch(e) { props.deleteProperty(key); deleted++; }

    // OTP base key — expired jika >10 minit dari _TIME
    } else if (key.startsWith('OTP_') && !key.endsWith('_TIME') && !key.endsWith('_ATTEMPTS')) {
      var timeKey = key + '_TIME';
      var storedTime = parseInt(all[timeKey] || '0', 10);
      if (!storedTime || (now - storedTime) > 600000) {
        props.deleteProperty(key);
        props.deleteProperty(key + '_TIME');
        props.deleteProperty(key + '_ATTEMPTS');
        deleted += 3;
      }

    // Login attempt tracker — buang jika >15 minit dari first attempt
    } else if (key.startsWith('login_ts_')) {
      var firstTs = parseInt(all[key] || '0', 10);
      if (!firstTs || (now - firstTs) > 900000) {
        var attKey = 'login_attempts_' + key.substring('login_ts_'.length);
        props.deleteProperty(key);
        props.deleteProperty(attKey);
        deleted += 2;
      }
    }
  }

  Logger.log('cleanupExpiredProperties: ' + deleted + ' entries dibuang.');
  return deleted;
}

// ============================================================
// 18c. cleanOldSessions
// Buang semua session_ yang lebih dari 24 jam (atau expired).
// Boleh run manual dari editor atau dipanggil oleh trigger.
// ============================================================
function cleanOldSessions() {
  var props   = PropertiesService.getScriptProperties();
  var all     = props.getProperties();
  var now     = new Date().getTime();
  var deleted = 0;

  for (var key in all) {
    if (!key.startsWith('session_')) continue;
    try {
      var data = JSON.parse(all[key]);
      if (now > data.expiry) { props.deleteProperty(key); deleted++; }
    } catch(e) { props.deleteProperty(key); deleted++; }
  }

  Logger.log('cleanOldSessions: ' + deleted + ' session lama dibuang.');
  return { deleted: deleted };
}

// ============================================================
// 18d. createCleanupTrigger
// Pasang trigger harian untuk cleanupExpiredProperties (3am)
// dan trigger setiap 24 jam untuk cleanOldSessions.
// Jalankan SEKALI dari editor.
// ============================================================
function createCleanupTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  var handlers = existing.map(function(t) { return t.getHandlerFunction(); });

  if (handlers.indexOf('cleanupExpiredProperties') === -1) {
    ScriptApp.newTrigger('cleanupExpiredProperties')
      .timeBased().atHour(3).everyDays(1).create();
    Logger.log('Trigger cleanupExpiredProperties dipasang: setiap hari jam 3am.');
  } else {
    Logger.log('Trigger cleanupExpiredProperties sudah wujud.');
  }

  if (handlers.indexOf('cleanOldSessions') === -1) {
    ScriptApp.newTrigger('cleanOldSessions')
      .timeBased().everyHours(24).create();
    Logger.log('Trigger cleanOldSessions dipasang: setiap 24 jam.');
  } else {
    Logger.log('Trigger cleanOldSessions sudah wujud.');
  }
}

// ============================================================
// 19. getGuru
// Returns { success, rows: [{nama, email, telefon}] }
// ============================================================
function getGuru() {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.GURU);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
    var rows = data
      .map(function(r) {
        return {
          nama:      (r[COL_GURU.NAMA]    || '').toString().trim(),
          email:     (r[COL_GURU.EMAIL]   || '').toString().trim(),
          telefon:   (r[COL_GURU.TELEFON] || '').toString().trim(),
          alamat:    (r[COL_GURU.ALAMAT]  || '').toString().trim(),
          jawatan:   (r[COL_GURU.JAWATAN] || '').toString().trim(),
          gambarUrl: (r[COL_GURU.GAMBAR]  || '').toString().trim(),
          role:      (r[COL_GURU.ROLE]    || '').toString().trim()
        };
      })
      .filter(function(r) { return r.nama !== ''; });

    return { success: true, rows: rows };
  } catch (err) {
    Logger.log('getGuru error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 20. uploadGuruGambar
// Input: { token, base64Data, mimeType, fileName }
// Output: { success, url, fileId }
// ============================================================
function uploadGuruGambar(params) {
  params = params || {};
  try {
    var auth = validateToken(params.token);
    if (!auth.valid) return { success: false, message: 'Token tidak sah.' };

    if (!params.base64Data || !params.mimeType || !params.fileName) {
      return { success: false, message: 'base64Data, mimeType dan fileName diperlukan.' };
    }

    var blob   = Utilities.newBlob(Utilities.base64Decode(params.base64Data), params.mimeType, params.fileName);
    var folder = DriveApp.getFolderById('1-Z0lnG7uT9_6BnxSy9TKp1ixmMJigTNX');
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var url = 'https://lh3.googleusercontent.com/d/' + file.getId();
    return { success: true, url: url, fileId: file.getId() };
  } catch (err) {
    Logger.log('uploadGuruGambar error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 21. updateGuru
// Input: { token, targetEmail, nama, telefon, alamat, jawatan, gambarUrl }
// Output: { success, message }
// ============================================================
function updateGuru(params) {
  params = params || {};
  try {
    var auth = validateToken(params.token);
    if (!auth.valid) return { success: false, message: 'Token tidak sah atau tamat tempoh.' };

    var loginEmail = auth.user.email;

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.GURU);
    if (!sheet) return { success: false, message: 'Tab Maklumat Guru tidak dijumpai.' };

    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();

    // Cari row login user untuk dapat role
    var loginRole = 'GURU';
    for (var j = 0; j < data.length; j++) {
      if ((data[j][COL_GURU.EMAIL] || '').toString().trim().toLowerCase() === loginEmail.toLowerCase()) {
        loginRole = (data[j][COL_GURU.ROLE] || 'GURU').toString().trim().toUpperCase();
        break;
      }
    }

    // Role check
    if (loginRole === 'GURU') {
      if (loginEmail.toLowerCase() !== (params.targetEmail || '').toString().trim().toLowerCase()) {
        return { success: false, message: 'Anda hanya boleh kemaskini maklumat sendiri.' };
      }
    }

    // Cari row target
    var targetEmail = (params.targetEmail || '').toString().trim().toLowerCase();
    var targetRow   = -1;
    for (var k = 0; k < data.length; k++) {
      var rowEmail = (data[k][COL_GURU.EMAIL] || '').toString().trim().toLowerCase();
      if (targetEmail === '' && rowEmail === '') {
        // Placeholder tanpa email — match by nama
        var rowNama = (data[k][COL_GURU.NAMA] || '').toString().trim();
        if (rowNama && rowNama === (params.nama || '').toString().trim()) {
          targetRow = k + 2; // +2 sebab data mula dari row 2
          break;
        }
      } else if (rowEmail === targetEmail) {
        targetRow = k + 2;
        break;
      }
    }

    if (targetRow === -1) return { success: false, message: 'Rekod guru tidak dijumpai.' };

    sheet.getRange(targetRow, COL_GURU.NAMA    + 1).setValue((params.nama    || '').toString().trim());
    sheet.getRange(targetRow, COL_GURU.TELEFON + 1).setValue((params.telefon || '').toString().trim());
    sheet.getRange(targetRow, COL_GURU.ALAMAT  + 1).setValue((params.alamat  || '').toString().trim());
    sheet.getRange(targetRow, COL_GURU.JAWATAN + 1).setValue((params.jawatan || '').toString().trim());
    if ((params.gambarUrl || '').toString().trim() !== '') {
      sheet.getRange(targetRow, COL_GURU.GAMBAR + 1).setValue(params.gambarUrl.toString().trim());
    }

    return { success: true, message: 'Maklumat berjaya dikemaskini.' };
  } catch (err) {
    Logger.log('updateGuru error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 22. getOrgChart
// Returns { success, rows: [{nama, jawatan, gambarUrl}] } sorted by jawatan
// ============================================================
function getOrgChart() {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.GURU);
    if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

    var data  = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
    var ORDER = { 'PENGASAS': 0, 'AJK': 1, 'GURU': 2 };

    var rows = data
      .map(function(r) {
        return {
          nama:      (r[COL_GURU.NAMA]    || '').toString().trim(),
          jawatan:   (r[COL_GURU.JAWATAN] || '').toString().trim(),
          gambarUrl: (r[COL_GURU.GAMBAR]  || '').toString().trim()
        };
      })
      .filter(function(r) { return r.nama !== ''; })
      .sort(function(a, b) {
        var oa = ORDER[a.jawatan.toUpperCase()] !== undefined ? ORDER[a.jawatan.toUpperCase()] : 99;
        var ob = ORDER[b.jawatan.toUpperCase()] !== undefined ? ORDER[b.jawatan.toUpperCase()] : 99;
        return oa - ob;
      });

    Logger.log('getOrgChart total: ' + rows.length);
    Logger.log('getOrgChart rows: ' + JSON.stringify(rows));
    return { success: true, rows: rows };
  } catch (err) {
    Logger.log('getOrgChart error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 24. syncNamaMuridToAllForms
// Sync nama murid dari SPKM DB ke 12 Google Form eBayar — dengan filter
// tarikh daftar (murid hanya masuk form bulan daftar dia & seterusnya)
// dan filter status bayaran (exclude yang dah bayar untuk bulan tu)
// Dipanggil selepas confirmRegisterKanak/Dewasa & doPost 'syncForms'
// ============================================================
function syncNamaMuridToAllForms() {
  try {
    var ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
    var yuranSS = SpreadsheetApp.openById(YURAN_SS_ID);

    var BULAN_2026 = [
      'JAN2026','FEB2026','MAC2026','APRIL2026','MEI2026','JUN2026',
      'JULAI2026','OGOS2026','SEPT2026','OKT2026','NOV2026','DIS2026'
    ];

    var FORM_IDS = {
      'JAN2026':   '1v0OkAu1LU7SCxI5CCYO9Fjwskd4Oz0A3PoQIyeNQBwA',
      'FEB2026':   '1gmlORBMHc-eGAXFtVV_tDHnMrZouUMMWYCsTi6Xepqw',
      'MAC2026':   '1Z6oGu7sPhkYmLKLFxHTi-1392hOIkE106xTBHisqBEs',
      'APRIL2026': '1d60MHkiapXdMxNJtCSZtTc1-ybFm2JDSGwDDvtLjMIQ',
      'MEI2026':   '1rapRxUcIXX6X4b2eCmQ2Ky8PzsH_fzOlOFGyuVhmnYE',
      'JUN2026':   '1bEbRSaDbZbcpmGoFOeABoLElOX1lhYkQSB7Cuj0GIYM',
      'JULAI2026': '1U4Ecr40vB7_HssJxVPwCzq6lElCxjEGWDJGZqXOMKXw',
      'OGOS2026':  '1wT-UU2ZxOn_tTnDFo-8B5rHI5u07R_sObUaXXdwINMw',
      'SEPT2026':  '15xIeRZ4uNzvrjTCQRZHZclgzy8gORtB9A_bPvxZl-Tw',
      'OKT2026':   '1goZKtfWL2GpaZFb42TMEdolA8K3_3B0Siyqnn3jCBr0',
      'NOV2026':   '1QoV63w2Ecl2lipapwrsvMYXKMtD9M1HeLfJsRN27zFY',
      'DIS2026':   '1gvcn6djuF9Xlatoe6b78RrGU0TVFFXpGIhiA1ML5O24'
    };

    var CALC_TAB_MAP = {
      'JAN2026':   'CalculationJan2026',
      'FEB2026':   'CalculationFeb2026',
      'MAC2026':   'CalculationMac2026',
      'APRIL2026': 'CalculationApril2026',
      'MEI2026':   'CalculationMei2026',
      'JUN2026':   'CalculationJun2026',
      'JULAI2026': 'CalculationJulai2026',
      'OGOS2026':  'CalculationOgos2026',
      'SEPT2026':  'CalculationSept2026',
      'OKT2026':   'CalculationOkt2026',
      'NOV2026':   'CalculationNov2026',
      'DIS2026':   'CalculationDis2026'
    };

    function parseRegMonthIdx(tarikhRaw) {
      if (!tarikhRaw) return -1;
      var d = null;
      if (tarikhRaw instanceof Date && !isNaN(tarikhRaw.getTime())) {
        d = tarikhRaw;
      } else {
        var ts = tarikhRaw.toString().trim();
        var m1 = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m1) d = new Date(parseInt(m1[3],10), parseInt(m1[2],10)-1, parseInt(m1[1],10));
        if (!d) {
          var m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m2) d = new Date(parseInt(m2[1],10), parseInt(m2[2],10)-1, parseInt(m2[3],10));
        }
      }
      if (!d || isNaN(d.getTime())) return -1;
      var yr = d.getFullYear();
      if (yr < 2026)   return -1;
      if (yr === 2026) return d.getMonth();
      return 999;
    }

    var kanakSheet = ss.getSheetByName(TAB.KANAK);
    var kanakData  = (kanakSheet && kanakSheet.getLastRow() > 1)
      ? kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, 19).getValues()
      : [];

    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);
    var dewasaData  = (dewasaSheet && dewasaSheet.getLastRow() > 1)
      ? dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, 19).getValues()
      : [];

    var uniqueAktif = {};
    kanakData.forEach(function(r) {
      var n = (r[COL_KANAK.NAMA]   || '').toString().trim().toUpperCase();
      var s = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
      if (n && (!s || s === 'AKTIF')) uniqueAktif[n] = true;
    });
    dewasaData.forEach(function(r) {
      var n = (r[COL_DEWASA.NAMA]   || '').toString().trim().toUpperCase();
      var s = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
      if (n && (!s || s === 'AKTIF')) uniqueAktif[n] = true;
    });
    var totalNames = Object.keys(uniqueAktif).length;

    var updated = 0;
    var errors  = [];

    for (var bi = 0; bi < BULAN_2026.length; bi++) {
      var bulan         = BULAN_2026[bi];
      var bulanMonthIdx = bi;

      try {
        var eligibleSet = {};
        kanakData.forEach(function(r) {
          var n = (r[COL_KANAK.NAMA]   || '').toString().trim().toUpperCase();
          var s = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
          if (!n || (s && s !== 'AKTIF')) return;
          var rmi = parseRegMonthIdx(r[COL_KANAK.TIMESTAMP]);
          if (rmi > bulanMonthIdx) return;
          eligibleSet[n] = true;
        });
        dewasaData.forEach(function(r) {
          var n = (r[COL_DEWASA.NAMA]   || '').toString().trim().toUpperCase();
          var s = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
          if (!n || (s && s !== 'AKTIF')) return;
          var rmi = parseRegMonthIdx(r[COL_DEWASA.TIMESTAMP]);
          if (rmi > bulanMonthIdx) return;
          eligibleSet[n] = true;
        });

        var dahBayarSet = {};
        try {
          var calcSheet = yuranSS.getSheetByName(CALC_TAB_MAP[bulan]);
          if (calcSheet && calcSheet.getLastRow() >= 2) {
            var calcData = calcSheet.getRange(2, 4, calcSheet.getLastRow() - 1, 1).getValues();
            calcData.forEach(function(r) {
              var nama = (r[0] || '').toString().trim().toUpperCase();
              if (nama && nama !== 'SUDAH BAYAR YURAN' && nama.indexOf('#') === -1 && nama !== ':-:') {
                dahBayarSet[nama] = true;
              }
            });
          }
        } catch (calcErr) {
          Logger.log('syncNamaMuridToAllForms calc ' + bulan + ': ' + calcErr.message);
        }

        var namaUntukForm = Object.keys(eligibleSet)
          .filter(function(n) { return !dahBayarSet[n]; })
          .sort();

        var form  = FormApp.openById(FORM_IDS[bulan]);
        var items = form.getItems(FormApp.ItemType.CHECKBOX);
        var found = false;
        for (var j = 0; j < items.length; j++) {
          if (items[j].getTitle() === 'NAMA PENUH MURID') {
            items[j].asCheckboxItem().setChoiceValues(namaUntukForm);
            updated++;
            found = true;
            Logger.log('syncNamaMuridToAllForms: ' + bulan
              + ' eligible=' + Object.keys(eligibleSet).length
              + ' dahBayar=' + Object.keys(dahBayarSet).length
              + ' inForm='   + namaUntukForm.length);
            break;
          }
        }
        if (!found) errors.push(bulan + ': NAMA PENUH MURID tidak dijumpai');

      } catch (formErr) {
        errors.push(bulan + ': ' + formErr.message);
        Logger.log('syncNamaMuridToAllForms ralat ' + bulan + ': ' + formErr.message);
      }
    }

    Logger.log('syncNamaMuridToAllForms selesai: ' + updated + '/' + BULAN_2026.length + ' forms, ' + errors.length + ' ralat.');
    return { success: true, updated: updated, totalNames: totalNames, errors: errors };

  } catch (err) {
    Logger.log('syncNamaMuridToAllForms error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function syncFormMinusBayar(params) {
  params = params || {};
  try {
    var bulan = (params.bulan || '').toString().trim().toUpperCase();
    if (!bulan) return { success: false, message: 'Parameter bulan diperlukan.' };
    var FORM_IDS = {
      'JAN2026':   '1v0OkAu1LU7SCxI5CCYO9Fjwskd4Oz0A3PoQIyeNQBwA',
      'FEB2026':   '1gmlORBMHc-eGAXFtVV_tDHnMrZouUMMWYCsTi6Xepqw',
      'MAC2026':   '1Z6oGu7sPhkYmLKLFxHTi-1392hOIkE106xTBHisqBEs',
      'APRIL2026': '1d60MHkiapXdMxNJtCSZtTc1-ybFm2JDSGwDDvtLjMIQ',
      'MEI2026':   '1rapRxUcIXX6X4b2eCmQ2Ky8PzsH_fzOlOFGyuVhmnYE',
      'JUN2026':   '1bEbRSaDbZbcpmGoFOeABoLElOX1lhYkQSB7Cuj0GIYM',
      'JULAI2026': '1U4Ecr40vB7_HssJxVPwCzq6lElCxjEGWDJGZqXOMKXw',
      'OGOS2026':  '1wT-UU2ZxOn_tTnDFo-8B5rHI5u07R_sObUaXXdwINMw',
      'SEPT2026':  '15xIeRZ4uNzvrjTCQRZHZclgzy8gORtB9A_bPvxZl-Tw',
      'OKT2026':   '1goZKtfWL2GpaZFb42TMEdolA8K3_3B0Siyqnn3jCBr0',
      'NOV2026':   '1QoV63w2Ecl2lipapwrsvMYXKMtD9M1HeLfJsRN27zFY',
      'DIS2026':   '1gvcn6djuF9Xlatoe6b78RrGU0TVFFXpGIhiA1ML5O24'
    };
    if (!FORM_IDS[bulan]) return { success: false, message: 'Bulan tidak dikenali: ' + bulan };
    var CALC_TAB_MAP = {
      'JAN2026':   'CalculationJan2026',
      'FEB2026':   'CalculationFeb2026',
      'MAC2026':   'CalculationMac2026',
      'APRIL2026': 'CalculationApril2026',
      'MEI2026':   'CalculationMei2026',
      'JUN2026':   'CalculationJun2026',
      'JULAI2026': 'CalculationJulai2026',
      'OGOS2026':  'CalculationOgos2026',
      'SEPT2026':  'CalculationSept2026',
      'OKT2026':   'CalculationOkt2026',
      'NOV2026':   'CalculationNov2026',
      'DIS2026':   'CalculationDis2026'
    };
    var calcTabNama = CALC_TAB_MAP[bulan];
    if (!calcTabNama) return { success: false, message: 'Tab Calculation tidak dijumpai untuk: ' + bulan };
    var yuranSS   = SpreadsheetApp.openById(YURAN_SS_ID);
    var calcSheet = yuranSS.getSheetByName(calcTabNama);
    if (!calcSheet) return { success: false, message: 'Tab ' + calcTabNama + ' tidak dijumpai.' };
    var lastRow = calcSheet.getLastRow();
    var dahBayarSet = {};
    if (lastRow >= 2) {
      var calcData = calcSheet.getRange(2, 4, lastRow - 1, 1).getValues();
      calcData.forEach(function(r) {
        var nama = (r[0] || '').toString().trim().toUpperCase();
        if (nama && nama !== 'SUDAH BAYAR YURAN' && nama.indexOf('#') === -1 && nama !== ':-:') {
          dahBayarSet[nama] = true;
        }
      });
    }
    var sudahBayarCount = Object.keys(dahBayarSet).length;
    var mainSS = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet = mainSS.getSheetByName(TAB.KANAK);
    var allNames = [];
    if (kanakSheet && kanakSheet.getLastRow() > 1) {
      var kData = kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, 19).getValues();
      kData.forEach(function(row) {
        var n = (row[COL_KANAK.NAMA] || '').toString().trim().toUpperCase();
        var s = (row[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
        if (n && (!s || s === 'AKTIF')) allNames.push(n);
      });
    }
    var dewasaSheet = mainSS.getSheetByName(TAB.DEWASA);
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, 19).getValues();
      dData.forEach(function(row) {
        var n = (row[COL_DEWASA.NAMA] || '').toString().trim().toUpperCase();
        var s = (row[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
        if (n && (!s || s === 'AKTIF')) allNames.push(n);
      });
    }
    var uniqueAll = {};
    allNames.forEach(function(n) { if (n) uniqueAll[n] = true; });
    var totalAktif = Object.keys(uniqueAll).length;
    var namaUntukForm = Object.keys(uniqueAll).filter(function(n) { return !dahBayarSet[n]; }).sort();
    var form = FormApp.openById(FORM_IDS[bulan]);
    var items = form.getItems(FormApp.ItemType.CHECKBOX);
    var updated = false;
    for (var j = 0; j < items.length; j++) {
      if (items[j].getTitle() === 'NAMA PENUH MURID') {
        items[j].asCheckboxItem().setChoiceValues(namaUntukForm);
        updated = true;
        break;
      }
    }
    if (!updated) return { success: false, message: 'Soalan NAMA PENUH MURID tidak dijumpai dalam form ' + bulan + '.' };
    Logger.log('syncFormMinusBayar: ' + bulan + ' totalAktif=' + totalAktif + ' sudahBayar=' + sudahBayarCount + ' namaInForm=' + namaUntukForm.length);
    return { success: true, bulan: bulan, totalAktif: totalAktif, sudahBayar: sudahBayarCount, namaInForm: namaUntukForm.length };
  } catch (err) {
    Logger.log('syncFormMinusBayar error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function onEbayarSubmit(e) {
  try {
    Utilities.sleep(3000);
    var bulanRaw = '';
    if (e && e.namedValues) {
      bulanRaw = (e.namedValues['BAYARAN YURAN BAGI BULAN'] || [''])[0];
    } else if (e && e.range) {
      var row = e.range.getValues()[0];
      bulanRaw = (row[3] || '').toString();
    }
    bulanRaw = bulanRaw.toString().trim().toUpperCase();
    Logger.log('onEbayarSubmit: bulanRaw = ' + bulanRaw);
    var BULAN_MAP = {
      'JANUARI': 'JAN2026', 'FEBRUARI': 'FEB2026', 'MAC': 'MAC2026',
      'APRIL': 'APRIL2026', 'MEI': 'MEI2026', 'JUN': 'JUN2026',
      'JULAI': 'JULAI2026', 'OGOS': 'OGOS2026', 'SEPTEMBER': 'SEPT2026',
      'SEPT': 'SEPT2026', 'OKTOBER': 'OKT2026', 'OKT': 'OKT2026',
      'NOVEMBER': 'NOV2026', 'DISEMBER': 'DIS2026', 'DIS': 'DIS2026'
    };
    var bulanKey = BULAN_MAP[bulanRaw];
    if (!bulanKey) { Logger.log('onEbayarSubmit: bulan tidak dikenali — ' + bulanRaw); return; }
    Logger.log('onEbayarSubmit: syncFormMinusBayar untuk ' + bulanKey);
    var result = syncFormMinusBayar({ bulan: bulanKey });
    Logger.log('onEbayarSubmit result: ' + JSON.stringify(result));
  } catch (err) {
    Logger.log('onEbayarSubmit error: ' + err.message);
  }
}

function createEbayarTriggers() {
  var existing = ScriptApp.getProjectTriggers();
  var sudahAda = existing.some(function(t) { return t.getHandlerFunction() === 'onEbayarSubmit'; });
  if (sudahAda) { Logger.log('Trigger sudah wujud.'); return 'Trigger sudah wujud.'; }
  ScriptApp.newTrigger('onEbayarSubmit').forSpreadsheet(YURAN_SS_ID).onFormSubmit().create();
  Logger.log('Trigger berjaya dipasang.');
  return 'Trigger berjaya dipasang.';
}

function testSyncOgosManual() {
  var result = syncFormMinusBayar({ bulan: 'OGOS2026' });
  Logger.log(JSON.stringify(result));
}

// ============================================================
// Khatam Iqra' / Khatam Quran — onFormSubmit notification trigger
// ============================================================
function onKhatamSubmit(e) {
  try {
    Utilities.sleep(2000);
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    var row = e.range.getValues()[0];

    var isQuran = sheetName.toLowerCase().indexOf('quran') !== -1;
    var jenis   = isQuran ? 'Khatam Al-Quran' : "Khatam Iqra'";
    var icon    = isQuran ? '📖' : '📗';

    var nama = (row[2] || '').toString().trim();
    var siri = (row[4] || '').toString().trim();
    var guru = (row[5] || '').toString().trim();

    if (!nama) return;

    var title = icon + ' ' + jenis + ' — ' + nama;
    var body  = 'Guru: ' + guru + (siri ? ' | Siri: ' + siri : '');

    simpanNotifikasi('khatam', title, body, {
      nama: nama, guru: guru, siri: siri, jenis: jenis
    });

    Logger.log('onKhatamSubmit: ' + jenis + ' — ' + nama);
  } catch(err) {
    Logger.log('onKhatamSubmit error: ' + err.message);
  }
}

function createKhatamTriggers() {
  var ss = SpreadsheetApp.openById('1jGp9U6lYRBvAVPSHhqSLv2WL5MHxdmKP5f5AnTHC8xU');
  var existing = ScriptApp.getProjectTriggers();
  var sudahAda = existing.some(function(t) {
    return t.getHandlerFunction() === 'onKhatamSubmit';
  });
  if (sudahAda) {
    Logger.log('Trigger onKhatamSubmit sudah wujud.');
    return 'Trigger sudah wujud.';
  }
  ScriptApp.newTrigger('onKhatamSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  Logger.log('Trigger onKhatamSubmit berjaya dipasang.');
  return 'Trigger berjaya dipasang.';
}

// ============================================================
// 25. getYuranStats
// Ambil statistik yuran untuk bulan tertentu dari Yuran spreadsheet
// Input:  { bulan } e.g. { bulan: "MEI2026" }
// Output: { success, sudahBayar, totalKutipan, listNamaBayar }
// ============================================================
var YURAN_SS_ID     = '1AUH-ZwrbDjB5l2J5H8t2MBlbzkITMJp66J2VDLZF9CM';
var KEHADIRAN_SS_ID = '1qez9OLXmJuU0nFCBnbuZqjc_DnTJh7kMElqCRnxK7F4';

// ============================================================
// EBAYAR MASTER / YURAN V2 — SHADOW READ MODEL ONLY
// Tidak menggantikan flow live YURAN_SS_ID / eBayar sedia ada.
// ============================================================
var EBAYAR_MASTER_PROP_KEY_V2 = 'EBAYAR_MASTER_SS_ID';
var EBAYAR_MASTER_NAME_V2     = 'SPKM eBayar Master';
var EBAYAR_PAYMENTS_TAB_V2    = 'Payments';
var EBAYAR_PAYMENTS_HEADERS_V2 = [
  'PAYMENT_ID',
  'PAYMENT_GROUP_ID',
  'TIMESTAMP',
  'TAHUN',
  'BULAN',
  'BULAN_KEY',
  'NAMA_MURID_RAW',
  'NAMA_MURID_NORM',
  'STUDENT_ID',
  'NO_MYKID_MYKAD',
  'STUDENT_TYPE',
  'JUMLAH',
  'AMOUNT_TOTAL',
  'AMOUNT_ALLOCATED',
  'STATUS',
  'KAEDAH',
  'RESIT_URL',
  'SOURCE_YEAR',
  'SOURCE_SHEET',
  'SOURCE_ROW',
  'SOURCE_ROW_HASH',
  'MATCH_STATUS',
  'MATCH_CONFIDENCE',
  'NOTE',
  'CREATED_AT',
  'UPDATED_AT'
];

var EBAYAR_SUPPORT_TABS_V2 = [
  'Config',
  'ImportLog',
  'MonthlySummary',
  'YearlySummary',
  'StudentsSnapshot'
];

var EBAYAR_MONTHS_V2 = [
  { key: '01', short: 'JAN',   label: 'Januari',   legacy: 'JAN2026' },
  { key: '02', short: 'FEB',   label: 'Februari',  legacy: 'FEB2026' },
  { key: '03', short: 'MAC',   label: 'Mac',       legacy: 'MAC2026' },
  { key: '04', short: 'APRIL', label: 'April',     legacy: 'APRIL2026' },
  { key: '05', short: 'MEI',   label: 'Mei',       legacy: 'MEI2026' },
  { key: '06', short: 'JUN',   label: 'Jun',       legacy: 'JUN2026' },
  { key: '07', short: 'JULAI', label: 'Julai',     legacy: 'JULAI2026' },
  { key: '08', short: 'OGOS',  label: 'Ogos',      legacy: 'OGOS2026' },
  { key: '09', short: 'SEPT',  label: 'September', legacy: 'SEPT2026' },
  { key: '10', short: 'OKT',   label: 'Oktober',   legacy: 'OKT2026' },
  { key: '11', short: 'NOV',   label: 'November',  legacy: 'NOV2026' },
  { key: '12', short: 'DIS',   label: 'Disember',  legacy: 'DIS2026' }
];

var NATIVE_EBAYAR_MVP_MAX_FILE_SIZE_V2 = 3 * 1024 * 1024;
var NATIVE_EBAYAR_SLIP_FOLDER_PROPERTY_V2_ = 'NATIVE_EBAYAR_SLIP_FOLDER_ID';
var NATIVE_EBAYAR_RECEIPT_FOLDER_PROPERTY_V2_ = 'NATIVE_EBAYAR_RECEIPT_FOLDER_ID';
var NATIVE_EBAYAR_RECEIPT_TEMPLATE_PROPERTY_V2_ = 'NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID';
var NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_PROPERTY_V2_ = 'NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID';
var EBAYAR_PORTAL_MODE_PROPERTY_ = 'EBAYAR_PORTAL_MODE';
var EBAYAR_PORTAL_MODE_UPDATED_AT_PROPERTY_ = 'EBAYAR_PORTAL_MODE_UPDATED_AT';
var EBAYAR_PORTAL_MODE_UPDATED_BY_PROPERTY_ = 'EBAYAR_PORTAL_MODE_UPDATED_BY';
var EBAYAR_PORTAL_NATIVE_START_DATE_ = '2026-09-01';
var EBAYAR_PORTAL_ALLOWED_MODES_ = ['AUTO', 'LEGACY', 'NATIVE', 'BOTH'];

function getEbayarPortalModeState_() {
  var timezone = 'Asia/Kuala_Lumpur';
  var serverDate = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
  var rawMode = PropertiesService.getScriptProperties().getProperty(EBAYAR_PORTAL_MODE_PROPERTY_);
  var configuredMode = (rawMode || '').toString().trim().toUpperCase();
  if (EBAYAR_PORTAL_ALLOWED_MODES_.indexOf(configuredMode) === -1) configuredMode = 'AUTO';
  var resolvedMode = configuredMode === 'AUTO'
    ? (serverDate < EBAYAR_PORTAL_NATIVE_START_DATE_ ? 'LEGACY' : 'NATIVE')
    : configuredMode;
  return {
    configuredMode: configuredMode,
    resolvedMode: resolvedMode,
    nativeStartDate: EBAYAR_PORTAL_NATIVE_START_DATE_,
    serverDate: serverDate
  };
}

function getEbayarPortalMode(params) {
  try {
    var state = getEbayarPortalModeState_();
    return {
      success: true,
      configuredMode: state.configuredMode,
      resolvedMode: state.resolvedMode,
      nativeStartDate: state.nativeStartDate,
      serverDate: state.serverDate,
      message: state.configuredMode === 'AUTO'
        ? 'Mode AUTO diselesaikan kepada ' + state.resolvedMode + '.'
        : 'Manual override ' + state.configuredMode + ' aktif.'
    };
  } catch (err) {
    Logger.log('getEbayarPortalMode error: ' + err.message);
    return {
      success: false,
      configuredMode: 'AUTO',
      resolvedMode: 'LEGACY',
      nativeStartDate: EBAYAR_PORTAL_NATIVE_START_DATE_,
      serverDate: Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd'),
      message: 'Mode portal eBayar tidak dapat dimuatkan.'
    };
  }
}

function setEbayarPortalMode(params) {
  params = params || {};
  var admin = authorizeEbayarV2MaintenanceAdmin_(params);
  if (!admin.valid) return { success: false, configuredMode: '', resolvedMode: '', message: admin.message };

  var mode = (params.mode || '').toString().trim().toUpperCase();
  if (EBAYAR_PORTAL_ALLOWED_MODES_.indexOf(mode) === -1) {
    return { success: false, configuredMode: '', resolvedMode: '', message: 'Mode portal eBayar tidak sah.' };
  }

  try {
    var timezone = 'Asia/Kuala_Lumpur';
    var props = PropertiesService.getScriptProperties();
    props.setProperty(EBAYAR_PORTAL_MODE_PROPERTY_, mode);
    props.setProperty(EBAYAR_PORTAL_MODE_UPDATED_AT_PROPERTY_, Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd HH:mm:ss Z'));
    props.setProperty(EBAYAR_PORTAL_MODE_UPDATED_BY_PROPERTY_, admin.email);
    var state = getEbayarPortalModeState_();
    return {
      success: true,
      configuredMode: state.configuredMode,
      resolvedMode: state.resolvedMode,
      message: 'Mode portal eBayar berjaya ditetapkan kepada ' + state.configuredMode + '.'
    };
  } catch (err) {
    Logger.log('setEbayarPortalMode error: ' + err.message);
    return { success: false, configuredMode: '', resolvedMode: '', message: 'Mode portal eBayar gagal dikemaskini.' };
  }
}

function normalizeYuranNameV2_(name) {
  return (name || '').toString().replace(/\s+/g, ' ').trim().toUpperCase();
}

function makeBulanKeyV2_(tahun, bulan) {
  var y = (tahun || '').toString().replace(/[^0-9]/g, '');
  var raw = (bulan || '').toString().trim().toUpperCase();
  if (!y) {
    var yearMatch = raw.match(/(20\d{2})/);
    if (yearMatch) y = yearMatch[1];
  }
  var monthNo = '';
  if (/^\d{1,2}$/.test(raw)) {
    monthNo = ('0' + parseInt(raw, 10)).slice(-2);
  } else {
    for (var i = 0; i < EBAYAR_MONTHS_V2.length; i++) {
      var m = EBAYAR_MONTHS_V2[i];
      if (raw.indexOf(m.short) === 0 || raw.indexOf(m.label.toUpperCase()) === 0 || raw === m.legacy) {
        monthNo = m.key;
        break;
      }
    }
  }
  if (!y || !monthNo) return '';
  return y + '-' + monthNo;
}

function normalizeBulanKeyV2_(value, tahunFallback, bulanFallback) {
  var canonicalPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
  var fallbackKey = makeBulanKeyV2_(tahunFallback, bulanFallback);
  if (!canonicalPattern.test(fallbackKey)) fallbackKey = '';

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return fallbackKey;
    var dateKey = Utilities.formatDate(value, 'Asia/Singapore', 'yyyy-MM');
    return fallbackKey || (canonicalPattern.test(dateKey) ? dateKey : '');
  }

  var raw = (value === null || value === undefined) ? '' : value.toString().trim();
  if (canonicalPattern.test(raw)) return raw;

  // Support Date values that crossed a JSON boundary and arrived as ISO strings.
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    var parsedDate = new Date(raw);
    if (!isNaN(parsedDate.getTime())) {
      var parsedDateKey = Utilities.formatDate(parsedDate, 'Asia/Singapore', 'yyyy-MM');
      return fallbackKey || (canonicalPattern.test(parsedDateKey) ? parsedDateKey : '');
    }
  }

  return fallbackKey;
}

function getEbayarMasterSpreadsheet_(options) {
  options = options || {};
  var props = PropertiesService.getScriptProperties();
  var id = (options.spreadsheetId || props.getProperty(EBAYAR_MASTER_PROP_KEY_V2) || '').toString().trim();
  if (id) return SpreadsheetApp.openById(id);

  var files = DriveApp.getFilesByName(EBAYAR_MASTER_NAME_V2);
  if (files.hasNext()) {
    var file = files.next();
    props.setProperty(EBAYAR_MASTER_PROP_KEY_V2, file.getId());
    return SpreadsheetApp.openById(file.getId());
  }

  if (options.create === true) {
    var ss = SpreadsheetApp.create(EBAYAR_MASTER_NAME_V2);
    props.setProperty(EBAYAR_MASTER_PROP_KEY_V2, ss.getId());
    return ss;
  }

  throw new Error('SPKM eBayar Master belum dijumpai. Set Script Property ' + EBAYAR_MASTER_PROP_KEY_V2 + ' atau jalankan ensureEbayarMasterSchemaV2({create:true}).');
}

function ensureEbayarMasterSchemaV2(params) {
  params = params || {};
  try {
    var ss = getEbayarMasterSpreadsheet_({ create: params.create === true, spreadsheetId: params.spreadsheetId });
    var payments = ss.getSheetByName(EBAYAR_PAYMENTS_TAB_V2) || ss.insertSheet(EBAYAR_PAYMENTS_TAB_V2);
    var existingHeaders = payments.getLastColumn() > 0
      ? payments.getRange(1, 1, 1, Math.max(payments.getLastColumn(), EBAYAR_PAYMENTS_HEADERS_V2.length)).getValues()[0]
      : [];
    var changed = false;
    for (var h = 0; h < EBAYAR_PAYMENTS_HEADERS_V2.length; h++) {
      if ((existingHeaders[h] || '').toString().trim() !== EBAYAR_PAYMENTS_HEADERS_V2[h]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      payments.getRange(1, 1, 1, EBAYAR_PAYMENTS_HEADERS_V2.length).setValues([EBAYAR_PAYMENTS_HEADERS_V2]);
      payments.setFrozenRows(1);
    }

    EBAYAR_SUPPORT_TABS_V2.forEach(function(tabName) {
      if (!ss.getSheetByName(tabName)) ss.insertSheet(tabName);
    });

    return {
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      paymentsTab: EBAYAR_PAYMENTS_TAB_V2,
      headers: EBAYAR_PAYMENTS_HEADERS_V2,
      changed: changed
    };
  } catch (err) {
    Logger.log('ensureEbayarMasterSchemaV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function getPaymentsRowsV2_() {
  var ss = getEbayarMasterSpreadsheet_();
  var sheet = ss.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
  if (!sheet || sheet.getLastRow() < 2) return { rows: [], headers: EBAYAR_PAYMENTS_HEADERS_V2 };
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return (h || '').toString().trim();
  });
  var idx = {};
  headers.forEach(function(h, i) { if (h) idx[h] = i; });
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var rows = data.map(function(r, offset) {
    var obj = { _rowNumber: offset + 2 };
    headers.forEach(function(h, i) { if (h) obj[h] = r[i]; });
    obj.BULAN_KEY = normalizeBulanKeyV2_(
      obj.BULAN_KEY,
      obj.TAHUN || obj.SOURCE_YEAR,
      obj.BULAN || obj.SOURCE_SHEET
    );
    obj._idx = idx;
    return obj;
  });
  return { rows: rows, headers: headers };
}

function getNativeEbayarOfficialStudentsV2_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var studentsByKey = {};
  var ambiguousKeys = {};

  function collect(sheetName, columns, studentType) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    var width = Math.max(columns.BIL, columns.NAMA, columns.STATUS, columns.GURU) + 1;
    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues();
    rows.forEach(function(row) {
      var bil = (row[columns.BIL] === null || row[columns.BIL] === undefined)
        ? ''
        : row[columns.BIL].toString().trim();
      var canonicalName = normalizeYuranNameV2_(row[columns.NAMA]);
      var status = (row[columns.STATUS] || '').toString().trim().toUpperCase();
      if (!bil || !/^[A-Za-z0-9._-]{1,40}$/.test(bil) || !canonicalName || (status && status !== 'AKTIF')) return;
      var studentKey = studentType + ':' + bil;
      if (studentsByKey[studentKey] || ambiguousKeys[studentKey]) {
        delete studentsByKey[studentKey];
        ambiguousKeys[studentKey] = true;
        return;
      }
      var guru = normalizeYuranNameV2_(row[columns.GURU]);
      studentsByKey[studentKey] = {
        studentKey: studentKey,
        nama: canonicalName,
        studentType: studentType,
        guru: guru
      };
    });
  }

  collect(TAB.KANAK, COL_KANAK, 'KANAK');
  collect(TAB.DEWASA, COL_DEWASA, 'DEWASA');
  return { byKey: studentsByKey, ambiguousKeys: ambiguousKeys };
}

function getNativeEbayarStudentLookup(params) {
  params = params || {};
  try {
    var keyword = normalizeYuranNameV2_(params.keyword);
    if (keyword.length < 2) {
      return { success: false, message: 'Masukkan sekurang-kurangnya 2 aksara untuk mencari murid.', results: [] };
    }
    if (keyword.length > 80) {
      return { success: false, message: 'Kata carian terlalu panjang.', results: [] };
    }
    var bulanKey = (params.bulanKey || '').toString().trim();
    if (!/^2026-(0[1-9]|1[0-2])$/.test(bulanKey)) {
      return { success: false, message: 'Bulan bayaran tidak sah.', results: [] };
    }
    if (bulanKey < '2026-09') {
      return { success: false, message: 'Native eBayar bermula September 2026.', results: [] };
    }
    var currentMonthKey = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM');
    if (bulanKey > currentMonthKey) {
      return { success: false, message: 'Bulan akan datang belum boleh dipilih.', results: [] };
    }

    var studentDirectory = getNativeEbayarOfficialStudentsV2_();
    var students = studentDirectory.byKey;
    var alreadyPaidByStudentId = {};
    var alreadyPaidLegacyNames = {};
    var payments = getPaymentsRowsV2_();
    (payments.rows || []).forEach(function(row) {
      var rowMonth = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN || row.SOURCE_YEAR, row.BULAN || row.SOURCE_SHEET);
      if (rowMonth !== bulanKey) return;
      var rowStudentId = (row.STUDENT_ID || '').toString().trim();
      var rowName = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);
      if (rowStudentId) alreadyPaidByStudentId[rowStudentId] = true;
      else if (rowName) alreadyPaidLegacyNames[rowName] = true;
    });
    var results = Object.keys(students).map(function(studentKey) {
      return students[studentKey];
    }).filter(function(student) {
      return student.nama.indexOf(keyword) !== -1 &&
        !alreadyPaidByStudentId[student.studentKey] &&
        !alreadyPaidLegacyNames[student.nama];
    }).sort(function(a, b) {
      return a.nama === b.nama ? a.studentKey.localeCompare(b.studentKey) : a.nama.localeCompare(b.nama);
    }).slice(0, 20).map(function(student) {
      return {
        studentKey: student.studentKey,
        nama: student.nama,
        studentType: student.studentType,
        guru: student.guru
      };
    });
    return { success: true, results: results, cappedAt: 20 };
  } catch (err) {
    Logger.log('getNativeEbayarStudentLookup error: ' + err.message);
    return { success: false, message: 'Carian murid tidak dapat dijalankan.', results: [] };
  }
}

function sanitizeNativeEbayarFileNameV2_(value) {
  var raw = (value === null || value === undefined) ? '' : value.toString();
  raw = raw.split(/[\\/]/).pop().replace(/[<>:"/\\|?*\u0000-\u001F\u007F]/g, '_');
  return raw.replace(/\s+/g, ' ').trim().slice(0, 120);
}

function sanitizeNativeEbayarReferenceV2_(value) {
  var raw = (value === null || value === undefined) ? '' : value.toString();
  return raw.replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^A-Za-z0-9 ._/#:\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateNativeEbayarSubmissionV2_(params) {
  params = params || {};
  var responseBase = {
    success: false,
    readyToSubmit: false,
    students: [],
    studentChecks: [],
    hasDuplicate: false
  };

  function fail(message) {
    var result = {};
    Object.keys(responseBase).forEach(function(key) { result[key] = responseBase[key]; });
    result.message = message;
    return result;
  }

  try {
    if (!Array.isArray(params.students)) return fail('Senarai murid tidak sah.');
    if (params.students.length < 1) return fail('Sila pilih sekurang-kurangnya seorang murid daripada senarai rasmi SPKM.');
    if (params.students.length > 5) return fail('Maksimum 5 murid dibenarkan untuk satu bayaran.');

    var officialStudentDirectory = getNativeEbayarOfficialStudentsV2_();
    var officialStudents = officialStudentDirectory.byKey;
    var requestedStudentKeys = {};
    var requestedNames = {};
    var canonicalStudents = [];
    var resolvedStudents = [];
    for (var studentIndex = 0; studentIndex < params.students.length; studentIndex++) {
      var studentParam = params.students[studentIndex];
      if (!studentParam || typeof studentParam !== 'object') return fail('Identiti murid tidak sah. Sila pilih semula murid daripada carian rasmi SPKM.');
      var studentKey = (studentParam.studentKey || '').toString().trim();
      var rawStudentName = (studentParam && typeof studentParam === 'object') ? studentParam.namaMurid : studentParam;
      var requestedName = normalizeYuranNameV2_(rawStudentName);
      if (!/^(KANAK|DEWASA):[A-Za-z0-9._-]{1,40}$/.test(studentKey)) {
        return fail('Identiti murid tidak sah atau telah luput. Sila pilih semula murid daripada carian rasmi SPKM.');
      }
      if (!requestedName || requestedName.length > 150) return fail('Nama murid tidak sah. Sila pilih murid daripada senarai rasmi SPKM.');
      if (requestedStudentKeys[studentKey]) return fail('Murid yang sama tidak boleh dipilih lebih daripada sekali.');
      var officialStudent = officialStudents[studentKey];
      if (!officialStudent || officialStudent.nama !== requestedName) {
        return fail('Identiti atau nama murid tidak lagi sepadan dengan rekod aktif. Sila cari dan pilih semula murid.');
      }
      requestedStudentKeys[studentKey] = true;
      requestedNames[requestedName] = true;
      canonicalStudents.push(officialStudent.nama);
      resolvedStudents.push(officialStudent);
    }

    var bulanKey = (params.bulanKey || '').toString().trim();
    if (!/^2026-(0[1-9]|1[0-2])$/.test(bulanKey)) {
      return fail('Bulan bayaran tidak sah. Native eBayar MVP hanya menyokong tahun 2026.');
    }
    if (bulanKey < '2026-09') {
      return fail('Native eBayar bermula September 2026. Bayaran Januari hingga Ogos 2026 kekal melalui sistem legacy.');
    }
    var currentMonthKey = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM');
    if (bulanKey > currentMonthKey) return fail('Bulan akan datang belum boleh dipilih.');
    var monthMeta = getMonthMetaV2_(bulanKey);
    if (!monthMeta) return fail('Bulan bayaran tidak disokong.');

    var tarikhBayaran = (params.tarikhBayaran || '').toString().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarikhBayaran)) return fail('Tarikh bayaran tidak sah.');
    var parsedDate = new Date(tarikhBayaran + 'T00:00:00+08:00');
    if (isNaN(parsedDate.getTime()) || Utilities.formatDate(parsedDate, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd') !== tarikhBayaran) {
      return fail('Tarikh bayaran tidak sah.');
    }
    var todayKey = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
    if (tarikhBayaran > todayKey) return fail('Tarikh bayaran tidak boleh berada pada masa hadapan.');

    var amountValue = (params.jumlahKeseluruhan !== null && params.jumlahKeseluruhan !== undefined)
      ? params.jumlahKeseluruhan
      : params.jumlah;
    var amountText = (amountValue === null || amountValue === undefined) ? '' : amountValue.toString().trim();
    if (amountText.length > 15) return fail('Jumlah bayaran tidak sah.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) return fail('Jumlah bayaran mesti nombor sah dengan maksimum dua tempat perpuluhan.');
    var jumlah = parseFloat(amountText);
    if (!isFinite(jumlah) || jumlah <= 0) return fail('Jumlah bayaran mesti lebih daripada RM0.');

    var rawReference = (params.noRujukan === null || params.noRujukan === undefined) ? '' : params.noRujukan.toString().trim();
    if (rawReference.length > 80) return fail('No. rujukan transaksi terlalu panjang. Maksimum 80 aksara.');
    var noRujukan = sanitizeNativeEbayarReferenceV2_(rawReference);
    if (rawReference && !noRujukan) return fail('No. rujukan transaksi mengandungi aksara yang tidak dibenarkan.');

    var allowedMimeTypes = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf']
    };
    var mimeType = (params.mimeType || '').toString().trim().toLowerCase();
    if (!allowedMimeTypes[mimeType]) return fail('Jenis fail tidak disokong. Gunakan JPEG, PNG, atau PDF sahaja.');
    var rawFileName = (params.fileName === null || params.fileName === undefined) ? '' : params.fileName.toString();
    if (rawFileName.length > 200) return fail('Nama fail slip terlalu panjang.');
    var fileName = sanitizeNativeEbayarFileNameV2_(rawFileName);
    if (!fileName) return fail('Nama fail slip tidak sah.');
    var lowerFileName = fileName.toLowerCase();
    var extensionValid = allowedMimeTypes[mimeType].some(function(extension) {
      return lowerFileName.slice(-extension.length) === extension;
    });
    if (!extensionValid) return fail('Sambungan fail tidak sepadan dengan jenis slip yang dipilih.');
    var fileSize = Number(params.fileSize);
    if (!isFinite(fileSize) || fileSize <= 0 || Math.floor(fileSize) !== fileSize) return fail('Saiz fail slip tidak sah.');
    if (fileSize > NATIVE_EBAYAR_MVP_MAX_FILE_SIZE_V2) return fail('Saiz slip melebihi had 3 MB.');

    var duplicateByStudentKey = {};
    var payments = getPaymentsRowsV2_();
    (payments.rows || []).forEach(function(row) {
      var rowName = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);
      var rowMonth = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN || row.SOURCE_YEAR, row.BULAN || row.SOURCE_SHEET);
      if (rowMonth !== bulanKey) return;
      var rowStudentId = (row.STUDENT_ID || '').toString().trim();
      var matchedStudentKeys = [];
      if (rowStudentId && requestedStudentKeys[rowStudentId]) {
        matchedStudentKeys.push(rowStudentId);
      } else if (!rowStudentId && requestedNames[rowName]) {
        resolvedStudents.forEach(function(student) {
          if (student.nama === rowName) matchedStudentKeys.push(student.studentKey);
        });
      }
      if (!matchedStudentKeys.length) return;
      var existingAmount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
      matchedStudentKeys.forEach(function(matchedStudentKey) {
        if (!duplicateByStudentKey[matchedStudentKey]) {
          duplicateByStudentKey[matchedStudentKey] = {
            status: (row.STATUS || '').toString().trim().toUpperCase(),
            amount: (typeof existingAmount === 'number' && isFinite(existingAmount)) ? existingAmount : null
          };
        }
      });
    });

    var hasDuplicate = false;
    var studentChecks = resolvedStudents.map(function(student) {
      var existing = duplicateByStudentKey[student.studentKey];
      var check = {
        studentKey: student.studentKey,
        nama: student.nama,
        duplicate: !!existing
      };
      if (existing) {
        hasDuplicate = true;
        check.existingStatus = existing.status;
        check.existingAmount = existing.amount;
      }
      return check;
    });

    return {
      success: true,
      readyToSubmit: !hasDuplicate,
      students: canonicalStudents,
      studentRecords: resolvedStudents,
      studentChecks: studentChecks,
      bulanKey: bulanKey,
      bulanLabel: monthMeta.label + ' 2026',
      tarikhBayaran: tarikhBayaran,
      jumlahKeseluruhan: jumlah,
      noRujukan: noRujukan,
      fileName: fileName,
      mimeType: mimeType,
      fileSize: fileSize,
      hasDuplicate: hasDuplicate,
      message: hasDuplicate
        ? 'Satu atau lebih murid telah mempunyai rekod bayaran untuk bulan ini. Buang murid tersebut daripada pilihan sebelum meneruskan.'
        : 'Maklumat bayaran telah disahkan dan sedia dihantar.'
    };
  } catch (err) {
    Logger.log('validateNativeEbayarSubmissionV2_ error: ' + err.message);
    return fail('Preflight bayaran tidak dapat diselesaikan. Sila cuba semula.');
  }
}

function preflightNativeEbayarSubmission(params) {
  var result = validateNativeEbayarSubmissionV2_(params || {});
  delete result.studentRecords;
  return result;
}

function makeNativeEbayarPaymentGroupIdV2_(bulanKey) {
  var monthPart = (bulanKey || '').toString().replace(/[^0-9]/g, '');
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyyMMddHHmmss');
  var randomPart = Utilities.getUuid().replace(/-/g, '').slice(0, 10).toUpperCase();
  return 'NATIVE-' + monthPart + '-' + timestamp + '-' + randomPart;
}

function makeNativeEbayarSourceHashV2_(paymentGroupId, validated) {
  var raw = [
    paymentGroupId,
    validated.bulanKey,
    validated.tarikhBayaran,
    Number(validated.jumlahKeseluruhan).toFixed(2),
    validated.noRujukan,
    validated.fileName,
    validated.fileSize,
    (validated.studentRecords || []).map(function(student) { return student.studentKey + ':' + student.nama; }).join('|')
  ].join('|');
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return bytes.map(function(byte) {
    var value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function parseNativeEbayarNoteV2_(value) {
  try {
    var parsed = JSON.parse((value || '').toString());
    return parsed && parsed.channel === 'NATIVE_EBAYAR' ? parsed : null;
  } catch (err) {
    return null;
  }
}

function isNativeEbayarFileSignatureValidV2_(bytes, mimeType) {
  var values = (bytes || []).slice(0, 8).map(function(byte) { return byte < 0 ? byte + 256 : byte; });
  if (mimeType === 'image/jpeg') return values.length >= 3 && values[0] === 0xFF && values[1] === 0xD8 && values[2] === 0xFF;
  if (mimeType === 'image/png') {
    return values.length >= 8 && values[0] === 0x89 && values[1] === 0x50 && values[2] === 0x4E && values[3] === 0x47 &&
      values[4] === 0x0D && values[5] === 0x0A && values[6] === 0x1A && values[7] === 0x0A;
  }
  if (mimeType === 'application/pdf') {
    return values.length >= 5 && values[0] === 0x25 && values[1] === 0x50 && values[2] === 0x44 && values[3] === 0x46 && values[4] === 0x2D;
  }
  return false;
}

function validateNativeEbayarReceiptGroupV2_(paymentGroupId) {
  var invalidMode = 'NATIVE_EBAYAR_RECEIPT_GROUP_INVALID';
  var groupId = (paymentGroupId || '').toString().trim();
  function invalid(message, extra) {
    var result = { success: false, mode: invalidMode, message: message };
    Object.keys(extra || {}).forEach(function(key) { result[key] = extra[key]; });
    return result;
  }

  if (!/^NATIVE-\d{6}-\d{14}-[A-F0-9]{10}$/.test(groupId)) {
    return invalid('Identiti kumpulan bayaran Native tidak sah.');
  }

  var paymentData = getPaymentsRowsV2_();
  var rows = (paymentData.rows || []).filter(function(row) {
    return (row.PAYMENT_GROUP_ID || '').toString().trim() === groupId;
  });
  if (rows.length < 1 || rows.length > 5) {
    return invalid('Kumpulan bayaran mesti mengandungi 1 hingga 5 rekod murid.');
  }

  var first = rows[0];
  var bulanKey = normalizeBulanKeyV2_(first.BULAN_KEY, first.TAHUN || first.SOURCE_YEAR, first.BULAN);
  var amountTotal = parseEbayarAmountV2_(first.AMOUNT_TOTAL || first.JUMLAH);
  var nativeNoteText = (first.NOTE || '').toString();
  var nativeNote = parseNativeEbayarNoteV2_(nativeNoteText);
  var sourceHash = (first.SOURCE_ROW_HASH || '').toString().trim();
  if (!bulanKey || typeof amountTotal !== 'number' || !isFinite(amountTotal) || amountTotal <= 0 ||
      !nativeNote || !/^\d{4}-\d{2}-\d{2}$/.test((nativeNote.paymentDate || '').toString()) || !sourceHash) {
    return invalid('Metadata kumpulan bayaran Native tidak lengkap atau tidak sah.');
  }

  var studentIds = {};
  var receiptUrls = {};
  var nonEmptyReceiptCount = 0;
  var students = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowStudentId = (row.STUDENT_ID || '').toString().trim();
    var rowStudentName = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);
    var rowBulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN || row.SOURCE_YEAR, row.BULAN);
    var rowAmount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
    var rowReceiptUrl = (row.RESIT_URL || '').toString().trim();
    if ((row.PAYMENT_GROUP_ID || '').toString().trim() !== groupId ||
        (row.SOURCE_SHEET || '').toString().trim().toUpperCase() !== 'NATIVE_EBAYAR' ||
        (row.KAEDAH || '').toString().trim().toUpperCase() !== 'NATIVE_EBAYAR' ||
        (row.STATUS || '').toString().trim().toUpperCase() !== 'SELESAI' ||
        rowBulanKey !== bulanKey || rowAmount !== amountTotal ||
        (row.NOTE || '').toString() !== nativeNoteText ||
        (row.SOURCE_ROW_HASH || '').toString().trim() !== sourceHash ||
        !rowStudentName || !/^(KANAK|DEWASA):[A-Za-z0-9._-]{1,40}$/.test(rowStudentId) || studentIds[rowStudentId]) {
      return invalid('Kumpulan bayaran Native tidak konsisten dan memerlukan semakan.');
    }
    studentIds[rowStudentId] = true;
    students.push({
      studentId: rowStudentId,
      nama: rowStudentName,
      studentType: (row.STUDENT_TYPE || '').toString().trim().toUpperCase()
    });
    if (rowReceiptUrl) {
      nonEmptyReceiptCount++;
      receiptUrls[rowReceiptUrl] = true;
    }
  }

  var receiptUrlList = Object.keys(receiptUrls);
  if (nonEmptyReceiptCount > 0) {
    var uniformValidReceipt = nonEmptyReceiptCount === rows.length && receiptUrlList.length === 1 &&
      /^https:\/\/drive\.google\.com\//i.test(receiptUrlList[0]);
    if (!uniformValidReceipt) {
      return {
        success: false,
        mode: 'NATIVE_EBAYAR_RECEIPT_REVIEW_REQUIRED',
        message: 'Pautan resit kumpulan tidak konsisten. Penjanaan automatik dihentikan untuk semakan.'
      };
    }
  }

  return {
    success: true,
    mode: receiptUrlList.length ? 'NATIVE_EBAYAR_RECEIPT_ALREADY_EXISTS' : 'NATIVE_EBAYAR_RECEIPT_READY_TO_GENERATE',
    paymentGroupId: groupId,
    rows: rows,
    rowNumbers: rows.map(function(row) { return row._rowNumber; }).sort(function(a, b) { return a - b; }),
    studentIds: Object.keys(studentIds).sort(),
    students: students,
    bulanKey: bulanKey,
    amountTotal: amountTotal,
    paymentDate: nativeNote.paymentDate,
    transactionReference: (nativeNote.transactionReference || '').toString(),
    nativeNoteText: nativeNoteText,
    sourceHash: sourceHash,
    existingReceiptUrl: receiptUrlList.length === 1 ? receiptUrlList[0] : ''
  };
}

function sameNativeEbayarReceiptSnapshotV2_(before, after) {
  if (!before || !after || !before.success || !after.success) return false;
  return before.paymentGroupId === after.paymentGroupId &&
    before.rowNumbers.join('|') === after.rowNumbers.join('|') &&
    before.studentIds.join('|') === after.studentIds.join('|') &&
    before.bulanKey === after.bulanKey &&
    before.amountTotal === after.amountTotal &&
    before.paymentDate === after.paymentDate &&
    before.transactionReference === after.transactionReference &&
    before.nativeNoteText === after.nativeNoteText &&
    before.sourceHash === after.sourceHash;
}

function balanceNativeEbayarReceiptNamesV2_(names) {
  if (names.length <= 2) return names.join('\n');
  var bestIndex = 1;
  var bestDifference = Infinity;
  for (var i = 1; i < names.length; i++) {
    var firstLength = names.slice(0, i).join(', ').length;
    var secondLength = names.slice(i).join(', ').length;
    var difference = Math.abs(firstLength - secondLength);
    if (difference < bestDifference) {
      bestDifference = difference;
      bestIndex = i;
    }
  }
  return names.slice(0, bestIndex).join(', ') + '\n' + names.slice(bestIndex).join(', ');
}

function getNativeEbayarReceiptDisplayReferenceV2_(paymentGroupId, overrideReference) {
  var override = (overrideReference || '').toString().trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  if (override) return override;
  var match = /^NATIVE-\d{6}-(\d{14})-[A-F0-9]{10}$/.exec((paymentGroupId || '').toString().trim());
  if (!match) throw new Error('Identiti kumpulan bayaran Native tidak sah untuk rujukan resit.');
  return match[1].slice(6); // DDHHMMSS; template already supplies SL/month/year.
}

function formatNativeEbayarReceiptDateV2_(paymentDate) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((paymentDate || '').toString().trim());
  if (!match) throw new Error('Tarikh bayaran Native tidak sah untuk resit.');
  var monthMeta = getMonthMetaV2_(match[1] + '-' + match[2]);
  if (!monthMeta) throw new Error('Bulan bayaran Native tidak sah untuk resit.');
  return parseInt(match[3], 10) + ' ' + monthMeta.label + ' ' + match[1];
}

function buildNativeEbayarReceiptTemplateDataV2_(group, options) {
  options = options || {};
  var students = (group && group.students) || [];
  if (students.length < 1 || students.length > 5) {
    throw new Error('Kumpulan resit mesti mengandungi 1 hingga 5 murid.');
  }
  var names = students.map(function(student) {
    return (student.nama || '').toString().trim();
  });
  if (names.some(function(name) { return !name; })) throw new Error('Nama murid resit tidak lengkap.');

  var monthMeta = getMonthMetaV2_(group.bulanKey);
  if (!monthMeta) throw new Error('Bulan bayaran Native tidak sah untuk template resit.');
  var amount = Number(group.amountTotal);
  if (!isFinite(amount) || amount <= 0) throw new Error('Jumlah bayaran Native tidak sah untuk resit.');
  var nameFontSize = names.length === 1 ? 9 : (names.length === 2 ? 8 : 7);
  var nameText = balanceNativeEbayarReceiptNamesV2_(names);

  return {
    placeholders: {
      '<<NAMA PENUH ANAK>>': nameText,
      '<<BULAN>>': monthMeta.label.toUpperCase(),
      '<<NO RESIT>>': getNativeEbayarReceiptDisplayReferenceV2_(group.paymentGroupId, options.receiptReference),
      '<<TARIKH>>': formatNativeEbayarReceiptDateV2_(group.paymentDate),
      '<<BAYARAN>>': amount.toFixed(2)
    },
    studentNames: names,
    nameText: nameText,
    nameFontSize: nameFontSize,
    preview: options.preview === true
  };
}

function populateNativeEbayarReceiptPresentationV2_(presentation, group, options) {
  options = options || {};
  var templateData = buildNativeEbayarReceiptTemplateDataV2_(group, options);
  var nameShapes = [];
  presentation.getSlides().forEach(function(slide) {
    slide.getShapes().forEach(function(shape) {
      var text = shape.getText().asString();
      if (text.indexOf('<<NAMA PENUH ANAK>>') !== -1) nameShapes.push(shape);
    });
  });
  if (!nameShapes.length) throw new Error('Placeholder <<NAMA PENUH ANAK>> tidak dijumpai dalam template resit.');

  Object.keys(templateData.placeholders).forEach(function(placeholder) {
    var replaced = presentation.replaceAllText(placeholder, templateData.placeholders[placeholder]);
    if (replaced < 1) throw new Error('Placeholder template resit tidak dijumpai: ' + placeholder);
  });
  nameShapes.forEach(function(shape) {
    shape.getText().getTextStyle().setFontSize(templateData.nameFontSize);
  });

  if (templateData.preview) {
    var previewSlide = presentation.getSlides()[0];
    var watermark = previewSlide.insertTextBox('CONTOH / TIDAK SAH', 168, 118, 240, 36);
    watermark.setRotation(-12);
    watermark.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    watermark.getText().getTextStyle().setFontSize(18).setBold(true).setForegroundColor('#C62828');
    watermark.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
  }

  var unresolved = [];
  presentation.getSlides().forEach(function(slide) {
    slide.getShapes().forEach(function(shape) {
      var matches = shape.getText().asString().match(/<<[^<>]+>>/g) || [];
      matches.forEach(function(value) { unresolved.push(value); });
    });
  });
  if (unresolved.length) throw new Error('Placeholder template resit belum diganti: ' + unresolved.join(', '));
  return templateData;
}

function createNativeEbayarReceiptPdfBlobV2_(templateId, group, options) {
  var tempPresentationFile = null;
  try {
    var templateFile = DriveApp.getFileById((templateId || '').toString().trim());
    tempPresentationFile = templateFile.makeCopy('TEMP_NATIVE_EBAYAR_RECEIPT_' + group.paymentGroupId);
    var presentation = SlidesApp.openById(tempPresentationFile.getId());
    populateNativeEbayarReceiptPresentationV2_(presentation, group, options || {});
    presentation.saveAndClose();
    return tempPresentationFile.getAs(MimeType.PDF);
  } finally {
    if (tempPresentationFile) {
      try {
        tempPresentationFile.setTrashed(true);
      } catch (cleanupErr) {
        Logger.log('Temporary Native receipt Slides cleanup failed: ' + cleanupErr.message);
      }
    }
  }
}

function applyNativeEbayarReceiptUrlToValuesV2_(receiptValues, minRow, rowNumbers, receiptUrl) {
  var targetRows = {};
  (rowNumbers || []).forEach(function(rowNumber) { targetRows[rowNumber] = true; });
  for (var offset = 0; offset < receiptValues.length; offset++) {
    if (targetRows[minRow + offset]) receiptValues[offset][0] = receiptUrl;
  }
  return receiptValues;
}

function generateNativeEbayarReceipt_(paymentGroupId) {
  var lock = LockService.getScriptLock();
  var pdfFile = null;
  var receiptWriteAttempted = false;

  function fail(mode, message) {
    return { success: false, mode: mode, paymentGroupId: (paymentGroupId || '').toString().trim(), message: message };
  }

  if (!lock.tryLock(30000)) {
    return fail('NATIVE_EBAYAR_RECEIPT_LOCK_FAILED', 'Resit belum dapat dijana kerana sistem sedang sibuk.');
  }

  try {
    var group = validateNativeEbayarReceiptGroupV2_(paymentGroupId);
    if (!group.success) return group;
    if (group.existingReceiptUrl) {
      return {
        success: true,
        mode: 'NATIVE_EBAYAR_RECEIPT_ALREADY_EXISTS',
        paymentGroupId: group.paymentGroupId,
        receiptReady: true,
        receiptUrl: group.existingReceiptUrl,
        idempotent: true,
        message: 'Resit rasmi telah tersedia.'
      };
    }

    var scriptProperties = PropertiesService.getScriptProperties();
    var receiptFolderId = (scriptProperties.getProperty(NATIVE_EBAYAR_RECEIPT_FOLDER_PROPERTY_V2_) || '').toString().trim();
    if (!receiptFolderId) {
      return fail('NATIVE_EBAYAR_RECEIPT_CONFIGURATION_BLOCKED', 'Script Property NATIVE_EBAYAR_RECEIPT_FOLDER_ID belum dikonfigurasi.');
    }
    var receiptTemplateId = (scriptProperties.getProperty(NATIVE_EBAYAR_RECEIPT_TEMPLATE_PROPERTY_V2_) || '').toString().trim();
    if (!receiptTemplateId) {
      return fail('NATIVE_EBAYAR_RECEIPT_CONFIGURATION_BLOCKED', 'Script Property NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID belum dikonfigurasi.');
    }

    var receiptFolder;
    try {
      receiptFolder = DriveApp.getFolderById(receiptFolderId);
    } catch (folderErr) {
      return fail('NATIVE_EBAYAR_RECEIPT_CONFIGURATION_BLOCKED', 'Folder resit Native eBayar tidak dapat diakses.');
    }

    var safeFileName = sanitizeNativeEbayarFileNameV2_('SPKM_RESIT_' + group.paymentGroupId + '.pdf');
    var pdfBlob = createNativeEbayarReceiptPdfBlobV2_(receiptTemplateId, group, {}).setName(safeFileName);
    pdfFile = receiptFolder.createFile(pdfBlob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var receiptUrl = pdfFile.getUrl();

    var freshGroup = validateNativeEbayarReceiptGroupV2_(paymentGroupId);
    if (!freshGroup.success) {
      try { pdfFile.setTrashed(true); } catch (preWriteCleanupErr) {}
      pdfFile = null;
      return freshGroup;
    }
    if (freshGroup.existingReceiptUrl) {
      try { pdfFile.setTrashed(true); } catch (duplicateCleanupErr) {}
      pdfFile = null;
      return {
        success: true,
        mode: 'NATIVE_EBAYAR_RECEIPT_ALREADY_EXISTS',
        paymentGroupId: freshGroup.paymentGroupId,
        receiptReady: true,
        receiptUrl: freshGroup.existingReceiptUrl,
        idempotent: true,
        message: 'Resit rasmi telah tersedia.'
      };
    }
    if (!sameNativeEbayarReceiptSnapshotV2_(group, freshGroup)) {
      try { pdfFile.setTrashed(true); } catch (changedCleanupErr) {}
      pdfFile = null;
      return fail('NATIVE_EBAYAR_RECEIPT_GROUP_INVALID', 'Kumpulan bayaran berubah semasa penjanaan resit. Resit tidak dipautkan.');
    }

    var spreadsheet = getEbayarMasterSpreadsheetForImportV2_();
    var sheet = spreadsheet.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
    if (!sheet) throw new Error('Payments tab tidak dijumpai.');
    var headerIndex = getPaymentsHeaderIndexV2_(sheet);
    if (headerIndex.RESIT_URL === undefined || headerIndex.RESIT_URL === null) {
      throw new Error('Header RESIT_URL tidak dijumpai.');
    }
    var minRow = freshGroup.rowNumbers[0];
    var maxRow = freshGroup.rowNumbers[freshGroup.rowNumbers.length - 1];
    var receiptRange = sheet.getRange(minRow, headerIndex.RESIT_URL + 1, maxRow - minRow + 1, 1);
    var receiptValues = receiptRange.getValues();
    applyNativeEbayarReceiptUrlToValuesV2_(receiptValues, minRow, freshGroup.rowNumbers, receiptUrl);
    receiptWriteAttempted = true;
    receiptRange.setValues(receiptValues);
    SpreadsheetApp.flush();

    var verifiedGroup = validateNativeEbayarReceiptGroupV2_(paymentGroupId);
    if (!verifiedGroup.success || verifiedGroup.existingReceiptUrl !== receiptUrl ||
        !sameNativeEbayarReceiptSnapshotV2_(freshGroup, verifiedGroup)) {
      return fail(
        'NATIVE_EBAYAR_RECEIPT_POST_WRITE_VERIFICATION_FAILED',
        'Bayaran telah direkod tetapi pengesahan resit gagal. Jangan hantar bayaran semula.'
      );
    }

    return {
      success: true,
      mode: 'NATIVE_EBAYAR_RECEIPT_GENERATED',
      paymentGroupId: group.paymentGroupId,
      receiptReady: true,
      receiptUrl: receiptUrl,
      idempotent: false,
      message: 'Resit rasmi telah tersedia.'
    };
  } catch (err) {
    Logger.log('generateNativeEbayarReceipt_ error: ' + err.message);
    if (receiptWriteAttempted) {
      return fail(
        'NATIVE_EBAYAR_RECEIPT_POST_WRITE_VERIFICATION_FAILED',
        'Bayaran telah direkod tetapi pengesahan resit gagal. Jangan hantar bayaran semula.'
      );
    }
    if (pdfFile) {
      try { pdfFile.setTrashed(true); } catch (pdfCleanupErr) { Logger.log('Native receipt PDF cleanup failed: ' + pdfCleanupErr.message); }
    }
    return fail('NATIVE_EBAYAR_RECEIPT_GENERATION_FAILED', 'Bayaran telah direkod tetapi resit rasmi belum dapat dijana.');
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

function testCreateNativeEbayarReceiptSlidesPreviewV2() {
  var props = PropertiesService.getScriptProperties();
  var templateId = (props.getProperty(NATIVE_EBAYAR_RECEIPT_TEMPLATE_PROPERTY_V2_) || '').toString().trim();
  var previewFolderId = (props.getProperty(NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_PROPERTY_V2_) || '').toString().trim();
  var productionFolderId = (props.getProperty(NATIVE_EBAYAR_RECEIPT_FOLDER_PROPERTY_V2_) || '').toString().trim();
  if (!templateId) {
    return { success: false, mode: 'NATIVE_EBAYAR_RECEIPT_PREVIEW_CONFIGURATION_BLOCKED', message: 'Script Property NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID belum dikonfigurasi.' };
  }
  if (!previewFolderId) {
    return { success: false, mode: 'NATIVE_EBAYAR_RECEIPT_PREVIEW_CONFIGURATION_BLOCKED', message: 'Script Property NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID belum dikonfigurasi.' };
  }
  if (productionFolderId && previewFolderId === productionFolderId) {
    return { success: false, mode: 'NATIVE_EBAYAR_RECEIPT_PREVIEW_CONFIGURATION_BLOCKED', message: 'Folder preview mesti berbeza daripada folder resit production.' };
  }

  var sampleGroup = {
    paymentGroupId: 'NATIVE-202609-20260901100000-AAAAAAAAAA',
    bulanKey: '2026-09',
    paymentDate: '2026-09-01',
    amountTotal: 100,
    students: [
      { nama: 'MUHAMMAD ADAM BIN AHMAD', studentType: 'KANAK' },
      { nama: 'NUR AISYAH BINTI AHMAD', studentType: 'KANAK' }
    ]
  };
  try {
    var previewFolder = DriveApp.getFolderById(previewFolderId);
    var previewBlob = createNativeEbayarReceiptPdfBlobV2_(templateId, sampleGroup, {
      preview: true,
      receiptReference: 'CONTOH'
    }).setName('SPKM_RESIT_CONTOH_SEPTEMBER_2026_TIDAK_SAH.pdf');
    var previewFile = previewFolder.createFile(previewBlob);
    return {
      success: true,
      mode: 'NATIVE_EBAYAR_RECEIPT_PREVIEW_CREATED',
      previewFileUrl: previewFile.getUrl(),
      message: 'Preview sintetik CONTOH / TIDAK SAH berjaya dijana. Tiada rekod bayaran atau RESIT_URL diubah.'
    };
  } catch (err) {
    Logger.log('testCreateNativeEbayarReceiptSlidesPreviewV2 error: ' + err.message);
    return {
      success: false,
      mode: 'NATIVE_EBAYAR_RECEIPT_PREVIEW_FAILED',
      message: 'Preview sintetik tidak dapat dijana: ' + err.message
    };
  }
}

function submitNativeEbayarPayment(params) {
  params = params || {};
  var mode = 'NATIVE_EBAYAR_SUBMISSION';
  var lock = null;
  var uploadedFile = null;
  var sheetWriteCompleted = false;

  function failure(message, extra) {
    var result = { success: false, mode: mode, message: message };
    Object.keys(extra || {}).forEach(function(key) { result[key] = extra[key]; });
    return result;
  }

  try {
    var portalMode = getEbayarPortalModeState_();
    if (portalMode.resolvedMode !== 'NATIVE' && portalMode.resolvedMode !== 'BOTH') {
      return failure('Native eBayar tidak aktif dalam mode portal semasa.');
    }

    var validated = validateNativeEbayarSubmissionV2_(params);
    if (!validated.success || !validated.readyToSubmit) {
      return failure(validated.message || 'Maklumat bayaran gagal disahkan.', {
        hasDuplicate: validated.hasDuplicate === true,
        studentChecks: validated.studentChecks || []
      });
    }

    var rawEncoded = (params.fileDataBase64 || '').toString();
    var maxEncodedLength = 4 * Math.ceil(NATIVE_EBAYAR_MVP_MAX_FILE_SIZE_V2 / 3) + 4;
    if (rawEncoded.length > maxEncodedLength) {
      return failure('Data slip melebihi had penghantaran yang dibenarkan.');
    }
    if (/\s/.test(rawEncoded)) {
      return failure('Data slip mengandungi ruang kosong yang tidak dibenarkan. Sila pilih semula fail.');
    }
    var encoded = rawEncoded;
    if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      return failure('Data fail slip tidak sah. Sila pilih semula fail.');
    }
    var fileBytes;
    try {
      fileBytes = Utilities.base64Decode(encoded);
    } catch (decodeErr) {
      return failure('Data fail slip tidak dapat dibaca. Sila pilih semula fail.');
    }
    if (fileBytes.length !== validated.fileSize || fileBytes.length > NATIVE_EBAYAR_MVP_MAX_FILE_SIZE_V2) {
      return failure('Saiz data slip tidak sepadan dengan metadata fail.');
    }
    if (!isNativeEbayarFileSignatureValidV2_(fileBytes, validated.mimeType)) {
      return failure('Kandungan fail slip tidak sepadan dengan format JPEG, PNG, atau PDF yang dipilih.');
    }

    var folderId = (PropertiesService.getScriptProperties().getProperty(NATIVE_EBAYAR_SLIP_FOLDER_PROPERTY_V2_) || '').toString().trim();
    if (!folderId) {
      return failure('Konfigurasi folder slip Native eBayar belum tersedia. Sila hubungi pentadbir.', {
        mode: 'NATIVE_EBAYAR_CONFIGURATION_BLOCKED'
      });
    }

    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return failure('Sistem bayaran sedang sibuk. Tiada data disimpan; sila cuba lagi kemudian.', {
        mode: 'NATIVE_EBAYAR_LOCK_FAILED'
      });
    }

    var lockedPortalMode = getEbayarPortalModeState_();
    if (lockedPortalMode.resolvedMode !== 'NATIVE' && lockedPortalMode.resolvedMode !== 'BOTH') {
      return failure('Native eBayar tidak lagi aktif dalam mode portal semasa. Tiada data disimpan.');
    }

    var freshValidation = validateNativeEbayarSubmissionV2_(params);
    if (!freshValidation.success || !freshValidation.readyToSubmit) {
      return failure(freshValidation.message || 'Bayaran tidak lagi boleh diteruskan. Tiada data disimpan.', {
        hasDuplicate: freshValidation.hasDuplicate === true,
        studentChecks: freshValidation.studentChecks || []
      });
    }

    var paymentGroupId = makeNativeEbayarPaymentGroupIdV2_(freshValidation.bulanKey);
    var safeUploadName = sanitizeNativeEbayarFileNameV2_(paymentGroupId + '_' + freshValidation.fileName);
    var blob = Utilities.newBlob(fileBytes, freshValidation.mimeType, safeUploadName);
    var folder;
    try {
      folder = DriveApp.getFolderById(folderId);
      uploadedFile = folder.createFile(blob);
    } catch (uploadErr) {
      return failure('Slip gagal disimpan. Tiada rekod bayaran ditulis.', {
        mode: 'NATIVE_EBAYAR_SLIP_UPLOAD_FAILED'
      });
    }

    var spreadsheet = getEbayarMasterSpreadsheetForImportV2_();
    var sheet = spreadsheet.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
    if (!sheet) throw new Error('Payments tab tidak dijumpai.');
    var headerIndex = getPaymentsHeaderIndexV2_(sheet);
    var requiredHeaders = EBAYAR_PAYMENTS_HEADERS_V2.filter(function(header) {
      return headerIndex[header] === undefined || headerIndex[header] === null;
    });
    if (requiredHeaders.length) {
      throw new Error('Header Payments tidak lengkap: ' + requiredHeaders.join(', '));
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
      return (header || '').toString().trim();
    });
    var now = new Date();
    var timestampNow = Utilities.formatDate(now, 'Asia/Kuala_Lumpur', "yyyy-MM-dd'T'HH:mm:ssXXX");
    var monthMeta = getMonthMetaV2_(freshValidation.bulanKey);
    var slipMetadata = {
      channel: 'NATIVE_EBAYAR',
      paymentDate: freshValidation.tarikhBayaran,
      transactionReference: freshValidation.noRujukan || '',
      slipFileId: uploadedFile.getId(),
      slipUrl: uploadedFile.getUrl(),
      originalFileName: freshValidation.fileName,
      mimeType: freshValidation.mimeType,
      fileSize: freshValidation.fileSize
    };
    var note = JSON.stringify(slipMetadata);
    var sourceHash = makeNativeEbayarSourceHashV2_(paymentGroupId, freshValidation);
    var rowsToAppend = freshValidation.studentRecords.map(function(student, index) {
      var rowObject = {
        PAYMENT_ID: paymentGroupId + '-' + ('0' + (index + 1)).slice(-2),
        PAYMENT_GROUP_ID: paymentGroupId,
        TIMESTAMP: timestampNow,
        TAHUN: freshValidation.bulanKey.slice(0, 4),
        BULAN: monthMeta.label.toUpperCase(),
        BULAN_KEY: freshValidation.bulanKey,
        NAMA_MURID_RAW: student.nama,
        NAMA_MURID_NORM: normalizeYuranNameV2_(student.nama),
        STUDENT_ID: student.studentKey,
        STUDENT_TYPE: student.studentType,
        JUMLAH: freshValidation.jumlahKeseluruhan,
        AMOUNT_TOTAL: freshValidation.jumlahKeseluruhan,
        AMOUNT_ALLOCATED: '',
        STATUS: 'SELESAI',
        KAEDAH: 'NATIVE_EBAYAR',
        RESIT_URL: '',
        SOURCE_YEAR: freshValidation.bulanKey.slice(0, 4),
        SOURCE_SHEET: 'NATIVE_EBAYAR',
        SOURCE_ROW: '',
        SOURCE_ROW_HASH: sourceHash,
        MATCH_STATUS: '',
        MATCH_CONFIDENCE: '',
        NOTE: note,
        CREATED_AT: timestampNow,
        UPDATED_AT: timestampNow
      };
      var output = new Array(headers.length).fill('');
      Object.keys(rowObject).forEach(function(key) { output[headerIndex[key]] = rowObject[key]; });
      return output;
    });
    if (!rowsToAppend.length || rowsToAppend.length !== freshValidation.studentRecords.length) {
      throw new Error('Set baris bayaran Native tidak lengkap.');
    }

    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    sheetWriteCompleted = true;
    SpreadsheetApp.flush();

    var writtenRows = getPaymentsRowsV2_().rows.filter(function(row) {
      return (row.PAYMENT_GROUP_ID || '').toString().trim() === paymentGroupId;
    });
    var expectedStudents = {};
    freshValidation.studentRecords.forEach(function(student) {
      expectedStudents[student.studentKey] = normalizeYuranNameV2_(student.nama);
    });
    var verifiedStudentIds = {};
    var verificationPassed = writtenRows.length === freshValidation.studentRecords.length;
    writtenRows.forEach(function(row) {
      var rowStudentId = (row.STUDENT_ID || '').toString().trim();
      var rowName = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);
      verifiedStudentIds[rowStudentId] = true;
      var rowNote = parseNativeEbayarNoteV2_(row.NOTE);
      var rowAmount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
      if (!expectedStudents[rowStudentId] || expectedStudents[rowStudentId] !== rowName ||
          row.BULAN_KEY !== freshValidation.bulanKey ||
          rowAmount !== freshValidation.jumlahKeseluruhan || !rowNote ||
          (row.STATUS || '').toString().trim().toUpperCase() !== 'SELESAI' ||
          (row.KAEDAH || '').toString().trim().toUpperCase() !== 'NATIVE_EBAYAR' ||
          (row.SOURCE_SHEET || '').toString().trim().toUpperCase() !== 'NATIVE_EBAYAR' ||
          (row.SOURCE_ROW_HASH || '').toString().trim() !== sourceHash ||
          rowNote.paymentDate !== freshValidation.tarikhBayaran ||
          rowNote.transactionReference !== (freshValidation.noRujukan || '') ||
          rowNote.slipFileId !== uploadedFile.getId() || rowNote.slipUrl !== uploadedFile.getUrl()) {
        verificationPassed = false;
      }
    });
    if (Object.keys(expectedStudents).some(function(studentKey) { return !verifiedStudentIds[studentKey]; })) verificationPassed = false;
    if (!verificationPassed) {
      return failure('Write mungkin telah berlaku tetapi verifikasi selepas write gagal. Jangan cuba semula sehingga rekod disemak.', {
        mode: 'NATIVE_EBAYAR_POST_WRITE_VERIFICATION_FAILED',
        paymentGroupId: paymentGroupId
      });
    }

    try { lock.releaseLock(); } catch (paymentLockReleaseErr) {}
    lock = null;

    var receiptResult;
    try {
      receiptResult = generateNativeEbayarReceipt_(paymentGroupId);
    } catch (receiptErr) {
      Logger.log('Native receipt integration error: ' + receiptErr.message);
      receiptResult = {
        success: false,
        mode: 'NATIVE_EBAYAR_RECEIPT_GENERATION_FAILED',
        message: 'Bayaran telah direkod tetapi resit rasmi belum dapat dijana.'
      };
    }
    var receiptReady = receiptResult && receiptResult.success === true && receiptResult.receiptReady === true;
    return {
      success: true,
      mode: 'NATIVE_EBAYAR_SUBMISSION_COMPLETED',
      paymentGroupId: paymentGroupId,
      students: freshValidation.students,
      bulanKey: freshValidation.bulanKey,
      bulanLabel: freshValidation.bulanLabel,
      tarikhBayaran: freshValidation.tarikhBayaran,
      jumlahKeseluruhan: freshValidation.jumlahKeseluruhan,
      slipReceived: true,
      receiptReady: receiptReady,
      receiptUrl: receiptReady ? receiptResult.receiptUrl : '',
      receiptMode: receiptResult ? receiptResult.mode : 'NATIVE_EBAYAR_RECEIPT_GENERATION_FAILED',
      receiptMessage: receiptReady ? '' : ((receiptResult && receiptResult.message) || 'Resit rasmi belum tersedia.'),
      message: receiptReady
        ? 'Bayaran berjaya dihantar dan resit telah dijana.'
        : 'Bayaran berjaya dihantar. Resit rasmi belum tersedia.'
    };
  } catch (err) {
    Logger.log('submitNativeEbayarPayment error: ' + err.message);
    if (sheetWriteCompleted) {
      return failure('Write mungkin telah berlaku tetapi verifikasi selepas write gagal. Jangan cuba semula sehingga rekod disemak.', {
        mode: 'NATIVE_EBAYAR_POST_WRITE_VERIFICATION_FAILED'
      });
    }
    var cleanupFailed = false;
    if (uploadedFile && !sheetWriteCompleted) {
      try { uploadedFile.setTrashed(true); } catch (cleanupErr) { cleanupFailed = true; }
    }
    return failure(
      cleanupFailed
        ? 'Rekod bayaran tidak ditulis tetapi fail slip gagal dibersihkan. Hubungi pentadbir dan jangan cuba semula dahulu.'
        : 'Bayaran gagal dihantar. Tiada rekod bayaran ditulis.',
      cleanupFailed ? { mode: 'NATIVE_EBAYAR_UPLOAD_CLEANUP_NEEDED' } : null
    );
  } finally {
    if (lock) {
      try { lock.releaseLock(); } catch (releaseErr) {}
    }
  }
}

function getMonthMetaV2_(bulanKey) {
  var key = (bulanKey || '').toString();
  var monthNo = key.indexOf('-') !== -1 ? key.split('-')[1] : key;
  for (var i = 0; i < EBAYAR_MONTHS_V2.length; i++) {
    if (EBAYAR_MONTHS_V2[i].key === monthNo) return EBAYAR_MONTHS_V2[i];
  }
  return null;
}

function getEligibleYuranStudentsV2_(tahun, bulanKey) {
  var monthNo = (bulanKey || '').toString().split('-')[1] || '';
  var monthIdx = monthNo ? parseInt(monthNo, 10) - 1 : -1;
  var yearNo = parseInt(tahun, 10);
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var students = {};

  function parseRegMonthIdx(tarikhRaw) {
    if (!tarikhRaw) return -1;
    var d = null;
    if (tarikhRaw instanceof Date && !isNaN(tarikhRaw.getTime())) d = tarikhRaw;
    else {
      var ts = tarikhRaw.toString().trim();
      var m1 = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (m1) d = new Date(parseInt(m1[3], 10), parseInt(m1[2], 10) - 1, parseInt(m1[1], 10));
      if (!d) {
        var m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m2) d = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10));
      }
    }
    if (!d || isNaN(d.getTime())) return -1;
    var yr = d.getFullYear();
    if (yr < yearNo) return -1;
    if (yr === yearNo) return d.getMonth();
    return 999;
  }

  function collect(sheetName, col, studentType) {
    var sheet = ss.getSheetByName(sheetName);
    var data = (sheet && sheet.getLastRow() > 1) ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 19).getValues() : [];
    data.forEach(function(r) {
      var nama = normalizeYuranNameV2_(r[col.NAMA]);
      var status = (r[col.STATUS] || '').toString().trim().toUpperCase();
      if (!nama || (status && status !== 'AKTIF')) return;
      var regMonthIdx = parseRegMonthIdx(r[col.TIMESTAMP]);
      if (monthIdx >= 0 && regMonthIdx > monthIdx) return;
      students[nama] = { nama: nama, studentType: studentType, regMonthIdx: regMonthIdx };
    });
  }

  collect(TAB.KANAK, COL_KANAK, 'KANAK');
  collect(TAB.DEWASA, COL_DEWASA, 'DEWASA');
  return Object.keys(students).sort().map(function(k) { return students[k]; });
}

function getTelefonMapV2_() {
  var map = {};
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('WARemind');
    if (sheet && sheet.getLastRow() >= 3) {
      var data = sheet.getRange(3, 2, sheet.getLastRow() - 2, 3).getValues();
      data.forEach(function(r) {
        var nama = normalizeYuranNameV2_(r[0]);
        var tel = (r[2] || '').toString().trim();
        if (nama && tel) map[nama] = tel;
      });
    }
  } catch (err) {
    Logger.log('getTelefonMapV2_ error: ' + err.message);
  }
  return map;
}

function detectEbayarSourceColumnsV2_(headers) {
  headers = headers || [];
  var detected = {
    nama: null,
    jumlah: null,
    status: null,
    timestamp: null,
    resit: null,
    telefon: null,
    bulan: null,
    tahun: null,
    tarikhBayaran: null,
    noResit: null,
    email: null
  };

  function cleanHeader(h) {
    return (h || '').toString()
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function matchAny(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].test(text)) return true;
    }
    return false;
  }

  var priority = [
    'timestamp',
    'email',
    'nama',
    'bulan',
    'tahun',
    'resit',
    'jumlah',
    'tarikhBayaran',
    'noResit',
    'status',
    'telefon'
  ];

  var rules = {
    nama: [
      /NAMA.*ANAK/,
      /NAMA.*MURID/,
      /NAMA.*PENUH/,
      /^NAMA$/,
      /MURID/,
      /PELAJAR/,
      /STUDENT/
    ],
    jumlah: [
      /JUMLAH/,
      /AMAUN/,
      /AMOUNT/,
      /RM/,
      /TOTAL/
    ],
    status: [
      /STATUS/,
      /SELESAI/,
      /PAID/,
      /PAYMENT.*STATUS/
    ],
    timestamp: [
      /TIMESTAMP/,
      /CAP MASA/,
      /MASA/,
      /TARIKH.*HANTAR/,
      /SUBMIT/,
      /DATE/
    ],
    resit: [
      /MUAT NAIK.*RESIT/,
      /RESIT/,
      /RECEIPT/,
      /BUKTI/,
      /SLIP/,
      /UPLOAD/
    ],
    telefon: [
      /TELEFON/,
      /PHONE/,
      /WHATSAPP/,
      /WASAP/,
      /NO\.?\s*HP/,
      /NOMBOR/
    ],
    bulan: [
      /BAYARAN.*YURAN.*BAGI.*BULAN/,
      /BULAN/,
      /MONTH/,
      /YURAN.*BAGI/,
      /BAYARAN.*BULAN/
    ],
    tahun: [
      /^TAHUN$/,
      /TAHUN.*YURAN/,
      /^YEAR$/
    ],
    tarikhBayaran: [
      /TARIKH.*BAYARAN.*DIBUAT/,
      /TARIKH.*BAYAR/,
      /PAYMENT.*DATE/,
      /DATE.*PAID/
    ],
    noResit: [
      /^NO\.?\s*RESIT$/,
      /NOMBOR.*RESIT/,
      /RECEIPT.*NO/,
      /NO\.?\s*RECEIPT/
    ],
    email: [
      /^EMAIL$/,
      /EMAIL.*ADDRESS/,
      /ALAMAT.*EMAIL/
    ]
  };

  for (var c = 0; c < headers.length; c++) {
    var cleaned = cleanHeader(headers[c]);
    if (!cleaned) continue;
    priority.forEach(function(key) {
      if (detected[key] === null && matchAny(cleaned, rules[key])) {
        detected[key] = {
          column: c + 1,
          index: c,
          header: headers[c],
          normalizedHeader: cleaned
        };
      }
    });
  }

  return detected;
}

function isLikelyEbayarSourceTabV2_(sheetName, sourceYear) {
  var name = (sheetName || '').toString().trim().toUpperCase();
  if (!name) return false;
  if (sourceYear === 2026) {
    for (var i = 0; i < EBAYAR_MONTHS_V2.length; i++) {
      if (name === EBAYAR_MONTHS_V2[i].legacy || name === ('CALCULATION' + EBAYAR_MONTHS_V2[i].label + '2026').toUpperCase()) {
        return true;
      }
    }
    return /2026|YURAN|EBAYAR|BAYAR|PAYMENT|CALCULATION|NAMA MURID/.test(name);
  }
  return /2025|YURAN|EBAYAR|BAYAR|PAYMENT|BULAN|MEI|JUN|JULAI|OGOS|SEPT|OKT|NOV|DIS/.test(name);
}

function inspectEbayarSourceSheetV2_(sheet, sourceYear) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  var headers = [];
  var sampleRows = [];

  if (lastRow >= 1 && lastColumn >= 1) {
    headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  }

  if (lastRow >= 2 && lastColumn >= 1) {
    var sampleCount = Math.min(5, lastRow - 1);
    sampleRows = sheet.getRange(2, 1, sampleCount, lastColumn).getValues();
  }

  return {
    name: sheet.getName(),
    sourceYear: sourceYear,
    lastRow: lastRow,
    lastColumn: lastColumn,
    headers: headers,
    detectedColumns: detectEbayarSourceColumnsV2_(headers),
    sampleRows: sampleRows
  };
}

function auditEbayarSourceTabsV2(params) {
  params = params || {};
  try {
    var includeAllTabs = params.includeAllTabs === true;
    var mainSS = SpreadsheetApp.openById(SPREADSHEET_ID);
    var yuranSS = SpreadsheetApp.openById(YURAN_SS_ID);

    function auditSpreadsheet(ss, sourceYear, sourceLabel) {
      var tabs = [];
      ss.getSheets().forEach(function(sheet) {
        var tabName = sheet.getName();
        if (!includeAllTabs && !isLikelyEbayarSourceTabV2_(tabName, sourceYear)) return;
        tabs.push(inspectEbayarSourceSheetV2_(sheet, sourceYear));
      });
      return {
        sourceLabel: sourceLabel,
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        sourceYear: sourceYear,
        tabCount: tabs.length,
        tabs: tabs
      };
    }

    return {
      success: true,
      mode: 'V2_SOURCE_AUDIT_READ_ONLY',
      note: 'Read-only audit only. No spreadsheet writes/imports performed.',
      sources: [
        auditSpreadsheet(mainSS, 2025, 'SPKM Main DB possible eBayar 2025 tabs'),
        auditSpreadsheet(yuranSS, 2026, 'YURAN_SS_ID eBayar 2026 tabs')
      ]
    };
  } catch (err) {
    Logger.log('auditEbayarSourceTabsV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function testAuditEbayarSourceTabsV2() {
  var result = auditEbayarSourceTabsV2();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function compactDetectedColumnsV2_(detectedColumns) {
  var compact = {};
  detectedColumns = detectedColumns || {};
  Object.keys(detectedColumns).forEach(function(key) {
    compact[key] = detectedColumns[key] ? detectedColumns[key].header : null;
  });
  return compact;
}

function testAuditEbayarSourceTabsCompactV2() {
  var result = auditEbayarSourceTabsV2();
  if (!result || !result.success) {
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  }

  var summary = {
    success: true,
    mode: result.mode,
    sources: (result.sources || []).map(function(source) {
      return {
        sourceLabel: source.sourceLabel,
        sourceYear: source.sourceYear,
        tabCount: source.tabCount,
        tabs: (source.tabs || []).map(function(tab) {
          return {
            name: tab.name,
            lastRow: tab.lastRow,
            lastColumn: tab.lastColumn,
            detectedColumns: compactDetectedColumnsV2_(tab.detectedColumns)
          };
        })
      };
    })
  };

  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function isRawEbayarPaymentTabV2_(tab) {
  var name = (tab && tab.name ? tab.name : '').toString().trim().toUpperCase();
  if (!tab || !tab.detectedColumns) return false;
  if (/CALCULATION|SUMMARY|RINGKASAN|LAPORAN|REPORT|DASHBOARD|CONFIG|IMPORT|SNAPSHOT/.test(name)) return false;
  return !!(
    tab.detectedColumns.nama &&
    tab.detectedColumns.jumlah &&
    tab.detectedColumns.status &&
    tab.detectedColumns.timestamp
  );
}

function testAuditEbayarSourceRawTabsByYearV2_(sourceYear) {
  var result = auditEbayarSourceTabsV2();
  if (!result || !result.success) {
    Logger.log(JSON.stringify(result, null, 2));
    return result;
  }

  var tabs = [];
  (result.sources || []).forEach(function(source) {
    if (parseInt(source.sourceYear, 10) !== parseInt(sourceYear, 10)) return;
    (source.tabs || []).forEach(function(tab) {
      if (!isRawEbayarPaymentTabV2_(tab)) return;
      tabs.push({
        name: tab.name,
        lastRow: tab.lastRow,
        lastColumn: tab.lastColumn,
        detectedColumns: compactDetectedColumnsV2_(tab.detectedColumns)
      });
    });
  });

  var summary = {
    success: true,
    mode: 'V2_SOURCE_RAW_TABS_AUDIT_READ_ONLY',
    sourceYear: parseInt(sourceYear, 10),
    rawTabCount: tabs.length,
    tabs: tabs
  };
  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function testAuditEbayarSourceRawTabs2025V2() {
  return testAuditEbayarSourceRawTabsByYearV2_(2025);
}

function testAuditEbayarSourceRawTabs2026V2() {
  return testAuditEbayarSourceRawTabsByYearV2_(2026);
}

function parseEbayarAmountV2_(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value;
  var cleaned = value.toString().replace(/RM/ig, '').replace(/,/g, '').trim();
  var amount = parseFloat(cleaned);
  return isNaN(amount) ? value : amount;
}

function getDetectedCellV2_(row, detectedColumns, key) {
  var col = detectedColumns && detectedColumns[key];
  if (!col || col.index === undefined || col.index === null) return '';
  return row[col.index];
}

function makePaymentGroupIdDryRunV2_(sourceYear, sourceSheet, sourceRow) {
  var sheetKey = (sourceSheet || '').toString().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
  return ['DRYRUN', sourceYear, sheetKey, sourceRow].join('-');
}

function makeImportPaymentGroupIdV2_(draftRow) {
  return (draftRow.PAYMENT_GROUP_ID || '').toString().replace(/^DRYRUN-/, 'PG-');
}

function makeImportPaymentIdV2_(draftRow) {
  return (draftRow.PAYMENT_ID || '').toString().replace(/^DRYRUN-/, 'PAY-');
}

function makeSourceRowHashDryRunV2_(sourceYear, sourceSheet, sourceRow, row) {
  row = row || {};
  var parts = [
    sourceYear,
    sourceSheet,
    sourceRow,
    row.timestamp,
    row.rawName,
    row.bulan,
    row.tahun,
    row.jumlah,
    row.status
  ].map(function(v) {
    return (v === null || v === undefined) ? '' : v.toString().replace(/\s+/g, ' ').trim();
  });
  var raw = parts.join('|');

  try {
    if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
      var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
      return bytes.map(function(b) {
        var v = b < 0 ? b + 256 : b;
        return ('0' + v.toString(16)).slice(-2);
      }).join('');
    }
  } catch (err) {
    Logger.log('makeSourceRowHashDryRunV2_ fallback: ' + err.message);
  }

  return raw.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function makeBulanKeyDryRunV2_(tahun, bulan, sourceSheet) {
  var bulanKey = makeBulanKeyV2_(tahun, bulan);
  if (bulanKey) return bulanKey;
  var sheetName = (sourceSheet || '').toString().trim().toUpperCase();
  for (var i = 0; i < EBAYAR_MONTHS_V2.length; i++) {
    var m = EBAYAR_MONTHS_V2[i];
    if (sheetName.indexOf(m.short) !== -1 || sheetName.indexOf(m.label.toUpperCase()) !== -1) {
      return tahun + '-' + m.key;
    }
  }
  return '';
}

function splitEbayarNamesDryRunV2_(rawName) {
  var raw = (rawName || '').toString().replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  return raw.split(',')
    .map(function(part) { return normalizeYuranNameV2_(part); })
    .filter(function(name) { return !!name; });
}

function findDuplicateKeysV2_(rows, key) {
  var counts = {};
  rows.forEach(function(row) {
    var value = (row[key] || '').toString();
    if (!value) return;
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.keys(counts).filter(function(k) { return counts[k] > 1; }).sort().map(function(k) {
    return { value: k, count: counts[k] };
  });
}

function buildEbayarImportRowsDryRunV2_(options) {
  options = options || {};
  var requestedYear = options.sourceYear ? parseInt(options.sourceYear, 10) : null;
  var limitRowsPerTab = parseInt(options.limitRowsPerTab, 10);
  var hasLimit = !isNaN(limitRowsPerTab) && limitRowsPerTab > 0;
  var limitSourceRows = parseInt(options.limitSourceRows, 10);
  var hasSourceLimit = !isNaN(limitSourceRows) && limitSourceRows > 0;
  var audit = auditEbayarSourceTabsV2();
  if (!audit || !audit.success) return { success: false, message: audit ? audit.message : 'Audit gagal.' };

  var draftRows = [];
  var sourceGroups = [];
  var sourceTabs = [];
  var sourceRowCount = 0;
  var multiNameRows = 0;
  var skippedRows = 0;
  var statusCounts = {};
  var yearCounts = {};
  var monthCounts = {};

  (audit.sources || []).forEach(function(source) {
    var sourceYear = parseInt(source.sourceYear, 10);
    if (requestedYear && sourceYear !== requestedYear) return;
    var ss = SpreadsheetApp.openById(source.spreadsheetId);

    (source.tabs || []).forEach(function(tab) {
      if (hasSourceLimit && sourceRowCount >= limitSourceRows) return;
      if (!isRawEbayarPaymentTabV2_(tab)) return;
      var sheet = ss.getSheetByName(tab.name);
      if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 1) return;

      sourceTabs.push(tab.name);
      var rowCount = sheet.getLastRow() - 1;
      if (hasLimit) rowCount = Math.min(rowCount, limitRowsPerTab);
      var values = sheet.getRange(2, 1, rowCount, sheet.getLastColumn()).getValues();

      values.forEach(function(row, offset) {
        if (hasSourceLimit && sourceRowCount >= limitSourceRows) return;
        var sourceRow = offset + 2;
        var hasAnyValue = row.some(function(cell) {
          return cell !== null && cell !== undefined && cell.toString().trim() !== '';
        });
        if (!hasAnyValue) {
          skippedRows++;
          return;
        }

        var rawName = getDetectedCellV2_(row, tab.detectedColumns, 'nama');
        var splitNames = splitEbayarNamesDryRunV2_(rawName);
        if (!splitNames.length) {
          skippedRows++;
          return;
        }
        if (splitNames.length > 1) multiNameRows++;

        sourceRowCount++;
        var timestamp = getDetectedCellV2_(row, tab.detectedColumns, 'timestamp');
        var tahunRaw = getDetectedCellV2_(row, tab.detectedColumns, 'tahun');
        var tahun = (tahunRaw || '').toString().replace(/[^0-9]/g, '');
        if (!tahun) tahun = sourceYear.toString();
        var bulan = getDetectedCellV2_(row, tab.detectedColumns, 'bulan') || tab.name;
        var bulanKey = makeBulanKeyDryRunV2_(tahun, bulan || tab.name, tab.name);
        var jumlahRaw = getDetectedCellV2_(row, tab.detectedColumns, 'jumlah');
        var amountTotal = parseEbayarAmountV2_(jumlahRaw);
        var status = (getDetectedCellV2_(row, tab.detectedColumns, 'status') || '').toString().trim().toUpperCase();
        var resitUrl = (getDetectedCellV2_(row, tab.detectedColumns, 'resit') || '').toString().trim();
        var paymentGroupId = makePaymentGroupIdDryRunV2_(sourceYear, tab.name, sourceRow);
        var sourceRowHash = makeSourceRowHashDryRunV2_(sourceYear, tab.name, sourceRow, {
          timestamp: timestamp,
          rawName: rawName,
          bulan: bulan,
          tahun: tahun,
          jumlah: jumlahRaw,
          status: status
        });
        var note = splitNames.length > 1
          ? 'Dry-run split from one source row; AMOUNT_ALLOCATED left blank.'
          : 'Dry-run only; no import/write performed.';

        sourceGroups.push({
          PAYMENT_GROUP_ID: paymentGroupId,
          SOURCE_ROW_HASH: sourceRowHash,
          SOURCE_YEAR: sourceYear,
          SOURCE_SHEET: tab.name,
          SOURCE_ROW: sourceRow
        });

        statusCounts[status || '(blank)'] = (statusCounts[status || '(blank)'] || 0) + 1;
        yearCounts[tahun || '(blank)'] = (yearCounts[tahun || '(blank)'] || 0) + splitNames.length;
        monthCounts[bulanKey || tab.name] = (monthCounts[bulanKey || tab.name] || 0) + splitNames.length;

        splitNames.forEach(function(name, nameIndex) {
          draftRows.push({
            PAYMENT_ID: paymentGroupId + '-' + (nameIndex + 1),
            PAYMENT_GROUP_ID: paymentGroupId,
            SOURCE_YEAR: sourceYear,
            SOURCE_SHEET: tab.name,
            SOURCE_ROW: sourceRow,
            SOURCE_ROW_HASH: sourceRowHash,
            TIMESTAMP: timestamp,
            TAHUN: tahun,
            BULAN: bulan,
            BULAN_KEY: bulanKey,
            NAMA_MURID_RAW: rawName,
            NAMA_MURID_NORM: name,
            JUMLAH: jumlahRaw,
            AMOUNT_TOTAL: amountTotal,
            AMOUNT_ALLOCATED: '',
            STATUS: status,
            KAEDAH: '',
            RESIT_URL: resitUrl,
            NOTE: note
          });
        });
      });
    });
  });

  var duplicateSourceRowHashes = findDuplicateKeysV2_(sourceGroups, 'SOURCE_ROW_HASH');
  var duplicatePaymentGroupIds = findDuplicateKeysV2_(sourceGroups, 'PAYMENT_GROUP_ID');
  var duplicatePaymentIds = findDuplicateKeysV2_(draftRows, 'PAYMENT_ID');

  var result = {
    success: true,
    mode: 'V2_IMPORT_DRY_RUN_READ_ONLY',
    sourceYear: requestedYear || 'ALL',
    sourceTabs: sourceTabs,
    sourceRowCount: sourceRowCount,
    generatedPaymentRows: draftRows.length,
    sourceRowHashCount: Object.keys(sourceGroups.reduce(function(acc, row) {
      if (row.SOURCE_ROW_HASH) acc[row.SOURCE_ROW_HASH] = true;
      return acc;
    }, {})).length,
    duplicateSourceRowHashes: duplicateSourceRowHashes,
    paymentGroupCount: Object.keys(sourceGroups.reduce(function(acc, row) {
      if (row.PAYMENT_GROUP_ID) acc[row.PAYMENT_GROUP_ID] = true;
      return acc;
    }, {})).length,
    duplicatePaymentGroupIds: duplicatePaymentGroupIds,
    generatedPaymentIdsCount: Object.keys(draftRows.reduce(function(acc, row) {
      if (row.PAYMENT_ID) acc[row.PAYMENT_ID] = true;
      return acc;
    }, {})).length,
    duplicatePaymentIds: duplicatePaymentIds,
    multiNameRows: multiNameRows,
    skippedRows: skippedRows,
    statusCounts: statusCounts,
    yearCounts: yearCounts,
    monthCounts: monthCounts,
    sampleDraftRows: draftRows.slice(0, 10)
  };

  if (options.includeDraftRows === true) result.draftRows = draftRows;
  return result;
}

function dryRunImportEbayarSourceV2(params) {
  params = params || {};
  try {
    return buildEbayarImportRowsDryRunV2_({
      sourceYear: params.sourceYear,
      limitRowsPerTab: params.limitRowsPerTab,
      limitSourceRows: params.limitSourceRows
    });
  } catch (err) {
    Logger.log('dryRunImportEbayarSourceV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow) {
  return [sourceYear, sourceSheet, sourceRow].map(function(value) {
    return (value === null || value === undefined) ? '' : value.toString().trim();
  }).join('|');
}

function makeEbayarSourceContentFingerprintV2_(row) {
  row = row || {};

  function normalizeTimestamp(value) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, 'Asia/Singapore', "yyyy-MM-dd'T'HH:mm:ss");
    }
    var raw = (value === null || value === undefined) ? '' : value.toString().replace(/\s+/g, ' ').trim();
    if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
      var parsed = new Date(raw);
      if (!isNaN(parsed.getTime())) {
        return Utilities.formatDate(parsed, 'Asia/Singapore', "yyyy-MM-dd'T'HH:mm:ss");
      }
    }
    return raw.toUpperCase();
  }

  var amount = parseEbayarAmountV2_(row.JUMLAH);
  var amountKey = (typeof amount === 'number' && isFinite(amount))
    ? amount.toFixed(2)
    : ((amount === null || amount === undefined) ? '' : amount.toString().replace(/\s+/g, ' ').trim().toUpperCase());
  var raw = [
    normalizeTimestamp(row.TIMESTAMP),
    normalizeYuranNameV2_(row.NAMA_MURID_RAW),
    (row.BULAN || '').toString().replace(/\s+/g, ' ').trim().toUpperCase(),
    (row.TAHUN || '').toString().replace(/[^0-9]/g, ''),
    amountKey,
    (row.STATUS || '').toString().replace(/\s+/g, ' ').trim().toUpperCase()
  ].join('|');

  try {
    if (typeof Utilities !== 'undefined' && Utilities.computeDigest) {
      var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
      return bytes.map(function(b) {
        var value = b < 0 ? b + 256 : b;
        return ('0' + value.toString(16)).slice(-2);
      }).join('');
    }
  } catch (err) {
    Logger.log('makeEbayarSourceContentFingerprintV2_ fallback: ' + err.message);
  }

  return raw;
}

function previewJuly2026CatchupV2() {
  try {
    var targetSourceYear = 2026;
    var targetSourceSheet = 'JULAI2026';
    var targetBulanKey = '2026-07';
    var draft = buildEbayarImportRowsDryRunV2_({
      sourceYear: targetSourceYear,
      includeDraftRows: true
    });
    if (!draft || !draft.success) return draft;

    var anomalies = [];
    var anomalyKeys = {};

    function addAnomaly(type, key, details) {
      var anomalyKey = type + '|' + key;
      if (anomalyKeys[anomalyKey]) return;
      anomalyKeys[anomalyKey] = true;
      var item = { type: type, key: key };
      Object.keys(details || {}).forEach(function(name) { item[name] = details[name]; });
      anomalies.push(item);
    }

    function getIndexEntry(index, key) {
      if (!index[key]) {
        index[key] = { groupIds: {}, hashes: {}, locations: {}, rowNumbers: {} };
      }
      return index[key];
    }

    function addIndexValues(entry, groupId, hash, location, rowNumber) {
      if (groupId) entry.groupIds[groupId] = true;
      if (hash) entry.hashes[hash] = true;
      if (location) entry.locations[location] = true;
      if (rowNumber) entry.rowNumbers[rowNumber] = true;
    }

    function keysOf(map) {
      return Object.keys(map || {}).sort();
    }

    var staging = getPaymentsRowsV2_();
    var existingGroups = {};
    var existingHashes = {};
    var existingLocations = {};
    var existingContentFingerprints = {};
    var highestExistingJulySourceRow = 0;

    (staging.rows || []).forEach(function(row) {
      var groupIdRaw = (row.PAYMENT_GROUP_ID || '').toString().trim();
      var groupId = groupIdRaw ? makeImportPaymentGroupIdV2_({ PAYMENT_GROUP_ID: groupIdRaw }) : '';
      var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
      var sourceYear = (row.SOURCE_YEAR || '').toString().trim();
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
      var sourceRow = (row.SOURCE_ROW || '').toString().trim();
      var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow);
      var stagingRowNumber = row._rowNumber || '';

      if (groupId) addIndexValues(getIndexEntry(existingGroups, groupId), groupId, hash, location, stagingRowNumber);
      if (hash) addIndexValues(getIndexEntry(existingHashes, hash), groupId, hash, location, stagingRowNumber);
      if (sourceYear && sourceSheet && sourceRow) {
        addIndexValues(getIndexEntry(existingLocations, location), groupId, hash, location, stagingRowNumber);
      }

      var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
      if (fingerprint) {
        addIndexValues(getIndexEntry(existingContentFingerprints, fingerprint), groupId, hash, location, stagingRowNumber);
      }

      if (hash && !groupId) {
        addAnomaly('HASH_EXISTS_GROUP_ID_MISSING', hash, {
          stagingRowNumber: stagingRowNumber,
          sourceLocation: location
        });
      }

      if (parseInt(sourceYear, 10) === targetSourceYear && sourceSheet.toUpperCase() === targetSourceSheet) {
        var numericSourceRow = parseInt(sourceRow, 10);
        if (!isNaN(numericSourceRow) && numericSourceRow > highestExistingJulySourceRow) {
          highestExistingJulySourceRow = numericSourceRow;
        }
      }
    });

    Object.keys(existingGroups).forEach(function(groupId) {
      var entry = existingGroups[groupId];
      if (keysOf(entry.hashes).length > 1) {
        addAnomaly('GROUP_ID_MULTIPLE_STAGED_HASHES', groupId, {
          stagedHashes: keysOf(entry.hashes),
          stagedLocations: keysOf(entry.locations)
        });
      }
      if (keysOf(entry.locations).length > 1) {
        addAnomaly('GROUP_ID_MULTIPLE_SOURCE_LOCATIONS', groupId, {
          stagedLocations: keysOf(entry.locations)
        });
      }
    });

    Object.keys(existingLocations).forEach(function(location) {
      var entry = existingLocations[location];
      if (keysOf(entry.groupIds).length > 1) {
        addAnomaly('DUPLICATE_STAGED_SOURCE_IDENTITY', location, {
          stagedGroupIds: keysOf(entry.groupIds),
          stagedHashes: keysOf(entry.hashes)
        });
      }
    });

    var julyDraftRows = (draft.draftRows || []).filter(function(row) {
      var sourceYear = parseInt(row.SOURCE_YEAR, 10);
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
      var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
      return sourceYear === targetSourceYear && sourceSheet === targetSourceSheet && bulanKey === targetBulanKey;
    });

    var sourceTabsMap = {};
    var groups = {};
    var sourceIdentityGroups = {};

    julyDraftRows.forEach(function(row) {
      var paymentGroupId = makeImportPaymentGroupIdV2_(row);
      var sourceYear = parseInt(row.SOURCE_YEAR, 10);
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
      var sourceRow = parseInt(row.SOURCE_ROW, 10);
      var sourceRowText = isNaN(sourceRow) ? (row.SOURCE_ROW || '').toString().trim() : sourceRow.toString();
      var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRowText);
      var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
      var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
      var status = (row.STATUS || '').toString().trim().toUpperCase();
      var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);
      var contentFingerprint = makeEbayarSourceContentFingerprintV2_(row);
      var amount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
      var numericAmount = (typeof amount === 'number' && isFinite(amount)) ? amount : null;
      var groupKey = paymentGroupId || ('SOURCE-' + location);

      sourceTabsMap[sourceSheet] = true;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          paymentGroupId: paymentGroupId,
          sourceYear: sourceYear,
          sourceSheet: sourceSheet,
          sourceRow: isNaN(sourceRow) ? sourceRowText : sourceRow,
          sourceLocation: location,
          sourceRowHash: hash,
          bulanKey: bulanKey,
          status: status,
          rawName: (row.NAMA_MURID_RAW || '').toString(),
          normalizedNamesMap: {},
          paidNamesMap: {},
          hashes: {},
          locations: {},
          statuses: {},
          amounts: {},
          contentFingerprints: {},
          childRows: 0,
          amountTotal: numericAmount,
          hasPaidStatusRows: false
        };
      }

      var group = groups[groupKey];
      group.childRows++;
      if (name) group.normalizedNamesMap[name] = true;
      if (!status || status === 'SELESAI') {
        group.hasPaidStatusRows = true;
        if (name) group.paidNamesMap[name] = true;
      }
      if (hash) group.hashes[hash] = true;
      if (location) group.locations[location] = true;
      group.statuses[status || '(blank)'] = true;
      if (numericAmount !== null) group.amounts[numericAmount.toFixed(2)] = true;
      if (contentFingerprint) group.contentFingerprints[contentFingerprint] = true;

      if (!sourceIdentityGroups[location]) sourceIdentityGroups[location] = {};
      sourceIdentityGroups[location][groupKey] = true;
    });

    Object.keys(sourceIdentityGroups).forEach(function(location) {
      var groupKeys = keysOf(sourceIdentityGroups[location]);
      if (groupKeys.length > 1) {
        addAnomaly('DUPLICATE_SOURCE_IDENTITY', location, { sourceGroupKeys: groupKeys });
      }
    });

    var unchanged = [];
    var changed = [];
    var genuinelyNew = [];
    var uniquePaidNamesMap = {};
    var projectedChildRows = 0;
    var projectedTotalAmount = 0;
    var projectedPaidStatusAmount = 0;

    function collectExistingDetails(group) {
      var stagedGroupIds = {};
      var stagedHashes = {};
      var stagedLocations = {};
      var stagedRowNumbers = {};

      function collect(entry) {
        if (!entry) return;
        keysOf(entry.groupIds).forEach(function(value) { stagedGroupIds[value] = true; });
        keysOf(entry.hashes).forEach(function(value) { stagedHashes[value] = true; });
        keysOf(entry.locations).forEach(function(value) { stagedLocations[value] = true; });
        keysOf(entry.rowNumbers).forEach(function(value) { stagedRowNumbers[value] = true; });
      }

      collect(existingGroups[group.paymentGroupId]);
      collect(existingLocations[group.sourceLocation]);
      keysOf(group.hashes).forEach(function(hash) { collect(existingHashes[hash]); });
      keysOf(group.contentFingerprints).forEach(function(fingerprint) { collect(existingContentFingerprints[fingerprint]); });
      return {
        stagedGroupIds: keysOf(stagedGroupIds),
        stagedHashes: keysOf(stagedHashes),
        stagedLocations: keysOf(stagedLocations),
        stagedRowNumbers: keysOf(stagedRowNumbers)
      };
    }

    function candidateSummary(group, classification) {
      var existing = collectExistingDetails(group);
      return {
        paymentGroupId: group.paymentGroupId,
        sourceYear: group.sourceYear,
        sourceSheet: group.sourceSheet,
        sourceRow: group.sourceRow,
        sourceRowHash: group.sourceRowHash,
        bulanKey: group.bulanKey,
        status: keysOf(group.statuses).join(', '),
        rawName: group.rawName,
        normalizedNames: keysOf(group.normalizedNamesMap),
        childRows: group.childRows,
        amountTotal: group.amountTotal,
        classification: classification,
        contentFingerprints: keysOf(group.contentFingerprints),
        existingStagedGroupIds: existing.stagedGroupIds,
        existingStagedHashes: existing.stagedHashes,
        existingStagedLocations: existing.stagedLocations,
        existingStagingRowNumbers: existing.stagedRowNumbers
      };
    }

    Object.keys(groups).sort(function(a, b) {
      var rowA = parseInt(groups[a].sourceRow, 10);
      var rowB = parseInt(groups[b].sourceRow, 10);
      if (isNaN(rowA)) rowA = Number.MAX_SAFE_INTEGER;
      if (isNaN(rowB)) rowB = Number.MAX_SAFE_INTEGER;
      return rowA - rowB || a.localeCompare(b);
    }).forEach(function(groupKey) {
      var group = groups[groupKey];
      var hashes = keysOf(group.hashes);
      var locations = keysOf(group.locations);
      var fingerprints = keysOf(group.contentFingerprints);

      if (!group.paymentGroupId) {
        addAnomaly('SOURCE_GROUP_ID_MISSING', group.sourceLocation, {});
      }
      if (hashes.length !== 1) {
        addAnomaly('SOURCE_GROUP_HASH_COUNT_INVALID', group.paymentGroupId || group.sourceLocation, { sourceHashes: hashes });
      }
      if (locations.length !== 1) {
        addAnomaly('SOURCE_GROUP_LOCATION_COUNT_INVALID', group.paymentGroupId || group.sourceLocation, { sourceLocations: locations });
      }
      if (keysOf(group.statuses).length > 1) {
        addAnomaly('SOURCE_GROUP_MULTIPLE_STATUSES', group.paymentGroupId || group.sourceLocation, { statuses: keysOf(group.statuses) });
      }
      if (keysOf(group.amounts).length > 1) {
        addAnomaly('SOURCE_GROUP_MULTIPLE_AMOUNTS', group.paymentGroupId || group.sourceLocation, { amounts: keysOf(group.amounts) });
      }
      if (group.amountTotal === null) {
        addAnomaly('SOURCE_GROUP_AMOUNT_INVALID', group.paymentGroupId || group.sourceLocation, {});
      }

      var hashExists = hashes.some(function(hash) { return !!existingHashes[hash]; });
      var groupExists = !!(group.paymentGroupId && existingGroups[group.paymentGroupId]);
      var locationExists = !!existingLocations[group.sourceLocation];
      var contentMatch = fingerprints.some(function(fingerprint) { return !!existingContentFingerprints[fingerprint]; });
      var classification;

      if (hashExists) {
        classification = 'UNCHANGED_EXISTING';
        if (!groupExists) {
          addAnomaly('HASH_EXISTS_GROUP_ID_MISSING', group.sourceRowHash, {
            candidatePaymentGroupId: group.paymentGroupId,
            sourceLocation: group.sourceLocation
          });
        }
      } else if (groupExists || locationExists) {
        classification = 'CHANGED_EXISTING_REVIEW';
      } else if (contentMatch) {
        classification = 'CHANGED_EXISTING_REVIEW';
        addAnomaly('SECONDARY_CONTENT_FINGERPRINT_MATCH', group.paymentGroupId || group.sourceLocation, {
          sourceLocation: group.sourceLocation,
          contentFingerprints: fingerprints
        });
      } else if (!group.paymentGroupId || hashes.length !== 1 || locations.length !== 1) {
        classification = 'CHANGED_EXISTING_REVIEW';
      } else {
        classification = 'GENUINELY_NEW';
      }

      var summary = candidateSummary(group, classification);
      if (classification === 'UNCHANGED_EXISTING') {
        unchanged.push(summary);
      } else if (classification === 'CHANGED_EXISTING_REVIEW') {
        changed.push(summary);
      } else {
        genuinelyNew.push(summary);
        projectedChildRows += group.childRows;
        if (group.amountTotal !== null) {
          projectedTotalAmount += group.amountTotal;
          if (group.hasPaidStatusRows) projectedPaidStatusAmount += group.amountTotal;
        }
        keysOf(group.paidNamesMap).forEach(function(name) { uniquePaidNamesMap[name] = true; });

        var numericSourceRow = parseInt(group.sourceRow, 10);
        if (!isNaN(numericSourceRow) && numericSourceRow <= highestExistingJulySourceRow) {
          addAnomaly('NEW_CANDIDATE_AT_OR_BELOW_HIGHEST_STAGED_ROW', group.paymentGroupId, {
            sourceRow: numericSourceRow,
            highestExistingJulySourceRow: highestExistingJulySourceRow
          });
        }
      }
    });

    var uniquePaidNames = keysOf(uniquePaidNamesMap);
    return {
      success: true,
      mode: 'V2_JULY_2026_CATCHUP_PREVIEW_READ_ONLY',
      sourceTabs: keysOf(sourceTabsMap),
      sourceGroupsScanned: Object.keys(groups).length,
      existingUnchangedGroups: unchanged.length,
      changedExistingGroups: changed.length,
      genuinelyNewGroups: genuinelyNew.length,
      projectedChildRows: projectedChildRows,
      uniquePaidNamesCount: uniquePaidNames.length,
      uniquePaidNames: uniquePaidNames,
      projectedTotalAmount: projectedTotalAmount,
      projectedPaidStatusAmount: projectedPaidStatusAmount,
      highestExistingJulySourceRow: highestExistingJulySourceRow,
      genuinelyNewCandidates: genuinelyNew,
      sampleNewCandidates: genuinelyNew.slice(0, 10),
      sampleChangedExistingCandidates: changed.slice(0, 10),
      anomalies: anomalies
    };
  } catch (err) {
    Logger.log('previewJuly2026CatchupV2 error: ' + err.message);
    return { success: false, mode: 'V2_JULY_2026_CATCHUP_PREVIEW_READ_ONLY', message: err.message };
  }
}

function testPreviewJuly2026CatchupV2() {
  var result = previewJuly2026CatchupV2();
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testPreviewJuly2026CatchupCompactV2() {
  var result = previewJuly2026CatchupV2();
  if (!result || result.success !== true) {
    var failure = {
      success: false,
      message: result && result.message ? result.message : 'Preview July 2026 gagal tanpa mesej.'
    };
    Logger.log(JSON.stringify(failure));
    return failure;
  }

  var anomalies = result.anomalies || [];
  var anomalyTypes = {};
  anomalies.forEach(function(anomaly) {
    var type = (anomaly && anomaly.type ? anomaly.type : '(UNKNOWN)').toString();
    anomalyTypes[type] = (anomalyTypes[type] || 0) + 1;
  });

  var candidates = (result.genuinelyNewCandidates || []).slice().sort(function(a, b) {
    var rowA = parseInt(a && a.sourceRow, 10);
    var rowB = parseInt(b && b.sourceRow, 10);
    if (isNaN(rowA)) rowA = Number.MAX_SAFE_INTEGER;
    if (isNaN(rowB)) rowB = Number.MAX_SAFE_INTEGER;
    if (rowA !== rowB) return rowA - rowB;
    return ((a && a.paymentGroupId) || '').toString().localeCompare(((b && b.paymentGroupId) || '').toString());
  });
  var numericSourceRows = candidates.map(function(candidate) {
    return parseInt(candidate && candidate.sourceRow, 10);
  }).filter(function(sourceRow) {
    return !isNaN(sourceRow);
  });
  var allRowsNumeric = numericSourceRows.length === candidates.length;
  var highestExisting = parseInt(result.highestExistingJulySourceRow, 10);
  var compact = {
    success: result.success,
    sourceGroupsScanned: result.sourceGroupsScanned,
    existingUnchangedGroups: result.existingUnchangedGroups,
    changedExistingGroups: result.changedExistingGroups,
    genuinelyNewGroups: result.genuinelyNewGroups,
    projectedChildRows: result.projectedChildRows,
    uniquePaidNamesCount: result.uniquePaidNamesCount,
    projectedTotalAmount: result.projectedTotalAmount,
    projectedPaidStatusAmount: result.projectedPaidStatusAmount,
    highestExistingJulySourceRow: result.highestExistingJulySourceRow,
    anomalyCount: anomalies.length,
    anomalyTypes: anomalyTypes,
    genuinelyNewPaymentGroupIds: candidates.map(function(candidate) { return candidate.paymentGroupId; }),
    minimumGenuinelyNewSourceRow: numericSourceRows.length ? Math.min.apply(null, numericSourceRows) : null,
    maximumGenuinelyNewSourceRow: numericSourceRows.length ? Math.max.apply(null, numericSourceRows) : null,
    allGenuinelyNewRowsAboveHighestExisting: allRowsNumeric && !isNaN(highestExisting) && candidates.every(function(candidate) {
      return parseInt(candidate.sourceRow, 10) > highestExisting;
    }),
    allClassificationsGenuinelyNew: candidates.every(function(candidate) {
      return candidate.classification === 'GENUINELY_NEW';
    }),
    changedExistingIsZero: result.changedExistingGroups === 0
  };
  Logger.log(JSON.stringify(compact));
  return compact;
}

function testJulyCatchupAnomaliesV2() {
  var result = previewJuly2026CatchupV2();
  if (!result || result.success !== true) {
    var failure = { success: false, anomalyCount: 0, anomalies: [] };
    Logger.log(JSON.stringify(failure));
    return failure;
  }

  var genuinelyNewIds = {};
  (result.genuinelyNewCandidates || []).forEach(function(candidate) {
    var groupId = (candidate.paymentGroupId || '').toString().trim();
    if (groupId) genuinelyNewIds[groupId] = true;
  });

  var targetGroupIds = {};
  (result.anomalies || []).forEach(function(anomaly) {
    if (anomaly && anomaly.type === 'GROUP_ID_MULTIPLE_STAGED_HASHES') {
      var groupId = (anomaly.key || '').toString().trim();
      if (groupId) targetGroupIds[groupId] = true;
    }
  });

  var stagedByGroupId = {};
  if (Object.keys(targetGroupIds).length) {
    var staging = getPaymentsRowsV2_();
    (staging.rows || []).forEach(function(row) {
      var rawGroupId = (row.PAYMENT_GROUP_ID || '').toString().trim();
      var groupId = rawGroupId ? makeImportPaymentGroupIdV2_({ PAYMENT_GROUP_ID: rawGroupId }) : '';
      if (!targetGroupIds[groupId]) return;
      if (!stagedByGroupId[groupId]) {
        stagedByGroupId[groupId] = {
          hashes: {},
          locations: {},
          stagingRowNumbers: {},
          sourceYears: {},
          sourceSheets: {},
          sourceRows: {}
        };
      }
      var entry = stagedByGroupId[groupId];
      var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
      var sourceYear = (row.SOURCE_YEAR || '').toString().trim();
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
      var sourceRow = (row.SOURCE_ROW || '').toString().trim();
      var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow);
      if (hash) entry.hashes[hash] = true;
      if (sourceYear && sourceSheet && sourceRow) entry.locations[location] = true;
      if (row._rowNumber) entry.stagingRowNumbers[row._rowNumber] = true;
      if (sourceYear) entry.sourceYears[sourceYear] = true;
      if (sourceSheet) entry.sourceSheets[sourceSheet] = true;
      if (sourceRow) entry.sourceRows[sourceRow] = true;
    });
  }

  function sortedKeys(map, numeric) {
    return Object.keys(map || {}).sort(numeric
      ? function(a, b) { return parseInt(a, 10) - parseInt(b, 10); }
      : undefined);
  }

  var anomalies = (result.anomalies || []).map(function(anomaly) {
    if (!anomaly || anomaly.type !== 'GROUP_ID_MULTIPLE_STAGED_HASHES') return anomaly;
    var paymentGroupId = (anomaly.key || '').toString().trim();
    var entry = stagedByGroupId[paymentGroupId] || {
      hashes: {}, locations: {}, stagingRowNumbers: {}, sourceYears: {}, sourceSheets: {}, sourceRows: {}
    };
    var sourceYears = sortedKeys(entry.sourceYears, true);
    var sourceSheets = sortedKeys(entry.sourceSheets, false);
    var sourceRows = sortedKeys(entry.sourceRows, true).map(function(value) { return parseInt(value, 10); });
    var belongsToSourceYear2026 = sourceYears.some(function(value) { return parseInt(value, 10) === 2026; });
    var belongsToSourceSheetJulai2026 = sourceSheets.some(function(value) {
      return value.toUpperCase() === 'JULAI2026';
    });
    var appearsInGenuinelyNewCandidates = !!genuinelyNewIds[paymentGroupId];
    var sourceRowAtOrBelow33 = sourceRows.length > 0 && sourceRows.every(function(value) {
      return !isNaN(value) && value <= 33;
    });
    var canAffectCandidateSourceRows34To72 = appearsInGenuinelyNewCandidates || sourceRows.some(function(value) {
      return !isNaN(value) && value >= 34 && value <= 72;
    });

    return {
      type: anomaly.type,
      key: anomaly.key,
      paymentGroupId: paymentGroupId,
      stagedHashes: anomaly.stagedHashes || sortedKeys(entry.hashes, false),
      stagedLocations: anomaly.stagedLocations || sortedKeys(entry.locations, false),
      stagingRowNumbers: sortedKeys(entry.stagingRowNumbers, true).map(function(value) { return parseInt(value, 10); }),
      sourceYears: sourceYears,
      sourceSheets: sourceSheets,
      sourceRows: sourceRows,
      belongsToSourceYear2026: belongsToSourceYear2026,
      belongsToSourceSheetJulai2026: belongsToSourceSheetJulai2026,
      belongsToJuly2026Source: belongsToSourceYear2026 && belongsToSourceSheetJulai2026,
      sourceRowAtOrBelow33: sourceRowAtOrBelow33,
      appearsInGenuinelyNewCandidates: appearsInGenuinelyNewCandidates,
      canAffectCandidateSourceRows34To72: canAffectCandidateSourceRows34To72
    };
  });
  var output = {
    success: true,
    anomalyCount: anomalies.length,
    anomalies: anomalies
  };
  Logger.log(JSON.stringify(output));
  return output;
}

function importJuly2026CatchupGuardedV2(params) {
  params = params || {};
  var allowWrite = params.allowWrite === true;
  var mode = allowWrite
    ? 'V2_JULY_2026_CATCHUP_GUARDED_WRITE'
    : 'V2_JULY_2026_CATCHUP_GUARDED_PREVIEW_READ_ONLY';

  try {
    if (!Array.isArray(params.paymentGroupIds) || !params.paymentGroupIds.length) {
      return { success: false, mode: mode, message: 'paymentGroupIds mesti senarai yang tidak kosong.' };
    }
    if (params.paymentGroupIds.length > 25) {
      return { success: false, mode: mode, message: 'Safety limit: maksimum 25 paymentGroupIds setiap batch.' };
    }

    var requestedGroupIds = [];
    var requestedIdSet = {};
    var requestedSourceRows = {};
    var invalidGroupIds = [];
    var duplicateGroupIds = [];
    params.paymentGroupIds.forEach(function(value) {
      var groupId = (value || '').toString().trim();
      var match = groupId.match(/^PG-2026-JULAI2026-(\d+)$/);
      var sourceRow = match ? parseInt(match[1], 10) : NaN;
      if (!match || isNaN(sourceRow) || sourceRow < 34 || sourceRow > 72) {
        invalidGroupIds.push(groupId);
        return;
      }
      if (requestedIdSet[groupId]) {
        duplicateGroupIds.push(groupId);
        return;
      }
      requestedIdSet[groupId] = true;
      requestedSourceRows[groupId] = sourceRow;
      requestedGroupIds.push(groupId);
    });

    if (invalidGroupIds.length) {
      return {
        success: false,
        mode: mode,
        message: 'Payment group ID tidak sah atau SOURCE_ROW di luar 34-72.',
        invalidGroupIds: invalidGroupIds
      };
    }
    if (duplicateGroupIds.length) {
      return {
        success: false,
        mode: mode,
        message: 'paymentGroupIds mengandungi ID pendua.',
        duplicateGroupIds: duplicateGroupIds
      };
    }
    requestedGroupIds.sort(function(a, b) { return requestedSourceRows[a] - requestedSourceRows[b]; });

    var preview = previewJuly2026CatchupV2();
    if (!preview || preview.success !== true) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: preview && preview.message ? preview.message : 'Preview July 2026 gagal.'
      };
    }
    if (preview.changedExistingGroups !== 0) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: changedExistingGroups mesti 0.',
        changedExistingGroups: preview.changedExistingGroups
      };
    }

    var previewCandidates = {};
    (preview.genuinelyNewCandidates || []).forEach(function(candidate) {
      var groupId = (candidate.paymentGroupId || '').toString().trim();
      if (groupId) previewCandidates[groupId] = candidate;
    });
    var missingFromPreview = requestedGroupIds.filter(function(groupId) { return !previewCandidates[groupId]; });
    if (missingFromPreview.length) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: ID bukan lagi GENUINELY_NEW dalam preview semasa.',
        missingFromPreview: missingFromPreview
      };
    }

    var draft = buildEbayarImportRowsDryRunV2_({ sourceYear: 2026, includeDraftRows: true });
    if (!draft || draft.success !== true) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: draft && draft.message ? draft.message : 'Draft July 2026 gagal dibina.'
      };
    }

    function mapKeys(map) {
      return Object.keys(map || {}).sort();
    }

    var currentGroups = {};
    (draft.draftRows || []).forEach(function(row) {
      var sourceYear = parseInt(row.SOURCE_YEAR, 10);
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
      var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
      if (sourceYear !== 2026 || sourceSheet !== 'JULAI2026' || bulanKey !== '2026-07') return;

      var groupId = makeImportPaymentGroupIdV2_(row);
      if (!requestedIdSet[groupId]) return;
      if (!currentGroups[groupId]) {
        currentGroups[groupId] = {
          paymentGroupId: groupId,
          sourceYear: sourceYear,
          sourceSheet: (row.SOURCE_SHEET || '').toString().trim(),
          sourceRow: parseInt(row.SOURCE_ROW, 10),
          rows: [],
          hashes: {},
          locations: {},
          fingerprints: {},
          amounts: {},
          statuses: {},
          normalizedNames: {},
          paidNames: {}
        };
      }

      var group = currentGroups[groupId];
      var sourceRowText = isNaN(group.sourceRow) ? (row.SOURCE_ROW || '').toString().trim() : group.sourceRow.toString();
      var location = makeEbayarSourceLocationKeyV2_(sourceYear, group.sourceSheet, sourceRowText);
      var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
      var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
      var amount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
      var status = (row.STATUS || '').toString().trim().toUpperCase();
      var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);

      group.rows.push(row);
      if (hash) group.hashes[hash] = true;
      if (location) group.locations[location] = true;
      if (fingerprint) group.fingerprints[fingerprint] = true;
      if (typeof amount === 'number' && isFinite(amount)) group.amounts[amount.toFixed(2)] = true;
      group.statuses[status || '(blank)'] = true;
      if (name) group.normalizedNames[name] = true;
      if ((!status || status === 'SELESAI') && name) group.paidNames[name] = true;
    });

    var draftValidationErrors = [];
    requestedGroupIds.forEach(function(groupId) {
      var group = currentGroups[groupId];
      var previewCandidate = previewCandidates[groupId];
      if (!group) {
        draftValidationErrors.push({ paymentGroupId: groupId, reason: 'CURRENT_JULY_DRAFT_GROUP_MISSING' });
        return;
      }
      var hashes = mapKeys(group.hashes);
      var locations = mapKeys(group.locations);
      var fingerprints = mapKeys(group.fingerprints);
      var amounts = mapKeys(group.amounts);
      if (hashes.length !== 1 || locations.length !== 1 || fingerprints.length !== 1 || amounts.length !== 1) {
        draftValidationErrors.push({
          paymentGroupId: groupId,
          reason: 'CURRENT_JULY_DRAFT_GROUP_INCONSISTENT',
          hashes: hashes,
          locations: locations,
          fingerprints: fingerprints,
          amounts: amounts
        });
        return;
      }
      if (previewCandidate.sourceRowHash !== hashes[0] ||
          (previewCandidate.contentFingerprints || []).indexOf(fingerprints[0]) === -1) {
        draftValidationErrors.push({
          paymentGroupId: groupId,
          reason: 'CURRENT_DRAFT_CHANGED_AFTER_PREVIEW',
          previewSourceRowHash: previewCandidate.sourceRowHash,
          currentSourceRowHash: hashes[0],
          currentContentFingerprint: fingerprints[0]
        });
      }
    });
    if (draftValidationErrors.length) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: draft July semasa gagal validasi.',
        conflicts: draftValidationErrors
      };
    }

    var selectedDraftRows = [];
    var uniquePaidNamesMap = {};
    var totalAmount = 0;
    requestedGroupIds.forEach(function(groupId) {
      var group = currentGroups[groupId];
      group.rows.forEach(function(row) { selectedDraftRows.push(row); });
      mapKeys(group.paidNames).forEach(function(name) { uniquePaidNamesMap[name] = true; });
      totalAmount += parseFloat(mapKeys(group.amounts)[0]);
    });
    var uniquePaidNames = mapKeys(uniquePaidNamesMap);
    var firstSourceRow = requestedSourceRows[requestedGroupIds[0]];
    var lastSourceRow = requestedSourceRows[requestedGroupIds[requestedGroupIds.length - 1]];

    function recheckCurrentStaging() {
      var staging = getPaymentsRowsV2_();
      var existingGroupIds = {};
      var existingLocations = {};
      var existingHashes = {};
      var existingFingerprints = {};

      (staging.rows || []).forEach(function(row) {
        var rawGroupId = (row.PAYMENT_GROUP_ID || '').toString().trim();
        var groupId = rawGroupId ? makeImportPaymentGroupIdV2_({ PAYMENT_GROUP_ID: rawGroupId }) : '';
        var sourceYear = (row.SOURCE_YEAR || '').toString().trim();
        var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
        var sourceRow = (row.SOURCE_ROW || '').toString().trim();
        var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow);
        var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
        var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
        if (groupId) existingGroupIds[groupId] = true;
        if (sourceYear && sourceSheet && sourceRow) existingLocations[location] = true;
        if (hash) existingHashes[hash] = true;
        if (fingerprint) existingFingerprints[fingerprint] = true;
      });

      var conflicts = [];
      requestedGroupIds.forEach(function(groupId) {
        var group = currentGroups[groupId];
        var matchingKeys = [];
        if (existingGroupIds[groupId]) matchingKeys.push('PAYMENT_GROUP_ID');
        mapKeys(group.locations).forEach(function(location) {
          if (existingLocations[location]) matchingKeys.push('SOURCE_LOCATION');
        });
        mapKeys(group.hashes).forEach(function(hash) {
          if (existingHashes[hash]) matchingKeys.push('SOURCE_ROW_HASH');
        });
        mapKeys(group.fingerprints).forEach(function(fingerprint) {
          if (existingFingerprints[fingerprint]) matchingKeys.push('SECONDARY_CONTENT_FINGERPRINT');
        });
        if (matchingKeys.length) {
          conflicts.push({
            paymentGroupId: groupId,
            sourceYear: group.sourceYear,
            sourceSheet: group.sourceSheet,
            sourceRow: group.sourceRow,
            sourceRowHashes: mapKeys(group.hashes),
            sourceLocations: mapKeys(group.locations),
            contentFingerprints: mapKeys(group.fingerprints),
            matchingKeys: matchingKeys
          });
        }
      });
      return { conflicts: conflicts };
    }

    if (!allowWrite) {
      var previewRecheck = recheckCurrentStaging();
      if (previewRecheck.conflicts.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Preview guarded gagal: konflik staging dijumpai.',
          conflicts: previewRecheck.conflicts
        };
      }
      return {
        success: true,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        appendableGroups: requestedGroupIds.length,
        projectedChildRows: selectedDraftRows.length,
        projectedUniquePaidNames: uniquePaidNames,
        projectedTotalAmount: totalAmount,
        firstSourceRow: firstSourceRow,
        lastSourceRow: lastSourceRow,
        appendedGroups: 0,
        appendedChildRows: 0,
        appendedUniquePaidNames: [],
        appendedTotalAmount: 0
      };
    }

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: gagal mendapatkan script lock.'
      };
    }

    try {
      var ss = getEbayarMasterSpreadsheetForImportV2_();
      var sheet = ss.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
      if (!sheet) {
        return { success: false, mode: mode, requestedGroupIds: requestedGroupIds, message: 'Payments tab tidak dijumpai.' };
      }
      var headerIndex = getPaymentsHeaderIndexV2_(sheet);
      var requiredHeaders = [
        'PAYMENT_ID', 'PAYMENT_GROUP_ID', 'SOURCE_YEAR', 'SOURCE_SHEET', 'SOURCE_ROW', 'SOURCE_ROW_HASH'
      ];
      var missingHeaders = requiredHeaders.filter(function(header) {
        return headerIndex[header] === undefined || headerIndex[header] === null;
      });
      if (missingHeaders.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Header Payments hilang.',
          missingHeaders: missingHeaders
        };
      }

      var freshDraft = buildEbayarImportRowsDryRunV2_({ sourceYear: 2026, includeDraftRows: true });
      var sourceWindowConflicts = [];
      var freshGroups = {};
      if (!freshDraft || freshDraft.success !== true) {
        sourceWindowConflicts.push({
          reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
          detail: freshDraft && freshDraft.message ? freshDraft.message : 'Fresh post-lock draft gagal dibina.'
        });
      } else {
        (freshDraft.draftRows || []).forEach(function(row) {
          var sourceYear = parseInt(row.SOURCE_YEAR, 10);
          var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
          var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
          if (sourceYear !== 2026 || sourceSheet !== 'JULAI2026' || bulanKey !== '2026-07') return;

          var groupId = makeImportPaymentGroupIdV2_(row);
          if (!requestedIdSet[groupId]) return;
          if (!freshGroups[groupId]) {
            freshGroups[groupId] = {
              paymentGroupId: groupId,
              sourceYear: sourceYear,
              sourceSheet: (row.SOURCE_SHEET || '').toString().trim(),
              sourceRow: parseInt(row.SOURCE_ROW, 10),
              rows: [],
              hashes: {},
              locations: {},
              fingerprints: {},
              amounts: {},
              statuses: {},
              normalizedNames: {},
              paidNames: {}
            };
          }

          var freshGroup = freshGroups[groupId];
          var sourceRowText = isNaN(freshGroup.sourceRow)
            ? (row.SOURCE_ROW || '').toString().trim()
            : freshGroup.sourceRow.toString();
          var location = makeEbayarSourceLocationKeyV2_(sourceYear, freshGroup.sourceSheet, sourceRowText);
          var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
          var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
          var amount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
          var status = (row.STATUS || '').toString().trim().toUpperCase();
          var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);

          freshGroup.rows.push(row);
          if (hash) freshGroup.hashes[hash] = true;
          if (location) freshGroup.locations[location] = true;
          if (fingerprint) freshGroup.fingerprints[fingerprint] = true;
          if (typeof amount === 'number' && isFinite(amount)) freshGroup.amounts[amount.toFixed(2)] = true;
          freshGroup.statuses[status || '(blank)'] = true;
          if (name) freshGroup.normalizedNames[name] = true;
          if ((!status || status === 'SELESAI') && name) freshGroup.paidNames[name] = true;
        });
      }

      function sameKeySet(left, right) {
        var leftKeys = mapKeys(left);
        var rightKeys = mapKeys(right);
        return leftKeys.length === rightKeys.length && leftKeys.every(function(value, index) {
          return value === rightKeys[index];
        });
      }

      requestedGroupIds.forEach(function(groupId) {
        var before = currentGroups[groupId];
        var fresh = freshGroups[groupId];
        if (!before || !fresh) {
          sourceWindowConflicts.push({
            paymentGroupId: groupId,
            reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
            detail: !fresh ? 'REQUESTED_GROUP_MISSING_FROM_FRESH_DRAFT' : 'PRE_LOCK_GROUP_MISSING'
          });
          return;
        }

        var freshValid = mapKeys(fresh.hashes).length === 1 &&
          mapKeys(fresh.locations).length === 1 &&
          mapKeys(fresh.fingerprints).length === 1 &&
          mapKeys(fresh.amounts).length === 1 &&
          fresh.rows.length > 0;
        var differences = [];
        if (!freshValid) differences.push('FRESH_GROUP_INVALID');
        if (!sameKeySet(before.hashes, fresh.hashes)) differences.push('SOURCE_ROW_HASH');
        if (!sameKeySet(before.locations, fresh.locations)) differences.push('SOURCE_LOCATION');
        if (!sameKeySet(before.fingerprints, fresh.fingerprints)) differences.push('SECONDARY_CONTENT_FINGERPRINT');
        if (before.rows.length !== fresh.rows.length) differences.push('CHILD_ROW_COUNT');
        if (!sameKeySet(before.amounts, fresh.amounts)) differences.push('AMOUNT');
        if (!sameKeySet(before.statuses, fresh.statuses)) differences.push('STATUS_SET');
        if (!sameKeySet(before.normalizedNames, fresh.normalizedNames)) differences.push('NORMALIZED_NAME_SET');

        if (differences.length) {
          sourceWindowConflicts.push({
            paymentGroupId: groupId,
            reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
            differences: differences,
            before: {
              sourceRowHashes: mapKeys(before.hashes),
              sourceLocations: mapKeys(before.locations),
              contentFingerprints: mapKeys(before.fingerprints),
              childRows: before.rows.length,
              amounts: mapKeys(before.amounts),
              statuses: mapKeys(before.statuses),
              normalizedNames: mapKeys(before.normalizedNames)
            },
            fresh: {
              sourceRowHashes: mapKeys(fresh.hashes),
              sourceLocations: mapKeys(fresh.locations),
              contentFingerprints: mapKeys(fresh.fingerprints),
              childRows: fresh.rows.length,
              amounts: mapKeys(fresh.amounts),
              statuses: mapKeys(fresh.statuses),
              normalizedNames: mapKeys(fresh.normalizedNames)
            }
          });
        }
      });

      if (Object.keys(freshGroups).length !== requestedGroupIds.length) {
        sourceWindowConflicts.push({
          reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
          detail: 'FRESH_GROUP_COUNT_MISMATCH',
          requestedGroupCount: requestedGroupIds.length,
          freshGroupCount: Object.keys(freshGroups).length
        });
      }

      var freshSelectedDraftRows = [];
      var freshUniquePaidNamesMap = {};
      var freshTotalAmount = 0;
      requestedGroupIds.forEach(function(groupId) {
        var fresh = freshGroups[groupId];
        if (!fresh) return;
        fresh.rows.forEach(function(row) { freshSelectedDraftRows.push(row); });
        mapKeys(fresh.paidNames).forEach(function(name) { freshUniquePaidNamesMap[name] = true; });
        var amountKeys = mapKeys(fresh.amounts);
        if (amountKeys.length === 1) freshTotalAmount += parseFloat(amountKeys[0]);
      });
      if (!freshSelectedDraftRows.length || Object.keys(freshGroups).length !== requestedGroupIds.length) {
        sourceWindowConflicts.push({
          reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
          detail: 'FRESH_SELECTED_ROWS_EMPTY_OR_GROUP_COUNT_MISMATCH',
          freshSelectedChildRows: freshSelectedDraftRows.length,
          requestedGroupCount: requestedGroupIds.length,
          freshGroupCount: Object.keys(freshGroups).length
        });
      }

      if (sourceWindowConflicts.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Catch-up dibatalkan sepenuhnya: sumber July berubah semasa write window.',
          conflicts: sourceWindowConflicts,
          appendedGroups: 0,
          appendedChildRows: 0
        };
      }

      currentGroups = freshGroups;
      selectedDraftRows = freshSelectedDraftRows;
      uniquePaidNames = mapKeys(freshUniquePaidNamesMap);
      totalAmount = freshTotalAmount;

      var finalRecheck = recheckCurrentStaging();
      if (finalRecheck.conflicts.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Catch-up dibatalkan sepenuhnya: konflik staging dijumpai semasa final recheck.',
          conflicts: finalRecheck.conflicts,
          appendedGroups: 0,
          appendedChildRows: 0
        };
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
        return (header || '').toString().trim();
      });
      var timestampNow = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
      var rowsToAppend = selectedDraftRows.map(function(row) {
        return mapDraftPaymentToMasterRowV2_(row, headerIndex, headers, timestampNow);
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);

      return {
        success: true,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        appendedGroups: requestedGroupIds.length,
        appendedChildRows: rowsToAppend.length,
        appendedUniquePaidNames: uniquePaidNames,
        appendedTotalAmount: totalAmount,
        firstSourceRow: firstSourceRow,
        lastSourceRow: lastSourceRow
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log('importJuly2026CatchupGuardedV2 error: ' + err.message);
    return { success: false, mode: mode, message: err.message };
  }
}

function testImportJuly2026CatchupBatch1PreviewV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 34; sourceRow <= 58; sourceRow++) {
    paymentGroupIds.push('PG-2026-JULAI2026-' + sourceRow);
  }
  var result = importJuly2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: false });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportJuly2026CatchupBatch2PreviewV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 59; sourceRow <= 72; sourceRow++) {
    paymentGroupIds.push('PG-2026-JULAI2026-' + sourceRow);
  }
  var result = importJuly2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: false });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportJuly2026CatchupBatch1WriteV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 34; sourceRow <= 58; sourceRow++) {
    paymentGroupIds.push('PG-2026-JULAI2026-' + sourceRow);
  }
  var result = importJuly2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: true });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportJuly2026CatchupBatch2WriteV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 59; sourceRow <= 72; sourceRow++) {
    paymentGroupIds.push('PG-2026-JULAI2026-' + sourceRow);
  }
  var result = importJuly2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: true });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function runJulyCatchupBatch2SafeV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 59; sourceRow <= 72; sourceRow++) {
    paymentGroupIds.push('PG-2026-JULAI2026-' + sourceRow);
  }

  var previewBefore = importJuly2026CatchupGuardedV2({
    paymentGroupIds: paymentGroupIds,
    allowWrite: false
  });
  var previewMatches = previewBefore &&
    previewBefore.success === true &&
    previewBefore.appendableGroups === 14 &&
    previewBefore.projectedChildRows === 23 &&
    previewBefore.projectedTotalAmount === 720 &&
    previewBefore.firstSourceRow === 59 &&
    previewBefore.lastSourceRow === 72 &&
    previewBefore.appendedGroups === 0 &&
    previewBefore.appendedChildRows === 0;

  if (!previewMatches) {
    var previewFailure = {
      success: false,
      mode: 'V2_JULY_BATCH2_ONE_CLICK_ABORTED',
      preview: previewBefore,
      reason: 'PREVIEW_VALUES_DO_NOT_MATCH_EXPECTED_BATCH2'
    };
    Logger.log(JSON.stringify(previewFailure));
    return previewFailure;
  }

  var writeResult = importJuly2026CatchupGuardedV2({
    paymentGroupIds: paymentGroupIds,
    allowWrite: true
  });
  var writeMatches = writeResult &&
    writeResult.success === true &&
    writeResult.appendedGroups === 14 &&
    writeResult.appendedChildRows === 23 &&
    writeResult.appendedTotalAmount === 720 &&
    writeResult.firstSourceRow === 59 &&
    writeResult.lastSourceRow === 72;

  if (!writeMatches) {
    var writeFailure = {
      success: false,
      mode: 'V2_JULY_BATCH2_ONE_CLICK_WRITE_FAILED',
      previewBefore: previewBefore,
      writeResult: writeResult,
      postWrite: null
    };
    Logger.log(JSON.stringify(writeFailure));
    return writeFailure;
  }

  var postWriteResult = previewJuly2026CatchupV2();
  var postWrite = {
    success: postWriteResult && postWriteResult.success,
    sourceGroupsScanned: postWriteResult && postWriteResult.sourceGroupsScanned,
    existingUnchangedGroups: postWriteResult && postWriteResult.existingUnchangedGroups,
    changedExistingGroups: postWriteResult && postWriteResult.changedExistingGroups,
    genuinelyNewGroups: postWriteResult && postWriteResult.genuinelyNewGroups,
    projectedChildRows: postWriteResult && postWriteResult.projectedChildRows,
    projectedTotalAmount: postWriteResult && postWriteResult.projectedTotalAmount,
    highestExistingJulySourceRow: postWriteResult && postWriteResult.highestExistingJulySourceRow,
    anomalyCount: postWriteResult && Array.isArray(postWriteResult.anomalies)
      ? postWriteResult.anomalies.length
      : 0
  };
  var finalSuccess = postWrite.success === true &&
    postWrite.genuinelyNewGroups === 0 &&
    postWrite.projectedChildRows === 0 &&
    postWrite.projectedTotalAmount === 0 &&
    postWrite.changedExistingGroups === 0;
  var output = {
    success: finalSuccess,
    mode: finalSuccess
      ? 'V2_JULY_BATCH2_ONE_CLICK_COMPLETED'
      : 'V2_JULY_BATCH2_ONE_CLICK_POST_WRITE_VERIFICATION_FAILED',
    previewBefore: previewBefore,
    writeResult: writeResult,
    postWrite: postWrite
  };
  Logger.log(JSON.stringify(output));
  return output;
}

function previewAugust2026CatchupV2() {
  try {
    var targetSourceYear = 2026;
    var targetSourceSheet = 'OGOS2026';
    var targetBulanKey = '2026-08';
    var draft = buildEbayarImportRowsDryRunV2_({
      sourceYear: targetSourceYear,
      includeDraftRows: true
    });
    if (!draft || !draft.success) return draft;

    var anomalies = [];
    var anomalyKeys = {};

    function addAnomaly(type, key, details) {
      var anomalyKey = type + '|' + key;
      if (anomalyKeys[anomalyKey]) return;
      anomalyKeys[anomalyKey] = true;
      var item = { type: type, key: key };
      Object.keys(details || {}).forEach(function(name) { item[name] = details[name]; });
      anomalies.push(item);
    }

    function getIndexEntry(index, key) {
      if (!index[key]) {
        index[key] = { groupIds: {}, hashes: {}, locations: {}, rowNumbers: {} };
      }
      return index[key];
    }

    function addIndexValues(entry, groupId, hash, location, rowNumber) {
      if (groupId) entry.groupIds[groupId] = true;
      if (hash) entry.hashes[hash] = true;
      if (location) entry.locations[location] = true;
      if (rowNumber) entry.rowNumbers[rowNumber] = true;
    }

    function keysOf(map) {
      return Object.keys(map || {}).sort();
    }

    var staging = getPaymentsRowsV2_();
    var existingGroups = {};
    var existingHashes = {};
    var existingLocations = {};
    var existingContentFingerprints = {};
    var highestExistingAugustSourceRow = 0;

    (staging.rows || []).forEach(function(row) {
      var groupIdRaw = (row.PAYMENT_GROUP_ID || '').toString().trim();
      var groupId = groupIdRaw ? makeImportPaymentGroupIdV2_({ PAYMENT_GROUP_ID: groupIdRaw }) : '';
      var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
      var sourceYear = (row.SOURCE_YEAR || '').toString().trim();
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
      var sourceRow = (row.SOURCE_ROW || '').toString().trim();
      var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow);
      var stagingRowNumber = row._rowNumber || '';

      if (groupId) addIndexValues(getIndexEntry(existingGroups, groupId), groupId, hash, location, stagingRowNumber);
      if (hash) addIndexValues(getIndexEntry(existingHashes, hash), groupId, hash, location, stagingRowNumber);
      if (sourceYear && sourceSheet && sourceRow) {
        addIndexValues(getIndexEntry(existingLocations, location), groupId, hash, location, stagingRowNumber);
      }

      var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
      if (fingerprint) {
        addIndexValues(getIndexEntry(existingContentFingerprints, fingerprint), groupId, hash, location, stagingRowNumber);
      }

      if (parseInt(sourceYear, 10) === targetSourceYear && sourceSheet.toUpperCase() === targetSourceSheet) {
        var numericSourceRow = parseInt(sourceRow, 10);
        if (!isNaN(numericSourceRow) && numericSourceRow > highestExistingAugustSourceRow) {
          highestExistingAugustSourceRow = numericSourceRow;
        }
      }
    });

    Object.keys(existingGroups).forEach(function(groupId) {
      var entry = existingGroups[groupId];
      if (keysOf(entry.hashes).length > 1) {
        addAnomaly('GROUP_ID_MULTIPLE_STAGED_HASHES', groupId, {
          stagedHashes: keysOf(entry.hashes),
          stagedLocations: keysOf(entry.locations)
        });
      }
    });

    Object.keys(existingLocations).forEach(function(location) {
      var entry = existingLocations[location];
      if (keysOf(entry.groupIds).length > 1) {
        addAnomaly('DUPLICATE_STAGED_SOURCE_IDENTITY', location, {
          stagedGroupIds: keysOf(entry.groupIds),
          stagedHashes: keysOf(entry.hashes)
        });
      }
    });

    var augustDraftRows = (draft.draftRows || []).filter(function(row) {
      var sourceYear = parseInt(row.SOURCE_YEAR, 10);
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
      var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
      return sourceYear === targetSourceYear && sourceSheet === targetSourceSheet && bulanKey === targetBulanKey;
    });

    var sourceTabsMap = {};
    var groups = {};
    var sourceIdentityGroups = {};

    augustDraftRows.forEach(function(row) {
      var paymentGroupId = makeImportPaymentGroupIdV2_(row);
      var sourceYear = parseInt(row.SOURCE_YEAR, 10);
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
      var sourceRow = parseInt(row.SOURCE_ROW, 10);
      var sourceRowText = isNaN(sourceRow) ? (row.SOURCE_ROW || '').toString().trim() : sourceRow.toString();
      var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRowText);
      var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
      var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
      var status = (row.STATUS || '').toString().trim().toUpperCase();
      var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);
      var contentFingerprint = makeEbayarSourceContentFingerprintV2_(row);
      var amount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
      var numericAmount = (typeof amount === 'number' && isFinite(amount)) ? amount : null;
      var groupKey = paymentGroupId || ('SOURCE-' + location);

      sourceTabsMap[sourceSheet] = true;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          paymentGroupId: paymentGroupId,
          sourceYear: sourceYear,
          sourceSheet: sourceSheet,
          sourceRow: isNaN(sourceRow) ? sourceRowText : sourceRow,
          sourceLocation: location,
          sourceRowHash: hash,
          bulanKey: bulanKey,
          rawName: (row.NAMA_MURID_RAW || '').toString(),
          normalizedNamesMap: {},
          paidNamesMap: {},
          hashes: {},
          locations: {},
          statuses: {},
          amounts: {},
          contentFingerprints: {},
          childRows: 0,
          amountTotal: numericAmount,
          hasPaidStatusRows: false
        };
      }

      var group = groups[groupKey];
      group.childRows++;
      if (name) group.normalizedNamesMap[name] = true;
      if (!status || status === 'SELESAI') {
        group.hasPaidStatusRows = true;
        if (name) group.paidNamesMap[name] = true;
      }
      if (hash) group.hashes[hash] = true;
      if (location) group.locations[location] = true;
      group.statuses[status || '(blank)'] = true;
      if (numericAmount !== null) group.amounts[numericAmount.toFixed(2)] = true;
      if (contentFingerprint) group.contentFingerprints[contentFingerprint] = true;

      if (!sourceIdentityGroups[location]) sourceIdentityGroups[location] = {};
      sourceIdentityGroups[location][groupKey] = true;
    });

    Object.keys(sourceIdentityGroups).forEach(function(location) {
      var groupKeys = keysOf(sourceIdentityGroups[location]);
      if (groupKeys.length > 1) {
        addAnomaly('DUPLICATE_SOURCE_IDENTITY', location, { sourceGroupKeys: groupKeys });
      }
    });

    var unchanged = [];
    var changed = [];
    var genuinelyNew = [];
    var uniquePaidNamesMap = {};
    var projectedChildRows = 0;
    var projectedTotalAmount = 0;
    var projectedPaidStatusAmount = 0;

    function collectExistingDetails(group) {
      var stagedGroupIds = {};
      var stagedHashes = {};
      var stagedLocations = {};
      var stagedRowNumbers = {};

      function collect(entry) {
        if (!entry) return;
        keysOf(entry.groupIds).forEach(function(value) { stagedGroupIds[value] = true; });
        keysOf(entry.hashes).forEach(function(value) { stagedHashes[value] = true; });
        keysOf(entry.locations).forEach(function(value) { stagedLocations[value] = true; });
        keysOf(entry.rowNumbers).forEach(function(value) { stagedRowNumbers[value] = true; });
      }

      collect(existingGroups[group.paymentGroupId]);
      collect(existingLocations[group.sourceLocation]);
      keysOf(group.hashes).forEach(function(hash) { collect(existingHashes[hash]); });
      keysOf(group.contentFingerprints).forEach(function(fingerprint) { collect(existingContentFingerprints[fingerprint]); });
      return {
        stagedGroupIds: keysOf(stagedGroupIds),
        stagedHashes: keysOf(stagedHashes),
        stagedLocations: keysOf(stagedLocations),
        stagedRowNumbers: keysOf(stagedRowNumbers)
      };
    }

    function candidateSummary(group, classification) {
      var existing = collectExistingDetails(group);
      return {
        paymentGroupId: group.paymentGroupId,
        sourceYear: group.sourceYear,
        sourceSheet: group.sourceSheet,
        sourceRow: group.sourceRow,
        sourceRowHash: group.sourceRowHash,
        bulanKey: group.bulanKey,
        statuses: keysOf(group.statuses),
        rawName: group.rawName,
        normalizedNames: keysOf(group.normalizedNamesMap),
        childRows: group.childRows,
        amountTotal: group.amountTotal,
        sourceLocation: group.sourceLocation,
        contentFingerprints: keysOf(group.contentFingerprints),
        classification: classification,
        existingStagedGroupIds: existing.stagedGroupIds,
        existingStagedHashes: existing.stagedHashes,
        existingStagedLocations: existing.stagedLocations,
        existingStagingRowNumbers: existing.stagedRowNumbers
      };
    }

    Object.keys(groups).sort(function(a, b) {
      var rowA = parseInt(groups[a].sourceRow, 10);
      var rowB = parseInt(groups[b].sourceRow, 10);
      if (isNaN(rowA)) rowA = Number.MAX_SAFE_INTEGER;
      if (isNaN(rowB)) rowB = Number.MAX_SAFE_INTEGER;
      return rowA - rowB || a.localeCompare(b);
    }).forEach(function(groupKey) {
      var group = groups[groupKey];
      var hashes = keysOf(group.hashes);
      var locations = keysOf(group.locations);
      var fingerprints = keysOf(group.contentFingerprints);
      var groupIdValid = /^PG-2026-OGOS2026-\d+$/.test(group.paymentGroupId || '');
      var sourceIdentityAmbiguous = locations.some(function(location) {
        return keysOf(sourceIdentityGroups[location]).length > 1;
      });

      if (!groupIdValid) {
        addAnomaly('SOURCE_GROUP_ID_INVALID', group.paymentGroupId || group.sourceLocation, {});
      }
      if (hashes.length !== 1) {
        addAnomaly('SOURCE_GROUP_HASH_COUNT_INVALID', group.paymentGroupId || group.sourceLocation, { sourceHashes: hashes });
      }
      if (locations.length !== 1) {
        addAnomaly('SOURCE_GROUP_LOCATION_COUNT_INVALID', group.paymentGroupId || group.sourceLocation, { sourceLocations: locations });
      }
      if (keysOf(group.statuses).length > 1) {
        addAnomaly('SOURCE_GROUP_MULTIPLE_STATUSES', group.paymentGroupId || group.sourceLocation, { statuses: keysOf(group.statuses) });
      }
      if (keysOf(group.amounts).length > 1) {
        addAnomaly('SOURCE_GROUP_MULTIPLE_AMOUNTS', group.paymentGroupId || group.sourceLocation, { amounts: keysOf(group.amounts) });
      }
      if (group.amountTotal === null) {
        addAnomaly('SOURCE_GROUP_AMOUNT_INVALID', group.paymentGroupId || group.sourceLocation, {});
      }

      var hashExists = hashes.some(function(hash) { return !!existingHashes[hash]; });
      var groupExists = !!(group.paymentGroupId && existingGroups[group.paymentGroupId]);
      var locationExists = !!existingLocations[group.sourceLocation];
      var contentMatch = fingerprints.some(function(fingerprint) { return !!existingContentFingerprints[fingerprint]; });
      var classification;

      if (hashExists) {
        classification = 'UNCHANGED_EXISTING';
      } else if (groupExists || locationExists) {
        classification = 'CHANGED_EXISTING_REVIEW';
      } else if (contentMatch) {
        classification = 'CHANGED_EXISTING_REVIEW';
        addAnomaly('SECONDARY_CONTENT_FINGERPRINT_MATCH', group.paymentGroupId || group.sourceLocation, {
          sourceLocation: group.sourceLocation,
          contentFingerprints: fingerprints
        });
      } else if (!groupIdValid || hashes.length !== 1 || locations.length !== 1 || sourceIdentityAmbiguous) {
        classification = 'CHANGED_EXISTING_REVIEW';
      } else {
        classification = 'GENUINELY_NEW';
      }

      var summary = candidateSummary(group, classification);
      if (classification === 'UNCHANGED_EXISTING') {
        unchanged.push(summary);
      } else if (classification === 'CHANGED_EXISTING_REVIEW') {
        changed.push(summary);
      } else {
        genuinelyNew.push(summary);
        projectedChildRows += group.childRows;
        if (group.amountTotal !== null) {
          projectedTotalAmount += group.amountTotal;
          if (group.hasPaidStatusRows) projectedPaidStatusAmount += group.amountTotal;
        }
        keysOf(group.paidNamesMap).forEach(function(name) { uniquePaidNamesMap[name] = true; });

        var numericSourceRow = parseInt(group.sourceRow, 10);
        if (!isNaN(numericSourceRow) && numericSourceRow <= highestExistingAugustSourceRow) {
          addAnomaly('NEW_CANDIDATE_AT_OR_BELOW_HIGHEST_STAGED_ROW', group.paymentGroupId, {
            sourceRow: numericSourceRow,
            highestExistingAugustSourceRow: highestExistingAugustSourceRow
          });
        }
      }
    });

    var uniquePaidNames = keysOf(uniquePaidNamesMap);
    return {
      success: true,
      mode: 'V2_AUGUST_2026_CATCHUP_PREVIEW_READ_ONLY',
      sourceTabs: keysOf(sourceTabsMap),
      sourceGroupsScanned: Object.keys(groups).length,
      existingUnchangedGroups: unchanged.length,
      changedExistingGroups: changed.length,
      genuinelyNewGroups: genuinelyNew.length,
      projectedChildRows: projectedChildRows,
      uniquePaidNamesCount: uniquePaidNames.length,
      uniquePaidNames: uniquePaidNames,
      projectedTotalAmount: projectedTotalAmount,
      projectedPaidStatusAmount: projectedPaidStatusAmount,
      highestExistingAugustSourceRow: highestExistingAugustSourceRow,
      genuinelyNewCandidates: genuinelyNew,
      sampleNewCandidates: genuinelyNew.slice(0, 10),
      sampleChangedExistingCandidates: changed.slice(0, 10),
      anomalies: anomalies
    };
  } catch (err) {
    Logger.log('previewAugust2026CatchupV2 error: ' + err.message);
    return { success: false, mode: 'V2_AUGUST_2026_CATCHUP_PREVIEW_READ_ONLY', message: err.message };
  }
}

function testPreviewAugust2026CatchupCompactV2() {
  var result = previewAugust2026CatchupV2() || {};
  var anomalies = result.anomalies || [];
  var anomalyTypes = {};
  anomalies.forEach(function(anomaly) {
    var type = (anomaly && anomaly.type ? anomaly.type : '(UNKNOWN)').toString();
    anomalyTypes[type] = (anomalyTypes[type] || 0) + 1;
  });

  var candidates = (result.genuinelyNewCandidates || []).slice().sort(function(a, b) {
    var rowA = parseInt(a && a.sourceRow, 10);
    var rowB = parseInt(b && b.sourceRow, 10);
    if (isNaN(rowA)) rowA = Number.MAX_SAFE_INTEGER;
    if (isNaN(rowB)) rowB = Number.MAX_SAFE_INTEGER;
    if (rowA !== rowB) return rowA - rowB;
    return ((a && a.paymentGroupId) || '').toString().localeCompare(((b && b.paymentGroupId) || '').toString());
  });
  var numericSourceRows = candidates.map(function(candidate) {
    return parseInt(candidate && candidate.sourceRow, 10);
  }).filter(function(sourceRow) {
    return !isNaN(sourceRow);
  });
  var allRowsNumeric = numericSourceRows.length === candidates.length;
  var highestExisting = parseInt(result.highestExistingAugustSourceRow, 10);
  var compact = {
    success: result.success === true,
    sourceGroupsScanned: result.sourceGroupsScanned,
    existingUnchangedGroups: result.existingUnchangedGroups,
    changedExistingGroups: result.changedExistingGroups,
    genuinelyNewGroups: result.genuinelyNewGroups,
    projectedChildRows: result.projectedChildRows,
    uniquePaidNamesCount: result.uniquePaidNamesCount,
    projectedTotalAmount: result.projectedTotalAmount,
    projectedPaidStatusAmount: result.projectedPaidStatusAmount,
    highestExistingAugustSourceRow: result.highestExistingAugustSourceRow,
    anomalyCount: anomalies.length,
    anomalyTypes: anomalyTypes,
    genuinelyNewPaymentGroupIds: candidates.map(function(candidate) { return candidate.paymentGroupId; }),
    minimumGenuinelyNewSourceRow: numericSourceRows.length ? Math.min.apply(null, numericSourceRows) : null,
    maximumGenuinelyNewSourceRow: numericSourceRows.length ? Math.max.apply(null, numericSourceRows) : null,
    allGenuinelyNewRowsAboveHighestExisting: result.success === true && allRowsNumeric && !isNaN(highestExisting) && candidates.every(function(candidate) {
      return parseInt(candidate.sourceRow, 10) > highestExisting;
    }),
    allClassificationsGenuinelyNew: result.success === true && candidates.every(function(candidate) {
      return candidate.classification === 'GENUINELY_NEW';
    }),
    changedExistingIsZero: result.success === true && result.changedExistingGroups === 0
  };
  Logger.log(JSON.stringify(compact));
  return compact;
}

function importAugust2026CatchupGuardedV2(params) {
  params = params || {};
  var allowWrite = params.allowWrite === true;
  var mode = allowWrite
    ? 'V2_AUGUST_2026_CATCHUP_GUARDED_WRITE'
    : 'V2_AUGUST_2026_CATCHUP_GUARDED_PREVIEW_READ_ONLY';

  try {
    if (!Array.isArray(params.paymentGroupIds) || !params.paymentGroupIds.length) {
      return { success: false, mode: mode, message: 'paymentGroupIds mesti senarai yang tidak kosong.' };
    }
    if (params.paymentGroupIds.length > 25) {
      return { success: false, mode: mode, message: 'Safety limit: maksimum 25 paymentGroupIds setiap batch.' };
    }

    var requestedGroupIds = [];
    var requestedIdSet = {};
    var requestedSourceRows = {};
    var invalidGroupIds = [];
    var duplicateGroupIds = [];
    params.paymentGroupIds.forEach(function(value) {
      var groupId = (value || '').toString().trim();
      var match = groupId.match(/^PG-2026-OGOS2026-(\d+)$/);
      var sourceRow = match ? parseInt(match[1], 10) : NaN;
      if (!match || isNaN(sourceRow) || sourceRow < 2 || sourceRow > 47) {
        invalidGroupIds.push(groupId);
        return;
      }
      if (requestedIdSet[groupId]) {
        duplicateGroupIds.push(groupId);
        return;
      }
      requestedIdSet[groupId] = true;
      requestedSourceRows[groupId] = sourceRow;
      requestedGroupIds.push(groupId);
    });

    if (invalidGroupIds.length) {
      return {
        success: false,
        mode: mode,
        message: 'Payment group ID tidak sah atau SOURCE_ROW di luar 2-47.',
        invalidGroupIds: invalidGroupIds
      };
    }
    if (duplicateGroupIds.length) {
      return {
        success: false,
        mode: mode,
        message: 'paymentGroupIds mengandungi ID pendua.',
        duplicateGroupIds: duplicateGroupIds
      };
    }
    requestedGroupIds.sort(function(a, b) { return requestedSourceRows[a] - requestedSourceRows[b]; });

    var preview = previewAugust2026CatchupV2();
    if (!preview || preview.success !== true) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: preview && preview.message ? preview.message : 'Preview August 2026 gagal.'
      };
    }
    if (preview.changedExistingGroups !== 0) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: changedExistingGroups mesti 0.',
        changedExistingGroups: preview.changedExistingGroups
      };
    }

    var previewCandidates = {};
    (preview.genuinelyNewCandidates || []).forEach(function(candidate) {
      var groupId = (candidate.paymentGroupId || '').toString().trim();
      if (groupId) previewCandidates[groupId] = candidate;
    });
    var missingFromPreview = requestedGroupIds.filter(function(groupId) { return !previewCandidates[groupId]; });
    if (missingFromPreview.length) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: ID bukan lagi GENUINELY_NEW dalam preview semasa.',
        missingFromPreview: missingFromPreview
      };
    }

    var draft = buildEbayarImportRowsDryRunV2_({ sourceYear: 2026, includeDraftRows: true });
    if (!draft || draft.success !== true) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: draft && draft.message ? draft.message : 'Draft August 2026 gagal dibina.'
      };
    }

    function mapKeys(map) {
      return Object.keys(map || {}).sort();
    }

    var currentGroups = {};
    (draft.draftRows || []).forEach(function(row) {
      var sourceYear = parseInt(row.SOURCE_YEAR, 10);
      var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
      var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
      if (sourceYear !== 2026 || sourceSheet !== 'OGOS2026' || bulanKey !== '2026-08') return;

      var groupId = makeImportPaymentGroupIdV2_(row);
      if (!requestedIdSet[groupId]) return;
      if (!currentGroups[groupId]) {
        currentGroups[groupId] = {
          paymentGroupId: groupId,
          sourceYear: sourceYear,
          sourceSheet: (row.SOURCE_SHEET || '').toString().trim(),
          sourceRow: parseInt(row.SOURCE_ROW, 10),
          rows: [],
          hashes: {},
          locations: {},
          fingerprints: {},
          amounts: {},
          statuses: {},
          normalizedNames: {},
          paidNames: {}
        };
      }

      var group = currentGroups[groupId];
      var sourceRowText = isNaN(group.sourceRow) ? (row.SOURCE_ROW || '').toString().trim() : group.sourceRow.toString();
      var location = makeEbayarSourceLocationKeyV2_(sourceYear, group.sourceSheet, sourceRowText);
      var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
      var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
      var amount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
      var status = (row.STATUS || '').toString().trim().toUpperCase();
      var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);

      group.rows.push(row);
      if (hash) group.hashes[hash] = true;
      if (location) group.locations[location] = true;
      if (fingerprint) group.fingerprints[fingerprint] = true;
      if (typeof amount === 'number' && isFinite(amount)) group.amounts[amount.toFixed(2)] = true;
      group.statuses[status || '(blank)'] = true;
      if (name) group.normalizedNames[name] = true;
      if ((!status || status === 'SELESAI') && name) group.paidNames[name] = true;
    });

    var draftValidationErrors = [];
    requestedGroupIds.forEach(function(groupId) {
      var group = currentGroups[groupId];
      var previewCandidate = previewCandidates[groupId];
      if (!group) {
        draftValidationErrors.push({ paymentGroupId: groupId, reason: 'CURRENT_AUGUST_DRAFT_GROUP_MISSING' });
        return;
      }
      var hashes = mapKeys(group.hashes);
      var locations = mapKeys(group.locations);
      var fingerprints = mapKeys(group.fingerprints);
      var amounts = mapKeys(group.amounts);
      if (hashes.length !== 1 || locations.length !== 1 || fingerprints.length !== 1 || amounts.length !== 1 || group.rows.length < 1) {
        draftValidationErrors.push({
          paymentGroupId: groupId,
          reason: 'CURRENT_AUGUST_DRAFT_GROUP_INCONSISTENT',
          hashes: hashes,
          locations: locations,
          fingerprints: fingerprints,
          amounts: amounts,
          childRows: group.rows.length
        });
        return;
      }
      if (previewCandidate.sourceRowHash !== hashes[0] ||
          (previewCandidate.contentFingerprints || []).indexOf(fingerprints[0]) === -1) {
        draftValidationErrors.push({
          paymentGroupId: groupId,
          reason: 'CURRENT_DRAFT_CHANGED_AFTER_PREVIEW',
          previewSourceRowHash: previewCandidate.sourceRowHash,
          currentSourceRowHash: hashes[0],
          currentContentFingerprint: fingerprints[0]
        });
      }
    });
    if (draftValidationErrors.length) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: draft August semasa gagal validasi.',
        conflicts: draftValidationErrors
      };
    }

    var selectedDraftRows = [];
    var uniquePaidNamesMap = {};
    var totalAmount = 0;
    requestedGroupIds.forEach(function(groupId) {
      var group = currentGroups[groupId];
      group.rows.forEach(function(row) { selectedDraftRows.push(row); });
      mapKeys(group.paidNames).forEach(function(name) { uniquePaidNamesMap[name] = true; });
      totalAmount += parseFloat(mapKeys(group.amounts)[0]);
    });
    var uniquePaidNames = mapKeys(uniquePaidNamesMap);
    var firstSourceRow = requestedSourceRows[requestedGroupIds[0]];
    var lastSourceRow = requestedSourceRows[requestedGroupIds[requestedGroupIds.length - 1]];

    function recheckCurrentStaging() {
      var staging = getPaymentsRowsV2_();
      var existingGroupIds = {};
      var existingLocations = {};
      var existingHashes = {};
      var existingFingerprints = {};

      (staging.rows || []).forEach(function(row) {
        var rawGroupId = (row.PAYMENT_GROUP_ID || '').toString().trim();
        var groupId = rawGroupId ? makeImportPaymentGroupIdV2_({ PAYMENT_GROUP_ID: rawGroupId }) : '';
        var sourceYear = (row.SOURCE_YEAR || '').toString().trim();
        var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
        var sourceRow = (row.SOURCE_ROW || '').toString().trim();
        var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow);
        var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
        var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
        if (groupId) existingGroupIds[groupId] = true;
        if (sourceYear && sourceSheet && sourceRow) existingLocations[location] = true;
        if (hash) existingHashes[hash] = true;
        if (fingerprint) existingFingerprints[fingerprint] = true;
      });

      var conflicts = [];
      requestedGroupIds.forEach(function(groupId) {
        var group = currentGroups[groupId];
        var matchingKeys = [];
        if (existingGroupIds[groupId]) matchingKeys.push('PAYMENT_GROUP_ID');
        mapKeys(group.locations).forEach(function(location) {
          if (existingLocations[location]) matchingKeys.push('SOURCE_LOCATION');
        });
        mapKeys(group.hashes).forEach(function(hash) {
          if (existingHashes[hash]) matchingKeys.push('SOURCE_ROW_HASH');
        });
        mapKeys(group.fingerprints).forEach(function(fingerprint) {
          if (existingFingerprints[fingerprint]) matchingKeys.push('SECONDARY_CONTENT_FINGERPRINT');
        });
        if (matchingKeys.length) {
          conflicts.push({
            paymentGroupId: groupId,
            sourceYear: group.sourceYear,
            sourceSheet: group.sourceSheet,
            sourceRow: group.sourceRow,
            sourceRowHashes: mapKeys(group.hashes),
            sourceLocations: mapKeys(group.locations),
            contentFingerprints: mapKeys(group.fingerprints),
            matchingKeys: matchingKeys
          });
        }
      });
      return { conflicts: conflicts };
    }

    if (!allowWrite) {
      var previewRecheck = recheckCurrentStaging();
      if (previewRecheck.conflicts.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Preview guarded gagal: konflik staging dijumpai.',
          conflicts: previewRecheck.conflicts
        };
      }
      return {
        success: true,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        appendableGroups: requestedGroupIds.length,
        projectedChildRows: selectedDraftRows.length,
        projectedUniquePaidNames: uniquePaidNames,
        projectedTotalAmount: totalAmount,
        firstSourceRow: firstSourceRow,
        lastSourceRow: lastSourceRow,
        appendedGroups: 0,
        appendedChildRows: 0,
        appendedUniquePaidNames: [],
        appendedTotalAmount: 0
      };
    }

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return {
        success: false,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        message: 'Catch-up dibatalkan: gagal mendapatkan script lock.'
      };
    }

    try {
      var ss = getEbayarMasterSpreadsheetForImportV2_();
      var sheet = ss.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
      if (!sheet) {
        return { success: false, mode: mode, requestedGroupIds: requestedGroupIds, message: 'Payments tab tidak dijumpai.' };
      }
      var headerIndex = getPaymentsHeaderIndexV2_(sheet);
      var requiredHeaders = [
        'PAYMENT_ID', 'PAYMENT_GROUP_ID', 'SOURCE_YEAR', 'SOURCE_SHEET', 'SOURCE_ROW', 'SOURCE_ROW_HASH'
      ];
      var missingHeaders = requiredHeaders.filter(function(header) {
        return headerIndex[header] === undefined || headerIndex[header] === null;
      });
      if (missingHeaders.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Header Payments hilang.',
          missingHeaders: missingHeaders
        };
      }

      var freshDraft = buildEbayarImportRowsDryRunV2_({ sourceYear: 2026, includeDraftRows: true });
      var sourceWindowConflicts = [];
      var freshGroups = {};
      if (!freshDraft || freshDraft.success !== true) {
        sourceWindowConflicts.push({
          reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
          detail: freshDraft && freshDraft.message ? freshDraft.message : 'Fresh post-lock draft gagal dibina.'
        });
      } else {
        (freshDraft.draftRows || []).forEach(function(row) {
          var sourceYear = parseInt(row.SOURCE_YEAR, 10);
          var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
          var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
          if (sourceYear !== 2026 || sourceSheet !== 'OGOS2026' || bulanKey !== '2026-08') return;

          var groupId = makeImportPaymentGroupIdV2_(row);
          if (!requestedIdSet[groupId]) return;
          if (!freshGroups[groupId]) {
            freshGroups[groupId] = {
              paymentGroupId: groupId,
              sourceYear: sourceYear,
              sourceSheet: (row.SOURCE_SHEET || '').toString().trim(),
              sourceRow: parseInt(row.SOURCE_ROW, 10),
              rows: [],
              hashes: {},
              locations: {},
              fingerprints: {},
              amounts: {},
              statuses: {},
              normalizedNames: {},
              paidNames: {}
            };
          }

          var freshGroup = freshGroups[groupId];
          var sourceRowText = isNaN(freshGroup.sourceRow)
            ? (row.SOURCE_ROW || '').toString().trim()
            : freshGroup.sourceRow.toString();
          var location = makeEbayarSourceLocationKeyV2_(sourceYear, freshGroup.sourceSheet, sourceRowText);
          var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
          var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
          var amount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
          var status = (row.STATUS || '').toString().trim().toUpperCase();
          var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);

          freshGroup.rows.push(row);
          if (hash) freshGroup.hashes[hash] = true;
          if (location) freshGroup.locations[location] = true;
          if (fingerprint) freshGroup.fingerprints[fingerprint] = true;
          if (typeof amount === 'number' && isFinite(amount)) freshGroup.amounts[amount.toFixed(2)] = true;
          freshGroup.statuses[status || '(blank)'] = true;
          if (name) freshGroup.normalizedNames[name] = true;
          if ((!status || status === 'SELESAI') && name) freshGroup.paidNames[name] = true;
        });
      }

      function sameKeySet(left, right) {
        var leftKeys = mapKeys(left);
        var rightKeys = mapKeys(right);
        return leftKeys.length === rightKeys.length && leftKeys.every(function(value, index) {
          return value === rightKeys[index];
        });
      }

      requestedGroupIds.forEach(function(groupId) {
        var before = currentGroups[groupId];
        var fresh = freshGroups[groupId];
        if (!before || !fresh) {
          sourceWindowConflicts.push({
            paymentGroupId: groupId,
            reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
            detail: !fresh ? 'REQUESTED_GROUP_MISSING_FROM_FRESH_DRAFT' : 'PRE_LOCK_GROUP_MISSING'
          });
          return;
        }

        var freshValid = mapKeys(fresh.hashes).length === 1 &&
          mapKeys(fresh.locations).length === 1 &&
          mapKeys(fresh.fingerprints).length === 1 &&
          mapKeys(fresh.amounts).length === 1 &&
          fresh.rows.length > 0;
        var differences = [];
        if (!freshValid) differences.push('FRESH_GROUP_INVALID');
        if (!sameKeySet(before.hashes, fresh.hashes)) differences.push('SOURCE_ROW_HASH');
        if (!sameKeySet(before.locations, fresh.locations)) differences.push('SOURCE_LOCATION');
        if (!sameKeySet(before.fingerprints, fresh.fingerprints)) differences.push('SECONDARY_CONTENT_FINGERPRINT');
        if (before.rows.length !== fresh.rows.length) differences.push('CHILD_ROW_COUNT');
        if (!sameKeySet(before.amounts, fresh.amounts)) differences.push('AMOUNT');
        if (!sameKeySet(before.statuses, fresh.statuses)) differences.push('STATUS_SET');
        if (!sameKeySet(before.normalizedNames, fresh.normalizedNames)) differences.push('NORMALIZED_NAME_SET');

        if (differences.length) {
          sourceWindowConflicts.push({
            paymentGroupId: groupId,
            reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
            differences: differences,
            before: {
              sourceRowHashes: mapKeys(before.hashes),
              sourceLocations: mapKeys(before.locations),
              contentFingerprints: mapKeys(before.fingerprints),
              childRows: before.rows.length,
              amounts: mapKeys(before.amounts),
              statuses: mapKeys(before.statuses),
              normalizedNames: mapKeys(before.normalizedNames)
            },
            fresh: {
              sourceRowHashes: mapKeys(fresh.hashes),
              sourceLocations: mapKeys(fresh.locations),
              contentFingerprints: mapKeys(fresh.fingerprints),
              childRows: fresh.rows.length,
              amounts: mapKeys(fresh.amounts),
              statuses: mapKeys(fresh.statuses),
              normalizedNames: mapKeys(fresh.normalizedNames)
            }
          });
        }
      });

      if (Object.keys(freshGroups).length !== requestedGroupIds.length) {
        sourceWindowConflicts.push({
          reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
          detail: 'FRESH_GROUP_COUNT_MISMATCH',
          requestedGroupCount: requestedGroupIds.length,
          freshGroupCount: Object.keys(freshGroups).length
        });
      }

      var freshSelectedDraftRows = [];
      var freshUniquePaidNamesMap = {};
      var freshTotalAmount = 0;
      requestedGroupIds.forEach(function(groupId) {
        var fresh = freshGroups[groupId];
        if (!fresh) return;
        fresh.rows.forEach(function(row) { freshSelectedDraftRows.push(row); });
        mapKeys(fresh.paidNames).forEach(function(name) { freshUniquePaidNamesMap[name] = true; });
        var amountKeys = mapKeys(fresh.amounts);
        if (amountKeys.length === 1) freshTotalAmount += parseFloat(amountKeys[0]);
      });
      if (!freshSelectedDraftRows.length || Object.keys(freshGroups).length !== requestedGroupIds.length) {
        sourceWindowConflicts.push({
          reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
          detail: 'FRESH_SELECTED_ROWS_EMPTY_OR_GROUP_COUNT_MISMATCH',
          freshSelectedChildRows: freshSelectedDraftRows.length,
          requestedGroupCount: requestedGroupIds.length,
          freshGroupCount: Object.keys(freshGroups).length
        });
      }

      if (sourceWindowConflicts.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Catch-up dibatalkan sepenuhnya: sumber August berubah semasa write window.',
          conflicts: sourceWindowConflicts,
          appendedGroups: 0,
          appendedChildRows: 0
        };
      }

      currentGroups = freshGroups;
      selectedDraftRows = freshSelectedDraftRows;
      uniquePaidNames = mapKeys(freshUniquePaidNamesMap);
      totalAmount = freshTotalAmount;

      var finalRecheck = recheckCurrentStaging();
      if (finalRecheck.conflicts.length) {
        return {
          success: false,
          mode: mode,
          requestedGroupIds: requestedGroupIds,
          message: 'Catch-up dibatalkan sepenuhnya: konflik staging dijumpai semasa final recheck.',
          conflicts: finalRecheck.conflicts,
          appendedGroups: 0,
          appendedChildRows: 0
        };
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
        return (header || '').toString().trim();
      });
      var timestampNow = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
      var rowsToAppend = selectedDraftRows.map(function(row) {
        return mapDraftPaymentToMasterRowV2_(row, headerIndex, headers, timestampNow);
      });
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);

      return {
        success: true,
        mode: mode,
        requestedGroupIds: requestedGroupIds,
        appendedGroups: requestedGroupIds.length,
        appendedChildRows: rowsToAppend.length,
        appendedUniquePaidNames: uniquePaidNames,
        appendedTotalAmount: totalAmount,
        firstSourceRow: firstSourceRow,
        lastSourceRow: lastSourceRow
      };
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    Logger.log('importAugust2026CatchupGuardedV2 error: ' + err.message);
    return { success: false, mode: mode, message: err.message };
  }
}



function testImportAugust2026CatchupBatch1PreviewV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 2; sourceRow <= 26; sourceRow++) {
    paymentGroupIds.push('PG-2026-OGOS2026-' + sourceRow);
  }
  var result = importAugust2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: false });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportAugust2026CatchupBatch2PreviewV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 27; sourceRow <= 47; sourceRow++) {
    paymentGroupIds.push('PG-2026-OGOS2026-' + sourceRow);
  }
  var result = importAugust2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: false });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportAugust2026CatchupBatch1WriteV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 2; sourceRow <= 26; sourceRow++) {
    paymentGroupIds.push('PG-2026-OGOS2026-' + sourceRow);
  }
  var result = importAugust2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: true });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportAugust2026CatchupBatch2WriteV2() {
  var paymentGroupIds = [];
  for (var sourceRow = 27; sourceRow <= 47; sourceRow++) {
    paymentGroupIds.push('PG-2026-OGOS2026-' + sourceRow);
  }
  var result = importAugust2026CatchupGuardedV2({ paymentGroupIds: paymentGroupIds, allowWrite: true });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function authorizeEbayarV2MaintenanceAdmin_(params) {
  var authCheck = validateToken(params && params.token ? params.token : '');
  if (!authCheck.valid || !authCheck.user) {
    return { valid: false, message: 'Token tidak sah atau tamat tempoh. Sila log masuk semula.' };
  }

  var email = (authCheck.user.email || '').toString().trim().toLowerCase();
  if (!email) return { valid: false, message: 'Identiti pengguna tidak lengkap.' };

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.GURU);
    if (!sheet || sheet.getLastRow() < 2) {
      return { valid: false, message: 'Maklumat role pengguna tidak dijumpai.' };
    }
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var rowEmail = (rows[i][COL_GURU.EMAIL] || '').toString().trim().toLowerCase();
      var rowRole = (rows[i][COL_GURU.ROLE] || '').toString().trim().toUpperCase();
      if (rowEmail === email) {
        return rowRole === 'ADMIN'
          ? { valid: true, email: email, role: rowRole }
          : { valid: false, message: 'Akses Admin diperlukan.' };
      }
    }
    return { valid: false, message: 'Akaun pengguna tidak dijumpai.' };
  } catch (err) {
    Logger.log('authorizeEbayarV2MaintenanceAdmin_ error: ' + err.message);
    return { valid: false, message: 'Gagal mengesahkan akses Admin.' };
  }
}

function getCurrentEbayarMonthMetaV2_() {
  var now = new Date();
  var timezone = 'Asia/Kuala_Lumpur';
  var tahun = Utilities.formatDate(now, timezone, 'yyyy');
  var bulanNumber = Utilities.formatDate(now, timezone, 'MM');
  var months = {
    '01': { label: 'Januari', sourceSheet: 'JAN2026' },
    '02': { label: 'Februari', sourceSheet: 'FEB2026' },
    '03': { label: 'Mac', sourceSheet: 'MAC2026' },
    '04': { label: 'April', sourceSheet: 'APRIL2026' },
    '05': { label: 'Mei', sourceSheet: 'MEI2026' },
    '06': { label: 'Jun', sourceSheet: 'JUN2026' },
    '07': { label: 'Julai', sourceSheet: 'JULAI2026' },
    '08': { label: 'Ogos', sourceSheet: 'OGOS2026' },
    '09': { label: 'September', sourceSheet: 'SEPT2026' },
    '10': { label: 'Oktober', sourceSheet: 'OKT2026' },
    '11': { label: 'November', sourceSheet: 'NOV2026' },
    '12': { label: 'Disember', sourceSheet: 'DIS2026' }
  };
  var month = months[bulanNumber];
  if (tahun !== '2026' || !month) {
    return {
      success: false,
      message: 'Bulan semasa belum disokong oleh sumber eBayar V2 2026.',
      tahun: parseInt(tahun, 10),
      bulanNumber: bulanNumber,
      lastChecked: Utilities.formatDate(now, timezone, 'yyyy-MM-dd HH:mm:ss')
    };
  }
  return {
    success: true,
    tahun: 2026,
    bulanNumber: bulanNumber,
    bulanKey: tahun + '-' + bulanNumber,
    bulanLabel: month.label + ' ' + tahun,
    sourceSheet: month.sourceSheet,
    lastChecked: Utilities.formatDate(now, timezone, 'yyyy-MM-dd HH:mm:ss')
  };
}

function buildGenericCurrentMonthPreviewV2_(meta) {
  var draft = buildEbayarImportRowsDryRunV2_({ sourceYear: meta.tahun, includeDraftRows: true });
  if (!draft || draft.success !== true) return draft;

  function keysOf(map) { return Object.keys(map || {}).sort(); }
  var anomalies = [];
  var anomalyKeys = {};
  function addAnomaly(type, key, details) {
    var dedupeKey = type + '|' + key;
    if (anomalyKeys[dedupeKey]) return;
    anomalyKeys[dedupeKey] = true;
    var item = { type: type, key: key };
    Object.keys(details || {}).forEach(function(name) { item[name] = details[name]; });
    anomalies.push(item);
  }

  var existingGroups = {};
  var existingHashes = {};
  var existingLocations = {};
  var existingFingerprints = {};
  var highestExistingSourceRow = 0;
  var staging = getPaymentsRowsV2_();
  (staging.rows || []).forEach(function(row) {
    var rawGroupId = (row.PAYMENT_GROUP_ID || '').toString().trim();
    var groupId = rawGroupId ? makeImportPaymentGroupIdV2_({ PAYMENT_GROUP_ID: rawGroupId }) : '';
    var sourceYear = (row.SOURCE_YEAR || '').toString().trim();
    var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
    var sourceRow = (row.SOURCE_ROW || '').toString().trim();
    var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
    var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow);
    var fingerprint = makeEbayarSourceContentFingerprintV2_(row);

    if (groupId) {
      if (!existingGroups[groupId]) existingGroups[groupId] = { hashes: {}, locations: {} };
      if (hash) existingGroups[groupId].hashes[hash] = true;
      if (location) existingGroups[groupId].locations[location] = true;
    }
    if (hash) existingHashes[hash] = true;
    if (sourceYear && sourceSheet && sourceRow) {
      if (!existingLocations[location]) existingLocations[location] = { groupIds: {}, hashes: {} };
      if (groupId) existingLocations[location].groupIds[groupId] = true;
      if (hash) existingLocations[location].hashes[hash] = true;
    }
    if (fingerprint) existingFingerprints[fingerprint] = true;

    if (parseInt(sourceYear, 10) === meta.tahun && sourceSheet.toUpperCase() === meta.sourceSheet) {
      var numericSourceRow = parseInt(sourceRow, 10);
      if (!isNaN(numericSourceRow) && numericSourceRow > highestExistingSourceRow) {
        highestExistingSourceRow = numericSourceRow;
      }
    }
  });

  Object.keys(existingGroups).forEach(function(groupId) {
    if (keysOf(existingGroups[groupId].hashes).length > 1) {
      addAnomaly('GROUP_ID_MULTIPLE_STAGED_HASHES', groupId, {
        stagedHashes: keysOf(existingGroups[groupId].hashes),
        stagedLocations: keysOf(existingGroups[groupId].locations)
      });
    }
  });
  Object.keys(existingLocations).forEach(function(location) {
    if (keysOf(existingLocations[location].groupIds).length > 1) {
      addAnomaly('DUPLICATE_STAGED_SOURCE_IDENTITY', location, {
        stagedGroupIds: keysOf(existingLocations[location].groupIds),
        stagedHashes: keysOf(existingLocations[location].hashes)
      });
    }
  });

  var filteredRows = (draft.draftRows || []).filter(function(row) {
    var sourceYear = parseInt(row.SOURCE_YEAR, 10);
    var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
    var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
    return sourceYear === meta.tahun && sourceSheet === meta.sourceSheet && bulanKey === meta.bulanKey;
  });

  var sourceTabs = {};
  var groups = {};
  var sourceIdentityGroups = {};
  filteredRows.forEach(function(row) {
    var paymentGroupId = makeImportPaymentGroupIdV2_(row);
    var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
    var sourceRow = parseInt(row.SOURCE_ROW, 10);
    var sourceRowText = isNaN(sourceRow) ? (row.SOURCE_ROW || '').toString().trim() : sourceRow.toString();
    var location = makeEbayarSourceLocationKeyV2_(meta.tahun, sourceSheet, sourceRowText);
    var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
    var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
    var amount = parseEbayarAmountV2_(row.AMOUNT_TOTAL || row.JUMLAH);
    var numericAmount = typeof amount === 'number' && isFinite(amount) ? amount : null;
    var status = (row.STATUS || '').toString().trim().toUpperCase();
    var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);
    var groupKey = paymentGroupId || ('SOURCE-' + location);

    sourceTabs[sourceSheet] = true;
    if (!groups[groupKey]) {
      groups[groupKey] = {
        paymentGroupId: paymentGroupId,
        sourceRow: isNaN(sourceRow) ? sourceRowText : sourceRow,
        sourceLocation: location,
        hashes: {}, locations: {}, fingerprints: {}, amounts: {}, statuses: {}, names: {}, paidNames: {},
        childRows: 0,
        amountTotal: numericAmount,
        hasPaidStatus: false
      };
    }
    var group = groups[groupKey];
    group.childRows++;
    if (hash) group.hashes[hash] = true;
    if (location) group.locations[location] = true;
    if (fingerprint) group.fingerprints[fingerprint] = true;
    if (numericAmount !== null) group.amounts[numericAmount.toFixed(2)] = true;
    group.statuses[status || '(blank)'] = true;
    if (name) group.names[name] = true;
    if (!status || status === 'SELESAI') {
      group.hasPaidStatus = true;
      if (name) group.paidNames[name] = true;
    }
    if (!sourceIdentityGroups[location]) sourceIdentityGroups[location] = {};
    sourceIdentityGroups[location][groupKey] = true;
  });

  Object.keys(sourceIdentityGroups).forEach(function(location) {
    var groupKeys = keysOf(sourceIdentityGroups[location]);
    if (groupKeys.length > 1) addAnomaly('DUPLICATE_SOURCE_IDENTITY', location, { sourceGroupKeys: groupKeys });
  });

  var unchanged = [];
  var changed = [];
  var genuinelyNew = [];
  var uniquePaidNames = {};
  var projectedChildRows = 0;
  var projectedTotalAmount = 0;
  var projectedPaidStatusAmount = 0;
  var validGroupIdPattern = new RegExp('^PG-' + meta.tahun + '-' + meta.sourceSheet + '-\\d+$');

  Object.keys(groups).sort(function(a, b) {
    return parseInt(groups[a].sourceRow, 10) - parseInt(groups[b].sourceRow, 10);
  }).forEach(function(groupKey) {
    var group = groups[groupKey];
    var hashes = keysOf(group.hashes);
    var locations = keysOf(group.locations);
    var fingerprints = keysOf(group.fingerprints);
    var amounts = keysOf(group.amounts);
    var groupIdValid = validGroupIdPattern.test(group.paymentGroupId || '');
    var identityAmbiguous = locations.some(function(location) {
      return keysOf(sourceIdentityGroups[location]).length > 1;
    });
    var hashExists = hashes.some(function(hash) { return !!existingHashes[hash]; });
    var groupExists = !!(group.paymentGroupId && existingGroups[group.paymentGroupId]);
    var locationExists = locations.some(function(location) { return !!existingLocations[location]; });
    var fingerprintExists = fingerprints.some(function(fingerprint) { return !!existingFingerprints[fingerprint]; });
    var classification;

    if (hashExists) {
      classification = 'UNCHANGED_EXISTING';
    } else if (groupExists || locationExists || fingerprintExists || !groupIdValid || hashes.length !== 1 ||
               locations.length !== 1 || fingerprints.length !== 1 || amounts.length !== 1 || identityAmbiguous) {
      classification = 'CHANGED_EXISTING_REVIEW';
      if (fingerprintExists) {
        addAnomaly('SECONDARY_CONTENT_FINGERPRINT_MATCH', group.paymentGroupId || group.sourceLocation, {
          sourceLocation: group.sourceLocation,
          contentFingerprints: fingerprints
        });
      }
    } else {
      classification = 'GENUINELY_NEW';
    }

    var summary = {
      paymentGroupId: group.paymentGroupId,
      sourceYear: meta.tahun,
      sourceSheet: meta.sourceSheet,
      sourceRow: group.sourceRow,
      sourceRowHash: hashes.length === 1 ? hashes[0] : '',
      bulanKey: meta.bulanKey,
      statuses: keysOf(group.statuses),
      normalizedNames: keysOf(group.names),
      childRows: group.childRows,
      amountTotal: group.amountTotal,
      sourceLocation: group.sourceLocation,
      contentFingerprints: fingerprints,
      classification: classification
    };
    if (classification === 'UNCHANGED_EXISTING') {
      unchanged.push(summary);
    } else if (classification === 'CHANGED_EXISTING_REVIEW') {
      changed.push(summary);
    } else {
      genuinelyNew.push(summary);
      projectedChildRows += group.childRows;
      if (group.amountTotal !== null) {
        projectedTotalAmount += group.amountTotal;
        if (group.hasPaidStatus) projectedPaidStatusAmount += group.amountTotal;
      }
      keysOf(group.paidNames).forEach(function(name) { uniquePaidNames[name] = true; });
      var candidateSourceRow = parseInt(group.sourceRow, 10);
      if (!isNaN(candidateSourceRow) && candidateSourceRow <= highestExistingSourceRow) {
        addAnomaly('NEW_CANDIDATE_AT_OR_BELOW_HIGHEST_STAGED_ROW', group.paymentGroupId, {
          sourceRow: candidateSourceRow,
          highestExistingSourceRow: highestExistingSourceRow
        });
      }
    }
  });

  return {
    success: true,
    sourceTabs: keysOf(sourceTabs),
    sourceGroupsScanned: Object.keys(groups).length,
    existingUnchangedGroups: unchanged.length,
    changedExistingGroups: changed.length,
    genuinelyNewGroups: genuinelyNew.length,
    projectedChildRows: projectedChildRows,
    uniquePaidNamesCount: keysOf(uniquePaidNames).length,
    uniquePaidNames: keysOf(uniquePaidNames),
    projectedTotalAmount: projectedTotalAmount,
    projectedPaidStatusAmount: projectedPaidStatusAmount,
    highestExistingSourceRow: highestExistingSourceRow,
    genuinelyNewCandidates: genuinelyNew,
    sampleNewCandidates: genuinelyNew.slice(0, 10),
    sampleChangedExistingCandidates: changed.slice(0, 10),
    anomalies: anomalies
  };
}

function getCurrentMonthPreviewDataV2_(meta) {
  var result;
  if (meta.bulanKey === '2026-07') {
    result = previewJuly2026CatchupV2();
    if (result && result.success) result.highestExistingSourceRow = result.highestExistingJulySourceRow;
  } else if (meta.bulanKey === '2026-08') {
    result = previewAugust2026CatchupV2();
    if (result && result.success) result.highestExistingSourceRow = result.highestExistingAugustSourceRow;
  } else {
    result = buildGenericCurrentMonthPreviewV2_(meta);
  }
  return result;
}

function compactCurrentMonthPreviewV2_(meta, preview) {
  if (!preview || preview.success !== true) {
    return {
      success: false,
      mode: 'V2_CURRENT_MONTH_CATCHUP_PREVIEW_READ_ONLY',
      tahun: meta.tahun,
      bulanNumber: meta.bulanNumber,
      bulanKey: meta.bulanKey,
      bulanLabel: meta.bulanLabel,
      sourceSheet: meta.sourceSheet,
      message: preview && preview.message ? preview.message : 'Preview bulan semasa gagal.',
      lastChecked: meta.lastChecked
    };
  }
  return {
    success: true,
    mode: 'V2_CURRENT_MONTH_CATCHUP_PREVIEW_READ_ONLY',
    tahun: meta.tahun,
    bulanNumber: meta.bulanNumber,
    bulanKey: meta.bulanKey,
    bulanLabel: meta.bulanLabel,
    sourceSheet: meta.sourceSheet,
    sourceTabs: preview.sourceTabs || [],
    sourceGroups: preview.sourceGroupsScanned || 0,
    existingGroups: preview.existingUnchangedGroups || 0,
    genuinelyNewGroups: preview.genuinelyNewGroups || 0,
    changedExistingGroups: preview.changedExistingGroups || 0,
    projectedChildRows: preview.projectedChildRows || 0,
    uniquePaidNamesCount: preview.uniquePaidNamesCount || 0,
    projectedTotalAmount: preview.projectedTotalAmount || 0,
    projectedPaidStatusAmount: preview.projectedPaidStatusAmount || 0,
    highestExistingSourceRow: preview.highestExistingSourceRow || 0,
    anomalyCount: (preview.anomalies || []).length,
    anomalies: preview.anomalies || [],
    sampleNewCandidates: preview.sampleNewCandidates || [],
    sampleChangedExistingCandidates: preview.sampleChangedExistingCandidates || [],
    lastChecked: meta.lastChecked
  };
}

function previewCurrentMonthEbayarV2(params) {
  var admin = authorizeEbayarV2MaintenanceAdmin_(params || {});
  if (!admin.valid) return { success: false, message: admin.message };
  var meta = getCurrentEbayarMonthMetaV2_();
  if (!meta.success) return meta;
  try {
    return compactCurrentMonthPreviewV2_(meta, getCurrentMonthPreviewDataV2_(meta));
  } catch (err) {
    Logger.log('previewCurrentMonthEbayarV2 error: ' + err.message);
    return { success: false, mode: 'V2_CURRENT_MONTH_CATCHUP_PREVIEW_READ_ONLY', message: err.message };
  }
}

function getEbayarV2MaintenanceStatus(params) {
  var admin = authorizeEbayarV2MaintenanceAdmin_(params || {});
  if (!admin.valid) return { success: false, message: admin.message };
  var meta = getCurrentEbayarMonthMetaV2_();
  if (!meta.success) return meta;
  try {
    var preview = compactCurrentMonthPreviewV2_(meta, getCurrentMonthPreviewDataV2_(meta));
    if (!preview.success) return preview;
    var status;
    var statusLabel;
    if (preview.changedExistingGroups > 0) {
      status = 'REVIEW_REQUIRED';
      statusLabel = '⚠️ Review Required';
    } else if (preview.genuinelyNewGroups > 0) {
      status = 'NEW_PAYMENTS';
      statusLabel = '🟡 New Payments';
    } else if (preview.sourceGroups > 0) {
      status = 'SYNCED';
      statusLabel = '✅ Synced';
    } else {
      status = 'NO_PAYMENTS';
      statusLabel = '⏳ No Payments Yet';
    }
    return {
      success: true,
      tahun: meta.tahun,
      bulanNumber: meta.bulanNumber,
      bulanKey: meta.bulanKey,
      bulanLabel: meta.bulanLabel,
      sourceSheet: meta.sourceSheet,
      sourceGroups: preview.sourceGroups,
      existingGroups: preview.existingGroups,
      genuinelyNewGroups: preview.genuinelyNewGroups,
      changedExistingGroups: preview.changedExistingGroups,
      projectedChildRows: preview.projectedChildRows,
      projectedTotalAmount: preview.projectedTotalAmount,
      highestExistingSourceRow: preview.highestExistingSourceRow,
      status: status,
      statusLabel: statusLabel,
      lastChecked: meta.lastChecked
    };
  } catch (err) {
    Logger.log('getEbayarV2MaintenanceStatus error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function verifyCurrentMonthLegacyVsV2(params) {
  var admin = authorizeEbayarV2MaintenanceAdmin_(params || {});
  if (!admin.valid) return { success: false, message: admin.message };
  var meta = getCurrentEbayarMonthMetaV2_();
  if (!meta.success) return meta;
  return compareYuranLegacyVsV2({
    tahun: meta.tahun,
    bulan: meta.sourceSheet,
    bulanKey: meta.bulanKey
  });
}

function getCurrentMonthSyncKeysV2_(map) {
  return Object.keys(map || {}).sort();
}

function buildCurrentMonthSyncGroupsV2_(meta, selectedGroupIds) {
  var draft = buildEbayarImportRowsDryRunV2_({ sourceYear: meta.tahun, includeDraftRows: true });
  if (!draft || draft.success !== true) {
    return {
      success: false,
      message: draft && draft.message ? draft.message : 'Draft bulan semasa gagal dibina.'
    };
  }

  var selectedSet = null;
  if (Array.isArray(selectedGroupIds)) {
    selectedSet = {};
    selectedGroupIds.forEach(function(groupId) { selectedSet[groupId] = true; });
  }

  var groups = {};
  (draft.draftRows || []).forEach(function(row) {
    var sourceYear = parseInt(row.SOURCE_YEAR, 10);
    var sourceSheet = (row.SOURCE_SHEET || '').toString().trim().toUpperCase();
    var bulanKey = normalizeBulanKeyV2_(row.BULAN_KEY, row.TAHUN, row.BULAN || row.SOURCE_SHEET);
    if (sourceYear !== meta.tahun || sourceSheet !== meta.sourceSheet || bulanKey !== meta.bulanKey) return;

    var paymentGroupId = makeImportPaymentGroupIdV2_(row);
    if (selectedSet && !selectedSet[paymentGroupId]) return;
    if (!groups[paymentGroupId]) {
      groups[paymentGroupId] = {
        paymentGroupId: paymentGroupId,
        rows: [],
        sourceYears: {},
        sourceSheets: {},
        sourceRows: {},
        hashes: {},
        locations: {},
        fingerprints: {},
        amounts: {},
        invalidAmounts: {},
        statuses: {},
        normalizedNames: {},
        paidNames: {}
      };
    }

    var group = groups[paymentGroupId];
    var sourceRow = parseInt(row.SOURCE_ROW, 10);
    var sourceRowText = isNaN(sourceRow) ? (row.SOURCE_ROW || '').toString().trim() : sourceRow.toString();
    var sourceSheetRaw = (row.SOURCE_SHEET || '').toString().trim();
    var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheetRaw, sourceRowText);
    var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
    var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
    var rawAmount = row.AMOUNT_TOTAL;
    if (rawAmount === null || rawAmount === undefined || rawAmount === '') rawAmount = row.JUMLAH;
    var amount = parseEbayarAmountV2_(rawAmount);
    var status = (row.STATUS || '').toString().trim().toUpperCase();
    var name = normalizeYuranNameV2_(row.NAMA_MURID_NORM || row.NAMA_MURID_RAW);

    group.rows.push(row);
    group.sourceYears[sourceYear.toString()] = true;
    group.sourceSheets[sourceSheetRaw] = true;
    group.sourceRows[sourceRowText] = true;
    if (hash) group.hashes[hash] = true;
    if (location) group.locations[location] = true;
    if (fingerprint) group.fingerprints[fingerprint] = true;
    if (typeof amount === 'number' && isFinite(amount) && amount >= 0) {
      group.amounts[amount.toFixed(2)] = true;
    } else {
      group.invalidAmounts[(rawAmount === null || rawAmount === undefined) ? '' : rawAmount.toString()] = true;
    }
    group.statuses[status || '(blank)'] = true;
    if (name) group.normalizedNames[name] = true;
    if ((!status || status === 'SELESAI') && name) group.paidNames[name] = true;
  });

  return { success: true, groups: groups };
}

function validateCurrentMonthSyncGroupV2_(meta, group, previewCandidate) {
  var keys = getCurrentMonthSyncKeysV2_;
  var errors = [];
  if (!group) return ['CURRENT_MONTH_DRAFT_GROUP_MISSING'];

  var escapedSheet = meta.sourceSheet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  var idMatch = (group.paymentGroupId || '').match(new RegExp('^PG-' + meta.tahun + '-' + escapedSheet + '-(\\d+)$'));
  var sourceYears = keys(group.sourceYears);
  var sourceSheets = keys(group.sourceSheets);
  var sourceRows = keys(group.sourceRows);
  var hashes = keys(group.hashes);
  var locations = keys(group.locations);
  var fingerprints = keys(group.fingerprints);
  var amounts = keys(group.amounts);
  var invalidAmounts = keys(group.invalidAmounts);
  var numericSourceRow = sourceRows.length === 1 ? parseInt(sourceRows[0], 10) : NaN;

  if (!idMatch || isNaN(numericSourceRow) || numericSourceRow < 2 || parseInt(idMatch[1], 10) !== numericSourceRow) {
    errors.push('INVALID_PAYMENT_GROUP_ID');
  }
  if (sourceYears.length !== 1 || parseInt(sourceYears[0], 10) !== meta.tahun) errors.push('INVALID_SOURCE_YEAR');
  if (sourceSheets.length !== 1 || sourceSheets[0].toUpperCase() !== meta.sourceSheet) errors.push('INVALID_SOURCE_SHEET');
  if (sourceRows.length !== 1) errors.push('MULTIPLE_SOURCE_ROWS');
  if (hashes.length !== 1) errors.push('INVALID_SOURCE_ROW_HASH_COUNT');
  if (locations.length !== 1) errors.push('INVALID_SOURCE_LOCATION_COUNT');
  if (fingerprints.length !== 1) errors.push('INVALID_CONTENT_FINGERPRINT_COUNT');
  if (amounts.length !== 1 || invalidAmounts.length) errors.push('INVALID_AMOUNT');
  if (!group.rows.length) errors.push('NO_CHILD_ROWS');

  if (previewCandidate) {
    var candidateFingerprints = (previewCandidate.contentFingerprints || []).slice().sort();
    if (!candidateFingerprints.length && previewCandidate.contentFingerprint) {
      candidateFingerprints = [previewCandidate.contentFingerprint.toString()];
    }
    if ((previewCandidate.paymentGroupId || '').toString() !== group.paymentGroupId) errors.push('PREVIEW_PAYMENT_GROUP_ID_MISMATCH');
    if (parseInt(previewCandidate.sourceYear, 10) !== meta.tahun) errors.push('PREVIEW_SOURCE_YEAR_MISMATCH');
    if ((previewCandidate.sourceSheet || '').toString().trim().toUpperCase() !== meta.sourceSheet) errors.push('PREVIEW_SOURCE_SHEET_MISMATCH');
    if (parseInt(previewCandidate.sourceRow, 10) !== numericSourceRow) errors.push('PREVIEW_SOURCE_ROW_MISMATCH');
    if ((previewCandidate.sourceRowHash || '').toString().trim() !== (hashes[0] || '')) errors.push('PREVIEW_SOURCE_ROW_HASH_MISMATCH');
    if ((previewCandidate.sourceLocation || '').toString() !== (locations[0] || '')) errors.push('PREVIEW_SOURCE_LOCATION_MISMATCH');
    if (JSON.stringify(candidateFingerprints) !== JSON.stringify(fingerprints)) errors.push('PREVIEW_CONTENT_FINGERPRINT_MISMATCH');
    if (parseInt(previewCandidate.childRows, 10) !== group.rows.length) errors.push('PREVIEW_CHILD_ROW_COUNT_MISMATCH');
    if (amounts.length === 1) {
      var previewAmount = parseEbayarAmountV2_(previewCandidate.amountTotal);
      if (typeof previewAmount !== 'number' || !isFinite(previewAmount) || previewAmount.toFixed(2) !== amounts[0]) {
        errors.push('PREVIEW_AMOUNT_MISMATCH');
      }
    }
    if (JSON.stringify((previewCandidate.statuses || []).slice().sort()) !== JSON.stringify(keys(group.statuses))) {
      errors.push('PREVIEW_STATUS_SET_MISMATCH');
    }
    if (JSON.stringify((previewCandidate.normalizedNames || []).slice().sort()) !== JSON.stringify(keys(group.normalizedNames))) {
      errors.push('PREVIEW_NORMALIZED_NAME_SET_MISMATCH');
    }
    if (previewCandidate.classification !== 'GENUINELY_NEW') errors.push('PREVIEW_CLASSIFICATION_MISMATCH');
  }

  return errors;
}

function makeCurrentMonthSyncSnapshotV2_(group) {
  function frozenKeys(map) { return Object.freeze(getCurrentMonthSyncKeysV2_(map)); }
  var sourceYears = frozenKeys(group.sourceYears);
  var sourceSheets = frozenKeys(group.sourceSheets);
  var sourceRows = frozenKeys(group.sourceRows);
  var amounts = frozenKeys(group.amounts);
  return Object.freeze({
    paymentGroupId: group.paymentGroupId,
    sourceYear: parseInt(sourceYears[0], 10),
    sourceSheet: sourceSheets[0],
    sourceRow: parseInt(sourceRows[0], 10),
    sourceRowHash: frozenKeys(group.hashes)[0],
    sourceLocation: frozenKeys(group.locations)[0],
    contentFingerprint: frozenKeys(group.fingerprints)[0],
    childRows: group.rows.length,
    normalizedNames: frozenKeys(group.normalizedNames),
    paidNames: frozenKeys(group.paidNames),
    statuses: frozenKeys(group.statuses),
    amountTotal: parseFloat(amounts[0])
  });
}

function compareCurrentMonthSyncSnapshotsV2_(before, fresh) {
  var differences = [];
  if (!before || !fresh) return ['GROUP_MISSING'];
  if (before.paymentGroupId !== fresh.paymentGroupId) differences.push('PAYMENT_GROUP_ID');
  if (before.sourceYear !== fresh.sourceYear) differences.push('SOURCE_YEAR');
  if (before.sourceSheet !== fresh.sourceSheet) differences.push('SOURCE_SHEET');
  if (before.sourceRow !== fresh.sourceRow) differences.push('SOURCE_ROW');
  if (before.sourceRowHash !== fresh.sourceRowHash) differences.push('SOURCE_ROW_HASH');
  if (before.sourceLocation !== fresh.sourceLocation) differences.push('SOURCE_LOCATION');
  if (before.contentFingerprint !== fresh.contentFingerprint) differences.push('SECONDARY_CONTENT_FINGERPRINT');
  if (before.childRows !== fresh.childRows) differences.push('CHILD_ROW_COUNT');
  if (JSON.stringify(before.normalizedNames) !== JSON.stringify(fresh.normalizedNames)) differences.push('NORMALIZED_NAME_SET');
  if (JSON.stringify(before.paidNames) !== JSON.stringify(fresh.paidNames)) differences.push('PAID_NAME_SET');
  if (JSON.stringify(before.statuses) !== JSON.stringify(fresh.statuses)) differences.push('STATUS_SET');
  if (before.amountTotal.toFixed(2) !== fresh.amountTotal.toFixed(2)) differences.push('AMOUNT_TOTAL');
  return differences;
}

function findCurrentMonthSyncStagingConflictsV2_(snapshots) {
  var staging = getPaymentsRowsV2_();
  var existingGroupIds = {};
  var existingLocations = {};
  var existingHashes = {};
  var existingFingerprints = {};

  (staging.rows || []).forEach(function(row) {
    var rawGroupId = (row.PAYMENT_GROUP_ID || '').toString().trim();
    var groupId = rawGroupId ? makeImportPaymentGroupIdV2_({ PAYMENT_GROUP_ID: rawGroupId }) : '';
    var sourceYear = (row.SOURCE_YEAR || '').toString().trim();
    var sourceSheet = (row.SOURCE_SHEET || '').toString().trim();
    var sourceRow = (row.SOURCE_ROW || '').toString().trim();
    var location = makeEbayarSourceLocationKeyV2_(sourceYear, sourceSheet, sourceRow);
    var hash = (row.SOURCE_ROW_HASH || '').toString().trim();
    var fingerprint = makeEbayarSourceContentFingerprintV2_(row);
    if (groupId) existingGroupIds[groupId] = true;
    if (sourceYear && sourceSheet && sourceRow) existingLocations[location] = true;
    if (hash) existingHashes[hash] = true;
    if (fingerprint) existingFingerprints[fingerprint] = true;
  });

  var conflicts = [];
  (snapshots || []).forEach(function(snapshot) {
    var matchingKeys = [];
    if (existingGroupIds[snapshot.paymentGroupId]) matchingKeys.push('PAYMENT_GROUP_ID');
    if (existingLocations[snapshot.sourceLocation]) matchingKeys.push('SOURCE_LOCATION');
    if (existingHashes[snapshot.sourceRowHash]) matchingKeys.push('SOURCE_ROW_HASH');
    if (existingFingerprints[snapshot.contentFingerprint]) matchingKeys.push('SECONDARY_CONTENT_FINGERPRINT');
    if (matchingKeys.length) {
      conflicts.push({
        paymentGroupId: snapshot.paymentGroupId,
        sourceYear: snapshot.sourceYear,
        sourceSheet: snapshot.sourceSheet,
        sourceRow: snapshot.sourceRow,
        sourceRowHash: snapshot.sourceRowHash,
        sourceLocation: snapshot.sourceLocation,
        contentFingerprint: snapshot.contentFingerprint,
        matchingKeys: matchingKeys
      });
    }
  });
  return conflicts;
}

function findAmbiguousCurrentMonthSyncAnomaliesV2_(anomalies, candidates) {
  var identityTypes = {
    GROUP_ID_MULTIPLE_STAGED_HASHES: true,
    DUPLICATE_STAGED_SOURCE_IDENTITY: true,
    DUPLICATE_SOURCE_IDENTITY: true,
    SECONDARY_CONTENT_FINGERPRINT_MATCH: true
  };
  var groupIds = {};
  var locations = {};
  (candidates || []).forEach(function(candidate) {
    if (candidate.paymentGroupId) groupIds[candidate.paymentGroupId.toString()] = true;
    if (candidate.sourceLocation) locations[candidate.sourceLocation.toString()] = true;
  });
  return (anomalies || []).filter(function(anomaly) {
    if (!identityTypes[anomaly.type]) return false;
    var keys = [anomaly.key, anomaly.paymentGroupId, anomaly.sourceLocation];
    return keys.some(function(key) {
      var value = (key === null || key === undefined) ? '' : key.toString();
      return !!(groupIds[value] || locations[value]);
    });
  });
}

function syncCurrentMonthEbayarV2(params) {
  params = params || {};
  var admin = authorizeEbayarV2MaintenanceAdmin_(params);
  if (!admin.valid) return { success: false, message: admin.message };
  var meta = getCurrentEbayarMonthMetaV2_();
  if (!meta.success) return meta;
  var allowWrite = params.allowWrite === true;
  var requestedPaymentGroupIds = null;
  if (allowWrite) {
    var requestedIdsValidation = validateCurrentMonthSyncRequestedIdsV2_(params.paymentGroupIds);
    if (!requestedIdsValidation.success) return requestedIdsValidation;
    requestedPaymentGroupIds = requestedIdsValidation.paymentGroupIds;
  }
  return syncCurrentMonthEbayarV2Core_(meta, allowWrite, requestedPaymentGroupIds);
}

function validateCurrentMonthSyncRequestedIdsV2_(paymentGroupIds) {
  if (!Array.isArray(paymentGroupIds) || !paymentGroupIds.length) {
    return {
      success: false,
      mode: 'V2_CURRENT_MONTH_SYNC_GUARDED_WRITE',
      message: 'Sync dibatalkan: paymentGroupIds daripada preview diperlukan.'
    };
  }
  if (paymentGroupIds.length > 25) {
    return {
      success: false,
      mode: 'V2_CURRENT_MONTH_SYNC_GUARDED_WRITE',
      message: 'Safety limit: maksimum 25 paymentGroupIds setiap batch.'
    };
  }

  var normalizedIds = [];
  var seen = {};
  var duplicateIds = [];
  paymentGroupIds.forEach(function(value) {
    var groupId = (value === null || value === undefined) ? '' : value.toString().trim();
    if (!groupId) return;
    if (seen[groupId]) duplicateIds.push(groupId);
    seen[groupId] = true;
    normalizedIds.push(groupId);
  });
  if (normalizedIds.length !== paymentGroupIds.length) {
    return {
      success: false,
      mode: 'V2_CURRENT_MONTH_SYNC_GUARDED_WRITE',
      message: 'Sync dibatalkan: paymentGroupIds mengandungi ID kosong.'
    };
  }
  if (duplicateIds.length) {
    return {
      success: false,
      mode: 'V2_CURRENT_MONTH_SYNC_GUARDED_WRITE',
      message: 'Sync dibatalkan: paymentGroupIds mengandungi ID pendua.',
      conflicts: duplicateIds
    };
  }
  return { success: true, paymentGroupIds: normalizedIds };
}

function syncCurrentMonthEbayarV2Core_(meta, allowWrite, requestedPaymentGroupIds) {
  allowWrite = allowWrite === true;
  var mode = allowWrite ? 'V2_CURRENT_MONTH_SYNC_GUARDED_WRITE' : 'V2_CURRENT_MONTH_SYNC_PREVIEW_READ_ONLY';

  try {
    var preview = getCurrentMonthPreviewDataV2_(meta);
    var compactPreview = compactCurrentMonthPreviewV2_(meta, preview);
    if (!preview || preview.success !== true || !compactPreview.success) {
      return {
        success: false,
        mode: mode,
        tahun: meta.tahun,
        bulanKey: meta.bulanKey,
        sourceSheet: meta.sourceSheet,
        message: compactPreview.message || 'Preview bulan semasa gagal.'
      };
    }
    if ((preview.changedExistingGroups || 0) > 0) {
      return {
        success: false,
        mode: mode,
        tahun: meta.tahun,
        bulanKey: meta.bulanKey,
        sourceSheet: meta.sourceSheet,
        message: 'Sync dibatalkan: changedExistingGroups mesti 0.',
        changedExistingGroups: preview.changedExistingGroups
      };
    }

    var candidates = (preview.genuinelyNewCandidates || []).slice().sort(function(a, b) {
      return parseInt(a.sourceRow, 10) - parseInt(b.sourceRow, 10);
    });
    if (!candidates.length) {
      return {
        success: true,
        mode: 'V2_CURRENT_MONTH_SYNC_NO_CHANGES',
        tahun: meta.tahun,
        bulanKey: meta.bulanKey,
        sourceSheet: meta.sourceSheet,
        selectedGroups: 0,
        selectedPaymentGroupIds: [],
        projectedChildRows: 0,
        projectedTotalAmount: 0,
        appendedGroups: 0,
        appendedChildRows: 0,
        appendedTotalAmount: 0,
        remainingNewGroups: 0,
        morePending: false,
        postWriteExistingGroups: preview.existingUnchangedGroups || 0,
        postWriteGenuinelyNewGroups: 0,
        postWriteChangedExistingGroups: 0,
        postWriteProjectedChildRows: 0,
        postWriteProjectedTotalAmount: 0
      };
    }
    if (candidates.length !== (preview.genuinelyNewGroups || 0)) {
      return {
        success: false,
        mode: mode,
        message: 'Sync dibatalkan: senarai genuinely-new tidak lengkap.',
        genuinelyNewGroups: preview.genuinelyNewGroups,
        genuinelyNewCandidates: candidates.length
      };
    }

    var ambiguousAnomalies = findAmbiguousCurrentMonthSyncAnomaliesV2_(preview.anomalies, candidates);
    if (ambiguousAnomalies.length) {
      return {
        success: false,
        mode: mode,
        message: 'Sync dibatalkan: anomaly identiti melibatkan calon baharu.',
        conflicts: ambiguousAnomalies
      };
    }

    var candidateIds = [];
    var candidateById = {};
    var duplicateCandidateIds = [];
    candidates.forEach(function(candidate) {
      var groupId = (candidate.paymentGroupId || '').toString().trim();
      if (candidateById[groupId]) duplicateCandidateIds.push(groupId);
      candidateById[groupId] = candidate;
      candidateIds.push(groupId);
    });
    if (duplicateCandidateIds.length) {
      return { success: false, mode: mode, message: 'Sync dibatalkan: paymentGroupId calon pendua.', conflicts: duplicateCandidateIds };
    }

    var selectedCandidateIds = candidateIds;
    if (allowWrite) {
      selectedCandidateIds = requestedPaymentGroupIds || [];
      var missingRequestedIds = selectedCandidateIds.filter(function(groupId) { return !candidateById[groupId]; });
      if (missingRequestedIds.length) {
        return {
          success: false,
          mode: mode,
          message: 'Sync dibatalkan: paymentGroupIds preview tidak lagi genuinely-new. Sila preview semula.',
          conflicts: missingRequestedIds
        };
      }
    }

    var preLockBuild = buildCurrentMonthSyncGroupsV2_(meta, selectedCandidateIds);
    if (!preLockBuild.success) return { success: false, mode: mode, message: preLockBuild.message };
    var validationConflicts = [];
    var allSnapshots = [];
    selectedCandidateIds.forEach(function(groupId) {
      var group = preLockBuild.groups[groupId];
      var errors = validateCurrentMonthSyncGroupV2_(meta, group, candidateById[groupId]);
      if (errors.length) {
        validationConflicts.push({ paymentGroupId: groupId, reasons: errors });
      } else {
        allSnapshots.push(makeCurrentMonthSyncSnapshotV2_(group));
      }
    });
    if (Object.keys(preLockBuild.groups).length !== selectedCandidateIds.length) {
      validationConflicts.push({
        reason: 'PRE_LOCK_GROUP_COUNT_MISMATCH',
        expectedGroups: selectedCandidateIds.length,
        actualGroups: Object.keys(preLockBuild.groups).length
      });
    }
    if (validationConflicts.length) {
      return {
        success: false,
        mode: mode,
        message: 'Sync dibatalkan: calon baharu gagal validasi sumber semasa.',
        conflicts: validationConflicts
      };
    }

    allSnapshots.sort(function(a, b) { return a.sourceRow - b.sourceRow; });
    var snapshotById = {};
    allSnapshots.forEach(function(snapshot) { snapshotById[snapshot.paymentGroupId] = snapshot; });
    var selectedPaymentGroupIds = allowWrite
      ? selectedCandidateIds.slice()
      : allSnapshots.slice(0, 25).map(function(snapshot) { return snapshot.paymentGroupId; });
    var selectedSnapshots = selectedPaymentGroupIds.map(function(groupId) { return snapshotById[groupId]; });
    var remainingNewGroups = candidates.length - selectedSnapshots.length;
    var morePending = remainingNewGroups > 0;
    var projectedChildRows = selectedSnapshots.reduce(function(total, snapshot) { return total + snapshot.childRows; }, 0);
    var projectedTotalAmount = selectedSnapshots.reduce(function(total, snapshot) { return total + snapshot.amountTotal; }, 0);

    var preLockConflicts = findCurrentMonthSyncStagingConflictsV2_(selectedSnapshots);
    if (preLockConflicts.length) {
      return {
        success: false,
        mode: mode,
        tahun: meta.tahun,
        bulanKey: meta.bulanKey,
        sourceSheet: meta.sourceSheet,
        selectedGroups: selectedSnapshots.length,
        selectedPaymentGroupIds: selectedPaymentGroupIds,
        message: 'Sync dibatalkan: konflik staging dijumpai sebelum script lock.',
        conflicts: preLockConflicts,
        remainingNewGroups: remainingNewGroups,
        morePending: morePending
      };
    }

    if (!allowWrite) {
      return {
        success: true,
        mode: 'V2_CURRENT_MONTH_SYNC_PREVIEW_READ_ONLY',
        tahun: meta.tahun,
        bulanKey: meta.bulanKey,
        sourceSheet: meta.sourceSheet,
        selectedGroups: selectedSnapshots.length,
        selectedPaymentGroupIds: selectedPaymentGroupIds,
        projectedChildRows: projectedChildRows,
        projectedTotalAmount: projectedTotalAmount,
        appendedGroups: 0,
        appendedChildRows: 0,
        appendedTotalAmount: 0,
        remainingNewGroups: remainingNewGroups,
        morePending: morePending
      };
    }

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      return {
        success: false,
        mode: mode,
        tahun: meta.tahun,
        bulanKey: meta.bulanKey,
        sourceSheet: meta.sourceSheet,
        selectedGroups: selectedSnapshots.length,
        selectedPaymentGroupIds: selectedPaymentGroupIds,
        message: 'Sync dibatalkan: gagal mendapatkan script lock.',
        appendedGroups: 0,
        appendedChildRows: 0,
        appendedTotalAmount: 0,
        remainingNewGroups: remainingNewGroups,
        morePending: morePending
      };
    }

    var appendedChildRows = 0;
    var appendedTotalAmount = 0;
    try {
      var freshBuild = buildCurrentMonthSyncGroupsV2_(meta, selectedPaymentGroupIds);
      var sourceWindowConflicts = [];
      var freshSnapshots = [];
      var freshSnapshotById = {};
      if (!freshBuild.success) {
        sourceWindowConflicts.push({ reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW', detail: freshBuild.message });
      } else {
        selectedSnapshots.forEach(function(before) {
          var freshGroup = freshBuild.groups[before.paymentGroupId];
          var freshErrors = validateCurrentMonthSyncGroupV2_(meta, freshGroup, null);
          if (freshErrors.length) {
            sourceWindowConflicts.push({
              paymentGroupId: before.paymentGroupId,
              reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
              differences: freshErrors
            });
            return;
          }
          var freshSnapshot = makeCurrentMonthSyncSnapshotV2_(freshGroup);
          var differences = compareCurrentMonthSyncSnapshotsV2_(before, freshSnapshot);
          if (differences.length) {
            sourceWindowConflicts.push({
              paymentGroupId: before.paymentGroupId,
              reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
              differences: differences,
              before: before,
              fresh: freshSnapshot
            });
          } else {
            freshSnapshots.push(freshSnapshot);
            freshSnapshotById[freshSnapshot.paymentGroupId] = freshSnapshot;
          }
        });
        if (Object.keys(freshBuild.groups).length !== selectedSnapshots.length) {
          sourceWindowConflicts.push({
            reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
            detail: 'FRESH_GROUP_COUNT_MISMATCH',
            expectedGroups: selectedSnapshots.length,
            actualGroups: Object.keys(freshBuild.groups).length
          });
        }
      }

      var freshSelectedRows = [];
      selectedPaymentGroupIds.forEach(function(groupId) {
        var freshGroup = freshBuild.success ? freshBuild.groups[groupId] : null;
        if (!freshGroup) return;
        freshGroup.rows.forEach(function(row) { freshSelectedRows.push(row); });
      });
      if (!freshSelectedRows.length || freshSnapshots.length !== selectedSnapshots.length ||
          Object.keys(freshSnapshotById).length !== selectedSnapshots.length) {
        sourceWindowConflicts.push({
          reason: 'SOURCE_CHANGED_DURING_WRITE_WINDOW',
          detail: 'FRESH_SELECTED_ROWS_EMPTY_OR_GROUP_COUNT_MISMATCH',
          freshSelectedChildRows: freshSelectedRows.length,
          expectedGroups: selectedSnapshots.length,
          freshValidGroups: freshSnapshots.length
        });
      }
      if (sourceWindowConflicts.length) {
        return {
          success: false,
          mode: mode,
          tahun: meta.tahun,
          bulanKey: meta.bulanKey,
          sourceSheet: meta.sourceSheet,
          selectedGroups: selectedSnapshots.length,
          selectedPaymentGroupIds: selectedPaymentGroupIds,
          message: 'Sync dibatalkan sepenuhnya: sumber berubah semasa write window.',
          conflicts: sourceWindowConflicts,
          appendedGroups: 0,
          appendedChildRows: 0,
          appendedTotalAmount: 0,
          remainingNewGroups: remainingNewGroups,
          morePending: morePending
        };
      }

      var finalStagingConflicts = findCurrentMonthSyncStagingConflictsV2_(freshSnapshots);
      if (finalStagingConflicts.length) {
        return {
          success: false,
          mode: mode,
          tahun: meta.tahun,
          bulanKey: meta.bulanKey,
          sourceSheet: meta.sourceSheet,
          selectedGroups: selectedSnapshots.length,
          selectedPaymentGroupIds: selectedPaymentGroupIds,
          message: 'Sync dibatalkan sepenuhnya: konflik staging dijumpai semasa final recheck.',
          conflicts: finalStagingConflicts,
          appendedGroups: 0,
          appendedChildRows: 0,
          appendedTotalAmount: 0,
          remainingNewGroups: remainingNewGroups,
          morePending: morePending
        };
      }

      var ss = getEbayarMasterSpreadsheetForImportV2_();
      var sheet = ss.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
      if (!sheet) {
        return { success: false, mode: mode, message: 'Payments tab tidak dijumpai.', appendedGroups: 0, appendedChildRows: 0 };
      }
      var headerIndex = getPaymentsHeaderIndexV2_(sheet);
      var requiredHeaders = ['PAYMENT_ID', 'PAYMENT_GROUP_ID', 'SOURCE_YEAR', 'SOURCE_SHEET', 'SOURCE_ROW', 'SOURCE_ROW_HASH'];
      var missingHeaders = requiredHeaders.filter(function(header) {
        return headerIndex[header] === undefined || headerIndex[header] === null;
      });
      if (missingHeaders.length) {
        return {
          success: false,
          mode: mode,
          message: 'Header Payments hilang.',
          missingHeaders: missingHeaders,
          appendedGroups: 0,
          appendedChildRows: 0
        };
      }

      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
        return (header || '').toString().trim();
      });
      var timestampNow = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
      var rowsToAppend = freshSelectedRows.map(function(row) {
        return mapDraftPaymentToMasterRowV2_(row, headerIndex, headers, timestampNow);
      });
      if (!rowsToAppend.length) {
        return {
          success: false,
          mode: mode,
          message: 'Sync dibatalkan: tiada fresh child rows untuk append.',
          appendedGroups: 0,
          appendedChildRows: 0
        };
      }
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
      appendedChildRows = rowsToAppend.length;
      appendedTotalAmount = freshSnapshots.reduce(function(total, snapshot) { return total + snapshot.amountTotal; }, 0);
    } finally {
      lock.releaseLock();
    }

    var postWritePreview = getCurrentMonthPreviewDataV2_(meta);
    var postWriteCompact = compactCurrentMonthPreviewV2_(meta, postWritePreview);
    var selectedIdSet = {};
    selectedPaymentGroupIds.forEach(function(groupId) { selectedIdSet[groupId] = true; });
    var selectedStillNew = postWritePreview && postWritePreview.success === true
      ? (postWritePreview.genuinelyNewCandidates || []).filter(function(candidate) {
          return !!selectedIdSet[(candidate.paymentGroupId || '').toString()];
        }).map(function(candidate) { return candidate.paymentGroupId; })
      : selectedPaymentGroupIds.slice();
    var postWritePresence = findCurrentMonthSyncStagingConflictsV2_(selectedSnapshots);
    var fullyPresent = postWritePresence.length === selectedSnapshots.length && postWritePresence.every(function(conflict) {
      return ['PAYMENT_GROUP_ID', 'SOURCE_LOCATION', 'SOURCE_ROW_HASH', 'SECONDARY_CONTENT_FINGERPRINT'].every(function(key) {
        return conflict.matchingKeys.indexOf(key) !== -1;
      });
    });
    var postWriteSource = buildCurrentMonthSyncGroupsV2_(meta, selectedPaymentGroupIds);
    var postWriteSourceMatches = postWriteSource.success === true &&
      Object.keys(postWriteSource.groups).length === selectedSnapshots.length &&
      selectedSnapshots.every(function(before) {
        var sourceGroup = postWriteSource.groups[before.paymentGroupId];
        if (validateCurrentMonthSyncGroupV2_(meta, sourceGroup, null).length) return false;
        return compareCurrentMonthSyncSnapshotsV2_(before, makeCurrentMonthSyncSnapshotV2_(sourceGroup)).length === 0;
      });
    var postWriteVerified = postWritePreview && postWritePreview.success === true && postWriteCompact.success === true &&
      (postWritePreview.changedExistingGroups || 0) === 0 && selectedStillNew.length === 0 && fullyPresent && postWriteSourceMatches;

    return {
      success: postWriteVerified,
      mode: postWriteVerified ? 'V2_CURRENT_MONTH_SYNC_GUARDED_WRITE' : 'V2_CURRENT_MONTH_SYNC_POST_WRITE_VERIFICATION_FAILED',
      tahun: meta.tahun,
      bulanKey: meta.bulanKey,
      sourceSheet: meta.sourceSheet,
      selectedGroups: selectedSnapshots.length,
      selectedPaymentGroupIds: selectedPaymentGroupIds,
      appendedGroups: selectedSnapshots.length,
      appendedChildRows: appendedChildRows,
      appendedTotalAmount: appendedTotalAmount,
      remainingNewGroups: remainingNewGroups,
      morePending: morePending,
      postWriteExistingGroups: postWritePreview && postWritePreview.success ? (postWritePreview.existingUnchangedGroups || 0) : null,
      postWriteGenuinelyNewGroups: postWritePreview && postWritePreview.success ? (postWritePreview.genuinelyNewGroups || 0) : null,
      postWriteChangedExistingGroups: postWritePreview && postWritePreview.success ? (postWritePreview.changedExistingGroups || 0) : null,
      postWriteProjectedChildRows: postWritePreview && postWritePreview.success ? (postWritePreview.projectedChildRows || 0) : null,
      postWriteProjectedTotalAmount: postWritePreview && postWritePreview.success ? (postWritePreview.projectedTotalAmount || 0) : null,
      postWriteSelectedGroupsStillNew: selectedStillNew,
      postWriteSelectedGroupsFullyPresent: fullyPresent,
      postWriteSelectedSourceGroupsUnchanged: postWriteSourceMatches,
      message: postWriteVerified ? 'Sync bulan semasa selesai dan disahkan.' : 'Write selesai tetapi post-write verification gagal; tiada rollback atau batch kedua dijalankan.'
    };
  } catch (err) {
    Logger.log('syncCurrentMonthEbayarV2Core_ error: ' + err.message);
    return { success: false, mode: mode, message: err.message };
  }
}

function testSyncCurrentMonthEbayarV2CorePreview() {
  var meta = getCurrentEbayarMonthMetaV2_();
  var result = meta.success ? syncCurrentMonthEbayarV2Core_(meta, false) : meta;
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}


function getPaymentsHeaderIndexV2_(sheet) {
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return {};
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = {};
  headers.forEach(function(header, i) {
    var key = normalizePaymentsHeaderKeyV2_(header);
    if (key) idx[key] = i;
  });
  return idx;
}

function normalizePaymentsHeaderKeyV2_(header) {
  return (header || '').toString()
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function getPaymentsHeaderColumnNumberV2_(sheet, headerName) {
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return null;
  var target = normalizePaymentsHeaderKeyV2_(headerName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (normalizePaymentsHeaderKeyV2_(headers[i]) === target) return i + 1;
  }
  return null;
}

function getExistingPaymentSourceHashesV2_(sheet, headerIndex) {
  var hashes = {};
  var hashColumn = getPaymentsHeaderColumnNumberV2_(sheet, 'SOURCE_ROW_HASH');
  if (!hashColumn && headerIndex && headerIndex.SOURCE_ROW_HASH !== undefined && headerIndex.SOURCE_ROW_HASH !== null) {
    hashColumn = headerIndex.SOURCE_ROW_HASH + 1;
  }
  if (!hashColumn) return hashes;
  if (sheet.getLastRow() < 2) return hashes;
  var values = sheet.getRange(2, hashColumn, sheet.getLastRow() - 1, 1).getValues();
  values.forEach(function(row) {
    var hash = (row[0] || '').toString().trim();
    if (hash) hashes[hash] = true;
  });
  return hashes;
}

function testExistingPaymentSourceHashesV2() {
  var ss = getEbayarMasterSpreadsheetForImportV2_();
  var sheet = ss.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
  if (!sheet) {
    var missing = { success: false, message: 'Payments tab tidak dijumpai.' };
    Logger.log(JSON.stringify(missing, null, 2));
    return missing;
  }

  var hashColumn = getPaymentsHeaderColumnNumberV2_(sheet, 'SOURCE_ROW_HASH');
  var first10Hashes = [];
  var existingHashCount = 0;
  if (hashColumn && sheet.getLastRow() >= 2) {
    var values = sheet.getRange(2, hashColumn, sheet.getLastRow() - 1, 1).getValues();
    values.forEach(function(row) {
      var hash = (row[0] || '').toString().trim();
      if (!hash) return;
      existingHashCount++;
      if (first10Hashes.length < 10) first10Hashes.push(hash);
    });
  }

  var result = {
    success: true,
    mode: 'V2_EXISTING_SOURCE_HASH_DIAGNOSTIC_READ_ONLY',
    lastRow: sheet.getLastRow(),
    sourceRowHashColumn: hashColumn,
    existingHashCount: existingHashCount,
    first10Hashes: first10Hashes
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function getEbayarMasterSpreadsheetForImportV2_() {
  var id = (PropertiesService.getScriptProperties().getProperty(EBAYAR_MASTER_PROP_KEY_V2) || '').toString().trim();
  if (!id) throw new Error('Script Property ' + EBAYAR_MASTER_PROP_KEY_V2 + ' belum ditetapkan.');
  return SpreadsheetApp.openById(id);
}

function mapDraftPaymentToImportObjectV2_(draftRow, timestampNow) {
  return {
    PAYMENT_ID: makeImportPaymentIdV2_(draftRow),
    PAYMENT_GROUP_ID: makeImportPaymentGroupIdV2_(draftRow),
    TIMESTAMP: draftRow.TIMESTAMP,
    TAHUN: draftRow.TAHUN,
    BULAN: draftRow.BULAN,
    BULAN_KEY: draftRow.BULAN_KEY,
    NAMA_MURID_RAW: draftRow.NAMA_MURID_RAW,
    NAMA_MURID_NORM: draftRow.NAMA_MURID_NORM,
    JUMLAH: draftRow.JUMLAH,
    AMOUNT_TOTAL: draftRow.AMOUNT_TOTAL,
    AMOUNT_ALLOCATED: draftRow.AMOUNT_ALLOCATED || '',
    STATUS: draftRow.STATUS,
    KAEDAH: draftRow.KAEDAH || '',
    RESIT_URL: draftRow.RESIT_URL,
    SOURCE_YEAR: draftRow.SOURCE_YEAR,
    SOURCE_SHEET: draftRow.SOURCE_SHEET,
    SOURCE_ROW: draftRow.SOURCE_ROW,
    SOURCE_ROW_HASH: draftRow.SOURCE_ROW_HASH,
    MATCH_STATUS: 'UNMATCHED',
    MATCH_CONFIDENCE: '',
    NOTE: draftRow.NOTE,
    CREATED_AT: timestampNow,
    UPDATED_AT: timestampNow
  };
}

function mapDraftPaymentToMasterRowV2_(draftRow, headerIndex, headers, timestampNow) {
  var output = new Array(headers.length).fill('');
  var mapped = mapDraftPaymentToImportObjectV2_(draftRow, timestampNow);

  Object.keys(mapped).forEach(function(key) {
    if (headerIndex[key] !== undefined && headerIndex[key] !== null) {
      output[headerIndex[key]] = mapped[key];
    }
  });
  return output;
}

function filterDraftRowsByFirstPaymentGroupsV2_(draftRows, limitSourceRows, options) {
  draftRows = draftRows || [];
  options = options || {};
  var existingHashes = options.existingHashes || {};
  var skipExistingGroupsFirst = options.skipExistingGroupsFirst === true;
  var allowedGroups = {};
  var groupOrder = [];

  draftRows.forEach(function(row) {
    var groupId = (row.PAYMENT_GROUP_ID || '').toString();
    if (!groupId || allowedGroups[groupId]) return;
    if (skipExistingGroupsFirst && existingHashes[row.SOURCE_ROW_HASH]) return;
    if (groupOrder.length >= limitSourceRows) return;
    allowedGroups[groupId] = true;
    groupOrder.push(groupId);
  });

  return {
    sourceGroupsSelected: groupOrder.length,
    paymentGroupIds: groupOrder,
    draftRows: draftRows.filter(function(row) {
      return !!allowedGroups[(row.PAYMENT_GROUP_ID || '').toString()];
    })
  };
}

function importEbayarPaymentsToMasterV2(params) {
  params = params || {};
  try {
    var sourceYear = parseInt(params.sourceYear, 10);
    if (sourceYear !== 2025 && sourceYear !== 2026) {
      return { success: false, message: 'sourceYear required: 2025 atau 2026.' };
    }

    var limitSourceRows = params.limitSourceRows === undefined || params.limitSourceRows === null || params.limitSourceRows === ''
      ? 5
      : parseInt(params.limitSourceRows, 10);
    if (isNaN(limitSourceRows) || limitSourceRows <= 0 || limitSourceRows > 25) {
      return { success: false, message: 'Safety limit: limitSourceRows mesti > 0 dan <= 25.' };
    }

    var dryRun = params.dryRun === true;
    var skipExistingGroupsFirst = params.skipExistingGroupsFirst === true;
    var draft = buildEbayarImportRowsDryRunV2_({
      sourceYear: sourceYear,
      includeDraftRows: true
    });
    if (!draft || !draft.success) return draft;

    var ss = getEbayarMasterSpreadsheetForImportV2_();
    var sheet = ss.getSheetByName(EBAYAR_PAYMENTS_TAB_V2);
    if (!sheet) return { success: false, message: 'Payments tab tidak dijumpai dalam SPKM eBayar Master.' };

    var headerIndex = getPaymentsHeaderIndexV2_(sheet);
    var requiredHeaders = ['PAYMENT_ID', 'PAYMENT_GROUP_ID', 'SOURCE_ROW_HASH'];
    for (var h = 0; h < requiredHeaders.length; h++) {
      if (headerIndex[requiredHeaders[h]] === undefined || headerIndex[requiredHeaders[h]] === null) {
        return { success: false, message: 'Header Payments hilang: ' + requiredHeaders[h] };
      }
    }

    var existingHashes = getExistingPaymentSourceHashesV2_(sheet, headerIndex);
    var selected = filterDraftRowsByFirstPaymentGroupsV2_(draft.draftRows || [], limitSourceRows, {
      existingHashes: existingHashes,
      skipExistingGroupsFirst: skipExistingGroupsFirst
    });
    var selectedDraftRows = selected.draftRows;
    var rowsToAppend = [];
    var sampleRows = [];
    var skippedDuplicateRows = 0;
    var timestampNow = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(header) {
      return (header || '').toString().trim();
    });

    selectedDraftRows.forEach(function(row) {
      if (existingHashes[row.SOURCE_ROW_HASH]) {
        skippedDuplicateRows++;
        return;
      }
      if (sampleRows.length < 5) sampleRows.push(mapDraftPaymentToImportObjectV2_(row, timestampNow));
      rowsToAppend.push(mapDraftPaymentToMasterRowV2_(row, headerIndex, headers, timestampNow));
    });

    var result = {
      success: dryRun ? true : params.allowWrite === true,
      mode: dryRun ? 'V2_IMPORT_PREVIEW_READ_ONLY' : 'V2_IMPORT_STAGING_SMALL_BATCH',
      sourceYear: sourceYear,
      limitSourceRows: limitSourceRows,
      skipExistingGroupsFirst: skipExistingGroupsFirst,
      sourceGroupsSelected: selected.sourceGroupsSelected,
      draftRows: selectedDraftRows.length,
      existingHashCount: Object.keys(existingHashes).length,
      rowsToAppend: rowsToAppend.length,
      skippedDuplicateRows: skippedDuplicateRows,
      appendedRows: 0,
      sampleRows: sampleRows,
      message: ''
    };

    if (dryRun) {
      result.message = 'Preview sahaja. Tiada data ditulis.';
      return result;
    }

    if (params.allowWrite !== true) {
      result.success = false;
      result.message = 'Safety block: set allowWrite:true untuk tulis ke staging Payments.';
      return result;
    }

    if (!rowsToAppend.length) {
      result.success = true;
      result.message = 'Tiada row baharu untuk append; semua SOURCE_ROW_HASH sudah wujud atau draft kosong.';
      return result;
    }

    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    result.appendedRows = rowsToAppend.length;
    result.message = 'Small batch import ke staging Payments selesai.';
    return result;
  } catch (err) {
    Logger.log('importEbayarPaymentsToMasterV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function testImportEbayarPayments2026SmallBatchV2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2026,
    limitSourceRows: 5,
    allowWrite: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportEbayarPayments2026SmallBatchPreviewV2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2026,
    limitSourceRows: 5,
    dryRun: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportEbayarPayments2026NextBatchPreviewV2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2026,
    limitSourceRows: 10,
    skipExistingGroupsFirst: true,
    dryRun: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportEbayarPayments2026NextBatchV2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2026,
    limitSourceRows: 10,
    skipExistingGroupsFirst: true,
    allowWrite: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportEbayarPayments2026NextBatch25PreviewV2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2026,
    limitSourceRows: 25,
    skipExistingGroupsFirst: true,
    dryRun: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportEbayarPayments2026NextBatch25V2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2026,
    limitSourceRows: 25,
    skipExistingGroupsFirst: true,
    allowWrite: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportEbayarPayments2025NextBatch25PreviewV2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2025,
    limitSourceRows: 25,
    skipExistingGroupsFirst: true,
    dryRun: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testImportEbayarPayments2025NextBatch25V2() {
  var result = importEbayarPaymentsToMasterV2({
    sourceYear: 2025,
    limitSourceRows: 25,
    skipExistingGroupsFirst: true,
    allowWrite: true
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testDryRunImportEbayar2025V2() {
  var result = dryRunImportEbayarSourceV2({ sourceYear: 2025 });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testDryRunImportEbayar2026V2() {
  var result = dryRunImportEbayarSourceV2({ sourceYear: 2026 });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function listEbayarYears(params) {
  params = params || {};
  try {
    var data = getPaymentsRowsV2_();
    var years = {};
    data.rows.forEach(function(r) {
      var y = (r.TAHUN || r.SOURCE_YEAR || '').toString().replace(/[^0-9]/g, '');
      if (y) years[y] = true;
    });
    return { success: true, years: Object.keys(years).sort(), count: Object.keys(years).length };
  } catch (err) {
    Logger.log('listEbayarYears error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function getMonthlyPaymentSummaryV2(params) {
  params = params || {};
  try {
    var tahun = (params.tahun || '').toString().replace(/[^0-9]/g, '');
    var bulanKeyFilter = normalizeBulanKeyV2_(params.bulanKey, tahun, params.bulan || params.bulanKey);
    var data = getPaymentsRowsV2_();
    var byMonth = {};

    data.rows.forEach(function(r) {
      var bulanKey = (r.BULAN_KEY || makeBulanKeyV2_(r.TAHUN, r.BULAN || r.SOURCE_SHEET)).toString();
      if (!bulanKey) return;
      if (tahun && bulanKey.indexOf(tahun + '-') !== 0) return;
      if (bulanKeyFilter && bulanKey !== bulanKeyFilter) return;
      if (!byMonth[bulanKey]) {
        byMonth[bulanKey] = { bulanKey: bulanKey, tahun: bulanKey.split('-')[0], paymentRows: 0, paidStudents: {}, paymentGroups: {}, totalKutipan: 0 };
      }
      var bucket = byMonth[bulanKey];
      var nama = normalizeYuranNameV2_(r.NAMA_MURID_NORM || r.NAMA_MURID_RAW);
      var status = (r.STATUS || '').toString().trim().toUpperCase();
      if (nama && (!status || status === 'SELESAI')) bucket.paidStudents[nama] = true;
      bucket.paymentRows++;

      var groupId = (r.PAYMENT_GROUP_ID || r.PAYMENT_ID || '').toString().trim() || ('ROW-' + r._rowNumber);
      if (!bucket.paymentGroups[groupId]) {
        var amount = parseFloat(r.AMOUNT_TOTAL || r.JUMLAH || 0);
        bucket.paymentGroups[groupId] = true;
        if (!isNaN(amount)) bucket.totalKutipan += amount;
      }
    });

    var summaries = Object.keys(byMonth).sort().map(function(k) {
      var b = byMonth[k];
      return {
        bulanKey: b.bulanKey,
        tahun: b.tahun,
        paymentRows: b.paymentRows,
        paymentGroups: Object.keys(b.paymentGroups).length,
        selesai: Object.keys(b.paidStudents).length,
        totalKutipan: b.totalKutipan
      };
    });

    return { success: true, summaries: summaries };
  } catch (err) {
    Logger.log('getMonthlyPaymentSummaryV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function getYuranStatsV2(params) {
  params = params || {};
  try {
    var tahun = (params.tahun || '').toString().replace(/[^0-9]/g, '') || '2026';
    var bulanKey = normalizeBulanKeyV2_(params.bulanKey, tahun, params.bulan || params.bulanKey);
    if (!bulanKey) return { success: false, message: 'Parameter bulan atau bulanKey diperlukan.' };

    var data = getPaymentsRowsV2_();
    var paid = {};
    var listResit = [];
    var groups = {};
    var totalKutipan = 0;

    data.rows.forEach(function(r) {
      var rowBulanKey = (r.BULAN_KEY || makeBulanKeyV2_(r.TAHUN, r.BULAN || r.SOURCE_SHEET)).toString();
      if (rowBulanKey !== bulanKey) return;
      var status = (r.STATUS || '').toString().trim().toUpperCase();
      if (status && status !== 'SELESAI') return;
      var nama = normalizeYuranNameV2_(r.NAMA_MURID_NORM || r.NAMA_MURID_RAW);
      if (nama) {
        paid[nama] = true;
        listResit.push({ nama: nama, resitUrl: (r.RESIT_URL || '').toString().trim() });
      }
      var groupId = (r.PAYMENT_GROUP_ID || r.PAYMENT_ID || '').toString().trim() || ('ROW-' + r._rowNumber);
      if (!groups[groupId]) {
        var amount = parseFloat(r.AMOUNT_TOTAL || r.JUMLAH || 0);
        groups[groupId] = true;
        if (!isNaN(amount)) totalKutipan += amount;
      }
    });

    var eligible = getEligibleYuranStudentsV2_(tahun, bulanKey);
    var telefonMap = getTelefonMapV2_();
    var belumBayar = eligible
      .filter(function(m) { return !paid[m.nama]; })
      .map(function(m) { return { nama: m.nama, telefon: telefonMap[m.nama] || '' }; });
    var listNamaBayar = Object.keys(paid).sort();

    return {
      success: true,
      mode: 'V2_SHADOW',
      bulanKey: bulanKey,
      sudahBayar: listNamaBayar.length,
      totalKutipan: totalKutipan,
      listNamaBayar: listNamaBayar,
      listResit: listResit,
      belumBayar: belumBayar,
      totalMurid: eligible.length
    };
  } catch (err) {
    Logger.log('getYuranStatsV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function getYuranParentV2(params) {
  params = params || {};
  try {
    var keyword = normalizeYuranNameV2_(params.keyword || '');
    var tahun = (params.tahun || '').toString().replace(/[^0-9]/g, '') || '2026';
    var data = getPaymentsRowsV2_();
    var found = [];
    var paidByMonth = {};

    data.rows.forEach(function(r) {
      var bulanKey = (r.BULAN_KEY || makeBulanKeyV2_(r.TAHUN, r.BULAN || r.SOURCE_SHEET)).toString();
      if (!bulanKey || bulanKey.indexOf(tahun + '-') !== 0) return;
      var status = (r.STATUS || '').toString().trim().toUpperCase();
      if (status && status !== 'SELESAI') return;
      var nama = normalizeYuranNameV2_(r.NAMA_MURID_NORM || r.NAMA_MURID_RAW);
      if (!nama) return;
      if (!paidByMonth[bulanKey]) paidByMonth[bulanKey] = {};
      paidByMonth[bulanKey][nama] = true;
      if (keyword.length >= 2 && nama.indexOf(keyword) !== -1) {
        found.push({
          nama: nama,
          bulan: bulanKey,
          bulanKey: bulanKey,
          resitUrl: (r.RESIT_URL || '').toString().trim()
        });
      }
    });

    var belumBayar = {};
    EBAYAR_MONTHS_V2.forEach(function(m) {
      var bulanKey = tahun + '-' + m.key;
      var eligible = getEligibleYuranStudentsV2_(tahun, bulanKey);
      var paidSet = paidByMonth[bulanKey] || {};
      belumBayar[bulanKey] = eligible
        .filter(function(st) { return !paidSet[st.nama]; })
        .map(function(st) { return st.nama; });
    });

    return { success: true, mode: 'V2_SHADOW', found: found, belumBayar: belumBayar };
  } catch (err) {
    Logger.log('getYuranParentV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function compareYuranLegacyVsV2(params) {
  params = params || {};
  try {
    var tahun = (params.tahun || '').toString().replace(/[^0-9]/g, '') || '2026';
    var bulan = (params.bulan || '').toString().trim().toUpperCase();
    var bulanKey = normalizeBulanKeyV2_(params.bulanKey, tahun, bulan || params.bulanKey);
    var meta = getMonthMetaV2_(bulanKey);
    if (!meta) return { success: false, message: 'Bulan tidak dikenali.' };
    var legacyBulan = bulan || meta.legacy.replace('2026', tahun);
    var legacy = getYuranStats({ bulan: legacyBulan });
    var v2 = getYuranStatsV2({ tahun: tahun, bulanKey: bulanKey });
    if (!legacy.success || !v2.success) {
      return { success: false, legacy: legacy, v2: v2, message: 'Legacy atau V2 gagal dibaca.' };
    }

    var legacyPaid = {};
    (legacy.listNamaBayar || []).forEach(function(n) { legacyPaid[normalizeYuranNameV2_(n)] = true; });
    var v2Paid = {};
    (v2.listNamaBayar || []).forEach(function(n) { v2Paid[normalizeYuranNameV2_(n)] = true; });
    var onlyLegacy = Object.keys(legacyPaid).filter(function(n) { return !v2Paid[n]; }).sort();
    var onlyV2 = Object.keys(v2Paid).filter(function(n) { return !legacyPaid[n]; }).sort();

    return {
      success: true,
      mode: 'V2_SHADOW_COMPARE',
      bulan: legacyBulan,
      bulanKey: bulanKey,
      legacy: {
        sudahBayar: legacy.sudahBayar,
        belumBayar: (legacy.belumBayar || []).length,
        totalMurid: legacy.totalMurid,
        totalKutipan: legacy.totalKutipan
      },
      v2: {
        sudahBayar: v2.sudahBayar,
        belumBayar: (v2.belumBayar || []).length,
        totalMurid: v2.totalMurid,
        totalKutipan: v2.totalKutipan
      },
      diff: {
        sudahBayar: v2.sudahBayar - legacy.sudahBayar,
        belumBayar: (v2.belumBayar || []).length - (legacy.belumBayar || []).length,
        totalMurid: v2.totalMurid - legacy.totalMurid,
        totalKutipan: v2.totalKutipan - legacy.totalKutipan,
        onlyLegacy: onlyLegacy,
        onlyV2: onlyV2
      }
    };
  } catch (err) {
    Logger.log('compareYuranLegacyVsV2 error: ' + err.message);
    return { success: false, message: err.message };
  }
}

function testCompareYuranLegacyVsV2() {
  var tests = [
    { tahun: 2026, bulanKey: '2026-01' },
    { tahun: 2026, bulanKey: '2026-02' },
    { tahun: 2026, bulanKey: '2026-03' },
    { tahun: 2026, bulanKey: '2026-04' },
    { tahun: 2026, bulanKey: '2026-05' },
    { tahun: 2026, bulanKey: '2026-06' },
    { tahun: 2026, bulanKey: '2026-07' }
  ];

  tests.forEach(function(t) {
    var result = compareYuranLegacyVsV2(t);
    Logger.log(t.bulanKey + ': ' + JSON.stringify(result));
  });
}

function testCompareYuranLegacyVsV2August2026() {
  var result = compareYuranLegacyVsV2({
    tahun: 2026,
    bulan: 'OGOS2026',
    bulanKey: '2026-08'
  });
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testMonthlyPaymentSummaryV2() {
  var r = getMonthlyPaymentSummaryV2({});
  Logger.log(JSON.stringify(r));
}

function testSamplePaymentsV2() {
  var data = getPaymentsRowsV2_();

  Logger.log('ROW COUNT: ' + data.rows.length);
  Logger.log('HEADERS: ' + JSON.stringify(data.headers));

  for (var i = 0; i < Math.min(5, data.rows.length); i++) {
    Logger.log('ROW ' + (i + 2) + ': ' + JSON.stringify(data.rows[i]));
  }
}

function testNormalizeBulanKeyV2() {
  var cases = [
    { name: 'canonical', actual: normalizeBulanKeyV2_('2026-01', '', ''), expected: '2026-01' },
    { name: 'date_asia_singapore', actual: normalizeBulanKeyV2_(new Date('2025-12-31T16:00:00.000Z'), '', ''), expected: '2026-01' },
    { name: 'fallback_blank', actual: normalizeBulanKeyV2_('', '2026', 'JANUARI'), expected: '2026-01' },
    { name: 'fallback_invalid_month', actual: normalizeBulanKeyV2_('2026-13', '2026', 'JANUARI'), expected: '2026-01' },
    { name: 'reject_invalid_month', actual: normalizeBulanKeyV2_('2026-00', '', ''), expected: '' }
  ];
  cases.forEach(function(testCase) {
    testCase.passed = testCase.actual === testCase.expected;
  });
  var result = {
    success: cases.every(function(testCase) { return testCase.passed; }),
    mode: 'V2_BULAN_KEY_PURE_REGRESSION',
    cases: cases
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testMonthlyPaymentSummaryBulanKeyV2() {
  var summary = getMonthlyPaymentSummaryV2({ tahun: '2026' });
  if (!summary || !summary.success) return summary;

  var canonicalPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  var invalidBulanKeys = (summary.summaries || [])
    .filter(function(item) { return !canonicalPattern.test((item.bulanKey || '').toString()); })
    .map(function(item) { return item.bulanKey; });
  var january = (summary.summaries || []).filter(function(item) {
    return item.bulanKey === '2026-01';
  })[0] || null;
  var januaryMatches = !!january && january.selesai === 107 && Math.abs(january.totalKutipan - 3860) < 0.001;
  var result = {
    success: invalidBulanKeys.length === 0 && januaryMatches,
    mode: 'V2_BULAN_KEY_SUMMARY_REGRESSION_READ_ONLY',
    invalidBulanKeys: invalidBulanKeys,
    january: january,
    expectedJanuary: { selesai: 107, totalKutipan: 3860 }
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function testCompareYuranLegacyVsV2JanJun2026() {
  var expected = [
    { bulan: 'JAN2026', bulanKey: '2026-01', sudahBayar: 107, totalKutipan: 3860 },
    { bulan: 'FEB2026', bulanKey: '2026-02', sudahBayar: 114, totalKutipan: 3840 },
    { bulan: 'MAC2026', bulanKey: '2026-03', sudahBayar: 110, totalKutipan: 3630 },
    { bulan: 'APRIL2026', bulanKey: '2026-04', sudahBayar: 112, totalKutipan: 3680 },
    { bulan: 'MEI2026', bulanKey: '2026-05', sudahBayar: 117, totalKutipan: 4020 },
    { bulan: 'JUN2026', bulanKey: '2026-06', sudahBayar: 172, totalKutipan: 5780 }
  ];
  var results = expected.map(function(item) {
    var comparison = compareYuranLegacyVsV2({ tahun: '2026', bulan: item.bulan, bulanKey: item.bulanKey });
    var passed = !!comparison && comparison.success &&
      comparison.v2.sudahBayar === item.sudahBayar &&
      Math.abs(comparison.v2.totalKutipan - item.totalKutipan) < 0.001 &&
      comparison.diff.sudahBayar === 0 &&
      Math.abs(comparison.diff.totalKutipan) < 0.001;
    return {
      bulanKey: item.bulanKey,
      passed: passed,
      expected: { sudahBayar: item.sudahBayar, totalKutipan: item.totalKutipan },
      comparison: comparison
    };
  });
  var result = {
    success: results.every(function(item) { return item.passed; }),
    mode: 'V2_JAN_JUN_COMPARE_REGRESSION_READ_ONLY',
    results: results
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function getYuranStats(params) {
  params = params || {};
  try {
    var bulan = (params.bulan || '').toString().trim().toUpperCase();
    if (!bulan) return { success: false, message: 'Parameter bulan diperlukan.' };

    var yuranSS = SpreadsheetApp.openById(YURAN_SS_ID);
    var sheet   = yuranSS.getSheetByName(bulan);
    if (!sheet) return { success: false, message: 'Tab tidak dijumpai' };

    // 1. Sudah bayar — baca dari tab bulan berkenaan
    var totalKutipan  = 0;
    var seenNames     = {};
    var listNamaBayar = [];
    var listResit     = [];
    var sudahBayarSet = {};

    if (sheet.getLastRow() >= 2) {
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
      data.forEach(function(r) {
        var rawNama  = (r[2]  || '').toString().trim();
        if (!rawNama) return;
        var jumlah   = parseFloat(r[6]);
        if (!isNaN(jumlah)) totalKutipan += jumlah;
        var resitUrl = (r[11] || '').toString().trim();
        rawNama.split(',').forEach(function(n) {
          var nama = n.replace(/\s+/g, ' ').trim().toUpperCase();
          if (!nama || seenNames[nama]) return;
          seenNames[nama]      = true;
          sudahBayarSet[nama]  = true;
          listNamaBayar.push(nama);
          listResit.push({ nama: nama, resitUrl: resitUrl });
        });
      });
    }

    // 2. Master list — baca terus dari PendaftaranBaru + KelasDewasa (live data)
    var BULAN_2026    = ['JAN2026','FEB2026','MAC2026','APRIL2026','MEI2026','JUN2026',
                         'JULAI2026','OGOS2026','SEPT2026','OKT2026','NOV2026','DIS2026'];
    var bulanMonthIdx = BULAN_2026.indexOf(bulan);
    var activeMurid;

    var mainSS2      = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet2  = mainSS2.getSheetByName(TAB.KANAK);
    var kanakData2   = (kanakSheet2 && kanakSheet2.getLastRow() > 1)
      ? kanakSheet2.getRange(2, 1, kanakSheet2.getLastRow() - 1, 19).getValues() : [];
    var dewasaSheet2 = mainSS2.getSheetByName(TAB.DEWASA);
    var dewasaData2  = (dewasaSheet2 && dewasaSheet2.getLastRow() > 1)
      ? dewasaSheet2.getRange(2, 1, dewasaSheet2.getLastRow() - 1, 19).getValues() : [];

    function parseRegMonthIdx2(tarikhRaw) {
      if (!tarikhRaw) return -1;
      var d = null;
      if (tarikhRaw instanceof Date && !isNaN(tarikhRaw.getTime())) { d = tarikhRaw; }
      else {
        var ts = tarikhRaw.toString().trim();
        var m1 = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m1) d = new Date(parseInt(m1[3],10), parseInt(m1[2],10)-1, parseInt(m1[1],10));
        if (!d) { var m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m2) d = new Date(parseInt(m2[1],10), parseInt(m2[2],10)-1, parseInt(m2[3],10)); }
      }
      if (!d || isNaN(d.getTime())) return -1;
      var yr = d.getFullYear();
      if (yr < 2026) return -1;
      if (yr === 2026) return d.getMonth();
      return 999;
    }

    var eligibleSet2 = {};
    kanakData2.forEach(function(r) {
      var n = (r[COL_KANAK.NAMA]   || '').toString().replace(/\s+/g, ' ').trim().toUpperCase();
      var s = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
      if (!n || (s && s !== 'AKTIF')) return;
      if (parseRegMonthIdx2(r[COL_KANAK.TIMESTAMP]) > bulanMonthIdx) return;
      eligibleSet2[n] = true;
    });
    dewasaData2.forEach(function(r) {
      var n = (r[COL_DEWASA.NAMA]   || '').toString().replace(/\s+/g, ' ').trim().toUpperCase();
      var s = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
      if (!n || (s && s !== 'AKTIF')) return;
      if (parseRegMonthIdx2(r[COL_DEWASA.TIMESTAMP]) > bulanMonthIdx) return;
      eligibleSet2[n] = true;
    });
    activeMurid = Object.keys(eligibleSet2);

    // 3. Telefon dari WARemind
    var mainSS    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var waSheet   = mainSS.getSheetByName('WARemind');
    var telefonMap = {};
    if (waSheet && waSheet.getLastRow() >= 3) {
      var waData = waSheet.getRange(3, 2, waSheet.getLastRow() - 2, 3).getValues();
      waData.forEach(function(r) {
        var nama = (r[0] || '').toString().trim().toUpperCase();
        var tel  = (r[2] || '').toString().trim();
        if (nama && tel) telefonMap[nama] = tel;
      });
    }

    // 4. Cross-check belum bayar
    var belumBayar = activeMurid
      .filter(function(nama) { return !sudahBayarSet[nama]; })
      .map(function(nama)    { return { nama: nama, telefon: telefonMap[nama] || '' }; })
      .sort(function(a, b)   { return a.nama.localeCompare(b.nama); });

    return {
      success:       true,
      sudahBayar:    listNamaBayar.length,
      totalKutipan:  totalKutipan,
      listNamaBayar: listNamaBayar,
      listResit:     listResit,
      belumBayar:    belumBayar,
      totalMurid:    activeMurid.length
    };

  } catch (err) {
    Logger.log('getYuranStats error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 26. recordCash
// Rekod bayaran tunai ke Yuran spreadsheet
// Input:  { nama, jumlah, tarikh, bulan }
// Output: { success, noResit }
// ============================================================
function recordCash(params) {
  params = params || {};
  try {
    var nama   = (params.nama   || '').toString().trim().toUpperCase();
    var jumlah = parseFloat(params.jumlah) || 0;
    var tarikh = (params.tarikh || '').toString().trim();
    var bulan  = (params.bulan  || '').toString().trim().toUpperCase();

    if (!nama || !bulan || !tarikh) {
      return { success: false, message: 'Nama, bulan, dan tarikh diperlukan.' };
    }

    var bulanText = bulan.replace(/[0-9]/g, '');
    var tahun     = bulan.replace(/[^0-9]/g, '') || new Date().getFullYear().toString();
    var yuranSS   = SpreadsheetApp.openById(YURAN_SS_ID);
    var sheet     = yuranSS.getSheetByName(bulan);

    if (!sheet) return { success: false, message: 'Tab tidak dijumpai' };

    var existingRows = Math.max(0, sheet.getLastRow() - 1);
    var noResit      = String(existingRows + 1).padStart(3, '0');
    var timestamp    = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');

    sheet.appendRow([timestamp, '', nama, bulanText, tahun, tarikh, jumlah, 'CASH', noResit, 'SELESAI']);
    SpreadsheetApp.flush();

    Logger.log('recordCash: ' + nama + ' ' + bulan + ' RM' + jumlah + ' Resit: ' + noResit);

    try { simpanNotifikasi('yuran', 'Bayaran Yuran Diterima', nama + ' — ' + bulan + ' RM' + jumlah, { noResit: noResit }); } catch(e) {}

    return { success: true, noResit: noResit };

  } catch (err) {
    Logger.log('recordCash error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 27. getMuridListAll
// Returns ALL murid (semua status) dengan rowIndex & status
// Digunakan oleh admin panel Senarai Murid
// ============================================================
function getMuridListAll() {
  try {
    var ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet  = ss.getSheetByName(TAB.KANAK);
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);

    var kanak = [];
    if (kanakSheet && kanakSheet.getLastRow() > 1) {
      var kData = kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, kanakSheet.getLastColumn()).getValues();
      kData.forEach(function(r, idx) {
        var s = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase() || 'AKTIF';
        kanak.push({
          rowIndex: idx + 2,
          bil:      r[COL_KANAK.BIL],
          namaAnak: r[COL_KANAK.NAMA],
          namaIbu:  r[COL_KANAK.NAMA_IBU] || '',
          telefon:  r[COL_KANAK.TELEFON],
          tahap:    r[COL_KANAK.TAHAP],
          pakej:    r[COL_KANAK.PAKEJ],
          status:   s
        });
      });
    }

    var dewasa = [];
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues();
      dData.forEach(function(r, idx) {
        var s = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase() || 'AKTIF';
        dewasa.push({
          rowIndex: idx + 2,
          nama:    r[COL_DEWASA.NAMA],
          telefon: r[COL_DEWASA.TELEFON],
          email:   r[COL_DEWASA.EMAIL],
          tahap:   r[COL_DEWASA.TAHAP],
          guru:    r[COL_DEWASA.GURU] || '',
          status:  s
        });
      });
    }

    return { success: true, kanak: kanak, dewasa: dewasa };
  } catch (err) {
    Logger.log('getMuridListAll error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 28. updateStatusMurid
// Kemaskini STATUS murid di kolum S (index 18)
// Input:  { jenis, rowIndex, status }
// Output: { success: true }
// ============================================================
function updateStatusMurid(params) {
  params = params || {};
  try {
    var jenis    = (params.jenis    || '').toString().trim().toLowerCase();
    var rowIndex = parseInt(params.rowIndex, 10);
    var status   = (params.status   || '').toString().trim().toUpperCase();

    if (!jenis || !rowIndex || !status) {
      return { success: false, message: 'Parameter jenis, rowIndex, dan status diperlukan.' };
    }
    if (['aktif','tidak aktif'].indexOf(status.toLowerCase()) === -1 && status !== 'AKTIF' && status !== 'TIDAK AKTIF') {
      return { success: false, message: 'Status mesti AKTIF atau TIDAK AKTIF.' };
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(jenis === 'kanak' ? TAB.KANAK : TAB.DEWASA);
    if (!sheet) return { success: false, message: 'Tab tidak dijumpai.' };

    // Column S = index 18 (0-based) = column 19 (1-based)
    sheet.getRange(rowIndex, 19).setValue(status);
    SpreadsheetApp.flush();

    var namaCol   = (jenis === 'kanak') ? COL_KANAK.NAMA + 1 : COL_DEWASA.NAMA + 1;
    var namaMurid = sheet.getRange(rowIndex, namaCol).getValue().toString().trim() || 'Murid';
    Logger.log('updateStatusMurid: ' + jenis + ' baris ' + rowIndex + ' → ' + status);
    try { simpanNotifikasi('status', '🔄 Status Murid', 'Status ' + namaMurid + ' dikemaskini → ' + status, { jenis: jenis, rowIndex: String(rowIndex) }); } catch(e) {}

    return { success: true };

  } catch (err) {
    Logger.log('updateStatusMurid error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 29. getKehadiranStats
// Statistik kehadiran dari Kehadiran spreadsheet
// Input:  { bulan, tahun } — e.g. { bulan:"05", tahun:"2026" }
// Output: { success, totalMurid, totalSesi, byMurid:[{nama,jumlahHadir,guru}] }
// ============================================================
function getKehadiranStats(params) {
  params = params || {};
  try {
    var bulan    = (params.bulan    || '').toString().trim();
    var tahun    = (params.tahun    || '').toString().trim();
    var namaGuru = (params.namaGuru || '').toString().trim();

    var ss = SpreadsheetApp.openById(KEHADIRAN_SS_ID);
    var totalSesi = 0;
    var hadirMap  = {}; // NAMA_MURID (upper) -> jumlahHadir

    var sheetsToScan;
    if (namaGuru) {
      var tabNama = cariTabGuru(namaGuru);
      var s = tabNama ? ss.getSheetByName(tabNama) : null;
      sheetsToScan = s ? [s] : [];
    } else {
      sheetsToScan = ss.getSheets();
    }

    sheetsToScan.forEach(function(sheet) {
      if (sheet.getLastRow() < 2) return;
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
      data.forEach(function(r) {
        var ts   = r[0];
        var nama = (r[3] || '').toString().trim();
        if (!nama) return;

        var d = (ts instanceof Date) ? ts : new Date(ts);
        if (isNaN(d.getTime())) return;

        var rowMonth = Utilities.formatDate(d, 'Asia/Kuala_Lumpur', 'MM');
        var rowYear  = Utilities.formatDate(d, 'Asia/Kuala_Lumpur', 'yyyy');
        if (bulan && rowMonth !== bulan) return;
        if (tahun && rowYear  !== tahun) return;

        totalSesi++;
        var key = nama.toUpperCase();
        hadirMap[key] = (hadirMap[key] || 0) + 1;
      });
    });

    var byMurid, totalMurid, unmatched;

    if (namaGuru) {
      var enrol     = getMuridByGuru({ namaGuru: namaGuru });
      var muridObjs = (enrol.success ? enrol.murid : []) || [];
      var senarai   = muridObjs.map(function(m) { return m.nama; });

      byMurid = senarai.map(function(nama) {
        return { nama: nama, jumlahHadir: hadirMap[nama] || 0, guru: namaGuru };
      });
      totalMurid = senarai.length;

      var enrolSet = {};
      senarai.forEach(function(n) { enrolSet[n] = true; });
      unmatched = Object.keys(hadirMap).filter(function(n) { return !enrolSet[n]; });
    } else {
      byMurid = Object.keys(hadirMap).map(function(k) {
        return { nama: k, jumlahHadir: hadirMap[k], guru: '' };
      });
      totalMurid = byMurid.length;
      unmatched  = [];
    }

    byMurid.sort(function(a, b) { return b.jumlahHadir - a.jumlahHadir; });

    return { success: true, totalMurid: totalMurid, totalSesi: totalSesi, byMurid: byMurid, unmatched: unmatched };

  } catch (err) {
    Logger.log('getKehadiranStats error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 30. getKehadiranRekod
// Rekod kehadiran individu murid dari Kehadiran spreadsheet
// Input:  { nama } — minimum 3 huruf
// Output: { success, nama, totalSesi, rekod:[{tarikh,guru,kaedah,login,logout,durasi}] }
// ============================================================
function getKehadiranRekod(params) {
  params = params || {};
  try {
    var nama = (params.nama || '').toString().trim();
    if (!nama || nama.length < 3) {
      return { success: false, message: 'Sila masukkan sekurang-kurangnya 3 huruf nama murid' };
    }

    var namaLower = nama.toLowerCase();
    var ss        = SpreadsheetApp.openById(KEHADIRAN_SS_ID);
    var sheets    = ss.getSheets();
    var rekod     = [];

    sheets.forEach(function(sheet) {
      if (sheet.getLastRow() < 2) return;
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
      data.forEach(function(r) {
        var namaMurid = (r[3] || '').toString().trim();
        if (namaMurid.toLowerCase().indexOf(namaLower) === -1) return;

        var ts       = r[0];
        var guru     = (r[2] || '').toString().trim();
        var kaedah   = (r[4] || '').toString().trim();
        var logoutRaw = r[5];

        var d = (ts instanceof Date) ? ts : new Date(ts);
        if (isNaN(d.getTime())) return;

        var tarikh = Utilities.formatDate(d, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy');
        var login  = Utilities.formatDate(d, 'Asia/Kuala_Lumpur', 'HH:mm');
        var loginMins = parseInt(Utilities.formatDate(d, 'Asia/Kuala_Lumpur', 'H'), 10) * 60 +
                        parseInt(Utilities.formatDate(d, 'Asia/Kuala_Lumpur', 'm'), 10);

        var logoutFmt = '';
        var durasi    = '';

        if (logoutRaw) {
          var logoutMins = null;
          if (logoutRaw instanceof Date) {
            logoutFmt = Utilities.formatDate(logoutRaw, 'Asia/Kuala_Lumpur', 'HH:mm');
            logoutMins = parseInt(Utilities.formatDate(logoutRaw, 'Asia/Kuala_Lumpur', 'H'), 10) * 60 +
                         parseInt(Utilities.formatDate(logoutRaw, 'Asia/Kuala_Lumpur', 'm'), 10);
          } else {
            var ls = logoutRaw.toString().trim();
            var lm = ls.match(/(\d{1,2}):(\d{2})/);
            if (lm) {
              var lh = parseInt(lm[1], 10);
              var lmi = parseInt(lm[2], 10);
              if (/pm/i.test(ls) && lh < 12) lh += 12;
              if (/am/i.test(ls) && lh === 12) lh = 0;
              logoutFmt  = String(lh).padStart(2,'0') + ':' + String(lmi).padStart(2,'0');
              logoutMins = lh * 60 + lmi;
            }
          }
          if (logoutMins !== null) {
            var diff = logoutMins - loginMins;
            if (diff > 0) {
              var jam   = Math.floor(diff / 60);
              var minit = diff % 60;
              durasi    = (jam > 0 ? jam + ' jam ' : '') + minit + ' minit';
            }
          }
        }

        rekod.push({ tarikh: tarikh, guru: guru, kaedah: kaedah, login: login, logout: logoutFmt, durasi: durasi, _ts: d.getTime() });
      });
    });

    rekod.sort(function(a, b) { return b._ts - a._ts; });
    var out = rekod.map(function(r) {
      return { tarikh: r.tarikh, guru: r.guru, kaedah: r.kaedah, login: r.login, logout: r.logout, durasi: r.durasi };
    });

    return { success: true, nama: nama, totalSesi: out.length, rekod: out };

  } catch (err) {
    Logger.log('getKehadiranRekod error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 31. getMuridByGuru
// Ambil senarai murid yang ditugaskan kepada guru tertentu
// Input:  { namaGuru }
// Output: { success, murid: [nama, ...] }
// ============================================================
// ============================================================
// cariTabGuru — scan semua tab KEHADIRAN_SS_ID, return tab yang paling match
// ============================================================
function cariTabGuru(namaGuru) {
  try {
    var ss   = SpreadsheetApp.openById(KEHADIRAN_SS_ID);
    var tabs = ss.getSheets().map(function(s) { return s.getName(); });

    var SKIP = ['BIN','BINTI','BINTE','ABD','ABDUL','ABU','AL'];
    var parts = namaGuru.toUpperCase().split(' ').filter(function(w) {
      return w.length > 2 && SKIP.indexOf(w) === -1;
    });

    var bestTab   = null;
    var bestScore = 0;

    tabs.forEach(function(tab) {
      var tabUpper = tab.toUpperCase();
      var score    = 0;
      parts.forEach(function(word) {
        if (tabUpper.indexOf(word) !== -1) score++;
      });
      if (score > bestScore) { bestScore = score; bestTab = tab; }
    });

    Logger.log('cariTabGuru: "' + namaGuru + '" → "' + bestTab + '" (score ' + bestScore + ')');
    return bestScore >= 1 ? bestTab : null;
  } catch (e) {
    Logger.log('cariTabGuru error: ' + e.message);
    return null;
  }
}

function getMuridByGuru(params) {
  params = params || {};
  try {
    var namaGuru = (params.namaGuru || '').toString().trim();
    if (!namaGuru) return { success: false, message: 'namaGuru diperlukan.' };

    var namaGuruUpper = namaGuru.toUpperCase();
    var ss            = SpreadsheetApp.openById(SPREADSHEET_ID);
    var namaToPeranan = {}; // NAMA_UPPER → 'TETAP' | 'BACKUP'

    // PendaftaranBaru — check GURU (col Q) dan GURU_BACKUP (col R); TETAP menang atas BACKUP
    var kanakSheet = ss.getSheetByName(TAB.KANAK);
    if (kanakSheet && kanakSheet.getLastRow() > 1) {
      var kData = kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, kanakSheet.getLastColumn()).getValues();
      kData.forEach(function(r) {
        var guru       = (r[COL_KANAK.GURU]        || '').toString().trim().toUpperCase();
        var guruBackup = (r[COL_KANAK.GURU_BACKUP] || '').toString().trim().toUpperCase();
        var status     = (r[COL_KANAK.STATUS]       || '').toString().trim().toUpperCase();
        if (status && status !== 'AKTIF') return;

        var isGuru       = (guru === namaGuruUpper);
        var isGuruBackup = (guruBackup === namaGuruUpper);
        if (!isGuru && !isGuruBackup) return;

        var nama = (r[COL_KANAK.NAMA] || '').toString().trim();
        if (!nama) return;
        var namaUpper = nama.toUpperCase();

        var peranan = isGuru ? 'TETAP' : 'BACKUP';
        if (!namaToPeranan[namaUpper] || (peranan === 'TETAP' && namaToPeranan[namaUpper] === 'BACKUP')) {
          namaToPeranan[namaUpper] = peranan;
        }
      });
    }

    // KelasDewasa — GURU sahaja (tiada backup column), peranan sentiasa TETAP
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues();
      dData.forEach(function(r) {
        var guru   = (r[COL_DEWASA.GURU]   || '').toString().trim().toUpperCase();
        var status = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
        if (guru !== namaGuruUpper) return;
        if (status && status !== 'AKTIF') return;
        var nama = (r[COL_DEWASA.NAMA] || '').toString().trim();
        if (!nama) return;
        var namaUpper = nama.toUpperCase();
        if (!namaToPeranan[namaUpper]) {
          namaToPeranan[namaUpper] = 'TETAP';
        }
      });
    }

    var sorted = Object.keys(namaToPeranan).sort().map(function(n) {
      return { nama: n, peranan: namaToPeranan[n] };
    });

    Logger.log('getMuridByGuru: "' + namaGuru + '" → ' + sorted.length + ' murid AKTIF (termasuk backup)');
    return { success: true, murid: sorted };

  } catch (err) {
    Logger.log('getMuridByGuru error: ' + err.message);
    return { success: false, message: err.message };
  }
}
// ============================================================
// cariGuruTetapMurid — cari nama guru tetap bagi murid tertentu
// Input:  namaMurid (string), kanakData (array rows), dewasaData (array rows)
// Output: nama guru tetap (string) atau null jika tak jumpa
// ============================================================
function cariGuruTetapMurid(namaMurid, kanakData, dewasaData) {
  var needle = (namaMurid || '').toString().trim().toLowerCase();
  for (var i = 0; i < kanakData.length; i++) {
    var n = (kanakData[i][COL_KANAK.NAMA] || '').toString().trim().toLowerCase();
    if (n === needle) {
      var g = (kanakData[i][COL_KANAK.GURU] || '').toString().trim();
      return g || null;
    }
  }
  for (var j = 0; j < dewasaData.length; j++) {
    var n2 = (dewasaData[j][COL_DEWASA.NAMA] || '').toString().trim().toLowerCase();
    if (n2 === needle) {
      var g2 = (dewasaData[j][COL_DEWASA.GURU] || '').toString().trim();
      return g2 || null;
    }
  }
  return null;
}

// ============================================================
// 32. simpanKehadiran
// Simpan rekod kehadiran murid ke spreadsheet Kehadiran.
// Untuk sesi relief, murid digroup ikut guru tetap masing-masing
// dan rekod ditulis ke tab guru tetap (bukan tab guru yang login).
// Input:  { namaGuru, emailGuru, muridHadir: [...], kaedah, waktuTamat, tarikh, tabKehadiran }
// Output: { success, jumlahRekod }
// ============================================================
function simpanKehadiran(params) {
  params = params || {};
  try {
    var namaGuru    = (params.namaGuru    || '').toString().trim();
    var emailGuru   = (params.emailGuru   || '').toString().trim();
    var muridHadir  = params.muridHadir   || [];
    var kaedah      = (params.kaedah      || '').toString().trim();
    var waktuTamat  = (params.waktuTamat  || '').toString().trim();
    var tarikhInput = (params.tarikh      || '').toString().trim();

    if (!namaGuru || !muridHadir.length) {
      return { success: false, message: 'namaGuru dan muridHadir diperlukan.' };
    }

    // Pre-load enrollment data sekali untuk guru tetap lookup
    var mainSS      = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet  = mainSS.getSheetByName(TAB.KANAK);
    var kanakData   = (kanakSheet && kanakSheet.getLastRow() > 1)
      ? kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, kanakSheet.getLastColumn()).getValues()
      : [];
    var dewasaSheet = mainSS.getSheetByName(TAB.DEWASA);
    var dewasaData  = (dewasaSheet && dewasaSheet.getLastRow() > 1)
      ? dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues()
      : [];

    // Format timestamp
    var now         = new Date();
    var timePart    = Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'HH:mm:ss');
    var tarikhKelas = tarikhInput || Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy');
    var timestamp   = tarikhKelas + ' ' + timePart;

    // Group murid ikut guru tetap masing-masing
    var groups = {}; // guruTetapNama → [namaMurid, ...]
    muridHadir.forEach(function(nama) {
      var guruTetap = cariGuruTetapMurid(nama, kanakData, dewasaData);
      if (!guruTetap) {
        Logger.log('simpanKehadiran: guru tetap tidak jumpa untuk "' + nama + '" — fallback ke ' + namaGuru);
        guruTetap = namaGuru;
      }
      if (!groups[guruTetap]) groups[guruTetap] = [];
      groups[guruTetap].push(nama);
    });

    var kehadiranSS = SpreadsheetApp.openById(KEHADIRAN_SS_ID);

    Object.keys(groups).forEach(function(guruTetapNama) {
      var senarai    = groups[guruTetapNama];
      var tabSasaran = cariTabGuru(guruTetapNama) || guruTetapNama;
      var sheet      = kehadiranSS.getSheetByName(tabSasaran);

      if (!sheet) {
        sheet = kehadiranSS.insertSheet(tabSasaran);
        sheet.getRange(1, 1, 1, 9).setValues([[
          'Timestamp','Email Address','Nama Guru','Nama Murid',
          'Kaedah Pengajian','Waktu Tamat','Hari Kelas Pengajian',
          'Guru Tetap','Guru Hadir'
        ]]);
      } else {
        // Upgrade header tab sedia ada jika belum ada kolum H/I
        if (!sheet.getRange(1, 8).getValue()) sheet.getRange(1, 8).setValue('Guru Tetap');
        if (!sheet.getRange(1, 9).getValue()) sheet.getRange(1, 9).setValue('Guru Hadir');
      }

      var rows = senarai.map(function(nama) {
        return [timestamp, emailGuru, namaGuru, nama, kaedah, waktuTamat, tarikhKelas, guruTetapNama, namaGuru];
      });

      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
    });

    SpreadsheetApp.flush();

    Logger.log('simpanKehadiran: ' + Object.keys(groups).length + ' tab, ' + muridHadir.length + ' murid (' + tarikhKelas + ')');

    try { simpanNotifikasi('kehadiran', 'Kehadiran Direkodkan', namaGuru + ' — ' + muridHadir.length + ' murid (' + tarikhKelas + ')', { jumlah: String(muridHadir.length) }); } catch(e) {}

    return { success: true, jumlahRekod: muridHadir.length };

  } catch (err) {
    Logger.log('simpanKehadiran error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// PERTUKARAN GURU — permanent reassign murid dari guru ke guru lain
// ============================================================

// ensureLogPertukaranGuruSheet — cipta tab LogPertukaranGuru jika belum ada
function ensureLogPertukaranGuruSheet(ss) {
  var sheet = ss.getSheetByName(TAB.LOG_PERTUKARAN);
  if (!sheet) {
    sheet = ss.insertSheet(TAB.LOG_PERTUKARAN);
    sheet.getRange(1, 1, 1, 7).setValues([[
      'Timestamp', 'Admin', 'Guru Lama', 'Guru Baru', 'Nama Murid', 'Jenis Murid', 'Bil'
    ]]);
    sheet.setFrozenRows(1);
    Logger.log('LogPertukaranGuru tab dicipta.');
  }
  return sheet;
}

// ============================================================
// 33. getMuridByGuruUntukTukar
// Ambil senarai murid TETAP guru (untuk fungsi pertukaran guru).
// Hanya check kolum GURU — bukan GURU_BACKUP.
// Input:  { namaGuru }
// Output: { success, murid: [{bil, nama, jenis}, ...] }
// ============================================================
function getMuridByGuruUntukTukar(params) {
  params = params || {};
  try {
    var namaGuru = (params.namaGuru || '').toString().trim();
    if (!namaGuru) return { success: false, message: 'namaGuru diperlukan.' };

    var namaGuruUpper = namaGuru.toUpperCase();
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    var list = [];

    // PendaftaranBaru — hanya COL_KANAK.GURU (bukan GURU_BACKUP)
    var kanakSheet = ss.getSheetByName(TAB.KANAK);
    if (kanakSheet && kanakSheet.getLastRow() > 1) {
      var kData = kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, kanakSheet.getLastColumn()).getValues();
      kData.forEach(function(r) {
        var guru   = (r[COL_KANAK.GURU]   || '').toString().trim().toUpperCase();
        var status = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
        if (guru !== namaGuruUpper) return;
        if (status && status !== 'AKTIF') return;
        var nama = (r[COL_KANAK.NAMA] || '').toString().trim();
        if (!nama) return;
        list.push({ bil: r[COL_KANAK.BIL], nama: nama.toUpperCase(), jenis: 'KANAK' });
      });
    }

    // KelasDewasa — COL_DEWASA.GURU
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues();
      dData.forEach(function(r) {
        var guru   = (r[COL_DEWASA.GURU]   || '').toString().trim().toUpperCase();
        var status = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
        if (guru !== namaGuruUpper) return;
        if (status && status !== 'AKTIF') return;
        var nama = (r[COL_DEWASA.NAMA] || '').toString().trim();
        if (!nama) return;
        list.push({ bil: r[COL_DEWASA.BIL], nama: nama.toUpperCase(), jenis: 'DEWASA' });
      });
    }

    list.sort(function(a, b) { return a.nama < b.nama ? -1 : a.nama > b.nama ? 1 : 0; });

    Logger.log('getMuridByGuruUntukTukar: "' + namaGuru + '" → ' + list.length + ' murid TETAP AKTIF');
    return { success: true, murid: list };

  } catch (err) {
    Logger.log('getMuridByGuruUntukTukar error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 34. tukarGuruMurid
// Permanent reassign murid dari guruLama ke guruBaru (update kolum GURU).
// Input:  { token, adminEmail, guruLama, guruBaru, senarai:[{bil,jenis},...] }
// Output: { success, jumlahDipindah, ralat:[...] }
// ============================================================
function tukarGuruMurid(params) {
  params = params || {};
  try {
    var adminEmail = (params.adminEmail || '').toString().trim();
    var guruLama   = (params.guruLama   || '').toString().trim();
    var guruBaru   = (params.guruBaru   || '').toString().trim();
    var senarai    = params.senarai || [];

    if (!guruLama || !guruBaru) {
      return { success: false, message: 'guruLama dan guruBaru diperlukan.' };
    }
    if (guruLama.toUpperCase() === guruBaru.toUpperCase()) {
      return { success: false, message: 'Guru lama dan guru baru tidak boleh sama.' };
    }
    if (!senarai.length) {
      return { success: false, message: 'Senarai murid kosong.' };
    }

    var ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet  = ss.getSheetByName(TAB.KANAK);
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);

    // Pre-load data sekali untuk carian row
    var kanakData  = (kanakSheet  && kanakSheet.getLastRow()  > 1)
      ? kanakSheet.getRange(2,  1, kanakSheet.getLastRow()  - 1, kanakSheet.getLastColumn()).getValues()
      : [];
    var dewasaData = (dewasaSheet && dewasaSheet.getLastRow() > 1)
      ? dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues()
      : [];

    var timestamp    = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    var guruLamaUpr  = guruLama.toUpperCase();
    var jumlahDipindah = 0;
    var ralat          = [];
    var logRows        = [];

    senarai.forEach(function(item) {
      var bil   = item.bil;
      var jenis = (item.jenis || '').toString().trim().toUpperCase();

      var data      = (jenis === 'KANAK') ? kanakData  : dewasaData;
      var sheet     = (jenis === 'KANAK') ? kanakSheet : dewasaSheet;
      var colBil    = (jenis === 'KANAK') ? COL_KANAK.BIL    : COL_DEWASA.BIL;
      var colGuru   = (jenis === 'KANAK') ? COL_KANAK.GURU   : COL_DEWASA.GURU;
      var colNama   = (jenis === 'KANAK') ? COL_KANAK.NAMA   : COL_DEWASA.NAMA;

      var rowFound  = -1;
      var namaMurid = '';

      for (var i = 0; i < data.length; i++) {
        if (String(data[i][colBil]).trim() === String(bil).trim()) {
          // Safety check: GURU mesti masih guruLama
          var guruSemasa = (data[i][colGuru] || '').toString().trim().toUpperCase();
          if (guruSemasa !== guruLamaUpr) {
            ralat.push('Bil ' + bil + ' (' + jenis + '): GURU tidak match — jangkaan ' + guruLama + ', sebenar ' + guruSemasa);
            return;
          }
          rowFound  = i + 2; // +2: baris pertama = header, data mula dari baris 2
          namaMurid = (data[i][colNama] || '').toString().trim();
          break;
        }
      }

      if (rowFound === -1) {
        ralat.push('Bil ' + bil + ' (' + jenis + '): row tidak dijumpai dalam sheet.');
        return;
      }

      sheet.getRange(rowFound, colGuru + 1).setValue(guruBaru);
      jumlahDipindah++;
      logRows.push([timestamp, adminEmail, guruLama, guruBaru, namaMurid, jenis, bil]);
    });

    SpreadsheetApp.flush();

    // Log ke LogPertukaranGuru
    if (logRows.length > 0) {
      var logSheet = ensureLogPertukaranGuruSheet(ss);
      logSheet.getRange(logSheet.getLastRow() + 1, 1, logRows.length, 7).setValues(logRows);
    }

    Logger.log('tukarGuruMurid: ' + guruLama + ' → ' + guruBaru + ', ' + jumlahDipindah + ' dipindah, ' + ralat.length + ' ralat');

    try {
      simpanNotifikasi('pertukaran', '🔄 Pertukaran Guru',
        guruLama + ' → ' + guruBaru + ' (' + jumlahDipindah + ' murid)',
        { jumlah: String(jumlahDipindah) });
    } catch(e) {}

    return { success: true, jumlahDipindah: jumlahDipindah, ralat: ralat };

  } catch (err) {
    Logger.log('tukarGuruMurid error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 35. getMuridTanpaGuru
// Ambil senarai murid AKTIF yang kolum GURU masih kosong/blank.
// Input:  {}
// Output: { success, murid: [{bil, nama, jenis}, ...] }
// ============================================================
function getMuridTanpaGuru() {
  try {
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    var list = [];

    // PendaftaranBaru — COL_KANAK.GURU
    var kanakSheet = ss.getSheetByName(TAB.KANAK);
    if (kanakSheet && kanakSheet.getLastRow() > 1) {
      var kData = kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, kanakSheet.getLastColumn()).getValues();
      kData.forEach(function(r) {
        var guru   = (r[COL_KANAK.GURU]   || '').toString().trim();
        var status = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
        if (status && status !== 'AKTIF') return;
        if (guru) return;
        var nama = (r[COL_KANAK.NAMA] || '').toString().trim();
        if (!nama) return;
        list.push({ bil: r[COL_KANAK.BIL], nama: nama.toUpperCase(), jenis: 'KANAK' });
      });
    }

    // KelasDewasa — COL_DEWASA.GURU
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues();
      dData.forEach(function(r) {
        var guru   = (r[COL_DEWASA.GURU]   || '').toString().trim();
        var status = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
        if (status && status !== 'AKTIF') return;
        if (guru) return;
        var nama = (r[COL_DEWASA.NAMA] || '').toString().trim();
        if (!nama) return;
        list.push({ bil: r[COL_DEWASA.BIL], nama: nama.toUpperCase(), jenis: 'DEWASA' });
      });
    }

    list.sort(function(a, b) { return a.nama < b.nama ? -1 : a.nama > b.nama ? 1 : 0; });

    Logger.log('getMuridTanpaGuru: ' + list.length + ' murid AKTIF tanpa guru');
    return { success: true, murid: list };

  } catch (err) {
    Logger.log('getMuridTanpaGuru error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// 36. assignGuruMurid
// Tetapkan guru untuk murid yang kolum GURU masih kosong.
// Input:  { token, adminEmail, namaGuru, senarai:[{bil,jenis,namaMuridExpected}] }
// Output: { success, jumlahDitetapkan, ralat:[...] }
// ============================================================
function assignGuruMurid(params) {
  params = params || {};
  try {
    var adminEmail = (params.adminEmail || '').toString().trim();
    var namaGuru   = (params.namaGuru   || '').toString().trim();
    var senarai    = params.senarai || [];

    if (!namaGuru) {
      return { success: false, message: 'namaGuru diperlukan.' };
    }
    if (!senarai.length) {
      return { success: false, message: 'Senarai murid kosong.' };
    }

    var ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
    var kanakSheet  = ss.getSheetByName(TAB.KANAK);
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);

    // Pre-load data sekali untuk carian row
    var kanakData  = (kanakSheet  && kanakSheet.getLastRow()  > 1)
      ? kanakSheet.getRange(2,  1, kanakSheet.getLastRow()  - 1, kanakSheet.getLastColumn()).getValues()
      : [];
    var dewasaData = (dewasaSheet && dewasaSheet.getLastRow() > 1)
      ? dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues()
      : [];

    var timestamp        = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    var jumlahDitetapkan  = 0;
    var ralat             = [];
    var logRows           = [];

    senarai.forEach(function(item) {
      var bil               = item.bil;
      var jenis              = (item.jenis || '').toString().trim().toUpperCase();
      var namaMuridExpected  = (item.namaMuridExpected || '').toString().trim().toUpperCase();

      var data      = (jenis === 'KANAK') ? kanakData  : dewasaData;
      var sheet     = (jenis === 'KANAK') ? kanakSheet : dewasaSheet;
      var colBil    = (jenis === 'KANAK') ? COL_KANAK.BIL    : COL_DEWASA.BIL;
      var colGuru   = (jenis === 'KANAK') ? COL_KANAK.GURU   : COL_DEWASA.GURU;
      var colNama   = (jenis === 'KANAK') ? COL_KANAK.NAMA   : COL_DEWASA.NAMA;

      var rowFound  = -1;
      var namaMurid = '';

      for (var i = 0; i < data.length; i++) {
        if (String(data[i][colBil]).trim() === String(bil).trim()) {
          rowFound  = i + 2; // +2: baris pertama = header, data mula dari baris 2
          namaMurid = (data[i][colNama] || '').toString().trim();

          // Safety check: kolum GURU mesti masih kosong
          var guruSedia = (data[i][colGuru] || '').toString().trim();
          if (guruSedia) {
            ralat.push('Bil ' + bil + ' (' + jenis + '): sudah ada guru: ' + guruSedia);
            return;
          }

          // Safety check: nama murid mesti match jangkaan (jika diberi)
          if (namaMuridExpected && namaMurid.toUpperCase() !== namaMuridExpected) {
            ralat.push('Bil ' + bil + ' (' + jenis + '): nama tidak match — jangkaan ' + namaMuridExpected + ', sebenar ' + namaMurid);
            return;
          }

          break;
        }
      }

      if (rowFound === -1) {
        ralat.push('Bil ' + bil + ' (' + jenis + '): row tidak dijumpai dalam sheet.');
        return;
      }

      sheet.getRange(rowFound, colGuru + 1).setValue(namaGuru);
      jumlahDitetapkan++;
      logRows.push([timestamp, adminEmail, '(Tiada)', namaGuru, namaMurid, jenis, bil]);
    });

    SpreadsheetApp.flush();

    // Log ke LogPertukaranGuru
    if (logRows.length > 0) {
      var logSheet = ensureLogPertukaranGuruSheet(ss);
      logSheet.getRange(logSheet.getLastRow() + 1, 1, logRows.length, 7).setValues(logRows);
    }

    Logger.log('assignGuruMurid: ' + namaGuru + ', ' + jumlahDitetapkan + ' ditetapkan, ' + ralat.length + ' ralat');

    try {
      simpanNotifikasi('pertukaran', '👤 Guru Ditetapkan',
        namaGuru + ' (' + jumlahDitetapkan + ' murid)',
        { jumlah: String(jumlahDitetapkan) });
    } catch(e) {}

    return { success: true, jumlahDitetapkan: jumlahDitetapkan, ralat: ralat };

  } catch (err) {
    Logger.log('assignGuruMurid error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// BLAST QUEUE SYSTEM — Task 1-6
// ============================================================

// ensureBlastQueueSheet — cipta tab BlastQueue jika belum ada, dengan header
function ensureBlastQueueSheet(ss) {
  var sheet = ss.getSheetByName(TAB.BLAST_QUEUE);
  if (!sheet) {
    sheet = ss.insertSheet(TAB.BLAST_QUEUE);
    sheet.getRange(1, 1, 1, 6).setValues([[
      'Timestamp', 'NamaAnak', 'Telefon', 'Mesej', 'Status', 'BlastedAt'
    ]]);
    sheet.setFrozenRows(1);
    Logger.log('BlastQueue tab dicipta.');
  }
  return sheet;
}

// queueWABlast — masukkan murid ke BlastQueue dan mulakan trigger
// Input: { token, mesejTemplate, bulan, muridList:[{nama, telefon}] }
function queueWABlast(params) {
  params = params || {};
  try {
    var mesejTemplate = (params.mesejTemplate || '').toString().trim();
    var bulan         = (params.bulan         || '').toString().trim();
    var muridList     = params.muridList       || [];

    if (!mesejTemplate || !bulan || !muridList.length) {
      return { success: false, message: 'mesejTemplate, bulan, dan muridList diperlukan.' };
    }

    var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet     = ensureBlastQueueSheet(ss);
    var timestamp = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');

    var rows = muridList.map(function(m) {
      var nama     = (m.nama    || '').toString().trim();
      var telefon  = (m.telefon || '').toString().trim();
      var mesej    = mesejTemplate
        .replace(/\[BULAN\]/g, bulan)
        .replace(/\[NAMA\]/g,  nama);
      return [timestamp, nama, telefon, mesej, 'PENDING', ''];
    });

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
      SpreadsheetApp.flush();
    }

    var totalQueued  = rows.length;
    var batchCount   = Math.ceil(totalQueued / 40);
    // 40 mesej × 5 saat = 200 saat = ~3.3 min per batch + 8 min gap antara batch
    var estimasiMinit = Math.ceil((totalQueued * 5) / 60) + (batchCount - 1) * 8;

    setupBlastTrigger();

    Logger.log('queueWABlast: ' + totalQueued + ' mesej diqueue untuk ' + bulan);
    return {
      success:       true,
      totalQueued:   totalQueued,
      batchCount:    batchCount,
      estimasiMinit: estimasiMinit
    };

  } catch (err) {
    Logger.log('queueWABlast error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// blastQueueProcessor — proses max 40 PENDING rows, trigger semula jika ada lagi
function blastQueueProcessor() {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.BLAST_QUEUE);
    if (!sheet || sheet.getLastRow() < 2) {
      deleteBlastTrigger();
      return;
    }

    var data     = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    var now      = new Date();
    var processed = 0;

    for (var i = 0; i < data.length && processed < 40; i++) {
      var status = (data[i][COL_BLAST.STATUS] || '').toString().trim().toUpperCase();
      if (status !== 'PENDING') continue;

      var telefon = (data[i][COL_BLAST.TELEFON] || '').toString().trim();
      var mesej   = (data[i][COL_BLAST.MESEJ]   || '').toString().trim();
      var rowNum  = i + 2; // 1-based, header on row 1

      var ok = false;
      if (telefon && mesej) {
        ok = hantarWhatsApp(telefon, mesej);
      }

      var blastedAt = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
      sheet.getRange(rowNum, COL_BLAST.STATUS    + 1).setValue(ok ? 'SENT' : 'FAILED');
      sheet.getRange(rowNum, COL_BLAST.BLASTED_AT + 1).setValue(blastedAt);

      processed++;
      if (processed < 40) Utilities.sleep(5000);
    }

    SpreadsheetApp.flush();
    Logger.log('blastQueueProcessor: ' + processed + ' mesej diproses.');

    // Semak ada lagi PENDING — jika ya, trigger akan dicetuskan semula oleh jadual
    // Jika tiada, padam trigger
    var remaining = sheet.getRange(2, COL_BLAST.STATUS + 1, sheet.getLastRow() - 1, 1)
      .getValues()
      .filter(function(r) { return (r[0] || '').toString().trim().toUpperCase() === 'PENDING'; })
      .length;

    if (remaining === 0) {
      deleteBlastTrigger();
      Logger.log('blastQueueProcessor: Semua mesej selesai. Trigger dipadam.');
    }

  } catch (err) {
    Logger.log('blastQueueProcessor error: ' + err.message);
  }
}

// setupBlastTrigger — pasang time-based trigger setiap 8 minit jika belum ada
function setupBlastTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  var sudahAda = existing.some(function(t) {
    return t.getHandlerFunction() === 'blastQueueProcessor';
  });
  if (!sudahAda) {
    ScriptApp.newTrigger('blastQueueProcessor')
      .timeBased()
      .everyMinutes(8)
      .create();
    Logger.log('setupBlastTrigger: Trigger blastQueueProcessor dipasang (8 minit).');
  }
}

// deleteBlastTrigger — padam semua trigger blastQueueProcessor
function deleteBlastTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'blastQueueProcessor') {
      ScriptApp.deleteTrigger(t);
      Logger.log('deleteBlastTrigger: Trigger dipadam.');
    }
  });
}

// getBlastStatus — return stats semasa BlastQueue
// Output: { success, pending, sent, failed, total }
function getBlastStatus(params) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.BLAST_QUEUE);
    if (!sheet || sheet.getLastRow() < 2) {
      return { success: true, pending: 0, sent: 0, failed: 0, total: 0 };
    }

    var data    = sheet.getRange(2, COL_BLAST.STATUS + 1, sheet.getLastRow() - 1, 1).getValues();
    var pending = 0, sent = 0, failed = 0;

    data.forEach(function(r) {
      var s = (r[0] || '').toString().trim().toUpperCase();
      if      (s === 'PENDING') pending++;
      else if (s === 'SENT')    sent++;
      else if (s === 'FAILED')  failed++;
    });

    return {
      success: true,
      pending: pending,
      sent:    sent,
      failed:  failed,
      total:   pending + sent + failed
    };

  } catch (err) {
    Logger.log('getBlastStatus error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// TEST FUNCTIONS (jalankan dari editor untuk ujian)
// ============================================================

function logHeaders() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  [TAB.KANAK, TAB.DEWASA, TAB.GURU, TAB.KEHADIRAN].forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) { Logger.log(name + ': TAB TIDAK DIJUMPAI'); return; }
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    Logger.log(name + ' → ' + JSON.stringify(headers));
  });
}

function testLogin() {
  var result = loginGuru({ email: 'guru@example.com', phone: '0123456789' });
  Logger.log(JSON.stringify(result));
}

function testLoginDirect() {
  // Test dengan telefon sebenar dari Sheets: kolum E = "0196929415", last 6 = "929415"
  // Ganti email di bawah dengan email guru yang ada dalam Sheets
  var result = loginGuru({ email: 'burn.kajang@gmail.com', phone: '929415' });
  Logger.log('testLoginDirect result: ' + JSON.stringify(result));
}

function testRegisterKanak() {
  var result = registerKanak({
    namaIbu:  'Siti Aminah binti Ahmad',
    telefon:  '0123456789',
    email:    'siti@example.com',
    alamat:   'No. 12, Jalan Maju, 50000 Kuala Lumpur',
    namaAnak: 'Muhammad Danish bin Ahmad',
    mykid:    '150101-14-1234',
    tahap:    'Iqra 3',
    faham:    'Ya',
    pakej:    'Pakej Asas (2x seminggu)',
    kaedah:   'Bersemuka (Kelas)'
  });
  Logger.log(JSON.stringify(result));
}

function testRegisterDewasa() {
  var result = registerDewasa({
    nama:    'Ahmad bin Yusof',
    telefon: '0198765432',
    email:   'ahmad@example.com',
    alamat:  'No. 5, Jalan Damai, 40150 Shah Alam',
    tahap:   'Al-Quran (Asas)',
    guru:    ''
  });
  Logger.log(JSON.stringify(result));
}

function testAttendance() {
  var result = attendance({
    guru:   'Ustaz Hafiz',
    murid:  'Muhammad Danish bin Ahmad',
    status: 'Hadir',
    tarikh: Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy')
  });
  Logger.log(JSON.stringify(result));
}

function testGenerateSlip() {
  // Jana slip untuk baris terakhir dalam tab PendaftaranBaru
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(TAB.KANAK);
  var last  = sheet.getLastRow();
  Logger.log('Jana slip untuk baris: ' + last);
  generateSlipKanak(last);
}

// ============================================================
// OTP HELPERS
// ============================================================

// sendOTP_ — jana OTP, simpan dalam PropertiesService, hantar e-mel
function sendOTP_(email, nama) {
  var otp      = Math.floor(100000 + Math.random() * 900000).toString();
  var keyBase  = 'OTP_' + email.replace(/[^a-zA-Z0-9]/g, '_');
  var props    = PropertiesService.getScriptProperties();

  props.setProperty(keyBase,              otp);
  props.setProperty(keyBase + '_TIME',    new Date().getTime().toString());
  props.setProperty(keyBase + '_ATTEMPTS','0');

  var subject = '[Kelas Mengaji] Kod Pengesahan Pendaftaran';
  var htmlBody =
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
    '<div style="background:#1A5C3A;padding:24px;text-align:center;">' +
    '<h2 style="color:#FFFFFF;margin:0;font-size:20px;">Sistem Pengurusan Kelas Mengaji</h2>' +
    '</div>' +
    '<div style="padding:32px 24px;background:#FAF7F0;text-align:center;">' +
    '<p style="font-size:15px;color:#1C1C1C;margin-bottom:8px;">Assalamualaikum <strong>' + nama + '</strong>,</p>' +
    '<p style="font-size:14px;color:#4A4A4A;margin-bottom:24px;">Kod OTP pengesahan pendaftaran kelas mengaji anda:</p>' +
    '<div style="background:#1A5C3A;color:#FFFFFF;font-size:38px;font-weight:bold;letter-spacing:14px;' +
      'padding:20px 32px;border-radius:12px;display:inline-block;margin-bottom:24px;">' + otp + '</div>' +
    '<p style="font-size:13px;color:#4A4A4A;">Kod ini <strong>sah selama 10 minit</strong>.</p>' +
    '<p style="font-size:13px;color:#C0392B;margin-top:8px;font-weight:500;">Jangan kongsikan kod ini kepada sesiapa.</p>' +
    '</div>' +
    '<div style="background:#C9A84C;padding:12px;text-align:center;">' +
    '<p style="color:#FFFFFF;font-size:12px;margin:0;">Sistem Pengurusan Kelas Mengaji &nbsp;·&nbsp; Dikuasakan oleh Google Apps Script</p>' +
    '</div>' +
    '</div>';

  MailApp.sendEmail({ to: email, subject: subject, htmlBody: htmlBody });
  Logger.log('OTP dihantar ke: ' + email);
}

// verifyOTP_ — semak OTP, tamat tempoh (10 min), dan bilangan cubaan (max 3)
function verifyOTP_(email, otpInput) {
  var keyBase  = 'OTP_' + email.replace(/[^a-zA-Z0-9]/g, '_');
  var props    = PropertiesService.getScriptProperties();

  var storedOtp  = props.getProperty(keyBase);
  var storedTime = props.getProperty(keyBase + '_TIME');
  var attempts   = parseInt(props.getProperty(keyBase + '_ATTEMPTS') || '0', 10);

  if (!storedOtp || !storedTime) {
    return { valid: false, message: 'OTP tidak dijumpai. Sila minta OTP baru.' };
  }

  var elapsed = new Date().getTime() - parseInt(storedTime, 10);
  if (elapsed > 600000) {
    props.deleteProperty(keyBase);
    props.deleteProperty(keyBase + '_TIME');
    props.deleteProperty(keyBase + '_ATTEMPTS');
    return { valid: false, expired: true, message: 'OTP tamat tempoh. Sila minta OTP baru.' };
  }

  if (attempts >= 3) {
    return { valid: false, message: 'Terlalu banyak cubaan. Sila minta OTP baru.' };
  }

  if (otpInput.toString().trim() !== storedOtp) {
    attempts++;
    props.setProperty(keyBase + '_ATTEMPTS', attempts.toString());
    var left = 3 - attempts;
    return { valid: false, message: 'OTP tidak tepat. ' + left + ' cubaan lagi.', attemptsLeft: left };
  }

  // Betul — padam OTP
  props.deleteProperty(keyBase);
  props.deleteProperty(keyBase + '_TIME');
  props.deleteProperty(keyBase + '_ATTEMPTS');
  return { valid: true };
}

// ============================================================
// 20. sendOTPKanak — validate data, hantar OTP, return step:'otp'
// ============================================================
function sendOTPKanak(params) {
  params = params || {};
  try {
    ['namaIbu','telefon','namaAnak','mykid','email','alamat','tahap','faham','pakej','kaedah'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });
    var required = ['telefon','namaAnak','mykid','email','alamat','tahap','pakej','kaedah'];
    for (var r = 0; r < required.length; r++) {
      if (!params[required[r]] || !params[required[r]].toString().trim()) {
        return { success: false, message: 'Medan "' + required[r] + '" diperlukan.' };
      }
    }
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.KANAK);
    if (!sheet) return { success: false, message: 'Tab PendaftaranBaru tidak dijumpai.' };
    var existing = findExistingKanakByMykid_(sheet, params.mykid);
    if (existing) return duplicateKanakMessage_(params.mykid, existing);

    var nama = ((params.namaIbu || '') + ' (' + (params.namaAnak || '') + ')').trim();
    sendOTP_(params.email.trim(), nama);
    return { success: true, step: 'otp' };
  } catch (err) {
    Logger.log('sendOTPKanak error: ' + err.message);
    return { success: false, message: 'Ralat menghantar OTP: ' + err.message };
  }
}

// ============================================================
// 21. sendOTPDewasa — validate data, hantar OTP, return step:'otp'
// ============================================================
function sendOTPDewasa(params) {
  params = params || {};
  try {
    ['nama','telefon','email','alamat','tahap','mykad','pakej','kaedah'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });
    var required = ['nama','telefon','email','alamat','tahap','mykad','pakej','kaedah'];
    for (var r = 0; r < required.length; r++) {
      if (!params[required[r]] || !params[required[r]].toString().trim()) {
        return { success: false, message: 'Medan "' + required[r] + '" diperlukan.' };
      }
    }
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.DEWASA);
    if (!sheet) return { success: false, message: 'Tab KelasDewasa tidak dijumpai.' };
    var existing = findExistingDewasaByMykad_(sheet, params.mykad);
    if (existing) return duplicateDewasaMessage_(params.mykad, existing);

    sendOTP_(params.email.trim(), params.nama.trim());
    return { success: true, step: 'otp' };
  } catch (err) {
    Logger.log('sendOTPDewasa error: ' + err.message);
    return { success: false, message: 'Ralat menghantar OTP: ' + err.message };
  }
}

// ============================================================
// 22. confirmRegisterKanak — verify OTP then save to Sheets
// ============================================================
function confirmRegisterKanak(params) {
  params = params || {};
  try {
    var email = (params.email || '').trim();
    var otp   = (params.otp   || '').toString().trim();
    if (!email || !otp) return { success: false, message: 'E-mel dan OTP diperlukan.' };

    var verify = verifyOTP_(email, otp);
    if (!verify.valid) return { success: false, expired: verify.expired || false, message: verify.message, attemptsLeft: verify.attemptsLeft };

    ['namaIbu','telefon','namaAnak','mykid','email','alamat','tahap','faham','pakej','kaedah'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.KANAK);
    if (!sheet) return { success: false, message: 'Tab PendaftaranBaru tidak dijumpai.' };

    var existing = findExistingKanakByMykid_(sheet, params.mykid);
    if (existing) return duplicateKanakMessage_(params.mykid, existing);

    var nextBil   = sheet.getLastRow();
    var timestamp = new Date();
    var newRow    = new Array(19).fill('');
    newRow[COL_KANAK.TIMESTAMP] = Utilities.formatDate(timestamp, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    newRow[COL_KANAK.NAMA_IBU]  = (params.namaIbu || '').trim().toUpperCase();
    newRow[COL_KANAK.TELEFON]   = params.telefon.trim();
    newRow[COL_KANAK.NAMA]      = params.namaAnak.trim().toUpperCase();
    newRow[COL_KANAK.NO_MYKID]  = params.mykid.trim();
    newRow[COL_KANAK.EMAIL]     = params.email.trim();
    newRow[COL_KANAK.ALAMAT]    = params.alamat.trim();
    newRow[COL_KANAK.TAHAP]     = params.tahap.trim();
    newRow[COL_KANAK.FAHAM]     = (params.faham || '').trim();
    newRow[COL_KANAK.PAKEJ]     = params.pakej.trim();
    newRow[COL_KANAK.KAEDAH]    = params.kaedah.trim();
    newRow[COL_KANAK.STATUS]    = 'AKTIF';

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    var slipRow = sheet.getLastRow();
    try { generateSlipKanak(slipRow); } catch(e) { Logger.log('generateSlipKanak error: ' + e.message); }

    Logger.log('confirmRegisterKanak berjaya: Bil ' + nextBil + ' — ' + params.namaAnak);
    try { syncNamaMuridToAllForms(); } catch(e) { Logger.log('syncForms error: ' + e.message); }
    return { success: true, bil: nextBil };

  } catch (err) {
    Logger.log('confirmRegisterKanak error: ' + err.message);
    return { success: false, message: 'Ralat semasa mendaftar: ' + err.message };
  }
}

// ============================================================
// 23. confirmRegisterDewasa — verify OTP then save to Sheets
// ============================================================
function confirmRegisterDewasa(params) {
  params = params || {};
  try {
    var email = (params.email || '').trim();
    var otp   = (params.otp   || '').toString().trim();
    if (!email || !otp) return { success: false, message: 'E-mel dan OTP diperlukan.' };

    var verify = verifyOTP_(email, otp);
    if (!verify.valid) return { success: false, expired: verify.expired || false, message: verify.message, attemptsLeft: verify.attemptsLeft };

    ['nama','telefon','email','alamat','tahap','mykad','pakej','kaedah'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.DEWASA);
    if (!sheet) return { success: false, message: 'Tab KelasDewasa tidak dijumpai.' };

    var existing = findExistingDewasaByMykad_(sheet, params.mykad);
    if (existing) return duplicateDewasaMessage_(params.mykad, existing);

    var nextBil   = sheet.getLastRow();
    var timestamp = new Date();
    var newRow    = new Array(19).fill('');
    newRow[COL_DEWASA.TIMESTAMP] = Utilities.formatDate(timestamp, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    newRow[COL_DEWASA.EMAIL]     = params.email.trim();
    newRow[COL_DEWASA.NAMA]      = params.nama.trim().toUpperCase();
    newRow[COL_DEWASA.TELEFON]   = params.telefon.trim();
    newRow[COL_DEWASA.NO_MYKAD]  = (params.mykad  || '').trim();
    newRow[COL_DEWASA.PAKEJ]     = (params.pakej   || '').trim();
    newRow[COL_DEWASA.KAEDAH]    = (params.kaedah  || '').trim();
    newRow[COL_DEWASA.ALAMAT]    = params.alamat.trim();
    newRow[COL_DEWASA.TAHAP]     = params.tahap.trim();
    newRow[COL_DEWASA.FAHAM]     = (params.faham   || '').trim();
    newRow[COL_DEWASA.STATUS]    = 'AKTIF';

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    var actualRow = sheet.getLastRow();
    var muridId   = 'D' + Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyyMMdd') + '-' + actualRow;

    Logger.log('confirmRegisterDewasa berjaya: ' + params.nama + ' (' + muridId + ')');
    try { syncNamaMuridToAllForms(); } catch(e) { Logger.log('syncForms error: ' + e.message); }
    return { success: true, id: muridId };

  } catch (err) {
    Logger.log('confirmRegisterDewasa error: ' + err.message);
    return { success: false, message: 'Ralat semasa mendaftar: ' + err.message };
  }
}

// ============================================================
// getEbayarStats
// Kira stats dari live data: eligible murid AKTIF per bulan vs sudah bayar
// Output: { success, stats: [{jumlahDaftar, selesai, belum, peratus}] }
// ============================================================
function getEbayarStats() {
  try {
    var BULAN_2026 = [
      'JAN2026','FEB2026','MAC2026','APRIL2026','MEI2026','JUN2026',
      'JULAI2026','OGOS2026','SEPT2026','OKT2026','NOV2026','DIS2026'
    ];

    var CALC_TAB_MAP = {
      'JAN2026':   'CalculationJan2026',
      'FEB2026':   'CalculationFeb2026',
      'MAC2026':   'CalculationMac2026',
      'APRIL2026': 'CalculationApril2026',
      'MEI2026':   'CalculationMei2026',
      'JUN2026':   'CalculationJun2026',
      'JULAI2026': 'CalculationJulai2026',
      'OGOS2026':  'CalculationOgos2026',
      'SEPT2026':  'CalculationSept2026',
      'OKT2026':   'CalculationOkt2026',
      'NOV2026':   'CalculationNov2026',
      'DIS2026':   'CalculationDis2026'
    };

    function parseRegMonthIdx(tarikhRaw) {
      if (!tarikhRaw) return -1;
      var d = null;
      if (tarikhRaw instanceof Date && !isNaN(tarikhRaw.getTime())) {
        d = tarikhRaw;
      } else {
        var ts = tarikhRaw.toString().trim();
        var m1 = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m1) d = new Date(parseInt(m1[3],10), parseInt(m1[2],10)-1, parseInt(m1[1],10));
        if (!d) {
          var m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m2) d = new Date(parseInt(m2[1],10), parseInt(m2[2],10)-1, parseInt(m2[3],10));
        }
      }
      if (!d || isNaN(d.getTime())) return -1;
      var yr = d.getFullYear();
      if (yr < 2026)   return -1;
      if (yr === 2026) return d.getMonth();
      return 999;
    }

    var ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
    var yuranSS = SpreadsheetApp.openById(YURAN_SS_ID);

    var kanakSheet  = ss.getSheetByName(TAB.KANAK);
    var kanakData   = (kanakSheet && kanakSheet.getLastRow() > 1)
      ? kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, 19).getValues()
      : [];

    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);
    var dewasaData  = (dewasaSheet && dewasaSheet.getLastRow() > 1)
      ? dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, 19).getValues()
      : [];

    var results = [];

    for (var bi = 0; bi < BULAN_2026.length; bi++) {
      var bulan         = BULAN_2026[bi];
      var bulanMonthIdx = bi;

      try {
        var calcSheet = yuranSS.getSheetByName(CALC_TAB_MAP[bulan]);
        if (!calcSheet) {
          results.push({ error: 'Tab tidak dijumpai' });
          continue;
        }

        var eligibleSet = {};
        kanakData.forEach(function(r) {
          var n = (r[COL_KANAK.NAMA]   || '').toString().trim().toUpperCase();
          var s = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
          if (!n || (s && s !== 'AKTIF')) return;
          var rmi = parseRegMonthIdx(r[COL_KANAK.TIMESTAMP]);
          if (rmi > bulanMonthIdx) return;
          eligibleSet[n] = true;
        });
        dewasaData.forEach(function(r) {
          var n = (r[COL_DEWASA.NAMA]   || '').toString().trim().toUpperCase();
          var s = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
          if (!n || (s && s !== 'AKTIF')) return;
          var rmi = parseRegMonthIdx(r[COL_DEWASA.TIMESTAMP]);
          if (rmi > bulanMonthIdx) return;
          eligibleSet[n] = true;
        });

        var jumlahDaftar = Object.keys(eligibleSet).length;

        var selesai = 0;
        if (calcSheet.getLastRow() >= 2) {
          var calcData = calcSheet.getRange(2, 4, calcSheet.getLastRow() - 1, 1).getValues();
          calcData.forEach(function(r) {
            var nama = (r[0] || '').toString().trim().toUpperCase();
            if (nama && nama !== 'SUDAH BAYAR YURAN' && nama.indexOf('#') === -1 && nama !== ':-:') {
              selesai++;
            }
          });
        }

        var belum   = jumlahDaftar - selesai;
        var peratus = jumlahDaftar > 0 ? Math.round((selesai / jumlahDaftar) * 100) : 0;

        results.push({ jumlahDaftar: jumlahDaftar, selesai: selesai, belum: belum, peratus: peratus });

      } catch (tabErr) {
        results.push({ error: tabErr.message });
      }
    }

    return { success: true, stats: results };

  } catch (err) {
    Logger.log('getEbayarStats error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// getYuranParent
// Cari rekod bayaran yuran berdasarkan nama + senarai belum bayar
// Input:  { keyword } — substring carian nama (boleh kosong)
// Output: { success, found:[{nama,bulan,resitUrl}], belumBayar:{JAN2026:[nama...],...} }
// Logic belumBayar: cross-check "NAMA MURID" (Col B + Col F tarikh daftar) vs tab Yuran
// ============================================================
function getYuranParent(params) {
  params = params || {};
  try {
    var keyword = sanitizeInput((params.keyword || '').toString().trim()).toUpperCase();

    var PAYMENT_TABS = [
      { name: 'Yuran Mei',       label: 'Mei 2024' },
      { name: 'Yuran Jun',       label: 'Jun 2024' },
      { name: 'Yuran Julai',     label: 'Julai 2024' },
      { name: 'Yuran Ogos',      label: 'Ogos 2024' },
      { name: 'Yuran September', label: 'September 2024' },
      { name: 'Yuran Oktober',   label: 'Oktober 2024' },
      { name: 'Yuran November',  label: 'November 2024' },
      { name: 'Yuran Disember',  label: 'Disember 2024' },
      { name: 'JAN2026',         label: 'Januari 2026' },
      { name: 'FEB2026',         label: 'Februari 2026' },
      { name: 'MAC2026',         label: 'Mac 2026' },
      { name: 'APRIL2026',       label: 'April 2026' },
      { name: 'MEI2026',         label: 'Mei 2026' },
      { name: 'JUN2026',         label: 'Jun 2026' },
      { name: 'JULAI2026',       label: 'Julai 2026' },
      { name: 'OGOS2026',        label: 'Ogos 2026' }
    ];

    // BULAN_2026[b] maps to month index b (0=Jan … 11=Dis), all year 2026
    var BULAN_2026 = [
      'JAN2026','FEB2026','MAC2026','APRIL2026','MEI2026','JUN2026',
      'JULAI2026','OGOS2026','SEPT2026','OKT2026','NOV2026','DIS2026'
    ];

    var ss = SpreadsheetApp.openById(YURAN_SS_ID);

    // 1. FOUND — cari dalam Yuran payment tabs (kekalkan sama)
    var found = [];
    if (keyword.length >= 2) {
      for (var p = 0; p < PAYMENT_TABS.length; p++) {
        try {
          var pSheet = ss.getSheetByName(PAYMENT_TABS[p].name);
          if (!pSheet || pSheet.getLastRow() < 2) continue;
          var lastCol = Math.max(12, pSheet.getLastColumn());
          var pData = pSheet.getRange(2, 1, pSheet.getLastRow() - 1, lastCol).getValues();
          for (var pr = 0; pr < pData.length; pr++) {
            var rawNama  = (pData[pr][2] || '').toString().trim().toUpperCase(); // Col C
            var resitUrl = (pData[pr][11] || '').toString().trim();              // Col L
            if (!rawNama) continue;
            var parts = rawNama.split(',');
            for (var pn = 0; pn < parts.length; pn++) {
              var nama = parts[pn].trim().toUpperCase();
              if (!nama || nama.indexOf(keyword) === -1) continue;
              found.push({ nama: nama, bulan: PAYMENT_TABS[p].label, resitUrl: resitUrl });
            }
          }
        } catch (pe) { Logger.log('getYuranParent payment tab error ' + PAYMENT_TABS[p].name + ': ' + pe.message); }
      }
    }

    // Native eBayar bermula September 2026. Hanya baca rekod selesai dari
    // Payments; jangan gabungkan salinan migrasi Januari-Ogos.
    var NATIVE_MONTHS_2026 = {
      '2026-09': { label: 'September 2026' },
      '2026-10': { label: 'Oktober 2026' },
      '2026-11': { label: 'November 2026' },
      '2026-12': { label: 'Disember 2026' }
    };
    var NATIVE_KEY_BY_LEGACY_2026 = {
      'SEPT2026': '2026-09',
      'OKT2026':  '2026-10',
      'NOV2026':  '2026-11',
      'DIS2026':  '2026-12'
    };
    var canonicalPaidByMonth = {};
    var canonicalFound = [];
    var canonicalFoundByKey = {};
    var canonicalRows = getPaymentsRowsV2_().rows;
    canonicalRows.forEach(function(r) {
      var status = (r.STATUS || '').toString().trim().toUpperCase();
      if (status !== 'SELESAI') return;
      var bulanKey = (r.BULAN_KEY || makeBulanKeyV2_(r.TAHUN, r.BULAN || r.SOURCE_SHEET)).toString();
      var monthInfo = NATIVE_MONTHS_2026[bulanKey];
      if (!monthInfo) return;
      var nama = normalizeYuranNameV2_(r.NAMA_MURID_NORM || r.NAMA_MURID_RAW);
      if (!nama) return;

      if (!canonicalPaidByMonth[bulanKey]) canonicalPaidByMonth[bulanKey] = {};
      canonicalPaidByMonth[bulanKey][nama] = true;
      if (keyword.length < 2 || nama.indexOf(keyword) === -1) return;

      var resitUrl = (r.RESIT_URL || '').toString().trim();
      var resultKey = nama + '|' + bulanKey;
      var existing = canonicalFoundByKey[resultKey];
      if (!existing) {
        existing = { nama: nama, bulan: monthInfo.label, resitUrl: resitUrl };
        canonicalFoundByKey[resultKey] = existing;
        canonicalFound.push(existing);
      } else if (!/^https:\/\//i.test(existing.resitUrl || '') && /^https:\/\//i.test(resitUrl)) {
        existing.resitUrl = resitUrl;
      }
    });
    found = found.concat(canonicalFound);

    // Satu baris paparan bagi setiap murid + bulan. Jika terdapat lebih daripada
    // satu rekod, utamakan URL resit HTTPS tanpa mendedahkan medan Payments lain.
    var foundDeduped = [];
    var foundByKey = {};
    found.forEach(function(entry) {
      var namaKey = normalizeYuranNameV2_(entry.nama);
      var resultKey = namaKey + '|' + (entry.bulan || '').toString().trim().toUpperCase();
      var existing = foundByKey[resultKey];
      if (!existing) {
        existing = { nama: entry.nama, bulan: entry.bulan, resitUrl: (entry.resitUrl || '').toString().trim() };
        foundByKey[resultKey] = existing;
        foundDeduped.push(existing);
      } else if (!/^https:\/\//i.test(existing.resitUrl || '') && /^https:\/\//i.test(entry.resitUrl || '')) {
        existing.resitUrl = (entry.resitUrl || '').toString().trim();
      }
    });
    found = foundDeduped;

    // 2. SENARAI MURID AKTIF dari tab "NAMA MURID"
    //    Col B (index 0) = nama, Col F (index 4) = tarikh daftar
    //    regMonthIdx: -1 = murid lama/tiada tarikh (masuk semua bulan)
    //                 0-11 = bulan daftar dalam 2026 (masuk dari bulan tersebut)
    //                 999 = daftar selepas 2026 (skip semua bulan 2026)
    var activeMurid = [];
    try {
      var nmSheet = ss.getSheetByName('NAMA MURID');
      if (nmSheet && nmSheet.getLastRow() > 1) {
        // Read Col B to Col F (5 columns starting at column 2)
        var nmData = nmSheet.getRange(2, 2, nmSheet.getLastRow() - 1, 5).getValues();
        for (var nm = 0; nm < nmData.length; nm++) {
          var nmNama = (nmData[nm][0] || '').toString().trim().toUpperCase(); // Col B
          if (!nmNama) continue;

          var tarikhRaw   = nmData[nm][4]; // Col F (5th column read = index 4)
          var regMonthIdx = -1;            // default: old murid, masuk semua bulan

          if (tarikhRaw) {
            var d = null;
            if (tarikhRaw instanceof Date && !isNaN(tarikhRaw.getTime())) {
              d = tarikhRaw;
            } else {
              var ts = tarikhRaw.toString().trim();
              if (ts) {
                var m1 = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/MM/yyyy
                if (m1) d = new Date(parseInt(m1[3], 10), parseInt(m1[2], 10) - 1, parseInt(m1[1], 10));
                if (!d) {
                  var m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2})$/);     // yyyy-MM-dd
                  if (m2) d = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10));
                }
              }
            }
            if (d && !isNaN(d.getTime())) {
              var yr = d.getFullYear();
              if (yr < 2026)  { regMonthIdx = -1;             } // Daftar sebelum 2026 = murid lama
              else if (yr === 2026) { regMonthIdx = d.getMonth(); } // 0=Jan … 11=Dis
              else            { regMonthIdx = 999;             } // Daftar selepas 2026
            }
          }

          activeMurid.push({ nama: nmNama, regMonthIdx: regMonthIdx });
        }
      }
    } catch (nmErr) {
      Logger.log('getYuranParent NAMA MURID error: ' + nmErr.message);
    }

    // 3. BELUM BAYAR — cross-check murid aktif vs tab Yuran bulanan
    //    Filter: murid yang daftar SELEPAS bulan berkenaan tidak dimasukkan
    //    Hanya include bulan yang tabnya wujud; skip bulan yang tab tak wujud
    var belumBayar = {};
    for (var b = 0; b < BULAN_2026.length; b++) {
      var bulanKey      = BULAN_2026[b];
      var bulanMonthIdx = b; // 0=Jan, 1=Feb, ..., 11=Dis
      try {
        var nativeBulanKey = NATIVE_KEY_BY_LEGACY_2026[bulanKey];
        if (nativeBulanKey) {
          var canonicalPaidSet = canonicalPaidByMonth[nativeBulanKey] || {};
          belumBayar[bulanKey] = getEligibleYuranStudentsV2_('2026', nativeBulanKey)
            .filter(function(student) { return !canonicalPaidSet[student.nama]; })
            .map(function(student) { return student.nama; });
          continue;
        }

        var bSheet = ss.getSheetByName(bulanKey);
        if (!bSheet || bSheet.getLastRow() < 2) continue; // skip — tab tak wujud

        var lastBCol = Math.max(11, bSheet.getLastColumn());
        var bData = bSheet.getRange(2, 1, bSheet.getLastRow() - 1, lastBCol).getValues();

        // Kumpul nama yang sudah bayar dari Col C (index 2), handle comma-separated
        var sudahBayarSet = {};
        for (var br = 0; br < bData.length; br++) {
          var bRawNama = (bData[br][2] || '').toString().trim().toUpperCase();
          if (!bRawNama) continue;
          var bParts = bRawNama.split(',');
          for (var bp = 0; bp < bParts.length; bp++) {
            var bNama = bParts[bp].trim().toUpperCase();
            if (bNama) sudahBayarSet[bNama] = true;
          }
        }

        // Cross-check: murid aktif yang layak untuk bulan ini dan belum bayar
        var belumList = [];
        for (var am = 0; am < activeMurid.length; am++) {
          var murid = activeMurid[am];
          // Skip murid yang daftar selepas bulan ini (regMonthIdx > bulanMonthIdx)
          // -1 = tiada tarikh (lulus), 0-11 = bandingkan, 999 = daftar selepas 2026 (skip)
          if (murid.regMonthIdx !== -1 && murid.regMonthIdx > bulanMonthIdx) continue;
          if (!sudahBayarSet[murid.nama]) belumList.push(murid.nama);
        }
        belumBayar[bulanKey] = belumList;

      } catch (bErr) {
        Logger.log('getYuranParent bulan error ' + bulanKey + ': ' + bErr.message);
        // skip bulan yang error — jangan include
      }
    }

    return { success: true, found: found, belumBayar: belumBayar };

  } catch (err) {
    Logger.log('getYuranParent error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================
// FCM — Firebase Cloud Messaging
// ============================================================

function ensureDeviceTokensSheet(ss) {
  var sheet = ss.getSheetByName(TAB.DEVICE_TOKENS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB.DEVICE_TOKENS);
    sheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Email', 'FCM_Token', 'Device']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureNotifikasiSheet(ss) {
  var sheet = ss.getSheetByName(TAB.NOTIFIKASI);
  if (!sheet) {
    sheet = ss.insertSheet(TAB.NOTIFIKASI);
    sheet.getRange(1, 1, 1, 6).setValues([['ID', 'Timestamp', 'Type', 'Title', 'Body', 'Data']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// simpanDeviceToken — simpan/kemaskini FCM token device guru
function simpanDeviceToken(params) {
  params = params || {};
  try {
    var fcmToken  = (params.fcmToken || '').toString().trim();
    var device    = (params.device   || '').toString().trim().substring(0, 200);
    if (!fcmToken) return { success: false, message: 'Token FCM diperlukan.' };

    var authCheck = validateToken(params.token || '');
    var email = authCheck.valid ? (authCheck.user.email || '') : '';

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ensureDeviceTokensSheet(ss);
    var ts    = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');

    // Kemaskini jika token sudah wujud
    if (sheet.getLastRow() > 1) {
      var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][COL_TOKEN.TOKEN].toString() === fcmToken) {
          sheet.getRange(i + 2, COL_TOKEN.TIMESTAMP + 1).setValue(ts);
          return { success: true };
        }
      }
    }

    sheet.appendRow([ts, email, fcmToken, device]);
    SpreadsheetApp.flush();
    Logger.log('simpanDeviceToken: token baru disimpan untuk ' + (email || 'unknown'));
    return { success: true };
  } catch (err) {
    Logger.log('simpanDeviceToken error: ' + err.message);
    return { success: false, message: err.message };
  }
}

// getFCMAccessToken — jana OAuth2 bearer token untuk FCM HTTP V1 API
function getFCMAccessToken() {
  var props       = PropertiesService.getScriptProperties();
  var clientEmail = (props.getProperty('FCM_CLIENT_EMAIL') || '').trim();
  var privateKey  = (props.getProperty('FCM_PRIVATE_KEY')  || '').replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) throw new Error('FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY tidak dijumpai dalam Script Properties.');

  var now = Math.floor(Date.now() / 1000);

  function b64url(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  }

  var header   = b64url({ alg: 'RS256', typ: 'JWT' });
  var payload  = b64url({
    iss:   clientEmail,
    sub:   clientEmail,
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  });

  var sigInput  = header + '.' + payload;
  var signature = Utilities.computeRsaSha256Signature(sigInput, privateKey);
  var jwt       = sigInput + '.' + Utilities.base64EncodeWebSafe(signature).replace(/=+$/, '');

  var resp = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method:      'post',
    contentType: 'application/x-www-form-urlencoded',
    payload:     'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt,
    muteHttpExceptions: true
  });

  var data = JSON.parse(resp.getContentText());
  if (!data.access_token) throw new Error('getFCMAccessToken gagal: ' + resp.getContentText());
  return data.access_token;
}

// hantarFCM — hantar push notification ke semua token dalam DeviceTokens
function hantarFCM(title, body, dataMap) {
  try {
    var props      = PropertiesService.getScriptProperties();
    var projectId  = (props.getProperty('FCM_PROJECT_ID') || '').trim();
    if (!projectId) return;

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ensureDeviceTokensSheet(ss);
    if (sheet.getLastRow() < 2) return;

    var rows   = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
    var tokens = rows.map(function(r) { return (r[COL_TOKEN.TOKEN] || '').toString().trim(); })
                     .filter(function(t) { return t.length > 0; });
    if (!tokens.length) return;

    var accessToken = getFCMAccessToken();
    var url         = 'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send';
    var dataStr     = {};
    if (dataMap) {
      Object.keys(dataMap).forEach(function(k) { dataStr[k] = String(dataMap[k]); });
    }

    tokens.forEach(function(token) {
      try {
        UrlFetchApp.fetch(url, {
          method:      'post',
          contentType: 'application/json',
          headers:     { Authorization: 'Bearer ' + accessToken },
          payload:     JSON.stringify({
            message: {
              token: token,
              notification: { title: title, body: body },
              data: dataStr,
              webpush: {
                headers:      { TTL: '86400' },
                notification: {
                  title: title, body: body,
                  icon:  'https://i.ibb.co/93rXrkZq/LOGO-SL.png',
                  requireInteraction: false
                }
              }
            }
          }),
          muteHttpExceptions: true
        });
      } catch (te) { Logger.log('hantarFCM token error: ' + te.message); }
    });
    Logger.log('hantarFCM: hantar ke ' + tokens.length + ' token — "' + title + '"');
  } catch (err) {
    Logger.log('hantarFCM error: ' + err.message);
  }
}

// simpanNotifikasi — simpan ke tab Notifikasi dan trigger FCM push
function simpanNotifikasi(type, title, body, dataMap) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ensureNotifikasiSheet(ss);
    var id    = Utilities.getUuid();
    var ts    = Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    sheet.appendRow([id, ts, type || 'umum', title || '', body || '', dataMap ? JSON.stringify(dataMap) : '']);
    SpreadsheetApp.flush();
    try { hantarFCM(title || '', body || '', Object.assign({ type: type || 'umum', id: id }, dataMap || {})); } catch(fe) {}
    return id;
  } catch (err) {
    Logger.log('simpanNotifikasi error: ' + err.message);
    return null;
  }
}

// getNotifikasi — return 20 notifikasi terbaru, filter selepas lastId
function getNotifikasi(params) {
  params = params || {};
  try {
    var lastId = (params.lastId || '').toString().trim();
    var ss     = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet  = ensureNotifikasiSheet(ss);
    if (sheet.getLastRow() < 2) return { success: true, notifikasi: [] };

    var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    rows.reverse(); // latest first

    var result = [];
    for (var i = 0; i < rows.length && result.length < 20; i++) {
      var id = (rows[i][COL_NOTIF.ID] || '').toString().trim();
      if (!id) continue;
      if (lastId && id === lastId) break;
      result.push({
        id:        id,
        timestamp: rows[i][COL_NOTIF.TIMESTAMP].toString(),
        type:      rows[i][COL_NOTIF.TYPE].toString(),
        title:     rows[i][COL_NOTIF.TITLE].toString(),
        body:      rows[i][COL_NOTIF.BODY].toString()
      });
    }

    return { success: true, notifikasi: result };
  } catch (err) {
    Logger.log('getNotifikasi error: ' + err.message);
    return { success: false, notifikasi: [] };
  }
}
function searchSijilKhatam(params) {
  params = params || {};
  try {
    var namaSearch = ((params.namaSearch || '').toString().trim()).toUpperCase();
    if (namaSearch.length < 2) {
      return { success: false, message: 'Sila masukkan sekurang-kurangnya 2 huruf nama.' };
    }
    var ss = SpreadsheetApp.openById('1jGp9U6lYRBvAVPSHhqSLv2WL5MHxdmKP5f5AnTHC8xU');
    var results = [];
    var sheetIqra = ss.getSheetByName("Khatam Iqra'");
    if (sheetIqra && sheetIqra.getLastRow() > 1) {
      var dataIqra = sheetIqra.getDataRange().getValues();
      var hdIqra = dataIqra[0].map(function(h) { return (h||'').toString().trim(); });
      var colNamaI = hdIqra.indexOf('NAMA PENUH ANAK SEPERTI MYKID/MYKAD');
      if (colNamaI === -1) colNamaI = 2;
      var colSiriI = hdIqra.indexOf('SIRI');
      var colGuruI = hdIqra.indexOf('GURU KELAS YANG MENGAJAR ANAK');
      var colUrlI  = hdIqra.indexOf('Merged Doc URL - KHATAM IQRA');
      for (var i = 1; i < dataIqra.length; i++) {
        var namaI = (dataIqra[i][colNamaI]||'').toString().trim().toUpperCase();
        if (!namaI || namaI.indexOf(namaSearch) === -1) continue;
        results.push({ nama: namaI, jenis: "Khatam Iqra'", siri: colSiriI !== -1 ? (dataIqra[i][colSiriI]||'').toString().trim() : '', guru: colGuruI !== -1 ? (dataIqra[i][colGuruI]||'').toString().trim() : '', url: colUrlI !== -1 ? (dataIqra[i][colUrlI]||'').toString().trim() : '' });
      }
    }
    var sheetQuran = ss.getSheetByName('Khatam Quran');
    if (sheetQuran && sheetQuran.getLastRow() > 1) {
      var dataQuran = sheetQuran.getDataRange().getValues();
      var hdQuran = dataQuran[0].map(function(h) { return (h||'').toString().trim(); });
      var colNamaQ = hdQuran.indexOf('NAMA PENUH ANAK SEPERTI MYKID/MYKAD');
      if (colNamaQ === -1) colNamaQ = 2;
      var colSiriQ = hdQuran.indexOf('SIRI');
      var colGuruQ = hdQuran.indexOf('GURU KELAS YANG MENGAJAR ANAK');
      var colUrlQ  = hdQuran.indexOf('Merged Doc URL - KHATAM QURAN');
      for (var j = 1; j < dataQuran.length; j++) {
        var namaQ = (dataQuran[j][colNamaQ]||'').toString().trim().toUpperCase();
        if (!namaQ || namaQ.indexOf(namaSearch) === -1) continue;
        results.push({ nama: namaQ, jenis: 'Khatam Al-Quran', siri: colSiriQ !== -1 ? (dataQuran[j][colSiriQ]||'').toString().trim() : '', guru: colGuruQ !== -1 ? (dataQuran[j][colGuruQ]||'').toString().trim() : '', url: colUrlQ !== -1 ? (dataQuran[j][colUrlQ]||'').toString().trim() : '' });
      }
    }
    Logger.log('searchSijilKhatam: "' + namaSearch + '" - ' + results.length + ' keputusan');
    return { success: true, results: results };
  } catch (err) {
    Logger.log('searchSijilKhatam error: ' + err.message);
    return { success: false, message: 'Ralat semasa mencari sijil: ' + err.message };
  }
}
