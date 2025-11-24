# Script PowerShell pour télécharger les images Prometheus et Grafana
# À exécuter sur une machine Windows avec internet

Write-Host "📥 Téléchargement des images Prometheus et Grafana..." -ForegroundColor Green

# Vérifier que Docker est installé
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker n'est pas installé ou pas dans le PATH" -ForegroundColor Red
    exit 1
}

Write-Host "⬇️  Téléchargement de Prometheus..." -ForegroundColor Cyan
docker pull prom/prometheus:latest

Write-Host "⬇️  Téléchargement de Grafana..." -ForegroundColor Cyan
docker pull grafana/grafana:latest

Write-Host "💾 Sauvegarde des images..." -ForegroundColor Cyan
docker save prom/prometheus:latest -o prometheus-image.tar
docker save grafana/grafana:latest -o grafana-image.tar

Write-Host "📦 Compression..." -ForegroundColor Cyan
Compress-Archive -Path prometheus-image.tar,grafana-image.tar -DestinationPath monitoring-images.zip -Force

Write-Host ""
Write-Host "✅ Images préparées!" -ForegroundColor Green
Write-Host ""
Write-Host "📤 Fichiers créés:" -ForegroundColor Yellow
Write-Host "   - prometheus-image.tar"
Write-Host "   - grafana-image.tar"
Write-Host "   - monitoring-images.zip (compressed)"
Write-Host ""
Write-Host "📤 Pour transférer sur le serveur:" -ForegroundColor Cyan
Write-Host "   scp prometheus-image.tar grafana-image.tar maintenance@IP_SERVEUR:~/" -ForegroundColor White
Write-Host "   # OU avec le fichier compressé:"
Write-Host "   scp monitoring-images.zip maintenance@IP_SERVEUR:~/" -ForegroundColor White
Write-Host ""
















