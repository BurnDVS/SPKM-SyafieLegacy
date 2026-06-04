# Changelog — SPKM Syafie Legacy

Semua perubahan utama sistem direkodkan di sini.

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
