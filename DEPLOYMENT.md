# Mettre l'app en ligne — et la faire gagner de l'argent

## 1. Ce qui est déjà prêt techniquement

- **Backend** : API complète avec commission automatique sur chaque commande
  (`platform_fee`), voir `backend/README.md` → section "Modèle de revenu".
- **Dockerfile** (`backend/Dockerfile`) : permet de déployer le backend sur
  n'importe quel hébergeur compatible Docker.
- **Frontend** : reste à brancher sur l'API réelle (voir `MIGRATION.md`) avant
  toute mise en ligne sérieuse — aujourd'hui il fonctionne encore en mémoire,
  donc **rien n'est persistant ni partagé entre utilisateurs**.

## 2. Chemin de mise en ligne le plus rapide (web d'abord)

Publier en web est bien plus rapide que de passer par les stores mobiles (pas
de review Apple, pas besoin de Mac). C'est le chemin le plus court vers de
premiers vrais utilisateurs et un premier revenu.

**Backend** (Render, Railway, Fly.io — tous ont un plan gratuit/pas cher) :
1. Créer un compte sur l'un de ces hébergeurs et connecter le dépôt Git du projet.
2. Déployer le dossier `backend/` avec le `Dockerfile` fourni.
3. Définir les variables d'environnement (`JWT_SECRET`, `PLATFORM_COMMISSION_RATE`,
   `CORS_ORIGIN` = l'URL du frontend une fois déployé).
4. Monter un volume persistant sur `/data` (sinon la base SQLite est perdue à
   chaque redéploiement) — ou migrer vers PostgreSQL managé si l'hébergeur le
   propose nativement, plus robuste à terme.
5. Lancer `node dist/seed.js` une première fois (ou l'équivalent "shell/console"
   de l'hébergeur) pour peupler la base, puis ne plus le relancer (il vide et
   recrée les données de démo).

**Frontend** (Vercel ou Netlify — gratuit pour démarrer) :
1. Connecter le même dépôt, dossier racine du projet (celui avec `vite.config.ts`).
2. Définir `VITE_API_URL` = l'URL du backend déployé.
3. Déployer — l'app est en ligne, accessible par navigateur (mobile compris,
   en PWA de fait).

**Domaine** : acheter un nom de domaine (ex: `.cf` pour la Centrafrique, ou un
générique `.com`/`.app`) et le pointer vers le frontend.

## 3. Ensuite seulement : App Store / Play Store

Une fois l'app en ligne et testée en web, envelopper avec **Capacitor** pour
produire les projets iOS/Android natifs à partir du même code, comme discuté
précédemment (comptes développeurs Apple 99$/an + Mac requis, Google Play 25$
une fois, builds signés, fiche store, review).

## 4. Ce qui dépend de toi et ne peut pas être automatisé ici

Pour que l'app génère réellement de l'argent, il faut en parallèle :

- **Statut légal** : enregistrer une entreprise (ou passer par un statut
  existant) en République Centrafricaine pour facturer légalement une
  commission aux marchands.
- **Paiement mobile réel** : contractualiser avec Orange Money et/ou Airtel
  Money comme marchand agréé pour recevoir les paiements des clients — sans
  ça, seul le paiement "espèces à la livraison" fonctionne vraiment. C'est une
  démarche commerciale/administrative, pas technique.
- **Recrutement du côté offre** : convaincre les premiers restaurants/pharmacies
  de s'inscrire (souvent le vrai facteur limitant d'une marketplace au
  démarrage, plus que la techno).
- **Recrutement de livreurs** : sans livreurs actifs, aucune commande ne peut
  être honorée.
- **Trésorerie de lancement** : pour couvrir hébergement, domaine, éventuelles
  incitations de lancement (offres de bienvenue) le temps que la commission
  génère assez de revenu.

Je peux avancer la partie technique (branchement API, Capacitor, ajustement de
la commission, tableau de bord financier plus détaillé...) — mais ces
démarches business/légales/commerciales sont hors de ce que je peux faire à ta
place.

## 5. Prochaine étape technique recommandée

Vu que rien n'est encore persistant côté frontend, l'étape la plus rentable
maintenant est de suivre `MIGRATION.md` pour brancher réellement l'app sur
cette API — sans ça, "mettre en ligne" affichera une app qui perd toutes ses
données à chaque rafraîchissement de page.
