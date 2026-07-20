import { calcQuoteTotals } from './calc';
import { formatCurrency } from './products';
import { formatQuoteDate } from './quotes';
import type { BusinessSettings, Quote, QuoteItem } from './types';

export type QuotePdfInput = {
  quote: Quote;
  items: QuoteItem[];
  business: BusinessSettings;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value: string): string {
  return escapeHtml(value).replace(/\r\n|\n|\r/g, '<br/>');
}

function businessContactLines(business: BusinessSettings): string[] {
  return [
    business.address,
    business.phone,
    business.email,
    business.website,
    business.licenseNumber ? `License # ${business.licenseNumber}` : '',
  ].filter((line) => line.trim().length > 0);
}

function customerLines(quote: Quote): string[] {
  return [quote.phone, quote.email, quote.address].filter(
    (line) => line.trim().length > 0
  );
}

/**
 * Pure HTML builder for quote PDFs. Logo is optional data-URI for print reliability.
 */
export function buildQuoteHtml(
  input: QuotePdfInput,
  logoDataUri: string | null = null
): string {
  const { quote, items, business } = input;
  const totals = calcQuoteTotals({
    items,
    discount: quote.discount,
    discountType: quote.discountType ?? 'flat',
    taxRate: quote.taxRate,
  });

  const businessName = business.businessName.trim() || 'Quote';
  const customerName = quote.customerName.trim() || 'Customer';
  const quoteDate = formatQuoteDate(quote.createdAt);
  const discountLabel =
    quote.discountType === 'percent'
      ? `Discount (${quote.discount}%)`
      : 'Discount';

  const itemRows =
    items.length === 0
      ? `<tr><td colspan="4" class="muted">No line items</td></tr>`
      : items
          .map((item) => {
            const lineTotal = item.priceSnapshot * item.quantity;
            return `<tr>
              <td>${escapeHtml(item.nameSnapshot)}</td>
              <td class="num">${item.quantity}</td>
              <td class="num">${escapeHtml(formatCurrency(item.priceSnapshot))}</td>
              <td class="num">${escapeHtml(formatCurrency(lineTotal))}</td>
            </tr>`;
          })
          .join('');

  const logoHtml = logoDataUri
    ? `<img class="logo" src="${logoDataUri}" alt="Logo" />`
    : '';

  const businessMeta = businessContactLines(business)
    .map((line) => `<div>${nl2br(line)}</div>`)
    .join('');

  const customerMeta = customerLines(quote)
    .map((line) => `<div>${nl2br(line)}</div>`)
    .join('');

  const footerHtml = business.quoteFooter.trim()
    ? `<div class="footer"><div class="footer-title">Terms</div><div>${nl2br(
        business.quoteFooter
      )}</div></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(businessName)} — Quote</title>
  <style>
    @page {
      margin: 28px 24px;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #142033;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
      padding-bottom: 16px;
      border-bottom: 2px solid #1f6feb;
      margin-bottom: 18px;
    }
    .brand {
      display: flex;
      gap: 14px;
      align-items: flex-start;
      max-width: 65%;
    }
    .logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      border-radius: 8px;
    }
    .business-name {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 4px;
    }
    .meta { color: #5b6b7c; }
    .quote-label {
      text-align: right;
      white-space: nowrap;
    }
    .quote-label .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 10px;
      color: #5b6b7c;
      font-weight: 700;
    }
    .quote-label .date {
      font-size: 14px;
      font-weight: 600;
      margin-top: 4px;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #5b6b7c;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .customer-name {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    th, td {
      padding: 8px 6px;
      border-bottom: 1px solid #e6ebf2;
      vertical-align: top;
    }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #5b6b7c;
      background: #f5f8fb;
    }
    tr { page-break-inside: avoid; }
    .num { text-align: right; white-space: nowrap; }
    .muted { color: #8a97a8; text-align: center; padding: 16px 0; }
    .totals {
      width: 260px;
      margin-left: auto;
      margin-top: 10px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
    }
    .totals .grand {
      margin-top: 6px;
      padding-top: 8px;
      border-top: 2px solid #142033;
      font-size: 15px;
      font-weight: 700;
    }
    .footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #e6ebf2;
      color: #5b6b7c;
      font-size: 11px;
      page-break-inside: avoid;
    }
    .footer-title {
      font-weight: 700;
      color: #142033;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      ${logoHtml}
      <div>
        <p class="business-name">${escapeHtml(businessName)}</p>
        <div class="meta">${businessMeta}</div>
      </div>
    </div>
    <div class="quote-label">
      <div class="eyebrow">Quote</div>
      <div class="date">${escapeHtml(quoteDate)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Prepared for</div>
    <div class="customer-name">${escapeHtml(customerName)}</div>
    <div class="meta">${customerMeta}</div>
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Price</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${escapeHtml(
        formatCurrency(totals.subtotal)
      )}</span></div>
      <div class="row"><span>${escapeHtml(discountLabel)}</span><span>−${escapeHtml(
        formatCurrency(totals.discountAmount)
      )}</span></div>
      <div class="row"><span>Tax (${escapeHtml(
        String(quote.taxRate)
      )}%)</span><span>${escapeHtml(formatCurrency(totals.tax))}</span></div>
      <div class="row grand"><span>Total</span><span>${escapeHtml(
        formatCurrency(totals.grandTotal)
      )}</span></div>
    </div>
  </div>

  ${footerHtml}
</body>
</html>`;
}
