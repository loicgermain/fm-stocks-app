// app.js — utilitaires partagés (sans dépendance Firebase)

// Petit toast en bas d'écran
let toastEl;
let toastTimer;
export function toast(msg, ms = 2200) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
}

// Échappe le HTML pour injection sûre via innerHTML
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// Statut d'un stock par rapport à son seuil d'alerte.
// Renvoie "empty" | "low" | "ok".
export function stockStatus(qte, seuilAlerte) {
  const q = Number(qte) || 0;
  const s = Number(seuilAlerte) || 0;
  if (q <= 0) return "empty";
  if (s > 0 && q <= s) return "low";
  return "ok";
}

// Lit ?id=... dans l'URL
export function param(name) {
  return new URLSearchParams(location.search).get(name);
}
