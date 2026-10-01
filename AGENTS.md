# SPKM Agent Guide

Read [CURRENT_STATUS.md](CURRENT_STATUS.md) before changing this repository. Use [REFERENCE.md](REFERENCE.md) for architecture and deployment details, and [INTERNAL_OPERATIONS.md](INTERNAL_OPERATIONS.md) for operational procedures.

## Checkpoint Berkuat Kuasa — 1 Oktober 2026

- PWA `v1.0.1`, cache `spkm-v13`; `Bayaran Untuk` di atas `Pilih Murid / Anak`. Oktober kekal selepas memilih murid; default menggunakan `config.serverDate` dengan fallback tarikh Malaysia.
- Bukti release: manual preflight 2 murid/RM40 sehingga confirmation sahaja; jangan dakwa submission selesai.
- Production Pages commits `fb12ee6`, `9483088`, dokumentasi `69c368a`; source documentation `e956c62`. Ini checkpoint handoff, bukan dakwaan HEAD/remote tip semasa tanpa semakan.
- Source workspace `C:\Users\burnk\OneDrive\Documents-assets\SPKM`: `origin` → `https://github.com/BurnDVS/SPKM-SyafieLegacy.git`, `pages` → `https://github.com/shafielegacy/SPKM.git`.
- Clone production bersih `C:\Users\burnk\OneDrive\Documents-assets\SPKM_LIVE_FIX`: `origin` → `https://github.com/shafielegacy/SPKM.git`. Push source sahaja tidak update Pages; perubahan mesti sampai ke `shafielegacy/SPKM`. Utamakan clone ini untuk publication/verification Pages sehingga isu metadata/ACL source selesai.
- Parent `Documents-assets` mempunyai ACL inherited `Everyone:(I)(CI)(DENY)(DC)`; rename ke `SPKM_PAGES` gagal. Jangan ubah parent ACL secara kasual. Cleanup `.git/refs/...` / `.git/worktrees/SPKM` boleh gagal kerana permission/OneDrive walaupun commit/push berjaya; rujuk `CURRENT_STATUS.md` untuk lokasi terperinci.
- Fail sementara/untracked dipindahkan ke `C:\Users\burnk\OneDrive\SPKM_ARCHIVE_20261001`; `Code.js.bak` dan `portal.html.bak` kekal tracked. Jangan buang tracked backup atau perubahan setempat yang masih ada.
- Checkpoint lama di bawah ialah sejarah apabila bercanggah dengan handoff ini. Versi backend baharu tidak ditetapkan oleh release PWA; semak deployment berasingan, kekalkan URL dan Portal Mode `AUTO`.

- Active workspace: `C:\Users\burnk\OneDrive\Documents-assets\SPKM`
- Historical checkpoint: `1d07e8f`
- Portal Mode: `AUTO`

## Critical Invariants

- Treat January–August 2026 as legacy eBayar months. Native eBayar begins September 2026.
- Parents use unauthenticated public eSemak: January–August read legacy monthly sources, while September–December read canonical `Payments` with exact `STATUS=SELESAI`. Guru/Admin login remains separate.
- Staff Auth V2 uses e-mail OTP and server-revalidated Session V2. Legacy phone login and legacy sessions fail closed; privileged actor identity must come from the server. Public eSemak privacy/authentication Phase 2 remains pending and was unchanged by this rollout.
- Keep Portal Mode `AUTO` unless an administrator explicitly authorizes a temporary override.
- Native payment submissions remain subject to the current-month guard, 1–5 student limit, exact `studentKey` resolution, per-student duplicate checks, ScriptLock, one bulk payment write, post-write verification and no-retry handling for uncertain outcomes.
- Stable Native student identities are `KANAK:<BIL>` and `DEWASA:<BIL>`. Never expose MyKid/MyKad, phone, email or address as a browser selector identifier.
- Historical V2 rows with blank `STUDENT_ID` may require conservative normalized-name fallback. Never weaken this duplicate protection.
- Native payment rows use one `PAYMENT_GROUP_ID` across child rows. Group totals must be counted once, not once per child row.
- Receipt generation is independent of payment success, idempotent per group and must never trigger a second payment write.
- Bank slips remain private/restricted. Only the final receipt PDF may be shared as anyone-with-link/view; never share either folder or a temporary Doc.
- Never bypass month or payment guards for testing. Use the development deployment and controlled verification procedures.

## Deployment Invariants

- `origin` is the development/source repository; `pages` is the production GitHub Pages repository.
- A push to `origin` does not update production Pages. Fetch and inspect divergence before `git push pages main:main`.
- `.clasp` tracks only `appsscript.json`, `Code.js`, `portal.html` and `TestWA.js`.
- `clasp push` updates Apps Script editor/source only. It does not change production behavior.
- After `/dev` approval, edit the existing active Web App deployment and assign `New version`. Preserve its existing production URL; do not create a new deployment unless explicitly intended.
- Never stage all files blindly. Review `git status --short` and stage only intended files.

## Safety State — Snapshot Sejarah 2 September 2026

- Git checkpoint: `1d07e8f` (PR #1 merge of `98e585c`, Staff Auth V2).
- Production Apps Script is Version 185 (@185) on the existing deployment ID; the web app executes as `USER_DEPLOYING` under the documented owner account. Staff Auth V2 production smoke test passed on 2 September 2026.
- PWA auth publication is `de0d608` in `shafielegacy/SPKM`; only `index.html` was published in that commit, separately from the backend rollout.
- September Native eBayar, public eSemak receipt links and Admin hybrid dashboard have been production-verified.
- Ogos Legacy and canonical V2 are fully reconciled at 109 paid, 77 unpaid, 186 active students and RM3,760.
- Historical anomaly `PG-2026-JUN2026-112` was repaired and closed on 2 September 2026. Obsolete row 749 was cleared without structural row deletion; current-source-matching row 1571/hash `c15975677b4b9c18beb1d63a6f4c83806c77a42e59e8c1874a8e050e79b7e930` was preserved. September/Native data was not touched, and the temporary helper/test were removed in `2add115`.
- Existing dirty files and local diff artifacts listed in [CURRENT_STATUS.md](CURRENT_STATUS.md) must be preserved unless a task explicitly places them in scope.
