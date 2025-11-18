# 🏗️ Architecture du Monitoring : Où installer quoi ?

## 📍 Règle générale

### **Prometheus** → DOIT être sur le serveur de production
**Pourquoi ?**
- ✅ Collecte les métriques depuis le backend (même réseau Docker)
- ✅ Réduit la latence réseau
- ✅ Accès direct au réseau `sedi-tablette-network`
- ✅ Les métriques sont en temps réel

### **Grafana** → Peut être LOCAL ou sur le serveur
**Pourquoi les deux options sont possibles ?**
- Grafana lit les données depuis Prometheus via HTTP
- Peut se connecter à distance à Prometheus

## 🎯 Architecture recommandée

### Option A : Tout sur le serveur (RECOMMANDÉ) ✅

```
┌─────────────────────────────────────┐
│   Serveur de Production             │
│                                      │
│  ┌──────────┐      ┌───────────┐   │
│  │ Backend  │──────│Prometheus │   │
│  │ :3001    │      │  :9090    │   │
│  │/metrics  │      │           │   │
│  └──────────┘      └─────┬─────┘   │
│                           │         │
│                      ┌────▼─────┐  │
│                      │ Grafana  │  │
│                      │  :3000   │  │
│                      └──────────┘  │
└─────────────────────────────────────┘
         ▲
         │ HTTP (port 9090)
         │ (si accès distant)
```

**Avantages :**
- ✅ Configuration simple (tout ensemble)
- ✅ Pas de problème de réseau/firewall
- ✅ Performance optimale
- ✅ Un seul endroit à gérer

**Déploiement :**
```bash
# Sur le serveur
cd ~/tablette_better/docker
docker-compose -f docker-compose.monitoring.yml up -d
```

### Option B : Prometheus sur serveur, Grafana en local

```
┌─────────────────────┐    HTTP     ┌──────────────────┐
│ Serveur Production  │────────────▶│  Votre PC Local  │
│                     │  :9090      │                  │
│  ┌──────────┐       │             │  ┌──────────┐    │
│  │ Backend  │       │             │  │ Grafana  │    │
│  │ :3001    │       │             │  │  :3000   │    │
│  └────┬─────┘       │             │  └──────────┘    │
│       │             │             └──────────────────┘
│       │ scrape      │
│  ┌────▼─────┐       │
│  │Prometheus│       │
│  │  :9090   │       │
│  └──────────┘       │
└─────────────────────┘
```

**Avantages :**
- ✅ Accès Grafana sans SSH
- ✅ Interface sur votre machine
- ✅ Moins de ressources sur le serveur

**Inconvénients :**
- ❌ Nécessite d'exposer Prometheus (sécurité)
- ❌ Dépend de votre connexion
- ❌ Plus complexe à configurer

## 🚀 Solution recommandée : Tout sur le serveur

Pour votre cas (serveur de production), je recommande **Option A : tout sur le serveur**.

### Pourquoi ?

1. **Prometheus DOIT être sur le serveur** :
   ```yaml
   # docker/prometheus.yml
   - targets: ['sedi-backend:3001']  # ← Même réseau Docker
   ```
   Il scrape le backend via le réseau Docker interne.

2. **Grafana peut être sur le serveur aussi** :
   - Se connecte à Prometheus via `http://prometheus:9090` (même réseau)
   - Interface accessible via SSH tunnel ou directement si le port est ouvert

### Déploiement complet

```bash
# Sur le serveur de production
cd ~/tablette_better/docker

# Démarrer Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# Vérifier
docker ps | grep -E "prometheus|grafana"
```

## 🔐 Accès à Grafana depuis votre PC

### Méthode 1 : SSH Tunnel (SÉCURISÉ) ✅

```bash
# Depuis votre PC Windows
ssh -L 3000:localhost:3000 maintenance@serveurproduction -p 722

# Puis ouvrez : http://localhost:3000
```

### Méthode 2 : Port ouvert (si configuré)

Si le port 3000 est ouvert sur le serveur :
- Grafana : http://IP_SERVEUR:3000

### Méthode 3 : Port forwarding SSH

```bash
# Depuis votre PC
ssh -N -L 3000:localhost:3000 -L 9090:localhost:9090 maintenance@serveurproduction -p 722
```

Puis :
- Grafana : http://localhost:3000
- Prometheus : http://localhost:9090

## 📋 Résumé

| Composant | Où installer | Pourquoi |
|-----------|-------------|----------|
| **Prometheus** | **Serveur** ✅ | Doit être proche du backend pour collecter |
| **Grafana** | **Serveur** ✅ (recommandé) | Plus simple, tout ensemble |
| **Grafana** | Local ⚠️ | Possible mais plus complexe |

## 🎯 Configuration actuelle

Votre `docker-compose.monitoring.yml` configure déjà tout sur le serveur :

```yaml
# Prometheus collecte depuis le backend local
- targets: ['sedi-backend:3001']  # ← Même réseau Docker

# Grafana lit depuis Prometheus local
url: http://prometheus:9090  # ← Même réseau Docker
```

C'est la configuration **parfaite** ! ✅

## ✅ Conclusion

**Réponse : Installer les deux sur le serveur de production**
- Prometheus DOIT être sur le serveur (pour collecter)
- Grafana DEVRAIT être sur le serveur (plus simple)
- Accès depuis votre PC via SSH tunnel si nécessaire

Les métriques seront collectées en temps réel, et vous pouvez accéder à Grafana via SSH tunnel depuis votre PC.












