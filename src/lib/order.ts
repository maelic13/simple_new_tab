export function moveItem<T>(items: T[], active: T, over: T): T[] {
  const from = items.indexOf(active);
  const to = items.indexOf(over);

  if (from === -1 || to === -1 || from === to) {
    return items;
  }

  const next = [...items];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}

export function compactOrder(order: string[], shortcuts: Record<string, unknown>): string[] {
  const seen = new Set<string>();

  return order.filter((id) => {
    if (!shortcuts[id] || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}
