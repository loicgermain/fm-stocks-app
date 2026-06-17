// sync.js — indicateur de synchronisation Firebase.
//
// Affiche une pastille fixe en bas à gauche :
//   • vert  "Synchronisé"      → connecté, rien en attente
//   • orange "Enregistrement…" → une écriture est en cours
//   • rouge "Hors ligne"       → pas de connexion (les modifs seront
//                                 envoyées automatiquement au retour du réseau)
//
// Usage :
//   import { mountSync, trackWrite } from "./sync.js";  (ou "../sync.js")
//   mountSync(db);
//   await trackWrite(update(ref(db, ...), data));  // pour suivre une écriture

import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let el;
let connected = true;
let pending = 0;
let okTimer;

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

export function mountSync(db) {
  ensureEl();
  // État de connexion temps réel fourni par Firebase
  onValue(ref(db, ".info/connected"), snap => {
    connected = snap.val() === true;
    render();
  });
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
  });
}
