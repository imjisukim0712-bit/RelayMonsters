# Relay Monsters

원형 링 위에서 몬스터들이 매 턴 배턴을 넘기며 싸우는 **회전 오토배틀러**.
빌드 도구 없이 동작하는 정적 웹 앱(ES 모듈)이며 GitHub Pages 로 배포된다.

플레이: **https://imjisukim0712-bit.github.io/RelayMonsters/**

## 구현 범위

기획서 v0.6 기준으로 **실 서버 배포(계정 로그인이 필요한 단계)를 제외한 전부**가 구현되어 있다.

| 영역 | 상태 |
|---|---|
| 링 시스템 (빈칸 없는 가변 링 · 전선 · 압축 · 회전) | ✅ |
| 전투 8단계 턴 시퀀스 · 12종 트리거 · 트리거 우선순위 · 재귀 깊이 제한 | ✅ |
| 몬스터 60종 (Lv1/Lv3/Lv5 능력 180문구, 전원 고유) | ✅ |
| 마나 시스템 — T2~T6 티어별 마나 유닛 1종 · 고유 트리거 마나 획득/소비 · T4 연금술사 마나 공급 | ✅ |
| 60종 전신 벡터 SVG 아트 + 실루엣 식별자 | ✅ |
| 상점 · 골드 · 리롤 · 판매 · 합치기 · 5레벨 경험치 | ✅ |
| 소모품 9종 · 아이템 부여 능력 3종 | ✅ |
| 18라운드 · 생명 3 · 라운드 곡선 · 프리셋 봇 54개 | ✅ |
| 코인 · 배경 상점 6종 · 도감 · 규칙 화면 | ✅ |
| 회전 시 원호 바운스 이동 · 배속 1×/2×/4× · 트리거 배지 | ✅ |
| 스냅샷 저장 · 비동기 멀티 매칭 (로컬 저장소) | ✅ |
| Firebase 서버 연동 | ⏳ 어댑터 자리만 준비됨 |
| **Cloudflare Worker + D1 서버 연동** | ⏳ 서버 완성·로컬 검증 완료, 실 배포(로그인 필요)만 대기 |

## 백엔드 연결

게임 코드는 스냅샷 업로드/다운로드를 `src/storage/backend.js` 의 어댑터 인터페이스로만 호출한다.
연결 전에는 자동으로 로컬 스냅샷 + 프리셋 봇 폴백으로 동작하며, 두 백엔드 중 하나를 골라 붙이면 된다.

### 옵션 A — Firebase (미연결)

1. `src/storage/firebaseBackend.js` 의 `FIREBASE_CONFIG` 를 실제 프로젝트 값으로 채운다.
2. `src/main.js` 상단의 옵션 A 두 줄 주석을 해제한다.
3. Firestore 에 `snapshots` 컬렉션을 만들고 `(round ASC, wins ASC)` 복합 인덱스를 추가한다.
   읽기는 공개, 쓰기는 인증된 사용자로 제한한다.

### 옵션 B — Cloudflare Worker + D1 (서버 코드 완성·로컬 검증 완료, 실 배포 대기)

`server/` 에 Worker + D1 백엔드가 구현되어 있고 `wrangler dev --local` 로 오프라인
검증까지 마쳤다(업로드/조회 라운드 트립, 자기 스냅샷 필터, 입력 검증, CORS, 실제 브라우저
플레이 승리 → 네트워크 요청 → D1 저장까지 end-to-end 확인). **실제 Cloudflare 계정으로의
배포(`wrangler login`)는 사람이 직접 해야 하는 단계**라 여기까지는 되어 있지 않다.

```bash
cd server && npm install
npx wrangler login
npx wrangler d1 create relaymonsters-db   # 출력된 database_id 를 wrangler.toml 에 반영
npm run db:init:remote
npm run deploy                             # workers.dev 주소가 출력된다
```

배포 후 `src/storage/cloudflareBackend.js` 의 `WORKER_URL` 을 그 주소로 바꾸고,
`src/main.js` 상단의 옵션 B 두 줄 주석을 해제한다. 자세한 내용은 `server/README.md` 참고.

스냅샷 형태는 두 백엔드 모두 기획서 14.3 과 동일하며 `makeSnapshot()` 이 그대로 생성한다.

