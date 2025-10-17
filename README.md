# SEDI Tablette

## 🚀 Déploiement simple

### 1. Cloner le repo
```bash
git clone https://github.com/Curtis736/tablette_better.git
cd tablette_better
```

### 2. Déployer
```bash
docker-compose -f docker/docker-compose.production.yml up -d
```

C'est tout ! 🎉

## ✅ Vérification

```bash
# Vérifier que les containers tournent
docker ps

# Tester l'accès
curl http://localhost:3001/api/health
curl http://localhost:8080
```

## 🌐 URLs d'accès

- **Backend API** : http://localhost:3001
- **Frontend Web** : http://localhost:8080

## 🛠️ Commandes utiles

```bash
# Voir les logs
docker-compose -f docker/docker-compose.production.yml logs -f

# Arrêter les services
docker-compose -f docker/docker-compose.production.yml down

# Redémarrer les services
docker-compose -f docker/docker-compose.production.yml restart
```

## 📋 Prérequis

- Docker et Docker Compose installés
- Ports 3001 et 8080 disponibles