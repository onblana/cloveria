import {
  createDailyRecord,
  createEmptyDisplay,
  createEmptyPlots,
  CROP_IDS,
  createFriendship,
  createInventory,
  createStarterSeeds,
  createUnlockedCrops,
  INITIAL_GOLD,
  INITIAL_SEEDS,
  type Friendship,
  type CropId,
  type CustomerId,
  type Display,
  type DailyRecord,
  type Order,
  type Plot,
} from './data';

const DB_NAME = 'cloveria';
const DB_VERSION = 1;
const STORE_NAME = 'saveData';
const SAVE_KEY = 'current';

/**
 * 작물별 보유량. 나중에 작물이 늘어도 그 이전에 저장된 기록을 그대로 읽을 수 있도록
 * 모든 작물이 들어있지 않은 부분 기록을 허용한다.
 */
export type SeedStock = Partial<Record<CropId, number>>;
export type CropStock = Partial<Record<CropId, { normal: number; special: number }>>;
/** 손님이 늘어도 예전 기록을 읽을 수 있도록 부분 기록을 허용한다 */
export type FriendshipStock = Partial<Record<CustomerId, number>>;

export interface SaveData {
  playerName: string;
  gold: number;
  /** 누적 단계 전환 수. 여기서 날짜와 현재 단계가 나온다 */
  phaseCount: number;
  seeds: SeedStock;
  crops: CropStock;
  plots: (Plot | null)[];
  display: Display;
  /** 오늘치 성과. 새로고침해도 하루 결과가 어긋나지 않도록 함께 저장한다 */
  daily: DailyRecord;
  /** 손님별 친밀도 */
  friendship: Friendship;
  /** 이번 장사에 남은 손님들. 장사 도중에 이어 시작해도 순서가 유지된다 */
  orders: Order[];
  /** 한 번이라도 수확해 본 작물. 여기 없는 작물이 든 요리는 주문으로 나오지 않는다 */
  unlockedCrops: CropId[];
  /** 도입부 이야기를 이미 보여줬는지. 시작 화면이 만든 기록은 false로 시작한다 */
  introShown: boolean;
}

/** 시작 화면이 이름만 받아 만들어 두는 새 게임 기록 */
export const createNewSave = (playerName: string): SaveData => ({
  playerName,
  gold: INITIAL_GOLD,
  phaseCount: 0,
  seeds: createStarterSeeds(),
  crops: createInventory(),
  plots: createEmptyPlots(),
  display: createEmptyDisplay(),
  daily: createDailyRecord(),
  friendship: createFriendship(),
  orders: [],
  unlockedCrops: createUnlockedCrops(),
  introShown: false,
});

/** 날짜·밭·하루 집계·친밀도·대기열을 저장하기 전에 만들어진 기록에는 이 칸들이 없다 */
type PartialSaveData = Omit<
  SaveData,
  'phaseCount' | 'plots' | 'daily' | 'friendship' | 'orders' | 'unlockedCrops' | 'introShown'
> &
  Partial<
    Pick<SaveData, 'phaseCount' | 'daily' | 'orders' | 'unlockedCrops' | 'introShown'>
  > & {
    friendship?: FriendshipStock;
    plots?: (Plot | LegacyPlot | null)[];
    /** phaseCount로 이름을 바꾸기 전에 저장된 값 */
    tick?: number;
  };

/** plantedPhase로 이름을 바꾸기 전에 저장된 밭 칸 */
interface LegacyPlot {
  cropId: CropId;
  plantedTick: number;
}

/** 이름을 바꾸기 전 기록을 지금 형식으로 맞춘다 */
const normalizePlot = (plot: Plot | LegacyPlot | null | undefined): Plot | null => {
  if (!plot) return null;
  if ('plantedPhase' in plot) return plot;

  return { cropId: plot.cropId, plantedPhase: plot.plantedTick };
};

/** 토마토만 저장하던 시절의 형식 */
interface LegacySaveData {
  playerName: string;
  gold: number;
  seeds?: number;
  tomato: number;
  goldenTomato: number;
  display: CropId[];
}

type StoredSaveData = PartialSaveData | LegacySaveData;

const isLegacy = (data: StoredSaveData): data is LegacySaveData => !('crops' in data);

// 예전 기록은 읽는 시점에 새 형식으로 바꿔 넘긴다. 씨앗 칸이 없던 더 오래된 기록은 초기값으로 채운다
const migrate = (data: LegacySaveData): PartialSaveData => ({
  playerName: data.playerName,
  gold: data.gold,
  seeds: { tomato: data.seeds ?? INITIAL_SEEDS },
  crops: { tomato: { normal: data.tomato, special: data.goldenTomato } },
  display: data.display,
});

/**
 * 빠진 칸을 채워 완전한 기록으로 만든다.
 * 밭과 진열대는 저장된 길이가 아니라 지금 설정된 칸 수에 맞춰 다시 깔아, 칸 수가 바뀌어도 어긋나지 않게 한다.
 */
const normalize = (data: PartialSaveData): SaveData => ({
  ...data,
  phaseCount: data.phaseCount ?? data.tick ?? 0,
  plots: createEmptyPlots().map((_, index) => normalizePlot(data.plots?.[index])),
  // 빈 칸 없이 앞에서부터 채워 저장하던 기록은 그대로 앞 칸에 들어간다
  display: createEmptyDisplay().map((_, index) => data.display?.[index] ?? null),
  daily: data.daily ?? createDailyRecord(),
  friendship: { ...createFriendship(), ...data.friendship },
  orders: data.orders ?? [],
  // 이 칸이 없던 시절의 기록은 모든 작물이 이미 열려 있던 기록이다
  unlockedCrops: data.unlockedCrops ?? CROP_IDS,
  // 이 칸이 없던 시절의 기록은 이미 도입부를 지난 기록이다
  introShown: data.introShown ?? true,
});

/**
 * 열어 둔 연결. 저장이 잦아 요청마다 새로 열지 않고 하나를 재사용한다.
 * 실패하거나 연결이 끊기면 비워서 다음 요청이 다시 열게 한다.
 */
let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // DB가 없거나 버전이 올라갔을 때만 실행된다 (저장소를 만드는 유일한 지점)
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      // 다른 탭이 버전을 올리려 하면 연결을 비켜 준다
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };

      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

/** IndexedDB 요청은 콜백 기반이라 Promise로 감싸서 쓴다 */
async function runOnStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));

    request.onsuccess = () => resolve(request.result as T);
    // 연결은 공유하므로 닫지 않는다. 트랜잭션이 끊기는 경우까지 잡아 대기 중인 약속을 남기지 않는다
    request.onerror = () => reject(request.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

const isAvailable = () => typeof indexedDB !== 'undefined';

export async function loadGame(): Promise<SaveData | null> {
  if (!isAvailable()) return null;
  const saved = await runOnStore<StoredSaveData | undefined>('readonly', (store) =>
    store.get(SAVE_KEY),
  );
  if (!saved) return null;
  return normalize(isLegacy(saved) ? migrate(saved) : saved);
}

export async function saveGame(data: SaveData): Promise<void> {
  if (!isAvailable()) return;
  await runOnStore('readwrite', (store) => store.put(data, SAVE_KEY));
}

export async function clearGame(): Promise<void> {
  if (!isAvailable()) return;
  await runOnStore('readwrite', (store) => store.delete(SAVE_KEY));
}
