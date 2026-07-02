# Changelog — SPKM Syafie Legacy

Semua perubahan utama sistem direkodkan di sini.

---

## [30 Jun 2026] — Queue #9 — eBayar Master / Yuran V2 shadow foundation

### Added
- Backend-only V2 shadow/read model foundation in `Code.js` for future canonical eBayar master data.
- New V2 helper/action functions:
  - `normalizeYuranNameV2_`
  - `makeBulanKeyV2_`
  - `getEbayarMasterSpreadsheet_`
  - `ensureEbayarMasterSchemaV2`
  - `listEbayarYears`
  - `getMonthlyPaymentSummaryV2`
  - `getYuranStatsV2`
  - `getYuranParentV2`
  - `compareYuranLegacyVsV2`
- Revised `Payments` schema for one canonical payment table:
  `PAYMENT_ID`, `PAYMENT_GROUP_ID`, `TIMESTAMP`, `TAHUN`, `BULAN`, `BULAN_KEY`, `NAMA_MURID_RAW`, `NAMA_MURID_NORM`, `STUDENT_ID`, `NO_MYKID_MYKAD`, `STUDENT_TYPE`, `JUMLAH`, `AMOUNT_TOTAL`, `AMOUNT_ALLOCATED`, `STATUS`, `KAEDAH`, `RESIT_URL`, `SOURCE_YEAR`, `SOURCE_SHEET`, `SOURCE_ROW`, `SOURCE_ROW_HASH`, `MATCH_STATUS`, `MATCH_CONFIDENCE`, `NOTE`, `CREATED_AT`, `UPDATED_AT`.

### Behavior
- V2 is shadow-only. Live SPKM remains on legacy yuran/eBayar flow.
- No UI switch was made. `index.html` and `portal.html` were not modified.
- Existing live functions remain legacy: `getYuranStats`, `getYuranParent`, `getEbayarStats`, `recordCash`, sync functions, and `onEbayarSubmit`.
- `PAYMENT_GROUP_ID` represents one original source row/resit/payment; `PAYMENT_ID` represents one student-level row. Multi-student source rows should be split later while preserving the same group ID.
- If allocation is unclear, preserve original value in `AMOUNT_TOTAL` and leave `AMOUNT_ALLOCATED` blank/null with `NOTE`.

### Staging setup update — 1 Jul 2026
- Created new Google Sheet: `SPKM eBayar Master`.
- Script Property `EBAYAR_MASTER_SS_ID` set successfully.
- `clasp push` completed successfully using `shafielegacykelasmengaji@gmail.com`; GAS editor source now includes V2 shadow helpers.
- `ensureEbayarMasterSchemaV2` ran successfully.
- Staging spreadsheet tabs initialized: `Payments`, `Config`, `ImportLog`, `MonthlySummary`, `YearlySummary`, `StudentsSnapshot`.
- `Payments` row 1 has full schema headers from `PAYMENT_ID` through `UPDATED_AT`.
- No data import/copy has been done yet.

### Source audit + import dry-run — 1 Jul 2026
- Source audit completed. Confirmed raw source tabs:
  - 2025 source group from Main DB: `Yuran Mei`, `Yuran Jun`, `Yuran Julai`, `Yuran Ogos`, `Yuran September`, `Yuran Oktober`, `Yuran November`, `Yuran Disember`. Note: these tabs contain actual `TAHUN` 2024 data.
  - 2026 source group from `YURAN_SS_ID`: `JAN2026`, `FEB2026`, `MAC2026`, `APRIL2026`, `MEI2026`, `JUN2026`, `JULAI2026`, `OGOS2026`, `SEPT2026`, `OKT2026`, `NOV2026`, `DIS2026`.
- Column mapping confirmed: `timestamp`, `email`, `nama`, `bulan`, `tahun`, `resit`, `jumlah`, `tarikhBayaran`, `noResit`, `status`.
- Dry-run import helpers added and tested. No real import to `Payments` yet.
- 2024 legacy dry-run: 417 source payment rows -> 787 generated payment rows; 248 multi-name rows; 13 skipped rows; no duplicate `SOURCE_ROW_HASH`, `PAYMENT_GROUP_ID`, or `PAYMENT_ID`.
- 2026 dry-run: 447 source payment rows -> 768 generated payment rows; 212 multi-name rows; 427 skipped rows; no duplicate `SOURCE_ROW_HASH`, `PAYMENT_GROUP_ID`, or `PAYMENT_ID`.
- Total dry-run preview: 864 source payment rows -> 1555 generated payment rows.
- Duplicate safety confirmed: multi-name payments intentionally share `SOURCE_ROW_HASH` and `PAYMENT_GROUP_ID`, while child rows have unique `PAYMENT_ID`.
- Next planned step: real import to staging `Payments` only, starting with a small batch/limit and idempotent by `SOURCE_ROW_HASH`. Do not import yet.

