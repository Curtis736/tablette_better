#!/bin/bash

# 🚀 Script de Déploiement Automatique pour SEDI Tablette
# Usage: ./deploy-server.sh [server-ip] [username]

set -e  # Arrêter en cas d'erreur

# Configuration
SERVER_IP=${1:-"your-server-ip"}
USERNAME=${2:-"root"}
APP_DIR="/opt/apps/tablettev2"
REPO_URL="https://github.com/Curtis736/tablette_better.git"

echo "🚀 === DÉPLOIEMENT SEDI TABLETTE ==="
echo "📡 Serveur: $SERVER_IP"
echo "👤 Utilisateur: $USERNAME"
echo "📁 Répertoire: $APP_DIR"
echo ""

# Fonction pour exécuter des commandes sur le serveur
run_remote() {
    echo "🔧 Exécution: $1"
    ssh $USERNAME@$SERVER_IP "$1"
}

# Fonction pour copier des fichiers
copy_file() {
    echo "📤 Copie: $1 -> $2"
    scp $1 $USERNAME@$SERVER_IP:$2
}

echo "1️⃣ Vérification des prérequis..."
run_remote "which docker && which docker-compose && which git && which node"

echo "2️⃣ Arrêt des services existants..."
run_remote "cd $APP_DIR/docker 2>/dev/null && docker-compose down || true"

echo "3️⃣ Sauvegarde de la configuration..."
run_remote "cp $APP_DIR/backend/.env $APP_DIR/backend/.env.backup 2>/dev/null || true"

echo "4️⃣ Mise à jour du code..."
run_remote "cd $APP_DIR && git fetch origin && git reset --hard origin/master"

echo "5️⃣ Restauration de la configuration..."
run_remote "cp $APP_DIR/backend/.env.backup $APP_DIR/backend/.env 2>/dev/null || true"

echo "6️⃣ Configuration de l'environnement..."
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Fichier .env manquant, création d'un template..."
    run_remote "cd $APP_DIR && cp backend/env.example backend/.env"
    echo "📝 Veuillez configurer backend/.env sur le serveur"
fi

echo "7️⃣ Construction des conteneurs Docker..."
run_remote "cd $APP_DIR/docker && docker-compose build --no-cache"

echo "8️⃣ Démarrage des services..."
run_remote "cd $APP_DIR/docker && docker-compose up -d"

echo "9️⃣ Attente du démarrage..."
sleep 10

echo "🔟 Vérification du déploiement..."
run_remote "cd $APP_DIR/docker && docker-compose ps"

echo "1️⃣1️⃣ Test de l'API..."
run_remote "curl -f http://localhost:3001/api/health || echo '❌ API non accessible'"

echo "1️⃣2️⃣ Configuration du nettoyage automatique..."
run_remote "chmod +x $APP_DIR/backend/scripts/auto-cleanup.js"

echo "1️⃣3️⃣ Test du script de nettoyage..."
run_remote "cd $APP_DIR/backend && node scripts/auto-cleanup.js"

echo "1️⃣4️⃣ Configuration du crontab..."
run_remote "crontab -l | grep -v 'tablettev2' | crontab -"
run_remote "echo '0 * * * * cd $APP_DIR/backend && node scripts/auto-cleanup.js >> logs/cleanup.log 2>&1' | crontab -"
run_remote "echo '0 2 * * * cd $APP_DIR/backend && node scripts/auto-cleanup.js >> logs/cleanup-daily.log 2>&1' | crontab -"

echo "1️⃣5️⃣ Création du répertoire de logs..."
run_remote "mkdir -p $APP_DIR/backend/logs"

echo ""
echo "✅ === DÉPLOIEMENT TERMINÉ ==="
echo "🌐 Application: http://$SERVER_IP:3001"
echo "👨‍💼 Interface admin: http://$SERVER_IP:3001/api/admin"
echo "🔍 Santé: http://$SERVER_IP:3001/api/health"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Configurer backend/.env avec vos paramètres"
echo "2. Redémarrer: cd $APP_DIR/docker && docker-compose restart"
echo "3. Vérifier les logs: docker-compose logs -f"
echo ""
echo "🛠️  Commandes utiles:"
echo "- Logs: docker-compose logs -f"
echo "- Redémarrage: docker-compose restart"
echo "- Nettoyage: curl -X POST http://$SERVER_IP:3001/api/admin/cleanup-all"
echo "- Statut: docker-compose ps"
