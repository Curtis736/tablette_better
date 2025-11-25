#!/bin/bash
# Script pour reconstruire les images Docker backend et frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔨 Reconstruction des images Docker SEDI Tablette"
echo ""

cd "$PROJECT_ROOT"

# Mettre à jour le code (optionnel, car la CI a déjà fait git pull)
echo "📥 Mise à jour du code..."
git pull || true

# Reconstruire l'image backend (sans cache pour éviter les superpositions)
echo ""
echo "🔨 Reconstruction de l'image backend (sans cache)..."
sudo docker build --no-cache -t docker-sedi-backend:latest -f docker/Dockerfile.backend .

# Reconstruire l'image frontend (sans cache pour éviter les superpositions)
echo ""
echo "🔨 Reconstruction de l'image frontend (sans cache)..."
sudo docker build --no-cache -t docker-sedi-frontend:latest -f docker/Dockerfile.frontend .

echo ""
echo "✅ Images reconstruites avec succès!"
echo ""
echo "📋 Images disponibles:"
sudo docker images | grep -E "docker-sedi-(backend|frontend)"

echo ""
echo "🔄 Pour redémarrer les conteneurs applicatifs:"
echo "   cd docker"
echo "   sudo docker compose -f docker-compose.production.yml up -d"
echo ""
echo "📊 Pour démarrer le monitoring (Prometheus + Grafana):"
echo "   sudo docker compose -f docker-compose.monitoring.yml up -d"














