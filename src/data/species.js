// 몬스터 로스터 60종 (기획서 10장)
// ATK/HP는 기본 스탯(누적 경험치 0 기준). 능력은 Lv1 / Lv3 / Lv5.
//
// 능력 데이터 형식
//   { trigger, oncePerTurn?, oncePerRotation?, oncePerBattle?, levels: { 1: eff, 3: eff, 5: eff } }
// 효과(eff) 형식
//   { op, target, ...params }  또는  { op: 'multi', effects: [eff, ...] }

export const TRIGGERS = {
  ON_BATTLE_START: '전투 시작',
  ON_ATTACK: '공격',
  ON_BEFORE_ATTACK: '공격 전',
  ON_AFTER_ATTACK: '공격 후',
  ON_DAMAGED: '피해받음',
  ON_DEATH: '사망',
  ON_ALLY_DEATH: '아군 사망',
  ON_KILL: '처치',
  ON_ROTATE: '회전',
  ON_LAP: '한 바퀴',
  ON_SELL: '판매',
  ON_ITEM_USE: '아이템 사용',
  ON_ALLY_SUMMON: '아군 소환',
  ON_ENEMY_SUMMON: '적 소환',
};

export const TIER_COLORS = {
  1: '#8CC63F',
  2: '#4FC3F7',
  3: '#FF9F43',
  4: '#A66DD4',
  5: '#EF476F',
  6: '#FFC93C',
};

export const TIER_NAMES = {
  1: '작고 소란한 것들',
  2: '무리 짓는 것들',
  3: '한 몫 하는 것들',
  4: '강자',
  5: '전설',
  6: '신화',
};

export const TIER_BUDGET = { 1: 10, 2: 15, 3: 20, 4: 25, 5: 32, 6: 40 };

// ── 능력 정의 헬퍼 ────────────────────────────────────────────────
function A(trigger, base, variants, opts = {}) {
  return {
    trigger,
    ...opts,
    levels: {
      1: { ...base, ...variants[0] },
      3: { ...base, ...variants[1] },
      5: { ...base, ...variants[2] },
    },
  };
}
const amt = (a, b, c) => [{ amount: a }, { amount: b }, { amount: c }];
const atkUp = (a, b, c) => [{ atk: a }, { atk: b }, { atk: c }];
const hpUp = (a, b, c) => [{ hp: a }, { hp: b }, { hp: c }];
const pct = (a, b, c) => [{ pct: a }, { pct: b }, { pct: c }];
const gainManaAmt = (a, b, c) => [{ op: 'gainMana', amount: a }, { op: 'gainMana', amount: b }, { op: 'gainMana', amount: c }];

// 마나 유닛 능력: 한 트리거에서 마나를 얻고, 같은 이벤트 안에서 마나 조건을 즉시 확인한다 (5.4절).
// levelsSpec 은 { 1: {gain, threshold, then}, 3: {...}, 5: {...} } 형태.
function manaGate(trigger, levelsSpec) {
  return {
    trigger,
    levels: {
      1: { op: 'manaGate', ...levelsSpec[1] },
      3: { op: 'manaGate', ...levelsSpec[3] },
      5: { op: 'manaGate', ...levelsSpec[5] },
    },
  };
}

