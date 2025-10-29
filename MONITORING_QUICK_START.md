# Guide rapide - Installation Monitoring

Le serveur n'a **pas d'accès internet** pour télécharger les images Docker.

## Solution : Télécharger les images sur une autre machine

### Étape 1 : Sur une machine avec internet (Windows ou Linux)

Ouvrez un terminal et exécutez :

```bash
# Télécharger les images
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest

# Sauvegarder les images dans des fichiers
docker save prom/prometheus:latest | gzip > prometheus-image.tar.gz
docker save grafana/grafana:latest | gzip > grafana-image.tar.gz

# OU si pas de gzip, sauvegarder sans compression
docker save prom/prometheus:latest -o prometheus-image.tar
docker save grafana/grafana:latest -o grafana-image.tar
```

### Étape 2 : Transférer sur le serveur

```bash
# Depuis votre machine Windows/Linux, transférer les fichiers
scp prometheus-image.tar.gz grafana-image.tar.gz maintenance@serveurproduction:~/
# OU si sans compression
scp prometheus-image.tar grafana-image.tar maintenance@serveurproduction:~/
```

### Étape 3 : Sur le serveur

```bash
# Aller dans le répertoire home
cd ~

# Si fichiers compressés (.tar.gz)
gunzip -c prometheus-image.tar.gz | docker load
gunzip -c grafana-image.tar.gz | docker load

# OU si fichiers normaux (.tar)
docker load -i prometheus-image.tar
docker load -i grafana-image.tar

# Vérifier que les images sont chargées
docker images | grep -E "prometheus|grafana"

# Aller dans le projet
cd ~/tablette_better

# Faire un git pull pour avoir la dernière version
git pull

# Démarrer le monitoring
docker-compose -f docker/docker-compose.monitoring.yml up -d

# Vérifier que ça fonctionne
docker ps | grep -E "prometheus|grafana"
```

## Commande complète en une ligne (sur serveur)

```bash
cd ~/tablette_better && git pull && docker-compose -f docker/docker-compose.monitoring.yml up -d
```

## Vérification

```bash
# Vérifier les logs
docker logs sedi-prometheus
docker logs sedi-grafana

# Vérifier que les services répondent
curl http://localhost:9090  # Prometheus
curl http://localhost:3000  # Grafana
```

## Accès

- **Grafana** : http://IP_SERVEUR:3000 (admin/admin)
- **Prometheus** : http://IP_SERVEUR:9090
- **Métriques app** : http://IP_SERVEUR:3001/metrics
