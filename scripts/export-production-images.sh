#!/bin/bash
# Script pour exporter les images Docker de production
# Usage: ./export-production-images.sh

echo "=== Export des images Docker SEDI Tablette ==="

# Créer le dossier d'export
mkdir -p docker-export

echo "1. Export de l'image backend..."
docker save -o docker-export/docker-sedi-backend.tar docker-sedi-backend
if [ $? -eq 0 ]; then
    echo "✅ Backend exporté avec succès"
    ls -lh docker-export/docker-sedi-backend.tar
else
    echo "❌ Erreur lors de l'export du backend"
    exit 1
fi

echo "2. Export de l'image frontend..."
docker save -o docker-export/docker-sedi-frontend.tar docker-sedi-frontend
if [ $? -eq 0 ]; then
    echo "✅ Frontend exporté avec succès"
    ls -lh docker-export/docker-sedi-frontend.tar
else
    echo "❌ Erreur lors de l'export du frontend"
    exit 1
fi

echo "3. Création du script de déploiement..."
cat > docker-export/deploy-production.sh << 'EOF'
#!/bin/bash
# Script de déploiement pour SEDI Tablette
# Usage: ./deploy-production.sh

echo "=== Déploiement SEDI Tablette ==="

# Charger les images
echo "Import des images Docker..."
docker load -i docker-sedi-backend.tar
docker load -i docker-sedi-frontend.tar

# Créer le réseau et volume
echo "Création du réseau et volume..."
docker network create sedi-tablette-network 2>/dev/null || echo "Réseau déjà existant"
docker volume create sedi-tablette-logs 2>/dev/null || echo "Volume déjà existant"

# Arrêter les containers existants
echo "Arrêt des containers existants..."
docker stop sedi-tablette-backend sedi-tablette-frontend 2>/dev/null || true
docker rm sedi-tablette-backend sedi-tablette-frontend 2>/dev/null || true

# Démarrer le backend
echo "Démarrage du backend..."
docker run -d \
  --name sedi-tablette-backend \
  --hostname $(hostname)-backend \
  --user node \
  --env DB_USER=QUALITE \
  --env JWT_SECRET=change-me-in-production \
  --env DB_TRUST_CERT=true \
  --env DB_ENCRYPT=false \
  --env CACHE_TTL=300000 \
  --env API_TIMEOUT=30000 \
  --env PORT=3001 \
  --env API_RETRY_ATTEMPTS=3 \
  --env NODE_ENV=production \
  --env SESSION_SECRET=change-me-in-production \
  --env FRONTEND_URL=http://localhost \
  --env LOG_LEVEL=info \
  --env DB_PASSWORD=QUALITE \
  --env DB_DATABASE=SEDI_ERP \
  --env CACHE_ENABLED=true \
  --env DB_SERVER=SERVEURERP \
  --volume sedi-tablette-logs:/app/logs:rw \
  --volume /etc/localtime:/etc/localtime:ro \
  --network sedi-tablette-network \
  --workdir /app \
  -p 3001:3001 \
  --restart unless-stopped \
  --label com.sedi.component=backend \
  --label com.sedi.description="SEDI Tablette Backend API with Pause Management" \
  --label com.sedi.service=backend \
  --label com.sedi.version=2.2 \
  docker-sedi-backend

# Attendre que le backend soit prêt
echo "Attente du démarrage du backend..."
sleep 15

# Démarrer le frontend
echo "Démarrage du frontend..."
docker run -d \
  --name sedi-tablette-frontend \
  --hostname $(hostname)-frontend \
  --env NGINX_VERSION=1.25.5 \
  --env NGINX_WORKER_PROCESSES=auto \
  --env NGINX_WORKER_CONNECTIONS=1024 \
  --env NGINX_KEEPALIVE_TIMEOUT=65 \
  --volume /etc/localtime:/etc/localtime:ro \
  --volume sedi-tablette-logs:/var/log/nginx:rw \
  --network sedi-tablette-network \
  -p 8080:80 \
  --restart unless-stopped \
  --label com.sedi.component=frontend \
  --label com.sedi.description="SEDI Tablette Frontend with Pause Management" \
  --label com.sedi.service=frontend \
  --label com.sedi.version=2.2 \
  docker-sedi-frontend

echo "=== Déploiement terminé ==="
echo "Backend disponible sur: http://localhost:3001"
echo "Frontend disponible sur: http://localhost:8080"
echo ""
echo "Pour vérifier le statut:"
echo "  docker ps"
echo "  docker logs sedi-tablette-backend"
echo "  docker logs sedi-tablette-frontend"
EOF

chmod +x docker-export/deploy-production.sh

echo "4. Création de la documentation..."
cat > docker-export/README.md << 'EOF'
# SEDI Tablette - Images Docker de Production

## Fichiers inclus

- `docker-sedi-backend.tar` - Image Docker du backend
- `docker-sedi-frontend.tar` - Image Docker du frontend
- `deploy-production.sh` - Script de déploiement automatique
- `README.md` - Cette documentation

## Instructions de déploiement

### 1. Copier les fichiers sur le serveur de destination

```bash
# Copier tous les fichiers du dossier docker-export
scp -r docker-export/ user@serveur:/path/to/destination/
```

### 2. Sur le serveur de destination

```bash
# Rendre le script exécutable
chmod +x deploy-production.sh

# Exécuter le déploiement
./deploy-production.sh
```

### 3. Vérification

```bash
# Vérifier que les containers tournent
docker ps

# Vérifier les logs
docker logs sedi-tablette-backend
docker logs sedi-tablette-frontend

# Tester l'accès
curl http://localhost:3001/api/health
curl http://localhost:8080
```

## Configuration

Les containers sont configurés avec les paramètres de production :
- Backend sur le port 3001
- Frontend sur le port 8080
- Réseau Docker : sedi-tablette-network
- Volume de logs : sedi-tablette-logs

## Dépannage

- Si les containers ne démarrent pas, vérifiez les logs avec `docker logs <container-name>`
- Vérifiez que les ports 3001 et 8080 sont disponibles
- Assurez-vous que Docker est installé et en cours d'exécution
EOF

echo "✅ Export terminé avec succès"
echo "Fichiers exportés dans: docker-export/"
echo ""
echo "Fichiers créés:"
ls -la docker-export/
echo ""
echo "Prochaines étapes:"
echo "1. Copiez le dossier 'docker-export' sur votre serveur de destination"
echo "2. Sur le serveur, exécutez: ./deploy-production.sh"