// ── 로스터 ────────────────────────────────────────────────────────
export const SPECIES_LIST = [
  // ═══ 티어 1 — 작은 시작 (예산 10) ═══
  {
    id: 'T1-01', name: '버섯', tier: 1, atk: 2, hp: 5, art: 'mushroom',
    silhouette: '둥근 갓 + 통통한 두 다리',
    ability: A('ON_DEATH', { op: 'buff', target: 'randomAlly' }, hpUp(2, 3, 4)),
  },
  {
    id: 'T1-02', name: '멧돼지', tier: 1, atk: 3, hp: 4, art: 'boar',
    silhouette: '네 다리 + 위로 솟은 엄니',
    ability: A('ON_ATTACK', { op: 'buff', target: 'self' }, atkUp(1, 2, 3)),
  },
  {
    id: 'T1-03', name: '꽃사슴', tier: 1, atk: 3, hp: 4, art: 'deer',
    silhouette: '가지뿔 + 가느다란 네 다리',
    ability: A('ON_SELL', { op: 'permBuff', target: 'randomAlly' }, atkUp(1, 2, 3)),
  },
  {
    id: 'T1-04', name: '좀비', tier: 1, atk: 2, hp: 6, art: 'zombie',
    silhouette: '앞으로 뻗은 두 팔 + 썩은 살',
    ability: A('ON_SELL', { op: 'permBuff', target: 'randomAlly' }, hpUp(2, 4, 6)),
  },
  {
    id: 'T1-05', name: '슬라임', tier: 1, atk: 2, hp: 5, art: 'slime',
    silhouette: '흘러내리는 액체 몸 + 짧은 유사 다리',
    ability: A('ON_DEATH', { op: 'summon', name: '미니 슬라임', art: 'slimeMini' },
      [{ atk: 1, hp: 1 }, { atk: 2, hp: 2 }, { atk: 3, hp: 3 }]),
  },
  {
    id: 'T1-06', name: '박쥐', tier: 1, atk: 2, hp: 5, art: 'bat',
    silhouette: '넓은 막날개 + 작은 두 발',
    ability: A('ON_ATTACK', { op: 'buff', target: 'self' }, hpUp(1, 2, 3)),
  },
  {
    id: 'T1-07', name: '해골', tier: 1, atk: 4, hp: 2, art: 'skeleton',
    silhouette: '드러난 갈비뼈 + 뼈다리',
    ability: A('ON_BATTLE_START', { op: 'damage', target: 'randomEnemy' }, amt(2, 3, 4)),
  },
  {
    id: 'T1-08', name: '고블린', tier: 1, atk: 2, hp: 4, art: 'goblin',
    silhouette: '축 늘어진 긴 귀 + 이 빠진 단검',
    ability: A('ON_ROTATE', { op: 'heal', target: 'self' }, amt(2, 3, 4)),
  },
  {
    id: 'T1-09', name: '코볼트', tier: 1, atk: 3, hp: 4, art: 'kobold',
    silhouette: '개 주둥이 + 몸보다 긴 창',
    ability: A('ON_ITEM_USE', { op: 'permBuff', target: 'self' }, atkUp(1, 2, 3)),
  },
  {
    id: 'T1-10', name: '임프', tier: 1, atk: 4, hp: 2, art: 'imp',
    silhouette: '뿔 + 박쥐 날개 + 화살촉 꼬리',
    ability: A('ON_AFTER_ATTACK', { op: 'damage', target: 'randomEnemy' }, amt(1, 2, 3)),
  },

  // ═══ 티어 2 — 무리 짓는 것들 (예산 15) ═══
  {
    id: 'T2-01', name: '만드라고라', tier: 2, atk: 5, hp: 5, art: 'mandrake',
    silhouette: '뿌리 다리 + 머리의 잎사귀',
    ability: A('ON_DEATH', { op: 'debuffAtk', target: 'allEnemy' }, amt(1, 2, 3)),
  },
  {
    id: 'T2-02', name: '오크', tier: 2, atk: 6, hp: 3, art: 'orc',
    silhouette: '머리 두 배 어깨 폭 + 아래엄니',
    ability: A('ON_KILL', { op: 'buff', target: 'allAlly' }, atkUp(1, 2, 3)),
  },
  {
    id: 'T2-03', name: '미라', tier: 2, atk: 3, hp: 9, art: 'mummy', manaUnit: true,
    silhouette: '붕대로 감긴 몸 + 가슴의 부적',
    abilities: [
      A('ON_DAMAGED', {}, gainManaAmt(1, 2, 2)),
      {
        trigger: 'ON_DEATH',
        levels: {
          1: { op: 'manaValueDamage', target: 'killedBy', mode: 'value' },
          3: { op: 'manaValueDamage', target: 'killedBy', mode: 'plus', bonus: 2 },
          5: { op: 'manaValueDamage', target: 'killedBy', mode: 'double' },
        },
      },
    ],
  },
  {
    id: 'T2-04', name: '고슴도치', tier: 2, atk: 4, hp: 7, art: 'hedgehog',
    silhouette: '등의 가시 능선 + 짧은 네 다리',
    ability: A('ON_DAMAGED', { op: 'damage', target: 'attacker', reactive: true }, amt(2, 3, 4)),
  },
  {
    id: 'T2-05', name: '유령', tier: 2, atk: 3, hp: 9, art: 'ghost',
    silhouette: '반투명 몸 + 흩어지는 하단 자락',
    ability: A('ON_ROTATE', { op: 'shield', target: 'frontUnit' }, amt(2, 3, 4)),
  },
  {
    id: 'T2-06', name: '코뿔소', tier: 2, atk: 6, hp: 3, art: 'rhino',
    silhouette: '코 위의 큰 뿔 + 두꺼운 네 다리',
    ability: A('ON_BEFORE_ATTACK', { op: 'damage', target: 'targetBackEnemy' }, amt(2, 3, 4)),
  },
  {
    id: 'T2-07', name: '표범', tier: 2, atk: 5, hp: 5, art: 'leopard',
    silhouette: '긴 꼬리 + 점무늬 등',
    ability: A('ON_AFTER_ATTACK', { op: 'damage', target: 'attackTarget', condition: 'targetAlive' }, amt(2, 3, 4)),
  },
  {
    id: 'T2-08', name: '늑대', tier: 2, atk: 5, hp: 5, art: 'wolf',
    silhouette: '치켜든 갈기 + 곧게 뻗은 꼬리',
    ability: A('ON_BEFORE_ATTACK', { op: 'buff', target: 'backUnit' }, atkUp(1, 2, 3)),
  },
  {
    id: 'T2-09', name: '농부', tier: 2, atk: 4, hp: 7, art: 'farmer',
    silhouette: '넓은 밀짚모자 + 쇠스랑',
    ability: A('ON_ITEM_USE', { op: 'permBuff', target: 'lowestHpOtherAlly' }, hpUp(1, 2, 3)),
  },
  {
    id: 'T2-10', name: '세이렌', tier: 2, atk: 3, hp: 9, art: 'siren2',
    silhouette: '작은 수중형 + 소라 악기',
    ability: A('ON_LAP', { op: 'heal', target: 'allAlly' }, amt(2, 3, 4)),
  },
  {
    id: 'T2-11', name: '다람쥐지기', tier: 2, atk: 3, hp: 9, art: 'squirrelKeeper',
    silhouette: '복슬 꼬리 목도리 + 뾰족한 두건',
    ability: A('ON_ALLY_SUMMON', { op: 'buff', target: 'self' }, atkUp(1, 2, 3)),
  },

  // ═══ 티어 3 — 한 몫 하는 것들 (예산 20) ═══
  {
    id: 'T3-01', name: '트롤', tier: 3, atk: 5, hp: 10, art: 'troll',
    silhouette: '굽은 등, 땅에 닿는 팔 + 어깨 이끼',
    ability: A('ON_DAMAGED', { op: 'heal', target: 'self' }, amt(1, 2, 3), { oncePerTurn: true }),
  },
  {
    id: 'T3-02', name: '오우거', tier: 3, atk: 6, hp: 8, art: 'ogre',
    silhouette: '큰 아래턱 + 몸통만 한 몽둥이',
    ability: A('ON_BEFORE_ATTACK', { op: 'thisAttackBonus', target: 'self', condition: 'hpHigherThanTarget' }, amt(3, 5, 7)),
  },
  {
    id: 'T3-03', name: '늑대인간', tier: 3, atk: 7, hp: 6, art: 'werewolf',
    silhouette: '앞으로 굽은 늑대 머리 + 긴 발톱',
    ability: A('ON_AFTER_ATTACK', { op: 'buff', target: 'self' }, atkUp(2, 3, 4)),
  },
  {
    id: 'T3-04', name: '뱀파이어', tier: 3, atk: 6, hp: 8, art: 'vampire', manaUnit: true,
    silhouette: '높게 솟은 옷깃 + 박쥐형 망토',
    ability: manaGate('ON_AFTER_ATTACK', {
      1: { gain: 1, threshold: 3, then: { op: 'heal', target: 'self', amount: 4 } },
      3: { gain: 2, threshold: 3, then: { op: 'heal', target: 'self', amount: 6 } },
      5: {
        gain: 2, threshold: 3, then: {
          op: 'multi',
          effects: [{ op: 'heal', target: 'self', amount: 8 }, { op: 'buff', target: 'self', atk: 2 }],
        },
      },
    }),
  },
  {
    id: 'T3-05', name: '켄타우로스', tier: 3, atk: 7, hp: 6, art: 'centaur',
    silhouette: '말 하반신 + 활과 화살통',
    ability: A('ON_ROTATE', { op: 'damage', target: 'randomEnemy' }, amt(2, 3, 4)),
  },
  {
    id: 'T3-06', name: '호랑이', tier: 3, atk: 8, hp: 4, art: 'tiger',
    silhouette: '줄무늬 몸통 + 벌린 아가리',
    ability: A('ON_KILL', { op: 'damage', target: 'lowestHpEnemy' }, amt(3, 5, 7)),
  },
  {
    id: 'T3-07', name: '코끼리', tier: 3, atk: 4, hp: 12, art: 'elephant',
    silhouette: '늘어진 코 + 넓은 귀',
    ability: A('ON_DAMAGED', { op: 'shield', target: 'neighbors' }, amt(1, 2, 3)),
  },
  {
    id: 'T3-08', name: '가고일', tier: 3, atk: 5, hp: 10, art: 'gargoyle3',
    silhouette: '웅크린 수호상 + 닫은 날개',
    ability: A('ON_BATTLE_START', { op: 'shield', target: 'self' }, amt(5, 8, 11)),
  },
  {
    id: 'T3-09', name: '세이렌', tier: 3, atk: 7, hp: 6, art: 'siren3',
    silhouette: '큰 날개 + 전투형 상반신',
    ability: A('ON_LAP', { op: 'damage', target: 'allEnemy' }, amt(2, 3, 4)),
  },
  {
    id: 'T3-10', name: '기사', tier: 3, atk: 6, hp: 8, art: 'knight',
    silhouette: '각진 전신 갑옷 + 방패와 장검',
    ability: A('ON_ITEM_USE', { op: 'permBuff', target: 'neighbors' },
      [{ atk: 1, hp: 0 }, { atk: 1, hp: 1 }, { atk: 2, hp: 2 }]),
  },
  {
    id: 'T3-11', name: '포자버섯', tier: 3, atk: 5, hp: 10, art: 'sporeShroom',
    silhouette: '거대한 우산 갓 + 퍼지는 포자구름',
    ability: A('ON_ENEMY_SUMMON', { op: 'damage', target: 'summonedUnit' }, amt(3, 5, 7)),
  },

  // ═══ 티어 4 — 강자 (예산 25) ═══
  {
    id: 'T4-01', name: '거인', tier: 4, atk: 9, hp: 7, art: 'giant',
    silhouette: '과장된 양손 + 작은 머리',
    ability: A('ON_BEFORE_ATTACK', { op: 'damage', target: 'targetAndBackEnemy' }, amt(3, 5, 7)),
  },
  {
    id: 'T4-02', name: '고래', tier: 4, atk: 5, hp: 15, art: 'whale',
    silhouette: '거대한 몸통 + 갈라진 꼬리지느러미',
    ability: A('ON_DAMAGED', { op: 'heal', target: 'allAlly' }, amt(1, 2, 3), { oncePerTurn: true }),
  },
  {
    id: 'T4-03', name: '보아뱀', tier: 4, atk: 8, hp: 9, art: 'boa',
    silhouette: '머리부터 꼬리까지 감긴 몸',
    ability: A('ON_AFTER_ATTACK', { op: 'debuffAtk', target: 'attackTarget' }, amt(2, 3, 4)),
  },
  {
    id: 'T4-04', name: '가고일', tier: 4, atk: 6, hp: 13, art: 'gargoyle4',
    silhouette: '서서 펼친 날개 + 성채상',
    ability: A('ON_ROTATE', { op: 'shield', target: 'allAlly' }, amt(1, 2, 3)),
  },
  {
    id: 'T4-05', name: '리치', tier: 4, atk: 7, hp: 11, art: 'lich', manaUnit: true,
    silhouette: '왕관 + 로브 + 떠 있는 지팡이',
    ability: manaGate('ON_ALLY_DEATH', {
      1: { gain: 2, threshold: 4, then: { op: 'damage', target: 'randomEnemy', amount: 6 } },
      3: { gain: 2, threshold: 4, then: { op: 'damage', target: 'randomEnemy', amount: 9 } },
      5: { gain: 3, threshold: 4, then: { op: 'damage', target: 'randomEnemy', amount: 12 } },
    }),
  },
  {
    id: 'T4-06', name: '마녀', tier: 4, atk: 7, hp: 11, art: 'witch',
    silhouette: '삼각 모자 + 냄비와 국자',
    ability: A('ON_ITEM_USE', { op: 'permBuff', target: 'backUnit' }, atkUp(1, 2, 3)),
  },
  {
    id: 'T4-07', name: '연금술사', tier: 4, atk: 6, hp: 13, art: 'alchemist', manaSupply: true,
    silhouette: '원형 고글 + 허리의 플라스크 묶음',
    ability: A('ON_ROTATE', { op: 'grantMana', amount: 1 }, [
      { target: 'frontManaUnit' },
      { target: 'frontAndBackManaUnits' },
      { target: 'allAllyManaUnits' },
    ]),
  },
  {
    id: 'T4-08', name: '밴시', tier: 4, atk: 11, hp: 3, art: 'banshee',
    silhouette: '찢어진 영체 + 벌린 입',
    ability: A('ON_DEATH', { op: 'damage', target: 'allEnemy' }, amt(4, 6, 8)),
  },
  {
    id: 'T4-09', name: '키메라', tier: 4, atk: 10, hp: 5, art: 'chimera',
    silhouette: '세 머리 + 사자 몸 + 뱀 꼬리',
    ability: A('ON_AFTER_ATTACK', { op: 'damage', target: 'randomEnemiesExcludingTarget', count: 2 }, amt(2, 3, 4)),
  },
  {
    id: 'T4-10', name: '골렘', tier: 4, atk: 5, hp: 15, art: 'golem',
    silhouette: '쌓은 바위 관절 + 두꺼운 팔',
    ability: A('ON_DAMAGED', { op: 'buff', target: 'self' }, atkUp(1, 2, 3)),
  },
  {
    id: 'T4-11', name: '네크로맨서', tier: 4, atk: 7, hp: 11, art: 'necromancer',
    silhouette: '해골 지팡이 + 너덜너덜한 후드',
    ability: A('ON_ALLY_DEATH', { op: 'summon', name: '해골전사', art: 'skeleton', tier: 1 },
      [{ atk: 4, hp: 4 }, { atk: 6, hp: 6 }, { atk: 8, hp: 8 }]),
  },
  {
    id: 'T4-12', name: '슬라임 여왕', tier: 4, atk: 5, hp: 15, art: 'slimeQueen',
    silhouette: '왕관 형 돌기 + 넘실대는 몸',
    ability: A('ON_DAMAGED', { op: 'summon', name: '미니 슬라임', art: 'slimeMini', tier: 1 },
      [{ atk: 2, hp: 2 }, { atk: 3, hp: 3 }, { atk: 4, hp: 4 }], { oncePerTurn: true }),
  },

  // ═══ 티어 5 — 전설 (예산 32) ═══
  {
    id: 'T5-01', name: '케르베로스', tier: 5, atk: 11, hp: 10, art: 'cerberus',
    silhouette: '세 개의 개 머리 + 네 다리',
    ability: A('ON_BEFORE_ATTACK', { op: 'damage', target: 'targetNeighborEnemies' }, amt(3, 5, 7)),
  },
  {
    id: 'T5-02', name: '바실리스크', tier: 5, atk: 10, hp: 12, art: 'basilisk',
    silhouette: '볏 달린 뱀 머리 + 짧은 네 다리',
    ability: A('ON_AFTER_ATTACK', { op: 'markDamageUp', target: 'attackTarget' }, amt(3, 5, 7)),
  },
  {
    id: 'T5-03', name: '듀라한', tier: 5, atk: 14, hp: 4, art: 'dullahan',
    silhouette: '목 없는 어깨선 + 한 손에 든 머리',
    ability: A('ON_DEATH', { op: 'transferAtk', target: 'frontUnit' }, pct(50, 75, 100)),
  },
  {
    id: 'T5-04', name: '피닉스', tier: 5, atk: 13, hp: 6, art: 'phoenix',
    silhouette: '불꽃 깃 날개 + 길게 늘어진 꼬리깃',
    ability: A('ON_DEATH', { op: 'summon', self: true }, pct(40, 70, 100), { oncePerBattle: true }),
  },
  {
    id: 'T5-05', name: '악마', tier: 5, atk: 15, hp: 2, art: 'demon',
    silhouette: '휘어진 큰 뿔 + 갈래 꼬리',
    ability: A('ON_KILL', { op: 'damage', target: 'allEnemy' }, amt(2, 3, 4)),
  },
  {
    id: 'T5-06', name: '천사', tier: 5, atk: 7, hp: 18, art: 'angel',
    silhouette: '큰 날개 한 쌍 + 머리 위 고리',
    ability: A('ON_ALLY_DEATH', { op: 'multi', target: 'lowestHpAlly' }, [
      { effects: [{ op: 'heal', target: 'lowestHpAlly', amount: 4 }] },
      { effects: [{ op: 'heal', target: 'lowestHpAlly', amount: 6 }, { op: 'shield', target: 'lowestHpAlly', amount: 2 }] },
      { effects: [{ op: 'heal', target: 'lowestHpAlly', amount: 8 }, { op: 'shield', target: 'lowestHpAlly', amount: 4 }] },
    ]),
  },
  {
    id: 'T5-07', name: '기사단장', tier: 5, atk: 9, hp: 14, art: 'captain',
    silhouette: '깃털 장식 투구 + 등 뒤의 군기',
    ability: A('ON_ITEM_USE', { op: 'permBuff', atk: 1 }, [
      { target: 'randomAllies', count: 2 },
      { target: 'randomAllies', count: 3 },
      { target: 'allAlly' },
    ]),
  },
  {
    id: 'T5-08', name: '성직자', tier: 5, atk: 8, hp: 16, art: 'priest', manaUnit: true,
    silhouette: '긴 예복 + 지팡이와 향로',
    ability: manaGate('ON_ROTATE', {
      1: { gain: 1, threshold: 4, then: { op: 'heal', target: 'allAlly', amount: 5 } },
      3: {
        gain: 2, threshold: 4, then: {
          op: 'multi',
          effects: [{ op: 'heal', target: 'allAlly', amount: 7 }, { op: 'shield', target: 'allAlly', amount: 2 }],
        },
      },
      5: {
        gain: 2, threshold: 3, then: {
          op: 'multi',
          effects: [{ op: 'heal', target: 'allAlly', amount: 9 }, { op: 'shield', target: 'allAlly', amount: 4 }],
        },
      },
    }),
  },
  {
    id: 'T5-09', name: '크라켄', tier: 5, atk: 10, hp: 12, art: 'kraken',
    silhouette: '여러 갈래 촉수 + 뾰족한 머리',
    ability: A('ON_LAP', { op: 'multi' }, [
      { effects: [{ op: 'debuffAtk', target: 'highestAtkEnemy', amount: 5 }, { op: 'damage', target: 'highestAtkEnemy', amount: 5 }] },
      { effects: [{ op: 'debuffAtk', target: 'highestAtkEnemy', amount: 7 }, { op: 'damage', target: 'highestAtkEnemy', amount: 7 }] },
      { effects: [{ op: 'debuffAtk', target: 'highestAtkEnemy', amount: 9 }, { op: 'damage', target: 'highestAtkEnemy', amount: 9 }] },
    ]),
  },
  {
    id: 'T5-10', name: '드레이크', tier: 5, atk: 12, hp: 8, art: 'drake',
    silhouette: '가죽 날개 + 네 다리와 긴 목',
    ability: A('ON_AFTER_ATTACK', { op: 'nextAttackBonus', target: 'backUnit' }, amt(3, 5, 7)),
  },
  {
    id: 'T5-11', name: '주작', tier: 5, atk: 11, hp: 10, art: 'vermillionBird',
    silhouette: '부챗살 꼬리깃 + 붉게 타오르는 날개',
    ability: A('ON_KILL', { op: 'summon', name: '불사조 새끼', art: 'phoenix', tier: 1 },
      [{ atk: 3, hp: 3 }, { atk: 5, hp: 5 }, { atk: 7, hp: 7 }]),
  },

  // ═══ 티어 6 — 신화 (예산 40) ═══
  {
    id: 'T6-01', name: '드래곤라이더', tier: 6, atk: 13, hp: 14, art: 'dragonrider',
    silhouette: '기수와 비룡의 이중 실루엣 + 긴 기병창',
    ability: A('ON_BATTLE_START', { op: 'buff', target: 'allAlly' }, atkUp(4, 6, 8)),
  },
  {
    id: 'T6-02', name: '히드라', tier: 6, atk: 10, hp: 20, art: 'hydra',
    silhouette: '여러 개의 목 + 낮은 몸통',
    ability: A('ON_DAMAGED', { op: 'damage', reactive: true }, [
      { target: 'randomEnemy', count: 2, amount: 2 },
      { target: 'randomEnemy', count: 3, amount: 3 },
      { target: 'allEnemy', amount: 4 },
    ], { oncePerTurn: true }),
  },
  {
    id: 'T6-03', name: '스핑크스', tier: 6, atk: 12, hp: 16, art: 'sphinx',
    silhouette: '사자 몸 + 사람 얼굴 + 접힌 날개',
    ability: A('ON_ITEM_USE', { op: 'permBuff', target: 'itemTarget' },
      [{ atk: 2, hp: 2 }, { atk: 3, hp: 3 }, { atk: 4, hp: 4 }]),
  },
  {
    id: 'T6-04', name: '베히모스', tier: 6, atk: 16, hp: 8, art: 'behemoth',
    silhouette: '등의 골판 + 굵은 네 다리',
    ability: A('ON_BEFORE_ATTACK', { op: 'damage', target: 'allEnemy' }, amt(3, 5, 7)),
  },
  {
    id: 'T6-05', name: '레비아탄', tier: 6, atk: 11, hp: 18, art: 'leviathan',
    silhouette: '길게 감긴 해사 + 지느러미 갈기',
    ability: A('ON_LAP', { op: 'multi' }, [
      { effects: [{ op: 'debuffAtk', target: 'allEnemy', amount: 2 }, { op: 'damage', target: 'allEnemy', amount: 2 }] },
      { effects: [{ op: 'debuffAtk', target: 'allEnemy', amount: 3 }, { op: 'damage', target: 'allEnemy', amount: 3 }] },
      { effects: [{ op: 'debuffAtk', target: 'allEnemy', amount: 4 }, { op: 'damage', target: 'allEnemy', amount: 4 }] },
    ]),
  },
  {
    id: 'T6-06', name: '사이클롭스', tier: 6, atk: 18, hp: 4, art: 'cyclops',
    silhouette: '얼굴 중앙의 외눈 + 바위 몽둥이',
    ability: A('ON_KILL', { op: 'overkillSplash' }, [
      { pct: 50, count: 1 }, { pct: 100, count: 1 }, { pct: 100, count: 2 },
    ]),
  },
  {
    id: 'T6-07', name: '펜리르', tier: 6, atk: 17, hp: 6, art: 'fenrir',
    silhouette: '거대한 늑대 몸 + 사슬 조각',
    ability: A('ON_AFTER_ATTACK', { op: 'extraAttack', target: 'self', condition: 'targetAlive' },
      pct(50, 75, 100), { oncePerTurn: true }),
  },
  {
    id: 'T6-08', name: '미노타우로스', tier: 6, atk: 14, hp: 12, art: 'minotaur',
    silhouette: '뿔 달린 소머리 + 양날 도끼와 발굽',
    ability: A('ON_ROTATE', { op: 'orderAttack', target: 'frontUnit' },
      pct(50, 75, 100), { oncePerRotation: true }),
  },
  {
    id: 'T6-09', name: '유니콘', tier: 6, atk: 9, hp: 22, art: 'unicorn',
    silhouette: '이마의 외뿔 + 흐르는 갈기',
    ability: A('ON_ROTATE', { op: 'multi' }, [
      { effects: [{ op: 'heal', target: 'allAlly', amount: 3 }, { op: 'shield', target: 'allAlly', amount: 1 }] },
      { effects: [{ op: 'heal', target: 'allAlly', amount: 5 }, { op: 'shield', target: 'allAlly', amount: 2 }] },
      { effects: [{ op: 'heal', target: 'allAlly', amount: 7 }, { op: 'shield', target: 'allAlly', amount: 3 }] },
    ]),
  },
  {
    id: 'T6-10', name: '멀린', tier: 6, atk: 8, hp: 24, art: 'merlin', manaUnit: true,
    silhouette: '길고 휘어진 모자 + 별 장식 지팡이',
    ability: manaGate('ON_ROTATE', {
      1: {
        gain: 2, threshold: 6, then: {
          op: 'multi',
          effects: [{ op: 'buff', target: 'allAlly', atk: 4 }, { op: 'shield', target: 'allAlly', amount: 4 }],
        },
      },
      3: {
        gain: 3, threshold: 6, then: {
          op: 'multi',
          effects: [{ op: 'buff', target: 'allAlly', atk: 6 }, { op: 'shield', target: 'allAlly', amount: 6 }],
        },
      },
      5: {
        gain: 3, threshold: 5, then: {
          op: 'multi',
          effects: [{ op: 'buff', target: 'allAlly', atk: 8 }, { op: 'shield', target: 'allAlly', amount: 8 }],
        },
      },
    }),
  },
  {
    id: 'T6-11', name: '본드래곤', tier: 6, atk: 14, hp: 12, art: 'boneDragon',
    silhouette: '뼈만 남은 날개 뼈대 + 드러난 척추 꼬리',
    ability: A('ON_DEATH', { op: 'summon', self: true, scaleAtk: true, count: 2 }, pct(35, 50, 65), { oncePerBattle: true }),
  },
];

export const SPECIES = Object.fromEntries(SPECIES_LIST.map((s) => [s.id, s]));

export function speciesById(id) {
  return SPECIES[id];
}

export function speciesByTier(tier) {
  return SPECIES_LIST.filter((s) => s.tier === tier);
}

// 소환수(미니 슬라임)는 상점에 등장하지 않는 별도 종
export const SUMMON_SPECIES = {
  'SUM-01': {
    id: 'SUM-01', name: '미니 슬라임', tier: 1, atk: 1, hp: 1, art: 'slimeMini',
    summonOnly: true, ability: null, silhouette: '작은 액체 덩어리',
  },
};

export function anySpecies(id) {
  return SPECIES[id] || SUMMON_SPECIES[id];
}
