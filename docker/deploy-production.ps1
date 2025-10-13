# Script de déploiement SEDI Tablette v2.2 sur Serveur de Production
# Serveur: ServeurPRODUCTION (192.168.1.26)
# Auteur: SEDI
# Version: v2.2

param(
    [switch]$Force
)

# Configuration du serveur de production
$PROD_SERVER = "192.168.1.26"
$PROD_USER = "maintenance"
$PROD_PORT = "722"
$PROD_PASSWORD = "=prod40"
$PROD_HOSTNAME = "ServeurPRODUCTION"

# Fonction de log avec couleur
function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ℹ️  $Message" -ForegroundColor Cyan
}

Write-Host "🚀 Déploiement SEDI Tablette v2.2 sur Serveur de Production" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "Serveur: $PROD_HOSTNAME ($PROD_SERVER)"
Write-Info "Utilisateur: $PROD_USER"
Write-Info "Port: $PROD_PORT"
Write-Host ""

# Vérifier que Docker est installé localement
try {
    docker --version | Out-Null
    Write-Success "Docker est installé localement"
} catch {
    Write-Error "Docker n'est pas installé localement"
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Success "Docker Compose est installé localement"
} catch {
    Write-Error "Docker Compose n'est pas installé localement"
    exit 1
}

# Fonction pour exécuter des commandes sur le serveur distant
function Invoke-RemoteCommand {
    param([string]$Command)
    
    $sshCommand = "ssh -o StrictHostKeyChecking=no -p $PROD_PORT $PROD_USER@$PROD_SERVER `"$Command`""
    
    # Utiliser plink si disponible, sinon ssh
    if (Get-Command plink -ErrorAction SilentlyContinue) {
        $process = Start-Process -FilePath "plink" -ArgumentList "-ssh", "-P", $PROD_PORT, "-l", $PROD_USER, "-pw", $PROD_PASSWORD, $PROD_SERVER, $Command -PassThru -Wait -NoNewWindow -RedirectStandardOutput "temp_output.txt" -RedirectStandardError "temp_error.txt"
        if ($process.ExitCode -eq 0) {
            $output = Get-Content "temp_output.txt" -Raw
            Remove-Item "temp_output.txt", "temp_error.txt" -ErrorAction SilentlyContinue
            return $output
        } else {
            $errorContent = Get-Content "temp_error.txt" -Raw
            Remove-Item "temp_output.txt", "temp_error.txt" -ErrorAction SilentlyContinue
            throw $errorContent
        }
    } else {
        # Utiliser ssh avec mot de passe via echo
        $process = Start-Process -FilePath "cmd" -ArgumentList "/c", "echo $PROD_PASSWORD | ssh -o StrictHostKeyChecking=no -p $PROD_PORT $PROD_USER@$PROD_SERVER `"$Command`"" -PassThru -Wait -NoNewWindow -RedirectStandardOutput "temp_output.txt" -RedirectStandardError "temp_error.txt"
        if ($process.ExitCode -eq 0) {
            $output = Get-Content "temp_output.txt" -Raw
            Remove-Item "temp_output.txt", "temp_error.txt" -ErrorAction SilentlyContinue
            return $output
        } else {
            $errorContent = Get-Content "temp_error.txt" -Raw
            Remove-Item "temp_output.txt", "temp_error.txt" -ErrorAction SilentlyContinue
            throw $errorContent
        }
    }
}

# Fonction pour copier des fichiers vers le serveur distant
function Copy-ToRemote {
    param([string]$LocalPath, [string]$RemotePath)
    
    if (Get-Command pscp -ErrorAction SilentlyContinue) {
        $process = Start-Process -FilePath "pscp" -ArgumentList "-P", $PROD_PORT, "-pw", $PROD_PASSWORD, "-r", $LocalPath, "$PROD_USER@$PROD_SERVER`:$RemotePath" -PassThru -Wait -NoNewWindow
        return $process.ExitCode -eq 0
    } else {
        Write-Warning "pscp non disponible, tentative avec scp..."
        $process = Start-Process -FilePath "cmd" -ArgumentList "/c", "echo $PROD_PASSWORD | scp -o StrictHostKeyChecking=no -P $PROD_PORT -r $LocalPath $PROD_USER@$PROD_SERVER`:$RemotePath" -PassThru -Wait -NoNewWindow
        return $process.ExitCode -eq 0
    }
}

Write-Log "Test de connexion au serveur de production..."
try {
    $result = Invoke-RemoteCommand "echo 'Connexion réussie'"
    Write-Success "Connexion au serveur $PROD_HOSTNAME établie"
} catch {
    Write-Error "Impossible de se connecter au serveur $PROD_HOSTNAME"
    Write-Error $_.Exception.Message
    exit 1
}

Write-Log "Vérification de Docker sur le serveur distant..."
try {
    $result = Invoke-RemoteCommand "docker --version && docker-compose --version"
    Write-Success "Docker est installé sur le serveur de production"
} catch {
    Write-Error "Docker n'est pas installé sur le serveur de production"
    exit 1
}

Write-Log "Construction des images Docker localement..."
try {
    Set-Location ".."
    docker-compose -f docker/docker-compose.yml build --no-cache
    Write-Success "Images construites localement"
} catch {
    Write-Error "Erreur lors de la construction des images"
    exit 1
}

