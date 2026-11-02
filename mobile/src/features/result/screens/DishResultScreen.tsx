import type { ReactNode } from 'react';
import { StyleSheet, Text, type ImageSourcePropType } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { ResultPodium } from '../../../shared/ui';
import { DishResultFrame } from '../components/DishResultFrame';
import { ResultCompanions } from '../components/ResultCompanions';
import { resultPrice, type ResultCompanion, type ScoredResult } from '../services/resultPresentation';

export type DishResultScreenProps = { result: ScoredResult; onHome: () => void; onNewSession: () => void; members?: readonly ResultCompanion[]; artworkSources?: Readonly<Record<string, ImageSourcePropType>>; isMock?: boolean; children?: ReactNode; tools?: ReactNode };
export function DishResultScreen({ result, members = [], artworkSources, children, ...frame }: DishResultScreenProps) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const price = result.winner ? resultPrice(result.winner) : null;
  return <DishResultFrame {...frame}>
    <ResultPodium presentation="podium" colors={colors} dishes={result.topDishes.map(entry => ({ id: entry.dish.roundDishId, name: entry.dish.name, rank: entry.rank as 1 | 2 | 3, winner: entry.isWinner, scoreLabel: `${entry.score} điểm`, imageSource: artworkSources?.[entry.dish.dishId], imageUri: entry.dish.artwork?.uri, imageAttribution: entry.dish.artwork?.attribution }))} />
    {price ? <Text style={[styles.price, { color: colors.muted }, textStyle(400)]}>{price}</Text> : null}
    <ResultCompanions members={members} />
    {children}
  </DishResultFrame>;
}
const styles = StyleSheet.create({ price: { fontSize: 12, lineHeight: 18 } });