### Staging small-batch import — 1 Jul 2026
- Added staging-only small batch import helper for `SPKM eBayar Master > Payments`.
- Imported first 5 source payment groups from 2026 `JAN2026`.
- First import result: `sourceYear=2026`, `limitSourceRows=5`, `sourceGroupsSelected=5`, `draftRows=7`, `existingHashCount=0`, `rowsToAppend=7`, `appendedRows=7`.
- `Payments` tab now has 7 imported child payment rows below the header.
- `testExistingPaymentSourceHashesV2` confirmed `lastRow=8`, `sourceRowHashColumn=21`, and 7 row-level hash entries.
- Idempotent second run confirmed: `existingHashCount=5` unique source hashes, `rowsToAppend=0`, `skippedDuplicateRows=7`, `appendedRows=0`.
- No duplicate rows were appended on the second run.
- Live SPKM remains legacy; no GAS web app deployment, no `pages` push, and no frontend switch.

### Staging next-batch import — 1 Jul 2026
- Added next-batch staging import support with `skipExistingGroupsFirst:true`, so repeated imports select the next unimported source groups instead of repeatedly selecting the first groups.
- Preview for next 2026 batch: `sourceYear=2026`, `limitSourceRows=10`, `skipExistingGroupsFirst=true`, `existingHashCount=5`, `sourceGroupsSelected=10`, `draftRows=21`, `rowsToAppend=21`, `appendedRows=0`.
- Actual next batch import: `existingHashCount=5`, `sourceGroupsSelected=10`, `draftRows=21`, `rowsToAppend=21`, `appendedRows=21`.
- Diagnostic after second batch: `lastRow=29`, `sourceRowHashColumn=21`, `existingHashCount=28` row entries.
- Third staging import batch completed with `skipExistingGroupsFirst:true`: `existingHashCount=15`, `sourceGroupsSelected=10`, `draftRows=16`, `rowsToAppend=16`, `appendedRows=16`.
- Diagnostic after third batch: `lastRow=45`, `sourceRowHashColumn=21`, `existingHashCount=44` row entries.
- Total staging imported so far: Batch 1 = 5 source groups -> 7 child rows; Batch 2 = 10 source groups -> 21 child rows; Batch 3 = 10 source groups -> 16 child rows; total = 25 source groups -> 44 child payment rows.
- Live SPKM remains legacy; no GAS web app deployment, no `pages` push, and no frontend switch.

### Git / Deploy
- Commit pushed to `origin`: `298768c` — `feat: add ebayar master v2 shadow helpers`.
- Earlier hygiene commit: `88d8b26` — `chore: ignore local workspace files`.
- `.gitignore` now ignores `.vs/` and `before-ebayar-master-v2.patch`.
- No GAS production deployment was done.
- No `git push pages main` was done.
- No live web app update was done.

---

## [30 Jun 2026] — Admin: Pertukaran Guru (Permanent Reassign Murid)

