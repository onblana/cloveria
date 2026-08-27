/**
 * 게임 내 시간은 실시간이 아니라 단계 전환으로 흐른다.
 * 하루는 아침부터 밤까지 5단계이고, 단계가 하나 넘어갈 때 phaseCount가 1씩 오른다.
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

/** 누적 단계 수를 며칠째인지로 바꾼다 (시작이 1일차) */
export const getDayNumber = (phaseCount: number) => Math.floor(phaseCount / PHASES_PER_DAY) + 1;

export const getDayPhase = (phaseCount: number) => DAY_PHASES[phaseCount % PHASES_PER_DAY];

// TODO: 마을 사람들 화면. 손님 목록과 친밀도를 한눈에 볼 수 있게 만들 것

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
  growPhases: number; // 심은 뒤 수확까지 필요한 단계 수
  seedPrice: number;
  specialRate: number; // 다 자란 순간 특별 작물로 판정될 확률
  specialName: string;
}

export const CROPS: Record<CropId, Crop> = {
  tomato: {
    id: 'tomato',
    name: '토마토',
    growPhases: 2,
    seedPrice: 20,
    specialRate: 0.3,
    specialName: '황금 토마토',
  },
  corn: {
    id: 'corn',
    name: '옥수수',
    growPhases: 4,
    seedPrice: 50,
    specialRate: 0.3,
    specialName: '황금 옥수수',
  },
};

export const CROP_IDS = Object.keys(CROPS) as CropId[];

/** 밭과 목록에서 작물을 한눈에 구분하기 위한 표시용 아이콘 */
export const CROP_EMOJI: Record<CropId, string> = { tomato: '🍅', corn: '🌽' };

/** 작물별 보유 수량 (일반 / 특별) */
export type Inventory = Record<CropId, { normal: number; special: number }>;

/**
 * 하루 동안의 성과. 밤에 하루를 마무리할 때 보여주고 다음 날 아침에 비운다.
 * 수확은 작물이 늘어도 예전 기록을 읽을 수 있도록 부분 기록을 허용한다.
 */
export interface DailyRecord {
  /** 요리를 팔아 번 돈 */
  earned: number;
  /** 씨앗을 사는 데 쓴 돈 */
  spent: number;
  harvest: Partial<Record<CropId, { normal: number; special: number }>>;
}

export const createDailyRecord = (): DailyRecord => ({ earned: 0, spent: 0, harvest: {} });

/** 밭 한 칸의 상태. 성장 기준점을 들고 있어야 지금 단계 수와 비교해 성장도를 계산할 수 있다 */
export interface Plot {
  cropId: CropId;
  /** 성장을 재는 기준점. 심은 시점에서 시작하되, 밤을 지날 때마다 앞으로 당겨진다 */
  plantedPhase: number;
  /**
   * 특별 작물 여부. 다 자란 순간 한 번 정해져 저장되므로,
   * 새로고침하거나 수확을 미뤄도 결과가 바뀌지 않는다. 아직 자라는 중이면 undefined다.
   */
  isSpecial?: boolean;
}

export const createEmptyPlots = (): (Plot | null)[] =>
  Array.from({ length: PLOT_COUNT }, () => null);

/** 다 자라 수확할 수 있는 칸인지 */
export const isPlotReady = (plot: Plot, phaseCount: number) =>
  phaseCount - plot.plantedPhase >= CROPS[plot.cropId].growPhases;

/** 밤 하나를 지날 때 덤으로 자라는 단계 수 */
export const NIGHT_EXTRA_GROWTH = 1;

/**
 * 밤새 작물을 덤으로 자라게 한다.
 * 단계 수(phaseCount)는 하루 다섯 단계를 도는 값이라 건드릴 수 없어,
 * 대신 성장 기준점을 앞으로 당겨 그만큼 더 자란 것으로 만든다.
 */
