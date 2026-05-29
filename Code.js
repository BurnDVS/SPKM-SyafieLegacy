// ============================================================
// Code.gs — Sistem Pengurusan Kelas Mengaji
// Spreadsheet ID: 1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU
// Fasa 1: Login, Pendaftaran Kanak-kanak & Dewasa, Kehadiran
// ============================================================

var SPREADSHEET_ID = '1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU';

// Nama tab dalam spreadsheet
var TAB = {
  GURU:        'Maklumat Guru',
  KANAK:       'PendaftaranBaru',
  DEWASA:      'KelasDewasa',
  KEHADIRAN:   'Kehadiran'
};

// Kolum tab PendaftaranBaru! (0-indexed)
var COL_KANAK = {
  BIL:          0,   // A
  TIMESTAMP:    1,   // B
  NAMA_IBU:     2,   // C
  TELEFON:      3,   // D
  NAMA_ANAK:    4,   // E
  NO_MYKID:     5,   // F
  EMAIL:        6,   // G
  ALAMAT:       7,   // H
  TAHAP:        8,   // I
  SAYA_FAHAM:   9,   // J
  PAKEJ:        10,  // K
  KAEDAH:       11,  // L
  MERGED_ID:    12,  // M — diisi oleh Autocrat / trigger
  MERGED_URL:   13   // N — diisi oleh Autocrat / trigger
};

// Kolum tab KelasDewasa! (0-indexed)
var COL_DEWASA = {
  NAMA:     0,  // A
  TELEFON:  1,  // B
  EMAIL:    2,  // C
  ALAMAT:   3,  // D
  TAHAP:    4,  // E
  GURU:     5,  // F
  SLIP:     6,  // G
  DOKUMEN:  7   // H
};

// Kolum tab Maklumat Guru (0-indexed)
var COL_GURU = {
  TIMESTAMP:  0,
  EMAIL:      1,
  NAMA:       2,
  IC:         3,
  TELEFON:    4,
  ALAMAT:     5
};

