# Migration : passer des données mockées à l'API réelle

`src/app/App.tsx` gère aujourd'hui tout l'état en mémoire (`useState`) avec des tableaux
mockés (`USERS`, `STORES`, `INIT_PRODUCTS`, `SEED_ORDERS`, `SEED_NOTIFS`). C'est parfait
pour un prototype, mais rien n'est persistant : tout se réinitialise à chaque rechargement.

Le backend (`/backend`) reproduit exactement ces mêmes données au démarrage (`npm run seed`),
donc la migration peut se faire **progressivement, écran par écran**, sans tout casser.

## Ordre recommandé

1. **Authentification** — Remplacer la logique de `login`/`register` locale par
   `AuthAPI.login()` / `AuthAPI.register()` (voir `src/lib/api.ts`). Stocker le `token`
   retourné avec `setAuthToken()`. C'est la base : sans ça, aucune autre route protégée
   ne fonctionnera.

2. **Liste des boutiques (écran d'accueil client)** — Remplacer la lecture de `STORES`
   par un `useEffect` appelant `StoresAPI.list()` au montage, avec un état de chargement.

3. **Produits d'une boutique** — Remplacer `INIT_PRODUCTS.filter(p => p.storeId === id)`
   par `ProductsAPI.list({ storeId })`.

4. **Panier → Commande** — Le panier peut rester en état local (React state), mais au
   moment de valider la commande, appeler `OrdersAPI.create({...})` au lieu de pousser
   directement dans `SEED_ORDERS`. Le serveur recalcule les prix et vérifie le stock —
   il ne faut donc plus faire confiance aux totaux calculés côté client pour l'affichage
   final (les réafficher depuis la réponse de l'API).

5. **Suivi de commande (client) / Tableau de bord (marchand) / Courses (livreur)** —
   Remplacer les filtres locaux sur `SEED_ORDERS` par `OrdersAPI.list()` : l'API filtre
   déjà automatiquement selon le rôle connecté.

6. **Changement de statut** — `OrdersAPI.setStatus(id, status)` côté marchand/livreur,
   `OrdersAPI.assign(id)` quand un livreur prend en charge une course "prête".

7. **Notifications** — `NotificationsAPI.list()` à la place de `SEED_NOTIFS`, avec un
   polling simple (ex: toutes les 15-20s) ou, plus tard, un vrai WebSocket/SSE.

8. **Admin** — `AdminAPI.stats()` pour remplacer les calculs locaux du tableau de bord admin.

## Ce qui ne change pas

- L'UI, les composants shadcn, les styles restent identiques : seule la **source des
  données** change (mock local → API réseau).
- Le panier et les préférences UI éphémères peuvent rester en state React local.

## Après la migration complète

Une fois `App.tsx` entièrement branché sur l'API, l'étape suivante pour publier sur les
stores est d'envelopper ce frontend avec **Capacitor** afin de générer des projets iOS et
Android natifs à partir du même code React. Voir la discussion précédente pour le détail
des étapes (comptes développeurs, builds signés, fiche store, review).
