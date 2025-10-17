# SEDI Tablette - Déploiement depuis Git

## 🚀 Déploiement rapide

### Sur Linux/Mac
```bash
# 1. Cloner le repo
git clone https://github.com/Curtis736/tablette_better.git
cd tablette_better

# 2. Configurer et déployer
chmod +x scripts/setup-from-repo.sh
./scripts/setup-from-repo.sh
```

### Sur Windows
```batch
# 1. Cloner le repo
git clone https://github.com/Curtis736/tablette_better.git
cd tablette_better

# 2. Configurer et déployer
.\scripts\setup-from-repo.bat
```

## 📋 Prérequis

- **Docker** et **Docker Compose** installés
- **Git LFS** installé (pour télécharger les images Docker)
- Ports **3001** et **8080** disponibles

## 🔧 Installation de Git LFS

### Linux
```bash
sudo apt-get install git-lfs
```

### Windows
Télécharger depuis : https://git-lfs.github.io/

### Mac
```bash
brew install git-lfs
```

## ✅ Vérification

Après déploiement, vérifiez que tout fonctionne :

```bash
# Vérifier les containers
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
# Voir l'état des services
docker-compose -f docker/docker-compose.production.yml ps

# Voir les logs
docker-compose -f docker/docker-compose.production.yml logs -f

# Arrêter les services
docker-compose -f docker/docker-compose.production.yml down

# Redémarrer les services
docker-compose -f docker/docker-compose.production.yml restart
```

## 📚 Documentation complète

Voir `DEPLOYMENT_PRODUCTION.md` pour la documentation détaillée.
