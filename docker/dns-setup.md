# Configuration DNS pour SEDI Tablette

## 🌐 Configuration du Nom de Domaine

### **Nom de domaine choisi :**
- **Production** : `sedi-tablette.local`
- **Développement** : `sedi-tablette-dev.local`

## 🔧 Configuration sur le Serveur

### 1. **Configuration du serveur DNS local**

Sur le serveur de production (192.168.1.26), ajoutez dans `/etc/hosts` :

```bash
# SEDI Tablette Production
127.0.0.1 sedi-tablette.local
192.168.1.26 sedi-tablette.local

# SEDI Tablette Development (optionnel)
127.0.0.1 sedi-tablette-dev.local
192.168.1.26 sedi-tablette-dev.local
```

### 2. **Configuration sur les machines clientes**

Sur chaque machine qui doit accéder à l'application, ajoutez dans le fichier `hosts` :

#### **Windows** (`C:\Windows\System32\drivers\etc\hosts`)
```
# SEDI Tablette Production
192.168.1.26 sedi-tablette.local
```

#### **Linux/Mac** (`/etc/hosts`)
```
# SEDI Tablette Production
192.168.1.26 sedi-tablette.local
```

## 🚀 **Avantages de l'utilisation DNS**

✅ **Plus professionnel** - Nom de domaine au lieu d'IP  
✅ **Plus facile à retenir** - `sedi-tablette.local` vs `192.168.1.26`  
✅ **Plus flexible** - Changement d'IP sans modifier le code  
✅ **Meilleure sécurité** - Pas d'exposition d'IP interne  
✅ **Configuration centralisée** - Un seul endroit à modifier  

## 🔧 **Configuration Nginx**

La configuration Nginx a été mise à jour pour accepter le nom de domaine :

```nginx
server {
    listen 80;
    server_name sedi-tablette.local localhost;
    # ... reste de la configuration
}
```

## 📱 **Accès à l'Application**

### **URLs de Production :**
- **Interface Web** : http://sedi-tablette.local
- **API Backend** : http://sedi-tablette.local:3001
- **Health Check** : http://sedi-tablette.local:3001/api/health

### **URLs de Développement :**
- **Interface Web** : http://sedi-tablette-dev.local:8080
- **API Backend** : http://sedi-tablette-dev.local:3001

## 🔍 **Vérification de la Configuration**

### **Test de résolution DNS :**
```bash
# Vérifier que le nom de domaine résout correctement
nslookup sedi-tablette.local
# ou
ping sedi-tablette.local
```

### **Test de l'application :**
```bash
# Test de l'API
curl http://sedi-tablette.local:3001/api/health

# Test du frontend
curl http://sedi-tablette.local
```

## 🛠️ **Scripts de Configuration Automatique**

### **Windows :**
```cmd
# Ajouter l'entrée DNS automatiquement
echo 192.168.1.26 sedi-tablette.local >> C:\Windows\System32\drivers\etc\hosts
```

### **Linux/Mac :**
```bash
# Ajouter l'entrée DNS automatiquement
echo "192.168.1.26 sedi-tablette.local" | sudo tee -a /etc/hosts
```

## 🔒 **Sécurité**

- Le nom de domaine `.local` est réservé pour les réseaux locaux
- Aucune exposition sur Internet
- Configuration sécurisée pour l'environnement de production

## 📝 **Notes Importantes**

1. **Redémarrage requis** : Après modification du fichier hosts, redémarrez le navigateur
2. **Cache DNS** : Videz le cache DNS si nécessaire
3. **Firewall** : Vérifiez que les ports 80 et 3001 sont ouverts
4. **Certificats SSL** : Pour HTTPS, générez des certificats pour `sedi-tablette.local`
