#!/bin/bash
# Script de déploiement pour SEDI Tablette en production
# Usage: ./deploy-production.sh

echo "=== Déploiement SEDI Tablette Production ==="

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

# Aller dans le dossier du projet
cd "$(dirname "$0")/.."

echo "1. Arrêt des containers existants..."
docker-compose -f docker/docker-compose.production.yml down

echo "2. Suppression des containers et volumes (optionnel)..."
read -p "Voulez-vous supprimer les volumes existants ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker/docker-compose.production.yml down -v
    docker volume rm sedi-tablette-logs 2>/dev/null || true
fi

echo "3. Construction des images..."
docker-compose -f docker/docker-compose.production.yml build

echo "4. Démarrage des services..."
docker-compose -f docker/docker-compose.production.yml up -d

echo "5. Attente du démarrage..."
sleep 30

echo "6. Vérification de l'état..."
docker-compose -f docker/docker-compose.production.yml ps

echo "7. Test de connectivité..."
echo "Test du backend..."
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:3001/api/health 2>/dev/null || echo "Backend: Non accessible"

echo "Test du frontend..."
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:8080 2>/dev/null || echo "Frontend: Non accessible"

echo "8. Logs des services..."
echo "=== Logs Backend (dernières 10 lignes) ==="
docker logs --tail 10 sedi-tablette-backend

echo "=== Logs Frontend (dernières 10 lignes) ==="
docker logs --tail 10 sedi-tablette-frontend

echo "=== Déploiement terminé ==="
echo "URLs d'accès:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:8080"
echo ""
echo "Commandes utiles:"
echo "  docker-compose -f docker/docker-compose.production.yml ps"
echo "  docker-compose -f docker/docker-compose.production.yml logs -f"
echo "  docker-compose -f docker/docker-compose.production.yml down"