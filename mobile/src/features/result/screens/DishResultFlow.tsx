import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { DishResultFrame } from '../components/DishResultFrame';
import { ResultReadNotice } from '../components/ResultReadNotice';
import { WinnerCelebration } from '../components/WinnerCelebration';
import { useWinnerCelebration } from '../hooks/useWinnerCelebration';
import { isWinnerResult, noConsensusReason } from '../model';
import { validScoredResult, type NearbyState, type ResultCompanion, type ResultInput, type ResultPresentationActions, type ResultReadState } from '../services/resultPresentation';
import { DishResultScreen } from './DishResultScreen';
import { DishNoConsensusScreen } from './DishNoConsensusScreen';
import { LegacyDishResultScreen } from './LegacyDishResultScreen';
import { NearbyPlacesSection } from '../components/NearbyPlacesSection';
import type { ResultMapRenderer } from '../services/nearbyPresentation';

export type DishResultFlowProps = ResultPresentationActions & { input: ResultInput | null; readState?: ResultReadState; members?: readonly ResultCompanion[]; artworkSources?: Readonly<Record<string, ImageSourcePropType>>; isMock?: boolean; controls?: ReactNode; celebrate?: boolean; children?: ReactNode; nearby?: NearbyState; renderMap?: ResultMapRenderer };
export function DishResultFlow({ input, readState = 'ready', members, artworkSources, isMock = false, controls, celebrate = true, children, nearby, renderMap, ...actions }: DishResultFlowProps) {
  const result = input?.capability === 'scored-v4' && validScoredResult(input.result) ? input.result : null;
  const winner = readState === 'ready' && result?.status === 'DECIDED' ? result.topDishes.find(entry => entry.isWinner) : undefined;
  const intro = useWinnerCelebration(celebrate && winner ? result!.resultId : undefined);
  const frame = { onHome: actions.onHome, onNewSession: actions.onNewSession, isMock, tools: controls };
  if (readState === 'ready') {
    if (input?.capability === 'legacy-unscored-v1') {
      if (isWinnerResult(input.result)) return <LegacyDishResultScreen {...frame} name={input.result.winnerDish.name} />;
      if (noConsensusReason(input.result)) return <DishNoConsensusScreen {...frame} reason={input.result.reasonCode as 'EMPTY_INTERSECTION' | 'ALL_REMOVED'} />;
    }
    if (result?.status === 'NO_CONSENSUS') return <DishNoConsensusScreen {...frame} reason={result.reasonCode as 'EMPTY_INTERSECTION' | 'ALL_REMOVED'} />;
    if (result && winner) return <><DishResultScreen {...frame} result={result} artworkSources={artworkSources} members={members}><NearbyPlacesSection result={result} state={nearby} isMock={isMock} renderMap={renderMap} actions={actions} />{children}</DishResultScreen>{intro.visible ? <WinnerCelebration key={result.resultId} winner={winner} imageSource={artworkSources?.[winner.dish.dishId]} onDismiss={intro.dismiss} /> : null}</>;
  }
  return <DishResultFrame onHome={actions.onHome} isMock={isMock} tools={controls}><ResultReadNotice state={readState === 'ready' ? 'error' : readState} onRetry={actions.onRetryResult} /></DishResultFrame>;
}
