# SPKM — Reference Cheat Sheet

Rujukan pantas semua akaun, ID, URL, dan langkah deploy untuk projek SPKM (Sistem Pengurusan Kelas Mengaji — Syafie Legacy). Kemaskini fail ni bila ada perubahan struktur.

> **Checkpoint berkuat kuasa: 30 Ogos 2026.** `origin/main` berada pada `076f68a`; production `pages/main` berada pada `7b5476e`. Apps Script production ialah Version 177 dan mengandungi Native Slides receipt. August V2 ialah 67/67 groups `Synced` dan Legacy vs V2 `Match`. Transaksi Native sebenar pertama masih pending pada atau selepas 1 September. Lihat `CURRENT_STATUS.md` untuk handoff penuh. Nota lama di bawah ialah rekod sejarah dan tidak mengatasi checkpoint ini.

---

## 📁 Local Project

```
Path: C:\Users\burnk\OneDrive\Documents-assets\SPKM
```

Folder aktif yang disahkan untuk checkpoint ini ialah path di atas. Insiden repository corrupt pada 16 Julai kekal direkodkan di bahagian "Git Repo Corruption" sebagai amaran sejarah; jangan anggap path pada mesin lain sebagai workspace aktif tanpa menyemaknya sendiri.

---

## 👤 Akaun Google/GitHub

| Akaun | Kegunaan |
|---|---|
| `shafielegacykelasmengaji@gmail.com` | **GAS owner** — wajib login akaun ni untuk `clasp push` (project SPKM Apps Script) |
| `burn.kajang@gmail.com` | Akaun peribadi Burn — shared access untuk MCP (Google Drive/Sheets), bukan owner GAS |
| GitHub `BurnDVS` | Akaun GitHub peribadi Burn — owner repo `origin` |
| GitHub `shafielegacy` | Akaun GitHub organisasi/projek — owner repo `pages` (live site) |

⚠️ **Kalau `clasp push` bagi error "Drive ACL permission denied"** → credential salah akaun. Fix:
```powershell
clasp logout
clasp login
```
Login dengan `shafielegacykelasmengaji@gmail.com` (guna `clasp login` plain, JANGAN `--no-localhost`).

⚠️ **Kalau `clasp login` / `clasp login --no-localhost` gagal dengan OAuth `Premature close`**:
```powershell
clasp logout
clasp login --no-localhost
```
Jika masih gagal dan deployment urgent, buat fallback manual:
1. Buka GAS editor
2. Copy isi `Code.js` local ke `Code.gs`/`Code.js` dalam editor
3. Save
4. **Deploy → Manage deployments → Edit → New version → Deploy**

⚠️ **Kalau `git push origin` bagi error credential GitHub salah akaun** → clear cached credential:
```powershell
cmdkey /delete:LegacyGeneric:target=git:https://github.com
```
Lepas tu push semula, login sebagai `BurnDVS` bila diminta.

---

## 🔗 Git Remotes (DUA repo, DUA tujuan)

| Remote | Repo | Tujuan |
|---|---|---|
| `origin` | `BurnDVS/SPKM-SyafieLegacy` | Dev/source code backup (akaun peribadi Burn) |
| `pages` | `shafielegacy/SPKM` | **Production/live** — connect ke GitHub Pages |

🌐 **Live URL:** `https://shafielegacy.github.io/SPKM`

Current remote checkpoints:

- `origin`: `https://github.com/BurnDVS/SPKM-SyafieLegacy.git`, `origin/main` at `076f68a`.
- `pages`: `https://github.com/shafielegacy/SPKM.git`, production `pages/main` at `7b5476e`.

### Aliran push yang selamat
```powershell
git status --short
git fetch origin
git fetch pages
git log --oneline --left-right origin/main...main
git log --oneline --left-right pages/main...main
```

Stage hanya fail yang memang berada dalam skop; jangan guna `git add .` secara automatik. Push development dengan `git push origin main`. Push ke `origin` sahaja tidak mengemas kini website live.

Checkpoint Pages semasa diterbitkan melalui detached worktree berasingan di `C:\Users\burnk\OneDrive\Documents-assets\SPKM-pages-publish` menggunakan `git push pages HEAD:main`. Kekalkan worktree itu dan semak divergence sebelum publication seterusnya. Kaedah `git push pages main:main` dari workspace utama hanya sesuai jika commit yang hendak diterbitkan memang sama dengan `main` dan telah disemak.

⚠️ **Sebelum push ke `pages`, semak dulu fail apa yang akan terpush** (kalau ada kerja WIP yang belum siap dalam commit lain):
```powershell
git fetch pages
git diff --stat pages/main main
```
`Code.js` dan `portal.html` boleh push ke `pages` dengan selamat walaupun tak berkaitan PWA — dua-dua fail ni diserve dari GAS (`doGet`), BUKAN dari GitHub Pages, jadi duduk je dalam repo Pages tanpa kesan runtime. Hanya `index.html`/`sw.js`/`config.json`/`manifest.json` yang benar-benar live di Pages.

### 🚨 Git Repo Corruption ("geometric-repack failed")

Kalau `git fetch`/`push`/`commit`/`repack` tiba-tiba gagal dengan:
```
fatal: unable to read <hash>
error: failed to perform geometric repack
error: task 'geometric-repack' failed
```
Ni tanda ada **satu atau lebih blob git corrupt/hilang** dalam sejarah repo (bukan fail kerja semasa — `git status`/`git diff --stat` akan confirm fail kerja masih OK). Biasanya berpunca dari insiden delete/recovery OneDrive/PC yang tak lengkap.

