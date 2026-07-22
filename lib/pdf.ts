import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

import { buildQuoteShareMessage } from './quoteDocument';
import {
  createQuoteShareBundle,
  sweepShareBundleCache,
  type QuoteLiteratureOption,
} from './quoteLiterature';
import {
  buildQuoteHtml,
  type QuotePdfInput,
} from './pdfTemplate';

export { buildQuoteHtml } from './pdfTemplate';
export type { QuotePdfInput } from './pdfTemplate';

async function logoToDataUri(logoUri: string | null): Promise<string | null> {
  if (!logoUri) return null;
  try {
    const file = new File(logoUri);
    if (!file.exists) return null;
    const base64 = await file.base64();
    const ext = (file.extension || '.jpg').replace('.', '').toLowerCase();
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'heic' || ext === 'heif'
              ? 'image/heic'
              : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

/**
 * Print.printToFileAsync writes a PDF into the app cache on every share and
 * never cleans up after itself, so the directory grows without bound. The OS
 * may reclaim the cache, but not predictably — so we sweep it ourselves.
 *
 * `keepUri` protects the file we just handed to the share sheet, since iOS
 * reads it asynchronously after shareAsync resolves.
 */
export function sweepPdfCache(keepUri?: string): void {
  // expo-print writes into a "Print" subdirectory of the cache on iOS and
  // Android; older builds wrote to the cache root, so check both.
  const candidates = [new Directory(Paths.cache, 'Print'), new Directory(Paths.cache)];

  for (const directory of candidates) {
    try {
      if (!directory.exists) continue;

      for (const entry of directory.list()) {
        if (entry instanceof Directory) continue;
        if (!entry.name.toLowerCase().endsWith('.pdf')) continue;
        if (keepUri && entry.uri === keepUri) continue;
        try {
          entry.delete();
        } catch {
          // A file still held open by the share sheet — leave it for next sweep.
        }
      }
    } catch {
      // Unreadable cache directory is not worth failing a share over.
    }
  }
}

export async function createQuotePdfFile(
  input: QuotePdfInput
): Promise<{ uri: string; html: string }> {
  const logoDataUri = await logoToDataUri(input.business.logoUri);
  const html = buildQuoteHtml(input, logoDataUri);
  const file = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Drop every earlier PDF now that a fresh one exists.
  sweepPdfCache(file.uri);

  return { uri: file.uri, html };
}

export type ShareQuotePdfOptions = {
  /** Product literature PDFs selected by the user (may be empty). */
  literature?: QuoteLiteratureOption[];
};

/**
 * Renders the quote PDF (and optional literature zip) and opens the share sheet.
 *
 * On iOS, the share sheet can dismiss via cancel — callers must not treat
 * resolution as proof the PDF was sent.
 */
export async function shareQuotePdf(
  input: QuotePdfInput,
  options: ShareQuotePdfOptions = {}
): Promise<{ uri: string; isBundle: boolean }> {
  const literature = options.literature ?? [];
  const { uri: quotePdfUri } = await createQuotePdfFile(input);
  const bundle = await createQuoteShareBundle({
    quotePdfUri,
    quoteNumber: input.quote.quoteNumber,
    literature,
  });

  if (bundle.isBundle) {
    sweepShareBundleCache(bundle.uri);
  }

  const message = buildQuoteShareMessage({
    quote: input.quote,
    items: input.items,
    businessName: input.business.businessName,
    literatureCount: literature.length,
  });
  const businessName = input.business.businessName.trim() || 'Quote';
  const customerName = input.quote.customerName.trim() || 'customer';
  const dialogTitle = `Share quote for ${customerName} (${businessName})`;

  // Prefer RN Share so iOS/Android get a message body with the file.
  try {
    await Share.share(
      Platform.OS === 'ios'
        ? { url: bundle.uri, message, title: dialogTitle }
        : {
            url: bundle.uri,
            message: `${message}\n\n${bundle.uri}`,
            title: dialogTitle,
          },
      { dialogTitle, subject: dialogTitle }
    );
    return { uri: bundle.uri, isBundle: bundle.isBundle };
  } catch {
    // Fall through to expo-sharing if the system share path fails.
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(bundle.uri, {
    mimeType: bundle.mimeType,
    UTI: bundle.uti,
    dialogTitle,
  });

  return { uri: bundle.uri, isBundle: bundle.isBundle };
}
