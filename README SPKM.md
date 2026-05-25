# Sistem Pengurusan Kelas Mengaji Syafie Legacy (SPKL)

## Objektif
- Login guru/admin sebelum akses dashboard admin  
- Portal pendaftaran murid baru (kanak-kanak & dewasa)  
- Rekod kehadiran murid kekal menggunakan Google Form (data masuk tab `Kehadiran`)  
- Autocrat generate slip pendaftaran & hantar ke email parent  
- (Future: rekod & pantau bayaran yuran bulanan, cetak sijil khatam, laporan tahunan)

## Struktur Projek
- **portal.html** → muka depan sistem (Admin Login + Parent Register)  
- **Code.gs** → Apps Script backend (fungsi loginGuru, registerKanak, registerDewasa, attendance)  
- **assets/** → logo, CSS, template slip  

## Database
Spreadsheet ID: `1QUlrgUeuVI0AVkid1LqXqL7-aQnRHh0ciYXxuhq6otU`

Tab utama:
- Maklumat Guru  
- PendaftaranBaru! (Kanak-kanak)  
- KelasDewasa! (Dewasa)  
- Kehadiran  

## Flow Sistem
1. Admin login → dashboard  
2. Parents daftar murid → data masuk tab  
3. Autocrat generate slip → email parent  
4. Kehadiran → Google Form → tab `Kehadiran`  
