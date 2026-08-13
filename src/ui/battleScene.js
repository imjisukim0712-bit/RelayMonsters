// 전투 화면 (기획서 13.1) — 엔진이 만든 이벤트 타임라인을 재생한다.
// 회전은 링을 통째로 돌리지 않고, 각 유닛이 원호를 따라 통통 튀며 다음 슬롯으로 이동한다 (12.6).

import { TIER_COLORS, TRIGGERS } from '../data/species.js';
import { unitStand, ICONS } from './unitView.js';
import { backgroundSvg } from '../art/backgrounds.js';
import { prefersReducedMotion, sleep, escapeHtml } from './dom.js';
import { MAX_TURNS } from '../engine/battle.js';

const BASE_ROTATE_MS = 420; // 기본 1칸 회전 시간 0.42초
const DELAYS = {
  battle_start: 420, turn_start: 200, attack: 250, trigger: 300, damage: 230,
  heal: 190, shield: 190, buff: 170, debuff: 170, mark: 190, note: 150, mana: 170,
  death: 320, compress: 220, summon: 300, revive: 340, rotate: BASE_ROTATE_MS + 60,
  lap: 260, end: 500, log: 0,
};

export function playBattle(root, {
  run, battle, allyTeamName, enemyTeamName, backgroundId, onDone,
}) {
  const speeds = [1, 2, 4];
  let speedIdx = 0;
  let skip = false;
  let cancelled = false;
  const reduced = prefersReducedMotion();

  root.innerHTML = `
  <div class="scene battle-scene">
    <header class="hud">
      <div class="hud-left">
        <span class="hud-round">R${run.round}<i>/18</i></span>
        <span class="hud-lives" title="생명">${lifeIcons(run.lives)}</span>
        <span class="hud-turn">턴 <b id="turnNum">0</b><i>/${MAX_TURNS}</i></span>
      </div>
      <div class="hud-right">
        <button class="btn tiny" id="speedBtn" title="배속">1×</button>
        <button class="btn tiny ghost" id="skipBtn" title="전투 건너뛰기">건너뛰기</button>
      </div>
    </header>

    <!-- 팀 이름은 상단 UI(라운드·생명·턴·설정)의 일부가 아니라 그 아래 줄에 둔다 -->
    <div class="team-bar" id="teamBar">
      <span class="hud-team hud-team-ally" title="아군 팀">${escapeHtml(allyTeamName || '내 팀')}</span>
      <span class="hud-team hud-team-enemy" title="적군 팀">${escapeHtml(enemyTeamName || '상대 팀')}</span>
    </div>

    <div class="stage" id="stage">
      ${backgroundSvg(backgroundId)}
      <div class="front-marker" id="frontMarker">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4 L16 16 M2 18 l4 4 M3 21 l3 -3 M20 4 L8 16 M22 18 l-4 4 M21 21 l-3 -3" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>
        <span>전선</span>
      </div>
      <div class="ring ring-ally" id="ringAlly" data-side="0"></div>
      <div class="ring ring-enemy" id="ringEnemy" data-side="1"></div>
      <div class="fx-layer" id="fxLayer"></div>
      <div class="banner" id="banner" hidden></div>
    </div>

    <footer class="battle-log" id="battleLog" aria-live="polite"></footer>
  </div>`;

  const stage = root.querySelector('#stage');
  const hudEl = root.querySelector('.hud');
  const teamBar = root.querySelector('#teamBar');
  const rings = [root.querySelector('#ringAlly'), root.querySelector('#ringEnemy')];
  const fxLayer = root.querySelector('#fxLayer');
  const logBox = root.querySelector('#battleLog');
  const turnNum = root.querySelector('#turnNum');
  const banner = root.querySelector('#banner');
  const speedBtn = root.querySelector('#speedBtn');

  speedBtn.addEventListener('click', () => {
    speedIdx = (speedIdx + 1) % speeds.length;
    speedBtn.textContent = `${speeds[speedIdx]}×`;
  });
  root.querySelector('#skipBtn').addEventListener('click', () => { skip = true; });

  // ── 링 좌표 ─────────────────────────────────────────────────────
  // 가로 화면: 두 링을 좌우로 마주 세운다 (아군 전선 = 오른쪽, 적 전선 = 왼쪽)
  // 세로 화면: 두 링을 위아래로 마주 세운다 (아군 전선 = 위, 적 전선 = 아래)
  let geo = { w: 0, h: 0, radius: 0, centers: [], frontAngle: [0, 180], squash: 0.9, maxUw: 132 };
  function measure() {
    const r = stage.getBoundingClientRect();
    geo.w = r.width;
    geo.h = r.height;
    // 팀 이름 줄을 HUD(라운드·생명·턴·배속·건너뛰기) 바로 아래에 붙인다.
    // hud 높이는 화면 폭에 따라 바뀌므로 매 측정마다 다시 잰다.
    const hudH = hudEl?.offsetHeight || 0;
    if (teamBar) teamBar.style.top = `${hudH}px`;
    // 유닛이 상단 UI(HUD + 팀 이름 줄) 뒤로 가려지거나 그 위를 덮지 않도록,
    // 실제로 렌더링된 높이만큼 여백을 두고 링을 그 아래로 밀어낸다.
    const topSafe = hudH + (teamBar?.offsetHeight || 0) + 12;
    const portrait = r.width / Math.max(1, r.height) < 1.25;
    if (portrait) {
      geo.maxUw = 88;
      geo.squash = 0.66;
      geo.frontAngle = [-90, 90];
      geo.radius = Math.max(38, Math.min(r.width * 0.27, r.height * 0.15));
      const headroom = geo.maxUw * 1.25; // 유닛 실루엣이 중심점보다 위로 자라는 여유
      const bottomY = r.height * 0.76;
      const topY = Math.min(Math.max(topSafe + headroom, r.height * 0.24), bottomY - geo.radius * 2);
      geo.centers = [
        { x: r.width * 0.5, y: bottomY },
        { x: r.width * 0.5, y: topY },
      ];
    } else {
      geo.maxUw = 132;
      geo.squash = 0.9;
      geo.frontAngle = [0, 180];
      const bodyAllow = geo.maxUw; // 유닛 실루엣이 중심점보다 위로 자라는 여유
      const footAllow = 40; // 발밑 이름·칩 표시 여유
      const bottomLimit = r.height - footAllow;
      // 화면이 낮을 때는 링 자체를 줄여서라도 위(HUD)·아래(전투 로그) 모두와 겹치지 않게 한다.
      const bandRadius = Math.max(0, bottomLimit - topSafe - bodyAllow) / geo.squash;
      geo.radius = Math.max(38, Math.min(r.height * 0.21, r.width * 0.13, bandRadius));
      const cy = Math.min(
        Math.max(r.height * 0.58, topSafe + bodyAllow + geo.radius * geo.squash),
        bottomLimit - geo.radius * geo.squash,
      );
      geo.centers = [{ x: r.width * 0.245, y: cy }, { x: r.width * 0.755, y: cy }];
    }
    const marker = root.querySelector('#frontMarker');
    if (marker) {
      marker.style.left = `${(geo.centers[0].x + geo.centers[1].x) / 2}px`;
      marker.style.top = `${(geo.centers[0].y + geo.centers[1].y) / 2}px`;
    }
  }

  function coordsFor(side, pos, n) {
    const c = geo.centers[side];
    const a = ((geo.frontAngle[side] + (pos * 360) / n) * Math.PI) / 180;
    return { x: c.x + Math.cos(a) * geo.radius, y: c.y + Math.sin(a) * geo.radius * geo.squash };
  }

  // 인접 슬롯 간격에서 유닛 표시 크기를 역산해 어떤 링 크기에서도 겹치지 않게 한다
  function unitWidthFor(n) {
    const gap = 2 * geo.radius * Math.sin(Math.PI / Math.max(2, n));
    return Math.max(44, Math.min(geo.maxUw, gap * 0.82));
  }

  // ── 유닛 엘리먼트 관리 ──────────────────────────────────────────
  const nodes = new Map(); // uid → element

  function ensureUnits(snap) {
    const seen = new Set();
    snap.teams.forEach((team, side) => {
      const n = team.units.length;
      team.units.forEach((u, idx) => {
        seen.add(u.uid);
        let node = nodes.get(u.uid);
        if (!node) {
          const wrap = document.createElement('div');
          wrap.innerHTML = unitStand(u, { flip: side === 1, hitArea: false });
          node = wrap.firstElementChild;
          node.classList.add('ring-unit', 'spawn');
          node.style.setProperty('--idle-delay', `${-((idx + side * 2) * .31).toFixed(2)}s`);
          rings[side].appendChild(node);
          nodes.set(u.uid, node);
        }
        const pos = n ? (((team.frontIdx - idx) % n) + n) % n : 0;
        node.dataset.pos = pos;
        node.dataset.side = side;
        node.dataset.n = n;
        node.classList.toggle('is-front', pos === 0);
        const uw = unitWidthFor(n);
        node.style.setProperty('--unit-w', `${Math.round(uw)}px`);
        node.classList.toggle('tiny-unit', uw < 78);
        updateStats(node, u);
      });
    });
    // 스냅샷에서 사라진 유닛 제거
    for (const [uid, node] of [...nodes.entries()]) {
      if (!seen.has(uid)) {
        node.classList.add('gone');
        setTimeout(() => node.remove(), 320);
        nodes.delete(uid);
      }
    }
  }

  function updateStats(node, u) {
    const atk = node.querySelector('.chip-atk .v');
    const hp = node.querySelector('.chip-hp .v');
    if (atk) atk.textContent = u.atk;
    if (hp) hp.textContent = u.hp;
    let sh = node.querySelector('.chip-shield');
    if (u.shield > 0) {
      if (!sh) {
        sh = document.createElement('span');
        sh.className = 'chip chip-shield';
        sh.title = '보호막';
        sh.innerHTML = `${ICONS.shield}<span class="v">0</span>`;
        node.querySelector('.chips').appendChild(sh);
      }
      sh.querySelector('.v').textContent = u.shield;
    } else if (sh) sh.remove();
    if (u.manaUnit) {
      let mn = node.querySelector('.chip-mana');
      if (!mn) {
        mn = document.createElement('span');
        mn.className = 'chip chip-mana';
        mn.title = '마나';
        mn.innerHTML = `${ICONS.mana}<span class="v">0<span class="chip-sub">/${u.maxMana}</span></span>`;
        node.querySelector('.chips').appendChild(mn);
      }
      mn.querySelector('.v').innerHTML = `${u.mana}<span class="chip-sub">/${u.maxMana}</span>`;
    }
    const ratio = u.maxHp ? Math.max(0, u.hp) / u.maxHp : 1;
    node.classList.toggle('hurt', ratio <= 0.34);
  }

  // 발밑을 링 좌표에 맞춰 세운다 (left/top 은 좌상단이므로 오프셋을 보정)
  function anchor(node, c) {
    const bodyH = node.querySelector('.unit-body')?.offsetHeight || node.offsetHeight * 0.7;
    node.style.left = `${c.x - node.offsetWidth / 2}px`;
    node.style.top = `${c.y - bodyH}px`;
  }

  function place() {
    for (const node of nodes.values()) {
      const side = Number(node.dataset.side);
      const pos = Number(node.dataset.pos);
      const n = Number(node.dataset.n) || 1;
      const c = coordsFor(side, pos, n);
      node.style.transform = '';
      anchor(node, c);
      node._coord = c;
    }
  }

  // 원호 바운스 이동 (12.6)
  async function animateRotation(ms) {
    const moves = [];
    for (const node of nodes.values()) {
      const side = Number(node.dataset.side);
      const pos = Number(node.dataset.pos);
      const n = Number(node.dataset.n) || 1;
      const to = coordsFor(side, pos, n);
      const from = node._coord || to;
      if (Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5) {
        node._coord = to;
        continue;
      }
      moves.push({ node, from, to, side, n });
      anchor(node, from);
    }
    if (!moves.length) return;

    const dur = Math.max(90, ms);
    const bodySel = '.unit-body';

    await Promise.all(moves.map(({ node, from, to, side, n }) => {
      const c = geo.centers[side];
      const a0 = Math.atan2((from.y - c.y) / 0.9, from.x - c.x);
      let a1 = Math.atan2((to.y - c.y) / 0.9, to.x - c.x);
      // 최단 회전 방향으로 보정
      while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
      while (a0 - a1 > Math.PI) a1 += Math.PI * 2;

      const steps = reduced ? 2 : 14;
      const frames = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = a0 + (a1 - a0) * t;
        const x = c.x + Math.cos(a) * geo.radius;
        const y = c.y + Math.sin(a) * geo.radius * 0.9;
        frames.push({ transform: `translate(${x - from.x}px, ${y - from.y}px)` });
      }
      const anim = node.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' });

      // 포물선 바운스 + 착지 눌림
      const body = node.querySelector(bodySel);
      let bounce = null;
      if (body && !reduced) {
        const peak = -Math.max(8, node.offsetHeight * 0.12);
        bounce = body.animate([
          { transform: 'translateY(0) scale(1,1)' },
          { transform: `translateY(${peak}px) scale(1,1)`, offset: 0.5 },
          { transform: 'translateY(0) scale(1.06,0.94)', offset: 0.88 },
          { transform: 'translateY(0) scale(1,1)' },
        ], { duration: dur + 80, easing: 'ease-in-out' });
      }
      return anim.finished.then(() => {
        anim.cancel();
        if (bounce) bounce.cancel();
        node.style.transform = '';
        anchor(node, to);
        node._coord = to;
      });
    }));
  }

  // ── FX ─────────────────────────────────────────────────────────
  function floatText(uid, text, kind) {
    const node = nodes.get(uid);
    if (!node) return;
    const c = node._coord || { x: 0, y: 0 };
    const f = document.createElement('div');
    f.className = `float float-${kind}`;
    f.textContent = text;
    f.style.left = `${c.x}px`;
    f.style.top = `${c.y - node.offsetHeight * 0.55}px`;
    fxLayer.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }
  function pulse(uid, cls, ms = 420) {
    const node = nodes.get(uid);
    if (!node) return;
    node.classList.add(cls);
    setTimeout(() => node.classList.remove(cls), ms);
  }
  function lunge(uid) {
    const node = nodes.get(uid);
    if (!node) return;
    const dir = node.dataset.side === '0' ? 1 : -1;
    node.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${dir * 16}px,0)`, offset: 0.4 },
      { transform: 'translate(0,0)' },
    ], { duration: 260, easing: 'ease-out' });
  }
  function badgeGlow(uid, trigger, text) {
    const node = nodes.get(uid);
    if (!node) return;
    node.classList.add('ability-active');
    setTimeout(() => node.classList.remove('ability-active'), 620);
    const label = text || TRIGGERS[trigger] || trigger;
    floatText(uid, label.length > 22 ? `${label.slice(0, 21)}…` : label, 'trigger');
  }

  const logLines = [];
  function pushLog(text) {
    logLines.push(text);
    while (logLines.length > 3) logLines.shift();
    logBox.innerHTML = logLines.map((l, i) => `<div class="log-line${i === logLines.length - 1 ? ' latest' : ''}">${l}</div>`).join('');
  }

  // ── 재생 ────────────────────────────────────────────────────────
  async function play() {
    measure();
    ensureUnits(battle.events[0]?.snap || { teams: [{ units: [], frontIdx: 0 }, { units: [], frontIdx: 0 }] });
    place(true);
    await sleep(reduced ? 60 : 260);

    for (const ev of battle.events) {
      if (cancelled) return;
      const mult = speeds[speedIdx];
      const wait = skip ? 0 : (DELAYS[ev.type] ?? 180) / mult;

      switch (ev.type) {
        case 'log':
          pushLog(ev.text);
          break;
        case 'turn_start':
          turnNum.textContent = ev.turn;
          ensureUnits(ev.snap);
          place(true);
          break;
        case 'rotate': {
          ensureUnits(ev.snap);
          if (!skip) await animateRotation(reduced ? 150 : BASE_ROTATE_MS / mult);
          else place(true);
          break;
        }
        case 'attack':
          ensureUnits(ev.snap);
          place(true);
          if (!skip) for (const uid of ev.attackers || []) lunge(uid);
          break;
        case 'damage':
          ensureUnits(ev.snap);
          if (!skip) {
            floatText(ev.uid, `-${ev.amount}`, 'dmg');
            pulse(ev.uid, 'hit', 320);
          }
          break;
        case 'heal':
          ensureUnits(ev.snap);
          if (!skip) floatText(ev.uid, `+${ev.amount}`, 'heal');
          break;
        case 'shield':
          ensureUnits(ev.snap);
          if (!skip) { floatText(ev.uid, `보호막 +${ev.amount}`, 'shield'); pulse(ev.uid, 'shielded', 520); }
          break;
        case 'buff':
          ensureUnits(ev.snap);
          if (!skip) {
            const bits = [];
            if (ev.atk) bits.push(`공격력 ${ev.atk > 0 ? '+' : ''}${ev.atk}`);
            if (ev.hp) bits.push(`체력 ${ev.hp > 0 ? '+' : ''}${ev.hp}`);
            if (bits.length) floatText(ev.uid, bits.join(' '), 'buff');
          }
          break;
        case 'debuff':
          ensureUnits(ev.snap);
          if (!skip) floatText(ev.uid, `공격력 ${ev.atk}`, 'debuff');
          break;
        case 'mark':
          ensureUnits(ev.snap);
          if (!skip) floatText(ev.uid, `다음 피해 +${ev.amount}`, 'debuff');
          break;
        case 'mana':
          ensureUnits(ev.snap);
          if (!skip) { floatText(ev.uid, `마나 +${ev.amount}`, 'mana'); pulse(ev.uid, 'mana-lit', 420); }
          break;
        case 'note':
          if (!skip) floatText(ev.uid, ev.text, 'buff');
          break;
        case 'trigger':
          if (!skip) badgeGlow(ev.uid, ev.trigger, ev.text);
          break;
        case 'lap':
          if (!skip) { pulse(ev.uid, 'lapped', 620); floatText(ev.uid, '한 바퀴', 'trigger'); }
          break;
        case 'death':
          if (!skip) pulse(ev.uid, 'dying', 320);
          break;
        case 'summon':
        case 'revive':
        case 'compress':
          ensureUnits(ev.snap);
          if (ev.type === 'compress' && !skip) await animateRotation(reduced ? 120 : 260 / mult);
          else place(true);
          if (ev.type === 'revive' && !skip) { pulse(ev.uid, 'shielded', 700); floatText(ev.uid, '부활', 'heal'); }
          if (ev.type === 'summon' && ev.self && !skip) { pulse(ev.uid, 'shielded', 700); floatText(ev.uid, '재소환', 'heal'); }
          break;
        case 'battle_start':
          ensureUnits(ev.snap);
          place(true);
          showBanner('전투 시작', 'start');
          break;
        case 'end':
          ensureUnits(ev.snap);
          place(true);
          break;
        default:
          ensureUnits(ev.snap);
          break;
      }
      if (wait) await sleep(wait);
    }

    const label = battle.result === 'win' ? '승리' : battle.result === 'lose' ? '패배' : '무승부';
    showBanner(label, battle.result);
    await sleep(skip ? 200 : 700);
    if (!cancelled && onDone) onDone(battle.result);
  }

  function showBanner(text, kind) {
    banner.hidden = false;
    banner.className = `banner banner-${kind}`;
    banner.textContent = text;
    banner.animate(
      [{ opacity: 0, transform: 'scale(0.86)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 240, easing: 'ease-out' },
    );
    if (kind === 'start') setTimeout(() => { banner.hidden = true; }, 900);
  }

  const onResize = () => { measure(); place(true); };
  window.addEventListener('resize', onResize);

  play();

  return {
    destroy() {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    },
  };
}

export function lifeIcons(lives, max = 3) {
  let s = '';
  for (let i = 0; i < max; i++) {
    s += `<svg class="life${i < lives ? '' : ' off'}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.6-7-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.4c0 5-7 9.6-7 9.6Z" fill="currentColor"/></svg>`;
  }
  return `${s}<span class="sr">${lives}/${max}</span>`;
}

export { TIER_COLORS };
