# SPKM V2 — Pelan Pembangunan dan Rekod Milestone

## Checkpoint Pelan — 1 Oktober 2026

- PWA production kini **v1.0.1**, dengan cache Service Worker `spkm-v13`.
- Native eBayar memaparkan `Bayaran Untuk` di atas `Pilih Murid / Anak`. Oktober 2026 kekal dipilih selepas ibu bapa memilih murid.
- Bulan semasa lalai menggunakan `config.serverDate`, dengan tarikh Malaysia sebagai fallback.
- Preflight production disahkan secara manual dengan **2 murid dan RM40 sehingga confirmation screen sahaja**; ini bukan pengesahan submission bayaran selesai.

- Release Pages: `fb12ee6`, `9483088`; checkpoint dokumentasi production `69c368a`, source `e956c62`.
- Production `shafielegacy/SPKM` diterbitkan berasingan daripada source `BurnDVS/SPKM-SyafieLegacy`; push source sahaja tidak mengemas kini Pages. Utamakan clone `SPKM_LIVE_FIX` sehingga isu metadata/ACL source selesai; topologi penuh dalam `CURRENT_STATUS.md`.

Checkpoint 1 Oktober 2026 ini berkuat kuasa untuk PWA dan topologi repo. Checkpoint, angka verifikasi dan arahan deployment terdahulu dikekalkan sebagai sejarah apabila bercanggah. Handoff ini tidak menetapkan versi backend baharu atau mengesahkan semula deployment Apps Script; jangan anggap @185 yang direkod pada 2 September sebagai versi live terkini tanpa semakan berasingan.

Milestone ini tidak menandakan pelan parent login, privacy/authentication atau roadmap lain selesai.

> **Status sejarah 2 September 2026:** Bahagian awal dokumen ini ialah pelan asal dan dikekalkan sebagai rekod sejarah. Staff Auth V2 / security Phase 1 **COMPLETE dan LIVE**, backend **@185** dan PWA auth `de0d608`; `main` pada merge `1d07e8f`. eSemak privacy/authentication security Phase 2 **PENDING**, berasingan dan tidak diubah dalam rollout ini. Ogos Legacy/V2 fully reconciled pada 70 groups, 109 paid, 77 unpaid, 186 active students dan RM3,760. Native September, public hybrid eSemak, Admin hybrid dashboard dan receipt links kekal production-verified. Rujuk `CURRENT_STATUS.md` untuk checkpoint berkuat kuasa.
>
> **Prinsip utama:** SPKM production mesti kekal stabil. Januari–Ogos 2026 kekal legacy-only; Native eBayar bermula September. Parents menggunakan public eSemak tanpa login, manakala Guru/Admin login kekal berasingan.

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
- Login Guru/Admin asal menggunakan email dan nombor WhatsApp berdaftar (sejarah V1; digantikan oleh Staff Auth V2 email OTP pada 2 September 2026, lihat milestone 12).
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

Checkpoint 30 Ogos di atas ialah sejarah dan digantikan oleh final repair/reconciliation 1 September 2026:

