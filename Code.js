// ============================================================
// Code.gs — Sistem Pengurusan Kelas Mengaji
// Spreadsheet ID: 1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU
// Fasa 1: Login, Pendaftaran Kanak-kanak & Dewasa, Kehadiran
// ============================================================

var SPREADSHEET_ID = '1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU';

// Nama tab dalam spreadsheet
var TAB = {
  GURU:          'Maklumat Guru',
  KANAK:         'PendaftaranBaru',
  DEWASA:        'KelasDewasa',
  KEHADIRAN:     'Kehadiran',
  BLAST_QUEUE:   'BlastQueue',
  DEVICE_TOKENS: 'DeviceTokens',
  NOTIFIKASI:    'Notifikasi'
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
  Logger.log('enrolment: ' + r.murid.length); // expect 60
  Logger.log(JSON.stringify(r.murid));

  var s = getKehadiranStats({bulan:'06', tahun:'2026', namaGuru:'MUHAMMAD SHAFIE BIN BAHARI'});
  Logger.log('totalMurid: ' + s.totalMurid + ' | totalSesi: ' + s.totalSesi);
  Logger.log('unmatched: ' + JSON.stringify(s.unmatched));
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
  'recordCash', 'syncForms', 'syncFormBulanIni', 'updateStatusMurid', 'getMuridListAll',
  'getKehadiranStats', 'getKehadiranRekod', 'getMuridByGuru', 'simpanKehadiran',
  'uploadGuruGambar', 'updateGuru', 'getOrgChart', 'hantarWAYuran',
  'queueWABlast', 'getBlastStatus', 'logout',
  'simpanDeviceToken', 'getNotifikasi',
  'searchSijilKhatam',
  'renewSession'
];

