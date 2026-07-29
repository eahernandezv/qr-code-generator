/** Export logic for objectively validated candidates. */
import { randomUUID } from 'node:crypto';
import { PNG } from 'pngjs';
import type { ExportRequest, ExportArtifact, Candidate } from './types.js';
import { rasterizeCandidate, resizeRasterTo, runValidation } from './validation.js';

export function performExport(request: ExportRequest, candidate: Candidate, expectedPayload: string): ExportArtifact {
  const sizes = request.sizes?.length
    ? request.sizes
    : [{ label: 'native', widthPx: candidate.rendered.width, heightPx: candidate.rendered.height }];
  const files: ExportArtifact['files'] = [];

  for (const format of request.formats) {
    if (format === 'svg') {
      if (candidate.rendered.format !== 'svg') {
        throw new Error('UNSUPPORTED_FORMAT: SVG export requires a vector candidate');
      }
      for (const size of sizes) {
        assertSize(size.widthPx, size.heightPx);
        appendValidatedFile(files, candidate, expectedPayload, {
          format: 'svg',
          data: resizeSvg(candidate.rendered.data, size.widthPx, size.heightPx),
          width: size.widthPx,
          height: size.heightPx,
        });
      }
      continue;
    }

    const source = rasterizeCandidate(candidate);
    for (const size of sizes) {
      assertSize(size.widthPx, size.heightPx);
      const raster = source.width === size.widthPx && source.height === size.heightPx
        ? source
        : resizeRasterTo(source, size.widthPx, size.heightPx);
      const png = new PNG({ width: raster.width, height: raster.height });
      png.data = Buffer.from(raster.data);
      const encoded = PNG.sync.write(png, { colorType: 6 });
      appendValidatedFile(files, candidate, expectedPayload, {
        format: 'png',
        data: `data:image/png;base64,${encoded.toString('base64')}`,
        width: raster.width,
        height: raster.height,
      });
    }
  }

  if (files.length === 0) throw new Error('EXPORT_FAILED: No export files were produced');
  return {
    artifactId: randomUUID(),
    candidateId: candidate.candidateId,
    files,
    provenance: {
      generationMode: candidate.provenance?.generationMode ?? 'unknown',
      provider: candidate.provenance?.provider,
      modelVersion: candidate.provenance?.modelVersion,
      adapterVersion: candidate.provenance?.adapterVersion ?? 'artistic-qr-v1',
      validationVersion: candidate.provenance?.validationVersion ?? 'scan-v1-real-75pct',
    },
  };
}

function appendValidatedFile(
  files: ExportArtifact['files'],
  candidate: Candidate,
  expectedPayload: string,
  file: ExportArtifact['files'][number],
): void {
  const exportedCandidate: Candidate = {
    ...candidate,
    rendered: {
      format: file.format === 'png' ? 'png-dataurl' : 'svg',
      data: file.data,
      width: file.width,
      height: file.height,
    },
  };
  if (file.width !== file.height || !runValidation(exportedCandidate, expectedPayload).pass) {
    throw new Error(`NOT_VALIDATED: ${file.format.toUpperCase()} failed post-transform scan validation`);
  }
  files.push(file);
}

function resizeSvg(svg: string, width: number, height: number): string {
  return svg.replace(/<svg\b([^>]*)>/i, (root, attributes: string) => {
    const withoutDimensions = attributes
      .replace(/\swidth=["'][^"']*["']/i, '')
      .replace(/\sheight=["'][^"']*["']/i, '');
    return `<svg${withoutDimensions} width="${width}" height="${height}">`;
  });
}

function assertSize(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
    throw new Error('EXPORT_FAILED: Invalid export dimensions');
  }
}
