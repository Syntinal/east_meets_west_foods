// Keeps an unfinished post on this device (IndexedDB — big enough for the
// photo, unlike localStorage) so a reload, a crash, or closing the tab
// never loses the owner's work. Every call is best-effort: if the browser
// blocks storage (private mode, full disk, an old browser), these quietly
// do nothing and the posting screen still works — just without recovery.
// The owner never sees a storage error.

const DB_NAME = "emw-manage";
const STORE = "drafts";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest | null): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          tx.oncomplete = () => {
            db.close();
            resolve((req?.result as T) ?? null);
          };
          tx.onerror = tx.onabort = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      }),
  );
}

export const draftStore = {
  get: <T>(key: string) => run<T>("readonly", (s) => s.get(key)),
  set: (key: string, value: unknown) => run("readwrite", (s) => s.put(value, key)).then(() => undefined),
  remove: (key: string) => run("readwrite", (s) => s.delete(key)).then(() => undefined),
};
