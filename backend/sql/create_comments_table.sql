-- Script de création de la table des commentaires opérateurs
-- Base de données: SEDI_APP_INDEPENDANTE

USE [SEDI_APP_INDEPENDANTE];
GO

-- Créer la table des commentaires opérateurs
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AB_COMMENTAIRES_OPERATEURS]') AND type in (N'U'))
BEGIN
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
ELSE
BEGIN
    PRINT 'Table AB_COMMENTAIRES_OPERATEURS existe déjà';
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
ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS]
ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_Comment_NotEmpty] 
CHECK (LEN(TRIM([Comment])) > 0);
GO

ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS]
ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_OperatorCode_NotEmpty] 
CHECK (LEN(TRIM([OperatorCode])) > 0);
GO

ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS]
ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_LancementCode_NotEmpty] 
CHECK (LEN(TRIM([LancementCode])) > 0);
GO

PRINT 'Contraintes de validation ajoutées';
GO

-- Insérer des données de test (optionnel)
-- INSERT INTO [dbo].[AB_COMMENTAIRES_OPERATEURS] 
-- (OperatorCode, OperatorName, LancementCode, Comment, Timestamp)
-- VALUES 
-- ('OP001', 'Test Opérateur', 'LT2501145', 'Commentaire de test', GETDATE());
-- GO

PRINT 'Script de création de la table des commentaires terminé avec succès';
GO



