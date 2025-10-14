#!/bin/bash

# Script de validation complète pour SEDI Tablette
# Usage: ./validate.sh [--quick] [--full] [--security] [--performance]

set -e

# Configuration
QUICK_MODE=false
FULL_MODE=false
SECURITY_MODE=false
PERFORMANCE_MODE=false

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Fonction d'aide
show_help() {
    cat << EOF
Script de validation complète pour SEDI Tablette

USAGE:
    ./validate.sh [OPTIONS]

OPTIONS:
    --quick       Validation rapide (tests de santé uniquement)
    --full        Validation complète (tous les tests)
    --security    Tests de sécurité uniquement
    --performance Tests de performance uniquement
    --help        Affiche cette aide

EXAMPLES:
    ./validate.sh --quick
    ./validate.sh --full
    ./validate.sh --security
    ./validate.sh --performance

EOF
}

# Traitement des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --quick)
            QUICK_MODE=true
            shift
            ;;
        --full)
            FULL_MODE=true
            shift
            ;;
        --security)
            SECURITY_MODE=true
            shift
            ;;
        --performance)
            PERFORMANCE_MODE=true
            shift
            ;;
        *)
            error "Argument inconnu: $1"
            show_help
            exit 1
            ;;
    esac
done

# Mode par défaut si aucun argument
if [[ "$QUICK_MODE" == false && "$FULL_MODE" == false && "$SECURITY_MODE" == false && "$PERFORMANCE_MODE" == false ]]; then
    FULL_MODE=true
fi

log "Début de la validation SEDI Tablette"

# Vérifier les prérequis
log "Vérification des prérequis..."
if ! command -v node &> /dev/null; then
    error "Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    error "npm n'est pas installé"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé"
    exit 1
fi

success "Prérequis satisfaits"

# Installation des dépendances
log "Installation des dépendances backend..."
cd backend
npm ci --prefer-offline --no-audit
success "Dépendances backend installées"

# Tests de santé (toujours exécutés)
log "Exécution des tests de santé..."
npm run test:health
success "Tests de santé réussis"

# Tests d'intégration
if [[ "$QUICK_MODE" == false || "$FULL_MODE" == true ]]; then
    log "Exécution des tests d'intégration..."
    npm run test:integration
    success "Tests d'intégration réussis"
fi

# Tests de sécurité
if [[ "$SECURITY_MODE" == true || "$FULL_MODE" == true ]]; then
    log "Exécution des tests de sécurité..."
    npm run test:security
    success "Tests de sécurité réussis"
fi

# Tests de performance
if [[ "$PERFORMANCE_MODE" == true || "$FULL_MODE" == true ]]; then
    log "Exécution des tests de performance..."
    npm run test:performance
    success "Tests de performance réussis"
fi

# Tests de couverture
if [[ "$FULL_MODE" == true ]]; then
    log "Génération du rapport de couverture..."
    npm run test:coverage
    success "Rapport de couverture généré"
fi

# Tests Docker
log "Tests des conteneurs Docker..."
cd ../docker
docker-compose build --no-cache
docker-compose up -d
sleep 30

# Tests de connectivité
log "Tests de connectivité..."
if curl -f http://localhost:3001/api/health; then
    success "Backend accessible"
else
    error "Backend non accessible"
    docker-compose down
    exit 1
fi

if curl -f http://localhost/; then
    success "Frontend accessible"
else
    error "Frontend non accessible"
    docker-compose down
    exit 1
fi

docker-compose down
success "Tests Docker réussis"

# Résumé
echo ""
success "Validation terminée avec succès !"
echo ""
echo "Résumé de la validation:"
echo "  • Tests de santé: Réussis"
if [[ "$QUICK_MODE" == false || "$FULL_MODE" == true ]]; then
    echo "  • Tests d'intégration: Réussis"
fi
if [[ "$SECURITY_MODE" == true || "$FULL_MODE" == true ]]; then
    echo "  • Tests de sécurité: Réussis"
fi
if [[ "$PERFORMANCE_MODE" == true || "$FULL_MODE" == true ]]; then
    echo "  • Tests de performance: Réussis"
fi
if [[ "$FULL_MODE" == true ]]; then
    echo "  • Couverture de code: Générée"
fi
echo "  • Tests Docker: Réussis"
echo ""


