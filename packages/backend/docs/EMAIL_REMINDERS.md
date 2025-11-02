# Système de Notifications Email pour Rappels

## Vue d'ensemble

Le système d'email automatique pour rappels permet d'envoyer des notifications par email aux utilisateurs assignés lorsque des tâches, devis ou factures arrivent à échéance ou sont en retard.

## Activation

### 1. Configuration SMTP

Modifiez votre fichier `.env` :

```env
# Activer les notifications email
EMAIL_ENABLED=true
ENABLE_EMAIL_REMINDERS=true

# Configuration SMTP
SMTP_HOST=votre-serveur-smtp.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-username
SMTP_PASS=votre-password

# Expéditeur des emails
EMAIL_FROM_ADDRESS=noreply@votre-domaine.com
EMAIL_FROM_NAME=Votre Nom CRM
```

### 2. Configuration des Rappels

```env
# Fuseau horaire pour les rappels
REMINDER_TIMEZONE=Europe/Paris

# URL du frontend pour les liens dans les emails
FRONTEND_URL=https://votre-crm.com
```

## Types de Notifications Email

### 🗓️ Tâches (Tasks)
- **7 jours avant échéance** : Email avec countdown
- **En retard** : Email urgent avec mise en évidence
- **Contenu** : Titre, échéance, institution, statut, lien direct

### 📋 Devis (Quotes)  
- **7 jours avant expiration** : Email de relance commercial
- **Expiré** : Email d'alerte avec recommandations
- **Contenu** : Numéro devis, montant, échéance, institution, lien

### 💰 Factures (Invoices)
- **7 jours avant échéance** : Email de rappel paiement
- **En retard** : Email urgent de relance paiement
- **Contenu** : Numéro facture, montant, échéance, institution, lien

## Templates d'Email

Chaque type d'email utilise un template HTML professionnel avec :

- **En-tête personnalisé** : Nom et email de l'expéditeur
- **Design responsive** : Compatible mobile/desktop
- **Liens directs** : Boutons vers l'entité dans le CRM
- **Mise en forme** : Icônes, couleurs, mise en évidence
- **Signatures** : Signature automatique avec nom CRM

## Configuration Avancée

### Variables d'Environnement

```env
# Activation globale du système email
EMAIL_ENABLED=false              # Activer l'envoi d'emails
ENABLE_EMAIL_REMINDERS=false     # Activer les emails de rappels

# Configuration expéditeur
EMAIL_FROM_ADDRESS=noreply@medical-crm.com
EMAIL_FROM_NAME=Medical CRM

# Configuration SMTP
SMTP_HOST=localhost              # Serveur SMTP
SMTP_PORT=587                    # Port (587 = STARTTLS, 465 = SSL)
SMTP_SECURE=false               # true pour SSL/TLS
SMTP_USER=                      # Nom d'utilisateur SMTP
SMTP_PASS=                      # Mot de passe SMTP

# Système de rappels
REMINDER_TIMEZONE=Europe/Paris   # Fuseau horaire
REMINDER_BATCH_SIZE=100         # Taille de traitement par lot
REMINDER_CRON_SCHEDULE=0 9 * * * # Cron (défaut: 9h chaque jour)
REMINDER_CACHE_CLEANUP_DAYS=7   # Nettoyage cache (jours)

# Frontend
FRONTEND_URL=http://localhost:3000  # URL pour les liens email
```

### Planification des Rappels

Les rappels s'exécutent automatiquement via cron job :
- **Fréquence** : Quotidienne à 9h (configurable)
- **Fuseau horaire** : Europe/Paris (configurable)
- **Anti-spam** : Cache 23h pour éviter doublons

## Test du Système

### 1. Test de Configuration SMTP

```bash
cd packages/backend
node test-email-reminders.js
```

### 2. Test Manuel

1. Créez une tâche avec échéance dans 1-2 jours
2. Activez les rappels dans les paramètres
3. Attendez l'exécution du cron (ou déclenchez manuellement)
4. Vérifiez l'email reçu

## logs et Debugging

Les logs incluent :
- **Connexion SMTP** : Vérification automatique au démarrage
- **Envoi d'emails** : Succès/échec avec détails
- **Traitement rappels** : Volume d'entités traitées
- **Erreurs** : Messages détaillés pour debugging

## Sécurité et Performance

### Sécurité
- **Validation destinataires** : Vérification email avant envoi
- **Anti-spam** : Cache pour éviter doublons
- **Logs sécurisés** : Pas de mots de passe dans les logs

### Performance  
- **Traitement par lot** : 100 entités maximum par type
- **Templates optimisés** : HTML léger et responsive
- **Timeouts** : Gestion automatique des échecs SMTP

## Personnalisation

### Modifier les Templates

Les templates sont dans `ReminderService.ts` :
- `sendTaskReminderEmail()` - Tâches
- `sendQuoteReminderEmail()` - Devis  
- `sendInvoiceReminderEmail()` - Factures

### Ajouter Nouveaux Types

1. Ajouter le type dans `ReminderRule.entityType`
2. Créer méthode `send[Type]ReminderEmail()`
3. Ajouter cas dans `sendEmailReminder()`

## Support

En cas de problème :
1. Vérifiez les logs serveur
2. Testez la configuration SMTP
3. Validez les variables d'environnement
4. Vérifiez les permissions utilisateur

---

**Version** : 1.0  
**Compatibilité** : Medical CRM v1.0+  
**Maintenance** : Système inclus dans les mises à jour automatiques