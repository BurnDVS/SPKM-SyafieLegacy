# SPKM V2 — Pelan Pembangunan

> **Status:** Perancangan
> **Prinsip utama:** SPKM V1 kekal sebagai production stabil. Semua pembangunan V2 dibuat secara berasingan supaya operasi eBayar, eSemak, pendaftaran dan akses guru/admin yang sedang live tidak terganggu.

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

*Dokumen perancangan diwujudkan pada 24 Julai 2026.*
