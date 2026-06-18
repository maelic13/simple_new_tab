import { useState } from "react";
import { Download, Link, Plus, Upload, X } from "lucide-react";

import { fileLooksLikeSvg, readFileAsDataUrl, readFileAsText, saveAsset, svgToDataUrl } from "../lib/assets";
import { canSyncTextAsset } from "../lib/quota";
import { normalizeShortcutUrl } from "../lib/url";
import {
  COLOR_PRESETS,
  DARK_GRAY_TEXT_COLOR,
  DARK_GRAY_TILE_COLOR,
  DEFAULT_BACKGROUND_COLOR,
  LIGHT_GRAY_TEXT_COLOR,
  LIGHT_GRAY_TILE_COLOR,
  type Background,
  type Settings,
  type ThemeMode,
  type TileContentMode
} from "../types";

type BackgroundMode = Background["kind"] | "upload";

type SettingsPanelProps = {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings, options?: { applyShortcutDefaults?: boolean }) => Promise<void>;
  onImport: (file: File) => Promise<void>;
  onExport: () => void;
  onAddShortcut: () => void;
};

function getInitialBackgroundMode(background: Background): BackgroundMode {
  return background.kind === "localImageRef" ? "upload" : background.kind;
}

export function SettingsPanel({ settings, onClose, onSave, onImport, onExport, onAddShortcut }: SettingsPanelProps) {
  const [columns, setColumns] = useState(settings.columns);
  const [columnsDraft, setColumnsDraft] = useState(String(settings.columns));
  const [defaultTileColor, setDefaultTileColor] = useState(settings.defaultTileColor);
  const [defaultTextColor, setDefaultTextColor] = useState(settings.defaultTextColor);
  const [theme, setTheme] = useState<ThemeMode>(settings.theme);
  const [tileContentMode, setTileContentMode] = useState<TileContentMode>(settings.tileContentMode);
  const [showShortcutActions, setShowShortcutActions] = useState(settings.showShortcutActions);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>(getInitialBackgroundMode(settings.background));
  const [backgroundValue, setBackgroundValue] = useState(settings.background.kind === "localImageRef" ? DEFAULT_BACKGROUND_COLOR : settings.background.value);
  const [backgroundFile, setBackgroundFile] = useState<File | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [importMessage, setImportMessage] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  async function saveNextSettings(nextSettings: Settings, options?: { applyShortcutDefaults?: boolean }) {
    setError(undefined);
    setIsSaving(true);

    try {
      await onSave(nextSettings, options);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function getValidColumns(value: number): number {
    return Math.min(8, Math.max(2, Math.round(value)));
  }

  function updateColumns(value: number) {
    const nextColumns = getValidColumns(value);
    setColumns(nextColumns);
    setColumnsDraft(String(nextColumns));
    void saveNextSettings(currentSettings({ columns: nextColumns }));
  }

  function commitColumnsDraft() {
    const parsed = Number(columnsDraft);
    updateColumns(Number.isFinite(parsed) ? parsed : columns);
  }

  function currentSettings(overrides: Partial<Settings> = {}): Settings {
    return {
      ...settings,
      columns,
      defaultTileColor,
      defaultTextColor,
      theme,
      tileContentMode,
      showShortcutActions,
      background: settings.background,
      ...overrides
    };
  }

  function updateTheme(nextTheme: ThemeMode) {
    const nextTileColor = nextTheme === "dark" ? DARK_GRAY_TILE_COLOR : LIGHT_GRAY_TILE_COLOR;
    const nextTextColor = nextTheme === "dark" ? DARK_GRAY_TEXT_COLOR : LIGHT_GRAY_TEXT_COLOR;

    setTheme(nextTheme);
    setDefaultTileColor(nextTileColor);
    setDefaultTextColor(nextTextColor);
    void saveNextSettings(
      currentSettings({
        theme: nextTheme,
        defaultTileColor: nextTileColor,
        defaultTextColor: nextTextColor
      }),
      { applyShortcutDefaults: true }
    );
  }

  async function buildBackground(fileOverride?: File): Promise<Background> {
    if (backgroundMode === "color") {
      return { kind: "color", value: backgroundValue || DEFAULT_BACKGROUND_COLOR };
    }

    if (backgroundMode === "url") {
      return { kind: "url", value: normalizeShortcutUrl(backgroundValue) };
    }

    if (backgroundMode === "svg") {
      const text = backgroundValue.trim();
      if (!text) {
        return { kind: "color", value: DEFAULT_BACKGROUND_COLOR };
      }

      if (canSyncTextAsset(text)) {
        return { kind: "svg", value: text };
      }

      const ref = await saveAsset(svgToDataUrl(text), "image/svg+xml");
      return { kind: "localImageRef", value: ref };
    }

    const selectedFile = fileOverride ?? backgroundFile;

    if (!selectedFile) {
      return settings.background.kind === "localImageRef" ? settings.background : { kind: "color", value: DEFAULT_BACKGROUND_COLOR };
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

  return (
    <aside className="settings-shell" aria-label="Settings">
      <section className="settings-panel">
        <div className="dialog-header">
          <h2>Settings</h2>
          <button className="icon-button" type="button" title="Close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <section className="settings-section">
          <h3>Theme</h3>
          <div className="segmented-control two theme-toggle" aria-label="Theme">
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
                max="8"
                value={columns}
                aria-label="Columns slider"
                onChange={(event) => updateColumns(Number(event.target.value))}
              />
              <input
                className="number-input"
                type="number"
                min="2"
                max="8"
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
            <small>Allowed: 2-8 columns.</small>
          </label>

          <label className="field">
            <span>Shortcut content</span>
            <select
              value={tileContentMode}
              onChange={(event) => {
                const nextMode = event.target.value as TileContentMode;
                setTileContentMode(nextMode);
                void saveNextSettings(currentSettings({ tileContentMode: nextMode }));
              }}
            >
              <option value="iconAndName">Icon and name</option>
              <option value="iconOnly">Icon only</option>
              <option value="nameOnly">Name only</option>
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h3>Background</h3>
          <fieldset className="segmented-field" aria-label="Background">
            <div className="segmented-control">
              <button
                type="button"
                className={backgroundMode === "color" ? "active" : ""}
                onClick={() => {
                  setBackgroundMode("color");
                  const nextBackground = { kind: "color" as const, value: backgroundValue || DEFAULT_BACKGROUND_COLOR };
                  void saveNextSettings(currentSettings({ background: nextBackground }));
                }}
              >
                Color
              </button>
              <button type="button" className={backgroundMode === "url" ? "active" : ""} onClick={() => setBackgroundMode("url")}>
                <Link size={15} />
                URL
              </button>
              <button type="button" className={backgroundMode === "svg" ? "active" : ""} onClick={() => setBackgroundMode("svg")}>
                SVG
              </button>
              <button type="button" className={backgroundMode === "upload" ? "active" : ""} onClick={() => setBackgroundMode("upload")}>
                <Upload size={15} />
                Upload
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
                    className="swatch"
                    title={preset.name}
                    aria-label={`Background ${preset.name}`}
                    style={{ backgroundColor: preset.tileColor, color: preset.textColor }}
                    onClick={() => {
                      setBackgroundValue(preset.tileColor);
                      void saveNextSettings(currentSettings({ background: { kind: "color", value: preset.tileColor } }));
                    }}
                  >
                    <span>Aa</span>
                  </button>
                ))}
              </div>

              <label className="field color-field">
                <span>Page color</span>
                <input
                  type="color"
                  value={backgroundValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    setBackgroundValue(value);
                    void saveNextSettings(currentSettings({ background: { kind: "color", value } }));
                  }}
                />
              </label>
            </div>
          ) : null}

          {backgroundMode === "url" ? (
            <label className="field">
              <span>Image URL</span>
              <input
                value={backgroundValue}
                onChange={(event) => setBackgroundValue(event.target.value)}
                onBlur={() => {
                  void buildBackground().then((background) => saveNextSettings(currentSettings({ background })));
                }}
                placeholder="https://example.com/background.jpg"
              />
            </label>
          ) : null}

          {backgroundMode === "svg" ? (
            <label className="field">
              <span>SVG</span>
              <textarea
                value={backgroundValue}
                onChange={(event) => setBackgroundValue(event.target.value)}
                onBlur={() => {
                  void buildBackground().then((background) => saveNextSettings(currentSettings({ background })));
                }}
                rows={7}
                spellCheck={false}
              />
            </label>
          ) : null}

          {backgroundMode === "upload" ? (
            <label className="field">
              <span>Image</span>
              <input
                type="file"
                accept="image/*,.svg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setBackgroundFile(file);
                  if (file) {
                    void buildBackground(file).then((background) => saveNextSettings(currentSettings({ background })));
                  }
                }}
              />
            </label>
          ) : null}
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
                  void saveNextSettings(currentSettings({ showShortcutActions: nextValue }));
                }}
              />
              <span>
                <strong>Show hover buttons</strong>
                <small>Edit and remove buttons appear on shortcuts. Right-click works either way.</small>
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
                      setDefaultTileColor(preset.tileColor);
                      setDefaultTextColor(preset.textColor);
                      void saveNextSettings(
                        currentSettings({
                          defaultTileColor: preset.tileColor,
                          defaultTextColor: preset.textColor
                        }),
                        { applyShortcutDefaults: true }
                      );
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
                    setDefaultTileColor(value);
                    void saveNextSettings(currentSettings({ defaultTileColor: value }), { applyShortcutDefaults: true });
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
                    setDefaultTextColor(value);
                    void saveNextSettings(currentSettings({ defaultTextColor: value }), { applyShortcutDefaults: true });
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        {error ? <p className="form-error">{error}</p> : null}
        {isSaving ? <p className="form-status">Saving...</p> : null}
      </section>
    </aside>
  );
}
