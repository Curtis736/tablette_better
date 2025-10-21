// Routes pour la gestion des opérateurs
const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');
const TimeUtils = require('../utils/timeUtils');
const { authenticateOperator } = require('../middleware/auth');
const dataIsolation = require('../middleware/dataIsolation');
const secureQuery = require('../services/SecureQueryService');

// Fonction de nettoyage des données incohérentes
async function cleanupInconsistentData(operatorId) {
    try {
        console.log(`🧹 Nettoyage des données incohérentes pour l'opérateur ${operatorId}...`);
        
        // 1. Trouver tous les lancements de cet opérateur
        const operatorLancementsQuery = `
            SELECT DISTINCT CodeLanctImprod 
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            WHERE OperatorCode = @operatorId
        `;
        
        const operatorLancements = await executeQuery(operatorLancementsQuery, { operatorId });
        
        for (const lancement of operatorLancements) {
            const lancementCode = lancement.CodeLanctImprod;
            
            // 2. Vérifier s'il y a des événements avec d'autres OperatorCode pour ce lancement
            const inconsistentEventsQuery = `
                SELECT NoEnreg, OperatorCode, Ident, DateCreation
                FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
                WHERE CodeLanctImprod = @lancementCode 
                AND OperatorCode != @operatorId
            `;
            
            const inconsistentEvents = await executeQuery(inconsistentEventsQuery, { 
                lancementCode, 
                operatorId 
            });
            
            if (inconsistentEvents.length > 0) {
                console.log(`⚠️ Lancement ${lancementCode} a ${inconsistentEvents.length} événements incohérents:`);
                inconsistentEvents.forEach(e => {
                    console.log(`  - NoEnreg: ${e.NoEnreg}, OperatorCode: ${e.OperatorCode}, Ident: ${e.Ident}`);
                });
                
                // 3. Supprimer les événements incohérents
                const deleteQuery = `
                    DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
                    WHERE CodeLanctImprod = @lancementCode 
                    AND OperatorCode != @operatorId
                `;
                
                await executeQuery(deleteQuery, { lancementCode, operatorId });
                console.log(`✅ ${inconsistentEvents.length} événements incohérents supprimés pour ${lancementCode}`);
            }
        }
        
        console.log(`✅ Nettoyage terminé pour l'opérateur ${operatorId}`);
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    }
}

