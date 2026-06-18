import { Plus } from "lucide-react";

type AddShortcutTileProps = {
  onAdd: () => void;
};

export function AddShortcutTile({ onAdd }: AddShortcutTileProps) {
  return (
    <button className="add-shortcut-tile" type="button" aria-label="Add shortcut" title="Add shortcut" onClick={onAdd}>
      <span className="add-shortcut-icon" aria-hidden="true">
        <Plus size={30} />
      </span>
    </button>
  );
}