var AUTH_REQUIRED_ACTIONS = [
  'attendance', 'getDashboardStats', 'getKehadiranHariIni', 'getMuridList',
  'getGuru', 'getYuranStats', 'recordCash', 'syncForms', 'syncFormBulanIni', 'updateStatusMurid',
  'getMuridListAll', 'getKehadiranStats', 'getKehadiranRekod', 'getMuridByGuru', 'simpanKehadiran',
  'uploadGuruGambar', 'updateGuru', 'getOrgChart', 'hantarWAYuran',
  'queueWABlast', 'getBlastStatus',
  'simpanDeviceToken', 'getNotifikasi'
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
    else if (action === 'searchSijilKhatam')      result = searchSijilKhatam(body);
    else if (action === 'renewSession')           result = renewSession(body);

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
  else if (action === 'searchSijilKhatam')     return searchSijilKhatam(payload);
  else if (action === 'renewSession')          return renewSession(payload);
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
          var nama = n.trim().toUpperCase();
          if (!nama || seenNames[nama]) return;
          seenNames[nama]      = true;
          sudahBayarSet[nama]  = true;
          listNamaBayar.push(nama);
          listResit.push({ nama: nama, resitUrl: resitUrl });
        });
      });
    }

    // 2. Master list — tab NAMA MURID (sumber tunggal, sama seperti eSemak)
    var BULAN_2026    = ['JAN2026','FEB2026','MAC2026','APRIL2026','MEI2026','JUN2026',
                         'JULAI2026','OGOS2026','SEPT2026','OKT2026','NOV2026','DIS2026'];
    var bulanMonthIdx = BULAN_2026.indexOf(bulan);
    var activeMurid   = [];

    try {
      var nmSheet = yuranSS.getSheetByName('NAMA MURID');
      if (nmSheet && nmSheet.getLastRow() > 1) {
        var nmData = nmSheet.getRange(2, 2, nmSheet.getLastRow() - 1, 5).getValues();
        for (var nm = 0; nm < nmData.length; nm++) {
          var nmNama = (nmData[nm][0] || '').toString().trim().toUpperCase();
          if (!nmNama) continue;

          var tarikhRaw   = nmData[nm][4];
          var regMonthIdx = -1;
          if (tarikhRaw) {
            var d = null;
            if (tarikhRaw instanceof Date && !isNaN(tarikhRaw.getTime())) {
              d = tarikhRaw;
            } else {
              var ts = tarikhRaw.toString().trim();
              var m1 = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
              if (m1) d = new Date(parseInt(m1[3],10), parseInt(m1[2],10)-1, parseInt(m1[1],10));
              if (!d) {
                var m2 = ts.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (m2) d = new Date(parseInt(m2[1],10), parseInt(m2[2],10)-1, parseInt(m2[3],10));
              }
            }
            if (d && !isNaN(d.getTime())) {
              var yr = d.getFullYear();
              if      (yr < 2026)  regMonthIdx = -1;
              else if (yr === 2026) regMonthIdx = d.getMonth();
              else                 regMonthIdx = 999;
            }
          }

          // Skip murid daftar selepas bulan berkenaan
          if (bulanMonthIdx !== -1 && regMonthIdx !== -1 && regMonthIdx > bulanMonthIdx) continue;
          if (regMonthIdx === 999 && bulanMonthIdx !== -1) continue;

          activeMurid.push(nmNama);
        }
      }
    } catch (nmErr) {
      Logger.log('getYuranStats NAMA MURID error: ' + nmErr.message);
    }

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
      var enrol   = getMuridByGuru({ namaGuru: namaGuru });
      var senarai = (enrol.success ? enrol.murid : []) || [];

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
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var names = [];

    // PendaftaranBaru — col Q (COL_KANAK.GURU) = Nama Guru, col E = Nama Anak
    var kanakSheet = ss.getSheetByName(TAB.KANAK);
    if (kanakSheet && kanakSheet.getLastRow() > 1) {
      var kData = kanakSheet.getRange(2, 1, kanakSheet.getLastRow() - 1, kanakSheet.getLastColumn()).getValues();
      kData.forEach(function(r) {
        var guru   = (r[COL_KANAK.GURU]   || '').toString().trim().toUpperCase();
        var status = (r[COL_KANAK.STATUS] || '').toString().trim().toUpperCase();
        if (guru !== namaGuruUpper) return;
        if (status && status !== 'AKTIF') return;
        var nama = (r[COL_KANAK.NAMA] || '').toString().trim();
        if (nama) names.push(nama.toUpperCase());
      });
    }

    // KelasDewasa — col R (COL_DEWASA.GURU) = Nama Guru, col D = Nama
    var dewasaSheet = ss.getSheetByName(TAB.DEWASA);
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues();
      dData.forEach(function(r) {
        var guru   = (r[COL_DEWASA.GURU]   || '').toString().trim().toUpperCase();
        var status = (r[COL_DEWASA.STATUS] || '').toString().trim().toUpperCase();
        if (guru !== namaGuruUpper) return;
        if (status && status !== 'AKTIF') return;
        var nama = (r[COL_DEWASA.NAMA] || '').toString().trim();
        if (nama) names.push(nama.toUpperCase());
      });
    }

    // Remove duplicates, sort A-Z
    var unique = {};
    names.forEach(function(n) { unique[n] = true; });
    var sorted = Object.keys(unique).sort();

    Logger.log('getMuridByGuru: "' + namaGuru + '" → ' + sorted.length + ' murid AKTIF');
    return { success: true, murid: sorted };

  } catch (err) {
    Logger.log('getMuridByGuru error: ' + err.message);
    return { success: false, message: err.message };
  }
}
// ============================================================
// 32. simpanKehadiran
// Simpan rekod kehadiran murid ke spreadsheet Kehadiran
// Input:  { namaGuru, emailGuru, muridHadir: [...], kaedah, waktuTamat, tarikh }
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
    var tabParam    = (params.tabKehadiran|| '').toString().trim();

    if (!namaGuru || !muridHadir.length) {
      return { success: false, message: 'namaGuru dan muridHadir diperlukan.' };
    }

    // Cari nama tab yang betul
    var namaTab = tabParam || cariTabGuru(namaGuru) || namaGuru;

    // Format timestamp
    var now         = new Date();
    var timePart    = Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'HH:mm:ss');
    var tarikhKelas = tarikhInput || Utilities.formatDate(now, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy');
    var timestamp   = tarikhKelas + ' ' + timePart;

    var ss    = SpreadsheetApp.openById(KEHADIRAN_SS_ID);
    var sheet = ss.getSheetByName(namaTab);
    if (!sheet) {
      sheet = ss.insertSheet(namaTab);
      sheet.getRange(1, 1, 1, 7).setValues([[
        'Timestamp','Email Address','Nama Guru','Nama Murid',
        'Kaedah Pengajian','Waktu Tamat','Hari Kelas Pengajian'
      ]]);
    }

    var rows = muridHadir.map(function(nama) {
      return [timestamp, emailGuru, namaGuru, nama, kaedah, waktuTamat, tarikhKelas];
    });

    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
    SpreadsheetApp.flush();

    Logger.log('simpanKehadiran: ' + namaTab + ' — ' + muridHadir.length + ' murid (' + tarikhKelas + ')');

    try { simpanNotifikasi('kehadiran', 'Kehadiran Direkodkan', namaGuru + ' — ' + muridHadir.length + ' murid (' + tarikhKelas + ')', { jumlah: String(muridHadir.length) }); } catch(e) {}

    return { success: true, jumlahRekod: muridHadir.length };

  } catch (err) {
    Logger.log('simpanKehadiran error: ' + err.message);
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
// Baca stats agregat dari 12 tab Calculation dalam Yuran spreadsheet
// Output: { success, stats: [{jumlahDaftar, selesai, belum, peratus}] }
// ============================================================
function getEbayarStats() {
  try {
    var STATS_SHEET_ID = '1AUH-ZwrbDjB5l2J5H8t2MBlbzkITMJp66J2VDLZF9CM';
    var tabs = [
      'CalculationJan2026',
      'CalculationFeb2026',
      'CalculationMac2026',
      'CalculationApril2026',
      'CalculationMei2026',
      'CalculationJun2026',
      'CalculationJulai2026',
      'CalculationOgos2026',
      'CalculationSept2026',
      'CalculationOkt2026',
      'CalculationNov2026',
      'CalculationDis2026'
    ];

    var ss      = SpreadsheetApp.openById(STATS_SHEET_ID);
    var results = [];

    for (var i = 0; i < tabs.length; i++) {
      try {
        var sheet = ss.getSheetByName(tabs[i]);
        if (!sheet) {
          results.push({ error: 'Tab tidak dijumpai: ' + tabs[i] });
          continue;
        }
        var row = sheet.getRange(2, 5, 1, 4).getValues()[0];
        results.push({
          jumlahDaftar: row[0] || 0,
          selesai:      row[1] || 0,
          belum:        row[2] || 0,
          peratus:      row[3] || 0
        });
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
      { name: 'OGOS2026',        label: 'Ogos 2026' },
      { name: 'SEPT2026',        label: 'September 2026' },
      { name: 'OKT2026',         label: 'Oktober 2026' },
      { name: 'NOV2026',         label: 'November 2026' },
      { name: 'DIS2026',         label: 'Disember 2026' }
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
