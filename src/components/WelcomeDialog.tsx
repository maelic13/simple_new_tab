import { useEffect, useMemo, useState } from "react";
import { Check, Pipette, X } from "lucide-react";

import { discoverIcons } from "../lib/iconDiscovery";
import { getIconSource } from "../lib/icons";
import { normalizeShortcutUrl } from "../lib/url";
import {
  COLOR_PRESETS,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_SHORTCUT_APPEARANCE_BY_THEME,
  getShortcutAppearance,
  normalizeShortcutAppearanceByTheme,
  type ResolvedThemeMode,
  type Settings,
  type ShortcutAppearanceByTheme,
  type ShortcutIcon,
  type ThemeMode,
  type TileContentMode
} from "../types";
import type { ShortcutSaveDraft } from "../lib/shortcutActions";

type WelcomeDialogProps = {
  settings: Settings;
  resolvedTheme: ResolvedThemeMode;
  onPreview: (settings: Settings) => void;
  onExit: (settings: Settings) => Promise<void>;
  onFinish: (settings: Settings, shortcuts: ShortcutSaveDraft[]) => Promise<void>;
};

type RecommendedSite = {
  id: string;
  name: string;
  url: string;
};

const BACKGROUND_PRESETS = [
  { name: "Page gray", color: DEFAULT_BACKGROUND_COLOR },
  ...COLOR_PRESETS.map((preset) => ({ name: preset.name, color: preset.tileColor }))
];