### Added
- **`ensureLogPertukaranGuruSheet(ss)`** — auto-cipta tab `LogPertukaranGuru` dalam Main DB (`SPREADSHEET_ID`) jika belum wujud. 7 kolum: `Timestamp | Admin | Guru Lama | Guru Baru | Nama Murid | Jenis Murid | Bil`. Row 1 frozen.
- **`getMuridByGuruUntukTukar(params)`** — return senarai murid TETAP guru (`COL_KANAK.GURU` / `COL_DEWASA.GURU` sahaja, bukan `GURU_BACKUP`), filter `STATUS=AKTIF`, sort A-Z. Shape: `[{bil, nama, jenis:'KANAK'|'DEWASA'}]`.
- **`tukarGuruMurid(params)`** — permanent reassign: loop `senarai[]`, match row by `Bil` (`String` comparison untuk handle number/string), safety check `GURU semasa === guruLama` sebelum update, tulis `guruBaru` ke kolum GURU, log setiap baris ke `LogPertukaranGuru`, panggil `simpanNotifikasi`. Return `{success, jumlahDipindah, ralat:[]}` — partial transfer disokong (item gagal masuk `ralat`, item lain diteruskan).
- **Panel "Pertukaran Guru"** dalam panel Guru — admin-only (hidden via `updateNav()` untuk guru biasa):
  - Dropdown Guru Asal → memuatkan senarai murid TETAP → Dropdown Guru Baharu (auto-exclude Guru Asal) → checklist murid dengan label `(Kanak-kanak)` / `(Dewasa)` → modal konfirmasi "tidak boleh diundur" → submit.
  - Butang Pindah disabled sehingga Guru Baharu dipilih DAN sekurang-kurangnya 1 murid ditanda.
  - `notifAdd('pertukaran', ...)` dipanggil selepas berjaya — ada dalam portal.html dan index.html.
  - Selepas berjaya: form di-reset, success message kekal nampak.

### Behavior
- Partial transfer: admin boleh untick murid tertentu — hanya murid yang ditanda sahaja dipindah.
- Safety check backend: jika GURU murid sudah berubah sejak checklist dimuatkan (race condition), row tersebut masuk `ralat[]` dan baris lain diteruskan.
- Berbeza dari Guru Backup/Relief: ini kemaskini kolum `GURU` secara kekal — bukan tambah ke `GURU_BACKUP`.

### Verified
- Tested live: pertukaran beberapa murid SHAFIE → ZARUL berjaya. Kolum GURU tukar betul dalam PendaftaranBaru dan KelasDewasa. Tab `LogPertukaranGuru` tercipta automatik dengan header betul dan rekod audit lengkap. Data test dipulihkan selepas verifikasi.

### Deploy
- Code.js + portal.html: copy-paste manual ke GAS Editor → New version → Deploy (clasp tidak digunakan, lihat entry "Deployment Incident").
- index.html: push via `git push pages main`.

---

## [30 Jun 2026] — Sokongan Guru Backup / Relief dalam Panel Kehadiran

### Added
- **`cariGuruTetapMurid(namaMurid, kanakData, dewasaData)`** — helper baru, cari guru tetap bagi murid tertentu dari PendaftaranBaru atau KelasDewasa (data pre-loaded untuk performance).
- **`testGuruBackup()`** — test function untuk verify guru backup dapat senarai murid bukan kosong dengan peranan BACKUP.
- Kolum baru di tab kehadiran baharu: **'Guru Tetap' (H)** dan **'Guru Hadir' (I)** — untuk bezakan rekod biasa vs relief.
- Tab kehadiran sedia ada (7 kolum) akan auto-upgrade header H/I bila ada rekod ditulis; row lama tidak disentuh/backfill.

### Changed
- **`getMuridByGuru`** — kini check `COL_KANAK.GURU` DAN `COL_KANAK.GURU_BACKUP` untuk PendaftaranBaru.
  - Return shape berubah: `{ success, murid: [{nama, peranan}, ...] }` (bukan array string).
  - `peranan`: `'TETAP'` jika match kolum GURU, `'BACKUP'` jika match GURU_BACKUP sahaja. TETAP menang jika ada conflict.
  - KelasDewasa kekal check GURU sahaja (tiada konsep backup untuk kelas dewasa).
- **`simpanKehadiran`** — kini group murid ikut guru tetap masing-masing, tulis ke tab guru tetap (bukan tab guru yang login).
  - Setiap row tulis 9 nilai termasuk `guruTetapNama` (H) dan `namaGuru` yang login (I).
  - Kolum C "Nama Guru" kekal nama guru yang sebenarnya rekod (untuk backward compat `getKehadiranStats`/`getKehadiranRekod`).
  - Murid yang guru tetap tidak jumpa → fallback ke tab namaGuru, warning di Logger.
- **`getKehadiranStats`** — cascade fix: ekstrak `.nama` dari `enrol.murid` (kini array object) sebelum bina `senarai`. Tiada perubahan logik atau output.
- **`renderGuruMuridChecklist`** (portal.html + index.html) — terima `[{nama, peranan}]`, papar badge kuning **"Ganti"** untuk murid dengan peranan BACKUP. Checkbox `value` dan payload submit kekal nama string sahaja.