export const growOvernight = (plots: (Plot | null)[]): (Plot | null)[] =>
  plots.map((plot) =>
    plot ? { ...plot, plantedPhase: plot.plantedPhase - NIGHT_EXTRA_GROWTH } : plot,
  );

/** 특별 작물 판정. 화면과 무관한 규칙이라 여기에 둔다 */
export const rollSpecial = (rate: number) => Math.random() < rate;

/**
 * 다 자랐는데 아직 판정하지 않은 칸의 특별 여부를 정한다.
 * 바뀐 칸이 없으면 원래 배열을 그대로 돌려주므로 다시 그릴 일이 없다.
 */
export const revealGrownPlots = (plots: (Plot | null)[], phaseCount: number) => {
  const next = plots.map((plot) => {
    if (!plot || plot.isSpecial !== undefined || !isPlotReady(plot, phaseCount)) return plot;

    return { ...plot, isSpecial: rollSpecial(CROPS[plot.cropId].specialRate) };
  });

  const changed = next.some((plot, index) => plot !== plots[index]);

  return changed ? next : plots;
};

export type RecipeId = 'tomatoPasta' | 'cornSoup';

export interface Recipe {
  id: RecipeId;
  name: string;
  specialName: string; // 특별 재료로 만들었을 때의 특별 요리 메뉴 이름
  ingredients: Partial<Record<CropId, number>>;
  price: number;
  specialMultiplier: number; // 특별 요리 메뉴의 가격 배수
}

export const RECIPES: Record<RecipeId, Recipe> = {
  tomatoPasta: {
    id: 'tomatoPasta',
    name: '토마토 파스타',
    specialName: '행운의 토마토 파스타',
    ingredients: { tomato: 2 },
    price: 80,
    specialMultiplier: 1.5,
  },
  cornSoup: {
    id: 'cornSoup',
    name: '옥수수 스프',
    specialName: '행운의 옥수수 스프',
    ingredients: { corn: 2 },
    price: 200,
    specialMultiplier: 1.5,
  },
};

export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

export type CustomerId =
  | 'headman'
  | 'postman'
  | 'florist'
  | 'grandpa'
  | 'peddler'
  | 'granddaughter'
  | 'hermit'
  | 'laundress'
  | 'shopkeeper'
  | 'fishmonger';

export interface Customer {
  id: CustomerId;
  name: string;
  /** 친밀도 단계별로 식당에 들어서며 건네는 첫마디 (처음 / 익숙 / 단골) */
  greetings: [string, string, string];
  /** 요리를 다 먹고 남기는 한마디. 나이와 말투가 제각각이라 손님마다 따로 둔다 */
  comments: [string, string, string];
  /** 특별 요리를 먹었을 때만 나오는 한마디. 평소보다 한 톤 높게 반응한다 */
  specialComment: string;
  /** 요리를 받지 못하고 돌아갈 때 남기는 한마디 */
  missedComment: string;
  /** 이름 뒤에 붙는 조사. 받침 유무가 이름마다 고정이라 미리 적어 둔다 */
  postposition1: '와' | '과';
  postposition2: '는' | '은';
}

