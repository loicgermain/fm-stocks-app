# FM Stocks — Fête Médiévale de Remouchamps

## Contexte
Application de gestion des stocks des remorques frigo.
Déployée sur GitHub Pages, données en temps réel via Firebase.

## Firebase
- Projet : fm-stocks
- Realtime Database : https://fm-stocks-default-rtdb.europe-west1.firebasedatabase.app
- Région : europe-west1

## Structure de la base de données
Clés SANS accents (les accents sont permis par Firebase mais fragiles en JS).

/articles/{id}
  nom, categorie, conditionnements[], unite, seuilAlerteDefaut

/stocks/{remorqueId}/{articleId}
  conditionnement, qte, qteMax, seuilAlerte

/mouvements/{id}
  remorqueId, articleId, type (in/out), qte, qui, note, timestamp (serverTimestamp)

## Remorques (définies dans firebase-config.js → REMORQUES)
- cuisine
- ecole
- chalon
- pre
- place
Ajouter une remorque = 1 entrée dans REMORQUES + 1 fichier stocks/{id}.html.

## Stack
- Vanilla HTML/CSS/JS (pas de framework)
- Firebase Realtime Database SDK v10 (imports CDN gstatic, PAS `from "firebase/app"`)
- GitHub Pages (pas de build step)

## Fichiers
- firebase-config.js : init Firebase + export `db` et `REMORQUES`
- app.js             : utilitaires partagés (toast, esc, stockStatus, param)
- auth.js            : verrou par code PIN partagé (requireAccess)
- sync.js            : indicateur de synchro (mountSync, trackWrite)
- style.css          : styles partagés (mobile-first, thème médiéval sombre)
- database.rules.json: règles RTDB ouvertes (à publier dans la console)
- index.html         : dashboard central + alertes
- admin.html         : gestion du catalogue d'articles
- stocks/remorque.js : logique partagée d'une page remorque (markup injecté)
- stocks/{id}.html   : pages fines appelant initRemorque("<id>")
- qr.html            : QR codes par remorque (URLs absolues auto), imprimable

## Charte graphique (medias/)
- Logo : medias/favicon.png (dragon noir → affiché dans une pastille blanche)
- Couleurs : Orange #F47D0D · Mauve #831F82 · Mauve foncé #6E1A4E
- Polices charte : DIN 2014 / Myriad Pro (textes), Old London (lettrines)
- manifest.json + favicons → app installable (icône écran d'accueil)

## Sécurité
Base OUVERTE (.read/.write = true). Assumé pour une fête associative ;
l'appli GitHub Pages est publique, donc clés Firebase publiques = normal.

## À faire en priorité
- [x] Page admin catalogue
- [x] Dashboard central
- [x] Pages par remorque + mouvements
- [x] QR codes à imprimer
- [ ] Publier database.rules.json dans la console Firebase
- [ ] Remplir le catalogue d'articles
- [ ] (optionnel) Page historique des mouvements
