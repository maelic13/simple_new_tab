import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, SCHEMA_VERSION, type SpeedDialState } from "../types";
import { exportState, parseImportFile, parseLegacyShortcutExport, parseNativeImport } from "./importExport";

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
      formatVersion: 1,
      settings: DEFAULT_SETTINGS,
      shortcuts: [state.shortcuts.a]
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
