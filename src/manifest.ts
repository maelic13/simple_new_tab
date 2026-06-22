import { defineManifest } from "@crxjs/vite-plugin";

export type TargetBrowser = "chrome" | "firefox";

export function createManifest(targetBrowser: TargetBrowser = "chrome") {
  return defineManifest({
    manifest_version: 3,
    name: "Simple New Tab",
    version: "1.1.0",
    description: "A customizable speed-dial new tab page with sync, backups, themes, and quick shortcut creation.",
    permissions: ["storage", "activeTab", "downloads"],
    icons: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    action: {
      default_title: "Add current page",
      default_popup: "popup.html",
      default_icon: {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      }
    },
    chrome_url_overrides: {
      newtab: "newtab.html"
    },
    ...(targetBrowser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "{6a2d1e19-e073-42eb-8a6d-d5b2ea0cc1d5}",
              strict_min_version: "142.0",
              data_collection_permissions: {
                required: ["none" as const]
              }
            }
          }
        }
      : {})
  });
}

export default createManifest();