### Behavior
- Guru backup login → checklist panel Kehadiran papar murid mereka dengan badge "Ganti".
- Guru backup submit kehadiran → rekod masuk tab guru tetap murid tersebut, bukan tab guru backup.
- Guru tetap semak stats mereka → sesi yang direkodkan oleh backup turut dikira (rekod sudah dalam tab mereka).
- Stats panel untuk guru backup: `totalSesi: 0` (out of scope — rekod dalam tab guru tetap, bukan tab backup). Akan ditangani dalam task berasingan.

### Verified
- `testGuruBackup()` dijalankan live: ZARUL SUZAIMI BIN ZAILI → 27 murid, semua `peranan: 'BACKUP'` — betul.
- Submit 3 murid sebagai ZARUL → rekod masuk tab **MUHAMMAD SHAFIE BIN BAHARI** dalam KEHADIRAN_SS_ID.
- Spreadsheet disahkan: kolum C = `ZARUL SUZAIMI BIN ZAILI` (Guru Hadir), kolum H = `MUHAMMAD SHAFIE BIN BAHARI` (Guru Tetap) — correct.
- `testKehadiranStats()` untuk SHAFIE: output kekal betul, `totalMurid` dan `unmatched` tidak terjejas oleh cascade fix.

### Deploy
- GAS deployed manual — `Code.js` + `portal.html` copy-paste ke GAS Editor → New version → Deploy (clasp tidak digunakan, lihat entry "Deployment Incident" bawah).
- `index.html` berjaya push via `git push pages main` (shafielegacy/SPKM) — PWA live update.
- `git push origin main` (BurnDVS/SPKM-SyafieLegacy) GAGAL — lihat entry "Deployment Incident" untuk detail dan status.

---

## [30 Jun 2026] — Deployment Incident: clasp + Node v24, git origin 403

### clasp push gagal — Node v24 / clasp 3.3.0
- `clasp push` dan `clasp login --no-localhost` gagal dengan OAuth error `Premature close`.
- Punca: kemungkinan incompatibility Node v24.17.0 dengan clasp 3.3.0 OAuth flow — belum disahkan.
- **Fallback yang digunakan:** Copy-paste manual `Code.js` dan `portal.html` terus ke GAS Editor → Save → Deploy → Manage deployments → Edit → New version → Deploy.
- `index.html` tidak melalui clasp, berjaya di-push normal via git.

### git push origin gagal — 403 credential mismatch
- `git push origin main` (BurnDVS/SPKM-SyafieLegacy) return 403: `Permission to BurnDVS/SPKM-SyafieLegacy.git denied to shafielegacy`.
- Punca: credential git Windows tersimpan adalah akaun `shafielegacy` (bukan `BurnDVS`) — kemungkinan ditukar semasa push ke `pages` sebelum ni.
- `git push pages main` (shafielegacy/SPKM) berjaya — PWA live tidak terjejas.
- **Status:** `origin` (BurnDVS/SPKM-SyafieLegacy) tertinggal commit `f588c57` — perlu sync apabila credential BurnDVS tersedia.
- **Fix:** `cmdkey /delete:LegacyGeneric:target=git:https://github.com` → push semula → login sebagai BurnDVS bila diminta.

---

## [30 Jun 2026] — Duplicate registration guard + Yuran name normalization

### Fixed
- `getYuranStats`: Nama dari rekod bayaran (`sudahBayarSet`) dan master list (`eligibleSet2`) kini guna normalization sama:
  `replace(/\s+/g, ' ').trim().toUpperCase()`.
- Ini elak mismatch bila nama ada double spaces atau spacing pelik antara rekod bayaran dan master list.

### Added
- Pendaftaran kanak-kanak kini block duplicate `NO_MYKID` di semua laluan backend:
  - `sendOTPKanak` — semak sebelum OTP dihantar
  - `confirmRegisterKanak` — semak sebelum `appendRow`
  - `registerKanak` — laluan lama/backend turut disekat
- Pendaftaran dewasa kini block duplicate `NO_MYKAD` di semua laluan backend:
  - `sendOTPDewasa` — semak sebelum OTP dihantar
  - `confirmRegisterDewasa` — semak sebelum `appendRow`
  - `registerDewasa` — laluan lama/backend turut disekat
