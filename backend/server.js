const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const dbConfig = require('./config/database');
const operatorRoutes = require('./routes/operators');
const lancementRoutes = require('./routes/lancements');
const operationRoutes = require('./routes/operations');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet());

// Ensure CORS headers are present on all responses (including errors)
// and reply to OPTIONS preflight requests even if later middleware/errors occur.
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        // Echo back the origin so browsers accept credentialed responses
        res.setHeader('Access-Control-Allow-Origin', origin);
        // Inform caches that response varies by origin
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
        // short-circuit preflight
        return res.status(204).end();
    }

    next();
});

app.use(cors({
    origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://192.168.1.26:8080',
        'http://192.168.1.26:3001',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
}));

// Rate limiting - plus permissif en développement
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 en prod, 1000 en dev
    message: {
        error: 'Trop de requêtes, veuillez patienter',
        retryAfter: Math.ceil(15 * 60 * 1000 / 1000) // en secondes
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting pour les requêtes de santé
        return req.path === '/api/health';
    }
});
app.use(limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Rate limiting spécifique pour les routes admin (plus permissif)
const adminLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 200 : 500, // 200 en prod, 500 en dev
    message: {
        error: 'Trop de requêtes admin, veuillez patienter',
        retryAfter: 60
    },
    skip: (req) => {
        // Skip pour les requêtes de santé et les requêtes de lecture
        return req.path === '/api/health' || req.method === 'GET';
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/lancements', lancementRoutes);
app.use('/api/operations', operationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// Route de santé
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Route racine
app.get('/', (req, res) => {
    res.json({ 
        message: 'SEDI Tablette API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            operators: '/api/operators',
            lancements: '/api/lancements',
            operations: '/api/operations',
            comments: '/api/comments',
            admin: '/api/admin'
        }
    });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint non trouvé',
        path: req.originalUrl
    });
});

// Gestion globale des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Erreur interne du serveur' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Démarrage du serveur (seulement si ce n'est pas un test)
// Vérifier NODE_ENV au moment de l'exécution, pas de l'import
const shouldStartServer = () => {
    // Ne pas démarrer le serveur si NODE_ENV est 'test' ou si on est dans un contexte de test
    return process.env.NODE_ENV !== 'test' && 
           process.env.NODE_ENV !== 'testing' &&
           !process.env.JEST_WORKER_ID && // Jest utilise cette variable
           !process.argv.some(arg => arg.includes('jest')); // Vérifier si jest est dans les arguments
};

// Stocker la référence du serveur pour pouvoir le fermer proprement
let server = null;

// Fonction de nettoyage automatique
async function performStartupCleanup() {
    try {
        console.log('🧹 Nettoyage automatique au démarrage...');
        
        // Nettoyer les sessions expirées
        const { executeQuery } = require('./config/database');
        const cleanupSessionsQuery = `
            DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            WHERE DateCreation < DATEADD(hour, -24, GETDATE())
        `;
        await executeQuery(cleanupSessionsQuery);
        console.log('✅ Sessions expirées nettoyées');
        
        // Nettoyer les doublons d'opérations
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
        
        console.log('✅ Nettoyage automatique terminé');
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage automatique:', error);
    }
}

// Fonction de nettoyage périodique (toutes les heures)
function startPeriodicCleanup() {
    setInterval(async () => {
        try {
            console.log('🧹 Nettoyage périodique...');
            await performStartupCleanup();
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage périodique:', error);
        }
    }, 60 * 60 * 1000); // Toutes les heures
}

if (shouldStartServer()) {
    server = app.listen(PORT, async () => {
        console.log(`🚀 Serveur SEDI Tablette démarré sur le port ${PORT}`);
        console.log(`📊 Interface admin: http://localhost:${PORT}/api/admin`);
        console.log(`🔍 Santé: http://localhost:${PORT}/api/health`);
        
        // Effectuer le nettoyage automatique au démarrage
        await performStartupCleanup();
        
        // Démarrer le nettoyage périodique
        startPeriodicCleanup();
    });
} else {
    console.log('🧪 Mode test détecté - Serveur non démarré');
}

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
    console.log('🛑 Arrêt du serveur...');
    if (server) {
        server.close(() => {
            console.log('✅ Serveur fermé proprement');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGINT', () => {
    console.log('🛑 Arrêt du serveur...');
    if (server) {
        server.close(() => {
            console.log('✅ Serveur fermé proprement');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Fonction pour fermer le serveur proprement (utile pour les tests)
const closeServer = () => {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => {
                console.log('✅ Serveur fermé proprement');
                resolve();
            });
        } else {
            resolve();
        }
    });
};

module.exports = { app, closeServer };
