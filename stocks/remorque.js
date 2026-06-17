// stocks/remorque.js — logique partagée d'une page remorque.
// Chaque page (cuisine.html, ecole.html, …) appelle initRemorque("<id>").

import { requireAccess } from "../auth.js";
import { mountSync, trackWrite } from "../sync.js";
import { db, REMORQUES } from "../firebase-config.js";
import { toast, esc, stockStatus } from "../app.js";
import {
  ref, onValue, update, remove, push, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Injecte tout le markup de la page (header, liste, modales) pour que les
// fichiers cuisine.html / ecole.html / … restent minimaux.
function injectMarkup() {
  document.body.innerHTML = `
    <header class="app">
      <a class="back" href="../index.html" title="Retour">‹</a>
      <img class="brand-logo" src="../medias/favicon.png" alt="Fête Médiévale">
      <h1 id="titre">Remorque</h1>
      <button id="qui" class="ghost" title="Changer de bénévole"></button>
      <button id="btn-add">+ Ajouter</button>
    </header>

    <main class="wrap"><div id="list"></div></main>

    <!-- Réglages d'un stock -->
    <div class="modal-bg" id="edit-modal">
      <form class="modal" id="edit-form">
        <h3 id="edit-titre">Article</h3>
        <label for="edit-cond">Conditionnement</label>
        <select id="edit-cond"></select>
        <div class="field-inline">
          <div><label for="edit-qte">Quantité</label>
            <input id="edit-qte" type="number" min="0" step="1"></div>
          <div><label for="edit-qtemax">Quantité max</label>
            <input id="edit-qtemax" type="number" min="0" step="1"></div>
        </div>
        <label for="edit-seuil">Seuil d'alerte</label>
        <input id="edit-seuil" type="number" min="0" step="1">
        <div class="modal-actions">
          <button type="button" class="ghost" id="edit-remove" style="margin-right:auto">Retirer</button>
          <button type="button" class="secondary" id="edit-cancel">Annuler</button>
          <button type="submit">Enregistrer</button>
        </div>
      </form>
    </div>

    <!-- Ajout d'un article du catalogue -->
    <div class="modal-bg" id="add-modal">
      <form class="modal" id="add-form">
        <h3>Ajouter un article</h3>
        <label for="add-article">Article (catalogue)</label>
        <select id="add-article"></select>
        <label for="add-cond">Conditionnement</label>
        <select id="add-cond"></select>
        <div class="field-inline">
          <div><label for="add-qte">Quantité de départ</label>
            <input id="add-qte" type="number" min="0" step="1" value="0"></div>
          <div><label for="add-qtemax">Quantité max</label>
            <input id="add-qtemax" type="number" min="0" step="1"></div>
        </div>
        <label for="add-seuil">Seuil d'alerte</label>
        <input id="add-seuil" type="number" min="0" step="1" value="0">
        <div class="modal-actions">
          <button type="button" class="secondary" id="add-cancel">Annuler</button>
          <button type="submit">Ajouter</button>
        </div>
      </form>
    </div>`;
}

export async function initRemorque(remId) {
  const remorque = REMORQUES.find(r => r.id === remId);
  if (!remorque) { document.body.innerHTML = "<p class='wrap'>Remorque inconnue.</p>"; return; }

  await requireAccess();
  injectMarkup();
  mountSync(db);
  document.title = `${remorque.nom} — FM Stocks`;
  document.getElementById("titre").textContent = remorque.nom;

  let articles = {};   // catalogue {id: article}
  let stock = {};      // stock de cette remorque {articleId: {...}}

  // --- Qui (bénévole) ---
  const QUI_KEY = "fm-qui";
  function getQui() { return localStorage.getItem(QUI_KEY) || ""; }
  function setQui(v) { localStorage.setItem(QUI_KEY, v); renderQui(); }
  function ensureQui() {
    let q = getQui();
    if (!q) {
      q = (prompt("Ton prénom (pour tracer les mouvements) :") || "").trim();
      if (q) setQui(q);
    }
    return q;
  }
  function renderQui() {
    const q = getQui();
    document.getElementById("qui").textContent = q ? `👤 ${q}` : "👤 (anonyme)";
  }
  document.getElementById("qui").addEventListener("click", () => {
    const q = (prompt("Ton prénom :", getQui()) || "").trim();
    if (q) setQui(q);
  });
  renderQui();

  // --- Lecture temps réel ---
  onValue(ref(db, "articles"), s => { articles = s.val() || {}; render(); });
  onValue(ref(db, `stocks/${remId}`), s => { stock = s.val() || {}; render(); });

  // --- Rendu de la liste ---
  function render() {
    const listEl = document.getElementById("list");
    const ids = Object.keys(stock);
    if (!ids.length) {
      listEl.innerHTML = `<div class="empty-state">Aucun article dans cette remorque.<br>
        Clique sur « + Ajouter » pour en mettre.</div>`;
      return;
    }
    ids.sort((a, b) => {
      const A = articles[a] || {}, B = articles[b] || {};
      return (A.categorie || "").localeCompare(B.categorie || "")
          || (A.nom || "").localeCompare(B.nom || "");
    });

    let html = "", lastCat = null;
    for (const id of ids) {
      const a = articles[id] || { nom: id };
      const s = stock[id];
      const cat = a.categorie || "Sans catégorie";
      if (cat !== lastCat) { html += `<h2>${esc(cat)}</h2>`; lastCat = cat; }
      const status = stockStatus(s.qte, s.seuilAlerte);
      const cls = status === "empty" ? "empty" : status === "low" ? "low" : "";
      const sub = [s.conditionnement, a.unite, s.qteMax ? `max ${s.qteMax}` : null]
        .filter(Boolean).join(" · ");
      html += `
        <div class="article-row ${cls}" data-id="${id}">
          <div class="info">
            <div class="nom">${esc(a.nom)}</div>
            <div class="sub">${esc(sub) || "&nbsp;"}</div>
          </div>
          <div class="qte">${s.qte ?? 0}</div>
          <div class="row-actions">
            <button class="icon minus" data-act="minus" title="Sortie -1">−</button>
            <button class="icon plus" data-act="plus" title="Entrée +1">+</button>
            <button class="ghost" data-act="edit" title="Réglages">⚙</button>
          </div>
        </div>`;
    }
    listEl.innerHTML = html;

    listEl.querySelectorAll(".article-row").forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="plus"]').addEventListener("click", () => adjust(id, +1));
      row.querySelector('[data-act="minus"]').addEventListener("click", () => adjust(id, -1));
      row.querySelector('[data-act="edit"]').addEventListener("click", () => openEdit(id));
    });
  }

  // --- Ajustement rapide +/- 1 (enregistre un mouvement) ---
  async function adjust(id, delta) {
    const cur = Number(stock[id]?.qte) || 0;
    const next = Math.max(0, cur + delta);
    if (next === cur) return; // déjà à 0 sur un -1
    const qui = ensureQui();
    try {
      await trackWrite(update(ref(db, `stocks/${remId}/${id}`), { qte: next }));
      await push(ref(db, "mouvements"), {
        remorqueId: remId,
        articleId: id,
        type: delta > 0 ? "in" : "out",
        qte: Math.abs(delta),
        qui: qui || null,
        note: null,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      toast("Erreur : " + err.message);
    }
  }

  // ============ Modale réglages d'un stock existant ============
  const editModal = document.getElementById("edit-modal");
  let editId = null;

  function openEdit(id) {
    editId = id;
    const a = articles[id] || {}; const s = stock[id] || {};
    document.getElementById("edit-titre").textContent = a.nom || id;
    const condSel = document.getElementById("edit-cond");
    condSel.innerHTML = `<option value="">—</option>` +
      (a.conditionnements || []).map(c =>
        `<option ${c === s.conditionnement ? "selected" : ""}>${esc(c)}</option>`).join("");
    document.getElementById("edit-qte").value = s.qte ?? 0;
    document.getElementById("edit-qtemax").value = s.qteMax ?? "";
    document.getElementById("edit-seuil").value = s.seuilAlerte ?? (a.seuilAlerteDefaut ?? 0);
    editModal.classList.add("open");
  }
  function closeEdit() { editModal.classList.remove("open"); editId = null; }

  document.getElementById("edit-cancel").addEventListener("click", closeEdit);
  editModal.addEventListener("click", e => { if (e.target === editModal) closeEdit(); });

  document.getElementById("edit-form").addEventListener("submit", async e => {
    e.preventDefault();
    if (!editId) return;
    const prevQte = Number(stock[editId]?.qte) || 0;
    const newQte = Number(document.getElementById("edit-qte").value) || 0;
    const data = {
      conditionnement: document.getElementById("edit-cond").value || null,
      qte: newQte,
      qteMax: Number(document.getElementById("edit-qtemax").value) || null,
      seuilAlerte: Number(document.getElementById("edit-seuil").value) || 0
    };
    try {
      await trackWrite(update(ref(db, `stocks/${remId}/${editId}`), data));
      // Mouvement d'ajustement si la quantité a changé
      if (newQte !== prevQte) {
        const qui = getQui();
        await push(ref(db, "mouvements"), {
          remorqueId: remId, articleId: editId,
          type: newQte > prevQte ? "in" : "out",
          qte: Math.abs(newQte - prevQte),
          qui: qui || null, note: "ajustement manuel",
          timestamp: serverTimestamp()
        });
      }
      toast("Enregistré");
      closeEdit();
    } catch (err) { toast("Erreur : " + err.message); }
  });

  document.getElementById("edit-remove").addEventListener("click", async () => {
    if (!editId) return;
    if (!confirm("Retirer cet article de la remorque ?")) return;
    try {
      await trackWrite(remove(ref(db, `stocks/${remId}/${editId}`)));
      toast("Article retiré");
      closeEdit();
    } catch (err) { toast("Erreur : " + err.message); }
  });

  // ============ Modale ajout d'un article du catalogue ============
  const addModal = document.getElementById("add-modal");

  document.getElementById("btn-add").addEventListener("click", () => {
    const sel = document.getElementById("add-article");
    // Articles du catalogue pas encore présents dans cette remorque
    const dispo = Object.keys(articles)
      .filter(id => !(id in stock))
      .sort((a, b) => (articles[a].nom || "").localeCompare(articles[b].nom || ""));
    if (!dispo.length) {
      toast("Tous les articles du catalogue sont déjà présents (ou catalogue vide).");
      return;
    }
    sel.innerHTML = dispo.map(id =>
      `<option value="${id}">${esc(articles[id].nom)}</option>`).join("");
    syncAddDefaults();
    addModal.classList.add("open");
  });

  function syncAddDefaults() {
    const id = document.getElementById("add-article").value;
    const a = articles[id] || {};
    const condSel = document.getElementById("add-cond");
    condSel.innerHTML = `<option value="">—</option>` +
      (a.conditionnements || []).map(c => `<option>${esc(c)}</option>`).join("");
    document.getElementById("add-seuil").value = a.seuilAlerteDefaut ?? 0;
  }
  document.getElementById("add-article").addEventListener("change", syncAddDefaults);

  function closeAdd() { addModal.classList.remove("open"); }
  document.getElementById("add-cancel").addEventListener("click", closeAdd);
  addModal.addEventListener("click", e => { if (e.target === addModal) closeAdd(); });

  document.getElementById("add-form").addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("add-article").value;
    if (!id) return;
    const qte = Number(document.getElementById("add-qte").value) || 0;
    const data = {
      conditionnement: document.getElementById("add-cond").value || null,
      qte,
      qteMax: Number(document.getElementById("add-qtemax").value) || null,
      seuilAlerte: Number(document.getElementById("add-seuil").value) || 0
    };
    try {
      await trackWrite(update(ref(db, `stocks/${remId}/${id}`), data));
      if (qte > 0) {
        const qui = getQui();
        await push(ref(db, "mouvements"), {
          remorqueId: remId, articleId: id, type: "in", qte,
          qui: qui || null, note: "stock initial", timestamp: serverTimestamp()
        });
      }
      toast("Article ajouté");
      closeAdd();
    } catch (err) { toast("Erreur : " + err.message); }
  });
}
