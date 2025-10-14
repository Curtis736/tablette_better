# API Documentation - SEDI Tablette

## Base URL
```
http://localhost:3001/api
```

## Authentification
L'API utilise un système d'authentification basé sur les codes opérateurs.

## Endpoints

### Opérateurs

#### GET /operators/:code
Récupérer un opérateur par son code.

**Paramètres :**
- `code` (string) - Code de l'opérateur

**Réponse :**
```json
{
  "id": 1,
  "code": "OP001",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@sedi.com",
  "actif": true
}
```

#### GET /operators
Récupérer tous les opérateurs actifs.

**Réponse :**
```json
[
  {
    "id": 1,
    "code": "OP001",
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@sedi.com",
    "actif": true
  }
]
```

### Lancements

#### GET /lancements
Récupérer tous les lancements.

**Paramètres de requête :**
- `search` (string, optionnel) - Terme de recherche
- `limit` (number, optionnel) - Limite de résultats (défaut: 100)

**Réponse :**
```json
[
  {
    "CodeLancement": "LCT001",
    "DateMiseJour": "2024-01-15T10:30:00Z",
    "CodeArticle": "ART001",
    "DesignationLct1": "Produit A",
    "Statut": "EN_COURS",
    "Quantite": 100
  }
]
```

#### GET /lancements/:code
Récupérer un lancement par son code.

**Paramètres :**
- `code` (string) - Code du lancement

**Réponse :**
```json
{
  "CodeLancement": "LCT001",
  "DateMiseJour": "2024-01-15T10:30:00Z",
  "CodeArticle": "ART001",
  "DesignationLct1": "Produit A",
  "Statut": "EN_COURS",
  "Quantite": 100,
  "Description": "Description détaillée",
  "Priorite": "NORMALE"
}
```

### Opérations

#### POST /operations/start
Démarrer une opération.

**Corps de la requête :**
```json
{
  "operatorId": 1,
  "lancementCode": "LCT001"
}
```

**Réponse :**
```json
{
  "message": "Opération démarrée avec succès",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /operations/pause
Mettre en pause une opération.

**Corps de la requête :**
```json
{
  "operatorId": 1,
  "lancementCode": "LCT001"
}
```

**Réponse :**
```json
{
  "message": "Opération mise en pause avec succès",
  "duration": "01:30:45",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

#### POST /operations/stop
Terminer une opération.

**Corps de la requête :**
```json
{
  "operatorId": 1,
  "lancementCode": "LCT001"
}
```

**Réponse :**
```json
{
  "message": "Opération terminée avec succès",
  "duration": "02:15:30",
  "timestamp": "2024-01-15T12:45:00Z"
}
```

#### GET /operations/current/:operatorId
Récupérer l'opération en cours d'un opérateur.

**Paramètres :**
- `operatorId` (number) - ID de l'opérateur

**Réponse :**
```json
{
  "id": 1,
  "CodeLancement": "LCT001",
  "DateDebut": "2024-01-15T10:30:00Z",
  "Statut": "DEBUT",
  "DureeCumulee": 3600,
  "DesignationLct1": "Produit A",
  "CodeArticle": "ART001",
  "OperateurNom": "Dupont Jean",
  "DureeActuelle": 1800,
  "DureeTotale": 5400,
  "DureeFormatee": "01:30:00"
}
```

### Administration

#### GET /admin/operations
Récupérer les données pour l'interface admin.

**Paramètres de requête :**
- `date` (string, optionnel) - Date au format YYYY-MM-DD (défaut: aujourd'hui)

**Réponse :**
```json
{
  "stats": {
    "totalOperators": 5,
    "activeLancements": 3,
    "pausedLancements": 1,
    "completedLancements": 8
  },
  "operations": [
    {
      "id": 1,
      "operatorId": 1,
      "operatorName": "Dupont Jean",
      "lancementCode": "LCT001",
      "article": "Produit A",
      "startTime": "2024-01-15T10:30:00Z",
      "endTime": "2024-01-15T12:45:00Z",
      "duration": "02:15:00",
      "status": "Terminé"
    }
  ],
  "date": "2024-01-15"
}
```

#### GET /admin/stats
Récupérer uniquement les statistiques.

**Paramètres de requête :**
- `date` (string, optionnel) - Date au format YYYY-MM-DD

**Réponse :**
```json
{
  "totalOperators": 5,
  "activeLancements": 3,
  "pausedLancements": 1,
  "completedLancements": 8
}
```

#### GET /admin/export/:format
Exporter les données.

**Paramètres :**
- `format` (string) - Format d'export (csv, excel, pdf)

**Paramètres de requête :**
- `date` (string, optionnel) - Date au format YYYY-MM-DD

**Réponse :**
- Fichier CSV avec les données des opérations

### Santé

#### GET /health
Vérifier l'état de l'API.

**Réponse :**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600
}
```

## Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 400 | Requête invalide |
| 401 | Non autorisé |
| 404 | Ressource non trouvée |
| 409 | Conflit (ex: opération déjà en cours) |
| 500 | Erreur serveur |

## Exemples d'erreurs

### 400 - Requête invalide
```json
{
  "error": "ID opérateur et code lancement sont requis"
}
```

### 404 - Opérateur non trouvé
```json
{
  "error": "Opérateur non trouvé ou inactif"
}
```

### 409 - Conflit
```json
{
  "error": "Une opération est déjà en cours pour cet opérateur"
}
```

## Rate Limiting

- **API générale** : 100 requêtes par 15 minutes par IP
- **Connexion** : 5 tentatives par minute par IP
- **Export** : 10 requêtes par heure par IP

## Headers de sécurité

L'API inclut les headers de sécurité suivants :
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer-when-downgrade`

## CORS

L'API accepte les requêtes depuis :
- `http://localhost` (production)
- `http://localhost:8080` (développement)

## Format des dates

Toutes les dates sont au format ISO 8601 :
```
2024-01-15T10:30:00Z
```

## Format des durées

Les durées sont au format HH:MM:SS :
```
01:30:45
```

## Pagination

Pour les endpoints qui retournent des listes, utilisez :
- `limit` : Nombre maximum d'éléments (défaut: 100)
- `offset` : Nombre d'éléments à ignorer (défaut: 0)

## Filtrage

Certains endpoints supportent le filtrage :
- `search` : Recherche textuelle
- `date` : Filtrage par date
- `status` : Filtrage par statut
