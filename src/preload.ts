type CachedSettings = {
  theme?: "system" | "light" | "dark";
  background?: { kind?: string; value?: string };
};

type CachedSnapshot = {
  settings?: CachedSettings;
};

const CACHE_STORAGE_KEY = "new-tab-speed-dial:cache";

function svgToDataUrl(text: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
}

function applyBackground(settings: CachedSettings): void {
  const background = settings.background;
  const targets = [document.documentElement, document.body, document.getElementById("root")].filter((element): element is HTMLElement => Boolean(element));
  const resolvedTheme = settings.theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : settings.theme;

  if (resolvedTheme === "dark") {
    document.documentElement.classList.add("preload-theme-dark");
  }

  if (!background?.kind || typeof background.value !== "string") {
    return;
  }

  for (const target of targets) {
    target.style.backgroundPosition = "center";
    target.style.backgroundSize = "cover";
  }

  if (background.kind === "color") {
    for (const target of targets) {
      target.style.backgroundColor = background.value;
      target.style.backgroundImage = "";
    }
    return;
  }

  if (background.kind === "url") {
    for (const target of targets) {
      target.style.backgroundImage = `url("${background.value}")`;
    }
    return;
  }

  if (background.kind === "svg") {
    const imageUrl = svgToDataUrl(background.value);
    for (const target of targets) {
      target.style.backgroundImage = `url("${imageUrl}")`;
    }
  }
}

try {
  const raw = localStorage.getItem(CACHE_STORAGE_KEY);
  const snapshot = raw ? (JSON.parse(raw) as CachedSnapshot) : undefined;
  if (snapshot?.settings) {
    applyBackground(snapshot.settings);
  }
} catch {
  // First paint fallback is best-effort. React will apply the full state.
}
