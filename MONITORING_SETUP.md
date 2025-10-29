# Guide d'installation du Monitoring (Grafana + Prometheus)

## Problème de connexion Docker Hub

Si le serveur ne peut pas se connecter à Docker Hub, utilisez cette méthode :

## Méthode 1 : Téléchargement manuel des images

### Sur une machine avec internet :

1. Téléchargez les images :
```bash
docker pull prom/prometheus:latest
docker pull grafana/grafana:latest
```

2. Exportez les images :
```bash
docker save prom/prometheus:latest -o prometheus-image.tar
docker save grafana/grafana:latest -o grafana-image.tar
```

3. Compressez :
```bash
tar czf monitoring-images.tar.gz prometheus-image.tar grafana-image.tar
```

4. Transférez sur le serveur :
```bash
scp monitoring-images.tar.gz maintenance@serveurproduction:~/
```

### Sur le serveur :

1. Extrayez et importez :
```bash
cd ~
tar xzf monitoring-images.tar.gz
docker load -i prometheus-image.tar
docker load -i grafana-image.tar
```

2. Démarrer le monitoring :
```bash
cd ~/tablette_better
docker-compose -f docker/docker-compose.monitoring.yml up -d
```

## Méthode 2 : Utiliser les scripts

### Sur une machine avec internet :

```bash
cd ~/tablette_better/scripts
chmod +x prepare-monitoring-images.sh
./prepare-monitoring-images.sh
```

Puis transférez `monitoring-images.tar.gz` sur le serveur.

### Sur le serveur :

```bash
cd ~
# Transférez d'abord monitoring-images.tar.gz
cd ~/tablette_better/scripts
chmod +x import-monitoring-images.sh
./import-monitoring-images.sh

# Puis démarrez
cd ~/tablette_better
docker-compose -f docker/docker-compose.monitoring.yml up -d
```

## Commande docker-compose correcte

La bonne commande est :
```bash
docker-compose -f docker/docker-compose.monitoring.yml up -d
```

**Pas** :
- ❌ `docker-compose --build -d`
- ❌ `docker-compose -build -d`

## Vérification

```bash
# Vérifier que les containers sont démarrés
docker ps | grep -E "prometheus|grafana"

# Vérifier les logs
docker logs sedi-prometheus
docker logs sedi-grafana
```

## Accès

- **Grafana** : http://IP_SERVEUR:3000 (admin/admin)
- **Prometheus** : http://IP_SERVEUR:9090
- **Métriques app** : http://IP_SERVEUR同类:3001/metrics