// Fonction utilitaire pour formater les dates/heures (format HH:mm seulement, fuseau horaire Paris)
function formatDateTime(dateTime) {
    if (!dateTime) return null;
    
    try {
        // Si c'est déjà au format HH:mm ou HH:mm:ss, le retourner directement
        if (typeof dateTime === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(dateTime)) {
            const parts = dateTime.split(':');
            return `${parts[0]}:${parts[1]}`; // Retourner juste HH:mm
        }
        
        // Si c'est un objet Date, extraire l'heure avec fuseau horaire français
        if (dateTime instanceof Date) {
            return dateTime.toLocaleTimeString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        }
        
        // Sinon, traiter comme une date complète
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) return null;
        
        return date.toLocaleTimeString('fr-FR', {
            timeZone: 'Europe/Paris',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        console.error('Erreur formatage date:', error);
        return null;
    }
}

// Fonction pour traiter les événements et créer l'historique des lancements
function processLancementEvents(events) {
    const lancementGroups = {};
    
    // Grouper les événements par lancement et opérateur
    events.forEach(event => {
        const key = `${event.CodeLanctImprod}_${event.OperatorCode}`;  // ✅ CORRECTION : Utiliser OperatorCode
        if (!lancementGroups[key]) {
            lancementGroups[key] = [];
        }
        lancementGroups[key].push(event);
    });
    
    const processedOperations = [];
    
    // Traiter chaque groupe de lancement
    Object.keys(lancementGroups).forEach(key => {
        const events = lancementGroups[key].sort((a, b) => new Date(a.DateCreation) - new Date(b.DateCreation));
        
        if (events.length === 0) return;
        
        const firstEvent = events[0];
        const lastEvent = events[events.length - 1];
        
        // Trouver les événements DEBUT et FIN
        const debutEvent = events.find(e => e.Ident === 'DEBUT');
        const finEvent = events.find(e => e.Ident === 'FIN');
        const pauseEvents = events.filter(e => e.Ident === 'PAUSE');
        const repriseEvents = events.filter(e => e.Ident === 'REPRISE');
        
        // Déterminer le statut actuel
        let status = 'En cours';
        if (finEvent) {
            status = 'Terminé';
        } else if (pauseEvents.length > repriseEvents.length) {
            // Il y a plus de pauses que de reprises, donc en pause
            status = 'En pause';
        }
        
        const operation = {
            id: firstEvent.NoEnreg,
            operatorCode: firstEvent.OperatorCode,  // ✅ CORRECTION : Utiliser OperatorCode au lieu de CodeRubrique
            lancementCode: firstEvent.CodeLanctImprod,
            article: firstEvent.Article || 'N/A',
            startTime: debutEvent && debutEvent.HeureDebut ? formatDateTime(debutEvent.HeureDebut) : null,
            endTime: finEvent && finEvent.HeureFin ? formatDateTime(finEvent.HeureFin) : null,
            status: status,
            phase: firstEvent.Phase || 'PRODUCTION',
            lastUpdate: lastEvent.DateCreation
        };
        
        processedOperations.push(operation);
    });
    
    // Trier par date du dernier événement (plus récent en premier)
    return processedOperations.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
}

// Fonction pour valider et récupérer les informations d'un lancement depuis LCTE
async function validateLancement(codeLancement) {
    try {
        console.log(`🔍 Validation du lancement ${codeLancement} dans LCTE...`);
        
        const query = `
            SELECT TOP 1 
                [CodeLancement],
                [CodeArticle],
                [DesignationLct1],
                [CodeModele],
                [DesignationArt1],
                [DesignationArt2]
            FROM [SEDI_ERP].[dbo].[LCTE]
            WHERE [CodeLancement] = '${codeLancement}'
        `;
        
        const result = await executeQuery(query);
        
        if (result && result.length > 0) {
            const lancement = result[0];
            console.log(`✅ Lancement ${codeLancement} trouvé:`, {
                CodeArticle: lancement.CodeArticle,
                DesignationLct1: lancement.DesignationLct1,
                CodeModele: lancement.CodeModele
            });
            return {
                valid: true,
                data: lancement
            };
        } else {
            console.log(`❌ Lancement ${codeLancement} non trouvé dans LCTE`);
            return {
                valid: false,
                error: `Le numéro de lancement ${codeLancement} n'existe pas dans la base de données`
            };
        }
    } catch (error) {
        console.error('❌ Erreur lors de la validation du lancement:', error);
        return {
            valid: false,
            error: 'Erreur lors de la validation du lancement'
        };
    }
}

// GET /api/operators/:code - Récupérer un opérateur par son code
router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        const query = `
            SELECT TOP 1
                Typeressource,
                Coderessource,
                Designation1
            FROM [SEDI_ERP].[dbo].[RESSOURC]
            WHERE Coderessource = @code
        `;
        
        const operators = await executeQuery(query, { code });
        
        if (operators.length === 0) {
            return res.status(404).json({ 
                error: 'Opérateur non trouvé' 
            });
        }
        
        const operator = operators[0];
        
        res.json({
            id: operator.Coderessource,
            code: operator.Coderessource,
            nom: operator.Designation1,
            type: operator.Typeressource,
            actif: true
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'opérateur:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            details: error.message 
        });
    }
});

// GET /api/operators - Récupérer tous les opérateurs
router.get('/', async (req, res) => {
    try {
        const { search, limit = 100 } = req.query;
        
        let query = `
            SELECT TOP ${limit}
                Typeressource,
                Coderessource,
                Designation1
            FROM [SEDI_ERP].[dbo].[RESSOURC]
            WHERE 1=1
        `;
        
        const params = {};
        
        // Filtre de recherche
        if (search) {
            query += ` AND (Coderessource LIKE @search OR Designation1 LIKE @search)`;
            params.search = `%${search}%`;
        }
        
        query += ` ORDER BY Coderessource`;
        
        const operators = await executeQuery(query, params);
        
        const formattedOperators = operators.map(operator => ({
            id: operator.Coderessource,
            code: operator.Coderessource,
            nom: operator.Designation1,
            type: operator.Typeressource,
            actif: true
        }));
        
        res.json(formattedOperators);
        
    } catch (error) {
        console.error('Erreur lors de la récupération des opérateurs:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            details: error.message 
        });
    }
});

