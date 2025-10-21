# 🚀 Script de Déploiement Automatique pour SEDI Tablette (PowerShell)
# Usage: .\deploy-server.ps1 -ServerIP "your-server-ip" -Username "root"

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$false)]
    [string]$Username = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$AppDir = "/opt/apps/tablettev2"
)

$RepoURL = "https://github.com/Curtis736/tablette_better.git"

Write-Host "🚀 === DÉPLOIEMENT SEDI TABLETTE ===" -ForegroundColor Green
Write-Host "📡 Serveur: $ServerIP" -ForegroundColor Cyan
Write-Host "👤 Utilisateur: $Username" -ForegroundColor Cyan
Write-Host "📁 Répertoire: $AppDir" -ForegroundColor Cyan
Write-Host ""

# Fonction pour exécuter des commandes sur le serveur
function Invoke-RemoteCommand {
    param([string]$Command)
    Write-Host "🔧 Exécution: $Command" -ForegroundColor Yellow
    ssh $Username@$ServerIP $Command
}

# Fonction pour copier des fichiers
function Copy-RemoteFile {
    param([string]$LocalPath, [string]$RemotePath)
    Write-Host "📤 Copie: $LocalPath -> $RemotePath" -ForegroundColor Yellow
    scp $LocalPath "${Username}@${ServerIP}:${RemotePath}"
}

try {
    Write-Host "1️⃣ Vérification des prérequis..." -ForegroundColor Green
    Invoke-RemoteCommand "which docker && which docker-compose && which git && which node"

    Write-Host "2️⃣ Arrêt des services existants..." -ForegroundColor Green
    Invoke-RemoteCommand "cd $AppDir/docker 2>/dev/null && docker-compose down || true"

    Write-Host "3️⃣ Sauvegarde de la configuration..." -ForegroundColor Green
    Invoke-RemoteCommand "cp $AppDir/backend/.env $AppDir/backend/.env.backup 2>/dev/null || true"

    Write-Host "4️⃣ Mise à jour du code..." -ForegroundColor Green
    Invoke-RemoteCommand "cd $AppDir && git fetch origin && git reset --hard origin/master"

    Write-Host "5️⃣ Restauration de la configuration..." -ForegroundColor Green
    Invoke-RemoteCommand "cp $AppDir/backend/.env.backup $AppDir/backend/.env 2>/dev/null || true"

    Write-Host "6️⃣ Configuration de l'environnement..." -ForegroundColor Green
    $envExists = Invoke-RemoteCommand "test -f $AppDir/backend/.env && echo 'exists' || echo 'missing'"
    if ($envExists -eq "missing") {
        Write-Host "⚠️  Fichier .env manquant, création d'un template..." -ForegroundColor Yellow
        Invoke-RemoteCommand "cd $AppDir && cp backend/env.example backend/.env"
        Write-Host "📝 Veuillez configurer backend/.env sur le serveur" -ForegroundColor Yellow
    }

    Write-Host "7️⃣ Construction des conteneurs Docker..." -ForegroundColor Green
    Invoke-RemoteCommand "cd $AppDir/docker && docker-compose build --no-cache"

    Write-Host "8️⃣ Démarrage des services..." -ForegroundColor Green
    Invoke-RemoteCommand "cd $AppDir/docker && docker-compose up -d"

    Write-Host "9️⃣ Attente du démarrage..." -ForegroundColor Green
    Start-Sleep -Seconds 10

    Write-Host "🔟 Vérification du déploiement..." -ForegroundColor Green
    Invoke-RemoteCommand "cd $AppDir/docker && docker-compose ps"

    Write-Host "1️⃣1️⃣ Test de l'API..." -ForegroundColor Green
    $apiTest = Invoke-RemoteCommand "curl -f http://localhost:3001/api/health 2>/dev/null || echo 'API_ERROR'"
    if ($apiTest -eq "API_ERROR") {
        Write-Host "❌ API non accessible" -ForegroundColor Red
    } else {
        Write-Host "✅ API accessible" -ForegroundColor Green
    }

    Write-Host "1️⃣2️⃣ Configuration du nettoyage automatique..." -ForegroundColor Green
    Invoke-RemoteCommand "chmod +x $AppDir/backend/scripts/auto-cleanup.js"

    Write-Host "1️⃣3️⃣ Test du script de nettoyage..." -ForegroundColor Green
    Invoke-RemoteCommand "cd $AppDir/backend && node scripts/auto-cleanup.js"

    Write-Host "1️⃣4️⃣ Configuration du crontab..." -ForegroundColor Green
    Invoke-RemoteCommand "crontab -l | grep -v 'tablettev2' | crontab -"
    Invoke-RemoteCommand "echo '0 * * * * cd $AppDir/backend && node scripts/auto-cleanup.js >> logs/cleanup.log 2>&1' | crontab -"
    Invoke-RemoteCommand "echo '0 2 * * * cd $AppDir/backend && node scripts/auto-cleanup.js >> logs/cleanup-daily.log 2>&1' | crontab -"

    Write-Host "1️⃣5️⃣ Création du répertoire de logs..." -ForegroundColor Green
    Invoke-RemoteCommand "mkdir -p $AppDir/backend/logs"

    Write-Host ""
    Write-Host "✅ === DÉPLOIEMENT TERMINÉ ===" -ForegroundColor Green
    Write-Host "🌐 Application: http://$ServerIP:3001" -ForegroundColor Cyan
    Write-Host "👨‍💼 Interface admin: http://$ServerIP:3001/api/admin" -ForegroundColor Cyan
    Write-Host "🔍 Santé: http://$ServerIP:3001/api/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "1. Configurer backend/.env avec vos paramètres"
    Write-Host "2. Redémarrer: cd $AppDir/docker && docker-compose restart"
    Write-Host "3. Vérifier les logs: docker-compose logs -f"
    Write-Host ""
    Write-Host "🛠️  Commandes utiles:" -ForegroundColor Yellow
    Write-Host "- Logs: docker-compose logs -f"
    Write-Host "- Redémarrage: docker-compose restart"
    Write-Host "- Nettoyage: Invoke-RestMethod -Uri 'http://$ServerIP:3001/api/admin/cleanup-all' -Method POST"
    Write-Host "- Statut: docker-compose ps"

} catch {
    Write-Host "❌ Erreur lors du déploiement: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
