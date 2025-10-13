#!/bin/bash
# Script de monitoring Docker pour SEDI Tablette
# Vérifie que les conteneurs sont en cours d'exécution et les redémarre si nécessaire

echo "🔍 $(date): Monitoring Docker containers..."

# Aller dans le répertoire docker
cd "$(dirname "$0")"

# Fonction pour vérifier et redémarrer les conteneurs
check_and_restart() {
    local compose_file=$1
    local service_name=$2
    
    echo "📋 Vérification du fichier: $compose_file"
    
    # Vérifier si les conteneurs sont en cours d'exécution
    if docker compose -f "$compose_file" ps | grep -q "Up"; then
        echo "✅ Containers running for $service_name"
    else
        echo "⚠️  Containers down for $service_name, restarting..."
        docker compose -f "$compose_file" up -d
        sleep 5
        
        # Vérifier à nouveau
        if docker compose -f "$compose_file" ps | grep -q "Up"; then
            echo "✅ Containers restarted successfully for $service_name"
        else
            echo "❌ Failed to restart containers for $service_name"
            return 1
        fi
    fi
}

# Vérifier le service Docker
if ! systemctl is-active --quiet docker; then
    echo "⚠️  Docker service is not running, starting..."
    sudo systemctl start docker
    sleep 3
fi

# Vérifier les conteneurs de production
if [ -f "docker-compose.yml" ]; then
    check_and_restart "docker-compose.yml" "production"
fi

# Vérifier les conteneurs de développement (si actifs)
if [ -f "docker-compose.dev.yml" ]; then
    # Vérifier si des conteneurs dev sont actifs
    if docker compose -f "docker-compose.dev.yml" ps | grep -q "Up"; then
        check_and_restart "docker-compose.dev.yml" "development"
    fi
fi

# Afficher le statut final
echo "📊 Status final:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Aucun conteneur actif"

echo "✅ Monitoring terminé"