// Kolum tab Kehadiran (0-indexed)
var COL_KEHADIRAN = {
  TARIKH:     0,
  NAMA_GURU:  1,
  NAMA_MURID: 2,
  STATUS:     3
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
function doPost(e) {
  var headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json'
  };

  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var result;

    if      (action === 'login')               result = loginGuru(body);
    else if (action === 'registerKanak')       result = registerKanak(body);
    else if (action === 'registerDewasa')      result = registerDewasa(body);
    else if (action === 'attendance')          result = attendance(body);
    else if (action === 'getDashboardStats')   result = getDashboardStats();
    else if (action === 'getKehadiranHariIni') result = getKehadiranHariIni();
    else if (action === 'getMuridList')        result = getMuridList();
    else result = { success: false, message: 'Tindakan tidak dikenali: ' + action };

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

// doGet — serve portal HTML
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('portal')
    .setTitle('Sistem Pengurusan Kelas Mengaji')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// 1. loginGuru
// Semak email + telefon dari tab Maklumat Guru
// Input:  { email, phone }
// Output: { success, user } atau { success: false, message }
// ============================================================
function loginGuru(params) {
  try {
    var email = (params.email || '').trim().toLowerCase();
    var phone = normalizePhone(params.phone || '').slice(-6);

    if (!email || !phone) {
      return { success: false, message: 'E-mel dan nombor telefon diperlukan.' };
    }

    var cacheKey = 'bf_' + email.replace(/[^a-z0-9]/g, '_');
    var cache    = CacheService.getScriptCache();
    var attempts = parseInt(cache.get(cacheKey) || '0', 10);
    if (attempts >= 5) {
      return { success: false, message: 'Terlalu banyak cubaan. Sila cuba semula selepas 15 minit.' };
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.GURU);
    if (!sheet) return { success: false, message: 'Tab Maklumat Guru tidak dijumpai.' };

    var data = sheet.getDataRange().getValues();
    // Row 0 = header, semak dari row 1
    for (var i = 1; i < data.length; i++) {
      var rowEmail  = (data[i][COL_GURU.EMAIL]   || '').toString().trim().toLowerCase();
      var rowPhone  = normalizePhone((data[i][COL_GURU.TELEFON] || '').toString()).slice(-6);
      var rowNama   = (data[i][COL_GURU.NAMA]    || '').toString().trim();

      Logger.log('Baris ' + i + ': rowPhone="' + rowPhone + '" vs input phone="' + phone + '" | rowEmail="' + rowEmail + '" vs input email="' + email + '"');

      if (rowEmail === email && rowPhone === phone) {
        cache.remove(cacheKey);
        Logger.log('Login berjaya: ' + rowNama);
        return { success: true, user: rowNama };
      }
    }

    cache.put(cacheKey, String(attempts + 1), 900);
    return { success: false, message: 'E-mel atau nombor WhatsApp tidak sepadan.' };

  } catch (err) {
    Logger.log('loginGuru error: ' + err.message);
    return { success: false, message: 'Ralat semasa log masuk.' };
  }
}

// ============================================================
// 2. registerKanak
// Simpan pendaftaran murid kanak-kanak ke tab PendaftaranBaru!
// Input:  { namaIbu, telefon, namaAnak, mykid, email, alamat,
//           tahap, faham, pakej, kaedah }
// Output: { success, bil } atau { success: false, message }
// ============================================================
function registerKanak(params) {
  try {
    ['namaIbu','telefon','namaAnak','mykid','email','alamat','tahap','faham','pakej','kaedah'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });
    var required = ['namaIbu','telefon','namaAnak','mykid','email','alamat','tahap','pakej','kaedah'];
    for (var r = 0; r < required.length; r++) {
      if (!params[required[r]] || !params[required[r]].toString().trim()) {
        return { success: false, message: 'Medan "' + required[r] + '" diperlukan.' };
      }
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.KANAK);
    if (!sheet) return { success: false, message: 'Tab PendaftaranBaru tidak dijumpai.' };

    var lastRow   = sheet.getLastRow();
    var nextBil   = Math.max(1, lastRow - 1); // tolak baris header
    var timestamp = new Date();

    // Bina row mengikut susunan kolum COL_KANAK
    var newRow = new Array(14).fill('');
    newRow[COL_KANAK.BIL]        = nextBil;
    newRow[COL_KANAK.TIMESTAMP]  = Utilities.formatDate(timestamp, 'Asia/Kuala_Lumpur', 'dd/MM/yyyy HH:mm:ss');
    newRow[COL_KANAK.NAMA_IBU]   = params.namaIbu.trim();
    newRow[COL_KANAK.TELEFON]    = params.telefon.trim();
    newRow[COL_KANAK.NAMA_ANAK]  = params.namaAnak.trim();
    newRow[COL_KANAK.NO_MYKID]   = params.mykid.trim();
    newRow[COL_KANAK.EMAIL]      = params.email.trim();
    newRow[COL_KANAK.ALAMAT]     = params.alamat.trim();
    newRow[COL_KANAK.TAHAP]      = params.tahap.trim();
    newRow[COL_KANAK.SAYA_FAHAM] = params.faham || 'Ya';
    newRow[COL_KANAK.PAKEJ]      = params.pakej.trim();
    newRow[COL_KANAK.KAEDAH]     = params.kaedah.trim();
    // COL_KANAK.MERGED_ID & MERGED_URL akan diisi oleh generateSlipKanak()

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    Logger.log('registerKanak berjaya: Bil ' + nextBil + ' — ' + params.namaAnak);

    // Cuba jana slip terus (jika tidak guna trigger)
    var slipRow = sheet.getLastRow();
    generateSlipKanak(slipRow);

    return { success: true, bil: nextBil };

  } catch (err) {
    Logger.log('registerKanak error: ' + err.message);
    return { success: false, message: 'Ralat semasa mendaftar: ' + err.message };
  }
}

