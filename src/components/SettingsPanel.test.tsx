import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../types";
import { SettingsPanel } from "./SettingsPanel";

function renderSettingsPanel(overrides: Partial<Parameters<typeof SettingsPanel>[0]> = {}) {
  return render(
    <SettingsPanel
      settings={DEFAULT_SETTINGS}
      resolvedTheme="light"
      onClose={vi.fn()}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onPreview={vi.fn()}
      onImport={vi.fn()}
      onExport={vi.fn()}
      onAddShortcut={vi.fn()}
      {...overrides}
    />
  );
}

describe("SettingsPanel", () => {
  it("saves updated columns and default colors", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ onSave });

    fireEvent.change(screen.getByLabelText("Columns slider"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("Tile color"), { target: { value: "#24272e" } });

    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          columns: 7,
          defaultTileColor: "#24272e",
          shortcutAppearanceByTheme: {
            ...DEFAULT_SETTINGS.shortcutAppearanceByTheme,
            light: { tileColor: "#24272e", textColor: DEFAULT_SETTINGS.defaultTextColor }
          }
        },
        { applyShortcutDefaults: true }
      );
    });
  });

  it("remembers custom shortcut appearance per light and dark mode", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ settings: { ...DEFAULT_SETTINGS, theme: "dark" }, resolvedTheme: "dark", onSave });
    const themeControls = within(screen.getByLabelText("Theme"));

    fireEvent.change(screen.getByLabelText("Tile color"), { target: { value: "#000000" } });
    fireEvent.click(themeControls.getByRole("button", { name: "Light" }));

    expect(screen.getByLabelText("Tile color")).toHaveValue(DEFAULT_SETTINGS.shortcutAppearanceByTheme.light.tileColor.toLowerCase());

    fireEvent.change(screen.getByLabelText("Tile color"), { target: { value: "#ffffff" } });
    fireEvent.click(themeControls.getByRole("button", { name: "Dark" }));

    expect(screen.getByLabelText("Tile color")).toHaveValue("#000000");

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: "dark",
          defaultTileColor: "#000000",
          shortcutAppearanceByTheme: {
            light: { tileColor: "#ffffff", textColor: DEFAULT_SETTINGS.defaultTextColor },
            dark: { tileColor: "#000000", textColor: DEFAULT_SETTINGS.shortcutAppearanceByTheme.dark.textColor }
          }
        }),
        { applyShortcutDefaults: true }
      );
    });
  });

  it("allows up to twelve columns", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ onSave });

    fireEvent.change(screen.getByLabelText("Columns slider"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          columns: 12
        },
        undefined
      );
    });
  });

  it("calls export from the settings panel", () => {
    const onExport = vi.fn();

    renderSettingsPanel({ onExport });

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(onExport).toHaveBeenCalled();
  });

  it("saves shortcut hover button visibility", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ onSave });

    fireEvent.click(screen.getByLabelText(/Show hover buttons/));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          showShortcutActions: false
        },
        undefined
      );
    });
  });

  it("saves background color presets on apply", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ onSave });

    fireEvent.click(screen.getByRole("button", { name: "Background Dark gray" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          background: { kind: "color", value: "#444444" }
        },
        undefined
      );
    });
  });

  it("saves relative layout controls", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ onSave });

    fireEvent.change(screen.getByLabelText("Shortcut size slider"), { target: { value: "120" } });
    fireEvent.change(screen.getByLabelText("Shortcut spacing slider"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          shortcutSize: 120,
          shortcutSpacing: 20
        },
        undefined
      );
    });
  });

  it("previews changes before apply and closes settings after save", async () => {
    const onPreview = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    renderSettingsPanel({ onPreview, onSave, onClose });

    fireEvent.change(screen.getByLabelText("Shortcut size slider"), { target: { value: "115" } });

    await waitFor(() => {
      expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ shortcutSize: 115 }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(screen.getByText("Saved.")).toBeInTheDocument();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
