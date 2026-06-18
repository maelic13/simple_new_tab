import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, SCHEMA_VERSION, type Shortcut } from "../types";
import { __testGetReplaceStatePayload, __testSnapshotToState, loadCachedState, saveSettings, subscribeToStateChanges } from "./storage";

function installChromeSyncMock(initialSnapshot: Record<string, unknown> = {}) {
  let snapshot = { ...initialSnapshot };
  const listeners = new Set<(changes: Record<string, unknown>, areaName: string) => void>();
  const sync = {
    get: vi.fn((_keys: unknown, callback: (items: Record<string, unknown>) => void) => callback({ ...snapshot })),
    set: vi.fn((items: Record<string, unknown>, callback: () => void) => {
      snapshot = { ...snapshot, ...items };
      callback();
    }),
    remove: vi.fn((keys: string | string[], callback: () => void) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete snapshot[key];
      }
      callback();
    })
  };
  const onChanged = {
    addListener: vi.fn((listener: (changes: Record<string, unknown>, areaName: string) => void) => {
      listeners.add(listener);
    }),
    removeListener: vi.fn((listener: (changes: Record<string, unknown>, areaName: string) => void) => {
      listeners.delete(listener);
    })
  };

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: { lastError: undefined },
      storage: { sync, onChanged }
    }
  });

  return {
    sync,
    onChanged,
    listeners,
    getSnapshot: () => snapshot
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: undefined
  });
});

describe("snapshotToState", () => {
  it("keeps shortcuts even when shortcutOrder is missing or incomplete", () => {
    const shortcut: Shortcut = {
      id: "a",
      name: "Example",
      url: "https://example.com/",
      icon: { kind: "favicon" },
      tileColor: "#ffffff",
      textColor: "#111827",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z"
    };

    expect(
      __testSnapshotToState({
        "app:schemaVersion": SCHEMA_VERSION,
        settings: DEFAULT_SETTINGS,
        shortcutOrder: [],
        "shortcut:a": shortcut
      }).shortcutOrder
    ).toEqual(["a"]);
  });

  it("promotes legacy stored background URLs to both theme backgrounds", () => {
    const backgroundUrl = "https://assets.speeddial2.com/themes/68.jpg";
    const state = __testSnapshotToState({
      "app:schemaVersion": SCHEMA_VERSION,
      settings: {
        background: { kind: "url", value: backgroundUrl }
      }
    });

    expect(state.settings.backgroundByTheme).toEqual({
      light: { mode: "url", color: DEFAULT_SETTINGS.background.value, url: backgroundUrl },
      dark: { mode: "url", color: DEFAULT_SETTINGS.background.value, url: backgroundUrl }
    });
  });

  it("loads split per-theme backgrounds from sync storage", () => {
    const state = __testSnapshotToState({
      "app:schemaVersion": SCHEMA_VERSION,
      settings: {
        ...DEFAULT_SETTINGS,
        columns: 9,
        backgroundByTheme: {
          light: { mode: "color", color: "#ffffff", url: "" },
          dark: { mode: "color", color: "#000000", url: "" }
        }
      },
      "settings:background:light": { mode: "url", color: "#eeeeee", url: "https://example.com/light.jpg" },
      "settings:background:dark": { mode: "url", color: "#111111", url: "https://example.com/dark.jpg" }
    });

    expect(state.settings.columns).toBe(9);
    expect(state.settings.backgroundByTheme).toEqual({
      light: { mode: "url", color: "#eeeeee", url: "https://example.com/light.jpg" },
      dark: { mode: "url", color: "#111111", url: "https://example.com/dark.jpg" }
    });
  });

  it("merges partial split background sync entries with legacy background settings", () => {
    const state = __testSnapshotToState({
      "app:schemaVersion": SCHEMA_VERSION,
      settings: {
        ...DEFAULT_SETTINGS,
        backgroundByTheme: {
          light: { mode: "color", color: "#ffffff", url: "" },
          dark: { mode: "color", color: "#000000", url: "" }
        }
      },
      "settings:background:dark": { mode: "url", color: "#111111", url: "https://example.com/dark.jpg" }
    });

    expect(state.settings.backgroundByTheme).toEqual({
      light: { mode: "color", color: "#ffffff", url: "" },
      dark: { mode: "url", color: "#111111", url: "https://example.com/dark.jpg" }
    });
  });
});

describe("loadCachedState", () => {
  it("loads a locally cached sync snapshot for immediate startup", () => {
    const shortcut: Shortcut = {
      id: "a",
      name: "Example",
      url: "https://example.com/",
      icon: { kind: "favicon" },
      tileColor: "#ffffff",
      textColor: "#111827",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z"
    };

    localStorage.setItem(
      "new-tab-speed-dial:cache",
      JSON.stringify({
        "app:schemaVersion": SCHEMA_VERSION,
        settings: DEFAULT_SETTINGS,
        shortcutOrder: ["a"],
        "shortcut:a": shortcut
      })
    );

    expect(loadCachedState()?.shortcutOrder).toEqual(["a"]);
  });
});

