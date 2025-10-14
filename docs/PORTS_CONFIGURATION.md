# Configuration des Ports - SEDI Tablette

## 🎯 Architecture des Ports

### Ports Standardisés

| Service | Port Externe | Port Interne | Description |
|---------|--------------|--------------|-------------|
| **Backend** | `3001` | `3001` | API Node.js |
| **Frontend** | `8080` | `80` | Interface Nginx |
| **Debug** | `9229` | `9229` | Debug Node.js (dev uniquement) |

### Environnements

#### 🏭 Production
```yaml
# docker-compose.yml ou docker-compose.prod.yml
ports:
  - "3001:3001"  # Backend
  - "8080:80"    # Frontend
```

#### 🛠️ Développement
```yaml
# docker-compose.dev.yml
ports:
  - "3001:3001"  # Backend
  - "8080:80"    # Frontend
  - "9229:9229"  # Debug Node.js
```

## 🔧 Configuration des Services

### Backend (Node.js)
- **Port interne**: `3001`
- **Port externe**: `3001`
- **Health check**: `http://localhost:3001/api/health`
- **Configuration**: `backend/server.js` (PORT=3001)

### Frontend (Nginx)
- **Port interne**: `80`
- **Port externe**: `8080`
- **Health check**: `http://localhost:8080/health`
- **Proxy API**: `http://localhost:8080/api/*` → `http://sedi-tablette-backend:3001/api/*`

### ApiService (Frontend)
- **Détection automatique** de l'environnement
- **Production**: Utilise le proxy Nginx (`/api`)
- **Développement**: Se connecte directement au backend (`:3001`)

## 🚀 Déploiement

### Scripts de Déploiement

#### Linux/Mac
```bash
./scripts/deploy-production.sh
```

#### Windows
```powershell
.\scripts\deploy-production.ps1
```

#### Manuel
```bash
# 1. Arrêter les services
docker-compose down

# 2. Nettoyer
docker system prune -f

# 3. Rebuilder
docker-compose build --no-cache

# 4. Démarrer
docker-compose up -d

# 5. Vérifier
docker ps
```

## ✅ Tests de Validation

### Vérification des Ports
```bash
# Backend direct
curl http://localhost:3001/api/health

# Frontend
curl http://localhost:8080/health

# API via proxy
curl http://localhost:8080/api/health
```

### Vérification Docker
```bash
# Conteneurs en cours
docker ps

# Doit afficher:
# 0.0.0.0:3001->3001/tcp  sedi-tablette-backend
# 0.0.0.0:8080->80/tcp     sedi-tablette-frontend
```

## 🔍 Dépannage

### Problème: Backend non accessible sur 3001
- Vérifier le mapping des ports dans `docker-compose.yml`
- S'assurer que le port 3001 n'est pas utilisé par un autre service
- Redémarrer les conteneurs

### Problème: Frontend ne se connecte pas au backend
- Vérifier la configuration du proxy dans `nginx.conf`
- Vérifier que le nom du service backend est correct
- Vérifier les logs Nginx

### Problème: Ports en conflit
- Arrêter tous les conteneurs: `docker stop $(docker ps -aq)`
- Nettoyer: `docker system prune -f`
- Rebuilder: `docker-compose build --no-cache`

## 📝 Notes Importantes

1. **Cohérence**: Tous les environnements utilisent les mêmes ports
2. **Proxy**: Le frontend utilise Nginx comme proxy vers le backend
3. **Sécurité**: Seuls les ports nécessaires sont exposés
4. **Health Checks**: Chaque service a ses propres health checks
5. **Logs**: Centralisés dans le volume `sedi-logs`
