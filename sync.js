// sync.js — indicateur de synchronisation Firebase + économie de batterie.
//
// Affiche une pastille fixe en bas à gauche :
//   • vert  "Synchronisé"      → connecté, rien en attente
//   • orange "Enregistrement…" → une écriture est en cours
//   • rouge "Hors ligne"       → pas de connexion (les modifs seront
//                                 envoyées automatiquement au retour du réseau)
//
// Économie de batterie (journées de 18 h !) : quand l'appli passe en
// arrière-plan ou que l'écran s'éteint, on COUPE la connexion temps réel
// Firebase (goOffline). Cela ferme le websocket et stoppe la réception des
// mises à jour, qui sont les principaux consommateurs en veille. Au retour
// au premier plan, on se reconnecte (goOnline) et les écrans se resynchronisent
// instantanément. On ne coupe jamais tant qu'une écriture est en attente, pour
// ne pas la retarder.
//
// Usage :
//   import { mountSync, trackWrite } from "./sync.js";  (ou "../sync.js")
//   mountSync(db);
//   await trackWrite(update(ref(db, ...), data));  // pour suivre une écriture

import { ref, onValue, goOffline, goOnline } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let el;
let connected = true;
let pending = 0;
let okTimer;

let dbRef = null;
let offline = false;        // connexion coupée volontairement (veille)
let wantOffline = false;    // on souhaite couper dès que les écritures finissent
let visibilityBound = false;

function ensureEl() {
  if (el) return el;
  el = document.createElement("div");
  el.id = "sync";
  el.innerHTML = `<span class="dot"></span><span class="txt"></span>`;
  document.body.appendChild(el);
  return el;
}

function render() {
  if (!el) return;
  el.classList.remove("ok", "pending", "off");
  const txt = el.querySelector(".txt");
  if (!connected) {
    el.classList.add("off");
    txt.textContent = "Hors ligne";
  } else if (pending > 0) {
    el.classList.add("pending");
    txt.textContent = "Enregistrement…";
  } else {
    el.classList.add("ok");
    txt.textContent = "Synchronisé";
  }
}

// Coupe la connexion temps réel, sauf si une écriture est encore en attente.
function goOfflineSafe() {
  if (!dbRef || offline || pending > 0) return;
  offline = true;
  goOffline(dbRef);
}
function goOnlineSafe() {
  if (!dbRef || !offline) return;
  offline = false;
  goOnline(dbRef);
}

function handleVisibility() {
  if (document.hidden) {
    wantOffline = true;
    goOfflineSafe();          // différé si écriture en cours (cf. trackWrite)
  } else {
    wantOffline = false;
    goOnlineSafe();
  }
}

export function mountSync(db) {
  ensureEl();
  dbRef = db;
  // État de connexion temps réel fourni par Firebase
  onValue(ref(db, ".info/connected"), snap => {
    connected = snap.val() === true;
    render();
  });
  // Économie de batterie : couper/reconnecter selon la visibilité de l'appli
  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener("visibilitychange", handleVisibility);
  }
  render();
}

// Enveloppe une promesse d'écriture pour refléter "Enregistrement…" puis
// repasser à "Synchronisé" une fois le serveur ayant accusé réception.
export function trackWrite(promise) {
  pending++;
  render();
  return Promise.resolve(promise).finally(() => {
    pending = Math.max(0, pending - 1);
    render();
    // petit flash "Synchronisé" pour confirmer visuellement
    if (pending === 0 && connected && el) {
      clearTimeout(okTimer);
      el.classList.add("flash");
      okTimer = setTimeout(() => el && el.classList.remove("flash"), 1200);
    }
    // Si on attendait de passer en veille, on peut couper maintenant.
    if (pending === 0 && wantOffline && document.hidden) goOfflineSafe();
  });
}
