#!/bin/bash

# SEDI Tablette - Direct Installation Script (No Docker)
# For offline production environments

echo "🚀 Starting SEDI Tablette Direct Installation..."

# Check if we're in the right directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Please run this script from the tablette_better root directory"
    exit 1
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    sudo apt update
    sudo apt install nodejs npm -y
fi

# Check Nginx installation
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    sudo apt install nginx -y
fi

echo "✅ Prerequisites checked"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production
cd ..

# Set up frontend
echo "🌐 Setting up frontend..."
sudo mkdir -p /var/www/html
sudo cp -r frontend/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Configure nginx
echo "⚙️ Configuring Nginx..."
sudo cp docker/nginx.conf /etc/nginx/nginx.conf

# Set environment variables
export NODE_ENV=production
export PORT=3001
export DB_SERVER=SERVEURERP
export DB_DATABASE=SEDI_ERP
export DB_USER=QUALITE
export DB_PASSWORD=QUALITE
export DB_ENCRYPT=false
export DB_TRUST_CERT=true
export FRONTEND_URL=http://localhost
export API_TIMEOUT=30000
export CACHE_ENABLED=true
export LOG_LEVEL=info

echo "🎯 Starting services..."

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start backend
echo "🔧 Starting backend on port 3001..."
cd backend
node server.js &

echo "✅ SEDI Tablette is starting..."
echo "🌐 Frontend: http://localhost"
echo "🔧 Backend API: http://localhost:3001"
echo "🏥 Health Check: http://localhost:3001/api/health"

echo ""
echo "📝 To stop the application:"
echo "   sudo systemctl stop nginx"
echo "   pkill -f 'node server.js'"
echo ""
echo "📝 To check logs:"
echo "   sudo journalctl -u nginx -f"
echo "   tail -f backend/logs/*.log"







