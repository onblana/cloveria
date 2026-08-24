// 게임 내 시간: 접속 중에만 흐르는 세션 기반 틱 (실제 1초 = 1틱)
export const TICK_MS = 1000;

// 밭 칸 수
export const PLOT_COUNT = 4;

export type CropId = 'tomato';

export interface Crop {
  id: CropId;
  name: string;
  /** 심은 뒤 수확 가능해질 때까지 필요한 틱 수 */
  growTicks: number;
  seedPrice: number;
  /** 수확 시 변이종이 나올 확률 */
  mutationRate: number;
  mutantName: string;
}

export const CROPS: Record<CropId, Crop> = {
  tomato: {
    id: 'tomato',
    name: '토마토',
    growTicks: 5,
    seedPrice: 20,
    mutationRate: 0.15,
    mutantName: '황금 토마토',
  },
};

export type RecipeId = 'tomatoPasta';

export interface Recipe {
  id: RecipeId;
  name: string;
  /** 변이 재료로 만들었을 때의 시그니처 메뉴 이름 */
  signatureName: string;
  ingredients: Partial<Record<CropId, number>>;
  price: number;
  /** 시그니처 메뉴의 가격 배수 */
  signatureMultiplier: number;
}

export const RECIPES: Record<RecipeId, Recipe> = {
  tomatoPasta: {
    id: 'tomatoPasta',
    name: '토마토 파스타',
    signatureName: '행운의 토마토 파스타',
    ingredients: { tomato: 2 },
    price: 120,
    signatureMultiplier: 1.8,
  },
};

export const CUSTOMER_NAMES = [
  '마을 이장',
  '우체부 아저씨',
  '꽃집 누나',
  '옆집 할아버지',
  '떠돌이 상인',
];

export const INITIAL_SEEDS = 3;
export const INITIAL_GOLD = 0;
