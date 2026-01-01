# Docker Deployment - Quick Reference

## Fichiers créés pour le déploiement Docker

### Structure complète

```bash
crm_monorepo/
├── docker-compose.yml              # Dev local (existant)
├── docker-compose.prod.yml         # Production (nouveau)
├── .dockerignore                   # Optimisation build (nouveau)
├── .env.production.example         # Template env prod (nouveau)
├── DEPLOYMENT_HETZNER.md          # Guide complet (nouveau)
│
├── packages/
│   ├── backend/
│   │   ├── Dockerfile              # Multi-stage build backend (nouveau)
│   │   └── .dockerignore           # Exclusions backend (nouveau)
│   │
│   └── frontend/
│       ├── Dockerfile              # Multi-stage build frontend (nouveau)
│       ├── nginx.conf              # Config nginx pour SPA (nouveau)
│       └── .dockerignore           # Exclusions frontend (nouveau)
│
├── traefik/
│   ├── traefik.yml                 # Config principale Traefik (nouveau)
│   └── dynamic/
│       └── middlewares.yml         # Middlewares Traefik (nouveau)
│
├── backup/
│   ├── Dockerfile                  # Container backup (nouveau)
│   └── scripts/
│       ├── backup.sh               # Script backup PostgreSQL (nouveau)
│       └── entrypoint.sh           # Entrypoint cron (nouveau)
│
└── .github/workflows/
    └── deploy-production.yml       # CI/CD GitHub Actions (nouveau)
```

## Commandes rapides

### Développement local

```bash
# Démarrer PostgreSQL seul
docker compose up -d

# Développement avec hot reload
npm run dev
```

### Production

```bash
# Démarrer tous les services
docker compose -f docker-compose.prod.yml up -d

# Voir les logs
docker compose -f docker-compose.prod.yml logs -f

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart backend

# Arrêter tout
docker compose -f docker-compose.prod.yml down
```

## Services exposés

| Service           | URL                         | Port interne |
| ----------------- | --------------------------- | ------------ |
| Frontend          | https://crm.example.com     | 8080         |
| Backend API       | https://crmapi.example.com  | 3000         |
| Traefik Dashboard | https://traefik.example.com | 8080         |
| PostgreSQL        | Internal only               | 5432         |

## Volumes Docker

| Volume          | Contenu             | Backup       |
| --------------- | ------------------- | ------------ |
| postgres_data   | Base de données     | ✅ R2        |
| traefik-certs   | Certificats SSL     | ⚠️ Local     |
| backend-uploads | Fichiers uploadés   | À configurer |
| backend-logs    | Logs applicatifs    | Non          |
| backend-storage | Stockage temporaire | Non          |

## Optimisations

### Tailles des images

- **Backend**: ~150MB (multi-stage build)
- **Frontend**: ~25MB (nginx alpine)
- **PostgreSQL**: ~250MB (alpine)
- **Traefik**: ~100MB

### Multi-stage builds

Les Dockerfiles utilisent des builds multi-étapes pour :

1. Réduire la taille finale
2. Ne garder que les fichiers de production
3. Améliorer la sécurité (pas de dev dependencies)

### Cache Docker

Le `.dockerignore` exclut :

- `node_modules` (réinstallé dans le build)
- Fichiers de test
- Documentation
- Logs
- Configuration locale

## Sécurité

### Bonnes pratiques implémentées

- ✅ Utilisateur non-root dans les containers
- ✅ Réseau backend isolé (internal: true)
- ✅ Health checks sur tous les services
- ✅ Resource limits (memory)
- ✅ SSL automatique avec Let's Encrypt
- ✅ Headers de sécurité (via Traefik)
- ✅ Rate limiting
- ✅ Secrets via variables d'environnement

## Monitoring

### Health checks

```bash
# Vérifier le statut des services
docker compose -f docker-compose.prod.yml ps

# Backend
curl https://api.example.com/health

# Frontend
curl https://crm.example.com/health

# PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_isready
```

### Logs

```bash
# Tous les services
docker compose -f docker-compose.prod.yml logs -f

# Service spécifique
docker compose -f docker-compose.prod.yml logs -f backend

# Dernières 100 lignes
docker compose -f docker-compose.prod.yml logs --tail=100 backend
```

## Backups

### Automatique (quotidien à minuit)

Le service `postgres-backup` :

1. Dump PostgreSQL
2. Compression gzip
3. Upload vers Cloudflare R2
4. Nettoyage des backups > 30 jours

### Manuel

```bash
# Trigger un backup immédiat
docker compose -f docker-compose.prod.yml exec postgres-backup /usr/local/bin/backup.sh

# Lister les backups dans R2
docker compose -f docker-compose.prod.yml exec postgres-backup \
  aws s3 ls s3://medical-crm-backups/postgres/ --endpoint-url=$R2_ENDPOINT_URL
```

## CI/CD

Le workflow GitHub Actions :

1. **Build** (sur push vers `main`)

   - Build images Docker (backend + frontend)
   - Push vers GitHub Container Registry (ghcr.io)
   - Cache des layers pour builds rapides

2. **Deploy**

   - SSH vers serveur Hetzner
   - Pull des nouvelles images
   - Redémarrage des services
   - Migrations DB si nécessaire

3. **Health Check**
   - Vérification des endpoints
   - Notification si échec

## Troubleshooting

### Le build échoue

```bash
# Nettoyer le cache Docker
docker builder prune -a

# Rebuild sans cache
docker compose -f docker-compose.prod.yml build --no-cache
```

### Service ne démarre pas

```bash
# Vérifier les logs
docker compose -f docker-compose.prod.yml logs <service>

# Vérifier la config
docker compose -f docker-compose.prod.yml config

# Redémarrer
docker compose -f docker-compose.prod.yml restart <service>
```

### Certificat SSL non généré

1. Vérifier que les DNS pointent vers le serveur
2. Vérifier les ports 80/443 ouverts
3. Consulter les logs Traefik
4. Tester avec Let's Encrypt staging d'abord

### Espace disque plein

```bash
# Voir l'utilisation
docker system df

# Nettoyer les images non utilisées
docker image prune -a

# Nettoyer tout (ATTENTION: arrête les containers)
docker system prune -a --volumes
```

## Variables d'environnement requises

Voir `.env.production.example` pour la liste complète.

**Critiques:**

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
- `DOMAIN` / `FRONTEND_DOMAIN`

**Optionnelles:**

- SMTP (pour les emails)
- Monitoring (si ajouté)

## Ressources recommandées (Hetzner)

| Taille | vCPU | RAM  | Disque | Prix/mois | Usage                |
| ------ | ---- | ---- | ------ | --------- | -------------------- |
| CX22   | 2    | 4GB  | 40GB   | ~6€       | Dev/Test             |
| CX32   | 4    | 8GB  | 80GB   | ~12€      | Prod petite échelle  |
| CX42   | 8    | 16GB | 160GB  | ~24€      | Prod moyenne échelle |

## Next steps

1. Lire `DEPLOYMENT_HETZNER.md` pour le guide complet
2. Configurer les secrets GitHub (pour CI/CD)
3. Configurer Cloudflare R2
4. Déployer !

## Support

- Documentation complète : `DEPLOYMENT_HETZNER.md`
- Issues GitHub : https://github.com/<USERNAME>/crm_monorepo/issues