// POST /api/operators/login - Connexion d'un opérateur avec session
router.post('/login', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ 
                error: 'Code opérateur requis' 
            });
        }
        
        // Vérifier l'existence de l'opérateur dans SEDI_ERP
        const operatorQuery = `
            SELECT TOP 1
                Typeressource,
                Coderessource,
                Designation1
            FROM [SEDI_ERP].[dbo].[RESSOURC]
            WHERE Coderessource = @code
        `;
        
        const operators = await executeQuery(operatorQuery, { code });
        
        if (operators.length === 0) {
            return res.status(401).json({ 
                error: 'Code opérateur invalide' 
            });
        }
        
        const operator = operators[0];
        
        // Fermer toute session active existante
        const closeActiveSessionQuery = `
            UPDATE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            SET LogoutTime = GETDATE(), SessionStatus = 'CLOSED'
            WHERE OperatorCode = @code AND SessionStatus = 'ACTIVE'
        `;
        
        await executeQuery(closeActiveSessionQuery, { code });
        
        // Créer une nouvelle session
        const createSessionQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            (OperatorCode, LoginTime, SessionStatus, DeviceInfo)
            VALUES (@code, GETDATE(), 'ACTIVE', @deviceInfo)
        `;
        
        const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
        await executeQuery(createSessionQuery, { code, deviceInfo });
        
        console.log(`✅ Session créée pour l'opérateur ${code}`);
        
        res.json({
            success: true,
            operator: {
                id: operator.Coderessource,
                code: operator.Coderessource,
                nom: operator.Designation1,
                type: operator.Typeressource,
                actif: true,
                sessionActive: true
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            details: error.message 
        });
    }
});

// POST /api/operators/logout - Déconnexion d'un opérateur
router.post('/logout', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({ 
                error: 'Code opérateur requis' 
            });
        }
        
        // Nettoyer les données incohérentes avant la déconnexion
        await cleanupInconsistentData(code);
        
        // Fermer la session active
        const logoutQuery = `
            UPDATE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            SET LogoutTime = GETDATE(), SessionStatus = 'CLOSED'
            WHERE OperatorCode = @code AND SessionStatus = 'ACTIVE'
        `;
        
        const result = await executeQuery(logoutQuery, { code });
        
        console.log(`✅ Session fermée pour l'opérateur ${code}`);
        
        res.json({
            success: true,
            message: 'Déconnexion réussie'
        });
        
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({ 
            error: 'Erreur interne du serveur',
            details: error.message 
        });
    }
});

// GET /api/operators/lancement/:code - Valider un lancement pour un opérateur
router.get('/lancement/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        console.log(`🔍 Validation du lancement ${code} pour opérateur...`);
        
        const validation = await validateLancement(code);
        
        if (validation.valid) {
            res.json({
                success: true,
                data: validation.data
            });
        } else {
            res.status(404).json({
                success: false,
                error: validation.error
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la validation du lancement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la validation du lancement'
        });
    }
});

// GET /api/operators/lancements/search - Rechercher des lancements pour un opérateur
router.get('/lancements/search', async (req, res) => {
    try {
        const { term, limit = 10 } = req.query;
        
        if (!term || term.length < 2) {
            return res.json({
                success: true,
                data: []
            });
        }
        
        console.log(`🔍 Recherche de lancements avec le terme: ${term}`);
        
        const searchTerm = `%${term}%`;
        const query = `
            SELECT TOP ${parseInt(limit)} 
                [CodeLancement],
                [CodeArticle],
                [DesignationLct1],
                [CodeModele],
                [DesignationArt1],
                [DesignationArt2]
            FROM [SEDI_ERP].[dbo].[LCTE]
            WHERE [CodeLancement] LIKE '${searchTerm}'
               OR [DesignationLct1] LIKE '${searchTerm}'
               OR [CodeArticle] LIKE '${searchTerm}'
            ORDER BY [CodeLancement]
        `;
        
        const result = await executeQuery(query);
        
        console.log(`✅ ${result.length} lancements trouvés`);
        
        res.json({
            success: true,
            data: result || []
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la recherche de lancements:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la recherche'
        });
    }
});

