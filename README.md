# Sistem Pengurusan Kelas Mengaji Syafie Legacy (SPKM)

SPKM ialah portal pengurusan kelas mengaji untuk pendaftaran murid, kehadiran, yuran, carian rekod, pengurusan guru dan operasi pentadbiran.

## Status Semasa

Setakat checkpoint production 29 Ogos 2026:

- PWA awam beroperasi seperti biasa dan telah disahkan secara visual.
- eBayar legacy kekal digunakan untuk Januari hingga Ogos 2026.
- Native eBayar disediakan untuk September 2026 dan bulan seterusnya, tertakluk kepada bulan semasa dan Portal Mode.
- Portal Mode semasa ialah `AUTO`: legacy sebelum 1 September 2026 dan Native mulai tarikh tersebut.
- Migrasi dan final reconciliation eBayar V2 Januari–Ogos telah selesai. Ogos berakhir `Synced` dan Legacy vs V2 `Match`: 102 paid, 84 unpaid, 186 murid dan RM3,580.
- Guarded Auto Sync telah dikeraskan supaya confirmed write menggunakan exact preview IDs, mempunyai timeout/loading cleanup dan no-retry handling. Ujian regression: 7 lulus, 0 gagal.
- Existing active Apps Script Web App telah dikemas kini in place kepada production **Version 176**; URL sedia ada dikekalkan.
- Kod Native eBayar Phase 2A/2B berada dalam production, tetapi belum dibuktikan dengan transaksi Native sebenar. Milestone seterusnya ialah satu transaksi terkawal pada atau selepas 1 September 2026.
- `origin/main` berada pada `01e8634`; `pages/main` kekal pada `db87448` kerana tiada perubahan public PWA diperlukan.

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
