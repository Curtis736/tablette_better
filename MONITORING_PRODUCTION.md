# Guide d'installation Monitoring sur serveur de production (sans Internet)

## ⚠️ Problème
Le serveur n'a **pas accès à Internet** pour télécharger les images Docker depuis Docker Hub.

## 📋 Solution : Importer les images depuis une machine avec Internet

### Étape 1 : Sur une machine AVEC Internet

Téléchargez et préparez les images :

```bash
# Télécharger les images
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest

# Sauvegarder les images
docker save prom/prometheus:latest -o prometheus-image.tar
docker save grafana/grafana:latest -o grafana-image.tar

# Compresser
tar czf monitoring-images.tar.gz prometheus-image.tar grafana-image.tar

# Transférer sur le serveur
scp monitoring-images.tar.gz maintenance@serveurproduction:~/ 
```

### Étape 2 : Sur le serveur (SANS Internet)

```bash
# 1. Aller dans le répertoire home
cd ~

# 2. Extraire les archives
tar xzf monitoring-images.tar.gz

# 3. Importer les images Docker
docker load -i prometheus-image.tar
docker load -i grafana-image.tar

# 4. Vérifier que les images sont chargées
docker images | grep -E "prometheus|grafana"

# 5. Aller dans le projet
cd ~/tablette_better

# 6. Faire un git pull pour avoir la dernière version
git pull

# 7. Aller dans le dossier docker
cd docker

# 8. Construire l'image personnalisée Prometheus (utilise l'image de base déjà chargée)
docker-compose -f docker-compose.monitoring.yml build prometheus

# 9. Démarrer le monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# 10. Vérifier que les containers sont démarrés
docker ps | grep -E "prometheus|grafana"
```

## 🔍 Commandes de vérification

```bash
# Voir les logs
docker logs sedi-prometheus
docker logs sedi-grafana

# Vérifier le statut
docker ps | grep -E "prometheus|grafana"

# Voir les métriques
docker stats sedi-prometheus sedi-grafana
```

## 🛑 Arrêter le monitoring

```bash
cd ~/tablette_better/docker
docker-compose -f docker-compose.monitoring.yml down
```

## ⚠️ Notes importantes

1. **Vous êtes déjà dans le dossier `docker/`** - Pas besoin de faire `cd docker`
2. **L'image de base doit être chargée AVANT** de construire l'image personnalisée
3. **Le build** utilise l'image `prom/prometheus:latest` déjà présente localement

## 🐛 Résolution de problèmes

### Erreur "lookup registry-1.docker.io"
→ Les images ne sont pas chargées. Importez-les d'abord avec `docker load`.

### Erreur lors du build
→ Vérifiez que `prom/prometheus:latest` est présent :
```bash
docker images | grep prometheus
```

### Erreur "network sedi-tablette-network not found"
→ Créez le réseau d'abord :
```bash
docker network create sedi-tablette-network
```

