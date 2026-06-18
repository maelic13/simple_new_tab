import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../types";
import { addShortcutToEnd } from "./shortcutActions";
import { loadState, saveShortcut } from "./storage";

vi.mock("./storage", () => ({
  loadState: vi.fn(),
  saveShortcut: vi.fn()
}));

describe("shortcutActions", () => {
  beforeEach(() => {
    vi.mocked(loadState).mockResolvedValue({
      schemaVersion: SCHEMA_VERSION,
      settings: DEFAULT_SETTINGS,
      shortcuts: {},
      shortcutOrder: ["existing"]
    });
    vi.mocked(saveShortcut).mockResolvedValue(undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000001");
  });

  it("adds a shortcut at the end using the active theme appearance", async () => {
    const shortcut = await addShortcutToEnd(
      {
        name: "Example",
        url: "https://example.com/",
        icon: { kind: "favicon" }
      },
      "dark"
    );

    expect(shortcut).toMatchObject({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Example",
      url: "https://example.com/",
      icon: { kind: "favicon" },
      tileColor: DEFAULT_SETTINGS.shortcutAppearanceByTheme.dark.tileColor,
      textColor: DEFAULT_SETTINGS.shortcutAppearanceByTheme.dark.textColor
    });
    expect(saveShortcut).toHaveBeenCalledWith(shortcut, ["existing", "00000000-0000-4000-8000-000000000001"]);
  });
});
