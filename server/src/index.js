// Relay Monsters — Cloudflare Worker (D1) 백엔드
//
// 게임 클라이언트(src/storage/cloudflareBackend.js)가 호출하는 최소 REST API.
//   POST /api/snapshots        스냅샷 업로드
//   GET  /api/snapshots?round= 동일 라운드 스냅샷 조회 (최대 FETCH_LIMIT건)
//
// 인증 없음(프로토타입). owner_id 는 클라이언트가 만든 익명 식별자로,
// 자기 자신이 올린 스냅샷을 상대 후보에서 제외하는 용도로만 쓴다.

const FETCH_LIMIT = 40;
const MAX_RING = 6;
const MAX_ROUND = 18;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

// 업로드 payload 형태를 검증한다 (기획서 14.3 스냅샷 포맷과 일치해야 함)
function validateSnapshot(body) {
  if (!isPlainObject(body)) return '본문이 객체가 아닙니다';
  const { snapshotId, round, wins, lives, ring } = body;
  if (typeof snapshotId !== 'string' || !snapshotId || snapshotId.length > 128) return 'snapshotId 형식 오류';
  if (!Number.isInteger(round) || round < 1 || round > MAX_ROUND) return 'round 범위 오류';
  if (!Number.isInteger(wins) || wins < 0 || wins > MAX_ROUND) return 'wins 범위 오류';
  if (!Number.isInteger(lives) || lives < 0 || lives > 3) return 'lives 범위 오류';
  if (!Array.isArray(ring) || ring.length < 1 || ring.length > MAX_RING) return 'ring 크기 오류';
  for (const u of ring) {
    if (!isPlainObject(u) || typeof u.speciesId !== 'string' || !u.speciesId) return 'ring 유닛 형식 오류';
    if (typeof u.exp !== 'number' || u.exp < 0 || u.exp > 999) return 'ring 유닛 exp 오류';
  }
  return null;
}

async function handleUpload(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON 파싱 실패' }, 400, origin);
  }
  const err = validateSnapshot(body);
  if (err) return json({ error: err }, 400, origin);

  const ownerId = (request.headers.get('X-Owner-Id') || '').slice(0, 128) || null;
  const createdAt = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO snapshots (id, round, wins, lives, ring_json, owner_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
  ).bind(body.snapshotId, body.round, body.wins, body.lives, JSON.stringify(body.ring), ownerId, createdAt)
    .run();

  return json({ ok: true, snapshotId: body.snapshotId }, 201, origin);
}

async function handleFetch(request, env, origin) {
  const url = new URL(request.url);
  const round = Number(url.searchParams.get('round'));
  if (!Number.isInteger(round) || round < 1 || round > MAX_ROUND) {
    return json({ error: 'round 파라미터가 필요합니다' }, 400, origin);
  }
  const ownerId = (request.headers.get('X-Owner-Id') || '').slice(0, 128) || null;

  // 자기 자신이 올린 스냅샷은 상대 후보에서 제외한다
  const stmt = ownerId
    ? env.DB.prepare(
      `SELECT id, round, wins, lives, ring_json, created_at FROM snapshots
       WHERE round = ? AND (owner_id IS NULL OR owner_id != ?)
       ORDER BY created_at DESC LIMIT ?`,
    ).bind(round, ownerId, FETCH_LIMIT)
    : env.DB.prepare(
      `SELECT id, round, wins, lives, ring_json, created_at FROM snapshots
       WHERE round = ? ORDER BY created_at DESC LIMIT ?`,
    ).bind(round, FETCH_LIMIT);

  const { results } = await stmt.all();
  const out = results.map((row) => ({
    snapshotId: row.id,
    round: row.round,
    wins: row.wins,
    lives: row.lives,
    createdAt: row.created_at,
    ring: JSON.parse(row.ring_json),
  }));
  return json(out, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (url.pathname === '/api/snapshots' && request.method === 'POST') {
      return handleUpload(request, env, origin);
    }
    if (url.pathname === '/api/snapshots' && request.method === 'GET') {
      return handleFetch(request, env, origin);
    }
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'relaymonsters-backend' }, 200, origin);
    }
    return json({ error: 'Not found' }, 404, origin);
  },
};