export const CUSTOMERS: Record<CustomerId, Customer> = {
  headman: {
    id: 'headman',
    name: '마을 이장',
    greetings: [
      '안녕하신가',
      '오, 오늘도 문을 열었구먼',
      '자네 음식 없이는 하루가 안 가',
    ],
    comments: [
      '허, 솜씨가 늘었구먼.',
      '이 맛이면 마을 자랑거리지.',
      '오늘도 잘 먹었네. 수고했어.',
    ],
    specialComment: '허어, 오늘따라 요리가 더 맛있구먼!',
    missedComment: '오늘은 재료가 다 떨어졌구먼. 어쩔 수 없지.',
    postposition1: '과',
    postposition2: '은',
  },
  postman: {
    id: 'postman',
    name: '우체부 아저씨',
    greetings: [
      '배달 끝나고 오는 길입니다!',
      '오늘도 마지막 배달은 여기로 잡았습니다',
      '이 집 밥 먹으려고 배달 순서를 바꿨어요',
    ],
    comments: [
      '이거 먹고 남은 배달도 거뜬하겠어요!',
      '점심시간이 기다려지는 이유가 생겼네요.',
      '잘 먹었습니다. 다음에 또 들를게요!',
    ],
    specialComment: '우와, 이거 뭔가 다른데요?!',
    missedComment: '아쉽네요. 내일 배달길에 다시 들를게요!',
    postposition1: '와',
    postposition2: '는',
  },
  florist: {
    id: 'florist',
    name: '꽃집 누나',
    greetings: [
      '오늘도 잘 부탁해요~',
      '가게에 꽃 좀 놓을까? 여기랑 잘 어울릴 것 같은데',
      '오늘 제일 예쁜 꽃, 여기 두고 갈게',
    ],
    comments: [
      '와, 이거 진짜 맛있다.',
      '그릇이 예뻐서 그런가, 더 맛있는 것 같아.',
      '잘 먹었어요~ 오늘도 고마워요.',
    ],
    specialComment: '어머, 이거 뭐야? 너무 맛있다!',
    missedComment: '에이, 아쉽다. 내일은 꼭 먹으러 올게.',
    postposition1: '와',
    postposition2: '는',
  },
  grandpa: {
    id: 'grandpa',
    name: '옆집 할아버지',
    greetings: [
      '아이구구 허리야...',
      '허리는 여전한데 여긴 오게 되네',
      '자네 얼굴 보러 오는 거지 뭐. 밥은 덤이고',
    ],
    comments: [
      '이가 시원찮아도 이건 술술 넘어가는구먼.',
      '허리는 아파도 입은 즐겁구먼.',
      '잘 먹었네. 자네 덕에 오래 살겠어.',
    ],
    specialComment: '허허, 이건 젊어지는 맛이구먼!',
    missedComment: '허허, 헛걸음했구먼. 내일 또 오지 뭐.',
    postposition1: '와',
    postposition2: '는',
  },
  peddler: {
    id: 'peddler',
    name: '떠돌이 상인',
    greetings: [
      '이 마을에 이런 곳이 있었군',
      '다른 마을 돌다가도 여기가 생각나더군',
      '이 집 때문에 이 마을엔 꼭 들르기로 했네',
    ],
    comments: [
      '값을 더 쳐줘도 아깝지 않겠군.',
      '여러 마을 다녀봤지만 이 정도는 드물어.',
      '잘 먹었네. 다음 장에 또 들르지.',
    ],
    specialComment: '이 요리는 값을 못 매기겠군.',
    missedComment: '오늘은 인연이 아니었군. 다음 장에 다시 오지.',
    postposition1: '과',
    postposition2: '은',
  },
  granddaughter: {
    id: 'granddaughter',
    name: '이장의 손녀딸',
    greetings: [
      '할아버지가 여기 맛있다고 했어요!',
      '저 혼자 왔어요! 이제 길 다 외웠어요',
      '커서 여기 같은 식당 할 거예요!',
    ],
    comments: [
      '우와! 진짜 맛있어요!',
      '이거 어떻게 만드는 거예요?',
      '할아버지한테도 자랑할래요!',
    ],
    specialComment: '세상에서 제일 맛있어요!',
    missedComment: '으앙, 배고픈데... 내일 또 올게요!',
    postposition1: '과',
    postposition2: '은',
  },
  hermit: {
    id: 'hermit',
    name: '은둔 청년',
    greetings: [
      '... (조용히 자리에 앉아 메뉴판을 가리킨다)',
      '... (작게) 안녕하세요',
      '오늘은... 이야기 좀 해도 될까요',
    ],
    comments: [
      '... 맛있어요. (작게)',
      '... (조용히 가게를 떠난다)',
      '... (꾸벅)',
    ],
    specialComment: '...! (눈이 커진다)',
    missedComment: '... (조용히 일어나 문을 나선다)',
    postposition1: '과',
    postposition2: '은',
  },
  laundress: {
    id: 'laundress',
    name: '세탁소 아주머니',
    greetings: [
      '잠깐 짬 냈어. 빨리 되지?',
      '오늘은 좀 여유 있어. 천천히 해도 돼',
      '여기 앉아 있으면 다림질 생각이 안 나',
    ],
    comments: [
      '어머, 이거 물건이네.',
      '이 맛에 짬 내서 오는 거지.',
      '잘 먹었어. 다음엔 좀 더 앉았다 갈게.',
    ],
    specialComment: '이런 건 자랑해야지. 온 동네에 말해야겠다.',

    missedComment: '어머, 오늘은 안 되나 보네. 짬 내서 또 올게.',
    postposition1: '와',
    postposition2: '는',
  },
  shopkeeper: {
    id: 'shopkeeper',
    name: '잡화점 주인',
    greetings: [
      '오늘은 일찍 가게 문을 닫았네',
      '또 왔네. 뭐 좀 남았나?',
      '우리 가게 물건보다 여기 밥이 더 잘 팔리겠어',
    ],
    comments: [
      '나쁘지 않군.',
      '... 맛있네. 이런 말 잘 안 하는데.',
      '잘 먹었어. 계산은 여기 두고 가네.',
    ],
    specialComment: '... 이건 인정할 수밖에 없군.',
    missedComment: '뭐, 그럴 수도 있지. 다음에 오지.',
    postposition1: '과',
    postposition2: '은',
  },
  fishmonger: {
    id: 'fishmonger',
    name: '생선가게 사장님',
    greetings: [
      '오늘 물건 좋았어!',
      '좋은 놈으로 몇 마리 남겨왔어. 나중에 줄게',
      '이봐, 다음엔 내 생선으로 요리 하나 만들어봐!',
    ],
    comments: [
      '크, 이 맛이야!',
      '내 생선도 이렇게 요리해줘!',
      '잘 먹었다! 다음엔 좋은 놈으로 가져오지!',
    ],
    specialComment: '내 생선 인생 걸고, 이건 진짜야!',
    missedComment: '에이, 아쉽구만! 다음엔 재료 넉넉히 준비해둬!',
    postposition1: '과',
    postposition2: '은',
  },
};