describe("replaceState", () => {
  it("does not remove shortcut keys that are also being set", () => {
    const shortcut: Shortcut = {
      id: "a",
      name: "Example",
      url: "https://example.com/",
      icon: { kind: "favicon" },
      tileColor: "#ffffff",
      textColor: "#111827",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z"
    };

    const { removeKeys } = __testGetReplaceStatePayload(
      { "shortcut:a": shortcut, "shortcut:old": { ...shortcut, id: "old" } },
      {
        schemaVersion: SCHEMA_VERSION,
        settings: DEFAULT_SETTINGS,
        shortcuts: { a: shortcut },
        shortcutOrder: ["a"]
      }
    );

    expect(removeKeys).toEqual(["shortcut:old"]);
  });

  it("splits settings backgrounds into separate sync entries", () => {
    const shortcut: Shortcut = {
      id: "a",
      name: "Example",
      url: "https://example.com/",
      icon: { kind: "favicon" },
      tileColor: "#ffffff",
      textColor: "#111827",
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:00:00.000Z"
    };
    const settings = {
      ...DEFAULT_SETTINGS,
      backgroundByTheme: {
        light: { mode: "url" as const, color: "#eeeeee", url: "https://example.com/light.jpg" },
        dark: { mode: "url" as const, color: "#111111", url: "https://example.com/dark.jpg" }
      }
    };

    const { setItems } = __testGetReplaceStatePayload(
      {},
      {
        schemaVersion: SCHEMA_VERSION,
        settings,
        shortcuts: { a: shortcut },
        shortcutOrder: ["a"]
      }
    );

    expect((setItems.settings as { backgroundByTheme?: unknown }).backgroundByTheme).toBeUndefined();
    expect(setItems["settings:background:light"]).toEqual(settings.backgroundByTheme.light);
    expect(setItems["settings:background:dark"]).toEqual(settings.backgroundByTheme.dark);
    expect(setItems["shortcut:a"]).toEqual(shortcut);
  });
});

describe("sync writes", () => {
  it("saves every setting through chrome.storage.sync", async () => {
    const chromeMock = installChromeSyncMock();
    const settings = {
      ...DEFAULT_SETTINGS,
      columns: 12,
      shortcutSize: 130,
      shortcutSpacing: 10,
      gridVerticalPosition: 20,
      defaultTileColor: "#123456",
      defaultTextColor: "#abcdef",
      theme: "dark" as const,
      tileContentMode: "nameOnly" as const,
      showShortcutActions: false,
      showAddShortcutTile: false,
      welcomeCompleted: true,
      background: { kind: "url" as const, value: "https://example.com/current.jpg" },
      backgroundByTheme: {
        light: { mode: "color" as const, color: "#fefefe", url: "" },
        dark: { mode: "url" as const, color: "#101010", url: "https://example.com/dark.jpg" }
      },
      shortcutAppearanceByTheme: {
        light: { tileColor: "#fefefe", textColor: "#111111" },
        dark: { tileColor: "#101010", textColor: "#eeeeee" }
      }
    };

    await saveSettings(settings);

    expect(chromeMock.sync.set).toHaveBeenCalled();
    expect(chromeMock.getSnapshot()).toMatchObject({
      "app:schemaVersion": SCHEMA_VERSION,
      settings: {
        columns: 12,
        shortcutSize: 130,
        shortcutSpacing: 10,
        gridVerticalPosition: 20,
        defaultTileColor: "#123456",
        defaultTextColor: "#abcdef",
        theme: "dark",
        tileContentMode: "nameOnly",
        showShortcutActions: false,
        showAddShortcutTile: false,
        welcomeCompleted: true,
        background: { kind: "url", value: "https://example.com/current.jpg" },
        shortcutAppearanceByTheme: settings.shortcutAppearanceByTheme
      },
      "settings:background:light": settings.backgroundByTheme.light,
      "settings:background:dark": settings.backgroundByTheme.dark
    });
    expect((chromeMock.getSnapshot().settings as { backgroundByTheme?: unknown }).backgroundByTheme).toBeUndefined();
  });
});

describe("subscribeToStateChanges", () => {
  it("listens for chrome sync changes", () => {
    const chromeMock = installChromeSyncMock();
    const listener = vi.fn();
    const unsubscribe = subscribeToStateChanges(listener);
    const [chromeListener] = Array.from(chromeMock.listeners);

    chromeListener({}, "local");
    expect(listener).not.toHaveBeenCalled();

    chromeListener({}, "sync");
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(chromeMock.onChanged.removeListener).toHaveBeenCalledWith(chromeListener);
  });
});
