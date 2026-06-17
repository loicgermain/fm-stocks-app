// auth.js — verrouillage par rôle / code PIN d'équipe.
import { ROLES } from "./firebase-config.js";

const ROLE_KEY = "fm-role";
const REM_KEY  = "fm-rem";

if ("serviceWorker" in navigator) {
  const swPath = location.pathname.includes("/stocks/") ? "../sw.js" : "./sw.js";
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return; refreshing = true; location.reload();
  });
  navigator.serviceWorker.register(swPath).then(reg => { reg.update(); }).catch(() => {});
}

function logoPath() {
  return location.pathname.includes("/stocks/") ? "../medias/favicon.png" : "medias/favicon.png";
}

function storeRole(role) {
  localStorage.setItem(ROLE_KEY, role.id);
  localStorage.setItem("fm-perm", role.perm);
  localStorage.removeItem(REM_KEY); // plus utilisé
}

function getStoredRole() {
  const id = localStorage.getItem(ROLE_KEY);
  return id ? ROLES.find(r => r.id === id) : null;
}

export function clearAccess() {
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(REM_KEY);
  localStorage.removeItem("fm-perm");
}

export function requireAccess() {
  return new Promise(resolve => {
    if (getStoredRole()) { resolve(); return; }

    const ov = document.createElement("div");
    ov.id = "gate";
    ov.innerHTML = `
      <form id="gate-form">
        <img src="${logoPath()}" alt="Fête Médiévale">
        <h2>FM Stocks</h2>
        <p>Accès réservé aux bénévoles</p>
        <input id="gate-pin" type="password" inputmode="numeric"
               autocomplete="off" placeholder="Code équipe" autofocus>
        <button type="submit">Entrer</button>
        <div id="gate-err"></div>
      </form>`;
    document.body.appendChild(ov);

    const form = ov.querySelector("#gate-form");
    const input = ov.querySelector("#gate-pin");
    const err = ov.querySelector("#gate-err");

    form.addEventListener("submit", e => {
      e.preventDefault();
      const role = ROLES.find(r => r.pin === input.value);
      if (role) {
        storeRole(role);
        ov.remove();
        resolve();
      } else {
        err.textContent = "Code incorrect";
        input.value = "";
        input.focus();
      }
    });
  });
}
