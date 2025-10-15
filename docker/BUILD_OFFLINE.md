# Build Docker Offline - SEDI Tablette

## 🚨 Problème de connectivité DNS

Si vous rencontrez des erreurs de type :
```
failed to resolve source metadata for docker.io/library/node:18-alpine
dial tcp: lookup registry-1.docker.io on [::1]:53: read udp [::1]:43005->[::1]:53: read: connection refused
```

Cela indique un problème de résolution DNS sur le serveur de production.

## 🔧 Solutions appliquées

### 1. Dockerfiles modifiés
- **Backend** : Utilise `alpine:3.18` + installation manuelle de Node.js
- **Frontend** : Utilise `alpine:3.18` + installation manuelle de Nginx
- **Configuration DB** : IP serveur mise à jour vers `192.168.1.14`

### 2. Script de build offline
```bash
# Utiliser le script de build offline
./build-offline.sh
```

### 3. Build manuel
```bash
# Build du backend
docker build -f Dockerfile.backend -t sedi-backend:latest .

# Build du frontend  
docker build -f Dockerfile.frontend -t sedi-frontend:latest .

# Lancer avec docker-compose
docker compose up -d
```

## 🌐 Configuration DNS (si nécessaire)

Si le problème persiste, configurer DNS sur le serveur :

```bash
# Créer resolv.conf
sudo bash -c 'cat > /etc/resolv.conf << EOF
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 8.8.4.4
EOF'

# Tester la résolution
nslookup registry-1.docker.io
```

## 📦 Images alternatives

Les Dockerfiles utilisent maintenant :
- `alpine:3.18` (plus léger et plus stable)
- Installation manuelle des dépendances
- Configuration optimisée pour l'environnement SEDI

## ✅ Vérification

Après le build, vérifier que les images sont créées :
```bash
docker images | grep sedi
```

## 🚀 Déploiement

```bash
# Démarrer les services
docker compose up -d

# Vérifier les logs
docker compose logs -f

# Vérifier la santé
curl http://localhost:8080
curl http://localhost:3001/api/health
```