- Canonical `Payments` asalnya berhenti pada Ogos source row 68. Missing IDs `PG-2026-OGOS2026-69`, `-70` dan `-71` mewakili 3 groups, 5 child rows dan RM120.
- One-time guarded editor-only backfill menggunakan `syncCurrentMonthEbayarV2Core_(meta, true, paymentGroupIds)` dan menambah tepat 3 groups, 5 child rows dan RM120.
- Post-write: 70 existing, 0 genuinely new, 0 changed-existing, all selected groups present dan source groups unchanged. Preview seterusnya menunjukkan 0 projected rows/RM0 dan highest existing source row 71.
- Helper one-time dan dedicated test telah dibuang selepas verification; ia bukan permanent production behavior.
- Final Legacy dan V2 masing-masing: 109 paid, 77 unpaid, 186 total dan RM3,760. Semua numeric diffs sifar; `onlyLegacy=[]`, `onlyV2=[]`.
- `OGOS2026` mempunyai 70 response groups, 110 child-name occurrences dan 109 distinct names. PADILLAH mempunyai dua genuine submissions/receipts dan kedua-dua amaun kekal sah.
- Calculation registered spill boleh merangkumi inactive records; production dashboard menggunakan active roster 186.
- Resolved 2 September 2026: `PG-2026-JUN2026-112` ialah payment sama yang di-append semula apabila `JUN2026!G112` berubah daripada teks `RM10.00` kepada nombor `10`, lalu menghasilkan hash baharu bagi historical importer yang deduplicate berdasarkan source hash sahaja. Ini bukan bayaran kedua atau normal multi-child behavior.
- Obsolete row 749/hash `e8ada66407f1b7873e4adacc6cf510dbcfd823007ff0663b9acccb3fad144b59` dynamically resolved dan `A:Z` sahaja dikosongkan tanpa structural row deletion. Current-source row 1571/hash `c15975677b4b9c18beb1d63a6f4c83806c77a42e59e8c1874a8e050e79b7e930` dikekalkan. June selepas repair: 174 payment rows, 111 groups, 172 paid names, RM5,780; Legacy/V2 diffs sifar dan kedua-dua name-only sets kosong. `nativeOrSeptemberIdentityCount=0`; September/Native tidak disentuh. Temporary helper/test telah dibuang (`2add115`).

### September 2026

- Native eBayar live dan embedded dalam PWA. Parents tidak login; mereka menggunakan public eSemak.
- Public `getYuranParent` menggunakan legacy monthly sources bagi Jan–Ogos dan canonical exact-`STATUS=SELESAI` bagi Sep–Dis.
- Existing frontend `getYuranStats` dispatch ke legacy `getYuranStats()` bagi Jan–Ogos dan canonical `getYuranStatsV2()` bagi Sep–Dis.
- Production verification: 15 paid, 171 unpaid, 186 active students dan RM600; names serta receipt links dipaparkan dengan betul.

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

Production Version 176/177 dan Version 184 ialah checkpoint sejarah. Current production ialah Version 185 pada deployment ID dan `/exec` URL yang sama. `tests/**` wajib kekal dalam `.claspignore`; insiden test file terikut dalam source push pertama telah dibersihkan dan fresh clone mengesahkan hanya empat fail Apps Script intended kekal.

Native receipt rendering source kini menyalin existing Google Slides template `1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`, mengganti lima placeholders, mengeksport PDF dan trash temporary Slides copy dalam `finally`. Layout satu slide landscape 576 × 288 pt dikekalkan; multiple children menggunakan balanced wrapping dan local font reduction. `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID` menyimpan template config, manakala `NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID` digunakan oleh helper `testCreateNativeEbayarReceiptSlidesPreviewV2`.

Synthetic September preview dua anak/RM100 dengan `CONTOH / TIDAK SAH` berjaya melalui real Slides-to-PDF path tanpa live payment row atau production receipt record. Privacy, idempotency, one-PDF-per-group, shared `RESIT_URL`, final-PDF permissions dan payment-independent receipt failure handling kekal.

Checkpoint 1 September: Apps Script production Version 184 pada existing deployment ID dan `/exec` URL; Web App executes as `USER_DEPLOYING`. Progression: V180 eSemak hybrid, V181 legacy Form readiness, V182 Admin dashboard hybrid, V183 Form sync observability/read-back verification, V184 Google Forms OAuth scope. Milestone 12 merekodkan upgrade @185 pada 2 September. Portal Mode `AUTO` resolve `NATIVE` mulai 1 September mengikut Malaysia time.

PWA Native routing dan Admin shortcut publication ditandakan complete:

- Historical PWA routing checkpoint ialah `076f68a` (`feat: prepare native ebayar routing and admin shortcut`); source checkpoint ketika rollout Native ialah `0c3a355`.
- Historical Pages publication `7b5476e` (`feat: route PWA eBayar to native portal`) diterbitkan dari detached worktree `C:\Users\burnk\OneDrive\Documents-assets\SPKM-pages-publish` menggunakan `git push pages HEAD:main`. Current auth publication ialah `de0d608`; temporary rollout worktrees kini telah dibersihkan.
- Januari–Ogos kekal menggunakan original Legacy Google Form routes. September–Disember menggunakan approved production `/exec` mengikut Malaysia time: September dibuka 1 September, Oktober 1 Oktober, November 1 November dan Disember 1 Disember 2026. Future months kekal disabled dan tiada public route menggunakan `/dev`.
- PWA Dashboard Yuran menyediakan shortcut `eBayar V2 Maintenance` hanya kepada authenticated `ADMIN`, membuka production `/exec` dalam protected new tab. Backend Admin authorization kekal authoritative dan full maintenance UI kekal di Apps Script portal. Exact PWA duplicate ialah optional future scope.