// ============================================================
// 3. registerDewasa
// Simpan pendaftaran murid dewasa ke tab KelasDewasa!
// Input:  { nama, telefon, email, alamat, tahap, guru }
// Output: { success, id } atau { success: false, message }
// ============================================================
function registerDewasa(params) {
  try {
    ['nama','telefon','email','alamat','tahap','guru'].forEach(function(f) {
      if (params[f]) params[f] = sanitizeInput(params[f]);
    });
    var required = ['nama','telefon','email','alamat','tahap'];
    for (var r = 0; r < required.length; r++) {
      if (!params[required[r]] || !params[required[r]].toString().trim()) {
        return { success: false, message: 'Medan "' + required[r] + '" diperlukan.' };
      }
    }

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(TAB.DEWASA);
    if (!sheet) return { success: false, message: 'Tab KelasDewasa tidak dijumpai.' };

    var newRow = new Array(8).fill('');
    newRow[COL_DEWASA.NAMA]    = params.nama.trim();
    newRow[COL_DEWASA.TELEFON] = params.telefon.trim();
    newRow[COL_DEWASA.EMAIL]   = params.email.trim();
    newRow[COL_DEWASA.ALAMAT]  = params.alamat.trim();
    newRow[COL_DEWASA.TAHAP]   = params.tahap.trim();
    newRow[COL_DEWASA.GURU]    = (params.guru || '').trim();
    // COL_DEWASA.SLIP & DOKUMEN dikosongkan buat masa ini

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    // Jana ID selepas appendRow supaya nombor baris adalah tepat
    var actualRow = sheet.getLastRow();
    var muridId = 'D' + Utilities.formatDate(new Date(), 'Asia/Kuala_Lumpur', 'yyyyMMdd') + '-' + actualRow;

    Logger.log('registerDewasa berjaya: ' + params.nama + ' (' + muridId + ')');
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
// Parameter: rowNum = nombor baris dalam tab PendaftaranBaru!
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
    var namaAnak = rowData[COL_KANAK.NAMA_ANAK] || 'Murid';
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
      '{{NAMA_ANAK}}':    rowData[COL_KANAK.NAMA_ANAK]  || '',
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
// tab PendaftaranBaru! (melalui Google Form atau appendRow)
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
    'SLIP_FOLDER_ID':   'GANTI_DENGAN_OUTPUT_FOLDER_ID'
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
// HELPER: Sanitasi input — buang tag HTML & trim
// ============================================================
function sanitizeInput(str) {
  return (str || '').toString().replace(/<[^>]*>/g, '').trim();
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
      kanak = kData.map(function(r) {
        return {
          bil:      r[COL_KANAK.BIL],
          namaAnak: r[COL_KANAK.NAMA_ANAK],
          namaIbu:  r[COL_KANAK.NAMA_IBU],
          telefon:  r[COL_KANAK.TELEFON],
          tahap:    r[COL_KANAK.TAHAP],
          pakej:    r[COL_KANAK.PAKEJ]
        };
      });
    }

    var dewasa = [];
    if (dewasaSheet && dewasaSheet.getLastRow() > 1) {
      var dData = dewasaSheet.getRange(2, 1, dewasaSheet.getLastRow() - 1, dewasaSheet.getLastColumn()).getValues();
      dewasa = dData.map(function(r) {
        return {
          nama:    r[COL_DEWASA.NAMA],
          telefon: r[COL_DEWASA.TELEFON],
          email:   r[COL_DEWASA.EMAIL],
          tahap:   r[COL_DEWASA.TAHAP],
          guru:    r[COL_DEWASA.GURU]
        };
      });
    }

    return { success: true, kanak: kanak, dewasa: dewasa };
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
  if (c.startsWith('+60')) return '60' + c.substring(3);
  if (c.startsWith('0'))   return '60' + c.substring(1);
  if (c.startsWith('60'))  return c;
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
      method:           'post',
      headers:          { 'Authorization': token },
      payload:          { target: normalizePhoneForWA(noTelefon), message: mesej },
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
      var nama = (kanakData[k][COL_KANAK.NAMA_ANAK] || '').toString().trim().toLowerCase();
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
// TEST FUNCTIONS (jalankan dari editor untuk ujian)
// ============================================================

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
  // Jana slip untuk baris terakhir dalam tab PendaftaranBaru!
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(TAB.KANAK);
  var last  = sheet.getLastRow();
  Logger.log('Jana slip untuk baris: ' + last);
  generateSlipKanak(last);
}
