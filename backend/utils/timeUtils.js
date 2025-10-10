// Utilitaires pour la gestion du temps local français
const moment = require('moment');

class TimeUtils {
    /**
     * Obtenir l'heure actuelle en format français (Europe/Paris)
     * @returns {string} Heure au format HH:mm
     */
    static getCurrentTime() {
        const now = new Date();
        // Utiliser toLocaleTimeString avec fuseau horaire français (Europe/Paris)
        const timeString = now.toLocaleTimeString("fr-FR", {
            timeZone: "Europe/Paris",
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        return timeString;
    }

    /**
     * Obtenir la date actuelle en format français
     * @returns {string} Date au format YYYY-MM-DD
     */
    static getCurrentDate() {
        const now = new Date();
        // Utiliser toLocaleDateString avec fuseau horaire français (Europe/Paris)
        const dateString = now.toLocaleDateString("fr-CA", {
            timeZone: "Europe/Paris"
        });
        
        return dateString; // Format YYYY-MM-DD
    }

    /**
     * Obtenir la date et l'heure actuelles en format français
     * @returns {object} {time: string, date: string, datetime: string}
     */
    static getCurrentDateTime() {
        const time = this.getCurrentTime();
        const date = this.getCurrentDate();
        const datetime = `${date} ${time}`;
        
        return { time, date, datetime };
    }

    /**
     * Logger avec timestamp français
     * @param {string} message 
     */
    static log(message) {
        const { datetime } = this.getCurrentDateTime();
        console.log(`[${datetime}] ${message}`);
    }
}

module.exports = TimeUtils;

