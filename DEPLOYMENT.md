# Guide de Déploiement - OPEx_CRM Monorepo

## Table des matières

1. [Prérequis](#prérequis)
2. [Architecture du Projet](#architecture-du-projet)
3. [Configuration Initiale](#configuration-initiale)
4. [Environnement de Développement](#environnement-de-développement)
5. [Déploiement en Production](#déploiement-en-production)
6. [Gestion de la Base de Données](#gestion-de-la-base-de-données)
7. [Configuration des Services](#configuration-des-services)
8. [Monitoring et Maintenance](#monitoring-et-maintenance)
9. [Dépannage](#dépannage)

---

## Prérequis

### Logiciels Requis

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 14.0
- **Git**: >= 2.30

### Recommandations

- **Serveur**: Ubuntu 22.04 LTS ou Debian 11+
- **RAM**: Minimum 4GB (8GB recommandé pour la production)
- **Stockage**: Minimum 20GB d'espace disque
- **Reverse Proxy**: Nginx ou Apache (recommandé pour la production)
- **Process Manager**: PM2 ou systemd (pour maintenir l'application en cours d'exécution)

---

## Architecture du Projet

Le projet est un monorepo organisé avec npm workspaces contenant:

```
medical-crm/
├── packages/
│   ├── backend/         # API Koa.js + Sequelize
│   ├── frontend/        # Vue 3 + Vuetify + Vite
│   ├── shared/          # Types TypeScript partagés
│   └── plugins/         # Extensions modulaires
├── package.json         # Configuration du monorepo
└── node_modules/        # Dépendances partagées
```

### Stack Technique

**Backend:**

- Koa.js (Framework web)
- Sequelize (ORM PostgreSQL)
- Socket.io (Communication temps réel)
- JWT (Authentification)
- Node-cron (Tâches planifiées)
- Winston (Logging)

**Frontend:**

- Vue 3 (Composition API)
- Vuetify 3 (Material Design)
- Vite (Build tool)
- Pinia (State management)
- Vue Router (Routing)
- Vue-i18n (Internationalisation)

---

## Configuration Initiale

### 1. Cloner le Projet

```bash
git clone <votre-repo-url> medical-crm
cd medical-crm
```

### 2. Installation des Dépendances

```bash
# Installation de toutes les dépendances du monorepo
npm install

# Si vous rencontrez des problèmes avec Puppeteer
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

### 3. Configuration de PostgreSQL

#### Installation de PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Création de la Base de Données

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le shell PostgreSQL
CREATE DATABASE medical_crm;
CREATE USER medical_crm_user WITH ENCRYPTED PASSWORD 'votre_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE medical_crm TO medical_crm_user;

# Pour la base de test (optionnel)
CREATE DATABASE medical_crm_test;
GRANT ALL PRIVILEGES ON DATABASE medical_crm_test TO medical_crm_user;

# Quitter
\q
```

### 4. Configuration des Variables d'Environnement

#### Backend (.env)

Créer `/packages/backend/.env`:

```bash
# Environment
NODE_ENV=production

# Server
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=medical_crm
DB_USER=medical_crm_user
DB_PASSWORD=votre_mot_de_passe_securise
DB_SYNC_ON_START=false

# JWT Authentication
JWT_SECRET=votre_secret_jwt_tres_securise_minimum_32_caracteres
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=votre_refresh_secret_tres_securise_minimum_32_caracteres
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application
SMTP_FROM=noreply@votredomaine.com

# Plugins (optionnel)
PLUGIN_DIRECTORY=./packages/plugins
PLUGIN_AUTO_ENABLE=true
```

#### Frontend (.env)

Créer `/packages/frontend/.env`:

```bash
# API URL
VITE_API_URL=http://localhost:3001/api

# Pour la production, utilisez votre domaine
# VITE_API_URL=https://api.votredomaine.com/api
```

#### Génération de Secrets Sécurisés

```bash
# Générer un secret JWT
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Répéter pour JWT_REFRESH_SECRET
```

---

## Environnement de Développement

### Démarrage Rapide

```bash
# Depuis la racine du monorepo

# 1. Build du package shared
npm run build:shared

# 2. Exécuter les migrations
npm run db:migrate

# 3. (Optionnel) Remplir avec des données de test
npm run db:seed

# 4. Démarrer tous les services en mode développement
npm run dev
```

Cela démarre:

- Frontend sur `http://localhost:3000`
- Backend sur `http://localhost:3001`
- Shared en mode watch

### Scripts de Développement Individuels

```bash
# Démarrer uniquement le backend
npm run dev:back

# Démarrer uniquement le frontend
npm run dev:front

# Démarrer uniquement shared en mode watch
npm run dev:shared
```

### Tests

```bash
# Exécuter tous les tests
npm test

# Tests backend uniquement
npm run test --workspace=@medical-crm/backend

# Tests frontend uniquement
npm run test --workspace=@medical-crm/frontend

# Tests avec coverage
npm run test:coverage --workspace=@medical-crm/backend

# Tests en mode watch
npm run test:watch --workspace=@medical-crm/backend
```

### Vérification de la Qualité du Code

```bash
# Lint de tous les packages
npm run lint

# Type-check TypeScript
npm run type-check --workspace=@medical-crm/backend
npm run type-check --workspace=@medical-crm/frontend
```

---

## Déploiement en Production

### 1. Préparation du Serveur

#### Mise à jour du système

```bash
sudo apt update && sudo apt upgrade -y
```

#### Installation de Node.js via nvm (recommandé)

```bash
# Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Installer Node.js LTS
nvm install 18
nvm use 18
nvm alias default 18
```

#### Installation de PostgreSQL

Voir [Configuration de PostgreSQL](#configuration-de-postgresql)

#### Installation de Nginx

```bash
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Installation de PM2

```bash
npm install -g pm2
```

### 2. Déploiement de l'Application

#### Clonage et Configuration

```bash
# Cloner le projet
cd /var/www
sudo git clone <votre-repo-url> medical-crm
sudo chown -R $USER:$USER medical-crm
cd medical-crm

# Configuration des variables d'environnement
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env

# Éditer les fichiers .env avec les valeurs de production
nano packages/backend/.env
nano packages/frontend/.env
```

#### Build de l'Application

```bash
# Installer les dépendances
PUPPETEER_SKIP_DOWNLOAD=true npm ci

# Build du package shared
npm run build:shared

# Build du backend
npm run build:backend

# Build du frontend
npm run build:frontend
```

### 3. Configuration de la Base de Données

```bash
# Exécuter les migrations
npm run db:migrate

# (Optionnel) Charger les données initiales
npm run db:seed
```

### 4. Démarrage avec PM2

#### Fichier de configuration PM2

Créer `ecosystem.config.js` à la racine:

```javascript
module.exports = {
  apps: [
    {
      name: "medical-crm-backend",
      cwd: "./packages/backend",
      script: "dist/index.js",
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      error_file: "../../logs/backend-error.log",
      out_file: "../../logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      max_memory_restart: "500M",
      autorestart: true,
      watch: false,
    },
  ],
}
```

#### Démarrage de l'application

```bash
# Créer le dossier des logs
mkdir -p logs

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

#### Commandes PM2 utiles

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs medical-crm-backend

# Redémarrer
pm2 restart medical-crm-backend

# Arrêter
pm2 stop medical-crm-backend

# Recharger sans downtime
pm2 reload medical-crm-backend

# Moniteur en temps réel
pm2 monit
```

### 5. Configuration de Nginx

#### Servir le Frontend et Proxy vers le Backend

Créer `/etc/nginx/sites-available/medical-crm`:

```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name votredomaine.com www.votredomaine.com;

    # Redirection vers HTTPS
    return 301 https://$server_name$request_uri;
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name votredomaine.com www.votredomaine.com;

    # SSL Configuration (à configurer avec Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votredomaine.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logs
    access_log /var/log/nginx/medical-crm-access.log;
    error_log /var/log/nginx/medical-crm-error.log;

    # Frontend (fichiers statiques)
    location / {
        root /var/www/medical-crm/packages/frontend/dist;
        try_files $uri $uri/ /index.html;

        # Cache des assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO (WebSocket)
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts (plus longs)
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # Limite de taille des uploads
    client_max_body_size 20M;
}
```

#### Activer le site

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/medical-crm /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 6. Configuration SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d votredomaine.com -d www.votredomaine.com

# Tester le renouvellement automatique
sudo certbot renew --dry-run
```

### 7. Configuration du Pare-feu

```bash
# Autoriser Nginx
sudo ufw allow 'Nginx Full'

# Autoriser SSH
sudo ufw allow OpenSSH

# Activer le pare-feu
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

---

## Gestion de la Base de Données

### Migrations

```bash
# Exécuter toutes les migrations
npm run db:migrate --workspace=@medical-crm/backend

# Annuler la dernière migration
npm run db:migrate:undo --workspace=@medical-crm/backend

# Créer une nouvelle migration
cd packages/backend
npx sequelize-cli migration:generate --name nom-de-la-migration
```

### Seeders

```bash
# Exécuter tous les seeders
npm run db:seed --workspace=@medical-crm/backend

# Exécuter un seeder spécifique
cd packages/backend
npx sequelize-cli db:seed --seed nom-du-seeder.js

# Annuler tous les seeders
npx sequelize-cli db:seed:undo:all
```

### Backup et Restauration

#### Backup

```bash
# Backup complet de la base
pg_dump -U medical_crm_user -h localhost medical_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup avec compression
pg_dump -U medical_crm_user -h localhost medical_crm | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Script de backup automatisé (créer /usr/local/bin/backup-medical-crm.sh)
#!/bin/bash
BACKUP_DIR="/var/backups/medical-crm"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup de la base
pg_dump -U medical_crm_user medical_crm | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# Garder seulement les 30 derniers jours
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

# Ajouter au crontab pour backup quotidien à 2h du matin
# 0 2 * * * /usr/local/bin/backup-medical-crm.sh
```

#### Restauration

```bash
# Depuis un fichier non compressé
psql -U medical_crm_user -h localhost medical_crm < backup.sql

# Depuis un fichier compressé
gunzip -c backup.sql.gz | psql -U medical_crm_user -h localhost medical_crm

# Recréer complètement la base si nécessaire
dropdb -U postgres medical_crm
createdb -U postgres medical_crm
psql -U medical_crm_user -h localhost medical_crm < backup.sql
```

---

## Configuration des Services

### Email (SMTP)

Le système utilise Nodemailer pour l'envoi d'emails. Configuration dans `.env`:

```bash
# Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=mot-de-passe-application
SMTP_FROM=noreply@votredomaine.com

# Pour Gmail, créer un mot de passe d'application:
# https://myaccount.google.com/apppasswords

# Autres providers SMTP
# SendGrid, Mailgun, AWS SES, etc.
```

### Tâches Planifiées (Cron Jobs)

Le backend exécute automatiquement les tâches suivantes via node-cron:

- **Relances de devis**: Tous les jours à 8h (QuoteReminderProcessor)
- **Notifications de tâches**: Vérification des tâches à échéance

Ces tâches sont configurées dans:

- `packages/backend/src/jobs/quoteReminderProcessor.ts`

Pour vérifier les logs des jobs:

```bash
pm2 logs medical-crm-backend | grep -i cron
```

### Socket.IO (Temps Réel)

Socket.IO est utilisé pour les notifications en temps réel. La configuration Nginx doit inclure le proxy WebSocket (voir ci-dessus).

Vérifier la connexion WebSocket:

- Frontend: Vérifier la console du navigateur
- Backend: Vérifier les logs `pm2 logs medical-crm-backend`

---

## Monitoring et Maintenance

### Logs

#### Backend

```bash
# Logs en temps réel
pm2 logs medical-crm-backend

# Logs d'erreurs uniquement
pm2 logs medical-crm-backend --err

# Logs des 100 dernières lignes
pm2 logs medical-crm-backend --lines 100
```

#### Nginx

```bash
# Logs d'accès
sudo tail -f /var/log/nginx/medical-crm-access.log

# Logs d'erreurs
sudo tail -f /var/log/nginx/medical-crm-error.log
```

#### PostgreSQL

```bash
# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Monitoring des Performances

#### PM2 Monitoring

```bash
# Interface de monitoring en temps réel
pm2 monit

# Métriques système
pm2 status
```

#### PostgreSQL

```bash
# Connexions actives
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Taille de la base
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('medical_crm'));"

# Statistiques des tables
sudo -u postgres psql medical_crm -c "SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

### Mises à Jour

#### Mise à jour de l'application

```bash
cd /var/www/medical-crm

# Récupérer les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
PUPPETEER_SKIP_DOWNLOAD=true npm ci

# Build
npm run build:shared
npm run build:backend
npm run build:frontend

# Exécuter les migrations
npm run db:migrate

# Redémarrer sans downtime
pm2 reload medical-crm-backend
```

#### Automatisation avec un script

Créer `/usr/local/bin/update-medical-crm.sh`:

```bash
#!/bin/bash
set -e

APP_DIR="/var/www/medical-crm"
LOG_FILE="/var/log/medical-crm-update.log"

echo "[$(date)] Starting update..." | tee -a $LOG_FILE

cd $APP_DIR

# Backup de la base avant mise à jour
/usr/local/bin/backup-medical-crm.sh

# Pull des modifications
git pull origin main | tee -a $LOG_FILE

# Installation des dépendances
PUPPETEER_SKIP_DOWNLOAD=true npm ci | tee -a $LOG_FILE

# Build
npm run build:shared | tee -a $LOG_FILE
npm run build:backend | tee -a $LOG_FILE
npm run build:frontend | tee -a $LOG_FILE

# Migrations
npm run db:migrate | tee -a $LOG_FILE

# Redémarrage
pm2 reload medical-crm-backend | tee -a $LOG_FILE

echo "[$(date)] Update completed successfully!" | tee -a $LOG_FILE
```

### Monitoring de la Santé de l'Application

Créer un endpoint de health check (déjà implémenté dans le backend):

```bash
# Tester le health check
curl http://localhost:3001/api/health

# Avec un monitoring externe (UptimeRobot, StatusCake, etc.)
# Configurer la surveillance de: https://votredomaine.com/api/health
```

---

## Dépannage

### Problèmes Courants

#### L'application ne démarre pas

```bash
# Vérifier les logs PM2
pm2 logs medical-crm-backend --err

# Vérifier la connexion à la base de données
cd packages/backend
npm run health-check

# Vérifier les variables d'environnement
cat packages/backend/.env
```

#### Erreur de connexion à PostgreSQL

```bash
# Vérifier que PostgreSQL est en cours d'exécution
sudo systemctl status postgresql

# Tester la connexion
psql -U medical_crm_user -h localhost -d medical_crm

# Vérifier les permissions
sudo -u postgres psql -c "\du"
sudo -u postgres psql -c "\l"
```

#### Erreurs 502 Bad Gateway (Nginx)

```bash
# Vérifier que le backend est en cours d'exécution
pm2 status

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/medical-crm-error.log

# Tester l'accès direct au backend
curl http://localhost:3001/api/health
```

#### WebSocket ne fonctionne pas

```bash
# Vérifier la configuration Nginx pour /socket.io
sudo nginx -t
sudo cat /etc/nginx/sites-available/medical-crm | grep -A 20 "location /socket.io"

# Vérifier les logs du backend
pm2 logs medical-crm-backend | grep -i socket
```

#### Problèmes de mémoire

```bash
# Augmenter la limite de mémoire dans ecosystem.config.js
max_memory_restart: '1G'  # Au lieu de 500M

# Redémarrer PM2
pm2 restart medical-crm-backend
```

#### Migration échouée

```bash
# Voir la dernière migration appliquée
cd packages/backend
npx sequelize-cli db:migrate:status

# Annuler la dernière migration
npx sequelize-cli db:migrate:undo

# Réappliquer
npm run db:migrate
```

### Outils de Diagnostic

```bash
# Vérifier l'utilisation des ressources
htop

# Vérifier l'espace disque
df -h

# Vérifier la charge système
uptime

# Vérifier les ports en écoute
sudo netstat -tulpn | grep LISTEN

# Tester la connectivité réseau
ping google.com
curl https://votredomaine.com
```

### Reset Complet (En cas de problème majeur)

**⚠️ ATTENTION: Cela supprimera toutes les données!**

```bash
# Backup d'abord!
pg_dump -U medical_crm_user medical_crm > backup_before_reset.sql

# Arrêter l'application
pm2 stop medical-crm-backend

# Reset de la base
cd /var/www/medical-crm/packages/backend
npm run db:drop
npm run db:create
npm run db:migrate
npm run db:seed

# Rebuild
cd /var/www/medical-crm
npm run build

# Redémarrer
pm2 restart medical-crm-backend
```

---

## Checklist de Déploiement

### Avant le Déploiement

- [ ] Backup de la base de données de production
- [ ] Tests passent en local (`npm test`)
- [ ] Type-check sans erreur (`npm run type-check`)
- [ ] Variables d'environnement configurées
- [ ] Secrets JWT générés de manière sécurisée
- [ ] Configuration SMTP validée
- [ ] SSL/TLS configuré (Let's Encrypt)
- [ ] Firewall configuré (ufw)

### Déploiement

- [ ] Code pushé sur le repository
- [ ] Pull des dernières modifications sur le serveur
- [ ] Installation des dépendances (`npm ci`)
- [ ] Build réussi (`npm run build`)
- [ ] Migrations exécutées (`npm run db:migrate`)
- [ ] Application redémarrée (`pm2 reload`)
- [ ] Nginx rechargé (`sudo systemctl reload nginx`)

### Après le Déploiement

- [ ] Health check réussit (`curl https://votredomaine.com/api/health`)
- [ ] Frontend accessible
- [ ] Backend API répond
- [ ] WebSocket fonctionne
- [ ] Email de test envoyé
- [ ] Logs sans erreur critique
- [ ] Monitoring actif
- [ ] Backup automatique configuré

---

## Support et Ressources

### Documentation

- [Node.js](https://nodejs.org/docs/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Koa.js](https://koajs.com/)
- [Vue.js](https://vuejs.org/)
- [Sequelize](https://sequelize.org/)
- [PM2](https://pm2.keymetrics.io/)
- [Nginx](https://nginx.org/en/docs/)

### Commandes de Référence Rapide

```bash
# Démarrage
pm2 start ecosystem.config.js

# Monitoring
pm2 monit
pm2 logs

# Redémarrage
pm2 reload medical-crm-backend

# Mise à jour
cd /var/www/medical-crm
git pull && npm ci && npm run build && pm2 reload medical-crm-backend

# Backup
pg_dump -U medical_crm_user medical_crm | gzip > backup_$(date +%Y%m%d).sql.gz

# Logs
pm2 logs medical-crm-backend
sudo tail -f /var/log/nginx/medical-crm-error.log
```

---

**Version du Guide**: 1.0
**Dernière Mise à Jour**: 2025-11-15
**Mainteneur**: Équipe OPEx_CRM
