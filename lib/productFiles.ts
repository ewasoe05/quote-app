import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { ProductAttachment } from './types';

function productDirectory(productId: string): Directory {
  return new Directory(Paths.document, 'products', productId);
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.\-()+ ]+/g, '_').trim();
  return cleaned.length > 0 ? cleaned : 'literature.pdf';
}

/**
 * Copy a picked PDF into the product's documents folder so the URI
 * survives cache cleanup and app restarts.
 */
export async function persistProductAttachment(
  productId: string,
  sourceUri: string,
  fileName: string
): Promise<ProductAttachment> {
  const dir = productDirectory(productId);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }

  const id = Crypto.randomUUID();
  const safeName = sanitizeFileName(fileName);
  const withPdf = /\.pdf$/i.test(safeName) ? safeName : `${safeName}.pdf`;
  const dest = new File(dir, `${id}-${withPdf}`);

  const source = new File(sourceUri);
  await source.copy(dest);

  return {
    id,
    fileName: withPdf,
    uri: dest.uri,
  };
}

export async function clearProductAttachment(
  uri: string | null | undefined
): Promise<void> {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore missing/unreadable attachment files.
  }
}

/** Remove every persisted PDF for a product (used on product delete). */
export async function clearAllProductAttachments(
  productId: string
): Promise<void> {
  try {
    const dir = productDirectory(productId);
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Ignore missing/unreadable product folders.
  }
}
