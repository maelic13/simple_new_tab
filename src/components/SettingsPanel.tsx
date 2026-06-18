import { useEffect, useState } from "react";
import { Download, Link, Palette, Plus, RotateCcw, Upload, X } from "lucide-react";

import { fileLooksLikeSvg, readFileAsDataUrl, readFileAsText, saveAsset, svgToDataUrl } from "../lib/assets";
import { canSyncTextAsset } from "../lib/quota";
import { normalizeShortcutUrl } from "../lib/url";
import {
  COLOR_PRESETS,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_SHORTCUT_APPEARANCE_BY_THEME,
  getShortcutAppearance,
  normalizeShortcutAppearanceByTheme,
  type Background,
  type ResolvedThemeMode,
  type Settings,
  type ShortcutAppearanceByTheme,
  type ThemeMode,
  type TileContentMode
} from "../types";

type BackgroundMode = "color" | "url" | "upload";

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

function getInitialBackgroundMode(background: Background): BackgroundMode {
  return background.kind === "url" ? "url" : background.kind === "color" ? "color" : "upload";
}

function getInitialBackgroundColor(background: Background): string {
  return background.kind === "color" ? background.value : DEFAULT_BACKGROUND_COLOR;
}

function getInitialBackgroundUrl(background: Background): string {
  return background.kind === "url" ? background.value : "";
}

function getActiveAppearanceTheme(theme: ThemeMode, resolvedTheme: ResolvedThemeMode): ResolvedThemeMode {
  return theme === "system" ? resolvedTheme : theme;
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
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(getInitialBackgroundMode(settings.background));
  const [backgroundColor, setBackgroundColor] = useState(getInitialBackgroundColor(settings.background));
  const [backgroundUrl, setBackgroundUrl] = useState(getInitialBackgroundUrl(settings.background));
  const [backgroundFile, setBackgroundFile] = useState<File | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [importMessage, setImportMessage] = useState<string | undefined>();
  const [saveMessage, setSaveMessage] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const activeAppearanceTheme = getActiveAppearanceTheme(theme, resolvedTheme);

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
    setBackgroundMode(getInitialBackgroundMode(settings.background));
    setBackgroundColor(getInitialBackgroundColor(settings.background));
    setBackgroundUrl(getInitialBackgroundUrl(settings.background));
    setBackgroundFile(undefined);
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
      ...overrides
    };
  }

  function getPreviewBackground(): Background {
    if (backgroundMode === "color") {
      return { kind: "color", value: backgroundColor || DEFAULT_BACKGROUND_COLOR };
    }

    if (backgroundMode === "url") {
      return backgroundUrl.trim() ? { kind: "url", value: backgroundUrl } : settings.background;
    }

    return backgroundFile || settings.background.kind === "localImageRef" || settings.background.kind === "svg" ? settings.background : { kind: "color", value: DEFAULT_BACKGROUND_COLOR };
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
    backgroundMode,
    backgroundColor,
    backgroundUrl,
    backgroundFile
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
    }
  }, [resolvedTheme, theme]);

  function updateTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    loadShortcutAppearance(getActiveAppearanceTheme(nextTheme, resolvedTheme));
  }

  async function handleApply() {
    setError(undefined);

    try {
      const background = await buildBackground();
      const nextSettings = currentSettings({ background });
      const nextAppearanceTheme = getActiveAppearanceTheme(nextSettings.theme, resolvedTheme);
      const previousAppearance = getShortcutAppearance(settings, nextAppearanceTheme);
      const nextAppearance = getShortcutAppearance(nextSettings, nextAppearanceTheme);
      const shouldApplyShortcutDefaults =
        nextSettings.theme !== settings.theme ||
        nextAppearance.tileColor !== previousAppearance.tileColor ||
        nextAppearance.textColor !== previousAppearance.textColor;

      const didSave = await saveNextSettings(nextSettings, shouldApplyShortcutDefaults ? { applyShortcutDefaults: true } : undefined);
      if (didSave) {
        onClose();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save settings.");
    }
  }

  async function buildBackground(fileOverride?: File): Promise<Background> {
    if (backgroundMode === "color") {
      return { kind: "color", value: backgroundColor || DEFAULT_BACKGROUND_COLOR };
    }

    if (backgroundMode === "url") {
      return backgroundUrl.trim() ? { kind: "url", value: normalizeShortcutUrl(backgroundUrl) } : settings.background;
    }

    const selectedFile = fileOverride ?? backgroundFile;

    if (!selectedFile) {
      return settings.background.kind === "localImageRef" || settings.background.kind === "svg" ? settings.background : { kind: "color", value: DEFAULT_BACKGROUND_COLOR };
    }

    if (fileLooksLikeSvg(selectedFile)) {
      const text = (await readFileAsText(selectedFile)).trim();
      if (canSyncTextAsset(text)) {
        return { kind: "svg", value: text };
      }

      const ref = await saveAsset(svgToDataUrl(text), "image/svg+xml");
      return { kind: "localImageRef", value: ref };
    }

    const ref = await saveAsset(await readFileAsDataUrl(selectedFile), selectedFile.type || "application/octet-stream");
    return { kind: "localImageRef", value: ref };
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
                  setBackgroundMode("color");
                }}
              >
                <Palette size={15} />
                Color
              </button>
              <button type="button" className={backgroundMode === "url" ? "active" : ""} onClick={() => setBackgroundMode("url")}>
                <Link size={15} />
                URL
              </button>
              <button type="button" className={backgroundMode === "upload" ? "active" : ""} onClick={() => setBackgroundMode("upload")}>
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
                      setBackgroundColor(preset.tileColor);
                    }}
                  />
                ))}
                <label className="swatch color-swatch custom-color-swatch" title="Custom" aria-label="Custom background color" style={{ backgroundColor }}>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => {
                      const value = event.target.value;
                      setBackgroundColor(value);
                    }}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {backgroundMode === "url" ? (
            <label className="field">
              <span>Image URL</span>
              <input
                value={backgroundUrl}
                onChange={(event) => setBackgroundUrl(event.target.value)}
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
                      setBackgroundFile(file);
                    }}
                  />
                </span>
                <span className="upload-file-name">{backgroundFile?.name ?? "No file chosen"}</span>
              </span>
              <p className="form-hint">SVG backgrounds are synced when they fit the sync limit. Raster uploads stay local on this device and are included in exports.</p>
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
