import { describe, expect, it } from "vitest";

import { getIconSource } from "./icons";

describe("getIconSource", () => {
  it("uses the generic favicon provider for favicon icons", () => {
    expect(getIconSource({ kind: "favicon" }, "https://example.com/")).toBe(
      "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fexample.com%2F&sz=128"
    );

    expect(getIconSource({ kind: "favicon" }, "https://github.com/")).toBe(
      "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fgithub.com%2F&sz=128"
    );
  });
});
