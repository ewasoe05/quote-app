/**
 * Lightweight signature stroke model → SVG for PDF embed (OTA-friendly; no Skia/WebView).
 */

export type SignaturePoint = { x: number; y: number };

export type SignatureStroke = {
  points: SignaturePoint[];
};

export type SignatureDrawing = {
  width: number;
  height: number;
  strokes: SignatureStroke[];
};

export function isSignatureEmpty(drawing: SignatureDrawing | null | undefined): boolean {
  if (!drawing?.strokes?.length) return true;
  return !drawing.strokes.some((stroke) => stroke.points.length > 1);
}

/** Build a compact SVG document from captured strokes. */
export function signatureDrawingToSvg(drawing: SignatureDrawing): string {
  const width = Math.max(1, Math.round(drawing.width));
  const height = Math.max(1, Math.round(drawing.height));
  const paths = drawing.strokes
    .filter((stroke) => stroke.points.length > 1)
    .map((stroke) => {
      const [first, ...rest] = stroke.points;
      const d = [
        `M ${round(first!.x)} ${round(first!.y)}`,
        ...rest.map((point) => `L ${round(point.x)} ${round(point.y)}`),
      ].join(' ');
      return `<path d="${d}" fill="none" stroke="#111111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`;
}

export function signatureSvgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
