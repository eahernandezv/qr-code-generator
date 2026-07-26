import type { NormalizedPayload, ErrorCorrectionLevel, QrMatrix } from '../types.js';
import { reedSolomonEncode } from './reed-solomon.js';
import { QrCoreError } from '../types.js';

// QR Code version parameters
// Each entry: [total modules, EC codewords per block, blocks in group 1, data codewords in group 1, blocks in group 2, data codewords in group 2]
const VERSION_PARAMS: Record<ErrorCorrectionLevel, number[][]> = {
  L: [
    [0,0,0,0,0,0], [152,7,1,19,0,0], [272,10,1,34,0,0], [440,15,1,55,0,0], [640,20,1,80,0,0],
    [864,26,1,108,0,0], [1088,18,2,68,0,0], [1248,20,2,78,0,0], [1552,24,2,97,0,0], [1856,30,2,116,0,0],
    [2192,18,2,68,2,69], [2592,20,4,81,0,0], [2960,24,2,92,2,93], [3424,26,4,107,0,0], [3688,30,3,115,1,116],
    [4184,22,5,87,1,88], [4712,24,5,98,1,99], [5176,28,1,107,5,108], [5768,30,5,120,1,121], [6360,32,3,113,4,114],
    [6888,24,3,107,5,108], [7456,28,4,116,4,117], [8048,24,2,111,7,112], [8752,28,4,121,5,122], [9392,30,6,117,4,118],
    [10208,28,8,106,4,107], [10960,28,10,114,2,115], [11744,30,8,122,4,123], [12248,30,3,117,10,118], [13048,30,7,116,7,117],
    [13880,30,5,115,10,116], [14744,30,13,115,3,116], [15640,30,17,115,0,0], [16568,30,17,115,1,116], [17528,30,13,115,6,116],
    [18448,30,12,121,7,122], [19472,30,6,121,14,122], [20528,30,17,122,4,123], [21616,30,4,122,18,123], [22496,30,20,117,4,118],
    [23648,30,19,118,6,119],
  ],
  M: [
    [0,0,0,0,0,0], [128,10,1,16,0,0], [224,16,1,28,0,0], [352,26,1,44,0,0], [512,18,2,32,0,0],
    [688,24,2,43,0,0], [864,16,4,27,0,0], [992,18,4,31,0,0], [1232,22,2,38,2,39], [1456,22,3,36,2,37],
    [1728,26,4,43,1,44], [2032,30,1,50,4,51], [2320,22,6,36,2,37], [2672,22,8,37,1,38], [2920,24,4,40,5,41],
    [3320,24,5,41,5,42], [3624,28,1,45,5,46], [4056,28,5,46,5,47], [4504,28,1,43,3,44], [5016,26,5,44,7,45],
    [5352,30,3,44,13,45], [5712,28,17,42,0,0], [6256,28,17,42,0,0], [6880,28,4,46,14,47], [7312,30,6,43,14,44],
    [8000,30,8,44,13,45], [8496,30,19,46,4,47], [9024,30,22,45,3,46], [9544,30,3,45,23,46], [10136,30,21,45,7,46],
    [10984,30,19,47,10,48], [11640,30,2,46,29,47], [12328,30,10,46,23,47], [13048,30,14,46,21,47], [13800,30,14,46,23,47],
    [14496,30,12,47,26,48], [15312,30,6,47,34,48], [15936,30,29,46,14,47], [16816,30,13,46,32,47], [17728,30,40,47,7,48],
    [18672,30,18,47,31,48],
  ],
  Q: [
    [0,0,0,0,0,0], [104,13,1,13,0,0], [176,22,1,22,0,0], [272,18,2,17,0,0], [384,26,2,24,0,0],
    [496,18,2,15,2,16], [608,26,4,19,0,0], [704,18,2,14,4,15], [880,24,4,18,2,19], [1056,28,4,16,4,17],
    [1232,28,6,19,2,20], [1440,26,4,22,4,23], [1648,24,4,20,6,21], [1952,20,8,20,4,21], [2088,30,11,16,5,17],
    [2360,24,5,24,7,25], [2600,28,15,19,2,20], [2936,28,1,22,15,23], [3176,28,17,22,1,23], [3560,30,17,21,4,22],
    [3880,28,15,24,5,25], [4096,30,17,22,6,23], [4544,30,7,24,16,25], [4912,30,11,24,14,25], [5312,30,11,24,16,25],
    [5744,30,7,24,22,25], [6032,30,28,22,6,23], [6464,30,8,23,26,24], [6968,30,4,24,31,25], [7288,30,1,23,37,24],
    [7880,30,15,24,25,25], [8264,30,42,24,1,25], [8920,30,10,24,35,25], [9368,30,29,24,19,25], [9848,30,44,24,7,25],
    [10288,30,39,24,14,25], [10832,30,46,24,10,25], [11408,30,49,24,10,25], [12016,30,48,24,14,25], [12656,30,43,24,22,25],
    [13328,30,34,24,34,25],
  ],
  H: [
    [0,0,0,0,0,0], [72,17,1,9,0,0], [128,28,1,16,0,0], [208,22,2,13,0,0], [288,16,4,9,0,0],
    [368,22,2,11,2,12], [480,28,4,15,0,0], [528,26,4,13,1,14], [688,26,4,14,2,15], [800,24,4,12,4,13],
    [976,28,6,15,2,16], [1120,24,3,12,8,13], [1264,28,7,14,4,15], [1440,22,12,11,4,12], [1576,24,11,12,5,13],
    [1784,24,11,13,10,14], [2024,30,3,15,13,16], [2264,28,2,14,17,15], [2504,28,2,14,19,15], [2728,26,9,13,16,14],
    [3080,28,15,15,10,16], [3248,28,19,16,6,17], [3536,28,34,13,0,0], [3712,30,1,17,14,18], [4112,30,7,14,22,15],
    [4304,30,28,15,8,16], [4768,30,1,22,20,23], [5024,30,28,22,8,23], [5288,30,29,21,8,22], [5608,30,1,23,20,24],
    [5960,30,18,22,18,23], [6344,30,32,21,8,22], [6760,30,34,23,4,24], [7208,30,21,24,14,25], [7688,30,23,24,16,25],
    [7888,30,19,25,14,26], [8432,30,22,25,14,26], [8768,30,2,26,32,27], [9136,30,23,25,17,26], [9776,30,42,24,1,25],
    [10208,30,23,26,19,27],
  ],
};