export const CUSTOMER_IDS = Object.keys(CUSTOMERS) as CustomerId[];

/** 손님 한 명과 그 손님이 시킬 요리. 장사 한 번의 대기열이 이것들로 이뤄진다 */
export interface Order {
  customer: CustomerId;
  recipeId: RecipeId;
}

/**
 * 친밀도를 나누는 기준은 두 가지이고 서로 다르다. 한쪽만 보고 고치지 말 것.
 * - 인사(greetings): 3단계 — 처음(0~29) / 익숙(GREETING_FAMILIAR_AT~99) / 단골(FRIENDSHIP_MAX)
 * - 소식(FRIENDSHIP_MILESTONES): 5단계 — 처음 / 10 / 30 / 60 / 100
 * 인사의 '익숙'과 소식의 30 단계가 우연히 같은 값일 뿐, 같은 기준이 아니다.
 */

/** 손님별 친밀도. 요리를 하나 낼 때마다 오르고 최대치에서 멈춘다 */
export type Friendship = Record<CustomerId, number>;

export const FRIENDSHIP_MAX = 100;
/** 요리 한 번에 오르는 친밀도 */
export const FRIENDSHIP_PER_DISH = 1;

export const createFriendship = (): Friendship =>
  Object.fromEntries(CUSTOMER_IDS.map((id) => [id, 0])) as Friendship;

/** 인사가 '익숙' 단계로 바뀌는 친밀도 */
export const GREETING_FAMILIAR_AT = 30;

