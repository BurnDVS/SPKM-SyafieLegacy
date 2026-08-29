# SPKM — Current Development Status

> **LAST VERIFIED: 29 August 2026, approximately 22:05 Asia/Kuala_Lumpur**
>
> **START HERE when resuming development.**

This file is the primary continuity handoff. Historical plans and staging logs remain useful, but this checkpoint controls whenever they conflict with an older note.

## 1. Repository and Deployment State

- Workspace: `C:\Users\burnk\OneDrive\Documents-assets\SPKM`
- Branch: `main`
- HEAD: `01e8634` (`chore: exclude tests from clasp push`)
- Auto Sync hardening: `391f164` (`fix: harden ebayar v2 auto sync`)
- Development/source remote: `origin` → `https://github.com/BurnDVS/SPKM-SyafieLegacy.git`
- Production Pages remote: `pages` → `https://github.com/shafielegacy/SPKM.git`
- Public PWA: `https://shafielegacy.github.io/SPKM`
- `origin/main` is aligned at `01e8634`.
- `pages/main` intentionally remains at the documentation checkpoint `db87448`; no public PWA source change required a Pages update.

Pushing `origin` does not update GitHub Pages. Before any future Pages push, fetch both remotes and inspect the commits on each side. Use an explicit `git push pages main:main` only after confirming a safe fast-forward.

## 2. Google Apps Script State

- Apps Script owner: `shafielegacykelasmengaji@gmail.com`.
- `.clasp` tracks exactly `appsscript.json`, `Code.js`, `portal.html` and `TestWA.js`; `.claspignore` must continue to exclude `tests/**`.
- Apps Script `@HEAD` was cloned after the final source correction. Those four files were content-identical to the local repository.
- During the first hardening source push, `tests/ebayar-v2-auto-sync.test.js` was accidentally included because `tests/**` was missing from `.claspignore`. The exclusion was added, the test file was removed manually from Apps Script, and a fresh clone confirmed that only the four intended source files remained. This deployment-hygiene incident is resolved.
- The existing production Web App deployment was updated in place from Version 175 to **Version 176** on 29 August 2026 at approximately 22:05 MYT.
- Deployment description: `SPKM Native eBayar Sep 2026 + Auto Sync hardening`.
- The existing deployment ID and `/exec` URL were preserved; no new deployment URL was created.

## 3. Public Safety State

- Production GitHub Pages frontend remains intentionally at `db87448`.
- Apps Script editor/source is aligned with local `01e8634`, and the active production Web App is verified on Version 176.
- Portal Mode is `AUTO`.
- `AUTO` resolves to `LEGACY` before 1 September 2026 and to `NATIVE` from 1 September 2026 onward in Malaysia time.
- Production Version 176 was verified: Admin portal and eBayar V2 Maintenance loaded, configured mode was `AUTO`, and resolved mode before 1 September remained `LEGACY`.
- August production status was `Synced`: 66 source groups, 66 existing, 0 new, 0 manual review, Legacy vs V2 `Match`, 102 paid, 84 unpaid, 186 total students and RM3,580 collection.

## 4. eBayar V2 Migration and Reconciliation

January–August 2026 legacy history remains authoritative. The corresponding V2 shadow migration and validation are complete.

- January–July: legacy and V2 matched exactly with zero differences, including paid-name sets.
- July catch-up: 39 source groups, 60 child payment rows, RM1,870 appended. Final July preview: 71 scanned, 71 unchanged existing, 0 changed existing and 0 genuinely new.
- The 16 August checkpoint covered 46 source groups, 69 child rows and RM2,520 through source row 47. This is retained as a superseded intermediate snapshot.
- Before the final 29 August sync, `OGOS2026` contained 66 source groups: 46 existing, 20 genuinely new, 0 manual review, 34 projected child rows and RM1,060 projected amount.
- The guarded Auto Sync was authorized and executed once. The browser reported an uncertain connection outcome, but a fresh authoritative status confirmed that the backend write completed. No retry was performed.
- Final August state: 66 source groups, 66 existing, 0 new, 0 manual review, 0 remaining child rows, RM0 remaining and status `Synced`.
- Final Legacy vs V2 reconciliation: `Match`; 102 paid, 84 unpaid, 186 total students and RM3,580 collection.
- September legacy source is header-only. No September legacy migration is required at this checkpoint.
- Known historical anomaly: `GROUP_ID_MULTIPLE_STAGED_HASHES` for `PG-2026-JUN2026-112`. It was investigated and is unrelated to the July/August catch-ups.

Canonical `Payments` schema:

`PAYMENT_ID`, `PAYMENT_GROUP_ID`, `TIMESTAMP`, `TAHUN`, `BULAN`, `BULAN_KEY`, `NAMA_MURID_RAW`, `NAMA_MURID_NORM`, `STUDENT_ID`, `NO_MYKID_MYKAD`, `STUDENT_TYPE`, `JUMLAH`, `AMOUNT_TOTAL`, `AMOUNT_ALLOCATED`, `STATUS`, `KAEDAH`, `RESIT_URL`, `SOURCE_YEAR`, `SOURCE_SHEET`, `SOURCE_ROW`, `SOURCE_ROW_HASH`, `MATCH_STATUS`, `MATCH_CONFIDENCE`, `NOTE`, `CREATED_AT`, `UPDATED_AT`.

