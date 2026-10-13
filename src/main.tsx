import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Hiện overlay "đang cập nhật" khi phát hiện bản mới đang tải về
function showUpdateOverlay() {
  if (document.getElementById('pwa-update-overlay')) return;
  const el = document.createElement('div');
  el.id = 'pwa-update-overlay';
  el.setAttribute('style', [
    'position:fixed', 'inset:0', 'z-index:99999',
    'background:rgba(255,255,255,0.97)',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center', 'gap:14px',
    'font-family:system-ui,-apple-system,sans-serif',
  ].join(';'));
  el.innerHTML =
    '<img src="/bot-loader.gif" alt="Dang cap nhat" style="width:128px;height:128px;object-fit:contain;" />' +
    '<div style="font-size:17px;font-weight:800;color:#1e293b;">Đang cập nhật phiên bản mới<span class="upd-dots"></span></div>' +
    '<div style="font-size:13px;color:#64748b;">Vui lòng đợi trong giây lát, app sẽ tự tải lại</div>' +
    '<style>#pwa-update-overlay .upd-dots::after{content:"";animation:upd-dots 1.2s steps(4) infinite}' +
    '@keyframes upd-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}</style>';
  document.body.appendChild(el);
}

function hideUpdateOverlay() {
  document.getElementById('pwa-update-overlay')?.remove();
}

registerSW({
  immediate: true,
  onRegistered(reg) {
    reg?.addEventListener('updatefound', () => {
      // Chỉ hiện khi đã có SW cũ đang chạy (đang cập nhật thật, không phải cài lần đầu)
      if (!navigator.serviceWorker.controller) return;
      showUpdateOverlay();
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        // Tải lỗi / bị hủy -> ẩn overlay để dùng tiếp bản cũ
        if (nw.state === 'redundant') hideUpdateOverlay();
      });
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
