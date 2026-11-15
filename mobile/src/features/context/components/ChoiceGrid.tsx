import { Children, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

const GAP = 8;

/**
 * Number of tiles per row: 4 tiles go 2 × 2; 5 or more go 3 per row when the screen is wide enough and 2 when it is
 * narrow or the text is large; very large text uses one column.
 */
export function gridColumns(count: number, width: number, fontScale: number): number {
  if (count <= 1 || fontScale > 1.7) return 1;
  if (count <= 4) return 2;
  return width >= 360 && fontScale <= 1.2 ? 3 : 2;
}

/**
 * Rows of equal tiles that run edge to edge: each row spreads its tiles with `space-between`, so the first tile touches
 * the left edge and the last the right edge, in line with the full-width rows around the grid. A short last row is
 * padded with invisible tiles so every tile keeps the same width.
 */
export function ChoiceGrid({ children }: { children: ReactNode }) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  // The width the grid really has (a sheet or a split-view window is narrower than the screen); the window width until measured.
  const [measured, setMeasured] = useState(0);
  const tiles = Children.toArray(children);
  const columns = gridColumns(tiles.length, measured ? measured + 2 * 24 : windowWidth, fontScale);
  const rows: ReactNode[][] = [];
  for (let index = 0; index < tiles.length; index += columns) rows.push(tiles.slice(index, index + columns));
  return <View onLayout={event => setMeasured(event.nativeEvent.layout.width)} style={styles.grid}>
    {rows.map((row, rowIndex) => <View key={rowIndex} style={styles.row}>
      {row}
      {Array.from({ length: columns - row.length }, (_, pad) => <View key={`pad-${pad}`} testID="choice-grid-pad" style={styles.pad} />)}
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  grid: { alignSelf: 'stretch', gap: GAP },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', gap: GAP },
  pad: { flex: 1, flexBasis: 0 },
});
