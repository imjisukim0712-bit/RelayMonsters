// Relay Monsters — 부트스트랩

import { mountSpriteSheet } from './art/symbols.js';
import { startApp } from './ui/app.js';
import { loadSave } from './storage/save.js';

// ── 백엔드 연결 지점 ────────────────────────────────────────────
// 둘 중 하나만 선택해서 주석을 해제한다. 그 외 게임 코드는 변경하지 않는다.
// 아무것도 켜지 않으면 로컬 스냅샷 + 프리셋 봇 폴백으로 동작한다.
//
// 옵션 A) Firebase — firebaseBackend.js 의 FIREBASE_CONFIG 를 채운 뒤:
// import { enableFirebaseBackend } from './storage/firebaseBackend.js';
// await enableFirebaseBackend().catch((e) => console.warn('Firebase 미연결 — 로컬 모드', e));
//
// 옵션 B) Cloudflare (Worker + D1) — server/ 를 배포하고 cloudflareBackend.js 의
// WORKER_URL 을 배포된 주소로 바꾼 뒤:
import { enableCloudflareBackend } from './storage/cloudflareBackend.js';
await enableCloudflareBackend().catch((e) => console.warn('Cloudflare 미연결 — 로컬 모드', e));

function boot() {
  loadSave();
  mountSpriteSheet(document.body);
  const root = document.getElementById('app');
  startApp(root);
  document.body.classList.remove('booting');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
