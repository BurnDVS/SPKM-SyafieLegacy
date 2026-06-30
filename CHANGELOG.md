# Changelog — SPKM Syafie Legacy

Semua perubahan utama sistem direkodkan di sini.

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
