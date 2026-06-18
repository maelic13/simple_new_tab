import { useEffect, useMemo, useRef, useState } from "react";
import { closestCenter, DndContext, type DragEndEvent, type DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CheckSquare, Copy, ExternalLink, Pencil, Plus, RefreshCw, Settings as SettingsIcon, Square, Trash2 } from "lucide-react";

import { useAssetData } from "./hooks/useAssetData";
import { useResponsiveColumns } from "./hooks/useResponsiveColumns";
import { useSpeedDialStore } from "./hooks/useSpeedDialStore";
import { svgToDataUrl } from "./lib/assets";
import { discoverIcons } from "./lib/iconDiscovery";
import { exportStateWithAssets, importStateWithAssets } from "./lib/importExport";
import { addShortcutToEnd, type ShortcutSaveDraft } from "./lib/shortcutActions";
import { getShortcutAppearance, getThemeBackgroundValue, type Settings, type Shortcut, type ThemeMode } from "./types";
import { AddShortcutTile } from "./components/AddShortcutTile";
import { DeleteDialog } from "./components/DeleteDialog";
import { SettingsPanel } from "./components/SettingsPanel";
import { ShortcutModal } from "./components/ShortcutModal";
import { ShortcutTile } from "./components/ShortcutTile";
import { WelcomeDialog } from "./components/WelcomeDialog";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: ThemeMode, systemTheme: "light" | "dark"): "light" | "dark" {
  return theme === "system" ? systemTheme : theme;
}

type SaveFilePicker = (options?: {
  suggestedName?: string;
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<{
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
}>;

function downloadWithSaveAs(url: string, filename: string): Promise<boolean> {
  if (!globalThis.chrome?.downloads?.download) {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: true
      },
      () => {
        const message = chrome.runtime.lastError?.message;
        if (message) {
          reject(new Error(message));
          return;
        }
        resolve(true);
      }
    );
  });
}

