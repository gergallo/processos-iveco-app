// Controle Processos Iveco — funcionamento offline e instalação como aplicativo.
// A cada publicação de nova versão, aumente o número abaixo para os aparelhos atualizarem.
const VERSAO = "controle-iveco-v41";
const ARQUIVOS = ["./", "index.html", "estilos.css", "app-shell.css", "shell.js", "config.js", "servicos.js", "app.js", "instalacao.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png",
  "supabase.js", "three.min.js", "OrbitControls.js", "xlsx.full.min.js", "jspdf.umd.min.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // serviços externos (banco, clima): direto pela rede
  if (req.mode === "navigate") {                               // página: rede primeiro, cópia salva sem sinal
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSAO).then((ca) => ca.put("index.html", c)); return r; })
      .catch(() => caches.match("index.html").then((r) => r || caches.match("./"))));
    return;
  }
  if (url.pathname.endsWith("/config.js")) {                  // configuração: sempre a mais nova
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(VERSAO).then((ca) => ca.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
