// 소모품 (기획서 8.3) 과 아이템이 부여하는 영구 능력

// 아이템으로 영구 부여되는 능력. 종 고유 능력과 별개로 유닛에 누적된다.
export const GRANTED_ABILITIES = {
  ITEM_OIL_ROTATE: {
    id: 'ITEM_OIL_ROTATE',
    label: '회전기름',
    trigger: 'ON_ROTATE',
    flat: { op: 'buff', target: 'self', atk: 2 },
  },
  ITEM_BANDAGE_SHIELD: {
    id: 'ITEM_BANDAGE_SHIELD',
    label: '응급붕대',
    trigger: 'ON_BATTLE_START',
    flat: { op: 'shield', target: 'self', amount: 3 },
  },
  ITEM_THORN: {
    id: 'ITEM_THORN',
    label: '독가시',
    trigger: 'ON_DAMAGED',
    flat: { op: 'damage', target: 'attacker', amount: 2, reactive: true },
  },
};

// kind: 'unit'  대상 유닛에게 사용 (→ 아이템 사용 트리거 발동)
// kind: 'run'   대상이 없는 런 단위 효과 (→ 트리거 발동하지 않음)
export const ITEM_LIST = [
  {
    id: 'candy', name: '경험치사탕', price: 3, kind: 'unit', art: 'candy',
    desc: '대상 유닛 경험치 +2',
    numeric: { exp: 2 },
  },
  {
    id: 'juice', name: '근육주스', price: 3, kind: 'unit', art: 'juice',
    desc: '대상 유닛 공격력 +3 (영구)',
    numeric: { atk: 3 },
  },
  {
    id: 'shell', name: '강철껍질', price: 3, kind: 'unit', art: 'shell',
    desc: '대상 유닛 체력 +4 (영구)',
    numeric: { hp: 4 },
  },
  {
    id: 'oil', name: '회전기름', price: 4, kind: 'unit', art: 'oil',
    desc: '대상에게 「회전 → 공격력 +2」 능력을 영구 부여',
    grant: 'ITEM_OIL_ROTATE',
  },
  {
    id: 'compass', name: '나침반', price: 4, kind: 'run', art: 'compass',
    desc: '다음 전투를 역회전으로 시작한다',
    run: { reverseNextBattle: true },
  },
  {
    id: 'bandage', name: '응급붕대', price: 2, kind: 'unit', art: 'bandage',
    desc: '대상에게 「전투 시작 → 보호막 3 획득」 능력을 영구 부여',
    grant: 'ITEM_BANDAGE_SHIELD',
  },
  {
    id: 'thorn', name: '독가시', price: 3, kind: 'unit', art: 'thorn',
    desc: '대상에게 「피해받음 → 공격자에게 2 피해」 능력을 영구 부여',
    grant: 'ITEM_THORN',
  },
  {
    id: 'coin', name: '행운의동전', price: 2, kind: 'run', art: 'coin',
    desc: '다음 라운드 골드 +3',
    run: { bonusGold: 3 },
  },
  {
    id: 'retry', name: '재도전권', price: 5, kind: 'run', art: 'retry',
    desc: '생명 1 회복 (게임당 1회만 구매 가능)',
    run: { life: 1 },
    oncePerGame: true,
  },
];

export const ITEMS = Object.fromEntries(ITEM_LIST.map((i) => [i.id, i]));

export function itemById(id) {
  return ITEMS[id];
}
