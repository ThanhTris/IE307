/**
 * Device storage (SQLite outbox and caches) is best effort. A slow or stuck local write must never
 * hold back data that already arrived from the server, so callers wait at most `ms` and then move on.
 * The underlying task keeps running; its result or error is simply ignored after the deadline.
 */
export const LOCAL_STORE_TIMEOUT_MS = 3_000;

export function settleWithin<T>(task: Promise<T>, fallback: T, ms = LOCAL_STORE_TIMEOUT_MS): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms);
    task.then(
      value => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(fallback); },
    );
  });
}
