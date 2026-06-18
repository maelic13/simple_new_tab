# Simple New Tab

A Manifest V3 Chromium new-tab extension with a compact speed-dial layout, Chrome sync metadata, custom icons, configurable colors, and background customization.

## Features

- New tab override for Chromium-based browsers.
- Shortcut add, edit, delete, open, drag reorder, and right-click actions.
- Configurable columns from 2 to 12 with responsive reduction on narrow screens.
- Relative shortcut size, spacing, and vertical position controls for different screens.
- Chrome sync storage for shortcut metadata and settings.
- Local IndexedDB storage for uploaded raster assets that are too large or unsuitable for sync.
- Icon discovery from page metadata, web manifests, well-known favicon paths, and favicon fallback.
- Custom icon URL and image upload support.
- System, light, and dark themes with remembered shortcut appearance per light/dark mode.
- Tile content modes: icon and name, icon only, or name only.
- Optional hover buttons for shortcut edit/remove.
- Background color presets, same-size custom color picker, image URL, SVG text, and local upload.
- Import and export for the extension JSON format, with legacy shortcut import support.

## Install For Local Testing

1. Build the extension:

   ```powershell
   pnpm install
   pnpm build
   ```

2. Open Chromium, Chrome, Brave, or another Chromium-based browser.
3. Go to `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select the repository's `dist` directory.

After rebuilding, click `Reload` on the extension card in `chrome://extensions`.

## Development

```powershell
pnpm install
pnpm test
pnpm build
```

Useful scripts:

| Command | Purpose |
|---|---|
| `pnpm test` | Run the Vitest suite. |
| `pnpm build` | Typecheck and build the extension into `dist`. |
| `pnpm dev` | Start Vite development mode. |

## Sync Behavior

Simple New Tab uses `chrome.storage.sync` for compact JSON metadata:

- settings
- shortcut order
- shortcut name, URL, icon reference, and colors

Uploaded raster images are stored locally in IndexedDB and do not sync. SVG text icons and SVG backgrounds are synced when they fit the Chrome sync quota. On another device, local-only assets degrade to the saved metadata or favicon behavior.

## Release Build

Build and package:

```powershell
pnpm build
Compress-Archive -Path dist\* -DestinationPath release\simple-new-tab-1.0.0.zip -Force
```

The ZIP should contain `manifest.json` at its root.

## Browser Notes

- Chrome sync requires the browser profile to be signed in and extension sync enabled.
- Manually loaded unpacked extensions can use sync within the same extension ID/install context, but Chrome Web Store distribution is the reliable path for stable cross-device extension identity.
- Some browsers, including Brave, may not treat extension-provided new-tab pages exactly like the native new-tab page for browser UI rules such as “show bookmarks bar only on new tab.”
