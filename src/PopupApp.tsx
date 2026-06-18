import { FormEvent, useEffect, useState } from "react";
import { Check, Image, Plus, X } from "lucide-react";

import { discoverIcons, type DiscoveredIcon } from "./lib/iconDiscovery";
import { addShortcutToEnd } from "./lib/shortcutActions";
import { getDomainLabel, getFaviconUrl, normalizeShortcutUrl } from "./lib/url";
import type { ShortcutIcon } from "./types";

type ActivePage = {
  title: string;
  url: string;
  favIconUrl?: string;
};

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getActiveTab(): Promise<ActivePage> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const error = chrome.runtime.lastError?.message;
      if (error) {
        reject(new Error(error));
        return;
      }

      const tab = tabs[0];
      if (!tab?.url) {
        reject(new Error("Unable to read the current tab."));
        return;
      }

      resolve({
        title: tab.title ?? "",
        url: tab.url,
        favIconUrl: tab.favIconUrl
      });
    });
  });
}

function getPageTitle(page: ActivePage): string {
  return page.title.trim() || getDomainLabel(page.url);
}

function getInitialIcon(page: ActivePage): ShortcutIcon {
  return page.favIconUrl ? { kind: "url", url: page.favIconUrl } : { kind: "favicon" };
}

export function PopupApp() {
  const [page, setPage] = useState<ActivePage | undefined>();
  const [name, setName] = useState("");
  const [icons, setIcons] = useState<DiscoveredIcon[]>([]);
  const [selectedIcon, setSelectedIcon] = useState<ShortcutIcon>({ kind: "favicon" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(undefined);

      try {
        const activePage = await getActiveTab();
        const normalizedUrl = normalizeShortcutUrl(activePage.url);
        const nextPage = { ...activePage, url: normalizedUrl };
        const fallbackIcon = getInitialIcon(nextPage);

        if (cancelled) {
          return;
        }

        setPage(nextPage);
        setName(getPageTitle(nextPage));
        setSelectedIcon(fallbackIcon);

        try {
          const discovered = await discoverIcons(normalizedUrl);
          if (!cancelled) {
            setIcons(discovered);
            setSelectedIcon(discovered[0] ? { kind: "url", url: discovered[0].url } : fallbackIcon);
          }
        } catch {
          if (!cancelled) {
            setIcons([]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unable to prepare this page.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!page) {
      return;
    }

    setIsSaving(true);
    setError(undefined);

    try {
      await addShortcutToEnd(
        {
          name: name.trim() || getDomainLabel(page.url),
          url: page.url,
          icon: selectedIcon
        },
        getSystemTheme()
      );
      setIsSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to add shortcut.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <h1>Add current page</h1>
        <button className="icon-button" type="button" aria-label="Close" title="Close" onClick={() => window.close()}>
          <X size={16} />
        </button>
      </header>

      {isLoading ? <p className="popup-status">Loading current page...</p> : null}
      {error ? <p className="popup-error">{error}</p> : null}
      {isSaved ? (
        <section className="popup-success">
          <Check size={18} />
          Shortcut added.
        </section>
      ) : null}

      {page && !isSaved ? (
        <form className="popup-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          </label>

          <label className="field">
            <span>Address</span>
            <input value={page.url} readOnly />
          </label>

          <section className="field">
            <span>Icon</span>
            <div className="icon-choice-row" aria-label="Icon choices">
              <button
                type="button"
                className={`icon-choice${selectedIcon.kind === "favicon" ? " active" : ""}`}
                title="Browser favicon"
                aria-label="Browser favicon"
                onClick={() => setSelectedIcon({ kind: "favicon" })}
              >
                <img src={getFaviconUrl(page.url)} alt="" />
              </button>
              {icons.slice(0, 5).map((icon) => (
                <button
                  key={`${icon.source}:${icon.url}`}
                  type="button"
                  className={`icon-choice${selectedIcon.kind === "url" && selectedIcon.url === icon.url ? " active" : ""}`}
                  title={icon.label}
                  aria-label={icon.label}
                  onClick={() => setSelectedIcon({ kind: "url", url: icon.url })}
                >
                  <img src={icon.url} alt="" />
                </button>
              ))}
              {icons.length === 0 && selectedIcon.kind !== "url" ? (
                <span className="icon-placeholder" aria-hidden="true">
                  <Image size={20} />
                </span>
              ) : null}
            </div>
          </section>

          <footer className="popup-actions">
            <button className="button secondary" type="button" onClick={() => window.close()} disabled={isSaving}>
              Cancel
            </button>
            <button className="button primary" type="submit" disabled={isSaving}>
              <Plus size={15} />
              Add
            </button>
          </footer>
        </form>
      ) : null}
    </main>
  );
}
