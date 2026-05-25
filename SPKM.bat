@echo off
cd /d C:\Users\burnk\Documents\SPKM
echo.
echo ================================
echo   SPKM - Sistem Mengaji
echo ================================
echo.
echo [1] Buka Claude Code
echo [2] Git Status
echo [3] Git Commit + Push GitHub
echo [4] Git Pull
echo [5] Push ke GAS (clasp push)
echo [6] Commit + Push GitHub + GAS sekaligus
echo [7] Keluar
echo.
set /p pilih=Pilih (1-7): 

if "%pilih%"=="1" goto claude
if "%pilih%"=="2" goto status
if "%pilih%"=="3" goto push
if "%pilih%"=="4" goto pull
if "%pilih%"=="5" goto gas
if "%pilih%"=="6" goto semua
if "%pilih%"=="7" goto keluar

:claude
cls
echo Membuka Claude Code...
claude
goto end

:status
cls
git status
pause
goto end

:push
cls
set /p msg=Commit message: 
git add .
git commit -m "%msg%"
git push
pause
goto end

:pull
cls
git pull
pause
goto end

:gas
cls
echo Push ke Google Apps Script...
clasp push
pause
goto end

:semua
cls
set /p msg=Commit message: 
git add .
git commit -m "%msg%"
git push
echo.
echo Push ke GAS...
clasp push
pause
goto end

:keluar
exit

:end