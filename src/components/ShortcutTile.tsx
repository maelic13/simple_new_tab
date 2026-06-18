import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Pencil, Trash2 } from "lucide-react";
import { type MouseEvent, useRef } from "react";

import type { Shortcut, TileContentMode } from "../types";
import { IconImage } from "./IconImage";

type ShortcutTileProps = {
  shortcut: Shortcut;
  contentMode: TileContentMode;
  suppressOpen: boolean;
  showActions: boolean;
  isSelected: boolean;
  isSelectionVisible: boolean;
  onEdit: (shortcut: Shortcut) => void;
  onDelete: (shortcut: Shortcut) => void;
  onOpen: (shortcut: Shortcut) => void;
  onToggleSelected: (shortcut: Shortcut) => void;
  onContextMenu: (event: MouseEvent, shortcut: Shortcut) => void;
};

export function ShortcutTile({ shortcut, contentMode, suppressOpen, showActions, isSelected, isSelectionVisible, onEdit, onDelete, onOpen, onToggleSelected, onContextMenu }: ShortcutTileProps) {
  const pointerStart = useRef<{ x: number; y: number } | undefined>();
  const suppressClick = useRef(false);
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: shortcut.id
  });
  const { onPointerDown: sortablePointerDown, ...sortableListeners } = listeners ?? {};
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: shortcut.tileColor,
    color: shortcut.textColor
  };

  return (
    <article
      ref={setNodeRef}
      className={`shortcut-tile mode-${contentMode}${isDragging ? " is-dragging" : ""}${isSelected ? " is-selected" : ""}${isSelectionVisible ? " selection-visible" : ""}`}
      style={style}
      onContextMenu={(event) => onContextMenu(event, shortcut)}
    >
      {showActions || isSelectionVisible || isSelected ? (
        <label className="shortcut-select" title={`Select ${shortcut.name}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${shortcut.name}`}
            checked={isSelected}
            onChange={() => onToggleSelected(shortcut)}
          />
        </label>
      ) : null}
      {showActions ? (
        <div className="tile-actions">
          <button className="icon-button subtle" title="Edit" aria-label={`Edit ${shortcut.name}`} onClick={() => onEdit(shortcut)}>
            <Pencil size={16} />
          </button>
          <button className="icon-button subtle danger" title="Delete" aria-label={`Delete ${shortcut.name}`} onClick={() => onDelete(shortcut)}>
            <Trash2 size={16} />
          </button>
        </div>
      ) : null}
      <div
        ref={setActivatorNodeRef}
        className="shortcut-link"
        title={shortcut.url}
        {...attributes}
        {...sortableListeners}
        role="link"
        tabIndex={0}
        onPointerDown={(event) => {
          pointerStart.current = { x: event.clientX, y: event.clientY };
          suppressClick.current = false;
          sortablePointerDown?.(event);
        }}
        onPointerMove={(event) => {
          if (!pointerStart.current) {
            return;
          }

          const dx = event.clientX - pointerStart.current.x;
          const dy = event.clientY - pointerStart.current.y;
          if (Math.hypot(dx, dy) > 6) {
            suppressClick.current = true;
          }
        }}
        onClick={(event) => {
          if (suppressClick.current) {
            event.preventDefault();
            suppressClick.current = false;
            return;
          }
          if (isSelectionVisible) {
            onToggleSelected(shortcut);
            return;
          }
          if (!suppressOpen) {
            onOpen(shortcut);
          }
        }}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && isSelectionVisible) {
            event.preventDefault();
            onToggleSelected(shortcut);
            return;
          }
          if ((event.key === "Enter" || event.key === " ") && !suppressOpen) {
            event.preventDefault();
            onOpen(shortcut);
          }
        }}
      >
        {contentMode !== "nameOnly" ? (
          <span className="shortcut-icon-shell" aria-hidden="true">
            <IconImage shortcut={shortcut} />
          </span>
        ) : null}
        {contentMode !== "iconOnly" ? (
          <span className="shortcut-text">
            <span className="shortcut-name">{shortcut.name}</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}
