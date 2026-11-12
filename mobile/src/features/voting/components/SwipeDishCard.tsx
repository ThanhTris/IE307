import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { PoolDish } from '../../../data/api';
import { AppIcon, type Palette, type VoteValue } from '../../../shared/ui';
import { ChoiceIconView } from '../../../shared/ui/icons/ChoiceIcon';
import { formatDishPrice } from '../services/priceLabel';
import { dishCardFacts } from '../services/dishCardFacts';

const SWIPE_THRESHOLD = 110;
const DOUBLE_TAP_MS = 320;

const LABEL: Record<VoteValue, string> = { OK: 'ĂN ĐƯỢC', NO: 'KHÔNG ĂN', WANT: 'MUỐN ĂN' };

/**
 * Static card face: photo, name, short description, then every fact the server sent (dish family, cuisine, meals,
 * temperature, flavour, region) and the price. Anything the API does not return is left out, never guessed.
 */
export function DishCardFace({ dish, colors }: { dish: PoolDish; colors: Palette }) {
  const price = formatDishPrice(dish);
  const facts = dishCardFacts(dish);
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
    {dish.artwork?.url
      ? <Image source={{ uri: dish.artwork.url }} accessibilityIgnoresInvertColors resizeMode="cover" style={styles.image} />
      : <View testID="dish-image-fallback" style={[styles.image, styles.fallback, { backgroundColor: colors.warm }]}><ChoiceIconView icon={{ food: 'silverware-fork-knife' }} size={56} color={colors.primary} /></View>}
    <View style={styles.info}>
      <Text numberOfLines={2} style={[styles.name, { color: colors.text }]}>{dish.name}</Text>
      {dish.description ? <Text numberOfLines={2} style={[styles.meta, { color: colors.muted }]}>{dish.description}</Text> : null}
      {facts.length ? <View style={styles.facts}>
        {facts.map(fact => <View key={fact.key} style={[styles.fact, { backgroundColor: colors.warm }]}>
          {fact.icon ? <ChoiceIconView icon={fact.icon} size={14} color={colors.primary} /> : null}
          <Text numberOfLines={1} style={[styles.factText, { color: colors.text }]}>{fact.label}</Text>
        </View>)}
      </View> : null}
      {price ? <Text numberOfLines={1} style={[styles.price, { color: colors.text }]}>{price}</Text> : null}
    </View>
  </View>;
}

/**
 * Quizlet-style card: drag right = Ăn được (OK), drag left = Không ăn (NO), double tap = Muốn ăn (WANT).
 * The current choice is spelled out in the middle of the card while dragging. TalkBack users get the same
 * three choices as accessibility actions (the button alternative to swiping).
 */
