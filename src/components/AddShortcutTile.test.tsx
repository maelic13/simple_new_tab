import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AddShortcutTile } from "./AddShortcutTile";

describe("AddShortcutTile", () => {
  it("calls add handler", () => {
    const onAdd = vi.fn();

    render(<AddShortcutTile onAdd={onAdd} />);

    fireEvent.click(screen.getByRole("button", { name: "Add shortcut" }));

    expect(onAdd).toHaveBeenCalled();
  });
});
