import {
  DEFAULT_SETTINGS,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_TILE_COLOR,
  DARK_GRAY_TEXT_COLOR,
  DARK_GRAY_TILE_COLOR,
  SCHEMA_VERSION,
  normalizeBackgroundByTheme,
  normalizeShortcutAppearanceByTheme,
  type ExportedAsset,
  type BackgroundByTheme,
  type Settings,
  type Shortcut,
  type SpeedDialExport,
  type SpeedDialState
} from "../types";
import { loadAsset, saveStoredAsset, type StoredAsset } from "./assets";
import { normalizeShortcutUrl } from "./url";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stableId(input: string, index: number): string {
  let hash = 2166136261;
  const text = `${input}:${index}`;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `imported-${(hash >>> 0).toString(16)}-${index}`;
}

function getString(record: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getNumber(record: UnknownRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function shouldUseFavicon(record: UnknownRecord, url: string): boolean {
  const title = getString(record, ["title", "name", "label"])?.toLowerCase() ?? "";
  const host = new URL(url).hostname.toLowerCase();
  const thumbnail = getString(record, ["icon", "iconUrl", "thumbnail", "thumbnailUrl", "image", "imageUrl"]) ?? "";
  const lowQualityThumbnail = /\/logo(?:\/|[.?]|$)/i.test(thumbnail) || /logo\.clearbit\.com/i.test(thumbnail);

  return (
    title === "youtube" ||
    host.includes("youtube.com") ||
    host.includes("youtu.be") ||
    lowQualityThumbnail
  );
}

function collectRecords(value: unknown, output: UnknownRecord[] = []): UnknownRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecords(item, output);
    }
    return output;
  }

  if (!isRecord(value)) {
    return output;
  }

  const url = getString(value, ["url", "href", "link", "address", "website"]);
  const title = getString(value, ["title", "name", "label"]);
  if (url && title) {
    output.push(value);
  }

  for (const nestedKey of ["dials", "sites", "items", "children", "bookmarks", "pages", "speeddials", "speedDials", "groups"]) {
    if (nestedKey in value) {
      collectRecords(value[nestedKey], output);
    }
  }

  return output;
}

function normalizeImportedShortcut(record: UnknownRecord, index: number): Shortcut | undefined {
  const rawUrl = getString(record, ["url", "href", "link", "address", "website"]);
  if (!rawUrl) {
    return undefined;
  }

  let url: string;
  try {
    url = normalizeShortcutUrl(rawUrl);
  } catch {
    return undefined;
  }

  const name = getString(record, ["title", "name", "label"]) ?? new URL(url).hostname;
  const iconUrl = shouldUseFavicon(record, url) ? undefined : getString(record, ["icon", "iconUrl", "thumbnail", "thumbnailUrl", "image", "imageUrl"]);
  const now = new Date().toISOString();

  return {
    id: stableId(url, index),
    name,
    url,
    icon: iconUrl ? { kind: "url", url: iconUrl } : { kind: "favicon" },
    tileColor: DEFAULT_TILE_COLOR,
    textColor: DEFAULT_TEXT_COLOR,
    createdAt: now,
    updatedAt: now
  };
}

function byShortcutPosition(a: UnknownRecord, b: UnknownRecord): number {
  const aPosition = getNumber(a, ["position", "order", "index"]);
  const bPosition = getNumber(b, ["position", "order", "index"]);

  if (aPosition === undefined && bPosition === undefined) {
    return 0;
  }

  if (aPosition === undefined) {
    return 1;
  }

  if (bPosition === undefined) {
    return -1;
  }

  return aPosition - bPosition;
}

function completeSettings(value: unknown): Settings {
  const rawSettings = isRecord(value) ? value : {};
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings } as Settings;
  settings.shortcutAppearanceByTheme = normalizeShortcutAppearanceByTheme(settings);
  settings.backgroundByTheme = normalizeBackgroundByTheme({
    background: settings.background,
    ...(Object.prototype.hasOwnProperty.call(rawSettings, "backgroundByTheme") ? { backgroundByTheme: rawSettings.backgroundByTheme as BackgroundByTheme } : {})
  });
  return settings;
}

function sanitizeBackgroundByThemeForExport(backgroundByTheme: BackgroundByTheme): BackgroundByTheme {
  return {
    light: sanitizeThemeBackgroundForExport(backgroundByTheme.light),
    dark: sanitizeThemeBackgroundForExport(backgroundByTheme.dark)
  };
}

function sanitizeThemeBackgroundForExport(background: BackgroundByTheme["light"]): BackgroundByTheme["light"] {
  if (background.upload?.kind !== "localImageRef") {
    return background;
  }

  if (background.mode === "upload") {
    return {
      ...background,
      mode: "color",
      color: DEFAULT_BACKGROUND_COLOR,
      upload: undefined
    };
  }

  return {
    ...background,
    upload: undefined
  };
}

