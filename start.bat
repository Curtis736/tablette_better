@echo off
echo ========================================
echo    SEDI TABLETTE - DEMARRAGE
echo ========================================
echo.

echo Arret des processus existants...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo [1/2] Demarrage du Backend...
start "SEDI Backend" cmd /k "cd /d "X:\Production\4_Public\DEV (ne pas toucher)\tablettev2\backend" && node server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Demarrage du Frontend...
start "SEDI Frontend" cmd /k "cd /d "X:\Production\4_Public\DEV (ne pas toucher)\tablettev2\frontend" && npm start"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   APPLICATION DEMARREE !
echo ========================================
echo.
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:3001
echo.
echo Connectez-vous avec le code: 929
echo.
echo Appuyez sur une touche pour fermer...
pause >nul