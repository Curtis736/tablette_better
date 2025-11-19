# Script pour lancer l'application en local
# Usage: .\start-local.ps1

Write-Host "🚀 Démarrage de l'application SEDI Tablette en local..." -ForegroundColor Green
Write-Host ""

# Vérifier que Node.js est installé
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Obtenir le répertoire du script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"

# Vérifier que les répertoires existent
if (!(Test-Path $backendDir)) {
    Write-Host "❌ Le répertoire backend n'existe pas: $backendDir" -ForegroundColor Red
    exit 1
}

if (!(Test-Path $frontendDir)) {
    Write-Host "❌ Le répertoire frontend n'existe pas: $frontendDir" -ForegroundColor Red
    exit 1
}

# Vérifier les dépendances
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Yellow

if (!(Test-Path (Join-Path $backendDir "node_modules"))) {
    Write-Host "   Installation des dépendances backend..." -ForegroundColor Yellow
    Set-Location $backendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances backend" -ForegroundColor Red
        exit 1
    }
}

if (!(Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "   Installation des dépendances frontend..." -ForegroundColor Yellow
    Set-Location $frontendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances frontend" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Dépendances installées" -ForegroundColor Green
Write-Host ""

# Arrêter les processus existants sur les ports 3001 et 8080
Write-Host "🛑 Arrêt des processus existants sur les ports 3001 et 8080..." -ForegroundColor Yellow
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue

if ($port3001) {
    $pid = $port3001.OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "   Port 3001 libéré" -ForegroundColor Yellow
}

if ($port8080) {
    $pid = $port8080.OwningProcess
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Write-Host "   Port 8080 libéré" -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Démarrer le backend dans une nouvelle fenêtre
Write-Host "🔧 Démarrage du backend sur le port 3033 (mode développement)..." -ForegroundColor Cyan
$backendScript = @"
cd `"$backendDir`"
`$env:NODE_ENV = 'development'
npm run dev
"@

$backendScript | Out-File -FilePath "$env:TEMP\start-backend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-backend.ps1" -WindowStyle Normal

Start-Sleep -Seconds 3

# Démarrer le frontend dans une nouvelle fenêtre
Write-Host "🎨 Démarrage du frontend sur le port 8080..." -ForegroundColor Cyan
$frontendScript = @"
cd `"$frontendDir`"
npm start
"@

$frontendScript | Out-File -FilePath "$env:TEMP\start-frontend.ps1" -Encoding UTF8
Start-Process powershell -ArgumentList "-NoExit", "-File", "$env:TEMP\start-frontend.ps1" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Application démarrée !" -ForegroundColor Green
Write-Host ""
Write-Host "📊 URLs d'accès:" -ForegroundColor Yellow
Write-Host "   Backend API:  http://localhost:3033" -ForegroundColor White
Write-Host "   Frontend Web: http://localhost:8080" -ForegroundColor White
Write-Host "   Health Check: http://localhost:3033/api/health" -ForegroundColor White
Write-Host ""
Write-Host "💡 Les serveurs tournent dans des fenêtres PowerShell séparées." -ForegroundColor Cyan
Write-Host "   Pour arrêter les serveurs, fermez les fenêtres ou appuyez sur Ctrl+C dans chaque fenêtre." -ForegroundColor Cyan
Write-Host ""







