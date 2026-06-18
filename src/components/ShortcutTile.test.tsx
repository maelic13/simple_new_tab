import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Shortcut } from "../types";
import { ShortcutTile } from "./ShortcutTile";

const shortcut: Shortcut = {
  id: "a",
  name: "Example",
  url: "https://example.com/",
  icon: { kind: "favicon" },
  tileColor: "#ffffff",
  textColor: "#111827",
  createdAt: "2026-06-18T00:00:00.000Z",
  updatedAt: "2026-06-18T00:00:00.000Z"
};

function renderShortcutTile(overrides: Partial<Parameters<typeof ShortcutTile>[0]> = {}) {
  return render(
    <DndContext>
      <SortableContext items={[shortcut.id]}>
        <ShortcutTile
          shortcut={shortcut}
          contentMode="iconAndName"
          suppressOpen={false}
          showActions
          isSelected={false}
          isSelectionVisible={false}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onOpen={vi.fn()}
          onToggleSelected={vi.fn()}
          onContextMenu={vi.fn()}
          {...overrides}
        />
      </SortableContext>
    </DndContext>
  );
}

describe("ShortcutTile", () => {
  it("toggles selection from checkbox", () => {
    const onToggleSelected = vi.fn();

    renderShortcutTile({ onToggleSelected });

    fireEvent.click(screen.getByLabelText("Select Example"));

    expect(onToggleSelected).toHaveBeenCalledWith(shortcut);
  });

  it("hides checkbox when hover actions are disabled and nothing is selected", () => {
    renderShortcutTile({ showActions: false });

    expect(screen.queryByLabelText("Select Example")).not.toBeInTheDocument();
  });

  it("clicking tile toggles selection instead of opening during selection mode", () => {
    const onOpen = vi.fn();
    const onToggleSelected = vi.fn();

    renderShortcutTile({ isSelectionVisible: true, onOpen, onToggleSelected });

    fireEvent.click(screen.getByRole("link"));

    expect(onToggleSelected).toHaveBeenCalledWith(shortcut);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("marks tile selected and selection visible", () => {
    const { container } = renderShortcutTile({ isSelected: true, isSelectionVisible: true });

    expect(container.querySelector(".shortcut-tile")).toHaveClass("is-selected", "selection-visible");
    expect(screen.getByLabelText("Select Example")).toBeChecked();
  });
});
