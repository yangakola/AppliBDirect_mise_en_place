# Mise à jour — installation admin + app branchée sur l'API + connexion sociale corrigée

## Depuis la dernière mise à jour
- Boutons Apple / Facebook retirés (ils ne faisaient rien : aucun fournisseur d'identité réel n'était branché,
  et sur l'écran d'inscription ils n'avaient même pas d'action au clic).
- Le bouton Google ne s'affiche que si `VITE_GOOGLE_CLIENT_ID` est configuré (sinon aucun espace vide résiduel).
- Note ajoutée sur l'inscription "Compte Personnel" : possibilité de créer un compte client via Google
  depuis l'écran de connexion (le backend crée automatiquement le compte au premier login Google).

## Pour activer Google (facultatif)
1. https://console.cloud.google.com/ → créer un projet → "Identifiants" → "Créer des identifiants" →
   "ID client OAuth" → type "Application Web".
2. Origines JavaScript autorisées : l'URL de votre site (ex. https://applibdirect-app.onrender.com).
3. Copier le Client ID obtenu et le donner pour configuration : `GOOGLE_CLIENT_ID` (backend) et
   `VITE_GOOGLE_CLIENT_ID` (site) sur Render — mêmes valeur des deux côtés.

## Apple / Facebook
Non implémentés : nécessitent un compte développeur Apple (99 $/an) et une app Meta validée,
tous deux liés à votre identité. Recommandé de s'en passer pour une app Android/Google Play.

---
(voir aussi les notes de la mise à jour précédente : installation admin, données réelles, etc.)
