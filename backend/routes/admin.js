const express = require('express');
const { executeQuery } = require('../config/database');
const moment = require('moment');
const router = express.Router();

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
            console.log(` Lancement ${codeLancement} trouvé:`, {
                CodeArticle: lancement.CodeArticle,
                DesignationLct1: lancement.DesignationLct1,
                CodeModele: lancement.CodeModele
            });
            return {
                valid: true,
                data: lancement
            };
        } else {
            console.log(` Lancement ${codeLancement} non trouvé dans LCTE`);
            return {
                valid: false,
                error: `Le numéro de lancement ${codeLancement} n'existe pas dans la base de données`
            };
        }
    } catch (error) {
        console.error(' Erreur lors de la validation du lancement:', error);
        return {
            valid: false,
            error: 'Erreur lors de la validation du lancement'
        };
    }
}

// Fonction pour formater une date en HH:mm
function formatDateTime(dateTime) {
    if (!dateTime) return null;
    
    try {
        let date;
        
        // Si c'est déjà une chaîne au format HH:mm ou HH:mm:ss, la retourner directement
        if (typeof dateTime === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(dateTime)) {
            const parts = dateTime.split(':');
            return `${parts[0]}:${parts[1]}`;
        }
        
        // Sinon, essayer de créer un objet Date
        date = new Date(dateTime);
        if (isNaN(date.getTime())) {
            console.warn('Date invalide:', dateTime);
            return null;
        }
        
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (error) {
        console.error('Erreur formatage date:', dateTime, error);
        return null;
    }
}

// Fonction pour calculer la durée entre deux dates en minutes
function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) return null;
    
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
        
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 0) return null;
        
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        
        if (hours > 0) {
            return `${hours}h${minutes.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}min`;
        }
    } catch (error) {
        console.error('Erreur calcul durée:', error);
        return null;
    }
}

