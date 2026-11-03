import { useState } from 'react';

/** Per mounted flow only; no private or durable storage. A refreshed result cannot replay its intro. */
export function useWinnerCelebration(resultId?: string) {
  const [state, setState] = useState(() => ({ key: resultId, seen: new Set(resultId ? [resultId] : []), open: !!resultId }));
  if (state.key !== resultId) {
    const seen = new Set(state.seen), open = !!resultId && !seen.has(resultId);
    if (resultId) seen.add(resultId);
    setState({ key: resultId, seen, open });
  }
  return { visible: state.key === resultId && state.open, dismiss: () => setState(previous => ({ ...previous, open: false })) };
}
