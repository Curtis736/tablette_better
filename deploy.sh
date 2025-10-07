#!/bin/bash

# Script de déploiement SEDI Tablette v2.1
# Usage: ./deploy.sh [prod|dev|stop|logs|update]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
PROJECT_NAME="sedi-tablette"
VERSION="2.1"

# Fonctions utilitaires
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    log_info "Docker et Docker Compose sont disponibles"
}

# Déploiement en production
deploy_prod() {
    log_info "🚀 Déploiement en production..."
    
    # Arrêter les conteneurs existants
    docker-compose down --remove-orphans
    
    # Construire et démarrer
    docker-compose up --build -d
    
    # Attendre que les services soient prêts
    log_info "⏳ Attente du démarrage des services..."
    sleep 30
    
    # Vérifier la santé des services
    if docker-compose ps | grep -q "healthy"; then
        log_success "✅ Déploiement réussi!"
        log_info "🌐 Frontend: http://localhost"
        log_info "🔧 Backend API: http://localhost:3000"
        log_info "📊 Health check: http://localhost/health"
    else
        log_error "❌ Problème lors du déploiement"
        docker-compose logs --tail=50
        exit 1
    fi
}

# Déploiement en développement
deploy_dev() {
    log_info "🛠️ Déploiement en développement..."
    
    # Arrêter les conteneurs existants
    docker-compose -f docker/docker-compose.dev.yml down --remove-orphans
    
    # Construire et démarrer
    docker-compose -f docker/docker-compose.dev.yml up --build -d
    
    # Attendre que les services soient prêts
    log_info "⏳ Attente du démarrage des services..."
    sleep 20
    
    log_success "✅ Environnement de développement prêt!"
    log_info "🌐 Frontend: http://localhost:8080"
    log_info "🔧 Backend API: http://localhost:3000"
    log_info "🐛 Debug port: 9229"
}

# Arrêter tous les services
stop_services() {
    log_info "🛑 Arrêt des services..."
    
    docker-compose down --remove-orphans
    docker-compose -f docker/docker-compose.dev.yml down --remove-orphans
    
    log_success "✅ Services arrêtés"
}

# Afficher les logs
show_logs() {
    local service=${2:-""}
    
    if [ -n "$service" ]; then
        log_info "📋 Logs du service: $service"
        docker-compose logs -f "$service"
    else
        log_info "📋 Logs de tous les services"
        docker-compose logs -f
    fi
}

# Mettre à jour les images
update_images() {
    log_info "🔄 Mise à jour des images..."
    
    docker-compose pull
    docker system prune -f
    
    log_success "✅ Images mises à jour"
}

# Afficher le statut
show_status() {
    log_info "📊 Statut des services:"
    echo ""
    
    docker-compose ps
    echo ""
    
    # Vérifier la connectivité
    if curl -s http://localhost/health > /dev/null; then
        log_success "✅ Frontend accessible"
    else
        log_warning "⚠️ Frontend non accessible"
    fi
    
    if curl -s http://localhost:3000/api/health > /dev/null; then
        log_success "✅ Backend API accessible"
    else
        log_warning "⚠️ Backend API non accessible"
    fi
}

# Backup des données
backup_data() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    
    log_info "💾 Sauvegarde des données..."
    mkdir -p "$backup_dir"
    
    # Sauvegarder les logs
    if [ -d "logs" ]; then
        cp -r logs "$backup_dir/"
        log_info "📋 Logs sauvegardés"
    fi
    
    # Sauvegarder les volumes Docker
    docker run --rm -v sedi-tablette-logs:/data -v "$(pwd)/$backup_dir":/backup alpine tar czf /backup/logs.tar.gz -C /data .
    
    log_success "✅ Sauvegarde terminée: $backup_dir"
}

# Menu d'aide
show_help() {
    echo "SEDI Tablette v$VERSION - Script de déploiement"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  prod      Déployer en production"
    echo "  dev       Déployer en développement"
    echo "  stop      Arrêter tous les services"
    echo "  logs      Afficher les logs [service]"
    echo "  update    Mettre à jour les images"
    echo "  status    Afficher le statut des services"
    echo "  backup    Sauvegarder les données"
    echo "  help      Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 prod                 # Déploiement production"
    echo "  $0 dev                  # Déploiement développement"
    echo "  $0 logs backend         # Logs du backend uniquement"
    echo "  $0 stop                 # Arrêter tous les services"
}

# Script principal
main() {
    local command=${1:-"help"}
    
    echo "🏭 SEDI Tablette v$VERSION - Déploiement"
    echo "========================================"
    echo ""
    
    check_docker
    
    case $command in
        "prod")
            deploy_prod
            ;;
        "dev")
            deploy_dev
            ;;
        "stop")
            stop_services
            ;;
        "logs")
            show_logs "$@"
            ;;
        "update")
            update_images
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_data
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Exécuter le script
main "$@"




