#!/bin/bash

# Script de déploiement CI/CD professionnel pour SEDI Tablette
# Usage: ./deploy-ci-cd.sh [staging|production] [--dry-run] [--verbose]

set -euo pipefail  # Mode strict : erreur sur échec, variables non définies, erreurs dans les pipes

# ========================================
# CONFIGURATION
# ========================================
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_VERSION="2.0.0"
readonly TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

# Configuration des environnements
declare -A ENV_CONFIG
ENV_CONFIG[staging]="192.168.1.25:722:staging"
ENV_CONFIG[production]="192.168.1.26:722:maintenance"

# Configuration par défaut
ENVIRONMENT=${1:-production}
DRY_RUN=${2:-false}
VERBOSE=${3:-false}
SERVER_IP=""
SERVER_PORT=""
SERVER_USER=""

# ========================================
# FONCTIONS UTILITAIRES
# ========================================

# Fonction de logging avec niveaux
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "\033[34m[$timestamp] INFO: $message\033[0m" ;;
        "SUCCESS") echo -e "\033[32m[$timestamp] SUCCESS: $message\033[0m" ;;
        "WARNING") echo -e "\033[33m[$timestamp] WARNING: $message\033[0m" ;;
        "ERROR") echo -e "\033[31m[$timestamp] ERROR: $message\033[0m" ;;
        "DEBUG") [[ "$VERBOSE" == "--verbose" ]] && echo -e "\033[36m[$timestamp] DEBUG: $message\033[0m" ;;
    esac
}

