import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../types";
import { SettingsPanel } from "./SettingsPanel";

describe("SettingsPanel", () => {
  it("saves updated columns and default colors", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <SettingsPanel settings={DEFAULT_SETTINGS} onClose={vi.fn()} onSave={onSave} onImport={vi.fn()} onExport={vi.fn()} onAddShortcut={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText("Columns slider"), { target: { value: "7" } });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          columns: 7
        },
        undefined
      );
    });

    fireEvent.change(screen.getByLabelText("Tile color"), { target: { value: "#24272e" } });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        {
          ...DEFAULT_SETTINGS,
          columns: 7,
          defaultTileColor: "#24272e"
        },
        { applyShortcutDefaults: true }
      );
    });
  });

  it("calls export from the settings panel", () => {
    const onExport = vi.fn();

    render(
      <SettingsPanel settings={DEFAULT_SETTINGS} onClose={vi.fn()} onSave={vi.fn()} onImport={vi.fn()} onExport={onExport} onAddShortcut={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(onExport).toHaveBeenCalled();
  });
});
