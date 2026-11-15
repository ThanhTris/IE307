import Svg, { Path } from 'react-native-svg';

/**
 * Google Material Symbols (Outlined, weight 400) that the bundled icon fonts do not have yet.
 * Source: https://github.com/google/material-design-icons, licensed under Apache License 2.0.
 * Add a symbol by pasting the `d` of its 24px SVG (viewBox "0 -960 960 960").
 */
export const MATERIAL_SYMBOLS = {
  soba: 'M233-80q-42 0-74-25t-42-65L80-320h69q2-9 5-18t6-17v-445l720-80v60l-460 52v68h460v60H420v65q14-2 29.5-3.5T480-580q121 0 212 74t118 186h70l-38 150q-10 40-42 65t-74 25H233Zm0-80h493q14 0 24.5-8t14.5-22l12-50H182l12 50q4 14 14.5 22t24.5 8Zm0-160h64q23-54 72-87t111-33q62 0 110.5 33t71.5 87h64q-26-78-92.5-129T480-500q-88 0-154.5 51T233-320Zm158 0h177q-17-19-39.5-29.5T480-360q-26 0-49 10.5T391-320ZM220-459q9-11 19-21t21-19v-141h-40v181Zm100-81q10-5 19.5-9.5T360-558v-82h-40v100ZM220-700h40v-50l-40 4v46Zm100 0h40v-62l-40 5v57Zm160 460Z',
  hanami_dango: 'm843-60-85-85q-49 30-107 24t-101-49q-29-29-41-66.5t-7-75.5q-38 5-75.5-7T360-360q-29-29-41-66.5t-7-75.5q-38 5-75.5-7T170-550q-43-43-49-101.5T145-759l-85-85 56-56 86 85q49-30 107-24t101 49q29 29 41 66t7 75q38-5 75.5 7.5T600-600q29 29 41 66t7 75q38-5 75.5 7.5T790-410q43 43 49 101t-24 107l85 85-57 57ZM670-200q38 0 64-26t26-64q0-38-26-64t-64-26q-38 0-64 26t-26 64q0 38 26 64t64 26ZM480-390q38 0 64-26t26-64q0-38-26-64t-64-26q-38 0-64 26t-26 64q0 38 26 64t64 26ZM290-580q38 0 64-26t26-64q0-38-26-64t-64-26q-38 0-64 26t-26 64q0 38 26 64t64 26Zm380 290ZM480-480ZM290-670Z',
} as const;

export type MaterialSymbolName = keyof typeof MATERIAL_SYMBOLS;

export function MaterialSymbol({ name, size = 24, color = '#000' }: { name: MaterialSymbolName; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 -960 960 960" accessible={false}><Path d={MATERIAL_SYMBOLS[name]} fill={color} /></Svg>;
}
