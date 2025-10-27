# 🚀 Guide de déploiement SEDI Tablette

## 📋 Options de déploiement

Vous avez plusieurs options pour déployer l'application :

### Option 1 : Déploiement Docker (Recommandé)

**Prérequis :**
- Docker et Docker Compose installés
- Accès Internet pour télécharger les images

**Commandes :**
```bash
# Avec accès Internet
cd docker
docker-compose -f docker-compose.production.yml up -d

# Vérifier le statut
docker ps

# Voir les logs
docker-compose -f docker-compose.production.yml logs -f
```

**Si Docker ne démarre pas :**
```bash
# Linux
sudo systemctl start docker
sudo systemctl enable docker

# Vérifier le statut
sudo systemctl status docker
```

**Si problème de réseau/DNS :**
```bash
# Configurer le DNS manuellement
sudo nano /etc/resolv.conf
# Ajouter: nameserver 8.8.8.8

# Redémarrer Docker
sudo systemctl restart docker
```

### Option 2 : Déploiement direct (Sans Docker)

Si Docker pose problème ou si vous préférez déployer directement :

#### Sur Linux :
```bash
# Rendre le script exécutable
chmod +x deploy-direct-production.sh

# Exécuter le déploiement
./deploy-direct-production.sh
```

#### Sur Windows Server :
```powershell
# Exécuter le script PowerShell
.\deploy-direct-production.ps1
```

**Avantages du déploiement direct :**
- Pas besoin de Docker
- Démarrage rapide
- Contrôle total sur les processus
- Logs accessibles facilement

### Option 3 : Déploiement manuel

#### 1. Backend
```bash
cd backend
npm install
node server.js
```

#### 2. Frontend
```bash
cd frontend
npm install
npx http-server . -p 8080 --cors -o
```

## 🔧 Résolution des problèmes courants

### Problème : "Cannot connect to Docker daemon"
```bash
# Solution
sudo systemctl start docker
sudo systemctl enable docker
```

### Problème : "registry-1.docker.io lookup failed"
```bash
# Solution 1 : Vérifier la connectivité
ping 8.8.8.8

# Solution 2 : Utiliser le déploiement direct
./deploy-direct-production.sh
```

### Problème : "Port already in use"
```bash
# Trouver le processus qui utilise le port
sudo lsof -i :3001
sudo lsof -i :8080

# Arrêter le processus
sudo kill -9 <PID>
```

### Problème : "Cannot find module"
```bash
# Réinstaller les dépendances
cd backend
rm -rf node_modules
npm install

cd ../frontend
rm -rf node_modules
npm install
```

## 🌐 Accès aux services

Après le déploiement, accédez aux services :

- **Backend API** : `http://VOTRE_SERVEUR:3001`
- **Frontend** : `http://VOTRE_SERVEUR:8080`
- **Health Check** : `http://VOTRE_SERVEUR:3001/api/health`
- **Stats Concurrence** : `http://VOTRE_SERVEUR:3001/api/admin/concurrency-stats`

## 📝 Configuration de production

Le fichier `backend/config-production.js` contient les paramètres de production :

- **Base de données** : IP, credentials, timeout
- **Security** : JWT secrets, session secrets
- **Performance** : Pool de connexions, timeouts

## 🔍 Vérification du déploiement

```bash
# Vérifier que le backend fonctionne
curl http://localhost:3001/api/health

# Vérifier que le frontend fonctionne
curl http://localhost:8080

# Voir les processus
ps aux | grep node

# Voir les ports ouverts
netstat -tulpn | grep LISTEN
```

## 🛑 Arrêt des services

### Si déployé avec Docker :
```bash
cd docker
docker-compose -f docker-compose.production.yml down
```

### Si déployé en direct :
```bash
# Trouver les processus
ps aux | grep "node server.js"
ps aux | grep "http-server"

# Arrêter les processus
pkill -f "node server.js"
pkill -f "http-server"
```

## 📊 Monitoring

### Logs en temps réel
```bash
# Backend
tail -f logs/backend.log

# Frontend
tail -f logs/frontend.log

# Docker (si utilisé)
docker-compose -f docker-compose.production.yml logs -f
```

### Statistiques de concurrence
```bash
curl http://localhost:3001/api/admin/concurrency-stats
```

## 🔐 Sécurité

1. **Firewall** : Ouvrir uniquement les ports 3001 et 8080
2. **HTTPS** : Utiliser un reverse proxy (Nginx) avec SSL
3. **Secrets** : Changer les secrets JWT en production
4. **Base de données** : Utiliser des credentials sécurisés

## 📞 Support

En cas de problème :
1. Vérifier les logs : `tail -f logs/backend.log`
2. Vérifier le statut : `ps aux | grep node`
3. Vérifier les ports : `netstat -tulpn | grep LISTEN`
4. Vérifier les dépendances : `npm list`
