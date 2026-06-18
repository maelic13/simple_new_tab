import { describe, expect, it } from "vitest";

import { getDomainLabel, normalizeShortcutUrl } from "./url";

describe("normalizeShortcutUrl", () => {
  it("adds https when no scheme is provided", () => {
    expect(normalizeShortcutUrl("example.com")).toBe("https://example.com/");
    expect(normalizeShortcutUrl("localhost:3000")).toBe("https://localhost:3000/");
  });

  it("keeps valid http and https URLs", () => {
    expect(normalizeShortcutUrl("http://example.com/path")).toBe("http://example.com/path");
    expect(normalizeShortcutUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("rejects unsupported schemes", () => {
    expect(() => normalizeShortcutUrl("javascript:alert(1)")).toThrow("Only http and https URLs are supported.");
  });
});

describe("getDomainLabel", () => {
  it("returns a compact host label", () => {
    expect(getDomainLabel("https://www.example.com/path")).toBe("example.com");
  });
});
