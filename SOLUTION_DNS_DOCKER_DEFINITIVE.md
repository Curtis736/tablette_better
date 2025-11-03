# 🔧 Solution DNS Docker Définitive

## ❌ Problème persistant
Même après configuration de `/etc/docker/daemon.json`, Docker continue d'utiliser `[::1]:53`.

## ✅ Solution complète

### Étape 1 : Vérifier la configuration actuelle

```bash
# Vérifier que le fichier existe et est valide
cat /etc/docker/daemon.json

# Vérifier la configuration Docker actuelle
docker info | grep -i dns
```

### Étape 2 : Configuration complète avec désactivation IPv6

```bash
# Créer la configuration complète
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "ipv6": false,
  "fixed-cidr-v6": "",
  "experimental": false,
  "ip6tables": false
}
EOF
```

### Étape 3 : Redémarrer Docker complètement

```bash
# Arrêter Docker
sudo systemctl stop docker

# Attendre quelques secondes
sleep 3

# Redémarrer Docker
sudo systemctl start docker

# Vérifier le statut
sudo systemctl status docker
```

### Étape 4 : Vérifier que Docker utilise bien la config

```bash
# Voir les DNS utilisés par Docker
docker info | grep -i dns

# Tester
docker pull alpine:latest
```

### Alternative : Si ça ne marche toujours pas

```bash
# Désactiver complètement IPv6 pour Docker
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1

# Ou ajouter dans /etc/sysctl.conf pour rendre permanent
echo "net.ipv6.conf.all.disable_ipv6=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Redémarrer Docker
sudo systemctl restart docker
```

## 🔍 Diagnostic

```bash
# Vérifier les logs Docker
sudo journalctl -u docker -n 50 | grep -i dns

# Vérifier la résolution DNS système
nslookup registry-1.docker.io 8.8.8.8

# Tester avec curl
curl -v https://registry-1.docker.io/v2/
```