**JANGAN cuba repair repo yang sama** (`git repack`, `git fsck` tak selesaikan masalah tanpa restore blob asal yang hilang). Cara paling cepat & selamat:
1. **Backup** fail kerja SEMASA (copy manual ke folder lain) — jangan skip.
2. Clone repo fresh dari `origin` ke folder baru:
   ```powershell
   git clone https://github.com/BurnDVS/SPKM-SyafieLegacy.git SPKM_fresh
   ```
3. Copy fail kerja terkini (dari backup) masuk `SPKM_fresh`, overwrite.
4. `git add`, `git commit`, `git push origin main` dari `SPKM_fresh`.
5. Tambah semula remote `pages` (clone fresh cuma bawa satu remote):
   ```powershell
   git remote add pages https://github.com/shafielegacy/SPKM.git
   git fetch pages
   ```
6. Rename folder lama → `SPKM_OLD_CORRUPT` (backup), rename `SPKM_fresh` → `SPKM`.

⚠️ Kalau `git push` bagi 403 selepas ni, kemungkinan Windows Credential Manager / browser session tersangkut akaun GitHub lain — rujuk fix credential di atas, atau guna Personal Access Token terus:
```powershell
git remote set-url origin https://<TOKEN>@github.com/BurnDVS/SPKM-SyafieLegacy.git
```

### ⚠️ Guna OneDrive di 2 mesin (desktop + laptop) — punca corrupt yang mungkin berulang

Project ni sengaja diletak dalam OneDrive-synced folder (`D:\OneDrive\...` di desktop, `C:\Users\burnk\OneDrive\...` di laptop) supaya senang kerja di mana-mana tanpa external drive. TAPI OneDrive sync fail `.git` internals secara file-level, BUKAN guna protokol git — ini risiko sebenar punca insiden corrupt blob (16 Jul 2026).

**Peraturan wajib untuk elak corrupt berulang:**
1. **Confirm OneDrive "Up to date" (☁️ hijau, bukan berputar)** SEBELUM tutup satu mesin dan pindah ke mesin lain.
2. **Tunggu OneDrive habis sync** di mesin baru SEBELUM buka terminal/run git command.
3. **Jangan buka projek serentak** (editor/terminal) di dua mesin pada masa sama.
4. **`git push` di hujung sesi kerja, `git pull` di permulaan sesi kerja** — WAJIB, jangan harap OneDrive punya sync cukup untuk git internals. Kalau `git pull` bagi "local changes would be overwritten" sedangkan Burn tak edit apa-apa sengaja, ni tanda OneDrive dah "raw-sync" kandungan fail tanpa git tahu — check `git diff --stat <fail>` dulu, kalau padan dengan commit yang nak di-pull, selamat `git restore <fail>` baru `git pull`.
5. **Health-check berkala**: `git fsck --full` di kedua-dua mesin sekali-sekala, terutama lepas insiden pelik — tangkap corrupt awal sebelum jadi masalah besar.

---

## ⚙️ Google Apps Script (GAS)

| Item | Value |
|---|---|
| Script ID | `1kYWTdqLEhGQbMZIuA2F5N-Z_VNVYGFYYROn16vVkg-6iS1ozJkllUgoW` |
| Owner akaun | `shafielegacykelasmengaji@gmail.com` |
| Buka editor | `clasp open` atau `https://script.google.com/d/1kYWTdqLEhGQbMZIuA2F5N-Z_VNVYGFYYROn16vVkg-6iS1ozJkllUgoW/edit` |

`.clasp` tracks exactly `appsscript.json`, `Code.js`, `portal.html` dan `TestWA.js`; `.claspignore` mesti mengandungi `tests/**`. Apps Script `@HEAD` telah dikemas kini melalui clasp push dan sepadan dengan source terkini. Existing production Web App kini Version 177 pada deployment ID dan `/exec` URL yang sama; description ialah `SPKM Native eBayar production - September 2026`. Slides receipt source termasuk dalam Version 177.

### 🚨 LANGKAH WAJIB lepas `clasp push`
`clasp push` HANYA update editor/source Apps Script — ia **TIDAK** mengubah production behavior dan **TIDAK** menukar URL Web App production.

Untuk apply kod baru ke production selepas `/dev` diluluskan secara eksplisit:
1. Buka GAS editor (`clasp open`)
2. **Deploy** → **Manage deployments**
3. Klik ikon pensel (Edit) pada deployment "Web app" yang aktif
4. Version → **New version**
5. **Deploy**

Ini mengemas kini existing active Web App deployment kepada versi source baharu sambil mengekalkan URL production yang sama. Jangan gunakan **New deployment** kecuali deployment berasingan memang dimaksudkan. Tanpa langkah ini, perubahan source tidak akan mempengaruhi production walaupun `clasp push` berjaya.

---

## 📊 Spreadsheet IDs

