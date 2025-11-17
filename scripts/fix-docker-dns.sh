#!/bin/bash
# Script rapide pour configurer le DNS Docker (fonctionne même sans /etc/resolv.conf)

echo "🔧 Configuration DNS Docker..."

# Créer le répertoire si nécessaire
sudo mkdir -p /etc/docker

# Sauvegarder si le fichier existe
if [ -f /etc/docker/daemon.json ]; then
    echo "   → Sauvegarde de la configuration existante..."
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
    
    # Vérifier si DNS est déjà configuré
    if grep -q "\"dns\"" /etc/docker/daemon.json; then
        echo "   ⚠️  DNS déjà configuré dans daemon.json"
        echo "   → Contenu actuel:"
        cat /etc/docker/daemon.json | grep -A 3 "\"dns\"" || cat /etc/docker/daemon.json
        echo ""
        read -p "   Voulez-vous continuer et écraser la config? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "   ❌ Annulé"
            exit 0
        fi
    fi
    
    # Utiliser Python si disponible pour fusionner la config
    if command -v python3 > /dev/null 2>&1; then
        echo "   → Fusion avec la configuration existante..."
        sudo python3 -c "
import json
import sys

try:
    with open('/etc/docker/daemon.json', 'r') as f:
        config = json.load(f)
except Exception as e:
    print(f'   ⚠️  Erreur lecture: {e}')
    config = {}

config['dns'] = ['8.8.8.8', '8.8.4.4']

with open('/etc/docker/daemon.json', 'w') as f:
    json.dump(config, f, indent=2)
    
print('   ✅ Configuration mise à jour')
"
    else
        # Fallback : créer nouveau fichier
        echo "   → Création nouvelle configuration..."
        echo '{
  "dns": ["8.8.8.8", "8.8.4.4"]
}' | sudo tee /etc/docker/daemon.json > /dev/null
    fi
else
    echo "   → Création nouvelle configuration..."
    echo '{
  "dns": ["8.8.8.8", "8.8.4.4"]
}' | sudo tee /etc/docker/daemon.json > /dev/null
fi

echo ""
echo "✅ Configuration DNS Docker créée:"
cat /etc/docker/daemon.json
echo ""

echo "🔄 Redémarrage de Docker..."
sudo systemctl restart docker

echo ""
echo "⏳ Attente du redémarrage de Docker..."
sleep 3

echo ""
echo "🧪 Test de connectivité Docker Hub..."
if docker pull alpine:latest > /dev/null 2>&1; then
    echo "✅ Docker peut maintenant accéder à Docker Hub!"
    echo ""
    echo "🚀 Vous pouvez maintenant utiliser:"
    echo "   docker pull prom/prometheus:latest"
    echo "   docker pull grafana/grafana:latest"
else
    echo "⚠️  Test échoué, vérifiez les logs:"
    echo "   sudo journalctl -u docker -n 50"
    echo ""
    echo "   Ou vérifiez la configuration:"
    echo "   cat /etc/docker/daemon.json"
fi












