import {
  createFriendship,
  createDailyRecord,
  createEmptyPlots,
  INITIAL_SEEDS,
  type Friendship,
  type CropId,
  type CustomerId,
  type DailyRecord,
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
export type CropStock = Partial<Record<CropId, { normal: number; mutant: number }>>;
/** 손님이 늘어도 예전 기록을 읽을 수 있도록 부분 기록을 허용한다 */
export type FriendshipStock = Partial<Record<CustomerId, number>>;

export interface SaveData {
  playerName: string;
  gold: number;
  /** 누적 단계 전환 수. 여기서 날짜와 현재 단계가 나온다 */
  tick: number;
  seeds: SeedStock;
  crops: CropStock;
  plots: (Plot | null)[];
  display: CropId[];
  /** 오늘치 성과. 새로고침해도 하루 결과가 어긋나지 않도록 함께 저장한다 */
  daily: DailyRecord;
  /** 손님별 친밀도 */
  friendship: Friendship;
}

/** 날짜·밭·하루 집계·친밀도를 저장하기 전에 만들어진 기록에는 이 칸들이 없다 */
type PartialSaveData = Omit<SaveData, 'tick' | 'plots' | 'daily' | 'friendship'> &
  Partial<Pick<SaveData, 'tick' | 'plots' | 'daily'>> & { friendship?: FriendshipStock };

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
  crops: { tomato: { normal: data.tomato, mutant: data.goldenTomato } },
  display: data.display,
});

/**
 * 빠진 칸을 채워 완전한 기록으로 만든다.
 * 밭은 저장된 길이가 아니라 지금 설정된 칸 수에 맞춰 다시 깔아, 칸 수가 바뀌어도 어긋나지 않게 한다.
 */
const normalize = (data: PartialSaveData): SaveData => ({
  ...data,
  tick: data.tick ?? 0,
  plots: createEmptyPlots().map((_, index) => data.plots?.[index] ?? null),
  daily: data.daily ?? createDailyRecord(),
  friendship: { ...createFriendship(), ...data.friendship },
});

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // DB가 없거나 버전이 올라갔을 때만 실행된다 (저장소를 만드는 유일한 지점)
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
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
