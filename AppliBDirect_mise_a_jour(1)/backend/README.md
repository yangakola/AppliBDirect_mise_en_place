# Build Delivery — API Backend

API REST pour l'application de livraison (restaurants, pharmacies, marché, boutiques, express) — Bangui.
Construite avec **Express + TypeScript + SQLite** (via `better-sqlite3`), sans dépendance à un serveur de base de données externe : un simple fichier `data.db` suffit, ce qui simplifie l'hébergement et les tests.

## Démarrage rapide

```bash
cd backend
npm install
cp .env.example .env      # ajuster JWT_SECRET et CORS_ORIGIN si besoin
npm run seed               # crée data.db et le peuple avec les données de démo
npm run dev                # démarre l'API sur http://localhost:4000
```

Comptes de démo créés par `npm run seed` (mot de passe pour tous : `password123`) :

| Rôle     | Email               |
|----------|---------------------|
| Client   | client@test.com     |
| Marchand | merchant@test.com   |
| Livreur  | driver@test.com     |
| Admin    | admin@test.com      |

## Build production

```bash
npm run build
npm start
```

## Vue d'ensemble des routes

Toutes les routes sont préfixées par `/api`. Les routes protégées attendent un header
`Authorization: Bearer <token>` obtenu via `/auth/login` ou `/auth/register`.

### Auth
- `POST /auth/register` — `{name,email,password,telephone?,accountType?}` → crée un compte (`accountType`: `personal` | `merchant_pro` | `driver_pro`)
- `POST /auth/login` — `{email,password}`
- `GET /auth/me` (auth)
- `POST /auth/otp/request` / `POST /auth/otp/verify` — vérification par SMS **simulée** (voir note ci-dessous)

### Boutiques
- `GET /stores?type=&quartier=&search=` (public)
- `GET /stores/:id` (public)
- `POST /stores` (marchand) — crée sa boutique
- `PUT /stores/:id` (marchand propriétaire / admin)
- `PATCH /stores/:id/toggle-open` (marchand propriétaire / admin)

### Produits
- `GET /products?storeId=&category=` (public)
- `GET /products/:id` (public)
- `POST /products` / `PUT /products/:id` / `DELETE /products/:id` (marchand propriétaire / admin)

### Commandes
- `POST /orders` (client) — `{storeId, items:[{productId,qty}], paymentMethod, delivery:{...}, note?}`.
  Les prix et le stock sont **toujours recalculés côté serveur** à partir de la base, jamais depuis les valeurs envoyées par le client.
- `GET /orders` (auth) — filtrage automatique selon le rôle (client → ses commandes, marchand → celles de sa boutique, livreur → ses courses + les commandes "prête" disponibles, admin → tout). Filtre optionnel `?status=`.
- `GET /orders/:id` (auth, avec contrôle d'accès)
- `POST /orders/:id/assign` (livreur) — prend en charge une commande "prête"
- `PATCH /orders/:id/status` — `{status}`, avec validation des transitions autorisées par rôle :
  - Marchand : `nouvelle→acceptée→préparation→prête`, ou annulation à tout moment avant "prête"
  - Livreur (doit être assigné) : `prête→livraison→livrée`
  - Admin : toute transition

### Notifications
- `GET /notifications` (auth)
- `PATCH /notifications/:id/read` / `PATCH /notifications/read-all` (auth)

### Admin
- `GET /admin/stats` — commandes par statut, revenu livré total, **revenu réel de la plateforme** (`platformRevenue`, commission uniquement), utilisateurs par rôle, boutiques ouvertes/total
- `GET /admin/users?role=`

## Modèle de revenu (comment l'app gagne de l'argent)

Chaque commande calcule automatiquement, côté serveur, la répartition de l'argent :

- **`platformFee`** — commission prélevée sur le sous-total (part marchand), taux réglable via `PLATFORM_COMMISSION_RATE` dans `.env` (10% par défaut). **C'est le revenu de la plateforme.**
- **`merchantPayout`** — ce qui revient au marchand (`subtotal - platformFee`)
- **`driverEarning`** — les frais de livraison, qui reviennent intégralement au livreur

`GET /admin/stats` expose `platformRevenue` (somme des commissions sur commandes livrées) —
c'est ce chiffre, pas `revenueLivree` (qui est le total brut encaissé, commission + part
marchand + part livreur), qu'il faut suivre comme revenu réel de l'app.
`GET /orders/earnings/me` (livreur) renvoie le nombre de courses et le total gagné.

Ce taux de commission est un point de départ — à ajuster selon le marché (à Bangui, les
taux de commission des plateformes de livraison tournent généralement entre 10 et 25%
selon les catégories). Il peut aussi être différencié par type de boutique en évoluant le
schéma (actuellement un taux unique global).

## Notes importantes pour la mise en production

1. **JWT_SECRET** : générer une valeur longue et aléatoire (`openssl rand -hex 32`), ne jamais garder la valeur par défaut.
2. **OTP** : l'endpoint `/auth/otp/*` est un mock qui renvoie le code dans la réponse (`devCode`) pour faciliter les tests. En production, brancher un vrai fournisseur SMS et supprimer `devCode` de la réponse.
3. **Paiement mobile (Orange Money / Airtel Money)** : cette API modélise un `paymentStatus` (`pending`/`paid`/`failed`) mais ne contacte aucune passerelle de paiement réelle. L'intégration réelle nécessite un accord marchand avec Orange/Airtel et l'implémentation de leur API de paiement (webhooks de confirmation notamment) — c'est une étape à part, indépendante de ce socle.
4. **Base de données** : SQLite convient très bien pour démarrer/tester. Pour une charge de production plus importante, migrer vers PostgreSQL est recommandé (la couche `db.ts` isole déjà toutes les requêtes SQL pour faciliter cette migration).
5. **Fichiers/images** : les produits utilisent pour l'instant des URLs Unsplash de démonstration. Prévoir un service de stockage (S3-compatible, Cloudinary...) pour les vraies photos envoyées par les marchands.
6. **HTTPS** : à déployer systématiquement derrière HTTPS (obligatoire pour les stores Apple/Google et pour la sécurité des tokens).
