// 링 위치 계산 (기획서 3장)
//
// units[] 는 등판 순서(배열 인덱스 0 = 1번 슬롯)이며 살아있는 유닛만 담는다.
// frontIdx 는 현재 전선에 서 있는 유닛의 배열 인덱스다.
// 회전 1칸 = frontIdx + 1 (역회전은 -1).
//
// 화면 위치: 전선 자리를 pos0 으로 두고 회전 방향으로 pos1, pos2 ... 순서다.
//   posOf(i) = (frontIdx - i) mod n
// 즉 pos1 에는 직전 턴에 싸운 유닛(= 앞 유닛)이, pos(n-1) 에는 다음 턴에 싸울 유닛(= 뒤 유닛)이 선다.
//
//   앞 유닛 = 회전 방향 한 칸 앞  = 인덱스 i-1 (이미 전선을 지난 유닛)
//   뒤 유닛 = 회전 반대 방향 한 칸 뒤 = 인덱스 i+1 (다음에 전선에 설 유닛)

export function ringSize(team) {
  return team.units.length;
}

export function frontUnit(team) {
  const n = team.units.length;
  if (n === 0) return null;
  return team.units[((team.frontIdx % n) + n) % n];
}

export function indexOfUnit(team, unit) {
  return team.units.indexOf(unit);
}

export function posOf(team, unit) {
  const n = team.units.length;
  const i = team.units.indexOf(unit);
  if (i < 0 || n === 0) return -1;
  return (((team.frontIdx - i) % n) + n) % n;
}

export function unitAtPos(team, pos) {
  const n = team.units.length;
  if (n === 0) return null;
  const i = (((team.frontIdx - pos) % n) + n) % n;
  return team.units[i];
}

// 앞 유닛 — 회전 방향 한 칸 앞의 가장 가까운 생존 아군
export function aheadUnit(team, unit) {
  const n = team.units.length;
  const i = team.units.indexOf(unit);
  if (i < 0 || n <= 1) return null;
  return team.units[(i - 1 + n) % n];
}

// 뒤 유닛 — 회전 반대 방향 한 칸 뒤의 가장 가까운 생존 아군
export function behindUnit(team, unit) {
  const n = team.units.length;
  const i = team.units.indexOf(unit);
  if (i < 0 || n <= 1) return null;
  return team.units[(i + 1) % n];
}

// 앞·뒤가 같은 유닛을 가리키면 한 번만 적용한다 (2마리 링 중복 보상 차단)
export function neighborUnits(team, unit) {
  const a = aheadUnit(team, unit);
  const b = behindUnit(team, unit);
  const out = [];
  if (a) out.push(a);
  if (b && b !== a) out.push(b);
  return out;
}

// 맞은편 — 전선의 정반대 위치.
// 짝수 칸 링은 정확히 절반 건너편, 홀수 칸 링은 가장 먼 두 칸 중 앞 유닛 쪽.
export function oppositeUnit(team) {
  const n = team.units.length;
  if (n === 0) return null;
  if (n === 1) return team.units[team.frontIdx % n];
  const pos = n % 2 === 0 ? n / 2 : Math.floor(n / 2);
  return unitAtPos(team, pos);
}

// 회전 실행. 반환값은 실제로 이동했는지 여부와 방향.
export function rotate(team, { steps = 1 } = {}) {
  const n = team.units.length;
  if (n === 0) return { moved: false, dir: 0, steps: 0 };

  if (team.skipNext) {
    team.skipNext = false;
    return { moved: false, dir: 0, steps: 0, skipped: true };
  }
  let dir = 1;
  if (team.reverseNext) {
    dir = -1;
    team.reverseNext = false;
  }
  let s = steps;
  if (team.fastNext) {
    s = steps * 2;
    team.fastNext = false;
  }
  team.frontIdx = (((team.frontIdx + dir * s) % n) + n) % n;
  return { moved: true, dir, steps: s };
}

// 순서역전 — 배치 순서를 통째로 뒤집는다. 전선 유닛은 유지된다.
export function reverseOrder(team) {
  const n = team.units.length;
  if (n <= 1) return;
  const front = frontUnit(team);
  team.units.reverse();
  team.frontIdx = team.units.indexOf(front);
}

// 링 좌표 (렌더링용). frontAngle: 아군 0도(오른쪽), 적 180도(왼쪽)
export function ringLayout(n, frontAngleDeg, radius, cx, cy) {
  const out = [];
  for (let pos = 0; pos < n; pos++) {
    const a = ((frontAngleDeg + (pos * 360) / n) * Math.PI) / 180;
    out.push({ pos, x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, angle: a });
  }
  return out;
}
