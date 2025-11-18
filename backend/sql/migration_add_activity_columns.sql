-- Migration pour ajouter les colonnes ActivityStatus et LastActivityTime
-- à la table ABSESSIONS_OPERATEURS

USE [SEDI_APP_INDEPENDANTE];
GO

-- Vérifier si les colonnes existent déjà
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'ABSESSIONS_OPERATEURS' 
               AND COLUMN_NAME = 'ActivityStatus')
BEGIN
    -- Ajouter la colonne ActivityStatus
    ALTER TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
    ADD ActivityStatus NVARCHAR(20) DEFAULT 'INACTIVE';
    
    PRINT 'Colonne ActivityStatus ajoutée avec succès';
END
ELSE
BEGIN
    PRINT 'Colonne ActivityStatus existe déjà';
END
GO

-- Vérifier si les colonnes existent déjà
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'ABSESSIONS_OPERATEURS' 
               AND COLUMN_NAME = 'LastActivityTime')
BEGIN
    -- Ajouter la colonne LastActivityTime
    ALTER TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
    ADD LastActivityTime DATETIME2 DEFAULT GETDATE();
    
    PRINT 'Colonne LastActivityTime ajoutée avec succès';
END
ELSE
BEGIN
    PRINT 'Colonne LastActivityTime existe déjà';
END
GO

-- Mettre à jour les enregistrements existants
UPDATE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
SET ActivityStatus = 'INACTIVE',
    LastActivityTime = GETDATE()
WHERE ActivityStatus IS NULL OR LastActivityTime IS NULL;

PRINT 'Migration terminée avec succès';
GO





















