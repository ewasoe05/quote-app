import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
            : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
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
  return { uri: file.uri, html };
}

/**
 * Renders the quote PDF and opens the native share sheet.
 * Returns whether sharing completed without throwing.
 */
export async function shareQuotePdf(
  input: QuotePdfInput
): Promise<{ uri: string; shared: boolean }> {
  const { uri } = await createQuotePdfFile(input);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }

  const businessName = input.business.businessName.trim() || 'Quote';
  const customerName = input.quote.customerName.trim() || 'customer';

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Share quote for ${customerName} (${businessName})`,
  });

  return { uri, shared: true };
}
