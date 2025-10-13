#!/bin/bash

# Script de monitoring des déploiements SEDI Tablette
# Usage: ./monitor.sh [--status] [--metrics] [--logs] [--health]

set -euo pipefail

# Configuration
SCRIPT_NAME="$(basename "$0")"
SCRIPT_VERSION="1.0.0"
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
Script de monitoring pour SEDI Tablette v$SCRIPT_VERSION

USAGE:
    $SCRIPT_NAME [OPTIONS]

OPTIONS:
    --status       Afficher le statut des services
    --metrics      Afficher les métriques système
    --logs         Afficher les logs des services
    --health       Vérifier la santé des services
    --environment  Spécifier l'environnement (staging|production)
    --help         Affiche cette aide

EXAMPLES:
    $SCRIPT_NAME --status
    $SCRIPT_NAME --metrics --environment production
    $SCRIPT_NAME --logs --environment staging
    $SCRIPT_NAME --health

EOF
}

# Fonction pour exécuter des commandes sur le serveur distant
execute_remote() {
    local command="$1"
    local description="${2:-Exécution de commande}"
    
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "$command"; then
        return 0
    else
        log "ERROR" "Échec: $description"
        return 1
    fi
}

# Fonction pour afficher le statut des services
show_status() {
    log "INFO" "Statut des services sur $SERVER_IP..."
    echo ""
    
    # Statut des conteneurs Docker
    echo "=== Conteneurs Docker ==="
    execute_remote "cd /opt/sedi-tablette && docker-compose ps" "Statut conteneurs"
    echo ""
    
    # Utilisation des ressources
    echo "=== Utilisation des ressources ==="
    execute_remote "docker stats --no-stream --format 'table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}'" "Statistiques Docker"
    echo ""
    
    # Espace disque
    echo "=== Espace disque ==="
    execute_remote "df -h /opt/sedi-tablette" "Espace disque"
    echo ""
}

# Fonction pour afficher les métriques système
show_metrics() {
    log "INFO" "Métriques système sur $SERVER_IP..."
    echo ""
    
    # CPU et mémoire
    echo "=== CPU et Mémoire ==="
    execute_remote "top -bn1 | head -5" "CPU et mémoire"
    echo ""
    
    # Charge système
    echo "=== Charge système ==="
    execute_remote "uptime" "Charge système"
    echo ""
    
    # Utilisation mémoire détaillée
    echo "=== Mémoire détaillée ==="
    execute_remote "free -h" "Mémoire détaillée"
    echo ""
    
    # Processus Docker
    echo "=== Processus Docker ==="
    execute_remote "ps aux | grep docker" "Processus Docker"
    echo ""
}

# Fonction pour afficher les logs
show_logs() {
    log "INFO" "Logs des services sur $SERVER_IP..."
    echo ""
    
    # Logs des conteneurs
    echo "=== Logs Backend ==="
    execute_remote "cd /opt/sedi-tablette && docker-compose logs --tail=50 sedi-backend" "Logs backend"
    echo ""
    
    echo "=== Logs Frontend ==="
    execute_remote "cd /opt/sedi-tablette && docker-compose logs --tail=50 sedi-frontend" "Logs frontend"
    echo ""
    
    # Logs système
    echo "=== Logs Système ==="
    execute_remote "journalctl --since '1 hour ago' --no-pager | tail -20" "Logs système"
    echo ""
}

# Fonction pour vérifier la santé des services
check_health() {
    log "INFO" "Vérification de la santé des services sur $SERVER_IP..."
    echo ""
    
    local health_ok=true
    
    # Test backend
    echo "=== Test Backend ==="
    if curl -f -s --connect-timeout 10 "http://$SERVER_IP:3000/api/health" > /dev/null; then
        log "SUCCESS" "Backend accessible"
        
        # Test de performance
        local start_time=$(date +%s%3N)
        curl -f -s "http://$SERVER_IP:3000/api/health" > /dev/null
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        if [[ $response_time -lt 1000 ]]; then
            log "SUCCESS" "Temps de réponse: ${response_time}ms"
        else
            log "WARNING" "Temps de réponse élevé: ${response_time}ms"
        fi
    else
        log "ERROR" "Backend non accessible"
        health_ok=false
    fi
    echo ""
    
    # Test frontend
    echo "=== Test Frontend ==="
    if curl -f -s --connect-timeout 10 "http://$SERVER_IP/" > /dev/null; then
        log "SUCCESS" "Frontend accessible"
    else
        log "ERROR" "Frontend non accessible"
        health_ok=false
    fi
    echo ""
    
    # Test endpoints critiques
    echo "=== Test Endpoints Critiques ==="
    local critical_endpoints=(
        "http://$SERVER_IP:3000/api/admin"
        "http://$SERVER_IP:3000/api/operator/status"
    )
    
    for endpoint in "${critical_endpoints[@]}"; do
        if curl -f -s --connect-timeout 10 "$endpoint" > /dev/null; then
            log "SUCCESS" "Endpoint accessible: $endpoint"
        else
            log "WARNING" "Endpoint non accessible: $endpoint"
        fi
    done
    echo ""
    
    # Test de la base de données
    echo "=== Test Base de Données ==="
    local db_test=$(execute_remote "cd /opt/sedi-tablette && docker-compose exec -T sedi-backend node -e 'console.log(\"DB OK\")'" "Test DB" 2>/dev/null || echo "FAILED")
    if [[ "$db_test" == "DB OK" ]]; then
        log "SUCCESS" "Base de données accessible"
    else
        log "WARNING" "Base de données non accessible"
    fi
    echo ""
    
    # Résumé
    if [[ "$health_ok" == true ]]; then
        log "SUCCESS" "Tous les services sont en bonne santé"
    else
        log "ERROR" "Certains services ont des problèmes"
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
    local status_mode=false
    local metrics_mode=false
    local logs_mode=false
    local health_mode=false
    local environment="production"
    
    # Traitement des arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --status)
                status_mode=true
                shift
                ;;
            --metrics)
                metrics_mode=true
                shift
                ;;
            --logs)
                logs_mode=true
                shift
                ;;
            --health)
                health_mode=true
                shift
                ;;
            --environment)
                environment="$2"
                shift 2
                ;;
            *)
                log "ERROR" "Argument inconnu: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Mode par défaut si aucun argument
    if [[ "$status_mode" == false && "$metrics_mode" == false && "$logs_mode" == false && "$health_mode" == false ]]; then
        status_mode=true
        health_mode=true
    fi
    
    # Configuration de l'environnement
    configure_environment "$environment"
    
    # Test de connectivité SSH
    log "INFO" "Test de connectivité SSH..."
    if ! execute_remote "echo 'Connexion SSH réussie'" "Test de connectivité SSH"; then
        log "ERROR" "Impossible de se connecter au serveur"
        exit 1
    fi
    
    # Exécution des modes demandés
    if [[ "$status_mode" == true ]]; then
        show_status
    fi
    
    if [[ "$metrics_mode" == true ]]; then
        show_metrics
    fi
    
    if [[ "$logs_mode" == true ]]; then
        show_logs
    fi
    
    if [[ "$health_mode" == true ]]; then
        check_health
    fi
}

# Exécution
main "$@"
