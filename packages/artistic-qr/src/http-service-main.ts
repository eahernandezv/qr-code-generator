/** Runnable entry point for the Core-owned Artistic QR HTTP service. */
import { createArtisticQrHttpService } from './http-service.js';

const host = process.env.ARTISTIC_QR_HOST ?? '127.0.0.1';
const port = parsePort(process.env.ARTISTIC_QR_PORT ?? '8787');
const { server } = createArtisticQrHttpService({ allowedOrigin: process.env.ARTISTIC_QR_ALLOWED_ORIGIN });

server.listen(port, host, () => {
  process.stdout.write(`Artistic QR Core service listening on http://${host}:${port}\n`);
});

function parsePort(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error('ARTISTIC_QR_PORT must be an integer from 1 to 65535');
  return parsed;
}
