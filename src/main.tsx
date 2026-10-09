import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: サービスワーカー登録（失敗してもアプリは動作する）
// M5改善：load 待ちをやめ即時登録し、更新検出時は次回起動で新版が使われる
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(
    (reg) => {
      // 更新があれば速やかに取り込む（適用は次回起動時）
      try {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        reg.addEventListener('updatefound', () => {});
        void reg.update().catch(() => {});
      } catch { /* ignore */ }
    },
    () => {},
  );
}
