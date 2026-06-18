// firebase-config.js
// Config Firebase partagée pour toutes les pages de FM Stocks.
//
// IMPORTANT : pas de build step (GitHub Pages). On importe le SDK
// directement depuis le CDN gstatic en modules ES, et NON via
// `from "firebase/app"` (qui suppose npm + bundler).
//
// Chaque page HTML inclut ce fichier ainsi :
//   <script type="module">
//     import { db } from "./firebase-config.js";
//     ...
//   </script>
// (ajuster le chemin relatif, ex. "../firebase-config.js" dans /stocks/)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4BeTwx4F72L_sTunjeyG5n431qunoW-U",
  authDomain: "fm-stocks.firebaseapp.com",
  databaseURL: "https://fm-stocks-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fm-stocks",
  storageBucket: "fm-stocks.firebasestorage.app",
  messagingSenderId: "540755137652",
  appId: "1:540755137652:web:84c58fbf21cae1bba6ad21",
  measurementId: "G-12T93KFBT1"
};

// Note : Analytics est volontairement omis. Inutile pour une appli
// logistique interne, et getAnalytics() peut échouer hors HTTPS/contexte.

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// Liste centrale des remorques (réutilisée par le dashboard, l'admin, etc.)
export const REMORQUES = [
  { id: "cuisine", nom: "Cuisine" },
  { id: "ecole",   nom: "École" },
  { id: "chalon",  nom: "Chalon" },
  { id: "pre",     nom: "Pré" },
  { id: "place",   nom: "Place" }
];

// Catégories proposées d'office (les bénévoles peuvent en ajouter d'autres,
// qui viennent s'ajouter à la liste dès qu'un article les utilise).
export const CATEGORIES_DEFAUT = ["Boisson", "Nourriture"];

// Rôles d'accès. Modifier les PIN avant de déployer.
// perm: "admin"   → accès total
//       "sortie"  → lecture + enregistrer des sorties (postes bar/nourriture)
//       "lecture" → lecture seule (cuisine récap)
export const ROLES = [
  { id: "admin",      label: "Admin",      pin: "1218", perm: "admin"      },
  { id: "logistique", label: "Logistique", pin: "1516", perm: "logistique" },
  { id: "cuisine",    label: "Cuisine",    pin: "3035", perm: "logistique" },
];

// Version de l'app affichée en bas du dashboard et sur l'écran de code.
// → garder en phase avec le numéro de CACHE dans sw.js (fm-stocks-vN).
export const APP_VERSION = "21";
