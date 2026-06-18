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
  tileContentMode: TileContentMode;
  theme: ThemeMode;
  showShortcutActions: boolean;
};

export type TileContentMode = "iconAndName" | "iconOnly" | "nameOnly";
export type ThemeMode = "light" | "dark";

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

export const DEFAULT_SETTINGS: Settings = {
  columns: 5,
  background: { kind: "color", value: DEFAULT_BACKGROUND_COLOR },
  defaultTileColor: DEFAULT_TILE_COLOR,
  defaultTextColor: DEFAULT_TEXT_COLOR,
  tileContentMode: "iconAndName",
  theme: "light",
  showShortcutActions: true
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
