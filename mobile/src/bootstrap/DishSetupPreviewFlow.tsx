import { useState } from 'react';
import { DishSetupFlow } from '../features/context/screens/DishSetupFlow';
import { createDishSetupCase } from './dishSetupCases';
import { DishSetupCasePicker } from './DishSetupCasePicker';

export function DishSetupPreviewFlow({ onExit }: { onExit: () => void }) {
  const [fixture, setFixture] = useState(() => ({ id: 'R01', revision: 0, flow: createDishSetupCase('R01') }));
  return <DishSetupFlow key={`${fixture.id}-${fixture.revision}`} {...fixture.flow} onExit={onExit} controls={(locked, stage) => __DEV__ ? <DishSetupCasePicker key={`${stage}-${fixture.revision}`} stage={stage} selectedId={fixture.id} locked={locked} onSelect={id => { const next = createDishSetupCase(id, Date.now(), stage === 'preferences' ? 'preferences' : 'setup'); setFixture(value => ({ id, revision: value.revision + 1, flow: next })); }} /> : null} />;
}