// Mode indicators
const MODE_INDICATORS: Record<string, number> = {
  numeric: 1,
  alphanumeric: 2,
  byte: 4,
  kanji: 8,
};

// Character count indicator bit lengths
function getCCIBits(mode: string, version: number): number {
  if (version <= 9) {
    if (mode === 'numeric') return 10;
    if (mode === 'alphanumeric') return 9;
    if (mode === 'byte') return 8;
    return 8;
  } else if (version <= 26) {
    if (mode === 'numeric') return 12;
    if (mode === 'alphanumeric') return 11;
    if (mode === 'byte') return 16;
    return 10;
  } else {
    if (mode === 'numeric') return 14;
    if (mode === 'alphanumeric') return 13;
    if (mode === 'byte') return 16;
    return 12;
  }
}

function getMode(content: string): string {
  if (/^[0-9]*$/.test(content)) return 'numeric';
  if (/^[0-9A-Z $%*+\-./:]*$/.test(content)) return 'alphanumeric';
  return 'byte';
}

class BitBuffer {
  bits: number[] = [];
  
  addBits(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) {
      this.bits.push((value >> i) & 1);
    }
  }
  
  getByteArray(): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8 && i + j < this.bits.length; j++) {
        byte = (byte << 1) | this.bits[i + j];
      }
      bytes.push(byte);
    }
    return bytes;
  }
  
  get length(): number {
    return this.bits.length;
  }
}

