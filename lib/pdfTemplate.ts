import { calcQuoteTotals } from './calc';
import { formatCurrency } from './products';
import { formatQuoteNumber } from './quotes';
import type { BusinessSettings, Quote, QuoteItem } from './types';

export type QuotePdfInput = {
  quote: Quote;
  items: QuoteItem[];
  business: BusinessSettings;
};

/** Accent blue matching the Clear Solutions / QuickBooks-style invoice. */
const ACCENT = '#2b6cb0';
const ACCENT_LIGHT = '#dceaf8';
const TEXT = '#1a1a1a';
const MUTED = '#4a5568';

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

/** MM/DD/YYYY to match the sample invoice date style. */
function formatPdfDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return escapeHtml(iso);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Plain 2-decimal amount (no $) for table rate/amount columns. */
function formatPlainAmount(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
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

/**
 * Pure HTML builder for quote PDFs.
 * Layout mirrors the QuickBooks-style invoice; logo + customer come from app data only.
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

  const businessName = business.businessName.trim();
  const customerName = quote.customerName.trim();
  const quoteDate = formatPdfDate(quote.createdAt);
  const quoteRef = formatQuoteNumber(quote.quoteNumber);
  const quoteTitle = quoteRef ? `Quote ${quoteRef.replace(/^#/, '')}` : 'Quote';
  const discountLabel =
    quote.discountType === 'percent'
      ? `Discount (${quote.discount}%)`
      : 'Discount';
  const showDiscount = totals.discountAmount > 0;

  const logoHtml = logoDataUri
    ? `<img class="logo" src="${logoDataUri}" alt="" />`
    : '';

  const businessMeta = businessContactLines(business)
    .map((line) => `<div>${nl2br(line)}</div>`)
    .join('');

  // BILL TO: name + contact. Never bake sample customer data into the template.
  const billToParts = [
    customerName,
    quote.phone.trim(),
    quote.email.trim(),
  ].filter((line) => line.length > 0);
  const billToHtml = billToParts.length
    ? billToParts.map((line) => `<div>${escapeHtml(line)}</div>`).join('')
    : `<div class="placeholder">&nbsp;</div>`;

  // SHIP TO / service address from the quote address only.
  const shipTo = quote.address.trim();
  const shipToHtml = shipTo
    ? `<div>${nl2br(shipTo)}</div>`
    : `<div class="placeholder">&nbsp;</div>`;

  const itemRows =
    items.length === 0
      ? `<tr><td colspan="4" class="muted">No line items</td></tr>`
      : items
          .map((item) => {
            const lineTotal = item.priceSnapshot * item.quantity;
            return `<tr>
              <td class="num qty">${escapeHtml(String(item.quantity))}</td>
              <td class="activity">${escapeHtml(item.nameSnapshot)}</td>
              <td class="num">${escapeHtml(formatPlainAmount(item.priceSnapshot))}</td>
              <td class="num">${escapeHtml(formatPlainAmount(lineTotal))}</td>
            </tr>`;
          })
          .join('');

  const discountRow = showDiscount
    ? `<div class="tot-row"><span>${escapeHtml(discountLabel)}</span><span>−${escapeHtml(
        formatPlainAmount(totals.discountAmount)
      )}</span></div>`
    : '';

  const notesHtml = quote.notes.trim()
    ? `<div class="notes-block"><div class="notes-title">Notes</div><div>${nl2br(
        quote.notes.trim()
      )}</div></div>`
    : '';

  const footerHtml = business.quoteFooter.trim()
    ? `<div class="terms">${nl2br(business.quoteFooter.trim())}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(businessName || 'Quote')}${quoteRef ? ` ${escapeHtml(quoteRef)}` : ''}</title>
  <style>
    @page { margin: 36px 40px; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: ${TEXT};
      font-family: Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
    }
    .company {
      flex: 1;
      min-width: 0;
      font-size: 11px;
      line-height: 1.35;
      color: ${TEXT};
    }
    .company-name {
      font-weight: 700;
      font-size: 13px;
      margin: 0 0 2px;
    }
    .logo-wrap {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 8px;
    }
    .logo {
      max-width: 160px;
      max-height: 72px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .doc-title {
      flex: 1;
      text-align: right;
      color: ${ACCENT};
      font-size: 28px;
      font-weight: 700;
      line-height: 1.1;
      white-space: nowrap;
    }
    .rule {
      border: 0;
      border-top: 2px solid ${ACCENT};
      margin: 0 0 16px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 20px;
      align-items: stretch;
    }
    .parties {
      display: flex;
      gap: 36px;
      flex: 1;
    }
    .party { min-width: 140px; max-width: 220px; }
    .party-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
      color: ${TEXT};
    }
    .party div { line-height: 1.35; }
    .placeholder { min-height: 1.2em; }
    .summary {
      display: flex;
      align-self: flex-start;
      border-collapse: collapse;
    }
    .sum-box {
      min-width: 88px;
      padding: 8px 12px;
      background: ${ACCENT_LIGHT};
      color: ${ACCENT};
    }
    .sum-box.emphasis {
      background: ${ACCENT};
      color: #fff;
      min-width: 110px;
    }
    .sum-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .sum-value {
      font-size: 14px;
      font-weight: 700;
    }
    .sum-box.emphasis .sum-value { font-size: 16px; }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    table.items thead { display: table-header-group; }
    table.items th {
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: ${TEXT};
      padding: 6px 8px;
      border-top: 2px solid ${ACCENT};
      border-bottom: 2px solid ${ACCENT};
      background: transparent;
    }
    table.items th.num,
    table.items td.num { text-align: right; white-space: nowrap; }
    table.items th.qty,
    table.items td.qty { width: 48px; text-align: right; }
    table.items td {
      padding: 8px;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
    }
    table.items tr { page-break-inside: avoid; }
    .activity { font-weight: 700; }
    .muted {
      color: #a0aec0;
      text-align: center;
      padding: 18px 0 !important;
      font-weight: 400;
    }
    .bottom {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 12px;
      align-items: flex-start;
    }
    .bottom-left {
      flex: 1;
      min-width: 0;
    }
    .notes-block {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .notes-title {
      color: ${ACCENT};
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .terms {
      color: ${MUTED};
      font-size: 10px;
      margin-top: 8px;
      page-break-inside: avoid;
    }
    .totals {
      width: 220px;
      flex-shrink: 0;
    }
    .tot-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      font-size: 11px;
    }
    .tot-row.total {
      margin-top: 2px;
      padding-top: 6px;
    }
    .tot-due {
      margin-top: 6px;
      padding-top: 8px;
      border-top: 1px solid ${ACCENT};
      border-bottom: 3px solid ${ACCENT};
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      color: ${ACCENT};
      font-weight: 700;
      font-size: 13px;
      page-break-inside: avoid;
    }
    .thank-you {
      margin-top: 10px;
      text-align: right;
      color: ${ACCENT};
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sign-block {
      margin-top: 36px;
      page-break-inside: avoid;
    }
    .sign-line {
      margin-bottom: 14px;
      font-size: 11px;
    }
    .sign-line .label { display: inline-block; min-width: 72px; }
    .sign-line .blank {
      display: inline-block;
      border-bottom: 1px solid ${TEXT};
      min-width: 220px;
      height: 1em;
      vertical-align: bottom;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      ${businessName ? `<p class="company-name">${escapeHtml(businessName)}</p>` : ''}
      ${businessMeta}
    </div>
    <div class="logo-wrap">${logoHtml}</div>
    <div class="doc-title">${escapeHtml(quoteTitle)}</div>
  </div>

  <hr class="rule" />

  <div class="meta-row">
    <div class="parties">
      <div class="party">
        <div class="party-label">Bill to</div>
        ${billToHtml}
      </div>
      <div class="party">
        <div class="party-label">Ship to</div>
        ${shipToHtml}
      </div>
    </div>
    <div class="summary">
      <div class="sum-box">
        <div class="sum-label">Date</div>
        <div class="sum-value">${quoteDate}</div>
      </div>
      <div class="sum-box emphasis">
        <div class="sum-label">Quote total</div>
        <div class="sum-value">${escapeHtml(formatCurrency(totals.grandTotal))}</div>
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th class="qty">Qty</th>
        <th>Activity</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="bottom">
    <div class="bottom-left">
      ${notesHtml}
      ${footerHtml}
    </div>
    <div class="totals">
      <div class="tot-row"><span>Subtotal</span><span>${escapeHtml(
        formatPlainAmount(totals.subtotal)
      )}</span></div>
      ${discountRow}
      <div class="tot-row"><span>Tax</span><span>${escapeHtml(
        formatPlainAmount(totals.tax)
      )}</span></div>
      <div class="tot-row total"><span>Total</span><span>${escapeHtml(
        formatPlainAmount(totals.grandTotal)
      )}</span></div>
      <div class="tot-due">
        <span>Total</span>
        <span>${escapeHtml(formatCurrency(totals.grandTotal))}</span>
      </div>
      <div class="thank-you">Thank you.</div>
    </div>
  </div>

  <div class="sign-block">
    <div class="sign-line"><span class="label">Date:</span> <span class="blank"></span></div>
    <div class="sign-line"><span class="label">Customer:</span> <span class="blank"></span></div>
    <div class="sign-line"><span class="label">Tech:</span> <span class="blank"></span></div>
  </div>
</body>
</html>`;
}
