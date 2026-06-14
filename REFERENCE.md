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
| SPKM Main DB (+ eBayar 2025) | `1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU` | **Satu fail multi-purpose**: Maklumat Guru, PendaftaranBaru, KelasDewasa, Kehadiran (Fasa 1 data) **DAN** tab eBayar 2025 (Mei–Dis) — sebab semua pendaftaran murid baru (kanak-kanak & dewasa) masuk sini, jadi data yuran 2025 sekali dalam fail ni |
| eBayar 2026 (Jan–present) — `YURAN_SS_ID` | `1AUH-ZwrbDjB5l2J5H8t2MBlbzkITMJp66J2VDLZF9CM` | Tab per bulan (JAN2026...DIS2026), NAMA MURID, Calculation* |
| Kehadiran — `KEHADIRAN_SS_ID` | `1qez9OLXmJuU0nFCBnbuZqjc_DnTJh7kMElqCRnxK7F4` | Satu tab per guru, scan via `cariTabGuru()` |
| Sijil Khatam | `1jGp9U6lYRBvAVPSHhqSLv2WL5MHxdmKP5f5AnTHC8xU` | Tab "Khatam Iqra'" + "Khatam Quran" |

📌 To-Do #9: gabung tab eBayar 2025 (dari SPKM Main DB) + eBayar 2026 (`YURAN_SS_ID`) jadi satu spreadsheet dengan tab per tahun. Catatan: SPKM Main DB akan kekal untuk tab pendaftaran/kehadiran — hanya tab eBayar 2025 yang dipindah/disalin.

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

## 🔧 Workflow

- **Claude.ai** (chat ini): planning, review code, architecture decisions, MCP tasks (baca Google Drive/Sheets)
- **Claude Code**: editing fail, `clasp push`, git commit/push — TIDAK ubah logic tanpa arahan tepat dari Claude.ai
- Untuk perubahan logic kompleks: paste full code di Claude.ai → dapat diff/replacement tepat → manual edit di VS Code → Claude Code handle git/clasp

### Known issues
- Claude Code heredoc/paste boleh corrupt code blocks panjang — guna PowerShell `Add-Content` dari fail temp sebagai fallback
- Python tak available — PowerShell adalah scripting fallback
- `UPKK Bahasa Arab` = projek lain, TAK berkaitan SPKM

---

## 🚀 Second Project (early setup)

`kursusitu/spdk` → live di `kursusitu.github.io/spdk` — projek GAS + GitHub Pages berasingan, pattern sama dengan SPKM. Boleh rujuk reference ni sebagai template untuk projek tu juga.

---

*Last updated: 14 Jun 2026*
