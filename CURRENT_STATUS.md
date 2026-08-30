# SPKM — Current Development Status

> **LAST VERIFIED: 30 August 2026, Asia/Kuala_Lumpur**
>
> **START HERE when resuming development.**

This file is the primary continuity handoff. Historical plans and staging logs remain useful, but this checkpoint controls whenever they conflict with an older note.

## 1. Repository and Deployment State

- Workspace: `C:\Users\burnk\OneDrive\Documents-assets\SPKM`
- Branch: `main`
- HEAD: `076f68a` (`feat: prepare native ebayar routing and admin shortcut`)
- Native Slides receipt implementation: `15d7991` (`feat: generate native ebayar receipts from slides template`)
- Previous documentation checkpoint: `fd3203c` (`docs: record native ebayar production readiness`)
- Auto Sync hardening: `391f164` (`fix: harden ebayar v2 auto sync`)
- Development/source remote: `origin` → `https://github.com/BurnDVS/SPKM-SyafieLegacy.git`
- Production Pages remote: `pages` → `https://github.com/shafielegacy/SPKM.git`
- Public PWA: `https://shafielegacy.github.io/SPKM`
- `origin/main` is aligned at `076f68a`.
- Production `pages/main` is at `7b5476e` (`feat: route PWA eBayar to native portal`).
- Pages was published from the separate detached worktree `C:\Users\burnk\OneDrive\Documents-assets\SPKM-pages-publish` using `git push pages HEAD:main`.

Pushing `origin` does not update GitHub Pages. Before any future Pages push, fetch both remotes and inspect the commits on each side. Use an explicit `git push pages main:main` only after confirming a safe fast-forward.

## 2. Google Apps Script State

- Apps Script owner: `shafielegacykelasmengaji@gmail.com`.
- `.clasp` tracks exactly `appsscript.json`, `Code.js`, `portal.html` and `TestWA.js`; `.claspignore` must continue to exclude `tests/**`.
- Apps Script `@HEAD` is up to date with local source through the latest clasp push.
- During the first hardening source push, `tests/ebayar-v2-auto-sync.test.js` was accidentally included because `tests/**` was missing from `.claspignore`. The exclusion was added, the test file was removed manually from Apps Script, and a fresh clone confirmed that only the four intended source files remained. This deployment-hygiene incident is resolved.
- The existing production Web App deployment is now **Version 177**.
- Deployment description: `SPKM Native eBayar production - September 2026`.
- The existing deployment ID and `/exec` URL were preserved; no new deployment URL was created.
- Version 177 includes the Slides-template Native receipt implementation.

## 3. Public Safety State

- Production GitHub Pages is published at `7b5476e` from the separate Pages worktree.
- Apps Script production is Version 177 and includes the Slides-template receipt implementation.
- Portal Mode is `AUTO`.
- `AUTO` resolves to `LEGACY` before 1 September 2026 and to `NATIVE` from 1 September 2026 onward in Malaysia time.
- Production Version 177 is active on the preserved `/exec` URL. Portal Mode was restored to `AUTO`; it resolves to `LEGACY` before 1 September and `NATIVE` from 1 September in Malaysia time.
- August production status is `Synced`: 67 source groups, 67 existing, 0 new, 0 new child rows, Legacy vs V2 `Match`, 104 paid, 82 unpaid, 186 total students and RM3,640 collection.

## 4. eBayar V2 Migration and Reconciliation

January–August 2026 legacy history remains authoritative. The corresponding V2 shadow migration and validation are complete.

- January–July: legacy and V2 matched exactly with zero differences, including paid-name sets.
- July catch-up: 39 source groups, 60 child payment rows, RM1,870 appended. Final July preview: 71 scanned, 71 unchanged existing, 0 changed existing and 0 genuinely new.
- The 16 August checkpoint covered 46 source groups, 69 child rows and RM2,520 through source row 47. This is retained as a superseded intermediate snapshot.
- Before the final 29 August sync, `OGOS2026` contained 66 source groups: 46 existing, 20 genuinely new, 0 manual review, 34 projected child rows and RM1,060 projected amount.
- The guarded Auto Sync was authorized and executed once. The browser reported an uncertain connection outcome, but a fresh authoritative status confirmed that the backend write completed. No retry was performed.
- The 29 August result above remains a historical checkpoint. On 30 August, one additional real August legacy payment group containing 2 child rows and RM60.00 was synced once. The browser transport response was uncertain, so no retry was made; refresh confirmed the write.
- Final 30 August state: 67 source groups, 67 existing, 0 new, 0 new child rows and status `Synced`.
- Final Legacy vs V2 reconciliation: `Match`; 104 paid, 82 unpaid, 186 total students and RM3,640 collection.
- September legacy source is header-only. No September legacy migration is required at this checkpoint.
- Known historical anomaly: `GROUP_ID_MULTIPLE_STAGED_HASHES` for `PG-2026-JUN2026-112`. It was investigated and is unrelated to the July/August catch-ups.

