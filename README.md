# Sistem Pengurusan Kelas Mengaji Syafie Legacy (SPKM)

![Logo](https://i.ibb.co/93rXrkZq/LOGO-SL.png)

> **Versi:** Fasa 1 (Aktif) · Fasa 2 (Dalam Perancangan)  
> **Platform:** Google Apps Script + Google Sheets + Google Drive + PWA  
> **URL Portal (Desktop):** https://script.google.com/macros/s/AKfycbwcUEWFT4vIp6cU8pp-8NbAe-ACXaNeK1OL0to7uhufbd4YjxqTCq7R5SPEgtvaxXuW/exec  
> **URL Portal (Mobile PWA):** https://shafielegacy.github.io/SPKM ✅ Live  
> **Spreadsheet ID:** `1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU`

---

## Ringkasan Sistem

SPKM ialah sebuah **sistem pengurusan kelas mengaji berasaskan web** yang dibina di atas Google Workspace. Ia menggabungkan portal web (portal.html), backend automatik (Code.js / Apps Script), dan pangkalan data (Google Sheets) untuk mengendalikan pendaftaran murid, rekod kehadiran, penjanaan slip, pengurusan yuran, dan blast notifikasi WhatsApp.

---

## Struktur Fail Projek

```
SPKM/
├── Code.js           → Backend GAS (fungsi login, daftar, kehadiran, yuran, WA blast)
├── portal.html       → Muka depan web untuk GAS (desktop)
├── index.html        → Salinan portal.html untuk GitHub Pages (mobile PWA)
├── manifest.json     → PWA manifest (icon, nama, tema)
├── sw.js             → Service Worker (cache, offline support)
├── .nojekyll         → Skip Jekyll processing (GitHub Pages)
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
| **Live GAS (Desktop)** | https://script.google.com/macros/s/AKfycbwcUEWFT4vIp6cU8pp-8NbAe-ACXaNeK1OL0to7uhufbd4YjxqTCq7R5SPEgtvaxXuW/exec |
| **Live PWA (Mobile)** | https://shafielegacy.github.io/SPKM |
| **Deploy GAS** | `clasp push --force` → GAS Manage Deployments → **New Web App version** |
| **Deploy Mobile** | `git push && git push pages main` |

> ⚠️ **PENTING:** Bila deploy GAS, pastikan pilih type **Web App** (bukan Library). Execute as: Me, Who has access: Anyone.

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
| `WARemind` | Blast WA reminder yuran | Col A: Raw data, Col B: Nama Murid, Col C: No Tel Asal, Col D: No Tel Normalize (60xxxxxxxxx) |

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

## Status Semasa

### Selesai ✅

#### Portal & UI
- ✅ Login Guru/Admin — email + nombor telefon, password mask bintang, idle timeout
- ✅ Header ornamental — Navy + Gold + logo bulat
- ✅ Nav bar desktop — tab Utama, Daftar, Kehadiran, Murid, Guru, Yuran, eBayar, eSemak
- ✅ Mobile nav — bottom nav bar (4 item sebelum login: Utama, Daftar, eBayar, eSemak)
- ✅ Mobile nav selepas login — 5 item: Utama, Daftar, Hadir, Murid, Yuran
- ✅ Dashboard stats — jumlah murid kanak-kanak & dewasa
- ✅ Idle timer — auto logout selepas tempoh tidak aktif
- ✅ Custom toast & modal — ganti browser alert() dengan UI Navy+Gold

#### Pendaftaran
- ✅ Daftar Murid Kanak-kanak — form 3 langkah, OTP email verification
- ✅ Daftar Murid Dewasa — form satu halaman, OTP email verification
- ✅ Auto-generate Bil & Timestamp
- ✅ Autocrat generate slip → isi kolum Merged Doc ID & URL
- ✅ Hantar slip ke email ibu bapa

#### Kehadiran
- ✅ Rekod kehadiran — guru pilih murid (checklist), simpan per sesi
- ✅ Statistik kehadiran — % per murid, per guru, per bulan
- ✅ Rekod kehadiran hari ini — papar dalam dashboard
- ✅ getMuridByGuru — guru hanya nampak murid sendiri

#### Senarai Murid & Guru
- ✅ Senarai Murid — kanak-kanak & dewasa, filter, status AKTIF/TIDAK AKTIF
- ✅ Search murid — filter nama/telefon, fix `String(telefon)` untuk nombor dari Sheets
- ✅ Kemaskini status murid — toggle aktif/tidak aktif
- ✅ Senarai Guru — 7 kolum, gambar thumbnail, badge jawatan
- ✅ Modal Kemaskini Guru — upload gambar passport ke Drive
- ✅ Carta Organisasi desktop — Pengasas → AJK → Guru

#### Yuran
- ✅ eBayar — paparan status bayaran per bulan (2024–2026)
- ✅ eSemak Yuran — carian nama, senarai belum bayar cross-check NAMA MURID
- ✅ recordCash — rekod bayaran tunai oleh admin
- ✅ getYuranStats — statistik per bulan
- ✅ Button "Copy Senarai WA" — copy senarai belum bayar ke clipboard
- ✅ Button "Hantar WA" — blast WA reminder via Fonnte API (desktop & mobile)
- ✅ Modal confirm blast WA — Navy+Gold UI, tunjuk bilangan murid
- ✅ Modal laporan blast — stats berjaya/gagal/tiada nombor
- ✅ Textarea custom mesej WA — admin boleh edit mesej sebelum blast, `[BULAN]` auto-replace
- ✅ Timestamp blast WA — "Makluman terakhir dihantar pada DD/MM/YYYY, HH:MM" (sessionStorage)

#### WhatsApp Blast (Fonnte)
- ✅ Fonnte API connected — WA Business `601162875136` linked
- ✅ FONNTE_TOKEN setup dalam GAS Script Properties
- ✅ hantarWhatsApp() function dalam Code.js
- ✅ normalizePhoneForWA() — normalize nombor untuk Fonnte (tanpa 60 prefix)
- ✅ Tab WARemind dalam Sheets — nama murid + nombor normalize
- ✅ Formula normalize nombor — buang space, handle format 60x/0x/x
- ✅ Country code fix — payload JSON.stringify + `countryCode: '60'` dalam hantarWhatsApp()

#### PWA Mobile
- ✅ manifest.json — nama, icon, tema Navy, start_url
- ✅ sw.js — service worker, cache shell, offline banner
- ✅ .nojekyll — skip Jekyll processing
- ✅ CORS fix — fetch() dari GitHub Pages ke GAS berfungsi
- ✅ GitHub Pages live — https://shafielegacy.github.io/SPKM
- ✅ Add to Home Screen — splash screen Navy + Gold + logo Syafie Legacy
- ✅ Zero impact desktop — GAS deployment tidak terjejas
- ✅ 3D Clay UI — clay bg #E8E4DA, clay shadows pada card/button, bottom nav bar
- ✅ Bottom nav sebelum login — 4 item: Utama, Daftar, eBayar, eSemak
- ✅ Bottom nav selepas login — 5 item: Utama, Daftar, Hadir, Murid, Yuran
- ✅ Guest menu — 3 kad (Daftar Murid, eBayar, eSemak) tanpa kad Log Masuk
- ✅ Footer ringkas — satu baris `© 2026 Sistem Pengurusan Kelas Mengaji`
- ✅ SW cache bump v6 — force reload bila GAS_URL bertukar

#### Backend (Code.js)
- ✅ doPost — entry point mobile/fetch
- ✅ doAction — entry point desktop/google.script.run
- ✅ doOptions — CORS preflight handler
- ✅ Token auth — JWT-like token untuk sesi guru
- ✅ OTP system — sendOTPKanak, sendOTPDewasa, confirmRegister
- ✅ syncForms — sync nama murid ke semua Google Forms
- ✅ URLSearchParams body — simple CORS request
- ✅ hantarWhatsApp() — Fonnte API integration
- ✅ notifikasiKetidakhadiran() — WA auto ke parents bila murid tak hadir
- ✅ normalizePhoneForWA() — normalize format nombor telefon

---

### Dalam Proses / Bug 🔧

*(Tiada bug aktif buat masa ini)*

---

## Modul Fasa 2 — Dalam Perancangan 🔧

| Modul | Status | Keutamaan |
|---|---|---|
| **3D Clay UI mobile** | ✅ Selesai | Tinggi |
| **Login Parent (eBayar & eSemak)** | Planned | Tinggi |
| **Login Guru (eBayar & eSemak)** | Planned | Tinggi |
| **Sijil Khatam** | Planned | Sederhana |
| **Laporan Tahunan** | Planned | Sederhana |
| **Bayaran Online (Billplz/ToyyibPay)** | Planned | Tinggi |
| **Pecah Code.js** → multi-file | Planned | Sederhana |

---

## Deploy Workflow

```bash
# Deploy ke GAS sahaja
clasp push --force
# Lepas push → GAS Editor → Deploy → Manage Deployments → Edit → New version → Web App

# Deploy ke GitHub (BurnDVS repo)
git add . && git commit -m "message" && git push

# Deploy ke GitHub Pages (shafielegacy/SPKM)
git push pages main

# Deploy semua sekaligus
git add . && git commit -m "message" && git push && git push pages main
```

> ⚠️ **PENTING:** Bila GAS URL bertukar (new deployment), kena update `GAS_URL` dalam `portal.html` DAN `index.html`, lepas tu push semula.

---

## Fonnte WA Blast — Setup

1. Login `fonnte.com` → Device → Add Device → scan QR dengan WA Business
2. Ambil token dari device settings
3. GAS Editor → cari `setFonnteToken()` → letak token → Run sekali → tukar balik placeholder
4. Token disimpan dalam Script Properties: `FONNTE_TOKEN`
5. Quota: 1000 mesej/bulan (free plan)

```javascript
// Jalankan sekali untuk set token
function setFonnteToken() {
  PropertiesService.getScriptProperties()
    .setProperty('FONNTE_TOKEN', 'TOKEN_DARI_FONNTE');
  Logger.log('Done');
}
```

---

## Tab WARemind — Setup Formula

```
Kolum A : Raw data dari copyWaList() (format: "1. NAMA - NOMBOR")
Kolum B : =TRIM(MID(TRIM(LEFT(A3,FIND(" - ",A3)-1)),FIND(". ",TRIM(LEFT(A3,FIND(" - ",A3)-1)))+2,100))
Kolum C : =IF(TRIM(MID(A3,FIND(" - ",A3)+3,LEN(A3)))="-","",TRIM(MID(A3,FIND(" - ",A3)+3,LEN(A3))))
Kolum D : =IF(C3="","",IF(TRIM(C3)="-","","60"&REGEXREPLACE(SUBSTITUTE(TRIM(C3)," ",""),"^(60|0)","")))
```

---

## Cara Guna Claude Code (Tips)

```
- Screenshot error → paste terus dalam Claude Code
- Claude Code untuk: debug, fix, git push, clasp push, baca/tulis fail
- Claude.ai untuk: planning, architecture, strategy, review
```

### Prompt 3D Clay UI (Isnin):
```
Baca index.html dalam folder projek.
Tukar mobile view UI kepada 3D Clay style. CSS dalam 
@media (max-width:1024px) SAHAJA. Zero impact desktop.

TEMA: Navy #0A1F44/#1A3A6B + Gold #FFD700/#B8960C + Clay bg #E8E4DA
FONT: Lora (heading) + DM Sans (body) — kekalkan

CLAY SHADOWS:
Card: box-shadow: 5px 5px 14px rgba(10,31,68,.11), -3px -3px 10px rgba(255,255,255,.82), inset 0 1px 0 rgba(255,255,255,.92)
Button gold: box-shadow: 3px 3px 10px rgba(176,140,0,.4), -2px -2px 6px rgba(255,255,220,.6)

SEBELUM LOGIN:
- Bottom nav 4 item: Utama, Daftar, eBayar, eSemak
- Quick cards 3 kad: Daftar Murid, eBayar Yuran, eSemak Yuran
- Footer: © 2026 Sistem Pengurusan Kelas Mengaji (sahaja)

SELEPAS LOGIN:
- Bottom nav 5 item: Utama, Daftar, Hadir, Murid, Yuran
- Menu cards: Daftar Murid, Kehadiran, Senarai Murid, Senarai Guru, Yuran, eSemak

Lepas siap: git push && git push pages main
```

---

## Nota untuk AJK

1. **Data murid** disimpan dalam Google Sheets — boleh diakses terus oleh mana-mana AJK yang diberi akses
2. **Slip pendaftaran** dijana automatik dan dihantar ke email ibu bapa — tiada kerja manual
3. **Kehadiran** boleh direkod dari mana-mana peranti melalui portal
4. **Kata laluan guru** = No. WhatsApp — mudah diingat, boleh ditukar bila-bila masa dalam Sheets
5. **Mobile PWA** — boleh install kat home screen phone, nampak macam app native
6. **Desktop** guna GAS URL, **mobile** guna GitHub Pages URL — dua-dua sync data yang sama
7. **Blast WA yuran** — button "Hantar WA" dalam tab Yuran, guna Fonnte API

---

*Sistem ini dibangunkan dengan Google Apps Script dan tidak memerlukan sebarang hosting berbayar. Semua data tersimpan dalam Google Drive.*
