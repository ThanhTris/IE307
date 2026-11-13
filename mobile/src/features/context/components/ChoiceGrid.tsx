import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const GAP = 8;

/**
 * A grid whose tiles all get exactly the same width, even on a short last row (a row of 2 under rows of 3 keeps the
 * same tile size). The width is measured, then handed to the tiles; before it is known (first frame, tests) tiles use
 * their own flexible width.
 */
export function ChoiceGrid({ columns, children }: { columns: number; children: (tileWidth: number | undefined) => ReactNode }) {
  const [width, setWidth] = useState(0);
  const tile = width ? Math.floor((width - GAP * (columns - 1)) / columns) : undefined;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.grid}>{children(tile)}</View>;
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP } });
