# SPKM Internal Operations Notes

Dokumen ini menyimpan nota operasi yang tidak sesuai dipaparkan dalam `README.md` public GitHub, tetapi masih berguna untuk rujukan projek.

Maklumat sensitif seperti credential sebenar dan token tidak boleh dimasukkan ke dokumentasi repository. ID operasi yang diluluskan direkodkan dalam `REFERENCE.md` dan `CURRENT_STATUS.md`; `CLAUDE.md` serta `AGENTS.md` hanya menyimpan pointer dan safety invariants.

---

## Repo & Deployment

| Perkara | Nota |
|---|---|
| Repo utama | `BurnDVS/SPKM-SyafieLegacy` |
| Repo GitHub Pages | `shafielegacy/SPKM` |
| Live mobile PWA | `https://shafielegacy.github.io/SPKM/` |
| Live GAS desktop | Simpan di dokumen private/local |
| Deploy GAS | Push source ke Apps Script, kemudian deploy new web app version secara manual |
| Deploy mobile | Publication berasingan ke `pages` selepas semakan divergence; push `origin` sahaja tidak menerbitkan PWA |

Nota penting:
- Checkpoint 2 September 2026: `main` / `origin/main` pada merge `1d07e8f` (PR #1, feature `98e585c`). Production Apps Script ialah **Version 185 (@185)**, description `SPKM Staff Auth V2 - Email OTP Security Hardening`, pada project, deployment ID dan production URL sedia ada. PWA auth diterbitkan berasingan melalui `de0d608` dalam `shafielegacy/SPKM`, hanya `index.html`. Production Staff Auth V2 smoke test PASS; rujuk `CURRENT_STATUS.md` untuk rekod validation.
- Push ke `origin` tidak update production Pages. Fetch kedua-dua remote, semak divergence dan hanya kemudian gunakan explicit `git push pages main:main`.
- Jangan stage semua fail secara membuta tuli; semak dirty worktree dan stage fail yang diluluskan sahaja.
- Bila deploy GAS, pastikan deployment type ialah **Web App**, bukan Library.
- `clasp push` hanya update source code dalam editor Apps Script.
- `.claspignore` wajib mengecualikan `tests/**`. Selepas setiap perubahan exclusion atau kejadian push hygiene, clone semula dan sahkan hanya `appsscript.json`, `Code.js`, `portal.html` dan `TestWA.js` wujud serta sepadan dengan local.
- Untuk apply ke production, mesti buat:
  `Deploy -> Manage deployments -> Edit -> New version -> Deploy`
- Ini mengemas kini existing active Web App deployment dan mengekalkan URL production yang sama. Jangan cipta deployment baharu kecuali memang dimaksudkan.
- Jangan guna `clasp deploy` untuk workflow production SPKM kerana ia boleh hasilkan deployment URL baru.

Fallback jika `clasp login` gagal:
1. Cuba `clasp logout`.
2. Cuba `clasp login --no-localhost`.
3. Jika OAuth masih gagal dan fix urgent, copy `Code.js` manual ke GAS editor, Save, kemudian deploy new version.

---

## Peranan & Akses

| Peranan | Akses | Cara Masuk |
|---|---|---|
| Guru / Admin | Dashboard mengikut role backend; tindakan ADMIN terhad kepada ADMIN | Email + OTP email |
| Ibu Bapa / Wali | Portal daftar dan eSemak awam | Tanpa login |
| Murid Dewasa | Portal daftar sahaja | Tanpa login |

### Login Guru/Admin — Staff Auth V2

Berkuat kuasa 2 September 2026 pada desktop/header dan modal mobile:

1. Buka **Log Masuk Guru & Admin** dan masukkan email yang berdaftar dalam `Maklumat Guru`.
2. Tekan **Hantar OTP** dan semak peti masuk email.
3. Masukkan OTP **6 digit** daripada email terkini, kemudian tekan **Sahkan OTP**.
4. Selepas berjaya, portal memuatkan identiti dan role yang disahkan backend.

Login lama email + enam digit akhir telefon adalah **obsolete dan dinyahaktifkan**; jangan gunakannya sebagai fallback. OTP pendaftaran murid ialah flow berasingan. Ibu bapa masih menggunakan eSemak awam tanpa login; privacy/authentication eSemak security Phase 2 belum dilaksanakan.

OTP sah selama **5 minit**, sekali guna sahaja. Tunggu sekurang-kurangnya **60 saat** sebelum meminta penghantaran semula. Had penghantaran ialah **5 sejam per akaun** dan **100 sejam seluruh sistem**; permintaan baharu mungkin tidak menghantar email apabila had dicapai. Selepas **3 cubaan OTP salah**, OTP tersebut dikunci; minta OTP baharu selepas cooldown/had membenarkan. Mesej permintaan adalah umum dan tidak mengesahkan bahawa akaun wujud atau email telah dihantar.

Session backend mempunyai idle expiry **30 minit** dan absolute lifetime **8 jam**. Frontend cuba renew setiap **20 minit**, tetapi renewal tidak boleh melepasi had 8 jam; sesi tamat memerlukan login OTP semula. Refresh/restore mesti mendapat identiti dan role canonical daripada backend. Perubahan `ADMIN → GURU` berkuat kuasa selepas revalidation; staf dibuang atau role tidak layak kehilangan akses privileged. **Log Keluar** menghantar invalidation ke backend selain membersihkan sesi setempat; sesi lama tidak boleh digunakan semula selepas invalidation berjaya.

**OTP tidak diterima:** semak ejaan email, Inbox/Spam/Junk dan sambungan internet; tunggu cooldown sebelum meminta semula, kemudian guna OTP email terkini. Jika had sejam dicapai, tunggu window had tamat. Jika masih gagal, minta admin semak email dan kelayakan role dalam `Maklumat Guru`, kemudian semak status penghantaran/quota email melalui operasi yang dibenarkan. Jangan minta pengguna berkongsi OTP atau token sesi. Jika PWA masih menunjukkan login telefon, muat semula PWA daripada URL production dan pastikan **Hantar OTP** muncul.

---

## Database Tabs

| Tab | Kegunaan |
|---|---|
| `Maklumat Guru` | Data login guru, role, jawatan, dan gambar |
| `PendaftaranBaru` | Murid kanak-kanak |
| `KelasDewasa` | Murid dewasa |
| `Kehadiran` / spreadsheet kehadiran | Rekod hadir/tidak hadir |
| `Yuran [Bulan]` / `JAN2026`... | Bayaran bulanan |
| `Calculation...2026` | Status bayaran bulanan |
| `WARemind` | Senarai nama dan nombor untuk reminder yuran |
| `BlastQueue` | Queue WhatsApp blast |
| `DeviceTokens` | Token push notification |
| `Notifikasi` | Rekod notifikasi |

Rujuk `REFERENCE.md` untuk ID spreadsheet dan nota struktur yang lebih teknikal.

---

## Design System

```css
--green:       #0A1F44
--green-mid:   #1A3A6B
--green-light: #E8EEF8
--gold:        #FFD700
--gold-light:  #FFF8DC
--gold-dark:   #B8960C
--cream:       #F8F8F8
```

Fonts:
- Heading: Lora
- Body: DM Sans

Mobile CSS:
- Scope mobile-specific changes under `@media (max-width: 1024px)` when possible.

---

## Feature Inventory

### Portal & UI
- Login Guru/Admin dengan e-mail OTP Staff Auth V2; rujuk prosedur di atas.
- Header Navy + Gold.
- Desktop nav: Utama, Daftar, Kehadiran, Murid, Guru, Yuran, eBayar, eSemak.
- Mobile bottom nav sebelum login: Utama, Daftar, eBayar, eSemak.
- Mobile bottom nav selepas login: Utama, Daftar, Hadir, Murid, Yuran.
- Dashboard stats dalam panel Senarai Murid.
- Idle timer dan auto logout.
- Custom toast/modal.
- Bell notification dan localStorage notification store.
- Islamic chime notification sound.
- Panel Sijil Khatam.

### Pendaftaran
- Daftar kanak-kanak: form 3 langkah + OTP email.
- Daftar dewasa: form satu halaman + OTP email.
- Auto-generate bil dan timestamp.
- Generate slip pendaftaran dan email slip.
- Duplicate guard:
  - Kanak-kanak: `NO_MYKID`.
  - Dewasa: `NO_MYKAD`.
  - Check dibuat sebelum OTP, sebelum simpan, dan dalam laluan backend lama.
  - ID dinormalize supaya format dash/spacing tetap match.

### Kehadiran
- Guru pilih murid dan rekod hadir per sesi.
- Statistik kehadiran per guru dan murid.
- `getMuridByGuru()` baca enrollment live dari `PendaftaranBaru` dan `KelasDewasa`, filter `STATUS=AKTIF`.
- `cariTabGuru()` fuzzy-match nama guru ke tab kehadiran.
- `simpanKehadiran()` tulis ke tab guru.
- `loggedInTabKehadiran` disimpan masa login dan dihantar semasa simpan.

### Senarai Murid & Guru
- Senarai murid kanak-kanak dan dewasa.
- Search murid.
- Toggle status `AKTIF` / `TIDAK AKTIF`.
- Senarai guru dengan gambar thumbnail dan badge jawatan.
- Modal kemaskini guru.
- Carta organisasi.

### Yuran
- eBayar status bayaran per bulan.
- eSemak Yuran.
- `recordCash`.
- `getYuranStats`.
- Normalize nama dalam `getYuranStats` dengan:

```javascript
nama.replace(/\s+/g, ' ').trim().toUpperCase()
```

- Copy senarai WA.
- Hantar WA reminder.
- Custom mesej WA dengan `[BULAN]`.
- Timestamp blast WA.

#### eBayar V2 — Current Operational State

Checkpoint 2 September 2026 (snapshot 16, 29 dan 30 Ogos di bawah kekal sebagai sejarah):

- Januari–Ogos 2026 ialah legacy-only. Native eBayar bermula September 2026.
- Ogos Legacy dan V2 kini fully reconciled: 109 paid, 77 unpaid, 186 active roster dan RM3,760; semua numeric diffs sifar, `onlyLegacy=[]` dan `onlyV2=[]`.
- Julai catch-up: 39 source groups, 60 child rows, RM1,870. Final July: 71/71 groups unchanged, 0 changed, 0 new.
- Snapshot 16–30 Ogos berakhir pada 67 groups/104 paid/RM3,640 dan kini historical. Audit 1 September mendapati canonical Ogos berhenti di source row 68; rows 69–71 ialah 3 groups, 5 child rows dan RM120.
- One-time guarded editor backfill menggunakan core sync sedia ada dan menambah tepat 3 groups/5 rows/RM120. Post-write preview ialah 70 unchanged existing, 0 changed/new, 0 projected rows/RM0 dan highest source row 71. Helper serta dedicated test telah dibuang selepas verification dan bukan production behavior kekal.
- `OGOS2026` mempunyai 70 response/payment groups, 110 child-name occurrences dan 109 distinct paid students. PADILLAH mempunyai dua genuine submissions/receipts; kedua-dua amaun kekal dalam total collection. Calculation registered spill boleh termasuk inactive records, sedangkan dashboard menggunakan active roster 186.
- Historical anomaly `PG-2026-JUN2026-112` selesai dibaiki pada 2 September 2026. Puncanya ialah `JUN2026!G112` berubah daripada teks `RM10.00` kepada nombor `10`, menghasilkan source hash berbeza; historical importer yang deduplicate berdasarkan source hash sahaja telah append payment sama sekali lagi. Ini bukan bayaran kedua atau multi-child normal.
- Repair dynamically resolved obsolete row 749 dan clear kandungan `A:Z` sahaja tanpa structural row deletion. Row 1571 dikekalkan kerana sepadan dengan current source: preserve hash `c15975677b4b9c18beb1d63a6f4c83806c77a42e59e8c1874a8e050e79b7e930`; obsolete hash `e8ada66407f1b7873e4adacc6cf510dbcfd823007ff0663b9acccb3fad144b59` telah dibuang.
- Post-repair June: 174 payment rows, 111 distinct groups, 172 distinct paid names dan RM5,780. Legacy/V2 paid diff `0`, total diff `RM0`, `onlyLegacy=[]`, `onlyV2=[]`; `nativeOrSeptemberIdentityCount=0`, maka September/Native tidak disentuh. Temporary editor-only helper dan dedicated test telah dibuang selepas verification (`2add115`).

Canonical `Payments` schema:

`PAYMENT_ID`, `PAYMENT_GROUP_ID`, `TIMESTAMP`, `TAHUN`, `BULAN`, `BULAN_KEY`, `NAMA_MURID_RAW`, `NAMA_MURID_NORM`, `STUDENT_ID`, `NO_MYKID_MYKAD`, `STUDENT_TYPE`, `JUMLAH`, `AMOUNT_TOTAL`, `AMOUNT_ALLOCATED`, `STATUS`, `KAEDAH`, `RESIT_URL`, `SOURCE_YEAR`, `SOURCE_SHEET`, `SOURCE_ROW`, `SOURCE_ROW_HASH`, `MATCH_STATUS`, `MATCH_CONFIDENCE`, `NOTE`, `CREATED_AT`, `UPDATED_AT`.

#### Generic Current-Month Sync

Maintenance berada dalam panel Yuran yang authenticated, kelihatan kepada admin sahaja, dan setiap tindakan sensitif tetap memerlukan backend admin authorization.

- Default preview/read-only; write hanya selepas admin mengesahkan preview.
- Import hanya source groups yang diklasifikasikan genuinely new.
- Maksimum 25 groups setiap batch.
- Identity diperiksa melalui `PAYMENT_GROUP_ID`, exact source location, `SOURCE_ROW_HASH` dan secondary content fingerprint.
- Write path menggunakan ScriptLock, fresh post-lock source reread/TOCTOU validation, final staging recheck dan satu bulk `setValues()`.
- Semua conflict dikumpul sebelum write; tiada partial-write loop.
- Selepas write, staging diverifikasi. Jika hasil write tidak pasti, jangan jalankan sync kali kedua sebelum rekod disemak.
- Current August state: 70 source groups, 70 existing, 0 new/changed, 0 projected child rows, projected RM0, highest staged source row 71.
- Confirmed write mesti membawa immutable exact `selectedPaymentGroupIds` daripada preview. Backend memerlukan 1–25 ID non-empty/unique dan menolak ID yang tidak lagi genuinely new.
- Frontend mempunyai settlement timeout 120 saat, sentiasa membersihkan loading state dan menghalang duplicate click.
- Jika browser melaporkan outcome tidak pasti, jangan retry. Refresh authoritative maintenance status dan periksa staging dahulu. Sync 29 dan 30 Ogos membuktikan prosedur ini: browser uncertain, backend write disahkan complete melalui fresh status, dan tiada retry dibuat.

#### Hybrid eSemak dan Admin Dashboard

- Parents tidak login; mereka menggunakan public eSemak. Guru/Admin login kekal berasingan.
- Public action `getYuranParent`: Januari–Ogos membaca legacy monthly sources; September–Disember membaca canonical `Payments` dan hanya exact `STATUS=SELESAI`.
- Canonical receipt hanya dirender sebagai link apabila HTTPS. September names dan receipt links telah production-verified.
- Frontend action `getYuranStats` kekal. Backend dispatch Januari–Ogos kepada existing legacy `getYuranStats()`, dan September–Disember kepada canonical `getYuranStatsV2()`.
- September production verification: 15 paid, 171 unpaid, 186 active students dan RM600; nama serta receipt links betul.

#### Legacy Google Form Sync Hardening

- `onEbayarSubmit` tidak lagi bergantung hanya pada `sleep(3000)`. Nama submission dinormalize dan readiness Calculation dicuba berulang kali sehingga kira-kira 15 saat.
- Form hanya dibina semula apabila semua submitted paid names sudah kelihatan dalam Calculation. Timeout readiness gagal tertutup tanpa rebuild stale choices.
- Manual Admin sync memaparkan backend message dan transport error sebenar dengan fallback generik hanya jika tiada mesej berguna.
- Selepas `setChoiceValues()`, pilihan dibaca semula; count mesti sepadan dan semua paid names mesti tiada.
- Diagnostic fields: `action`, `month`, `formId`, `calculationTab`, `paidCount`, `generatedChoiceCount`, `readBackChoiceCount`, `paidNamesPresentCount`, `verificationResult`.
- Pada 1 September, kegagalan production berpunca daripada owner deployment belum memberi consent scope Forms, bukan sync algorithm. Manifest kini mengandungi `https://www.googleapis.com/auth/forms`; Web App executes as `USER_DEPLOYING`.
- One-time read-only editor authorization check di bawah `shafielegacykelasmengaji@gmail.com` mengembalikan `authorizationStatus=NOT_REQUIRED`, title `eBAYAR MENGAJI OGOS 2026`, dan `itemCount=6`. Selepas authorization, `Kemas Form (Tolak Dah Bayar)` berjaya. Helper diagnostic itu tidak dikekalkan sebagai feature production.

#### Portal Mode Operations

- Allowed: `AUTO`, `LEGACY`, `NATIVE`, `BOTH`.
- Property: `EBAYAR_PORTAL_MODE`; invalid/missing → `AUTO`.
- Audit: `EBAYAR_PORTAL_MODE_UPDATED_AT`, `EBAYAR_PORTAL_MODE_UPDATED_BY`.
- Cutoff: 1 September 2026, Malaysia time.
- `AUTO` resolves `LEGACY` before cutoff and `NATIVE` from cutoff onward.
- Current mode is `AUTO`. `BOTH` was tested on `/dev` and restored to `AUTO`.
- Fail-safe frontend resolution before cutoff is legacy; Native submission authorization remains server-side.
- Legacy future cards may be visible with `Akan Datang`, but their payment controls remain disabled until current.

#### Native Phase 2A — Payment Write

- Supports 1–5 students with one shared month, date, amount, optional transaction reference and bank slip.
- Stable student identities are `KANAK:<BIL>` and `DEWASA:<BIL>`. Browser never receives MyKid/MyKad as selector ID.
- Same-name students remain distinct by `studentKey`. Current official record and submitted name must match exactly.
- Native duplicate checks use `STUDENT_ID`; historical rows without it use conservative normalized-name fallback. Ambiguous fallback blocks the submission.
- Unpaid-only search is UX filtering only. Preflight and locked duplicate recheck remain authoritative and all-or-nothing.
- Slip raw size limit is 3 MB. Encoded length/whitespace are rejected before decode; MIME, extension and file signature are verified after decode.
- ScriptLock surrounds final duplicate validation and one bulk payment `setValues()`.
- Native rows use `STATUS=SELESAI`, `KAEDAH=NATIVE_EBAYAR`, `SOURCE_SHEET=NATIVE_EBAYAR`, stable `STUDENT_ID` and Native source metadata. `MATCH_STATUS`/`MATCH_CONFIDENCE` remain blank because this is direct identity resolution, not migration matching.
- Payment `NOTE` is compact JSON. `AMOUNT_TOTAL` may repeat per child row, but reporting deduplicates by group.
- Orphan file cleanup is attempted when safe. A post-write uncertain response means inspect staging; never retry automatically.

#### Native Phase 2B — Receipt and Privacy

- Payment lock is released before receipt generation; receipt uses its own lock.
- Validate the complete payment group and build a canonical snapshot before generating anything.
- The renderer copies the approved Google Slides template (`1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`), replaces all placeholders, exports the copy as PDF and trashes the temporary presentation in `finally`; the original template is never modified.
- The one-slide 576 × 288 pt landscape design is retained. Multiple child names use balanced line wrapping and local font reduction.
- Exactly one final PDF per group is stored in the receipt folder. Only that file becomes anyone-with-link/view.
- Every child row receives the same `RESIT_URL`.
- Existing one consistent receipt URL returns idempotent success. Mixed URLs or partial state return review; do not create another receipt blindly.
- Receipt failure does not reverse payment and must never cause a second payment write.
- Receipt excludes MyKid/MyKad, phone, email, address, slip URL and internal hashes.
- Production receipts do not include the synthetic preview watermark.
- Frontend opens a ready receipt in a new window with `noopener`; if not ready, it clearly reports payment success with receipt unavailable.

Drive controls:

- `NATIVE_EBAYAR_SLIP_FOLDER_ID`: verify the configured value in Apps Script Script Properties. Folder `SPKM - Native eBayar Slips` and its files remain private/restricted; never link-share.
- `NATIVE_EBAYAR_RECEIPT_FOLDER_ID`: verify the configured value in Apps Script Script Properties. Folder `SPKM - Native eBayar Receipts` preferably remains Restricted; only final PDFs are link-view.
- `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID`: approved template ID `1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`.
- `NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID`: must point to a preview-only folder different from the production receipt folder.
- Safe preview helper: `testCreateNativeEbayarReceiptSlidesPreviewV2`. It uses two synthetic September children and RM100.00, adds `CONTOH / TIDAK SAH`, exercises the real Slides-to-PDF path and does not write payment rows or `RESIT_URL`. The synthetic preview completed successfully.

Production checkpoint 1 September: Version 184 pada existing deployment identity. Version progression: 180 eSemak hybrid, 181 Form readiness, 182 Admin dashboard hybrid, 183 Form sync observability/read-back verification, 184 explicit Google Forms OAuth scope.

#### September Production Monitoring Checklist

1. Confirm repository, dirty worktree and `origin/main` at `1d07e8f`; inspect Pages (`de0d608` checkpoint) separately before any push.
2. Confirm production Version 185 remains active on the existing deployment ID and `/exec` URL and executes as `USER_DEPLOYING`.
3. Confirm Portal Mode remains `AUTO` and resolves to `NATIVE`.
4. Verify both configured Drive folder IDs and `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID`; confirm the slip and receipt folders remain Restricted.
5. Compare September eSemak and Admin dashboard against canonical exact-`SELESAI` rows; current verified totals are 15/171/186/RM600.
6. If a browser outcome is uncertain, stop; inspect `Payments` and Drive artifacts before considering any retry.
7. Keep slip storage private and expose only final HTTPS receipt PDFs.
8. Retain the resolved `PG-2026-JUN2026-112` audit record; no temporary June repair helper remains available for execution.
9. Keep Portal Mode `AUTO` and continue using the existing production deployment URL.

#### Failure and Rollback Rules

- Pre-write validation/lock/conflict failure: no payment should be assumed written; correct the cause and preview again.
- Network or post-write verification uncertainty: assume the outcome is unknown, inspect `Payments`, group identity and Drive artifacts before any action.
- Receipt failure after confirmed payment: payment remains valid; investigate receipt state only, never resubmit payment.
- If a new GAS version causes a production issue, assess an authorized rollback on the existing deployment; rolling back before @185 would remove Staff Auth V2 protections. Keep Portal Mode `AUTO` unless an administrator explicitly authorizes a temporary override. Do not rewrite historical rows as rollback.
- If Pages is wrong, identify the last verified Pages commit and perform a reviewed forward fix or authorized rollback; do not force-push casually.

#### Historical eBayar V2 Shadow Workflow — Superseded

The notes below describe the initial 1–2 July shadow migration and are retained for audit. Their progress counts and proposed next steps are no longer current; use the sections above and `CURRENT_STATUS.md`.

- Current live yuran/eBayar flow remains **LEGACY**.
- V2 is backend-only shadow/read model in `Code.js`; no UI is switched to V2 yet.
- Do not deploy or switch `index.html` / `portal.html` to V2 until `compareYuranLegacyVsV2` passes for the target months.
- Staging spreadsheet should be `SPKM eBayar Master`, stored via Script Property `EBAYAR_MASTER_SS_ID`.
- 1 Jul 2026: `SPKM eBayar Master` has been created, `EBAYAR_MASTER_SS_ID` has been set, and `ensureEbayarMasterSchemaV2` has initialized the schema.
- Initialized tabs: `Payments`, `Config`, `ImportLog`, `MonthlySummary`, `YearlySummary`, `StudentsSnapshot`.
- `Payments` row 1 has full schema headers from `PAYMENT_ID` through `UPDATED_AT`.
- Source mapping confirmed:
  - Main DB source group: `Yuran Mei`, `Yuran Jun`, `Yuran Julai`, `Yuran Ogos`, `Yuran September`, `Yuran Oktober`, `Yuran November`, `Yuran Disember`. These tabs contain actual `TAHUN` 2024 data.
  - `YURAN_SS_ID` source group: `JAN2026`, `FEB2026`, `MAC2026`, `APRIL2026`, `MEI2026`, `JUN2026`, `JULAI2026`, `OGOS2026`, `SEPT2026`, `OKT2026`, `NOV2026`, `DIS2026`.
- Confirmed column mapping: `Timestamp`, `Email address`, `NAMA PENUH ANAK` / `NAMA PENUH MURID`, `BAYARAN YURAN BAGI BULAN`, `TAHUN`, `MUAT NAIK RESIT BAYARAN`, `JUMLAH BAYARAN (RM)`, `TARIKH BAYARAN DIBUAT`, `NO RESIT`, `STATUS BAYARAN` / `STATUS`.
- Dry-run results:
  - 2024 legacy: 417 source payment rows, 787 generated payment rows, 248 multi-name rows, 13 skipped, `STATUS=SELESAI` 417.
  - 2024 month counts: `2024-05` 81, `2024-06` 104, `2024-07` 108, `2024-08` 101, `2024-09` 104, `2024-10` 88, `2024-11` 110, `2024-12` 91.
  - 2026: 447 source payment rows, 768 generated payment rows, 212 multi-name rows, 427 skipped, `STATUS=SELESAI` 447.
  - 2026 month counts: `2026-01` 110, `2026-02` 120, `2026-03` 112, `2026-04` 113, `2026-05` 119, `2026-06` 174, `2026-07` 20.
  - Total preview: 864 source payment rows, 1555 generated payment rows.
- Duplicate safety confirmed: no duplicate `SOURCE_ROW_HASH`, `PAYMENT_GROUP_ID`, or `PAYMENT_ID`. Multi-name payment rows intentionally share `SOURCE_ROW_HASH` and `PAYMENT_GROUP_ID`, but child rows have unique `PAYMENT_ID`.
- Staging-only first import completed:
  - Imported first 5 source payment groups from 2026 `JAN2026` into `SPKM eBayar Master > Payments`.
  - First import appended 7 child payment rows: `sourceGroupsSelected=5`, `draftRows=7`, `existingHashCount=0`, `rowsToAppend=7`, `appendedRows=7`.
  - `Payments` now has 7 imported child payment rows below the header.
  - Diagnostic confirmed `lastRow=8`, `sourceRowHashColumn=21`, and 7 row-level hash entries.
  - Second run was idempotent: 5 unique existing source hashes, `rowsToAppend=0`, `skippedDuplicateRows=7`, `appendedRows=0`.
  - No duplicate rows were appended on the second run.
- Next-batch staging import support:
  - `skipExistingGroupsFirst:true` makes the importer skip already-imported `SOURCE_ROW_HASH` groups before selecting the next batch.
  - Preview for next 2026 batch: `existingHashCount=5`, `sourceGroupsSelected=10`, `draftRows=21`, `rowsToAppend=21`, `appendedRows=0`.
  - Actual next batch appended 21 child rows from 10 additional source groups.
  - Diagnostic after second batch: `lastRow=29`, `sourceRowHashColumn=21`, `existingHashCount=28` row entries.
  - Third batch appended 16 child rows from 10 additional source groups: `existingHashCount=15`, `sourceGroupsSelected=10`, `draftRows=16`, `rowsToAppend=16`, `appendedRows=16`.
  - Diagnostic after third batch: `lastRow=45`, `sourceRowHashColumn=21`, `existingHashCount=44` row entries.
  - Total staging imported so far: 25 source groups -> 44 child payment rows.
- Continue imports only in staging batches; keep idempotency via `SOURCE_ROW_HASH`.
- Do not modify existing live functions during shadow work: `getYuranStats`, `getYuranParent`, `getEbayarStats`, `recordCash`, sync functions, and `onEbayarSubmit`.
- `clasp push` may update GAS editor source, but no GAS production deployment and no `git push pages main` has been done for Queue #9 staging work.
- Live SPKM remains legacy; no frontend switch.

### WhatsApp Blast
- Fonnte integration.
- `hantarWhatsApp()`.
- `normalizePhoneForWA()`.
- `WARemind`.
- Blast queue system.
- Modal pengesahan blast.
- Blast status auto-refresh.

Token sebenar dan credential jangan simpan dalam README public.

### PWA Mobile
- `manifest.json`.
- `sw.js`.
- GitHub Pages live.
- Add to Home Screen.
- Clay UI mobile.
- Guest menu.
- Footer ringkas.

### Backend
- `doPost`.
- `doGet` / `doAction`.
- CORS helper.
- Token auth 30 minit.
- `logout`.
- Session cleanup.
- OTP system.
- `syncForms`.
- WhatsApp/Fonnte helpers.
- Notification helpers.

---

## Fonnte WA Blast Setup Notes

1. Login Fonnte.
2. Add device dan scan QR dengan WhatsApp Business.
3. Simpan token dalam GAS Script Properties.
4. Jangan commit token.
5. Free plan quota perlu dipantau.

Function setup token pernah digunakan:

```javascript
function setFonnteToken() {
  PropertiesService.getScriptProperties()
    .setProperty('FONNTE_TOKEN', 'TOKEN_DARI_FONNTE');
  Logger.log('Done');
}
```

---

## WARemind Formula Notes

Format raw data:

```text
1. NAMA - NOMBOR
```

Formula asal yang pernah digunakan:

```text
Kolum B : =TRIM(MID(TRIM(LEFT(A3,FIND(" - ",A3)-1)),FIND(". ",TRIM(LEFT(A3,FIND(" - ",A3)-1)))+2,100))
Kolum C : =IF(TRIM(MID(A3,FIND(" - ",A3)+3,LEN(A3)))="-","",TRIM(MID(A3,FIND(" - ",A3)+3,LEN(A3))))
Kolum D : =IF(C3="","",IF(TRIM(C3)="-","","60"&REGEXREPLACE(SUBSTITUTE(TRIM(C3)," ",""),"^(60|0)","")))
```

---

## Prompt / Working Notes

### Clay UI Mobile Prompt

```text
Baca index.html dalam folder projek.
Tukar mobile view UI kepada 3D Clay style. CSS dalam
@media (max-width:1024px) SAHAJA. Zero impact desktop.

TEMA: Navy #0A1F44/#1A3A6B + Gold #FFD700/#B8960C + Clay bg #E8E4DA
FONT: Lora (heading) + DM Sans (body)

SEBELUM LOGIN:
- Bottom nav 4 item: Utama, Daftar, eBayar, eSemak
- Quick cards 3 kad: Daftar Murid, eBayar Yuran, eSemak Yuran
- Footer ringkas

SELEPAS LOGIN:
- Bottom nav 5 item: Utama, Daftar, Hadir, Murid, Yuran
- Menu cards: Daftar Murid, Kehadiran, Senarai Murid, Senarai Guru, Yuran, eSemak
```

---

## Nota Untuk AJK

1. Data murid disimpan dalam Google Sheets.
2. Slip pendaftaran dijana automatik dan dihantar ke email ibu bapa.
3. Kehadiran boleh direkod dari portal.
4. Login Guru/Admin menggunakan email berdaftar → **Hantar OTP** → masukkan OTP 6 digit → **Sahkan OTP**. Nombor WhatsApp bukan lagi kata laluan staff; rujuk prosedur Staff Auth V2 di atas.
5. Mobile PWA boleh dipasang di home screen.
6. Desktop dan mobile menggunakan data yang sama.
7. Blast WA yuran dibuat dari panel Yuran.
8. Notifikasi dalam app disimpan per browser.

---

## Archive Note

All Queue #9 checkpoint sections below are historical logs superseded by the verified 16 August 2026 state.

Fail ini diwujudkan selepas `README.md` dibersihkan supaya muka depan GitHub tidak memaparkan nota operasi internal. Maklumat yang dikeluarkan dari README disimpan di sini atau di `REFERENCE.md`, `CHANGELOG.md`, `CLAUDE.md`, dan `AGENTS.md`.
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
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
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
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 1 Jul 2026

- 2026 staging import has progressed to 95 source groups -> 169 child payment rows.
- Latest diagnostic: `lastRow=170`, `sourceRowHashColumn=21`, `existingHashCount=169` row entries.
- Larger 25-source-group helpers were added and used successfully: `testImportEbayarPayments2026NextBatch25PreviewV2()` and `testImportEbayarPayments2026NextBatch25V2()`.
- Staging import safety limit is now `limitSourceRows <= 25`.
- Confirmed 25-group actual batch: `existingHashCount=70`, `sourceGroupsSelected=25`, `draftRows=46`, `rowsToAppend=46`, `appendedRows=46`.
- A later 25-group preview was run only and not imported: `existingHashCount=95`, `sourceGroupsSelected=25`, `draftRows=45`, `rowsToAppend=45`, `appendedRows=0`; source continues at `FEB2026` row 33.
- Important: the `FEB2026` row 33 preview batch has not been imported yet.
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
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
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 295 source groups -> 518 child payment rows.
- Latest diagnostic: `lastRow=519`, `sourceRowHashColumn=21`, `existingHashCount=518` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 245 -> 270 source groups: +44 child rows, diagnostic `lastRow=479`, `existingHashCount=478`
  - 270 -> 295 source groups: +40 child rows, diagnostic `lastRow=519`, `existingHashCount=518`
- Source has progressed into `MEI2026`; the latest imported batch sample starts around `MEI2026` row 15.
- Staging import safety limit remains `limitSourceRows <= 25`.
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 345 source groups -> 605 child payment rows.
- Latest diagnostic: `lastRow=606`, `sourceRowHashColumn=21`, `existingHashCount=605` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 295 -> 320 source groups: +45 child rows, diagnostic `lastRow=564`, `existingHashCount=563`
  - 320 -> 345 source groups: +42 child rows, diagnostic `lastRow=606`, `existingHashCount=605`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 395 source groups -> 678 child payment rows.
- Latest diagnostic: `lastRow=679`, `sourceRowHashColumn=21`, `existingHashCount=678` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 345 -> 370 source groups: +37 child rows, diagnostic `lastRow=643`, `existingHashCount=642`
  - 370 -> 395 source groups: +36 child rows, diagnostic `lastRow=679`, `existingHashCount=678`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
## Queue #9 eBayar V2 2026 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import has progressed to 445 source groups -> 761 child payment rows.
- Latest diagnostic: `lastRow=762`, `sourceRowHashColumn=21`, `existingHashCount=761` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 395 -> 420 source groups: +43 child rows, diagnostic `lastRow=722`, `existingHashCount=721`
  - 420 -> 445 source groups: +40 child rows, diagnostic `lastRow=762`, `existingHashCount=761`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
## Queue #9 eBayar V2 2026 Staging Import Completed — 2 Jul 2026

- 2026 staging import is completed for all currently importable source groups.
- Final imported total: 457 source groups -> 779 child payment rows.
- Latest diagnostic: `lastRow=780`, `sourceRowHashColumn=21`, `existingHashCount=779` row entries.
- Final empty-check preview confirmed no remaining importable 2026 source groups: `existingHashCount=457`, `sourceGroupsSelected=0`, `draftRows=0`, `rowsToAppend=0`, `appendedRows=0`.
- Final movement after the previous checkpoint:
  - 445 -> 457 source groups: +18 child rows, diagnostic `lastRow=780`, `existingHashCount=779`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
## Queue #9 eBayar V2 Legacy 2024 Staging Import Checkpoint — 2 Jul 2026

- 2026 staging import remains completed at 457 source groups -> 779 child payment rows.
- Legacy 2024 payment data from the 2025 source grouping has progressed to 125 source groups -> 235 child payment rows.
- Grand total in staging `Payments`: 582 source groups -> 1014 child payment rows.
- Latest diagnostic: `lastRow=1015`, `sourceRowHashColumn=21`, `existingHashCount=1014` row entries.
- Recent legacy import batches after 2026 completion: first 5 legacy batches total 125 source groups -> 235 child rows.
- Important: `sourceYear=2025` is the source grouping label, but imported payment year values are 2024 according to the source rows.
- Staging import safety limit remains `limitSourceRows <= 25`.
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
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
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
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
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
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
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
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
- Do not deploy, switch frontend calls, or use V2 as live flow until the staged import has been fully compared and approved.
