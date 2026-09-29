// Controle Processos Iveco — permite abrir o app sem internet.
// Ao publicar uma nova versão, aumente o número abaixo (v1 → v2) para os aparelhos atualizarem.
const VERSAO = "controle-iveco-v3";
const ARQUIVOS = ["config.js", "supabase.js", "./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png",
  "three.min.js", "OrbitControls.js", "xlsx.full.min.js", "jspdf.umd.min.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {   // página: internet primeiro, cópia salva sem sinal
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSAO).then((ca) => ca.put("index.html", c)); return r; })
      .catch(() => caches.match("index.html").then((r) => r || caches.match("./"))));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {   // fontes: guarda e reutiliza
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const c = r.clone(); caches.open(VERSAO).then((ca) => ca.put(req, c)); return r; }).catch(() => hit)));
    return;
  }
  if (url.origin === self.location.origin && url.pathname.endsWith("/config.js")) {   // configuração: sempre a mais nova
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSAO).then((ca) => ca.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  if (url.origin === self.location.origin) e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  // demais (ex.: serviço de clima): direto pela internet
});
