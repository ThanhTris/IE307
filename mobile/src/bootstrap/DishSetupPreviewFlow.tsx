import { useState } from 'react';
import { DishSetupFlow } from '../features/context/screens/DishSetupFlow';
import { createDishSetupCase } from './dishSetupCases';
import { DishSetupCasePicker } from './DishSetupCasePicker';
import type { SetupRoom } from '../features/context/services/dishSetup';

export function DishSetupPreviewFlow({ onExit, onLobby }: { onExit: () => void; onLobby?: (room: SetupRoom) => void }) {
  const [fixture, setFixture] = useState(() => ({ id: 'R01', revision: 0, flow: createDishSetupCase('R01') }));
  return <DishSetupFlow key={`${fixture.id}-${fixture.revision}`} {...fixture.flow} onExit={onExit} onLobby={onLobby} controls={(locked, stage) => __DEV__ ? <DishSetupCasePicker key={`${stage}-${fixture.revision}`} stage={stage} selectedId={fixture.id} locked={locked} onSelect={id => { const next = createDishSetupCase(id, Date.now(), stage === 'preferences' ? 'preferences' : 'setup'); setFixture(value => ({ id, revision: value.revision + 1, flow: next })); }} /> : null} />;
}
