// Reed-Solomon error correction for QR codes over GF(256)
// Primitive polynomial: x^8 + x^4 + x^3 + x^2 + 1 (0x11d)

const GF_SIZE = 256;
const GF_PRIMITIVE = 0x11d;

// Precomputed log/antilog tables
const EXP_TABLE: number[] = new Array(512);
const LOG_TABLE: number[] = new Array(GF_SIZE);

let x = 1;
for (let i = 0; i < 255; i++) {
  EXP_TABLE[i] = x;
  LOG_TABLE[x] = i;
  x <<= 1;
  if (x & 0x100) {
    x ^= GF_PRIMITIVE;
  }
}
// Extend EXP_TABLE for easy modulo indexing
for (let i = 255; i < 512; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 255];
}

function gfAdd(a: number, b: number): number {
  return a ^ b;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function gfPow(a: number, n: number): number {
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] * n) % 255];
}

function gfPolyMul(p: number[], q: number[]): number[] {
  const result = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      result[i + j] = gfAdd(result[i + j], gfMul(p[i], q[j]));
    }
  }
  return result;
}

function gfPolyEval(poly: number[], x: number): number {
  let y = poly[0];
  for (let i = 1; i < poly.length; i++) {
    y = gfAdd(gfMul(y, x), poly[i]);
  }
  return y;
}

function buildGeneratorPolynomial(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = gfPolyMul(g, [1, gfPow(2, i)]);
  }
  return g;
}

export function reedSolomonEncode(data: number[], ecCodewords: number): number[] {
  const generator = buildGeneratorPolynomial(ecCodewords);
  const remainder = new Array(ecCodewords).fill(0);

  for (let i = 0; i < data.length; i++) {
    const coef = data[i] ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let j = 0; j < ecCodewords; j++) {
      remainder[j] ^= gfMul(generator[j + 1], coef);
    }
  }

  return [...data, ...remainder];
}

export { EXP_TABLE, LOG_TABLE, gfMul, gfAdd, gfPow, gfPolyMul, gfPolyEval };
