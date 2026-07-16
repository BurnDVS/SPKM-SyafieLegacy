# SPKM Project Credentials (LOCAL ONLY - JANGAN COMMIT)

## URLs
- GAS URL Desktop: https://script.google.com/macros/s/AKfycbxd0jFmZw00kGbx4ykSwRSIsGXXbZNTqxHDJWM9ZyAimbOn9Xie_irhm2TRfn0qWEJ1/exec
- GitHub Pages Mobile: https://shafielegacy.github.io/SPKM

## Spreadsheets
- Spreadsheet Utama: 1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU
- Spreadsheet Kehadiran: 1qez9OLXmJuU0nFCBnbuZqjc_DnTJh7kMElqCRnxK7F4

## Repos
- Repo Utama (BurnDVS): https://github.com/BurnDVS/SPKM-SyafieLegacy
- Repo Pages (shafielegacy): https://github.com/shafielegacy/SPKM

---

## 16 Jul 2026 — Pertukaran Guru layout fix, Session refresh-logout fix, Murid Tanpa Guru (baru), Git corruption incident

**Fix layout Pertukaran Guru (portal.html + index.html):**
- Bug: panel `#seksyenPertukaranGuru` diletak SEBAGAI SIBLING di luar `<section id="panel-guru">` (bukan child), jadi visibility dia cuma dikawal `isAdmin` check tanpa kira panel active — bocor ke SEMUA page admin.
- Fix: pindah jadi child dalam `panel-guru`, letak SEBELUM jadual `table#guruTable` (Pertukaran Guru → Senarai Guru → jadual). `#modalPertukaranConfirm` kekal di luar (modal global).

**Fix Session Refresh-Logout (regression dari fix 23 Jun — rujuk CHANGELOG.md untuk butiran penuh):**
- Bug: `_spkm_st = _isMobile ? localStorage : sessionStorage` — desktop guna sessionStorage (hilang lepas refresh dalam beberapa kes), `tryAutoLogin()` ada `if (!_isMobile) return;` — desktop terus skip restore session bila refresh.
- Fix: `_spkm_st = localStorage` untuk SEMUA device. `tryAutoLogin()` rewrite — baca token dari localStorage, panggil `renewSession()` (backend, TAK diubah) untuk validate dengan server SEBELUM restore UI. `success:false` (token invalid/expired) → clear + papar login. Network/exception error → KEKALKAN localStorage, papar retry state ("Cuba Semula") — supaya tak logout palsu bila internet naik-turun.
- index.html rupanya ADA bug lagi teruk — `.catch()` dalam `tryAutoLogin()` clear localStorage untuk SEMUA jenis error (termasuk network failure). Diperbetulkan sekali.

**Fitur baru — Murid Tanpa Guru (Code.js + portal.html + index.html):**
- `getMuridTanpaGuru()` — scan PendaftaranBaru+KelasDewasa, filter STATUS AKTIF (pattern `status && status !== 'AKTIF'`, permissif untuk STATUS kosong) DAN kolum GURU kosong.
- `assignGuruMurid({adminEmail, namaGuru, senarai})` — guna `Bil` sebagai identifier (bukan row index), safety check DUA lapis: (1) tolak kalau GURU row tu sudah terisi (anti-overwrite), (2) tolak kalau nama tak match jangkaan. Log ke `LogPertukaranGuru` sedia ada dengan `Guru Lama = "(Tiada)"` untuk bezakan dari pertukaran biasa. Partial success disokong (`ralat[]`).
- Panel admin "👤 Murid Tanpa Guru" — page Kehadiran, letak SEBELUM tab-switcher (Statistik/Rekod Individu/Rekod Kehadiran), admin-only.
- Verified live: senarai keluar tepat, termasuk 2 nama acceptance test asal (6 Jul) + murid baru daftar.

**Insiden — Accidental delete + Git repo corruption:**
- Fail projek accidentally delete, recovered dari OneDrive Recycle Bin + PC Recycle Bin.
- Git repo lama (`SPKM/.git`) didapati ada SATU blob corrupt dalam sejarah (versi lama `CHANGELOG.md`, hash `ab5198c6...`) — punca `git fetch`/`push`/`repack` sentiasa gagal dengan `fatal: unable to read ... / geometric-repack failed`. Fail kerja SEMASA (portal.html, index.html, dll) TIDAK terjejas — cuma satu snapshot lama dalam `.git`.
- Fix: clone fresh repo (`SPKM_fresh`) dari `origin`, copy fail kerja terkini masuk, commit+push dari situ (berjaya). Folder lama direname `SPKM_OLD_CORRUPT` (backup, belum padam). Folder fresh direname jadi `SPKM` — path terkini di REFERENCE.md.
- Git remotes (`origin` + `pages`) perlu di-`git remote add` semula lepas clone fresh (clone hanya bawa satu remote).
- Pengajaran: kalau git error "geometric-repack" / "unable to read \<hash\>", JANGAN cuba repair repo sama — terus clone fresh + pindah fail kerja.

