import { useEffect, useState } from "react";
import { Download, Link, Palette, Pipette, Plus, RotateCcw, Upload, X } from "lucide-react";

import { deleteAsset, fileLooksLikeSvg, readFileAsDataUrl, readFileAsText, saveAsset, svgToDataUrl } from "../lib/assets";
import { canSyncTextAsset } from "../lib/quota";
import { normalizeShortcutUrl } from "../lib/url";
import {
  COLOR_PRESETS,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_SHORTCUT_APPEARANCE_BY_THEME,
  getShortcutAppearance,
  normalizeBackgroundByTheme,
  normalizeShortcutAppearanceByTheme,
  type Background,
  type BackgroundByTheme,
  type BackgroundMode,
  type ResolvedThemeMode,
  type Settings,
  type ShortcutAppearanceByTheme,
  type ThemeBackground,
  type ThemeMode,
  type TileContentMode
} from "../types";

type SettingsPanelProps = {
  settings: Settings;
  resolvedTheme: ResolvedThemeMode;
  onClose: () => void;
  onSave: (settings: Settings, options?: { applyShortcutDefaults?: boolean }) => Promise<void>;
  onPreview: (settings: Settings) => void;
  onImport: (file: File) => Promise<void>;
  onExport: () => void;
  onResetToDefaults: () => Promise<void>;
  onAddShortcut: () => void;
};

function getInitialBackgroundColor(background: Background): string {
  return background.kind === "color" ? background.value : DEFAULT_BACKGROUND_COLOR;
}

type DraftThemeBackground = ThemeBackground & {
  file?: File;
  fileName?: string;
  previewDataUrl?: string;
};

type DraftBackgroundByTheme = Record<ResolvedThemeMode, DraftThemeBackground>;

const BACKGROUND_THEMES: ResolvedThemeMode[] = ["light", "dark"];

function getActiveAppearanceTheme(theme: ThemeMode, resolvedTheme: ResolvedThemeMode): ResolvedThemeMode {
  return theme === "system" ? resolvedTheme : theme;
}

function getReadableTextColor(backgroundColor: string): string {
  const hex = backgroundColor.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(hex)) {
    return "#111827";
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.55 ? "#111827" : "#FFFFFF";
}

function getPreviewUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return normalizeShortcutUrl(trimmed);
  } catch {
    return trimmed;
  }
}

function toDraftBackgroundByTheme(settings: Settings): DraftBackgroundByTheme {
  const backgroundByTheme = normalizeBackgroundByTheme(settings);
  return {
    light: { ...backgroundByTheme.light },
    dark: { ...backgroundByTheme.dark }
  };
}

function getBackgroundFromDraft(background: DraftThemeBackground, fallback: Background): Background {
  if (background.mode === "color") {
    return { kind: "color", value: background.color || DEFAULT_BACKGROUND_COLOR };
  }

  if (background.mode === "url") {
    const url = getPreviewUrl(background.url);
    return url ? { kind: "url", value: url } : fallback;
  }

  if (background.previewDataUrl) {
    return { kind: "url", value: background.previewDataUrl };
  }

  if (background.upload) {
    return background.upload;
  }

  return { kind: "color", value: DEFAULT_BACKGROUND_COLOR };
}

function toStoredThemeBackground(background: DraftThemeBackground, upload?: ThemeBackground["upload"]): ThemeBackground {
  let url = background.url.trim();
  if (url) {
    try {
      url = normalizeShortcutUrl(url);
    } catch {
      // Keep the draft value for live preview; Apply will surface invalid URLs.
    }
  }

  return {
    mode: background.mode,
    color: background.color || DEFAULT_BACKGROUND_COLOR,
    url,
    ...(upload ? { upload } : background.upload ? { upload: background.upload } : {})
  };
}

