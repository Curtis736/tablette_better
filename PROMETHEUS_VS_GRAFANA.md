# 🔍 Prometheus vs Grafana : Lequel vous faut-il ?

## 📊 Rôles

### **Prometheus** = Collecte et stockage des métriques
- ✅ Collecte les métriques depuis votre backend (via `/metrics`)
- ✅ Stocke les métriques historiques (30 jours par défaut)
- ✅ Interface web intégrée sur le port 9090
- ✅ Requêtes PromQL pour interroger les métriques
- ✅ Alertes (si configurées)

### **Grafana** = Visualisation avancée
- ✅ Dashboards pré-configurés et beaux graphiques
- ✅ Visualisations personnalisables
- ✅ Partage de dashboards
- ✅ Alertes visuelles
- ❌ Nécessite Prometheus pour fonctionner

## ❓ Avez-vous besoin de Grafana ?

### ✅ **Grafana est UTILE si vous voulez :**
- Des graphiques visuels et beaux dashboards
- Surveiller plusieurs métriques en même temps
- Partager des vues de monitoring avec votre équipe
- Des alertes visuelles configurées
- Une interface plus user-friendly

### ✅ **Prometheus SEUL suffit si vous voulez :**
- Juste collecter et stocker les métriques
- Faire des requêtes occasionnelles via l'interface web Prometheus
- Conserver un historique des métriques
- Configuration minimale
- Moins de ressources (pas besoin de Grafana)

## 🚀 Solutions

### Option 1 : Prometheus seul (plus simple)

```bash
cd ~/tablette_better/docker
docker-compose -f docker-compose.prometheus-only.yml up -d
```

**Avantages :**
- ✅ Plus simple à déployer (une seule image)
- ✅ Moins de ressources utilisées
- ✅ Accès direct à Prometheus : http://IP_SERVEUR:9090
- ✅ Interface Prometheus pour requêtes et graphiques basiques

**Accès :**
- Prometheus UI : http://IP_SERVEUR:9090
- Graphiques basiques dans Prometheus
- Requêtes PromQL directement

### Option 2 : Prometheus + Grafana (recommandé pour production)

```bash
cd ~/tablette_better/docker
docker-compose -f docker-compose.monitoring.yml up -d
```

**Avantages :**
- ✅ Dashboards pré-configurés avec tous les graphiques
- ✅ Interface plus intuitive
- ✅ Visualisation professionnelle
- ✅ Alertes visuelles

**Accès :**
- Grafana : http://IP_SERVEUR:3000 (admin/admin)
- Prometheus : http://IP_SERVEUR:9090

## 📝 Recommandation

### Pour commencer rapidement :
**→ Utilisez Prometheus seul** (`docker-compose.prometheus-only.yml`)
- Vous pouvez toujours ajouter Grafana plus tard
- Les métriques sont déjà collectées par Prometheus

### Pour une solution complète :
**→ Utilisez Prometheus + Grafana** (`docker-compose.monitoring.yml`)
- Meilleure expérience utilisateur
- Dashboards professionnels
- Monitoring complet

## 🔄 Passer de Prometheus seul à Prometheus+Grafana

Si vous démarrez avec Prometheus seul, vous pouvez ajouter Grafana plus tard :

```bash
# Arrêter Prometheus seul
docker-compose -f docker-compose.prometheus-only.yml down

# Démarrer Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d
```

Les métriques stockées par Prometheus seront toujours disponibles ! ✅

## 💡 Interface Prometheus (sans Grafana)

Prometheus a sa propre interface web :
- **Graph** : Créer des graphiques simples
- **Status** : Voir la configuration
- **Alerts** : Voir les alertes (si configurées)
- **Targets** : Voir les endpoints scraper
- **Query** : Faire des requêtes PromQL

Exemple de requête PromQL dans Prometheus :
```
rate(sedi_http_requests_total[5m])
```

## 📊 Comparaison rapide

| Fonctionnalité | Prometheus seul | Prometheus + Grafana |
|----------------|----------------|----------------------|
| Collecte métriques | ✅ | ✅ |
| Stockage historique | ✅ | ✅ |
| Interface web basique | ✅ | ❌ (mais Prometheus disponible) |
| Graphiques avancés | ⚠️ Basiques | ✅ Professionnels |
| Dashboards pré-configurés | ❌ | ✅ |
| Facile à utiliser | ⚠️ Moyen | ✅ Très facile |
| Ressources utilisées | Faible | Moyenne |
















