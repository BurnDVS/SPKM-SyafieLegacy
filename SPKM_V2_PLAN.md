# SPKM V2 — Pelan Pembangunan dan Rekod Milestone

> **Status 30 Ogos 2026:** Bahagian awal dokumen ini ialah pelan asal dan dikekalkan sebagai rekod sejarah. Migrasi serta final reconciliation eBayar V2 Januari–Ogos 2026 telah siap; Ogos kini 67/67 groups `Synced` dan Legacy vs V2 `Match`. Apps Script `@HEAD` mengandungi Native Slides receipt dan synthetic preview yang berjaya, tetapi production Web App kekal Version 176 dan tidak berubah. Ini masih **bukan bukti transaksi Native sebenar**: milestone terkawal pertama kekal pending pada atau selepas 1 September 2026. Rujuk `CURRENT_STATUS.md` untuk checkpoint berkuat kuasa.
>
> **Prinsip utama:** SPKM production mesti kekal stabil. Januari–Ogos 2026 kekal legacy-only; source Native eBayar telah dipromosi dalam Version 176 untuk cutoff September, tetapi ia tidak boleh ditandakan fully proven sebelum transaksi sebenar terkawal dan pemeriksaan data/Drive/idempotency selesai.

---

## 1. Objektif SPKM V2

SPKM V2 memberi fokus kepada dua perubahan architecture utama:

1. **Satukan data yuran 2025 dan 2026** supaya dashboard, eBayar dan eSemak membaca satu sumber data yang konsisten.
2. **Tambah akaun ibu bapa/penjaga menggunakan Google Account** supaya setiap parent hanya melihat rekod anak sendiri.

V2 bukan sekadar perubahan UI. Ia melibatkan migration data, authentication baharu, kawalan akses dan semakan semula endpoint backend.

---

## 2. Kedudukan SPKM V1

SPKM V1 ialah production semasa dan mesti dikekalkan stabil.

### Fungsi V1 yang kekal live

- Pendaftaran murid kanak-kanak dan dewasa.
- OTP email semasa pendaftaran.
- Login Guru/Admin menggunakan email dan nombor WhatsApp berdaftar.
- Kehadiran guru, termasuk Guru Backup/Relief.
- eBayar dan eSemak tanpa login parent.
- Dashboard yuran.
- Sijil khatam.
- PWA mobile dan portal desktop GAS.

### Polisi keselamatan V1 sepanjang pembangunan V2

- Jangan ubah deployment production untuk eksperimen V2.
- Jangan gunakan spreadsheet live sebagai tempat ujian migration.
- Jangan tukar struktur tab live sebelum backup dan verification lengkap.
- Semua perubahan V2 perlu melalui data salinan, deployment ujian dan pilot terhad.

---

## 3. Skop Utama V2

### 3.1 Unified Payment Data

Gabungkan tab eBayar 2025 dan eBayar 2026 ke dalam satu spreadsheet yuran berstruktur mengikut tahun.

Cadangan struktur:

```text
Yuran Bersepadu/
├── 2025/
│   ├── MEI2025 ... DIS2025
│   └── CalculationMei2025 ... CalculationDis2025
├── 2026/
│   ├── JAN2026 ... DIS2026
│   └── CalculationJan2026 ... CalculationDis2026
├── NAMA MURID
├── PAYMENT_INDEX
└── MIGRATION_LOG
```

Nota: Google Sheets tidak menyokong folder tab sebenar. Struktur di atas ialah gambaran logical. Nama tab akhir perlu diputuskan supaya unik dan mudah dibaca script.

Keperluan:

- Satu `YURAN_SS_ID` sebagai source of truth.
- Mapping bulan/tahun tidak lagi hardcoded secara berulang.
- Dashboard yuran dan eSemak membaca sumber yang sama.
- Rekod tunai, Google Form dan status Calculation kekal idempotent.
- Migration log menyimpan sumber, row asal, masa migration dan status semakan.

### 3.2 Login Parent dengan Google Account

Flow cadangan:

1. Parent tekan **Log Masuk Ibu Bapa**.
2. Parent pilih Google Account melalui Google Identity Services.
3. Frontend menerima Google ID token.
4. Backend GAS verify token Google; jangan percaya email yang dihantar terus oleh browser.
5. Backend padankan email yang telah disahkan dengan rekod parent/murid.
6. Sistem cipta session role `PARENT`.
7. Dashboard parent hanya memaparkan murid yang linked kepada akaun tersebut.

Akses parent yang dicadangkan:

