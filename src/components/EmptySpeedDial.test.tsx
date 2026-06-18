import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EmptySpeedDial } from "./EmptySpeedDial";

describe("EmptySpeedDial", () => {
  it("shows add and settings actions when enabled", () => {
    const onAddShortcut = vi.fn();
    const onOpenSettings = vi.fn();

    render(<EmptySpeedDial onAddShortcut={onAddShortcut} onOpenSettings={onOpenSettings} />);

    fireEvent.click(screen.getByRole("button", { name: "Add shortcut" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(onAddShortcut).toHaveBeenCalled();
    expect(onOpenSettings).toHaveBeenCalled();
  });
});
