import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type Settings,
  type Shortcut,
  type ShortcutIcon,
  type SpeedDialState
} from "../types";
import { deleteShortcut, loadState, replaceState, saveSettings, saveShortcut, saveShortcutOrder, saveShortcuts, subscribeToStateChanges } from "../lib/storage";
import { moveItem } from "../lib/order";

const EMPTY_STATE: SpeedDialState = {
  schemaVersion: SCHEMA_VERSION,
  settings: DEFAULT_SETTINGS,
  shortcuts: {},
  shortcutOrder: []
};

export type ShortcutDraft = {
  id?: string;
  name: string;
  url: string;
  icon: ShortcutIcon;
  tileColor?: string;
  textColor?: string;
};

export function useSpeedDialStore() {
  const [state, setState] = useState<SpeedDialState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      const next = await loadState();
      setState(next);
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load shortcuts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeToStateChanges(() => {
      void refresh();
    });
  }, [refresh]);

  const actions = useMemo(
    () => ({
      async upsertShortcut(draft: ShortcutDraft) {
        const now = new Date().toISOString();
        const id = draft.id ?? crypto.randomUUID();
        const existing = state.shortcuts[id];
        const shortcut: Shortcut = {
          id,
          name: draft.name,
          url: draft.url,
          icon: draft.icon,
          tileColor: draft.tileColor ?? existing?.tileColor ?? state.settings.defaultTileColor,
          textColor: draft.textColor ?? existing?.textColor ?? state.settings.defaultTextColor,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now
        };
        const order = existing ? state.shortcutOrder : [...state.shortcutOrder, id];

        await saveShortcut(shortcut, order);
        setState((current) => ({
          ...current,
          shortcuts: { ...current.shortcuts, [id]: shortcut },
          shortcutOrder: order
        }));
      },

      async removeShortcut(id: string) {
        const order = state.shortcutOrder.filter((shortcutId) => shortcutId !== id);
        await deleteShortcut(id, order);
        setState((current) => {
          const nextShortcuts = { ...current.shortcuts };
          delete nextShortcuts[id];
          return {
            ...current,
            shortcuts: nextShortcuts,
            shortcutOrder: order
          };
        });
      },

      async reorderShortcuts(activeId: string, overId: string) {
        const order = moveItem(state.shortcutOrder, activeId, overId);
        if (order === state.shortcutOrder) {
          return;
        }

        setState((current) => ({
          ...current,
          shortcutOrder: order
        }));

        try {
          await saveShortcutOrder(order);
        } catch (error) {
          setState((current) => ({
            ...current,
            shortcutOrder: state.shortcutOrder
          }));
          throw error;
        }
      },

      async updateSettings(settings: Settings, options?: { applyShortcutDefaults?: boolean }) {
        if (options?.applyShortcutDefaults) {
          const now = new Date().toISOString();
          const shortcuts = Object.fromEntries(
            Object.entries(state.shortcuts).map(([id, shortcut]) => [
              id,
              {
                ...shortcut,
                tileColor: settings.defaultTileColor,
                textColor: settings.defaultTextColor,
                updatedAt: now
              }
            ])
          );
          const nextState = {
            ...state,
            settings,
            shortcuts
          };

          await saveSettings(settings);
          await saveShortcuts(shortcuts, state.shortcutOrder);
          setState(nextState);
          return;
        }

        await saveSettings(settings);
        setState((current) => ({
          ...current,
          settings
        }));
      },

      async importState(nextState: SpeedDialState) {
        await replaceState(nextState);
        setState(nextState);
      }
    }),
    [state]
  );

  return {
    state,
    isLoading,
    error,
    actions,
    refresh
  };
}
