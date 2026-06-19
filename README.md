# Simple New Tab

A Manifest V3 Chromium new-tab extension with a compact speed-dial layout, Chrome sync metadata, custom icons, first-run setup, import/export backups, configurable themes, and background customization.

## Features

- New tab override for Chromium-based browsers.
- Toolbar popup to add the current page as a shortcut.
- First-run setup for theme, background, shortcut appearance, and recommended starter shortcuts.
- Shortcut add, edit, delete, open, drag reorder, and right-click actions.
- Shortcut multi-select from hover controls or the right-click menu, with bulk delete confirmation.
- Optional plus tile at the end of the grid for adding shortcuts.
- Configurable columns from 2 to 12 with responsive reduction on narrow screens.
- Relative shortcut size, spacing, and vertical position controls for different screens.
- Chrome sync storage for shortcut metadata and settings.
- Local IndexedDB storage for uploaded raster assets that are too large or unsuitable for sync.
- Icon discovery from page metadata, web manifests, well-known favicon paths, and favicon fallback.
- Custom icon URL and image upload support.
- System, light, and dark themes with remembered shortcut appearance per light/dark mode.
- Tile content modes: icon and name, icon only, or name only.
- Optional hover buttons for shortcut edit, remove, and select controls.
- Optional add shortcut tile.
- Background color presets, custom color picker, image URL, and local image/SVG upload, remembered separately for light and dark modes.
- Import and export for full extension backups, including local uploaded shortcut icons; URL and SVG backgrounds restore from backups, while local raster background uploads reset to the default color.
- Legacy shortcut import support.
- Reset defaults action to restore default settings, clear shortcuts, and show first-run setup again.

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

## Release Checklist

1. Confirm package metadata and manifest version are correct:

   | File | Field |
   |---|---|
   | `package.json` | `version` |
   | `src/manifest.ts` | `version`, `name`, `description`, `permissions` |
   | `CHANGELOG.md` | release date and notes |

2. Run verification:

   ```powershell
   pnpm install
   pnpm test
   pnpm build
   ```

3. Load `dist` as an unpacked extension and smoke-test:

   | Flow | Expected |
   |---|---|
   | First new tab | Welcome setup appears once. |
   | Toolbar popup | Current page can be added with chosen name/icon. |
   | Settings import/export | JSON backup restores settings and shortcuts. |
   | Background modes | Color, URL, and Upload preview immediately and save only on Apply. |
   | Reset defaults | Clears shortcuts and shows setup again. |

## Sync Behavior

Simple New Tab uses `chrome.storage.sync` for compact JSON metadata:

- settings
- shortcut order
- shortcut name, URL, icon reference, and colors

Settings are split into compact sync entries so every JSON setting is carried through Chrome sync, including light/dark background preferences. Shortcut records are stored separately to avoid one large sync item.

Uploaded raster images are stored locally in IndexedDB and do not sync through Chrome sync. SVG text icons and SVG backgrounds are synced when they fit the Chrome sync quota. Extension exports include local uploaded shortcut icons; local raster background uploads stay on this device and reset to the default color in exported backups.

Background images use cover/fill sizing, centered on the page.

## Backup Behavior

| Data | Exported | Imported |
|---|---:|---:|
| Shortcuts, order, layout, theme, appearance settings | Yes | Yes |
| URL backgrounds | Yes | Yes |
| SVG text backgrounds | Yes, when stored as text | Yes |
| Uploaded shortcut icons stored locally | Yes | Yes |
| Uploaded raster backgrounds stored locally | No, reset to default color | Not portable |

## Release Build

Build and package:

```powershell
pnpm build
New-Item -ItemType Directory -Path release -Force
Compress-Archive -Path dist\* -DestinationPath release\simple-new-tab-1.0.0.zip -Force
```

The ZIP should contain `manifest.json` at its root.

## Browser Notes

- Chrome sync requires the browser profile to be signed in and extension sync enabled.
- Chrome sync propagates JSON settings and shortcut metadata. Local raster image files are device-local unless moved by an explicit export/import backup.
- Manually loaded unpacked extensions can use sync within the same extension ID/install context, but Chrome Web Store distribution is the reliable path for stable cross-device extension identity.
- The browser controls whether export opens a native Save As picker. The extension requests Save As through the File System Access API or `chrome.downloads.download({ saveAs: true })` when available.
- The extension intentionally avoids broad host permissions. Some websites may expose fewer icon candidates if their metadata cannot be fetched cross-origin; root favicon candidates, favicon fallback, and user-selected icon URLs still work.
- Some browsers, including Brave, may not treat extension-provided new-tab pages exactly like the native new-tab page for browser UI rules such as “show bookmarks bar only on new tab.”
