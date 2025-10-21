#!/usr/bin/env node

/**
 * Script de nettoyage automatique pour SEDI Tablette
 * Peut être exécuté via cron ou manuellement
 */

const { executeQuery } = require('../config/database');

async function performFullCleanup() {
    console.log('🧹 === DÉBUT DU NETTOYAGE AUTOMATIQUE ===');
    console.log('⏰', new Date().toISOString());
    
    try {
        // 1. Nettoyer les sessions expirées
        console.log('1️⃣ Nettoyage des sessions expirées...');
        const sessionsQuery = `
            DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            WHERE DateCreation < DATEADD(hour, -24, GETDATE())
        `;
        await executeQuery(sessionsQuery);
        console.log('✅ Sessions expirées nettoyées');
        
        // 2. Nettoyer les doublons d'opérations
        console.log('2️⃣ Nettoyage des doublons d\'opérations...');
        const duplicatesQuery = `
            WITH DuplicateEvents AS (
                SELECT NoEnreg,
                       ROW_NUMBER() OVER (
                           PARTITION BY OperatorCode, CodeLanctImprod, CAST(DateCreation AS DATE), Ident, Phase
                           ORDER BY DateCreation ASC, NoEnreg ASC
                       ) as rn
                FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
                WHERE OperatorCode IS NOT NULL 
                    AND OperatorCode != ''
                    AND OperatorCode != '0'
            )
            DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            WHERE NoEnreg IN (
                SELECT NoEnreg FROM DuplicateEvents WHERE rn > 1
            )
        `;
        await executeQuery(duplicatesQuery);
        console.log('✅ Doublons d\'opérations nettoyés');
        
        // 3. Nettoyer les événements orphelins
        console.log('3️⃣ Nettoyage des événements orphelins...');
        const orphanQuery = `
            DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            WHERE OperatorCode IS NULL 
                OR OperatorCode = ''
                OR OperatorCode = '0'
                OR CodeLanctImprod IS NULL
                OR CodeLanctImprod = ''
        `;
        await executeQuery(orphanQuery);
        console.log('✅ Événements orphelins nettoyés');
        
        // 4. Statistiques finales
        console.log('4️⃣ Récupération des statistiques...');
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS] WHERE SessionStatus = 'ACTIVE') as activeSessions,
                (SELECT COUNT(*) FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]) as totalEvents,
                (SELECT COUNT(DISTINCT OperatorCode) FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] WHERE OperatorCode IS NOT NULL) as uniqueOperators
        `;
        const stats = await executeQuery(statsQuery);
        
        console.log('📊 === STATISTIQUES FINALES ===');
        console.log(`   Sessions actives: ${stats[0].activeSessions}`);
        console.log(`   Événements totaux: ${stats[0].totalEvents}`);
        console.log(`   Opérateurs uniques: ${stats[0].uniqueOperators}`);
        
        console.log('✅ === NETTOYAGE TERMINÉ AVEC SUCCÈS ===');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
        process.exit(1);
    }
}

// Exécuter le nettoyage si le script est appelé directement
if (require.main === module) {
    performFullCleanup()
        .then(() => {
            console.log('🎉 Script de nettoyage terminé');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = { performFullCleanup };