export function SettingsPanel({ settings, resolvedTheme, onClose, onSave, onPreview, onImport, onExport, onResetToDefaults, onAddShortcut }: SettingsPanelProps) {
  const initialAppearanceTheme = getActiveAppearanceTheme(settings.theme, resolvedTheme);
  const initialAppearanceByTheme = normalizeShortcutAppearanceByTheme(settings, initialAppearanceTheme);
  const initialAppearance = initialAppearanceByTheme[initialAppearanceTheme];
  const [columns, setColumns] = useState(settings.columns);
  const [columnsDraft, setColumnsDraft] = useState(String(settings.columns));
  const [shortcutSize, setShortcutSize] = useState(settings.shortcutSize);
  const [shortcutSizeDraft, setShortcutSizeDraft] = useState(String(settings.shortcutSize));
  const [shortcutSpacing, setShortcutSpacing] = useState(settings.shortcutSpacing);
  const [shortcutSpacingDraft, setShortcutSpacingDraft] = useState(String(settings.shortcutSpacing));
  const [gridVerticalPosition, setGridVerticalPosition] = useState(settings.gridVerticalPosition);
  const [gridVerticalPositionDraft, setGridVerticalPositionDraft] = useState(String(settings.gridVerticalPosition));
  const [shortcutAppearanceByTheme, setShortcutAppearanceByTheme] = useState<ShortcutAppearanceByTheme>(initialAppearanceByTheme);
  const [defaultTileColor, setDefaultTileColor] = useState(initialAppearance.tileColor);
  const [defaultTextColor, setDefaultTextColor] = useState(initialAppearance.textColor);
  const [theme, setTheme] = useState<ThemeMode>(settings.theme);
  const [tileContentMode, setTileContentMode] = useState<TileContentMode>(settings.tileContentMode);
  const [showShortcutActions, setShowShortcutActions] = useState(settings.showShortcutActions);
  const [showAddShortcutTile, setShowAddShortcutTile] = useState(settings.showAddShortcutTile);
  const [draftBackgroundByTheme, setDraftBackgroundByTheme] = useState<DraftBackgroundByTheme>(() => toDraftBackgroundByTheme(settings));
  const [isCustomBackgroundOpen, setIsCustomBackgroundOpen] = useState(false);
  const [customBackgroundColor, setCustomBackgroundColor] = useState(getInitialBackgroundColor(settings.background));
  const [customBackgroundDraft, setCustomBackgroundDraft] = useState(getInitialBackgroundColor(settings.background));
  const [customBackgroundPrevious, setCustomBackgroundPrevious] = useState(getInitialBackgroundColor(settings.background));
  const [customBackgroundOriginal, setCustomBackgroundOriginal] = useState(getInitialBackgroundColor(settings.background));
  const [error, setError] = useState<string | undefined>();
  const [importMessage, setImportMessage] = useState<string | undefined>();
  const [saveMessage, setSaveMessage] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const activeAppearanceTheme = getActiveAppearanceTheme(theme, resolvedTheme);
  const activeBackgroundTheme = activeAppearanceTheme;
  const activeBackgroundDraft = draftBackgroundByTheme[activeBackgroundTheme];
  const backgroundMode = activeBackgroundDraft.mode;

  useEffect(() => {
    const nextAppearanceTheme = getActiveAppearanceTheme(settings.theme, resolvedTheme);
    const nextAppearanceByTheme = normalizeShortcutAppearanceByTheme(settings, nextAppearanceTheme);
    const nextAppearance = nextAppearanceByTheme[nextAppearanceTheme];

    setColumns(settings.columns);
    setColumnsDraft(String(settings.columns));
    setShortcutSize(settings.shortcutSize);
    setShortcutSizeDraft(String(settings.shortcutSize));
    setShortcutSpacing(settings.shortcutSpacing);
    setShortcutSpacingDraft(String(settings.shortcutSpacing));
    setGridVerticalPosition(settings.gridVerticalPosition);
    setGridVerticalPositionDraft(String(settings.gridVerticalPosition));
    setShortcutAppearanceByTheme(nextAppearanceByTheme);
    setDefaultTileColor(nextAppearance.tileColor);
    setDefaultTextColor(nextAppearance.textColor);
    setTheme(settings.theme);
    setTileContentMode(settings.tileContentMode);
    setShowShortcutActions(settings.showShortcutActions);
    setShowAddShortcutTile(settings.showAddShortcutTile);
    const nextBackgroundByTheme = toDraftBackgroundByTheme(settings);
    const nextBackground = nextBackgroundByTheme[nextAppearanceTheme];
    setDraftBackgroundByTheme(nextBackgroundByTheme);
    setCustomBackgroundColor(nextBackground.color);
    setCustomBackgroundDraft(nextBackground.color);
    setCustomBackgroundPrevious(nextBackground.color);
    setCustomBackgroundOriginal(nextBackground.color);
    setIsCustomBackgroundOpen(false);
  }, [settings]);

  async function saveNextSettings(nextSettings: Settings, options?: { applyShortcutDefaults?: boolean }): Promise<boolean> {
    setError(undefined);
    setSaveMessage(undefined);
    setIsSaving(true);

    try {
      await onSave(nextSettings, options);
      setSaveMessage("Saved.");
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save settings.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  function getValidColumns(value: number): number {
    return getValidNumber(value, 2, 12);
  }

  function getValidNumber(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  function updateColumns(value: number) {
    const nextColumns = getValidColumns(value);
    setColumns(nextColumns);
    setColumnsDraft(String(nextColumns));
  }

  function commitColumnsDraft() {
    const parsed = Number(columnsDraft);
    updateColumns(Number.isFinite(parsed) ? parsed : columns);
  }

  function updateShortcutSize(value: number) {
    const nextValue = getValidNumber(value, 50, 140);
    setShortcutSize(nextValue);
    setShortcutSizeDraft(String(nextValue));
  }

  function commitShortcutSizeDraft() {
    const parsed = Number(shortcutSizeDraft);
    updateShortcutSize(Number.isFinite(parsed) ? parsed : shortcutSize);
  }

  function updateShortcutSpacing(value: number) {
    const nextValue = getValidNumber(value, 0, 100);
    setShortcutSpacing(nextValue);
    setShortcutSpacingDraft(String(nextValue));
  }

  function commitShortcutSpacingDraft() {
    const parsed = Number(shortcutSpacingDraft);
    updateShortcutSpacing(Number.isFinite(parsed) ? parsed : shortcutSpacing);
  }

  function updateGridVerticalPosition(value: number) {
    const nextValue = getValidNumber(value, 0, 100);
    setGridVerticalPosition(nextValue);
    setGridVerticalPositionDraft(String(nextValue));
  }

  function commitGridVerticalPositionDraft() {
    const parsed = Number(gridVerticalPositionDraft);
    updateGridVerticalPosition(Number.isFinite(parsed) ? parsed : gridVerticalPosition);
  }

  function currentSettings(overrides: Partial<Settings> = {}): Settings {
    const nextShortcutAppearanceByTheme = {
      ...DEFAULT_SHORTCUT_APPEARANCE_BY_THEME,
      ...shortcutAppearanceByTheme,
      [activeAppearanceTheme]: {
        tileColor: defaultTileColor,
        textColor: defaultTextColor
      }
    };

    return {
      ...settings,
      columns,
      shortcutSize,
      shortcutSpacing,
      gridVerticalPosition,
      defaultTileColor,
      defaultTextColor,
      shortcutAppearanceByTheme: nextShortcutAppearanceByTheme,
      theme,
      tileContentMode,
      showShortcutActions,
      showAddShortcutTile,
      background: getPreviewBackground(),
      backgroundByTheme: stripDraftBackgrounds(draftBackgroundByTheme),
      ...overrides
    };
  }

  function stripDraftBackgrounds(drafts: DraftBackgroundByTheme): BackgroundByTheme {
    return {
      light: toStoredThemeBackground(drafts.light),
      dark: toStoredThemeBackground(drafts.dark)
    };
  }

  function updateThemeBackground(overrides: Partial<DraftThemeBackground>) {
    setDraftBackgroundByTheme((current) => ({
      ...current,
      [activeBackgroundTheme]: {
        ...current[activeBackgroundTheme],
        ...overrides
      }
    }));
  }

  function getPreviewBackground(): Background {
    return getBackgroundFromDraft(activeBackgroundDraft, settings.background);
  }

  useEffect(() => {
    onPreview(currentSettings());
  }, [
    columns,
    shortcutSize,
    shortcutSpacing,
    gridVerticalPosition,
    defaultTileColor,
    defaultTextColor,
    shortcutAppearanceByTheme,
    theme,
    tileContentMode,
    showShortcutActions,
    showAddShortcutTile,
    draftBackgroundByTheme
  ]);

  function updateShortcutAppearance(tileColor: string, textColor: string) {
    setShortcutAppearanceByTheme((current) => ({
      ...current,
      [activeAppearanceTheme]: { tileColor, textColor }
    }));
    setDefaultTileColor(tileColor);
    setDefaultTextColor(textColor);
  }

  function loadShortcutAppearance(theme: ResolvedThemeMode) {
    const appearance = shortcutAppearanceByTheme[theme] ?? DEFAULT_SHORTCUT_APPEARANCE_BY_THEME[theme];
    setDefaultTileColor(appearance.tileColor);
    setDefaultTextColor(appearance.textColor);
  }

  useEffect(() => {
    if (theme === "system") {
      loadShortcutAppearance(resolvedTheme);
      loadBackground(resolvedTheme);
    }
  }, [resolvedTheme, theme]);

  function updateTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    loadShortcutAppearance(getActiveAppearanceTheme(nextTheme, resolvedTheme));
    loadBackground(getActiveAppearanceTheme(nextTheme, resolvedTheme));
  }

  function loadBackground(theme: ResolvedThemeMode) {
    const nextBackground = draftBackgroundByTheme[theme];
    setCustomBackgroundColor(nextBackground.color);
    setCustomBackgroundDraft(nextBackground.color);
    setCustomBackgroundPrevious(nextBackground.color);
    setCustomBackgroundOriginal(nextBackground.color);
    setIsCustomBackgroundOpen(false);
  }

  function updateBackgroundMode(nextMode: BackgroundMode) {
    updateThemeBackground({ mode: nextMode });

    if (nextMode === "color") {
      setCustomBackgroundColor(activeBackgroundDraft.color);
      setCustomBackgroundDraft(activeBackgroundDraft.color);
    }
  }

  function openCustomBackground() {
    if (!isCustomBackgroundOpen) {
      setCustomBackgroundPrevious(activeBackgroundDraft.color);
      setCustomBackgroundOriginal(customBackgroundColor);
      setCustomBackgroundDraft(customBackgroundColor);
    }
    setIsCustomBackgroundOpen(true);
  }

  function previewCustomBackground(value: string) {
    setCustomBackgroundColor(value);
    setCustomBackgroundDraft(value);
    updateThemeBackground({ color: value });
  }

  function cancelCustomBackground() {
    setCustomBackgroundColor(customBackgroundOriginal);
    setCustomBackgroundDraft(customBackgroundPrevious);
    updateThemeBackground({ color: customBackgroundPrevious });
    setIsCustomBackgroundOpen(false);
  }

  function applyCustomBackground() {
    updateThemeBackground({ color: customBackgroundDraft });
    setIsCustomBackgroundOpen(false);
  }

  async function handleApply() {
    setError(undefined);

    try {
      const nextBackgroundByTheme = await buildBackgroundByTheme();
      const background = getBackgroundFromDraft(nextBackgroundByTheme[activeBackgroundTheme], settings.background);
      const nextSettings = currentSettings({ background, backgroundByTheme: nextBackgroundByTheme });
      const nextAppearanceTheme = getActiveAppearanceTheme(nextSettings.theme, resolvedTheme);
      const previousAppearance = getShortcutAppearance(settings, nextAppearanceTheme);
      const nextAppearance = getShortcutAppearance(nextSettings, nextAppearanceTheme);
      const shouldApplyShortcutDefaults =
        nextSettings.theme !== settings.theme ||
        nextAppearance.tileColor !== previousAppearance.tileColor ||
        nextAppearance.textColor !== previousAppearance.textColor;

      const didSave = await saveNextSettings(nextSettings, shouldApplyShortcutDefaults ? { applyShortcutDefaults: true } : undefined);
      if (didSave) {
        await deleteReplacedBackgroundAssets(nextBackgroundByTheme);
        onClose();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save settings.");
    }
  }

  async function buildBackgroundByTheme(): Promise<BackgroundByTheme> {
    const nextEntries = await Promise.all(
      BACKGROUND_THEMES.map(async (theme) => {
        const draft = draftBackgroundByTheme[theme];
        const upload = draft.file ? await buildUploadBackground(draft) : draft.upload;
        return [theme, toStoredThemeBackground(draft, upload)] as const;
      })
    );

    return Object.fromEntries(nextEntries) as BackgroundByTheme;
  }

  async function buildUploadBackground(background: DraftThemeBackground): Promise<ThemeBackground["upload"]> {
    if (!background.file) {
      return background.upload;
    }

    if (fileLooksLikeSvg(background.file)) {
      const text = (await readFileAsText(background.file)).trim();
      if (canSyncTextAsset(text)) {
        return { kind: "svg", value: text };
      }

      const ref = await saveAsset(svgToDataUrl(text), "image/svg+xml");
      return { kind: "localImageRef", value: ref };
    }

    const ref = await saveAsset(await readFileAsDataUrl(background.file), background.file.type || "application/octet-stream");
    return { kind: "localImageRef", value: ref };
  }

  async function deleteReplacedBackgroundAssets(nextBackgroundByTheme: BackgroundByTheme) {
    const previousBackgroundByTheme = normalizeBackgroundByTheme(settings);
    const nextLocalRefs = new Set(
      Object.values(nextBackgroundByTheme)
        .map((background) => background.upload)
        .filter((upload): upload is Extract<Background, { kind: "localImageRef" }> => upload?.kind === "localImageRef")
        .map((upload) => upload.value)
    );

    await Promise.all(
      BACKGROUND_THEMES.map(async (theme) => {
        const previous = previousBackgroundByTheme[theme].upload;
        if (previous?.kind !== "localImageRef" || nextLocalRefs.has(previous.value)) {
          return;
        }

        await deleteAsset(previous.value);
      })
    );
  }

  async function handleImport(file: File | undefined) {
    if (!file) {
      return;
    }

    setError(undefined);
    setImportMessage(undefined);
    setIsImporting(true);

    try {
      await onImport(file);
      setImportMessage("Import complete.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to import file.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleResetToDefaults() {
    if (!window.confirm("Reset settings and remove all shortcuts? This cannot be undone unless you have an export.")) {
      return;
    }

    setError(undefined);
    setSaveMessage(undefined);
    setIsResetting(true);

    try {
      await onResetToDefaults();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to reset defaults.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <aside className="settings-shell" aria-label="Settings">
      <section className="settings-panel">
        <div className="dialog-header">
          <h2>Settings</h2>
          <button className="icon-button" type="button" title="Close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-scroll">
          <section className="settings-section">
          <h3>Theme</h3>
          <div className="segmented-control three theme-toggle" aria-label="Theme">
            <button type="button" className={theme === "system" ? "active" : ""} onClick={() => updateTheme("system")}>
              System
            </button>
            <button type="button" className={theme === "light" ? "active" : ""} onClick={() => updateTheme("light")}>
              Light
            </button>
            <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => updateTheme("dark")}>
              Dark
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h3>Shortcuts</h3>
          <div className="import-export-panel" aria-label="Import and export">
            <button className="button secondary" type="button" onClick={onAddShortcut}>
              <Plus size={16} />
              Add
            </button>
            <button className="button secondary" type="button" onClick={onExport}>
              <Download size={16} />
              Export
            </button>
            <label className="button secondary file-button">
              <Upload size={16} />
              Import
              <input
                type="file"
                accept="application/json,.json"
                disabled={isImporting}
                onChange={(event) => {
                  void handleImport(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </section>
        {importMessage ? <p className="form-success">{importMessage}</p> : null}

        <section className="settings-section">
          <h3>Layout</h3>
          <label className="field columns-field">
            <span>Columns</span>
            <div className="columns-control">
              <input
                type="range"
                min="2"
                max="12"
                value={columns}
                aria-label="Columns slider"
                onChange={(event) => updateColumns(Number(event.target.value))}
              />
              <input
                className="number-input"
                type="number"
                min="2"
                max="12"
                value={columnsDraft}
                aria-label="Column count"
                onChange={(event) => setColumnsDraft(event.target.value)}
                onBlur={commitColumnsDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <small>Allowed: 2-12 columns.</small>
          </label>

          <label className="field">
            <span>Shortcut size</span>
            <div className="columns-control">
              <input
                type="range"
                min="50"
                max="140"
                value={shortcutSize}
                aria-label="Shortcut size slider"
                onChange={(event) => updateShortcutSize(Number(event.target.value))}
              />
              <input
                className="number-input"
                type="number"
                min="50"
                max="140"
                value={shortcutSizeDraft}
                aria-label="Shortcut size"
                onChange={(event) => setShortcutSizeDraft(event.target.value)}
                onBlur={commitShortcutSizeDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <small>Relative size, 50-140.</small>
          </label>

          <label className="field">
            <span>Shortcut spacing</span>
            <div className="columns-control">
              <input
                type="range"
                min="0"
                max="100"
                value={shortcutSpacing}
                aria-label="Shortcut spacing slider"
                onChange={(event) => updateShortcutSpacing(Number(event.target.value))}
              />
              <input
                className="number-input"
                type="number"
                min="0"
                max="100"
                value={shortcutSpacingDraft}
                aria-label="Shortcut spacing"
                onChange={(event) => setShortcutSpacingDraft(event.target.value)}
                onBlur={commitShortcutSpacingDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <small>Relative gap, 0-100.</small>
          </label>

          <label className="field">
            <span>Vertical position</span>
            <div className="columns-control">
              <input
                type="range"
                min="0"
                max="100"
                value={gridVerticalPosition}
                aria-label="Vertical position slider"
                onChange={(event) => updateGridVerticalPosition(Number(event.target.value))}
              />
              <input
                className="number-input"
                type="number"
                min="0"
                max="100"
                value={gridVerticalPositionDraft}
                aria-label="Vertical position"
                onChange={(event) => setGridVerticalPositionDraft(event.target.value)}
                onBlur={commitGridVerticalPositionDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
            <small>0 is higher, 100 is lower.</small>
          </label>

          <label className="field">
            <span>Shortcut content</span>
            <select
              value={tileContentMode}
              onChange={(event) => {
                const nextMode = event.target.value as TileContentMode;
                setTileContentMode(nextMode);
              }}
            >
              <option value="iconAndName">Icon and name</option>
              <option value="iconOnly">Icon only</option>
              <option value="nameOnly">Name only</option>
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h3>Shortcut appearance</h3>
          <div className="appearance-grid">
            <label className="toggle-row">
              <input
                type="checkbox"
                checked={showShortcutActions}
                onChange={(event) => {
                  const nextValue = event.target.checked;
                  setShowShortcutActions(nextValue);
                }}
              />
              <span>
                <strong>Show hover buttons</strong>
                <small>Edit and remove buttons appear on shortcuts. Right-click works either way.</small>
              </span>
            </label>

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={showAddShortcutTile}
                onChange={(event) => {
                  setShowAddShortcutTile(event.target.checked);
                }}
              />
              <span>
                <strong>Show add shortcut tile</strong>
                <small>Keep a plus tile at the end of the grid for quickly creating shortcuts.</small>
              </span>
            </label>

            <div className="color-section">
              <span className="field-title">Presets</span>
              <div className="swatch-row">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="swatch"
                    title={preset.name}
                    aria-label={preset.name}
                    style={{ backgroundColor: preset.tileColor, color: preset.textColor }}
                    onClick={() => {
                      updateShortcutAppearance(preset.tileColor, preset.textColor);
                    }}
                  >
                    <span>Aa</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="compact-color-grid">
              <label className="field color-field">
                <span>Tile color</span>
                <input
                  type="color"
                  value={defaultTileColor}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateShortcutAppearance(value, defaultTextColor);
                  }}
                />
              </label>

              <label className="field color-field">
                <span>Text color</span>
                <input
                  type="color"
                  value={defaultTextColor}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateShortcutAppearance(defaultTileColor, value);
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Background</h3>
          <fieldset className="segmented-field" aria-label="Background">
            <div className="segmented-control three">
              <button
                type="button"
                className={backgroundMode === "color" ? "active" : ""}
                onClick={() => {
                  updateBackgroundMode("color");
                }}
              >
                <Palette size={15} />
                Color
              </button>
              <button type="button" className={backgroundMode === "url" ? "active" : ""} onClick={() => updateBackgroundMode("url")}>
                <Link size={15} />
                URL
              </button>
              <button type="button" className={backgroundMode === "upload" ? "active" : ""} onClick={() => updateBackgroundMode("upload")}>
                <Upload size={15} />
                Upload image
              </button>
            </div>
          </fieldset>

          {backgroundMode === "color" ? (
            <div className="color-section">
              <span className="field-title">Presets</span>
              <div className="swatch-row">
                {[{ name: "Page gray", tileColor: DEFAULT_BACKGROUND_COLOR, textColor: "#111827" }, ...COLOR_PRESETS].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className="swatch color-swatch"
                    title={preset.name}
                    aria-label={`Background ${preset.name}`}
                    style={{ backgroundColor: preset.tileColor }}
                    onClick={() => {
                      setIsCustomBackgroundOpen(false);
                      updateThemeBackground({ color: preset.tileColor });
                    }}
                  />
                ))}
                <div className={`custom-color-control${isCustomBackgroundOpen ? " active" : ""}`}>
                  <label
                    className="swatch color-swatch custom-color-swatch"
                    title="Custom"
                    aria-label="Custom background color"
                    style={{
                      backgroundColor: isCustomBackgroundOpen ? customBackgroundDraft : customBackgroundColor,
                      color: getReadableTextColor(isCustomBackgroundOpen ? customBackgroundDraft : customBackgroundColor)
                    }}
                  >
                    <Pipette size={14} />
                    <input
                      type="color"
                      value={isCustomBackgroundOpen ? customBackgroundDraft : customBackgroundColor}
                      onClick={openCustomBackground}
                      onInput={(event) => previewCustomBackground(event.currentTarget.value)}
                      onChange={(event) => previewCustomBackground(event.currentTarget.value)}
                    />
                  </label>
                  {isCustomBackgroundOpen ? (
                    <div className="custom-color-actions">
                      <button className="button secondary" type="button" onClick={cancelCustomBackground}>
                        Cancel
                      </button>
                      <button className="button primary" type="button" onClick={applyCustomBackground}>
                        OK
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {backgroundMode === "url" ? (
            <label className="field">
              <span>Image URL</span>
              <input
                value={activeBackgroundDraft.url}
                onChange={(event) => {
                  const value = event.target.value;
                  updateThemeBackground({ url: value });
                }}
                placeholder="https://example.com/background.jpg"
              />
            </label>
          ) : null}

          {backgroundMode === "upload" ? (
            <label className="field">
              <span>Upload image</span>
              <span className="upload-input-row">
                <span className="button secondary upload-file-button">
                  Choose file
                  <input
                    type="file"
                    accept="image/*,.svg"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        updateThemeBackground({ file: undefined, fileName: undefined, previewDataUrl: undefined });
                        return;
                      }
                      updateThemeBackground({ mode: "upload", file, fileName: file.name, previewDataUrl: undefined });
                      void readFileAsDataUrl(file).then((previewDataUrl) => {
                        setDraftBackgroundByTheme((current) => ({
                          ...current,
                          [activeBackgroundTheme]: {
                            ...current[activeBackgroundTheme],
                            previewDataUrl
                          }
                        }));
                      });
                    }}
                  />
                </span>
                <span className="upload-file-name">{activeBackgroundDraft.fileName ?? (activeBackgroundDraft.upload ? "Current image" : "No file chosen")}</span>
              </span>
              <p className="form-hint">SVG backgrounds are synced when they fit the sync limit. Raster uploads stay local on this device and reset to the default color in exports.</p>
            </label>
          ) : null}
        </section>

        <section className="settings-section">
          <h3>Data</h3>
          <div className="data-action-row">
            <button className="button danger" type="button" onClick={() => void handleResetToDefaults()} disabled={isSaving || isResetting}>
              <RotateCcw size={16} />
              Reset defaults
            </button>
            <small>Restores system theme, default colors, default background, and no shortcuts.</small>
          </div>
        </section>

          {error ? <p className="form-error">{error}</p> : null}
          {saveMessage ? <p className="form-success">{saveMessage}</p> : null}
          {isSaving || isResetting ? <p className="form-status">{isResetting ? "Resetting..." : "Saving..."}</p> : null}
        </div>

        <div className="settings-footer">
          <button className="button secondary" type="button" onClick={onClose} disabled={isSaving || isResetting}>
            Cancel
          </button>
          <button className="button primary" type="button" onClick={() => void handleApply()} disabled={isSaving || isResetting}>
            Apply
          </button>
        </div>
      </section>
    </aside>
  );
}
