import type { ReactNode } from 'react';
import { StyleSheet, Text, type ImageSourcePropType } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { ResultPodium } from '../../../shared/ui';
import { DishResultFrame } from '../components/DishResultFrame';
import { ResultCompanions } from '../components/ResultCompanions';
import { podiumOrder, resultPrice, type ResultCompanion, type ScoredResult } from '../services/resultPresentation';

export type DishResultScreenProps = { result: ScoredResult; onHome: () => void; onNewSession: () => void; members?: readonly ResultCompanion[]; artworkSources?: Readonly<Record<string, ImageSourcePropType>>; children?: ReactNode };
export function DishResultScreen({ result, members = [], artworkSources, children, ...frame }: DishResultScreenProps) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const price = result.winner ? resultPrice(result.winner) : null;
  // The server orders equal scores by WANT votes, then decision speed; the position on the podium follows that order.
  const ordered = podiumOrder(result.topDishes);
  const tied = ordered.some((entry, index) => index > 0 && entry.score === ordered[index - 1]!.score);
  return <DishResultFrame {...frame}>
    <ResultPodium presentation="podium" colors={colors} dishes={ordered.map((entry, index) => ({ id: entry.dish.roundDishId, name: entry.dish.name, rank: (index + 1) as 1 | 2 | 3, winner: entry.isWinner, scoreLabel: `${entry.score} điểm`, imageSource: artworkSources?.[entry.dish.dishId], imageScale: 1, imageUri: entry.dish.artwork?.uri, imageAttribution: entry.dish.artwork?.attribution }))} />
    {tied ? <Text style={[styles.price, { color: colors.muted, textAlign: 'center' }, textStyle(400)]}>Đồng điểm: xếp theo số lượt Muốn ăn, rồi tốc độ chọn.</Text> : null}
    {price ? <Text style={[styles.price, { color: colors.muted }, textStyle(400)]}>{price}</Text> : null}
    <ResultCompanions members={members} />
    {children}
  </DishResultFrame>;
}
const styles = StyleSheet.create({ price: { fontSize: 12, lineHeight: 18 } });
