import { Directory, File, Paths } from 'expo-file-system';

import {
  signatureDrawingToSvg,
  type SignatureDrawing,
} from './signature';

function quoteDirectory(quoteId: string): Directory {
  return new Directory(Paths.document, 'quotes', quoteId);
}

function ensureQuoteDir(quoteId: string): Directory {
  const dir = quoteDirectory(quoteId);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

async function writeTextFile(dest: File, contents: string): Promise<string> {
  if (dest.exists) {
    dest.delete();
  }
  dest.create();
  dest.write(contents);
  return dest.uri;
}

export async function persistQuoteSignature(
  quoteId: string,
  role: 'customer' | 'tech',
  drawing: SignatureDrawing
): Promise<string> {
  const dir = ensureQuoteDir(quoteId);
  const dest = new File(dir, `${role}-signature.svg`);
  const svg = signatureDrawingToSvg(drawing);
  return writeTextFile(dest, svg);
}

export async function persistQuoteJobSitePhoto(
  quoteId: string,
  sourceUri: string
): Promise<string> {
  const dir = ensureQuoteDir(quoteId);
  const cleanPath = sourceUri.split('?')[0] ?? sourceUri;
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(cleanPath);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const dest = new File(dir, `job-site.${ext}`);
  if (dest.exists) {
    dest.delete();
  }
  const source = new File(sourceUri);
  await source.copy(dest);
  return dest.uri;
}

export async function clearQuoteFile(
  uri: string | null | undefined
): Promise<void> {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore missing files.
  }
}

/** Remove every persisted media file for a quote (used on quote delete). */
export async function clearAllQuoteMedia(quoteId: string): Promise<void> {
  try {
    const dir = quoteDirectory(quoteId);
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Ignore missing folders.
  }
}

export async function readFileAsDataUri(
  uri: string | null | undefined,
  fallbackMime = 'application/octet-stream'
): Promise<string | null> {
  if (!uri) return null;
  try {
    const file = new File(uri);
    if (!file.exists) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith('.svg')) {
      const text = await file.text();
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    }
    const base64 = await file.base64();
    const ext = (file.extension || '').replace('.', '').toLowerCase();
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'heic' || ext === 'heif'
              ? 'image/heic'
              : ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : fallbackMime;
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}
