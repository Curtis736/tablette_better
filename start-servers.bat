@echo off
echo ========================================
echo    DEMARRAGE SERVEURS SEDI TABLETTE
echo ========================================
echo.

echo 1. Demarrage du serveur BACKEND (port 3000)...
start "SEDI Backend" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak >nul

echo 2. Demarrage du serveur FRONTEND (port 8080)...
start "SEDI Frontend" cmd /k "cd frontend && npx http-server . -p 8080 --cors"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   SERVEURS DEMARRES AVEC SUCCES !
echo ========================================
echo.
echo Frontend: http://localhost:8080
echo Backend:  http://localhost:3000
echo Code Admin: 929
echo.
echo Appuyez sur une touche pour ouvrir l'interface...
pause >nul

start http://localhost:8080