Canonical `Payments` schema:

`PAYMENT_ID`, `PAYMENT_GROUP_ID`, `TIMESTAMP`, `TAHUN`, `BULAN`, `BULAN_KEY`, `NAMA_MURID_RAW`, `NAMA_MURID_NORM`, `STUDENT_ID`, `NO_MYKID_MYKAD`, `STUDENT_TYPE`, `JUMLAH`, `AMOUNT_TOTAL`, `AMOUNT_ALLOCATED`, `STATUS`, `KAEDAH`, `RESIT_URL`, `SOURCE_YEAR`, `SOURCE_SHEET`, `SOURCE_ROW`, `SOURCE_ROW_HASH`, `MATCH_STATUS`, `MATCH_CONFIDENCE`, `NOTE`, `CREATED_AT`, `UPDATED_AT`.

## 5. eBayar V2 Maintenance

The maintenance panel is available inside the authenticated Yuran admin area. UI access is admin-only and backend authorization remains authoritative.

The published PWA Dashboard Yuran now includes an `eBayar V2 Maintenance` shortcut for authenticated `ADMIN` users only. It opens the production Apps Script `/exec` portal in a protected new tab. Non-admin users do not see it, and direct backend Admin authorization remains authoritative. The complete maintenance interface remains in the Apps Script portal; duplicating that full interface in the PWA is optional future scope.

The generic current-month sync engine:

- defaults to read-only preview;
- considers only genuinely new source groups;
- limits each batch to 25 groups;
- validates group ID, source location, source hash and secondary content fingerprint;
- uses ScriptLock, post-lock source reread and TOCTOU comparison;
- performs one bulk `setValues()` append with no partial-write loop;
- rechecks staging before write and verifies after write;
- must not be retried automatically after an uncertain write outcome.
- binds a confirmed write to an immutable copy of the exact preview `paymentGroupIds`;
- requires 1–25 non-empty, unique IDs and rejects IDs that are no longer genuinely new;
- uses a 120-second frontend settlement timeout, always clears loading state and blocks duplicate confirmation clicks.

The original `/dev` defect combined a lost preview-ID handoff with an unbounded Promise wait. Action naming and backend routing were already correct. Commit `391f164` corrected the request contract and loading cleanup; `tests/ebayar-v2-auto-sync.test.js` passed 7 tests with 0 failures.

The 29 and 30 August uncertain browser responses demonstrated the intended no-retry procedure: inspect fresh authoritative staging/status first, and never repeat a potentially completed write merely because the browser response was uncertain. The 30 August refresh confirmed 67 existing groups and 0 new groups.

## 6. Portal Mode

Allowed modes are `AUTO`, `LEGACY`, `NATIVE` and `BOTH`.

- Script Property: `EBAYAR_PORTAL_MODE`
- Missing or invalid value falls back to `AUTO`.
- Audit properties: `EBAYAR_PORTAL_MODE_UPDATED_AT` and `EBAYAR_PORTAL_MODE_UPDATED_BY`.
- Cutoff: `2026-09-01` in Malaysia time.
- Current configured mode: `AUTO`.
- `BOTH` was tested through `/dev` and then restored to `AUTO`.
- Legacy future-month cards remain visible but their payment buttons are disabled until the month becomes current.

## 7. Native eBayar Boundary and User Flow

- January–August 2026: legacy Google Form only.
- September–December 2026: Native eBayar, enabled only when the selected month is current or past under the server rule.
- The published GitHub Pages PWA preserves the original January–August Google Form routes unchanged. September–December route to the approved production Apps Script `/exec` URL; no public route uses `/dev`.
- Native month availability is gated by Malaysia time: September opens 1 September, October 1 October, November 1 November and December 1 December. Later months remain disabled until their first day.
- No physical legacy future-month tabs are required for Native operation.
- One submission supports 1–5 students sharing one month, payment date, total amount, optional transaction reference and bank slip.
- One `PAYMENT_GROUP_ID` is written across one child row per selected student.
- If any selected student is duplicate or invalid, the entire group is rejected.
- The unpaid-only lookup is a UX filter; backend preflight and locked duplicate checks remain authoritative.
- Future-month submission remains blocked.
- Do not introduce or use a testing bypass merely to submit before September.

## 8. Native Student Identity

