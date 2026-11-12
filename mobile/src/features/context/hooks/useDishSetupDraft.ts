import { useCallback, useState } from 'react';
import { initialSetupDraft, type SetupDraft } from '../services/dishSetup';

export function useDishSetupDraft(initial = initialSetupDraft()) {
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const receive = useCallback((value: SetupDraft) => { setBaseline(value); setDraft(value); }, []);
  /** Starts the draft with these fields without counting them as unsaved edits (e.g. the friend chosen with "Rủ ăn"). */
  const seed = useCallback((patch: Partial<SetupDraft>) => { setBaseline(value => ({ ...value, ...patch })); setDraft(value => ({ ...value, ...patch })); }, []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  return { draft, dirty, receive, seed, change: (patch: Partial<SetupDraft>) => setDraft(value => ({ ...value, ...patch })),
    reset: () => setDraft(baseline), markSaved: () => setBaseline(draft) };
}