| Spreadsheet | ID | Kegunaan |
|---|---|---|
| SPKM Main DB (+ eBayar 2025) | `1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU` | **Satu fail multi-purpose**: Maklumat Guru, PendaftaranBaru, KelasDewasa, Kehadiran (Fasa 1 data) **DAN** tab eBayar 2025 (Mei–Dis) — sebab semua pendaftaran murid baru (kanak-kanak & dewasa) masuk sini, jadi data yuran 2025 sekali dalam fail ni. Tab `LogPertukaranGuru` (ditambah 30 Jun 2026) — log audit Pertukaran Guru, 7 kolum: `Timestamp \| Admin \| Guru Lama \| Guru Baru \| Nama Murid \| Jenis Murid \| Bil` |
| eBayar 2026 (Jan–present) — `YURAN_SS_ID` | `1AUH-ZwrbDjB5l2J5H8t2MBlbzkITMJp66J2VDLZF9CM` | Tab per bulan (JAN2026...DIS2026), NAMA MURID, Calculation* |
| eBayar Master V2 — `EBAYAR_MASTER_SS_ID` | Script Property | Canonical `Payments` table. Migrasi/reconciliation Januari–Ogos 2026 selesai dan Version 177 deployed; real Native first-transaction verification masih pending. |
| Kehadiran — `KEHADIRAN_SS_ID` | `1qez9OLXmJuU0nFCBnbuZqjc_DnTJh7kMElqCRnxK7F4` | Satu tab per guru, scan via `cariTabGuru()`. Tab kini boleh ada 9 kolum (A–G original + H=`Guru Tetap`, I=`Guru Hadir`, ditambah 30 Jun 2026 untuk sokongan relief/backup guru). Tab lama auto-upgrade header H/I bila pertama kali terima rekod relief; data sedia ada (sebelum upgrade) kosong untuk 2 kolum ni — itu normal. |
| Sijil Khatam | `1jGp9U6lYRBvAVPSHhqSLv2WL5MHxdmKP5f5AnTHC8xU` | Tab "Khatam Iqra'" + "Khatam Quran" |

### eBayar Master / Native eBayar — Current Checkpoint

- Januari–Ogos 2026 kekal legacy-only. Native eBayar bermula September 2026.
- Migrasi/reconciliation V2 Januari–Ogos selesai. Final 30 Ogos: 67 source groups, 67 existing, 0 new dan 0 new child rows, status `Synced`; Legacy vs V2 `Match`, 104 paid, 82 unpaid, 186 total dan RM3,640.
- Snapshot 16 Ogos (46 groups, 69 child rows, RM2,520 melalui source row 47) telah digantikan oleh final sync 29 Ogos: 20 groups, 34 child rows dan RM1,060 ditambah sekali sahaja.
- Satu anomali sejarah kekal: `GROUP_ID_MULTIPLE_STAGED_HASHES` pada `PG-2026-JUN2026-112`; tidak berkaitan catch-up Julai/Ogos.
- Portal Mode: `AUTO`, `LEGACY`, `NATIVE`, `BOTH`; property `EBAYAR_PORTAL_MODE`, fallback `AUTO`, cutoff `2026-09-01` MYT. Audit menggunakan `EBAYAR_PORTAL_MODE_UPDATED_AT` dan `EBAYAR_PORTAL_MODE_UPDATED_BY`.
- Current configured mode telah dipulihkan kepada `AUTO`: sebelum 1 September resolve `LEGACY`; mulai 1 September resolve `NATIVE` mengikut Malaysia time.
- Native identity: `KANAK:<BIL>` / `DEWASA:<BIL>`. MyKid/MyKad tidak digunakan sebagai public selector. Native duplicate check menggunakan `STUDENT_ID`; historical blank IDs menggunakan conservative normalized-name fallback.
- Phase 2A (`d171e8c`) menggunakan duplicate recheck di bawah lock, satu bulk write, slip validation maksimum 3 MB, cleanup dan post-write verification.
- Phase 2B asal (`612128e`) menghasilkan maksimum satu receipt PDF per group secara idempotent, dengan lock berasingan dan satu `RESIT_URL` dikongsi semua child rows. Commit `15d7991` menggantikan hanya rendering layer dengan existing Google Slides template; `0b1d10b` memuktamadkan preview sintetik.
- `NATIVE_EBAYAR_SLIP_FOLDER_ID`: semak configured value dalam Apps Script Script Properties. Folder `SPKM - Native eBayar Slips` wajib private/restricted dan tidak boleh link-share.
- `NATIVE_EBAYAR_RECEIPT_FOLDER_ID`: semak configured value dalam Apps Script Script Properties. Folder `SPKM - Native eBayar Receipts` sebaiknya Restricted; hanya final PDF boleh anyone-with-link/view.
- `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID`: `1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`; template satu slide landscape 576 × 288 pt dengan placeholders nama, bulan, nombor resit, tarikh dan bayaran.
- `NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID`: folder berasingan untuk output helper sintetik `testCreateNativeEbayarReceiptSlidesPreviewV2`; jangan gunakan production receipt folder.
- Rendering flow: copy template, replace semua placeholders, export PDF, trash temporary Slides copy dalam cleanup. Multiple child names menggunakan balanced wrapping/font reduction. Production receipt tiada watermark.
- Preview September sintetik dua anak/RM100 dengan `CONTOH / TIDAK SAH` berjaya dan menggunakan real Slides-to-PDF path tanpa payment row atau production receipt record.
- Auto Sync hardening `391f164` binds exact confirmed preview IDs, validates 1–25 unique IDs, rejects stale IDs, adds a 120-second settlement timeout and preserves no-retry handling. Full local suite selepas Slides work: 14 passed, 0 failed.
- Tambahan 30 Ogos: satu August group, 2 child rows dan RM60.00, disync sekali walaupun browser transport uncertain. Tiada retry; refresh mengesahkan 67 existing, 0 new dan Legacy vs V2 `Match`.
- Production Version 177 (`SPKM Native eBayar production - September 2026`) menggunakan existing deployment identity dan `/exec` URL serta merangkumi Slides receipt implementation.
- GitHub Pages routing: Januari–Ogos kekal pada original Legacy Google Forms. September–Disember membuka production `/exec` mengikut Malaysia time: September pada 1 September, Oktober pada 1 Oktober, November pada 1 November dan Disember pada 1 Disember 2026. Future months disabled dan tiada public `/dev` route.
- PWA Dashboard Yuran memaparkan shortcut `eBayar V2 Maintenance` hanya kepada authenticated `ADMIN`, membuka production `/exec` dalam protected new tab. Backend Admin authorization kekal authoritative. Full maintenance UI kekal di Apps Script portal; exact duplicate dalam PWA ialah optional future scope.
- Tiada real Native payment, upload atau receipt test lagi; milestone pertama kekal pending pada atau selepas 1 September.

