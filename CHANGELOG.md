# Changelog

## 1.0.0 - 2026-06-18

Initial release of Simple New Tab.

### Added

- Manifest V3 Chromium new-tab extension.
- Toolbar popup to add the current page as a shortcut.
- First-run setup with theme, color background, shortcut appearance, and selectable recommended starter shortcuts.
- Shortcut create, edit, delete, open, drag reorder, and right-click actions.
- Shortcut multi-select from hover controls or the right-click menu, with a bulk delete confirmation flow.
- Optional plus tile at the end of the grid for adding shortcuts.
- Right-click shortcut menu with open in new tab, copy URL, reload icon, edit, and remove.
- Right-click empty-space menu with add and settings.
- Configurable column count from 2 to 12.
- Relative shortcut size, spacing, and vertical position controls.
- Optional shortcut hover action buttons.
- Optional add shortcut tile.
- Tile content modes for icon and name, icon only, or name only.
- System, light, and dark themes.
- Shortcut color presets and custom default tile/text colors remembered separately for light and dark modes.
- Background color presets, custom page color picker, image URL, and local image/SVG upload, remembered separately for light and dark modes.
- Chrome sync metadata storage with local IndexedDB asset storage.
- Split sync storage for settings and per-theme background preferences so all JSON settings sync without depending on one large settings entry.
- Startup cache and preload background to reduce new-tab white flash.
- Icon discovery from page links, web manifests, well-known favicon paths, and favicon fallback.
- Icon filtering that only shows browser-renderable candidates.
- Import and export for full extension backups, including local uploaded shortcut icons, with URL and SVG background restore support and a Save As dialog for backup filename and location.
- Legacy shortcut import support.
- Legacy background import migration for backups that only contain the older single `background` value.
- Reset defaults action that restores default settings, clears shortcuts, and shows first-run setup again.
- Extension icon assets for 16, 32, 48, and 128 px.
- Minimal required permissions without broad host access.

### Known Limitations

- Raster uploads remain local and do not sync.
- Local raster background uploads are not portable in exported backups and reset to the default color.
- Some websites may expose fewer icon candidates because the extension does not request broad host permissions.
- Remote background images can still appear after the browser/network cache resolves them.
- A browser-level blank first frame may still be visible before extension document code runs.
- Save As behavior for downloads depends on the browser and its download settings.
- Brave may not classify the extension new-tab override as the native new-tab page for bookmarks-bar visibility rules.

### Verification

- `pnpm test`
- `pnpm build`
