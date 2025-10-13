#!/bin/bash

# Script de déploiement multi-environnements pour SEDI Tablette
# Usage: ./deploy-env.sh [environment] [options]

set -euo pipefail

# Configuration
SCRIPT_NAME="$(basename "$0")"
SCRIPT_VERSION="1.0.0"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

# Configuration des environnements
declare -A ENV_CONFIG
ENV_CONFIG[staging]="192.168.1.25:722:staging:/opt/sedi-tablette-staging:docker-compose.staging.yml:env.staging"
ENV_CONFIG[production]="192.168.1.26:722:maintenance:/opt/sedi-tablette:docker-compose.prod.yml:env.production"

# Configuration par défaut
ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}
VERBOSE=${3:-false}
SERVER_IP=""
SERVER_PORT=""
SERVER_USER=""
DEPLOY_PATH=""
COMPOSE_FILE=""
ENV_FILE=""

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${BLUE}[$timestamp] INFO: $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}[$timestamp] SUCCESS: $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}[$timestamp] WARNING: $message${NC}" ;;
        "ERROR") echo -e "${RED}[$timestamp] ERROR: $message${NC}" ;;
        "DEBUG") [[ "$VERBOSE" == "--verbose" ]] && echo -e "\033[36m[$timestamp] DEBUG: $message${NC}" ;;
    esac
}

# Fonction d'aide
show_help() {
    cat << EOF
Script de déploiement multi-environnements SEDI Tablette v$SCRIPT_VERSION

USAGE:
    $SCRIPT_NAME [ENVIRONMENT] [OPTIONS]

ENVIRONNEMENTS:
    staging     Déploiement sur environnement de staging
    production  Déploiement sur environnement de production

OPTIONS:
    --dry-run   Simulation du déploiement sans exécution
    --verbose   Mode verbeux avec logs détaillés
    --help      Affiche cette aide

EXAMPLES:
    $SCRIPT_NAME staging
    $SCRIPT_NAME production --dry-run
    $SCRIPT_NAME staging --verbose

EOF
}

# Fonction de configuration de l'environnement
configure_environment() {
    log "INFO" "Configuration de l'environnement: $ENVIRONMENT"
    
    if [[ ! ${ENV_CONFIG[$ENVIRONMENT]+_} ]]; then
        log "ERROR" "Environnement '$ENVIRONMENT' non supporté"
        log "INFO" "Environnements disponibles: ${!ENV_CONFIG[*]}"
        exit 1
    fi
    
    IFS=':' read -r SERVER_IP SERVER_PORT SERVER_USER DEPLOY_PATH COMPOSE_FILE ENV_FILE <<< "${ENV_CONFIG[$ENVIRONMENT]}"
    
    log "INFO" "Serveur: $SERVER_IP:$SERVER_PORT"
    log "INFO" "Utilisateur: $SERVER_USER"
    log "INFO" "Chemin de déploiement: $DEPLOY_PATH"
    log "INFO" "Fichier Compose: $COMPOSE_FILE"
    log "INFO" "Fichier d'environnement: $ENV_FILE"
}

# Fonction pour exécuter des commandes sur le serveur distant
execute_remote() {
    local command="$1"
    local description="${2:-Exécution de commande}"
    
    log "DEBUG" "Commande distante: $command"
    
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log "INFO" "[DRY-RUN] $description"
        return 0
    fi
    
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "$command"; then
        log "SUCCESS" "$description"
        return 0
    else
        log "ERROR" "Échec: $description"
        return 1
    fi
}

# Fonction pour copier des fichiers vers le serveur
copy_to_server() {
    local local_path="$1"
    local remote_path="$2"
    local description="${3:-Copie de fichiers}"
    
    log "DEBUG" "Copie: $local_path -> $remote_path"
    
    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        log "INFO" "[DRY-RUN] $description"
        return 0
    fi
    
    if scp -o StrictHostKeyChecking=no -o ConnectTimeout=30 -P "$SERVER_PORT" -r "$local_path" "$SERVER_USER@$SERVER_IP:$remote_path"; then
        log "SUCCESS" "$description"
        return 0
    else
        log "ERROR" "Échec: $description"
        return 1
    fi
}

# Fonction de validation des prérequis
validate_prerequisites() {
    log "INFO" "Validation des prérequis..."
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        log "ERROR" "Docker n'est pas installé"
        exit 1
    fi
    
    # Vérifier Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log "ERROR" "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Vérifier SSH
    if ! command -v ssh &> /dev/null; then
        log "ERROR" "SSH n'est pas installé"
        exit 1
    fi
    
    # Vérifier curl
    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl n'est pas installé"
        exit 1
    fi
    
    log "SUCCESS" "Tous les prérequis sont satisfaits"
}

