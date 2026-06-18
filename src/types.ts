export const SCHEMA_VERSION = 1;

export type ShortcutIcon =
  | { kind: "favicon" }
  | { kind: "url"; url: string }
  | { kind: "svg"; text: string }
  | { kind: "localImageRef"; ref: string };

export type Background =
  | { kind: "color"; value: string }
  | { kind: "url"; value: string }
  | { kind: "svg"; value: string }
  | { kind: "localImageRef"; value: string };

export type BackgroundMode = "color" | "url" | "upload";

export type ThemeBackground = {
  mode: BackgroundMode;
  color: string;
  url: string;
  upload?: Extract<Background, { kind: "svg" | "localImageRef" }>;
};

export type Shortcut = {
  id: string;
  name: string;
  url: string;
  icon: ShortcutIcon;
  tileColor: string;
  textColor: string;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  columns: number;
  background: Background;
  backgroundByTheme: BackgroundByTheme;
  defaultTileColor: string;
  defaultTextColor: string;
  shortcutAppearanceByTheme: ShortcutAppearanceByTheme;
  tileContentMode: TileContentMode;
  theme: ThemeMode;
  showShortcutActions: boolean;
  showAddShortcutTile: boolean;
  welcomeCompleted: boolean;
  shortcutSize: number;
  shortcutSpacing: number;
  gridVerticalPosition: number;
};

export type TileContentMode = "iconAndName" | "iconOnly" | "nameOnly";
export type ThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";
export type ShortcutAppearance = {
  tileColor: string;
  textColor: string;
};
export type ShortcutAppearanceByTheme = Record<ResolvedThemeMode, ShortcutAppearance>;
export type BackgroundByTheme = Record<ResolvedThemeMode, ThemeBackground>;

export type SpeedDialState = {
  schemaVersion: number;
  settings: Settings;
  shortcuts: Record<string, Shortcut>;
  shortcutOrder: string[];
};

export type SpeedDialExport = {
  app: "new-tab-speed-dial";
  formatVersion: 1 | 2;
  exportedAt: string;
  settings: Settings;
  shortcuts: Shortcut[];
  assets?: ExportedAsset[];
};

export type ExportedAsset = {
  ref: string;
  data: string;
  mediaType: string;
  createdAt: string;
};

export type ColorPreset = {
  name: string;
  tileColor: string;
  textColor: string;
};

export const DEFAULT_TILE_COLOR = "#FFFFFF";
export const DEFAULT_TEXT_COLOR = "#111827";
export const DEFAULT_BACKGROUND_COLOR = "#F5F7FA";
export const DARK_GRAY_TILE_COLOR = "#444444";
export const DARK_GRAY_TEXT_COLOR = "#FFFFFF";
export const LIGHT_GRAY_TILE_COLOR = "#F3F4F6";
export const LIGHT_GRAY_TEXT_COLOR = "#111827";

export const DEFAULT_SHORTCUT_APPEARANCE_BY_THEME: ShortcutAppearanceByTheme = {
  light: { tileColor: LIGHT_GRAY_TILE_COLOR, textColor: LIGHT_GRAY_TEXT_COLOR },
  dark: { tileColor: DARK_GRAY_TILE_COLOR, textColor: DARK_GRAY_TEXT_COLOR }
};

export const DEFAULT_BACKGROUND_BY_THEME: BackgroundByTheme = {
  light: { mode: "color", color: DEFAULT_BACKGROUND_COLOR, url: "" },
  dark: { mode: "color", color: DEFAULT_BACKGROUND_COLOR, url: "" }
};

export const DEFAULT_SETTINGS: Settings = {
  columns: 5,
  background: { kind: "color", value: DEFAULT_BACKGROUND_COLOR },
  backgroundByTheme: DEFAULT_BACKGROUND_BY_THEME,
  defaultTileColor: LIGHT_GRAY_TILE_COLOR,
  defaultTextColor: LIGHT_GRAY_TEXT_COLOR,
  shortcutAppearanceByTheme: DEFAULT_SHORTCUT_APPEARANCE_BY_THEME,
  tileContentMode: "iconAndName",
  theme: "system",
  showShortcutActions: true,
  showAddShortcutTile: true,
  welcomeCompleted: false,
  shortcutSize: 100,
  shortcutSpacing: 50,
  gridVerticalPosition: 55
};