function sanitizeSettingsForExport(settings: Settings): Settings {
  const completed = completeSettings(settings);
  const backgroundByTheme = sanitizeBackgroundByThemeForExport(completed.backgroundByTheme);
  const background = completed.background.kind === "localImageRef" ? { kind: "color" as const, value: DEFAULT_BACKGROUND_COLOR } : completed.background;

  return {
    ...completed,
    background,
    backgroundByTheme
  };
}

export function exportState(state: SpeedDialState): SpeedDialExport {
  return {
    app: "new-tab-speed-dial",
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    settings: sanitizeSettingsForExport(state.settings),
    shortcuts: state.shortcutOrder.map((id) => state.shortcuts[id]).filter((shortcut): shortcut is Shortcut => Boolean(shortcut))
  };
}

function getLocalAssetRefs(state: SpeedDialState): string[] {
  const refs = new Set<string>();

  for (const shortcut of Object.values(state.shortcuts)) {
    if (shortcut.icon.kind === "localImageRef") {
      refs.add(shortcut.icon.ref);
    }
  }

  return Array.from(refs);
}

export async function exportStateWithAssets(state: SpeedDialState): Promise<SpeedDialExport> {
  const exported = exportState(state);
  const assets = (
    await Promise.all(
      getLocalAssetRefs(state).map(async (ref) => {
        try {
          return await loadAsset(ref);
        } catch {
          return undefined;
        }
      })
    )
  ).filter((asset): asset is StoredAsset => Boolean(asset));

  return assets.length ? { ...exported, assets } : exported;
}

export function parseNativeImport(value: unknown): SpeedDialState {
  if (!isRecord(value) || value.app !== "new-tab-speed-dial" || (value.formatVersion !== 1 && value.formatVersion !== 2) || !Array.isArray(value.shortcuts)) {
    throw new Error("Unsupported import file.");
  }

  const settings = completeSettings(value.settings);
  const shortcuts: Record<string, Shortcut> = {};
  const shortcutOrder: string[] = [];

  value.shortcuts.forEach((item, index) => {
    if (!isRecord(item)) {
      return;
    }

    const shortcut = normalizeImportedShortcut(item, index);
    if (!shortcut) {
      return;
    }

    const id = typeof item.id === "string" && item.id ? item.id : shortcut.id;
    shortcuts[id] = { ...shortcut, ...item, id, url: shortcut.url, icon: isRecord(item.icon) ? (item.icon as Shortcut["icon"]) : shortcut.icon };
    shortcutOrder.push(id);
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    settings,
    shortcuts,
    shortcutOrder
  };
}

export function parseLegacyShortcutExport(value: unknown): SpeedDialExport {
  const records = collectRecords(value).sort(byShortcutPosition);
  const seen = new Set<string>();
  const shortcuts: Shortcut[] = [];

  records.forEach((record) => {
    const shortcut = normalizeImportedShortcut(record, shortcuts.length);
    if (!shortcut || seen.has(shortcut.url)) {
      return;
    }

    seen.add(shortcut.url);
    shortcuts.push({
      ...shortcut,
      tileColor: DARK_GRAY_TILE_COLOR,
      textColor: DARK_GRAY_TEXT_COLOR
    });
  });

  if (shortcuts.length === 0) {
    throw new Error("No shortcuts were found in the import file.");
  }

  return {
    app: "new-tab-speed-dial",
    formatVersion: 2,
    exportedAt: new Date().toISOString(),
    settings: {
      ...DEFAULT_SETTINGS,
      columns: 8,
      background: { kind: "color", value: DEFAULT_SETTINGS.background.value },
      defaultTileColor: DARK_GRAY_TILE_COLOR,
      defaultTextColor: DARK_GRAY_TEXT_COLOR,
      shortcutAppearanceByTheme: {
        ...DEFAULT_SETTINGS.shortcutAppearanceByTheme,
        dark: { tileColor: DARK_GRAY_TILE_COLOR, textColor: DARK_GRAY_TEXT_COLOR }
      },
      tileContentMode: "iconAndName"
    },
    shortcuts
  };
}

function parseExportedAssets(value: unknown): ExportedAsset[] {
  if (!isRecord(value) || !Array.isArray(value.assets)) {
    return [];
  }

  return value.assets.filter((asset): asset is ExportedAsset => {
    if (!isRecord(asset)) {
      return false;
    }

    return (
      typeof asset.ref === "string" &&
      typeof asset.data === "string" &&
      typeof asset.mediaType === "string" &&
      typeof asset.createdAt === "string"
    );
  });
}

export async function restoreImportedAssets(assets: ExportedAsset[]): Promise<void> {
  await Promise.all(assets.map((asset) => saveStoredAsset(asset)));
}

export function parseImportFile(value: unknown): SpeedDialState {
  if (isRecord(value) && value.app === "new-tab-speed-dial") {
    return parseNativeImport(value);
  }

  return parseNativeImport(parseLegacyShortcutExport(value));
}

export async function importStateWithAssets(value: unknown): Promise<SpeedDialState> {
  const state = parseImportFile(value);
  await restoreImportedAssets(parseExportedAssets(value));
  return state;
}
