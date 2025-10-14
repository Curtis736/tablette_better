-- Script de configuration des commentaires opérateurs
-- Exécuter ce script sur la base de données SEDI_APP_INDEPENDANTE

USE [SEDI_APP_INDEPENDANTE];
GO

PRINT '=== Configuration des commentaires opérateurs ===';
PRINT 'Début du script: ' + CONVERT(VARCHAR, GETDATE(), 120);
GO

-- Vérifier si la table existe déjà
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AB_COMMENTAIRES_OPERATEURS]') AND type in (N'U'))
BEGIN
    PRINT 'Table AB_COMMENTAIRES_OPERATEURS existe déjà';
    -- Optionnel: vider la table pour un reset complet
    -- TRUNCATE TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS];
    -- PRINT 'Table AB_COMMENTAIRES_OPERATEURS vidée';
END
ELSE
BEGIN
    -- Créer la table des commentaires opérateurs
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
    
    PRINT 'Table AB_COMMENTAIRES_OPERATEURS créée avec succès';
END
GO

-- Créer des index pour améliorer les performances
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[AB_COMMENTAIRES_OPERATEURS]') AND name = N'IX_AB_COMMENTAIRES_OPERATEURS_OperatorCode')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AB_COMMENTAIRES_OPERATEURS_OperatorCode] 
    ON [dbo].[AB_COMMENTAIRES_OPERATEURS] ([OperatorCode] ASC);
    PRINT 'Index IX_AB_COMMENTAIRES_OPERATEURS_OperatorCode créé';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[AB_COMMENTAIRES_OPERATEURS]') AND name = N'IX_AB_COMMENTAIRES_OPERATEURS_LancementCode')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AB_COMMENTAIRES_OPERATEURS_LancementCode] 
    ON [dbo].[AB_COMMENTAIRES_OPERATEURS] ([LancementCode] ASC);
    PRINT 'Index IX_AB_COMMENTAIRES_OPERATEURS_LancementCode créé';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[AB_COMMENTAIRES_OPERATEURS]') AND name = N'IX_AB_COMMENTAIRES_OPERATEURS_CreatedAt')
BEGIN
    CREATE NONCLUSTERED INDEX [IX_AB_COMMENTAIRES_OPERATEURS_CreatedAt] 
    ON [dbo].[AB_COMMENTAIRES_OPERATEURS] ([CreatedAt] DESC);
    PRINT 'Index IX_AB_COMMENTAIRES_OPERATEURS_CreatedAt créé';
END
GO

-- Ajouter des contraintes de validation
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AB_COMMENTAIRES_OPERATEURS_Comment_NotEmpty')
BEGIN
    ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS]
    ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_Comment_NotEmpty] 
    CHECK (LEN(TRIM([Comment])) > 0);
    PRINT 'Contrainte CK_AB_COMMENTAIRES_OPERATEURS_Comment_NotEmpty ajoutée';
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AB_COMMENTAIRES_OPERATEURS_OperatorCode_NotEmpty')
BEGIN
    ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS]
    ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_OperatorCode_NotEmpty] 
    CHECK (LEN(TRIM([OperatorCode])) > 0);
    PRINT 'Contrainte CK_AB_COMMENTAIRES_OPERATEURS_OperatorCode_NotEmpty ajoutée';
END
GO

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_AB_COMMENTAIRES_OPERATEURS_LancementCode_NotEmpty')
BEGIN
    ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS]
    ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_LancementCode_NotEmpty] 
    CHECK (LEN(TRIM([LancementCode])) > 0);
    PRINT 'Contrainte CK_AB_COMMENTAIRES_OPERATEURS_LancementCode_NotEmpty ajoutée';
END
GO

-- Insérer des données de test (optionnel - décommenter si nécessaire)
/*
INSERT INTO [dbo].[AB_COMMENTAIRES_OPERATEURS] 
(OperatorCode, OperatorName, LancementCode, Comment, Timestamp)
VALUES 
('OP001', 'Test Opérateur', 'LT2501145', 'Commentaire de test pour vérifier le fonctionnement', GETDATE()),
('OP002', 'Autre Opérateur', 'LT2501146', 'Un autre commentaire de test', GETDATE());
PRINT 'Données de test insérées';
*/

-- Vérifier la structure de la table
PRINT '=== Structure de la table AB_COMMENTAIRES_OPERATEURS ===';
SELECT 
    COLUMN_NAME as 'Colonne',
    DATA_TYPE as 'Type',
    IS_NULLABLE as 'Nullable',
    CHARACTER_MAXIMUM_LENGTH as 'Longueur Max'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'AB_COMMENTAIRES_OPERATEURS'
ORDER BY ORDINAL_POSITION;

-- Vérifier les index
PRINT '=== Index de la table AB_COMMENTAIRES_OPERATEURS ===';
SELECT 
    i.name as 'Index Name',
    i.type_desc as 'Type',
    i.is_unique as 'Unique'
FROM sys.indexes i
WHERE i.object_id = OBJECT_ID('AB_COMMENTAIRES_OPERATEURS')
AND i.name IS NOT NULL;

PRINT '=== Configuration terminée avec succès ===';
PRINT 'Fin du script: ' + CONVERT(VARCHAR, GETDATE(), 120);
GO

