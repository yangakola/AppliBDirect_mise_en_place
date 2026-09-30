# Build Delivery App

Application de livraison multi-services pour Bangui (restaurants, pharmacies, marché,
boutiques, express) avec 4 rôles : client, marchand, livreur, admin.

Ce dépôt contient deux parties :

- **`/` (racine)** — le frontend React/Vite (interface utilisateur, généré initialement
  depuis Figma Make). Il fonctionnait jusqu'ici avec des données 100% mockées en mémoire.
- **`/backend`** — l'API REST (Express + TypeScript + SQLite) qui fournit les vraies
  données : authentification, boutiques, produits, commandes, notifications, admin.

## Démarrer le backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

Voir `backend/README.md` pour la liste complète des routes et les comptes de démo.

## Démarrer le frontend

```bash
npm install
cp .env.example .env   # VITE_API_URL doit pointer vers le backend (http://localhost:4000/api par défaut)
npm run dev
```

Un client HTTP prêt à l'emploi est disponible dans `src/lib/api.ts` (`AuthAPI`, `StoresAPI`,
`ProductsAPI`, `OrdersAPI`, `NotificationsAPI`, `AdminAPI`). Le frontend utilise encore ses
données mockées internes (`App.tsx`) — voir **`MIGRATION.md`** pour le plan détaillé de
branchement écran par écran vers l'API réelle.

## Mettre en ligne et monétiser

Voir **`DEPLOYMENT.md`** : chemin de mise en ligne recommandé (web d'abord, puis stores
mobiles), modèle de commission déjà intégré au backend, et ce qui reste à faire côté
business (paiement mobile réel, statut légal, recrutement marchands/livreurs).
