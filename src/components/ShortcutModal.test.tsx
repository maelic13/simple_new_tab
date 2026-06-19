import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ShortcutModal } from "./ShortcutModal";

describe("ShortcutModal", () => {
  it("saves a favicon shortcut with normalized URL and defaults", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<ShortcutModal defaultTileColor="#ffffff" defaultTextColor="#111827" onClose={onClose} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Example" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        id: undefined,
        name: "Example",
        url: "https://example.com/",
        icon: { kind: "favicon" },
        tileColor: "#ffffff",
        textColor: "#111827"
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("shows validation when the URL scheme is unsupported", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<ShortcutModal defaultTileColor="#ffffff" defaultTextColor="#111827" onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "ftp://example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Only http and https URLs are supported.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps generic icon mode when saving without selecting a discovered icon", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ShortcutModal
        defaultTileColor="#ffffff"
        defaultTextColor="#111827"
        onClose={vi.fn()}
        onSave={onSave}
        shortcut={{
          id: "a",
          name: "Example",
          url: "https://example.com/",
          icon: { kind: "url", url: "https://example.com/icon.png" },
          tileColor: "#ffffff",
          textColor: "#111827",
          createdAt: "2026-06-18T00:00:00.000Z",
          updatedAt: "2026-06-18T00:00:00.000Z"
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Icon" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ icon: { kind: "favicon" } }));
    });
  });

  it("labels manually entered icon URLs as previews", () => {
    render(<ShortcutModal defaultTileColor="#ffffff" defaultTextColor="#111827" onClose={vi.fn()} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "URL" }));
    fireEvent.change(screen.getByLabelText("Icon URL"), { target: { value: "https://example.com/icon.svg" } });

    expect(screen.getByText("Icon preview.")).toBeInTheDocument();
    expect(screen.queryByText("Auto-loaded icon.")).not.toBeInTheDocument();
  });
});
