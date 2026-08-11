// 상점 화면 (기획서 13.2)
// 플레이어가 조작하는 구간은 여기뿐이다. 무엇을 사고, 어디에 놓고, 어떤 순서로 돌릴지가 게임의 전부다.

import { TIER_COLORS } from '../data/species.js';
import { itemById } from '../data/items.js';
import { speciesById } from '../data/species.js';
import { unitStand, viewFromRunUnit, detailPanel, sprite, statChips } from './unitView.js';
import { itemSprite } from '../art/items.js';
import { toast, toastLines, modal, confirmDialog, qs, qsa } from './dom.js';
import { lifeIcons } from './battleScene.js';
import {
  buyUnit, sellUnit, mergeInRing, reorderRing, useItem, reroll,
  REROLL_PRICE, MAX_RING, unitSlotsForTier,
} from '../engine/shop.js';
import { sellValue, unitLevel, unitAtk, unitHp } from '../engine/unit.js';
import { roundBandLabel } from '../engine/run.js';
import { saveRun } from '../storage/save.js';

export function renderShop(root, { run, onStartBattle, onQuit }) {
  let selectedItem = null; // 대상 지정 대기 중인 소모품
  let selectedOfferId = run.shop.units[0]?.oid || null;
  let selectedUnitId = null;

  function selectedDetail() {
    const offer = run.shop.units.find((o) => o.oid === selectedOfferId);
    if (offer) {
      const fake = {
        id: 'preview', speciesId: offer.speciesId, exp: offer.exp,
        permBuff: { atk: 0, hp: 0 }, granted: [],
      };
      return detailPanel(fake, {
        extra: `<div class="detail-actions detail-inline-actions">
          <span class="detail-price"><b>${offer.price}</b>G</span>
          <button class="btn primary" id="detailBuyBtn">구매</button>
        </div>`,
      });
    }
    const unit = run.ring.find((u) => u.id === selectedUnitId) || run.ring[0];
    if (unit) {
      return detailPanel(unit, {
        extra: `<div class="detail-actions detail-inline-actions">
          <span class="detail-owned">링 ${run.ring.indexOf(unit) + 1}번 슬롯</span>
          <button class="btn ghost" id="detailSellBtn">판매 +${sellValue(unit)}G</button>
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
    <header class="hud">
      <div class="hud-left">
        <span class="hud-card hud-gold"><i class="hud-coin">◆</i><b>${run.gold}</b></span>
        <span class="hud-card hud-lives">${lifeIcons(run.lives)}</span>
        <span class="hud-card hud-round"><i class="hud-swords">⚔</i><b>${run.round}</b><em>/18</em></span>
      </div>
      <div class="hud-right">
        <span class="hud-band">${roundBandLabel(run.round)}</span>
        <span class="hud-tier" title="상점 티어">T${tier} 상점 · ${unitSlotsForTier(tier)}칸</span>
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
            <button class="btn tiny reroll-btn" id="rerollBtn">↻ 리롤 <b>${REROLL_PRICE}G</b></button>
          </div>
        </div>
        <div class="ring-stage" id="ringStage">
          <div class="ring-map-decor" aria-hidden="true"></div>
          <div class="ring-track"></div>
          <div class="front-hint"><span>1</span><small>첫 등판</small></div>
          ${run.ring.length === 0 ? '<div class="ring-empty">상점의 몬스터를 이곳으로 끌어오세요</div>' : ''}
        </div>
        <div class="ring-order" id="ringOrder">${orderStrip(run)}</div>
      </section>

      <aside class="shop-detail-panel" id="shopDetail">${selectedDetail()}</aside>
    </main>

    <section class="shop-dock">
      <div class="shop-panel">
        <div class="shop-units" id="shopUnits">
          ${run.shop.units.map((o) => shopUnitCard(o)).join('')
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

  function shopUnitCard(offer) {
    const sp = speciesById(offer.speciesId);
    const atk = sp.atk + offer.exp;
    const hp = sp.hp + offer.exp;
    return `<div class="pedestal draggable${offer.oid === selectedOfferId ? ' selected' : ''}" data-drag="shop" data-oid="${offer.oid}" data-species="${sp.id}" style="--tier:${TIER_COLORS[sp.tier]}">
      <div class="ped-disc"></div>
      <div class="ped-unit">${sprite(sp.art)}</div>
      <div class="ped-meta">
        <div class="ped-name">${sp.name} <span class="tier-tag">T${sp.tier}</span></div>
        ${statChips({ atk, hp })}
        <div class="ped-price"><b>${offer.price}</b>G</div>
      </div>
    </div>`;
  }

  function shopItemCard(offer) {
    const it = itemById(offer.itemId);
    return `<div class="item-card" data-oid="${offer.oid}" data-kind="${it.kind}">
      <div class="item-art">${itemSprite(it.art)}</div>
      <div class="item-meta">
        <div class="item-name">${it.name}<span class="item-price">${offer.price}G</span></div>
        <div class="item-desc">${it.desc}</div>
      </div>
    </div>`;
  }

  // ── 링 배치 ─────────────────────────────────────────────────────
  function layoutRing() {
    const stage = qs('#ringStage', root);
    if (!stage) return;
    stage.querySelectorAll('.ring-unit').forEach((n) => n.remove());
    const rect = stage.getBoundingClientRect();
    const n = run.ring.length;
    if (!n) return;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const maxUw = Math.min(112, Math.max(64, rect.width / 4.2));
    const spread = n <= 2 ? 0.5 : n === 3 ? 0.78 : 1;
    const rx = Math.max(maxUw * 1.1, Math.min(rect.width / 2 - maxUw * 0.75, 330) * spread);
    const ry = Math.max(52, Math.min((rect.height - maxUw * 1.5) / 2, 120));

    // 슬롯 좌표를 먼저 구하고, 가장 가까운 두 슬롯 간격에서 유닛 표시 크기를 역산한다.
    const at = (i) => {
      const a = ((-i * 360) / n) * (Math.PI / 180);
      return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
    };
    const spots = run.ring.map((_, i) => at(i));
    let minDist = Infinity;
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        minDist = Math.min(minDist, Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y));
      }
    }
    const uw = Math.max(58, Math.min(maxUw, Number.isFinite(minDist) ? minDist * 0.92 : maxUw));
    const compact = uw < 86;

    run.ring.forEach((u, i) => {
      // 1번 슬롯을 오른쪽(전선)에 두고 등판 순서를 반시계로 배치한다.
      const { x, y } = spots[i];
      const view = viewFromRunUnit(u);
      const wrap = document.createElement('div');
      wrap.innerHTML = unitStand(view, {
        showName: !compact, slotLabel: i + 1, id: u.id, front: i === 0,
        selected: u.id === selectedUnitId, className: 'draggable', flip: false,
      });
      const node = wrap.firstElementChild;
      node.classList.add('ring-unit');
      node.classList.toggle('tiny-unit', compact);
      node.style.setProperty('--unit-w', `${Math.round(uw)}px`);
      node.dataset.drag = 'ring';
      node.dataset.drop = 'unit';
      node.dataset.index = i;
      stage.appendChild(node);
      // 발밑을 링 좌표에 맞춘다
      const bodyH = node.querySelector('.unit-body')?.offsetHeight || node.offsetHeight * 0.66;
      node.style.left = `${x - node.offsetWidth / 2}px`;
      node.style.top = `${y - bodyH}px`;
      // 위쪽 유닛이 아래쪽 유닛에 가리지 않도록 y 순서로 쌓는다
      node.style.zIndex = String(10 + Math.round(y));
    });
  }

  function rerender() {
    root.innerHTML = html();
    bind();
    layoutRing();
    // 첫 배치에서 측정한 실제 유닛 크기로 한 번 더 정확히 배치한다
    requestAnimationFrame(layoutRing);
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
        // 링 위 각도로 새 순서 계산
        const stage = qs('#ringStage', root);
        const rect = stage.getBoundingClientRect();
        const ang = Math.atan2(
          (e.clientY - (rect.top + rect.height / 2)) / 0.86,
          e.clientX - (rect.left + rect.width / 2),
        );
        const n = Math.max(1, run.ring.length);
        let idx = Math.round((-ang * 180) / Math.PI / (360 / n));
        idx = ((idx % n) + n) % n;
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
      `<b>${sp.name}</b> (Lv${unitLevel(u)} · ${unitAtk(u)}/${unitHp(u)}) 을 판매합니다.<br>환급 <b>${sellValue(u)}G</b>`,
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
        extra: `<div class="detail-actions"><button class="btn primary" id="buyNow">${offer.price}G 구매</button></div>`,
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
        <button class="btn ghost" id="sellNow">판매 +${sellValue(u)}G</button>
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
        const ok = await confirmDialog(`<b>${it.name}</b> · ${it.desc}<br>게임당 1회만 구매할 수 있습니다.`, { okText: `${offer.price}G 사용` });
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

  const onResize = () => layoutRing();
  window.addEventListener('resize', onResize);

  rerender();
  setupDrag();

  return {
    destroy() { window.removeEventListener('resize', onResize); },
    refresh: rerender,
  };
}

export { MAX_RING };
