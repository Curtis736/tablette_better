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

// Fonction pour valider et formater une heure au format TIME SQL
function formatTimeForSQL(timeInput) {
    if (!timeInput) return null;
    
    try {
        console.log(`🔧 formatTimeForSQL input: "${timeInput}" (type: ${typeof timeInput})`);
        
        // Si c'est déjà une chaîne au format HH:mm ou HH:mm:ss
        if (typeof timeInput === 'string') {
            // Nettoyer la chaîne (enlever espaces, etc.)
            const cleanTime = timeInput.trim();
            
            // Format HH:mm
            const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
            if (timeMatch) {
                const hours = timeMatch[1].padStart(2, '0');
                const minutes = timeMatch[2];
                const result = `${hours}:${minutes}:00`;
                console.log(`🔧 formatTimeForSQL: ${timeInput} → ${result}`);
                return result;
            }
            
            // Format HH:mm:ss
            const timeWithSecondsMatch = cleanTime.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
            if (timeWithSecondsMatch) {
                const hours = timeWithSecondsMatch[1].padStart(2, '0');
                const minutes = timeWithSecondsMatch[2];
                const seconds = timeWithSecondsMatch[3];
                const result = `${hours}:${minutes}:${seconds}`;
                console.log(`🔧 formatTimeForSQL: ${timeInput} → ${result}`);
                return result;
            }
        }
        
        // Si c'est un objet Date, extraire seulement l'heure avec fuseau horaire français
        if (timeInput instanceof Date) {
            const timeString = timeInput.toLocaleTimeString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            console.log(`🔧 formatTimeForSQL: Date → ${timeString}`);
            return timeString;
        }
        
        console.warn(`⚠️ Format d'heure non reconnu: ${timeInput}`);
        return null;
    } catch (error) {
        console.error('Erreur formatage heure SQL:', error);
        return null;
    }
}

// Fonction pour convertir une heure en minutes depuis minuit
function timeToMinutes(timeString) {
    if (!timeString) return 0;
    
    const parts = timeString.split(':');
    if (parts.length < 2) return 0;
    
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    
    return hours * 60 + minutes;
}

// Fonction pour valider les heures suspectes (comme 02:00 qui pourrait indiquer un problème)
function validateSuspiciousTime(timeString, context = '') {
    if (!timeString) return { isValid: true, warning: null };
    
    const time = timeString.split(':');
    const hour = parseInt(time[0]);
    const minute = parseInt(time[1]);
    
    // Détecter les heures suspectes
    if (hour === 2 && minute === 0) {
        return {
            isValid: true,
            warning: `⚠️ Heure suspecte détectée: ${timeString} ${context}. Cela pourrait indiquer une opération terminée à 2h du matin ou un problème de calcul de durée.`
        };
    }
    
    // Détecter les heures très tardives ou très matinales
    if (hour >= 22 || hour <= 4) {
        return {
            isValid: true,
            warning: `ℹ Heure inhabituelle: ${timeString} ${context}. Vérifiez si cette opération traverse minuit.`
        };
    }
    
    return { isValid: true, warning: null };
}

