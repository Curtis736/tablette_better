/**
 * ScannerManager - Gestionnaire de scan de code-barres moderne et optimisé pour tablettes
 * Utilise l'API MediaDevices native du navigateur
 */
class ScannerManager {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.ctx = null;
        this.scanInterval = null;
        this.onCodeScanned = null;
        this.onError = null;
    }

    /**
     * Initialise le scanner avec les callbacks
     * @param {Function} onCodeScanned - Callback appelé quand un code est scanné
     * @param {Function} onError - Callback appelé en cas d'erreur
     */
    init(onCodeScanned, onError) {
        this.onCodeScanned = onCodeScanned;
        this.onError = onError;
    }

    /**
     * Vérifie si ZXing est chargé
     * @returns {Promise<boolean>}
     */
    async waitForZXing(maxAttempts = 10) {
        for (let i = 0; i < maxAttempts; i++) {
            if (typeof ZXing !== 'undefined' && ZXing.BrowserMultiFormatReader) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        return false;
    }

    /**
     * Démarre le scanner avec accès à la caméra
     * @param {HTMLElement} videoElement - Élément video pour afficher le flux caméra
     * @param {HTMLElement} canvasElement - Élément canvas pour l'analyse d'image
     * @returns {Promise<void>}
     */
    async start(videoElement, canvasElement) {
        if (this.isScanning) {
            console.warn('Scanner déjà actif');
            return;
        }

        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        try {
            // Attendre que ZXing soit chargé
            const zxingLoaded = await this.waitForZXing();
            if (!zxingLoaded) {
                throw new Error('ZXing-js n\'est pas chargé. Vérifiez votre connexion internet et rechargez la page.');
            }

            // Demander l'accès à la caméra
            const constraints = {
                video: {
                    facingMode: 'environment', // Caméra arrière sur mobile/tablette
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Afficher le flux vidéo
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            this.isScanning = true;
            this.startScanningLoop();

            console.log('✅ Scanner démarré avec succès');
        } catch (error) {
            console.error('Erreur démarrage scanner:', error);
            this.handleError(error);
            throw error;
        }
    }

    /**
     * Arrête le scanner et libère les ressources
     */
    stop() {
        if (!this.isScanning) {
            return;
        }

        this.isScanning = false;

        // Arrêter ZXing si actif
        if (this.codeReader) {
            try {
                this.codeReader.reset();
            } catch (error) {
                console.warn('Erreur lors de l\'arrêt de ZXing:', error);
            }
            this.codeReader = null;
        }

        // Arrêter la boucle de scan
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        // Arrêter le flux vidéo
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Réinitialiser les éléments vidéo
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement = null;
        }

        if (this.canvasElement) {
            this.ctx = null;
        }

        console.log('✅ Scanner arrêté');
    }

    /**
     * Démarre la boucle de scan qui analyse les frames vidéo
     */
    startScanningLoop() {
        // Utiliser ZXing avec sa méthode native si disponible
        if (typeof ZXing !== 'undefined' && ZXing.BrowserMultiFormatReader) {
            try {
                this.codeReader = new ZXing.BrowserMultiFormatReader();
                
                // Décoder directement depuis la vidéo avec callback
                this.codeReader.decodeFromVideoDevice(null, this.videoElement, (result, error) => {
                    if (result) {
                        this.handleCodeScanned(result.getText());
                    }
                    // Les erreurs sont normales si aucun code n'est détecté
                });
                
                // Ne pas utiliser setInterval si ZXing gère déjà le scan
                return;
            } catch (error) {
                console.warn('Erreur initialisation ZXing, fallback sur canvas:', error);
            }
        }
        
        // Fallback : scan via canvas toutes les 300ms
        this.scanInterval = setInterval(() => {
            if (!this.isScanning || !this.videoElement || !this.canvasElement) {
                return;
            }

            try {
                // Vérifier que la vidéo est prête
                if (this.videoElement.readyState !== this.videoElement.HAVE_ENOUGH_DATA) {
                    return;
                }

                // Dessiner la frame vidéo sur le canvas
                const videoWidth = this.videoElement.videoWidth;
                const videoHeight = this.videoElement.videoHeight;

                if (videoWidth === 0 || videoHeight === 0) {
                    return;
                }

                this.canvasElement.width = videoWidth;
                this.canvasElement.height = videoHeight;
                this.ctx.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);

                // Analyser l'image pour détecter un code-barres
                this.scanFrame();
            } catch (error) {
                console.error('Erreur dans la boucle de scan:', error);
            }
        }, 300); // Scan toutes les 300ms
    }

    /**
     * Analyse une frame pour détecter un code-barres (fallback si ZXing direct ne fonctionne pas)
     */
    async scanFrame() {
        if (!this.ctx || !this.canvasElement || !this.videoElement) {
            return;
        }

        // Cette méthode n'est utilisée que si ZXing.decodeFromVideoDevice ne fonctionne pas
        // Pour l'instant, on laisse ZXing gérer directement depuis la vidéo
    }

    /**
     * Gère un code scanné avec succès
     * @param {string} code - Code scanné
     */
    handleCodeScanned(code) {
        if (!code || !this.isScanning) {
            return;
        }

        console.log('✅ Code scanné:', code);
        
        // Arrêter le scanner après un scan réussi
        this.stop();

        // Appeler le callback
        if (this.onCodeScanned) {
            this.onCodeScanned(code);
        }
    }

    /**
     * Gère les erreurs
     * @param {Error} error - Erreur survenue
     */
    handleError(error) {
        let errorMessage = 'Erreur lors du scan';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Permission d\'accès à la caméra refusée. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'Aucune caméra détectée sur cet appareil.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'La caméra est déjà utilisée par une autre application.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Les paramètres de la caméra ne sont pas supportés.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        if (this.onError) {
            this.onError(errorMessage, error);
        }
    }

    /**
     * Vérifie si le scanner est supporté par le navigateur
     * @returns {boolean}
     */
    static isSupported() {
        // Vérifier si l'API MediaDevices est disponible
        const hasMediaDevices = !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia
        );
        
        console.log('🔍 Vérification support scanner:');
        console.log('  - MediaDevices:', !!navigator.mediaDevices);
        console.log('  - getUserMedia:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
        console.log('  - Protocol:', location.protocol);
        console.log('  - Hostname:', location.hostname);
        
        if (!hasMediaDevices) {
            console.warn('❌ MediaDevices API non disponible');
            return false;
        }
        
        // Toujours retourner true si MediaDevices est disponible
        // Le navigateur gérera lui-même les restrictions de sécurité
        // et affichera un message d'erreur approprié si nécessaire
        console.log('✅ Scanner supporté');
        return true;
    }
}

export default ScannerManager;

