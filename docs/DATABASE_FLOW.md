# Flux de données - Base de données SEDI

## Architecture des tables

### 1. GPSQL.abetemps_temp
**Table des lancements disponibles pour les opérateurs**

```sql
SELECT TOP (1000) 
    [NoEnreg],           -- Numéro d'enregistrement
    [Ident],             -- Identifiant
    [DateTravail],       -- Date de travail
    [CodeLanctImprod],   -- Code du lancement (CodeLancement)
    [Phase],             -- Phase du lancement
    [CodePoste],         -- Code du poste
    [CodeOperateur]      -- Code de l'opérateur assigné
FROM [SEDI_ERP].[GPSQL].[abetemps_temp]
```

**Utilisation :** Cette table contient tous les lancements disponibles que les opérateurs peuvent sélectionner et démarrer.

### 2. GPSQL.abetemps_temps
**Table des opérations en cours (DEBUT et PAUSE)**

```sql
-- Structure de la table
GPSQL.abetemps_temps:
- Id (PK)
- OperateurId
- CodeLancement
- DateDebut
- DatePause (si en pause)
- Statut ('DEBUT' ou 'PAUSE')
- DureeCumulee (durée cumulée en secondes)
- DateCreation
- DateModification
```

**Utilisation :** 
- **DEBUT** : Opération démarrée par l'opérateur
- **PAUSE** : Opération mise en pause (sera reprise)

### 3. GPSQL.abetemps_pause
**Table des pauses détaillées**

```sql
-- Structure de la table
GPSQL.abetemps_pause:
- Id (PK)
- OperationId (FK vers abetemps_temps)
- OperateurId
- CodeLancement
- DatePause
- DureeAvantPause (durée avant la pause)
- DateCreation
```

**Utilisation :** Historique détaillé de toutes les pauses effectuées.

### 4. GPSQL.abetemps
**Table finale pour SILOG (opérations terminées)**

```sql
-- Structure de la table
GPSQL.abetemps:
- Id (PK)
- OperateurId
- CodeLancement
- DateDebut
- DateFin
- DureeTotale (durée totale en secondes)
- Statut ('FIN')
- DateCreation
```

**Utilisation :** Opérations terminées, prêtes pour l'intégration SILOG.

## Flux de données

### 1. Sélection d'un lancement
```sql
-- Récupérer les lancements disponibles
SELECT 
    t.CodeLanctImprod as CodeLancement,
    t.Phase,
    t.CodePoste,
    t.CodeOperateur,
    l.DesignationLct1,
    l.CodeArticle
FROM [SEDI_ERP].[GPSQL].[abetemps_temp] t
LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON t.CodeLanctImprod = l.CodeLancement
```

### 2. Démarrage d'une opération (DEBUT)
```sql
-- Insérer dans abetemps_temps
INSERT INTO GPSQL.abetemps_temps (
    OperateurId,
    CodeLancement,
    DateDebut,
    Statut,
    DateCreation
) VALUES (
    @operatorId,
    @lancementCode,
    GETDATE(),
    'DEBUT',
    GETDATE()
)
```

### 3. Mise en pause (PAUSE)
```sql
-- Mettre à jour abetemps_temps
UPDATE GPSQL.abetemps_temps 
SET Statut = 'PAUSE',
    DatePause = @now,
    DureeCumulee = ISNULL(DureeCumulee, 0) + @duration,
    DateModification = @now
WHERE Id = @operationId

-- Insérer dans abetemps_pause
INSERT INTO GPSQL.abetemps_pause (
    OperationId,
    OperateurId,
    CodeLancement,
    DatePause,
    DureeAvantPause,
    DateCreation
) VALUES (
    @operationId,
    @operatorId,
    @lancementCode,
    @now,
    @duration,
    @now
)
```

### 4. Fin d'opération (FIN)
```sql
-- Insérer dans abetemps (pour SILOG)
INSERT INTO GPSQL.abetemps (
    OperateurId,
    CodeLancement,
    DateDebut,
    DateFin,
    DureeTotale,
    Statut,
    DateCreation
)
SELECT 
    OperateurId,
    CodeLancement,
    DateDebut,
    @now as DateFin,
    @totalDuration as DureeTotale,
    'FIN' as Statut,
    GETDATE() as DateCreation
FROM GPSQL.abetemps_temps 
WHERE Id = @operationId

-- Supprimer de abetemps_temps
DELETE FROM GPSQL.abetemps_temps 
WHERE Id = @operationId
```

## États des opérations

| État | Table | Description |
|------|-------|-------------|
| **Disponible** | `abetemps_temp` | Lancement disponible pour sélection |
| **En cours** | `abetemps_temps` | Opération démarrée (Statut = 'DEBUT') |
| **En pause** | `abetemps_temps` | Opération en pause (Statut = 'PAUSE') |
| **Terminée** | `abetemps` | Opération terminée, prête pour SILOG |

## Requêtes de monitoring

### Opérations en cours
```sql
SELECT 
    o.Id,
    o.CodeLancement,
    o.DateDebut,
    o.Statut,
    op.Nom as OperateurNom,
    l.DesignationLct1 as Article
FROM GPSQL.abetemps_temps o
LEFT JOIN GPSQL.Operateurs op ON o.OperateurId = op.Id
LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON o.CodeLancement = l.CodeLancement
WHERE o.Statut IN ('DEBUT', 'PAUSE')
```

### Opérations terminées (pour SILOG)
```sql
SELECT 
    o.Id,
    o.CodeLancement,
    o.DateDebut,
    o.DateFin,
    o.DureeTotale,
    op.Nom as OperateurNom,
    l.DesignationLct1 as Article
FROM GPSQL.abetemps o
LEFT JOIN GPSQL.Operateurs op ON o.OperateurId = op.Id
LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON o.CodeLancement = l.CodeLancement
WHERE CAST(o.DateDebut AS DATE) = @date
```

### Statistiques par jour
```sql
-- Opérations en cours
SELECT 
    COUNT(DISTINCT o.OperateurId) as totalOperators,
    SUM(CASE WHEN o.Statut = 'DEBUT' THEN 1 ELSE 0 END) as activeLancements,
    SUM(CASE WHEN o.Statut = 'PAUSE' THEN 1 ELSE 0 END) as pausedLancements
FROM GPSQL.abetemps_temps o
WHERE CAST(o.DateDebut AS DATE) = @date

-- Opérations terminées
SELECT COUNT(*) as completedLancements
FROM GPSQL.abetemps o
WHERE CAST(o.DateDebut AS DATE) = @date
```

## Intégration SILOG

Les opérations terminées dans `GPSQL.abetemps` sont prêtes pour être traitées par la macromande SILOG d'intégration des temps. Cette table contient :

- **DateDebut** et **DateFin** : Période de travail
- **DureeTotale** : Durée totale en secondes
- **OperateurId** et **CodeLancement** : Identification de l'opération
- **Statut = 'FIN'** : Marqueur de finalisation

## Gestion des erreurs

### Vérifications avant démarrage
- L'opérateur existe et est actif
- Le lancement existe dans `abetemps_temp`
- Aucune opération en cours pour cet opérateur

### Vérifications avant pause
- Une opération est en cours (Statut = 'DEBUT')
- L'opération appartient à l'opérateur

### Vérifications avant arrêt
- Une opération est en cours ou en pause
- L'opération appartient à l'opérateur
