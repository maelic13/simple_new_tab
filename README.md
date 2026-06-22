# Simple New Tab

A Manifest V3 compatible new-tab extension for Chromium and Firefox with a compact speed-dial layout, browser sync metadata, custom icons, first-run setup, import/export backups, configurable themes, and background customization.

## Features

- New tab override for Chromium-based browsers and Firefox.
- Toolbar popup to add the current page as a shortcut.
- First-run setup for theme, background, shortcut appearance, and recommended starter shortcuts.
- Shortcut add, edit, delete, open, drag reorder, and right-click actions.
- Shortcut multi-select from hover controls or the right-click menu, with bulk delete confirmation.
- Optional plus tile at the end of the grid for adding shortcuts.
- Configurable columns from 2 to 12 with responsive reduction on narrow screens.
- Relative shortcut size, spacing, and vertical position controls for different screens.
- Browser sync storage for shortcut metadata and settings.
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

### Chromium

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

### Firefox

1. Build the Firefox extension:

   ```powershell
   pnpm install
   pnpm build:firefox
   ```

2. Open Firefox.
3. Go to `about:debugging#/runtime/this-firefox`.
4. Click `Load Temporary Add-on...`.
5. Select `dist-firefox/manifest.json`.

After rebuilding, reload the temporary extension from `about:debugging`.

## Development

```powershell
pnpm install
pnpm test
pnpm build
pnpm build:firefox
pnpm lint:firefox
```

Useful scripts:

| Command | Purpose |
|---|---|
| `pnpm test` | Run the Vitest suite. |
| `pnpm build` | Typecheck and build the Chromium extension into `dist`. |
| `pnpm build:firefox` | Typecheck and build the Firefox extension into `dist-firefox`. |
| `pnpm lint:firefox` | Run Mozilla's extension linter against `dist-firefox`. |
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
   pnpm build:firefox
   pnpm lint:firefox
   ```

3. Load `dist` as an unpacked extension in Chromium and `dist-firefox/manifest.json` as a temporary add-on in Firefox, then smoke-test:

   | Flow | Expected |
   |---|---|
   | First new tab | Welcome setup appears once in Chromium and Firefox. |
   | New-tab favicon | Browser tab shows the Simple New Tab icon. |
   | Toolbar popup | Current page can be added with chosen name/icon. |
   | Shortcut labels | Text is readable and not clipped in Chromium and Firefox. |
   | Settings import/export | JSON backup restores settings and shortcuts. |
   | Background modes | Color, URL, and Upload preview immediately and save only on Apply. |
   | Reset defaults | Clears shortcuts and shows setup again. |

## Sync Behavior

Simple New Tab uses browser sync storage for compact JSON metadata:

- settings
- shortcut order
- shortcut name, URL, icon reference, and colors

Settings are split into compact sync entries so every JSON setting is carried through the browser's sync service, including light/dark background preferences. Shortcut records are stored separately to avoid one large sync item.

Uploaded raster images are stored locally in IndexedDB and do not sync through browser sync. SVG text icons and SVG backgrounds are synced when they fit the browser sync quota. Extension exports include local uploaded shortcut icons; local raster background uploads stay on this device and reset to the default color in exported backups.

Chromium sync and Firefox sync are separate browser services. Data does not sync across browser families; use export/import to move settings between them.

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

Build and package for Chromium:

```powershell
pnpm build
New-Item -ItemType Directory -Path release -Force
Compress-Archive -Path dist\* -DestinationPath release\simple-new-tab-1.1.0.zip -Force
```

The ZIP should contain `manifest.json` at its root.

Build and package for Firefox:

```powershell
pnpm build:firefox
pnpm lint:firefox
New-Item -ItemType Directory -Path release -Force
Compress-Archive -Path dist-firefox\* -DestinationPath release\simple-new-tab-firefox-1.1.0.zip -Force
```

Firefox packages for permanent installation must be signed by Mozilla Add-ons.

## Browser Notes

- Browser sync requires the browser profile to be signed in and extension/add-on sync enabled.
- Browser sync propagates JSON settings and shortcut metadata within the same browser family. Local raster image files are device-local unless moved by an explicit export/import backup.
- Manually loaded unpacked/temporary extensions can use sync within the same extension ID/install context, but store-signed distribution is the reliable path for stable cross-device extension identity.
- The browser controls whether export opens a native Save As picker. The extension requests Save As through the File System Access API or extension downloads API when available.
- The extension intentionally avoids broad host permissions. Some websites may expose fewer icon candidates if their metadata cannot be fetched cross-origin; root favicon candidates, favicon fallback, and user-selected icon URLs still work.
- Some browsers, including Brave, may not treat extension-provided new-tab pages exactly like the native new-tab page for browser UI rules such as “show bookmarks bar only on new tab.”
