// Service Worker BG Market Gestion
// Ce fichier NE touche JAMAIS aux donnees (commandes, factures, clients...).
// Il met seulement en cache le "squelette" de l'appli pour un demarrage rapide.
//
// IMPORTANT : a chaque fois que tu publies une nouvelle version de l'appli,
// change le numero ci-dessous (v1 -> v2 -> v3...) pour forcer tout le monde
// a recuperer la derniere version.
const CACHE_NAME = 'bgm-gestion-v4';

const PRECACHE_URLS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(PRECACHE_URLS.map(url =>
        fetch(url, { mode: 'cors' })
          .then(resp => resp && resp.ok && cache.put(url, resp))
          .catch(() => {})
      ))
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // On ne touche jamais aux requetes d'ecriture
  if (req.method !== 'GET') return;

  const url = req.url;

  // On laisse TOUJOURS passer en direct vers le reseau tout ce qui concerne
  // les donnees en temps reel et l'authentification : jamais mis en cache.
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('securetoken.googleapis.com') ||
    url.includes('firebaseinstallations.googleapis.com')
  ) {
    return;
  }

  // Pour le reste (page HTML, librairies Firebase, html2canvas...) :
  // on sert le cache instantanement si dispo, puis on met a jour en arriere-plan.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(resp => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