**Deploy notes:**
- GAS deployed 3 kali: Version 172 (layout awal), 173 (session fix + layout final), 174 (Murid Tanpa Guru).
- Commits: `568ccd0` (session fix), `163a521` (index.html layout+session), `b179f3d` (Murid Tanpa Guru backend+portal), `73f1f04` (Murid Tanpa Guru index.html).
- Git pushed ke `origin` (semua commit) DAN `pages` (index.html sahaja — Code.js/portal.html duduk dalam repo Pages tanpa kesan runtime, sebab diserve dari GAS bukan GitHub Pages).
- `sw.js`/`CHANGELOG.md` (kerja Update Available Popup) masih uncommitted — belum siap, tak terlibat dalam push ni.

---

## 30 Jun 2026 — Duplicate Registration Guard + Yuran Name Normalization

**Fix keselamatan pendaftaran:**
- Kanak-kanak: duplicate `NO_MYKID` disekat dalam `sendOTPKanak`, `confirmRegisterKanak`, dan `registerKanak`.
- Dewasa: duplicate `NO_MYKAD` disekat dalam `sendOTPDewasa`, `confirmRegisterDewasa`, dan `registerDewasa`.
- MyKid/MyKad dinormalize sebelum compare: dash, spacing, dan simbol dibuang, uppercase.
- Jika rekod sedia ada status `TIDAK AKTIF`, parent tidak boleh daftar baru; mesej minta hubungi admin untuk aktifkan semula.

**Fix yuran:**
- `getYuranStats()` normalize nama dalam `sudahBayarSet` dan `eligibleSet2` dengan:
  `replace(/\s+/g, ' ').trim().toUpperCase()`
- Tujuan: elak mismatch nama sudah bayar vs eligible bila ada double spaces.

**Deploy notes:**
- `clasp login` sempat gagal dengan OAuth `Premature close`; fallback dibuat dengan copy manual `Code.js` ke GAS editor.
- GAS dideploy manual sebagai new web app version.
- Commit: `fa76f73` — `fix: prevent duplicate registration by mykid and mykad`
- Git pushed ke dua remote: `origin` dan `pages`.

---

## 14 Jun 2026 — Fix Kehadiran Stats (getMuridByGuru & getKehadiranStats)

**Masalah:** Panel "Rekod Kehadiran" dan "Statistik Kehadiran" untuk guru menunjukkan jumlah murid yang salah (57/60 berbanding sebenar 71 untuk Ustaz Shafie), kerana totalMurid dikira dari rekod kehadiran sedia ada, bukan dari enrollment sebenar.

**Fix:**
- Tambah `GURU: 16` (col Q, Nama Guru) ke `COL_KANAK` dalam Code.js
- `getMuridByGuru(params)` kini baca enrollment terus dari `PendaftaranBaru` (col Q = GURU) + `KelasDewasa` (col R = GURU), filter STATUS=AKTIF, dedupe, sort A-Z. Tidak lagi guna tab "Pecahan Murid Mengikut Guru Kelas" (sumber lama, tidak up-to-date).
- `getKehadiranStats(params)` terima param `namaGuru` opsyenal:
  - Bila ada `namaGuru`: guna `cariTabGuru()` cari tab spesifik guru dalam KEHADIRAN_SS_ID, scan attendance untuk `hadirMap`, dan `totalMurid` = enrollment count dari `getMuridByGuru()` (bukan attendance count). Return juga `unmatched[]` untuk debug nama yang tak match.
  - Tanpa `namaGuru` (admin view): behavior asal dikekalkan — scan semua sheet, totalMurid = byMurid.length.
- Frontend (`index.html` ~line 5207, `portal.html` ~line 5043): `loadKehadiranStats()` kini hantar `namaGuru: loggedInGuru` dalam payload bila `currentRole !== 'ADMIN'`.

**Verified:** Ustaz Shafie = 71 murid AKTIF, totalSesi 159, unmatched [].

**Deploy notes:**
- GAS deployed sebagai Version 149 (14 Jun 2026)
- PENTING: `clasp push` hanya update source code editor — TIDAK update web app URL live. Mesti buat **Deploy → Manage deployments → Edit deployment → New version → Deploy** untuk apply kod baru ke production.
- Git pushed ke kedua-dua remote: `origin` (BurnDVS/SPKM-SyafieLegacy) dan `pages` (shafielegacy/SPKM)
