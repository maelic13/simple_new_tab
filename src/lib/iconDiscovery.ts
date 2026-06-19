import { getFaviconUrl } from "./url";

export type DiscoveredIcon = {
  id: string;
  url: string;
  label: string;
  source: "page" | "manifest" | "well-known" | "fallback";
  size?: number;
  type?: string;
};

const ICON_REL_TOKENS = new Set(["icon", "apple-touch-icon", "apple-touch-icon-precomposed", "fluid-icon", "mask-icon"]);

function parseSize(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const sizes = value
    .split(/\s+/)
    .map((size) => {
      const match = /^(\d+)x(\d+)$/i.exec(size);
      return match ? Math.max(Number(match[1]), Number(match[2])) : undefined;
    })
    .filter((size): size is number => Boolean(size));

  return sizes.length ? Math.max(...sizes) : undefined;
}

function resolveUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function getIconScore(icon: DiscoveredIcon): number {
  const extension = icon.url.split(/[?#]/)[0].toLowerCase();
  const isSvg = icon.type?.includes("svg") || extension.endsWith(".svg");
  const isApple = icon.label.toLowerCase().includes("apple");
  const isMask = icon.label.toLowerCase().includes("mask-icon");
  const isFallback = icon.source === "fallback";
  const isWellKnown = icon.source === "well-known";
  const size = icon.size ?? 16;

  if (isFallback) {
    return size;
  }

  if (isSvg && !isMask) {
    return 1_000_000 + size;
  }

  if (isMask) {
    return 100_000 + size;
  }

  if (isWellKnown) {
    return 80_000 + size;
  }

  const rasterBase = size >= 96 || isApple ? 500_000 : 50_000;
  return rasterBase + (isApple ? 10_000 : 0) + size;
}

function uniqueIcons(icons: DiscoveredIcon[]): DiscoveredIcon[] {
  const seen = new Set<string>();
  return icons.filter((icon) => {
    const key = icon.url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortIcons(icons: DiscoveredIcon[]): DiscoveredIcon[] {
  return [...icons].sort((a, b) => getIconScore(b) - getIconScore(a));
}

async function canLoadIcon(url: string): Promise<boolean> {
  if (typeof Image !== "undefined") {
    return canRenderImage(url);
  }

  try {
    const head = await fetch(url, { method: "HEAD", credentials: "omit" });
    if (head.ok) {
      return true;
    }

    if (head.status !== 405 && head.status !== 403) {
      return false;
    }
  } catch {
    // Some sites reject HEAD even when the image itself is valid.
  }

  try {
    const response = await fetch(url, {
      credentials: "omit",
      headers: { Range: "bytes=0-0" }
    });
    return response.ok;
  } catch {
    return false;
  }
}

function canRenderImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      image.src = "";
      resolve(false);
    }, 4_000);

    image.onload = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };

    image.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };

    image.referrerPolicy = "no-referrer";
    image.decoding = "async";
    image.src = url;
  });
}

async function filterLoadableIcons(icons: DiscoveredIcon[]): Promise<DiscoveredIcon[]> {
  const checked = await Promise.all(
    icons.map(async (icon) => ({
      icon,
      canLoad: await canLoadIcon(icon.url)
    }))
  );

  return checked.filter((item) => item.canLoad).map((item) => item.icon);
}

export function parseIconLinks(html: string, pageUrl: string): { icons: DiscoveredIcon[]; manifestUrl?: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const icons: DiscoveredIcon[] = [];
  let manifestUrl: string | undefined;

  doc.querySelectorAll<HTMLLinkElement>("link[rel][href]").forEach((link, index) => {
    const relTokens = link.rel.toLowerCase().split(/\s+/);
    const resolved = resolveUrl(link.getAttribute("href") ?? undefined, pageUrl);
    if (!resolved) {
      return;
    }

    if (relTokens.includes("manifest")) {
      manifestUrl = resolved;
      return;
    }

    const iconRel = relTokens.find((token) => ICON_REL_TOKENS.has(token));
    if (!iconRel) {
      return;
    }

    icons.push({
      id: `page-${index}`,
      url: resolved,
      label: link.getAttribute("rel") ?? "Page icon",
      source: "page",
      size: parseSize(link.getAttribute("sizes")),
      type: link.type || undefined
    });
  });

  return { icons: sortIcons(uniqueIcons(icons)), manifestUrl };
}

export function parseManifestIcons(manifest: unknown, manifestUrl: string): DiscoveredIcon[] {
  if (!manifest || typeof manifest !== "object" || !Array.isArray((manifest as { icons?: unknown }).icons)) {
    return [];
  }

  const icons = (manifest as { icons: unknown[] }).icons.flatMap((entry, index): DiscoveredIcon[] => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const icon = entry as { src?: unknown; sizes?: unknown; type?: unknown; purpose?: unknown };
    if (typeof icon.src !== "string") {
      return [];
    }

    const resolved = resolveUrl(icon.src, manifestUrl);
    if (!resolved) {
      return [];
    }

    return [
      {
        id: `manifest-${index}`,
        url: resolved,
        label: typeof icon.purpose === "string" ? `Manifest icon (${icon.purpose})` : "Manifest icon",
        source: "manifest",
        size: typeof icon.sizes === "string" ? parseSize(icon.sizes) : undefined,
        type: typeof icon.type === "string" ? icon.type : undefined
      }
    ];
  });

  return sortIcons(uniqueIcons(icons));
}

function getWellKnownIcons(pageUrl: string): DiscoveredIcon[] {
  const origin = new URL(pageUrl).origin;

  return [
    {
      id: "well-known-favicon",
      url: `${origin}/favicon.ico`,
      label: "Site favicon",
      source: "well-known",
      size: 64,
      type: "image/x-icon"
    },
    {
      id: "well-known-favicon-png",
      url: `${origin}/favicon.png`,
      label: "Site favicon PNG",
      source: "well-known",
      size: 64,
      type: "image/png"
    },
    {
      id: "well-known-apple-touch-icon",
      url: `${origin}/apple-touch-icon.png`,
      label: "Apple touch icon",
      source: "well-known",
      size: 180,
      type: "image/png"
    }
  ];
}

export async function discoverIcons(pageUrl: string): Promise<DiscoveredIcon[]> {
  let pageIcons: DiscoveredIcon[] = [];
  let manifestUrl: string | undefined;
  let manifestIcons: DiscoveredIcon[] = [];

  try {
    const response = await fetch(pageUrl, { credentials: "omit" });
    if (response.ok) {
      const parsed = parseIconLinks(await response.text(), pageUrl);
      pageIcons = parsed.icons;
      manifestUrl = parsed.manifestUrl;
    }
  } catch {
    // Without broad host permissions, some sites block metadata fetches.
    // Fallback image URLs can still be rendered directly by the browser.
  }

  if (manifestUrl) {
    try {
      const manifestResponse = await fetch(manifestUrl, { credentials: "omit" });
      if (manifestResponse.ok) {
        manifestIcons = parseManifestIcons(await manifestResponse.json(), manifestUrl);
      }
    } catch {
      manifestIcons = [];
    }
  }

  const icons = sortIcons(
    uniqueIcons([
      ...manifestIcons,
      ...pageIcons,
      ...getWellKnownIcons(pageUrl),
      {
        id: "fallback",
        url: getFaviconUrl(pageUrl),
        label: "Fallback favicon",
        source: "fallback",
        size: 128
      }
    ])
  );

  return filterLoadableIcons(icons);
}
