// Firebase 어댑터 — 내일 연결할 자리.
//
// 현재 상태: 미연결. 이 파일은 게임 로직을 건드리지 않고 그대로 활성화만 하면 되도록
// 인터페이스와 쿼리 형태까지 완성해 둔 상태다. 아래 3단계만 하면 연결이 끝난다.
//
//   1) FIREBASE_CONFIG 를 실제 프로젝트 값으로 채운다.
//   2) main.js 에서 아래 두 줄의 주석을 해제한다.
//        import { enableFirebaseBackend } from './storage/firebaseBackend.js';
//        await enableFirebaseBackend();
//   3) Firestore 보안 규칙에서 snapshots 컬렉션의 읽기를 허용하고,
//      쓰기는 인증된 사용자에게만 허용한다.
//
// 필요한 Firestore 인덱스: snapshots (round ASC, wins ASC)
// 컬렉션 문서 형태는 makeSnapshot() 이 만드는 JSON 과 동일하다 (기획서 14.3).

import { configureBackend } from './backend.js';

export const FIREBASE_CONFIG = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

const SDK = {
  app: 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  firestore: 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js',
  auth: 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
};

export function isConfigured() {
  return Boolean(FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey);
}

// 스냅샷 풀에서 뽑을 최대 건수. 라운드별로 넉넉히 받아 클라이언트에서 승수 필터를 적용한다.
const FETCH_LIMIT = 40;

export async function createFirebaseBackend() {
  if (!isConfigured()) {
    throw new Error('Firebase 설정이 비어 있습니다. FIREBASE_CONFIG 를 먼저 채우세요.');
  }
  const [{ initializeApp }, fs, authMod] = await Promise.all([
    import(/* @vite-ignore */ SDK.app),
    import(/* @vite-ignore */ SDK.firestore),
    import(/* @vite-ignore */ SDK.auth),
  ]);

  const app = initializeApp(FIREBASE_CONFIG);
  const db = fs.getFirestore(app);
  const auth = authMod.getAuth(app);
  // 익명 로그인 — 스냅샷 소유자를 구분하기 위한 최소 인증
  if (!auth.currentUser) {
    try { await authMod.signInAnonymously(auth); } catch (e) { console.warn('익명 로그인 실패', e); }
  }

  return {
    name: 'firebase',

    async uploadSnapshot(snapshot) {
      const ref = fs.doc(fs.collection(db, 'snapshots'), snapshot.snapshotId);
      await fs.setDoc(ref, {
        ...snapshot,
        ownerUid: auth.currentUser?.uid || null,
        createdAt: fs.serverTimestamp(),
      });
      return snapshot.snapshotId;
    },

    async fetchSnapshots({ round }) {
      const q = fs.query(
        fs.collection(db, 'snapshots'),
        fs.where('round', '==', round),
        fs.limit(FETCH_LIMIT),
      );
      const snap = await fs.getDocs(q);
      const myUid = auth.currentUser?.uid || null;
      const out = [];
      // 자기 자신 것도 그대로 포함한다 — "내 것" 표시(mine)만 남기고,
      // 자기 자신·AI 매칭 확률 계산은 backend.js 의 fetchOpponent 가 담당한다.
      snap.forEach((d) => {
        const data = d.data();
        out.push({ snapshotId: d.id, ...data, mine: !!myUid && data.ownerUid === myUid });
      });
      return out;
    },
  };
}

export async function enableFirebaseBackend() {
  const adapter = await createFirebaseBackend();
  configureBackend(adapter);
  return adapter;
}