Native eBayar September, names dan receipt links telah production-verified. Public architecture kekal tanpa parent login; original Google parent-login plan masih KIV dan bukan dependency eSemak semasa.

Legacy Form sync turut selesai dihardening pada 1 September: bounded Calculation readiness kira-kira 15 saat menggantikan fixed-sleep-only behavior, stale Calculation gagal tertutup, manual errors disurface, dan post-write Form choices dibaca semula serta diverify. Diagnostics meliputi action/month/Form/Calculation counts dan verification result. Initial production failure ialah missing owner consent untuk explicit scope `https://www.googleapis.com/auth/forms`; one-time read-only owner check mengesahkan access sebelum `Kemas Form (Tolak Dah Bayar)` berjaya. Helper authorization itu bukan permanent feature.

### Nota operasi

- Anomaly sejarah June `GROUP_ID_MULTIPLE_STAGED_HASHES` untuk `PG-2026-JUN2026-112` telah diselesaikan pada 2 September; audit dikekalkan dalam milestone reconciliation di atas.
- Catatan “belum production deployment”, Version 176/177 dan pending first transaction dalam snapshot terdahulu ialah sejarah. Existing production Web App kini Version 185 pada URL yang sama.
- Portal Mode mesti kekal `AUTO`; mulai 1 September ia resolve `NATIVE`.

---

## 12. Staff Auth V2 / Security Phase 1 — COMPLETE (2 September 2026)

Security Phase 1/2 di sini ialah workstream keselamatan, berasingan daripada nombor fasa migration asal dan Native eBayar Phase 2A/2B.

- [x] Legacy staff email + last-six-phone login disabled fail-closed; email OTP dan Session V2 menggantikannya.
- [x] Central authorization, server-derived privileged actor identity, live staff/role revalidation dan backend logout; legacy sessions gagal tertutup.
- [x] Desktop/header dan mobile OTP login; canonical backend identity/role semasa login dan restore.
- [x] Focused automated tests 22/22, full Node suite 80/80, isolated live pentest dan production Staff Auth V2 smoke test PASS.
- [x] Feature `98e585c` merged melalui PR #1 (`feat: harden staff auth with OTP v2`), `main` merge `1d07e8f`.
- [x] Backend @185, description `SPKM Staff Auth V2 - Email OTP Security Hardening`, dalam project production sedia ada dengan deployment ID dan URL dikekalkan.
- [x] PWA auth diterbitkan berasingan: `de0d608` (`feat: publish staff auth otp v2 to pwa`), `index.html` sahaja, melalui `shafielegacy/SPKM` di [SPKM](https://shafielegacy.github.io/SPKM/).
- [x] Isolated sandbox artifacts tidak masuk production security branch; temporary rollout worktrees dan merged local security branch telah dibersihkan, hanya main workspace kekal.
- [ ] **Security Phase 2 — eSemak privacy/authentication:** pending dan scope berasingan. Semak public lookup/receipt exposure serta model parent–student authorization, putuskan reka bentuk dan acceptance tests sebelum implementasi. Public eSemak kekal unchanged dalam Staff Auth V2; parent login/ownership controls belum dilaksanakan.

Existing Native eBayar guards kekal protected. Timing/model auth: `REFERENCE.md`; operasi OTP: `INTERNAL_OPERATIONS.md`; bukti rollout dan next-session boundary: `CURRENT_STATUS.md`. Checklist ini tidak menandakan fasa parent login, migration atau roadmap lain selesai secara automatik.

---

*Dokumen perancangan diwujudkan pada 24 Julai 2026.*