// Fonction de nettoyage rapide avant les opérations
async function quickCleanup() {
    try {
        // Nettoyer les sessions expirées rapidement
        const cleanupQuery = `
            DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            WHERE DateCreation < DATEADD(hour, -24, GETDATE())
        `;
        await executeQuery(cleanupQuery);
    } catch (error) {
        console.error('⚠️ Erreur lors du nettoyage rapide:', error);
    }
}

// POST /api/operators/start - Démarrer un lancement
router.post('/start', async (req, res) => {
    try {
        // Nettoyage rapide avant l'opération
        await quickCleanup();
        
        const { operatorId, lancementCode } = req.body;
        
        if (!operatorId || !lancementCode) {
            return res.status(400).json({
                success: false,
                error: 'operatorId et lancementCode requis'
            });
        }
        
        // Obtenir l'heure française actuelle
        const { time: currentTime, date: currentDate } = TimeUtils.getCurrentDateTime();
        
        TimeUtils.log(`🚀 Démarrage lancement ${lancementCode} par opérateur ${operatorId} à ${currentTime}`);
        
        // Valider le lancement dans LCTE
        const validation = await validateLancement(lancementCode);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }
        
        // Enregistrer l'événement DEBUT dans ABHISTORIQUE_OPERATEURS avec l'heure française
        const insertQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
            VALUES (
                '${operatorId}',
                '${lancementCode}',
                'PRODUCTION',
                'DEBUT',
                'PRODUCTION',
                'EN_COURS',
                CAST('${currentTime}' AS TIME),
                NULL,
                CAST('${currentDate}' AS DATE)
            )
        `;
        
        await executeQuery(insertQuery);
        
        console.log(`✅ Lancement ${lancementCode} démarré par opérateur ${operatorId}`);
        
        res.json({
            success: true,
            message: 'Lancement démarré avec succès',
            data: {
                operatorId,
                lancementCode,
                action: 'DEBUT',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error(' Erreur lors du démarrage:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors du démarrage'
        });
    }
});

// POST /api/operators/pause - Mettre en pause un lancement
router.post('/pause', async (req, res) => {
    try {
        const { operatorId, lancementCode } = req.body;
        
        if (!operatorId || !lancementCode) {
            return res.status(400).json({
                success: false,
                error: 'operatorId et lancementCode requis'
            });
        }
        
        // Obtenir l'heure française actuelle
        const { time: currentTime, date: currentDate } = TimeUtils.getCurrentDateTime();
        
        TimeUtils.log(`⏸️ Pause lancement ${lancementCode} par opérateur ${operatorId} à ${currentTime}`);
        
        // Enregistrer l'événement PAUSE dans ABHISTORIQUE_OPERATEURS avec l'heure française
        const insertQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
            VALUES (
                '${operatorId}',
                '${lancementCode}',
                'PRODUCTION',
                'PAUSE',
                'PRODUCTION',
                'EN_PAUSE',
                CAST('${currentTime}' AS TIME),
                NULL,
                CAST('${currentDate}' AS DATE)
            )
        `;
        
        await executeQuery(insertQuery);
        
        console.log(` Lancement ${lancementCode} mis en pause par opérateur ${operatorId}`);
        
        res.json({
            success: true,
            message: 'Lancement mis en pause',
            data: {
                operatorId,
                lancementCode,
                action: 'PAUSE',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la pause:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la pause'
        });
    }
});

