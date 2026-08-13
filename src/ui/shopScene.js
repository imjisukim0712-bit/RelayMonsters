// 상점 화면 (기획서 13.2)
// 플레이어가 조작하는 구간은 여기뿐이다. 무엇을 사고, 어디에 놓고, 어떤 순서로 돌릴지가 게임의 전부다.

import { TIER_COLORS } from '../data/species.js';
import { itemById } from '../data/items.js';
import { speciesById } from '../data/species.js';
import { unitStand, viewFromRunUnit, detailPanel, sprite, statChips } from './unitView.js';
import { itemSprite } from '../art/items.js';
import { backgroundSvg } from '../art/backgrounds.js';
import { toast, toastLines, modal, confirmDialog, qs, qsa } from './dom.js';
import { lifeIcons } from './battleScene.js';
import {
  buyUnit, sellUnit, mergeInRing, reorderRing, useItem, reroll,
  REROLL_PRICE, MAX_RING, unitSlotsForTier,
} from '../engine/shop.js';
import { sellValue, unitLevel, unitAtk, unitHp } from '../engine/unit.js';
import { roundBandLabel } from '../engine/run.js';
import { saveRun } from '../storage/save.js';

export function renderShop(root, { run, backgroundId = 'bg_grass', onStartBattle, onCodex, onQuit }) {
  let selectedItem = null; // 대상 지정 대기 중인 소모품
  let selectedOfferId = run.shop.units[0]?.oid || null;
  let selectedUnitId = null;
  const formationSlots = [
    { x: .86, y: .57 },
    { x: .66, y: .31 },
    { x: .42, y: .33 },
    { x: .22, y: .60 },
    { x: .42, y: .86 },
    { x: .66, y: .86 },
  ];
  const formationSpot = (rect, index) => ({
    x: rect.width * formationSlots[index % formationSlots.length].x,
    y: rect.height * formationSlots[index % formationSlots.length].y,
  });

  function selectedDetail() {
    const offer = run.shop.units.find((o) => o.oid === selectedOfferId);
    if (offer) {
      const fake = {
        id: 'preview', speciesId: offer.speciesId, exp: offer.exp,
        permBuff: { atk: 0, hp: 0 }, granted: [],
      };
      return detailPanel(fake, {
        extra: `<div class="detail-actions detail-inline-actions">
          <span class="detail-price"><b>${offer.price}</b></span>
          <button class="btn primary" id="detailBuyBtn">구매</button>
        </div>`,
      });
    }
    const unit = run.ring.find((u) => u.id === selectedUnitId) || run.ring[0];
    if (unit) {
      return detailPanel(unit, {
        extra: `<div class="detail-actions detail-inline-actions">
          <span class="detail-owned">링 ${run.ring.indexOf(unit) + 1}번 슬롯</span>
          <button class="btn ghost" id="detailSellBtn">판매 +${sellValue(unit)}</button>
        </div>`,
      });
    }
    return `<div class="detail-empty">
      <span class="detail-empty-icon">✦</span>
      <b>몬스터를 선택하세요</b>
      <small>상점 카드나 링 위의 몬스터를 누르면<br>능력과 성장 정보를 확인할 수 있습니다.</small>
    </div>`;
  }

  function html() {
    const tier = run.shopTier;
    return `
  <div class="scene shop-scene">
    <div class="shop-field-bg">${backgroundSvg(backgroundId)}</div>
    <header class="hud">
      <div class="hud-left">
        <span class="hud-card hud-gold"><i class="hud-coin">◆</i><b>${run.gold}</b></span>
        <span class="hud-card hud-lives">${lifeIcons(run.lives)}</span>
        <span class="hud-card hud-round"><i class="hud-swords">⚔</i><b>${run.round}</b><em>/18</em></span>
      </div>
      <div class="hud-right">
        <span class="hud-band">${roundBandLabel(run.round)}</span>
        <span class="hud-tier" title="상점 티어">T${tier} 상점 · ${unitSlotsForTier(tier)}칸</span>
        <button class="icon-btn codex-button" id="codexBtn" title="몬스터 도감" aria-label="몬스터 도감">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5Q7.5 3.5 12 6v14q-4.5-2.5-9-.5Zm18 0Q16.5 3.5 12 6v14q4.5-2.5 9-.5Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 6v14" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>
        </button>
        <button class="icon-btn utility" id="quitBtn" title="메인 메뉴" aria-label="메인 메뉴">☰</button>
      </div>
    </header>

    <main class="shop-workspace">
      <section class="ring-panel">
        <div class="ring-head">
          <div>
            <span class="eyebrow">RELAY FORMATION</span>
            <h2>내 링 <small>몬스터를 끌어서 등판 순서를 바꾸세요</small></h2>
          </div>
          <div class="ring-head-actions">
            <div class="ring-info">${ringInfo(run)}</div>
          </div>
        </div>
        <div class="ring-stage" id="ringStage">
          <div class="front-hint"><span>1</span><small>첫 등판</small></div>
          ${run.ring.length === 0 ? '<div class="ring-empty">상점의 몬스터를 이곳으로 끌어오세요</div>' : ''}
        </div>
        <div class="ring-order" id="ringOrder">${orderStrip(run)}</div>
      </section>

      <aside class="shop-detail-panel" id="shopDetail">${selectedDetail()}</aside>
    </main>

    <section class="shop-dock">
      <div class="shop-panel">
        <div class="shop-toolbar">
          <div class="shop-title">
            <span class="eyebrow">FIELD MARKET</span>
            <b>몬스터 상점</b>
            <small>몬스터를 선택하거나 링으로 끌어오세요</small>
          </div>
          <button class="btn tiny reroll-btn" id="rerollBtn">↻ 리롤 <b>${REROLL_PRICE}</b></button>
        </div>
        <div class="shop-market-body">
          <div class="shop-units" id="shopUnits">
            ${run.shop.units.map((o, i) => shopUnitCard(o, i)).join('')
          || '<div class="sold-out">모두 판매되었습니다 — 리롤하거나 웨이브를 진행하세요</div>'}
          </div>
          <div class="shop-side">
            <div class="shop-items" id="shopItems">
              ${run.shop.items.map((o) => shopItemCard(o)).join('') || '<div class="sold-out small">소모품 매진</div>'}
            </div>
            <div class="sell-zone" data-drop="sell" id="sellZone">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              <span>판매</span><small>몬스터를 끌어놓기</small>
            </div>
          </div>
        </div>
      </div>
      <div class="shop-actions">
        <button class="btn action-buy" id="buySelectedBtn" ${run.shop.units.some((o) => o.oid === selectedOfferId) ? '' : 'disabled'}>
          <span>구매</span><small>선택한 몬스터</small>
        </button>
        <button class="btn action-wave" id="startBtn">
          <span>웨이브 진행</span><small>R${run.round} 전투 시작</small>
        </button>
      </div>
    </section>
  </div>`;
  }

  function ringInfo(r) {
    const n = r.ring.length;
    if (!n) return '<span class="dim">링 0칸</span>';
    const styles = { 2: '고위험 폭발형', 3: '콤보 특화', 4: '범용', 5: '지구력형', 6: '인접 연계·광역 특화' };
    return `<span><b>링 ${n}칸</b> · 에이스 등판 주기 ${n}턴 · 30턴 내 ${Math.floor(30 / n)}회</span>
      <span class="tag">${styles[n] || ''}</span>`;
  }

  function orderStrip(r) {
    if (!r.ring.length) return '';
    return r.ring.map((u, i) => {
      const sp = speciesById(u.speciesId);
      return `<div class="order-chip" data-id="${u.id}" style="--tier:${TIER_COLORS[sp.tier]}">
        <button class="mv" data-mv="-1" data-id="${u.id}" aria-label="앞으로">◀</button>
        <span class="num">${i + 1}</span>
        <span class="nm">${sp.name}</span>
        <button class="mv" data-mv="1" data-id="${u.id}" aria-label="뒤로">▶</button>
      </div>`;
    }).join('');
  }

  function shopUnitCard(offer, index = 0) {
    const sp = speciesById(offer.speciesId);
    const atk = sp.atk + offer.exp;
    const hp = sp.hp + offer.exp;
    return `<div class="pedestal draggable${offer.oid === selectedOfferId ? ' selected' : ''}" data-drag="shop" data-oid="${offer.oid}" data-species="${sp.id}" style="--tier:${TIER_COLORS[sp.tier]};--idle-delay:${(-index * .37).toFixed(2)}s">
      <div class="ped-disc"></div>
      <div class="ped-unit">${sprite(sp.art)}</div>
      <div class="ped-meta">
        ${statChips({ atk, hp })}
        <div class="ped-name">${sp.name}</div>
        <div class="ped-price"><b>${offer.price}</b></div>
      </div>
    </div>`;
  }

  function shopItemCard(offer) {
    const it = itemById(offer.itemId);
    return `<div class="item-card" data-oid="${offer.oid}" data-kind="${it.kind}">
      <div class="item-art">${itemSprite(it.art)}</div>
      <div class="item-meta">
        <div class="item-name">${it.name}<span class="item-price">${offer.price}</span></div>
        <div class="item-desc">${it.desc}</div>
      </div>
    </div>`;
  }

  // ── 링 배치 ─────────────────────────────────────────────────────
  let ringFootH = 0; // 실측한 발밑 정보(스탯칩·이름) 높이
  let ringSettled = false; // 실측값으로 재배치를 마쳤는지
  function layoutRing() {
    const stage = qs('#ringStage', root);
    if (!stage) return;
    stage.querySelectorAll('.ring-unit').forEach((n) => n.remove());
    const rect = stage.getBoundingClientRect();
    const n = run.ring.length;
    if (!n) return;
    const maxUw = Math.min(184, Math.max(76, rect.width * .14));
    // 유닛 한 기가 차지하는 세로 길이는 (그림 = 유닛 폭) + (발밑 스탯·이름) 이다.
    // 발밑 정보 높이는 폭과 거의 무관하므로 실측값을 재사용한다 (첫 배치는 추정값).
    const foot = ringFootH || 74;

    // 보유 수가 적어도 스케치의 6개 기준 슬롯 좌표는 변하지 않는다.
    // 다만 무대가 낮으면 아래줄 유닛의 발밑 정보가 잘리므로, 위치를 강제로
    // 끌어올리는 대신 편성 전체를 세로로 눌러 담아 서로 가리지 않게 한다.
    const fracs = run.ring.map((_, i) => formationSlots[i % formationSlots.length]);
    function spotsFor(uw) {
      const ys = fracs.map((f) => f.y * rect.height);
      const lo = Math.min(...ys);
      const hi = Math.max(...ys);
      const top = uw; // 그림 위쪽이 무대 안에 들어오는 최소 y
      const bot = rect.height - foot; // 발밑 정보가 무대 안에 들어오는 최대 y
      const room = Math.max(0, bot - top);
      const scale = hi - lo > room && hi > lo ? room / (hi - lo) : 1;
      let offset = 0;
      if (lo * scale + offset < top) offset = top - lo * scale;
      if (hi * scale + offset > bot) offset = bot - hi * scale;
      return fracs.map((f) => ({
        x: rect.width * f.x,
        y: f.y * rect.height * scale + offset,
      }));
    }

    // 폭이 커질수록 배치 여유가 줄어드는 상호 의존이라 몇 번 반복해 수렴시킨다.
    let uw = Math.min(maxUw, Math.max(52, rect.height - foot));
    for (let pass = 0; pass < 5; pass++) {
      const s = spotsFor(uw);
      let next = maxUw;
      for (let i = 0; i < s.length; i++) {
        for (let j = i + 1; j < s.length; j++) {
          const adx = Math.abs(s[i].x - s[j].x);
          const ady = Math.abs(s[i].y - s[j].y);
          // 두 기가 안 겹치려면 가로로 충분히 벌어지거나(adx ≥ 폭),
          // 세로로 그림+발밑 높이만큼 벌어져야 한다(ady ≥ 폭 + 발밑).
          next = Math.min(next, Math.max(adx, ady - foot));
        }
      }
      next = Math.max(52, Math.floor(Math.min(next, rect.height - foot)));
      if (next === uw) break;
      uw = next;
    }
    uw *= 0.85; // 필드 유닛 크기 15% 축소
    const spots = spotsFor(uw);
    const compact = uw < 86;

    run.ring.forEach((u, i) => {
      // 1번 슬롯을 오른쪽(전선)에 두고 등판 순서를 반시계로 배치한다.
      const { x, y } = spots[i];
      const view = viewFromRunUnit(u);
      const wrap = document.createElement('div');
      wrap.innerHTML = unitStand(view, {
        showName: !compact, slotLabel: i + 1, id: u.id, front: i === 0,
        selected: u.id === selectedUnitId, className: 'draggable', flip: false,
        showLevel: false, showLevelBadge: true,
      });
      const node = wrap.firstElementChild;
      node.classList.add('ring-unit');
      node.classList.toggle('tiny-unit', compact);
      node.style.setProperty('--unit-w', `${Math.round(uw)}px`);
      node.style.setProperty('--idle-delay', `${(-i * .41).toFixed(2)}s`);
      node.dataset.drag = 'ring';
      node.dataset.drop = 'unit';
      node.dataset.index = i;
      stage.appendChild(node);
      // 발밑을 링 좌표에 맞추되, 무대 밖으로 나가면 안쪽으로 당긴다
      const bodyH = node.querySelector('.unit-body')?.offsetHeight || node.offsetHeight * 0.66;
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const left = Math.max(0, Math.min(x - w / 2, rect.width - w));
      const top = Math.min(Math.max(0, Math.min(y - bodyH, rect.height - h)) + 25, rect.height - h);
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
      // 위쪽 유닛이 아래쪽 유닛에 가리지 않도록 y 순서로 쌓는다
      node.style.zIndex = String(10 + Math.round(y));
    });

    // 다음 배치를 위해 실제 발밑 정보 높이를 기억한다 (전체 높이 − 그림 높이)
    const probe = stage.querySelector('.ring-unit');
    const probeBody = probe?.querySelector('.unit-body');
    if (probe && probeBody) {
      const measured = probe.offsetHeight - probeBody.offsetHeight;
      if (measured > 0 && Math.abs(measured - ringFootH) > 1) {
        ringFootH = measured;
        // 추정값으로 배치했다면 실측값으로 한 번 더 정확히 배치한다
        if (!ringSettled) { ringSettled = true; layoutRing(); }
      }
    }
    ringSettled = true;
  }

  // 상점 진열 — 제안 수가 3~5로 변하므로 칸 너비를 실제 컨테이너에서 역산한다.
  // 고정 폭이면 5칸일 때 마지막 몬스터가 잘려서 아예 보이지 않는다.
  function layoutShopUnits() {
    const wrap = qs('#shopUnits', root);
    if (!wrap) return;
    const peds = [...wrap.querySelectorAll('.pedestal')];
    if (!peds.length) return;
    const cs = getComputedStyle(wrap);
    const gap = parseFloat(cs.columnGap || cs.gap) || 0;
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    // 소수점 gap·테두리가 반올림되며 마지막 칸이 잘리는 것을 막기 위해 여유를 둔다
    const avail = wrap.clientWidth - padX - Math.ceil(gap) * (peds.length - 1) - 6;
    if (avail <= 0) return;
    // 가로 스크롤이 가능한 좁은 화면에서는 억지로 줄이지 않고 스크롤에 맡긴다.
    const scrolls = /auto|scroll/.test(cs.overflowX);
    const fit = avail / peds.length;
    // 세로로도 잘리지 않도록 높이에서 나오는 상한을 함께 건다 (스탠드 = 그림 + 발밑 정보)
    const byHeight = wrap.clientHeight > 0 ? (wrap.clientHeight - 46) / 1.12 : Infinity;
    const uw = Math.max(56, Math.floor(Math.min(scrolls ? Math.max(fit, 108) : fit, 176, byHeight)));
    const compact = uw < 104;
    peds.forEach((p) => {
      p.style.width = `${uw}px`;
      p.style.minWidth = `${uw}px`;
      p.style.setProperty('--unit-w-shop', `${uw}px`);
      p.classList.toggle('tiny-ped', compact);
    });
  }

  function rerender() {
    root.innerHTML = html();
    bind();
    ringSettled = false;
    layoutRing();
    layoutShopUnits();
    // 첫 배치에서 측정한 실제 유닛 크기로 한 번 더 정확히 배치한다
    requestAnimationFrame(() => { layoutRing(); layoutShopUnits(); });
    saveRun(run);
  }

  // ── 드래그 ──────────────────────────────────────────────────────
  function setupDrag() {
    let drag = null;
    let longTimer = null;

    const clearHighlights = () => qsa('.drop-hot', root).forEach((n) => n.classList.remove('drop-hot'));

    function targetAt(x, y) {
      const stack = document.elementsFromPoint(x, y);
      for (const n of stack) {
        if (n.classList?.contains('drag-ghost')) continue;
        const t = n.closest?.('[data-drop]');
        if (t) return t;
        if (n.id === 'ringStage') return n;
      }
      return null;
    }

    function onDown(e) {
      // 마우스 우클릭/보조 버튼은 contextmenu 핸들러가 처리한다 (상세 패널 중복 방지)
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const handle = e.target.closest('.draggable');
      if (!handle) return;
      if (e.target.closest('.mv')) return;
      const start = { x: e.clientX, y: e.clientY };
      drag = { handle, start, moved: false, ghost: null, pid: e.pointerId };
      handle.setPointerCapture?.(e.pointerId);

      longTimer = setTimeout(() => {
        if (drag && !drag.moved) {
          openDetail(handle);
          cancelDrag();
        }
      }, 460);
    }

    function onMove(e) {
      if (!drag) return;
      const dx = e.clientX - drag.start.x;
      const dy = e.clientY - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < 7) return;
      if (!drag.moved) {
        drag.moved = true;
        clearTimeout(longTimer);
        const ghost = drag.handle.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.width = `${drag.handle.offsetWidth}px`;
        document.body.appendChild(ghost);
        drag.ghost = ghost;
        drag.handle.classList.add('dragging');
      }
      drag.ghost.style.left = `${e.clientX}px`;
      drag.ghost.style.top = `${e.clientY}px`;
      clearHighlights();
      const t = targetAt(e.clientX, e.clientY);
      if (t && t !== drag.handle) t.classList.add('drop-hot');
    }

    function onUp(e) {
      if (!drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) { cancelDrag(); return; }
      clearTimeout(longTimer);
      const wasMoved = drag.moved;
      const handle = drag.handle;
      if (drag.ghost) drag.ghost.remove();
      handle.classList.remove('dragging');
      clearHighlights();
      const target = wasMoved ? targetAt(e.clientX, e.clientY) : null;
      drag = null;

      if (!wasMoved) {
        onTap(handle);
        return;
      }
      resolveDrop(handle, target, e);
    }

    function cancelDrag() {
      if (!drag) return;
      if (drag.ghost) drag.ghost.remove();
      drag.handle.classList.remove('dragging');
      clearHighlights();
      drag = null;
    }

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', cancelDrag);
    root.addEventListener('contextmenu', (e) => {
      const h = e.target.closest('.draggable');
      if (h) { e.preventDefault(); openDetail(h); }
    });
  }

  function resolveDrop(handle, target, e) {
    const kind = handle.dataset.drag;
    const dropKind = target?.dataset.drop || (target?.id === 'ringStage' ? 'ring' : null);

    if (kind === 'shop') {
      const oid = handle.dataset.oid;
      if (dropKind === 'unit') {
        const r = buyUnit(run, oid, target.dataset.id);
        report(r);
      } else if (dropKind === 'ring' || target?.id === 'ringStage' || target?.closest?.('.ring-panel')) {
        const r = buyUnit(run, oid);
        report(r);
      } else {
        return; // 링 밖에 놓으면 취소
      }
      rerender();
      return;
    }

    if (kind === 'ring') {
      const id = handle.dataset.id;
      if (dropKind === 'sell') {
        doSell(id);
        return;
      }
      if (dropKind === 'unit' && target.dataset.id !== id) {
        const source = run.ring.find((u) => u.id === id);
        const dest = run.ring.find((u) => u.id === target.dataset.id);
        if (source && dest && source.speciesId === dest.speciesId) {
          report(mergeInRing(run, id, target.dataset.id));
        } else {
          // 다른 종이면 순서 이동
          report(reorderRing(run, id, run.ring.indexOf(dest)));
        }
        rerender();
        return;
      }
      if (dropKind === 'ring' || target?.id === 'ringStage') {
        // 스케치의 고정 6슬롯 중 현재 보유 슬롯과 가장 가까운 위치로 순서를 계산한다.
        const stage = qs('#ringStage', root);
        const rect = stage.getBoundingClientRect();
        const local = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        let idx = 0;
        let nearest = Infinity;
        run.ring.forEach((_, i) => {
          const spot = formationSpot(rect, i);
          const dist = Math.hypot(local.x - spot.x, local.y - spot.y);
          if (dist < nearest) { nearest = dist; idx = i; }
        });
        report(reorderRing(run, id, idx));
        rerender();
      }
    }
  }

  function report(r) {
    if (!r) return;
    if (r.ok === false) toast(r.msg || '할 수 없습니다', 'warn');
    else if (r.msg) toast(r.msg, 'ok');
    if (r.lines?.length) toastLines(r.lines.slice(0, 4), 'info');
  }

  async function doSell(id) {
    const u = run.ring.find((x) => x.id === id);
    if (!u) return;
    const sp = speciesById(u.speciesId);
    const ok = await confirmDialog(
      `<b>${sp.name}</b> (Lv${unitLevel(u)} · ${unitAtk(u)}/${unitHp(u)}) 을 판매합니다.<br>환급 <b>${sellValue(u)}</b>`,
      { okText: '판매' },
    );
    if (!ok) { rerender(); return; }
    report(sellUnit(run, id));
    rerender();
  }

  function onTap(handle) {
    // 소모품 대상 지정 중이면 링 유닛 탭이 사용으로 이어진다
    if (selectedItem && handle.dataset.drag === 'ring') {
      applyItem(selectedItem, handle.dataset.id);
      return;
    }
    if (handle.dataset.drag === 'shop') {
      selectedOfferId = handle.dataset.oid;
      selectedUnitId = null;
      rerender();
      return;
    }
    selectedUnitId = handle.dataset.id;
    selectedOfferId = null;
    rerender();
  }

  function openDetail(handle) {
    if (handle.dataset.drag === 'shop') {
      const offer = run.shop.units.find((o) => o.oid === handle.dataset.oid);
      if (!offer) return;
      const fake = { id: 'preview', speciesId: offer.speciesId, exp: offer.exp, permBuff: { atk: 0, hp: 0 }, granted: [] };
      modal(detailPanel(fake, {
        extra: `<div class="detail-actions"><button class="btn primary" id="buyNow">${offer.price} 구매</button></div>`,
      })).box.addEventListener('click', (e) => {
        if (e.target.id === 'buyNow') {
          report(buyUnit(run, offer.oid));
          qs('.modal-back')?.remove();
          rerender();
        }
      });
      return;
    }
    const u = run.ring.find((x) => x.id === handle.dataset.id);
    if (!u) return;
    const m = modal(detailPanel(u, {
      extra: `<div class="detail-actions">
        <button class="btn ghost" id="sellNow">판매 +${sellValue(u)}</button>
      </div>`,
    }));
    m.box.addEventListener('click', (e) => {
      if (e.target.id === 'sellNow') { m.close(); doSell(u.id); }
    });
  }

  function applyItem(oid, targetId) {
    const r = useItem(run, oid, targetId);
    selectedItem = null;
    report(r);
    rerender();
  }

  async function onItemClick(oid) {
    const offer = run.shop.items.find((o) => o.oid === oid);
    if (!offer) return;
    const it = itemById(offer.itemId);
    if (run.gold < offer.price) { toast('골드가 부족합니다', 'warn'); return; }

    if (it.kind === 'run') {
      if (it.oncePerGame) {
        const ok = await confirmDialog(`<b>${it.name}</b> · ${it.desc}<br>게임당 1회만 구매할 수 있습니다.`, { okText: `${offer.price} 사용` });
        if (!ok) return;
      }
      applyItem(oid, null);
      return;
    }
    if (!run.ring.length) { toast('대상이 될 유닛이 없습니다', 'warn'); return; }
    selectedItem = selectedItem === oid ? null : oid;
    qsa('.item-card', root).forEach((n) => n.classList.toggle('picked', n.dataset.oid === selectedItem));
    toast(selectedItem ? `${it.name} — 대상 유닛을 선택하세요` : '선택 해제', 'info');
  }

  function bind() {
    qs('#rerollBtn', root)?.addEventListener('click', () => {
      report(reroll(run));
      selectedOfferId = run.shop.units[0]?.oid || null;
      selectedUnitId = null;
      rerender();
    });
    const buySelected = () => {
      const offer = run.shop.units.find((o) => o.oid === selectedOfferId);
      if (!offer) { toast('구매할 몬스터를 먼저 선택하세요', 'info'); return; }
      report(buyUnit(run, offer.oid));
      selectedOfferId = run.shop.units[0]?.oid || null;
      selectedUnitId = null;
      rerender();
    };
    qs('#buySelectedBtn', root)?.addEventListener('click', buySelected);
    qs('#detailBuyBtn', root)?.addEventListener('click', buySelected);
    qs('#detailSellBtn', root)?.addEventListener('click', () => {
      const unit = run.ring.find((u) => u.id === selectedUnitId) || run.ring[0];
      if (unit) doSell(unit.id);
    });
    qs('#startBtn', root)?.addEventListener('click', async () => {
      if (!run.ring.length) { toast('링에 유닛이 최소 1마리 필요합니다', 'warn'); return; }
      onStartBattle();
    });
    qs('#quitBtn', root)?.addEventListener('click', () => onQuit && onQuit());
    qs('#codexBtn', root)?.addEventListener('click', () => onCodex && onCodex());
    qsa('.item-card', root).forEach((n) => n.addEventListener('click', () => onItemClick(n.dataset.oid)));
    qs('#ringOrder', root)?.addEventListener('click', (e) => {
      const b = e.target.closest('.mv');
      if (!b) return;
      const id = b.dataset.id;
      const dir = Number(b.dataset.mv);
      const i = run.ring.findIndex((u) => u.id === id);
      if (i < 0) return;
      const to = ((i + dir) % run.ring.length + run.ring.length) % run.ring.length;
      reorderRing(run, id, to);
      rerender();
    });
  }

  const onResize = () => { ringSettled = false; layoutRing(); layoutShopUnits(); };
  window.addEventListener('resize', onResize);

  rerender();
  setupDrag();

  return {
    destroy() { window.removeEventListener('resize', onResize); },
    refresh: rerender,
  };
}

export { MAX_RING };