// Fonction pour consolider les temps d'un lancement terminé dans ABTEMPS_OPERATEURS
async function consolidateLancementTimes(operatorCode, lancementCode) {
    try {
        console.log(` Consolidation des temps pour ${operatorCode}/${lancementCode}...`);

        // Récupérer tous les événements de ce lancement
        const eventsQuery = `
            SELECT * FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            WHERE CodeRubrique = @operatorCode AND CodeLanctImprod = @lancementCode
            ORDER BY DateCreation ASC
        `;

        const events = await executeQuery(eventsQuery, { operatorCode, lancementCode });

        if (events.length === 0) return;

        // Trouver les événements clés
        const debutEvent = events.find(e => e.Ident === 'DEBUT');
        const finEvent = events.find(e => e.Ident === 'FIN');

        if (!debutEvent || !finEvent) return; // Lancement pas encore terminé

        // Calculer les durées en utilisant HeureDebut et HeureFin
        if (!debutEvent.HeureDebut || !finEvent.HeureFin) return; // Heures manquantes
        
        // Créer des objets Date pour aujourd'hui avec les heures
        const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
        const startTime = new Date(`${today}T${debutEvent.HeureDebut}`);
        const endTime = new Date(`${today}T${finEvent.HeureFin}`);
        const totalDuration = Math.floor((endTime - startTime) / (1000 * 60)); // en minutes

        // Calculer le temps de pause
        const pauseEvents = events.filter(e => e.Ident === 'PAUSE');
        const repriseEvents = events.filter(e => e.Ident === 'REPRISE');
        
        let pauseDuration = 0;
        for (let i = 0; i < Math.min(pauseEvents.length, repriseEvents.length); i++) {
            const pauseStart = new Date(pauseEvents[i].DateCreation);
            const pauseEnd = new Date(repriseEvents[i].DateCreation);
            pauseDuration += Math.floor((pauseEnd - pauseStart) / (1000 * 60));
        }

        const productiveDuration = totalDuration - pauseDuration;

        // Vérifier si déjà consolidé
        const existingQuery = `
            SELECT COUNT(*) as count FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]
            WHERE OperatorCode = @operatorCode AND LancementCode = @lancementCode
        `;

        const existing = await executeQuery(existingQuery, { operatorCode, lancementCode });

        if (existing[0].count > 0) {
            console.log(`⚠️ Temps déjà consolidés pour ${operatorCode}/${lancementCode}`);
            return;
        }

        // Insérer dans ABTEMPS_OPERATEURS
        const insertQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]
            (OperatorCode, LancementCode, StartTime, EndTime, TotalDuration, PauseDuration, ProductiveDuration, EventsCount)
            VALUES (@operatorCode, @lancementCode, @startTime, @endTime, @totalDuration, @pauseDuration, @productiveDuration, @eventsCount)
        `;

        await executeQuery(insertQuery, {
            operatorCode,
            lancementCode,
            startTime: debutEvent.DateCreation,
            endTime: finEvent.DateCreation,
            totalDuration,
            pauseDuration,
            productiveDuration,
            eventsCount: events.length
        });

        console.log(` Temps consolidés pour ${operatorCode}/${lancementCode}: ${totalDuration}min (${productiveDuration}min productif)`);

    } catch (error) {
        console.error(' Erreur consolidation temps:', error);
    }
}

// Fonction pour regrouper les événements par lancement et calculer les temps
function processLancementEvents(events) {
    const lancementGroups = {};
    
    // Regrouper par CodeLanctImprod et CodeRubrique
    events.forEach(event => {
        const key = `${event.CodeLanctImprod}_${event.CodeRubrique}`;
        if (!lancementGroups[key]) {
            lancementGroups[key] = [];
        }
        lancementGroups[key].push(event);
    });
    
    const processedLancements = [];
    
    Object.keys(lancementGroups).forEach(key => {
        const groupEvents = lancementGroups[key].sort((a, b) => 
            new Date(a.DateCreation) - new Date(b.DateCreation)
        );
        
        // Trouver les événements clés
        const debutEvent = groupEvents.find(e => e.Ident === 'DEBUT');
        const finEvent = groupEvents.find(e => e.Ident === 'FIN');
        const pauseEvents = groupEvents.filter(e => e.Ident === 'PAUSE');
        const repriseEvents = groupEvents.filter(e => e.Ident === 'REPRISE');
        
        // Déterminer le statut actuel
        let currentStatus = 'EN_COURS';
        let statusLabel = 'En cours';
        
        if (finEvent) {
            currentStatus = 'TERMINE';
            statusLabel = 'Terminé';
        } else if (pauseEvents.length > repriseEvents.length) {
            currentStatus = 'PAUSE';
            statusLabel = 'En pause';
        }
        
        // Calculer les temps
        const startTime = debutEvent ? formatDateTime(debutEvent.DateCreation) : null;
        const endTime = finEvent ? formatDateTime(finEvent.DateCreation) : null;
        const duration = (debutEvent && finEvent) ? 
            calculateDuration(debutEvent.DateCreation, finEvent.DateCreation) : null;
        
        // Calculer le temps de pause total
        let totalPauseTime = 0;
        for (let i = 0; i < Math.min(pauseEvents.length, repriseEvents.length); i++) {
            const pauseStart = new Date(pauseEvents[i].DateCreation);
            const pauseEnd = new Date(repriseEvents[i].DateCreation);
            if (!isNaN(pauseStart.getTime()) && !isNaN(pauseEnd.getTime())) {
                totalPauseTime += pauseEnd.getTime() - pauseStart.getTime();
            }
        }
        
        const pauseDuration = totalPauseTime > 0 ? 
            Math.floor(totalPauseTime / (1000 * 60)) + 'min' : null;
        
        // Utiliser le dernier événement pour les infos générales
        const lastEvent = groupEvents[groupEvents.length - 1];
        
        processedLancements.push({
            id: lastEvent.NoEnreg,
            operatorId: lastEvent.CodeRubrique,
            lancementCode: lastEvent.CodeLanctImprod,
            phase: lastEvent.Phase,
            startTime: startTime,
            endTime: endTime,
            pauseTime: pauseEvents.length > 0 ? formatDateTime(pauseEvents[0].DateCreation) : null,
            duration: duration,
            pauseDuration: pauseDuration,
            status: statusLabel,
            statusCode: currentStatus,
            generalStatus: currentStatus,
            events: groupEvents.length,
            lastUpdate: lastEvent.DateCreation
        });
    });
    
    return processedLancements.sort((a, b) => 
        new Date(b.lastUpdate) - new Date(a.lastUpdate)
    );
}

// GET /api/admin - Route racine admin
router.get('/', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || moment().format('YYYY-MM-DD');
        
        // Récupérer les statistiques
        const stats = await getAdminStats(targetDate);
        
        // Récupérer les opérations
        const operations = await getAdminOperations(targetDate);
        
        res.json({
            stats,
            operations,
            date: targetDate
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des données admin:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des données admin' 
        });
    }
});

// GET /api/admin/operations - Récupérer les opérations pour l'interface admin
router.get('/operations', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || moment().format('YYYY-MM-DD');
        
        // Éviter le cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const operations = await getAdminOperations(targetDate);
        console.log('🎯 Envoi des opérations admin:', operations.length, 'éléments');
        res.json(operations);
        
    } catch (error) {
        console.error('Erreur lors de la récupération des opérations:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des opérations' 
        });
    }
});

// GET /api/admin/stats - Récupérer uniquement les statistiques
router.get('/stats', async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || moment().format('YYYY-MM-DD');
        
        const stats = await getAdminStats(targetDate);
        res.json(stats);
        
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des statistiques' 
        });
    }
});

// GET /api/admin/export/:format - Exporter les données
router.get('/export/:format', async (req, res) => {
    try {
        const { format } = req.params;
        const { date } = req.query;
        const targetDate = date || moment().format('MM-DD');
        
        if (format !== 'csv') {
            return res.status(400).json({ 
                error: 'Format non supporté. Utilisez csv.' 
            });
        }
        
        const operations = await getAdminOperations(targetDate);
        
        // Générer CSV
        const csvHeader = 'ID,Opérateur,Code Lancement,Article,Date,Statut\n';
        const csvData = operations.map(op => 
            `${op.id},"${op.operatorName}","${op.lancementCode}","${op.article}","${op.startTime}","${op.status}"`
        ).join('\n');
        
            res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="operations-${targetDate}.csv"`);
        res.send(csvHeader + csvData);
        
    } catch (error) {
        console.error('Erreur lors de l\'export des données:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'export des données' 
        });
    }
});

// Fonction pour récupérer les statistiques avec les vraies tables
async function getAdminStats(date) {
    try {
        // Compter les opérateurs connectés depuis ABSESSIONS_OPERATEURS
        const operatorsQuery = `
            SELECT COUNT(DISTINCT OperatorCode) as totalOperators
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            WHERE SessionStatus = 'ACTIVE'
        `;
        
        // Récupérer tous les événements depuis ABHISTORIQUE_OPERATEURS
        const eventsQuery = `
        SELECT 
                CodeLanctImprod,
                CodeRubrique,
                Ident,
                DateCreation
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            ORDER BY DateCreation ASC
        `;
        
        const [operatorStats, events] = await Promise.all([
            executeQuery(operatorsQuery),
            executeQuery(eventsQuery)
        ]);
        
        // Traiter les événements pour calculer les statuts
        const processedLancements = processLancementEvents(events || []);
        
        // Compter par statut
        const activeLancements = processedLancements.filter(l => l.status === 'En cours').length;
        const pausedLancements = processedLancements.filter(l => l.status === 'En pause').length;
        const completedLancements = processedLancements.filter(l => l.status === 'Terminé').length;
    
    return {
            totalOperators: operatorStats[0]?.totalOperators || 0,
            activeLancements: activeLancements,
            pausedLancements: pausedLancements,
            completedLancements: completedLancements
        };
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
    return {
            totalOperators: 0,
            activeLancements: 0,
            pausedLancements: 0,
            completedLancements: 0
        };
    }
}

