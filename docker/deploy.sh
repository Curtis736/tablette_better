#!/bin/bash
# Déploiement orchestré côté serveur pour la tablette SEDI.
# Objectif : éviter les conteneurs récalcitrants en confiant tout à docker compose.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/docker"

COMPOSE_PROJECT="${COMPOSE_PROJECT:-sedi-tablette}"
MONITOR_PROJECT="${MONITOR_PROJECT:-sedi-tablette-monitoring}"
NETWORK_NAME="${NETWORK_NAME:-sedi-tablette-network}"
PROD_COMPOSE="${DOCKER_DIR}/docker-compose.production.yml"
MONITOR_COMPOSE="${DOCKER_DIR}/docker-compose.monitoring.yml"
REBUILD_SCRIPT="${DOCKER_DIR}/rebuild-images.sh"

log() {
  printf '[%(%Y-%m-%d %H:%M:%S)T] %s\n' -1 "$*"
}

ensure_docker_access() {
  if docker info >/dev/null 2>&1; then
    return
  fi

  log "❌ Impossible d'accéder au daemon Docker avec l'utilisateur $(whoami)."
  if [[ "$EUID" -eq 0 ]]; then
    log "ℹ️  Docker semble tourner en mode rootless. Relancez ce script sans sudo."
  else
    log "ℹ️  Vérifiez que $(whoami) appartient au groupe docker ou que DOCKER_HOST est correctement défini."
  fi
  exit 1
}

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    log "❌ Fichier manquant: $file"
    exit 1
  fi
}

ensure_network() {
  if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    log "📡 Création du réseau $NETWORK_NAME"
    docker network create "$NETWORK_NAME"
  else
    log "📡 Réseau $NETWORK_NAME déjà présent"
  fi
}

compose_down() {
  local file="$1"
  local project="$2"
  
  # Essayer d'abord sans sudo
  if docker compose -p "$project" -f "$file" down --remove-orphans --timeout 45 2>/dev/null; then
    return 0
  fi
  
  # Si ça échoue avec "permission denied", essayer avec sudo
  local error_output
  error_output=$(docker compose -p "$project" -f "$file" down --remove-orphans --timeout 45 2>&1 || true)
  
  if echo "$error_output" | grep -q "permission denied"; then
    log "⚠️  Permission denied détectée, tentative avec sudo..."
    if command -v sudo >/dev/null 2>&1; then
      sudo docker compose -p "$project" -f "$file" down --remove-orphans --timeout 45 || true
    else
      log "❌ sudo non disponible. Arrêt manuel requis."
      return 1
    fi
  fi
}

compose_up() {
  local file="$1"
  local project="$2"
  
  # Essayer d'abord sans sudo
  if docker compose -p "$project" -f "$file" up -d --remove-orphans 2>/dev/null; then
    return 0
  fi
  
  # Si ça échoue avec "permission denied" ou "cannot stop", nettoyer d'abord
  local error_output
  error_output=$(docker compose -p "$project" -f "$file" up -d --remove-orphans 2>&1 || true)
  
  if echo "$error_output" | grep -qE "(permission denied|cannot stop)"; then
    log "⚠️  Conflit avec conteneurs root-owned détecté, nettoyage préalable..."
    cleanup_root_containers || true
    
    # Réessayer après nettoyage
    log "🔄 Nouvelle tentative de démarrage..."
    docker compose -p "$project" -f "$file" up -d --remove-orphans || {
      log "❌ Échec du démarrage. Vérifiez les permissions Docker."
      return 1
    }
  else
    # Autre erreur, la propager
    echo "$error_output" >&2
    return 1
  fi
}

