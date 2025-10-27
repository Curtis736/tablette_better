#!/bin/bash
# Script pour nettoyer les fichiers inutiles avant un push Git

echo "🧹 Nettoyage avant push Git"
echo "==========================="

# Supprimer les fichiers de logs
echo "📝 Suppression des logs..."
rm -f logs/*.log 2>/dev/null || true
rm -f backend/logs/*.log 2>/dev/null || true
rm -f frontend/logs/*.log 2>/dev/null || true

# Supprimer les rapports ESLint
echo "📊 Suppression des rapports ESLint..."
rm -f eslint-report.json 2>/dev/null || true
rm -f backend/eslint-report.json 2>/dev/null || true

# Supprimer les fichiers de cache
echo "🗑️  Suppression des caches..."
rm -rf .cache/ 2>/dev/null || true
rm -rf .parcel-cache/ 2>/dev/null || true
rm -rf .npm/ 2>/dev/null || true

# Supprimer les fichiers temporaires
echo "🗑️  Suppression des fichiers temporaires..."
rm -f *.tmp *.temp 2>/dev/null || true

# Supprimer les scripts de déploiement temporaires
echo "🗑️  Suppression des scripts de déploiement..."
rm -f sync-to-server.sh 2>/dev/null || true
rm -f sync-from-server.sh 2>/dev/null || true
rm -f deploy-on-server.sh 2>/dev/null || true
rm -f fix-docker-ports.sh 2>/dev/null || true
rm -f deploy-direct-production.sh 2>/dev/null || true
rm -f deploy-direct-production.ps1 2>/dev/null || true
rm -f start-local.sh 2>/dev/null || true

# Supprimer les fichiers OS
echo "🗑️  Suppression des fichiers OS..."
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "Thumbs.db" -delete 2>/dev/null || true

# Vérifier l'état Git
echo ""
echo "📋 État Git après nettoyage:"
git status --short

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Nettoyage terminé"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. git add ."
echo "   2. git commit -m 'Description des modifications'"
echo "   3. git push origin main"
echo ""