export function SwipeDishCard({ dish, currentVote, disabled, onVote, enterFlip, colors }: {
  dish: PoolDish; currentVote?: VoteValue; disabled?: boolean; onVote: (vote: VoteValue) => void; /** Arrive by flipping in (after a double tap). */ enterFlip?: boolean; colors: Palette;
}) {
  const { width } = useWindowDimensions();
  const [pan] = useState(() => new Animated.ValueXY());
  const [flash] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));
  // -1…0…1 = flipped away / face up / flipped in: the card turns like a flashcard.
  const [flip] = useState(() => new Animated.Value(enterFlip ? 1 : 0));
  useEffect(() => { if (enterFlip) Animated.timing(flip, { toValue: 0, duration: 170, useNativeDriver: true }).start(); }, [enterFlip, flip]);
  const [burst] = useState(() => new Animated.Value(0));
  const [flashVote, setFlashVote] = useState<VoteValue | null>(null);
  const lastTap = useRef(0), leaving = useRef(false);
  const live = useRef({ disabled, onVote });
  useEffect(() => { live.current = { disabled, onVote }; });

  const fly = (vote: VoteValue, direction: number) => {
    leaving.current = true;
    Animated.timing(pan, { toValue: { x: direction * width * 1.4, y: 40 }, duration: 220, useNativeDriver: true }).start(() => live.current.onVote(vote));
  };
  /** Double tap: a heart pops and MUỐN ĂN is stamped, then the card flips over to reveal the next one. */
  const showWant = () => {
    leaving.current = true;
    setFlashVote('WANT');
    flash.setValue(0); burst.setValue(0); pulse.setValue(1);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(flash, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.spring(burst, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
      ]),
      Animated.delay(150),
      Animated.timing(flip, { toValue: -1, duration: 170, useNativeDriver: true }),
    ]).start(() => live.current.onVote('WANT'));
  };

  // Handlers read the refs only when a gesture happens, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => !live.current.disabled && !leaving.current && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_e, g) => pan.setValue({ x: g.dx, y: g.dy * 0.15 }),
    onPanResponderRelease: (_e, g) => {
      if (g.dx > SWIPE_THRESHOLD) fly('OK', 1);
      else if (g.dx < -SWIPE_THRESHOLD) fly('NO', -1);
      else Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start(),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pan, width]);

  const onPress = () => {
    if (disabled || leaving.current) return;
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) { lastTap.current = 0; showWant(); } else lastTap.current = now;
  };

  const rotate = pan.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-14deg', '0deg', '14deg'] });
  const okOpacity = pan.x.interpolate({ inputRange: [20, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const noOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const stamp = (vote: VoteValue, color: string, opacity: Animated.Value | Animated.AnimatedInterpolation<number>) => (
    <Animated.View pointerEvents="none" style={[styles.stampWrap, { opacity }]}>
      <View style={[styles.stamp, { borderColor: color, backgroundColor: colors.surface }]}><Text style={[styles.stampText, { color }]}>{LABEL[vote]}</Text></View>
    </Animated.View>
  );

  return <Animated.View {...responder.panHandlers} style={{ transform: [{ perspective: 900 }, { translateX: pan.x }, { translateY: pan.y }, { rotate }, { scale: pulse }, { rotateY: flip.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] }) }] }}>
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="adjustable"
      accessibilityLabel={`${dish.name}${currentVote ? `, đã chọn ${LABEL[currentVote].toLowerCase()}` : ''}`}
      accessibilityHint="Vuốt phải: ăn được. Vuốt trái: không ăn. Chạm 2 lần: muốn ăn."
      accessibilityActions={[{ name: 'ok', label: 'Ăn được' }, { name: 'no', label: 'Không ăn' }, { name: 'want', label: 'Muốn ăn' }]}
      onAccessibilityAction={event => {
        if (disabled) return;
        const vote = event.nativeEvent.actionName === 'ok' ? 'OK' : event.nativeEvent.actionName === 'no' ? 'NO' : 'WANT';
        live.current.onVote(vote);
      }}
    >
      <DishCardFace dish={dish} colors={colors} />
      {stamp('OK', colors.green, okOpacity)}
      {stamp('NO', colors.danger, noOpacity)}
      {flashVote ? <Animated.View pointerEvents="none" style={[styles.stampWrap, { opacity: flash }]}>
        <Animated.View style={{ transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }], alignItems: 'center', gap: 10 }}>
          <View style={[styles.heart, { backgroundColor: colors.surface, borderColor: colors.primary }]}><AppIcon name="heart" size={44} color={colors.primary} /></View>
          <View style={[styles.stamp, { borderColor: colors.primary, backgroundColor: colors.surface }]}><Text style={[styles.stampText, { color: colors.primary }]}>{LABEL.WANT}</Text></View>
        </Animated.View>
      </Animated.View> : null}
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 4 / 3 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  // Every card is the same height, so the layout never jumps between short and long dishes.
  info: { padding: 16, gap: 4, height: 188, overflow: 'hidden' },
  name: { fontFamily: 'InterBold', fontSize: 20, lineHeight: 28 },
  meta: { fontFamily: 'InterRegular', fontSize: 13, lineHeight: 18 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, maxHeight: 56, overflow: 'hidden' },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  factText: { fontFamily: 'InterMedium', fontSize: 12, lineHeight: 16 },
  price: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 22, marginTop: 4 },
  stampWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  heart: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  stamp: { borderWidth: 3, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 4 },
  stampText: { fontFamily: 'InterBold', fontSize: 28, lineHeight: 44, letterSpacing: 2 },
});
