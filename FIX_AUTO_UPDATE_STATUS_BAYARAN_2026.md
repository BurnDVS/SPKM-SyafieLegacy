# Fix Auto Update Status Bayaran eBayar Mengaji 2026

## Tarikh
29 Jun 2026

## Masalah
Status bayaran di tab `Calculation...2026` tidak sentiasa tepat.

Contoh:
- `AHMAD ANIQ AMSYAR BIN MOHD ZAIDI` sudah bayar di `JUN2026`
- Tetapi `CalculationJun2026!C7` masih menunjukkan `0`
- Sepatutnya jadi `1`

Selain itu, log update menunjukkan jumlah murid tidak tepat seperti `196` dan `203`, kerana row kosong bawah senarai murid masih ada nilai `0` di Column C.

## Punca
1. Function `updateCalculationTab()` pernah dijalankan secara direct tanpa parameter, menyebabkan:

   ```text
   Tab tidak dijumpai: undefined
   ```

2. Script lama guna `getLastRow()` pada tab Calculation, jadi row kosong yang ada `0` di Column C turut dikira sebagai murid.

## Fix
- `onFormSubmit(e)` kini akan refresh semua bulan setiap kali ada form submit baru.
- `updateCalculationTab()` kini kira murid berdasarkan nama sebenar di Column B sahaja.
- Row kosong bawah nama terakhir akan dibersihkan dari lebihan `0`.
- Nama dibersihkan dengan `normalizeName_()` supaya matching lebih stabil.
- Trigger auto dipasang melalui `installAutoUpdateOnce()`.

## Function Utama
- `onFormSubmit(e)`
- `updateCalculationTab(yuranSheet, calcTabName)`
- `updateAllStatusManual()`
- `updateCurrentMonthManual()`
- `installAutoUpdateOnce()`

## Trigger
Trigger yang betul:

```text
Function: onFormSubmit
Event source: From spreadsheet
Event type: On form submit
```

Jangan trigger function ini secara direct:

```text
updateCalculationTab
```

## Verification
Selepas fix, `updateAllStatusManual()` berjaya dijalankan:

```text
CalculationJan2026: 138 murid dikemaskini
CalculationFeb2026: 138 murid dikemaskini
CalculationMac2026: 140 murid dikemaskini
CalculationApril2026: 154 murid dikemaskini
CalculationMei2026: 180 murid dikemaskini
CalculationJun2026: 186 murid dikemaskini
CalculationJulai2026: 186 murid dikemaskini
CalculationOgos2026: 186 murid dikemaskini
CalculationSept2026: 186 murid dikemaskini
CalculationOkt2026: 186 murid dikemaskini
CalculationNov2026: 186 murid dikemaskini
CalculationDis2026: 186 murid dikemaskini
Semua tab selesai dikemaskini!
```

Trigger juga berjaya dipasang:

```text
Auto update dipasang: onFormSubmit / On form submit.
```

## Status
Settle. Mulai sekarang, bila ada bayaran baru masuk, script akan auto refresh semua bulan dan semua nama.
