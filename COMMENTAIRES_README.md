# 📝 Fonctionnalité Commentaires Opérateurs

## Vue d'ensemble

Cette fonctionnalité permet aux opérateurs d'ajouter des commentaires sur leurs opérations de production, avec envoi automatique d'email à `methode@sedi-ati.com` à chaque nouveau commentaire.

## 🚀 Installation

### 1. Configuration de la base de données

Exécutez le script SQL pour créer la table des commentaires :

```sql
-- Exécuter sur la base SEDI_APP_INDEPENDANTE
-- Fichier: backend/sql/create_comments_table.sql
```

Ou utilisez le script de configuration complet :

```sql
-- Fichier: backend/scripts/setup-comments.sql
```

### 2. Configuration des emails

1. Copiez le fichier d'exemple de configuration :
```bash
cp backend/env.example backend/.env
```

2. Configurez les paramètres SMTP dans `backend/.env` :
```env
# Configuration SMTP pour les commentaires
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=methode@sedi-ati.com
SMTP_PASS=votre-mot-de-passe-application
SMTP_FROM=methode@sedi-ati.com
```

3. **Important pour Gmail** : Vous devez utiliser un mot de passe d'application :
   - Activez l'authentification à 2 facteurs sur le compte Gmail
   - Générez un mot de passe d'application
   - Utilisez ce mot de passe dans `SMTP_PASS`

### 3. Installation des dépendances

```bash
cd backend
npm install
```

### 4. Test de la configuration

```bash
# Test de la configuration email
node backend/scripts/test-comments.js

# Test de l'API des commentaires
curl -X POST http://localhost:3001/api/comments/test-email
```

## 🎯 Utilisation

### Interface Opérateur

1. **Connexion** : L'opérateur se connecte avec son code
2. **Sélection du lancement** : L'opérateur saisit et valide un code de lancement
3. **Ajout de commentaire** :
   - Saisir le commentaire dans la zone de texte (max 2000 caractères)
   - Cliquer sur "Envoyer Commentaire"
   - Le commentaire est enregistré et un email est envoyé automatiquement

### Fonctionnalités

- ✅ **Saisie de commentaires** avec limite de 2000 caractères
- ✅ **Compteur de caractères** en temps réel
- ✅ **Validation** des champs obligatoires
- ✅ **Envoi d'email automatique** à chaque commentaire
- ✅ **Affichage des commentaires** par lancement
- ✅ **Suppression** des commentaires par l'opérateur
- ✅ **Interface responsive** pour tablettes

## 📧 Configuration Email

### Template d'email

Chaque commentaire génère un email avec :
- **Sujet** : `[SEDI] Nouveau commentaire - Opérateur {Code}`
- **Destinataire** : `methode@sedi-ati.com`
- **Contenu** :
  - Informations opérateur
  - Code de lancement
  - Date/heure
  - Commentaire complet

### Exemple d'email

```
Sujet: [SEDI] Nouveau commentaire - Opérateur OP001

Opérateur: Jean Dupont (OP001)
Code Lancement: LT2501145
Date/Heure: 15/01/2025 14:30:25

Commentaire:
Problème de qualité détecté sur la pièce #123.
Vérification nécessaire avant continuation.
```

## 🔧 API Endpoints

### Commentaires

- `POST /api/comments` - Ajouter un commentaire
- `GET /api/comments/operator/:code` - Récupérer les commentaires d'un opérateur
- `GET /api/comments/lancement/:code` - Récupérer les commentaires d'un lancement
- `GET /api/comments` - Récupérer tous les commentaires
- `DELETE /api/comments/:id` - Supprimer un commentaire
- `POST /api/comments/test-email` - Tester l'envoi d'email
- `GET /api/comments/stats` - Statistiques des commentaires

### Exemple d'utilisation API

```javascript
// Ajouter un commentaire
const response = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        operatorCode: 'OP001',
        operatorName: 'Jean Dupont',
        lancementCode: 'LT2501145',
        comment: 'Commentaire de test'
    })
});
```

## 🗄️ Structure de la base de données

### Table `AB_COMMENTAIRES_OPERATEURS`

```sql
CREATE TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [OperatorCode] [nvarchar](50) NOT NULL,
    [OperatorName] [nvarchar](100) NOT NULL,
    [LancementCode] [nvarchar](50) NOT NULL,
    [Comment] [nvarchar](max) NOT NULL,
    [Timestamp] [datetime2](7) NOT NULL,
    [CreatedAt] [datetime2](7) NOT NULL DEFAULT (GETDATE()),
    CONSTRAINT [PK_AB_COMMENTAIRES_OPERATEURS] PRIMARY KEY CLUSTERED ([Id] ASC)
);
```

### Index créés

- `IX_AB_COMMENTAIRES_OPERATEURS_OperatorCode` - Recherche par opérateur
- `IX_AB_COMMENTAIRES_OPERATEURS_LancementCode` - Recherche par lancement
- `IX_AB_COMMENTAIRES_OPERATEURS_CreatedAt` - Tri par date

## 🛠️ Dépannage

### Problèmes d'email

1. **Erreur d'authentification** :
   - Vérifiez les identifiants SMTP
   - Utilisez un mot de passe d'application pour Gmail
   - Vérifiez que l'authentification à 2 facteurs est activée

2. **Email non reçu** :
   - Vérifiez les logs du serveur
   - Testez avec l'endpoint `/api/comments/test-email`
   - Vérifiez les filtres anti-spam

### Problèmes de base de données

1. **Table non trouvée** :
   - Exécutez le script `setup-comments.sql`
   - Vérifiez les permissions de la base de données

2. **Erreurs de connexion** :
   - Vérifiez la configuration dans `backend/.env`
   - Testez la connexion avec les outils existants

### Problèmes d'interface

1. **Commentaires non affichés** :
   - Vérifiez la console du navigateur
   - Vérifiez que l'API est accessible
   - Vérifiez les logs du serveur

2. **Bouton d'envoi désactivé** :
   - Vérifiez qu'un lancement est sélectionné
   - Vérifiez que le commentaire n'est pas vide
   - Vérifiez la limite de caractères

## 📊 Monitoring

### Logs

Les commentaires sont loggés avec :
- Timestamp de création
- Code opérateur
- Code lancement
- Statut d'envoi email

### Statistiques

Utilisez l'endpoint `/api/comments/stats` pour obtenir :
- Nombre total de commentaires
- Nombre d'opérateurs ayant commenté
- Nombre de lancements commentés
- Période (aujourd'hui, cette semaine, ce mois)

## 🔒 Sécurité

- **Validation** : Tous les champs sont validés côté serveur
- **Limitation** : 2000 caractères maximum par commentaire
- **Authentification** : Seuls les opérateurs connectés peuvent commenter
- **Suppression** : Un opérateur ne peut supprimer que ses propres commentaires
- **Rate limiting** : Protection contre le spam

## 🚀 Déploiement

1. **Base de données** : Exécuter les scripts SQL
2. **Configuration** : Mettre à jour les variables d'environnement
3. **Dépendances** : `npm install` dans le dossier backend
4. **Test** : Exécuter `node backend/scripts/test-comments.js`
5. **Démarrage** : Redémarrer le serveur backend

## 📝 Changelog

### Version 1.0.0
- ✅ Ajout de l'interface commentaires
- ✅ Envoi d'email automatique
- ✅ API complète pour les commentaires
- ✅ Interface responsive
- ✅ Gestion des erreurs
- ✅ Tests de configuration



