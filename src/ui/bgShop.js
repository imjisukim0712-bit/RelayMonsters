// 배경 상점 (기획서 8.4 / 13.4)
// 배경은 시각 요소만 바꾼다. 코인으로 전투력을 구매할 수는 없다.

import { BACKGROUND_LIST, DEFAULT_BACKGROUND } from '../data/backgrounds.js';
import { backgroundSvg } from '../art/backgrounds.js';
import { getMeta, updateMeta, addCoins } from '../storage/save.js';
import { toast, confirmDialog, modal } from './dom.js';

export function renderBgShop(root, { onBack }) {
  function draw() {
    const meta = getMeta();
    const current = BACKGROUND_LIST.find((b) => b.id === meta.selectedBackground);
    root.innerHTML = `
    <div class="scene bgshop-scene">
      <header class="hud">
        <div class="hud-left">
          <button class="btn tiny ghost" data-act="back">← 메뉴</button>
          <h2 class="panel-title">배경 상점</h2>
        </div>
        <div class="hud-right">
          <span class="hud-coins"><b>${meta.coins}</b> 코인</span>
          <span class="hud-band">적용 중: ${current?.name || '풀밭'}</span>
        </div>
      </header>
      <p class="panel-note">배경은 전투 스테이지만 바꾸며 스탯·상점 확률·전투 규칙에 영향을 주지 않습니다. 구매 전 전체 화면 미리보기를 제공합니다.</p>
      <div class="bg-grid">
        ${BACKGROUND_LIST.map((b) => {
      const owned = meta.ownedBackgrounds.includes(b.id) || b.defaultUnlocked;
      const active = meta.selectedBackground === b.id;
      return `<article class="bg-card${active ? ' active' : ''}">
            <div class="bg-preview">${backgroundSvg(b.id)}</div>
            <div class="bg-meta">
              <div class="bg-name">${b.name}${b.id === DEFAULT_BACKGROUND ? '<span class="tag">기본</span>' : ''}</div>
              <div class="bg-desc">${b.desc}</div>
            </div>
            <div class="bg-actions">
              <button class="btn tiny ghost" data-act="preview" data-id="${b.id}">미리보기</button>
              ${active
        ? '<button class="btn tiny" disabled>적용 중</button>'
        : owned
          ? `<button class="btn tiny primary" data-act="apply" data-id="${b.id}">적용</button>`
          : `<button class="btn tiny primary" data-act="buy" data-id="${b.id}">${b.priceCoins} 코인</button>`}
            </div>
          </article>`;
    }).join('')}
      </div>
    </div>`;
  }

  async function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === 'back') { root.removeEventListener('click', onClick); onBack(); return; }

    const bg = BACKGROUND_LIST.find((b) => b.id === btn.dataset.id);
    if (!bg) return;

    if (act === 'preview') {
      modal(`<div class="bg-full">
        <h3>${bg.name}</h3>
        <div class="bg-preview big">${backgroundSvg(bg.id)}</div>
        <p class="bg-desc">${bg.desc}</p>
      </div>`, { wide: true });
    } else if (act === 'apply') {
      updateMeta({ selectedBackground: bg.id });
      toast(`${bg.name} 적용`, 'ok');
      draw();
    } else if (act === 'buy') {
      const meta = getMeta();
      if (meta.coins < bg.priceCoins) { toast('코인이 부족합니다', 'warn'); return; }
      const ok = await confirmDialog(`<b>${bg.name}</b> 을 <b>${bg.priceCoins} 코인</b>으로 구매합니다.`, { okText: '구매' });
      if (!ok) return;
      addCoins(-bg.priceCoins);
      const m2 = getMeta();
      updateMeta({ ownedBackgrounds: [...m2.ownedBackgrounds, bg.id], selectedBackground: bg.id });
      toast(`${bg.name} 구매 및 적용`, 'ok');
      draw();
    }
  }

  root.addEventListener('click', onClick);
  draw();
}
