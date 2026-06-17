// auth.js — verrouillage simple par code PIN partagé.
//
// ⚠️ Sécurité « légère » : empêche l'usage de l'interface par des curieux,
// mais la base Firebase reste techniquement ouverte. Pour une vraie
// protection, il faudrait Firebase Auth + règles. Suffisant pour une fête.
//
// Le code se change ci-dessous (variable PIN).

const PIN = "1516";            // <-- code partagé aux bénévoles
const KEY = "fm-unlocked";     // mémorise le déverrouillage sur l'appareil

// Détecte le préfixe pour retrouver le logo selon la profondeur de la page
// (racine = "medias/...", sous-dossier /stocks/ = "../medias/...").
function logoPath() {
  return location.pathname.includes("/stocks/") ? "../medias/favicon.png" : "medias/favicon.png";
}

// À appeler tout en haut de chaque page : `await requireAccess();`
export function requireAccess() {
  return new Promise(resolve => {
    if (localStorage.getItem(KEY) === PIN) { resolve(); return; }

    const ov = document.createElement("div");
    ov.id = "gate";
    ov.innerHTML = `
      <form id="gate-form">
        <img src="${logoPath()}" alt="Fête Médiévale">
        <h2>FM Stocks</h2>
        <p>Accès réservé aux bénévoles</p>
        <input id="gate-pin" type="password" inputmode="numeric"
               autocomplete="off" placeholder="Code" autofocus>
        <button type="submit">Entrer</button>
        <div id="gate-err"></div>
      </form>`;
    document.body.appendChild(ov);

    const form = ov.querySelector("#gate-form");
    const input = ov.querySelector("#gate-pin");
    const err = ov.querySelector("#gate-err");

    form.addEventListener("submit", e => {
      e.preventDefault();
      if (input.value === PIN) {
        localStorage.setItem(KEY, PIN);
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
