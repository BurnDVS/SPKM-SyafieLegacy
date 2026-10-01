# Changelog — SPKM Syafie Legacy

Semua perubahan utama sistem direkodkan di sini.

---
## [1 Oktober 2026] — Native eBayar v1.0.1: current-month fix dan PWA refresh

### Fixed

- Betulkan Native eBayar supaya `Bayaran Untuk` kekal pada bulan semasa server Malaysia selepas parent mencari dan memilih murid.
- Isu Oktober 2026 bertukar semula kepada September selepas pilihan murid telah diselesaikan.
- `Bayaran Untuk` dipindahkan ke atas `Pilih Murid / Anak` supaya flow pembayaran lebih logik: pilih bulan dahulu, kemudian pilih murid.
- Default Native eBayar kini menggunakan `config.serverDate` atau tarikh Malaysia sebagai fallback untuk memilih bulan semasa yang sah.

### PWA

- App version dinaikkan daripada `v1.0.0` kepada `v1.0.1`.
- Service Worker cache dinaikkan daripada `spkm-v12` kepada `spkm-v13`.
- Existing `skipWaiting()`, cache cleanup dan `SW_UPDATED` reload flow dikekalkan supaya PWA menerima frontend terkini tanpa clear cache manual.

### Verified

- Production Pages repo: `shafielegacy/SPKM`.
- Production branch: `main`.
- Commit production Pages:
  - `fb12ee6` — `fix native ebayar current month and refresh pwa cache`
  - `9483088` — `bump app version to 1.0.1`
- Production PWA disahkan secara manual memaparkan `Bayaran Untuk` di atas pilihan murid.
- Oktober 2026 kekal dipilih selepas dua murid dipilih.
- Preflight dua murid dengan jumlah RM40 berjaya sehingga confirmation screen tanpa pertukaran bulan.
- Confirmation memaparkan dua murid, Oktober 2026, tarikh 2026-10-01 dan RM40.00 dengan betul.

### Repository Note

- Development/source repo: `BurnDVS/SPKM-SyafieLegacy`.
- Production GitHub Pages repo: `shafielegacy/SPKM`.
- Push ke repo source sahaja tidak mengemas kini PWA production.
- Production Pages perlu dikemas kini melalui `shafielegacy/SPKM` dengan history yang selamat dan tanpa force push.

---

## [2 September 2026] — Staff Auth V2 LIVE: Email OTP Security Hardening

### Security model dan frontend

- Legacy staff email + last-six-phone login dinyahaktifkan fail-closed. Staff email OTP menggunakan HMAC digest, single-use, TTL 5 minit, resend cooldown 60 saat, had 5/account/hour dan 100/global/hour; 3 cubaan salah mengunci OTP tersebut.
- Session V2 menggunakan digest-derived Script Property key, idle expiry 30 minit dan absolute lifetime 8 jam. Frontend renew setiap 20 minit tanpa memanjangkan absolute expiry; legacy sessions gagal tertutup.
- Identiti dan role staff dibaca semula daripada `Maklumat Guru`; `ADMIN → GURU` dan removal/ineligible role berkuat kuasa selepas revalidation. Logout invalidate backend session. Privileged actor identity ditentukan server-side, bukan browser-supplied `adminEmail`.
- Central authorization policy mengelaskan PUBLIC/authenticated/ADMIN-only actions dan menolak invalid overlap. Existing Native eBayar guards kekal protected.
- Desktop/header Guru & Admin login serta mobile modal beralih kepada **Hantar OTP → Sahkan OTP**. Frontend menyimpan canonical user/email/role/session daripada backend; restore menggunakan renewed canonical identity/role dan logout juga membersihkan local state.
- Public eSemak privacy/authentication sengaja ditangguhkan ke **security Phase 2** dan tidak diubah dalam rollout ini.

### Validation dan production rollout

