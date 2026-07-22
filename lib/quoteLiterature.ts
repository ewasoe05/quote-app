import { Directory, File, Paths } from 'expo-file-system';
import { zipSync } from 'fflate';

import { getProductById } from './db';
import { buildLiteratureZipEntryNames } from './quoteLiteraturePaths';
import { formatQuoteNumber } from './quotes';
import type { ProductAttachment, QuoteItem } from './types';

export type QuoteLiteratureOption = {
  /** Stable selection key: productId + attachment id */
  key: string;
  productId: string;
  productName: string;
  attachment: ProductAttachment;
};

export { buildLiteratureZipEntryNames } from './quoteLiteraturePaths';

/**
 * Collect on-disk literature PDFs for products currently on the quote.
 * Dedupes by attachment id when the same product appears more than once.
 */
export async function listQuoteLiterature(
  items: QuoteItem[]
): Promise<QuoteLiteratureOption[]> {
  const productIds = [
    ...new Set(items.map((item) => item.productId).filter(Boolean)),
  ];
  const options: QuoteLiteratureOption[] = [];
  const seenAttachmentIds = new Set<string>();

  for (const productId of productIds) {
    const product = await getProductById(productId);
    if (!product) continue;
    const productName = product.name.trim() || 'Product';
    for (const attachment of product.attachments ?? []) {
      if (seenAttachmentIds.has(attachment.id)) continue;
      try {
        const file = new File(attachment.uri);
        if (!file.exists) continue;
      } catch {
        continue;
      }
      seenAttachmentIds.add(attachment.id);
      options.push({
        key: `${productId}:${attachment.id}`,
        productId,
        productName,
        attachment,
      });
    }
  }

  return options;
}

/**
 * Build a single shareable file: quote PDF alone, or a zip of quote + literature.
 * PDFs are stored (not re-compressed) so packaging stays fast on-device.
 */
export async function createQuoteShareBundle(input: {
  quotePdfUri: string;
  quoteNumber: number;
  literature: QuoteLiteratureOption[];
}): Promise<{ uri: string; mimeType: string; uti: string; isBundle: boolean }> {
  const quoteRef =
    formatQuoteNumber(input.quoteNumber)?.replace(/^#/, '') || 'quote';
  const quoteFileName = `Quote-${quoteRef}.pdf`;

  if (input.literature.length === 0) {
    return {
      uri: input.quotePdfUri,
      mimeType: 'application/pdf',
      uti: 'com.adobe.pdf',
      isBundle: false,
    };
  }

  const entries: Record<string, Uint8Array> = {};
  const entryNames = buildLiteratureZipEntryNames({
    quoteFileName,
    literature: input.literature.map((option) => ({
      productName: option.productName,
      fileName: option.attachment.fileName,
    })),
  });

  const quoteFile = new File(input.quotePdfUri);
  entries[entryNames[0]!] = await quoteFile.bytes();

  for (let i = 0; i < input.literature.length; i += 1) {
    const option = input.literature[i]!;
    const entry = entryNames[i + 1]!;
    const file = new File(option.attachment.uri);
    entries[entry] = await file.bytes();
  }

  // level 0 = store; PDFs are already compressed.
  const zipped = zipSync(entries, { level: 0 });
  const out = new File(
    Paths.cache,
    `quote-${quoteRef}-with-literature-${Date.now()}.zip`
  );
  if (out.exists) {
    out.delete();
  }
  out.create();
  out.write(zipped);

  return {
    uri: out.uri,
    mimeType: 'application/zip',
    uti: 'public.zip-archive',
    isBundle: true,
  };
}

/** Drop prior share zips from cache (keeps the URI just handed to the share sheet). */
export function sweepShareBundleCache(keepUri?: string): void {
  try {
    const directory = new Directory(Paths.cache);
    if (!directory.exists) return;
    for (const entry of directory.list()) {
      if (!(entry instanceof File)) continue;
      if (!entry.name.toLowerCase().endsWith('.zip')) continue;
      if (!entry.name.startsWith('quote-')) continue;
      if (keepUri && entry.uri === keepUri) continue;
      try {
        entry.delete();
      } catch {
        // Still open in share sheet.
      }
    }
  } catch {
    // Ignore cache cleanup failures.
  }
}
