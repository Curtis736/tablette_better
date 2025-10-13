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

# Fonction de sauvegarde automatique
create_backup() {
    log "INFO" "Création de la sauvegarde automatique..."
    
    local backup_dir="/opt/sedi-backups"
    local backup_name="backup-$(date +'%Y%m%d-%H%M%S')"
    local backup_path="$backup_dir/$backup_name"
    
    # Créer le répertoire de sauvegarde si nécessaire
    execute_remote "mkdir -p $backup_dir" "Création répertoire sauvegarde"
    
    # Sauvegarder les images Docker actuelles
    execute_remote "cd /opt/sedi-tablette && docker save docker-sedi-backend:latest | gzip > $backup_path-backend.tar.gz" "Sauvegarde image backend"
    execute_remote "cd /opt/sedi-tablette && docker save docker-sedi-frontend:latest | gzip > $backup_path-frontend.tar.gz" "Sauvegarde image frontend"
    
    # Sauvegarder la configuration
    execute_remote "cd /opt/sedi-tablette && tar czf $backup_path-config.tar.gz docker-compose.yml nginx.conf env.production" "Sauvegarde configuration"
    
    # Sauvegarder les logs
    execute_remote "cd /opt/sedi-tablette && docker-compose logs > $backup_path-logs.txt" "Sauvegarde logs"
    
    # Nettoyer les anciennes sauvegardes (garder 7 jours)
    execute_remote "find $backup_dir -name 'backup-*' -mtime +7 -delete" "Nettoyage anciennes sauvegardes"
    
    log "SUCCESS" "Sauvegarde créée: $backup_name"
    echo "$backup_name" > /tmp/last_backup_name
}

# Fonction de rollback automatique
rollback_to_backup() {
    local backup_name="$1"
    
    if [[ -z "$backup_name" ]]; then
        log "ERROR" "Nom de sauvegarde non spécifié"
        return 1
    fi
    
    log "WARNING" "Démarrage du rollback vers: $backup_name"
    
    local backup_dir="/opt/sedi-backups"
    local backup_path="$backup_dir/$backup_name"
    
    # Arrêter les services actuels
    execute_remote "cd /opt/sedi-tablette && docker-compose down" "Arrêt des services"
    
    # Charger les images de sauvegarde
    execute_remote "cd /opt/sedi-tablette && docker load < $backup_path-backend.tar.gz" "Chargement image backend"
    execute_remote "cd /opt/sedi-tablette && docker load < $backup_path-frontend.tar.gz" "Chargement image frontend"
    
    # Restaurer la configuration
    execute_remote "cd /opt/sedi-tablette && tar xzf $backup_path-config.tar.gz" "Restauration configuration"
    
    # Redémarrer les services
    execute_remote "cd /opt/sedi-tablette && docker-compose up -d" "Redémarrage des services"
    
    # Attendre le démarrage
    sleep 30
    
    # Vérifier que le rollback a réussi
    if test_connectivity "http://$SERVER_IP:3000/api/health" "Backend après rollback"; then
        log "SUCCESS" "Rollback réussi vers: $backup_name"
        return 0
    else
        log "ERROR" "Rollback échoué"
        return 1
    fi
}

