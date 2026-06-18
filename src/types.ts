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
  defaultTileColor: string;
  defaultTextColor: string;
  shortcutAppearanceByTheme: ShortcutAppearanceByTheme;
  tileContentMode: TileContentMode;
  theme: ThemeMode;
  showShortcutActions: boolean;
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

export type SpeedDialState = {
  schemaVersion: number;
  settings: Settings;
  shortcuts: Record<string, Shortcut>;
  shortcutOrder: string[];
};

export type SpeedDialExport = {
  app: "new-tab-speed-dial";
  formatVersion: 1;
  exportedAt: string;
  settings: Settings;
  shortcuts: Shortcut[];
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

export const DEFAULT_SETTINGS: Settings = {
  columns: 5,
  background: { kind: "color", value: DEFAULT_BACKGROUND_COLOR },
  defaultTileColor: LIGHT_GRAY_TILE_COLOR,
  defaultTextColor: LIGHT_GRAY_TEXT_COLOR,
  shortcutAppearanceByTheme: DEFAULT_SHORTCUT_APPEARANCE_BY_THEME,
  tileContentMode: "iconAndName",
  theme: "system",
  showShortcutActions: true,
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
