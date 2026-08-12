-- Relay Monsters — 비동기 멀티 스냅샷 저장소 (D1)
-- 문서 형태는 기획서 14.3 과 동일. owner_id 는 클라이언트가 생성한 익명 식별자로,
-- 조회 시 "내 것인지" 표시하는 데 쓴다(인증 아님). 자기 자신·AI 매칭 확률 계산은
-- 클라이언트(src/storage/backend.js)가 담당한다.

CREATE TABLE IF NOT EXISTS snapshots (
  id         TEXT PRIMARY KEY,
  round      INTEGER NOT NULL,
  wins       INTEGER NOT NULL,
  lives      INTEGER NOT NULL,
  ring_json  TEXT NOT NULL,
  team_name  TEXT,
  owner_id   TEXT,
  created_at TEXT NOT NULL
);

-- 매칭 규칙(기획서 11.2) 1번: 동일 라운드 번호의 스냅샷 풀에서 추출
CREATE INDEX IF NOT EXISTS idx_snapshots_round ON snapshots(round, created_at DESC);