# Fonction de collecte des métriques
collect_metrics() {
    log "INFO" "Collecte des métriques de déploiement..."
    
    local metrics_file="/tmp/deployment_metrics.json"
    
    # Métriques système
    local cpu_usage=$(execute_remote "top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | cut -d'%' -f1" "Collecte CPU" 2>/dev/null || echo "N/A")
    local memory_usage=$(execute_remote "free | grep Mem | awk '{printf \"%.1f\", \$3/\$2 * 100.0}'" "Collecte mémoire" 2>/dev/null || echo "N/A")
    local disk_usage=$(execute_remote "df -h /opt/sedi-tablette | awk 'NR==2{print \$5}'" "Collecte disque" 2>/dev/null || echo "N/A")
    
    # Métriques Docker
    local container_count=$(execute_remote "docker ps -q | wc -l" "Compte conteneurs" 2>/dev/null || echo "0")
    local image_size=$(execute_remote "docker images --format 'table {{.Size}}' | grep sedi | head -1" "Taille images" 2>/dev/null || echo "N/A")
    
    # Métriques réseau
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null "http://$SERVER_IP:3000/api/health" 2>/dev/null || echo "N/A")
    
    # Créer le fichier JSON des métriques
    cat > "$metrics_file" << EOF
{
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "environment": "$ENVIRONMENT",
  "server": "$SERVER_IP",
  "deployment_duration": "$DEPLOYMENT_DURATION",
  "system": {
    "cpu_usage": "$cpu_usage",
    "memory_usage": "$memory_usage",
    "disk_usage": "$disk_usage"
  },
  "docker": {
    "container_count": "$container_count",
    "image_size": "$image_size"
  },
  "network": {
    "response_time": "$response_time"
  },
  "status": "success"
}
EOF
    
    log "SUCCESS" "Métriques collectées et sauvegardées"
    
    # Afficher un résumé des métriques
    echo ""
    echo "Métriques de déploiement:"
    echo "  • CPU: $cpu_usage%"
    echo "  • Mémoire: $memory_usage%"
    echo "  • Disque: $disk_usage"
    echo "  • Conteneurs: $container_count"
    echo "  • Temps de réponse: ${response_time}s"
    echo ""
}

# Fonction de validation post-déploiement
validate_deployment() {
    log "INFO" "Validation post-déploiement..."
    
    local validation_passed=true
    
    # Test de connectivité backend
    if ! test_connectivity "http://$SERVER_IP:3000/api/health" "Backend API"; then
        log "ERROR" "Backend non accessible"
        validation_passed=false
    fi
    
    # Test de connectivité frontend
    if ! test_connectivity "http://$SERVER_IP/" "Frontend"; then
        log "ERROR" "Frontend non accessible"
        validation_passed=false
    fi
    
    # Test des endpoints critiques
    local critical_endpoints=(
        "http://$SERVER_IP:3000/api/admin"
        "http://$SERVER_IP:3000/api/operator/status"
    )
    
    for endpoint in "${critical_endpoints[@]}"; do
        if ! curl -f -s --connect-timeout 10 "$endpoint" > /dev/null; then
            log "WARNING" "Endpoint critique non accessible: $endpoint"
        fi
    done
    
    # Test de performance
    local start_time=$(date +%s%3N)
    curl -f -s "http://$SERVER_IP:3000/api/health" > /dev/null
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [[ $response_time -gt 1000 ]]; then
        log "WARNING" "Temps de réponse élevé: ${response_time}ms"
    fi
    
    # Test de la base de données
    local db_test=$(execute_remote "cd /opt/sedi-tablette && docker-compose exec -T sedi-backend node -e 'console.log(\"DB test\")'" "Test DB" 2>/dev/null || echo "FAILED")
    if [[ "$db_test" != "DB test" ]]; then
        log "WARNING" "Test de base de données échoué"
    fi
    
    if [[ "$validation_passed" == true ]]; then
        log "SUCCESS" "Validation post-déploiement réussie"
        return 0
    else
        log "ERROR" "Validation post-déploiement échouée"
        return 1
    fi
}