Schema `Payments`:

`PAYMENT_ID`, `PAYMENT_GROUP_ID`, `TIMESTAMP`, `TAHUN`, `BULAN`, `BULAN_KEY`, `NAMA_MURID_RAW`, `NAMA_MURID_NORM`, `STUDENT_ID`, `NO_MYKID_MYKAD`, `STUDENT_TYPE`, `JUMLAH`, `AMOUNT_TOTAL`, `AMOUNT_ALLOCATED`, `STATUS`, `KAEDAH`, `RESIT_URL`, `SOURCE_YEAR`, `SOURCE_SHEET`, `SOURCE_ROW`, `SOURCE_ROW_HASH`, `MATCH_STATUS`, `MATCH_CONFIDENCE`, `NOTE`, `CREATED_AT`, `UPDATED_AT`.

### Historical Queue #9 Foundation — Superseded Status

The following notes preserve the initial 1 July staging foundation. Their progress totals and "next steps" are historical; use the current checkpoint above for present state.

- Queue #9 foundation began as backend-only shadow work. The original legacy functions were kept during that initial phase.
- Script Property: `EBAYAR_MASTER_SS_ID` — set successfully on 1 Jul 2026.
- Staging spreadsheet name: `SPKM eBayar Master` — created on 1 Jul 2026.
- Canonical tab: `Payments`, one table for all years.
- Schema initialized with tabs: `Payments`, `Config`, `ImportLog`, `MonthlySummary`, `YearlySummary`, `StudentsSnapshot`.
- `Payments` row 1 has full headers from `PAYMENT_ID` through `UPDATED_AT`.
- `PAYMENT_GROUP_ID` = one original source row/resit/payment. `PAYMENT_ID` = one student-level row.
- `clasp push` succeeded with `shafielegacykelasmengaji@gmail.com`, but no GAS web app deployment was done.
- Source audit completed:
  - 2025 source group from Main DB: `Yuran Mei`, `Yuran Jun`, `Yuran Julai`, `Yuran Ogos`, `Yuran September`, `Yuran Oktober`, `Yuran November`, `Yuran Disember`. These source tabs contain actual `TAHUN` 2024 data.
  - 2026 source group from `YURAN_SS_ID`: `JAN2026`, `FEB2026`, `MAC2026`, `APRIL2026`, `MEI2026`, `JUN2026`, `JULAI2026`, `OGOS2026`, `SEPT2026`, `OKT2026`, `NOV2026`, `DIS2026`.
- Confirmed source column mapping:
  - `timestamp` = `Timestamp`
  - `email` = `Email address` / `Email Address`
  - `nama` = `NAMA PENUH ANAK` / `NAMA PENUH MURID`
  - `bulan` = `BAYARAN YURAN BAGI BULAN`
  - `tahun` = `TAHUN`
  - `resit` = `MUAT NAIK RESIT BAYARAN`
  - `jumlah` = `JUMLAH BAYARAN (RM)`
  - `tarikhBayaran` = `TARIKH BAYARAN DIBUAT`
  - `noResit` = `NO RESIT`
  - `status` = `STATUS BAYARAN` / `STATUS`
- Dry-run import totals:
  - 2024 legacy data: 417 source payment rows, 787 generated payment rows, 248 multi-name rows, 13 skipped rows.
  - 2026 data: 447 source payment rows, 768 generated payment rows, 212 multi-name rows, 427 skipped rows.
  - Total: 864 source payment rows, 1555 generated payment rows.
- Duplicate safety: no duplicate `SOURCE_ROW_HASH`, `PAYMENT_GROUP_ID`, or `PAYMENT_ID` in dry-run. Multi-name rows share source group/hash by design but receive unique child `PAYMENT_ID`.
- Staging import status:
  - First small batch imported to `Payments`: 5 source payment groups from 2026 `JAN2026`, producing 7 child payment rows.
  - `Payments` now has 7 imported child rows below the header.
  - Diagnostic: `lastRow=8`, `sourceRowHashColumn=21`, 7 row entries in `SOURCE_ROW_HASH`.
  - Idempotency confirmed on second run: 5 unique existing source hashes, 0 rows to append, 7 duplicate child rows skipped, 0 appended.
  - Next-batch import support uses `skipExistingGroupsFirst:true` to select unimported source groups first.
  - Second batch imported 10 additional source payment groups from 2026, producing 21 more child payment rows.
  - Diagnostic after second batch: `lastRow=29`, `sourceRowHashColumn=21`, 28 row entries in `SOURCE_ROW_HASH`.
  - Third batch imported 10 additional source payment groups from 2026, producing 16 more child payment rows.
  - Diagnostic after third batch: `lastRow=45`, `sourceRowHashColumn=21`, 44 row entries in `SOURCE_ROW_HASH`.
  - Total staging imported so far: 25 source groups -> 44 child payment rows.