// POST /api/operators/resume - Reprendre un lancement
router.post('/resume', async (req, res) => {
    try {
        const { operatorId, lancementCode } = req.body;
        
        if (!operatorId || !lancementCode) {
            return res.status(400).json({
                success: false,
                error: 'operatorId et lancementCode requis'
            });
        }
        
        // Obtenir l'heure française actuelle
        const { time: currentTime, date: currentDate } = TimeUtils.getCurrentDateTime();
        
        TimeUtils.log(`▶️ Reprise lancement ${lancementCode} par opérateur ${operatorId} à ${currentTime}`);
        
        // Enregistrer l'événement REPRISE dans ABHISTORIQUE_OPERATEURS avec l'heure française
        const insertQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
            VALUES (
                '${operatorId}',
                '${lancementCode}',
                'PRODUCTION',
                'REPRISE',
                'PRODUCTION',
                'EN_COURS',
                CAST('${currentTime}' AS TIME),
                NULL,
                CAST('${currentDate}' AS DATE)
            )
        `;
        
        await executeQuery(insertQuery);
        
        console.log(` Lancement ${lancementCode} repris par opérateur ${operatorId}`);
        
        res.json({
            success: true,
            message: 'Lancement repris',
            data: {
                operatorId,
                lancementCode,
                action: 'REPRISE',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error(' Erreur lors de la reprise:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la reprise'
        });
    }
});

// POST /api/operators/stop - Terminer un lancement
router.post('/stop', async (req, res) => {
    try {
        const { operatorId, lancementCode } = req.body;
        
        if (!operatorId || !lancementCode) {
            return res.status(400).json({
                success: false,
                error: 'operatorId et lancementCode requis'
            });
        }
        
        // Obtenir l'heure française actuelle
        const { time: currentTime, date: currentDate } = TimeUtils.getCurrentDateTime();
        
        TimeUtils.log(`🏁 Arrêt lancement ${lancementCode} par opérateur ${operatorId} à ${currentTime}`);
        
        // Enregistrer l'événement FIN dans ABHISTORIQUE_OPERATEURS avec l'heure française
        const insertQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
            VALUES (
                '${operatorId}',
                '${lancementCode}',
                'PRODUCTION',
                'FIN',
                'PRODUCTION',
                'TERMINE',
                NULL,
                CAST('${currentTime}' AS TIME),
                CAST('${currentDate}' AS DATE)
            )
        `;
        
        await executeQuery(insertQuery);
        
        console.log(` Lancement ${lancementCode} terminé par opérateur ${operatorId}`);
        
        res.json({
            success: true,
            message: 'Lancement terminé avec succès',
            data: {
                operatorId,
                lancementCode,
                action: 'FIN',
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error(' Erreur lors de l\'arrêt:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de l\'arrêt'
        });
    }
});

// GET /api/operators/:operatorCode/operations - Récupérer l'historique d'un opérateur
router.get('/:operatorCode/operations', 
    dataIsolation.logAccessAttempt,
    dataIsolation.validateDataAccess,
    dataIsolation.filterDataByOperator,
    authenticateOperator, 
    async (req, res) => {
    try {
        const { operatorCode } = req.params;
        
        console.log(`🔍 Récupération de l'historique pour l'opérateur ${operatorCode}...`);
        
        // Récupérer tous les événements de cet opérateur depuis ABHISTORIQUE_OPERATEURS avec la phase depuis abetemps
        const eventsQuery = `
            SELECT 
                h.NoEnreg,
                h.Ident,
                h.CodeLanctImprod,
                COALESCE(
                    (SELECT TOP 1 a.Phase 
                     FROM [SEDI_ERP].[GPSQL].[abetemps] a 
                     WHERE a.CodeLanctImprod = h.CodeLanctImprod 
                     ORDER BY a.NoEnreg DESC), 
                    h.Phase, 
                    'PRODUCTION'
                ) as Phase,
                h.OperatorCode,
                h.CodeRubrique,
                h.Statut,
                h.HeureDebut,
                h.HeureFin,
                h.DateCreation,
                l.DesignationLct1 as Article,
                l.DesignationLct2 as ArticleDetail
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON l.CodeLancement = h.CodeLanctImprod
            WHERE h.OperatorCode = @operatorCode
            ORDER BY h.DateCreation DESC, h.NoEnreg DESC
        `;
        
        const events = await executeQuery(eventsQuery, { operatorCode });
        console.log(`📊 ${events.length} événements trouvés pour l'opérateur ${operatorCode}`);
        
        // Utiliser la fonction qui garde les pauses séparées
        const { processLancementEventsWithPauses } = require('./admin');
        const formattedOperations = processLancementEventsWithPauses(events).map(operation => ({
            id: operation.id,
            operatorCode: operation.operatorCode,
            lancementCode: operation.lancementCode,
            article: operation.article,
            startTime: operation.startTime,
            endTime: operation.endTime,
            status: operation.status,
            statusCode: operation.statusCode || (operation.status === 'Terminé' ? 'TERMINE' : 
                       operation.status === 'En pause' ? 'PAUSE' : 'EN_COURS'),
            phase: operation.phase,
            type: operation.type // Ajouter le type pour distinguer les pauses
        }));
        
        res.json({
            success: true,
            operations: formattedOperations,
            count: formattedOperations.length
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'historique opérateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de l\'historique'
        });
    }
});

// GET /api/operations/current/:operatorCode - Récupérer l'opération en cours d'un opérateur
router.get('/current/:operatorCode', authenticateOperator, async (req, res) => {
    try {
        const { operatorCode } = req.params;
        
        console.log(`🔍 Recherche d'opération en cours pour l'opérateur ${operatorCode}...`);
        
        // Chercher la dernière opération non terminée
        const query = `
            SELECT TOP 1
                h.CodeLanctImprod,
                h.Ident,
                h.Statut,
                h.HeureDebut,
                h.DateCreation,
                l.DesignationLct1 as Article
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON l.CodeLancement = h.CodeLanctImprod
            WHERE h.OperatorCode = @operatorCode
              AND h.Statut IN ('EN_COURS', 'EN_PAUSE')
            ORDER BY h.DateCreation DESC, h.NoEnreg DESC
        `;
        
        const result = await executeQuery(query, { operatorCode });
        
        if (result.length === 0) {
            return res.json({
                success: true,
                data: null
            });
        }
        
        const operation = result[0];
        
        res.json({
            success: true,
            data: {
                lancementCode: operation.CodeLanctImprod,
                article: operation.Article || 'N/A',
                status: operation.Statut,
                startTime: operation.HeureDebut ? formatDateTime(operation.HeureDebut) : null,
                lastEvent: operation.Ident
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'opération en cours:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de l\'opération en cours'
        });
    }
});

// Route pour récupérer les informations d'un opérateur spécifique
router.get('/:operatorCode', authenticateOperator, async (req, res) => {
    const { operatorCode } = req.params;
    
    try {
        // Récupérer les informations de l'opérateur
        const operatorQuery = `
            SELECT 
                r.Coderessource,
                r.Designation1,
                r.Typeressource,
                s.SessionId,
                s.LoginTime,
                s.SessionStatus,
                s.DeviceInfo
            FROM [SEDI_ERP].[dbo].[RESSOURC] r
            LEFT JOIN [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS] s 
                ON r.Coderessource = s.OperatorCode 
                AND s.SessionStatus = 'ACTIVE'
                AND CAST(s.DateCreation AS DATE) = CAST(GETDATE() AS DATE)
            WHERE r.Coderessource = @operatorCode
        `;
        
        const result = await executeQuery(operatorQuery, { operatorCode });
        
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }
        
        const operator = result[0];
        
        res.json({
            success: true,
            data: {
                id: operator.Coderessource,
                code: operator.Coderessource,
                name: operator.Designation1,
                type: operator.Typeressource,
                sessionId: operator.SessionId,
                loginTime: operator.LoginTime,
                sessionStatus: operator.SessionStatus,
                deviceInfo: operator.DeviceInfo,
                hasActiveSession: !!operator.SessionId
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'opérateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de l\'opérateur'
        });
    }
});

module.exports = router;