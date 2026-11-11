export interface QuotaLease { release(): void }
export interface Quota { acquire(user: string): QuotaLease | null }

/** Test/local adapter ONLY. Multi-instance production quota is not implemented. */
export function memoryQuota(limit = 3, windowMs = 60_000, now = Date.now, capacity = 128): Quota {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs <= 0 ||
      !Number.isInteger(capacity) || capacity < 1) throw new Error('Invalid local quota');
  const windows = new Map<string, { until: number; hits: number; busy: boolean }>();
  return { acquire(user) {
    const at = now();
    for (const [id, entry] of windows) if (!entry.busy && entry.until <= at) windows.delete(id);
    let entry = windows.get(user);
    if (!entry) {
      if (windows.size >= capacity) return null;
      entry = { until: at + windowMs, hits: 0, busy: false };
      windows.set(user, entry);
    }
    if (entry.busy || entry.hits >= limit) return null;
    entry.hits++; entry.busy = true;
    return { release() { entry.busy = false; } };
  } };
}