function encodeData(payload: NormalizedPayload): BitBuffer {
  const buffer = new BitBuffer();
  const content = payload.canonical;
  const version = payload.version;
  const mode = getMode(content);
  
  // Mode indicator
  buffer.addBits(MODE_INDICATORS[mode], 4);
  
  // Character count
  const cciBits = getCCIBits(mode, version);
  if (mode === 'byte') {
    buffer.addBits(new TextEncoder().encode(content).length, cciBits);
  } else {
    buffer.addBits(content.length, cciBits);
  }
  
  // Data
  if (mode === 'numeric') {
    for (let i = 0; i < content.length; i += 3) {
      const group = content.slice(i, i + 3);
      const bits = group.length === 3 ? 10 : group.length === 2 ? 7 : 4;
      buffer.addBits(parseInt(group, 10), bits);
    }
  } else if (mode === 'alphanumeric') {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
    for (let i = 0; i < content.length; i += 2) {
      if (i + 1 < content.length) {
        const val = chars.indexOf(content[i]) * 45 + chars.indexOf(content[i + 1]);
        buffer.addBits(val, 11);
      } else {
        buffer.addBits(chars.indexOf(content[i]), 6);
      }
    }
  } else {
    // Byte mode
    const bytes = new TextEncoder().encode(content);
    for (const byte of bytes) {
      buffer.addBits(byte, 8);
    }
  }
  
  return buffer;
}

function padCodewords(buffer: BitBuffer, totalBits: number): number[] {
  // Terminator (max 4 zeros)
  const remaining = totalBits - buffer.length;
  if (remaining > 0) {
    buffer.addBits(0, Math.min(4, remaining));
  }
  
  // Pad to byte boundary
  while (buffer.length % 8 !== 0 && buffer.length < totalBits) {
    buffer.bits.push(0);
  }
  
  // Pad bytes: 0xEC, 0x11 alternating
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (buffer.length < totalBits) {
    buffer.addBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }
  
  return buffer.getByteArray();
}

function getVersionParams(version: number, ecl: ErrorCorrectionLevel): number[] {
  const params = VERSION_PARAMS[ecl][version];
  if (!params) {
    throw new QrCoreError('VERSION_OVERFLOW', `No parameters for version ${version} level ${ecl}`);
  }
  return params;
}

export function generateMatrix(payload: NormalizedPayload): QrMatrix {
  const version = payload.version;
  const ecl = payload.errorCorrectionLevel;
  const size = version * 4 + 17;
  
  // Initialize matrix
  const modules: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  
  // Get version parameters
  const params = getVersionParams(version, ecl);
  const [, ecPerBlock, g1Blocks, g1Data, g2Blocks, g2Data] = params;
  const totalDataCodewords = g1Blocks * g1Data + g2Blocks * g2Data;
  const totalBits = totalDataCodewords * 8;
  
  // Encode data
  const bitBuffer = encodeData(payload);
  const dataBytes = padCodewords(bitBuffer, totalBits);
  
  // Split into blocks and compute EC
  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < g1Blocks; i++) {
    blocks.push(dataBytes.slice(offset, offset + g1Data));
    offset += g1Data;
  }
  for (let i = 0; i < g2Blocks; i++) {
    blocks.push(dataBytes.slice(offset, offset + g2Data));
    offset += g2Data;
  }
  
  const ecBlocks: number[][] = [];
  for (const block of blocks) {
    ecBlocks.push(reedSolomonEncode(block, ecPerBlock).slice(block.length));
  }
  
  // Interleave data and EC codewords
  const interleaved: number[] = [];
  const maxData = Math.max(g1Data, g2Data || 0);
  for (let i = 0; i < maxData; i++) {
    for (const block of blocks) {
      if (i < block.length) interleaved.push(block[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const block of ecBlocks) {
      interleaved.push(block[i]);
    }
  }
  
  // Place fixed patterns
  placeFinderPatterns(modules, size);
  placeSeparators(modules, size);
  placeTimingPatterns(modules, size);
  placeDarkModule(modules, version);
  
  if (version >= 7) {
    placeVersionInfo(modules, version);
  }
  
  // Place data in zigzag
  placeData(modules, size, interleaved);
  
  // Select and apply mask
  let maskPattern = payload.maskPattern;
  if (maskPattern < 0 || maskPattern > 7) {
    maskPattern = selectBestMask(modules, size, ecl);
  }
  applyMask(modules, size, maskPattern);
  
  // Place format info
  placeFormatInfo(modules, size, ecl, maskPattern);
  
  // Convert -1 to 0 (light) for final matrix
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c] === -1) modules[r][c] = 0;
    }
  }
  
  const functionalRegions = extractFunctionalRegions(modules, size, version, ecl, maskPattern);
  
  return {
    size,
    modules,
    version,
    errorCorrectionLevel: ecl,
    maskPattern,
    functionalRegions,
  };
}

