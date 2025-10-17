@echo off
REM Script de test local pour la configuration SEDI Tablette
REM Usage: .\scripts\test-local.bat

echo === Test local de la configuration SEDI Tablette ===
echo.

echo 1. Vérification de la syntaxe Docker Compose...
docker-compose -f docker/docker-compose.production.yml config >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erreur de syntaxe dans docker-compose.production.yml
    pause
    exit /b 1
)
echo ✅ Syntaxe Docker Compose valide

echo.
echo 2. Vérification des ports disponibles...
netstat -an | findstr ":3001 " >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 3001 déjà utilisé
) else (
    echo ✅ Port 3001 disponible
)

netstat -an | findstr ":8080 " >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port 8080 déjà utilisé
) else (
    echo ✅ Port 8080 disponible
)

echo.
echo 3. Test de construction des images...
echo Construction de l'image backend...
docker-compose -f docker/docker-compose.production.yml build sedi-backend
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de la construction de l'image backend
    pause
    exit /b 1
)
echo ✅ Image backend construite

echo Construction de l'image frontend...
docker-compose -f docker/docker-compose.production.yml build sedi-frontend
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de la construction de l'image frontend
    pause
    exit /b 1
)
echo ✅ Image frontend construite

echo.
echo 4. Démarrage des services de test...
docker-compose -f docker/docker-compose.production.yml up -d

echo.
echo 5. Attente du démarrage (30 secondes)...
timeout /t 30 /nobreak >nul

echo.
echo 6. Vérification de l'état des containers...
docker-compose -f docker/docker-compose.production.yml ps

echo.
echo 7. Test de connectivité...
echo Test du backend...
curl -s -o nul -w "Backend: %%{http_code}\n" http://localhost:3001/api/health 2>nul || echo Backend: Non accessible

echo Test du frontend...
curl -s -o nul -w "Frontend: %%{http_code}\n" http://localhost:8080 2>nul || echo Frontend: Non accessible

echo.
echo 8. Logs des services...
echo === Logs Backend (dernières 10 lignes) ===
docker logs --tail 10 sedi-tablette-backend 2>nul || echo Aucun log backend

echo.
echo === Logs Frontend (dernières 10 lignes) ===
docker logs --tail 10 sedi-tablette-frontend 2>nul || echo Aucun log frontend

echo.
echo 9. Nettoyage...
set /p cleanup="Voulez-vous arrêter les services de test ? (Y/n): "
if /i "%cleanup%"=="Y" (
    docker-compose -f docker/docker-compose.production.yml down
    echo ✅ Services de test arrêtés
) else (
    echo ℹ️  Services laissés en cours d'exécution
)

echo.
echo === Test terminé ===
echo Si tous les tests sont passés, la configuration est prête !
echo.
pause
