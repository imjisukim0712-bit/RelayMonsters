// 비동기 멀티 백엔드 추상화 (기획서 11장)
//
// ┌─────────────────────────────────────────────────────────────────┐
// │ Firebase 연결 지점                                              │
// │ 이 파일의 어댑터 인터페이스만 교체하면 서버 연동이 끝난다.      │
// │ 게임 코드는 backend.uploadSnapshot / fetchOpponent 만 호출한다. │
// │ 실제 연결은 src/storage/firebaseBackend.js 에서 수행한다.       │
// └─────────────────────────────────────────────────────────────────┘

import { getMeta, updateMeta } from './save.js';

// 스냅샷 JSON 포맷 (기획서 14.3) — 처음부터 서버 연동을 전제로 설계했다.
export function makeSnapshot({ round, wins, lives, ring }) {
  return {
    snapshotId: `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    round,
    wins,
    lives,
    createdAt: new Date().toISOString(),
    // 배열 인덱스 0 이 1번 슬롯(첫 등판)이며, 배열 순서가 곧 등판 순서다.
    ring: ring.map((u) => ({
      speciesId: u.speciesId,
      exp: u.exp,
      permBuff: { atk: u.permBuff?.atk || 0, hp: u.permBuff?.hp || 0 },
      granted: (u.granted || []).slice(),
    })),
  };
}

// ── 로컬 어댑터 (프로토타입 기본값) ───────────────────────────────
// 자신의 과거 플레이 스냅샷을 localStorage 에 누적 저장하고 이후 회차에서 상대로 재사용한다.
const MAX_LOCAL_SNAPSHOTS = 120;

const localAdapter = {
  name: 'local',
  async uploadSnapshot(snapshot) {
    const meta = getMeta();
    const list = [snapshot, ...(meta.mySnapshots || [])].slice(0, MAX_LOCAL_SNAPSHOTS);
    updateMeta({ mySnapshots: list });
    return snapshot.snapshotId;
  },
  async fetchSnapshots({ round }) {
    const meta = getMeta();
    return (meta.mySnapshots || []).filter((s) => s.round === round);
  },
};

let adapter = localAdapter;

export function configureBackend(next) {
  adapter = next || localAdapter;
  return adapter;
}
export function backendName() {
  return adapter.name;
}

export async function uploadSnapshot(snapshot) {
  try {
    return await adapter.uploadSnapshot(snapshot);
  } catch (e) {
    console.warn('스냅샷 업로드 실패 — 로컬로 대체합니다.', e);
    return localAdapter.uploadSnapshot(snapshot);
  }
}

// 매칭 규칙 (기획서 11.2)
//  1. 동일 라운드 번호의 스냅샷 풀에서 추출
//  2. 승수 차이 ±1 을 우선
//  3. 조건에 맞는 스냅샷이 5건 미만이면 프리셋 봇으로 폴백 (호출 측에서 처리)
//  4. 같은 게임 내에서 동일 스냅샷과 두 번 매칭되지 않는다
export const MIN_POOL = 5;

export async function fetchOpponent({ round, wins, seen = [] }) {
  let pool = [];
  try {
    pool = await adapter.fetchSnapshots({ round, wins });
  } catch (e) {
    console.warn('스냅샷 조회 실패 — 프리셋 봇으로 폴백합니다.', e);
    return null;
  }
  const unseen = pool.filter((s) => !seen.includes(s.snapshotId));
  if (unseen.length < MIN_POOL) return null; // 폴백

  const near = unseen.filter((s) => Math.abs((s.wins ?? round) - wins) <= 1);
  const from = near.length ? near : unseen;
  return from[Math.floor(Math.random() * from.length)];
}