function placeFinderPatterns(modules: number[][], size: number): void {
  const positions = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];
  for (const [x, y] of positions) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = y + r;
        const col = x + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          if (r === 0 || r === 6 || c === 0 || c === 6) {
            modules[row][col] = 1;
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            modules[row][col] = 1;
          } else {
            modules[row][col] = 0;
          }
        } else {
          modules[row][col] = 0; // separator area
        }
      }
    }
  }
}

function placeSeparators(modules: number[][], size: number): void {
  // Already handled in placeFinderPatterns extended area
  const positions = [
    [0, 0],
    [size - 8, 0],
    [0, size - 8],
  ];
  for (const [x, y] of positions) {
    for (let r = -1; r < 8; r++) {
      for (let c = -1; c < 8; c++) {
        const row = y + r;
        const col = x + c;
        if (row < 0 || row >= size || col < 0 || col >= size) continue;
        if (r === -1 || r === 7 || c === -1 || c === 7) {
          modules[row][col] = 0;
        }
      }
    }
  }
}

function placeTimingPatterns(modules: number[][], size: number): void {
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    if (modules[6][i] === -1) modules[6][i] = val;
    if (modules[i][6] === -1) modules[i][6] = val;
  }
}

function placeDarkModule(modules: number[][], version: number): void {
  modules[4 * version + 9][8] = 1;
}

function placeVersionInfo(modules: number[][], version: number): void {
  const poly = version << 12;
  let remainder = poly;
  const divisor = 0b10100110111;
  for (let i = 0; i < 6; i++) {
    if ((remainder >> (17 - i)) & 1) {
      remainder ^= divisor << (6 - i);
    }
  }
  const bits = (version << 12) | (remainder & 0xFFF);
  
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    modules[size - 11 + c][r] = bit;
    modules[r][size - 11 + c] = bit;
  }
}

function placeData(modules: number[][], size: number, data: number[]): void {
  let bitIndex = 0;
  let direction = -1; // Up
  let col = size - 1;
  
  while (col > 0) {
    if (col === 6) col--; // Skip timing column
    
    for (let rowPass = 0; rowPass < size; rowPass++) {
      const row = direction === -1 ? size - 1 - rowPass : rowPass;
      
      for (let c = 0; c < 2; c++) {
        const currentCol = col - c;
        if (currentCol < 0) continue;
        if (modules[row][currentCol] !== -1) continue;
        
        const byteIndex = Math.floor(bitIndex / 8);
        const bitInByte = 7 - (bitIndex % 8);
        const bit = byteIndex < data.length ? (data[byteIndex] >> bitInByte) & 1 : 0;
        modules[row][currentCol] = bit;
        bitIndex++;
      }
    }
    
    col -= 2;
    direction *= -1;
  }
}

const MASK_FUNCTIONS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r, c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(modules: number[][], size: number, maskPattern: number): void {
  const fn = MASK_FUNCTIONS[maskPattern];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c] !== -1 && fn(r, c)) {
        modules[r][c] ^= 1;
      }
    }
  }
}

