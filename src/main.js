// Relay Monsters — 부트스트랩

import { mountSpriteSheet } from './art/symbols.js';
import { startApp } from './ui/app.js';
import { loadSave } from './storage/save.js';

// ── Firebase 연결 지점 (내일 작업) ────────────────────────────────
// 아래 두 줄의 주석을 해제하고 firebaseBackend.js 의 FIREBASE_CONFIG 를 채우면
// 비동기 멀티가 로컬 스냅샷 대신 서버 스냅샷을 사용한다. 그 외 코드는 변경하지 않는다.
//
// import { enableFirebaseBackend } from './storage/firebaseBackend.js';
// await enableFirebaseBackend().catch((e) => console.warn('Firebase 미연결 — 로컬 모드', e));

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
