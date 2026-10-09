/* ReadQuest English — サービスワーカー v3
 * 方針：
 * - ナビゲーション（index.html）は network-first（更新を確実に届ける）
 * - 資産（JS/CSS/画像・マニフェスト）は cache-first（オフラインで動作）
 * - 資産の取得失敗時は 404 を返し、index.html で誤魔化さない（v2の欠陥を修正）
 * - 学習履歴は localStorage にあり、SW更新の影響を受けない
 * - デプロイ時は CACHE 名を上げると旧キャッシュは activate で全削除される
 */
const CACHE = 'readquest-v3';
const CORE = ['./index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {}),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // ナビゲーションは network-first：最新版を優先し、失敗時のみキャッシュ
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // 資産は cache-first：ヒットすれば即返す。
  // キャッシュにも網路にもない場合は正直に 404 を返す（成功扱いにしない）
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          // 不完全な応答は保存しない
          if (!res || res.status !== 200) return res;
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        }).catch(() => new Response('Not found (offline)', { status: 404, headers: { 'Content-Type': 'text/plain' } })),
    ),
  );
});
