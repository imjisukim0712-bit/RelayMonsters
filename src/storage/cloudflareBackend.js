// Cloudflare Worker + D1 어댑터 — server/ 에 있는 Worker와 통신한다.
//
// 연결 방법
//   1) server/wrangler.toml 의 database_id 를 `wrangler d1 create relaymonsters-db` 로 만든
//      실제 ID로 바꾼다.
//   2) server 디렉터리에서
//        npx wrangler d1 execute relaymonsters-db --remote --file=schema.sql
//        npx wrangler deploy
//      를 실행해 배포한다. 배포 완료 시 `https://relaymonsters-backend.<계정>.workers.dev` 형태의
//      URL이 출력된다.
//   3) 아래 WORKER_URL 을 그 주소로 바꾸고, main.js 에서 이 어댑터를 활성화한다.
//
// 인증은 없다(프로토타입). ownerId 는 브라우저가 생성해 localStorage 에 보관하는
// 익명 식별자로, 자기 자신이 올린 스냅샷을 상대 후보에서 빼는 데만 쓰인다.

import { configureBackend } from './backend.js';

export const WORKER_URL = 'http://localhost:8787';

const OWNER_KEY = 'relaymonsters.ownerId';
function ownerId() {
  let id = localStorage.getItem(OWNER_KEY);
  if (!id) {
    id = `o_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(OWNER_KEY, id);
  }
  return id;
}

export function isConfigured() {
  return Boolean(WORKER_URL);
}

export function createCloudflareBackend(baseUrl = WORKER_URL) {
  return {
    name: 'cloudflare',

    async uploadSnapshot(snapshot) {
      const res = await fetch(`${baseUrl}/api/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId() },
        body: JSON.stringify(snapshot),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`업로드 실패 (${res.status}): ${body.error || res.statusText}`);
      }
      const data = await res.json();
      return data.snapshotId;
    },

    async fetchSnapshots({ round }) {
      const res = await fetch(`${baseUrl}/api/snapshots?round=${round}`, {
        headers: { 'X-Owner-Id': ownerId() },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(`조회 실패 (${res.status}): ${body.error || res.statusText}`);
      }
      return res.json();
    },
  };
}

// async — main.js 가 firebaseBackend.js 와 동일하게 `.catch()` 로 연결한다
export async function enableCloudflareBackend(baseUrl = WORKER_URL) {
  const adapter = createCloudflareBackend(baseUrl);
  configureBackend(adapter);
  return adapter;
}
