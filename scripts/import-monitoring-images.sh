#!/bin/bash
# Script pour importer les images Prometheus et Grafana sur le serveur
# À exécuter sur le serveur après avoir transféré monitoring-images.tar.gz

set -e

echo "📥 Import des images de monitoring..."

if [ ! -f "monitoring-images.tar.gz" ]; then
    echo "❌ Erreur: monitoring-images.tar.gz introuvable"
    echo "   Transférez d'abord le fichier depuis une machine avec internet:"
    echo "   scp monitoring-images.tar.gz maintenance@serveurproduction:~/"
    exit 1
fi

echo "📦 Extraction des archives..."
tar xzf monitoring-images.tar.gz

echo "⬆️  Import de l'image Prometheus..."
docker load -i prometheus-image.tar

echo "⬆️  Import de l'image Grafana..."
docker load -i grafana-image.tar

echo "🧹 Nettoyage..."
rm -f prometheus-image.tar grafana-image.tar

echo "✅ Images importées avec succès!"
echo ""
echo "🚀 Vous pouvez maintenant démarrer le monitoring:"
echo "   cd ~/tablette_better"
echo "   docker-compose -f docker/docker-compose.monitoring.yml up -d"
echo ""














