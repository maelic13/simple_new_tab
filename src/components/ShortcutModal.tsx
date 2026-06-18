import { FormEvent, useState } from "react";
import { Image, Link, RefreshCw, Upload, X } from "lucide-react";

import { fileLooksLikeSvg, readFileAsDataUrl, readFileAsText, saveAsset, svgToDataUrl } from "../lib/assets";
import { discoverIcons, type DiscoveredIcon } from "../lib/iconDiscovery";
import { canSyncTextAsset } from "../lib/quota";
import { getDomainLabel, normalizeShortcutUrl } from "../lib/url";
import { type Shortcut, type ShortcutIcon } from "../types";
import type { ShortcutDraft } from "../hooks/useSpeedDialStore";

type IconMode = "icon" | "url" | "upload";

type ShortcutModalProps = {
  shortcut?: Shortcut;
  defaultTileColor: string;
  defaultTextColor: string;
  onClose: () => void;
  onSave: (draft: ShortcutDraft) => Promise<void>;
};

function getInitialIconMode(shortcut?: Shortcut): IconMode {
  if (!shortcut) {
    return "icon";
  }

  if (shortcut.icon.kind === "localImageRef" || shortcut.icon.kind === "svg") {
    return "upload";
  }

  return shortcut.icon.kind === "url" ? "url" : "icon";
}

export function ShortcutModal({ shortcut, defaultTileColor, defaultTextColor, onClose, onSave }: ShortcutModalProps) {
  const [name, setName] = useState(shortcut?.name ?? "");
  const [url, setUrl] = useState(shortcut?.url ?? "");
  const [iconMode, setIconMode] = useState<IconMode>(getInitialIconMode(shortcut));
  const [iconUrl, setIconUrl] = useState(shortcut?.icon.kind === "url" ? shortcut.icon.url : "");
  const [iconFile, setIconFile] = useState<File | undefined>();
  const [discoveredIcons, setDiscoveredIcons] = useState<DiscoveredIcon[]>([]);
  const [selectedIconUrl, setSelectedIconUrl] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [iconStatus, setIconStatus] = useState<string | undefined>();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const title = shortcut ? "Edit shortcut" : "Add shortcut";
  const canPreserveLocalIcon = shortcut?.icon.kind === "localImageRef" && iconMode === "upload" && !iconFile;
  const canPreserveSvgIcon = shortcut?.icon.kind === "svg" && iconMode === "upload" && !iconFile;

  async function reloadIcons() {
    setError(undefined);
    setIconStatus(undefined);
    setIsDiscovering(true);
    setIconMode("icon");

    try {
      const normalizedUrl = normalizeShortcutUrl(url);
      const icons = await discoverIcons(normalizedUrl);
      setDiscoveredIcons(icons);
      setSelectedIconUrl(icons[0]?.url ?? "");
      setIconStatus(icons.length ? `Found ${icons.length} icon${icons.length === 1 ? "" : "s"}.` : "No icons found.");
    } catch (error) {
      setDiscoveredIcons([]);
      setSelectedIconUrl("");
      setError(error instanceof Error ? error.message : "Unable to reload icons.");
    } finally {
      setIsDiscovering(false);
    }
  }

  async function buildIcon(): Promise<ShortcutIcon> {
    if (iconMode === "icon") {
      return selectedIconUrl ? { kind: "url", url: selectedIconUrl } : { kind: "favicon" };
    }

    if (iconMode === "url") {
      return { kind: "url", url: normalizeShortcutUrl(iconUrl) };
    }

    if (!iconFile) {
      if ((canPreserveLocalIcon || canPreserveSvgIcon) && shortcut) {
        return shortcut.icon;
      }
      return { kind: "favicon" };
    }

    if (fileLooksLikeSvg(iconFile)) {
      const text = (await readFileAsText(iconFile)).trim();
      if (canSyncTextAsset(text)) {
        return { kind: "svg", text };
      }

      const ref = await saveAsset(svgToDataUrl(text), "image/svg+xml");
      return { kind: "localImageRef", ref };
    }

    const ref = await saveAsset(await readFileAsDataUrl(iconFile), iconFile.type || "application/octet-stream");
    return { kind: "localImageRef", ref };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);

    try {
      const normalizedUrl = normalizeShortcutUrl(url);
      const draft: ShortcutDraft = {
        id: shortcut?.id,
        name: name.trim() || getDomainLabel(normalizedUrl),
        url: normalizedUrl,
        icon: await buildIcon(),
        tileColor: shortcut?.tileColor ?? defaultTileColor,
        textColor: shortcut?.textColor ?? defaultTextColor
      };

      await onSave(draft);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to save shortcut.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
        <div className="dialog-header">
          <h2 id="shortcut-title">{title}</h2>
          <button className="icon-button" title="Close" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="GitHub" />
          </label>

          <label className="field">
            <span>Address</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="github.com" required />
          </label>

          <fieldset className="segmented-field">
            <legend>Icon</legend>
            <div className="segmented-control three">
              <button type="button" className={iconMode === "icon" ? "active" : ""} onClick={() => setIconMode("icon")}>
                <Image size={15} />
                Icon
              </button>
              <button type="button" className={iconMode === "url" ? "active" : ""} onClick={() => setIconMode("url")}>
                <Link size={15} />
                URL
              </button>
              <button type="button" className={iconMode === "upload" ? "active" : ""} onClick={() => setIconMode("upload")}>
                <Upload size={15} />
                Upload image
              </button>
            </div>
          </fieldset>

          {iconMode === "icon" ? (
            <div className="icon-picker full">
              <button className="button secondary icon-reload" type="button" onClick={() => void reloadIcons()} disabled={isDiscovering}>
                <RefreshCw size={16} />
                {isDiscovering ? "Loading icons" : "Reload icons"}
              </button>
              {iconStatus ? <p className="form-hint">{iconStatus}</p> : null}
              {discoveredIcons.length ? (
                <div className="icon-choice-grid" aria-label="Found icons">
                  {discoveredIcons.map((icon) => (
                    <button
                      key={`${icon.source}:${icon.url}`}
                      type="button"
                      className={`icon-choice${selectedIconUrl === icon.url ? " active" : ""}`}
                      title={icon.size ? `${icon.label}, ${icon.size}px` : icon.label}
                      aria-label={icon.size ? `${icon.label}, ${icon.size}px` : icon.label}
                      onClick={() => setSelectedIconUrl(icon.url)}
                    >
                      <img src={icon.url} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {iconMode === "url" ? (
            <div className="field full">
              <label>
                <span>Icon URL</span>
                <input value={iconUrl} onChange={(event) => setIconUrl(event.target.value)} placeholder="https://example.com/icon.png" />
              </label>
              {iconUrl.trim() ? (
                <div className="loaded-icon-preview">
                  <img src={iconUrl.trim()} alt="" />
                  <span>Loaded from URL</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {iconMode === "upload" ? (
            <div className="field full">
              <label>
                <span>Upload image</span>
                <input type="file" accept="image/*,.svg" onChange={(event) => setIconFile(event.target.files?.[0])} />
              </label>
              <p className="form-hint">SVG text icons are synced when they fit the sync limit. Raster uploads stay local on this device.</p>
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <div className="dialog-footer">
            <button className="button secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={isSaving}>
              Save
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