// Fonction pour récupérer les opérations basées sur les événements ABHISTORIQUE_OPERATEURS
async function getAdminOperations(date) {
    try {
        console.log('🔍 Récupération des événements depuis ABHISTORIQUE_OPERATEURS...');

        // Récupérer tous les événements depuis ABHISTORIQUE_OPERATEURS
        const eventsQuery = `
        SELECT 
                h.NoEnreg,
                h.Ident,
                h.CodeLanctImprod,
                h.Phase,
                h.CodeRubrique,
                h.Statut,
                h.HeureDebut,
                h.HeureFin,
                h.DateCreation,
            r.Designation1 as operatorName,
                l.DesignationLct1 as Article,
                l.DesignationLct2 as ArticleDetail
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            LEFT JOIN [SEDI_ERP].[dbo].[RESSOURC] r ON h.CodeRubrique = r.Coderessource
            LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON l.CodeLancement = h.CodeLanctImprod
            ORDER BY h.DateCreation DESC
        `;
    
        console.log('Exécution de la requête événements...');
        const allEvents = await executeQuery(eventsQuery);

        console.log('Résultats:', allEvents.length, 'événements trouvés');
        
        // Afficher chaque événement comme une ligne séparée (pas de regroupement)
        const formattedOperations = allEvents.map(event => {
            // Déterminer le statut et les heures selon l'événement
            let status = 'En cours';
            let statusCode = 'EN_COURS';
            let startTime = null;
            let endTime = null;
            
            // Debug pour voir les valeurs des heures
            console.log(`Debug événement ${event.Ident}:`, {
                HeureDebut: event.HeureDebut,
                HeureFin: event.HeureFin,
                DateCreation: event.DateCreation
            });
            
            switch(event.Ident) {
                case 'DEBUT':
                    status = 'Démarré';
                    statusCode = 'DEBUT';
                    // Utiliser HeureDebut si disponible, sinon extraire l'heure de DateCreation
                    startTime = event.HeureDebut ? formatDateTime(event.HeureDebut) : 
                               (event.DateCreation ? formatDateTime(event.DateCreation) : null);
                    break;
                case 'PAUSE':
                    status = 'En pause';
                    statusCode = 'PAUSE';
                    startTime = event.HeureDebut ? formatDateTime(event.HeureDebut) : 
                               (event.DateCreation ? formatDateTime(event.DateCreation) : null);
                    // Pour les pauses, on affiche l'heure de pause dans endTime aussi
                    endTime = startTime;
                    break;
                case 'REPRISE':
                    status = 'Repris';
                    statusCode = 'REPRISE';
                    startTime = event.HeureDebut ? formatDateTime(event.HeureDebut) : 
                               (event.DateCreation ? formatDateTime(event.DateCreation) : null);
                    break;
                case 'FIN':
                    status = 'Terminé';
                    statusCode = 'TERMINE';
                    endTime = event.HeureFin ? formatDateTime(event.HeureFin) : 
                             (event.DateCreation ? formatDateTime(event.DateCreation) : null);
                    break;
            }
            
            return {
                id: event.NoEnreg,
                operatorId: event.CodeRubrique,
                operatorName: event.operatorName || 'Non assigné',
                lancementCode: event.CodeLanctImprod,
                article: event.Article || 'N/A',
                articleDetail: event.ArticleDetail || '',
                startTime: startTime,
                endTime: endTime,
                pauseTime: null, // Pas de calcul de pause pour les événements individuels
                duration: null, // Pas de calcul de durée pour les événements individuels
                pauseDuration: null,
                status: status,
                statusCode: statusCode,
                generalStatus: statusCode,
                events: 1, // Chaque ligne représente un événement
                editable: true
            };
        });

        console.log('🎯 Envoi de', formattedOperations.length, 'événements individuels');
        return formattedOperations;

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des opérations:', error);
        return [];
    }
}

// PUT /api/admin/operations/:id - Modifier une opération
router.put('/operations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { operatorName, lancementCode, article, startTime, endTime } = req.body;
        
        console.log(`🔧 Modification opération ${id}:`, req.body);
        
        // Construire la requête de mise à jour dynamiquement
        const updateFields = [];
        const params = { id: parseInt(id) };
        
        // Seules les heures sont modifiables
        if (startTime !== undefined) {
            updateFields.push('HeureDebut = @startTime');
            params.startTime = startTime ? new Date(startTime) : null;
        }
        
        if (endTime !== undefined) {
            updateFields.push('HeureFin = @endTime');
            params.endTime = endTime ? new Date(endTime) : null;
        }
        
        // Ignorer les autres champs
        if (operatorName !== undefined || lancementCode !== undefined || article !== undefined) {
            console.log('⚠️ Seules les heures peuvent être modifiées');
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Aucun champ à mettre à jour' 
            });
        }
        
        const updateQuery = `
            UPDATE [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            SET ${updateFields.join(', ')}
            WHERE NoEnreg = @id
        `;
        
        await executeQuery(updateQuery, params);
        
        console.log(`✅ Opération ${id} modifiée avec succès`);
        
        res.json({
            success: true,
            message: 'Opération modifiée avec succès',
            id: id
        });
        
    } catch (error) {
        console.error('Erreur lors de la modification:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la modification de l\'opération'
        });
    }
});

