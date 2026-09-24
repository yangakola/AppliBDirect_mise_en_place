# Mise à jour — installation admin + app branchée sur l'API

## Ce qui change
- **Premier démarrage** : si aucun administrateur n'existe, l'app affiche un écran « Bienvenue » pour créer le compte admin
  (protégé par le code d'installation `SETUP_CODE` défini sur Render). Cet écran disparaît définitivement ensuite.
- **Plus de comptes de démo** (ni côté serveur, ni sur l'écran de connexion). Le `seed` est refusé en production.
- **L'app utilise maintenant la vraie base** : boutiques, produits, commandes, notifications, admin (synchro toutes les 15 s).
- **Marchand** : à la première connexion, écran « Créez votre boutique ».
- **Photos produit** : compressées (max 640 px) avant envoi.
- **Sécurité** : `JWT_SECRET` et `CORS_ORIGIN` obligatoires en production, `Dockerfile` ne re-seede plus.

## Variables Render — service backend (déjà configurées)
`JWT_SECRET`, `CORS_ORIGIN`, `SETUP_CODE`  ·  optionnel : `GOOGLE_CLIENT_ID`, `PLATFORM_COMMISSION_RATE`

## Variable Render — site statique (déjà configurée)
`VITE_API_URL` = URL du backend + `/api`

## ⚠️ Persistance
La base est un fichier SQLite. Sans **disque persistant** monté sur `/data`, elle est perdue à chaque redémarrage
(plan gratuit Render). Passer le service en plan payant et ajouter un disque `/data`.
