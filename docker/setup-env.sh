#!/bin/bash

# Script de configuration des environnements SEDI Tablette
# Usage: ./setup-env.sh [environment] [--init] [--update] [--validate]

set -euo pipefail

# Configuration
SCRIPT_NAME="$(basename "$0")"
SCRIPT_VERSION="1.0.0"

# Configuration des environnements
declare -A ENV_CONFIG
ENV_CONFIG[staging]="192.168.1.25:722:staging:/opt/sedi-tablette-staging"
ENV_CONFIG[production]="192.168.1.26:722:maintenance:/opt/sedi-tablette"

# Configuration par défaut
ENVIRONMENT=${1:-production}
INIT_MODE=false
UPDATE_MODE=false
VALIDATE_MODE=false
SERVER_IP=""
SERVER_PORT=""
SERVER_USER=""
DEPLOY_PATH=""

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
    esac
}

# Fonction d'aide
show_help() {
    cat << EOF
Script de configuration des environnements SEDI Tablette v$SCRIPT_VERSION

USAGE:
    $SCRIPT_NAME [ENVIRONMENT] [OPTIONS]

ENVIRONNEMENTS:
    staging     Configuration environnement de staging
    production  Configuration environnement de production

OPTIONS:
    --init      Initialiser l'environnement (première fois)
    --update    Mettre à jour la configuration
    --validate  Valider la configuration existante
    --help      Affiche cette aide

EXAMPLES:
    $SCRIPT_NAME staging --init
    $SCRIPT_NAME production --update
    $SCRIPT_NAME staging --validate

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
    
    IFS=':' read -r SERVER_IP SERVER_PORT SERVER_USER DEPLOY_PATH <<< "${ENV_CONFIG[$ENVIRONMENT]}"
    
    log "INFO" "Serveur: $SERVER_IP:$SERVER_PORT"
    log "INFO" "Utilisateur: $SERVER_USER"
    log "INFO" "Chemin de déploiement: $DEPLOY_PATH"
}

# Fonction pour exécuter des commandes sur le serveur distant
execute_remote() {
    local command="$1"
    local description="${2:-Exécution de commande}"
    
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
    
    if scp -o StrictHostKeyChecking=no -o ConnectTimeout=30 -P "$SERVER_PORT" -r "$local_path" "$SERVER_USER@$SERVER_IP:$remote_path"; then
        log "SUCCESS" "$description"
        return 0
    else
        log "ERROR" "Échec: $description"
        return 1
    fi
}

# Fonction d'initialisation d'environnement
init_environment() {
    log "INFO" "Initialisation de l'environnement $ENVIRONMENT..."
    
    # Test de connectivité SSH
    log "INFO" "Test de connectivité SSH..."
    if ! execute_remote "echo 'Connexion SSH réussie'" "Test de connectivité SSH"; then
        log "ERROR" "Impossible de se connecter au serveur"
        exit 1
    fi
    
    # Créer le répertoire de déploiement
    log "INFO" "Création du répertoire de déploiement..."
    execute_remote "mkdir -p $DEPLOY_PATH" "Création répertoire déploiement"
    
    # Créer le répertoire de sauvegardes
    log "INFO" "Création du répertoire de sauvegardes..."
    execute_remote "mkdir -p $DEPLOY_PATH/backups" "Création répertoire sauvegardes"
    
    # Créer le répertoire de logs
    log "INFO" "Création du répertoire de logs..."
    execute_remote "mkdir -p $DEPLOY_PATH/logs" "Création répertoire logs"
    
    # Copier les fichiers de configuration
    log "INFO" "Copie des fichiers de configuration..."
    copy_to_server "docker/" "$DEPLOY_PATH/" "Copie configuration Docker"
    
    # Copier les fichiers d'environnement
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        copy_to_server "docker/env.staging" "$DEPLOY_PATH/.env" "Copie configuration staging"
    else
        copy_to_server "docker/env.production" "$DEPLOY_PATH/.env" "Copie configuration production"
    fi
    
    # Configurer les permissions
    log "INFO" "Configuration des permissions..."
    execute_remote "chmod +x $DEPLOY_PATH/*.sh" "Configuration permissions scripts"
    execute_remote "chown -R $SERVER_USER:$SERVER_USER $DEPLOY_PATH" "Configuration propriétaire"
    
    # Créer les volumes Docker
    log "INFO" "Création des volumes Docker..."
    execute_remote "docker volume create sedi-logs-$ENVIRONMENT" "Création volume logs"
    execute_remote "docker volume create sedi-data-$ENVIRONMENT" "Création volume données"
    
    log "SUCCESS" "Environnement $ENVIRONMENT initialisé avec succès"
}

