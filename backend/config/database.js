const sql = require('mssql');

// Configuration de la base de données SQL Server
const config = {
    server: process.env.DB_SERVER || 'SERVEURERP',
    database: process.env.DB_DATABASE || 'SEDI_ERP',
    user: process.env.DB_USER || 'QUALITE',
    password: process.env.DB_PASSWORD || 'QUALITE',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true' || false,
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true,
        enableArithAbort: true,
        requestTimeout: 30000,
        connectionTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Pool de connexions
let pool = null;

// Fonction pour obtenir une connexion
async function getConnection() {
    try {
        if (!pool) {
            pool = await sql.connect(config);
            console.log(' Connexion à la base de données établie');
        }
        return pool;
    } catch (error) {
        console.error(' Erreur de connexion à la base de données:', error);
        throw error;
    }
}

// Fonction pour exécuter une requête
async function executeQuery(query, params = {}) {
    const pool = await getConnection();
    try {
        const request = pool.request();
        
        // Ajouter les paramètres
        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        
        const result = await request.query(query);
        return result.recordset;
    } catch (error) {
        console.error(' Erreur lors de l\'exécution de la requête:', error);
        throw error;
    }
}

// Fonction pour exécuter une procédure stockée
async function executeProcedure(procedureName, params = {}) {
    const pool = await getConnection();
    try {
        const request = pool.request();
        
        // Ajouter les paramètres
        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        
        const result = await request.execute(procedureName);
        return result.recordset;
    } catch (error) {
        console.error(' Erreur lors de l\'exécution de la procédure:', error);
        throw error;
    }
}

// Exécuter une commande non séléctive (INSERT/UPDATE/DELETE) et retourner rowsAffected
async function executeNonQuery(query, params = {}) {
    const pool = await getConnection();
    try {
        const request = pool.request();
        Object.keys(params).forEach(key => {
            request.input(key, params[key]);
        });
        const result = await request.query(query);
        // mssql retourne un tableau rowsAffected par commande
        const affected = Array.isArray(result.rowsAffected) ? result.rowsAffected.reduce((a, b) => a + b, 0) : (result.rowsAffected || 0);
        return {
            rowsAffected: affected
        };
    } catch (error) {
        console.error(' Erreur lors de l\'exécution de la commande:', error);
        throw error;
    }
}

// Fonction pour fermer la connexion
async function closeConnection() {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('🔌 Connexion à la base de données fermée');
    }
}

// Gestion des erreurs de connexion
sql.on('error', (err) => {
    console.error(' Erreur SQL Server:', err);
});

module.exports = {
    config,
    getConnection,
    executeQuery,
    executeProcedure,
    executeNonQuery,
    closeConnection,
    sql
};
