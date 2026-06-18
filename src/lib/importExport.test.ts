import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, SCHEMA_VERSION, type SpeedDialState } from "../types";
import { exportState, exportStateWithAssets, importStateWithAssets, parseImportFile, parseLegacyShortcutExport, parseNativeImport } from "./importExport";
import { saveStoredAsset } from "./assets";

vi.mock("./assets", () => ({
  loadAsset: vi.fn(async (ref: string) => ({
    ref,
    data: `data:image/png;base64,${ref}`,
    mediaType: "image/png",
    createdAt: "2026-06-18T00:00:00.000Z"
  })),
  saveStoredAsset: vi.fn()
}));

describe("import/export", () => {
  it("exports native extension JSON", () => {
    const state: SpeedDialState = {
      schemaVersion: SCHEMA_VERSION,
      settings: DEFAULT_SETTINGS,
      shortcuts: {
        a: {
          id: "a",
          name: "Example",
          url: "https://example.com/",
          icon: { kind: "favicon" },
          tileColor: "#ffffff",
          textColor: "#111827",
          createdAt: "2026-06-18T00:00:00.000Z",
          updatedAt: "2026-06-18T00:00:00.000Z"
        }
      },
      shortcutOrder: ["a"]
    };

    expect(exportState(state)).toMatchObject({
      app: "new-tab-speed-dial",
      formatVersion: 2,
      settings: DEFAULT_SETTINGS,
      shortcuts: [state.shortcuts.a]
    });
  });

  it("exports a complete settings snapshot", () => {
    const state: SpeedDialState = {
      schemaVersion: SCHEMA_VERSION,
      settings: {
        ...DEFAULT_SETTINGS,
        columns: 9,
        background: { kind: "color", value: "#222222" },
        showShortcutActions: false,
        showAddShortcutTile: false,
        shortcutSize: 120,
        shortcutSpacing: 15,
        gridVerticalPosition: 25,
        tileContentMode: "iconOnly",
        theme: "dark"
      },
      shortcuts: {},
      shortcutOrder: []
    };

    expect(exportState(state).settings).toEqual(state.settings);
  });

  it("exports local icon and background assets needed for full restore", async () => {
    const state: SpeedDialState = {
      schemaVersion: SCHEMA_VERSION,
      settings: {
        ...DEFAULT_SETTINGS,
        background: { kind: "localImageRef", value: "background-ref" }
      },
      shortcuts: {
        a: {
          id: "a",
          name: "Example",
          url: "https://example.com/",
          icon: { kind: "localImageRef", ref: "icon-ref" },
          tileColor: "#ffffff",
          textColor: "#111827",
          createdAt: "2026-06-18T00:00:00.000Z",
          updatedAt: "2026-06-18T00:00:00.000Z"
        }
      },
      shortcutOrder: ["a"]
    };

    await expect(exportStateWithAssets(state)).resolves.toMatchObject({
      formatVersion: 2,
      assets: [
        { ref: "background-ref", data: "data:image/png;base64,background-ref" },
        { ref: "icon-ref", data: "data:image/png;base64,icon-ref" }
      ]
    });
  });

  it("parses native extension JSON", () => {
    const parsed = parseNativeImport({
      app: "new-tab-speed-dial",
      formatVersion: 1,
      settings: DEFAULT_SETTINGS,
      shortcuts: [{ id: "a", name: "Example", url: "example.com" }]
    });

    expect(parsed.shortcutOrder).toEqual(["a"]);
    expect(parsed.shortcuts.a.url).toBe("https://example.com/");
  });

  it("parses older native extension JSON", () => {
    const parsed = parseNativeImport({
      app: "new-tab-speed-dial",
      formatVersion: 1,
      settings: DEFAULT_SETTINGS,
      shortcuts: [{ id: "a", name: "Example", url: "example.com" }]
    });

    expect(parsed.shortcutOrder).toEqual(["a"]);
  });

  it("restores exported assets before returning imported state", async () => {
    const parsed = await importStateWithAssets({
      app: "new-tab-speed-dial",
      formatVersion: 2,
      settings: DEFAULT_SETTINGS,
      shortcuts: [{ id: "a", name: "Example", url: "example.com" }],
      assets: [
        {
          ref: "icon-ref",
          data: "data:image/png;base64,icon",
          mediaType: "image/png",
          createdAt: "2026-06-18T00:00:00.000Z"
        }
      ]
    });

    expect(parsed.shortcutOrder).toEqual(["a"]);
    expect(saveStoredAsset).toHaveBeenCalledWith({
      ref: "icon-ref",
      data: "data:image/png;base64,icon",
      mediaType: "image/png",
      createdAt: "2026-06-18T00:00:00.000Z"
    });
  });

  it("converts nested legacy shortcut JSON", () => {
    const converted = parseLegacyShortcutExport({
      groups: [
        {
          title: "Default",
          dials: [
            { title: "Example", url: "example.com", thumbnail: "https://thumbs.example/logo/example", position: 1 },
            { name: "Youtube", href: "https://www.youtube.com", thumbnail: "https://i.imgur.com/yEC5MsS.png", position: 0 }
          ]
        }
      ]
    });

    expect(converted.settings).toMatchObject({
      columns: 8,
      defaultTileColor: "#444444",
      defaultTextColor: "#FFFFFF"
    });
    expect(converted.shortcuts.map((shortcut) => shortcut.name)).toEqual(["Youtube", "Example"]);
    expect(converted.shortcuts[0].icon).toEqual({ kind: "favicon" });
    expect(converted.shortcuts[1].icon).toEqual({ kind: "favicon" });
    expect(converted.shortcuts[1].url).toBe("https://example.com/");
    expect(converted.shortcuts[1].tileColor).toBe("#444444");
  });

  it("keeps uploaded custom icons but rejects low-quality logo endpoints", () => {
    const converted = parseLegacyShortcutExport({
      dials: [
        { title: "Custom", url: "https://custom.example", thumbnail: "https://uploads.example/icon.png", position: 0 },
        { title: "Low quality", url: "https://low.example", thumbnail: "https://thumbs.example/logo/example.png", position: 1 }
      ]
    });

    expect(converted.shortcuts[0].icon).toEqual({ kind: "url", url: "https://uploads.example/icon.png" });
    expect(converted.shortcuts[1].icon).toEqual({ kind: "favicon" });
  });

  it("auto-detects legacy shortcut imports", () => {
    const parsed = parseImportFile({ dials: [{ title: "Example", url: "example.com" }] });

    expect(parsed.shortcutOrder).toHaveLength(1);
    expect(parsed.shortcuts[parsed.shortcutOrder[0]].name).toBe("Example");
  });
});