// POST /api/admin/operations - Ajouter une nouvelle opération
router.post('/operations', async (req, res) => {
    try {
        const { operatorId, lancementCode, startTime, status = 'DEBUT', phase = '' } = req.body;
        
        console.log('=== AJOUT NOUVELLE OPERATION ===');
        console.log('Données reçues:', req.body);
        
        // Valider le numéro de lancement dans LCTE
        const validation = await validateLancement(lancementCode);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }
        
        console.log('✅ Lancement validé:', validation.data);
        
        // Insérer dans ABHISTORIQUE_OPERATEURS
        const insertQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
            VALUES (
                '${operatorId}',
                '${lancementCode}',
                '${phase || 'ADMIN'}',
                '${status}',
                '${phase || 'ADMIN'}',
                '${status === 'DEBUT' ? 'EN_COURS' : status === 'FIN' ? 'TERMINE' : status}',
                ${status === 'DEBUT' ? 'CAST(GETDATE() AS TIME)' : 'NULL'},
                ${status === 'FIN' ? 'CAST(GETDATE() AS TIME)' : 'NULL'},
                CAST(GETDATE() AS DATE)
            )
        `;
        
        console.log('Requête SQL à exécuter:');
        console.log(insertQuery);
        
        await executeQuery(insertQuery);
        
        console.log('✅ Opération ajoutée avec succès dans ABHISTORIQUE_OPERATEURS');
        
        // Si c'est une fin de lancement, consolider les temps
        if (status === 'FIN' || status === 'TERMINE') {
            await consolidateLancementTimes(operatorId, lancementCode);
        }
        
        res.json({
            success: true,
            message: 'Opération ajoutée avec succès',
            data: {
                operatorId,
                lancementCode,
                phase,
                lancementInfo: validation.data
            }
        });
        
    } catch (error) {
        console.error('❌ ERREUR lors de l\'ajout:', error);
        console.error('Message d\'erreur:', error.message);
        console.error('Stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'ajout de l\'opération',
            details: error.message
        });
    }
});

// DELETE /api/admin/operations/:id - Supprimer une opération complète (tous les événements du lancement)
router.delete('/operations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Suppression opération ${id}`);
        
        // D'abord, récupérer les informations du lancement à partir de l'ID
        const getLancementQuery = `
            SELECT CodeLanctImprod, CodeRubrique 
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            WHERE NoEnreg = ${parseInt(id)}
        `;
        
        const lancementInfo = await executeQuery(getLancementQuery);
        
        if (lancementInfo.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Opération non trouvée'
            });
        }
        
        const { CodeLanctImprod, CodeRubrique } = lancementInfo[0];
        
        console.log(`🗑️ Suppression de tous les événements pour ${CodeLanctImprod} (${CodeRubrique})`);
        
        // Supprimer TOUS les événements de ce lancement
        const deleteAllQuery = `
            DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            WHERE CodeLanctImprod = '${CodeLanctImprod}' AND CodeRubrique = '${CodeRubrique}'
        `;
        
        await executeQuery(deleteAllQuery);
        
        console.log(`✅ Tous les événements du lancement ${CodeLanctImprod} supprimés avec succès`);
        
        res.json({
            success: true,
            message: 'Opération supprimée avec succès'
        });
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'opération'
        });
    }
});

// Route pour récupérer les opérateurs connectés depuis ABSESSIONS_OPERATEURS
router.get('/operators', async (req, res) => {
    try {
        console.log('🔍 Récupération des opérateurs connectés depuis ABSESSIONS_OPERATEURS...');

        const operatorsQuery = `
            SELECT DISTINCT 
                s.OperatorCode,
                r.Designation1 as NomOperateur,
                s.LoginTime,
                s.SessionStatus
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS] s
            LEFT JOIN [SEDI_ERP].[dbo].[RESSOURC] r ON s.OperatorCode = r.Coderessource
            WHERE s.SessionStatus = 'ACTIVE'
            ORDER BY r.Designation1
        `;

        const operators = await executeQuery(operatorsQuery);
        
        console.log(`✅ ${operators.length} opérateurs connectés récupérés`);

        res.json({
            success: true,
            operators: operators.map(op => ({
                code: op.OperatorCode,
                name: op.NomOperateur || `Opérateur ${op.OperatorCode}`,
                loginTime: op.LoginTime,
                status: op.SessionStatus
            }))
        });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération des opérateurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des opérateurs connectés',
            details: error.message
        });
    }
});

// Route pour récupérer les lancements d'un opérateur spécifique
router.get('/operators/:operatorCode/operations', async (req, res) => {
    try {
        const { operatorCode } = req.params;
        console.log(`🔍 Récupération des événements pour l'opérateur ${operatorCode}...`);

        // Récupérer tous les événements de cet opérateur depuis ABHISTORIQUE_OPERATEURS
        const operatorEventsQuery = `
        SELECT 
                h.NoEnreg,
                h.Ident,
                h.DateCreation,
                h.CodeLanctImprod,
                h.Phase,
                h.CodeRubrique,
                h.Statut,
                h.DateCreation,
            r.Designation1 as operatorName,
                l.DesignationLct1 as Article,
                l.DesignationLct2 as ArticleDetail
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            LEFT JOIN [SEDI_ERP].[dbo].[RESSOURC] r ON h.CodeRubrique = r.Coderessource
            LEFT JOIN [SEDI_ERP].[dbo].[LCTE] l ON l.CodeLancement = h.CodeLanctImprod
            WHERE h.CodeRubrique = '${operatorCode}'
            ORDER BY h.DateCreation DESC
        `;
        
        const operatorEvents = await executeQuery(operatorEventsQuery);
        
        // Traiter les événements pour regrouper par lancement
        const processedLancements = processLancementEvents(operatorEvents);
        
        // Formater les données pour l'interface opérateur (sans pauseTime)
        const formattedOperations = processedLancements.map(lancement => ({
            id: lancement.id,
            operatorId: lancement.operatorId,
            operatorName: operatorEvents.find(e => e.CodeRubrique === lancement.operatorId)?.operatorName || 'Non assigné',
            lancementCode: lancement.lancementCode,
            article: operatorEvents.find(e => e.CodeLanctImprod === lancement.lancementCode)?.Article || 'N/A',
            articleDetail: operatorEvents.find(e => e.CodeLanctImprod === lancement.lancementCode)?.ArticleDetail || '',
            startTime: lancement.startTime,
            endTime: lancement.endTime,
            duration: lancement.duration,
            status: lancement.status,
            statusCode: lancement.statusCode,
            generalStatus: lancement.generalStatus,
            events: lancement.events,
            editable: true
        }));

        console.log(`✅ ${formattedOperations.length} lancements traités pour l'opérateur ${operatorCode}`);

        res.json({
            success: true,
            operations: formattedOperations,
            operatorCode: operatorCode,
            count: formattedOperations.length
        });

    } catch (error) {
        console.error(`❌ Erreur lors de la récupération des lancements:`, error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des lancements de l\'opérateur',
            details: error.message
        });
    }
});

