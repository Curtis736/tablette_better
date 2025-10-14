#!/bin/bash

# Script de déploiement pour SEDI Tablette - Production
# Ce script assure la cohérence des ports et rebuild complet

echo "🚀 Déploiement SEDI Tablette - Production"
echo "========================================"

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erreur: docker-compose.yml non trouvé. Êtes-vous dans le bon répertoire ?"
    exit 1
fi

echo "📋 Étape 1: Arrêt des services existants"
docker-compose -f docker-compose.yml down

echo "📋 Étape 2: Suppression des conteneurs"
docker rm $(docker ps -aq) 2>/dev/null || true

echo "📋 Étape 3: Suppression des images"
docker rmi $(docker images -q) 2>/dev/null || true

echo "📋 Étape 4: Nettoyage des volumes orphelins"
docker volume prune -f

echo "📋 Étape 5: Nettoyage des réseaux orphelins"
docker network prune -f

echo "📋 Étape 6: Rebuild complet sans cache"
docker-compose -f docker-compose.yml build --no-cache

echo "📋 Étape 7: Démarrage des services"
docker-compose -f docker-compose.yml up -d

echo "📋 Étape 8: Attente du démarrage"
sleep 10

echo "📋 Étape 9: Vérification des ports"
echo "Conteneurs en cours d'exécution:"
docker ps

echo ""
echo "📋 Étape 10: Tests de connectivité"
echo "Test backend direct (port 3001):"
curl -f http://localhost:3001/api/health 2>/dev/null && echo "✅ Backend accessible" || echo "❌ Backend non accessible"

echo "Test frontend (port 8080):"
curl -f http://localhost:8080/health 2>/dev/null && echo "✅ Frontend accessible" || echo "❌ Frontend non accessible"

echo "Test proxy API (frontend vers backend):"
curl -f http://localhost:8080/api/health 2>/dev/null && echo "✅ Proxy API fonctionnel" || echo "❌ Proxy API non fonctionnel"

echo ""
echo "🎉 Déploiement terminé !"
echo "Frontend: http://localhost:8080"
echo "Backend: http://localhost:3001"
echo "API via proxy: http://localhost:8080/api"
