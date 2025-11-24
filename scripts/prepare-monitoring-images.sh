#!/bin/bash
# Script pour télécharger et exporter les images Prometheus et Grafana
# À exécuter sur une machine avec accès internet, puis transférer sur le serveur

set -e

echo "📦 Préparation des images Docker pour le monitoring..."

# Créer un répertoire temporaire
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "⬇️  Téléchargement de l'image Prometheus..."
docker pull prom/prometheus:latest

echo "⬇️  Téléchargement de l'image Grafana..."
docker pull grafana/grafana:latest

echo "💾 Export des images..."
docker save prom/prometheus:latest -o prometheus-image.tar
docker save grafana/grafana:latest -o grafana-image.tar

echo "📦 Compression..."
tar czf monitoring-images.tar.gz prometheus-image.tar grafana-image.tar

echo "✅ Images préparées dans: $TEMP_DIR/monitoring-images.tar.gz"
echo ""
echo "📤 Pour transférer sur le serveur:"
echo "   scp $TEMP_DIR/monitoring-images.tar.gz maintenance@serveurproduction:~/"
echo ""
echo "📥 Sur le serveur, pour importer:"
echo "   tar xzf monitoring-images.tar.gz"
echo "   docker load -i prometheus-image.tar"
echo "   docker load -i grafana-image.tar"
echo ""


















