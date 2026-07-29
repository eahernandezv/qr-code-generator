import { normalizePayload, generateMatrix, renderDeterministic } from '@qr/qr-core';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const normalized = normalizePayload(body);
    const matrix = await generateMatrix(normalized);
    const artifact = renderDeterministic(matrix, {
      format: 'svg',
      moduleSize: 8,
      margin: 4,
    });

    return Response.json({
      svg: artifact.data,
      width: artifact.width,
      height: artifact.height,
      metadata: artifact.metadata,
    });
  } catch (error) {
    return Response.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