/** 친밀도에 맞는 인사. 단골에 닿기 전까지는 처음과 익숙 두 가지만 나온다 */
export const getGreeting = (customer: Customer, friendship: number): string => {
  if (friendship >= FRIENDSHIP_MAX) return customer.greetings[2];
  if (friendship >= GREETING_FAMILIAR_AT) return customer.greetings[1];
  return customer.greetings[0];
};

/**
 * 친밀도가 이 값에 닿는 순간 한 번만 소식으로 알린다.
 * 높은 단계가 먼저 오도록 내림차순으로 둔다.
 */
const FRIENDSHIP_MILESTONES: { at: number; message: (customer: Customer) => string }[] = [
  {
    at: FRIENDSHIP_MAX,
    message: (c) => `${c.name}${c.postposition2} 우리 식당의 오래된 단골 손님이다.`,
  },
  { at: 60, message: (c) => `${c.name}${c.postposition1} 많이 친해졌다.` },
  { at: 30, message: (c) => `${c.name}${c.postposition1} 조금 더 친해진 것 같다.` },
  { at: 10, message: (c) => `${c.name}${c.postposition1} 약간 친해진듯 하다.` },
];

/** 친밀도가 before에서 after로 오르며 새로 넘어선 단계의 문구. 없으면 null */
export const getFriendshipMessage = (
  customer: Customer,
  before: number,
  after: number,
): string | null => {
  const reached = FRIENDSHIP_MILESTONES.find((step) => before < step.at && after >= step.at);
  return reached ? reached.message(customer) : null;
};

// TODO: 칭호. 아래 두 가지를 먼저 넣고, 달성 횟수를 세는 카운터도 저장 형식에 추가할 것
//       - 토마토 파스타 전문 요리사: 토마토 파스타를 20번 요리했다
//       - 토마토 키우기의 달인: 토마토 50개를 수확했다

export const INITIAL_SEEDS = 6;

/** 시작 작물은 토마토 하나뿐이다 (도입부에서 요정이 건네는 씨앗) */
export const STARTER_CROP: CropId = 'tomato';

/** 한 번이라도 수확해 본 작물 목록. 시작할 때는 요정이 건넨 작물뿐이다 */
export const createUnlockedCrops = (): CropId[] => [STARTER_CROP];

/**
 * 지금 주문으로 나올 수 있는 요리.
 * 아직 거둬 본 적 없는 작물이 들어간 요리는 만들 길이 없어 주문에서 뺀다.
 */
export const getOrderableRecipeIds = (unlockedCrops: CropId[]): RecipeId[] =>
  RECIPE_IDS.filter((recipeId) =>
    (Object.keys(RECIPES[recipeId].ingredients) as CropId[]).every((cropId) =>
      unlockedCrops.includes(cropId),
    ),
  );

/** 작물별 보유량 바탕. 기록에 없는 작물은 0개로 남는다 */
export const createEmptyStock = (): Record<CropId, number> =>
  Object.fromEntries(CROP_IDS.map((id) => [id, 0])) as Record<CropId, number>;

export const createInventory = (): Inventory =>
  Object.fromEntries(CROP_IDS.map((id) => [id, { normal: 0, special: 0 }])) as Inventory;

export const createStarterSeeds = (): Record<CropId, number> => ({
  ...createEmptyStock(),
  [STARTER_CROP]: INITIAL_SEEDS,
});
export const INITIAL_GOLD = 100;

/** 특별 작물을 진열칸 수 */
export const DISPLAY_SLOTS = 6;

/** 진열대. 칸 순서를 그대로 유지하며, 비어 있는 칸은 null이다 */
export type Display = (CropId | null)[];

export const createEmptyDisplay = (): Display =>
  Array.from({ length: DISPLAY_SLOTS }, () => null);

/** 진열품 1개당 모든 요리 판매가 상승률 */
export const DISPLAY_BONUS_PER_ITEM = 0.05;

/** 진열 보너스를 화면에 보여줄 퍼센트 값으로 바꾼다 */
export const getDisplayBonusPercent = (count: number) =>
  Math.round(count * DISPLAY_BONUS_PER_ITEM * 100);
