# Script de déploiement pour SEDI Tablette - Production (PowerShell)
# Ce script assure la cohérence des ports et rebuild complet

Write-Host "🚀 Déploiement SEDI Tablette - Production" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Vérifier qu'on est dans le bon répertoire
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ Erreur: docker-compose.yml non trouvé. Êtes-vous dans le bon répertoire ?" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Étape 1: Arrêt des services existants" -ForegroundColor Yellow
docker-compose -f docker-compose.yml down

Write-Host "📋 Étape 2: Suppression des conteneurs" -ForegroundColor Yellow
$containers = docker ps -aq
if ($containers) {
    docker rm $containers
}

Write-Host "📋 Étape 3: Suppression des images" -ForegroundColor Yellow
$images = docker images -q
if ($images) {
    docker rmi $images
}

Write-Host "📋 Étape 4: Nettoyage des volumes orphelins" -ForegroundColor Yellow
docker volume prune -f

Write-Host "📋 Étape 5: Nettoyage des réseaux orphelins" -ForegroundColor Yellow
docker network prune -f

Write-Host "📋 Étape 6: Rebuild complet sans cache" -ForegroundColor Yellow
docker-compose -f docker-compose.yml build --no-cache

Write-Host "📋 Étape 7: Démarrage des services" -ForegroundColor Yellow
docker-compose -f docker-compose.yml up -d

Write-Host "📋 Étape 8: Attente du démarrage" -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "📋 Étape 9: Vérification des ports" -ForegroundColor Yellow
Write-Host "Conteneurs en cours d'exécution:"
docker ps

Write-Host ""
Write-Host "📋 Étape 10: Tests de connectivité" -ForegroundColor Yellow
Write-Host "Test backend direct (port 3001):"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing
    Write-Host "✅ Backend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible" -ForegroundColor Red
}

Write-Host "Test frontend (port 8080):"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing
    Write-Host "✅ Frontend accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible" -ForegroundColor Red
}

Write-Host "Test proxy API (frontend vers backend):"
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api/health" -UseBasicParsing
    Write-Host "✅ Proxy API fonctionnel" -ForegroundColor Green
} catch {
    Write-Host "❌ Proxy API non fonctionnel" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Déploiement terminé !" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "API via proxy: http://localhost:8080/api" -ForegroundColor Cyan
