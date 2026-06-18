import { useMemo, useRef, useState } from "react";
import { closestCenter, DndContext, type DragEndEvent, type DragStartEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Settings as SettingsIcon } from "lucide-react";

import { useAssetData } from "./hooks/useAssetData";
import { useResponsiveColumns } from "./hooks/useResponsiveColumns";
import { useSpeedDialStore } from "./hooks/useSpeedDialStore";
import { svgToDataUrl } from "./lib/assets";
import { exportState, parseImportFile } from "./lib/importExport";
import type { Shortcut } from "./types";
import { DeleteDialog } from "./components/DeleteDialog";
import { SettingsPanel } from "./components/SettingsPanel";
import { ShortcutModal } from "./components/ShortcutModal";
import { ShortcutTile } from "./components/ShortcutTile";

function App() {
  const { state, isLoading, error, actions, refresh } = useSpeedDialStore();
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | undefined>();
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletingShortcut, setDeletingShortcut] = useState<Shortcut | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDraggingShortcut, setIsDraggingShortcut] = useState(false);
  const suppressOpenUntil = useRef(0);
  const columns = useResponsiveColumns(state.settings.columns);
  const backgroundAsset = useAssetData(state.settings.background.kind === "localImageRef" ? state.settings.background.value : undefined);

  const shortcuts = useMemo(
    () => state.shortcutOrder.map((id) => state.shortcuts[id]).filter((shortcut): shortcut is Shortcut => Boolean(shortcut)),
    [state.shortcutOrder, state.shortcuts]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pageStyle = useMemo(() => {
    const background = state.settings.background;

    if (background.kind === "color") {
      return { backgroundColor: background.value };
    }

    if (background.kind === "url") {
      return { backgroundImage: `url("${background.value}")` };
    }

    if (background.kind === "svg") {
      return { backgroundImage: `url("${svgToDataUrl(background.value)}")` };
    }

    if (backgroundAsset) {
      return { backgroundImage: `url("${backgroundAsset}")` };
    }

    return { backgroundColor: state.settings.defaultTileColor };
  }, [backgroundAsset, state.settings.background, state.settings.defaultTileColor]);

  function openNewShortcutModal() {
    setEditingShortcut(undefined);
    setIsShortcutModalOpen(true);
    setSettingsOpen(false);
    setActionError(undefined);
  }

  function openEditShortcutModal(shortcut: Shortcut) {
    setEditingShortcut(shortcut);
    setIsShortcutModalOpen(true);
    setActionError(undefined);
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

  function handleExport() {
    const payload = JSON.stringify(exportState(state), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `new-tab-speed-dial-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    const text = await file.text();
    const nextState = parseImportFile(JSON.parse(text) as unknown);
    await actions.importState(nextState);
  }

  return (
    <main className={`app-shell theme-${state.settings.theme}`} style={pageStyle}>
      <div className="app-scrim">
        <button className="icon-button settings-entry" title="Settings" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
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
              <section className="dial-grid" style={{ "--columns": columns } as React.CSSProperties}>
                {shortcuts.map((shortcut) => (
                  <ShortcutTile
                    key={shortcut.id}
                    shortcut={shortcut}
                    contentMode={state.settings.tileContentMode}
                    suppressOpen={isDraggingShortcut}
                    onEdit={openEditShortcutModal}
                    onDelete={setDeletingShortcut}
                    onOpen={openShortcut}
                  />
                ))}
              </section>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {isShortcutModalOpen ? (
        <ShortcutModal
          shortcut={editingShortcut}
          defaultTileColor={state.settings.defaultTileColor}
          defaultTextColor={state.settings.defaultTextColor}
          onClose={() => setIsShortcutModalOpen(false)}
          onSave={actions.upsertShortcut}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsPanel
          settings={state.settings}
          onClose={() => setSettingsOpen(false)}
          onSave={actions.updateSettings}
          onImport={handleImport}
          onExport={handleExport}
          onAddShortcut={openNewShortcutModal}
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
    </main>
  );
}

export default App;
