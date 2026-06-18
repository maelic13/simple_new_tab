export type StoredAsset = {
  ref: string;
  data: string;
  mediaType: string;
  createdAt: string;
};

const DB_NAME = "new-tab-speed-dial-assets";
const DB_VERSION = 1;
const STORE_NAME = "assets";

function openAssetsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "ref" });
      }
    };

    request.onerror = () => reject(request.error ?? new Error("Unable to open asset storage."));
    request.onsuccess = () => resolve(request.result);
  });
}

function withAssetStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openAssetsDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = run(store);

        request.onerror = () => reject(request.error ?? new Error("Asset storage request failed."));
        request.onsuccess = () => resolve(request.result);
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Asset storage transaction failed."));
        };
      })
  );
}

export function createAssetRef(): string {
  return crypto.randomUUID();
}

export async function saveAsset(data: string, mediaType: string): Promise<string> {
  const ref = createAssetRef();
  const asset: StoredAsset = {
    ref,
    data,
    mediaType,
    createdAt: new Date().toISOString()
  };

  await withAssetStore("readwrite", (store) => store.put(asset));
  return ref;
}

export async function loadAsset(ref: string): Promise<StoredAsset | undefined> {
  return withAssetStore<StoredAsset | undefined>("readonly", (store) => store.get(ref));
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(file);
  });
}

export function fileLooksLikeSvg(file: File): boolean {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