- Stable identities: `KANAK:<BIL>` and `DEWASA:<BIL>`.
- MyKid/MyKad is never used as the public selector value and must not be exposed to the browser.
- Students with identical names remain distinct because selection and resolution use `studentKey`.
- Native duplicate detection uses `STUDENT_ID`.
- Historical V2 rows with blank `STUDENT_ID` use conservative normalized-name fallback.
- If multiple official records make that fallback ambiguous, the submission is blocked for review.

## 9. Native Phase 2A — Payment Persistence

Checkpoint commit: `d171e8c`.

The submission endpoint preserves these guarantees:

- Portal Mode must resolve to `NATIVE` or `BOTH`.
- September lower boundary and future-month/date rules remain server-authoritative.
- Exactly 1–5 unique, current official `studentKey` values are required.
- Per-student duplicate validation occurs before and again under ScriptLock.
- One shared slip is limited to 3 MB raw data.
- Base64 length and whitespace are capped before decode; MIME, extension and file signature are validated after decode.
- Slip is uploaded privately, payment rows are appended in one `setValues()` call, and orphan files are cleaned up when safe.
- Post-write verification distinguishes confirmed success from uncertain outcomes; uncertain writes must not be retried without staging inspection.
- Native rows use `STATUS=SELESAI`, `KAEDAH=NATIVE_EBAYAR`, `SOURCE_SHEET=NATIVE_EBAYAR`, Native source metadata and stable `STUDENT_ID`.
- `MATCH_STATUS` and `MATCH_CONFIDENCE` are left blank because direct Native resolution is not a legacy migration match.
- `NOTE` stores compact structured JSON for group context.
- `AMOUNT_TOTAL` may repeat on child rows for schema compatibility, but all reports must deduplicate totals by `PAYMENT_GROUP_ID`.

No real Native write or slip upload has been executed.

## 10. Native Phase 2B — Receipt Generation

Original receipt checkpoint: `612128e`. Slides-template implementation: `15d7991`; preview finalisation: `0b1d10b`.

Implemented functions validate the payment group, create a canonical snapshot, populate receipt fields and generate the receipt. Operational guarantees:

- Payment persistence finishes and releases its payment lock before receipt work begins.
- Receipt generation uses its own lock.
- Exactly one final PDF is created per payment group.
- Receipt rendering copies the approved one-slide Google Slides template (`1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`), replaces all five placeholders, exports the copy to PDF and trashes the temporary presentation in a `finally` cleanup path. The original template is never modified.
- The template retains its 576 × 288 pt landscape design. Multiple child names use balanced wrapping with local font reduction.
- The final PDF is stored in the receipt folder and only that file is changed to anyone-with-link/view.
- Every child row in the group receives the same `RESIT_URL`.
- Repeated generation is idempotent when the group already has one consistent URL.
- Mixed or inconsistent receipt URLs return a review state rather than creating another receipt.
- Payment success remains independent: receipt failure never causes payment re-submission.
- Post-write uncertainty is reported explicitly and must not trigger an automatic second attempt.
- Receipts exclude MyKid/MyKad, phone, email, address, slip URL and internal hashes.
- Production receipts do not include the preview watermark.

Frontend handling:

- `receiptReady: true` shows a receipt message and opens the receipt link with a new-window target and `noopener` protection.
- `receiptReady: false` reports that payment succeeded but the receipt is unavailable.
- Neither path retries the payment.

The synthetic September preview generated successfully through the real Slides-to-PDF path using two sample children and RM100.00, with an obvious `CONTOH / TIDAK SAH` indication. It created no payment row or production receipt record. Full local validation passed 14 tests with 0 failures; `Code.js` syntax, `/dev` smoke testing and Auto Sync preview/cancel also passed. The Slides renderer is now included in production Version 177, but no real Native production receipt has been generated.

## 11. Drive Folder Configuration

Slip folder:

- Script Property: `NATIVE_EBAYAR_SLIP_FOLDER_ID`
- Name: `SPKM - Native eBayar Slips`
- Must remain private/restricted and must never be link-shared.
- Verify the configured folder ID in Apps Script Script Properties; do not copy the value into tracked documentation.

Receipt template and preview:

- Script Property: `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID`; configured template ID is `1xKvt6wNlHtv71fsfsLSX6TobCOaK073pTdEQgbFfAoQ`.
- Synthetic preview helper: `testCreateNativeEbayarReceiptSlidesPreviewV2`.
- Script Property: `NATIVE_EBAYAR_RECEIPT_PREVIEW_FOLDER_ID`; its folder must differ from the production receipt folder.
- The preview helper uses synthetic data only and must not write `Payments` or `RESIT_URL`.

Receipt folder:

