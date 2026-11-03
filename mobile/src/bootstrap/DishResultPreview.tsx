import { useEffect, useRef, useState } from 'react';
import { DishResultFlow } from '../features/result/screens/DishResultFlow';
import { validScoredResult, type NearbyState, type NearbyStatus, type ResultInput, type ResultReadState } from '../features/result/services/resultPresentation';
import { dishResultFixture, nearbyFixture, scoredResultFixture, type ResultCase } from './dishResultFixtures';
import { ResultCasePicker } from './ResultCasePicker';
import { setPreviewScenario } from './roomPreview';

const photos = [require('../../assets/brand/result/pho.png'), require('../../assets/brand/result/rice.png'), require('../../assets/brand/result/bun.png')];
export function DishResultPreview({ noConsensus = false, onHome, onNewSession, onOtherScreen }: { noConsensus?: boolean; onHome: () => void; onNewSession: () => void; onOtherScreen: () => void }) {
  const [fixture, setFixture] = useState<{ id: ResultCase; revision: number }>({ id: noConsensus ? 'empty-r1' : 'top3', revision: 0 });
  const [nearbyStatus, setNearbyStatus] = useState<NearbyStatus>('ready'), [readOverride, setReadOverride] = useState<ResultReadState>();
  const [busy, setBusy] = useState(false), [actionFails, setActionFails] = useState(false), [intro, setIntro] = useState(true);
  const [recoveredInput, setRecoveredInput] = useState<ResultInput>();
  const mounted = useRef(false), sequence = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const { input: fixtureInput, readState } = dishResultFixture(fixture.id), state = readOverride ?? readState;
  const input = recoveredInput ?? fixtureInput;
  const result = input.capability === 'scored-v4' ? input.result : undefined;
  const showPlaces = !!result && validScoredResult(result) && result.status === 'DECIDED' && state === 'ready';
  const nearby: NearbyState | undefined = result ? nearbyFixture(result, nearbyStatus) : undefined;
  const artworkSources = result && fixture.id !== 'missing' ? Object.fromEntries(result.topDishes.map((item, index) => [item.dish.dishId, photos[index]!])) : undefined;
  const changeCase = (id: ResultCase) => { sequence.current++; setFixture(previous => ({ id, revision: previous.revision + 1 })); setNearbyStatus('ready'); setReadOverride(undefined); setRecoveredInput(undefined); setIntro(false); setBusy(false); };
  const receiveResult = () => {
    // Simulate a fresh valid response, never bypass validation of the malformed fixture.
    if (fixture.id === 'invalid' && fixtureInput.capability === 'scored-v4') {
      setRecoveredInput({ capability: 'scored-v4', result: { ...scoredResultFixture(), resultId: fixtureInput.result.resultId } });
    }
    setIntro(true);
    setReadOverride('ready');
  };
  const loadPlaces = async () => {
    const version = ++sequence.current;
    setBusy(true); setNearbyStatus('loading');
    await new Promise(resolve => setTimeout(resolve, 250));
    if (mounted.current && sequence.current === version) { setNearbyStatus('ready'); setBusy(false); }
  };
  const controls = __DEV__ ? <ResultCasePicker key={noConsensus ? 'no-consensus' : 'result'} noConsensus={noConsensus} showPlaces={showPlaces} locked={busy} onCase={changeCase} onNearby={setNearbyStatus} onOtherScreen={onOtherScreen} onCelebrate={showPlaces ? () => { setIntro(true); setFixture(previous => ({ ...previous, revision: previous.revision + 1 })); } : undefined} onReadReady={state !== 'ready' ? receiveResult : undefined} onActionFailure={() => setActionFails(value => !value)} /> : null;
  return <DishResultFlow key={`${fixture.id}-${fixture.revision}`} input={input} readState={state} nearby={nearby} artworkSources={artworkSources} isMock celebrate={intro} members={[{ id: 'ui-own', label: 'Bạn' }, { id: 'ui-linh', label: 'Linh' }, { id: 'ui-nam', label: 'Nam' }]} controls={controls}
    onHome={onHome} onNewSession={() => { setPreviewScenario('default'); onNewSession(); }} onRetryResult={receiveResult}
    onRetryPlaces={loadPlaces} onRequestLocation={loadPlaces} onOpenSettings={loadPlaces} onExternalAction={() => ({ ok: !actionFails })} />;
}
