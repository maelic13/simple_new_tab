# Changelog

## 1.0.0 - 2026-06-18

Initial release of Simple New Tab.

### Added

- Manifest V3 Chromium new-tab extension.
- Shortcut create, edit, delete, open, drag reorder, and right-click actions.
- First-run empty state with Add shortcut and Settings actions.
- Right-click shortcut menu with open in new tab, copy URL, reload icon, edit, and remove.
- Right-click empty-space menu with add and settings.
- Configurable column count from 2 to 12.
- Relative shortcut size, spacing, and vertical position controls.
- Optional shortcut hover action buttons.
- Tile content modes for icon and name, icon only, or name only.
- System, light, and dark themes.
- Shortcut color presets and custom default tile/text colors remembered separately for light and dark modes.
- Background color presets, same-size custom page color picker, image URL, SVG text, and local image upload.
- Chrome sync metadata storage with local IndexedDB asset storage.
- Startup cache and preload background to reduce new-tab white flash.
- Icon discovery from page links, web manifests, well-known favicon paths, and favicon fallback.
- Icon filtering that only shows browser-renderable candidates.
- Import and export for full extension backups, including local uploaded icons and backgrounds, with a save dialog for backup filename and location when supported.
- Legacy shortcut import support.
- Reset defaults action that restores default settings and clears shortcuts.
- Extension icon assets for 16, 32, 48, and 128 px.

### Known Limitations

- Raster uploads remain local and do not sync.
- Remote background images can still appear after the browser/network cache resolves them.
- A browser-level blank first frame may still be visible before extension document code runs.
- Brave may not classify the extension new-tab override as the native new-tab page for bookmarks-bar visibility rules.