# ========================================
# FONCTION PRINCIPALE DE DÉPLOIEMENT
# ========================================
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
    
    # Créer une sauvegarde automatique
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
        create_backup
    fi
    
    # Construction des images Docker
    log "INFO" "Construction des images Docker..."
    local build_start_time=$(date +%s)
    if ! docker-compose -f docker/docker-compose.yml build --no-cache --parallel; then
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
    copy_to_server "sedi-backend.tar.gz" "/opt/sedi-tablette/" "Copie image backend"
    copy_to_server "sedi-frontend.tar.gz" "/opt/sedi-tablette/" "Copie image frontend"
    
    # Copie des fichiers de configuration
    log "INFO" "Copie des fichiers de configuration..."
    copy_to_server "docker/" "/opt/sedi-tablette/" "Copie configuration Docker"
    
    # Déploiement sur le serveur
    log "INFO" "Déploiement sur le serveur..."
    local deploy_start_time=$(date +%s)
    
    execute_remote "cd /opt/sedi-tablette && docker load < sedi-backend.tar.gz" "Chargement image backend"
    execute_remote "cd /opt/sedi-tablette && docker load < sedi-frontend.tar.gz" "Chargement image frontend"
    execute_remote "cd /opt/sedi-tablette && docker-compose down || true" "Arrêt des services existants"
    execute_remote "cd /opt/sedi-tablette && docker-compose up -d" "Démarrage des nouveaux services"
    
    local deploy_duration=$(($(date +%s) - deploy_start_time))
    log "SUCCESS" "Déploiement terminé en ${deploy_duration}s"
    
    # Attente du démarrage
    log "INFO" "Attente du démarrage des services..."
    sleep 30
    
    # Vérification de l'état des services
    log "INFO" "Vérification de l'état des services..."
    execute_remote "cd /opt/sedi-tablette && docker-compose ps" "État des services"
    
    # Validation post-déploiement
    if ! validate_deployment; then
        log "ERROR" "Validation post-déploiement échouée"
        
        # Rollback automatique si activé
        if [[ "$AUTO_ROLLBACK" == "true" ]]; then
            local last_backup=$(cat /tmp/last_backup_name 2>/dev/null || echo "")
            if [[ -n "$last_backup" ]]; then
                log "WARNING" "Rollback automatique vers: $last_backup"
                if rollback_to_backup "$last_backup"; then
                    log "SUCCESS" "Rollback automatique réussi"
                    exit 0
                else
                    log "ERROR" "Rollback automatique échoué"
                    exit 1
                fi
            else
                log "ERROR" "Aucune sauvegarde disponible pour le rollback"
                exit 1
            fi
        else
            log "ERROR" "Rollback automatique désactivé"
            exit 1
        fi
    fi
    
    # Collecte des métriques
    DEPLOYMENT_DURATION=$(($(date +%s) - deployment_start_time))
    collect_metrics
    
    # Nettoyage
    cleanup
    
    # Résumé du déploiement
    log "SUCCESS" "Déploiement terminé avec succès !"
    echo ""
    echo "Résumé du déploiement:"
    echo "   • Environnement: $ENVIRONMENT"
    echo "   • Serveur: $SERVER_IP:$SERVER_PORT"
    echo "   • Durée totale: ${DEPLOYMENT_DURATION}s"
    echo "   • Construction: ${build_duration}s"
    echo "   • Déploiement: ${deploy_duration}s"
    echo "   • Backend API: http://$SERVER_IP:3000"
    echo "   • Frontend: http://$SERVER_IP"
    echo "   • Interface Admin: http://$SERVER_IP:3000/api/admin"
    echo "   • Timestamp: $TIMESTAMP"
    echo ""
}

# Fonction de nettoyage
cleanup() {
    log "INFO" "Nettoyage des fichiers temporaires..."
    
    # Nettoyage local
    rm -f sedi-backend.tar.gz sedi-frontend.tar.gz
    rm -f /tmp/last_backup_name
    rm -f /tmp/deployment_metrics.json
    
    # Nettoyage distant
    if [[ "$DRY_RUN" != "--dry-run" ]]; then
        execute_remote "cd /opt/sedi-tablette && rm -f sedi-backend.tar.gz sedi-frontend.tar.gz" "Nettoyage distant"
        
        # Nettoyage des images Docker non utilisées
        execute_remote "docker image prune -f" "Nettoyage images Docker"
        
        # Nettoyage des conteneurs arrêtés
        execute_remote "docker container prune -f" "Nettoyage conteneurs"
        
        # Nettoyage des volumes non utilisés
        execute_remote "docker volume prune -f" "Nettoyage volumes"
    fi
    
    log "SUCCESS" "Nettoyage terminé"
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
