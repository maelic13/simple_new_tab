import { describe, expect, it } from "vitest";

import { compactOrder, moveItem } from "./order";

describe("moveItem", () => {
  it("moves the active item before the target index", () => {
    expect(moveItem(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
  });

  it("returns the same reference for no-op moves", () => {
    const order = ["a", "b"];
    expect(moveItem(order, "x", "b")).toBe(order);
    expect(moveItem(order, "a", "a")).toBe(order);
  });
});

describe("compactOrder", () => {
  it("removes duplicates and missing shortcut ids", () => {
    expect(compactOrder(["a", "b", "a", "missing"], { a: {}, b: {} })).toEqual(["a", "b"]);
  });
});
