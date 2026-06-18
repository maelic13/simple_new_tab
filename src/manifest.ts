import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Simple New Tab",
  version: "1.0.0",
  description: "A simple speed-dial new tab page with Chrome sync metadata.",
  permissions: ["storage", "favicon", "activeTab"],
  host_permissions: ["http://*/*", "https://*/*"],
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
  }
});
