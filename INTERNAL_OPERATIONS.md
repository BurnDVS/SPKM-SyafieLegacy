# SPKM Internal Operations Notes

Dokumen ini menyimpan nota operasi yang tidak sesuai dipaparkan dalam `README.md` public GitHub, tetapi masih berguna untuk rujukan projek.

Maklumat paling sensitif seperti credential sebenar, private URL, token, dan ID penuh kekal dirujuk melalui dokumen local/private seperti `CLAUDE.md`, `AGENTS.md`, dan `REFERENCE.md`.

---

## Repo & Deployment

| Perkara | Nota |
|---|---|
| Repo utama | `BurnDVS/SPKM-SyafieLegacy` |
| Repo GitHub Pages | `shafielegacy/SPKM` |
| Live mobile PWA | `https://shafielegacy.github.io/SPKM` |
| Live GAS desktop | Simpan di dokumen private/local |
| Deploy GAS | Push source ke Apps Script, kemudian deploy new web app version secara manual |
| Deploy mobile | Push ke `origin` dan `pages` |

Nota penting:
- Bila deploy GAS, pastikan deployment type ialah **Web App**, bukan Library.
- `clasp push` hanya update source code dalam editor Apps Script.
- Untuk apply ke production, mesti buat:
  `Deploy -> Manage deployments -> Edit -> New version -> Deploy`
- Jangan guna `clasp deploy` untuk workflow production SPKM kerana ia boleh hasilkan deployment URL baru.

Fallback jika `clasp login` gagal:
1. Cuba `clasp logout`.
2. Cuba `clasp login --no-localhost`.
3. Jika OAuth masih gagal dan fix urgent, copy `Code.js` manual ke GAS editor, Save, kemudian deploy new version.

---

## Peranan & Akses

| Peranan | Akses | Cara Masuk |
|---|---|---|
| Guru / Admin | Dashboard penuh | Email + No. WhatsApp |
| Ibu Bapa / Wali | Portal daftar sahaja | Tanpa login |
| Murid Dewasa | Portal daftar sahaja | Tanpa login |

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
- Login Guru/Admin dengan email + nombor telefon.
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

#### eBayar V2 Shadow Workflow

- Current live yuran/eBayar flow remains **LEGACY**.
- V2 is backend-only shadow/read model in `Code.js`; no UI is switched to V2 yet.
- Do not deploy or switch `index.html` / `portal.html` to V2 until `compareYuranLegacyVsV2` passes for the target months.
- Staging spreadsheet should be `SPKM eBayar Master`, stored via Script Property `EBAYAR_MASTER_SS_ID`.
- 1 Jul 2026: `SPKM eBayar Master` has been created, `EBAYAR_MASTER_SS_ID` has been set, and `ensureEbayarMasterSchemaV2` has initialized the schema.
- Initialized tabs: `Payments`, `Config`, `ImportLog`, `MonthlySummary`, `YearlySummary`, `StudentsSnapshot`.
- `Payments` row 1 has full schema headers from `PAYMENT_ID` through `UPDATED_AT`.
- Import/copy eBayar data later only after source mapping is confirmed:
  - 2025 eBayar tabs from SPKM Main DB.
  - 2026 eBayar tabs from `YURAN_SS_ID`.
- No V2 data import/copy has been done yet.
- Do not modify existing live functions during shadow work: `getYuranStats`, `getYuranParent`, `getEbayarStats`, `recordCash`, sync functions, and `onEbayarSubmit`.
- `clasp push` has updated GAS editor source, but no GAS production deployment and no `git push pages main` was done for Queue #9 staging setup.

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
4. Kata laluan guru ialah nombor WhatsApp yang berdaftar.
5. Mobile PWA boleh dipasang di home screen.
6. Desktop dan mobile menggunakan data yang sama.
7. Blast WA yuran dibuat dari panel Yuran.
8. Notifikasi dalam app disimpan per browser.

---

## Archive Note

Fail ini diwujudkan selepas `README.md` dibersihkan supaya muka depan GitHub tidak memaparkan nota operasi internal. Maklumat yang dikeluarkan dari README disimpan di sini atau di `REFERENCE.md`, `CHANGELOG.md`, `CLAUDE.md`, dan `AGENTS.md`.
