#!/bin/bash
# Script de déploiement pour SEDI Tablette
# Usage: ./deploy-sedi.sh

echo "=== Déploiement SEDI Tablette ==="

# Charger la configuration
source import-config.env

# Créer le réseau s'il n'existe pas
echo "Création du réseau Docker..."
docker network create $NETWORK_NAME 2>/dev/null || echo "Réseau déjà existant"

# Créer le volume s'il n'existe pas
echo "Création du volume de logs..."
docker volume create $VOLUME_LOGS 2>/dev/null || echo "Volume déjà existant"

# Importer les images
echo "Import des images Docker..."
docker load -i docker-sedi-backend.tar
docker load -i docker-sedi-frontend.tar

# Arrêter les containers existants s'ils tournent
echo "Arrêt des containers existants..."
docker stop sedi-tablette-backend sedi-tablette-frontend 2>/dev/null || true
docker rm sedi-tablette-backend sedi-tablette-frontend 2>/dev/null || true

# Démarrer le backend
echo "Démarrage du backend..."
docker run -d echo   --name sedi-tablette-backend echo   --hostname $(hostname)-backend echo   --user node echo   --env DB_USER=$DB_USER echo   --env JWT_SECRET=$JWT_SECRET echo   --env DB_TRUST_CERT=$DB_TRUST_CERT echo   --env DB_ENCRYPT=$DB_ENCRYPT echo   --env CACHE_TTL=$CACHE_TTL echo   --env API_TIMEOUT=$API_TIMEOUT echo   --env PORT=$PORT echo   --env API_RETRY_ATTEMPTS=$API_RETRY_ATTEMPTS echo   --env NODE_ENV=$NODE_ENV echo   --env SESSION_SECRET=$SESSION_SECRET echo   --env FRONTEND_URL=$FRONTEND_URL echo   --env LOG_LEVEL=$LOG_LEVEL echo   --env DB_PASSWORD=$DB_PASSWORD echo   --env DB_DATABASE=$DB_DATABASE echo   --env CACHE_ENABLED=$CACHE_ENABLED echo   --env DB_SERVER=$DB_SERVER echo   --volume $VOLUME_LOGS:/app/logs:rw echo   --volume /etc/localtime:/etc/localtime:ro echo   --network $NETWORK_NAME echo   --workdir /app echo   -p $BACKEND_PORT:3001 echo   --restart unless-stopped echo   --label com.sedi.component=backend echo   --label com.sedi.description="SEDI Tablette Backend API with Pause Management" echo   --label com.sedi.service=backend echo   --label com.sedi.version=2.2 echo   $BACKEND_IMAGE

# Attendre que le backend soit prêt
echo "Attente du démarrage du backend..."
sleep 10

# Démarrer le frontend
echo "Démarrage du frontend..."
docker run -d echo   --name sedi-tablette-frontend echo   --hostname $(hostname)-frontend echo   --env NGINX_VERSION=$NGINX_VERSION echo   --env NGINX_WORKER_PROCESSES=$NGINX_WORKER_PROCESSES echo   --env NGINX_WORKER_CONNECTIONS=$NGINX_WORKER_CONNECTIONS echo   --env NGINX_KEEPALIVE_TIMEOUT=$NGINX_KEEPALIVE_TIMEOUT echo   --volume /etc/localtime:/etc/localtime:ro echo   --volume $VOLUME_LOGS:/var/log/nginx:rw echo   --network $NETWORK_NAME echo   -p $FRONTEND_PORT:80 echo   --restart unless-stopped echo   --label com.sedi.component=frontend echo   --label com.sedi.description="SEDI Tablette Frontend with Pause Management" echo   --label com.sedi.service=frontend echo   --label com.sedi.version=2.2 echo   $FRONTEND_IMAGE

echo "=== Déploiement terminé ==="
echo "Backend disponible sur: http://localhost:$BACKEND_PORT"
echo "Frontend disponible sur: http://localhost:$FRONTEND_PORT"
echo ""
echo "Pour vérifier le statut:"
echo "  docker ps"
echo "  docker logs sedi-tablette-backend"
echo "  docker logs sedi-tablette-frontend"
