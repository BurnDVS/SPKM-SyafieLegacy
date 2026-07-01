# SPKM — Reference Cheat Sheet

Rujukan pantas semua akaun, ID, URL, dan langkah deploy untuk projek SPKM (Sistem Pengurusan Kelas Mengaji — Syafie Legacy). Kemaskini fail ni bila ada perubahan struktur.

---

## 📁 Local Project

```
Path: C:\Users\burnk\OneDrive\Documents-assets\SPKM
```

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

### Deploy command (standard)
```powershell
git add . && git commit -m "message" && git push && git push pages main
```
⚠️ Kena push **DUA-DUA remote** setiap kali — kalau hanya `origin`, website live TAK update.

---

## ⚙️ Google Apps Script (GAS)

| Item | Value |
|---|---|
| Script ID | `1kYWTdqLEhGQbMZIuA2F5N-Z_VNVYGFYYROn16vVkg-6iS1ozJkllUgoW` |
| Owner akaun | `shafielegacykelasmengaji@gmail.com` |
| Buka editor | `clasp open` atau `https://script.google.com/d/1kYWTdqLEhGQbMZIuA2F5N-Z_VNVYGFYYROn16vVkg-6iS1ozJkllUgoW/edit` |

### 🚨 LANGKAH WAJIB lepas `clasp push`
`clasp push` HANYA update source code dalam editor — **TIDAK** update web app URL yang live (`config.json` → `gasUrl`).

Untuk apply kod baru ke production:
1. Buka GAS editor (`clasp open`)
2. **Deploy** → **Manage deployments**
3. Klik ikon pensel (Edit) pada deployment "Web app" yang aktif
4. Version → **New version**
5. **Deploy**

Tanpa langkah ni, perubahan Code.js TIDAK akan nampak kesan di portal walaupun push berjaya.

---

## 📊 Spreadsheet IDs

| Spreadsheet | ID | Kegunaan |
|---|---|---|
| SPKM Main DB (+ eBayar 2025) | `1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU` | **Satu fail multi-purpose**: Maklumat Guru, PendaftaranBaru, KelasDewasa, Kehadiran (Fasa 1 data) **DAN** tab eBayar 2025 (Mei–Dis) — sebab semua pendaftaran murid baru (kanak-kanak & dewasa) masuk sini, jadi data yuran 2025 sekali dalam fail ni. Tab `LogPertukaranGuru` (ditambah 30 Jun 2026) — log audit Pertukaran Guru, 7 kolum: `Timestamp \| Admin \| Guru Lama \| Guru Baru \| Nama Murid \| Jenis Murid \| Bil` |
| eBayar 2026 (Jan–present) — `YURAN_SS_ID` | `1AUH-ZwrbDjB5l2J5H8t2MBlbzkITMJp66J2VDLZF9CM` | Tab per bulan (JAN2026...DIS2026), NAMA MURID, Calculation* |
| eBayar Master V2 — `EBAYAR_MASTER_SS_ID` | Script Property, belum live | Staging/shadow spreadsheet: `SPKM eBayar Master`. Canonical tab: `Payments`. Backend V2 sudah ada dalam `Code.js`, tetapi UI/live flow masih legacy. |
| Kehadiran — `KEHADIRAN_SS_ID` | `1qez9OLXmJuU0nFCBnbuZqjc_DnTJh7kMElqCRnxK7F4` | Satu tab per guru, scan via `cariTabGuru()`. Tab kini boleh ada 9 kolum (A–G original + H=`Guru Tetap`, I=`Guru Hadir`, ditambah 30 Jun 2026 untuk sokongan relief/backup guru). Tab lama auto-upgrade header H/I bila pertama kali terima rekod relief; data sedia ada (sebelum upgrade) kosong untuk 2 kolum ni — itu normal. |
| Sijil Khatam | `1jGp9U6lYRBvAVPSHhqSLv2WL5MHxdmKP5f5AnTHC8xU` | Tab "Khatam Iqra'" + "Khatam Quran" |

### eBayar Master / Yuran V2 Shadow Note

- Queue #9 foundation is backend-only and not live. `getYuranStats`, `getYuranParent`, `getEbayarStats`, `recordCash`, sync functions, and `YURAN_SS_ID` flow remain legacy.
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
| 9 | Satukan eBayar 2025+2026 → tab per tahun | QUEUE |
| 10 | Dashboard Analisa Yuran | QUEUE (depends on #9) |
| 11 | eSemak upgrade utk spreadsheet baru | QUEUE (depends on #9) |
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
- **Status semasa (30 Jun 2026):** `origin` tertinggal commit `f588c57` — perlu sync bila credential BurnDVS tersedia.

---

## 🚀 Second Project (early setup)

`kursusitu/spdk` → live di `kursusitu.github.io/spdk` — projek GAS + GitHub Pages berasingan, pattern sama dengan SPKM. Boleh rujuk reference ni sebagai template untuk projek tu juga.

---

*Last updated: 30 Jun 2026 (Guru Backup/Relief + Pertukaran Guru + Known Issues Tooling)*
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
