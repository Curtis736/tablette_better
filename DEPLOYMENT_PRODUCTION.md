# Déploiement SEDI Tablette - Production

## Configuration de production validée

Cette configuration a été testée et validée sur le serveur de production :
- **Serveur** : ServeurPRODUCTION (192.168.1.26:722)
- **Utilisateur** : maintenance
- **Ports** : 3001 (Backend), 8080 (Frontend)

## Fichiers de configuration

### Docker Compose
- `docker/docker-compose.yml` - Configuration de développement
- `docker/docker-compose.production.yml` - Configuration de production

### Scripts de déploiement
- `scripts/deploy-production.sh` - Déploiement automatique
- `scripts/export-production-images.sh` - Export des images Docker

## Configuration des containers

### Backend (sedi-tablette-backend)
- **Image** : `docker-sedi-backend`
- **Port** : 3001
- **Utilisateur** : node
- **Réseau** : sedi-tablette-network
- **Volume** : sedi-tablette-logs:/app/logs
- **Healthcheck** : http://localhost:3001/api/health

### Frontend (sedi-tablette-frontend)
- **Image** : `docker-sedi-frontend`
- **Port** : 8080
- **Réseau** : sedi-tablette-network
- **Volume** : sedi-tablette-logs:/var/log/nginx
- **Healthcheck** : http://localhost/health

## Variables d'environnement

### Backend
```env
NODE_ENV=production
PORT=3001
DB_SERVER=SERVEURERP
DB_DATABASE=SEDI_ERP
DB_USER=QUALITE
DB_PASSWORD=QUALITE
DB_ENCRYPT=false
DB_TRUST_CERT=true
FRONTEND_URL=http://localhost
API_TIMEOUT=30000
API_RETRY_ATTEMPTS=3
CACHE_ENABLED=true
CACHE_TTL=300000
LOG_LEVEL=info
JWT_SECRET=change-me-in-production
SESSION_SECRET=change-me-in-production
```

### Frontend
```env
NGINX_VERSION=1.25.5
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
NGINX_KEEPALIVE_TIMEOUT=65
```

## Déploiement

### 1. Déploiement local avec Docker Compose
```bash
# Développement
docker-compose up -d

# Production
docker-compose -f docker/docker-compose.production.yml up -d
```

### 2. Déploiement sur serveur distant
```bash
# Exporter les images
./scripts/export-production-images.sh

# Copier sur le serveur
scp -r docker-export/ user@serveur:/path/to/destination/

# Sur le serveur
cd docker-export
chmod +x deploy-production.sh
./deploy-production.sh
```

## Vérification

### État des containers
```bash
docker ps --filter "name=sedi-tablette"
```

### Logs
```bash
docker logs sedi-tablette-backend
docker logs sedi-tablette-frontend
```

### Tests de connectivité
```bash
# Backend
curl http://localhost:3001/api/health

# Frontend
curl http://localhost:8080
```

## URLs d'accès

- **Backend API** : http://192.168.1.26:3001
- **Frontend Web** : http://192.168.1.26:8080

## Maintenance

### Redémarrage des services
```bash
docker-compose -f docker/docker-compose.production.yml restart
```

### Mise à jour
```bash
# Arrêter les services
docker-compose -f docker/docker-compose.production.yml down

# Reconstruire les images
docker-compose -f docker/docker-compose.production.yml build

# Redémarrer
docker-compose -f docker/docker-compose.production.yml up -d
```

### Nettoyage
```bash
# Arrêter et supprimer les containers
docker-compose -f docker/docker-compose.production.yml down

# Supprimer les volumes (ATTENTION : supprime les logs)
docker-compose -f docker/docker-compose.production.yml down -v
```

## Dépannage

### Containers qui ne démarrent pas
1. Vérifier les logs : `docker logs <container-name>`
2. Vérifier les ports disponibles : `netstat -tlnp | grep -E ':(3001|8080)'`
3. Vérifier l'espace disque : `df -h`

### Problèmes de connectivité
1. Vérifier le firewall : `ufw status`
2. Vérifier les ports ouverts : `ss -tlnp`
3. Tester la connectivité locale : `curl http://localhost:3001/api/health`

### Problèmes de base de données
1. Vérifier la connectivité : `telnet SERVEURERP 1433`
2. Vérifier les credentials dans les variables d'environnement
3. Vérifier les logs du backend pour les erreurs de connexion
