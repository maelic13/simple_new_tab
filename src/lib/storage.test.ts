import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, SCHEMA_VERSION, type Shortcut } from "../types";
import { __testGetReplaceStatePayload, __testSnapshotToState } from "./storage";

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
});
