/**
 * 게임 내 시간은 실시간이 아니라 단계 전환으로 흐른다.
 * 하루는 아침부터 밤까지 5단계이고, 단계가 하나 넘어갈 때 1틱이 지난다.
 */
export type DayPhaseId = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

/** farm: 밭을 돌보는 단계, bistro: 식당 문을 여는 단계 */
export type PhaseKind = 'farm' | 'bistro';

export interface DayPhase {
  id: DayPhaseId;
  name: string;
  kind: PhaseKind;
}

export const DAY_PHASES: DayPhase[] = [
  { id: 'morning', name: '아침', kind: 'farm' },
  { id: 'noon', name: '점심', kind: 'bistro' },
  { id: 'afternoon', name: '오후', kind: 'farm' },
  { id: 'evening', name: '저녁', kind: 'bistro' },
  { id: 'night', name: '밤', kind: 'farm' },
];

export const PHASES_PER_DAY = DAY_PHASES.length;

/** 누적 틱을 며칠째인지로 바꾼다 (시작이 1일차) */
export const getDayNumber = (tick: number) => Math.floor(tick / PHASES_PER_DAY) + 1;

export const getDayPhase = (tick: number) => DAY_PHASES[tick % PHASES_PER_DAY];

/**
 * 밭 칸 수. 5열 고정이라 칸 수가 늘면 아래로 행이 하나씩 늘어난다.
 * TODO: 상점에서 밭 확장을 사면 이 값이 커진다. 고정값 대신 저장된 확장 단계에서
 *       계산하도록 바꾸고, 저장 형식에도 확장 단계를 추가할 것 (지금은 초기값 10칸)
 */
export const PLOT_COUNT = 10;

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
    growTicks: 1,
    seedPrice: 20,
    mutationRate: 0.001,
    mutantName: '황금 토마토',
  },
  corn: {
    id: 'corn',
    name: '옥수수',
    growTicks: 3,
    seedPrice: 50,
    mutationRate: 0.0001,
    mutantName: '황금 옥수수',
  },
};

/** 밭과 목록에서 작물을 한눈에 구분하기 위한 표시용 아이콘 */
export const CROP_EMOJI: Record<CropId, string> = { tomato: '🍅', corn: '🌽' };

/** 작물별 보유 수량 (일반 / 변이) */
export type Inventory = Record<CropId, { normal: number; mutant: number }>;

/**
 * 하루 동안의 성과. 밤에 하루를 마무리할 때 보여주고 다음 날 아침에 비운다.
 * 수확은 작물이 늘어도 예전 기록을 읽을 수 있도록 부분 기록을 허용한다.
 */
export interface DailyRecord {
  /** 요리를 팔아 번 돈 */
  earned: number;
  /** 씨앗을 사는 데 쓴 돈 */
  spent: number;
  harvest: Partial<Record<CropId, { normal: number; mutant: number }>>;
}

export const createDailyRecord = (): DailyRecord => ({ earned: 0, spent: 0, harvest: {} });

/** 밭 한 칸의 상태. 심은 시점을 들고 있어야 지금 틱과 비교해 성장도를 계산할 수 있다 */
export interface Plot {
  cropId: CropId;
  plantedTick: number;
}

export const createEmptyPlots = (): (Plot | null)[] =>
  Array.from({ length: PLOT_COUNT }, () => null);

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

/** 진열 보너스를 화면에 보여줄 퍼센트 값으로 바꾼다 */
export const getDisplayBonusPercent = (count: number) =>
  Math.round(count * DISPLAY_BONUS_PER_ITEM * 100);