function App() {
  const { state, isLoading, error, actions, refresh } = useSpeedDialStore();
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | undefined>();
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletingShortcut, setDeletingShortcut] = useState<Shortcut | undefined>();
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [selectedShortcutIds, setSelectedShortcutIds] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState<string | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDraggingShortcut, setIsDraggingShortcut] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shortcut?: Shortcut } | undefined>();
  const [draftSettings, setDraftSettings] = useState<Settings | undefined>();
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => getSystemTheme());
  const suppressOpenUntil = useRef(0);
  const effectiveSettings = draftSettings ?? state.settings;
  const resolvedTheme = resolveTheme(effectiveSettings.theme, systemTheme);
  const activeShortcutAppearance = getShortcutAppearance(effectiveSettings, resolvedTheme);
  const activeBackground = getThemeBackgroundValue(effectiveSettings, resolvedTheme);
  const displaySettings = {
    ...effectiveSettings,
    background: activeBackground,
    defaultTileColor: activeShortcutAppearance.tileColor,
    defaultTextColor: activeShortcutAppearance.textColor
  };
  const columns = useResponsiveColumns(displaySettings.columns, displaySettings.shortcutSize, displaySettings.shortcutSpacing);
  const backgroundAsset = useAssetData(displaySettings.background.kind === "localImageRef" ? displaySettings.background.value : undefined);

  const shortcuts = useMemo(
    () => {
      const items = state.shortcutOrder.map((id) => state.shortcuts[id]).filter((shortcut): shortcut is Shortcut => Boolean(shortcut));
      return items.map((shortcut) => ({
        ...shortcut,
        tileColor: displaySettings.defaultTileColor,
        textColor: displaySettings.defaultTextColor
      }));
    },
    [displaySettings.defaultTextColor, displaySettings.defaultTileColor, state.shortcutOrder, state.shortcuts]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const selectedShortcuts = useMemo(() => shortcuts.filter((shortcut) => selectedShortcutIds.has(shortcut.id)), [selectedShortcutIds, shortcuts]);
  const isSelectionActive = selectedShortcutIds.size > 0;
  const shouldShowWelcome = !isLoading && !state.settings.welcomeCompleted && !settingsOpen && !isShortcutModalOpen;

  useEffect(() => {
    setSelectedShortcutIds((current) => {
      if (current.size === 0) {
        return current;
      }

      const availableIds = new Set(shortcuts.map((shortcut) => shortcut.id));
      const next = new Set(Array.from(current).filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [shortcuts]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeMenu() {
      setContextMenu(undefined);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  const pageStyle = useMemo(() => {
    const background = displaySettings.background;

    if (background.kind === "color") {
      return { backgroundColor: background.value };
    }

    if (background.kind === "url") {
      return { backgroundImage: `url("${background.value}")`, backgroundRepeat: "no-repeat" };
    }

    if (background.kind === "svg") {
      return { backgroundImage: `url("${svgToDataUrl(background.value)}")`, backgroundRepeat: "no-repeat" };
    }

    if (backgroundAsset) {
      return { backgroundImage: `url("${backgroundAsset}")`, backgroundRepeat: "no-repeat" };
    }

    return { backgroundColor: displaySettings.defaultTileColor };
  }, [backgroundAsset, displaySettings.background, displaySettings.defaultTileColor]);

  const gridStyle = useMemo(() => {
    const sizeScale = Math.min(1.4, Math.max(0.5, displaySettings.shortcutSize / 100));
    const gap = Math.round((Math.min(100, Math.max(0, displaySettings.shortcutSpacing)) / 100) * 32);
    const tileWidth = Math.round(190 * sizeScale);
    const maxWidth = columns * tileWidth + Math.max(0, columns - 1) * gap;
    const verticalVh = Math.round(6 + Math.min(100, Math.max(0, displaySettings.gridVerticalPosition)) * 0.54);

    return {
      "--columns": columns,
      "--grid-max-width": `${maxWidth}px`,
      "--shortcut-gap": `${gap}px`,
      "--grid-top": `clamp(56px, ${verticalVh}vh, 70vh)`,
      "--shortcut-min-height": `${Math.round(126 * sizeScale)}px`,
      "--shortcut-icon-shell": `${Math.round(76 * sizeScale)}px`,
      "--shortcut-icon-size": `${Math.round(64 * sizeScale)}px`,
      "--shortcut-icon-only-shell": `${Math.round(92 * sizeScale)}px`,
      "--shortcut-icon-only-size": `${Math.round(78 * sizeScale)}px`
    } as React.CSSProperties;
  }, [columns, displaySettings.gridVerticalPosition, displaySettings.shortcutSize, displaySettings.shortcutSpacing]);

  function openNewShortcutModal() {
    setContextMenu(undefined);
    setDraftSettings(undefined);
    setEditingShortcut(undefined);
    setIsShortcutModalOpen(true);
    setSettingsOpen(false);
    setActionError(undefined);
  }

  function openEditShortcutModal(shortcut: Shortcut) {
    setContextMenu(undefined);
    setEditingShortcut(shortcut);
    setIsShortcutModalOpen(true);
    setActionError(undefined);
  }

  function openSettingsPanel() {
    setContextMenu(undefined);
    setDraftSettings(state.settings);
    setSettingsOpen(true);
    setIsShortcutModalOpen(false);
    setActionError(undefined);
  }

  function closeSettingsPanel() {
    setDraftSettings(undefined);
    setSettingsOpen(false);
  }

  async function saveSettings(settings: Settings, options?: { applyShortcutDefaults?: boolean }) {
    await actions.updateSettings(settings, options);
    setDraftSettings(settings);
  }

  function openPageContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }

  function openShortcutContextMenu(event: React.MouseEvent, shortcut: Shortcut) {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, shortcut });
  }

  function handleDragStart(_event: DragStartEvent) {
    setIsDraggingShortcut(true);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setIsDraggingShortcut(false);
    suppressOpenUntil.current = Date.now() + 500;
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : undefined;

    if (!overId || activeId === overId) {
      return;
    }

    try {
      setActionError(undefined);
      await actions.reorderShortcuts(activeId, overId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to reorder shortcuts.");
    }
  }

  function handleDragCancel() {
    setIsDraggingShortcut(false);
    suppressOpenUntil.current = Date.now() + 500;
  }

  function openShortcut(shortcut: Shortcut) {
    if (Date.now() < suppressOpenUntil.current) {
      return;
    }

    window.location.href = shortcut.url;
  }

  function openShortcutInNewTab(shortcut: Shortcut) {
    setContextMenu(undefined);
    window.open(shortcut.url, "_blank", "noopener,noreferrer");
  }

  async function copyShortcutUrl(shortcut: Shortcut) {
    setContextMenu(undefined);
    setActionError(undefined);

    try {
      await navigator.clipboard.writeText(shortcut.url);
    } catch {
      setActionError("Unable to copy URL.");
    }
  }

  async function reloadShortcutIcon(shortcut: Shortcut) {
    setContextMenu(undefined);
    setActionError(undefined);

    try {
      const icons = await discoverIcons(shortcut.url);
      await actions.upsertShortcut({
        id: shortcut.id,
        name: shortcut.name,
        url: shortcut.url,
        icon: icons[0] ? { kind: "url", url: icons[0].url } : { kind: "favicon" },
        tileColor: shortcut.tileColor,
        textColor: shortcut.textColor
      });
    } catch {
      await actions.upsertShortcut({
        id: shortcut.id,
        name: shortcut.name,
        url: shortcut.url,
        icon: { kind: "favicon" },
        tileColor: shortcut.tileColor,
        textColor: shortcut.textColor
      });
    }
  }

  async function confirmDelete() {
    if (!deletingShortcut) {
      return;
    }

    setIsDeleting(true);
    setActionError(undefined);

    try {
      await actions.removeShortcut(deletingShortcut.id);
      setDeletingShortcut(undefined);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete shortcut.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleExport() {
    const payload = JSON.stringify(await exportStateWithAssets(state), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const suggestedName = `simple-new-tab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const showSaveFilePicker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;

    if (showSaveFilePicker) {
      try {
        const handle = await showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "Simple New Tab backup",
              accept: { "application/json": [".json"] }
            }
          ]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        throw error;
      }
    }

    const url = URL.createObjectURL(blob);
    try {
      const didUseDownloadsApi = await downloadWithSaveAs(url, suggestedName);
      if (!didUseDownloadsApi) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = suggestedName;
        anchor.click();
      }
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function toggleShortcutSelected(shortcut: Shortcut) {
    setSelectedShortcutIds((current) => {
      const next = new Set(current);
      if (next.has(shortcut.id)) {
        next.delete(shortcut.id);
      } else {
        next.add(shortcut.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedShortcutIds(new Set());
    setIsBulkDeleteOpen(false);
    setActionError(undefined);
  }

  async function confirmBulkDelete() {
    const ids = Array.from(selectedShortcutIds);
    if (ids.length === 0) {
      return;
    }

    setIsDeleting(true);
    setActionError(undefined);

    try {
      await actions.removeShortcuts(ids);
      setSelectedShortcutIds(new Set());
      setIsBulkDeleteOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete shortcuts.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleImport(file: File) {
    const text = await file.text();
    const nextState = await importStateWithAssets(JSON.parse(text) as unknown);
    const importedState = {
      ...nextState,
      settings: {
        ...nextState.settings,
        welcomeCompleted: true
      }
    };
    await actions.importState(importedState);
    setDraftSettings(importedState.settings);
  }

  async function handleResetToDefaults() {
    await actions.resetToDefaults();
    setDraftSettings(undefined);
    setSettingsOpen(false);
    setIsShortcutModalOpen(false);
    setDeletingShortcut(undefined);
    setIsBulkDeleteOpen(false);
    setSelectedShortcutIds(new Set());
    setContextMenu(undefined);
  }

  async function handleWelcomeExit(settings: Settings) {
    await actions.updateSettings(settings);
    setDraftSettings(undefined);
  }

  async function handleWelcomeFinish(settings: Settings, shortcutDrafts: ShortcutSaveDraft[]) {
    await actions.updateSettings(settings, { applyShortcutDefaults: true });

    for (const draft of shortcutDrafts) {
      await addShortcutToEnd(draft, resolvedTheme);
    }

    setDraftSettings(undefined);
    await refresh();
  }

  return (
    <main className={`app-shell theme-${resolvedTheme}`} style={pageStyle}>
      <div className="app-scrim" onContextMenu={openPageContextMenu}>
        <button className="icon-button settings-entry" title="Settings" aria-label="Settings" onClick={openSettingsPanel}>
          <SettingsIcon size={18} />
        </button>

        {error || actionError ? <div className="app-alert">{actionError ?? error}</div> : null}

        {isLoading ? (
          <section className="empty-state" aria-live="polite">
            Loading
          </section>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <SortableContext items={state.shortcutOrder} strategy={rectSortingStrategy}>
              <section className="dial-grid" style={gridStyle}>
                {shortcuts.map((shortcut) => (
                  <ShortcutTile
                    key={shortcut.id}
                    shortcut={shortcut}
                    contentMode={displaySettings.tileContentMode}
                    suppressOpen={isDraggingShortcut}
                    showActions={displaySettings.showShortcutActions}
                    isSelected={selectedShortcutIds.has(shortcut.id)}
                    isSelectionVisible={isSelectionActive}
                    onEdit={openEditShortcutModal}
                    onDelete={setDeletingShortcut}
                    onOpen={openShortcut}
                    onToggleSelected={toggleShortcutSelected}
                    onContextMenu={openShortcutContextMenu}
                  />
                ))}
                {displaySettings.showAddShortcutTile ? <AddShortcutTile onAdd={openNewShortcutModal} /> : null}
              </section>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {isSelectionActive ? (
        <div className="selection-bar" role="status" aria-live="polite">
          <span>{selectedShortcutIds.size} selected</span>
          <button className="button secondary" type="button" onClick={clearSelection}>
            Cancel
          </button>
          <button className="button danger" type="button" onClick={() => setIsBulkDeleteOpen(true)}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      ) : null}

      {contextMenu ? (
        <div
          className="context-menu"
          style={{ "--menu-x": `${contextMenu.x}px`, "--menu-y": `${contextMenu.y}px` } as React.CSSProperties}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {contextMenu.shortcut ? (
            <>
              <button type="button" role="menuitem" onClick={() => openShortcutInNewTab(contextMenu.shortcut!)}>
                <ExternalLink size={15} />
                Open in new tab
              </button>
              <button type="button" role="menuitem" onClick={() => void copyShortcutUrl(contextMenu.shortcut!)}>
                <Copy size={15} />
                Copy URL
              </button>
              <button type="button" role="menuitem" onClick={() => void reloadShortcutIcon(contextMenu.shortcut!)}>
                <RefreshCw size={15} />
                Reload icon
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  toggleShortcutSelected(contextMenu.shortcut!);
                  setContextMenu(undefined);
                }}
              >
                {selectedShortcutIds.has(contextMenu.shortcut.id) ? <CheckSquare size={15} /> : <Square size={15} />}
                {selectedShortcutIds.has(contextMenu.shortcut.id) ? "Deselect" : "Select"}
              </button>
              <div className="context-menu-separator" role="separator" />
              <button type="button" role="menuitem" onClick={() => openEditShortcutModal(contextMenu.shortcut!)}>
                <Pencil size={15} />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => {
                  setDeletingShortcut(contextMenu.shortcut!);
                  setContextMenu(undefined);
                }}
              >
                <Trash2 size={15} />
                Remove
              </button>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={openNewShortcutModal}>
                <Plus size={15} />
                Add
              </button>
              <button type="button" role="menuitem" onClick={openSettingsPanel}>
                <SettingsIcon size={15} />
                Settings
              </button>
            </>
          )}
        </div>
      ) : null}

      {isShortcutModalOpen ? (
        <ShortcutModal
          shortcut={editingShortcut}
          defaultTileColor={displaySettings.defaultTileColor}
          defaultTextColor={displaySettings.defaultTextColor}
          onClose={() => setIsShortcutModalOpen(false)}
          onSave={actions.upsertShortcut}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsPanel
          settings={state.settings}
          resolvedTheme={resolvedTheme}
          onClose={closeSettingsPanel}
          onSave={saveSettings}
          onPreview={setDraftSettings}
          onImport={handleImport}
          onExport={() => void handleExport()}
          onResetToDefaults={handleResetToDefaults}
          onAddShortcut={openNewShortcutModal}
        />
      ) : null}

      {shouldShowWelcome ? (
        <WelcomeDialog
          settings={state.settings}
          resolvedTheme={resolvedTheme}
          onPreview={setDraftSettings}
          onExit={handleWelcomeExit}
          onFinish={handleWelcomeFinish}
        />
      ) : null}

      {deletingShortcut ? (
        <DeleteDialog
          shortcut={deletingShortcut}
          isBusy={isDeleting}
          error={actionError}
          onCancel={() => setDeletingShortcut(undefined)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
      {isBulkDeleteOpen ? (
        <DeleteDialog
          count={selectedShortcutIds.size}
          isBusy={isDeleting}
          error={actionError}
          onCancel={() => setIsBulkDeleteOpen(false)}
          onConfirm={() => void confirmBulkDelete()}
        />
      ) : null}
    </main>
  );
}

export default App;
