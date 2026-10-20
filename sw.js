// Service Worker BG Market Gestion
// Ce fichier NE touche JAMAIS aux donnees (commandes, factures, clients...).
// Il met en cache le "squelette" de l'appli (page + librairies) pour un demarrage rapide et hors ligne,
// et affiche les notifications push (Firebase Cloud Messaging, messages "data" sans donnees financieres).
//
// IMPORTANT : a chaque fois que tu publies une nouvelle version de l'appli,
// change le numero ci-dessous pour forcer tout le monde a recuperer la derniere version.
const CACHE_NAME = 'bgm-gestion-v7';

const SHELL = ['./', './index.html'];
const PRECACHE_URLS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        SHELL.map(url => cache.add(new Request(url, { cache: 'reload' })).catch(() => {}))
          .concat(PRECACHE_URLS.map(url =>
            fetch(url, { mode: 'cors' })
              .then(resp => resp && resp.ok && cache.put(url, resp))
              .catch(() => {})
          ))
      )
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
    url.includes('firebaseinstallations.googleapis.com') ||
    url.includes('fcmregistrations.googleapis.com')
  ) {
    return;
  }

  // Page de l'appli : reseau d'abord (toujours la derniere version en ligne), puis copie locale hors ligne.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html').then(c => c || caches.match(req)).then(c => c || Response.error()))
    );
    return;
  }

  // Pour le reste (librairies Firebase, html2canvas...) :
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
        .catch(() => cached || Response.error());
      return cached || network;
    })
  );
});

// ---------- Notifications push ----------
// Les messages sont de type "data" : le serveur n'y met que des informations utiles au role du destinataire.
// Le "tag" identifie l'evenement : une notification reemise (nouvelle tentative du serveur) remplace la precedente, jamais de doublon.
self.addEventListener('push', event => {
  let raw = {};
  try { raw = event.data ? event.data.json() : {}; } catch (e) { raw = { data: { body: event.data && event.data.text ? event.data.text() : '' } }; }
  const p = (raw && raw.data) ? raw.data : (raw || {});
  const title = p.title || 'BG-MARKET';
  const options = {
    body: p.body || '',
    tag: p.tag || undefined,
    renotify: false,
    data: { url: p.url || './', tag: p.tag || '', type: p.type || '' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) {
          try { c.postMessage({ type: 'bg-open', url: url }); } catch (e) {}
          return c.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    })
  );
});
