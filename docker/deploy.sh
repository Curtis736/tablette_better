#!/bin/bash
# Déploiement orchestré côté serveur pour la tablette SEDI.
# Objectif : éviter les conteneurs récalcitrants en confiant tout à docker compose.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKER_DIR="${PROJECT_ROOT}/docker"

COMPOSE_PROJECT="${COMPOSE_PROJECT:-sedi-tablette}"
NETWORK_NAME="${NETWORK_NAME:-sedi-tablette-network}"
PROD_COMPOSE="${DOCKER_DIR}/docker-compose.production.yml"
MONITOR_COMPOSE="${DOCKER_DIR}/docker-compose.monitoring.yml"
REBUILD_SCRIPT="${DOCKER_DIR}/rebuild-images.sh"

log() {
  printf '[%(%Y-%m-%d %H:%M:%S)T] %s\n' -1 "$*"
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
  docker compose -p "$COMPOSE_PROJECT" -f "$file" down --remove-orphans --timeout 45 || true
}

compose_up() {
  local file="$1"
  docker compose -p "$COMPOSE_PROJECT" -f "$file" up -d --remove-orphans
}

force_cleanup() {
  log "🧹 Nettoyage des conteneurs restants (fallback)"
  docker ps -a --filter "name=${COMPOSE_PROJECT}" --format "{{.ID}}" | xargs -r docker rm -f || true
  docker ps -a --filter "name=sedi-" --format "{{.ID}}" | xargs -r docker rm -f || true
}

log "🔍 Validation des prérequis..."
require_file "$PROD_COMPOSE"
if [[ -x "$REBUILD_SCRIPT" ]]; then
  log "🔧 Script de rebuild détecté"
else
  log "⚠️  Script de rebuild introuvable ou non exécutable : $REBUILD_SCRIPT"
fi

ensure_network

log "🛑 Arrêt contrôlé des services applicatifs"
compose_down "$PROD_COMPOSE"

if [[ -f "$MONITOR_COMPOSE" ]]; then
  log "🛑 Arrêt contrôlé du monitoring"
  compose_down "$MONITOR_COMPOSE"
fi

force_cleanup

if [[ -x "$REBUILD_SCRIPT" ]]; then
  log "🔨 Reconstruction des images Docker"
  (cd "$PROJECT_ROOT" && "$REBUILD_SCRIPT")
else
  log "⚠️  Reconstruction sautée (script indisponible)"
fi

log "🚀 Démarrage des services applicatifs"
compose_up "$PROD_COMPOSE"

if [[ -f "$MONITOR_COMPOSE" ]]; then
  log "📊 Démarrage du monitoring"
  compose_up "$MONITOR_COMPOSE"
else
  log "ℹ️  Monitoring non démarré (fichier absent)"
fi

log "✅ État des conteneurs"
docker ps --filter "name=${COMPOSE_PROJECT}"
docker ps --filter "name=sedi-"

