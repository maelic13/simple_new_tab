import { useEffect, useState } from "react";

const PAGE_PADDING = 96;
const MIN_TILE_WIDTH = 148;

function getEffectiveColumns(requestedColumns: number, shortcutSize = 100, shortcutSpacing = 50): number {
  if (typeof window === "undefined") {
    return requestedColumns;
  }

  const sizeScale = Math.min(1.4, Math.max(0.5, shortcutSize / 100));
  const minTileWidth = Math.round(MIN_TILE_WIDTH * sizeScale);
  const gap = Math.round((Math.min(100, Math.max(0, shortcutSpacing)) / 100) * 32);
  const available = Math.max(minTileWidth, window.innerWidth - PAGE_PADDING);
  const possibleColumns = Math.max(1, Math.floor((available + gap) / (minTileWidth + gap)));
  return Math.min(requestedColumns, possibleColumns);
}

export function useResponsiveColumns(requestedColumns: number, shortcutSize = 100, shortcutSpacing = 50): number {
  const [columns, setColumns] = useState(() => getEffectiveColumns(requestedColumns, shortcutSize, shortcutSpacing));

  useEffect(() => {
    const update = () => setColumns(getEffectiveColumns(requestedColumns, shortcutSize, shortcutSpacing));

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [requestedColumns, shortcutSize, shortcutSpacing]);

  return columns;
}