// Fonction pour formater une date en HH:mm (fuseau horaire Paris)
function formatDateTime(dateTime) {
    if (!dateTime) {
        console.log('🔍 formatDateTime: dateTime est null/undefined');
        return null;
    }
    
    try {
        // Si c'est déjà une chaîne au format HH:mm ou HH:mm:ss, la retourner directement
        if (typeof dateTime === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(dateTime)) {
            const parts = dateTime.split(':');
            const formattedTime = `${parts[0]}:${parts[1]}`;
            
            // Valider les heures suspectes
            const validation = validateSuspiciousTime(formattedTime, '(format direct)');
            if (validation.warning) {
                console.warn(validation.warning);
            }
            
            return formattedTime;
        }
        
        // Si c'est un objet Date, extraire l'heure avec fuseau horaire français
        if (dateTime instanceof Date) {
            const timeString = dateTime.toLocaleTimeString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            // Valider les heures suspectes
            const validation = validateSuspiciousTime(timeString, '(formatage Date object)');
            if (validation.warning) {
                console.warn(validation.warning);
            }
            
            console.log(`🔍 formatDateTime: Date object -> ${timeString}`);
            return timeString;
        }
        
        // Sinon, essayer de créer un objet Date
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) {
            console.warn('🔍 formatDateTime: Date invalide:', dateTime);
            return null;
        }
        
        // Utiliser fuseau horaire français (Europe/Paris)
        const timeString = date.toLocaleTimeString('fr-FR', {
            timeZone: 'Europe/Paris',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        // Valider les heures suspectes
        const validation = validateSuspiciousTime(timeString, '(formatage date)');
        if (validation.warning) {
            console.warn(validation.warning);
        }
        
        console.log(`🔍 formatDateTime: ${dateTime} -> ${timeString}`);
        return timeString;
    } catch (error) {
        console.error('🔍 formatDateTime: Erreur formatage date:', dateTime, error);
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
        
        // Gérer les durées négatives (traversée de minuit)
        if (diffMinutes < 0) {
            console.log(`⚠️ Durée négative détectée: ${startDate} -> ${endDate} (${diffMinutes}min)`);
            // Si la durée est négative, cela peut indiquer une traversée de minuit
            // Dans ce cas, on peut soit retourner null soit ajuster
            return null;
        }
        
        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        
        // Format amélioré pour les durées longues
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            if (remainingHours > 0) {
                return `${days}j${remainingHours}h${minutes.toString().padStart(2, '0')}`;
            } else {
                return `${days}j${minutes.toString().padStart(2, '0')}min`;
            }
        } else if (hours > 0) {
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

        // Calculer les durées en utilisant DateCreation pour éviter les problèmes de minuit
        const startDateTime = new Date(debutEvent.DateCreation);
        const endDateTime = new Date(finEvent.DateCreation);
        
        // Si les heures sont disponibles, les utiliser pour un calcul plus précis
        let totalDuration;
        if (debutEvent.HeureDebut && finEvent.HeureFin) {
            // Créer des objets Date avec les vraies dates et heures
            const startDate = new Date(debutEvent.DateCreation);
            const endDate = new Date(finEvent.DateCreation);
            
            // Extraire les heures et minutes
            const [startHour, startMin] = debutEvent.HeureDebut.split(':').map(Number);
            const [endHour, endMin] = finEvent.HeureFin.split(':').map(Number);
            
            // Créer des dates complètes
            startDate.setHours(startHour, startMin, 0, 0);
            endDate.setHours(endHour, endMin, 0, 0);
            
            // Si l'heure de fin est antérieure à l'heure de début, ajouter un jour
            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
                console.log(`⚠️ Opération traversant minuit détectée: ${debutEvent.HeureDebut} -> ${finEvent.HeureFin} (+1 jour)`);
            }
            
            totalDuration = Math.floor((endDate - startDate) / (1000 * 60)); // en minutes
        } else {
            // Fallback sur DateCreation si les heures ne sont pas disponibles
            totalDuration = Math.floor((endDateTime - startDateTime) / (1000 * 60));
        }

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

// Fonction pour regrouper les événements par lancement sur une seule ligne (sans pauses séparées)
function processLancementEventsSingleLine(events) {
    const lancementGroups = {};
    
    // Regrouper par CodeLanctImprod et CodeRubrique
    events.forEach(event => {
        const key = `${event.CodeLanctImprod}_${event.CodeRubrique}`;
        if (!lancementGroups[key]) {
            lancementGroups[key] = [];
        }
        lancementGroups[key].push(event);
    });
    
    const processedItems = [];
    
    Object.keys(lancementGroups).forEach(key => {
        const groupEvents = lancementGroups[key].sort((a, b) => 
            new Date(a.DateCreation) - new Date(b.DateCreation)
        );
        
        console.log(`🔍 Traitement du groupe ${key}:`, groupEvents.map(e => ({
            ident: e.Ident,
            dateCreation: e.DateCreation,
            heureDebut: e.HeureDebut,
            heureFin: e.HeureFin
        })));
        
        // Trouver les événements clés
        const debutEvent = groupEvents.find(e => e.Ident === 'DEBUT');
        const finEvent = groupEvents.find(e => e.Ident === 'FIN');
        const pauseEvents = groupEvents.filter(e => e.Ident === 'PAUSE');
        const repriseEvents = groupEvents.filter(e => e.Ident === 'REPRISE');
        
        if (debutEvent) {
            let status, statusLabel;
            let endTime = null;
            
            if (finEvent) {
                // DÉMARRÉ → FIN = TERMINÉ
                status = 'TERMINE';
                statusLabel = 'Terminé';
                endTime = finEvent.HeureFin ? formatDateTime(finEvent.HeureFin) : formatDateTime(finEvent.DateCreation);
            } else if (pauseEvents.length > 0 && pauseEvents.length > repriseEvents.length) {
                // DÉMARRÉ → PAUSE = EN PAUSE
                status = 'PAUSE';
                statusLabel = 'En pause';
                // Pas d'heure de fin pour une pause en cours
                endTime = null;
            } else {
                // DÉMARRÉ seul = EN COURS
                status = 'EN_COURS';
                statusLabel = 'En cours';
                endTime = null;
            }
            
            console.log(`🔍 Ligne unique pour ${key}:`, status);
            processedItems.push(createLancementItem(debutEvent, groupEvents, status, statusLabel, endTime));
        }
        
        console.log(`🔍 Créé 1 item pour ${key}`);
    });
    
    console.log(`🔍 Total d'items créés: ${processedItems.length}`);
    return processedItems.sort((a, b) => 
        new Date(b.lastUpdate) - new Date(a.lastUpdate)
    );
}

// Fonction pour regrouper les événements par lancement et calculer les temps (garde les pauses séparées)
function processLancementEventsWithPauses(events) {
    const lancementGroups = {};
    
    // Regrouper par CodeLanctImprod et CodeRubrique
    events.forEach(event => {
        const key = `${event.CodeLanctImprod}_${event.CodeRubrique}`;
        if (!lancementGroups[key]) {
            lancementGroups[key] = [];
        }
        lancementGroups[key].push(event);
    });
    
    const processedItems = [];
    
    Object.keys(lancementGroups).forEach(key => {
        const groupEvents = lancementGroups[key].sort((a, b) => 
            new Date(a.DateCreation) - new Date(b.DateCreation)
        );
        
        console.log(`🔍 Traitement du groupe ${key}:`, groupEvents.map(e => ({
            ident: e.Ident,
            dateCreation: e.DateCreation,
            heureDebut: e.HeureDebut,
            heureFin: e.HeureFin
        })));
        
        // Logique : DÉMARRÉ+FIN sur une ligne, PAUSE séparées
        console.log(`🔍 Traitement de ${groupEvents.length} événements pour ${key}`);
        
        const debutEvent = groupEvents.find(e => e.Ident === 'DEBUT');
        const finEvent = groupEvents.find(e => e.Ident === 'FIN');
        const pauseEvents = groupEvents.filter(e => e.Ident === 'PAUSE');
        const repriseEvents = groupEvents.filter(e => e.Ident === 'REPRISE');
        
        // Déterminer le statut de la ligne principale (jamais "EN PAUSE")
        let currentStatus = 'EN_COURS';
        let statusLabel = 'En cours';
        
        if (finEvent) {
            currentStatus = 'TERMINE';
            statusLabel = 'Terminé';
        } else {
            // La ligne principale ne doit jamais être "EN PAUSE"
            // Elle reste "EN COURS" même si il y a des pauses
            currentStatus = 'EN_COURS';
            statusLabel = 'En cours';
        }
        
        // Créer la ligne principale avec le statut correct
        if (debutEvent) {
            let endTime = null;
            
            if (finEvent) {
                endTime = finEvent.HeureFin ? formatDateTime(finEvent.HeureFin) : formatDateTime(finEvent.DateCreation);
            }
            
            console.log(`🔍 Ligne principale pour ${key}:`, currentStatus);
            processedItems.push(createLancementItem(debutEvent, groupEvents, currentStatus, statusLabel, endTime));
        }
        
        // Créer les lignes de pause séparées
        console.log(`🔍 Pauses trouvées: ${pauseEvents.length}, Reprises trouvées: ${repriseEvents.length}`);
        console.log(`🔍 Pauses:`, pauseEvents.map(p => ({ id: p.NoEnreg, date: p.DateCreation, heure: p.HeureDebut })));
        console.log(`🔍 Reprises:`, repriseEvents.map(r => ({ id: r.NoEnreg, date: r.DateCreation, heure: r.HeureDebut })));
        
        const lastEvent = groupEvents[groupEvents.length - 1];
        console.log(`🔍 Dernier événement pour ${key}:`, lastEvent ? `${lastEvent.Ident} à ${lastEvent.DateCreation}` : 'AUCUN');
        
        // Créer une copie des reprises pour éviter les doublons
        const availableReprises = [...repriseEvents];
        
        pauseEvents.forEach((pauseEvent, index) => {
            // Trouver la reprise correspondante (la plus proche dans le temps après la pause)
            // et qui correspond au même lancement et opérateur
            const repriseIndex = availableReprises.findIndex(reprise => 
                (new Date(reprise.DateCreation) > new Date(pauseEvent.DateCreation) ||
                 (new Date(reprise.DateCreation).getTime() === new Date(pauseEvent.DateCreation).getTime() && reprise.NoEnreg > pauseEvent.NoEnreg)) &&
                reprise.CodeLanctImprod === pauseEvent.CodeLanctImprod &&
                reprise.CodeRubrique === pauseEvent.CodeRubrique
            );
            
            const repriseEvent = repriseIndex >= 0 ? availableReprises[repriseIndex] : null;
            
            // Retirer la reprise utilisée pour éviter qu'elle soit réutilisée
            if (repriseEvent) {
                availableReprises.splice(repriseIndex, 1);
                console.log(`🔍 Pause ${pauseEvent.NoEnreg} associée à la reprise ${repriseEvent.NoEnreg}`);
            } else {
                console.log(`⚠️ Aucune reprise trouvée pour la pause ${pauseEvent.NoEnreg}`);
            }
            
            console.log(`🔍 Traitement pause ${index}:`, {
                pauseId: pauseEvent.NoEnreg,
                pauseDate: pauseEvent.DateCreation,
                repriseId: repriseEvent ? repriseEvent.NoEnreg : 'AUCUNE',
                repriseDate: repriseEvent ? repriseEvent.DateCreation : 'AUCUNE'
            });
            
            let status, statusLabel;
            let endTime = null;
            
            if (repriseEvent) {
                status = 'PAUSE_TERMINEE';
                statusLabel = 'Pause terminée';
                // Pour une pause terminée, l'heure de fin = heure de la reprise
                // Utiliser HeureDebut de la reprise (moment où l'opérateur reprend)
                if (repriseEvent.HeureDebut) {
                    endTime = formatDateTime(repriseEvent.HeureDebut);
                } else {
                    endTime = formatDateTime(repriseEvent.DateCreation);
                }
                console.log(`🔍 Pause terminée: début=${pauseEvent.DateCreation}, fin=${repriseEvent.DateCreation}`);
            } else {
                status = 'PAUSE';
                statusLabel = 'En pause';
                // Pour une pause en cours, pas d'heure de fin
                endTime = null;
            }
            
            console.log(`🔍 Ligne pause pour ${key}:`, status, 'endTime:', endTime);
            processedItems.push(createLancementItem(pauseEvent, [pauseEvent], status, statusLabel, endTime));
        });
        
        console.log(`🔍 Créé ${processedItems.length} items pour ${key}`);
    });
    
    console.log(`🔍 Total d'items créés: ${processedItems.length}`);
    return processedItems.sort((a, b) => 
        new Date(b.lastUpdate) - new Date(a.lastUpdate)
    );
}

// Fonction helper pour créer un item de lancement
function createLancementItem(startEvent, sequence, status, statusLabel, endTime = null) {
    const finEvent = sequence.find(e => e.Ident === 'FIN');
    const pauseEvent = sequence.find(e => e.Ident === 'PAUSE');
    
    // Debug uniquement si problème détecté
    if (startEvent.HeureDebut && typeof startEvent.HeureDebut !== 'string' && !(startEvent.HeureDebut instanceof Date)) {
        console.log(`⚠️ createLancementItem - HeureDebut problématique:`, {
            HeureDebut: startEvent.HeureDebut,
            HeureDebutType: typeof startEvent.HeureDebut,
            Ident: startEvent.Ident
        });
    }
    
    // Traitement sécurisé de l'heure de début
    let startTime;
    if (startEvent.HeureDebut) {
        if (typeof startEvent.HeureDebut === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(startEvent.HeureDebut)) {
            // Format HH:mm ou HH:mm:ss - retourner directement
            startTime = startEvent.HeureDebut.substring(0, 5);
        } else if (startEvent.HeureDebut instanceof Date) {
            // Objet Date - extraire l'heure avec fuseau horaire français
            startTime = startEvent.HeureDebut.toLocaleTimeString('fr-FR', {
                timeZone: 'Europe/Paris',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } else {
            // Autre format - utiliser formatDateTime
            startTime = formatDateTime(startEvent.HeureDebut);
        }
    } else {
        // Pas d'heure de début - utiliser DateCreation
        startTime = formatDateTime(startEvent.DateCreation);
    }
    
    // Debug uniquement si problème détecté
    if (startTime && startTime.includes(':')) {
        const [hours, minutes] = startTime.split(':').map(Number);
        if (hours > 23 || minutes > 59) {
            console.log(`⚠️ startTime problématique:`, startTime);
        }
    }
    
    // Utiliser l'endTime fourni ou calculer selon le contexte
    let finalEndTime;
    if (endTime !== null) {
        // Si endTime est fourni explicitement (cas des pauses terminées), l'utiliser
        finalEndTime = endTime;
    } else if (finEvent) {
        // Pour les opérations terminées, utiliser HeureFin ou DateCreation
        if (finEvent.HeureFin) {
            if (typeof finEvent.HeureFin === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(finEvent.HeureFin)) {
                // Format HH:mm ou HH:mm:ss - retourner directement
                finalEndTime = finEvent.HeureFin.substring(0, 5);
            } else if (finEvent.HeureFin instanceof Date) {
                // Objet Date - extraire l'heure avec fuseau horaire français
                finalEndTime = finEvent.HeureFin.toLocaleTimeString('fr-FR', {
                    timeZone: 'Europe/Paris',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
            } else {
                // Autre format - utiliser formatDateTime
                finalEndTime = formatDateTime(finEvent.HeureFin);
            }
        } else {
            // Pas d'heure de fin - utiliser DateCreation
            finalEndTime = formatDateTime(finEvent.DateCreation);
        }
    } else if (pauseEvent && status === 'PAUSE') {
        // Pour les pauses en cours, pas d'heure de fin
        finalEndTime = null;
    } else {
        // Fallback par défaut
        finalEndTime = null;
    }
    
    // Validation et correction des heures incohérentes
    if (startTime && finalEndTime && startTime.includes(':') && finalEndTime.includes(':')) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = finalEndTime.split(':').map(Number);
        
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        
        // Si l'heure de fin est avant l'heure de début (et pas de traversée de minuit)
        if (endTotalMinutes < startTotalMinutes && endTotalMinutes > 0) {
            console.log(`⚠️ Heures incohérentes détectées: ${startTime} -> ${finalEndTime}`);
            console.log(`🔧 Correction: heure de fin mise à null pour éviter l'incohérence`);
            finalEndTime = null; // Mettre à null plutôt qu'une heure incorrecte
        }
    }
    
    // Debug uniquement si problème détecté
    if (finalEndTime && finalEndTime.includes(':')) {
        const [hours, minutes] = finalEndTime.split(':').map(Number);
        if (hours > 23 || minutes > 59) {
            console.log(`⚠️ finalEndTime problématique:`, finalEndTime);
        }
    }
    
    const duration = finalEndTime ? 
        calculateDuration(startEvent.DateCreation, new Date(finalEndTime)) : null;
    
    return {
        id: startEvent.NoEnreg,
        operatorId: startEvent.CodeRubrique,
        operatorName: startEvent.operatorName || 'Non assigné',
        lancementCode: startEvent.CodeLanctImprod,
        article: startEvent.Article || 'N/A',
        phase: startEvent.Phase,
        startTime: startTime,
        endTime: finalEndTime,
        pauseTime: pauseEvent ? formatDateTime(pauseEvent.DateCreation) : null,
        duration: duration,
        pauseDuration: null,
        status: statusLabel,
        statusCode: status,
        generalStatus: status,
        events: sequence.length,
        lastUpdate: finEvent ? finEvent.DateCreation : (pauseEvent ? pauseEvent.DateCreation : startEvent.DateCreation),
        type: (status === 'PAUSE' || status === 'PAUSE_TERMINEE') ? 'pause' : 'lancement'
    };
}

// Fonction originale pour regrouper les événements par lancement et calculer les temps
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
        
        // Déterminer le statut de la ligne principale (jamais "EN PAUSE")
        let currentStatus = 'EN_COURS';
        let statusLabel = 'En cours';
        
        if (finEvent) {
            currentStatus = 'TERMINE';
            statusLabel = 'Terminé';
        } else {
            // La ligne principale ne doit jamais être "EN PAUSE"
            // Elle reste "EN COURS" même si il y a des pauses
            currentStatus = 'EN_COURS';
            statusLabel = 'En cours';
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
            lastUpdate: lastEvent.DateCreation,
            type: 'lancement' // Ligne principale toujours de type 'lancement'
        });
    });
    
    return processedLancements.sort((a, b) => 
        new Date(b.lastUpdate) - new Date(a.lastUpdate)
    );
}

// GET /api/admin - Route racine admin
router.get('/', async (req, res) => {
    try {
        console.log('🚀 DEBUT route /api/admin');
        const { date } = req.query;
        const targetDate = date || moment().format('YYYY-MM-DD');
        
        // Récupérer les statistiques
        const stats = await getAdminStats(targetDate);
        
        // Récupérer les opérations (première page seulement pour la vue d'ensemble)
        const operationsResult = await getAdminOperations(targetDate, 1, 25);
        
        res.json({
            stats,
            operations: operationsResult.operations || [],
            pagination: operationsResult.pagination || null,
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
        const { date, page = 1, limit = 25 } = req.query;
        const targetDate = date || moment().format('YYYY-MM-DD');
        
        // Éviter le cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const result = await getAdminOperations(targetDate, parseInt(page), parseInt(limit));
        console.log('🎯 Envoi des opérations admin:', result.operations?.length || 0, 'éléments');
        res.json(result);
        
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
async function getAdminOperations(date, page = 1, limit = 25) {
    try {
        console.log('🚀 DEBUT getAdminOperations - date:', date, 'page:', page, 'limit:', limit);
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
        
        // Regrouper les événements par lancement mais garder les pauses séparées
        console.log('🔍 Événements avant regroupement:', allEvents.length);
        // Debug des types d'heures (uniquement si problème détecté)
        const problematicEvents = allEvents.filter(e => 
            e.HeureDebut && typeof e.HeureDebut !== 'string' && !(e.HeureDebut instanceof Date)
        );
        if (problematicEvents.length > 0) {
            console.log('⚠️ Événements avec types d\'heures problématiques:', problematicEvents.map(e => ({
                ident: e.Ident,
                lancement: e.CodeLanctImprod,
                heureDebut: e.HeureDebut,
                heureDebutType: typeof e.HeureDebut
            })));
        }
        
        // Utiliser la fonction de regroupement avec pauses séparées
        const processedLancements = processLancementEventsWithPauses(allEvents);
        console.log('🔍 Événements après regroupement:', processedLancements.length);
        console.log('🔍 Détail des événements regroupés:', processedLancements.map(p => ({
            lancement: p.lancementCode,
            type: p.type,
            status: p.status,
            startTime: p.startTime,
            endTime: p.endTime
        })));
        
        // Appliquer la pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const limitedLancements = processedLancements.slice(startIndex, endIndex);
        
        const formattedOperations = limitedLancements.map(lancement => {
            // Trouver les informations détaillées depuis les événements
            const relatedEvents = allEvents.filter(e => 
                e.CodeLanctImprod === lancement.lancementCode && 
                e.CodeRubrique === lancement.operatorId
            );
            
            const firstEvent = relatedEvents[0];
            
            return {
                id: lancement.id,
                operatorId: lancement.operatorId,
                operatorName: firstEvent?.operatorName || 'Non assigné',
                lancementCode: lancement.lancementCode,
                article: firstEvent?.Article || 'N/A',
                articleDetail: firstEvent?.ArticleDetail || '',
                startTime: lancement.startTime,
                endTime: lancement.endTime,
                pauseTime: lancement.pauseTime,
                duration: lancement.duration,
                pauseDuration: lancement.pauseDuration,
                status: lancement.status,
                statusCode: lancement.statusCode,
                generalStatus: lancement.generalStatus,
                events: lancement.events,
                editable: true
            };
        });

        console.log(`🎯 Envoi de ${formattedOperations.length} lancements regroupés (page ${page}/${Math.ceil(processedLancements.length / limit)})`);
        return {
            operations: formattedOperations,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(processedLancements.length / limit),
                totalItems: processedLancements.length,
                itemsPerPage: limit,
                hasNextPage: page < Math.ceil(processedLancements.length / limit),
                hasPrevPage: page > 1
            }
        };

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
            const formattedStartTime = formatTimeForSQL(startTime);
            if (!formattedStartTime) {
                return res.status(400).json({
                    success: false,
                    error: 'Format d\'heure de début invalide'
                });
            }
            updateFields.push('HeureDebut = @startTime');
            params.startTime = formattedStartTime;
            console.log(`🔧 startTime: ${startTime} -> ${params.startTime}`);
        }
        
        if (endTime !== undefined) {
            const formattedEndTime = formatTimeForSQL(endTime);
            if (!formattedEndTime) {
                return res.status(400).json({
                    success: false,
                    error: 'Format d\'heure de fin invalide'
                });
            }
            updateFields.push('HeureFin = @endTime');
            params.endTime = formattedEndTime;
            console.log(`🔧 endTime: ${endTime} -> ${params.endTime}`);
        }
        
        // Validation de cohérence des heures
        if (params.startTime && params.endTime) {
            const startMinutes = timeToMinutes(params.startTime);
            const endMinutes = timeToMinutes(params.endTime);
            
            if (endMinutes < startMinutes) {
                console.warn(`⚠️ Heure de fin (${params.endTime}) antérieure à l'heure de début (${params.startTime})`);
                // Ne pas bloquer, juste avertir
            }
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
        
        console.log(`🔧 Requête de mise à jour:`, updateQuery);
        console.log(`🔧 Paramètres:`, params);
        
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
            error: 'Erreur lors de la modification de l\'opération',
            details: error.message
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
        
        console.log(`🗑️ Suppression opération ${id} (type: ${typeof id})`);
        
        // D'abord, récupérer les informations du lancement à partir de l'ID
        const getLancementQuery = `
            SELECT CodeLanctImprod, CodeRubrique 
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            WHERE NoEnreg = @id
        `;
        
        const lancementInfo = await executeQuery(getLancementQuery, { id: parseInt(id) });
        
        console.log(`🔍 Résultat de la requête pour ID ${id}:`, lancementInfo);
        
        if (lancementInfo.length === 0) {
            console.log(`❌ Aucune opération trouvée avec l'ID ${id}`);
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
            WHERE CodeLanctImprod = @lancementCode AND CodeRubrique = @operatorCode
        `;
        
        await executeQuery(deleteAllQuery, { 
            lancementCode: CodeLanctImprod, 
            operatorCode: CodeRubrique 
        });
        
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

// GET /api/admin/validate-lancement/:code - Valider un code de lancement
router.get('/validate-lancement/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        console.log(`🔍 Validation du code lancement: ${code}`);
        
        // Valider le format du code (LT + 7 chiffres)
        const codePattern = /^LT\d{7}$/;
        if (!codePattern.test(code)) {
            return res.json({
                success: false,
                valid: false,
                error: 'Format invalide. Le code doit être au format LT + 7 chiffres (ex: LT2501145)'
            });
        }
        
        // Vérifier l'existence dans la base de données
        const validationQuery = `
            SELECT TOP 1 
                CodeLancement,
                DesignationLct1,
                DesignationLct2,
                StatutLancement
            FROM [SEDI_ERP].[dbo].[LCTE] 
            WHERE CodeLancement = @code
        `;
        
        const result = await executeQuery(validationQuery, { code });
        
        if (result.length === 0) {
            return res.json({
                success: true,
                valid: false,
                error: 'Code de lancement non trouvé dans la base de données'
            });
        }
        
        const lancement = result[0];
        
        res.json({
            success: true,
            valid: true,
            data: {
                code: lancement.CodeLancement,
                designation: lancement.DesignationLct1,
                designationDetail: lancement.DesignationLct2,
                statut: lancement.StatutLancement
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur validation code lancement:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la validation'
        });
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

// Route de debug pour tester la logique de tous les lancements
router.get('/debug/all-lancements-status', async (req, res) => {
    try {
        console.log('🔍 Debug de tous les lancements...');
        
        // Récupérer tous les événements
        const eventsQuery = `
            SELECT 
                h.NoEnreg,
                h.Ident,
                h.CodeLanctImprod,
                h.CodeRubrique,
                h.HeureDebut,
                h.HeureFin,
                h.DateCreation
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            ORDER BY h.CodeLanctImprod, h.CodeRubrique, h.DateCreation ASC
        `;
        
        const events = await executeQuery(eventsQuery);
        
        // Grouper par lancement
        const lancementGroups = {};
        events.forEach(event => {
            const key = `${event.CodeLanctImprod}_${event.CodeRubrique}`;
            if (!lancementGroups[key]) {
                lancementGroups[key] = [];
            }
            lancementGroups[key].push(event);
        });
        
        const analysis = [];
        
        Object.keys(lancementGroups).forEach(key => {
            const groupEvents = lancementGroups[key].sort((a, b) => 
                new Date(a.DateCreation) - new Date(b.DateCreation)
            );
            
            const [lancementCode, operatorCode] = key.split('_');
            const lastEvent = groupEvents[groupEvents.length - 1];
            const finEvent = groupEvents.find(e => e.Ident === 'FIN');
            const pauseEvents = groupEvents.filter(e => e.Ident === 'PAUSE');
            const repriseEvents = groupEvents.filter(e => e.Ident === 'REPRISE');
            
            // Déterminer le statut selon la nouvelle logique
            let currentStatus = 'EN_COURS';
            if (finEvent) {
                currentStatus = 'TERMINE';
            } else if (lastEvent.Ident === 'PAUSE') {
                currentStatus = 'PAUSE';
            } else if (lastEvent.Ident === 'REPRISE') {
                currentStatus = 'EN_COURS';
            }
            
            analysis.push({
                lancementCode,
                operatorCode,
                totalEvents: groupEvents.length,
                pauseEvents: pauseEvents.length,
                repriseEvents: repriseEvents.length,
                lastEvent: lastEvent ? {
                    ident: lastEvent.Ident,
                    date: lastEvent.DateCreation,
                    heure: lastEvent.HeureDebut
                } : null,
                currentStatus,
                isFinished: !!finEvent,
                events: groupEvents.map(e => ({
                    id: e.NoEnreg,
                    ident: e.Ident,
                    date: e.DateCreation,
                    heure: e.HeureDebut
                }))
            });
        });
        
        console.log(`📊 Analyse de ${analysis.length} lancements terminée`);
        
        res.json({
            success: true,
            totalLancements: analysis.length,
            analysis: analysis.sort((a, b) => a.lancementCode.localeCompare(b.lancementCode))
        });
        
    } catch (error) {
        console.error('❌ Erreur debug tous les lancements:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du debug de tous les lancements',
            details: error.message
        });
    }
});

// Route pour nettoyer les données de test et créer des pauses terminées
router.post('/debug/create-test-pause-reprise', async (req, res) => {
    try {
        console.log('🧪 Création de données de test pause/reprise...');
        
        const { operatorCode = '929', lancementCode = 'LT2501148' } = req.body;
        
        // Créer une pause terminée pour tester
        const pauseQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
            VALUES (
                '${operatorCode}',
                '${lancementCode}',
                'PRODUCTION',
                'PAUSE',
                'PRODUCTION',
                'EN_PAUSE',
                CAST('14:30:00' AS TIME),
                NULL,
                CAST(GETDATE() AS DATE)
            )
        `;
        
        const repriseQuery = `
            INSERT INTO [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS]
            (OperatorCode, CodeLanctImprod, CodeRubrique, Ident, Phase, Statut, HeureDebut, HeureFin, DateCreation)
            VALUES (
                '${operatorCode}',
                '${lancementCode}',
                'PRODUCTION',
                'REPRISE',
                'PRODUCTION',
                'EN_COURS',
                CAST('14:45:00' AS TIME),
                NULL,
                CAST(GETDATE() AS DATE)
            )
        `;
        
        await executeQuery(pauseQuery);
        await executeQuery(repriseQuery);
        
        console.log('✅ Données de test créées');
        
        res.json({
            success: true,
            message: 'Données de test pause/reprise créées',
            data: {
                operatorCode,
                lancementCode,
                pauseTime: '14:30:00',
                repriseTime: '14:45:00'
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur création données test:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création des données de test',
            details: error.message
        });
    }
});

// Route de debug pour voir tous les lancements avec leurs pauses
router.get('/debug/all-pauses', async (req, res) => {
    try {
        console.log('🔍 Debug de tous les lancements avec pauses...');
        
        // Récupérer tous les événements
        const eventsQuery = `
            SELECT 
                h.NoEnreg,
                h.Ident,
                h.CodeLanctImprod,
                h.CodeRubrique,
                h.HeureDebut,
                h.HeureFin,
                h.DateCreation
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            ORDER BY h.CodeLanctImprod, h.CodeRubrique, h.DateCreation ASC
        `;
        
        const events = await executeQuery(eventsQuery);
        
        // Grouper par lancement
        const lancementGroups = {};
        events.forEach(event => {
            const key = `${event.CodeLanctImprod}_${event.CodeRubrique}`;
            if (!lancementGroups[key]) {
                lancementGroups[key] = [];
            }
            lancementGroups[key].push(event);
        });
        
        const analysis = [];
        
        Object.keys(lancementGroups).forEach(key => {
            const groupEvents = lancementGroups[key].sort((a, b) => 
                new Date(a.DateCreation) - new Date(b.DateCreation)
            );
            
            const [lancementCode, operatorCode] = key.split('_');
            const pauseEvents = groupEvents.filter(e => e.Ident === 'PAUSE');
            const repriseEvents = groupEvents.filter(e => e.Ident === 'REPRISE');
            
            analysis.push({
                lancementCode,
                operatorCode,
                totalEvents: groupEvents.length,
                pauseEvents: pauseEvents.length,
                repriseEvents: repriseEvents.length,
                events: groupEvents.map(e => ({
                    id: e.NoEnreg,
                    ident: e.Ident,
                    date: e.DateCreation,
                    heure: e.HeureDebut
                })),
                pauseAnalysis: pauseEvents.map(pause => {
                    const reprise = repriseEvents.find(r => 
                        new Date(r.DateCreation) > new Date(pause.DateCreation) &&
                        r.CodeLanctImprod === pause.CodeLanctImprod &&
                        r.CodeRubrique === pause.CodeRubrique
                    );
                    return {
                        pauseId: pause.NoEnreg,
                        pauseDate: pause.DateCreation,
                        pauseHeure: pause.HeureDebut,
                        hasReprise: !!reprise,
                        repriseDate: reprise ? reprise.DateCreation : null,
                        repriseHeure: reprise ? reprise.HeureDebut : null,
                        status: reprise ? 'PAUSE_TERMINEE' : 'PAUSE'
                    };
                })
            });
        });
        
        res.json({
            success: true,
            totalLancements: analysis.length,
            analysis: analysis.sort((a, b) => a.lancementCode.localeCompare(b.lancementCode))
        });
        
    } catch (error) {
        console.error('❌ Erreur debug toutes les pauses:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du debug de toutes les pauses',
            details: error.message
        });
    }
});

// Route de debug pour tester la logique pause/reprise
router.get('/debug/pause-reprise/:lancementCode', async (req, res) => {
    try {
        const { lancementCode } = req.params;
        
        console.log(`🔍 Debug pause/reprise pour le lancement ${lancementCode}...`);
        
        // Récupérer tous les événements pour ce lancement
        const eventsQuery = `
            SELECT 
                h.NoEnreg,
                h.Ident,
                h.CodeLanctImprod,
                h.CodeRubrique,
                h.HeureDebut,
                h.HeureFin,
                h.DateCreation
            FROM [SEDI_APP_INDEPENDANTE].[dbo].[ABHISTORIQUE_OPERATEURS] h
            WHERE h.CodeLanctImprod = '${lancementCode}'
            ORDER BY h.DateCreation ASC, h.NoEnreg ASC
        `;
        
        const events = await executeQuery(eventsQuery);
        
        // Analyser les événements
        const pauseEvents = events.filter(e => e.Ident === 'PAUSE');
        const repriseEvents = events.filter(e => e.Ident === 'REPRISE');
        
        console.log(`📊 Événements trouvés pour ${lancementCode}:`, {
            total: events.length,
            pauses: pauseEvents.length,
            reprises: repriseEvents.length,
            events: events.map(e => ({
                id: e.NoEnreg,
                ident: e.Ident,
                operator: e.CodeRubrique,
                date: e.DateCreation,
                heure: e.HeureDebut
            }))
        });
        
        res.json({
            success: true,
            lancementCode,
            analysis: {
                totalEvents: events.length,
                pauseEvents: pauseEvents.length,
                repriseEvents: repriseEvents.length,
                events: events.map(e => ({
                    id: e.NoEnreg,
                    ident: e.Ident,
                    operator: e.CodeRubrique,
                    date: e.DateCreation,
                    heure: e.HeureDebut
                })),
                pauseReprisePairs: pauseEvents.map(pause => {
                    const reprise = repriseEvents.find(r => 
                        new Date(r.DateCreation) > new Date(pause.DateCreation) &&
                        r.CodeLanctImprod === pause.CodeLanctImprod &&
                        r.CodeRubrique === pause.CodeRubrique
                    );
                    return {
                        pause: {
                            id: pause.NoEnreg,
                            date: pause.DateCreation,
                            heure: pause.HeureDebut
                        },
                        reprise: reprise ? {
                            id: reprise.NoEnreg,
                            date: reprise.DateCreation,
                            heure: reprise.HeureDebut
                        } : null,
                        status: reprise ? 'PAUSE_TERMINEE' : 'PAUSE'
                    };
                })
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur debug pause/reprise:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du debug pause/reprise',
            details: error.message
        });
    }
});

// Route de test pour vérifier le format HH:mm
router.get('/test/time-format', async (req, res) => {
    try {
        console.log('🧪 Test du format HH:mm...');
        
        // Tests de formatTimeForSQL
        const testCases = [
            '14:30',      // Format HH:mm standard
            '09:15',      // Format HH:mm avec zéro
            '14:30:45',   // Format HH:mm:ss existant
            '9:5',        // Format H:m (sans zéros)
            null,         // Valeur null
            '',           // Chaîne vide
            'invalid'     // Format invalide
        ];
        
        const results = testCases.map(input => ({
            input: input,
            output: formatTimeForSQL(input),
            type: typeof input
        }));
        
        console.log('🧪 Résultats des tests:', results);
        
        res.json({
            success: true,
            message: 'Tests du format HH:mm terminés',
            format: 'HH:mm → HH:mm:ss (pour SQL)',
            tests: results,
            examples: {
                'Frontend': '14:30',
                'API': '14:30', 
                'SQL': '14:30:00',
                'Display': '14:30'
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur test format:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du test du format'
        });
    }
});

module.exports = router;
module.exports.processLancementEventsWithPauses = processLancementEventsWithPauses;
module.exports.getAdminOperations = getAdminOperations;