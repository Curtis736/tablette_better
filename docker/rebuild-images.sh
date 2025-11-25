#!/bin/bash
# Script pour reconstruire les images Docker backend et frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔨 Reconstruction des images Docker SEDI Tablette"
echo ""

cd "$PROJECT_ROOT"

# Mettre à jour le code
echo "📥 Mise à jour du code..."
git pull

# Reconstruire l'image backend
echo ""
echo "🔨 Reconstruction de l'image backend..."
docker build -t docker-sedi-backend:latest -f docker/Dockerfile.backend .

# Reconstruire l'image frontend
echo ""
echo "🔨 Reconstruction de l'image frontend..."
docker build -t docker-sedi-frontend:latest -f docker/Dockerfile.frontend .

echo ""
echo "✅ Images reconstruites avec succès!"
echo ""
echo "📋 Images disponibles:"
docker images | grep -E "docker-sedi-(backend|frontend)"

echo ""
echo "🔄 Pour redémarrer les conteneurs applicatifs:"
echo "   cd docker"
echo "   docker compose -f docker-compose.production.yml up -d"
echo ""
echo "📊 Pour démarrer le monitoring (Prometheus + Grafana):"
echo "   docker compose -f docker-compose.monitoring.yml up -d"














