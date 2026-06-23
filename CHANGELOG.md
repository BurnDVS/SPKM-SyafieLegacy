# Changelog — SPKM Syafie Legacy

Semua perubahan utama sistem direkodkan di sini.

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
