#!/bin/bash
# Script de démarrage automatique Docker pour SEDI Tablette
# À exécuter au démarrage du système

echo "🚀 $(date): Démarrage automatique SEDI Tablette Docker..."

# Aller dans le répertoire docker
cd "$(dirname "$0")"

# Attendre que Docker soit prêt
echo "⏳ Attente que Docker soit prêt..."
while ! docker info >/dev/null 2>&1; do
    sleep 2
done

echo "✅ Docker est prêt"

# Démarrer les conteneurs de production
if [ -f "docker-compose.yml" ]; then
    echo "🔧 Démarrage des conteneurs de production..."
    docker compose up -d
    
    # Attendre que les conteneurs soient prêts
    echo "⏳ Attente que les conteneurs soient prêts..."
    sleep 10
    
    # Vérifier le statut
    if docker compose ps | grep -q "Up"; then
        echo "✅ Conteneurs de production démarrés avec succès"
    else
        echo "❌ Erreur lors du démarrage des conteneurs de production"
        docker compose logs
    fi
else
    echo "⚠️  Fichier docker-compose.yml non trouvé"
fi

# Afficher le statut final
echo "📊 Statut des conteneurs:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Aucun conteneur actif"

echo "✅ Démarrage automatique terminé"
