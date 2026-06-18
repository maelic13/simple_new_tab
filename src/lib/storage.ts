import { DEFAULT_SETTINGS, SCHEMA_VERSION, type Settings, type Shortcut, type SpeedDialState } from "../types";
import { compactOrder } from "./order";
import { assertSyncSnapshotFits, type SyncSnapshot } from "./quota";

const SCHEMA_KEY = "app:schemaVersion";
const SETTINGS_KEY = "settings";
const ORDER_KEY = "shortcutOrder";
const SHORTCUT_PREFIX = "shortcut:";
const FALLBACK_STORAGE_KEY = "new-tab-speed-dial:sync";
const FALLBACK_EVENT = "new-tab-speed-dial:changed";

type ChangeListener = () => void;

function getShortcutKey(id: string): string {
  return `${SHORTCUT_PREFIX}${id}`;
}

function isChromeSyncAvailable(): boolean {
  return Boolean(globalThis.chrome?.storage?.sync);
}

function getLastError(): Error | undefined {
  const message = globalThis.chrome?.runtime?.lastError?.message;
  return message ? new Error(message) : undefined;
}

function getFallbackSnapshot(): SyncSnapshot {
  if (!globalThis.localStorage) {
    return {};
  }

  const raw = globalThis.localStorage.getItem(FALLBACK_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SyncSnapshot) : {};
}

function setFallbackSnapshot(snapshot: SyncSnapshot): void {
  globalThis.localStorage?.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(snapshot));
  globalThis.dispatchEvent?.(new Event(FALLBACK_EVENT));
}

async function readAllSync(): Promise<SyncSnapshot> {
  if (!isChromeSyncAvailable()) {
    return getFallbackSnapshot();
  }

  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (items) => {
      const error = getLastError();
      if (error) {
        reject(error);
        return;
      }

      resolve(items as SyncSnapshot);
    });
  });
}

async function writeSync(setItems: SyncSnapshot, removeKeys: string[] = []): Promise<void> {
  const current = await readAllSync();
  const next = { ...current, ...setItems };
  for (const key of removeKeys) {
    delete next[key];
  }
  assertSyncSnapshotFits(next);

  if (!isChromeSyncAvailable()) {
    setFallbackSnapshot(next);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    chrome.storage.sync.set(setItems, () => {
      const error = getLastError();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  if (removeKeys.length > 0) {
    await new Promise<void>((resolve, reject) => {
      chrome.storage.sync.remove(removeKeys, () => {
        const error = getLastError();
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

function snapshotToState(snapshot: SyncSnapshot): SpeedDialState {
  const shortcuts: Record<string, Shortcut> = {};

  for (const [key, value] of Object.entries(snapshot)) {
    if (key.startsWith(SHORTCUT_PREFIX) && value && typeof value === "object") {
      const shortcut = value as Shortcut;
      shortcuts[shortcut.id] = shortcut;
    }
  }

  const rawOrder = Array.isArray(snapshot[ORDER_KEY]) ? (snapshot[ORDER_KEY] as string[]) : [];
  const compacted = compactOrder(rawOrder, shortcuts);
  const missingIds = Object.keys(shortcuts).filter((id) => !compacted.includes(id));

  return {
    schemaVersion: typeof snapshot[SCHEMA_KEY] === "number" ? (snapshot[SCHEMA_KEY] as number) : SCHEMA_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(snapshot[SETTINGS_KEY] && typeof snapshot[SETTINGS_KEY] === "object" ? (snapshot[SETTINGS_KEY] as Settings) : {})
    },
    shortcuts,
    shortcutOrder: [...compacted, ...missingIds]
  };
}

export const __testSnapshotToState = snapshotToState;

function getReplaceStatePayload(current: SyncSnapshot, nextState: SpeedDialState): { setItems: SyncSnapshot; removeKeys: string[] } {
  const setItems: SyncSnapshot = {
    [SCHEMA_KEY]: SCHEMA_VERSION,
    [SETTINGS_KEY]: nextState.settings,
    [ORDER_KEY]: nextState.shortcutOrder
  };

  for (const id of nextState.shortcutOrder) {
    const shortcut = nextState.shortcuts[id];
    if (shortcut) {
      setItems[getShortcutKey(id)] = shortcut;
    }
  }

  return {
    setItems,
    removeKeys: Object.keys(current).filter((key) => key.startsWith(SHORTCUT_PREFIX) && !(key in setItems))
  };
}

export const __testGetReplaceStatePayload = getReplaceStatePayload;

export async function loadState(): Promise<SpeedDialState> {
  const state = snapshotToState(await readAllSync());

  if (state.schemaVersion !== SCHEMA_VERSION) {
    await writeSync({ [SCHEMA_KEY]: SCHEMA_VERSION });
  }

  return {
    ...state,
    schemaVersion: SCHEMA_VERSION
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeSync({
    [SCHEMA_KEY]: SCHEMA_VERSION,
    [SETTINGS_KEY]: settings
  });
}

export async function saveShortcut(shortcut: Shortcut, order: string[]): Promise<void> {
  await writeSync({
    [SCHEMA_KEY]: SCHEMA_VERSION,
    [getShortcutKey(shortcut.id)]: shortcut,
    [ORDER_KEY]: order
  });
}

export async function saveShortcutOrder(order: string[]): Promise<void> {
  await writeSync({
    [SCHEMA_KEY]: SCHEMA_VERSION,
    [ORDER_KEY]: order
  });
}

export async function saveShortcuts(shortcuts: Record<string, Shortcut>, order: string[]): Promise<void> {
  const setItems: SyncSnapshot = {
    [SCHEMA_KEY]: SCHEMA_VERSION,
    [ORDER_KEY]: order
  };

  for (const id of order) {
    const shortcut = shortcuts[id];
    if (shortcut) {
      setItems[getShortcutKey(id)] = shortcut;
    }
  }

  await writeSync(setItems);
}

export async function deleteShortcut(id: string, order: string[]): Promise<void> {
  await writeSync(
    {
      [SCHEMA_KEY]: SCHEMA_VERSION,
      [ORDER_KEY]: order
    },
    [getShortcutKey(id)]
  );
}

export async function replaceState(nextState: SpeedDialState): Promise<void> {
  const current = await readAllSync();
  const { setItems, removeKeys } = getReplaceStatePayload(current, nextState);

  await writeSync(setItems, removeKeys);
}

export function subscribeToStateChanges(listener: ChangeListener): () => void {
  if (!isChromeSyncAvailable()) {
    globalThis.addEventListener?.(FALLBACK_EVENT, listener);
    return () => globalThis.removeEventListener?.(FALLBACK_EVENT, listener);
  }

  const chromeListener: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (_changes, areaName) => {
    if (areaName === "sync") {
      listener();
    }
  };

  chrome.storage.onChanged.addListener(chromeListener);
  return () => chrome.storage.onChanged.removeListener(chromeListener);
}