- Senarai semua anak di bawah akaun mereka.
- Status yuran mengikut bulan dan tahun.
- Sejarah bayaran.
- Slip pendaftaran dan sijil berkaitan.
- Maklumat asas murid yang dibenarkan.

Parent tidak dibenarkan:

- Search nama murid secara bebas.
- Melihat data keluarga lain.
- Mengubah status bayaran.
- Mengakses fungsi Guru/Admin.

### 3.3 Parent–Student Mapping

Cadangan tab baharu:

```text
ParentAccounts
```

Cadangan kolum:

| Kolum | Kegunaan |
|---|---|
| ParentID | ID dalaman stabil |
| GoogleEmail | Email verified daripada Google |
| ParentName | Nama paparan |
| StudentKey | ID stabil murid, bukan row number |
| StudentType | KANAK / DEWASA |
| Relationship | Ibu / Bapa / Penjaga / Sendiri |
| Status | ACTIVE / PENDING / REVOKED |
| LinkedAt | Masa link |
| LinkedBy | AUTO / ADMIN |
| LastLoginAt | Audit login terakhir |

Satu parent boleh linked kepada beberapa anak. Satu murid juga boleh linked kepada lebih daripada seorang penjaga jika dibenarkan oleh admin.

---

## 4. Isu Data yang Wajib Diaudit

Sebelum login parent dibina, audit email dalam `PendaftaranBaru` dan `KelasDewasa`:

- Email kosong.
- Format email tidak sah.
- Typo atau spacing pelik.
- Satu email digunakan oleh beberapa keluarga yang tidak berkaitan.
- Anak adik-beradik menggunakan email berlainan.
- Parent sudah tukar Google Account.
- Rekod `TIDAK AKTIF` yang masih linked.

Hasil audit perlu dikelaskan kepada:

- `AUTO-LINK SAFE`
- `ADMIN REVIEW`
- `NO VALID EMAIL`
- `DUPLICATE / AMBIGUOUS`

---

## 5. Architecture Pembangunan Berasingan

Cadangan setup:

### Source code

- Branch V1 production: `main`
- Branch pembangunan: `v2-development`

Atau, jika mahu pengasingan lebih keras:

- Repo production V1 kekal.
- Repo V2 baharu untuk development dan pilot.

### Google Apps Script

- GAS project V1 production kekal.
- GAS project V2 berasingan untuk testing.
- Deployment URL V2 tidak digunakan oleh public sehingga pilot diluluskan.

### Spreadsheet

- Salinan Main DB untuk development.
- Salinan spreadsheet yuran 2025.
- Salinan spreadsheet yuran 2026.
- Spreadsheet output migration khusus V2.

### Frontend

- URL ujian berasingan, contohnya subfolder atau repo Pages khas.
- Label jelas `SPKM V2 TEST` supaya tidak keliru dengan production.

---

## 6. Fasa Pelaksanaan

### Fasa 0 — Freeze dan Backup

- Catat versi production semasa.
- Backup semua spreadsheet berkaitan.
- Export struktur tab dan header.
- Simpan baseline kiraan murid dan bayaran setiap bulan.

**Exit criteria:** backup boleh dipulihkan dan baseline disahkan.

### Fasa 1 — Audit dan Design Unified Payment

- Inventori tab 2025 dan 2026.
- Bandingkan struktur kolum.
- Tentukan schema akhir.
- Sediakan mapping bulan/tahun.
- Kenal pasti formula dan trigger yang bergantung pada ID lama.

**Exit criteria:** migration map lengkap dan tiada dependency yang tidak diketahui.

### Fasa 2 — Migration Dry Run

- Copy data ke spreadsheet V2.
- Jana `MIGRATION_LOG`.
- Reconcile jumlah rekod, nama unik dan status bayaran.
- Uji duplicate, spacing dan normalization.

**Exit criteria:** jumlah sebelum dan selepas migration sepadan atau setiap perbezaan mempunyai penjelasan.

### Fasa 3 — Refactor Backend Yuran

- Wujudkan satu payment data access layer.
- Tukar `getYuranStats`, `getEbayarStats`, `getYuranParent`, `recordCash` dan sync functions supaya membaca schema baharu.
- Tambah tests untuk setiap tahun dan bulan.

**Exit criteria:** semua fungsi yuran lulus pada data ujian 2025 dan 2026.

### Fasa 4 — Audit Email Parent

- Generate laporan email parent.
- Auto-link kes yang selamat.
- Sediakan senarai manual review.
- Tetapkan polisi pertukaran email dan recovery akaun.

**Exit criteria:** majoriti rekod aktif mempunyai mapping yang sah atau status review yang jelas.

### Fasa 5 — Google Login Parent

