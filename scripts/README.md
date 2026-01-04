# Pre-Deployment Validation

This directory contains scripts to validate your code BEFORE deploying to production.

## Scripts

### validate-deployment.sh (Full Validation)
Comprehensive validation that checks everything, including Docker image builds.

**Run this BEFORE deploying to Hetzner for the first time or after major changes.**

```bash
npm run validate:deploy
# or
bash scripts/validate-deployment.sh
```

**What it checks:**
- ✅ Docker installation
- ✅ docker-compose configuration syntax
- ✅ Node.js version (>= 18)
- ✅ Environment files present
- ✅ TypeScript type checking
- ✅ Linting
- ✅ All tests pass
- ✅ Shared package builds
- ✅ Docker images build successfully

**Time:** ~5-10 minutes (includes Docker builds)

### quick-check.sh (Quick Validation)
Fast validation for daily development. Does NOT build Docker images.

**Run this BEFORE every push to GitHub.**

```bash
npm run validate:quick
# or
bash scripts/quick-check.sh
```

**What it checks:**
- ✅ TypeScript type checking
- ✅ Linting
- ✅ All tests pass
- ✅ Shared package builds

**Time:** ~1-2 minutes

## Usage Workflow

### Daily Development
```bash
# Make your changes...
git add .
npm run validate:quick  # Quick check before push
git commit -m "your changes"
git push
```

### Before Major Deployments
```bash
# Before deploying to Hetzner
npm run validate:deploy  # Full validation including Docker builds
```

### CI/CD Pipeline

The GitHub Actions workflow in `.github/workflows/deploy-production.yml` runs these checks automatically before deploying to Hetzner.

## Troubleshooting

### Docker build fails
- Check Docker logs: `docker compose -f docker-compose.prod.yml build --no-cache`
- Ensure Docker has enough disk space: `docker system df`
- Clean up: `docker system prune -a`

### TypeScript errors
- Fix type errors in your IDE or terminal
- Run `npm run type-check` to see specific errors

### Tests fail
- Run specific test: `npx vitest run <test-file>`
- Check test logs for specific failures

## Pre-Commit Hook (Optional)

To automatically run quick validation before every commit:

```bash
# Create .git/hooks/pre-commit (run this from your project root)
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
bash scripts/quick-check.sh
EOF
chmod +x .git/hooks/pre-commit
```

Now `git commit` will automatically run validation.

## Continuous Integration

GitHub Actions automatically runs:
1. `validate:quick` on every push
2. `validate:deploy` before production deployment

See `.github/workflows/` for details.

## Best Practices

1. **Always validate before pushing** - Use `validate:quick` daily
2. **Full validation before major releases** - Use `validate:deploy` before production deployments
3. **Fix validation errors locally** - Don't push broken code
4. **Check CI logs** - If GitHub Actions fails, read the logs carefully
5. **Test Docker builds locally** - Saves time compared to failing on CI

---

# Vérification de la Sauvegarde R2 et du Déploiement Automatique

## 📋 Vue d'ensemble

Ce guide vous aide à vérifier que:
1. ✅ Les sauvegardes PostgreSQL sont envoyées vers Cloudflare R2 (bucket: `crm-backup`)
2. ✅ Le déploiement automatique fonctionne lors du merge d'un PR

---

## 🔄 Vérification de la Sauvegarde R2

### Étape 1: Lancer le script de diagnostic

```bash
./scripts/check-backup.sh
```

Ce script vérifie:
- ✅ Le service de backup est en cours d'exécution
- ✅ Les variables d'environnement R2 sont configurées
- ✅ La connexion R2 fonctionne
- ✅ Le bucket `crm-backup` existe et est accessible
- ✅ Les sauvegardes existent dans le bucket
- ✅ La planification des sauvegardes (cron)

### Étape 2: Vérifier manuellement dans Cloudflare R2

1. Connectez-vous à votre dashboard Cloudflare
2. Allez dans R2 → Buckets → `crm-backup`
3. Vérifiez que le dossier `postgres/` contient des fichiers
4. Vérifiez qu'il y a un fichier `latest.sql.gz`

### Étape 3: Tester une sauvegarde manuelle

```bash
# Sur le serveur Hetzner
cd /srv/medical-crm
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/backup.sh
```

### Étape 4: Tester la restauration

```bash
# Test de restauration (crée une DB temporaire)
docker compose -f docker-compose.prod.yml exec postgres-backup /scripts/test-restore.sh
```

### Étape 5: Vérifier les logs

```bash
# Voir les logs du service de backup
docker compose -f docker-compose.prod.yml logs -f postgres-backup

# Voir les 50 dernières lignes
docker compose -f docker-compose.prod.yml logs --tail=50 postgres-backup
```

---

## 🚀 Vérification du Déploiement Automatique

### Étape 1: Vérifier les secrets GitHub

```bash
./scripts/verify-deployment.sh
```

Ce script vérifie:
- ✅ Installation et authentification GitHub CLI
- ✅ Les secrets requis sont configurés
- ✅ Les workflows GitHub Actions existent
- ✅ Les workflows récents