function selectBestMask(modules: number[][], size: number, ecl: ErrorCorrectionLevel): number {
  let bestScore = Infinity;
  let bestMask = 0;
  
  for (let mask = 0; mask < 8; mask++) {
    const testModules = modules.map(row => [...row]);
    applyMask(testModules, size, mask);
    placeFormatInfo(testModules, size, ecl, mask);
    
    const score = evaluateMask(testModules, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
  }
  
  return bestMask;
}

function evaluateMask(modules: number[][], size: number): number {
  let score = 0;
  
  // Rule 1: Adjacent same-color modules in row/column
  for (let r = 0; r < size; r++) {
    let count = 1;
    for (let c = 1; c < size; c++) {
      if (modules[r][c] === modules[r][c - 1]) {
        count++;
      } else {
        if (count >= 5) score += count - 2;
        count = 1;
      }
    }
    if (count >= 5) score += count - 2;
  }
  
  for (let c = 0; c < size; c++) {
    let count = 1;
    for (let r = 1; r < size; r++) {
      if (modules[r][c] === modules[r - 1][c]) {
        count++;
      } else {
        if (count >= 5) score += count - 2;
        count = 1;
      }
    }
    if (count >= 5) score += count - 2;
  }
  
  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      if (modules[r][c] === modules[r][c + 1] &&
          modules[r][c] === modules[r + 1][c] &&
          modules[r][c] === modules[r + 1][c + 1]) {
        score += 3;
      }
    }
  }
  
  // Rule 3: Finder-like patterns (simplified)
  // Rule 4: Dark/light balance (simplified)
  let darkCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c] === 1) darkCount++;
    }
  }
  const percent = (darkCount / (size * size)) * 100;
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  
  return score;
}

function placeFormatInfo(modules: number[][], size: number, ecl: ErrorCorrectionLevel, maskPattern: number): void {
  const eclBits: Record<ErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };
  const formatBits = (eclBits[ecl] << 3) | maskPattern;
  let poly = formatBits << 10;
  const divisor = 0b10100110111;
  for (let i = 0; i < 5; i++) {
    if ((poly >> (14 - i)) & 1) {
      poly ^= divisor << (4 - i);
    }
  }
  const format = (formatBits << 10) | (poly & 0x3FF);
  const formatMask = 0b101010000010010;
  const maskedFormat = format ^ formatMask;
  
  // Place around top-left finder
  for (let i = 0; i < 15; i++) {
    const bit = (maskedFormat >> i) & 1;
    if (i < 6) {
      modules[8][i] = bit;
    } else if (i < 8) {
      modules[8][i + 1] = bit;
    } else if (i === 8) {
      modules[7][8] = bit;
    } else {
      modules[14 - i][8] = bit;
    }
  }
  modules[size - 8][8] = 1; // dark module always
  
  // Place around bottom-left and top-right finders
  for (let i = 0; i < 15; i++) {
    const bit = (maskedFormat >> i) & 1;
    if (i < 7) {
      modules[size - 1 - i][8] = bit;
    } else if (i < 9) {
      modules[size - 8 + (i - 7)][8] = bit;
    } else {
      modules[8][size - 15 + i] = bit;
    }
  }
}

function extractFunctionalRegions(
  modules: number[][],
  size: number,
  version: number,
  ecl: ErrorCorrectionLevel,
  maskPattern: number,
): QrMatrix['functionalRegions'] {
  const finderPatterns = [
    { x: 0, y: 0, size: 7 },
    { x: size - 7, y: 0, size: 7 },
    { x: 0, y: size - 7, size: 7 },
  ];
  
  const separators = [
    { x: 0, y: 0, size: 8 },
    { x: size - 8, y: 0, size: 8 },
    { x: 0, y: size - 8, size: 8 },
  ];
  
  const timingPatterns = [
    { orientation: 'horizontal' as const, start: 8, end: size - 9 },
    { orientation: 'vertical' as const, start: 8, end: size - 9 },
  ];
  
  const darkModule = { x: 4 * version + 9, y: 8 };
  
  const formatInfo: { x: number; y: number; isECI: boolean }[] = [];
  for (let i = 0; i < 15; i++) {
    if (i < 6) formatInfo.push({ x: 8, y: i, isECI: false });
    else if (i < 8) formatInfo.push({ x: 8, y: i + 1, isECI: false });
    else if (i === 8) formatInfo.push({ x: 7, y: 8, isECI: false });
    else formatInfo.push({ x: 14 - i, y: 8, isECI: false });
  }
  
  const versionInfo: { x: number; y: number }[] = [];
  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const r = Math.floor(i / 3);
      const c = i % 3;
      versionInfo.push({ x: size - 11 + c, y: r });
      versionInfo.push({ x: r, y: size - 11 + c });
    }
  }
  
  return {
    finderPatterns,
    separators,
    timingPatterns,
    darkModule,
    formatInfo,
    versionInfo,
  };
}