## 5. eBayar V2 Maintenance

The maintenance panel is available inside the authenticated Yuran admin area. UI access is admin-only and backend authorization remains authoritative.

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

The 29 August uncertain browser response demonstrated the intended no-retry procedure: inspect fresh authoritative staging/status first, and never repeat a potentially completed write merely because the browser response was uncertain.

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

Checkpoint commit: `612128e`.

Implemented functions validate the payment group, create a canonical snapshot, populate receipt fields and generate the receipt. Operational guarantees:

- Payment persistence finishes and releases its payment lock before receipt work begins.
- Receipt generation uses its own lock.
- Exactly one final PDF is created per payment group.
- A temporary Google Doc is created privately, converted to PDF, then trashed.
- The final PDF is stored in the receipt folder and only that file is changed to anyone-with-link/view.
- Every child row in the group receives the same `RESIT_URL`.
- Repeated generation is idempotent when the group already has one consistent URL.
- Mixed or inconsistent receipt URLs return a review state rather than creating another receipt.
- Payment success remains independent: receipt failure never causes payment re-submission.
- Post-write uncertainty is reported explicitly and must not trigger an automatic second attempt.
- Receipts exclude MyKid/MyKad, phone, email, address, slip URL and internal hashes.

Frontend handling:

- `receiptReady: true` shows a receipt message and opens the receipt link with a new-window target and `noopener` protection.
- `receiptReady: false` reports that payment succeeded but the receipt is unavailable.
- Neither path retries the payment.

No real Native receipt has been generated.

## 11. Drive Folder Configuration

Slip folder:

- Script Property: `NATIVE_EBAYAR_SLIP_FOLDER_ID`
- Name: `SPKM - Native eBayar Slips`
- Must remain private/restricted and must never be link-shared.
- Verify the configured folder ID in Apps Script Script Properties; do not copy the value into tracked documentation.

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

All are present on `origin`. `pages/main` intentionally remains at `db87448` because the later changes do not affect public PWA source.

## 13. Preserved Dirty Worktree

Recorded dirty/untracked state before this documentation task:

```text
 M TestWA.js
 M appsscript.json
 M sw.js
?? .claude/
?? MASTER PROMPT SPDK — POST COURSE SECURITY HARDENING.txt
?? documentation-checkpoint.diff.txt
?? native-ebayar-phase1.diff.txt
?? native-ebayar-phase2a.diff.txt
?? native-ebayar-phase2b.diff.txt
```

The three `native-ebayar-*.diff.txt` files are local audit artifacts and must not be committed. `TestWA.js` and `appsscript.json` previously matched HEAD by content despite their line-ending state; do not restore them casually. Preserve all unrelated changes.

## 14. Next Session Checklist

The production deployment is already Version 176. The remaining controlled milestone is the first real Native transaction on or after 1 September 2026:

1. Read this file, `REFERENCE.md` and `INTERNAL_OPERATIONS.md`.
2. Verify `git status --short`, current branch, `origin/main` at `01e8634`, and the intentional `pages/main` position at `db87448`.
3. Confirm `EBAYAR_PORTAL_MODE` remains `AUTO` and resolves to `NATIVE` on or after 1 September 2026.
4. Check `NATIVE_EBAYAR_SLIP_FOLDER_ID` and `NATIVE_EBAYAR_RECEIPT_FOLDER_ID` in Apps Script Script Properties, then verify the resolved folder names and sharing: both folders Restricted; slip files private; only final receipt PDFs link-view.
5. Select one genuinely unpaid official student and use a small valid bank slip.
6. Submit exactly once. If the browser outcome is uncertain, do not retry; inspect `Payments` and Drive artifacts first.
7. Verify one `PAYMENT_GROUP_ID`, the expected child-row count, stable `STUDENT_ID` values, correct amount/source metadata and no duplicates.
8. Verify the bank slip and slip folder remain private/restricted.
9. Verify exactly one final receipt PDF, one common `RESIT_URL` across all child rows, safe receipt content and a trashed temporary Doc.
10. Exercise the receipt read/generation path again to confirm idempotency without creating a second payment or receipt.
11. Keep Portal Mode `AUTO` and continue using the existing production deployment URL.

## 15. Current Completion Boundary

Implemented, reconciled and production-deployed on Version 176: V2 historical migration, guarded maintenance Auto Sync with exact confirmed IDs, Portal Mode, Native Phase 2A and Phase 2B.

Not yet complete: the first real Native payment/upload/receipt transaction and its privacy/idempotency verification on or after 1 September 2026. Do not mark Native eBayar fully proven until that controlled milestone succeeds. Parent Google login/dashboard work in the original V2 plan also remains future scope.
