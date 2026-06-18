const HTTP_SCHEME = /^https?:\/\//i;
const UNSUPPORTED_SCHEME = /^[a-z][a-z\d+\-.]*:(?!\d)/i;

export function normalizeShortcutUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("URL is required.");
  }

  if (!HTTP_SCHEME.test(trimmed) && UNSUPPORTED_SCHEME.test(trimmed)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const candidate = HTTP_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(candidate);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  return parsed.toString();
}

export function getDomainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getFaviconUrl(url: string, size = 128): string {
  const pageUrl = encodeURIComponent(url);
  return `https://www.google.com/s2/favicons?domain_url=${pageUrl}&sz=${size}`;
}
