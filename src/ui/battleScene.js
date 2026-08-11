// 전투 화면 (기획서 13.1) — 엔진이 만든 이벤트 타임라인을 재생한다.
// 회전은 링을 통째로 돌리지 않고, 각 유닛이 원호를 따라 통통 튀며 다음 슬롯으로 이동한다 (12.6).

import { TIER_COLORS, TRIGGERS } from '../data/species.js';
import { unitStand, ICONS } from './unitView.js';
import { backgroundSvg, ringPathColor } from '../art/backgrounds.js';
import { prefersReducedMotion, sleep } from './dom.js';
import { MAX_TURNS } from '../engine/battle.js';

const BASE_ROTATE_MS = 420; // 기본 1칸 회전 시간 0.42초
const DELAYS = {
  battle_start: 420, turn_start: 200, attack: 250, trigger: 300, damage: 230,
  heal: 190, shield: 190, buff: 170, debuff: 170, mark: 190, note: 150,
  death: 320, compress: 220, summon: 300, revive: 340, rotate: BASE_ROTATE_MS + 60,
  lap: 260, end: 500, log: 0,
};

export function playBattle(root, {
  run, battle, opponentLabel, backgroundId, onDone,
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
        <span class="hud-vs" title="상대">${opponentLabel || ''}</span>
        <button class="btn tiny" id="speedBtn" title="배속">1×</button>
        <button class="btn tiny ghost" id="skipBtn" title="전투 건너뛰기">건너뛰기</button>
      </div>
    </header>

    <div class="stage" id="stage">
      ${backgroundSvg(backgroundId)}
      <div class="ring-path" id="pathAlly"></div>
      <div class="ring-path" id="pathEnemy"></div>
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
  const rings = [root.querySelector('#ringAlly'), root.querySelector('#ringEnemy')];
  const paths = [root.querySelector('#pathAlly'), root.querySelector('#pathEnemy')];
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
  let geo = { w: 0, h: 0, radius: 0, centers: [], frontAngle: [0, 180], squash: 0.9, maxUw: 150 };
  function measure() {
    const r = stage.getBoundingClientRect();
    geo.w = r.width;
    geo.h = r.height;
    const portrait = r.width / Math.max(1, r.height) < 1.25;
    if (portrait) {
      geo.radius = Math.max(44, Math.min(r.width * 0.30, r.height * 0.17));
      geo.centers = [
        { x: r.width * 0.5, y: r.height * 0.755 },
        { x: r.width * 0.5, y: r.height * 0.245 },
      ];
      geo.frontAngle = [-90, 90];
      geo.squash = 0.66;
      geo.maxUw = 96;
    } else {
      geo.radius = Math.max(52, Math.min(r.height * 0.235, r.width * 0.145));
      const cy = r.height * 0.58;
      geo.centers = [{ x: r.width * 0.245, y: cy }, { x: r.width * 0.755, y: cy }];
      geo.frontAngle = [0, 180];
      geo.squash = 0.9;
      geo.maxUw = 150;
    }
    for (const [i, p] of paths.entries()) {
      const c = geo.centers[i];
      const w = geo.radius * 2 + 26;
      const h = geo.radius * 2 * geo.squash + 26;
      p.style.width = `${w}px`;
      p.style.height = `${h}px`;
      p.style.left = `${c.x - w / 2}px`;
      p.style.top = `${c.y - h / 2}px`;
      p.style.setProperty('--path', ringPathColor(backgroundId));
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
    if (hp) hp.innerHTML = `${u.hp}<span class="chip-sub">/${u.maxHp}</span>`;
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
    let b = node.querySelector('.badge');
    if (!b) {
      b = document.createElement('div');
      b.className = 'badge';
      node.querySelector('.unit-foot').appendChild(b);
    }
    b.textContent = TRIGGERS[trigger] || trigger;
    b.classList.add('lit');
    setTimeout(() => b.classList.remove('lit'), 620);
    if (text) floatText(uid, text.length > 22 ? `${text.slice(0, 21)}…` : text, 'trigger');
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
