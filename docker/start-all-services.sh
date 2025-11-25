#!/bin/bash
# Script pour démarrer tous les services SEDI Tablette (app + monitoring)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Démarrage de tous les services SEDI Tablette..."
echo ""

# Vérifier que le réseau existe
echo "📡 Vérification du réseau Docker..."
sudo docker network create sedi-tablette-network || true

# Vérifier que les images existent
echo ""
echo "🔍 Vérification des images Docker..."
if ! sudo docker images | grep -q "docker-sedi-backend:latest"; then
    echo "❌ Image docker-sedi-backend:latest introuvable"
    echo "   Exécutez d'abord: ./rebuild-images.sh"
    exit 1
fi

if ! sudo docker images | grep -q "docker-sedi-frontend:latest"; then
    echo "❌ Image docker-sedi-frontend:latest introuvable"
    echo "   Exécutez d'abord: ./rebuild-images.sh"
    exit 1
fi

# Vérifier que les fichiers docker-compose existent
echo ""
echo "🔍 Vérification des fichiers docker-compose..."
if [ ! -f "docker-compose.production.yml" ]; then
    echo "❌ Fichier docker-compose.production.yml introuvable"
    echo "   Assurez-vous d'être dans le bon répertoire et que le code est à jour (git pull)"
    exit 1
fi

if [ ! -f "docker-compose.monitoring.yml" ]; then
    echo "⚠️  Fichier docker-compose.monitoring.yml introuvable"
    echo "   Le monitoring ne sera pas démarré. Faites 'git pull' pour récupérer le fichier."
    MONITORING_AVAILABLE=false
else
    MONITORING_AVAILABLE=true
fi

# Démarrer les services applicatifs
echo ""
echo "📦 Démarrage des services applicatifs (backend + frontend)..."
sudo docker compose -f docker-compose.production.yml up -d

# Démarrer les services de monitoring (si disponible)
if [ "$MONITORING_AVAILABLE" = true ]; then
    echo ""
    echo "📊 Démarrage des services de monitoring (Prometheus + Grafana)..."
    sudo docker compose -f docker-compose.monitoring.yml up -d
else
    echo ""
    echo "⚠️  Monitoring non démarré (fichier manquant)"
fi

# Attendre un peu pour que les services démarrent
echo ""
echo "⏳ Attente du démarrage des services..."
sleep 5

# Vérification
echo ""
echo "✅ Vérification des conteneurs..."
sudo docker ps --filter "name=sedi-"

echo ""
echo "🎉 Tous les services sont démarrés!"
echo ""
echo "📋 URLs d'accès:"
echo "   - Frontend: http://$(hostname -I | awk '{print $1}'):8080"
echo "   - Backend API: http://$(hostname -I | awk '{print $1}'):3001"
echo "   - Grafana: http://$(hostname -I | awk '{print $1}'):3002 (admin/admin)"
echo "   - Prometheus: http://$(hostname -I | awk '{print $1}'):9091"

