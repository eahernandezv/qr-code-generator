/** Process-local matrix reference registry; production adapters may replace this with durable project storage. */
const expectedPayloadByMatrixRef = new Map<string, string>();
const MAX_ENTRIES = 10_000;

export function registerMatrixPayload(matrixRef: string, expectedPayload: string): void {
  if (expectedPayloadByMatrixRef.size >= MAX_ENTRIES) {
    const oldest = expectedPayloadByMatrixRef.keys().next().value as string | undefined;
    if (oldest) expectedPayloadByMatrixRef.delete(oldest);
  }
  expectedPayloadByMatrixRef.set(matrixRef, expectedPayload);
}

export function expectedPayloadForMatrix(matrixRef: string): string | undefined {
  return expectedPayloadByMatrixRef.get(matrixRef);
}