- Integrasi Google Identity Services.
- Verify ID token di backend.
- Cipta session role `PARENT`.
- Implement ownership checks pada semua endpoint parent.
- Sediakan logout, expiry dan audit log.

**Exit criteria:** parent ujian hanya boleh melihat anak sendiri; percubaan akses silang ditolak backend.

### Fasa 6 — Dashboard Parent

- Papar senarai anak.
- Papar yuran mengikut tahun/bulan.
- Papar payment history dan dokumen berkaitan.
- Buang carian nama terbuka bagi pengguna yang telah login.

**Exit criteria:** UX mobile dan desktop lulus, termasuk parent dengan lebih daripada seorang anak.

### Fasa 7 — Pilot Terkawal

- Pilih kumpulan parent kecil.
- Gunakan deployment V2 berasingan.
- Pantau login gagal, mapping salah dan perbezaan bayaran.
- V1 kekal tersedia sebagai fallback.

**Exit criteria:** tiada data leakage, tiada payment mismatch kritikal dan support issue boleh dikendalikan.

### Fasa 8 — Cutover

- Freeze perubahan payment sementara.
- Jalankan migration akhir.
- Verify totals.
- Tukar config kepada backend V2.
- Monitor rapat dan sediakan rollback.

**Exit criteria:** production V2 stabil dan rollback window tamat tanpa insiden kritikal.

---

## 7. Security Requirements

- Verify Google ID token di backend.
- Jangan terima `parentEmail` daripada frontend sebagai bukti identiti.
- Semua endpoint parent mesti validate session dan ownership `StudentKey`.
- Gunakan ID murid stabil; jangan guna row number sebagai identifier.
- Rekod login, link, unlink dan percubaan akses ditolak.
- Jangan dedahkan IC, MyKid, alamat penuh atau data sensitif tanpa keperluan.
- Rate limit login/linking endpoint.
- Session parent mempunyai expiry dan revocation.

---

## 8. Acceptance Criteria Utama

V2 hanya layak menggantikan V1 apabila:

- Semua jumlah bayaran 2025 dan 2026 telah direconcile.
- Dashboard admin, eBayar dan eSemak menggunakan satu source of truth.
- Parent Google login berfungsi pada mobile dan desktop.
- Parent dengan beberapa anak melihat semua anak yang betul.
- Parent tidak boleh melihat murid lain walaupun mengubah request secara manual.
- Guru/Admin login dan fungsi sedia ada tidak regress.
- Backup, rollback dan migration log telah diuji.
- Pilot users mengesahkan data mereka tepat.

---

## 9. Perkara Belum Diputuskan

- Branch berasingan atau repo V2 berasingan.
- Nama dan ID spreadsheet yuran bersepadu.
- Kaedah link parent pertama kali: auto email, admin approval atau gabungan kedua-duanya.
- Polisi jika Google email tidak sama dengan email pendaftaran.
- Sama ada murid dewasa menggunakan role `PARENT` yang sama atau role `STUDENT` berasingan.
- Sama ada V2 menggantikan URL sedia ada atau dilancarkan dahulu sebagai URL baharu.

---

## 10. Keputusan Semasa

- SPKM V1 kekal production stabil.
- Wording login V1 telah dijelaskan kepada **LOG MASUK GURU & ADMIN**.
- Login parent belum diaktifkan dalam V1.
- Penyatuan spreadsheet yuran ialah dependency pertama V2.
- Google Account dipilih sebagai arah authentication parent.
- Semua kerja V2 mesti dibuat berasingan daripada production.

---

## 11. Milestone eBayar V2 Shadow Data Jan–Aug 2026 — COMPLETE

Migration dan validation shadow data eBayar V2 bagi Januari hingga Ogos 2026 telah selesai. Januari hingga Julai telah disahkan terlebih dahulu, kemudian Ogos dimigrasi dan direconcile. Milestone ini tidak bermaksud production frontend/web app telah cut over kepada V2.

### Pembetulan reader dan reconciliation Januari–Jun 2026

- Bug normalization `BULAN_KEY` telah diperbaiki. Nilai yang ditukar oleh Google Sheets kepada objek `Date` kini dinormalisasi dengan selamat kepada format bulan canonical.
- Perbandingan legacy dengan V2 bagi Januari hingga Jun 2026 lulus tepat untuk semua metrik yang diuji.

### July 2026 catch-up

- Source sheet: `JULAI2026`.
- Sebelum catch-up: 32 source groups telah wujud.
- 39 genuinely new groups dikenal pasti dan diimport.
- 60 child payment rows ditambah dengan jumlah catch-up RM1,870.
- Batch 1: source rows 34–58, 25 groups, 37 child rows, RM1,150.
- Batch 2: source rows 59–72, 14 groups, 23 child rows, RM720.

