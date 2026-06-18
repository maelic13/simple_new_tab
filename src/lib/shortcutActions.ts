import { getShortcutAppearance, type ResolvedThemeMode, type Shortcut, type ShortcutIcon } from "../types";
import { loadState, saveShortcut } from "./storage";

export type ShortcutSaveDraft = {
  name: string;
  url: string;
  icon: ShortcutIcon;
};

export async function addShortcutToEnd(draft: ShortcutSaveDraft, resolvedTheme: ResolvedThemeMode): Promise<Shortcut> {
  const state = await loadState();
  const now = new Date().toISOString();
  const appearance = getShortcutAppearance(state.settings, resolvedTheme);
  const shortcut: Shortcut = {
    id: crypto.randomUUID(),
    name: draft.name,
    url: draft.url,
    icon: draft.icon,
    tileColor: appearance.tileColor,
    textColor: appearance.textColor,
    createdAt: now,
    updatedAt: now
  };

  await saveShortcut(shortcut, [...state.shortcutOrder, shortcut.id]);
  return shortcut;
}
