@echo off
REM Script de démarrage simple pour Windows - SEDI Tablette
echo 🚀 Démarrage simple SEDI Tablette
echo ==================================

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé
    echo 💡 Téléchargez et installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js détecté

REM Aller dans le dossier backend
cd backend

REM Installer les dépendances si nécessaire
if not exist node_modules (
    echo 📦 Installation des dépendances backend...
    npm install
)

REM Créer le fichier .env
echo 🔧 Configuration du backend...
(
echo NODE_ENV=development
echo PORT=3001
echo DB_SERVER=192.168.1.14
echo DB_DATABASE=SEDI_ERP
echo DB_USER=QUALITE
echo DB_PASSWORD=QUALITE
echo DB_ENCRYPT=false
echo DB_TRUST_CERT=true
echo FRONTEND_URL=http://localhost:8080
echo API_TIMEOUT=30000
echo CACHE_ENABLED=true
echo LOG_LEVEL=info
) > .env

echo ✅ Backend configuré

REM Démarrer le backend
echo 🚀 Démarrage du backend...
start "SEDI Backend" cmd /k "npm start"

REM Attendre un peu
timeout /t 3 /nobreak >nul

REM Aller dans le dossier frontend
cd ..\frontend

REM Installer les dépendances frontend si nécessaire
if not exist node_modules (
    echo 📦 Installation des dépendances frontend...
    npm install
)

REM Démarrer le frontend
echo 🚀 Démarrage du frontend...
start "SEDI Frontend" cmd /k "npm start"

echo.
echo ✅ Services démarrés !
echo 📱 Frontend: http://localhost:8080
echo 🔧 Backend: http://localhost:3001
echo.
echo Appuyez sur une touche pour fermer...
pause >nul