router.get('/tables-info', async (req, res) => {
    try {
        console.log('🔍 Récupération des informations des tables abetemps');

        // Requête pour abetemps_Pause avec informations opérateur
        const pauseQuery = `
            SELECT TOP 50
                p.NoEnreg,
            p.Ident,
                p.DateTravail,
                p.CodeLanctImprod,
            p.Phase,
            p.CodePoste,
                p.CodeOperateur,
                r.Designation1 as NomOperateur
        FROM [SEDI_ERP].[GPSQL].[abetemps_Pause] p
        LEFT JOIN [SEDI_ERP].[dbo].[RESSOURC] r ON p.CodeOperateur = r.Coderessource
            ORDER BY p.DateTravail DESC
        `;

        // Requête pour abetemps_temp avec informations opérateur
        const tempQuery = `
            SELECT TOP 50
                t.NoEnreg,
                t.Ident,
                t.DateTravail,
                t.CodeLanctImprod,
                t.Phase,
                t.CodePoste,
                t.CodeOperateur,
                r.Designation1 as NomOperateur
            FROM [SEDI_ERP].[GPSQL].[abetemps_temp] t
            LEFT JOIN [SEDI_ERP].[dbo].[RESSOURC] r ON t.CodeOperateur = r.Coderessource
            ORDER BY t.DateTravail DESC
        `;

        console.log('📊 Exécution des requêtes pour abetemps_Pause et abetemps_temp');

        const [pauseData, tempData] = await Promise.all([
            executeQuery(pauseQuery),
            executeQuery(tempQuery)
        ]);

        console.log(`✅ Données récupérées: ${pauseData.length} entrées Pause, ${tempData.length} entrées Temp`);

        res.json({
            success: true,
            data: {
                abetemps_Pause: pauseData,
                abetemps_temp: tempData
            },
            counts: {
                pause: pauseData.length,
                temp: tempData.length
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des tables:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des informations des tables',
            details: error.message
        });
    }
});

// Route pour transférer les opérations terminées vers SEDI_APP_INDEPENDANTE
router.post('/transfer', async (req, res) => {
    try {
        console.log('🔄 Fonction de transfert temporairement désactivée pour debug...');
        
        // Retourner un message informatif
        res.json({
            success: true,
            message: 'Fonction de transfert temporairement désactivée - Fonctionnalités principales opérationnelles',
            note: 'Cette fonction sera réactivée après résolution du problème de colonnes'
        });
        return;

        // Récupérer toutes les opérations terminées (statut FIN) de la table abetemps
        const getCompletedOperationsQuery = `
            SELECT 
                a.NoEnreg,
                a.CodeOperateur,
                a.CodeLanctImprod,
                a.Phase,
                a.CodePoste,
                a.Ident,
                'TERMINE' as Statut,
                a.DateTravail
            FROM [SEDI_ERP].[GPSQL].[abetemps] a
            WHERE a.Ident = 'FIN'
            AND CAST(a.DateTravail AS DATE) = CAST(GETDATE() AS DATE)
        `;

        const completedOperations = await executeQuery(getCompletedOperationsQuery);
        console.log(` ${completedOperations.length} opérations terminées trouvées`);

        let transferredCount = 0;

        // Transférer chaque opération vers SEDI_APP_INDEPENDANTE
        for (const operation of completedOperations) {
            try {
                const insertQuery = `
                    INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
                    (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
                    VALUES (
                        '${operation.CodeOperateur}',
                        '${operation.CodeLanctImprod}',
                        '${operation.CodePoste || '929'}',
                        '${operation.Ident}',
                        '${operation.Phase || 'PRODUCTION'}',
                        '${operation.Statut}',
                        GETDATE(),
                        GETDATE(),
                        GETDATE()
                    )
                `;

                await executeQuery(insertQuery);
                transferredCount++;
                console.log(` Opération ${operation.CodeLanctImprod} transférée`);

            } catch (insertError) {
                console.error(` Erreur lors du transfert de l'opération ${operation.CodeLanctImprod}:`, insertError);
            }
        }

        console.log(` Transfert terminé: ${transferredCount}/${completedOperations.length} opérations transférées`);

        res.json({
            success: true,
            message: 'Transfert terminé avec succès',
            totalFound: completedOperations.length,
            transferredCount: transferredCount,
            errors: completedOperations.length - transferredCount,
            testColumns: Object.keys(testResult[0] || {})
        });

    } catch (error) {
        console.error(' Erreur lors du transfert:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du transfert vers SEDI_APP_INDEPENDANTE',
            details: error.message
        });
    }
});