Catch-up dilaksanakan melalui guarded importer dengan perlindungan berikut:

- Payment group IDs mesti dinyatakan secara explicit.
- Maksimum 25 groups bagi setiap batch.
- Source row July dihadkan kepada julat 34–72.
- Preview mesti mengklasifikasikan setiap ID sebagai `GENUINELY_NEW`.
- Staging disemak semula menggunakan `PAYMENT_GROUP_ID`, source location, `SOURCE_ROW_HASH` dan secondary content fingerprint.
- Script lock digunakan sepanjang write window.
- Source dibaca semula selepas lock diperoleh dan TOCTOU validation dijalankan.
- Sebarang conflict membatalkan keseluruhan batch.
- Append dilakukan melalui satu panggilan `setValues` secara batch, tanpa partial-write loop.

### Keadaan akhir July 2026

- `sourceGroupsScanned`: 71.
- `existingUnchangedGroups`: 71.
- `changedExistingGroups`: 0.
- `genuinelyNewGroups`: 0.
- `projectedChildRows`: 0.
- `projectedTotalAmount`: RM0.
- `highestExistingJulySourceRow`: 72.

### Validasi akhir legacy vs V2, Januari–Julai 2026

- January: 107 paid, RM3,860.
- February: 114 paid, RM3,840.
- March: 110 paid, RM3,630.
- April: 112 paid, RM3,680.
- May: 117 paid, RM4,020.
- June: 172 paid, RM5,780.
- July: 114 paid, 69 unpaid, 183 total students, RM3,730.
- Semua metrik matched exactly; `onlyLegacy: []`, `onlyV2: []`, dan semua diffs ialah zero.

### August 2026 migration dan validation

- Source sheet: `OGOS2026`.
- 46 source groups menghasilkan 69 child payment rows.
- 68 unique paid names dengan jumlah RM2,520.
- Batch 1, source rows 2–26: 25 groups, 37 child rows, RM1,400.
- Batch 2, source rows 27–47: 21 groups, 32 child rows, RM1,120.

Final staging verification Ogos 2026:

- `sourceGroupsScanned`: 46.
- `existingUnchangedGroups`: 46.
- `changedExistingGroups`: 0.
- `genuinelyNewGroups`: 0.
- `projectedChildRows`: 0.
- `projectedTotalAmount`: RM0.
- `highestExistingAugustSourceRow`: 47.

Final Legacy vs V2 Ogos 2026:

- `sudahBayar`: 68.
- `belumBayar`: 117.
- `totalMurid`: 185.
- `totalKutipan`: RM2,520.
- Semua diffs ialah zero; `onlyLegacy: []` dan `onlyV2: []`.

Snapshot di atas ialah checkpoint 16 Ogos dan kini superseded oleh final reconciliation 29 Ogos 2026:

- Sebelum final sync: 66 source groups, 46 existing, 20 new, 0 review, 34 projected child rows dan RM1,060.
- Guarded Auto Sync yang telah dikeraskan dijalankan sekali. Browser memberi outcome uncertain, tetapi fresh authoritative status mengesahkan write selesai; tiada retry dibuat.
- Final: 66 existing, 0 new/review, status `Synced`.
- Legacy vs V2: `Match`; 102 paid, 84 unpaid, 186 total dan RM3,580.

Checkpoint 29 Ogos di atas pula telah disusuli reconciliation 30 Ogos 2026:

- Satu real August payment group dengan 2 child rows dan RM60.00 disync sekali.
- Browser transport response uncertain; selaras dengan no-retry rule, sync tidak diulang. Refresh authoritative status mengesahkan write selesai.
- Final: 67 source groups, 67 existing, 0 new, 0 new child rows dan status `Synced`.
- Legacy vs V2: `Match`; 104 paid, 82 unpaid, 186 total dan RM3,640.

### September 2026

- Source tab `SEPT2026` telah wujud tetapi masih mengandungi header sahaja.
- Belum ada payment rows untuk `2026-09`.
- Tiada migration atau import September diperlukan pada masa ini.

### Peralihan ke automation mode

- Shadow migration dan validation eBayar V2 bagi Januari hingga Ogos 2026 ditandakan **COMPLETE**.
- Projek kini beralih daripada manual migration mode kepada automation mode.
- Generic guarded current-month sync engine v1 telah disiapkan sebagai asas sync bulan semasa.
- Production frontend/web app masih belum cut over kepada V2.

### Generic Guarded Current-Month Sync Engine v1

