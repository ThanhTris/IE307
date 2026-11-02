import { useCallback, useState } from 'react';
import { initialSetupDraft, type SetupDraft } from '../services/dishSetup';

export function useDishSetupDraft(initial = initialSetupDraft()) {
  const [baseline, setBaseline] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const receive = useCallback((value: SetupDraft) => { setBaseline(value); setDraft(value); }, []);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  return { draft, dirty, receive, change: (patch: Partial<SetupDraft>) => setDraft(value => ({ ...value, ...patch })),
    reset: () => setDraft(baseline), markSaved: () => setBaseline(draft) };
}
