# Guide de Déploiement - Hetzner avec Docker

Ce guide détaille le déploiement complet de l'application Medical CRM sur un serveur Hetzner avec Docker, Caddy, PostgreSQL et backups automatiques sur Cloudflare R2.

## Table des matières

1. [Architecture](#architecture)
2. [Prérequis](#prérequis)
3. [Validation avant déploiement](#validation-avant-déploiement)
4. [Configuration du serveur Hetzner](#configuration-du-serveur-hetzner)
5. [Configuration DNS](#configuration-dns)
6. [Configuration des variables d'environnement](#configuration-des-variables-denvironnement)
7. [Déploiement initial](#déploiement-initial)
8. [Configuration Cloudflare R2](#configuration-cloudflare-r2)
9. [Vérification et monitoring](#vérification-et-monitoring)
10. [Maintenance](#maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

```bash
Internet
   ↓
Caddy (reverse proxy + SSL)
   ├─→ Frontend (Nginx Alpine) - Port 8080
   ├─→ Backend (Node.js Koa) - Port 3000

Backend → PostgreSQL 18 (réseau privé)
         ↓
    Backup Service
         ↓
    Cloudflare R2
```

**Composants:**

- **Caddy**: Reverse proxy avec SSL Let's Encrypt automatique
- **Frontend**: Vue 3 + Vite (build statique servi par Nginx)
- **Backend**: Koa.js + TypeScript + Sequelize
- **PostgreSQL 18**: Base de données
- **Backup Service**: Backups quotidiens vers Cloudflare R2

**Convention du système de fichiers :**

- `/srv/medical-crm/` - Application Docker (selon FHS pour les services)
- `/var/` - Données variables (logs, cache, temp)
- `/opt/` - Logiciels tiers (non utilisé ici)

Le répertoire `/srv/` est la convention moderne pour les services selon le [Filesystem Hierarchy Standard](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html#srvServicesForThisSystem).

---

## Prérequis

### Sur votre machine locale

- Git
- Accès SSH au serveur Hetzner
- Compte GitHub avec accès au repository
- Compte Cloudflare avec R2 activé

### Sur le serveur Hetzner

- **OS**: Ubuntu 22.04 LTS ou 24.04 LTS
- **RAM**: Minimum 2GB (recommandé 4GB+)
- **Disque**: Minimum 20GB (recommandé 40GB+)
- **Réseau**: IPv4 public

---

## Validation avant déploiement

**⚠️ IMPORTANT**: Validez toujours votre code AVANT de déployer sur Hetzner !

### Validation rapide (quotidienne)

Avant chaque push vers GitHub, exécutez la validation rapide (~1-2 min) :

```bash
npm run validate:quick
```

Vérifie :

- ✅ TypeScript type checking
- ✅ Linting
- ✅ Tests
- ✅ Build du package shared

### Validation complète (avant déploiement)

Avant de déployer sur Hetzner (surtout la première fois ou après changements majeurs), exécutez la validation complète (~5-10 min) :

```bash
npm run validate:deploy
```

Vérifie tout, **y compris** :

- ✅ Tout ce que la validation rapide vérifie
- ✅ Installation Docker
- ✅ Syntaxe docker-compose
- ✅ Version Node.js (>= 18)
- ✅ **Construction de toutes les images Docker**

### Workflow recommandé

```bash
# 1. Faire vos changements
git add .

# 2. Validation rapide avant push
npm run validate:quick

# 3. Commit et push
git commit -m "Mon changement"
git push

# 4. GitHub Actions valide automatiquement
# (voir .github/workflows/)

# 5. Avant déploiement production sur Hetzner
npm run validate:deploy

# 6. Sur Hetzner, après le déploiement
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh
```

Pour plus de détails, voir `scripts/README.md`.

---

## Configuration du serveur Hetzner

### 1. Créer le serveur

1. Connectez-vous à Hetzner Cloud Console
2. Créez un nouveau serveur :
   - **Location**: Nuremberg (ou proche de vous)
   - **Image**: Ubuntu 24.04 LTS
   - **Type**: CX22 minimum (2vCPU, 4GB RAM)
   - **SSH Key**: Ajoutez votre clé publique

### 2. Connexion initiale

```bash
ssh root@<HETZNER_IP>
```

### 3. Configuration de base

```bash
# Mise à jour du système
apt update && apt upgrade -y

# Installation des dépendances
apt install -y \
    curl \
    git \
    htop \
    vim \
    ufw \
    fail2ban

# Configuration du firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# Configuration fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 4. Installation de Docker

```bash
# Désinstaller les anciennes versions
apt remove -y docker docker-engine docker.io containerd runc || true

# Installation via le script officiel
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Démarrage automatique
systemctl enable docker
systemctl start docker

# Vérification
docker --version
```

### 5. Créer un utilisateur non-root (optionnel mais recommandé)

```bash
# Créer utilisateur
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Copier les clés SSH
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Tester la connexion
# ssh deploy@<HETZNER_IP>
```

### 6. Créer le répertoire de l'application

```bash
# En tant que root ou deploy
mkdir -p /srv/medical-crm
cd /srv/medical-crm

# Cloner le repository
git clone https://github.com/<VOTRE-USERNAME>/crm_monorepo.git .

# Permissions (si utilisateur deploy)
chown -R deploy:deploy /srv/medical-crm
```

---

## Configuration DNS

### Sur Hostinger (ou votre provider DNS)

Créez les enregistrements DNS suivants :

```bash
Type    Nom                     Valeur              TTL
A       example.com             <HETZNER-IP>
CNAME   crm                     <example.com>      3600
CNAME   crmapi                  <example.com>      3600
```

Remplacez `example.com` par votre domaine réel.

**Vérification:**

```bash
# Depuis votre machine locale
dig crm.example.com
dig api.example.com
```

---

## Configuration des variables d'environnement

### 1. Créer le fichier .env.production

```bash
cd /srv/medical-crm
vim .env.production
```

**Contenu:**

```bash
# Copy from .env.production.example and fill in all required values

# DOMAINS
DOMAIN=example.com
FRONTEND_DOMAIN=crm.example.com
BACKEND_DOMAIN=api.example.com

# DATABASE
POSTGRES_DB=medical_crm
POSTGRES_USER=medical_crm_user
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>
DB_SYNC_ON_START=false

# BACKEND
JWT_SECRET=<RANDOM_SECRET_256_BITS>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<RANDOM_SECRET_256_BITS>
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
LOG_LEVEL=warn

# EMAIL & SMTP
EMAIL_ENABLED=true
EMAIL_FROM_ADDRESS=noreply@example.com
EMAIL_FROM_NAME=Medical CRM
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# FRONTEND
FRONTEND_URL=https://crm.example.com
DICEBEAR_API_URL=https://api.dicebear.com/7.x

# REMINDER SYSTEM
ENABLE_EMAIL_REMINDERS=true
REMINDER_TIMEZONE=Europe/Paris
REMINDER_BATCH_SIZE=100
REMINDER_CRON_SCHEDULE=0 9 * * *
REMINDER_CACHE_CLEANUP_DAYS=7

# CLOUDFLARE R2 BACKUP
R2_ACCESS_KEY_ID=<YOUR_R2_ACCESS_KEY>
R2_SECRET_ACCESS_KEY=<YOUR_R2_SECRET_KEY>
R2_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_BUCKET_NAME=medical-crm-backups
TEST_DB_NAME=medical_crm_test_restore

# INTEGRATIONS
DIGIFORMA_ENCRYPTION_KEY=<32_CHAR_ENCRYPTION_KEY>
DIGIFORMA_API_URL=https://app.digiforma.com/api/v1/graphql

# HETZNER (for GitHub Actions)
HETZNER_HOST=<HETZNER_IP>
HETZNER_USERNAME=deploy
HETZNER_SSH_PORT=22
```

### 2. Générer les secrets

```bash
# JWT Secret (256 bits)
openssl rand -base64 32

# JWT Refresh Secret (256 bits)
openssl rand -base64 32

# PostgreSQL Password (192 bits)
openssl rand -base64 24

# Digiforma Encryption Key (256 bits)
openssl rand -base64 32
```

Modifiez :

- `main: "example.com"` → votre domaine
- `email: "your-email@example.com"` → votre email

Modifiez :

- `https://your-frontend-domain.com` → `https://crm.example.com`

---

## Déploiement initial

### 1. Build local (première fois)

Sur le serveur Hetzner :

```bash
cd /srv/medical-crm

# Charger les variables d'environnement
export $(cat .env.production | grep -v '^#' | xargs)

# Build les images
docker compose -f docker-compose.prod.yml build

# Démarrer les services
docker compose -f docker-compose.prod.yml up -d

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f
```

### 2. Initialiser la base de données

```bash
# Attendre que PostgreSQL soit prêt
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Exécuter les migrations
docker compose -f docker-compose.prod.yml exec backend npm run db:migrate

# (Optionnel) Seed initial
docker compose -f docker-compose.prod.yml exec backend npm run db:seed
```

### 3. Vérifier les services

```bash
# Status des containers
docker compose -f docker-compose.prod.yml ps

# Health checks
docker compose -f docker-compose.prod.yml exec backend node -e "require('http').get('http://localhost:3000/health', (r) => console.log(r.statusCode))"

# Vérifier les certificats SSL
curl -I https://crm.example.com
curl -I https://api.example.com
```

---

## Configuration Cloudflare R2

### 1. Créer un bucket R2

1. Connectez-vous à Cloudflare Dashboard
2. Allez dans **R2** (sidebar)
3. Créez un bucket : `medical-crm-backups`

### 2. Générer les clés d'accès

1. Dans R2, cliquez sur **Manage R2 API Tokens**
2. Créez un nouveau token :
   - **Nom**: Medical CRM Backup
   - **Permissions**: Object Read & Write
   - **Bucket**: medical-crm-backups
3. Copiez :
   - Access Key ID
   - Secret Access Key
   - Endpoint URL (format: `https://<account_id>.r2.cloudflarestorage.com`)

### 3. Mettre à jour .env.production

Ajoutez les valeurs copiées dans votre `.env.production`

### 4. Redémarrer le service backup

```bash
docker compose -f docker-compose.prod.yml restart postgres-backup

# Vérifier les logs
docker compose -f docker-compose.prod.yml logs -f postgres-backup
```

### 5. Tester le backup manuel

```bash
docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh
```

Vérifiez dans Cloudflare R2 que le fichier apparaît dans `medical-crm-backups/postgres/`

### 6. Tester la restauration (recommandé)

**⚠️ Important:** Testez régulièrement que vos backups peuvent être restaurés :

```bash
# Test avec le dernier backup
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh

# Test avec un backup spécifique
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh backup_medical_crm_20260101_000000.sql.gz
```

Le script va :

- Télécharger le backup depuis R2
- Créer une base de test temporaire
- Restaurer le backup
- Vérifier l'intégrité des données (tables, lignes)
- Nettoyer la base de test automatiquement

---

## Configuration GitHub Actions (CI/CD)

### 1. Ajouter les secrets GitHub

Dans votre repository GitHub :

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Ajoutez :

| Secret Name        | Value                                  |
| ------------------ | -------------------------------------- |
| `DOMAIN`           | example.com                            |
| `FRONTEND_DOMAIN`  | crm.example.com                        |
| `HETZNER_HOST`     | IP de votre serveur                    |
| `HETZNER_USERNAME` | deploy (ou root)                       |
| `HETZNER_SSH_KEY`  | Votre clé privée SSH (content complet) |
| `HETZNER_SSH_PORT` | 22                                     |

**Note:** GitHub Actions a déjà accès à `GITHUB_TOKEN` automatiquement.

### 2. Activer GitHub Container Registry

Le workflow push les images vers `ghcr.io`. Assurez-vous que :

1. **Settings** → **Actions** → **General**
2. **Workflow permissions** → Cochez "Read and write permissions"

### 3. Tester le workflow

```bash
# Push sur main déclenche le déploiement
git add .
git commit -m "Initial production setup"
git push origin main
```

Suivez le déploiement dans **Actions** tab sur GitHub.

---

## Vérification et monitoring

### Commandes utiles

```bash
# Status des services
docker compose -f docker-compose.prod.yml ps

# Logs en temps réel
docker compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker compose -f docker-compose.prod.yml logs -f backend

# Utilisation des ressources
docker stats

# Espace disque
df -h
docker system df
```

### Logs PostgreSQL

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U medical_crm_user -d medical_crm -c "SELECT version();"
```

---

## Maintenance

### Mises à jour

```bash
cd /srv/medical-crm

# Pull les dernières images
docker compose -f docker-compose.prod.yml pull

# Redémarrer avec les nouvelles images
docker compose -f docker-compose.prod.yml up -d

# Nettoyer les anciennes images
docker image prune -a
```

### Backups manuels

```bash
# Backup immédiat
docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh

# Lister les backups dans R2
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 ls s3://medical-crm-backups/postgres/ --endpoint-url=$R2_ENDPOINT_URL
```

### Restaurer un backup

```bash
# Télécharger le backup
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 cp s3://medical-crm-backups/postgres/backup_medical_crm_20260101_000000.sql.gz \
  /backup/restore.sql.gz --endpoint-url=$R2_ENDPOINT_URL

# Décompresser et restaurer
docker compose -f docker-compose.prod.yml exec postgres bash -c \
  "gunzip < /var/lib/postgresql/data/restore.sql.gz | psql -U medical_crm_user -d medical_crm"
```

### Rotation des logs

```bash
# Limiter la taille des logs Docker
vim /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
systemctl restart docker
```

---

## Troubleshooting

### Container ne démarre pas

```bash
# Voir les logs détaillés
docker compose -f docker-compose.prod.yml logs <service-name>

# Inspecter le container
docker inspect <container-id>
```

### Certificat SSL non généré

```bash

# Vérifier que le port 80 est accessible depuis Internet
curl http://<HETZNER_IP>

# Vérifier les enregistrements DNS
dig crm.example.com
```

### Base de données ne répond pas

```bash
# Vérifier le health check
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Se connecter manuellement
docker compose -f docker-compose.prod.yml exec postgres psql -U medical_crm_user -d medical_crm
```

### Migration échoue

```bash
# Voir le statut des migrations
docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:migrate:status

# Rollback si nécessaire
docker compose -f docker-compose.prod.yml exec backend npx sequelize-cli db:migrate:undo
```

### Backup ne fonctionne pas

```bash
# Vérifier la connectivité R2
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 ls s3://medical-crm-backups/ --endpoint-url=$R2_ENDPOINT_URL

# Tester manuellement
docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh
```

---

## Optimisations avancées

### Tuning PostgreSQL

```bash
vim /srv/medical-crm/postgres/postgresql.conf
```

Ajoutez dans docker-compose.prod.yml :

```yaml
postgres:
  command: postgres -c config_file=/etc/postgresql/postgresql.conf
  volumes:
    - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
```

### Cache Redis (optionnel)

Ajoutez un service Redis pour le cache :

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  networks:
    - backend
  volumes:
    - redis-data:/data
  command: redis-server --appendonly yes
```

---

## Sécurité

### Checklist

- [ ] Firewall UFW activé
- [ ] Fail2ban configuré
- [ ] Utilisateur non-root créé
- [ ] SSH par clé uniquement (désactiver mot de passe)
- [ ] PostgreSQL sur réseau privé uniquement
- [ ] Secrets forts (JWT, DB password)
- [ ] HTTPS forcé (Caddy redirect)
- [ ] Backups testés
- [ ] Rate limiting activé
- [ ] Headers de sécurité configurés

### Durcissement SSH

```bash
vim /etc/ssh/sshd_config
```

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 2222  # Changer le port
```

```bash
systemctl restart sshd

# Mettre à jour UFW
ufw allow 2222/tcp
ufw delete allow ssh
```

---

## Support

Pour toute question :

- Issues GitHub : https://github.com/<USERNAME>/crm_monorepo/issues
- Documentation caddy : (https://caddyserver.com/docs/automatic-https)
- Documentation Cloudflare R2 : https://developers.cloudflare.com/r2/

---

**Fait avec ❤️ pour un déploiement production-ready !**
