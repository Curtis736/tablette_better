# Script d'analyse SonarQube pour SEDI Tablette v2 (PowerShell)

Write-Host "🔍 Démarrage de l'analyse SonarQube pour SEDI Tablette v2..." -ForegroundColor Blue

# Vérifier que SonarQube Scanner est installé
try {
    $null = Get-Command sonar-scanner -ErrorAction Stop
    Write-Host "✅ SonarQube Scanner trouvé" -ForegroundColor Green
} catch {
    Write-Host "❌ SonarQube Scanner n'est pas installé" -ForegroundColor Red
    Write-Host "📦 Installation: npm install -g sonar-scanner" -ForegroundColor Yellow
    exit 1
}

# Vérifier que nous sommes dans le bon répertoire
if (-not (Test-Path "sonar-project.properties")) {
    Write-Host "❌ Fichier sonar-project.properties non trouvé" -ForegroundColor Red
    Write-Host "📍 Assurez-vous d'être dans le répertoire racine du projet" -ForegroundColor Yellow
    exit 1
}

# Nettoyer les anciens rapports
Write-Host "🧹 Nettoyage des anciens rapports..." -ForegroundColor Blue
if (Test-Path "backend/coverage") {
    Remove-Item -Recurse -Force "backend/coverage"
}
if (Test-Path "backend/eslint-report.json") {
    Remove-Item -Force "backend/eslint-report.json"
}

# Exécuter ESLint
Write-Host "🔍 Exécution d'ESLint..." -ForegroundColor Blue
Set-Location backend
try {
    npx eslint . --ext .js --format json --output-file eslint-report.json
    Write-Host "✅ ESLint terminé avec succès" -ForegroundColor Green
} catch {
    Write-Host "⚠️ ESLint terminé avec des avertissements" -ForegroundColor Yellow
}

# Retour au répertoire racine
Set-Location ..

# Vérifier la configuration SonarQube
Write-Host "🔧 Vérification de la configuration SonarQube..." -ForegroundColor Blue
$sonarConfig = Get-Content "sonar-project.properties" | Select-String "sonar.host.url"
if ($sonarConfig) {
    Write-Host "✅ Configuration SonarQube trouvée" -ForegroundColor Green
} else {
    Write-Host "⚠️ Configuration SonarQube manquante" -ForegroundColor Yellow
    Write-Host "📝 Ajoutez sonar.host.url et sonar.login dans sonar-project.properties" -ForegroundColor Yellow
}

# Exécuter SonarQube Scanner
Write-Host "📊 Lancement de l'analyse SonarQube..." -ForegroundColor Blue
try {
    sonar-scanner
    Write-Host "✅ Analyse SonarQube terminée avec succès!" -ForegroundColor Green
    Write-Host "🌐 Consultez les résultats sur votre instance SonarQube" -ForegroundColor Green
} catch {
    Write-Host "❌ Erreur lors de l'analyse SonarQube" -ForegroundColor Red
    Write-Host "💡 Vérifiez votre configuration et votre connexion à SonarQube" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎉 Analyse terminée!" -ForegroundColor Green