# Fonction d'aide
show_help() {
    cat << EOF
SEDI Tablette CI/CD Deploy Script v$SCRIPT_VERSION

USAGE:
    $SCRIPT_NAME [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    staging     Déploiement sur environnement de staging
    production  Déploiement sur environnement de production

OPTIONS:
    --dry-run   Simulation du déploiement sans exécution
    --verbose   Mode verbeux avec logs détaillés
    --help      Affiche cette aide

EXAMPLES:
    $SCRIPT_NAME production
    $SCRIPT_NAME staging --dry-run
    $SCRIPT_NAME production --verbose

EOF
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

# Fonction de configuration de l'environnement
configure_environment() {
    log "INFO" "Configuration de l'environnement: $ENVIRONMENT"
    
    if [[ ! ${ENV_CONFIG[$ENVIRONMENT]+_} ]]; then
        log "ERROR" "Environnement '$ENVIRONMENT' non supporté"
        log "INFO" "Environnements disponibles: ${!ENV_CONFIG[*]}"
        exit 1
    fi
    
    IFS=':' read -r SERVER_IP SERVER_PORT SERVER_USER <<< "${ENV_CONFIG[$ENVIRONMENT]}"
    
    log "INFO" "Serveur: $SERVER_IP:$SERVER_PORT"
    log "INFO" "Utilisateur: $SERVER_USER"
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

# Fonction de test de connectivité
test_connectivity() {
    local url="$1"
    local description="$2"
    local max_attempts=5
    local attempt=1
    
    log "INFO" "Test de connectivité: $description"
    
    while [[ $attempt -le $max_attempts ]]; do
        log "DEBUG" "Tentative $attempt/$max_attempts: $url"
        
        if curl -f -s --connect-timeout 10 --max-time 30 "$url" > /dev/null; then
            log "SUCCESS" "$description accessible"
            return 0
        fi
        
        log "WARNING" "Tentative $attempt échouée, attente 10s..."
        sleep 10
        ((attempt++))
    done
    
    log "ERROR" "$description non accessible après $max_attempts tentatives"
    return 1
}

# Fonction de rollback
rollback() {
    log "WARNING" "Démarrage du rollback..."
    
    execute_remote "cd /opt/sedi-tablette && docker-compose down" "Arrêt des services"
    execute_remote "cd /opt/sedi-tablette && docker-compose up -d" "Redémarrage des services"
    
    log "INFO" "Rollback terminé"
}

# Fonction de nettoyage
cleanup() {
    log "INFO" "Nettoyage des fichiers temporaires..."
    
    rm -f sedi-backend.tar.gz sedi-frontend.tar.gz
    
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
        execute_remote "cd /opt/sedi-tablette && rm -f sedi-backend.tar.gz sedi-frontend.tar.gz" "Nettoyage distant"
    fi
    
    log "SUCCESS" "Nettoyage terminé"
}

# ========================================
# FONCTION PRINCIPALE DE DÉPLOIEMENT
# ========================================
deploy() {
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
    
    # Construction des images Docker
    log "INFO" "Construction des images Docker..."
    if ! docker-compose -f docker/docker-compose.yml build --no-cache --parallel; then
        log "ERROR" "Échec de la construction des images Docker"
        exit 1
    fi
    log "SUCCESS" "Images Docker construites"
    
    # Sauvegarde des images
    log "INFO" "Sauvegarde des images..."
    docker save docker-sedi-backend:latest | gzip > "sedi-backend.tar.gz"
    docker save docker-sedi-frontend:latest | gzip > "sedi-frontend.tar.gz"
    log "SUCCESS" "Images sauvegardées"
    
    # Copie des images vers le serveur
    log "INFO" "Copie des images vers le serveur..."
    copy_to_server "sedi-backend.tar.gz" "/opt/sedi-tablette/" "Copie image backend"
    copy_to_server "sedi-frontend.tar.gz" "/opt/sedi-tablette/" "Copie image frontend"
    
    # Copie des fichiers de configuration
    log "INFO" "Copie des fichiers de configuration..."
    copy_to_server "docker/" "/opt/sedi-tablette/" "Copie configuration Docker"
    
    # Déploiement sur le serveur
    log "INFO" "Déploiement sur le serveur..."
    execute_remote "cd /opt/sedi-tablette && docker load < sedi-backend.tar.gz" "Chargement image backend"
    execute_remote "cd /opt/sedi-tablette && docker load < sedi-frontend.tar.gz" "Chargement image frontend"
    execute_remote "cd /opt/sedi-tablette && docker-compose down || true" "Arrêt des services existants"
    execute_remote "cd /opt/sedi-tablette && docker-compose up -d" "Démarrage des nouveaux services"
    
    # Attente du démarrage
    log "INFO" "Attente du démarrage des services..."
    sleep 30
    
    # Vérification de l'état des services
    log "INFO" "Vérification de l'état des services..."
    execute_remote "cd /opt/sedi-tablette && docker-compose ps" "État des services"
    
    # Tests de connectivité
    log "INFO" "Tests de connectivité post-déploiement..."
    if test_connectivity "http://$SERVER_IP:3000/api/health" "Backend API"; then
        log "SUCCESS" "Backend accessible sur http://$SERVER_IP:3000"
    else
        log "ERROR" "Backend non accessible"
        rollback
        exit 1
    fi
    
    if test_connectivity "http://$SERVER_IP/" "Frontend"; then
        log "SUCCESS" "Frontend accessible sur http://$SERVER_IP"
    else
        log "ERROR" "Frontend non accessible"
        rollback
        exit 1
    fi
    
    # Nettoyage
    cleanup
    
    # Résumé du déploiement
    log "SUCCESS" "Déploiement terminé avec succès !"
    echo ""
    echo "Résumé du déploiement:"
    echo "   • Environnement: $ENVIRONMENT"
    echo "   • Serveur: $SERVER_IP:$SERVER_PORT"
    echo "   • Backend API: http://$SERVER_IP:3000"
    echo "   • Frontend: http://$SERVER_IP"
    echo "   • Interface Admin: http://$SERVER_IP:3000/api/admin"
    echo "   • Timestamp: $TIMESTAMP"
    echo ""
}

# ========================================
# GESTION DES ARGUMENTS ET EXÉCUTION
# ========================================

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

# Gestion des signaux pour le nettoyage
trap cleanup EXIT
trap 'log "WARNING" "Interruption détectée, nettoyage en cours..."; cleanup; exit 130' INT TERM

# Exécution du déploiement
deploy
