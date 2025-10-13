#!/bin/bash

# Script de déploiement SEDI Tablette v2.2 sur Serveur de Production
# Serveur: ServeurPRODUCTION (192.168.1.26)
# Auteur: SEDI
# Version: v2.2

set -e

# Configuration du serveur de production
PROD_SERVER="192.168.1.26"
PROD_USER="maintenance"
PROD_PORT="722"
PROD_PASSWORD="=prod40"
PROD_HOSTNAME="ServeurPRODUCTION"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fonction de log avec couleur
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

info() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"
}

echo -e "${CYAN}🚀 Déploiement SEDI Tablette v2.2 sur Serveur de Production${NC}"
echo -e "${CYAN}========================================================${NC}"
echo ""
info "Serveur: $PROD_HOSTNAME ($PROD_SERVER)"
info "Utilisateur: $PROD_USER"
info "Port: $PROD_PORT"
echo ""

# Vérifier que Docker est installé localement
if ! command -v docker &> /dev/null; then
    error "Docker n'est pas installé localement"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose n'est pas installé localement"
    exit 1
fi

# Vérifier que sshpass est installé pour l'automatisation
if ! command -v sshpass &> /dev/null; then
    warning "sshpass n'est pas installé. Installation..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y sshpass
    elif command -v yum &> /dev/null; then
        sudo yum install -y sshpass
    else
        error "Impossible d'installer sshpass automatiquement"
        exit 1
    fi
fi

# Fonction pour exécuter des commandes sur le serveur distant
run_remote() {
    sshpass -p "$PROD_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$PROD_PORT" "$PROD_USER@$PROD_SERVER" "$1"
}

# Fonction pour copier des fichiers vers le serveur distant
copy_to_remote() {
    sshpass -p "$PROD_PASSWORD" scp -o StrictHostKeyChecking=no -P "$PROD_PORT" -r "$1" "$PROD_USER@$PROD_SERVER:$2"
}

log "Test de connexion au serveur de production..."
if run_remote "echo 'Connexion réussie'"; then
    success "Connexion au serveur $PROD_HOSTNAME établie"
else
    error "Impossible de se connecter au serveur $PROD_HOSTNAME"
    exit 1
fi

log "Vérification de Docker sur le serveur distant..."
if run_remote "docker --version && docker-compose --version"; then
    success "Docker est installé sur le serveur de production"
else
    error "Docker n'est pas installé sur le serveur de production"
    exit 1
fi

log "Construction des images Docker localement..."
docker-compose -f docker/docker-compose.yml build --no-cache
success "Images construites localement"

log "Sauvegarde des images Docker..."
docker save docker-sedi-backend:latest | gzip > sedi-backend.tar.gz
docker save docker-sedi-frontend:latest | gzip > sedi-frontend.tar.gz
success "Images sauvegardées"

log "Création du répertoire de déploiement sur le serveur..."
run_remote "mkdir -p /opt/sedi-tablette"

log "Copie des images vers le serveur de production..."
copy_to_remote "sedi-backend.tar.gz" "/opt/sedi-tablette/"
copy_to_remote "sedi-frontend.tar.gz" "/opt/sedi-tablette/"
success "Images copiées vers le serveur"

log "Copie des fichiers de configuration..."
copy_to_remote "docker/" "/opt/sedi-tablette/"
success "Configuration copiée"

log "Chargement des images sur le serveur distant..."
run_remote "cd /opt/sedi-tablette && gunzip -c sedi-backend.tar.gz | docker load"
run_remote "cd /opt/sedi-tablette && gunzip -c sedi-frontend.tar.gz | docker load"
success "Images chargées sur le serveur"

log "Arrêt des services existants..."
run_remote "cd /opt/sedi-tablette && docker-compose -f docker-compose.yml down 2>/dev/null || true"

log "Démarrage des services sur le serveur de production..."
run_remote "cd /opt/sedi-tablette && docker-compose -f docker-compose.yml up -d"
success "Services démarrés sur le serveur de production"

log "Attente de la disponibilité des services..."
sleep 15

log "Vérification de l'état des services..."
run_remote "cd /opt/sedi-tablette && docker-compose -f docker-compose.yml ps"

log "Test de connectivité..."
if run_remote "curl -f -s http://localhost:3000/api/health > /dev/null"; then
    success "Backend accessible sur http://$PROD_SERVER:3000"
else
    warning "Backend non accessible sur le port 3000"
fi

if run_remote "curl -f -s http://localhost > /dev/null"; then
    success "Frontend accessible sur http://$PROD_SERVER"
else
    warning "Frontend non accessible sur le port 80"
fi

log "Nettoyage des fichiers temporaires..."
rm -f sedi-backend.tar.gz sedi-frontend.tar.gz
run_remote "cd /opt/sedi-tablette && rm -f sedi-backend.tar.gz sedi-frontend.tar.gz"
success "Fichiers temporaires supprimés"

echo ""
success "🎉 Déploiement sur serveur de production terminé avec succès !"
echo ""
echo -e "${CYAN}📋 Informations de déploiement:${NC}"
echo -e "   • Serveur: $PROD_HOSTNAME ($PROD_SERVER)"
echo -e "   • Backend API: http://$PROD_SERVER:3000"
echo -e "   • Frontend: http://$PROD_SERVER"
echo -e "   • Interface Admin: http://$PROD_SERVER:3000/api/admin"
echo -e "   • Santé API: http://$PROD_SERVER:3000/api/health"
echo ""
echo -e "${CYAN}🔧 Commandes utiles sur le serveur:${NC}"
echo -e "   • Connexion SSH: ssh -p $PROD_PORT $PROD_USER@$PROD_SERVER"
echo -e "   • Voir les logs: cd /opt/sedi-tablette && docker-compose -f docker-compose.yml logs -f"
echo -e "   • Arrêter: cd /opt/sedi-tablette && docker-compose -f docker-compose.yml down"
echo -e "   • Redémarrer: cd /opt/sedi-tablette && docker-compose -f docker-compose.yml restart"
echo ""


