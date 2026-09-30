# C1.6 — UID ownership verification procedure

Local implementation only. Production remains @196 until a separately authorized rollout.
No live verification has been executed by this patch. The 185/173/12/185/0 result
is the expected production checkpoint, proven here only with synthetic unit fixtures.

The approved manifest is server source in `getApprovedManualUidBindings_()`:
UID, TYPE, canonical normalized name, and `MANUAL_ROSTER`. It contains only the
12 owners explicitly approved by the administrator. It contains no official
identifier, contact data, address, HMAC secret, or spreadsheet approval flag.

Runtime uses one roster/registry snapshot. It requires unique roster UID,
registry presence, matching type/name, registry ACTIVE, active/eligible roster,
and either the approved manual binding or an OFFICIAL_ID fingerprint verified
using the existing server HMAC secret. Any mismatch fails closed.

## Expected Apps Script editor procedure — separate future authorization

1. Verify the existing Apps Script project and production deployment @196.
   Do not create a deployment, change its URL, or assign a new production version.
2. After source/editor-upload authorization, load the reviewed C1.5+C1.6 source
   into that existing editor. Source loading changes editor/dev code; it does
   not change @196. No source upload is performed by the current task.
3. Verify `EBAYAR_MASTER_SS_ID` is configured for the intended master and the
   existing `STUDENT_UID_HMAC_SECRET_V1` is configured. Do not log/export either
   property value; do not create or replace a secret. Missing master ID fails
   closed without Drive discovery or property writes.
4. If the editor cannot select the private helper directly, add this temporary
   runner in the editor only; save without publishing a version:

   ```javascript
   function runC16UidOwnershipReadOnlyOnce() {
     return verifyCurrentNativeUidOwnership_('2027-01');
   }
   ```

5. Run the helper/runner once as the documented project owner. It reads roster
   and registry, and uses HMAC privately. It does not read/write Payments, call
   registration/setup/import/payment/receipt code, mutate any sheet, or generate
   a UID. January 2027 is an eligibility audit target, not a payment-guard bypass.
6. Inspect its JSON log: `success=true`, `total=185`, `registryCount=185`,
   `OFFICIAL_ID=173`, `MANUAL_ROSTER=12`, `verified=185`, `failureCount=0`,
   `failures=[]`. Any differing count or failure means STOP; do not repair,
   rebind, backfill, or record payments as part of verification.
7. Failures contain UID/type/source sheet/source row when an individual record
   fails. Snapshot/config failures have a generic reason. Raw exceptions,
   official identifiers, HMAC fingerprints, and secrets are never logged.
8. Remove the temporary runner immediately after verification, save the editor,
   and confirm its name is absent before any future final deployment. The runner
   is not in committed/local production source and must never be published.
9. Retain the summary as verification evidence. Keep @196 active. Commit, push,
   final deployment and C2 Native Cash require separate instructions.

The helper uses one read-only snapshot, not a cross-spreadsheet transaction.
Run while roster/registry maintenance is quiescent and repeat before a later
cutover if either source changes. No result should be called runtime-proven
until this editor execution succeeds against the intended live sources.