// Route de test pour abetemps_temp
router.get('/debug/temp-table', async (req, res) => {
    try {
        const query = `SELECT TOP 10 * FROM [SEDI_ERP].[GPSQL].[abetemps_temp]`;
        const results = await executeQuery(query);
        res.json({ 
            success: true, 
            count: results.length,
            data: results
        });
    } catch (error) {
        console.error('Erreur debug abetemps_temp:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route de débogage pour voir le contenu des 3 tables
router.get('/debug/tables-content', async (req, res) => {
    try {
        const tempQuery = `SELECT COUNT(*) as count FROM [SEDI_ERP].[GPSQL].[abetemps_temp]`;
        const pauseQuery = `SELECT COUNT(*) as count FROM [SEDI_ERP].[GPSQL].[abetemps_Pause]`;
        const completedQuery = `SELECT COUNT(*) as count FROM [SEDI_ERP].[GPSQL].[abetemps] WHERE Ident = 'Prod'`;
        
        const [tempResults, pauseResults, completedResults] = await Promise.all([
            executeQuery(tempQuery),
            executeQuery(pauseQuery),
            executeQuery(completedQuery)
        ]);
        
        res.json({ 
            success: true, 
            tables: {
                abetemps_temp: tempResults[0].count,
                abetemps_Pause: pauseResults[0].count,
                abetemps_completed: completedResults[0].count
            }
        });
    } catch (error) {
        console.error('Erreur debug tables:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route de débogage pour voir les valeurs de Ident
router.get('/debug/ident-values', async (req, res) => {
    try {
        const query = `
            SELECT 
                Ident, 
                COUNT(*) as count
            FROM [SEDI_ERP].[GPSQL].[abetemps]
            GROUP BY Ident
            ORDER BY count DESC
        `;
        
        const results = await executeQuery(query);
        res.json({ success: true, identValues: results });
    } catch (error) {
        console.error('Erreur debug ident:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route pour recréer les tables SEDI_APP_INDEPENDANTE avec la bonne structure
// Route pour supprimer toutes les tables SEDI_APP_INDEPENDANTE
router.post('/delete-all-sedi-tables', async (req, res) => {
    try {
        console.log('🗑️ Suppression de toutes les tables SEDI_APP_INDEPENDANTE...');
        
        // Supprimer toutes les données des tables
        const deleteQueries = [
            'DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]',
            'DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]',
            'DELETE FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]'
        ];
        
        for (const query of deleteQueries) {
            try {
                await executeQuery(query);
                console.log(`✅ Données supprimées: ${query.split('.')[3]}`);
            } catch (error) {
                console.log(`⚠️ Table peut-être inexistante: ${query.split('.')[3]}`);
            }
        }
        
        // Optionnel: Supprimer complètement les tables
        const dropQueries = [
            'DROP TABLE IF EXISTS [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]',
            'DROP TABLE IF EXISTS [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]',
            'DROP TABLE IF EXISTS [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]'
        ];
        
        for (const query of dropQueries) {
            try {
                await executeQuery(query);
                console.log(`✅ Table supprimée: ${query.split('.')[3]}`);
            } catch (error) {
                console.log(`⚠️ Erreur suppression table: ${error.message}`);
            }
        }
        
        console.log('✅ Suppression terminée');
        
        res.json({
            success: true,
            message: 'Toutes les tables SEDI_APP_INDEPENDANTE ont été supprimées',
            deletedTables: [
                'ABHISTORIQUE_OPERATEURS',
                'ABSESSIONS_OPERATEURS', 
                'ABTEMPS_OPERATEURS'
            ]
        });
        
    } catch (error) {
        console.error('❌ Erreur lors de la suppression des tables:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression des tables',
            details: error.message
        });
    }
});

router.post('/recreate-tables', async (req, res) => {
    try {
        console.log('🔧 Recréation des tables SEDI_APP_INDEPENDANTE...');

        // Supprimer et recréer ABSESSIONS_OPERATEURS
        const dropSessionsTable = `
            IF OBJECT_ID('[SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]', 'U') IS NOT NULL
            DROP TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
        `;

        const createSessionsTable = `
            CREATE TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS] (
                SessionId INT IDENTITY(1,1) PRIMARY KEY,
                OperatorCode NVARCHAR(50) NOT NULL,
                LoginTime DATETIME2 NOT NULL,
                LogoutTime DATETIME2 NULL,
                SessionStatus NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                DeviceInfo NVARCHAR(255) NULL,
                DateCreation DATETIME2 NOT NULL DEFAULT GETDATE()
            )
        `;

        // Supprimer et recréer ABTEMPS_OPERATEURS
        const dropTempsTable = `
            IF OBJECT_ID('[SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]', 'U') IS NOT NULL
            DROP TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]
        `;

        const createTempsTable = `
            CREATE TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS] (
                TempsId INT IDENTITY(1,1) PRIMARY KEY,
                OperatorCode NVARCHAR(50) NOT NULL,
                LancementCode NVARCHAR(50) NOT NULL,
                StartTime DATETIME2 NOT NULL,
                EndTime DATETIME2 NOT NULL,
                TotalDuration INT NOT NULL, -- en minutes
                PauseDuration INT NOT NULL DEFAULT 0, -- en minutes
                ProductiveDuration INT NOT NULL, -- en minutes
                EventsCount INT NOT NULL DEFAULT 0,
                DateCreation DATETIME2 NOT NULL DEFAULT GETDATE(),
                UNIQUE(OperatorCode, LancementCode, StartTime)
            )
        `;

        await executeQuery(dropSessionsTable);
        await executeQuery(createSessionsTable);
        console.log('✅ Table ABSESSIONS_OPERATEURS recréée');

        await executeQuery(dropTempsTable);
        await executeQuery(createTempsTable);
        console.log('✅ Table ABTEMPS_OPERATEURS recréée');

        // Supprimer et recréer ABHISTORIQUE_OPERATEURS
        const dropHistoriqueTable = `
            IF OBJECT_ID('[SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]', 'U') IS NOT NULL
            DROP TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
        `;

        const createHistoriqueTable = `
            CREATE TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] (
                NoEnreg INT IDENTITY(1,1) PRIMARY KEY,
                OperatorCode NVARCHAR(50) NOT NULL,
                CodeLanctImprod NVARCHAR(50) NOT NULL,
                CodeRubrique NVARCHAR(50) NOT NULL,
                Ident NVARCHAR(20) NOT NULL, -- DEBUT, PAUSE, REPRISE, FIN
                Phase NVARCHAR(50) NULL,
                Statut NVARCHAR(20) NULL,
                HeureDebut TIME NULL, -- Format HH:mm seulement
                HeureFin TIME NULL, -- Format HH:mm seulement
                DateCreation DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE), -- Date seulement
                INDEX IX_Historique_Operator_Lancement (OperatorCode, CodeLanctImprod),
                INDEX IX_Historique_Date (DateCreation)
            )
        `;

        try {
            await executeQuery(dropHistoriqueTable);
            console.log('🗑️ Table ABHISTORIQUE_OPERATEURS supprimée (si elle existait)');
    } catch (error) {
            console.log('⚠️ Table ABHISTORIQUE_OPERATEURS n\'existait pas');
        }
        
        await executeQuery(createHistoriqueTable);
        console.log('✅ Table ABHISTORIQUE_OPERATEURS recréée');

        res.json({
            success: true,
            message: 'Tables SEDI_APP_INDEPENDANTE recréées avec succès',
            tables: ['ABHISTORIQUE_OPERATEURS', 'ABSESSIONS_OPERATEURS', 'ABTEMPS_OPERATEURS']
        });

    } catch (error) {
        console.error('❌ Erreur recréation tables:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la recréation des tables',
            details: error.message
        });
    }
});

// Route pour initialiser les tables manquantes SEDI_APP_INDEPENDANTE
router.post('/init-tables', async (req, res) => {
    try {
        console.log('🔧 Initialisation des tables SEDI_APP_INDEPENDANTE...');

        // Créer ABSESSIONS_OPERATEURS si elle n'existe pas
        const createSessionsTable = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ABSESSIONS_OPERATEURS' AND xtype='U')
            CREATE TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS] (
                SessionId INT IDENTITY(1,1) PRIMARY KEY,
                OperatorCode NVARCHAR(50) NOT NULL,
                LoginTime DATETIME2 NOT NULL,
                LogoutTime DATETIME2 NULL,
                SessionStatus NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                DeviceInfo NVARCHAR(255) NULL,
                DateCreation DATETIME2 NOT NULL DEFAULT GETDATE()
            )
        `;

        // Créer ABTEMPS_OPERATEURS si elle n'existe pas
        const createTempsTable = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ABTEMPS_OPERATEURS' AND xtype='U')
            CREATE TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS] (
                TempsId INT IDENTITY(1,1) PRIMARY KEY,
                OperatorCode NVARCHAR(50) NOT NULL,
                LancementCode NVARCHAR(50) NOT NULL,
                StartTime DATETIME2 NOT NULL,
                EndTime DATETIME2 NOT NULL,
                TotalDuration INT NOT NULL, -- en minutes
                PauseDuration INT NOT NULL DEFAULT 0, -- en minutes
                ProductiveDuration INT NOT NULL, -- en minutes
                EventsCount INT NOT NULL DEFAULT 0,
                DateCreation DATETIME2 NOT NULL DEFAULT GETDATE(),
                UNIQUE(OperatorCode, LancementCode, StartTime)
            )
        `;

        await executeQuery(createSessionsTable);
        console.log('✅ Table ABSESSIONS_OPERATEURS créée/vérifiée');

        await executeQuery(createTempsTable);
        console.log('✅ Table ABTEMPS_OPERATEURS créée/vérifiée');

        res.json({
            success: true,
            message: 'Tables SEDI_APP_INDEPENDANTE initialisées avec succès',
            tables: ['ABHISTORIQUE_OPERATEURS', 'ABSESSIONS_OPERATEURS', 'ABTEMPS_OPERATEURS']
        });
        
    } catch (error) {
        console.error('❌ Erreur initialisation tables:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'initialisation des tables',
            details: error.message
        });
    }
});

// Route de débogage pour analyser les 3 tables SEDI_APP_INDEPENDANTE
router.get('/debug/sedi-tables', async (req, res) => {
    try {
        console.log('🔍 Analyse des 3 tables SEDI_APP_INDEPENDANTE...');

        // Analyser ABHISTORIQUE_OPERATEURS
        const historiqueQuery = `
            SELECT TOP 5 * 
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            ORDER BY DateCreation DESC
        `;

        // Analyser ABSESSIONS_OPERATEURS
        const sessionsQuery = `
            SELECT TOP 5 * 
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]
            ORDER BY DateCreation DESC
        `;

        // Analyser ABTEMPS_OPERATEURS
        const tempsQuery = `
            SELECT TOP 5 * 
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]
            ORDER BY DateCreation DESC
        `;

        const [historiqueResults, sessionsResults, tempsResults] = await Promise.all([
            executeQuery(historiqueQuery).catch(err => ({ error: err.message })),
            executeQuery(sessionsQuery).catch(err => ({ error: err.message })),
            executeQuery(tempsQuery).catch(err => ({ error: err.message }))
        ]);

        // Compter les enregistrements
        const countHistoriqueQuery = `SELECT COUNT(*) as count FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]`;
        const countSessionsQuery = `SELECT COUNT(*) as count FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABSESSIONS_OPERATEURS]`;
        const countTempsQuery = `SELECT COUNT(*) as count FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABTEMPS_OPERATEURS]`;

        const [countHistorique, countSessions, countTemps] = await Promise.all([
            executeQuery(countHistoriqueQuery).catch(err => [{ count: 0, error: err.message }]),
            executeQuery(countSessionsQuery).catch(err => [{ count: 0, error: err.message }]),
            executeQuery(countTempsQuery).catch(err => [{ count: 0, error: err.message }])
        ]);

        res.json({
            success: true,
            tables: {
                ABHISTORIQUE_OPERATEURS: {
                    count: countHistorique[0]?.count || 0,
                    sample: historiqueResults.error ? { error: historiqueResults.error } : historiqueResults,
                    columns: historiqueResults.length > 0 ? Object.keys(historiqueResults[0]) : []
                },
                ABSESSIONS_OPERATEURS: {
                    count: countSessions[0]?.count || 0,
                    sample: sessionsResults.error ? { error: sessionsResults.error } : sessionsResults,
                    columns: sessionsResults.length > 0 ? Object.keys(sessionsResults[0]) : []
                },
                ABTEMPS_OPERATEURS: {
                    count: countTemps[0]?.count || 0,
                    sample: tempsResults.error ? { error: tempsResults.error } : tempsResults,
                    columns: tempsResults.length > 0 ? Object.keys(tempsResults[0]) : []
                }
            }
        });
        
    } catch (error) {
        console.error('Erreur debug tables SEDI:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/admin/lancement/:code - Rechercher un lancement dans LCTE
router.get('/lancement/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        console.log(` Recherche du lancement ${code}...`);
        
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
        console.error(' Erreur lors de la recherche du lancement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la recherche du lancement'
        });
    }
});

// GET /api/admin/abetemps - Voir les données de la table abetemps
router.get('/abetemps', async (req, res) => {
    try {
        const { lancement } = req.query;
        
        if (lancement) {
            console.log(`🔍 Recherche du lancement ${lancement} dans abetemps...`);
            
            const query = `
                SELECT TOP 10
                    [NoEnreg],
                    [Ident],
                    [CodeLanctImprod],
                    [Phase],
                    [CodeOperateur]
                FROM [SEDI_ERP].[GPSQL].[abetemps]
                WHERE [CodeLanctImprod] = '${lancement}'
                ORDER BY [NoEnreg] DESC
            `;
            
            const result = await executeQuery(query);
            console.log(`✅ ${result.length} entrées trouvées pour ${lancement} dans abetemps`);
            
            res.json({
                success: true,
                data: result || [],
                lancement: lancement
            });
        } else {
            console.log('🔍 Récupération de 10 entrées depuis abetemps...');
            
            const query = `
                SELECT TOP 10
                    [NoEnreg],
                    [Ident],
                    [CodeLanctImprod],
                    [Phase],
                    [CodeOperateur]
                FROM [SEDI_ERP].[GPSQL].[abetemps]
                ORDER BY [NoEnreg] DESC
            `;
            
            const result = await executeQuery(query);
            console.log(`✅ ${result.length} entrées récupérées depuis abetemps`);
            
            res.json({
                success: true,
                data: result || []
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de abetemps:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de abetemps'
        });
    }
});

// GET /api/admin/lcte - Voir les données de la table LCTE
router.get('/lcte', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        console.log(`🔍 Récupération de ${limit} lancements depuis LCTE...`);
        
        const query = `
            SELECT TOP ${parseInt(limit)} 
                [CodeLancement],
                [CodeArticle],
                [DesignationLct1],
                [CodeModele],
                [DesignationArt1],
                [DesignationArt2]
            FROM [SEDI_ERP].[dbo].[LCTE]
            ORDER BY [CodeLancement]
        `;
        
        const result = await executeQuery(query);
        
        console.log(` ${result.length} lancements récupérés depuis LCTE`);
        
        res.json({
            success: true,
            data: result || [],
            count: result.length
        });
        
    } catch (error) {
        console.error(' Erreur lors de la récupération des lancements LCTE:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des lancements'
        });
    }
});

// GET /api/admin/lancements/search - Rechercher des lancements par terme
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
        
        console.log(` ${result.length} lancements trouvés`);
        
        res.json({
            success: true,
            data: result || []
        });
        
    } catch (error) {
        console.error(' Erreur lors de la recherche de lancements:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la recherche'
        });
    }
});

// Route spécifique pour créer ABHISTORIQUE_OPERATEURS
router.post('/create-historique-table', async (req, res) => {
    try {
        console.log('🔧 Création de la table ABHISTORIQUE_OPERATEURS...');

        // Supprimer et recréer ABHISTORIQUE_OPERATEURS
        const dropHistoriqueTable = `
            IF OBJECT_ID('[SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]', 'U') IS NOT NULL
            DROP TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
        `;

        const createHistoriqueTable = `
            CREATE TABLE [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] (
                NoEnreg INT IDENTITY(1,1) PRIMARY KEY,
                OperatorCode NVARCHAR(50) NOT NULL,
                CodeLanctImprod NVARCHAR(50) NOT NULL,
                CodeRubrique NVARCHAR(50) NOT NULL,
                Ident NVARCHAR(20) NOT NULL, -- DEBUT, PAUSE, REPRISE, FIN
                Phase NVARCHAR(50) NULL,
                Statut NVARCHAR(20) NULL,
                HeureDebut TIME NULL, -- Format HH:mm seulement
                HeureFin TIME NULL, -- Format HH:mm seulement
                DateCreation DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE), -- Date seulement
                INDEX IX_Historique_Operator_Lancement (OperatorCode, CodeLanctImprod),
                INDEX IX_Historique_Date (DateCreation)
            )
        `;

        await executeQuery(dropHistoriqueTable);
        await executeQuery(createHistoriqueTable);
        console.log(' Table ABHISTORIQUE_OPERATEURS créée avec succès');

        res.json({
            success: true,
            message: 'Table ABHISTORIQUE_OPERATEURS créée avec succès'
        });

    } catch (error) {
        console.error(' Erreur création table ABHISTORIQUE_OPERATEURS:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création de la table ABHISTORIQUE_OPERATEURS',
            details: error.message
        });
    }
});

module.exports = router;