- Helper baru:
  - `normalizeMykid_()`, `findExistingKanakByMykid_()`, `duplicateKanakMessage_()`
  - `normalizeMykad_()`, `findExistingDewasaByMykad_()`, `duplicateDewasaMessage_()`

### Behavior
- Format ID seperti `120101-10-1234`, `120101101234`, atau ada spacing dikira sebagai ID yang sama.
- Jika rekod sedia ada status `TIDAK AKTIF`, sistem tidak benarkan daftar baru; mesej minta hubungi admin untuk aktifkan semula.
- Duplicate disekat lebih awal sebelum parent terima OTP.

### Investigation notes
- Dashboard Yuran dan spreadsheet sempat berbeza kerana beberapa murid dalam `KelasDewasa` berstatus `TIDAK AKTIF`; dashboard/form memang filter `STATUS=AKTIF`.
- Kes `ZAINOR BIN AB HAMID` diabaikan selepas disahkan tiada dalam senarai murid dewasa berdaftar.

### Deploy
- `clasp login`/OAuth sempat gagal dengan `Premature close`, jadi `Code.js` disalin manual ke GAS editor.
- GAS dideploy manual melalui **Deploy → Manage deployments → Edit → New version → Deploy**.
- Commit `fa76f73` — `fix: prevent duplicate registration by mykid and mykad`
- Pushed ke `origin` (BurnDVS/SPKM-SyafieLegacy) dan `pages` (shafielegacy/SPKM)

---

## [28 Jun 2026] — Fix kiraan eBayar, block duplicate, bersih duplicate data

### Fixed
- `getEbayarStats`: Kira dari live data (PendaftaranBaru + KelasDewasa + CalculationXxx col D) — bukan formula spreadsheet yang boleh stale.
- `getYuranStats`: Master list murid kini baca terus dari PendaftaranBaru + KelasDewasa — bukan tab `NAMA MURID` dalam yuran spreadsheet.
- Kedua-dua panel (eBayar grid dan Dashboard Yuran) kini konsisten — guna sumber kebenaran yang sama.

### Added
- `confirmRegisterKanak`: Block pendaftaran duplikat — semak NO_MYKID sebelum appendRow. Return error jika MYKID sudah wujud.
- `confirmRegisterDewasa`: Block pendaftaran duplikat — semak NO_MYKAD sebelum appendRow. Return error jika MYKAD sudah wujud.

### Data cleanup
- Buang semua duplicate entries dalam PendaftaranBaru dan KelasDewasa.
- PendaftaranBaru: 130 murid (bersih, 0 duplicate MYKID)
- KelasDewasa: 42 murid (bersih, 0 duplicate)
- Total aktif: 172 murid

### Commits
- `95efaf4` — fix: getEbayarStats kira dari live data
- `8b4dd16` — fix: getYuranStats guna live data dari PendaftaranBaru+KelasDewasa
- `73bfaa7` — feat: block pendaftaran duplikat berdasarkan no. MYKID/MYKAD

---

## [23 Jun 2026]
### Fixed
- FCM private key format — fixFCMPrivateKey() rebuild PEM format betul 
  (BEGIN/END header, 64-char chunks). getFCMAccessToken() kini berjaya.
- Push notification PC berfungsi sepenuhnya.
- Session persist selepas refresh — _spkm_st = localStorage semua device,
  tryAutoLogin() berfungsi desktop+mobile, renewSession() GAS extend 30 minit,
  auto-renew timer setiap 20 minit.
- Header UI fix — headerPreLogin/headerPostLogin dikemaskini dalam tryAutoLogin().
- SW cache bump spkm-v11 → spkm-v12.

### Added
- renewSession() dalam Code.js — validate dan extend GAS session token.
- onKhatamSubmit() trigger — notification bila parent submit Borang Khatam 
  Iqra' atau Khatam Quran (spreadsheet 1jGp9U6lYRBvAVPSHhqSLv2WL5MHxdmKP5f5AnTHC8xU).
- createKhatamTriggers() — pasang onFormSubmit trigger untuk spreadsheet Khatam.

---

## eBayar Sync Fix — 2026-06-20

