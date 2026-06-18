import { useEffect, useState } from "react";

const PAGE_PADDING = 48;
const MIN_TILE_WIDTH = 148;

function getEffectiveColumns(requestedColumns: number): number {
  if (typeof window === "undefined") {
    return requestedColumns;
  }

  const available = Math.max(MIN_TILE_WIDTH, window.innerWidth - PAGE_PADDING);
  const possibleColumns = Math.max(1, Math.floor(available / MIN_TILE_WIDTH));
  return Math.min(requestedColumns, possibleColumns);
}

export function useResponsiveColumns(requestedColumns: number): number {
  const [columns, setColumns] = useState(() => getEffectiveColumns(requestedColumns));

  useEffect(() => {
    const update = () => setColumns(getEffectiveColumns(requestedColumns));

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [requestedColumns]);

  return columns;
}
