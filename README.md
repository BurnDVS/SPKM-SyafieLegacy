# Sistem Pengurusan Kelas Mengaji Syafie Legacy (SPKM)

![Logo](https://i.ibb.co/93rXrkZq/LOGO-SL.png)

> **Versi:** Fasa 1 (Aktif) · Fasa 2 (Dalam Perancangan)  
> **Platform:** Google Apps Script + Google Sheets + Google Drive + PWA  
> **URL Portal (Desktop):** https://script.google.com/macros/s/AKfycbwV18AAJg37TYv-9UY0jahPOR7KEb0h2m8nonleoErrpvwMV3JdvG8eFkcEeKgrvAp1/exec  
> **URL Portal (Mobile PWA):** https://shafielegacy.github.io/SPKM  
> **Spreadsheet ID:** `1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU`

---

## Ringkasan Sistem

SPKM ialah sebuah **sistem pengurusan kelas mengaji berasaskan web** yang dibina di atas Google Workspace. Ia menggabungkan portal web (portal.html), backend automatik (Code.js / Apps Script), dan pangkalan data (Google Sheets) untuk mengendalikan pendaftaran murid, rekod kehadiran, penjanaan slip, dan pengurusan yuran.

---

## Struktur Fail Projek

```
SPKM/
├── Code.js           → Backend GAS (fungsi login, daftar, kehadiran, yuran)
├── portal.html       → Muka depan web untuk GAS (desktop)
├── index.html        → Salinan portal.html untuk GitHub Pages (mobile PWA)
├── manifest.json     → PWA manifest (icon, nama, tema)
├── sw.js             → Service Worker (cache, offline support)
├── appsscript.json   → Konfigurasi GAS (timezone, runtime)
├── .clasp.json       → Konfigurasi clasp (push ke GAS)
├── SPKM.bat          → Utiliti deployment (Windows)
└── README.md         → Dokumentasi ini
```

---

## Repo & Deployment

| Perkara | URL / Info |
|---|---|
| **Repo Utama** | https://github.com/BurnDVS/SPKM-SyafieLegacy |
| **Repo GitHub Pages** | https://github.com/shafielegacy/SPKM |
| **Live GAS (Desktop)** | https://script.google.com/macros/s/AKfycbwV18AAJg37TYv-9UY0jahPOR7KEb0h2m8nonleoErrpvwMV3JdvG8eFkcEeKgrvAp1/exec |
| **Live PWA (Mobile)** | https://shafielegacy.github.io/SPKM |
| **Deploy GAS** | `clasp push --force` → GAS Manage Deployments → New version |
| **Deploy Mobile** | `git push pages main` (remote `pages` → shafielegacy/SPKM) |

---

## Peranan & Akses

| Peranan | Akses | Cara Masuk |
|---|---|---|
| **Guru / Admin** | Dashboard penuh | Email + No. WhatsApp |
| **Ibu Bapa / Wali** | Portal daftar sahaja | Tanpa login |
| **Murid Dewasa** | Portal daftar sahaja | Tanpa login |

---

## Database — Tab Google Sheets

| Tab | Kegunaan | Kolum Utama |
|---|---|---|
| `Maklumat Guru` | Data login guru | Timestamp, Email, Nama, IC, Telefon, Alamat, Role, Jawatan, GambarURL |
| `PendaftaranBaru!` | Murid kanak-kanak | Bil, Timestamp, Nama Ibu, Telefon, Nama Anak, MYKID, Email, Alamat, Tahap, Pakej, Kaedah, Slip ID, Slip URL, Status |
| `KelasDewasa!` | Murid dewasa | Bil, Timestamp, Email, Nama, Telefon, MYKAD, Pakej, Kaedah, Alamat, Tahap, Guru, Slip ID, Slip URL, Status |
| `Kehadiran` | Rekod hadir/tidak | Tarikh, Nama Guru, Nama Murid, Status, Kaedah, Masa Mula, Masa Tamat |
| `Yuran [Bulan]` | Bayaran bulanan | Tab berasingan per bulan (cth: JAN2026, FEB2026) |
| `NAMA MURID` | Senarai murid aktif | Nama, Tarikh Daftar (untuk cross-check yuran) |

---

## Tema & Design

```css
--green:       #0A1F44   /* Navy gelap — background utama */
--green-mid:   #1A3A6B   /* Navy sederhana */
--green-light: #E8EEF8   /* Navy cerah — background panel */
--gold:        #FFD700   /* Emas — aksen utama */
--gold-light:  #FFF8DC   /* Emas cerah */
--gold-dark:   #B8960C   /* Emas gelap */
--cream:       #F8F8F8   /* Krim — background body */

Font Heading : Lora (Google Fonts)
Font Body    : DM Sans (Google Fonts)
Mobile CSS   : @media (max-width: 1024px) SAHAJA
```

---

## Status Semasa — Selesai ✅

### Portal & UI
- ✅ **Login Guru/Admin** — email + nombor telefon, password mask bintang, idle timeout
- ✅ **Header ornamental** — Navy + Gold + logo bulat
- ✅ **Nav bar desktop** — tab Utama, Daftar, Kehadiran, Murid, Guru, Yuran, eBayar, eSemak
- ✅ **Mobile nav** — bottom nav bar, mobile home cards, login button
- ✅ **Dashboard stats** — jumlah murid kanak-kanak & dewasa
- ✅ **Idle timer** — auto logout selepas tempoh tidak aktif

### Pendaftaran
- ✅ **Daftar Murid Kanak-kanak** — form 3 langkah, OTP email verification
- ✅ **Daftar Murid Dewasa** — form satu halaman, OTP email verification
- ✅ **Auto-generate Bil & Timestamp**
- ✅ **Autocrat generate slip** → isi kolum Merged Doc ID & URL
- ✅ **Hantar slip ke email ibu bapa**

### Kehadiran
- ✅ **Rekod kehadiran** — guru pilih murid (checklist), simpan per sesi
- ✅ **Statistik kehadiran** — % per murid, per guru, per bulan
- ✅ **Rekod kehadiran hari ini** — papar dalam dashboard
- ✅ **getMuridByGuru** — guru hanya nampak murid sendiri

### Senarai Murid & Guru
- ✅ **Senarai Murid** — kanak-kanak & dewasa, filter, status AKTIF/TIDAK AKTIF
- ✅ **Kemaskini status murid** — toggle aktif/tidak aktif
- ✅ **Senarai Guru** — 7 kolum, gambar thumbnail, badge jawatan
- ✅ **Modal Kemaskini Guru** — upload gambar passport ke Drive
- ✅ **Carta Organisasi desktop** — Pengasas → AJK → Guru

### Yuran
- ✅ **eBayar** — paparan status bayaran per bulan (2024–2026)
- ✅ **eSemak Yuran** — carian nama, senarai belum bayar cross-check NAMA MURID
- ✅ **recordCash** — rekod bayaran tunai oleh admin
- ✅ **getYuranStats** — statistik per bulan

### PWA Mobile
- ✅ **manifest.json** — nama, icon, tema Navy, start_url
- ✅ **sw.js** — service worker, cache shell, offline banner
- ✅ **_isGAS detection** — `hostname.endsWith('google.com')` → guna `google.script.run`, else `fetch()`
- ✅ **GitHub Pages live** — https://shafielegacy.github.io/SPKM
- ✅ **Add to Home Screen** — splash screen Navy + Gold + logo Syafie Legacy
- ✅ **Zero impact desktop** — GAS deployment langsung tidak terjejas

### Backend (Code.js)
- ✅ **doPost** — entry point mobile/fetch
- ✅ **doAction** — entry point desktop/google.script.run
- ✅ **Token auth** — JWT-like token untuk sesi guru
- ✅ **OTP system** — sendOTPKanak, sendOTPDewasa, confirmRegister
- ✅ **syncForms** — sync nama murid ke semua Google Forms

---

## Modul Fasa 2 — Dalam Perancangan 🔧

| Modul | Status | Keutamaan |
|---|---|---|
| **Login Parent (eBayar & eSemak)** | Planned | Tinggi |
| **Login Guru (eBayar & eSemak)** | Planned | Tinggi |
| **Sijil Khatam** | Planned | Sederhana |
| **Laporan Tahunan** | Planned | Sederhana |
| **Notifikasi WhatsApp** | Planned | Tinggi |
| **Bayaran Online (Billplz/ToyyibPay)** | Planned | Tinggi |
| **Pecah Code.js** → multi-file | Planned | Sederhana |

---

## Roadmap Lengkap

| Modul | Keterangan | Keutamaan |
|---|---|---|
| **Login Parent** | eBayar & eSemak require login parent | Tinggi |
| **Leaderboard Hafazan** | Papan ranking murid hafaz surah | Rendah |
| **Log Buku Iqra** | Rekod muka surat / surah sesesi kelas | Sederhana |
| **Jadual Kelas** | Google Calendar terintegrasi | Sederhana |
| **Notifikasi WhatsApp** | WA Business API untuk resit & peringatan | Tinggi |
| **Multi-Guru Dashboard** | Setiap guru lihat murid sendiri sahaja | Sederhana |
| **Bayaran Online** | Integrasi Billplz / ToyyibPay | Tinggi |
| **Gamifikasi** | Lencana kehadiran penuh, streak kelas | Rendah |

---

## Aliran Keseluruhan Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    LAPISAN PENGGUNA                         │
│                                                             │
│  [Guru/Admin]        [Ibu Bapa]         [Parent/Murid]     │
│  Login portal      Daftar murid        eSemak / eBayar     │
│  Desktop/Mobile    Tanpa login         (Login Fasa 2)      │
└────────┬──────────────┬──────────────────┬──────────────────┘
         │              │                  │
         ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│            BACKEND — Google Apps Script (Code.js)           │
│                                                             │
│  loginGuru()    registerKanak()    registerDewasa()         │
│  simpanKehadiran()   getYuranStats()   recordCash()         │
│  sendOTP()   confirmRegister()   getMuridByGuru()           │
└────────┬──────────────┬──────────────────┬──────────────────┘
         │              │                  │
         ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                DATABASE — Google Sheets                     │
│                                                             │
│  Maklumat Guru   PendaftaranBaru!   KelasDewasa!            │
│  Kehadiran       Yuran [Bulan]      NAMA MURID              │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    [Google Drive/Docs]           [Looker Studio]
    Jana slip PDF                  Dashboard laporan
    → Email ibu bapa               Statistik kehadiran
```

---

## Teknologi & Dependensi

| Komponen | Teknologi | Catatan |
|---|---|---|
| Frontend | HTML5 + CSS + Vanilla JS | portal.html / index.html |
| Backend | Google Apps Script (V8) | Code.js — 2000+ baris |
| Database | Google Sheets | 6+ tab |
| PWA | manifest.json + sw.js | Hosted di GitHub Pages |
| Mobile Hosting | GitHub Pages (shafielegacy/SPKM) | Free, public repo |
| Penjanaan Slip | Google Docs + DriveApp | Template kena disetup |
| Penghantaran Email | MailApp (GAS built-in) | Limit 100 emel/hari |
| Dashboard | Looker Studio | Sambung terus ke Sheets |
| Version Control | Git + GitHub + clasp | SPKM.bat untuk deploy |
| Timezone | Asia/Kuala_Lumpur | appsscript.json |

---

## Setup Awal (Senarai Semak)

- [ ] Deploy Code.js sebagai Web App → Execute as: Me, Who has access: Anyone
- [ ] Salin URL deploy → update `GAS_URL` dalam `portal.html` / `index.html`
- [ ] Buat template slip dalam Google Docs → salin Doc ID
- [ ] Buat folder output dalam Google Drive → salin Folder ID
- [ ] Jalankan `setScriptProperties()` dalam editor GAS
- [ ] Jalankan `createTriggers()` sekali untuk pasang trigger automatik
- [ ] Sambung Sheets ke Looker Studio untuk dashboard
- [ ] Push `index.html` + `manifest.json` + `sw.js` ke `shafielegacy/SPKM`
- [ ] Enable GitHub Pages → main / root

---

## Deploy Workflow

```bash
# Deploy ke GAS sahaja
clasp push --force

# Deploy ke GitHub (BurnDVS repo)
git add . && git commit -m "message" && git push

# Deploy ke GitHub Pages (shafielegacy/SPKM)
git push pages main

# Deploy semua sekaligus (guna SPKM.bat → Pilihan 6)
```

---

## Nota untuk AJK

1. **Data murid** disimpan dalam Google Sheets — boleh diakses terus oleh mana-mana AJK yang diberi akses
2. **Slip pendaftaran** dijana automatik dan dihantar ke email ibu bapa — tiada kerja manual
3. **Kehadiran** boleh direkod dari mana-mana peranti melalui portal
4. **Kata laluan guru** = No. WhatsApp — mudah diingat, boleh ditukar bila-bila masa dalam Sheets
5. **Mobile PWA** — boleh install kat home screen phone, nampak macam app native
6. **Desktop** guna GAS URL, **mobile** guna GitHub Pages URL — dua-dua sync data yang sama

---

*Sistem ini dibangunkan dengan Google Apps Script dan tidak memerlukan sebarang hosting berbayar. Semua data tersimpan dalam Google Drive.*
