#!/bin/bash
# Script de diagnostic et correction automatique de la connectivité internet sur le serveur
# Permet à Docker d'accéder à Docker Hub pour télécharger les images
# Compatible avec systemd-resolved, NetworkManager et configurations classiques

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

# 3. Détecter le système de gestion DNS
echo ""
echo "3️⃣ Détection du système de gestion DNS:"
DNS_SYSTEM="unknown"

# Vérifier systemd-resolved
if systemctl is-active --quiet systemd-resolved 2>/dev/null; then
    echo "   → systemd-resolved détecté (gestion DNS moderne)"
    DNS_SYSTEM="systemd-resolved"
    echo "   → Fichier de config: /etc/systemd/resolved.conf"
    echo "   → Résolveur actuel: $(resolvectl status 2>/dev/null | grep 'DNS Servers' | head -1 || echo 'Non disponible')"
elif systemctl is-active --quiet NetworkManager 2>/dev/null; then
    echo "   → NetworkManager détecté"
    DNS_SYSTEM="networkmanager"
    echo "   → Configuration via: nmcli ou /etc/NetworkManager/NetworkManager.conf"
elif [ -f /etc/resolv.conf ] && [ -L /etc/resolv.conf ]; then
    echo "   → /etc/resolv.conf est un lien symbolique"
    DNS_SYSTEM="symlink"
    echo "   → Pointe vers: $(readlink -f /etc/resolv.conf)"
elif [ -f /etc/resolv.conf ]; then
    echo "   → Configuration DNS classique (/etc/resolv.conf)"
    DNS_SYSTEM="classic"
    echo "   → Contenu actuel:"
    cat /etc/resolv.conf | grep -v "^#" | grep -v "^$" || echo "   (vide)"
else
    echo "   → Aucun fichier /etc/resolv.conf trouvé"
    DNS_SYSTEM="none"
fi

# Afficher les DNS actuels utilisés
echo ""
echo "   → DNS actuellement utilisés par le système:"
if command -v resolvectl > /dev/null 2>&1; then
    resolvectl status 2>/dev/null | grep -A 10 "DNS Servers" || echo "   (non disponible)"
elif [ -f /etc/resolv.conf ]; then
    grep "^nameserver" /etc/resolv.conf | head -3 || echo "   (aucun DNS configuré)"
else
    echo "   (impossible de déterminer)"
fi

# 4. Corriger le DNS selon le système détecté
if [ "$DNS_OK" = false ] && [ "$INTERNET_OK" = true ]; then
    echo ""
    echo "4️⃣ Correction du DNS..."
    
    case "$DNS_SYSTEM" in
        "systemd-resolved")
            echo "   → Configuration systemd-resolved..."
            if [ -f /etc/systemd/resolved.conf ]; then
                sudo cp /etc/systemd/resolved.conf /etc/systemd/resolved.conf.backup.$(date +%Y%m%d_%H%M%S)
            fi
            # Configurer DNS via systemd-resolved
            sudo sed -i 's/^#DNS=.*/DNS=8.8.8.8 8.8.4.4/' /etc/systemd/resolved.conf
            sudo sed -i 's/^DNS=.*/DNS=8.8.8.8 8.8.4.4/' /etc/systemd/resolved.conf
            if ! grep -q "^DNS=" /etc/systemd/resolved.conf; then
                echo "DNS=8.8.8.8 8.8.4.4" | sudo tee -a /etc/systemd/resolved.conf > /dev/null
            fi
            sudo systemctl restart systemd-resolved
            echo "   ✅ DNS configuré pour systemd-resolved"
            ;;
            
        "networkmanager")
            echo "   → Configuration NetworkManager..."
            # Configurer DNS via nmcli (méthode préférée)
            if command -v nmcli > /dev/null 2>&1; then
                CONNECTION=$(nmcli -t -f NAME connection show --active | head -1)
                if [ -n "$CONNECTION" ]; then
                    echo "   → Utilisation de la connexion: $CONNECTION"
                    sudo nmcli connection modify "$CONNECTION" ipv4.dns "8.8.8.8 8.8.4.4"
                    sudo nmcli connection modify "$CONNECTION" ipv4.ignore-auto-dns yes
                    sudo nmcli connection down "$CONNECTION"
                    sudo nmcli connection up "$CONNECTION"
                    echo "   ✅ DNS configuré via NetworkManager"
                else
                    echo "   ⚠️  Aucune connexion active trouvée"
                fi
            else
                echo "   ⚠️  nmcli non disponible"
            fi
            ;;
            
        "classic"|"symlink"|"none")
            echo "   → Configuration DNS classique..."
            # Créer ou modifier /etc/resolv.conf
            if [ ! -f /etc/resolv.conf ] || [ ! -s /etc/resolv.conf ]; then
                echo "# DNS Configuration - Generated by fix-server-internet.sh" | sudo tee /etc/resolv.conf > /dev/null
                echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf > /dev/null
                echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
                echo "   ✅ Fichier /etc/resolv.conf créé"
            else
                # Sauvegarder
                sudo cp /etc/resolv.conf /etc/resolv.conf.backup.$(date +%Y%m%d_%H%M%S)
                # Ajouter si pas déjà présent
                if ! grep -q "8.8.8.8" /etc/resolv.conf 2>/dev/null; then
                    echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf > /dev/null
                fi
                if ! grep -q "8.8.4.4" /etc/resolv.conf 2>/dev/null; then
                    echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
                fi
                echo "   ✅ DNS ajouté à /etc/resolv.conf"
            fi
            ;;
    esac
    
    # Tester à nouveau
    sleep 2
    if nslookup registry-1.docker.io > /dev/null 2>&1; then
        echo "   ✅ DNS corrigé avec succès!"
        DNS_OK=true
    else
        echo "   ⚠️  DNS toujours non fonctionnel après correction"
    fi
