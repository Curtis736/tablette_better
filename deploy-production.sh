#!/bin/bash

# 🚀 Script de déploiement pour serveur de production SEDI Tablette
# Usage: ./deploy-production.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 === DÉPLOIEMENT SEDI TABLETTE PRODUCTION ==="
echo "📡 Serveur: 192.168.1.26"
echo "👤 Utilisateur: maintenance"
echo ""

# Configuration
APP_DIR="/opt/apps/tablettev2"
REPO_URL="https://github.com/Curtis736/tablette_better.git"

echo "1️⃣ Arrêt des services existants..."
cd $APP_DIR/docker 2>/dev/null && docker-compose -f docker-compose.production.yml down || true

echo "2️⃣ Mise à jour du code..."
cd $APP_DIR && git fetch origin && git reset --hard origin/master

echo "3️⃣ Vérification de la configuration..."
if [ ! -f "backend/config-production.js" ]; then
    echo "❌ Fichier config-production.js manquant"
    exit 1
fi

echo "4️⃣ Construction des conteneurs Docker..."
cd docker
docker-compose -f docker-compose.production.yml build --no-cache

echo "5️⃣ Démarrage des services..."
docker-compose -f docker-compose.production.yml up -d

echo "6️⃣ Attente du démarrage..."
sleep 10

echo "7️⃣ Vérification du déploiement..."
docker-compose -f docker-compose.production.yml ps

echo "8️⃣ Test de l'API..."
curl -f http://localhost:3001/api/health || echo "❌ API non accessible"

echo ""
echo "✅ === DÉPLOIEMENT TERMINÉ ==="
echo "🌐 Application: http://192.168.1.26:3001"
echo "👨‍💼 Interface admin: http://192.168.1.26:3001/api/admin"
echo "🔍 Santé: http://192.168.1.26:3001/api/health"
echo ""
echo "🛠️  Commandes utiles:"
echo "- Logs: docker-compose -f docker-compose.production.yml logs -f"
echo "- Redémarrage: docker-compose -f docker-compose.production.yml restart"
echo "- Statut: docker-compose -f docker-compose.production.yml ps"