- Next steps:
  1. Continue staging-only imports in controlled batches.
  2. Keep import idempotent with `SOURCE_ROW_HASH`.
  3. Keep `AMOUNT_TOTAL` from source row; leave `AMOUNT_ALLOCATED` blank/null when split allocation is unclear.
  4. Run `compareYuranLegacyVsV2` by month before any UI switch.
  5. Deploy/switch UI only in a later task after comparison passes.

---

## 🔥 Firebase (FCM Push Notification) — STATUS: KIV

| Item | Value |
|---|---|
| Project ID | `spkm-syafielegacy` |
| Sender ID | `812576273769` |
| VAPID Key | `BAXOj_r1g0CJyKfuJ1iyku9JSHU3QGGKMPBNSqJ-f3Huv2FBzsAF6Pg8M_QwIfy1R7mSm691BGQiGE6nXDGAhfc` |
| Service Account | Stored dalam GAS Script Properties (`FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `FCM_PROJECT_ID`) |

**Status:** Code.js functions (`simpanDeviceToken`, `getFCMAccessToken`, `hantarFCM`, `simpanNotifikasi`) sudah wujud dan tab `DeviceTokens` sudah ada dalam Main DB (Timestamp, Email, FCM_Token, Device). Frontend integration (`initFCM()` di index.html, `sw.js` push handler) — status perlu disahkan semula, pernah ada isu CSP block Firebase domains (dah dipatch commit `789b259`).

⚠️ Service Account key pernah accidentally screenshot dan telah dirotate sekali — jangan share/screenshot private key.

---

## 🎨 Design System (`portal.html`)

```css
--green:       #0A1F44
--green-mid:   #1A3A6B
--green-light: #E8EEF8
--gold:        #FFD700
--gold-light:  #FFF8DC
--gold-dark:   #B8960C
--cream:       #F8F8F8
```
Fonts: **Lora** (headings) + **DM Sans** (body)

---

## 🧱 Architecture Overview

- **Backend:** Google Apps Script (`Code.js`) + Google Sheets
- **Frontend desktop:** `portal.html` (GAS deployment, `doGet` serves HtmlService)
- **Frontend mobile PWA:** `index.html` (GitHub Pages, `shafielegacy.github.io/SPKM`)
- **GAS URL:** dinamik via `config.json` → key `gasUrl` (BUKAN hardcoded dalam index.html)
- **Mobile fetch:** guna `fetch()` dengan `redirect: 'follow'` (JSONP tak handle GAS redirect pada mobile Chrome)
- **Service Worker:** `sw.js` — bump cache version bila ada update besar untuk force refresh

### Deploy checklist bila GAS URL bertukar
1. Edit `config.json` → tukar `gasUrl`
2. `git add config.json && git commit -m "..." && git push && git push pages main`
3. TAK perlu edit `index.html` atau bump `sw.js` cache version

### Row identifier pattern (Pertukaran Guru + update berstruktur)
Fungsi `tukarGuruMurid` dan fungsi update lain **JANGAN** guna row position (index array) sebagai identifier — data boleh berubah antara `getValues()` dan `setValue()`.

Pattern yang digunakan:
- Match by **`Bil`** (kolum A, index 0) — nilai unik per murid yang tidak berubah walaupun row di-sort atau row lain ditambah.
- Compare sebagai `String(data[i][colBil]).trim() === String(bil).trim()` — handle kes di mana Bil tersimpan sebagai number (formula spreadsheet) atau string (manual entry).
- **Safety check sebelum update:** verify `GURU semasa === guruLama` sebelum tulis `guruBaru`. Elak overwrite jika data sudah berubah sejak checklist dimuatkan (race condition antara `getMuridByGuruUntukTukar` dan `tukarGuruMurid`).
- Item yang gagal safety check masuk `ralat[]` — partial transfer diteruskan untuk item lain yang OK.
- Pattern sama dipakai `assignGuruMurid` (16 Jul 2026) — safety check TAMBAHAN: kolum GURU row tu MESTI kosong dulu (tolak kalau dah ada guru — anti-overwrite), bukan check "GURU semasa === guruLama" macam tukarGuruMurid.

### Session Persistence (localStorage + renewSession) — PENTING, pernah regress sekali

**Prinsip:** `localStorage` (BUKAN `sessionStorage`) dipakai untuk SEMUA device (desktop + mobile) untuk simpan token+user+role. Bila page refresh, `tryAutoLogin()` MESTI:
1. Baca token dari localStorage. Takde token → terus papar login, jangan call API.
2. Ada token → panggil `renewSession()` (backend) untuk **validate dengan server dulu** sebelum restore UI.
3. `success:true` → restore penuh (guru/role dari localStorage yang dah tersimpan, backend tak perlu hantar balik).
4. `success:false` (token invalid/expired) → clear localStorage, papar login + mesej sesi tamat.
5. **Network/exception error** (BUKAN success:false) → **JANGAN clear localStorage**, papar retry state ("Cuba Semula"). Ni yang paling kerap disalah — treat network failure sama macam invalid token punca "asyik logout" bila internet naik-turun.

⚠️ Fix ni PERNAH settle 23 Jun 2026, tapi **regress balik** (portal.html balik guna `_isMobile ? localStorage : sessionStorage` + `tryAutoLogin()` ada early-return untuk desktop) — diperbaiki semula 16 Jul 2026. Kalau isu "refresh = logout" muncul balik lagi-lagi, semak DUA fail (`portal.html` DAN `index.html`) — index.html ada versi bug yang berasingan (lebih teruk, clear storage untuk SEMUA jenis error termasuk network).

---

## 📋 To-Do Status (ringkas)

| # | Item | Status |
|---|---|---|
| 1 | Clay UI | ✅ Selesai |
| 2 | Login Parent | KIV — pending MyDigital ID (SSM registration) |
| 3 | Login Guru | KIV — pending MyDigital ID |
| 4 | Bayaran Online (Billplz/ToyyibPay) | KIV — pending financial |
| 5 | Migrate ke OneDrive | ✅ Selesai |
| 6 | Pecah Code.js multi-file | QUEUE |
| 7 | Sijil Khatam panel | ✅ Selesai |
| 8 | Laporan Tahunan | QUEUE |
| 9 | Canonical eBayar Master + migrasi sejarah Januari–Ogos 2026 | ✅ Selesai dan reconcile |
| 10 | Dashboard Analisa Yuran | V2 readers/maintenance production tersedia; first Native transaction masih pending |
| 11 | eSemak upgrade utk spreadsheet baru | V2 read path production tersedia; first Native transaction masih pending |
| 12 | Murid Tanpa Guru — assign guru pukal (page Kehadiran) | ✅ Selesai (16 Jul 2026) |
| 13 | Statistik Kehadiran admin view — guru lookup gap (`getKehadiranStats` hardcode `guru:''` untuk admin branch) | QUEUE — prompt dah dihantar, belum verify/deploy |
| 14 | Normalize double-whitespace nama murid (`KEHADIRAN_SS_ID`) | QUEUE |
| 15 | Update Available Popup (PWA) — `version.json`+`APP_VERSION`+`sw.js` | IN PROGRESS — uncommitted, rujuk pattern SPDK |
| — | FCM Push Notification | KIV |

---

## ✅ Recent Safety Fixes

### 30 Jun 2026 — Duplicate Registration Guard
- Kanak-kanak: duplicate `NO_MYKID` disekat dalam `sendOTPKanak`, `confirmRegisterKanak`, dan `registerKanak`.
- Dewasa: duplicate `NO_MYKAD` disekat dalam `sendOTPDewasa`, `confirmRegisterDewasa`, dan `registerDewasa`.
- ID dinormalize sebelum compare, jadi format dengan dash/space tetap match.
- Rekod `TIDAK AKTIF` tidak boleh daftar semula; admin perlu aktifkan semula dari senarai murid.
- Commit: `fa76f73`

### 30 Jun 2026 — Yuran Name Normalization
- `getYuranStats` normalize nama dalam `sudahBayarSet` dan `eligibleSet2` dengan whitespace collapse.
- Tujuan: elak mismatch bila nama ada double spaces atau spacing pelik.

---

## 🔧 Workflow

- **Claude.ai** (chat ini): planning, review code, architecture decisions, MCP tasks (baca Google Drive/Sheets)
- **Claude Code**: editing fail, `clasp push`, git commit/push — TIDAK ubah logic tanpa arahan tepat dari Claude.ai
- Untuk perubahan logic kompleks: paste full code di Claude.ai → dapat diff/replacement tepat → manual edit di VS Code → Claude Code handle git/clasp

### Known issues
- Claude Code heredoc/paste boleh corrupt code blocks panjang — guna PowerShell `Add-Content` dari fail temp sebagai fallback
- Python tak available — PowerShell adalah scripting fallback
- `UPKK Bahasa Arab` = projek lain, TAK berkaitan SPKM
- `clasp login --no-localhost` — bila browser redirect ke localhost fail, paste FULL URL (termasuk `http://localhost:8888/?iss=...`) dalam terminal, bukan code sahaja. URL expires cepat, copy terus lepas browser buka.

### ⚠️ Known Issues — Tooling (30 Jun 2026)

**clasp push tidak stabil — Node v24.17.0 + clasp 3.3.0**
- Symptom: `clasp push` / `clasp login` / `clasp login --no-localhost` gagal dengan OAuth error `Premature close`. Punca belum disahkan (Node v24 atau clasp 3.3.0 regression).
- **Fallback selamat:** Copy-paste `Code.js` dan `portal.html` terus ke GAS Editor (`https://script.google.com/d/1kYWTdqLEhGQbMZIuA2F5N-Z_VNVYGFYYROn16vVkg-6iS1ozJkllUgoW/edit`) → Save → **Deploy → Manage deployments → Edit → New version → Deploy**.
- `index.html` tidak melalui clasp — boleh push normal via `git push pages main` tanpa isu.

**git push origin 403 — credential mismatch akaun GitHub**
- Symptom: `Permission to BurnDVS/SPKM-SyafieLegacy.git denied to shafielegacy` — berlaku bila credential git Windows tersimpan adalah akaun `shafielegacy` (bukan `BurnDVS`).
- `git push pages main` (shafielegacy/SPKM) tetap berjaya — PWA live tidak terjejas.
- **Fix:**
  ```powershell
  cmdkey /delete:LegacyGeneric:target=git:https://github.com
  ```
  Lepas tu `git push origin main` semula, login sebagai `BurnDVS` bila diminta.
- **Status checkpoint 16 Ogos 2026:** isu ini ialah rekod sejarah. `origin` dan `pages` telah diselaraskan pada `612128e`; semak semula kedua-dua remote sebelum push seterusnya.

---

## 🚀 Second Project (early setup)

`kursusitu/spdk` → live di `kursusitu.github.io/spdk` — projek GAS + GitHub Pages berasingan, pattern sama dengan SPKM. Boleh rujuk reference ni sebagai template untuk projek tu juga.

---

*Last updated: 30 Ogos 2026 (production Version 177, Pages Native routing/admin shortcut published, 67-group August reconciliation and pending first Native transaction; older queue logs below are historical)*
## Historical Archive — Queue #9 Staging Logs

Semua seksyen di bawah ialah log progres 1–2 Julai 2026. Ia dikekalkan untuk audit tetapi telah digantikan oleh status migrasi/reconciliation Januari–Ogos dalam `CURRENT_STATUS.md`.

## Queue #9 eBayar V2 Staging Import Checkpoint Correction — 1 Jul 2026

- Fourth staging import batch completed for 2026 using `skipExistingGroupsFirst:true`.
- Batch 4 result: `existingHashCount=25`, `sourceGroupsSelected=10`, `draftRows=15`, `rowsToAppend=15`, `appendedRows=15`.
- Diagnostic after batch 4: `lastRow=60`, `sourceRowHashColumn=21`, `existingHashCount=59` row entries.
- Total staging imported so far:
  - Batch 1: 5 source groups -> 7 child rows
  - Batch 2: 10 source groups -> 21 child rows
  - Batch 3: 10 source groups -> 16 child rows
  - Batch 4: 10 source groups -> 15 child rows
  - Total: 35 source groups -> 59 child payment rows
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 Staging Import Batch 5 — 1 Jul 2026

- Fifth staging import batch completed for 2026 using `skipExistingGroupsFirst:true`.
- Batch 5 result: `existingHashCount=35`, `sourceGroupsSelected=10`, `draftRows=18`, `rowsToAppend=18`, `appendedRows=18`.
- Diagnostic after batch 5: `lastRow=78`, `sourceRowHashColumn=21`, `existingHashCount=77` row entries.
- Total staging imported so far:
  - Batch 1: 5 source groups -> 7 child rows
  - Batch 2: 10 source groups -> 21 child rows
  - Batch 3: 10 source groups -> 16 child rows
  - Batch 4: 10 source groups -> 15 child rows
  - Batch 5: 10 source groups -> 18 child rows
  - Total: 45 source groups -> 77 child payment rows
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 1 Jul 2026

- 2026 staging import has progressed to 95 source groups -> 169 child payment rows.
- Latest diagnostic: `lastRow=170`, `sourceRowHashColumn=21`, `existingHashCount=169` row entries.
- Larger 25-source-group helpers were added and used successfully: `testImportEbayarPayments2026NextBatch25PreviewV2()` and `testImportEbayarPayments2026NextBatch25V2()`.
- Staging import safety limit is now `limitSourceRows <= 25`.
- Confirmed 25-group actual batch: `existingHashCount=70`, `sourceGroupsSelected=25`, `draftRows=46`, `rowsToAppend=46`, `appendedRows=46`.
- A later 25-group preview was run only and not imported: `existingHashCount=95`, `sourceGroupsSelected=25`, `draftRows=45`, `rowsToAppend=45`, `appendedRows=0`; source continues at `FEB2026` row 33.
- Important: the `FEB2026` row 33 preview batch has not been imported yet.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 245 source groups -> 434 child payment rows.
- Latest diagnostic: `lastRow=435`, `sourceRowHashColumn=21`, `existingHashCount=434` row entries.
- Recent accelerated 25-source-group batches continued successfully after the previous checkpoint:
  - 95 -> 120 source groups: +45 child rows, diagnostic `lastRow=215`, `existingHashCount=214`
  - 120 -> 145 source groups: +44 child rows, diagnostic `lastRow=259`, `existingHashCount=258`
  - 145 -> 170 source groups: +45 child rows, diagnostic `lastRow=304`, `existingHashCount=303`
  - 170 -> 195 source groups: +44 child rows, diagnostic `lastRow=348`, `existingHashCount=347`
  - 195 -> 220 source groups: +45 child rows, diagnostic `lastRow=393`, `existingHashCount=392`
  - 220 -> 245 source groups: +42 child rows, diagnostic `lastRow=435`, `existingHashCount=434`
- Source has progressed through `FEB2026` and into `MAC2026`.
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 295 source groups -> 518 child payment rows.
- Latest diagnostic: `lastRow=519`, `sourceRowHashColumn=21`, `existingHashCount=518` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 245 -> 270 source groups: +44 child rows, diagnostic `lastRow=479`, `existingHashCount=478`
  - 270 -> 295 source groups: +40 child rows, diagnostic `lastRow=519`, `existingHashCount=518`
- Source has progressed into `MEI2026`; the latest imported batch sample starts around `MEI2026` row 15.
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 345 source groups -> 605 child payment rows.
- Latest diagnostic: `lastRow=606`, `sourceRowHashColumn=21`, `existingHashCount=605` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 295 -> 320 source groups: +45 child rows, diagnostic `lastRow=564`, `existingHashCount=563`
  - 320 -> 345 source groups: +42 child rows, diagnostic `lastRow=606`, `existingHashCount=605`
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 395 source groups -> 678 child payment rows.
- Latest diagnostic: `lastRow=679`, `sourceRowHashColumn=21`, `existingHashCount=678` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 345 -> 370 source groups: +37 child rows, diagnostic `lastRow=643`, `existingHashCount=642`
  - 370 -> 395 source groups: +36 child rows, diagnostic `lastRow=679`, `existingHashCount=678`
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 445 source groups -> 761 child payment rows.
- Latest diagnostic: `lastRow=762`, `sourceRowHashColumn=21`, `existingHashCount=761` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 395 -> 420 source groups: +43 child rows, diagnostic `lastRow=722`, `existingHashCount=721`
  - 420 -> 445 source groups: +40 child rows, diagnostic `lastRow=762`, `existingHashCount=761`
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 2026 Staging Import Completed — 2 Jul 2026

- 2026 staging import is completed for all currently importable source groups.
- Final imported total: 457 source groups -> 779 child payment rows.
- Latest diagnostic: `lastRow=780`, `sourceRowHashColumn=21`, `existingHashCount=779` row entries.
- Final empty-check preview confirmed no remaining importable 2026 source groups: `existingHashCount=457`, `sourceGroupsSelected=0`, `draftRows=0`, `rowsToAppend=0`, `appendedRows=0`.
- Final movement after the previous checkpoint:
  - 445 -> 457 source groups: +18 child rows, diagnostic `lastRow=780`, `existingHashCount=779`
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 Legacy 2024 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import remains completed at 457 source groups -> 779 child payment rows.
- Legacy 2024 payment data from the 2025 source grouping has progressed to 125 source groups -> 235 child payment rows.
- Grand total in staging `Payments`: 582 source groups -> 1014 child payment rows.
- Latest diagnostic: `lastRow=1015`, `sourceRowHashColumn=21`, `existingHashCount=1014` row entries.
- Recent legacy import batches after 2026 completion: first 5 legacy batches total 125 source groups -> 235 child rows.
- Important: `sourceYear=2025` is the source grouping label, but imported payment year values are 2024 according to the source rows.
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 Legacy 2024 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import remains completed at 457 source groups -> 779 child payment rows.
- Legacy 2024 payment data from the 2025 source grouping has progressed to 200 source groups -> 380 child payment rows.
- Grand total in staging `Payments`: 657 source groups -> 1159 child payment rows.
- Latest diagnostic: `lastRow=1160`, `sourceRowHashColumn=21`, `existingHashCount=1159` row entries.
- Recent legacy import progress after the previous docs checkpoint:
  - 582 -> 607 source groups: +50 child rows, diagnostic `lastRow=1065`, `existingHashCount=1064`
  - 607 -> 632 source groups: +50 child rows, diagnostic `lastRow=1115`, `existingHashCount=1114`
  - 632 -> 657 source groups: +45 child rows, diagnostic `lastRow=1160`, `existingHashCount=1159`
- Important: `sourceYear=2025` is the source grouping label, but imported payment year values are 2024 according to the source rows.
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 Legacy 2024 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import remains completed at 457 source groups -> 779 child payment rows.
- Legacy 2024 payment data from the 2025 source grouping has progressed to 300 source groups -> 570 child payment rows.
- Grand total in staging `Payments`: 757 source groups -> 1349 child payment rows.
- Latest diagnostic: `lastRow=1350`, `sourceRowHashColumn=21`, `existingHashCount=1349` row entries.
- Recent legacy import progress after the previous docs checkpoint:
  - 657 -> 682 source groups: +52 child rows, diagnostic `lastRow=1212`, `existingHashCount=1211`
  - 682 -> 707 source groups: +44 child rows
  - 707 -> 732 source groups: +51 child rows
  - 732 -> 757 source groups: +43 child rows, diagnostic `lastRow=1350`, `existingHashCount=1349`
- Important: `sourceYear=2025` is the source grouping label, but imported payment year values are 2024 according to the source rows.
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 Legacy 2024 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import remains completed at 457 source groups -> 779 child payment rows.
- Legacy 2024 payment data from the 2025 source grouping has progressed to 400 source groups -> 755 child payment rows.
- Grand total in staging `Payments`: 857 source groups -> 1534 child payment rows.
- Latest diagnostic: `lastRow=1535`, `sourceRowHashColumn=21`, `existingHashCount=1534` row entries.
- Recent legacy import progress after the previous docs checkpoint:
  - 757 -> 782 source groups: +47 child rows
  - 782 -> 807 source groups: +38 child rows, diagnostic `lastRow=1435`, `existingHashCount=1434`
  - 807 -> 832 source groups: +58 child rows, diagnostic `lastRow=1493`, `existingHashCount=1492`
  - 832 -> 857 source groups: +42 child rows, diagnostic `lastRow=1535`, `existingHashCount=1534`
- Important: `sourceYear=2025` is the source grouping label, but imported payment year values are 2024 according to the source rows.
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
## Queue #9 eBayar V2 Final Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import is currently complete after importing the latest Julai 2026 payments: 459 source groups -> 782 child payment rows.
- Legacy 2024 payment data from the 2025 source grouping is completed: 417 source groups -> 787 child payment rows.
- Grand total in staging `Payments`: 876 source groups -> 1569 child payment rows.
- Latest diagnostic: `lastRow=1570`, `sourceRowHashColumn=21`, `existingHashCount=1569` row entries.
- Final empty-check preview for 2026 confirmed no remaining importable source groups: `existingHashCount=876`, `sourceGroupsSelected=0`, `draftRows=0`, `rowsToAppend=0`, `appendedRows=0`.
- Final empty-check preview for legacy 2024 / `sourceYear=2025` confirmed no remaining importable source groups: `existingHashCount=874`, `sourceGroupsSelected=0`, `draftRows=0`, `rowsToAppend=0`, `appendedRows=0`.
- Final movement after the previous docs checkpoint:
  - Legacy 2024 / `sourceYear=2025`: 857 -> 874 source groups, +32 child rows, diagnostic `lastRow=1567`, `existingHashCount=1566`
  - New Julai 2026 payments: 874 -> 876 source groups, +3 child rows, diagnostic `lastRow=1570`, `existingHashCount=1569`
- Important: `sourceYear=2025` is the source grouping label, but imported legacy payment year values are 2024 according to the source rows.
- Staging import safety limit remains `limitSourceRows <= 25`.
- This remains staging-only. Live SPKM continues to use the legacy yuran/eBayar flow.