### Masalah
1. `syncFormMinusBayar()` baca senarai "sudah bayar" dari tab `NAMA MURID` — sebenarnya 
   tab tu senarai pendaftaran, bukan rekod bayaran. Akibatnya checkbox Google Form 
   eBayar tidak betul-betul menyingkir nama yang dah bayar.
2. `syncNamaMuridToAllForms()` tiada filter langsung — semua murid AKTIF dimasukkan ke 
   SEMUA 12 Google Form, tanpa kira bulan dia daftar. Murid baru daftar bulan JUN pun 
   muncul dalam form JAN-MEI (sepatutnya tak relevan).
3. Setiap kali ada pendaftaran murid baru, `syncNamaMuridToAllForms()` auto dipanggil 
   dan OVERWRITE checkbox semua 12 form dengan senarai penuh — ini reset balik kerja 
   `syncFormMinusBayar()` yang dah singkir nama yang dah bayar.
4. Typo Form ID untuk FEB2026 (ada huruf 'V' berlebihan di hujung) menyebabkan ralat 
   "No item with the given ID could be found" — bug lama yang baru terdedah.

### Fix
1. `syncFormMinusBayar()` kini baca dari `CalculationXxx2026` (kolum D, index 3) guna 
   `CALC_TAB_MAP`, bukan tab `NAMA MURID`.
2. `syncNamaMuridToAllForms()` kini loop 12 bulan secara individu, dengan 2 filter:
   - Filter tarikh daftar (`parseRegMonthIdx()`) — murid hanya masuk form bulan dia 
     daftar & seterusnya
   - Filter status bayaran (`CALC_TAB_MAP`) — exclude murid yang sudah bayar untuk 
     bulan tersebut
3. Fix typo Form ID FEB2026 di 3 lokasi: `setScriptProperties()`, 
   `syncNamaMuridToAllForms()`, `syncFormMinusBayar()`.

### Verifikasi
- 12/12 Google Form eBayar berjaya sync tanpa ralat
- Checkbox "NAMA PENUH MURID" kini jauh lebih pendek & relevan (cth JAN2026: 197→57 nama)
- Test helper baru: `testSyncNamaMuridManual()`

### Git
- Commit `75d6583` — Fix syncNamaMuridToAllForms + Form ID FEB2026
- Commit `7d2ad15` — Sync local dengan GAS (test helper + setScriptProperties fix)
- Pushed ke origin (BurnDVS) dan pages (shafielegacy)

---

## syncFormMinusBayar — DEPLOYED (19 Jun 2026)

- Fix: baca senarai "sudah bayar" dari tab CalculationXxx2026 (kolum D), bukan dari tab NAMA MURID (yang sebenarnya senarai pendaftaran, bukan bayaran)
- Trigger `onEbayarSubmit` auto-jalankan fungsi ni lepas setiap form submission eBayar
- Button manual "🧹 Kemas Form (Tolak Dah Bayar)" dalam panel Yuran (admin only)
- Verified: JUN2026 — 196 aktif, 102 sudah bayar, 96 nama tinggal dalam form

---

## [Fix] — 2026-06-14 — Kehadiran Stats: getMuridByGuru & getKehadiranStats

### Masalah
Panel "Statistik Kehadiran" untuk guru menunjukkan `totalMurid` yang salah (contoh: 57/60 berbanding sebenar 71 untuk Ustaz Shafie) — dikira dari rekod kehadiran sedia ada, bukan dari enrollment sebenar.

### Fix
- **`COL_KANAK.GURU = 16`** — tambah constant baru (col Q, Nama Guru) dalam `Code.js`
- **`getMuridByGuru()`** — ditulis semula. Kini baca terus dari `PendaftaranBaru` (col Q = index 16) dan `KelasDewasa` (col R = `COL_DEWASA.GURU` = 17), filter `STATUS = AKTIF` atau kosong, dedupe, sort A-Z. Tab "Pecahan Murid Mengikut Guru Kelas" tidak lagi digunakan.
- **`getKehadiranStats()`** — terima param `namaGuru` opsyenal:
  - **Bila ada `namaGuru`**: `totalMurid` = `getMuridByGuru().length` (enrollment), `byMurid` = semua murid terdaftar dengan `jumlahHadir` dari sheet Kehadiran (0 jika tiada rekod), `totalSesi` = bilangan tarikh unik dalam sheet, `unmatched[]` = nama dalam kehadiran yang tidak match enrollment
  - **Tanpa `namaGuru`** (admin): behavior asal dikekalkan