## 구조

```
index.html · styles.css
src/
  main.js                 부트스트랩 (백엔드 연결 지점)
  data/    species.js     로스터 60종 + 능력 데이터
           items.js       소모품 9종 · 아이템 부여 능력
           bots.js        프리셋 봇 54개 (결정론적 생성)
           backgrounds.js 배경 6종
  engine/  battle.js      전투 엔진 → 이벤트 타임라인 반환
           ring.js        전선·앞/뒤 유닛·회전·압축 좌표 규칙
           unit.js        경험치 기반 파생 스탯 · 레벨 · 합치기
           shop.js        상점·구매·판매·아이템
           shopEffects.js 판매 / 아이템 사용 트리거
           run.js         라운드·생명·코인
           text.js        능력 문구를 데이터에서 파생 생성
           rng.js         시드 RNG
  storage/ save.js        localStorage 세이브 (v3)
           backend.js     멀티 백엔드 추상화
           firebaseBackend.js   Firebase 어댑터 (미연결)
           cloudflareBackend.js Cloudflare 어댑터 (서버 완성, 배포 대기)
  art/     symbols.js     60종 SVG symbol 시트
           items.js       소모품 아이콘
           backgrounds.js 배경 레이어
  ui/      app.js         씬 라우터
           battleScene.js 전투 재생 (원호 바운스 회전)
           shopScene.js   상점 (드래그 구매·합치기·판매·순서 변경)
           lobby.js  bgShop.js  codex.js  unitView.js  dom.js
server/                   Cloudflare Worker + D1 (별도 README)
  wrangler.toml  schema.sql  src/index.js
```

전투 규칙과 연출은 완전히 분리되어 있다. `simulateBattle()` 은 DOM 없이 실행 가능한
순수 함수이며 스냅샷이 포함된 이벤트 배열을 돌려주고, UI 는 그것을 재생만 한다.

## 로컬 실행

```bash
npx http-server -p 8123 -c-1 .
# http://localhost:8123
```

빌드 단계가 없으므로 파일을 그대로 열어도 되지만, ES 모듈 때문에 `file://` 대신
정적 서버가 필요하다.

## 설계 결정 메모

기획서에서 명시되지 않아 구현 시 확정한 사항.

- **전선 승계** — 전선 유닛이 교전으로 사망하면 뒤 유닛이 그 자리를 물려받고,
  그 턴의 회전은 이 승계로 대체한다. 다음 등판 유닛이 전선을 건너뛰지 않게 하기 위함.
  회전 트리거와 한 바퀴 카운터는 정상 진행한다.
- **쓰러지는 중인 유닛 제외** — 사망 판정은 턴 시퀀스 5단계에서 확정되므로 체력 0 이하이면서
  아직 제거되지 않은 유닛이 존재한다. 대상 선택에서는 이들을 제외해 처치 트리거의 피해가
  방금 죽인 대상에게 낭비되지 않게 했다 (사이클롭스의 "다른 적" 표현과 일관).
  단 `자신`은 예외로, 트롤처럼 피해받음으로 자신을 회복해 사망을 면하는 처리는 유지된다.
- **슬라임 분열** — 링이 6칸이면 생성하지 않는다 (기획서 15.2 미결정 사항 중 첫 번째 안).
- **피닉스 부활** — 링 압축 전 같은 슬롯에서 부활한다.
- **코인 지급량** — 라운드 승리당 8코인, 클리어 시 +150. 배경 가격 0/250/350/350/500/800.
- **세로 화면 전투** — 좌우 배치가 불가능한 세로 비율에서는 두 링을 위아래로 마주 세운다.
- **유닛 표시 크기** — 인접 슬롯 간격에서 역산해 링 칸 수와 화면 크기에 관계없이 겹치지 않게 한다.
- **마나 실시간 로그 분리** — 능력 문구는 항상 "마나 획득 / 마나 n → 효과" 전체를 보여주지만,
  전투 로그·트리거 배지는 이번에 실제로 일어난 일만 보여준다. 획득 시점에 조건을 만족하면
  그 순간 별도로 한 번 더 알린다 (같은 획득 이벤트에서 1회만 발동, 4.1·5.4절).
