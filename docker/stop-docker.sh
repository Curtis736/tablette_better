#!/bin/bash
# Script d'arrêt Docker pour SEDI Tablette

echo "🛑 $(date): Arrêt des conteneurs SEDI Tablette..."

# Aller dans le répertoire docker
cd "$(dirname "$0")"

# Arrêter les conteneurs de production
if [ -f "docker-compose.yml" ]; then
    echo "🔧 Arrêt des conteneurs de production..."
    docker compose down
fi

# Arrêter les conteneurs de développement
if [ -f "docker-compose.dev.yml" ]; then
    echo "🔧 Arrêt des conteneurs de développement..."
    docker compose -f docker-compose.dev.yml down
fi

# Vérifier qu'aucun conteneur SEDI n'est en cours d'exécution
if docker ps | grep -q "sedi-tablette"; then
    echo "⚠️  Certains conteneurs SEDI sont encore actifs:"
    docker ps --format "table {{.Names}}\t{{.Status}}" | grep "sedi-tablette"
    
    echo "🔄 Arrêt forcé..."
    docker ps -q --filter "name=sedi-tablette" | xargs -r docker stop
fi

echo "✅ Arrêt terminé"