fi

# 5. Configurer Docker DNS (MÉTHODE PRINCIPALE - fonctionne toujours)
echo ""
echo "5️⃣ Configuration DNS Docker (RECOMMANDÉ):"
DOCKER_DNS_CONFIGURED=false

if [ -f /etc/docker/daemon.json ]; then
    if grep -q "\"dns\"" /etc/docker/daemon.json; then
        echo "✅ Docker DNS déjà configuré"
        grep -A 5 "\"dns\"" /etc/docker/daemon.json || echo "   (configuration trouvée)"
        DOCKER_DNS_CONFIGURED=true
    else
        echo "⚠️  Docker daemon.json existe mais sans configuration DNS"
    fi
else
    echo "⚠️  Fichier /etc/docker/daemon.json n'existe pas"
fi

# Configurer Docker DNS (PRIORITÉ - fonctionne même sans /etc/resolv.conf)
if [ "$DOCKER_DNS_CONFIGURED" = false ]; then
    echo ""
    echo "🔧 Configuration DNS pour Docker..."
    
    # Créer ou mettre à jour daemon.json
    if [ -f /etc/docker/daemon.json ]; then
        sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
        # Utiliser jq si disponible, sinon méthode manuelle
        if command -v jq > /dev/null 2>&1; then
            sudo jq '.dns = ["8.8.8.8", "8.8.4.4"]' /etc/docker/daemon.json > /tmp/daemon.json.tmp && sudo mv /tmp/daemon.json.tmp /etc/docker/daemon.json
        elif command -v python3 > /dev/null 2>&1; then
            sudo python3 -c "
import json
try:
    with open('/etc/docker/daemon.json', 'r') as f:
        config = json.load(f)
except:
    config = {}
config['dns'] = ['8.8.8.8', '8.8.4.4']
with open('/etc/docker/daemon.json', 'w') as f:
    json.dump(config, f, indent=2)
"
        else
            # Méthode de fallback
            echo "   → Création/Modification manuelle de /etc/docker/daemon.json"
            echo '{
  "dns": ["8.8.8.8", "8.8.4.4"]
}' | sudo tee /etc/docker/daemon.json > /dev/null
        fi
    else
        echo "   → Création de /etc/docker/daemon.json"
        echo '{
  "dns": ["8.8.8.8", "8.8.4.4"]
}' | sudo tee /etc/docker/daemon.json > /dev/null
    fi
    
    echo "✅ Configuration DNS Docker ajoutée:"
    cat /etc/docker/daemon.json
    echo ""
    echo "   ⚠️  Redémarrez Docker pour appliquer les changements:"
    echo "      sudo systemctl restart docker"
    echo ""
    echo "   💡 Même si le DNS système ne fonctionne pas, Docker utilisera directement"
    echo "      les DNS configurés dans daemon.json (8.8.8.8 et 8.8.4.4)"
fi

# 6. Vérifier IPv6
echo ""
echo "6️⃣ Vérification IPv6:"
if [ -f /proc/sys/net/ipv6/conf/all/disable_ipv6 ]; then
    if [ $(cat /proc/sys/net/ipv6/conf/all/disable_ipv6) -eq 1 ]; then
        echo "✅ IPv6 désactivé"
    else
        echo "⚠️  IPv6 activé (peut causer des problèmes de résolution DNS)"
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
    echo "📋 Solution recommandée - Configuration Docker DNS seulement:"
    echo ""
    echo "   La configuration DNS dans /etc/docker/daemon.json devrait suffire."
    echo "   Après redémarrage de Docker, testez:"
    echo ""
    echo "   1. sudo systemctl restart docker"
    echo "   2. docker pull prom/prometheus:latest"
    echo ""
    if [ "$INTERNET_OK" = false ]; then
        echo "⚠️  Problème de connectivité réseau de base détecté:"
        echo "   - Vérifiez le câble réseau"
        echo "   - Vérifiez la configuration IP: ip addr"
        echo "   - Vérifiez la passerelle: ip route"
        echo ""
    fi
    echo "   Alternative: Utiliser l'import d'images sans Internet"
    echo "   Voir MONITORING_PRODUCTION.md"
fi

echo ""
echo "✅ Diagnostic terminé!"
