#!/usr/bin/env node

/**
 * Script pour créer la table des commentaires opérateurs
 * Usage: node scripts/create-comments-table.js
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER || 'SERVEURERP',
    database: 'SEDI_APP_INDEPENDANTE', // Forcer la base SEDI_APP_INDEPENDANTE
    user: process.env.DB_USER || 'QUALITE',
    password: process.env.DB_PASSWORD || 'QUALITE',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
    }
};

async function createCommentsTable() {
    let pool;
    
    try {
        console.log('🔗 Connexion à la base de données...');
        console.log('Serveur:', config.server);
        console.log('Base:', config.database);
        
        pool = await sql.connect(config);
        console.log('✅ Connexion établie');
        
        // Vérifier si la table existe déjà
        const checkTableQuery = `
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'AB_COMMENTAIRES_OPERATEURS'
        `;
        
        const result = await pool.request().query(checkTableQuery);
        const tableExists = result.recordset[0].count > 0;
        
        if (tableExists) {
            console.log('ℹ️ La table AB_COMMENTAIRES_OPERATEURS existe déjà');
            return;
        }
        
        console.log('📋 Création de la table AB_COMMENTAIRES_OPERATEURS...');
        
        // Créer la table
        const createTableQuery = `
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
        `;
        
        await pool.request().query(createTableQuery);
        console.log('✅ Table AB_COMMENTAIRES_OPERATEURS créée');
        
        // Créer les index
        console.log('📊 Création des index...');
        
        const indexes = [
            {
                name: 'IX_AB_COMMENTAIRES_OPERATEURS_OperatorCode',
                query: 'CREATE NONCLUSTERED INDEX [IX_AB_COMMENTAIRES_OPERATEURS_OperatorCode] ON [dbo].[AB_COMMENTAIRES_OPERATEURS] ([OperatorCode] ASC);'
            },
            {
                name: 'IX_AB_COMMENTAIRES_OPERATEURS_LancementCode',
                query: 'CREATE NONCLUSTERED INDEX [IX_AB_COMMENTAIRES_OPERATEURS_LancementCode] ON [dbo].[AB_COMMENTAIRES_OPERATEURS] ([LancementCode] ASC);'
            },
            {
                name: 'IX_AB_COMMENTAIRES_OPERATEURS_CreatedAt',
                query: 'CREATE NONCLUSTERED INDEX [IX_AB_COMMENTAIRES_OPERATEURS_CreatedAt] ON [dbo].[AB_COMMENTAIRES_OPERATEURS] ([CreatedAt] DESC);'
            }
        ];
        
        for (const index of indexes) {
            try {
                await pool.request().query(index.query);
                console.log(`✅ Index ${index.name} créé`);
            } catch (error) {
                console.log(`⚠️ Index ${index.name} existe déjà ou erreur:`, error.message);
            }
        }
        
        // Ajouter les contraintes de validation
        console.log('🔒 Ajout des contraintes de validation...');
        
        const constraints = [
            {
                name: 'CK_AB_COMMENTAIRES_OPERATEURS_Comment_NotEmpty',
                query: 'ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS] ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_Comment_NotEmpty] CHECK (LEN(TRIM([Comment])) > 0);'
            },
            {
                name: 'CK_AB_COMMENTAIRES_OPERATEURS_OperatorCode_NotEmpty',
                query: 'ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS] ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_OperatorCode_NotEmpty] CHECK (LEN(TRIM([OperatorCode])) > 0);'
            },
            {
                name: 'CK_AB_COMMENTAIRES_OPERATEURS_LancementCode_NotEmpty',
                query: 'ALTER TABLE [dbo].[AB_COMMENTAIRES_OPERATEURS] ADD CONSTRAINT [CK_AB_COMMENTAIRES_OPERATEURS_LancementCode_NotEmpty] CHECK (LEN(TRIM([LancementCode])) > 0);'
            }
        ];
        
        for (const constraint of constraints) {
            try {
                await pool.request().query(constraint.query);
                console.log(`✅ Contrainte ${constraint.name} ajoutée`);
            } catch (error) {
                console.log(`⚠️ Contrainte ${constraint.name} existe déjà ou erreur:`, error.message);
            }
        }
        
        console.log('🎉 Table des commentaires créée avec succès !');
        
        // Test d'insertion
        console.log('🧪 Test d\'insertion...');
        const testInsertQuery = `
            INSERT INTO [dbo].[AB_COMMENTAIRES_OPERATEURS] 
            (OperatorCode, OperatorName, LancementCode, Comment, Timestamp)
            VALUES 
            ('TEST001', 'Test Opérateur', 'LT2501145', 'Commentaire de test automatique', GETDATE());
        `;
        
        await pool.request().query(testInsertQuery);
        console.log('✅ Test d\'insertion réussi');
        
        // Vérifier l'insertion
        const countQuery = 'SELECT COUNT(*) as count FROM [dbo].[AB_COMMENTAIRES_OPERATEURS]';
        const countResult = await pool.request().query(countQuery);
        console.log(`📊 Nombre de commentaires dans la table: ${countResult.recordset[0].count}`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de la table:', error);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Connexion fermée');
        }
    }
}

// Exécuter le script
createCommentsTable()
    .then(() => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    });
