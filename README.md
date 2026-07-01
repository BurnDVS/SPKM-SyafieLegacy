# Sistem Pengurusan Kelas Mengaji Syafie Legacy (SPKM)

![Logo](https://i.ibb.co/93rXrkZq/LOGO-SL.png)

> **Status:** Fasa 1 aktif  
> **Platform:** Google Apps Script + Google Sheets + GitHub Pages PWA  
> **Portal Mobile:** https://shafielegacy.github.io/SPKM

---

## Ringkasan

SPKM ialah sistem pengurusan kelas mengaji berasaskan Google Workspace. Sistem ini membantu urusan pendaftaran murid, rekod kehadiran, pengurusan yuran, semakan bayaran, slip pendaftaran, sijil khatam, dan notifikasi operasi kelas.

Sistem ini dibina untuk kegunaan pentadbiran Syafie Legacy dan menggunakan Google Sheets sebagai pangkalan data utama.

---

## Modul Utama

### Pendaftaran
- Daftar murid kanak-kanak dengan pengesahan OTP email.
- Daftar murid dewasa dengan pengesahan OTP email.
- Jana slip pendaftaran secara automatik.
- Sekat pendaftaran berganda berdasarkan No. MYKID/MYKAD.
- Sokong status murid `AKTIF` dan `TIDAK AKTIF`.

### Kehadiran
- Guru boleh rekod kehadiran murid mengikut sesi.
- Paparan statistik kehadiran mengikut guru dan murid.
- Senarai murid guru dibaca daripada data pendaftaran aktif.
- ✅ Guru Backup/Relief — `getMuridByGuru` check `GURU_BACKUP` sekali, badge "Ganti" di checklist, `simpanKehadiran` auto-split rekod relief ke tab guru tetap (30 Jun 2026).

### Yuran
- Dashboard yuran bulanan.
- Rekod bayaran tunai.
- Semakan status bayaran oleh ibu bapa atau penjaga.
- Senarai murid belum bayar untuk tindakan susulan.
- eBayar Master / Yuran V2 sedang disediakan secara internal/shadow sahaja; live SPKM masih guna flow legacy.

### Guru & Murid
- Senarai murid kanak-kanak dan dewasa.
- Kemaskini status murid.
- Senarai guru dan maklumat asas.
- Carta organisasi.

### PWA Mobile
- Portal mobile melalui GitHub Pages.
- Boleh dipasang ke home screen.
- Service worker untuk pengalaman mobile lebih lancar.

---

## Struktur Projek

```text
SPKM/
├── Code.js          # Backend Google Apps Script
├── index.html       # Portal mobile PWA / GitHub Pages
├── portal.html      # Portal desktop
├── config.json      # Konfigurasi aplikasi
├── manifest.json    # PWA manifest
├── sw.js            # Service worker
├── appsscript.json  # Konfigurasi Apps Script
└── *.md             # Nota dan changelog projek
```

---

## Teknologi

- Google Apps Script
- Google Sheets
- Google Drive
- HTML, CSS, JavaScript
- GitHub Pages
- PWA manifest + service worker

---

## Status Ringkas

| Modul | Status |
|---|---|
| Pendaftaran murid | Aktif |
| OTP email | Aktif |
| Semakan duplicate MYKID/MYKAD | Aktif |
| Kehadiran guru | Aktif |
| Dashboard yuran | Aktif |
| eBayar / eSemak | Aktif |
| Sijil khatam | Aktif |
| PWA mobile | Aktif |

---

## Privasi & Operasi

Maklumat dalaman seperti ID spreadsheet, URL deployment Apps Script, token integrasi, workflow deploy, dan nota pentadbiran tidak dipaparkan dalam README awam.

Rujukan teknikal penuh disimpan dalam dokumentasi private/local projek.

---

## Changelog

Lihat [CHANGELOG.md](CHANGELOG.md) untuk rekod perubahan utama.

---

Sistem ini dibangunkan untuk operasi kelas mengaji Syafie Legacy menggunakan ekosistem Google Workspace.