export const COLOR_PRESETS: ColorPreset[] = [
  { name: "Dark gray", tileColor: DARK_GRAY_TILE_COLOR, textColor: DARK_GRAY_TEXT_COLOR },
  { name: "Light gray", tileColor: LIGHT_GRAY_TILE_COLOR, textColor: LIGHT_GRAY_TEXT_COLOR },
  { name: "Light", tileColor: "#FFFFFF", textColor: "#111827" },
  { name: "Charcoal", tileColor: "#24272E", textColor: "#F9FAFB" },
  { name: "Blue", tileColor: "#DBEAFE", textColor: "#1E3A8A" },
  { name: "Green", tileColor: "#DCFCE7", textColor: "#14532D" },
  { name: "Rose", tileColor: "#FFE4E6", textColor: "#881337" },
  { name: "Amber", tileColor: "#FEF3C7", textColor: "#78350F" }
];

export function normalizeShortcutAppearanceByTheme(settings: Pick<Settings, "defaultTileColor" | "defaultTextColor" | "theme"> & Partial<Pick<Settings, "shortcutAppearanceByTheme">>, activeTheme?: ResolvedThemeMode): ShortcutAppearanceByTheme {
  const activeAppearance = {
    tileColor: settings.defaultTileColor,
    textColor: settings.defaultTextColor
  };
  const legacyTheme = activeTheme ?? (settings.theme === "dark" ? "dark" : "light");

  return {
    light: settings.shortcutAppearanceByTheme?.light ?? (legacyTheme === "light" ? activeAppearance : DEFAULT_SHORTCUT_APPEARANCE_BY_THEME.light),
    dark: settings.shortcutAppearanceByTheme?.dark ?? (legacyTheme === "dark" ? activeAppearance : DEFAULT_SHORTCUT_APPEARANCE_BY_THEME.dark)
  };
}

export function getShortcutAppearance(settings: Settings, theme: ResolvedThemeMode): ShortcutAppearance {
  return normalizeShortcutAppearanceByTheme(settings, theme)[theme];
}

function backgroundToThemeBackground(background: Background): ThemeBackground {
  if (background.kind === "color") {
    return { mode: "color", color: background.value, url: "" };
  }

  if (background.kind === "url") {
    return { mode: "url", color: DEFAULT_BACKGROUND_COLOR, url: background.value };
  }

  return { mode: "upload", color: DEFAULT_BACKGROUND_COLOR, url: "", upload: background };
}

function normalizeBackgroundUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function isBackgroundMode(value: unknown): value is BackgroundMode {
  return value === "color" || value === "url" || value === "upload";
}

function normalizeThemeBackground(background: ThemeBackground): ThemeBackground {
  const upload = background.upload?.kind === "svg" || background.upload?.kind === "localImageRef" ? background.upload : undefined;
  const url = normalizeBackgroundUrl(background.url);

  return {
    mode: isBackgroundMode(background.mode) ? background.mode : "color",
    color: background.color || DEFAULT_BACKGROUND_COLOR,
    url,
    ...(upload ? { upload } : {})
  };
}

function isDefaultThemeBackground(background: ThemeBackground | undefined): boolean {
  if (!background) {
    return true;
  }

  const normalized = normalizeThemeBackground({ ...DEFAULT_BACKGROUND_BY_THEME.light, ...background });
  return normalized.mode === "color" && normalized.color === DEFAULT_BACKGROUND_COLOR && normalized.url === "" && !normalized.upload;
}

export function normalizeBackgroundByTheme(settings: Pick<Settings, "background"> & Partial<Pick<Settings, "backgroundByTheme">>): BackgroundByTheme {
  const fallback = backgroundToThemeBackground(settings.background);
  const shouldUseLegacyBackground =
    settings.background.kind !== "color" &&
    (!settings.backgroundByTheme || (isDefaultThemeBackground(settings.backgroundByTheme.light) && isDefaultThemeBackground(settings.backgroundByTheme.dark)));

  if (shouldUseLegacyBackground) {
    const normalizedFallback = normalizeThemeBackground(fallback);
    return {
      light: { ...normalizedFallback },
      dark: { ...normalizedFallback }
    };
  }

  return {
    light: normalizeThemeBackground({ ...fallback, ...settings.backgroundByTheme?.light }),
    dark: normalizeThemeBackground({ ...fallback, ...settings.backgroundByTheme?.dark })
  };
}

export function getThemeBackgroundValue(settings: Settings, theme: ResolvedThemeMode): Background {
  const backgroundByTheme = normalizeBackgroundByTheme(settings);
  const background = backgroundByTheme[theme];

  if (background.mode === "color") {
    return { kind: "color", value: background.color || DEFAULT_BACKGROUND_COLOR };
  }

  if (background.mode === "url" && background.url.trim()) {
    return { kind: "url", value: background.url };
  }

  if (background.mode === "upload" && background.upload) {
    return background.upload;
  }

  return settings.background;
}