const RECOMMENDED_SITES: RecommendedSite[] = [
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/" },
  { id: "google", name: "Google", url: "https://www.google.com/" },
  { id: "gmail", name: "Gmail", url: "https://mail.google.com/" },
  { id: "facebook", name: "Facebook", url: "https://www.facebook.com/" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com/" },
  { id: "reddit", name: "Reddit", url: "https://www.reddit.com/" },
  { id: "github", name: "GitHub", url: "https://github.com/" },
  { id: "lichess", name: "Lichess", url: "https://lichess.org/" },
  { id: "proton", name: "Proton", url: "https://proton.me/" },
  { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "claude", name: "Claude", url: "https://claude.ai/" },
  { id: "wikipedia", name: "Wikipedia", url: "https://www.wikipedia.org/" }
];

function getActiveTheme(theme: ThemeMode, resolvedTheme: ResolvedThemeMode): ResolvedThemeMode {
  return theme === "system" ? resolvedTheme : theme;
}

function getInitialBackgroundColor(settings: Settings): string {
  return settings.background.kind === "color" ? settings.background.value : DEFAULT_BACKGROUND_COLOR;
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

export function WelcomeDialog({ settings, resolvedTheme, onPreview, onExit, onFinish }: WelcomeDialogProps) {
  const initialAppearanceTheme = getActiveTheme(settings.theme, resolvedTheme);
  const initialAppearanceByTheme = normalizeShortcutAppearanceByTheme(settings, initialAppearanceTheme);
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<ThemeMode>(settings.theme);
  const [backgroundColorByTheme, setBackgroundColorByTheme] = useState<Record<ResolvedThemeMode, string>>({
    light: getInitialBackgroundColor(settings),
    dark: getInitialBackgroundColor(settings)
  });
  const [shortcutAppearanceByTheme, setShortcutAppearanceByTheme] = useState<ShortcutAppearanceByTheme>(initialAppearanceByTheme);
  const [tileContentMode, setTileContentMode] = useState<TileContentMode>(settings.tileContentMode);
  const [showShortcutActions, setShowShortcutActions] = useState(settings.showShortcutActions);
  const [showAddShortcutTile, setShowAddShortcutTile] = useState(settings.showAddShortcutTile);
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(() => new Set());
  const [isCustomBackgroundOpen, setIsCustomBackgroundOpen] = useState(false);
  const [customBackgroundByTheme, setCustomBackgroundByTheme] = useState<Record<ResolvedThemeMode, string>>({
    light: getInitialBackgroundColor(settings),
    dark: getInitialBackgroundColor(settings)
  });
  const [customBackgroundDraft, setCustomBackgroundDraft] = useState(getInitialBackgroundColor(settings));
  const [customBackgroundPrevious, setCustomBackgroundPrevious] = useState(getInitialBackgroundColor(settings));
  const [customBackgroundOriginal, setCustomBackgroundOriginal] = useState(getInitialBackgroundColor(settings));
  const [iconsBySiteId, setIconsBySiteId] = useState<Record<string, ShortcutIcon>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const activeTheme = getActiveTheme(theme, resolvedTheme);
  const activeAppearance = shortcutAppearanceByTheme[activeTheme] ?? DEFAULT_SHORTCUT_APPEARANCE_BY_THEME[activeTheme];
  const activeBackgroundColor = backgroundColorByTheme[activeTheme] ?? DEFAULT_BACKGROUND_COLOR;
  const activeCustomBackgroundColor = customBackgroundByTheme[activeTheme] ?? DEFAULT_BACKGROUND_COLOR;

  const previewSettings = useMemo<Settings>(() => ({
    ...settings,
    background: { kind: "color", value: activeBackgroundColor },
    backgroundByTheme: {
      ...settings.backgroundByTheme,
      [activeTheme]: {
        ...settings.backgroundByTheme[activeTheme],
        mode: "color",
        color: activeBackgroundColor
      }
    },
    defaultTileColor: activeAppearance.tileColor,
    defaultTextColor: activeAppearance.textColor,
    shortcutAppearanceByTheme,
    tileContentMode,
    theme,
    showShortcutActions,
    showAddShortcutTile
  }), [activeAppearance.textColor, activeAppearance.tileColor, activeBackgroundColor, activeTheme, settings, shortcutAppearanceByTheme, showAddShortcutTile, showShortcutActions, theme, tileContentMode]);

  useEffect(() => {
    onPreview(previewSettings);
  }, [onPreview, previewSettings]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendedIcons() {
      const entries = await Promise.all(
        RECOMMENDED_SITES.map(async (site) => {
          try {
            const icons = await discoverIcons(site.url);
            return [site.id, icons[0] ? { kind: "url", url: icons[0].url } : { kind: "favicon" }] as const;
          } catch {
            return [site.id, { kind: "favicon" }] as const;
          }
        })
      );

      if (!cancelled) {
        setIconsBySiteId(Object.fromEntries(entries));
      }
    }

    void loadRecommendedIcons();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
  }

  function updateBackgroundColor(value: string) {
    setIsCustomBackgroundOpen(false);
    setBackgroundColorByTheme((current) => ({
      ...current,
      [activeTheme]: value
    }));
  }

  function openCustomBackground() {
    if (!isCustomBackgroundOpen) {
      setCustomBackgroundPrevious(activeBackgroundColor);
      setCustomBackgroundOriginal(activeCustomBackgroundColor);
      setCustomBackgroundDraft(activeCustomBackgroundColor);
    }
    setIsCustomBackgroundOpen(true);
  }

  function cancelCustomBackground() {
    setCustomBackgroundDraft(customBackgroundPrevious);
    setCustomBackgroundByTheme((current) => ({
      ...current,
      [activeTheme]: customBackgroundOriginal
    }));
    setBackgroundColorByTheme((current) => ({
      ...current,
      [activeTheme]: customBackgroundPrevious
    }));
    setIsCustomBackgroundOpen(false);
  }

  function applyCustomBackground() {
    setBackgroundColorByTheme((current) => ({
      ...current,
      [activeTheme]: customBackgroundDraft
    }));
    setIsCustomBackgroundOpen(false);
  }

  function previewCustomBackground(value: string) {
    setCustomBackgroundDraft(value);
    setCustomBackgroundByTheme((current) => ({
      ...current,
      [activeTheme]: value
    }));
    setBackgroundColorByTheme((current) => ({
      ...current,
      [activeTheme]: value
    }));
  }

  function updateShortcutAppearance(tileColor: string, textColor: string) {
    setShortcutAppearanceByTheme((current) => ({
      ...current,
      [activeTheme]: { tileColor, textColor }
    }));
  }

  function toggleRecommendedSite(siteId: string) {
    setSelectedSiteIds((current) => {
      const next = new Set(current);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }

  async function handleExit() {
    setIsSaving(true);
    setError(undefined);

    try {
      await onExit({ ...previewSettings, welcomeCompleted: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to close setup.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinish() {
    setIsSaving(true);
    setError(undefined);

    try {
      const shortcuts = RECOMMENDED_SITES.filter((site) => selectedSiteIds.has(site.id)).map((site) => ({
        name: site.name,
        url: normalizeShortcutUrl(site.url),
        icon: iconsBySiteId[site.id] ?? { kind: "favicon" as const }
      }));
      await onFinish({ ...previewSettings, welcomeCompleted: true }, shortcuts);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to finish setup.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop welcome-backdrop" role="presentation">
      <section className="welcome-dialog" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="welcome-header">
          <div>
            <p className="welcome-step">Step {step + 1} of 2</p>
            <h2 id="welcome-title">{step === 0 ? "Welcome to Simple New Tab" : "Choose your shortcuts"}</h2>
          </div>
          <button className="icon-button" type="button" title="Close" aria-label="Close setup" onClick={() => void handleExit()} disabled={isSaving}>
            <X size={18} />
          </button>
        </div>

        {step === 0 ? (
          <div className="welcome-content">
            <section className="welcome-section">
              <h3>Theme</h3>
              <div className="segmented-control three welcome-theme-toggle" aria-label="Theme">
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

            <section className="welcome-section">
              <h3>Background</h3>
              <div className="welcome-swatch-grid">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    className={`welcome-swatch${activeBackgroundColor.toLowerCase() === preset.color.toLowerCase() ? " active" : ""}`}
                    aria-label={`Background ${preset.name}`}
                    title={preset.name}
                    style={{ backgroundColor: preset.color }}
                    onClick={() => updateBackgroundColor(preset.color)}
                  />
                ))}
                <div className={`custom-color-control welcome-custom-color${isCustomBackgroundOpen ? " active" : ""}`}>
                  <label
                    className="welcome-swatch welcome-custom-swatch"
                    aria-label="Custom background color"
                    title="Custom background color"
                    style={{
                      backgroundColor: isCustomBackgroundOpen ? customBackgroundDraft : activeCustomBackgroundColor,
                      color: getReadableTextColor(isCustomBackgroundOpen ? customBackgroundDraft : activeCustomBackgroundColor)
                    }}
                  >
                    <Pipette size={19} />
                    <input type="color" value={isCustomBackgroundOpen ? customBackgroundDraft : activeCustomBackgroundColor} onClick={openCustomBackground} onInput={(event) => previewCustomBackground(event.currentTarget.value)} onChange={(event) => previewCustomBackground(event.currentTarget.value)} />
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
            </section>
          </div>
        ) : (
          <div className="welcome-content">
            <section className="welcome-section">
              <h3>Shortcut appearance</h3>
              <div className="welcome-appearance">
                <div className="swatch-row">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      className="swatch welcome-appearance-swatch"
                      title={preset.name}
                      aria-label={preset.name}
                      style={{ backgroundColor: preset.tileColor, color: preset.textColor }}
                      onClick={() => updateShortcutAppearance(preset.tileColor, preset.textColor)}
                    >
                      <span>Aa</span>
                    </button>
                  ))}
                </div>
                <div className="welcome-appearance-controls">
                  <label className="field color-field">
                    <span>Tile color</span>
                    <input type="color" value={activeAppearance.tileColor} onChange={(event) => updateShortcutAppearance(event.target.value, activeAppearance.textColor)} />
                  </label>
                  <label className="field color-field">
                    <span>Text color</span>
                    <input type="color" value={activeAppearance.textColor} onChange={(event) => updateShortcutAppearance(activeAppearance.tileColor, event.target.value)} />
                  </label>
                  <label className="field welcome-content-mode-field">
                    <span>Shortcut content</span>
                    <select value={tileContentMode} onChange={(event) => setTileContentMode(event.target.value as TileContentMode)}>
                      <option value="iconAndName">Icon and name</option>
                      <option value="iconOnly">Icon only</option>
                      <option value="nameOnly">Name only</option>
                    </select>
                  </label>
                </div>
                <label className="toggle-row">
                  <input type="checkbox" checked={showShortcutActions} onChange={(event) => setShowShortcutActions(event.target.checked)} />
                  <span>
                    <strong>Show hover buttons</strong>
                    <small>Edit, remove, and select controls appear on hover.</small>
                  </span>
                </label>
                <label className="toggle-row">
                  <input type="checkbox" checked={showAddShortcutTile} onChange={(event) => setShowAddShortcutTile(event.target.checked)} />
                  <span>
                    <strong>Show add shortcut tile</strong>
                    <small>Keep the plus tile at the end of the grid.</small>
                  </span>
                </label>
                <div className="welcome-shortcut-preview" aria-label="Shortcut preview">
                  <span className="field-title">Preview</span>
                  <div className={`shortcut-tile mode-${tileContentMode}`} style={{ backgroundColor: activeAppearance.tileColor, color: activeAppearance.textColor }}>
                    <div className="shortcut-link">
                      {tileContentMode !== "nameOnly" ? (
                        <span className="shortcut-icon-shell" aria-hidden="true">
                          <img className="shortcut-icon" src="/icons/icon.svg" alt="" />
                        </span>
                      ) : null}
                      {tileContentMode !== "iconOnly" ? (
                        <span className="shortcut-text">
                          <span className="shortcut-name">Simple Shortcut</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="welcome-section">
              <div className="welcome-section-heading">
                <h3>Recommended sites</h3>
                <span>{selectedSiteIds.size} selected</span>
              </div>
              <div className="welcome-site-grid">
                {RECOMMENDED_SITES.map((site) => {
                  const icon = iconsBySiteId[site.id] ?? { kind: "favicon" as const };
                  const iconSrc = getIconSource(icon, site.url);
                  const isSelected = selectedSiteIds.has(site.id);

                  return (
                    <button
                      key={site.id}
                      type="button"
                      className={`welcome-site${isSelected ? " active" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => toggleRecommendedSite(site.id)}
                    >
                      <span className="welcome-site-check" aria-hidden="true">{isSelected ? <Check size={14} /> : null}</span>
                      <span className="welcome-site-icon" aria-hidden="true">
                        {iconSrc ? <img src={iconSrc} alt="" /> : site.name[0]}
                      </span>
                      <span>{site.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {error ? <p className="form-error welcome-error">{error}</p> : null}

        <div className="welcome-footer">
          {step === 0 ? (
            <button className="button secondary" type="button" onClick={() => void handleExit()} disabled={isSaving}>
              Exit
            </button>
          ) : (
            <button className="button secondary" type="button" onClick={() => setStep(0)} disabled={isSaving}>
              Previous
            </button>
          )}
          {step === 0 ? (
            <button className="button primary" type="button" onClick={() => setStep(1)} disabled={isSaving}>
              Next
            </button>
          ) : (
            <button className="button primary" type="button" onClick={() => void handleFinish()} disabled={isSaving}>
              Finish
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