- **Frontend** (`index.html` ~ln 5207, `portal.html` ~ln 5043): `loadKehadiranStats()` hantar `namaGuru: loggedInGuru` dalam payload bila `currentRole !== 'ADMIN'`

### Verified
Ustaz Shafie → 71 murid AKTIF, totalSesi 159, `unmatched []`

### Deploy
- GAS Version 149 (14 Jun 2026)
- Git pushed ke `origin` (BurnDVS/SPKM-SyafieLegacy) dan `pages` (shafielegacy/SPKM)
- **PENTING:** `clasp push` sahaja tidak update URL live — mesti **Deploy → Manage Deployments → Edit → New version → Deploy**

---

## [Fasa 1.4] — 2026-06-04

### Ditambah
- 🔔 Sistem Notifikasi in-app (macam TikTok/Instagram)
  - Bell icon dalam header desktop + mobile
  - Badge merah dengan bilangan notif belum dibaca
  - Panel dropdown dengan animasi slide-down
  - Bottom sheet panel untuk mobile view
  - "Tandakan semua dibaca" — badge hilang
- 🔊 Islamic Chime Sound (Web Audio API)
  - 3 nada ascending: C5 → E5 → G5
  - Decay lembut macam loceng masjid
  - Tanpa fail audio luar — 100% dalam kod
  - Auto-unlock pada first user interaction (autoplay policy)
- 📦 localStorage notification store
  - Key: `spkm_notif`
  - Max 50 notif, auto-buang yang lama
  - Persist merentasi session
- 🪝 4 Hook events:
  - Pendaftaran murid kanak-kanak berjaya
  - Pendaftaran murid dewasa berjaya
  - Kehadiran direkodkan (simpanKehadiranGuru)
  - Bayaran yuran tunai diterima (submitCashPayment)
- Berfungsi dalam `portal.html` (desktop GAS) DAN `index.html` (mobile PWA)

### Nota Teknikal
- Notif bersifat **per-browser** (localStorage) — setiap device ada notif sendiri
- Upgrade ke Sheets-based (shared notif) — KIV Fasa 2
- Zero impact ke fungsi sedia ada — hooks tambah selepas event berjaya sahaja

---

## [Fasa 1.3] — 2026

### Ditambah
- WhatsApp Blast via Fonnte API
- Tab WARemind dalam Sheets
- normalizePhoneForWA() — handle format 60x/0x/x
- Modal confirm + laporan blast WA
- notifikasiKetidakhadiran() — WA auto ke parents

---

## [Fasa 1.2] — 2026

### Ditambah
- PWA Mobile (index.html + manifest.json + sw.js)
- GitHub Pages deployment (shafielegacy/SPKM)
- CORS fix untuk fetch() dari GitHub Pages ke GAS
- Add to Home Screen support

---

## [Fasa 1.1] — 2026

### Ditambah
- eBayar — status bayaran per bulan (2024–2026)
- eSemak Yuran — carian nama, cross-check NAMA MURID
- recordCash — rekod bayaran tunai
- Senarai Guru — gambar thumbnail, badge jawatan, carta organisasi
- getMuridByGuru — guru hanya nampak murid sendiri
- Idle timeout — auto logout

---

## [Fasa 1.0] — 2026

### Pertama kali live
- Login Guru/Admin (email + telefon)
- Pendaftaran Murid Kanak-kanak (3 langkah + OTP)
- Pendaftaran Murid Dewasa (OTP)
- Rekod Kehadiran
- Autocrat generate slip pendaftaran
- Dashboard stats
- Token auth (JWT-like)
## 1 Jul 2026 — Queue #9 eBayar V2 staging import checkpoint correction

- Fourth staging import batch completed for 2026 using `skipExistingGroupsFirst:true`.
- Batch 4 result: `existingHashCount=25`, `sourceGroupsSelected=10`, `draftRows=15`, `rowsToAppend=15`, `appendedRows=15`.
- Diagnostic after batch 4: `lastRow=60`, `sourceRowHashColumn=21`, `existingHashCount=59` row entries.
- Total staging imported so far:
  - Batch 1: 5 source groups -> 7 child rows
  - Batch 2: 10 source groups -> 21 child rows
  - Batch 3: 10 source groups -> 16 child rows
  - Batch 4: 10 source groups -> 15 child rows
  - Total: 35 source groups -> 59 child payment rows
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, frontend switch, or production import was done.
## 1 Jul 2026 — Queue #9 eBayar V2 staging import batch 5

