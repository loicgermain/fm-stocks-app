// sw.js — service worker : rend l'app installable et utilisable hors-ligne.
//
// Stratégie : "network-first" pour les fichiers de l'app (on prend la
// dernière version quand il y a du réseau, sinon le cache), de sorte qu'un
// nouveau déploiement soit pris en compte sans rester bloqué sur une
// ancienne version. Les données Firebase ne sont PAS mises en cache ici :
// le SDK Firebase gère lui-même le hors-ligne.
//
// ⚠️ Incrémenter CACHE à chaque déploiement important pour purger l'ancien.
const CACHE = "fm-stocks-v27";

// App shell pré-chargé à l'installation (chemins relatifs à la racine du dépôt)
const SHELL = [
  "./",
  "./index.html",
  "./cuisine-dashboard.html",
  "./admin.html",
  "./qr.html",
  "./historique.html",
  "./bilan.html",
  "./demandes.html",
  "./style.css",
  "./app.js",
  "./auth.js",
  "./sync.js",
  "./firebase-config.js",
  "./manifest.json",
  "./medias/favicon.png",
  "./stocks/remorque.js",
  "./stocks/cuisine.html",
  "./stocks/ecole.html",
  "./stocks/chalon.html",
  "./stocks/pre.html",
  "./stocks/place.html"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  // On ne gère que les GET de notre propre origine ; tout le reste
  // (Firebase, CDN gstatic…) passe directement au réseau.
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  // "no-cache" force la revalidation auprès du serveur (via ETag) : on évite
  // qu'un fichier de l'app reste figé dans le cache HTTP du navigateur et
  // crée un mélange ancien/nouveau. Repli sur le cache si hors-ligne.
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
