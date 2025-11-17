# 🔧 Configuration DNS Docker (Solution Rapide)

## ❌ Problème
```
Error: dial tcp: lookup registry-1.docker.io on [::1]:53: read udp [::1]:49719->[::1]:53: read: connection refused
```

Docker essaie d'utiliser le DNS localhost qui ne fonctionne pas.

## ✅ Solution : Configurer Docker DNS directement

### Étape 1 : Créer/modifier `/etc/docker/daemon.json`

```bash
sudo nano /etc/docker/daemon.json
```

### Étape 2 : Ajouter cette configuration

```json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

### Étape 3 : Redémarrer Docker

```bash
sudo systemctl restart docker
```

### Étape 4 : Vérifier

```bash
docker pull prom/prometheus:latest
```

## 🚀 Commande en une ligne

```bash
echo '{"dns": ["8.8.8.8", "8.8.4.4"]}' | sudo tee /etc/docker/daemon.json && sudo systemctl restart docker
```

## 📝 Note importante

Cette configuration fonctionne **même sans `/etc/resolv.conf`** car Docker utilise directement les DNS spécifiés dans `daemon.json`.

## 🔍 Vérification

Après redémarrage de Docker :

```bash
# Tester Docker Hub
docker pull prom/prometheus:latest

# Voir la configuration Docker
docker info | grep -i dns
```