- Fifth staging import batch completed for 2026 using `skipExistingGroupsFirst:true`.
- Batch 5 result: `existingHashCount=35`, `sourceGroupsSelected=10`, `draftRows=18`, `rowsToAppend=18`, `appendedRows=18`.
- Diagnostic after batch 5: `lastRow=78`, `sourceRowHashColumn=21`, `existingHashCount=77` row entries.
- Total staging imported so far:
  - Batch 1: 5 source groups -> 7 child rows
  - Batch 2: 10 source groups -> 21 child rows
  - Batch 3: 10 source groups -> 16 child rows
  - Batch 4: 10 source groups -> 15 child rows
  - Batch 5: 10 source groups -> 18 child rows
  - Total: 45 source groups -> 77 child payment rows
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 1 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 95 source groups -> 169 child payment rows.
- Latest diagnostic: `lastRow=170`, `sourceRowHashColumn=21`, `existingHashCount=169` row entries.
- Larger 25-source-group helpers were added and used successfully: `testImportEbayarPayments2026NextBatch25PreviewV2()` and `testImportEbayarPayments2026NextBatch25V2()`.
- Staging import safety limit is now `limitSourceRows <= 25`.
- Confirmed 25-group actual batch: `existingHashCount=70`, `sourceGroupsSelected=25`, `draftRows=46`, `rowsToAppend=46`, `appendedRows=46`.
- A later 25-group preview was run only and not imported: `existingHashCount=95`, `sourceGroupsSelected=25`, `draftRows=45`, `rowsToAppend=45`, `appendedRows=0`; source continues at `FEB2026` row 33.
- Important: the `FEB2026` row 33 preview batch has not been imported yet.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 245 source groups -> 434 child payment rows.
- Latest diagnostic: `lastRow=435`, `sourceRowHashColumn=21`, `existingHashCount=434` row entries.
- Recent accelerated 25-source-group batches continued successfully after the previous checkpoint:
  - 95 -> 120 source groups: +45 child rows, diagnostic `lastRow=215`, `existingHashCount=214`
  - 120 -> 145 source groups: +44 child rows, diagnostic `lastRow=259`, `existingHashCount=258`
  - 145 -> 170 source groups: +45 child rows, diagnostic `lastRow=304`, `existingHashCount=303`
  - 170 -> 195 source groups: +44 child rows, diagnostic `lastRow=348`, `existingHashCount=347`
  - 195 -> 220 source groups: +45 child rows, diagnostic `lastRow=393`, `existingHashCount=392`
  - 220 -> 245 source groups: +42 child rows, diagnostic `lastRow=435`, `existingHashCount=434`
- Source has progressed through `FEB2026` and into `MAC2026`.
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 295 source groups -> 518 child payment rows.
- Latest diagnostic: `lastRow=519`, `sourceRowHashColumn=21`, `existingHashCount=518` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 245 -> 270 source groups: +44 child rows, diagnostic `lastRow=479`, `existingHashCount=478`
  - 270 -> 295 source groups: +40 child rows, diagnostic `lastRow=519`, `existingHashCount=518`
- Source has progressed into `MEI2026`; the latest imported batch sample starts around `MEI2026` row 15.
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 345 source groups -> 605 child payment rows.
- Latest diagnostic: `lastRow=606`, `sourceRowHashColumn=21`, `existingHashCount=605` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 295 -> 320 source groups: +45 child rows, diagnostic `lastRow=564`, `existingHashCount=563`
  - 320 -> 345 source groups: +42 child rows, diagnostic `lastRow=606`, `existingHashCount=605`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 395 source groups -> 678 child payment rows.
- Latest diagnostic: `lastRow=679`, `sourceRowHashColumn=21`, `existingHashCount=678` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 345 -> 370 source groups: +37 child rows, diagnostic `lastRow=643`, `existingHashCount=642`
  - 370 -> 395 source groups: +36 child rows, diagnostic `lastRow=679`, `existingHashCount=678`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
