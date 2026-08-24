import type { CropId } from './data';

const DB_NAME = 'cloveria';
const DB_VERSION = 1;
const STORE_NAME = 'saveData';
const SAVE_KEY = 'current';

export interface SaveData {
  playerName: string;
  gold: number;
  seeds: number;
  tomato: number;
  goldenTomato: number;
  display: CropId[];
}

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
  const saved = await runOnStore<SaveData | undefined>('readonly', (store) =>
    store.get(SAVE_KEY),
  );
  return saved ?? null;
}

export async function saveGame(data: SaveData): Promise<void> {
  if (!isAvailable()) return;
  await runOnStore('readwrite', (store) => store.put(data, SAVE_KEY));
}

export async function clearGame(): Promise<void> {
  if (!isAvailable()) return;
  await runOnStore('readwrite', (store) => store.delete(SAVE_KEY));
}
