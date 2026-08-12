# Relay Monsters — Cloudflare 백엔드

비동기 멀티(기획서 11장)용 스냅샷 저장소. Cloudflare Worker + D1로 구성되어 있고,
**로컬에서 완전히 오프라인으로 검증까지 마친 상태**다. 배포만 하면 된다.

## 배포 (Cloudflare 계정 필요 — 여기서부터는 사람이 해야 함)

```bash
cd server
npm install

# 1) Cloudflare 로그인 (브라우저가 열린다)
npx wrangler login

# 2) 실제 D1 데이터베이스 생성 — 출력된 database_id 를 wrangler.toml 에 붙여넣는다
npx wrangler d1 create relaymonsters-db

# 3) 스키마 적용 (원격)
npm run db:init:remote

# 4) 배포
npm run deploy
```

배포가 끝나면 `https://relaymonsters-backend.<계정>.workers.dev` 형태의 URL이 출력된다.

## 게임에 연결

1. `../src/storage/cloudflareBackend.js` 의 `WORKER_URL` 을 위 주소로 바꾼다.
2. `../src/main.js` 상단의 "옵션 B) Cloudflare" 두 줄 주석을 해제한다.
3. 커밋 · 푸시하면 GitHub Pages 에 반영된다.

## 로컬 개발 (Cloudflare 계정 불필요)

```bash
cd server
npm install
npm run db:init:local   # 로컬 SQLite에 스키마 적용
npm run dev              # http://localhost:8787
```

`wrangler.toml` 의 `database_id` 는 로컬 전용 자리표시자이며, `--local` 모드에서는
실제 Cloudflare 계정과 무관하게 동작한다. 로컬 서버가 뜬 상태에서
`src/storage/cloudflareBackend.js` 의 `WORKER_URL` 을 `http://localhost:8787` 로 두고
`main.js` 의 옵션 B를 해제하면, 게임을 로컬 정적 서버로 열어 전체 흐름을 확인할 수 있다.

## API

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 상태 확인 |
| POST | `/api/snapshots` | 스냅샷 업로드. 본문은 기획서 14.3 형식과 동일 |
| GET | `/api/snapshots?round=N` | 해당 라운드 스냅샷 최대 40건. `X-Owner-Id` 헤더와 일치하는 항목은 제외 |

인증은 없다(프로토타입). `X-Owner-Id` 는 클라이언트가 만든 익명 식별자로,
자기 자신이 올린 스냅샷을 상대 후보에서 빼는 데만 쓰인다.

서버 쪽에서 `round`(1~18) · `wins`(0~18) · `lives`(0~3) · `ring`(1~6칸) 범위와 각 유닛의
`speciesId`/`exp` 형식을 검증하며, 잘못된 요청은 400을 반환한다.

## 스키마

```sql
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  round INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  lives INTEGER NOT NULL,
  ring_json TEXT NOT NULL,
  owner_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_snapshots_round ON snapshots(round, created_at DESC);
```

## 검증 이력

로컬 `wrangler dev --local`(Cloudflare API 호출 없이 동작)로 확인한 항목:

- 업로드 → 조회 라운드 트립, 자기 자신 스냅샷 제외 필터
- 잘못된 라운드/생명/링 크기 요청의 400 거부
- CORS 프리플라이트(OPTIONS) 및 실제 오리진 응답
- 실제 브라우저에서 게임을 플레이해 승리 시 실제 네트워크 요청이 나가고 D1에
  저장되는 것까지 end-to-end 확인 (`prepareOpponent` GET → 200, 승리 후 POST → 201)