# Nettoyer les conteneurs root-owned avec sudo si nécessaire
cleanup_root_containers() {
  local container_ids=()
  
  # Collecter tous les IDs de conteneurs
  while IFS= read -r id; do
    [[ -n "$id" ]] && container_ids+=("$id")
  done < <(docker ps -a --filter "name=${COMPOSE_PROJECT}" --format "{{.ID}}" 2>/dev/null || true)
  
  while IFS= read -r id; do
    [[ -n "$id" ]] && container_ids+=("$id")
  done < <(docker ps -a --filter "name=${MONITOR_PROJECT}" --format "{{.ID}}" 2>/dev/null || true)
  
  while IFS= read -r id; do
    [[ -n "$id" ]] && container_ids+=("$id")
  done < <(docker ps -a --filter "name=sedi-" --format "{{.ID}}" 2>/dev/null || true)
  
  if [[ ${#container_ids[@]} -eq 0 ]]; then
    return 0
  fi
  
  # Essayer d'arrêter chaque conteneur, et utiliser sudo si permission denied
  local needs_sudo=false
  for id in "${container_ids[@]}"; do
    if ! docker stop "$id" 2>/dev/null; then
      local error_msg
      error_msg=$(docker stop "$id" 2>&1 || true)
      if echo "$error_msg" | grep -qE "(permission denied|cannot stop)"; then
        needs_sudo=true
        log "⚠️  Conteneur $id nécessite sudo (root-owned)"
      fi
    fi
  done
  
  # Si sudo est nécessaire et disponible, l'utiliser
  if [[ "$needs_sudo" == "true" ]] && command -v sudo >/dev/null 2>&1; then
    log "🔧 Nettoyage des conteneurs root-owned avec sudo..."
    for id in "${container_ids[@]}"; do
      sudo docker stop "$id" 2>/dev/null || true
      sudo docker rm -f "$id" 2>/dev/null || true
    done
  elif [[ "$needs_sudo" == "true" ]]; then
    log "❌ sudo non disponible. Les conteneurs root-owned doivent être nettoyés manuellement."
    return 1
  fi
}

force_cleanup() {
  log "🧹 Nettoyage des conteneurs restants (fallback)"
  
  # D'abord essayer le nettoyage normal
  docker ps -a --filter "name=${COMPOSE_PROJECT}" --format "{{.ID}}" 2>/dev/null | while IFS= read -r id; do
    if [[ -n "$id" ]]; then
      docker rm -f "$id" 2>/dev/null || {
        log "⚠️  Impossible de supprimer $id (peut-être root-owned)"
      }
    fi
  done || true
  
  docker ps -a --filter "name=${MONITOR_PROJECT}" --format "{{.ID}}" 2>/dev/null | while IFS= read -r id; do
    if [[ -n "$id" ]]; then
      docker rm -f "$id" 2>/dev/null || {
        log "⚠️  Impossible de supprimer $id (peut-être root-owned)"
      }
    fi
  done || true
  
  docker ps -a --filter "name=sedi-" --format "{{.ID}}" 2>/dev/null | while IFS= read -r id; do
    if [[ -n "$id" ]]; then
      docker rm -f "$id" 2>/dev/null || {
        log "⚠️  Impossible de supprimer $id (peut-être root-owned)"
      }
    fi
  done || true
  
  # Ensuite essayer de nettoyer les conteneurs root-owned
  cleanup_root_containers || true
}

log "🔍 Validation des prérequis..."
ensure_docker_access
require_file "$PROD_COMPOSE"
if [[ -x "$REBUILD_SCRIPT" ]]; then
  log "🔧 Script de rebuild détecté"
else
  log "⚠️  Script de rebuild introuvable ou non exécutable : $REBUILD_SCRIPT"
fi

ensure_network

log "🛑 Arrêt contrôlé des services applicatifs"
if ! compose_down "$PROD_COMPOSE" "$COMPOSE_PROJECT"; then
  log "⚠️  Échec de l'arrêt normal, nettoyage forcé..."
  force_cleanup
fi

if [[ -f "$MONITOR_COMPOSE" ]]; then
  log "🛑 Arrêt contrôlé du monitoring"
  if ! compose_down "$MONITOR_COMPOSE" "$MONITOR_PROJECT"; then
    log "⚠️  Échec de l'arrêt normal du monitoring, nettoyage forcé..."
    force_cleanup
  fi
fi

# Nettoyage final pour s'assurer que tout est propre
force_cleanup

if [[ -x "$REBUILD_SCRIPT" ]]; then
  log "🔨 Reconstruction des images Docker"
  (cd "$PROJECT_ROOT" && "$REBUILD_SCRIPT")
else
  log "⚠️  Reconstruction sautée (script indisponible)"
fi

log "🚀 Démarrage des services applicatifs"
compose_up "$PROD_COMPOSE" "$COMPOSE_PROJECT"

if [[ -f "$MONITOR_COMPOSE" ]]; then
  log "📊 Démarrage du monitoring"
  compose_up "$MONITOR_COMPOSE" "$MONITOR_PROJECT"
else
  log "ℹ️  Monitoring non démarré (fichier absent)"
fi

log "✅ État des conteneurs"
docker ps --filter "name=${COMPOSE_PROJECT}"
if [[ -f "$MONITOR_COMPOSE" ]]; then
  docker ps --filter "name=${MONITOR_PROJECT}"
fi
docker ps --filter "name=sedi-"

