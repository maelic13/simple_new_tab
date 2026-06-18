import { describe, expect, it } from "vitest";

import { parseIconLinks, parseManifestIcons } from "./iconDiscovery";

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
});
