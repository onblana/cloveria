// 게임 내 시간: 접속 중에만 흐르는 세션 기반 틱 (실제 1초 = 1틱)
export const TICK_MS = 1000;

// 밭 칸 수
export const PLOT_COUNT = 4;

export type CropId = 'tomato' | 'corn';

export interface Crop {
  id: CropId;
  name: string;
  growTicks: number; // 심은 뒤 수확까지 필요한 틱 수
  seedPrice: number;
  mutationRate: number; // 수확 시 변이종이 나올 확률
  mutantName: string;
}

export const CROPS: Record<CropId, Crop> = {
  tomato: {
    id: 'tomato',
    name: '토마토',
    growTicks: 10,
    seedPrice: 20,
    mutationRate: 0.001,
    mutantName: '황금 토마토',
  },
  corn: {
    id: 'corn',
    name: '옥수수',
    growTicks: 20,
    seedPrice: 50,
    mutationRate: 0.0001,
    mutantName: '황금 옥수수',
  },
};

export type RecipeId = 'tomatoPasta' | 'cornSoup';

export interface Recipe {
  id: RecipeId;
  name: string;
  signatureName: string; // 변이 재료로 만들었을 때의 시그니처 메뉴 이름
  ingredients: Partial<Record<CropId, number>>;
  price: number;
  signatureMultiplier: number; // 시그니처 메뉴의 가격 배수
}

export const RECIPES: Record<RecipeId, Recipe> = {
  tomatoPasta: {
    id: 'tomatoPasta',
    name: '토마토 파스타',
    signatureName: '행운의 토마토 파스타',
    ingredients: { tomato: 2 },
    price: 80,
    signatureMultiplier: 1.5,
  },
  cornSoup: {
    id: 'cornSoup',
    name: '옥수수 스프',
    signatureName: '행운의 옥수수 스프',
    ingredients: { corn: 2 },
    price: 150,
    signatureMultiplier: 1.7,
  },
};

export const CUSTOMER_NAMES = [
  '마을 이장',
  '우체부 아저씨',
  '꽃집 누나',
  '옆집 할아버지',
  '떠돌이 상인',
  '이장의 손녀딸',
  '은둔 청년',
  '세탁소 아주머니',
  '잡화점 주인',
  '생선가게 사장님'
];

export const INITIAL_SEEDS = 4;
export const INITIAL_GOLD = 100;

/** 변이 작물을 진열칸 수 */
export const DISPLAY_SLOTS = 6;

/** 진열품 1개당 모든 요리 판매가 상승률 */
export const DISPLAY_BONUS_PER_ITEM = 0.05;