- Before production: focused Staff Auth V2 suite **22/22 PASS**, full Node suite **80/80 PASS**, `git diff --check` clean selain expected Windows LF→CRLF warnings.
- Isolated live pentest PASS: anti-enumeration, wrong-OTP lockout dan rejection selepas lockout, OTP single-use, Session V2 login/renewal, live role downgrade/removal, backend logout invalidation, serta desktop/header dan mobile OTP end-to-end login.
- Production smoke test **PASS**: PWA memaparkan Hantar OTP, request/confirmation berjaya, real staff identity betul dan portal dimuatkan selepas authentication.
- Feature `98e585c` (`feat: harden staff auth with OTP v2`) merged melalui PR #1 bertajuk sama; merge `1d07e8f` (`Merge pull request #1 from BurnDVS/security/auth-v2`).
- Existing SPKM production Apps Script project dan deployment/URL dikekalkan. Backend **@185**, description `SPKM Staff Auth V2 - Email OTP Security Hardening`.
- PWA [SPKM](https://shafielegacy.github.io/SPKM/) diterbitkan melalui `shafielegacy/SPKM`, commit `de0d608` (`feat: publish staff auth otp v2 to pwa`), **hanya `index.html` auth frontend**. Backend dan PWA rollout dibuat berasingan.
- Pentest menggunakan standalone Apps Script berasingan dan synthetic staff/attendance data; pentest-only IDs/helpers/endpoint overrides disahkan tiada dalam production security branch sebelum merge. Temporary pentest/security/pages-auth worktrees dan local `security/auth-v2` branch dibersihkan. Pages-hotfix worktree juga dibuang selepas disahkan tiada unique changes; hanya main workspace kekal.

Rujuk `REFERENCE.md` untuk kontrak auth dan `INTERNAL_OPERATIONS.md` untuk panduan OTP. Validation di atas ialah rekod rollout yang telah selesai, bukan ujian baharu oleh checkpoint dokumentasi.

## [2 September 2026] — Resolved historical June canonical duplicate

- Repair of `PG-2026-JUN2026-112` completed successfully. The obsolete canonical record was dynamically resolved at execution time and only its `A:Z` contents were cleared; no spreadsheet row was structurally deleted.
- Cleared obsolete row 749 with source hash `e8ada66407f1b7873e4adacc6cf510dbcfd823007ff0663b9acccb3fad144b59`. Preserved current-source-matching row 1571 with source hash `c15975677b4b9c18beb1d63a6f4c83806c77a42e59e8c1874a8e050e79b7e930`.
- Root cause: legacy `JUN2026!G112` changed representation from text `RM10.00` to numeric `10`. That produced a different source hash, and the historical importer, which deduplicated by source hash only, appended the same payment again. This was not a second payment and not normal multi-child behavior.
- Post-repair June canonical state: 174 payment rows, 111 distinct groups, 172 distinct paid names and RM5,780 collection.
- Legacy and V2 remained fully reconciled after repair: paid diff `0`, total diff `RM0`, `onlyLegacy=[]` and `onlyV2=[]`.
- Safety verification returned `nativeOrSeptemberIdentityCount=0`; September/Native data was not touched.
- The temporary editor-only repair helper and its dedicated test were removed after verification. Cleanup source commit: `2add115`.

## [1 September 2026] — Native production verification, hybrid readers, hardened Form sync and final Ogos reconciliation

### Production progression and architecture

- Existing Apps Script deployment identity and `/exec` URL were preserved through **Version 184**; deployment ID remains `AKfycbxd0jFmZw00kGbx4ykSwRSIsGXXbZNTqxHDJWM9ZyAimbOn9Xie_irhm2TRfn0qWEJ1` and the Web App executes as `USER_DEPLOYING`.
- Version 180 added hybrid public eSemak; Version 181 hardened legacy Form readiness; Version 182 added Admin Yuran hybrid dispatch; Version 183 added Form sync observability/read-back verification; Version 184 added the explicit Google Forms OAuth scope.
- Native eBayar is live from September and embedded in the PWA. Parents do not log in and use public eSemak; Guru/Admin login remains separate.
- September production verification: 15 paid, 171 unpaid, 186 active students and RM600. Names and HTTPS receipt links display correctly.

### Hybrid eSemak and dashboard

- Public action remains `getYuranParent`: January–August use legacy monthly payment sources; September–December use canonical `Payments`, including only exact `STATUS=SELESAI` rows.
- Existing frontend action remains `getYuranStats`: January–August dispatch to legacy `getYuranStats()`, September–December to canonical `getYuranStatsV2()`.
- September eSemak and Admin dashboard values, names and receipt links were production-verified.

### Legacy Google Form synchronization

- `onEbayarSubmit` no longer depends only on fixed `sleep(3000)`. It retries Calculation readiness for approximately 15 seconds and requires every submitted normalized name to appear before rebuilding choices.
- Readiness timeout fails closed without rebuilding from stale Calculation data. Manual Admin sync surfaces backend/transport errors.
- Choices are read back after `setChoiceValues()` and verified for generated count and absence of paid names. Diagnostics include `action`, `month`, `formId`, `calculationTab`, `paidCount`, `generatedChoiceCount`, `readBackChoiceCount`, `paidNamesPresentCount` and `verificationResult`.
- Initial production Form sync failure was missing owner consent for `https://www.googleapis.com/auth/forms`. A one-time read-only editor check under `shafielegacykelasmengaji@gmail.com` returned `authorizationStatus=NOT_REQUIRED`, title `eBAYAR MENGAJI OGOS 2026` and 6 items. Production `Kemas Form (Tolak Dah Bayar)` then succeeded. The helper was diagnostic only and is not permanent production behavior.

### Ogos canonical repair and reconciliation

- Canonical `Payments` originally stopped at source row 68. Missing IDs `PG-2026-OGOS2026-69`, `-70` and `-71` represented 3 payment groups, 5 child rows and RM120.
- A guarded editor-only one-time backfill delegated to existing `syncCurrentMonthEbayarV2Core_(meta, true, paymentGroupIds)`, preserving deterministic IDs, source identity/hash/fingerprint checks, exact requested IDs, ScriptLock, fresh post-lock reread, TOCTOU comparison, one bulk write, post-write verification and no automatic retry.
- Successful result: 3 appended groups, 5 child rows and RM120. Post-write state: 70 existing, 0 new, 0 changed-existing; selected groups were fully present and source groups unchanged. Fresh preview showed 0 projected rows/RM0 and highest existing source row 71.
- The temporary backfill helper and dedicated test were removed after verification; they are not permanent production behavior.
- Final Legacy and V2 values match exactly: 109 paid, 77 unpaid, 186 active students and RM3,760; all numeric diffs are zero and `onlyLegacy=[]`, `onlyV2=[]`.
- `OGOS2026` contains 70 response/payment groups, 110 child-name occurrences and 109 distinct paid names. PADILLAH has two genuine submissions/receipts; both remain in collection totals. Calculation registered spill may include inactive records, while production uses the active roster.

### Historical diagnosis at the 1 September checkpoint

- `PG-2026-JUN2026-112` is a historical canonical duplicate with the same payment/source identity but hashes `c15975677b4b9c18beb1d63a6f4c83806c77a42e59e8c1874a8e050e79b7e930` and `e8ada66407f1b7873e4adacc6cf510dbcfd823007ff0663b9acccb3fad144b59`.
- At this checkpoint it was unresolved, unrelated to Ogos and intentionally not modified. It was subsequently repaired and verified on 2 September 2026 as recorded above.

### Source commits

- `7ac6bab` — show Native payments in eSemak.
- `cf9c299` — harden legacy Form sync readiness.
- `7c84438` — route Admin Yuran dashboard to Native payments.
- `b158952` — verify Form sync results.
- `ba996fa` — show Admin sync alerts.
- `d363c07` — add Google Forms OAuth scope.
- `410de7e` / `ba1c1cc` — temporary guarded Ogos backfill and stable anomaly comparison.
- `0c3a355` — remove completed Ogos backfill helper and test.

## [30 Ogos 2026] — Production Version 177 and GitHub Pages Native launch routing

### Apps Script production

- The existing production Web App deployment was updated in place to **Version 177** with description `SPKM Native eBayar production - September 2026`.
- The existing deployment ID and production `/exec` URL were preserved.
- Portal Mode was restored to `AUTO`: it resolves to `LEGACY` before 1 September 2026 and `NATIVE` from 1 September in Malaysia time.
- Version 177 includes the Slides-template Native receipt implementation. The earlier Version 176 state remains historical.

### GitHub Pages publication

- Development/source `origin/main` is at `076f68a` (`feat: prepare native ebayar routing and admin shortcut`).
- Production `pages/main` is at `7b5476e` (`feat: route PWA eBayar to native portal`).
- Pages was published from the separate detached worktree `C:\Users\burnk\OneDrive\Documents-assets\SPKM-pages-publish` using `git push pages HEAD:main`.
- Pushing `origin/main` does not automatically update the separate GitHub Pages repository.

### Parent payment routing and Admin shortcut

- January–August retain their original Legacy Google Form routes unchanged.
- September–December use the approved production Apps Script `/exec` route. Each Native month opens on its first day in Malaysia time; future months remain disabled, and no public route uses `/dev`.
- The PWA Dashboard Yuran shows `eBayar V2 Maintenance` only to authenticated `ADMIN` users and opens production `/exec` in a protected new tab.
- Backend Admin authorization remains authoritative. The full maintenance interface remains in the Apps Script portal; duplicating it in the PWA is optional future scope.

### Remaining controlled milestone

- At this superseded 30 August checkpoint, August was reconciled at 67 source/existing groups, 0 new, 104 paid, 82 unpaid, 186 total students, RM3,640 and Legacy vs V2 `Match`.
- At this historical checkpoint, the first real Native production payment, slip upload and receipt verification were still pending. The 1 September entry above supersedes that status.

---

## [30 Ogos 2026] — Native Slides receipt preview and final August reconciliation update

### Native receipt source

- Native receipt rendering now uses the approved one-slide Google Slides template (`1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`) instead of the generic Google Docs/A4 layout.
- The renderer copies the 576 × 288 pt landscape template, replaces `<<NAMA PENUH ANAK>>`, `<<BULAN>>`, `<<NO RESIT>>`, `<<TARIKH>>` and `<<BAYARAN>>`, exports PDF and trashes the temporary Slides copy without modifying the original.
- Multiple children use balanced wrapping and local font reduction. Existing privacy, one-PDF-per-group, shared `RESIT_URL`, idempotency, payment-independent failure handling and final-PDF permissions remain unchanged.
- `testCreateNativeEbayarReceiptSlidesPreviewV2` generated a successful synthetic September preview with two sample children, RM100.00 and `CONTOH / TIDAK SAH`. No payment row or production receipt record was created.
- Script Properties used by this layer are `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID`, `NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID` and the existing `NATIVE_EBAYAR_RECEIPT_FOLDER_ID`.

### Validation and August reconciliation

- Full local regression suite: 14 passed, 0 failed. `Code.js` syntax, Slides preview generation, `/dev` smoke test and Auto Sync preview/cancel all passed.
- One additional real August legacy payment group with 2 child rows and RM60.00 was synced once. The browser transport response was uncertain; the write was not retried.
- Fresh status confirmed 67 source groups, 67 existing, 0 new, 0 new child rows, 104 paid, 82 unpaid, 186 total students and RM3,640 collection. Legacy vs V2 returned `Match`.

### Source and deployment boundary

- At this earlier checkpoint, the latest source commit was `0b1d10b`; Slides implementation commit was `15d7991`, and the preceding documentation checkpoint was `fd3203c`. `origin/main` and Apps Script `@HEAD` were up to date.
- At this earlier checkpoint, production remained Version 176 and the later Slides receipt source was not yet production-active. This state was subsequently superseded by Version 177 as recorded above.
- At this earlier checkpoint, the first real Native production transaction and receipt were still pending. The 1 September entry above supersedes this status.

---

## [29 Ogos 2026] — Production Version 176, Auto Sync hardening dan final August reconciliation

### Fixed and verified

- Auto Sync confirmation now submits an immutable copy of the exact preview `paymentGroupIds`; guarded writes require 1–25 non-empty, unique IDs and reject IDs that are no longer genuinely new.
- The frontend request wrapper now has a 120-second settlement timeout, always clears loading state, blocks duplicate clicks and retains the no-retry warning for uncertain outcomes.
- The original action name and backend routes were confirmed correct. Regression coverage in `tests/ebayar-v2-auto-sync.test.js` passed 7 tests with 0 failures.
- Commit `391f164` records the hardening fix; `01e8634` adds the required `tests/**` clasp exclusion.

### Deployment hygiene

- The first source push accidentally included the regression test because `.claspignore` did not exclude `tests/**`.
- `tests/**` was added to `.claspignore`, the accidental Apps Script test file was removed manually, and a fresh Apps Script clone confirmed that only `appsscript.json`, `Code.js`, `portal.html` and `TestWA.js` remained and were content-identical to local source.
- The incident is resolved and is not an open blocker.

### August final sync and reconciliation

- Pre-sync `OGOS2026`: 66 source groups, 46 existing, 20 new, 0 review, 34 projected child rows and RM1,060.
- Guarded Auto Sync was authorized and executed once. Although the browser returned an uncertain connection outcome, fresh authoritative status confirmed completion; no retry was performed.
- Final state: 66 source groups, 66 existing, 0 new, 0 review, 0 remaining child rows, RM0 remaining and `Synced`.
- Final Legacy vs V2 result: `Match`; 102 paid, 84 unpaid, 186 total students and RM3,580 collection.
- This confirmed the no-retry safeguard: an uncertain browser response must be investigated through fresh status and staging, never by repeating the write.

### Production

- The existing active Web App deployment was updated in place from Version 175 to **Version 176** at approximately 22:05 MYT.
- Description: `SPKM Native eBayar Sep 2026 + Auto Sync hardening`.
- The existing deployment ID and `/exec` URL were preserved; no new deployment URL was created.
- Version 176 was verified with Portal Mode configured as `AUTO`, resolving to `LEGACY` before 1 September, and the final August maintenance/reconciliation figures above.
- `origin/main` is at `01e8634`; `pages/main` intentionally remains at `db87448` because no public PWA source changed.

### Remaining milestone

- Native eBayar is not yet proven by a real Native transaction. The first controlled Native payment, private slip, payment rows, receipt PDF and receipt-idempotency checks remain pending on or after 1 September 2026.
- Keep Portal Mode `AUTO`, submit exactly once and inspect data/artifacts before any retry if the browser outcome is uncertain.

---

## [15–16 Ogos 2026] — Checkpoint: Native eBayar Phase 2A/2B dan kesinambungan operasi

### Completed

- Migrasi dan reconciliation eBayar V2 Januari–Ogos 2026 selesai. Januari–Julai sepadan tepat; Ogos disahkan pada 68 paid, 117 unpaid, 185 total murid dan RM2,520 dengan semua perbezaan legacy/V2 sifar.
- Catch-up Julai menambah 39 source groups, 60 child rows dan RM1,870. Catch-up Ogos hingga source row 47 merangkumi 46 groups, 69 child rows dan RM2,520.
- Portal Mode `AUTO`, `LEGACY`, `NATIVE` dan `BOTH` siap dengan konfigurasi backend dan authorization admin. `AUTO` kekal legacy sebelum 1 September 2026 dan bertukar Native mulai tarikh itu.
- Panel maintenance V2 admin-only dan guarded current-month Auto Sync siap dengan read-only default, maksimum 25 groups, source/staging recheck, ScriptLock, TOCTOU validation, satu bulk write dan post-write verification.
- Legacy future-month cards dikekalkan sebagai `Akan Datang`, tetapi payment links disabled sehingga bulan berkenaan tiba.
- Native eBayar Phase 2A siap pada `d171e8c`: stable student identity, 1–5 murid, duplicate guard, file validation/cap, ScriptLock, satu bulk payment write, cleanup dan post-write verification.
- Native eBayar Phase 2B siap pada `612128e`: receipt snapshot, satu PDF per group, idempotency, lock berasingan, satu URL untuk semua child rows dan privacy-safe receipt content.
- GitHub Pages `pages` dan development remote `origin` diselaraskan pada `612128e`. Public PWA telah disahkan kekal legacy-safe dalam mode `AUTO` pada 16 Ogos 2026.
- Apps Script source Phase 2B dipush melalui clasp pada 16 Ogos 2026 sekitar 00:26:45.
- Public PWA safety snapshot selepas Pages update: legacy flow masih dipaparkan, Ogos current, September–Disember `Akan Datang`, Native tersembunyi dalam `AUTO`; dashboard Ogos menunjukkan 68 paid, 117 unpaid dan RM2,520.

### Commits

- `f0af240` — `feat: complete ebayar v2 july migration validation`
- `acfaafa` — `feat: add ebayar v2 admin maintenance panel`
- `da0b6df` — `feat: add guarded ebayar v2 auto sync`
- `d171e8c` — `feat: add guarded native ebayar phase 2a`
- `612128e` — `feat: add native ebayar receipt generation`

### Safety Boundary

- Januari–Ogos 2026 kekal legacy-only; Native eBayar bermula September 2026.
- Existing active production Web App deployment belum ditetapkan kepada versi yang mengandungi source Phase 2A/2B; URL production sedia ada perlu dikekalkan.
- Tiada real Native payment write, slip upload atau receipt generation pernah dijalankan.
- Ujian `/dev` dengan mode `BOTH` hanya mengesahkan UI; September kekal disabled ketika Ogos. Mode telah dipulihkan ke `AUTO`.
- Pada checkpoint ini, satu anomali sejarah Jun masih wujud: `GROUP_ID_MULTIPLE_STAGED_HASHES` untuk `PG-2026-JUN2026-112`; disahkan tidak berkaitan dengan catch-up Julai/Ogos. Anomali ini kemudian dibaiki dan disahkan pada 2 September 2026.

### Next

- Jalankan satu transaksi Native terkawal pada atau selepas September melalui `/dev`, sahkan payment rows, privacy slip, receipt PDF dan idempotency.
- Hanya selepas kelulusan `/dev`, edit existing active GAS Web App deployment dan tetapkan `New version` sambil mengekalkan URL production yang sama. Jangan cipta deployment berasingan kecuali memang dimaksudkan, dan jangan anggap `clasp push` mengubah production behavior.
- Rujuk `CURRENT_STATUS.md` untuk checkpoint lengkap dan urutan sesi seterusnya.

---

## [16 Jul 2026] — Fix: Panel Pertukaran Guru bocor ke semua page admin

### Fixed
- **Bug:** `#seksyenPertukaranGuru` (panel "🔄 Pertukaran Guru") dalam `portal.html` didapati muncul di **semua page admin** (Utama, Kehadiran, Murid, Yuran, dll), bukan hanya di page "Senarai Guru".
- **Punca:** Div `#seksyenPertukaranGuru` diletakkan **di luar** `<section class="panel" id="panel-guru">` (selepas tag `</section>` penutup), sebagai sibling dalam DOM, bukan child dalam mana-mana `.panel`. Fungsi `showPanel(name)` hanya toggle class `.active` pada elemen `.panel`; sebab div ni bukan `.panel`, visibility dia cuma dikawal oleh check `isAdmin` dalam fungsi auth (`updateAuthUI`) tanpa mengambil kira panel mana yang active — jadi bila admin login, dia terus visible di semua page.

### Changed
- Pindahkan `#seksyenPertukaranGuru` supaya jadi child dalam `<section class="panel" id="panel-guru">`, sebelum tag `</section>` penutup panel-guru. `#modalPertukaranConfirm` kekal di posisi asal (luar section, global modal).
- Susun semula urutan dalam `panel-guru` supaya "🔄 Pertukaran Guru" (tajuk + panel dropdown Guru Asal/Guru Baharu + butang Pindah Murid) jadi kandungan utama **paling atas**, diikuti tajuk "Senarai Guru" + jadual `table#guruTable` di bawahnya.
- Logik `isAdmin` toggle (`seksyenPertukaran.style.display = isAdmin ? '' : 'none'`) dalam `updateAuthUI` dikekalkan tanpa perubahan — masih perlu untuk sorok panel ni daripada guru biasa (bukan admin) walaupun di page Senarai Guru.

### Verified
- Confirm secara visual: panel Pertukaran Guru sekarang **hanya** muncul di page "Senarai Guru", tiada lagi di page Kehadiran/Murid/Yuran.
- Confirm urutan akhir dalam `panel-guru`: back button → Pertukaran Guru (tajuk + panel) → Senarai Guru (tajuk) → jadual guru.
- Tiada fungsi JS disentuh (`loadGuruList`, `sahkanPertukaran`, `ptPilihSemua`, `onPtGuruAsalChange`, `onPtGuruBaruChange`, `bukaPtConfirmModal`, dll) — hanya perubahan struktur/kedudukan HTML.
- Tag div/section disahkan seimbang selepas setiap pemindahan.

### Not yet done
- Belum deploy ke production — masih edit local, menunggu test manual penuh (login admin + login guru biasa) sebelum GAS Deploy → Manage deployments → New version.
- Ditemui isu berasingan semasa test: refresh page pada desktop (`window.innerWidth > 1024`) log out session, sebab `tryAutoLogin()` ada early-return `if (!_isMobile) return;` — fungsi restore session hanya jalan untuk mobile. Token desktop disimpan dalam `sessionStorage` tapi tiada logik restore UI bila refresh. Bug ni pre-existing (bukan disebabkan fix di atas), belum diperbaiki lagi.

### Deploy
- Code.js + portal.html: copy-paste manual ke GAS Editor → New version → Deploy (clasp masih tidak digunakan sepenuhnya, rujuk entry "Deployment Incident").

---

## [30 Jun 2026] — Queue #9 — eBayar Master / Yuran V2 shadow foundation

### Added
- Backend-only V2 shadow/read model foundation in `Code.js` for future canonical eBayar master data.
- New V2 helper/action functions:
  - `normalizeYuranNameV2_`
  - `makeBulanKeyV2_`
  - `getEbayarMasterSpreadsheet_`
  - `ensureEbayarMasterSchemaV2`
  - `listEbayarYears`
  - `getMonthlyPaymentSummaryV2`
  - `getYuranStatsV2`
  - `getYuranParentV2`
  - `compareYuranLegacyVsV2`
- Revised `Payments` schema for one canonical payment table:
  `PAYMENT_ID`, `PAYMENT_GROUP_ID`, `TIMESTAMP`, `TAHUN`, `BULAN`, `BULAN_KEY`, `NAMA_MURID_RAW`, `NAMA_MURID_NORM`, `STUDENT_ID`, `NO_MYKID_MYKAD`, `STUDENT_TYPE`, `JUMLAH`, `AMOUNT_TOTAL`, `AMOUNT_ALLOCATED`, `STATUS`, `KAEDAH`, `RESIT_URL`, `SOURCE_YEAR`, `SOURCE_SHEET`, `SOURCE_ROW`, `SOURCE_ROW_HASH`, `MATCH_STATUS`, `MATCH_CONFIDENCE`, `NOTE`, `CREATED_AT`, `UPDATED_AT`.

### Behavior
- V2 is shadow-only. Live SPKM remains on legacy yuran/eBayar flow.
- No UI switch was made. `index.html` and `portal.html` were not modified.
- Existing live functions remain legacy: `getYuranStats`, `getYuranParent`, `getEbayarStats`, `recordCash`, sync functions, and `onEbayarSubmit`.
- `PAYMENT_GROUP_ID` represents one original source row/resit/payment; `PAYMENT_ID` represents one student-level row. Multi-student source rows should be split later while preserving the same group ID.
- If allocation is unclear, preserve original value in `AMOUNT_TOTAL` and leave `AMOUNT_ALLOCATED` blank/null with `NOTE`.

### Staging setup update — 1 Jul 2026
- Created new Google Sheet: `SPKM eBayar Master`.
- Script Property `EBAYAR_MASTER_SS_ID` set successfully.
- `clasp push` completed successfully using `shafielegacykelasmengaji@gmail.com`; GAS editor source now includes V2 shadow helpers.
- `ensureEbayarMasterSchemaV2` ran successfully.
- Staging spreadsheet tabs initialized: `Payments`, `Config`, `ImportLog`, `MonthlySummary`, `YearlySummary`, `StudentsSnapshot`.
- `Payments` row 1 has full schema headers from `PAYMENT_ID` through `UPDATED_AT`.
- No data import/copy has been done yet.

### Source audit + import dry-run — 1 Jul 2026
- Source audit completed. Confirmed raw source tabs:
  - 2025 source group from Main DB: `Yuran Mei`, `Yuran Jun`, `Yuran Julai`, `Yuran Ogos`, `Yuran September`, `Yuran Oktober`, `Yuran November`, `Yuran Disember`. Note: these tabs contain actual `TAHUN` 2024 data.
  - 2026 source group from `YURAN_SS_ID`: `JAN2026`, `FEB2026`, `MAC2026`, `APRIL2026`, `MEI2026`, `JUN2026`, `JULAI2026`, `OGOS2026`, `SEPT2026`, `OKT2026`, `NOV2026`, `DIS2026`.
- Column mapping confirmed: `timestamp`, `email`, `nama`, `bulan`, `tahun`, `resit`, `jumlah`, `tarikhBayaran`, `noResit`, `status`.
- Dry-run import helpers added and tested. No real import to `Payments` yet.
- 2024 legacy dry-run: 417 source payment rows -> 787 generated payment rows; 248 multi-name rows; 13 skipped rows; no duplicate `SOURCE_ROW_HASH`, `PAYMENT_GROUP_ID`, or `PAYMENT_ID`.
- 2026 dry-run: 447 source payment rows -> 768 generated payment rows; 212 multi-name rows; 427 skipped rows; no duplicate `SOURCE_ROW_HASH`, `PAYMENT_GROUP_ID`, or `PAYMENT_ID`.
- Total dry-run preview: 864 source payment rows -> 1555 generated payment rows.
- Duplicate safety confirmed: multi-name payments intentionally share `SOURCE_ROW_HASH` and `PAYMENT_GROUP_ID`, while child rows have unique `PAYMENT_ID`.
- Next planned step: real import to staging `Payments` only, starting with a small batch/limit and idempotent by `SOURCE_ROW_HASH`. Do not import yet.

### Staging small-batch import — 1 Jul 2026
- Added staging-only small batch import helper for `SPKM eBayar Master > Payments`.
- Imported first 5 source payment groups from 2026 `JAN2026`.
- First import result: `sourceYear=2026`, `limitSourceRows=5`, `sourceGroupsSelected=5`, `draftRows=7`, `existingHashCount=0`, `rowsToAppend=7`, `appendedRows=7`.
- `Payments` tab now has 7 imported child payment rows below the header.
- `testExistingPaymentSourceHashesV2` confirmed `lastRow=8`, `sourceRowHashColumn=21`, and 7 row-level hash entries.
- Idempotent second run confirmed: `existingHashCount=5` unique source hashes, `rowsToAppend=0`, `skippedDuplicateRows=7`, `appendedRows=0`.
- No duplicate rows were appended on the second run.
- Live SPKM remains legacy; no GAS web app deployment, no `pages` push, and no frontend switch.

### Staging next-batch import — 1 Jul 2026
- Added next-batch staging import support with `skipExistingGroupsFirst:true`, so repeated imports select the next unimported source groups instead of repeatedly selecting the first groups.
- Preview for next 2026 batch: `sourceYear=2026`, `limitSourceRows=10`, `skipExistingGroupsFirst=true`, `existingHashCount=5`, `sourceGroupsSelected=10`, `draftRows=21`, `rowsToAppend=21`, `appendedRows=0`.
- Actual next batch import: `existingHashCount=5`, `sourceGroupsSelected=10`, `draftRows=21`, `rowsToAppend=21`, `appendedRows=21`.
- Diagnostic after second batch: `lastRow=29`, `sourceRowHashColumn=21`, `existingHashCount=28` row entries.
- Third staging import batch completed with `skipExistingGroupsFirst:true`: `existingHashCount=15`, `sourceGroupsSelected=10`, `draftRows=16`, `rowsToAppend=16`, `appendedRows=16`.
- Diagnostic after third batch: `lastRow=45`, `sourceRowHashColumn=21`, `existingHashCount=44` row entries.
- Total staging imported so far: Batch 1 = 5 source groups -> 7 child rows; Batch 2 = 10 source groups -> 21 child rows; Batch 3 = 10 source groups -> 16 child rows; total = 25 source groups -> 44 child payment rows.
- Live SPKM remains legacy; no GAS web app deployment, no `pages` push, and no frontend switch.

### Git / Deploy
- Commit pushed to `origin`: `298768c` — `feat: add ebayar master v2 shadow helpers`.
- Earlier hygiene commit: `88d8b26` — `chore: ignore local workspace files`.
- `.gitignore` now ignores `.vs/` and `before-ebayar-master-v2.patch`.
- No GAS production deployment was done.
- No `git push pages main` was done.
- No live web app update was done.

---

## [30 Jun 2026] — Admin: Pertukaran Guru (Permanent Reassign Murid)

### Added
- **`ensureLogPertukaranGuruSheet(ss)`** — auto-cipta tab `LogPertukaranGuru` dalam Main DB (`SPREADSHEET_ID`) jika belum wujud. 7 kolum: `Timestamp | Admin | Guru Lama | Guru Baru | Nama Murid | Jenis Murid | Bil`. Row 1 frozen.
- **`getMuridByGuruUntukTukar(params)`** — return senarai murid TETAP guru (`COL_KANAK.GURU` / `COL_DEWASA.GURU` sahaja, bukan `GURU_BACKUP`), filter `STATUS=AKTIF`, sort A-Z. Shape: `[{bil, nama, jenis:'KANAK'|'DEWASA'}]`.
- **`tukarGuruMurid(params)`** — permanent reassign: loop `senarai[]`, match row by `Bil` (`String` comparison untuk handle number/string), safety check `GURU semasa === guruLama` sebelum update, tulis `guruBaru` ke kolum GURU, log setiap baris ke `LogPertukaranGuru`, panggil `simpanNotifikasi`. Return `{success, jumlahDipindah, ralat:[]}` — partial transfer disokong (item gagal masuk `ralat`, item lain diteruskan).
- **Panel "Pertukaran Guru"** dalam panel Guru — admin-only (hidden via `updateNav()` untuk guru biasa):
  - Dropdown Guru Asal → memuatkan senarai murid TETAP → Dropdown Guru Baharu (auto-exclude Guru Asal) → checklist murid dengan label `(Kanak-kanak)` / `(Dewasa)` → modal konfirmasi "tidak boleh diundur" → submit.
  - Butang Pindah disabled sehingga Guru Baharu dipilih DAN sekurang-kurangnya 1 murid ditanda.
  - `notifAdd('pertukaran', ...)` dipanggil selepas berjaya — ada dalam portal.html dan index.html.
  - Selepas berjaya: form di-reset, success message kekal nampak.

### Behavior
- Partial transfer: admin boleh untick murid tertentu — hanya murid yang ditanda sahaja dipindah.
- Safety check backend: jika GURU murid sudah berubah sejak checklist dimuatkan (race condition), row tersebut masuk `ralat[]` dan baris lain diteruskan.
- Berbeza dari Guru Backup/Relief: ini kemaskini kolum `GURU` secara kekal — bukan tambah ke `GURU_BACKUP`.

### Verified
- Tested live: pertukaran beberapa murid SHAFIE → ZARUL berjaya. Kolum GURU tukar betul dalam PendaftaranBaru dan KelasDewasa. Tab `LogPertukaranGuru` tercipta automatik dengan header betul dan rekod audit lengkap. Data test dipulihkan selepas verifikasi.

### Deploy
- Code.js + portal.html: copy-paste manual ke GAS Editor → New version → Deploy (clasp tidak digunakan, lihat entry "Deployment Incident").
- index.html: push via `git push pages main`.

---

## [30 Jun 2026] — Sokongan Guru Backup / Relief dalam Panel Kehadiran

### Added
- **`cariGuruTetapMurid(namaMurid, kanakData, dewasaData)`** — helper baru, cari guru tetap bagi murid tertentu dari PendaftaranBaru atau KelasDewasa (data pre-loaded untuk performance).
- **`testGuruBackup()`** — test function untuk verify guru backup dapat senarai murid bukan kosong dengan peranan BACKUP.
- Kolum baru di tab kehadiran baharu: **'Guru Tetap' (H)** dan **'Guru Hadir' (I)** — untuk bezakan rekod biasa vs relief.
- Tab kehadiran sedia ada (7 kolum) akan auto-upgrade header H/I bila ada rekod ditulis; row lama tidak disentuh/backfill.

### Changed
- **`getMuridByGuru`** — kini check `COL_KANAK.GURU` DAN `COL_KANAK.GURU_BACKUP` untuk PendaftaranBaru.
  - Return shape berubah: `{ success, murid: [{nama, peranan}, ...] }` (bukan array string).
  - `peranan`: `'TETAP'` jika match kolum GURU, `'BACKUP'` jika match GURU_BACKUP sahaja. TETAP menang jika ada conflict.
  - KelasDewasa kekal check GURU sahaja (tiada konsep backup untuk kelas dewasa).
- **`simpanKehadiran`** — kini group murid ikut guru tetap masing-masing, tulis ke tab guru tetap (bukan tab guru yang login).
  - Setiap row tulis 9 nilai termasuk `guruTetapNama` (H) dan `namaGuru` yang login (I).
  - Kolum C "Nama Guru" kekal nama guru yang sebenarnya rekod (untuk backward compat `getKehadiranStats`/`getKehadiranRekod`).
  - Murid yang guru tetap tidak jumpa → fallback ke tab namaGuru, warning di Logger.
- **`getKehadiranStats`** — cascade fix: ekstrak `.nama` dari `enrol.murid` (kini array object) sebelum bina `senarai`. Tiada perubahan logik atau output.
- **`renderGuruMuridChecklist`** (portal.html + index.html) — terima `[{nama, peranan}]`, papar badge kuning **"Ganti"** untuk murid dengan peranan BACKUP. Checkbox `value` dan payload submit kekal nama string sahaja.

### Behavior
- Guru backup login → checklist panel Kehadiran papar murid mereka dengan badge "Ganti".
- Guru backup submit kehadiran → rekod masuk tab guru tetap murid tersebut, bukan tab guru backup.
- Guru tetap semak stats mereka → sesi yang direkodkan oleh backup turut dikira (rekod sudah dalam tab mereka).
- Stats panel untuk guru backup: `totalSesi: 0` (out of scope — rekod dalam tab guru tetap, bukan tab backup). Akan ditangani dalam task berasingan.

### Verified
- `testGuruBackup()` dijalankan live: ZARUL SUZAIMI BIN ZAILI → 27 murid, semua `peranan: 'BACKUP'` — betul.
- Submit 3 murid sebagai ZARUL → rekod masuk tab **MUHAMMAD SHAFIE BIN BAHARI** dalam KEHADIRAN_SS_ID.
- Spreadsheet disahkan: kolum C = `ZARUL SUZAIMI BIN ZAILI` (Guru Hadir), kolum H = `MUHAMMAD SHAFIE BIN BAHARI` (Guru Tetap) — correct.
- `testKehadiranStats()` untuk SHAFIE: output kekal betul, `totalMurid` dan `unmatched` tidak terjejas oleh cascade fix.

### Deploy
- GAS deployed manual — `Code.js` + `portal.html` copy-paste ke GAS Editor → New version → Deploy (clasp tidak digunakan, lihat entry "Deployment Incident" bawah).
- `index.html` berjaya push via `git push pages main` (shafielegacy/SPKM) — PWA live update.
- `git push origin main` (BurnDVS/SPKM-SyafieLegacy) GAGAL — lihat entry "Deployment Incident" untuk detail dan status.

---

## [30 Jun 2026] — Deployment Incident: clasp + Node v24, git origin 403

### clasp push gagal — Node v24 / clasp 3.3.0
- `clasp push` dan `clasp login --no-localhost` gagal dengan OAuth error `Premature close`.
- Punca: kemungkinan incompatibility Node v24.17.0 dengan clasp 3.3.0 OAuth flow — belum disahkan.
- **Fallback yang digunakan:** Copy-paste manual `Code.js` dan `portal.html` terus ke GAS Editor → Save → Deploy → Manage deployments → Edit → New version → Deploy.
- `index.html` tidak melalui clasp, berjaya di-push normal via git.

### git push origin gagal — 403 credential mismatch
- `git push origin main` (BurnDVS/SPKM-SyafieLegacy) return 403: `Permission to BurnDVS/SPKM-SyafieLegacy.git denied to shafielegacy`.
- Punca: credential git Windows tersimpan adalah akaun `shafielegacy` (bukan `BurnDVS`) — kemungkinan ditukar semasa push ke `pages` sebelum ni.
- `git push pages main` (shafielegacy/SPKM) berjaya — PWA live tidak terjejas.
- **Status:** `origin` (BurnDVS/SPKM-SyafieLegacy) tertinggal commit `f588c57` — perlu sync apabila credential BurnDVS tersedia.
- **Fix:** `cmdkey /delete:LegacyGeneric:target=git:https://github.com` → push semula → login sebagai BurnDVS bila diminta.

---

## [30 Jun 2026] — Duplicate registration guard + Yuran name normalization

### Fixed
- `getYuranStats`: Nama dari rekod bayaran (`sudahBayarSet`) dan master list (`eligibleSet2`) kini guna normalization sama:
  `replace(/\s+/g, ' ').trim().toUpperCase()`.
- Ini elak mismatch bila nama ada double spaces atau spacing pelik antara rekod bayaran dan master list.

### Added
- Pendaftaran kanak-kanak kini block duplicate `NO_MYKID` di semua laluan backend:
  - `sendOTPKanak` — semak sebelum OTP dihantar
  - `confirmRegisterKanak` — semak sebelum `appendRow`
  - `registerKanak` — laluan lama/backend turut disekat
- Pendaftaran dewasa kini block duplicate `NO_MYKAD` di semua laluan backend:
  - `sendOTPDewasa` — semak sebelum OTP dihantar
  - `confirmRegisterDewasa` — semak sebelum `appendRow`
  - `registerDewasa` — laluan lama/backend turut disekat
- Helper baru:
  - `normalizeMykid_()`, `findExistingKanakByMykid_()`, `duplicateKanakMessage_()`
  - `normalizeMykad_()`, `findExistingDewasaByMykad_()`, `duplicateDewasaMessage_()`

### Behavior
- Format ID seperti `120101-10-1234`, `120101101234`, atau ada spacing dikira sebagai ID yang sama.
- Jika rekod sedia ada status `TIDAK AKTIF`, sistem tidak benarkan daftar baru; mesej minta hubungi admin untuk aktifkan semula.
- Duplicate disekat lebih awal sebelum parent terima OTP.

### Investigation notes
- Dashboard Yuran dan spreadsheet sempat berbeza kerana beberapa murid dalam `KelasDewasa` berstatus `TIDAK AKTIF`; dashboard/form memang filter `STATUS=AKTIF`.
- Kes `ZAINOR BIN AB HAMID` diabaikan selepas disahkan tiada dalam senarai murid dewasa berdaftar.

### Deploy
- `clasp login`/OAuth sempat gagal dengan `Premature close`, jadi `Code.js` disalin manual ke GAS editor.
- GAS dideploy manual melalui **Deploy → Manage deployments → Edit → New version → Deploy**.
- Commit `fa76f73` — `fix: prevent duplicate registration by mykid and mykad`
- Pushed ke `origin` (BurnDVS/SPKM-SyafieLegacy) dan `pages` (shafielegacy/SPKM)

---

## [28 Jun 2026] — Fix kiraan eBayar, block duplicate, bersih duplicate data

### Fixed
- `getEbayarStats`: Kira dari live data (PendaftaranBaru + KelasDewasa + CalculationXxx col D) — bukan formula spreadsheet yang boleh stale.
- `getYuranStats`: Master list murid kini baca terus dari PendaftaranBaru + KelasDewasa — bukan tab `NAMA MURID` dalam yuran spreadsheet.
- Kedua-dua panel (eBayar grid dan Dashboard Yuran) kini konsisten — guna sumber kebenaran yang sama.

### Added
- `confirmRegisterKanak`: Block pendaftaran duplikat — semak NO_MYKID sebelum appendRow. Return error jika MYKID sudah wujud.
- `confirmRegisterDewasa`: Block pendaftaran duplikat — semak NO_MYKAD sebelum appendRow. Return error jika MYKAD sudah wujud.

### Data cleanup
- Buang semua duplicate entries dalam PendaftaranBaru dan KelasDewasa.
- PendaftaranBaru: 130 murid (bersih, 0 duplicate MYKID)
- KelasDewasa: 42 murid (bersih, 0 duplicate)
- Total aktif: 172 murid

### Commits
- `95efaf4` — fix: getEbayarStats kira dari live data
- `8b4dd16` — fix: getYuranStats guna live data dari PendaftaranBaru+KelasDewasa
- `73bfaa7` — feat: block pendaftaran duplikat berdasarkan no. MYKID/MYKAD

---

## [23 Jun 2026]
### Fixed
- FCM private key format — fixFCMPrivateKey() rebuild PEM format betul 
  (BEGIN/END header, 64-char chunks). getFCMAccessToken() kini berjaya.
- Push notification PC berfungsi sepenuhnya.
- Session persist selepas refresh — _spkm_st = localStorage semua device,
  tryAutoLogin() berfungsi desktop+mobile, renewSession() GAS extend 30 minit,
  auto-renew timer setiap 20 minit.
- Header UI fix — headerPreLogin/headerPostLogin dikemaskini dalam tryAutoLogin().
- SW cache bump spkm-v11 → spkm-v12.

### Added
- renewSession() dalam Code.js — validate dan extend GAS session token.
- onKhatamSubmit() trigger — notification bila parent submit Borang Khatam 
  Iqra' atau Khatam Quran (spreadsheet 1jGp9U6lYRBvAVPSHhqSLv2WL5MHxdmKP5f5AnTHC8xU).
- createKhatamTriggers() — pasang onFormSubmit trigger untuk spreadsheet Khatam.

---

## eBayar Sync Fix — 2026-06-20

### Masalah
1. `syncFormMinusBayar()` baca senarai "sudah bayar" dari tab `NAMA MURID` — sebenarnya 
   tab tu senarai pendaftaran, bukan rekod bayaran. Akibatnya checkbox Google Form 
   eBayar tidak betul-betul menyingkir nama yang dah bayar.
2. `syncNamaMuridToAllForms()` tiada filter langsung — semua murid AKTIF dimasukkan ke 
   SEMUA 12 Google Form, tanpa kira bulan dia daftar. Murid baru daftar bulan JUN pun 
   muncul dalam form JAN-MEI (sepatutnya tak relevan).
3. Setiap kali ada pendaftaran murid baru, `syncNamaMuridToAllForms()` auto dipanggil 
   dan OVERWRITE checkbox semua 12 form dengan senarai penuh — ini reset balik kerja 
   `syncFormMinusBayar()` yang dah singkir nama yang dah bayar.
4. Typo Form ID untuk FEB2026 (ada huruf 'V' berlebihan di hujung) menyebabkan ralat 
   "No item with the given ID could be found" — bug lama yang baru terdedah.

### Fix
1. `syncFormMinusBayar()` kini baca dari `CalculationXxx2026` (kolum D, index 3) guna 
   `CALC_TAB_MAP`, bukan tab `NAMA MURID`.
2. `syncNamaMuridToAllForms()` kini loop 12 bulan secara individu, dengan 2 filter:
   - Filter tarikh daftar (`parseRegMonthIdx()`) — murid hanya masuk form bulan dia 
     daftar & seterusnya
   - Filter status bayaran (`CALC_TAB_MAP`) — exclude murid yang sudah bayar untuk 
     bulan tersebut
3. Fix typo Form ID FEB2026 di 3 lokasi: `setScriptProperties()`, 
   `syncNamaMuridToAllForms()`, `syncFormMinusBayar()`.

### Verifikasi
- 12/12 Google Form eBayar berjaya sync tanpa ralat
- Checkbox "NAMA PENUH MURID" kini jauh lebih pendek & relevan (cth JAN2026: 197→57 nama)
- Test helper baru: `testSyncNamaMuridManual()`

### Git
- Commit `75d6583` — Fix syncNamaMuridToAllForms + Form ID FEB2026
- Commit `7d2ad15` — Sync local dengan GAS (test helper + setScriptProperties fix)
- Pushed ke origin (BurnDVS) dan pages (shafielegacy)

---

## syncFormMinusBayar — DEPLOYED (19 Jun 2026)

- Fix: baca senarai "sudah bayar" dari tab CalculationXxx2026 (kolum D), bukan dari tab NAMA MURID (yang sebenarnya senarai pendaftaran, bukan bayaran)
- Trigger `onEbayarSubmit` auto-jalankan fungsi ni lepas setiap form submission eBayar
- Button manual "🧹 Kemas Form (Tolak Dah Bayar)" dalam panel Yuran (admin only)
- Verified: JUN2026 — 196 aktif, 102 sudah bayar, 96 nama tinggal dalam form

---

## [Fix] — 2026-06-14 — Kehadiran Stats: getMuridByGuru & getKehadiranStats

### Masalah
Panel "Statistik Kehadiran" untuk guru menunjukkan `totalMurid` yang salah (contoh: 57/60 berbanding sebenar 71 untuk Ustaz Shafie) — dikira dari rekod kehadiran sedia ada, bukan dari enrollment sebenar.

### Fix
- **`COL_KANAK.GURU = 16`** — tambah constant baru (col Q, Nama Guru) dalam `Code.js`
- **`getMuridByGuru()`** — ditulis semula. Kini baca terus dari `PendaftaranBaru` (col Q = index 16) dan `KelasDewasa` (col R = `COL_DEWASA.GURU` = 17), filter `STATUS = AKTIF` atau kosong, dedupe, sort A-Z. Tab "Pecahan Murid Mengikut Guru Kelas" tidak lagi digunakan.
- **`getKehadiranStats()`** — terima param `namaGuru` opsyenal:
  - **Bila ada `namaGuru`**: `totalMurid` = `getMuridByGuru().length` (enrollment), `byMurid` = semua murid terdaftar dengan `jumlahHadir` dari sheet Kehadiran (0 jika tiada rekod), `totalSesi` = bilangan tarikh unik dalam sheet, `unmatched[]` = nama dalam kehadiran yang tidak match enrollment
  - **Tanpa `namaGuru`** (admin): behavior asal dikekalkan
- **Frontend** (`index.html` ~ln 5207, `portal.html` ~ln 5043): `loadKehadiranStats()` hantar `namaGuru: loggedInGuru` dalam payload bila `currentRole !== 'ADMIN'`

### Verified
Ustaz Shafie → 71 murid AKTIF, totalSesi 159, `unmatched []`

### Deploy
- GAS Version 149 (14 Jun 2026)
- Git pushed ke `origin` (BurnDVS/SPKM-SyafieLegacy) dan `pages` (shafielegacy/SPKM)
- **PENTING:** `clasp push` sahaja tidak update code/behavior yang diserve oleh existing production Web App. Mesti **Deploy → Manage Deployments → Edit active Web App → New version → Deploy**; URL production kekal sama dan deployment baharu tidak diperlukan.

---

## [Fasa 1.4] — 2026-06-04

### Ditambah
- 🔔 Sistem Notifikasi in-app (macam TikTok/Instagram)
  - Bell icon dalam header desktop + mobile
  - Badge merah dengan bilangan notif belum dibaca
  - Panel dropdown dengan animasi slide-down
  - Bottom sheet panel untuk mobile view
  - "Tandakan semua dibaca" — badge hilang
- 🔊 Islamic Chime Sound (Web Audio API)
  - 3 nada ascending: C5 → E5 → G5
  - Decay lembut macam loceng masjid
  - Tanpa fail audio luar — 100% dalam kod
  - Auto-unlock pada first user interaction (autoplay policy)
- 📦 localStorage notification store
  - Key: `spkm_notif`
  - Max 50 notif, auto-buang yang lama
  - Persist merentasi session
- 🪝 4 Hook events:
  - Pendaftaran murid kanak-kanak berjaya
  - Pendaftaran murid dewasa berjaya
  - Kehadiran direkodkan (simpanKehadiranGuru)
  - Bayaran yuran tunai diterima (submitCashPayment)
- Berfungsi dalam `portal.html` (desktop GAS) DAN `index.html` (mobile PWA)

### Nota Teknikal
- Notif bersifat **per-browser** (localStorage) — setiap device ada notif sendiri
- Upgrade ke Sheets-based (shared notif) — KIV Fasa 2
- Zero impact ke fungsi sedia ada — hooks tambah selepas event berjaya sahaja

---

## [Fasa 1.3] — 2026

### Ditambah
- WhatsApp Blast via Fonnte API
- Tab WARemind dalam Sheets
- normalizePhoneForWA() — handle format 60x/0x/x
- Modal confirm + laporan blast WA
- notifikasiKetidakhadiran() — WA auto ke parents

---

## [Fasa 1.2] — 2026

### Ditambah
- PWA Mobile (index.html + manifest.json + sw.js)
- GitHub Pages deployment (shafielegacy/SPKM)
- CORS fix untuk fetch() dari GitHub Pages ke GAS
- Add to Home Screen support

---

## [Fasa 1.1] — 2026

### Ditambah
- eBayar — status bayaran per bulan (2024–2026)
- eSemak Yuran — carian nama, cross-check NAMA MURID
- recordCash — rekod bayaran tunai
- Senarai Guru — gambar thumbnail, badge jawatan, carta organisasi
- getMuridByGuru — guru hanya nampak murid sendiri
- Idle timeout — auto logout

---

## [Fasa 1.0] — 2026

### Pertama kali live
- Login Guru/Admin (email + telefon)
- Pendaftaran Murid Kanak-kanak (3 langkah + OTP)
- Pendaftaran Murid Dewasa (OTP)
- Rekod Kehadiran
- Autocrat generate slip pendaftaran
- Dashboard stats
- Token auth (JWT-like)
## 1 Jul 2026 — Queue #9 eBayar V2 staging import checkpoint correction

- Fourth staging import batch completed for 2026 using `skipExistingGroupsFirst:true`.
- Batch 4 result: `existingHashCount=25`, `sourceGroupsSelected=10`, `draftRows=15`, `rowsToAppend=15`, `appendedRows=15`.
- Diagnostic after batch 4: `lastRow=60`, `sourceRowHashColumn=21`, `existingHashCount=59` row entries.
- Total staging imported so far:
  - Batch 1: 5 source groups -> 7 child rows
  - Batch 2: 10 source groups -> 21 child rows
  - Batch 3: 10 source groups -> 16 child rows
  - Batch 4: 10 source groups -> 15 child rows
  - Total: 35 source groups -> 59 child payment rows
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, frontend switch, or production import was done.
## 1 Jul 2026 — Queue #9 eBayar V2 staging import batch 5

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
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 1 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 95 source groups -> 169 child payment rows.
- Latest diagnostic: `lastRow=170`, `sourceRowHashColumn=21`, `existingHashCount=169` row entries.
- Larger 25-source-group helpers were added and used successfully: `testImportEbayarPayments2026NextBatch25PreviewV2()` and `testImportEbayarPayments2026NextBatch25V2()`.
- Staging import safety limit is now `limitSourceRows <= 25`.
- Confirmed 25-group actual batch: `existingHashCount=70`, `sourceGroupsSelected=25`, `draftRows=46`, `rowsToAppend=46`, `appendedRows=46`.
- A later 25-group preview was run only and not imported: `existingHashCount=95`, `sourceGroupsSelected=25`, `draftRows=45`, `rowsToAppend=45`, `appendedRows=0`; source continues at `FEB2026` row 33.
- Important: the `FEB2026` row 33 preview batch has not been imported yet.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

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
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 295 source groups -> 518 child payment rows.
- Latest diagnostic: `lastRow=519`, `sourceRowHashColumn=21`, `existingHashCount=518` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 245 -> 270 source groups: +44 child rows, diagnostic `lastRow=479`, `existingHashCount=478`
  - 270 -> 295 source groups: +40 child rows, diagnostic `lastRow=519`, `existingHashCount=518`
- Source has progressed into `MEI2026`; the latest imported batch sample starts around `MEI2026` row 15.
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 345 source groups -> 605 child payment rows.
- Latest diagnostic: `lastRow=606`, `sourceRowHashColumn=21`, `existingHashCount=605` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 295 -> 320 source groups: +45 child rows, diagnostic `lastRow=564`, `existingHashCount=563`
  - 320 -> 345 source groups: +42 child rows, diagnostic `lastRow=606`, `existingHashCount=605`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 395 source groups -> 678 child payment rows.
- Latest diagnostic: `lastRow=679`, `sourceRowHashColumn=21`, `existingHashCount=678` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 345 -> 370 source groups: +37 child rows, diagnostic `lastRow=643`, `existingHashCount=642`
  - 370 -> 395 source groups: +36 child rows, diagnostic `lastRow=679`, `existingHashCount=678`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import checkpoint

- 2026 staging import has progressed to 445 source groups -> 761 child payment rows.
- Latest diagnostic: `lastRow=762`, `sourceRowHashColumn=21`, `existingHashCount=761` row entries.
- Recent accelerated import continued after the previous checkpoint:
  - 395 -> 420 source groups: +43 child rows, diagnostic `lastRow=722`, `existingHashCount=721`
  - 420 -> 445 source groups: +40 child rows, diagnostic `lastRow=762`, `existingHashCount=761`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 2026 staging import completed

- 2026 staging import is completed for all currently importable source groups.
- Final imported total: 457 source groups -> 779 child payment rows.
- Latest diagnostic: `lastRow=780`, `sourceRowHashColumn=21`, `existingHashCount=779` row entries.
- Final empty-check preview confirmed no remaining importable 2026 source groups: `existingHashCount=457`, `sourceGroupsSelected=0`, `draftRows=0`, `rowsToAppend=0`, `appendedRows=0`.
- Final movement after the previous checkpoint:
  - 445 -> 457 source groups: +18 child rows, diagnostic `lastRow=780`, `existingHashCount=779`
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 legacy 2024 staging import checkpoint

- 2026 staging import remains completed at 457 source groups -> 779 child payment rows.
- Legacy 2024 payment data from the 2025 source grouping has progressed to 125 source groups -> 235 child payment rows.
- Grand total in staging `Payments`: 582 source groups -> 1014 child payment rows.
- Latest diagnostic: `lastRow=1015`, `sourceRowHashColumn=21`, `existingHashCount=1014` row entries.
- Recent legacy import batches after 2026 completion: first 5 legacy batches total 125 source groups -> 235 child rows.
- Important: `sourceYear=2025` is the source grouping label, but imported payment year values are 2024 according to the source rows.
- Staging import safety limit remains `limitSourceRows <= 25`.
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 legacy 2024 staging import checkpoint

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
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 legacy 2024 staging import checkpoint

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
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 legacy 2024 staging import checkpoint

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
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
## 2 Jul 2026 — Queue #9 eBayar V2 final staging import checkpoint

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
- Live SPKM remains on the legacy yuran/eBayar flow. No GAS web app deployment, pages push, or frontend switch was done.
