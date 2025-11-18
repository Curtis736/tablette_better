#!/bin/bash
# Script pour forcer Docker à utiliser IPv4 uniquement et DNS Google

echo "🔧 Configuration DNS Docker avec désactivation IPv6..."

# 1. Désactiver IPv6 au niveau système (temporairement)
echo "1️⃣ Désactivation IPv6 au niveau système..."
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1

# 2. Créer la configuration Docker complète
echo ""
echo "2️⃣ Configuration Docker..."
sudo tee /etc/docker/daemon.json > /dev/null <<'EOF'
{
  "dns": ["8.8.8.8", "8.8.4.4"],
  "dns-opts": ["use-vc", "attempts:2", "timeout:2"],
  "ipv6": false
}
EOF

# 3. Créer un resolv.conf minimal si nécessaire
echo ""
echo "3️⃣ Création resolv.conf pour le système..."
if [ ! -f /etc/resolv.conf ] || [ ! -s /etc/resolv.conf ]; then
    echo "   → Création de /etc/resolv.conf"
    echo "# DNS Configuration" | sudo tee /etc/resolv.conf > /dev/null
    echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf > /dev/null
    echo "nameserver 8.8.4.4" | sudo tee -a /etc/resolv.conf > /dev/null
    sudo chmod 644 /etc/resolv.conf
fi

# 4. Arrêter Docker complètement
echo ""
echo "4️⃣ Arrêt de Docker..."
sudo systemctl stop docker.socket
sudo systemctl stop docker
sleep 2

# 5. Redémarrer Docker
echo ""
echo "5️⃣ Redémarrage de Docker..."
sudo systemctl start docker
sleep 3

# 6. Vérifier la configuration
echo ""
echo "6️⃣ Vérification de la configuration..."
echo "   → daemon.json:"
cat /etc/docker/daemon.json
echo ""
echo "   → DNS utilisé par Docker:"
docker info 2>/dev/null | grep -i dns || echo "   (vérification en cours...)"

# 7. Test
echo ""
echo "7️⃣ Test de connectivité..."
if docker pull alpine:latest > /dev/null 2>&1; then
    echo "✅ SUCCÈS! Docker peut maintenant accéder à Docker Hub"
    echo ""
    echo "🚀 Vous pouvez maintenant utiliser:"
    echo "   docker pull prom/prometheus:latest"
    echo "   docker pull grafana/grafana:latest"
else
    echo "❌ Test échoué"
    echo ""
    echo "📋 Informations de diagnostic:"
    echo "   → Configuration Docker:"
    cat /etc/docker/daemon.json
    echo ""
    echo "   → Vérification DNS système:"
    nslookup registry-1.docker.io 8.8.8.8 2>/dev/null || echo "   (nslookup non disponible ou échoué)"
    echo ""
    echo "   → Logs Docker récents:"
    sudo journalctl -u docker -n 20 --no-pager | grep -i dns || echo "   (aucun log DNS trouvé)"
fi