Write-Log "Sauvegarde des images Docker..."
try {
    docker save docker-sedi-backend:latest | Out-File -FilePath "sedi-backend.tar" -Encoding Binary
    docker save docker-sedi-frontend:latest | Out-File -FilePath "sedi-frontend.tar" -Encoding Binary
    Write-Success "Images sauvegardées"
} catch {
    Write-Error "Erreur lors de la sauvegarde des images"
    exit 1
}

Write-Log "Création du répertoire de déploiement sur le serveur..."
try {
    Invoke-RemoteCommand "mkdir -p /opt/sedi-tablette"
    Write-Success "Répertoire créé"
} catch {
    Write-Warning "Répertoire peut-être déjà existant"
}

Write-Log "Copie des images vers le serveur de production..."
if (Copy-ToRemote "sedi-backend.tar" "/opt/sedi-tablette/") {
    Write-Success "Image backend copiée"
} else {
    Write-Error "Erreur lors de la copie de l'image backend"
    exit 1
}

if (Copy-ToRemote "sedi-frontend.tar" "/opt/sedi-tablette/") {
    Write-Success "Image frontend copiée"
} else {
    Write-Error "Erreur lors de la copie de l'image frontend"
    exit 1
}

Write-Log "Copie des fichiers de configuration..."
if (Copy-ToRemote "docker/" "/opt/sedi-tablette/") {
    Write-Success "Configuration copiée"
} else {
    Write-Error "Erreur lors de la copie de la configuration"
    exit 1
}

Write-Log "Chargement des images sur le serveur distant..."
try {
    Invoke-RemoteCommand "cd /opt/sedi-tablette && docker load < sedi-backend.tar"
    Invoke-RemoteCommand "cd /opt/sedi-tablette && docker load < sedi-frontend.tar"
    Write-Success "Images chargées sur le serveur"
} catch {
    Write-Error "Erreur lors du chargement des images"
    exit 1
}

Write-Log "Arrêt des services existants..."
try {
    Invoke-RemoteCommand "cd /opt/sedi-tablette && docker-compose -f docker-compose.yml down 2>/dev/null || true"
    Write-Success "Services arrêtés"
} catch {
    Write-Warning "Aucun service à arrêter"
}

Write-Log "Démarrage des services sur le serveur de production..."
try {
    Invoke-RemoteCommand "cd /opt/sedi-tablette && docker-compose -f docker-compose.yml up -d"
    Write-Success "Services démarrés sur le serveur de production"
} catch {
    Write-Error "Erreur lors du démarrage des services"
    exit 1
}

Write-Log "Attente de la disponibilité des services..."
Start-Sleep -Seconds 15

Write-Log "Vérification de l'état des services..."
try {
    $result = Invoke-RemoteCommand "cd /opt/sedi-tablette && docker-compose -f docker-compose.yml ps"
    Write-Host $result
} catch {
    Write-Warning "Impossible de vérifier l'état des services"
}

Write-Log "Test de connectivité..."
try {
    $result = Invoke-RemoteCommand "curl -f -s http://localhost:3000/api/health"
    Write-Success "Backend accessible sur http://$PROD_SERVER`:3000"
} catch {
    Write-Warning "Backend non accessible sur le port 3000"
}

try {
    $result = Invoke-RemoteCommand "curl -f -s http://localhost"
    Write-Success "Frontend accessible sur http://$PROD_SERVER"
} catch {
    Write-Warning "Frontend non accessible sur le port 80"
}

Write-Log "Nettoyage des fichiers temporaires..."
Remove-Item "sedi-backend.tar", "sedi-frontend.tar" -ErrorAction SilentlyContinue
try {
    Invoke-RemoteCommand "cd /opt/sedi-tablette && rm -f sedi-backend.tar sedi-frontend.tar"
    Write-Success "Fichiers temporaires supprimés"
} catch {
    Write-Warning "Erreur lors du nettoyage des fichiers temporaires"
}

Write-Host ""
Write-Success "🎉 Déploiement sur serveur de production terminé avec succès !"
Write-Host ""
Write-Host "📋 Informations de déploiement:" -ForegroundColor Cyan
Write-Host "   • Serveur: $PROD_HOSTNAME ($PROD_SERVER)"
Write-Host "   • Backend API: http://$PROD_SERVER`:3000"
Write-Host "   • Frontend: http://$PROD_SERVER"
Write-Host "   • Interface Admin: http://$PROD_SERVER`:3000/api/admin"
Write-Host "   • Santé API: http://$PROD_SERVER`:3000/api/health"
Write-Host ""
Write-Host "🔧 Commandes utiles sur le serveur:" -ForegroundColor Cyan
Write-Host "   • Connexion SSH: ssh -p $PROD_PORT $PROD_USER@$PROD_SERVER"
Write-Host "   • Voir les logs: cd /opt/sedi-tablette && docker-compose -f docker-compose.yml logs -f"
Write-Host "   • Arrêter: cd /opt/sedi-tablette && docker-compose -f docker-compose.yml down"
Write-Host "   • Redémarrer: cd /opt/sedi-tablette && docker-compose -f docker-compose.yml restart"
Write-Host ""