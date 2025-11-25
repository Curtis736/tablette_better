#!/bin/bash
# Script pour nettoyer complètement et redémarrer tous les services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧹 Nettoyage complet des conteneurs SEDI Tablette..."
echo ""

# 1. Arrêter et supprimer TOUS les conteneurs sedi- (même ceux qui résistent)
echo "🛑 Arrêt forcé de tous les conteneurs sedi-..."
docker ps -a --filter "name=sedi-" --format "{{.ID}}" | while read id; do
    if [ ! -z "$id" ]; then
        echo "   Arrêt du conteneur $id..."
        docker kill "$id" 2>/dev/null || true
        docker rm -f "$id" 2>/dev/null || true
    fi
done

# 2. Arrêter via docker-compose (si les fichiers existent)
echo ""
echo "🛑 Arrêt via docker-compose..."
if [ -f "docker-compose.production.yml" ]; then
    docker compose -f docker-compose.production.yml down --remove-orphans || true
fi

if [ -f "docker-compose.monitoring.yml" ]; then
    docker compose -f docker-compose.monitoring.yml down --remove-orphans || true
fi

# 3. Libérer les ports
echo ""
echo "🔌 Libération des ports..."
docker ps --filter "publish=9091" --format "{{.ID}}" | xargs -r docker stop 2>/dev/null || true
docker ps --filter "publish=3002" --format "{{.ID}}" | xargs -r docker stop 2>/dev/null || true
docker ps --filter "publish=8080" --format "{{.ID}}" | xargs -r docker stop 2>/dev/null || true
docker ps --filter "publish=3001" --format "{{.ID}}" | xargs -r docker stop 2>/dev/null || true

# 4. Nettoyage final
echo ""
echo "🧹 Nettoyage final..."
docker ps -a --filter "name=sedi-" --format "{{.ID}}" | xargs -r docker rm -f 2>/dev/null || true

# 5. Vérification
echo ""
echo "✅ Vérification : aucun conteneur sedi- ne devrait rester"
docker ps -a --filter "name=sedi-"

echo ""
echo "🎉 Nettoyage terminé !"
echo ""
echo "📋 Pour redémarrer tous les services, exécutez :"
echo "   sudo ./start-all-services.sh"

