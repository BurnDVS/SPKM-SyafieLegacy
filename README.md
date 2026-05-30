# Sistem Pengurusan Kelas Mengaji Syafie Legacy (SPKL)

![Logo](https://i.ibb.co/93rXrkZq/LOGO-SL.png)

> **Versi:** Fasa 1 (Aktif) · Fasa 2 (Dalam Perancangan)  
> **Platform:** Google Apps Script + Google Sheets + Google Drive  
> **URL Portal:** https://script.google.com/macros/s/[DEPLOY_ID]/exec  
> **Spreadsheet ID:** `1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU`

---

## Ringkasan Sistem

SPKL ialah sebuah **sistem pengurusan kelas mengaji berasaskan web** yang dibina di atas Google Workspace. Ia menggabungkan portal web (portal.html), backend automatik (Code.gs / Apps Script), dan pangkalan data (Google Sheets) untuk mengendalikan pendaftaran murid, rekod kehadiran, penjanaan slip, dan (akan datang) pengurusan yuran.

---

## Struktur Fail Projek

```
SPKM/
├── Code.js          → Backend GAS (fungsi login, daftar, kehadiran, slip)
├── portal.html      → Muka depan web (login guru + daftar murid)
├── appsscript.json  → Konfigurasi GAS (timezone, runtime)
├── .clasp.json      → Konfigurasi clasp (push ke GAS)
├── SPKM.bat         → Utiliti deployment (Windows)
└── README.md        → Dokumentasi ini
```

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
| `Maklumat Guru` | Data login guru | Timestamp, Email, Nama, IC, Telefon, Alamat |
| `PendaftaranBaru!` | Murid kanak-kanak | Bil, Timestamp, Nama Ibu, Telefon, Nama Anak, MYKID, Email, Alamat, Tahap, Pakej, Kaedah, Slip ID, Slip URL |
| `KelasDewasa!` | Murid dewasa | Nama, Telefon, Email, Alamat, Tahap, Guru, Slip, Dokumen |
| `Kehadiran` | Rekod hadir/tidak | Tarikh, Nama Guru, Nama Murid, Status |
| `Yuran` *(Fasa 2)* | Bayaran bulanan | ID Murid, Bulan, Amaun, Status, Tarikh Bayar |
| `Resit` *(Fasa 2)* | Log resit dijana | ID Resit, ID Murid, Tarikh, URL PDF |

---

## Modul Fasa 1 — Aktif ✅

### 1. Login Guru / Admin
- Semak email + No. WhatsApp dari tab `Maklumat Guru`
- Fungsi: `loginGuru()` dalam Code.gs
- Redirect ke dashboard jika sepadan
- Kata laluan = No. WhatsApp (sistem mudah, sesuai untuk skala kecil)

### 2. Pendaftaran Murid Kanak-kanak
- Form 3 langkah: (1) Maklumat Ibu Bapa → (2) Maklumat Murid → (3) Pakej & Kaedah
- Fungsi: `registerKanak()`
- Auto-jana: Bil. pendaftaran + Timestamp
- Output: Data masuk tab `PendaftaranBaru!`
- Autocrat: Jana slip PDF → isi kolum `Merged Doc ID` & `Merged Doc URL`
- Email: Slip dihantar ke emel ibu bapa secara automatik

### 3. Pendaftaran Murid Dewasa
- Form satu halaman: Nama, Telefon, Email, Alamat, Tahap, Guru (pilihan)
- Fungsi: `registerDewasa()`
- Auto-jana: ID murid format `D[tarikh]-[baris]`
- Output: Data masuk tab `KelasDewasa!`

### 4. Rekod Kehadiran
- Guru isi melalui Google Form atau portal
- Fungsi: `attendance()`
- Status sah: **Hadir / Tidak Hadir / Cuti / Lambat**
- Output: Data masuk tab `Kehadiran`
- Dashboard: Papar statistik dalam Looker Studio

---

## Modul Fasa 2 — Dalam Perancangan 🔧

### 5. Pengurusan Yuran Bulanan
**Objektif:** Rekod bayaran yuran setiap murid setiap bulan.

**Cadangan aliran:**
1. Admin buka modul Yuran dalam dashboard
2. Pilih nama murid + bulan
3. Tandakan: Belum Bayar / Sudah Bayar / Tunggakan
4. Data masuk tab `Yuran`
5. Trigger: Jana resit automatik jika status = Sudah Bayar

**Kolum cadangan tab `Yuran`:**
- ID Yuran, ID Murid, Nama Murid, Bulan, Tahun, Amaun (RM), Status, Tarikh Bayar, Kaedah Bayar, Catatan

### 6. Janaan Resit Yuran (Auto)
**Objektif:** Resit PDF dijana dan dihantar ke emel ibu bapa / murid apabila yuran dibayar.

**Cadangan aliran:**
1. Admin tandakan yuran = Dibayar
2. Trigger memanggil `generateResit()`
3. Salin template resit (Google Docs)
4. Isi: nama murid, bulan, amaun, tarikh, no. resit
5. Simpan ke Google Drive
6. Hantar PDF ke emel → masuk tab `Resit`

**Format No. Resit:** `RST-YYYYMM-[running no.]`

### 7. Notifikasi Peringatan Yuran
**Objektif:** Hantar peringatan automatik kepada ibu bapa yang belum bayar yuran.

**Cadangan:**
- Trigger bulanan (1hb setiap bulan): semak tab `Yuran` untuk status Belum Bayar
- Hantar emel peringatan dengan pautan bayaran
- Boleh tambah WhatsApp API (Twilio / WA Business) untuk mesej terus

### 8. Sijil Khatam
**Objektif:** Jana sijil tamat pengajian untuk murid yang telah khatam Al-Quran.

**Cadangan aliran:**
1. Admin tandakan murid sebagai Khatam dalam tab `PendaftaranBaru!` atau `KelasDewasa!`
2. Sistem jana sijil dari template Google Slides/Docs
3. Isi nama, tarikh, guru, cop mohor (logo)
4. Hantar ke emel + simpan ke Drive

### 9. Laporan Tahunan
**Objektif:** Laporan ringkasan untuk semua AJK pada akhir tahun.

**Kandungan laporan:**
- Jumlah murid baru mendaftar (bulanan/tahunan)
- Peratus kehadiran per murid, per guru
- Kutipan yuran vs tunggakan
- Statistik tahap pengajian (breakdown Iqra 1-6, Al-Quran, Hafazan)
- Export ke Google Slides atau PDF

---

## Cadangan Tambahan (Roadmap)

| Modul | Keterangan | Keutamaan |
|---|---|---|
| **Leaderboard Hafazan** | Papan ranking murid hafaz surah | Rendah |
| **Log Buku Iqra** | Rekod muka surat / surah sesesi kelas | Sederhana |
| **Jadual Kelas** | Google Calendar terintegrasi, tunjuk jadual guru-murid | Sederhana |
| **Notifikasi WhatsApp** | Integrasi WA Business API untuk resit & peringatan | Tinggi |
| **Multi-Guru Dashboard** | Setiap guru lihat senarai murid masing-masing sahaja | Sederhana |
| **Portal Murid Dewasa** | Murid dewasa boleh semak rekod kehadiran sendiri | Rendah |
| **Bayaran Online** | Integrasi Billplz / ToyyibPay untuk bayaran terus | Tinggi |
| **Gamifikasi** | Lencana kehadiran penuh, streak kelas berturut-turut | Rendah |

---

## Aliran Keseluruhan Sistem

```
┌─────────────────────────────────────────────────────────┐
│                  LAPISAN PENGGUNA                       │
│                                                         │
│  [Guru/Admin]      [Ibu Bapa]        [Guru (Hadir)]    │
│  Login portal    Daftar murid       Rekod kehadiran    │
└────────┬──────────────┬──────────────────┬──────────────┘
         │              │                  │
         ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│           BACKEND — Google Apps Script (Code.gs)        │
│                                                         │
│  loginGuru()   registerKanak()  registerDewasa()        │
│                    ↓                attendance()         │
│              generateSlipKanak()                        │
│                    ↓                                    │
│            hantarEmailSlip()                            │
└────────┬──────────────┬──────────────────┬──────────────┘
         │              │                  │
         ▼              ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE — Google Sheets                   │
│                                                         │
│  Maklumat Guru  PendaftaranBaru!  KelasDewasa! Kehadiran│
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     [Autocrat/GDrive]        [Looker Studio]
     Jana slip PDF             Dashboard laporan
     → Email ibu bapa          Statistik kehadiran
```

---

## Teknologi & Dependensi

| Komponen | Teknologi | Catatan |
|---|---|---|
| Frontend | HTML5 + CSS + Vanilla JS | Dalam portal.html |
| Backend | Google Apps Script (V8) | Code.gs |
| Database | Google Sheets | 4 tab utama |
| Penjanaan Slip | Google Docs + DriveApp | Template kena disetup |
| Penghantaran Email | MailApp (GAS built-in) | Limit 100 emel/hari (free) |
| Dashboard | Looker Studio | Sambung terus ke Sheets |
| Version Control | Git + GitHub + clasp | SPKM.bat untuk deploy |
| Timezone | Asia/Kuala_Lumpur | Dalam appsscript.json |

---

## Setup Awal (Senarai Semak)

- [ ] Deploy Code.gs sebagai Web App (Execute as: Me, Who has access: Anyone)
- [ ] Salin URL deploy → tampal dalam `portal.html` (pemboleh ubah `GAS_URL`)
- [ ] Buat template slip dalam Google Docs → salin Doc ID
- [ ] Buat folder output dalam Google Drive → salin Folder ID
- [ ] Jalankan `setScriptProperties()` dalam editor GAS
- [ ] Jalankan `createTriggers()` sekali untuk pasang trigger automatik
- [ ] Sambung Sheets ke Looker Studio untuk dashboard

---

## Nota untuk AJK

1. **Data murid** disimpan dalam Google Sheets — boleh diakses terus oleh mana-mana AJK yang diberi akses
2. **Slip pendaftaran** dijana automatik dan dihantar ke email ibu bapa — tiada kerja manual
3. **Kehadiran** boleh direkod dari mana-mana peranti melalui portal
4. **Kata laluan guru** = No. WhatsApp — mudah diingat, boleh ditukar bila-bila masa dalam Sheets
5. **Modul yuran** akan dibangunkan dalam Fasa 2 — sila berikan maklum balas tentang keperluan semasa

---

*Sistem ini dibangunkan dengan Google Apps Script dan tidak memerlukan sebarang hosting berbayar. Semua data tersimpan dalam Google Drive.*
