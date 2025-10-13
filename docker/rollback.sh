#!/bin/bash

# Script de rollback pour SEDI Tablette
# Usage: ./rollback.sh [backup-name] [--list] [--latest]

set -euo pipefail

# Configuration
SCRIPT_NAME="$(basename "$0")"
SCRIPT_VERSION="1.0.0"
BACKUP_DIR="/opt/sedi-backups"
SERVER_IP=""
SERVER_PORT=""
SERVER_USER=""

# Configuration des environnements
declare -A ENV_CONFIG
ENV_CONFIG[staging]="192.168.1.25:722:staging"
ENV_CONFIG[production]="192.168.1.26:722:maintenance"

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
Script de rollback pour SEDI Tablette v$SCRIPT_VERSION

USAGE:
    $SCRIPT_NAME [BACKUP_NAME] [OPTIONS]

ARGUMENTS:
    BACKUP_NAME    Nom de la sauvegarde à restaurer

OPTIONS:
    --list         Lister toutes les sauvegardes disponibles
    --latest       Restaurer la dernière sauvegarde
    --environment  Spécifier l'environnement (staging|production)
    --help         Affiche cette aide

EXAMPLES:
    $SCRIPT_NAME --list
    $SCRIPT_NAME --latest
    $SCRIPT_NAME backup-20231201-143022
    $SCRIPT_NAME backup-20231201-143022 --environment production

EOF
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

# Fonction pour lister les sauvegardes
list_backups() {
    log "INFO" "Liste des sauvegardes disponibles sur $SERVER_IP..."
    
    execute_remote "ls -la $BACKUP_DIR | grep '^d.*backup-' | awk '{print \$9}' | sort -r" "Liste des sauvegardes"
    
    echo ""
    log "INFO" "Utilisation: $SCRIPT_NAME [nom-de-sauvegarde]"
}

# Fonction pour obtenir la dernière sauvegarde
get_latest_backup() {
    local latest_backup=$(execute_remote "ls -t $BACKUP_DIR | grep '^backup-' | head -1" "Dernière sauvegarde" 2>/dev/null || echo "")
    
    if [[ -z "$latest_backup" ]]; then
        log "ERROR" "Aucune sauvegarde trouvée"
        return 1
    fi
    
    echo "$latest_backup"
}

# Fonction de rollback
rollback_to_backup() {
    local backup_name="$1"
    
    if [[ -z "$backup_name" ]]; then
        log "ERROR" "Nom de sauvegarde non spécifié"
        return 1
    fi
    
    log "WARNING" "Démarrage du rollback vers: $backup_name"
    
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Vérifier que la sauvegarde existe
    if ! execute_remote "test -d $backup_path" "Vérification existence sauvegarde"; then
        log "ERROR" "Sauvegarde non trouvée: $backup_name"
        return 1
    fi
    
    # Arrêter les services actuels
    log "INFO" "Arrêt des services actuels..."
    execute_remote "cd /opt/sedi-tablette && docker-compose down" "Arrêt des services"
    
    # Charger les images de sauvegarde
    log "INFO" "Chargement des images de sauvegarde..."
    execute_remote "cd /opt/sedi-tablette && docker load < $backup_path-backend.tar.gz" "Chargement image backend"
    execute_remote "cd /opt/sedi-tablette && docker load < $backup_path-frontend.tar.gz" "Chargement image frontend"
    
    # Restaurer la configuration
    log "INFO" "Restauration de la configuration..."
    execute_remote "cd /opt/sedi-tablette && tar xzf $backup_path-config.tar.gz" "Restauration configuration"
    
    # Redémarrer les services
    log "INFO" "Redémarrage des services..."
    execute_remote "cd /opt/sedi-tablette && docker-compose up -d" "Redémarrage des services"
    
    # Attendre le démarrage
    log "INFO" "Attente du démarrage des services..."
    sleep 30
    
    # Vérifier que le rollback a réussi
    log "INFO" "Vérification du rollback..."
    if curl -f -s --connect-timeout 10 "http://$SERVER_IP:3000/api/health" > /dev/null; then
        log "SUCCESS" "Rollback réussi vers: $backup_name"
        return 0
    else
        log "ERROR" "Rollback échoué - services non accessibles"
        return 1
    fi
}

# Fonction de configuration de l'environnement
configure_environment() {
    local environment="${1:-production}"
    
    if [[ ! ${ENV_CONFIG[$environment]+_} ]]; then
        log "ERROR" "Environnement '$environment' non supporté"
        log "INFO" "Environnements disponibles: ${!ENV_CONFIG[*]}"
        exit 1
    fi
    
    IFS=':' read -r SERVER_IP SERVER_PORT SERVER_USER <<< "${ENV_CONFIG[$environment]}"
    
    log "INFO" "Environnement: $environment"
    log "INFO" "Serveur: $SERVER_IP:$SERVER_PORT"
    log "INFO" "Utilisateur: $SERVER_USER"
}

# Fonction principale
main() {
    local backup_name=""
    local list_mode=false
    local latest_mode=false
    local environment="production"
    
    # Traitement des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --list)
                list_mode=true
                shift
                ;;
            --latest)
                latest_mode=true
                shift
                ;;
            --environment)
                environment="$2"
                shift 2
                ;;
            backup-*)
                backup_name="$1"
                shift
                ;;
            *)
                log "ERROR" "Argument inconnu: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Configuration de l'environnement
    configure_environment "$environment"
    
    # Test de connectivité SSH
    log "INFO" "Test de connectivité SSH..."
    if ! execute_remote "echo 'Connexion SSH réussie'" "Test de connectivité SSH"; then
        log "ERROR" "Impossible de se connecter au serveur"
        exit 1
    fi
    
    # Mode liste
    if [[ "$list_mode" == true ]]; then
        list_backups
        exit 0
    fi
    
    # Mode dernière sauvegarde
    if [[ "$latest_mode" == true ]]; then
        backup_name=$(get_latest_backup)
        if [[ -z "$backup_name" ]]; then
            exit 1
        fi
        log "INFO" "Utilisation de la dernière sauvegarde: $backup_name"
    fi
    
    # Vérifier qu'un nom de sauvegarde est spécifié
    if [[ -z "$backup_name" ]]; then
        log "ERROR" "Nom de sauvegarde requis"
        show_help
        exit 1
    fi
    
    # Confirmation avant rollback
    echo ""
    log "WARNING" "ATTENTION: Cette opération va restaurer l'état précédent de l'application"
    log "WARNING" "Serveur: $SERVER_IP"
    log "WARNING" "Sauvegarde: $backup_name"
    echo ""
    read -p "Êtes-vous sûr de vouloir continuer ? (oui/non): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Oo][Uu][Ii]$ ]]; then
        log "INFO" "Rollback annulé par l'utilisateur"
        exit 0
    fi
    
    # Exécuter le rollback
    if rollback_to_backup "$backup_name"; then
        log "SUCCESS" "Rollback terminé avec succès !"
        echo ""
        echo "Résumé du rollback:"
        echo "   • Environnement: $environment"
        echo "   • Serveur: $SERVER_IP:$SERVER_PORT"
        echo "   • Sauvegarde: $backup_name"
        echo "   • Backend API: http://$SERVER_IP:3000"
        echo "   • Frontend: http://$SERVER_IP"
        echo "   • Interface Admin: http://$SERVER_IP:3000/api/admin"
        echo ""
    else
        log "ERROR" "Rollback échoué"
        exit 1
    fi
}

# Exécution
main "$@"
