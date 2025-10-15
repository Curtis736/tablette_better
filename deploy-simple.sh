#!/bin/bash
# Script de déploiement simple pour SEDI Tablette
# Évite les problèmes Docker et DNS

echo "🚀 Déploiement simple SEDI Tablette"
echo "===================================="

# Vérifier si on est sur le serveur de production
if [ "$(hostname)" = "serveurproduction" ] || [ "$(hostname)" = "SERVEURERP" ]; then
    echo "📡 Serveur de production détecté"
    PRODUCTION=true
else
    echo "💻 Environnement de développement"
    PRODUCTION=false
fi

# Fonction pour installer Node.js si nécessaire
install_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "📦 Installation de Node.js..."
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
        else
            echo "❌ Impossible d'installer Node.js automatiquement"
            echo "💡 Installez Node.js manuellement depuis https://nodejs.org"
            exit 1
        fi
    else
        echo "✅ Node.js déjà installé: $(node --version)"
    fi
}

# Fonction pour installer Nginx si nécessaire
install_nginx() {
    if ! command -v nginx &> /dev/null; then
        echo "📦 Installation de Nginx..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y nginx
        else
            echo "❌ Impossible d'installer Nginx automatiquement"
            exit 1
        fi
    else
        echo "✅ Nginx déjà installé: $(nginx -v 2>&1)"
    fi
}

# Fonction pour configurer le backend
setup_backend() {
    echo "🔧 Configuration du backend..."
    cd backend
    
    # Installer les dépendances
    echo "📦 Installation des dépendances backend..."
    npm install --production
    
    # Créer le fichier de configuration
    cat > .env << EOF
NODE_ENV=production
PORT=3001
DB_SERVER=192.168.1.14
DB_DATABASE=SEDI_ERP
DB_USER=QUALITE
DB_PASSWORD=QUALITE
DB_ENCRYPT=false
DB_TRUST_CERT=true
FRONTEND_URL=http://localhost:8080
API_TIMEOUT=30000
CACHE_ENABLED=true
LOG_LEVEL=info
EOF
    
    echo "✅ Backend configuré"
    cd ..
}

# Fonction pour configurer le frontend
setup_frontend() {
    echo "🔧 Configuration du frontend..."
    cd frontend
    
    # Installer les dépendances
    echo "📦 Installation des dépendances frontend..."
    npm install
    
    # Créer le fichier de configuration Nginx
    sudo tee /etc/nginx/sites-available/sedi-tablette << 'EOF'
server {
    listen 8080;
    server_name localhost;
    
    root /var/www/sedi-tablette;
    index index.html;
    
    # Configuration pour SPA
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy vers l'API backend
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Activer le site
    sudo ln -sf /etc/nginx/sites-available/sedi-tablette /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Créer le répertoire et copier les fichiers
    sudo mkdir -p /var/www/sedi-tablette
    sudo cp -r * /var/www/sedi-tablette/
    sudo chown -R www-data:www-data /var/www/sedi-tablette
    
    echo "✅ Frontend configuré"
    cd ..
}

# Fonction pour créer les services systemd
create_services() {
    echo "🔧 Création des services systemd..."
    
    # Service backend
    sudo tee /etc/systemd/system/sedi-backend.service << EOF
[Unit]
Description=SEDI Tablette Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$(pwd)/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Activer et démarrer les services
    sudo systemctl daemon-reload
    sudo systemctl enable sedi-backend
    sudo systemctl enable nginx
    
    echo "✅ Services créés"
}

# Fonction pour démarrer les services
start_services() {
    echo "🚀 Démarrage des services..."
    
    # Démarrer le backend
    sudo systemctl start sedi-backend
    sleep 5
    
    # Vérifier le backend
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend démarré avec succès"
    else
        echo "❌ Erreur démarrage backend"
        sudo systemctl status sedi-backend
        exit 1
    fi
    
    # Redémarrer Nginx
    sudo systemctl restart nginx
    
    # Vérifier Nginx
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Frontend accessible"
    else
        echo "❌ Erreur frontend"
        sudo systemctl status nginx
        exit 1
    fi
    
    echo "🎉 Déploiement terminé avec succès !"
    echo "📱 Application accessible sur: http://localhost:8080"
    echo "🔧 API backend sur: http://localhost:3001"
}

# Fonction principale
main() {
    echo "🔍 Vérification des prérequis..."
    
    # Installer Node.js et Nginx
    install_nodejs
    install_nginx
    
    # Configurer les services
    setup_backend
    setup_frontend
    create_services
    start_services
    
    echo ""
    echo "📊 Status des services:"
    echo "Backend: $(sudo systemctl is-active sedi-backend)"
    echo "Nginx: $(sudo systemctl is-active nginx)"
    echo ""
    echo "🔗 URLs d'accès:"
    echo "Frontend: http://$(hostname -I | awk '{print $1}'):8080"
    echo "API: http://$(hostname -I | awk '{print $1}'):3001"
}

# Exécuter le script
main "$@"
