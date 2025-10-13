#!/bin/bash

# Script de déploiement SEDI Tablette Docker v2.2
# Usage: ./deploy.sh [dev|prod] [--build] [--logs]

set -e

# Configuration
PROJECT_NAME="sedi-tablette"
COMPOSE_FILE="docker-compose.yml"
DEV_COMPOSE_FILE="docker-compose.dev.yml"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Fonction d'aide
show_help() {
    echo "Usage: $0 [ENVIRONMENT] [OPTIONS]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  dev     Déploiement en mode développement"
    echo "  prod    Déploiement en mode production (défaut)"
    echo ""
    echo "OPTIONS:"
    echo "  --build     Force la reconstruction des images"
    echo "  --logs      Affiche les logs après le déploiement"
    echo "  --stop      Arrête les services"
    echo "  --clean     Nettoie les images et volumes inutilisés"
    echo "  --help      Affiche cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 prod --build"
    echo "  $0 dev --logs"
    echo "  $0 --stop"
}

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    log_success "Prérequis OK"
}

# Nettoyage
clean_docker() {
    log_info "Nettoyage Docker..."
    docker system prune -f
    docker volume prune -f
    log_success "Nettoyage terminé"
}

# Arrêt des services
stop_services() {
    log_info "Arrêt des services..."
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f $DEV_COMPOSE_FILE down
    else
        docker-compose -f $COMPOSE_FILE down
    fi
    
    log_success "Services arrêtés"
}

# Déploiement
deploy() {
    local compose_file=$1
    local build_flag=$2
    
    log_info "Déploiement de SEDI Tablette ($ENVIRONMENT)..."
    
    # Création des répertoires de logs
    mkdir -p logs/nginx
    
    if [ "$build_flag" = "--build" ]; then
        log_info "Reconstruction des images..."
        docker-compose -f $compose_file build --no-cache
    fi
    
    # Démarrage des services
    log_info "Démarrage des services..."
    docker-compose -f $compose_file up -d
    
    # Attendre que les services soient prêts
    log_info "Attente de la disponibilité des services..."
    sleep 10
    
    # Vérification de la santé des services
    check_health
    
    log_success "Déploiement terminé !"
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        log_info "Interface disponible sur: http://localhost:8080"
        log_info "API disponible sur: http://localhost:3000"
    else
        log_info "Application disponible sur: http://localhost:8080"
    fi
}

# Vérification de la santé des services
check_health() {
    log_info "Vérification de la santé des services..."
    
    # Test de l'API
    if curl -f -s http://localhost:3000/api/health > /dev/null; then
        log_success "Backend: OK"
    else
        log_warning "Backend: Non disponible"
    fi
    
    # Test du frontend
    if curl -f -s http://localhost:8080/health > /dev/null; then
        log_success "Frontend: OK"
    else
        log_warning "Frontend: Non disponible"
    fi
}

# Affichage des logs
show_logs() {
    if [ "$ENVIRONMENT" = "dev" ]; then
        docker-compose -f $DEV_COMPOSE_FILE logs -f
    else
        docker-compose -f $COMPOSE_FILE logs -f
    fi
}

# Analyse des arguments
ENVIRONMENT="prod"
BUILD_FLAG=""
SHOW_LOGS=false
STOP_ONLY=false
CLEAN_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|prod)
            ENVIRONMENT="$1"
            shift
            ;;
        --build)
            BUILD_FLAG="--build"
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --stop)
            STOP_ONLY=true
            shift
            ;;
        --clean)
            CLEAN_ONLY=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Exécution principale
main() {
    log_info "=== Déploiement SEDI Tablette v2.2 ==="
    
    check_prerequisites
    
    if [ "$CLEAN_ONLY" = true ]; then
        clean_docker
        exit 0
    fi
    
    if [ "$STOP_ONLY" = true ]; then
        stop_services
        exit 0
    fi
    
    # Sélection du fichier de composition
    if [ "$ENVIRONMENT" = "dev" ]; then
        COMPOSE_FILE=$DEV_COMPOSE_FILE
        log_info "Mode: Développement"
    else
        log_info "Mode: Production"
    fi
    
    # Déploiement
    deploy $COMPOSE_FILE $BUILD_FLAG
    
    # Affichage des logs si demandé
    if [ "$SHOW_LOGS" = true ]; then
        log_info "Affichage des logs (Ctrl+C pour quitter)..."
        show_logs
    fi
}

# Point d'entrée
main "$@"













