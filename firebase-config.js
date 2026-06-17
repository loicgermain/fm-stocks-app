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