# Fonction de déploiement
deploy() {
    local deployment_start_time=$(date +%s)
    
    log "INFO" "Début du déploiement SEDI Tablette v$SCRIPT_VERSION"
    log "INFO" "Environnement: $ENVIRONMENT"
    log "INFO" "Mode dry-run: $DRY_RUN"
    log "INFO" "Mode verbose: $VERBOSE"
    
    # Validation des prérequis
    validate_prerequisites
    
    # Configuration de l'environnement
    configure_environment
    
    # Test de connectivité SSH
    log "INFO" "Test de connectivité SSH..."
    if ! execute_remote "echo 'Connexion SSH réussie'" "Test de connectivité SSH"; then
        log "ERROR" "Impossible de se connecter au serveur"
        exit 1
    fi
    
    # Construction des images Docker avec le bon fichier Compose
    log "INFO" "Construction des images Docker..."
    local build_start_time=$(date +%s)
    if ! docker-compose -f "docker/$COMPOSE_FILE" build --no-cache --parallel; then
        log "ERROR" "Échec de la construction des images Docker"
        exit 1
    fi
    local build_duration=$(($(date +%s) - build_start_time))
    log "SUCCESS" "Images Docker construites en ${build_duration}s"
    
    # Sauvegarde des images
    log "INFO" "Sauvegarde des images..."
    docker save docker-sedi-backend:latest | gzip > "sedi-backend.tar.gz"
    docker save docker-sedi-frontend:latest | gzip > "sedi-frontend.tar.gz"
    log "SUCCESS" "Images sauvegardées"
    
    # Copie des images vers le serveur
    log "INFO" "Copie des images vers le serveur..."
    copy_to_server "sedi-backend.tar.gz" "$DEPLOY_PATH/" "Copie image backend"
    copy_to_server "sedi-frontend.tar.gz" "$DEPLOY_PATH/" "Copie image frontend"
    
    # Copie des fichiers de configuration
    log "INFO" "Copie des fichiers de configuration..."
    copy_to_server "docker/" "$DEPLOY_PATH/" "Copie configuration Docker"
    
    # Déploiement sur le serveur
    log "INFO" "Déploiement sur le serveur..."
    local deploy_start_time=$(date +%s)
    
    execute_remote "cd $DEPLOY_PATH && docker load < sedi-backend.tar.gz" "Chargement image backend"
    execute_remote "cd $DEPLOY_PATH && docker load < sedi-frontend.tar.gz" "Chargement image frontend"
    execute_remote "cd $DEPLOY_PATH && docker-compose -f $COMPOSE_FILE down || true" "Arrêt des services existants"
    execute_remote "cd $DEPLOY_PATH && docker-compose -f $COMPOSE_FILE up -d" "Démarrage des nouveaux services"
    
    local deploy_duration=$(($(date +%s) - deploy_start_time))
    log "SUCCESS" "Déploiement terminé en ${deploy_duration}s"
    
    # Attente du démarrage
    log "INFO" "Attente du démarrage des services..."
    sleep 30
    
    # Vérification de l'état des services
    log "INFO" "Vérification de l'état des services..."
    execute_remote "cd $DEPLOY_PATH && docker-compose -f $COMPOSE_FILE ps" "État des services"
    
    # Tests de connectivité
    log "INFO" "Tests de connectivité post-déploiement..."
    if curl -f -s --connect-timeout 10 "http://$SERVER_IP:3000/api/health" > /dev/null; then
        log "SUCCESS" "Backend accessible sur http://$SERVER_IP:3000"
    else
        log "ERROR" "Backend non accessible"
        exit 1
    fi
    
    if curl -f -s --connect-timeout 10 "http://$SERVER_IP/" > /dev/null; then
        log "SUCCESS" "Frontend accessible sur http://$SERVER_IP"
    else
        log "ERROR" "Frontend non accessible"
        exit 1
    fi
    
    # Nettoyage
    log "INFO" "Nettoyage des fichiers temporaires..."
    rm -f sedi-backend.tar.gz sedi-frontend.tar.gz
    
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
        execute_remote "cd $DEPLOY_PATH && rm -f sedi-backend.tar.gz sedi-frontend.tar.gz" "Nettoyage distant"
    fi
    
    # Résumé du déploiement
    local total_duration=$(($(date +%s) - deployment_start_time))
    log "SUCCESS" "Déploiement terminé avec succès !"
    echo ""
    echo "Résumé du déploiement:"
    echo "   • Environnement: $ENVIRONMENT"
    echo "   • Serveur: $SERVER_IP:$SERVER_PORT"
    echo "   • Durée totale: ${total_duration}s"
    echo "   • Construction: ${build_duration}s"
    echo "   • Déploiement: ${deploy_duration}s"
    echo "   • Backend API: http://$SERVER_IP:3000"
    echo "   • Frontend: http://$SERVER_IP"
    echo "   • Interface Admin: http://$SERVER_IP:3000/api/admin"
    echo "   • Timestamp: $TIMESTAMP"
    echo ""
}

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --verbose)
            VERBOSE="--verbose"
            shift
            ;;
        staging|production)
            ENVIRONMENT="$1"
            shift
            ;;
        *)
            log "ERROR" "Argument inconnu: $1"
            show_help
            exit 1
            ;;
    esac
done

# Exécution du déploiement
deploy
