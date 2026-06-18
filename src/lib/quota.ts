export const SYNC_QUOTAS = {
  maxTotalBytes: 102_400,
  maxItemBytes: 8_192
};

export type SyncSnapshot = Record<string, unknown>;

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function getJsonByteSize(value: unknown): number {
  return byteLength(JSON.stringify(value));
}

export function getSyncEntryBytes(key: string, value: unknown): number {
  return byteLength(key) + getJsonByteSize(value);
}

export function getSyncSnapshotBytes(snapshot: SyncSnapshot): number {
  return Object.entries(snapshot).reduce((total, [key, value]) => total + getSyncEntryBytes(key, value), 0);
}

export function assertSyncEntryFits(key: string, value: unknown): void {
  const bytes = getSyncEntryBytes(key, value);

  if (bytes > SYNC_QUOTAS.maxItemBytes) {
    throw new Error(`${key} is ${bytes} bytes, above the ${SYNC_QUOTAS.maxItemBytes} byte sync item limit.`);
  }
}

export function assertSyncSnapshotFits(snapshot: SyncSnapshot): void {
  for (const [key, value] of Object.entries(snapshot)) {
    assertSyncEntryFits(key, value);
  }

  const bytes = getSyncSnapshotBytes(snapshot);
  if (bytes > SYNC_QUOTAS.maxTotalBytes) {
    throw new Error(`Sync payload is ${bytes} bytes, above the ${SYNC_QUOTAS.maxTotalBytes} byte total limit.`);
  }
}

export function canSyncEntry(key: string, value: unknown): boolean {
  try {
    assertSyncEntryFits(key, value);
    return true;
  } catch {
    return false;
  }
}

export function canSyncTextAsset(text: string): boolean {
  return getSyncEntryBytes("asset-preview", { text }) < SYNC_QUOTAS.maxItemBytes - 768;
}
