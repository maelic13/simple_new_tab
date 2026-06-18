import { describe, expect, it } from "vitest";

import { discoverIcons, parseIconLinks, parseManifestIcons } from "./iconDiscovery";

function installImageMock(canLoad: (url: string) => boolean): typeof Image {
  const originalImage = globalThis.Image;

  class TestImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    referrerPolicy = "";
    decoding = "";

    set src(value: string) {
      queueMicrotask(() => {
        if (canLoad(value)) {
          this.onload?.();
        } else {
          this.onerror?.();
        }
      });
    }
  }

  globalThis.Image = TestImage as unknown as typeof Image;
  return originalImage;
}

describe("icon discovery", () => {
  it("extracts standard page icon links and resolves relative URLs", () => {
    const parsed = parseIconLinks(
      `
        <link rel="icon" href="/favicon.ico" sizes="32x32">
        <link rel="icon" href="/icon.svg" type="image/svg+xml">
        <link rel="manifest" href="/site.webmanifest">
      `,
      "https://example.com/path/page"
    );

    expect(parsed.manifestUrl).toBe("https://example.com/site.webmanifest");
    expect(parsed.icons.map((icon) => icon.url)).toEqual(["https://example.com/icon.svg", "https://example.com/favicon.ico"]);
  });

  it("sorts full-color scalable icons before large rasters and mask icons", () => {
    const parsed = parseIconLinks(
      `
        <link rel="mask-icon" href="/mask.svg">
        <link rel="apple-touch-icon" href="/apple-512.png" sizes="512x512">
        <link rel="icon" href="/icon.svg" type="image/svg+xml">
        <link rel="icon" href="/favicon.ico" sizes="32x32">
      `,
      "https://example.com/"
    );

    expect(parsed.icons.map((icon) => icon.url)).toEqual([
      "https://example.com/icon.svg",
      "https://example.com/apple-512.png",
      "https://example.com/mask.svg",
      "https://example.com/favicon.ico"
    ]);
  });

  it("extracts and sorts manifest icons by quality", () => {
    const icons = parseManifestIcons(
      {
        icons: [
          { src: "icon-48.png", sizes: "48x48", type: "image/png" },
          { src: "icon-192.png", sizes: "192x192", type: "image/png" }
        ]
      },
      "https://example.com/manifest.json"
    );

    expect(icons.map((icon) => icon.url)).toEqual(["https://example.com/icon-192.png", "https://example.com/icon-48.png"]);
  });

  it("includes site-root favicon candidates before the external fallback", async () => {
    const responses = new Map<string, Response>([
      ["https://example.com/", new Response("<html></html>", { status: 200 })],
      ["https://example.com/favicon.ico", new Response("", { status: 200 })],
      ["https://example.com/favicon.png", new Response("", { status: 404 })],
      ["https://example.com/apple-touch-icon.png", new Response("", { status: 404 })],
      ["https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fexample.com%2F&sz=128", new Response("", { status: 200 })]
    ]);
    const originalFetch = globalThis.fetch;
    const originalImage = installImageMock((url) => responses.get(url)?.ok ?? false);
    globalThis.fetch = ((url: RequestInfo | URL) =>
      Promise.resolve(responses.get(String(url)) ?? new Response("", { status: 404 }))) as typeof fetch;

    try {
      const icons = await discoverIcons("https://example.com/");
      expect(icons.map((icon) => icon.url)).toEqual([
        "https://example.com/favicon.ico",
        "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fexample.com%2F&sz=128"
      ]);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.Image = originalImage;
    }
  });

  it("filters icons that respond but cannot be rendered as images before returning them", async () => {
    const responses = new Map<string, Response>([
      [
        "https://example.com/",
        new Response('<link rel="icon" href="/broken.png" sizes="512x512"><link rel="icon" href="/good.png" sizes="128x128">', { status: 200 })
      ],
      ["https://example.com/favicon.ico", new Response("", { status: 404 })],
      ["https://example.com/favicon.png", new Response("", { status: 404 })],
      ["https://example.com/apple-touch-icon.png", new Response("", { status: 404 })]
    ]);
    const originalFetch = globalThis.fetch;
    const originalImage = installImageMock((url) => url.includes("good.png") || url.includes("google.com/s2/favicons"));
    globalThis.fetch = ((url: RequestInfo | URL) =>
      Promise.resolve(responses.get(String(url)) ?? new Response("", { status: 404 }))) as typeof fetch;

    try {
      const icons = await discoverIcons("https://example.com/");
      expect(icons.map((icon) => icon.url)).toEqual([
        "https://example.com/good.png",
        "https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fexample.com%2F&sz=128"
      ]);
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.Image = originalImage;
    }
  });
});
