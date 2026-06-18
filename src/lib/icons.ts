import type { Shortcut, ShortcutIcon } from "../types";
import { svgToDataUrl } from "./assets";
import { getFaviconUrl } from "./url";

export function fallbackLetter(name: string): string {
  const trimmed = name.trim();
  return (trimmed[0] ?? "?").toUpperCase();
}

export function getSyncIconSource(shortcut: Shortcut): string | undefined {
  return getIconSource(shortcut.icon, shortcut.url);
}

export function getIconSource(icon: ShortcutIcon, url: string): string | undefined {
  switch (icon.kind) {
    case "favicon":
      return getFaviconUrl(url);
    case "url":
      return icon.url;
    case "svg":
      return svgToDataUrl(icon.text);
    case "localImageRef":
      return undefined;
  }
}
