# 🐳 SEDI Tablette - Docker Configuration

## 📋 Configuration Docker pour démarrage automatique

Cette configuration garantit que Docker et les conteneurs SEDI Tablette sont **toujours allumés** et redémarrent automatiquement.

### 🔧 Fichiers de configuration

- `docker-compose.yml` - Configuration de production avec `restart: unless-stopped`
- `docker-compose.dev.yml` - Configuration de développement avec `restart: unless-stopped`
- `docker-compose-offline.yml` - Configuration pour serveurs sans accès Internet

### 🚀 Scripts de gestion

#### Scripts principaux :
- `start-docker.sh` - Démarre tous les conteneurs
- `stop-docker.sh` - Arrête tous les conteneurs
- `monitor-docker.sh` - Surveille et redémarre si nécessaire

#### Service systemd :
- `sedi-tablette.service` - Service systemd pour démarrage automatique au boot

### ⚙️ Installation et configuration

#### 1. Rendre les scripts exécutables :
```bash
chmod +x docker/*.sh
```

#### 2. Activer Docker au démarrage :
```bash
sudo systemctl enable docker
sudo systemctl start docker
```

#### 3. Installer le service systemd (optionnel) :
```bash
# Copier le service
sudo cp docker/sedi-tablette.service /etc/systemd/system/

# Activer le service
sudo systemctl enable sedi-tablette.service

# Démarrer le service
sudo systemctl start sedi-tablette.service
```

#### 4. Configurer le monitoring automatique :
```bash
# Ajouter au crontab pour vérifier toutes les 5 minutes
crontab -e

# Ajouter cette ligne :
*/5 * * * * /home/maintenance/Sedi_ati/tablette_better/docker/monitor-docker.sh >> /home/maintenance/docker-monitor.log 2>&1
```

### 🎯 Utilisation

#### Démarrage manuel :
```bash
cd docker
./start-docker.sh
```

#### Arrêt manuel :
```bash
cd docker
./stop-docker.sh
```

#### Monitoring :
```bash
cd docker
./monitor-docker.sh
```

#### Vérifier le statut :
```bash
docker compose ps
systemctl status sedi-tablette.service
```

### 🔄 Politiques de redémarrage

- **`restart: unless-stopped`** : Redémarre automatiquement sauf si arrêté manuellement
- **Health checks** : Vérification de santé toutes les 30s
- **Monitoring** : Vérification automatique toutes les 5 minutes via cron

### 📊 Surveillance

#### Logs :
```bash
# Logs des conteneurs
docker compose logs -f

# Logs du monitoring
tail -f /home/maintenance/docker-monitor.log

# Logs du service systemd
journalctl -u sedi-tablette.service -f
```

#### Statut :
```bash
# Statut des conteneurs
docker compose ps

# Statut du service systemd
systemctl status sedi-tablette.service

# Statut Docker
systemctl status docker
```

### 🛠️ Dépannage

#### Si les conteneurs ne démarrent pas :
```bash
# Vérifier les logs
docker compose logs

# Redémarrer Docker
sudo systemctl restart docker

# Redémarrer les conteneurs
docker compose down && docker compose up -d
```

#### Si le service systemd ne fonctionne pas :
```bash
# Vérifier les logs
journalctl -u sedi-tablette.service

# Recharger la configuration
sudo systemctl daemon-reload

# Redémarrer le service
sudo systemctl restart sedi-tablette.service
```

### ✅ Vérification finale

Pour vérifier que tout fonctionne :

```bash
# 1. Vérifier Docker
systemctl status docker

# 2. Vérifier les conteneurs
docker compose ps

# 3. Vérifier le service systemd
systemctl status sedi-tablette.service

# 4. Tester l'application
curl http://localhost/api/health
```

**🎉 Avec cette configuration, Docker sera toujours allumé et redémarrera automatiquement !**
