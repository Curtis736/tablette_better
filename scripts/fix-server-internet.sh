#!/bin/bash
# Script de diagnostic et correction automatique de la connectivité internet sur le serveur
# Permet à Docker d'accéder à Docker Hub pour télécharger les images

set -e

echo "🔍 Diagnostic et correction de la connectivité internet..."
echo ""

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Ce script nécessite les privilèges sudo pour certaines opérations"
    echo "   Certaines étapes peuvent nécessiter votre mot de passe"
    echo ""
fi

# 1. Vérifier la connectivité réseau de base
echo "1️⃣ Test de connectivité réseau de base:"
if ping -c 2 -W 2 8.8.8.8 > /dev/null 2>&1; then
    echo "✅ Connexion IP OK - Le serveur a un accès Internet"
    INTERNET_OK=true
else
    echo "❌ Pas de connexion IP - Problème de réseau"
    echo "   → Vérifiez le câble réseau et la configuration réseau"
    INTERNET_OK=false
fi

# 2. Vérifier DNS
echo ""
echo "2️⃣ Test DNS:"
if nslookup registry-1.docker.io > /dev/null 2>&1; then
    echo "✅ DNS fonctionne"
    DNS_OK=true
else
    echo "❌ DNS ne fonctionne pas"
    DNS_OK=false
fi

# 3. Afficher la configuration DNS actuelle
echo ""
echo "3️⃣ Configuration DNS actuelle:"
if [ -f /etc/resolv.conf ]; then
    cat /etc/resolv.conf | grep -v "^#" | grep -v "^$"
else
    echo "⚠️  Fichier /etc/resolv.conf introuvable"
fi

# 4. Corriger le DNS si nécessaire
if [ "$DNS_OK" = false ] && [ "$INTERNET_OK" = true ]; then
    echo ""
    echo "🔧 Correction du DNS..."
    
    # Sauvegarder la configuration actuelle
    if [ -f /etc/resolv.conf ]; then
        sudo cp /etc/resolv.conf /etc/resolv.conf.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Ajouter les DNS Google si pas déjà présent
    if ! grep -q "8.8.8.8" /etc/resolv.conf 2>/dev/null; then
        echo "   → Ajout de 8.8.8.8 (Google DNS)"
        echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf > /dev/null
    fi
    
    if ! grep -q "8.8.4.4" /etc/resolv.conf 2>/dev/null; then
        echo "   → Ajout de 8.8.4.4 (Google DNS)"
        echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
    fi
    
    # Tester à nouveau
    sleep 1
    if nslookup registry-1.docker.io > /dev/null 2>&1; then
        echo "✅ DNS corrigé avec succès!"
        DNS_OK=true
    else
        echo "⚠️  DNS toujours non fonctionnel après correction"
    fi
fi

# 5. Configurer Docker DNS
echo ""
echo "5️⃣ Configuration DNS Docker:"
DOCKER_DNS_CONFIGURED=false

if [ -f /etc/docker/daemon.json ]; then
    if grep -q "dns" /etc/docker/daemon.json; then
        echo "✅ Docker DNS déjà configuré"
        cat /etc/docker/daemon.json | grep -A 2 "dns"
        DOCKER_DNS_CONFIGURED=true
    else
        echo "⚠️  Docker daemon.json existe mais sans configuration DNS"
    fi
else
    echo "⚠️  Fichier /etc/docker/daemon.json n'existe pas"
fi

# Configurer Docker DNS si nécessaire
if [ "$DOCKER_DNS_CONFIGURED" = false ] && [ "$DNS_OK" = true ]; then
    echo ""
    echo "🔧 Configuration DNS pour Docker..."
    
    # Sauvegarder si le fichier existe
    if [ -f /etc/docker/daemon.json ]; then
        sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
        # Créer une nouvelle config en fusionnant avec l'existante
        sudo python3 -c "
import json
import sys
try:
    with open('/etc/docker/daemon.json', 'r') as f:
        config = json.load(f)
except:
    config = {}
config['dns'] = ['8.8.8.8', '8.8.4.4']
with open('/etc/docker/daemon.json', 'w') as f:
    json.dump(config, f, indent=2)
" 2>/dev/null || {
        # Fallback si Python n'est pas disponible
        echo "   → Création manuelle de /etc/docker/daemon.json"
        echo '{
  "dns": ["8.8.8.8", "8.8.4.4"]
}' | sudo tee /etc/docker/daemon.json > /dev/null
    }
    
    echo "✅ Configuration DNS Docker ajoutée"
    echo "   ⚠️  Redémarrez Docker pour appliquer les changements:"
    echo "      sudo systemctl restart docker"
fi

# 6. Vérifier IPv6
echo ""
echo "6️⃣ Vérification IPv6:"
if [ -f /proc/sys/net/ipv6/conf/all/disable_ipv6 ]; then
    if [ $(cat /proc/sys/net/ipv6/conf/all/disable_ipv6) -eq 1 ]; then
        echo "✅ IPv6 désactivé"
    else
        echo "⚠️  IPv6 activé (peut causer des problèmes de résolution DNS)"
        echo "   Pour désactiver: sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1"
    fi
fi

# 7. Test final
echo ""
echo "7️⃣ Test final de connectivité Docker Hub:"
if curl -s --max-time 5 https://registry-1.docker.io/v2/ > /dev/null 2>&1; then
    echo "✅ Accès à Docker Hub OK!"
    echo ""
    echo "🚀 Vous pouvez maintenant utiliser:"
    echo "   docker pull prom/prometheus:latest"
    echo "   docker pull grafana/grafana:latest"
else
    echo "❌ Accès à Docker Hub toujours bloqué"
    echo ""
    echo "📋 Actions manuelles possibles:"
    echo ""
    if [ "$INTERNET_OK" = false ]; then
        echo "1. Vérifier la configuration réseau du serveur:"
        echo "   - Vérifier le câble réseau"
        echo "   - Vérifier la configuration IP: ip addr"
        echo "   - Vérifier la passerelle: ip route"
        echo ""
    fi
    if [ "$DNS_OK" = false ]; then
        echo "2. Configurer le DNS manuellement:"
        echo "   sudo nano /etc/resolv.conf"
        echo "   # Ajoutez:"
        echo "   nameserver 8.8.8.8"
        echo "   nameserver 8.8.4.4"
        echo ""
    fi
    echo "3. Redémarrer Docker après modification:"
    echo "   sudo systemctl restart docker"
    echo ""
    echo "4. Utiliser l'alternative sans Internet (import d'images):"
    echo "   Voir MONITORING_PRODUCTION.md"
fi

echo ""
echo "✅ Diagnostic terminé!"
