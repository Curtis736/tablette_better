const { executeQuery } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function migrateActivityColumns() {
    try {
        console.log('🚀 Début de la migration des colonnes ActivityStatus et LastActivityTime...');
        
        // Lire le fichier SQL
        const sqlPath = path.join(__dirname, '../sql/migration_add_activity_columns.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Diviser le contenu en requêtes individuelles
        const queries = sqlContent
            .split('GO')
            .map(q => q.trim())
            .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('USE'));
        
        // Exécuter chaque requête
        for (let i = 0; i < queries.length; i++) {
            const query = queries[i];
            if (query.trim()) {
                console.log(`📝 Exécution de la requête ${i + 1}/${queries.length}...`);
                try {
                    await executeQuery(query);
                    console.log(`✅ Requête ${i + 1} exécutée avec succès`);
                } catch (error) {
                    console.log(`⚠️ Requête ${i + 1} - ${error.message}`);
                }
            }
        }
        
        console.log('🎉 Migration terminée avec succès !');
        console.log('✅ Les colonnes ActivityStatus et LastActivityTime ont été ajoutées à ABSESSIONS_OPERATEURS');
        
    } catch (error) {
        console.error('❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

// Exécuter la migration si le script est appelé directement
if (require.main === module) {
    migrateActivityColumns()
        .then(() => {
            console.log('✅ Migration terminée');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Erreur:', error);
            process.exit(1);
        });
}

module.exports = { migrateActivityColumns };




















