# Configuration DNS Hostinger - fvienot.link

Ce guide explique comment configurer vos enregistrements DNS sur Hostinger pour votre CRM médical.

## Enregistrements DNS requis

Vous avez besoin de **1 enregistrement A** et **3 enregistrements CNAME**.

### Configuration DNS

| Type  | Nom/Host | Pointe vers    | TTL  |
| ----- | -------- | -------------- | ---- |
| A     | @        | `<HETZNER_IP>` | 3600 |
| CNAME | crm      | fvienot.link   | 3600 |
| CNAME | crmapi   | fvienot.link   | 3600 |

**Résultat final:**

- `fvienot.link` → IP Hetzner (enregistrement A)
- `crm.fvienot.link` → Frontend Vue.js (CNAME → fvienot.link)
- `crmapi.fvienot.link` → Backend API (CNAME → fvienot.link)

---

## Guide étape par étape sur Hostinger

### 1. Connexion à Hostinger

1. Connectez-vous à [Hostinger](https://www.hostinger.fr)
2. Allez dans **Domaines** dans le menu
3. Cliquez sur **Gérer** à côté de `fvienot.link`
4. Cliquez sur **DNS / Serveurs de noms**

### 2. Créer l'enregistrement A (domaine racine)

**Si vous avez déjà un enregistrement A pour `@` ou `fvienot.link`:**

- Modifiez-le pour pointer vers l'IP de votre serveur Hetzner

**Sinon, créez-en un nouveau:**

1. Cliquez sur **Ajouter un enregistrement**
2. **Type**: A
3. **Nom**: @ (ou laissez vide)
4. **Pointe vers**: Votre IP Hetzner (ex: `95.217.x.x`)
5. **TTL**: 3600
6. **Enregistrer**

### 3. Créer les enregistrements CNAME

#### CNAME pour le frontend (crm)

1. Cliquez sur **Ajouter un enregistrement**
2. **Type**: CNAME
3. **Nom**: `crm`
4. **Pointe vers**: `fvienot.link` (ou `@`)
5. **TTL**: 3600
6. **Enregistrer**

#### CNAME pour l'API backend (crmapi)

1. Cliquez sur **Ajouter un enregistrement**
2. **Type**: CNAME
3. **Nom**: `crmapi`
4. **Pointe vers**: `fvienot.link`
5. **TTL**: 3600
6. **Enregistrer**

---

## Vérification DNS

### Attendre la propagation (5-30 minutes)

Les changements DNS peuvent prendre jusqu'à 30 minutes pour se propager.

### Tester les enregistrements

Depuis votre terminal :

```bash
# Tester le domaine racine
dig fvienot.link

# Devrait afficher votre IP Hetzner dans la section ANSWER

# Tester les CNAME
dig crm.fvienot.link
dig crmapi.fvienot.link

# Chaque commande devrait montrer le CNAME vers fvienot.link
# puis l'IP finale dans la section ANSWER
```

**Exemple de résultat attendu:**

```
crm.fvienot.link.       3600    IN      CNAME   fvienot.link.
fvienot.link.           3600    IN      A       95.217.x.x
```

### Vérification en ligne

Vous pouvez aussi utiliser :

- https://dnschecker.org
- https://www.whatsmydns.net

Entrez `crm.fvienot.link` et vérifiez que ça pointe vers votre IP Hetzner.

---

## Tableau récapitulatif final

Une fois tout configuré :

| URL                         | Service           | Port interne | Certificat SSL          |
| --------------------------- | ----------------- | ------------ | ----------------------- |
| https://crm.fvienot.link    | Frontend (Vue.js) | 8080         | ✅ Auto (Let's Encrypt) |
| https://crmapi.fvienot.link | Backend API (Koa) | 3000         | ✅ Auto (Let's Encrypt) |

---

## Troubleshooting

### "DNS_PROBE_FINISHED_NXDOMAIN"

- Le domaine n'est pas encore propagé, attendez 10-30 minutes
- Vérifiez que vous avez bien créé les enregistrements
- Videz le cache DNS de votre navigateur :

  ```bash
  # macOS
  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

  # Windows
  ipconfig /flushdns

  # Linux
  sudo systemd-resolve --flush-caches
  ```

### Les CNAME ne fonctionnent pas

- Assurez-vous que le CNAME pointe vers `fvienot.link` (sans point final sur Hostinger)
- Vérifiez que l'enregistrement A du domaine racine existe bien
- Les CNAME ne peuvent PAS être créés pour le domaine racine (`@`), uniquement pour les sous-domaines

### Le site est inaccessible après 30 minutes

- Vérifiez que votre serveur Hetzner est bien démarré
- Vérifiez que les ports 80 et 443 sont ouverts dans le firewall :
  ```bash
  sudo ufw status
  ```
- Vérifiez que Docker Compose est bien lancé :
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```

---

## Secrets GitHub Actions à configurer

N'oubliez pas d'ajouter ces secrets dans votre repository GitHub :

| Secret Name        | Valeur                        |
| ------------------ | ----------------------------- |
| `DOMAIN`           | `fvienot.link`                |
| `FRONTEND_DOMAIN`  | `crm.fvienot.link`            |
| `BACKEND_DOMAIN`   | `crmapi.fvienot.link`         |
| `HETZNER_HOST`     | Votre IP Hetzner              |
| `HETZNER_USERNAME` | `deploy` (ou `root`)          |
| `HETZNER_SSH_KEY`  | Votre clé privée SSH complète |

---

## Prochaines étapes

Une fois le DNS configuré et propagé :

1. ✅ Configurez le serveur Hetzner (voir `DEPLOYMENT_HETZNER.md`)
2. ✅ Créez votre `.env.production` depuis `.env.production.example`
3. ✅ Générez les secrets (JWT, DB password, etc.)
4. ✅ Lancez le déploiement :
   ```bash
   ./deploy.sh build
   ./deploy.sh start
   ```
5. ✅ Vérifiez que tout fonctionne :
   ```bash
   ./deploy.sh health
   ```

---

**Questions ?** Consultez `DEPLOYMENT_HETZNER.md` pour le guide complet de déploiement.
