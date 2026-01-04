# Docker Deployment - Quick Reference

## Fichiers créés pour le déploiement Docker

### Structure complète

```bash
crm_monorepo/
 ├── docker-compose.yml              # Dev local (existant)
 ├── docker-compose.prod.yml         # Production (Caddy)
 ├── .dockerignore                   # Optimisation build (nouveau)
 ├── .env.production.example         # Template env prod (nouveau)
 ├── Caddyfile                       # Reverse proxy Caddy (nouveau)
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

| Service     | URL                         | Port interne |
| ----------- | --------------------------- | ------------ |
| Frontend    | https://crm.fvienot.link    | 8080         |
| Backend API | https://crmapi.fvienot.link | 3000         |
| PostgreSQL  | Internal only               | 5432         |

## Volumes Docker

| Volume          | Contenu             | Backup       |
| --------------- | ------------------- | ------------ |
| postgres_data   | Base de données     | ✅ R2        |
| caddy-data      | Certificats SSL     | ⚠️ Local     |
| caddy-config    | Config Caddy        | Non          |
| backend-uploads | Fichiers uploadés   | À configurer |
| backend-logs    | Logs applicatifs    | Non          |
| backend-storage | Stockage temporaire | Non          |

## Optimisations

### Tailles des images

- **Backend**: ~150MB (multi-stage build)
- **Frontend**: ~25MB (nginx alpine)
- **PostgreSQL**: ~250MB (alpine)
- **Caddy**: ~50MB

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
- ✅ SSL automatique avec Caddy (Let's Encrypt)
- ✅ Headers de sécurité (via Caddy)
- ✅ Rate limiting (via backend)
- ✅ Secrets via variables d'environnement

### WebSockets

**Caddy gère les WebSockets nativement!** Pas de configuration spéciale nécessaire.

Socket.io fonctionne immédiatement à travers Caddy avec HTTPS.

## Monitoring

### Health checks

```bash
# Vérifier le statut des services
docker compose -f docker-compose.prod.yml ps

# Backend
curl https://crmapi.fvienot.link/health

# Frontend
curl https://crm.fvienot.link/health

# PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_isready
```

### Logs

```bash
# Tous les services
docker compose -f docker-compose.prod.yml logs -f

# Caddy (reverse proxy)
docker logs medical-crm-caddy -f

# Backend
docker logs medical-crm-backend -f

# Frontend
docker logs medical-crm-frontend -f
```

### Logs Caddy spécifiques

```bash
# Dernières erreurs
docker logs medical-crm-caddy --tail 50 | grep error

# Certificats
docker logs medical-crm-caddy | grep "certificate obtained"

# Requêtes
docker logs medical-crm-caddy --tail 100
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

# Vérifier la config Caddy
docker exec medical-crm-caddy caddy validate --config /etc/caddy/Caddyfile

# Redémarrer
docker compose -f docker-compose.prod.yml restart <service>
```

### Certificat SSL non généré

1. Vérifier que les DNS pointent vers le serveur
2. Vérifier les ports 80/443 ouverts
3. Consulter les logs Caddy: `docker logs medical-crm-caddy | grep certificate`
4. Vérifier que Caddy a les permissions sur le volume: `ls -la /var/lib/docker/volumes/`

### WebSockets ne fonctionnent pas

Avec Caddy, les WebSockets **fonctionnent immédiatement**. Si problème:

```bash
# Vérifier que Socket.io est initialisé dans le backend
docker logs medical-crm-backend | grep "Socket.io server initialized"

# Tester le polling
curl -s "https://crmapi.fvienot.link/socket.io/?EIO=4&transport=polling"

# Tester WebSocket upgrade
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://crmapi.fvienot.link/socket.io/?EIO=4&transport=websocket"
```

### Espace disque plein

```bash
# Voir l'utilisation
docker system df

# Nettoyer les images non utilisées
docker image prune -a

# Nettoyer tout (ATTENTION: arrête les containers)
docker system prune -a --volumes
```

### Caddy ne recharge pas la config

```bash
# Forcer le reload
docker exec medical-crm-caddy caddy reload --config /etc/caddy/Caddyfile

# Ou redémarrer le conteneur
docker restart medical-crm-caddy
```

## Variables d'environnement requises

Voir `.env.production.example` pour la liste complète.

**Critiques:**

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
- `DOMAIN` / `FRONTEND_DOMAIN` / `BACKEND_DOMAIN`

**Optionnelles:**

- SMTP (pour les emails)
- Monitoring (si ajouté)

**Pourquoi Caddy?**

- ✅ Configuration ultra-simple
- ✅ Auto-HTTPS automatique (Let's Encrypt)
- ✅ WebSockets natifs (pas de config spéciale)
- ✅ Plus léger et rapide
- ✅ Meilleur support HTTP/3

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

## Documentation Caddy

- Documentation officielle: https://caddyserver.com/docs/
- Syntaxe Caddyfile: https://caddyserver.com/docs/caddyfile/
- Auto-HTTPS: https://caddyserver.com/docs/automatic-https/
- Reverse Proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

## Support

- Documentation complète : `DEPLOYMENT_HETZNER.md`
- Issues GitHub : https://github.com/<USERNAME>/crm_monorepo/issues