Backend disiapkan dan berjaya melalui preview test pada 15 Ogos 2026.

Perlindungan dan tingkah laku yang telah disahkan:

- Bulan semasa dan source sheet ditentukan secara runtime.
- Akses server-side dihadkan kepada `ADMIN`.
- Mod lalai ialah read-only; write hanya berlaku apabila `allowWrite === true`.
- Hanya source groups berstatus `GENUINELY_NEW` dipilih.
- Maksimum 25 payment groups bagi setiap batch execution.
- Konflik staging diperiksa sebelum script lock melalui `PAYMENT_GROUP_ID`, source location, `SOURCE_ROW_HASH`, dan secondary content fingerprint.
- `ScriptLock` menggunakan tempoh menunggu maksimum 30 saat.
- Source draft dibina semula selepas lock dan dibandingkan dengan snapshot pra-lock untuk perlindungan TOCTOU.
- Final staging recheck dijalankan semasa lock masih dipegang.
- Keseluruhan batch ditambah melalui satu panggilan `setValues()` sahaja.
- Tiada partial-write loop dan tiada batch kedua dijalankan secara automatik.
- Fresh current-month preview, source identity, dan staging identity disemak selepas write.
- Jika post-write verification gagal, tiada rollback dan tiada auto-retry dilakukan; rekod mesti disemak secara manual.

Verified August 2026 preview pada 15 Ogos 2026:

- Mode: `V2_CURRENT_MONTH_SYNC_NO_CHANGES`.
- 46 existing groups.
- 0 genuinely new groups.
- 0 changed-existing groups.
- 0 projected child rows.
- Projected amount RM0.
- Tiada write dilakukan.

Admin panel `Auto Sync` kini disambungkan kepada aliran preview-first dan explicit confirmation. Sync kekal admin-initiated sahaja; tiada scheduler, time trigger, auto-retry, atau automatic second batch diwujudkan.

Hardening commit `391f164` membetulkan dua defect gabungan: confirmation kini membawa immutable exact preview IDs ke backend, dan Promise frontend mempunyai settlement timeout 120 saat supaya loading sentiasa dibersihkan. Backend memerlukan 1–25 ID non-empty/unique, menolak ID stale dan memproses hanya batch yang disahkan. Full local suite selepas Native Slides receipt: 14 passed, 0 failed.

Production Version 176 telah diverify pada 29 Ogos 2026 menggunakan existing deployment URL. `tests/**` wajib kekal dalam `.claspignore`; insiden test file terikut dalam source push pertama telah dibersihkan dan fresh clone mengesahkan hanya empat fail Apps Script intended kekal.

Native receipt rendering source kini menyalin existing Google Slides template `1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`, mengganti lima placeholders, mengeksport PDF dan trash temporary Slides copy dalam `finally`. Layout satu slide landscape 576 × 288 pt dikekalkan; multiple children menggunakan balanced wrapping dan local font reduction. `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID` menyimpan template config, manakala `NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID` digunakan oleh helper `testCreateNativeEbayarReceiptSlidesPreviewV2`.

Synthetic September preview dua anak/RM100 dengan `CONTOH / TIDAK SAH` berjaya melalui real Slides-to-PDF path tanpa live payment row atau production receipt record. Privacy, idempotency, one-PDF-per-group, shared `RESIT_URL`, final-PDF permissions dan payment-independent receipt failure handling kekal.

Apps Script `@HEAD` dan `origin/main` kini pada source terkini `0b1d10b` (`15d7991` ialah Slides implementation; `fd3203c` ialah previous docs checkpoint). Production tidak diubah dan kekal Version 176; later Slides source belum production-active. Native eBayar belum dianggap fully proven sehingga satu transaksi terkawal pada atau selepas 1 September mengesahkan payment rows, slip privacy, satu receipt PDF, shared `RESIT_URL`, temporary Slides cleanup dan idempotency tanpa retry atau duplicate.

### Nota operasi

- Satu anomaly sejarah June, `GROUP_ID_MULTIPLE_STAGED_HASHES`, masih wujud. Ia telah disiasat dan disahkan tidak berkaitan dengan July catch-up.
- Catatan “belum production deployment” dalam snapshot migration terdahulu ialah sejarah. Existing production Web App kini Version 176 pada URL yang sama.
- Portal Mode mesti kekal `AUTO`; sebelum 1 September ia resolve `LEGACY`, dan milestone seterusnya perlu mengesahkan resolve `NATIVE` pada atau selepas tarikh cutoff.

---

*Dokumen perancangan diwujudkan pada 24 Julai 2026.*
