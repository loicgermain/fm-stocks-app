// app.js — utilitaires partagés (sans dépendance Firebase)

// ── Mode Soleil ───────────────────────────────────────────────────────────────
const _SUN_KEY = "fm-sun";
// Restaure immédiatement le thème sauvegardé (évite le flash au rechargement).
if (localStorage.getItem(_SUN_KEY) === "1")
  document.documentElement.setAttribute("data-sun", "1");

export function mountSunToggle() {
  const hdr = document.querySelector("header.app");
  if (!hdr) return;
  const root = document.documentElement;
  const btn = document.createElement("button");
  btn.className = "icon-btn";
  const update = () => { btn.textContent = root.hasAttribute("data-sun") ? "🌙" : "☀️"; btn.title = root.hasAttribute("data-sun") ? "Thème sombre" : "Mode soleil"; };
  update();
  btn.addEventListener("click", () => {
    const next = !root.hasAttribute("data-sun");
    next ? root.setAttribute("data-sun", "1") : root.removeAttribute("data-sun");
    localStorage.setItem(_SUN_KEY, next ? "1" : "0");
    update();
  });
  hdr.appendChild(btn);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Rôle & accès ─────────────────────────────────────────────────────────────
export function getRole()    { return localStorage.getItem("fm-role") || null; }
export function isAdmin()    { return getRole() === "admin"; }
export function canEdit(remId) {
  const rem = localStorage.getItem("fm-rem");
  if (!rem || rem === "*") return true;
  try { return JSON.parse(rem).includes(remId); } catch { return false; }
}
export function getMyRemorques() {
  const rem = localStorage.getItem("fm-rem");
  if (!rem || rem === "*") return null; // null = toutes
  try { return JSON.parse(rem); } catch { return []; }
}
// ─────────────────────────────────────────────────────────────────────────────

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