**Secrets requis dans GitHub:**
```
HETZNER_HOST           → IP du serveur Hetzner
HETZNER_USERNAME       → Utilisateur SSH (ex: deploy)
HETZNER_SSH_KEY        → Clé privée SSH
HETZNER_SSH_PORT       → Port SSH (défaut: 22)
BACKEND_DOMAIN         → Domaine backend pour health checks
FRONTEND_DOMAIN        → Domaine frontend pour health checks
```

### Étape 2: Vérifier manuellement les secrets

1. Allez sur GitHub → Repository → Settings → Secrets and variables → Actions
2. Vérifiez que tous les secrets sont présents

### Étape 3: Vérifier la configuration SSH sur Hetzner

Sur votre serveur Hetzner:

```bash
# Vérifier que l'utilisateur deploy existe
id deploy

# Vérifier les clés SSH autorisées
cat /home/deploy/.ssh/authorized_keys

# Vérifier que docker fonctionne
docker compose -f docker-compose.prod.yml ps
```

### Étape 4: Test de déploiement (avec un PR de test)

```bash
# Créer une branche de test
git checkout -b test-deploy-$(date +%Y%m%d)

# Faire un petit changement (ex: README.md)
echo "# Test deployment $(date)" >> DEPLOYMENT_TEST.md

# Commiter
git add DEPLOYMENT_TEST.md
git commit -m "Test automatic deployment"

# Pousser
git push origin test-deploy-$(date +%Y%m%d)

# Créer un PR sur GitHub et le merger vers main
```

Surveillez le déploiement: https://github.com/YOUR_ORG/YOUR_REPO/actions

### Étape 5: Vérifier le déploiement

Après le merge:

```bash
# Sur le serveur Hetzner
cd /srv/medical-crm

# Vérifier le dernier commit
git log -1 --oneline

# Vérifier que les services sont en cours d'exécution
docker compose -f docker-compose.prod.yml ps

# Vérifier les logs de déploiement
docker compose -f docker-compose.prod.yml logs --tail=50

# Health checks
curl https://VOTRE_BACKEND_DOMAIN/health
curl https://VOTRE_FRONTEND_DOMAIN/
```

---

## 📊 Planification des Sauvegardes

Les sauvegardes sont automatiquement planifiées via cron:

```yaml
BACKUP_SCHEDULE: "0 0 * * *"  # Tous les jours à minuit
BACKUP_RETENTION_DAYS: 30     # Garder 30 jours de sauvegardes
```

Pour modifier l'horaire, éditez `docker-compose.prod.yml`:

```yaml
postgres-backup:
  environment:
    BACKUP_SCHEDULE: "0 2 * * *"  # À 2h du matin
```

---

## 🔧 Résolution de Problèmes

### Sauvegarde R2

**Problème**: Échec de connexion R2
```bash
# Vérifier les variables
docker compose -f docker-compose.prod.yml exec postgres-backup env | grep R2

# Tester la connexion manuelle
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 ls --endpoint-url $R2_ENDPOINT_URL --region auto
```

**Problème**: Bucket introuvable
- Vérifiez le nom du bucket dans `.env.production` (doit être `crm-backup`)
- Vérifiez que le bucket existe dans votre compte Cloudflare R2

**Problème**: Pas de sauvegardes
- Vérifiez que le conteneur `postgres-backup` est en cours d'exécution
- Vérifiez les logs: `docker compose -f docker-compose.prod.yml logs postgres-backup`
- Vérifiez le cron: `docker compose -f docker-compose.prod.yml exec postgres-backup crontab -l`

### Déploiement Automatique

**Problème**: Workflow échoue
- Vérifiez les logs GitHub Actions
- Vérifiez que les secrets GitHub sont corrects
- Vérifiez que le serveur Hetzner est accessible depuis GitHub Actions

**Problème**: Échec SSH
```bash
# Tester la connexion depuis votre machine
ssh -i ~/.ssh/github_actions_key deploy@VOTRE_IP_HETZNER

# Vérifier les logs du serveur
tail -f /var/log/auth.log
```

**Problème**: Services non démarrés après déploiement
```bash
# Sur le serveur Hetzner
cd /srv/medical-crm
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs
```

---

## ✅ Checklist de Validation

### Sauvegarde R2

- [ ] Script `check-backup.sh` passe sans erreur
- [ ] Bucket `crm-backup` existe dans Cloudflare R2
- [ ] Des sauvegardes récentes sont dans le bucket
- [ ] Le fichier `latest.sql.gz` existe
- [ ] Test de restauration réussi
- [ ] Logs de backup montrent des succès récents

### Déploiement Automatique

- [ ] Script `verify-deployment.sh` passe sans erreur
- [ ] Tous les secrets GitHub sont configurés
- [ ] La connexion SSH fonctionne depuis GitHub Actions
- [ ] Un PR de test a été déployé avec succès
- [ ] Health checks passent après déploiement
- [ ] Les services sont tous en cours d'exécution

---

## 📞 En cas de problème

1. Vérifiez les logs du conteneur concerné
2. Vérifiez les variables d'environnement
3. Consultez les logs GitHub Actions
4. Consultez la documentation Cloudflare R2
5. Vérifiez la documentation du projet: `/docs/RUNBOOK.md`

---

## 🔄 Mises à jour

- Date de création: 2026-01-04
- Bucket R2: `crm-backup`
- Horaire backup: Quotidien à minuit (Paris time)
- Rétention: 30 jours
