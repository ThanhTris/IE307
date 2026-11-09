/**
 * Standard ISO/IEC 18004 QR Code Model 2 Encoder (Byte Mode, GF(256), Reed-Solomon EC)
 * Self-contained pure TypeScript implementation without external dependencies.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

for (let i = 0, val = 1; i < 255; i++) {
  GF_EXP[i] = val;
  GF_LOG[val] = i;
  val <<= 1;
  if (val & 256) {
    val ^= 285;
  }
}

for (let i = 255; i < 512; i++) {
  GF_EXP[i] = GF_EXP[i - 255]!;
}

const gmul = (a: number, b: number): number => (a > 0 && b > 0 ? (GF_EXP[(GF_LOG[a]! + GF_LOG[b]!)] ?? 0) : 0);
const gpow = (a: number, b: number): number => GF_EXP[(b * GF_LOG[a]!) % 255] ?? 0;

const genRS = (degree: number): Uint8Array => {
  const poly = new Uint8Array(degree + 2);
  const result = new Uint8Array(degree + 1);
  result[0] = 1;
  for (let i = 0; i < degree; i++) {
    const root = gpow(2, i);
    poly.fill(0, 0, i + 2);
    for (let j = 0; j < i + 1; j++) {
      poly[j] = (poly[j] ?? 0) ^ result[j]!;
      poly[j + 1] = (poly[j + 1] ?? 0) ^ gmul(result[j]!, root);
    }
    for (let j = 0; j < i + 2; j++) {
      result[j] = poly[j]!;
    }
  }
  return result;
};

const encodeRS = (data: Uint8Array, degree: number): Uint8Array => {
  const rsPoly = genRS(degree);
  const buffer = new Uint8Array(data.byteLength + rsPoly.byteLength - 1);
  buffer.set(data);
  for (let i = 0; i < data.byteLength; i++) {
    const lead = buffer[i];
    if (lead) {
      for (let j = 1; j < rsPoly.byteLength; j++) {
        buffer[i + j] = (buffer[i + j] ?? 0) ^ gmul(rsPoly[j]!, lead);
      }
    }
  }
  return buffer.subarray(data.byteLength);
};

const TOTAL_CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

// EC codewords per version [M, L, H, Q]
const EC_CODEWORDS: [number, number, number, number][] = [
  [0, 0, 0, 0], [10, 7, 17, 13], [16, 10, 28, 22], [26, 15, 44, 36], [36, 20, 64, 52],
  [48, 26, 88, 72], [64, 36, 112, 96], [72, 40, 130, 108], [88, 48, 156, 132], [110, 60, 192, 160],
  [130, 72, 224, 192], [150, 80, 264, 224], [176, 96, 308, 260], [198, 104, 352, 288], [216, 120, 384, 320],
  [240, 132, 432, 360], [280, 144, 480, 408], [308, 168, 532, 448], [338, 180, 588, 504], [364, 196, 650, 546],
  [416, 224, 700, 600], [442, 224, 750, 644], [476, 252, 816, 690], [504, 270, 900, 750], [560, 300, 960, 810],
  [588, 312, 1050, 870], [644, 336, 1110, 952], [700, 360, 1200, 1020], [728, 390, 1260, 1050], [784, 420, 1350, 1140],
  [812, 450, 1440, 1200], [868, 480, 1530, 1290], [924, 510, 1620, 1350], [980, 540, 1710, 1440], [1036, 570, 1800, 1530],
  [1064, 570, 1890, 1590], [1120, 600, 1980, 1680], [1204, 630, 2100, 1770], [1260, 660, 2220, 1860], [1316, 720, 2310, 1950],
  [1372, 750, 2430, 2040],
];

// Number of EC blocks per version [M, L, H, Q]
const EC_BLOCKS: [number, number, number, number][] = [
  [0, 0, 0, 0], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 2, 2], [2, 1, 4, 2],
  [2, 1, 4, 4], [4, 2, 4, 4], [4, 2, 5, 6], [4, 2, 6, 6], [5, 2, 8, 8],
  [5, 4, 8, 8], [5, 4, 11, 8], [8, 4, 11, 10], [9, 4, 16, 12], [9, 4, 16, 16],
  [10, 6, 18, 12], [10, 6, 16, 17], [11, 6, 19, 16], [13, 6, 21, 18], [14, 7, 25, 21],
  [16, 8, 25, 20], [17, 8, 25, 23], [17, 9, 34, 23], [18, 9, 30, 25], [20, 10, 32, 27],
  [21, 12, 35, 29], [23, 12, 37, 34], [25, 12, 40, 34], [26, 13, 42, 35], [28, 14, 45, 38],
  [29, 15, 48, 40], [31, 16, 51, 43], [33, 17, 54, 45], [35, 18, 57, 48], [37, 19, 60, 51],
  [38, 19, 63, 53], [40, 20, 66, 56], [43, 21, 70, 59], [45, 22, 74, 62], [47, 24, 77, 65],
  [49, 25, 81, 68],
];

const MODULE_SIZES = [
  0, 21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65, 69, 73, 77, 81, 85, 89, 93, 97,
  101, 105, 109, 113, 117, 121, 125, 129, 133, 137, 141, 145, 149, 153, 157, 161, 165, 169, 173, 177,
];

const ALIGNMENT_COORDS = [
  [], [], [4, 16], [4, 20], [4, 24], [4, 28], [4, 32], [4, 20, 36], [4, 22, 40], [4, 24, 44],
  [4, 26, 48], [4, 28, 52], [4, 30, 56], [4, 32, 60], [4, 24, 44, 64], [4, 24, 46, 68], [4, 24, 48, 72],
  [4, 28, 52, 76], [4, 28, 54, 80], [4, 28, 56, 84], [4, 32, 60, 88], [4, 26, 48, 70, 92], [4, 24, 48, 72, 96],
  [4, 28, 52, 76, 100], [4, 26, 52, 78, 104], [4, 30, 56, 82, 108], [4, 28, 56, 84, 112], [4, 32, 60, 88, 116],
  [4, 24, 48, 72, 96, 120], [4, 28, 52, 76, 100, 124], [4, 24, 50, 76, 102, 128], [4, 28, 54, 80, 106, 132],
  [4, 32, 58, 84, 110, 136], [4, 28, 56, 84, 112, 140], [4, 32, 60, 88, 116, 144], [4, 28, 52, 76, 100, 124, 148],
  [4, 22, 48, 74, 100, 126, 152], [4, 26, 52, 78, 104, 130, 156], [4, 30, 56, 82, 108, 134, 160],
  [4, 24, 52, 80, 108, 136, 164], [4, 28, 56, 84, 112, 140, 168],
];

const getBestVersion = (data: Uint8Array, ecLevel: 0 | 1 | 2 | 3): number => {
  for (let v = 1; v <= 40; v++) {
    let cap = (TOTAL_CODEWORDS[v] ?? 0) - (EC_CODEWORDS[v]?.[ecLevel] ?? 0);
    cap -= v > 9 ? 3 : 2;
    if (cap >= data.byteLength) {
      return v;
    }
  }
  throw new RangeError('Bytes exceed max QR length');
};

const makeSegments = (data: Uint8Array, version: number, ecLevel: 0 | 1 | 2 | 3): Uint8Array => {
  const cap = (TOTAL_CODEWORDS[version] ?? 0) - (EC_CODEWORDS[version]?.[ecLevel] ?? 0);
  const buffer = new Uint8Array(cap);
  let bitsLeft = 0;
  let offset = 0;

  if (version > 9) {
    const len = data.byteLength & 0xffff;
    buffer[0] = 0x40 | ((len >>> 12) & 0x0f);
    buffer[1] = (len >>> 4) & 0xff;
    bitsLeft = (len & 0x0f) << 4;
    offset = 2;
  } else {
    const len = data.byteLength & 0xff;
    buffer[0] = 0x40 | ((len >>> 4) & 0x0f);
    bitsLeft = (len & 0x0f) << 4;
    offset = 1;
  }

  let i = 0;
  while (i + 1 < data.byteLength) {
    const b1 = data[i++] ?? 0;
    const b2 = data[i++] ?? 0;
    const word = (b1 << 8) | b2;
    buffer[offset++] = bitsLeft | (word >>> 12);
    buffer[offset++] = (word >>> 4) & 0xff;
    bitsLeft = (word << 4) & 0xf0;
  }
  if (i < data.byteLength) {
    const curByte = data[i] ?? 0;
    buffer[offset++] = bitsLeft | (curByte >>> 4);
    bitsLeft = (curByte << 4) & 0xf0;
  }
  buffer[offset++] = bitsLeft;
  for (let pad = 0; offset < cap; pad++) {
    buffer[offset++] = pad & 1 ? 0x11 : 0xec;
  }
  return buffer;
};

const encodeData = (data: Uint8Array, version: number, ecLevel: 0 | 1 | 2 | 3): Uint8Array => {
  const totalCodewords = data.byteLength + (EC_CODEWORDS[version]?.[ecLevel] ?? 0);
  const numBlocks = EC_BLOCKS[version]?.[ecLevel] ?? 1;
  const shortBlocks = numBlocks - (totalCodewords % numBlocks);
  const shortDataLen = (data.byteLength / numBlocks) | 0;
  const ecLen = ((totalCodewords / numBlocks) | 0) - shortDataLen;
  const dataLen = data.byteLength;
  const output = new Uint8Array(totalCodewords);

  for (let b = 0, inOffset = 0; b < numBlocks; b++) {
    const blockSize = b < shortBlocks ? shortDataLen : shortDataLen + 1;
    const ecData = encodeRS(data.subarray(inOffset, inOffset + blockSize), ecLen);
    for (let j = 0; j < blockSize; j++) {
      output[j < shortDataLen ? j * numBlocks + b : shortDataLen * numBlocks + (b - shortBlocks)] = data[inOffset + j] ?? 0;
    }
    for (let j = 0; j < ecLen; j++) {
      output[dataLen + j * numBlocks + b] = ecData[j] ?? 0;
    }
    inOffset += blockSize;
  }
  return output;
};

const setSquare = (matrix: Uint8Array, size: number, r: number, c: number, width: number): void => {
  const end = (r + width) * size;
  for (let rowStart = r * size; rowStart < end; rowStart += size) {
    matrix.fill(1, rowStart + c, rowStart + c + width);
  }
};

const setPattern = (matrix: Uint8Array, size: number, r: number, c: number, width: number): void => {
  const start = r * size + c;
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < width; j++) {
      const minCol = j < width - 1 - j ? j : width - 1 - j;
      const minRow = i < width - 1 - i ? i : width - 1 - i;
      matrix[start + i * size + j] = (minCol < minRow ? minCol : minRow) !== 1 ? 1 : 0;
    }
  }
};

const writeFinderPatterns = (matrix: Uint8Array, reserved: Uint8Array, size: number): void => {
  const opp = size - 7;
  setPattern(matrix, size, 0, 0, 7);
  setPattern(matrix, size, opp, 0, 7);
  setPattern(matrix, size, 0, opp, 7);
  setSquare(reserved, size, 0, 0, 8);
  setSquare(reserved, size, opp - 1, 0, 8);
  setSquare(reserved, size, 0, opp - 1, 8);
};

const writeAlignmentPatterns = (matrix: Uint8Array, reserved: Uint8Array, size: number, version: number): void => {
  const coords = ALIGNMENT_COORDS[version] ?? [];
  for (let i = 0; i < coords.length; i++) {
    const r = coords[i]!;
    for (let j = 0; j < coords.length; j++) {
      if ((i || j % (coords.length - 1)) && (j || i % (coords.length - 1))) {
        const c = coords[j]!;
        setPattern(matrix, size, r, c, 5);
        setSquare(reserved, size, r, c, 5);
      }
    }
  }
};

const writeTimingPatterns = (matrix: Uint8Array, reserved: Uint8Array, size: number): void => {
  const limit = size - 7;
  for (let i = 8; i < limit; i++) {
    const val = (i + 1) & 1;
    matrix[6 * size + i] = val;
    matrix[i * size + 6] = val;
    reserved[6 * size + i] = 1;
    reserved[i * size + 6] = 1;
  }
};

const reserveFormatInfo = (reserved: Uint8Array, size: number): void => {
  for (let i = 0; i < 9; i++) {
    reserved[8 * size + i] = 1;
    reserved[i * size + 8] = 1;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8 * size + size - 8 + i] = 1;
    reserved[(size - 8 + i) * size + 8] = 1;
  }
};

const reserveVersionInfo = (reserved: Uint8Array, size: number, version: number): void => {
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        reserved[(size - 11 + j) * size + i] = 1;
        reserved[i * size + size - 11 + j] = 1;
      }
    }
  }
};

const writeData = (matrix: Uint8Array, reserved: Uint8Array, size: number, data: Uint8Array): void => {
  let byteIdx = 0;
  let bitIdx = 7;
  let dir = -1;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--;
    for (let rowOffset = 0; rowOffset < size; rowOffset++) {
      for (let c = 0; c < 2; c++) {
        const curCol = col - c;
        const curRow = dir === -1 ? size - rowOffset - 1 : rowOffset;
        const idx = curRow * size + curCol;
        if (reserved[idx]) {
          continue;
        }
        matrix[idx] = ((data[byteIdx] ?? 0) >>> bitIdx) & 1;
        if (bitIdx-- === 0) {
          bitIdx = 7;
          if (++byteIdx >= data.byteLength) {
            return;
          }
        }
      }
    }
    dir = -dir;
    col -= 2;
  }
};

const xorMask = (matrix: Uint8Array, reserved: Uint8Array, size: number, mask: number): void => {
  for (let r = 0; r < size; r++) {
    const rowBase = r * size;
    for (let c = 0; c < size; c++) {
      const idx = rowBase + c;
      if (reserved[idx]) continue;
      let invert = false;
      switch (mask) {
        case 0: invert = (r + c) % 2 === 0; break;
        case 1: invert = r % 2 === 0; break;
        case 2: invert = c % 3 === 0; break;
        case 3: invert = (r + c) % 3 === 0; break;
        case 4: invert = ((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0; break;
        case 5: invert = ((r * c) % 2) + ((r * c) % 3) === 0; break;
        case 6: invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; break;
        case 7: invert = (((r * c) % 3) + ((r + c) % 2)) % 2 === 0; break;
      }
      if (invert) {
        matrix[idx] = (matrix[idx] ?? 0) ^ 1;
      }
    }
  }
};

const computePenalty = (matrix: Uint8Array, size: number): number => {
  let penalty = 0;
  let darkModules = 0;

  for (let r = 0; r < size; r++) {
    let runH = 1;
    let runV = 1;
    let patH = 0;
    let patV = 0;

    for (let c = 0; c < size; c++) {
      const idxH = r * size + c;
      const idxV = c * size + r;
      darkModules += matrix[idxH] ?? 0;

      if (c > 0) {
        if (matrix[idxH - 1] === matrix[idxH]) {
          runH++;
        } else {
          if (runH >= 5) penalty += runH - 5 + 3;
          runH = 1;
        }
        if (matrix[idxV - size] === matrix[idxV]) {
          runV++;
        } else {
          if (runV >= 5) penalty += runV - 5 + 3;
          runV = 1;
        }
      }

      if (r < size - 1 && c < size - 1 &&
          matrix[idxH] === matrix[idxH + 1] &&
          matrix[idxH] === matrix[idxH + size] &&
          matrix[idxH] === matrix[idxH + size + 1]) {
        penalty += 3;
      }

      patH = ((patH << 1) & 0x7ff) | (matrix[idxH] ?? 0);
      patV = ((patV << 1) & 0x7ff) | (matrix[idxV] ?? 0);
      if (c >= 10) {
        if (patH === 0x05d0 || patH === 0x005d) penalty += 40;
        if (patV === 0x05d0 || patV === 0x005d) penalty += 40;
      }
    }

    if (runH >= 5) penalty += runH - 5 + 3;
    if (runV >= 5) penalty += runV - 5 + 3;
  }

  const ratio = (darkModules * 100) / (size * size);
  const steps = (Math.abs(ratio - 50) / 5) | 0;
  penalty += steps * 10;

  return penalty;
};

const applyBestMask = (matrix: Uint8Array, reserved: Uint8Array, size: number): number => {
  let bestMask = 0;
  let bestPenalty = Infinity;

  for (let m = 0; m < 8; m++) {
    xorMask(matrix, reserved, size, m);
    const penalty = computePenalty(matrix, size);
    xorMask(matrix, reserved, size, m);

    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = m;
    }
  }

  xorMask(matrix, reserved, size, bestMask);
  return bestMask;
};

const encodeFormatInfo = (ecLevel: number, mask: number): number => {
  const data = (ecLevel << 3) | mask;
  let rem = data << 10;
  for (let i = 4; i >= 0; i--) {
    if (rem & (1 << (i + 10))) {
      rem ^= 0x537 << i;
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
};

const writeFormatInfo = (matrix: Uint8Array, size: number, ecLevel: number, mask: number): void => {
  const info = encodeFormatInfo(ecLevel, mask);
  let bit = 14;

  for (let i = 0; i < 6; i++) matrix[8 * size + i] = (info >> bit--) & 1;
  matrix[8 * size + 7] = (info >> bit--) & 1;
  matrix[8 * size + 8] = (info >> bit--) & 1;
  matrix[7 * size + 8] = (info >> bit--) & 1;
  for (let i = 0; i < 6; i++) matrix[(5 - i) * size + 8] = (info >> bit--) & 1;

  bit = 14;
  for (let i = 0; i < 7; i++) matrix[(size - 1 - i) * size + 8] = (info >> bit--) & 1;
  matrix[(size - 8) * size + 8] = 1;
  for (let i = 0; i < 8; i++) matrix[8 * size + size - 8 + i] = (info >> bit--) & 1;
};

const encodeVersionInfo = (version: number): number => {
  const data = version << 12;
  let rem = data;
  for (let i = 0; i < 6; i++) {
    if (rem & (1 << (17 - i))) {
      rem ^= 0x1f25 << (5 - i);
    }
  }
  return rem | data;
};

const writeVersionInfo = (matrix: Uint8Array, size: number, version: number): void => {
  if (version >= 7) {
    const info = encodeVersionInfo(version);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const val = (info >>> (3 * i + j)) & 1;
        matrix[(size - 11 + j) * size + i] = val;
        matrix[i * size + size - 11 + j] = val;
      }
    }
  }
};

const textEncoder = new TextEncoder();

/**
 * Encodes text into a standard ISO/IEC 18004 QR Code Model 2 2D bit matrix.
 * Returns boolean[][] where true represents dark modules and false represents light modules.
 */
export function encodeQrCodeMatrix(content: string, ecLevel: 0 | 1 | 2 | 3 = 1): boolean[][] {
  const data = textEncoder.encode(content);
  const version = getBestVersion(data, ecLevel);
  const segments = makeSegments(data, version, ecLevel);
  const encoded = encodeData(segments, version, ecLevel);
  const size = MODULE_SIZES[version] ?? 21;

  const matrix = new Uint8Array(size * size);
  const reserved = new Uint8Array(size * size);

  writeFinderPatterns(matrix, reserved, size);
  writeAlignmentPatterns(matrix, reserved, size, version);
  writeTimingPatterns(matrix, reserved, size);
  reserveFormatInfo(reserved, size);
  reserveVersionInfo(reserved, size, version);
  writeData(matrix, reserved, size, encoded);

  const bestMask = applyBestMask(matrix, reserved, size);
  writeFormatInfo(matrix, size, ecLevel, bestMask);
  writeVersionInfo(matrix, size, version);

  const result: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    const base = r * size;
    for (let c = 0; c < size; c++) {
      row.push(matrix[base + c] === 1);
    }
    result.push(row);
  }
  return result;
}