- Script Property: `NATIVE_EBAYAR_RECEIPT_FOLDER_ID`
- Name: `SPKM - Native eBayar Receipts`
- Folder should remain Restricted; only the final receipt PDF receives anyone-with-link/view.
- Verify the configured folder ID in Apps Script Script Properties; do not copy the value into tracked documentation.

## 12. Git Checkpoints

- `f0af240` — completed July migration validation.
- `acfaafa` — added eBayar V2 maintenance panel.
- `da0b6df` — added guarded current-month Auto Sync.
- `d171e8c` — Native eBayar Phase 2A payment persistence.
- `612128e` — Native eBayar Phase 2B receipt generation.
- `db87448` — initial current-status documentation checkpoint.
- `391f164` — hardened eBayar V2 Auto Sync confirmation and timeout handling.
- `01e8634` — excluded `tests/**` from clasp source pushes.
- `fd3203c` — previous production-readiness documentation checkpoint.
- `15d7991` — replaced Native generic-Doc receipt rendering with the existing Slides template.
- `0b1d10b` — finalised the safe synthetic Slides receipt preview.
- `cf6c8b8` — showed Maybank QR instructions in Native eBayar.
- `e21e37d` — recorded Native receipt readiness and August reconciliation.
- `076f68a` — prepared Native PWA monthly routing and the Admin maintenance shortcut; current `origin/main` application checkpoint.
- Pages `7b5476e` — published Native routing to the production GitHub Pages repository.

The application commits are present on `origin`; `origin/main` is aligned at `076f68a`. Production `pages/main` is separately aligned at `7b5476e`.

## 13. Preserved Dirty Worktree

Recorded dirty/untracked state before this documentation task:

```text
 M TestWA.js
 M sw.js
?? .claude/
?? MASTER PROMPT SPDK — POST COURSE SECURITY HARDENING.txt
?? documentation-checkpoint.diff.txt
?? native-ebayar-phase1.diff.txt
?? native-ebayar-phase2a.diff.txt
?? native-ebayar-phase2b.diff.txt
?? output/
?? tmp/
```

The three `native-ebayar-*.diff.txt` files are local audit artifacts and must not be committed. Preserve `TestWA.js`, `sw.js`, `appsscript.json`, `.claude/`, `output/`, `tmp/`, the separate Pages worktree and all unrelated changes; do not restore or clean them casually.

## 14. Next Session Checklist

Production Version 177 and GitHub Pages Native routing are published. The remaining controlled milestone is the first real Native transaction on or after 1 September 2026:

1. Read this file, `REFERENCE.md` and `INTERNAL_OPERATIONS.md`.
2. Verify `git status --short`, current branch, `origin/main` at `076f68a`, production `pages/main` at `7b5476e`, and the preserved detached Pages worktree.
3. Confirm `EBAYAR_PORTAL_MODE` remains `AUTO` and resolves to `NATIVE` on or after 1 September 2026.
4. Confirm production remains Version 177 on the existing deployment ID and `/exec` URL, with Portal Mode `AUTO` and the Slides receipt source included.
5. Check `NATIVE_EBAYAR_SLIP_FOLDER_ID`, `NATIVE_EBAYAR_RECEIPT_FOLDER_ID` and `NATIVE_EBAYAR_RECEIPT_TEMPLATE_ID` in Script Properties. Verify both folders remain Restricted, slip files private, only final receipt PDFs link-view, and the configured template is approved.
6. Select one genuinely unpaid official student and use a small valid bank slip.
7. Submit exactly once. If the browser outcome is uncertain, do not retry; refresh authoritative status and inspect `Payments` and Drive artifacts first.
8. Verify one `PAYMENT_GROUP_ID`, the expected child-row count, stable `STUDENT_ID` values, correct amount/source metadata and no duplicates.
9. Verify the bank slip and slip folder remain private/restricted.
10. Verify exactly one final receipt PDF, one common `RESIT_URL` across all child rows, safe receipt content and a trashed temporary Slides copy.
11. Exercise the receipt read/generation path again to confirm idempotency without creating a second payment or receipt.
12. Keep Portal Mode `AUTO` and continue using the existing production deployment URL.

## 15. Current Completion Boundary

Implemented, reconciled and published: V2 historical migration, guarded maintenance Auto Sync with exact confirmed IDs, Portal Mode, Native Phase 2A/2B with Slides receipts in production Version 177, GitHub Pages monthly Native routing and the admin-only PWA maintenance shortcut.

Not yet complete: the first real Native payment/upload/receipt transaction and its privacy/idempotency verification on or after 1 September 2026. Do not mark Native eBayar fully proven until that controlled milestone succeeds. Parent Google login/dashboard work in the original V2 plan also remains future scope.
