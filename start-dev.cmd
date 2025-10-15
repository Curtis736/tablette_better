@echo off
echo 🚀 Démarrage SEDI Tablette - Mode Développement
echo ================================================

REM Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé
    echo 💡 Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js détecté

REM Démarrer le backend
echo 🔧 Démarrage du backend...
start "SEDI Backend" cmd /c "cd backend && npm start"

REM Attendre 3 secondes
timeout /t 3 /nobreak >nul

REM Démarrer le frontend
echo 🌐 Démarrage du frontend...
start "SEDI Frontend" cmd /c "cd frontend && npm start"

echo.
echo ✅ Services démarrés !
echo 📱 Frontend: http://localhost:8080
echo 🔧 Backend: http://localhost:3001
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause >nul
