# Sistem Pengurusan Kelas Mengaji Syafie Legacy (SPKM)

SPKM ialah portal pengurusan kelas mengaji untuk pendaftaran murid, kehadiran, yuran, carian rekod, pengurusan guru dan operasi pentadbiran.

## Status Semasa

Setakat checkpoint production 1 September 2026:

- PWA awam beroperasi seperti biasa dan telah disahkan secara visual.
- eBayar legacy kekal digunakan untuk Januari hingga Ogos 2026.
- Native eBayar bermula September 2026 dan dibenamkan terus dalam PWA; bulan akan datang kekal tertakluk kepada sempadan bulan semasa.
- Ibu bapa tidak perlu log masuk. Semakan bayaran dan resit dibuat melalui eSemak awam, manakala login Guru/Admin kekal berasingan.
- eSemak dan Dashboard Yuran menggunakan sumber hybrid: Januari–Ogos daripada sumber legacy, September–Disember daripada canonical `Payments` dengan status tepat `SELESAI`.
- Ogos Legacy dan V2 telah direconcile sepenuhnya: 109 sudah bayar, 77 belum bayar, 186 murid dan RM3,760.
- September Native telah production-verified: 15 sudah bayar, 171 belum bayar, 186 murid dan kutipan RM600; nama serta pautan resit dipaparkan dengan betul.
- Existing active Apps Script Web App ialah production **Version 184** pada deployment/URL sedia ada.
- Portal Mode kekal `AUTO`: legacy sebelum 1 September 2026 dan Native mulai tarikh tersebut.

Rujuk [CURRENT_STATUS.md](CURRENT_STATUS.md) sebelum memulakan kerja atau deployment seterusnya.

## Modul Utama

- Pendaftaran murid kanak-kanak dan dewasa dengan pengesahan OTP.
- Kehadiran guru, termasuk sokongan guru backup/relief.
- Dashboard yuran, sejarah bayaran dan eSemak.
- Legacy eBayar melalui Google Form bagi tempoh sejarah.
- Native eBayar berbilang murid dengan semakan kelayakan, slip bank dan resit PDF.
- Pengurusan murid, guru, pertukaran guru dan WhatsApp blast.
- PWA untuk akses mudah alih.

## Struktur Projek

- `Code.js` — backend Google Apps Script.
- `portal.html` — antaramuka portal GAS.
- `index.html` — PWA awam di GitHub Pages.
- `TestWA.js` — helper berkaitan WhatsApp.
- `appsscript.json` — konfigurasi Apps Script.
- `sw.js` dan `manifest.json` — service worker dan manifest PWA.
- `CURRENT_STATUS.md` — checkpoint operasi semasa dan langkah sesi seterusnya.
- `REFERENCE.md` — rujukan teknikal dan deployment.
- `INTERNAL_OPERATIONS.md` — runbook operasi dalaman.
- `SPKM_V2_PLAN.md` — pelan asal dan rekod milestone V2.
- `CHANGELOG.md` — sejarah perubahan.

## Deployment

Repositori menggunakan dua remote dengan tujuan berbeza:

- `origin` — repositori pembangunan/sumber.
- `pages` — repositori production GitHub Pages.

Push ke `origin` tidak mengemas kini laman Pages. Sebelum push ke `pages`, fetch kedua-dua remote dan semak divergence. Untuk Apps Script, `clasp push` hanya mengemas kini editor/source. `.claspignore` mesti mengecualikan `tests/**`, dan clone/push perlu mengandungi hanya `appsscript.json`, `Code.js`, `portal.html` serta `TestWA.js`. Production behavior hanya berubah apabila existing active Web App deployment diedit dan ditetapkan kepada `New version`; URL deployment production yang sama perlu dikekalkan. Jangan cipta deployment baharu kecuali memang dimaksudkan.

## Privasi dan Keselamatan

- Jangan masukkan ID murid berasaskan MyKid/MyKad ke browser atau dokumentasi awam.
- Jangan masukkan credential, token, data peribadi atau pautan fail private dalam commit.
- Jangan bypass sempadan bulan, duplicate guard, lock atau semakan pasca-write untuk ujian mudah.
- Jangan jalankan semula bayaran apabila keputusan write tidak pasti; semak staging terlebih dahulu.

## Dokumentasi

- Status semasa: [CURRENT_STATUS.md](CURRENT_STATUS.md)
- Operasi dalaman: [INTERNAL_OPERATIONS.md](INTERNAL_OPERATIONS.md)
- Rujukan teknikal: [REFERENCE.md](REFERENCE.md)
- Pelan V2: [SPKM_V2_PLAN.md](SPKM_V2_PLAN.md)
- Sejarah perubahan: [CHANGELOG.md](CHANGELOG.md)
