import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../types";
import { SettingsPanel } from "./SettingsPanel";

afterEach(() => {
  vi.restoreAllMocks();
});

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
      onResetToDefaults={vi.fn()}
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

  it("keeps an explicit theme selection when the resolved system theme changes", async () => {
    const onPreview = vi.fn();
    const view = renderSettingsPanel({ resolvedTheme: "dark", onPreview });
    const themeControls = within(screen.getByLabelText("Theme"));

    fireEvent.click(themeControls.getByRole("button", { name: "Light" }));

    await waitFor(() => {
      expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "light" }));
    });

    view.rerender(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        resolvedTheme="light"
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPreview={onPreview}
        onImport={vi.fn()}
        onExport={vi.fn()}
        onResetToDefaults={vi.fn()}
        onAddShortcut={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "light" }));
    });
    expect(themeControls.getByRole("button", { name: "Light" })).toHaveClass("active");
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

  it("saves add shortcut tile visibility", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ onSave });

    fireEvent.click(screen.getByLabelText(/Show add shortcut tile/));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          showAddShortcutTile: false
        },
        undefined
      );
    });
  });

  it("resets defaults after confirmation", async () => {
    const onResetToDefaults = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderSettingsPanel({ onResetToDefaults });

    fireEvent.click(screen.getByRole("button", { name: "Reset defaults" }));

    await waitFor(() => {
      expect(onResetToDefaults).toHaveBeenCalled();
    });
  });

  it("updates controls when imported settings replace current settings", async () => {
    const importedSettings = {
      ...DEFAULT_SETTINGS,
      columns: 8,
      background: { kind: "color" as const, value: "#222222" },
      showShortcutActions: false,
      shortcutSize: 130,
      shortcutSpacing: 10,
      gridVerticalPosition: 20,
      tileContentMode: "iconOnly" as const,
      theme: "dark" as const
    };
    const view = renderSettingsPanel();

    view.rerender(
      <SettingsPanel
        settings={importedSettings}
        resolvedTheme="dark"
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onPreview={vi.fn()}
        onImport={vi.fn()}
        onExport={vi.fn()}
        onResetToDefaults={vi.fn()}
        onAddShortcut={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Column count")).toHaveValue(8);
    });
    expect(screen.getByLabelText("Shortcut size")).toHaveValue(130);
    expect(screen.getByLabelText("Shortcut spacing")).toHaveValue(10);
    expect(screen.getByLabelText("Vertical position")).toHaveValue(20);
    expect(screen.getByLabelText(/Show hover buttons/)).not.toBeChecked();
    expect(screen.getByLabelText("Shortcut content")).toHaveValue("iconOnly");
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

  it("keeps the current background when URL mode is empty", async () => {
    const onPreview = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const settings = {
      ...DEFAULT_SETTINGS,
      background: { kind: "color" as const, value: "#123456" }
    };

    renderSettingsPanel({ settings, onPreview, onSave });

    fireEvent.click(screen.getByRole("button", { name: "URL" }));

    expect(screen.getByLabelText("Image URL")).toHaveValue("");
    await waitFor(() => {
      expect(onPreview).toHaveBeenLastCalledWith(expect.objectContaining({ background: settings.background }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...settings,
          background: settings.background
        },
        undefined
      );
    });
  });

  it("saves background URL only after a URL is entered", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    renderSettingsPanel({ onSave });

    fireEvent.click(screen.getByRole("button", { name: "URL" }));
    fireEvent.change(screen.getByLabelText("Image URL"), { target: { value: "example.com/background.jpg" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          background: { kind: "url", value: "https://example.com/background.jpg" }
        },
        undefined
      );
    });
  });

  it("uses the shortcut-style upload control for background images and SVGs", () => {
    renderSettingsPanel();

    const backgroundControls = within(screen.getByLabelText("Background"));
    expect(backgroundControls.getByRole("button", { name: /Color/ })).toBeInTheDocument();
    expect(backgroundControls.getByRole("button", { name: "URL" })).toBeInTheDocument();
    expect(backgroundControls.getByRole("button", { name: /Upload image/ })).toBeInTheDocument();
    expect(backgroundControls.queryByRole("button", { name: "SVG" })).not.toBeInTheDocument();

    fireEvent.click(backgroundControls.getByRole("button", { name: /Upload image/ }));

    expect(screen.getByText("Choose file")).toBeInTheDocument();
    expect(screen.getByText("No file chosen")).toBeInTheDocument();
    expect(screen.getByText(/SVG backgrounds are synced/)).toBeInTheDocument();
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