# Fonction de mise à jour de configuration
update_environment() {
    log "INFO" "Mise à jour de la configuration $ENVIRONMENT..."
    
    # Test de connectivité SSH
    log "INFO" "Test de connectivité SSH..."
    if ! execute_remote "echo 'Connexion SSH réussie'" "Test de connectivité SSH"; then
        log "ERROR" "Impossible de se connecter au serveur"
        exit 1
    fi
    
    # Sauvegarder l'ancienne configuration
    log "INFO" "Sauvegarde de l'ancienne configuration..."
    execute_remote "cd $DEPLOY_PATH && tar czf backups/config-backup-$(date +'%Y%m%d-%H%M%S').tar.gz *.yml *.conf .env" "Sauvegarde configuration"
    
    # Copier les nouveaux fichiers de configuration
    log "INFO" "Copie des nouveaux fichiers de configuration..."
    copy_to_server "docker/" "$DEPLOY_PATH/" "Copie configuration Docker"
    
    # Copier les fichiers d'environnement
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        copy_to_server "docker/env.staging" "$DEPLOY_PATH/.env" "Copie configuration staging"
    else
        copy_to_server "docker/env.production" "$DEPLOY_PATH/.env" "Copie configuration production"
    fi
    
    # Configurer les permissions
    log "INFO" "Configuration des permissions..."
    execute_remote "chmod +x $DEPLOY_PATH/*.sh" "Configuration permissions scripts"
    execute_remote "chown -R $SERVER_USER:$SERVER_USER $DEPLOY_PATH" "Configuration propriétaire"
    
    log "SUCCESS" "Configuration $ENVIRONMENT mise à jour avec succès"
}

# Fonction de validation de configuration
validate_environment() {
    log "INFO" "Validation de la configuration $ENVIRONMENT..."
    
    # Test de connectivité SSH
    log "INFO" "Test de connectivité SSH..."
    if ! execute_remote "echo 'Connexion SSH réussie'" "Test de connectivité SSH"; then
        log "ERROR" "Impossible de se connecter au serveur"
        exit 1
    fi
    
    # Vérifier l'existence des répertoires
    log "INFO" "Vérification des répertoires..."
    execute_remote "test -d $DEPLOY_PATH" "Répertoire déploiement"
    execute_remote "test -d $DEPLOY_PATH/backups" "Répertoire sauvegardes"
    execute_remote "test -d $DEPLOY_PATH/logs" "Répertoire logs"
    
    # Vérifier l'existence des fichiers de configuration
    log "INFO" "Vérification des fichiers de configuration..."
    execute_remote "test -f $DEPLOY_PATH/docker-compose.yml" "Fichier docker-compose"
    execute_remote "test -f $DEPLOY_PATH/.env" "Fichier environnement"
    
    # Vérifier les permissions
    log "INFO" "Vérification des permissions..."
    execute_remote "test -x $DEPLOY_PATH/deploy-ci-cd.sh" "Permissions script déploiement"
    
    # Vérifier les volumes Docker
    log "INFO" "Vérification des volumes Docker..."
    execute_remote "docker volume ls | grep sedi-logs-$ENVIRONMENT" "Volume logs"
    execute_remote "docker volume ls | grep sedi-data-$ENVIRONMENT" "Volume données"
    
    # Vérifier Docker et Docker Compose
    log "INFO" "Vérification de Docker..."
    execute_remote "docker --version" "Version Docker"
    execute_remote "docker-compose --version" "Version Docker Compose"
    
    log "SUCCESS" "Configuration $ENVIRONMENT validée avec succès"
}

# Fonction principale
main() {
    # Traitement des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --init)
                INIT_MODE=true
                shift
                ;;
            --update)
                UPDATE_MODE=true
                shift
                ;;
            --validate)
                VALIDATE_MODE=true
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
    
    # Mode par défaut si aucun argument
    if [[ "$INIT_MODE" == false && "$UPDATE_MODE" == false && "$VALIDATE_MODE" == false ]]; then
        VALIDATE_MODE=true
    fi
    
    # Configuration de l'environnement
    configure_environment
    
    # Exécution des modes demandés
    if [[ "$INIT_MODE" == true ]]; then
        init_environment
    fi
    
    if [[ "$UPDATE_MODE" == true ]]; then
        update_environment
    fi
    
    if [[ "$VALIDATE_MODE" == true ]]; then
        validate_environment
    fi
}

# Exécution
main "$@"
