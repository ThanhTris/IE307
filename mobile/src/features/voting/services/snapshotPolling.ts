// Only one background read is in flight. Failures/NOT_READY back off to 5s,
// then at most 10s. A successful read restores the normal 2.5s cadence.
export function startVotingSnapshotPolling(
  read: (shouldApply: () => boolean) => Promise<unknown | null>,
  hasNavigated: () => boolean,
): () => void {
  let active = true;
  let delay = 2500;
  let timer: ReturnType<typeof setTimeout>;
  const shouldApply = () => active && !hasNavigated();
  const poll = async () => {
    if (!shouldApply()) return;
    let succeeded = false;
    try {
      succeeded = await read(shouldApply) !== null;
    } catch {
      // Retry background transport failures without replacing the local draft.
    }
    if (!shouldApply()) return;
    delay = succeeded ? 2500 : Math.min(delay * 2, 10000);
    timer = setTimeout(() => { void poll(); }, delay);
  };
  timer = setTimeout(() => { void poll(); }, delay);
  return () => { active = false; clearTimeout(timer); };
}
