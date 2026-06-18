import { describe, expect, it } from "vitest";

import { assertSyncEntryFits, assertSyncSnapshotFits, canSyncTextAsset, SYNC_QUOTAS } from "./quota";

describe("sync quota helpers", () => {
  it("allows small sync entries", () => {
    expect(() => assertSyncEntryFits("shortcut:1", { name: "Example" })).not.toThrow();
  });

  it("rejects entries above the per-item limit", () => {
    expect(() => assertSyncEntryFits("shortcut:1", { text: "x".repeat(SYNC_QUOTAS.maxItemBytes) })).toThrow(/sync item limit/);
  });

  it("rejects snapshots above the total limit", () => {
    const snapshot = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [`shortcut:${index}`, { text: "x".repeat(7_700) }]));
    expect(() => assertSyncSnapshotFits(snapshot)).toThrow(/total limit/);
  });

  it("classifies oversized SVG text as local-only", () => {
    expect(canSyncTextAsset("<svg />")).toBe(true);
    expect(canSyncTextAsset("x".repeat(8_000))).toBe(false);
  });
});
