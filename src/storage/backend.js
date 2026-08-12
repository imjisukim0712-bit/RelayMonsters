// 비동기 멀티 백엔드 추상화 (기획서 11장)
//
// ┌─────────────────────────────────────────────────────────────────┐
// │ Firebase 연결 지점                                              │
// │ 이 파일의 어댑터 인터페이스만 교체하면 서버 연동이 끝난다.      │
// │ 게임 코드는 backend.uploadSnapshot / fetchOpponent 만 호출한다. │
// │ 실제 연결은 src/storage/firebaseBackend.js 에서 수행한다.       │
// └─────────────────────────────────────────────────────────────────┘

import { getMeta, updateMeta } from './save.js';

export const MAX_TEAM_NAME = 20;

// 스냅샷 JSON 포맷 (기획서 14.3) — 처음부터 서버 연동을 전제로 설계했다.
export function makeSnapshot({ round, wins, lives, ring, teamName }) {
  return {
    snapshotId: `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    round,
    wins,
    lives,
    teamName: String(teamName || '').trim().slice(0, MAX_TEAM_NAME),
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
    // 로컬 저장소는 이 브라우저의 과거 플레이 기록뿐이라 전부 "내 것"이다.
    return (meta.mySnapshots || []).filter((s) => s.round === round).map((s) => ({ ...s, mine: true }));
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

// 매칭 규칙 (기획서 11.2 개정 — 문턱 대신 확률로 대체)
//  1. 동일 라운드 번호의 스냅샷 풀에서 추출하고, 나 자신의 스냅샷과 다른 플레이어의
//     스냅샷을 분리한다 (각 어댑터가 mine 플래그로 표시한다).
//  2. 다른 플레이어의 웨이브 데이터가 OTHER_POOL_TARGET(10)건 이상이면 항상 그중에서
//     매칭한다 — 이 이상에서는 AI(프리셋 봇)와도, 나 자신과도 매칭되지 않는다.
//  3. 그보다 적으면 데이터가 적을수록(0건에 가까울수록) 나 자신 또는 프리셋 봇과
//     매칭될 확률이 커진다. 다른 플레이어와 매칭될 확률은 (건수 / 10) 이다.
//  4. 그 나머지 확률 안에서는, 내가 과거에 올린 스냅샷이 있으면 절반은 나 자신과,
//     없거나 나머지 절반은 프리셋 봇으로 폴백한다 (호출 측에서 처리).
//  5. 승수 차이 ±1 을 우선해서 고른다.
//  6. 같은 게임 내에서 동일 스냅샷과 두 번 매칭되지 않는다.
export const OTHER_POOL_TARGET = 10;

function pickNear(list, wins, round) {
  const near = list.filter((s) => Math.abs((s.wins ?? round) - wins) <= 1);
  const from = near.length ? near : list;
  return from[Math.floor(Math.random() * from.length)];
}

export async function fetchOpponent({ round, wins, seen = [] }) {
  let pool = [];
  try {
    pool = await adapter.fetchSnapshots({ round, wins });
  } catch (e) {
    console.warn('스냅샷 조회 실패 — 프리셋 봇으로 폴백합니다.', e);
    return null;
  }
  const unseen = pool.filter((s) => !seen.includes(s.snapshotId));
  const others = unseen.filter((s) => !s.mine);
  const mine = unseen.filter((s) => s.mine);

  const pOther = Math.min(1, others.length / OTHER_POOL_TARGET);
  if (others.length && Math.random() < pOther) {
    return pickNear(others, wins, round);
  }
  // 다른 플레이어 매칭에 실패한 나머지 확률 — 내 과거 데이터가 있으면 절반은 나 자신과 매칭한다.
  if (mine.length && Math.random() < 0.5) {
    return pickNear(mine, wins, round);
  }
  return null; // 프리셋 봇으로 폴백
}
