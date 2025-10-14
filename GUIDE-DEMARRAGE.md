# 🚀 GUIDE DE DÉMARRAGE SEDI TABLETTE

## ⚡ DÉMARRAGE RAPIDE

### Option 1 : Script automatique
```bash
# Double-cliquez sur le fichier
start-servers.bat
```

### Option 2 : Démarrage manuel

#### 1. Serveur Backend (Terminal 1)
```bash
cd backend
node server.js
```

#### 2. Serveur Frontend (Terminal 2)  
```bash
cd frontend
npx http-server . -p 8080 --cors
```

## 🌐 ACCÈS

- **Interface Utilisateur** : http://localhost:8080
- **Interface Admin** : http://localhost:8080 (Code: 929)
- **API Backend** : http://localhost:3001

## 🔧 DÉPANNAGE

### Problème : "Rien ne s'affiche sur le frontend"

**Solutions :**

1. **Vérifier les serveurs**
   ```bash
   # Tester le frontend
   curl http://localhost:8080
   
   # Tester le backend  
   curl http://localhost:3001/api/health
   ```

2. **Redémarrer les serveurs**
   - Appuyer sur `Ctrl+C` dans chaque terminal
   - Relancer les commandes de démarrage

3. **Vider le cache du navigateur**
   - Appuyer sur `F5` ou `Ctrl+F5`
   - Ou ouvrir les DevTools (F12) > Application > Clear Storage

4. **Vérifier les ports**
   - S'assurer qu'aucun autre service n'utilise les ports 3001 et 8080

### Problème : Erreurs dans la console

1. **Ouvrir les DevTools** (F12)
2. **Onglet Console** - voir les erreurs JavaScript
3. **Onglet Network** - voir les erreurs d'API

## ✅ FONCTIONNALITÉS DISPONIBLES

- ✅ Connexion opérateur
- ✅ Démarrage/Pause/Reprise/Arrêt des opérations
- ✅ Interface admin (Code: 929)
- ✅ Suivi des temps en temps réel
- ✅ Historique des opérations

## 📞 SUPPORT

Si les problèmes persistent :
1. Vérifier les logs dans les terminaux
2. Consulter la console du navigateur (F12)
3. Redémarrer complètement les serveurs
