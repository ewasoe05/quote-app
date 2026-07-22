import { calcQuoteTotals } from './calc';
import { formatCurrency } from './products';
import {
  calcDepositAmount,
  normalizeValidUntil,
} from './quoteDocument';
import { formatQuoteNumber } from './quotes';
import {
  DEFAULT_ACCENT_COLOR,
  type BusinessSettings,
  type Quote,
  type QuoteItem,
} from './types';

export type QuotePdfInput = {
  quote: Quote;
  items: QuoteItem[];
  business: BusinessSettings;
};

export type QuotePdfMedia = {
  customerSignatureDataUri?: string | null;
  techSignatureDataUri?: string | null;
  jobSitePhotoDataUri?: string | null;
};

const TEXT = '#1a1a1a';
const MUTED = '#5a6572';

/** Soft tint of a hex accent for summary side boxes. */
function lightenAccent(hex: string): string {
  const raw = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return '#d6e6f5';
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.78);
  const toHex = (c: number) => mix(c).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function resolveAccent(business: BusinessSettings): string {
  const value = business.accentColor?.trim() || DEFAULT_ACCENT_COLOR;
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : DEFAULT_ACCENT_COLOR;
}

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
 * Layout mirrors QuickBooks Invoice 5297; logo + customer come from app data only.
 * Uses tables for critical layout so expo-print renders reliably on iOS.
 */
export function buildQuoteHtml(
  input: QuotePdfInput,
  logoDataUri: string | null = null,
  media: QuotePdfMedia = {}
): string {
  const { quote, items, business } = input;
  const ACCENT = resolveAccent(business);
  const ACCENT_LIGHT = lightenAccent(ACCENT);
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
  const validUntil = normalizeValidUntil(quote.validUntil);
  const validUntilLabel = validUntil
    ? formatPdfDate(`${validUntil}T12:00:00`)
    : '—';
  const discountLabel =
    quote.discountType === 'percent'
      ? `Discount (${quote.discount}%)`
      : 'Discount';
  const showDiscount = totals.discountAmount > 0;
  const depositDue = calcDepositAmount(
    totals.grandTotal,
    quote.deposit ?? 0,
    quote.depositType ?? 'percent'
  );
  const paymentTerms = (quote.paymentTerms || '').trim();

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
    : `&nbsp;`;

  // SHIP TO / service address from the quote address only.
  const shipTo = quote.address.trim();
  const shipToHtml = shipTo ? nl2br(shipTo) : `&nbsp;`;

  const itemRows =
    items.length === 0
      ? `<tr><td colspan="5" class="muted">No line items</td></tr>`
      : items
          .map((item) => {
            const lineTotal = item.priceSnapshot * item.quantity;
            const description = (item.descriptionSnapshot ?? '').trim();
            return `<tr>
              <td class="num qty">${escapeHtml(String(item.quantity))}</td>
              <td class="activity">${escapeHtml(item.nameSnapshot)}</td>
              <td class="desc">${description ? nl2br(description) : ''}</td>
              <td class="num">${escapeHtml(formatPlainAmount(item.priceSnapshot))}</td>
              <td class="num">${escapeHtml(formatPlainAmount(lineTotal))}</td>
            </tr>`;
          })
          .join('');

  const discountRow = showDiscount
    ? `<tr>
        <td class="tot-label">${escapeHtml(discountLabel)}</td>
        <td class="tot-val">−${escapeHtml(formatPlainAmount(totals.discountAmount))}</td>
      </tr>`
    : '';

  const notesHtml = quote.notes.trim()
    ? `<div class="notes-block"><div class="notes-title">Notes</div><div>${nl2br(
        quote.notes.trim()
      )}</div></div>`
    : '';

  const footerHtml = business.quoteFooter.trim()
    ? `<div class="terms">${nl2br(business.quoteFooter.trim())}</div>`
    : '';

  const termsBlockParts: string[] = [];
  if (depositDue > 0) {
    termsBlockParts.push(
      `<div><strong>Deposit to schedule:</strong> ${escapeHtml(
        formatCurrency(depositDue)
      )}</div>`
    );
  }
  if (paymentTerms) {
    termsBlockParts.push(
      `<div><strong>Payment terms:</strong> ${nl2br(paymentTerms)}</div>`
    );
  }
  const commercialHtml =
    termsBlockParts.length > 0
      ? `<div class="commercial">${termsBlockParts.join('')}</div>`
      : '';

  const signedDateLabel = quote.signedAt
    ? formatPdfDate(quote.signedAt)
    : '';
  const customerSig = media.customerSignatureDataUri
    ? `<span class="sig-img"><img src="${media.customerSignatureDataUri}" alt="Customer signature" /></span>`
    : `<span class="blank"></span>`;
  const techSig = media.techSignatureDataUri
    ? `<span class="sig-img"><img src="${media.techSignatureDataUri}" alt="Tech signature" /></span>`
    : `<span class="blank"></span>`;
  const jobPhotoHtml = media.jobSitePhotoDataUri
    ? `<div class="job-photo"><div class="job-photo-label">Job site</div><img src="${media.jobSitePhotoDataUri}" alt="Job site" /></div>`
    : '';
  const statusReasonHtml =
    (quote.status === 'won' || quote.status === 'lost') &&
    quote.statusReason.trim()
      ? `<div class="status-reason"><strong>${escapeHtml(
          quote.status === 'won' ? 'Won reason' : 'Lost reason'
        )}:</strong> ${escapeHtml(quote.statusReason.trim())}</div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(businessName || 'Quote')}${quoteRef ? ` ${escapeHtml(quoteRef)}` : ''}</title>
  <style>
    @page { margin: 32px 36px; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: ${TEXT};
      font-family: Helvetica, Arial, sans-serif;
      font-size: 10.5px;
      line-height: 1.35;
    }
    table { border-collapse: collapse; }
    .header {
      width: 100%;
      margin-bottom: 10px;
    }
    .header td { vertical-align: top; }
    .company {
      width: 32%;
      font-size: 10.5px;
      line-height: 1.3;
    }
    .company-name {
      font-weight: 700;
      font-size: 12px;
      margin: 0 0 2px;
    }
    .logo-cell {
      width: 36%;
      text-align: center;
      vertical-align: middle;
    }
    .logo {
      max-width: 170px;
      max-height: 68px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .doc-title {
      width: 32%;
      text-align: right;
      color: ${ACCENT};
      font-size: 26px;
      font-weight: 700;
      line-height: 1.05;
      white-space: nowrap;
      padding-top: 4px;
    }
    .rule {
      border: 0;
      border-top: 1.5px solid ${ACCENT};
      margin: 0 0 12px;
    }
    .meta {
      width: 100%;
      margin-bottom: 14px;
    }
    .meta td { vertical-align: top; }
    .parties { width: 58%; }
    .party-table { width: 100%; }
    .party-table td {
      width: 50%;
      vertical-align: top;
      padding-right: 16px;
    }
    .party-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 3px;
      color: ${TEXT};
    }
    .party-body {
      font-size: 10.5px;
      line-height: 1.35;
    }
    .summary-wrap {
      width: 42%;
      text-align: right;
    }
    .summary {
      width: auto;
      margin-left: auto;
      border-collapse: separate;
      border-spacing: 0;
    }
    .summary td {
      padding: 7px 11px;
      vertical-align: top;
      text-align: left;
      min-width: 78px;
    }
    .sum-light {
      background: ${ACCENT_LIGHT};
      color: ${ACCENT};
    }
    .sum-dark {
      background: ${ACCENT};
      color: #fff;
      min-width: 96px;
    }
    .sum-label {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .sum-value {
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }
    .sum-dark .sum-value { font-size: 14px; }
    table.items {
      width: 100%;
      margin-bottom: 6px;
    }
    table.items thead { display: table-header-group; }
    table.items th {
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: ${TEXT};
      padding: 5px 6px;
      border-top: 1.5px solid ${ACCENT};
      border-bottom: 1.5px solid ${ACCENT};
      background: transparent;
    }
    table.items th.num,
    table.items td.num { text-align: right; white-space: nowrap; }
    table.items th.qty,
    table.items td.qty { width: 40px; text-align: right; }
    table.items th.activity { width: 26%; }
    table.items td {
      padding: 7px 6px;
      vertical-align: top;
      border-bottom: 1px solid #e8edf2;
      font-size: 10.5px;
    }
    table.items tr { page-break-inside: avoid; }
    .activity { font-weight: 700; }
    .desc { color: ${TEXT}; font-weight: 400; }
    .muted {
      color: #a0aec0;
      text-align: center;
      padding: 14px 0 !important;
      font-weight: 400;
    }
    .bottom {
      width: 100%;
      margin-top: 8px;
    }
    .bottom td { vertical-align: top; }
    .bottom-left { width: 55%; padding-right: 16px; }
    .notes-block {
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .notes-title {
      color: ${ACCENT};
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .commercial {
      margin-bottom: 10px;
      font-size: 10.5px;
      line-height: 1.4;
      page-break-inside: avoid;
    }
    .commercial div { margin-bottom: 4px; }
    .terms {
      color: ${MUTED};
      font-size: 9.5px;
      margin-top: 6px;
      page-break-inside: avoid;
    }
    .totals-wrap { width: 45%; }
    .totals {
      width: 210px;
      margin-left: auto;
    }
    .totals td {
      padding: 2px 0;
      font-size: 10.5px;
    }
    .tot-label { text-align: left; color: ${TEXT}; }
    .tot-val { text-align: right; white-space: nowrap; }
    .tot-due-row td {
      padding-top: 8px;
      padding-bottom: 8px;
      border-top: 1px solid ${ACCENT};
      border-bottom: 3px solid ${ACCENT};
      color: ${ACCENT};
      font-weight: 700;
      font-size: 12px;
    }
    .thank-you {
      margin-top: 8px;
      text-align: right;
      color: ${ACCENT};
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .sign-block {
      margin-top: 28px;
      page-break-inside: avoid;
    }
    .sign-line {
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    .sign-line .label { display: inline-block; min-width: 68px; vertical-align: top; padding-top: 18px; }
    .sign-line .blank {
      display: inline-block;
      border-bottom: 1px solid ${TEXT};
      min-width: 200px;
      height: 1em;
      vertical-align: bottom;
    }
    .sign-line .sig-img {
      display: inline-block;
      border-bottom: 1px solid ${TEXT};
      min-width: 220px;
      height: 48px;
      vertical-align: bottom;
    }
    .sign-line .sig-img img {
      max-height: 46px;
      max-width: 220px;
      object-fit: contain;
    }
    .job-photo {
      margin-top: 18px;
      page-break-inside: avoid;
    }
    .job-photo-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${MUTED};
      margin-bottom: 6px;
    }
    .job-photo img {
      max-width: 280px;
      max-height: 180px;
      object-fit: cover;
      border: 1px solid #dde1e6;
    }
    .status-reason {
      margin-top: 10px;
      font-size: 10px;
      color: ${MUTED};
    }
  </style>
</head>
<body>
  <table class="header">
    <tr>
      <td class="company">
        ${businessName ? `<p class="company-name">${escapeHtml(businessName)}</p>` : ''}
        ${businessMeta}
      </td>
      <td class="logo-cell">${logoHtml}</td>
      <td class="doc-title">${escapeHtml(quoteTitle)}</td>
    </tr>
  </table>

  <hr class="rule" />

  <table class="meta">
    <tr>
      <td class="parties">
        <table class="party-table">
          <tr>
            <td>
              <div class="party-label">Bill to</div>
              <div class="party-body">${billToHtml}</div>
            </td>
            <td>
              <div class="party-label">Ship to</div>
              <div class="party-body">${shipToHtml}</div>
            </td>
          </tr>
        </table>
      </td>
      <td class="summary-wrap">
        <table class="summary">
          <tr>
            <td class="sum-light">
              <div class="sum-label">Date</div>
              <div class="sum-value">${quoteDate}</div>
            </td>
            <td class="sum-dark">
              <div class="sum-label">Quote total</div>
              <div class="sum-value">${escapeHtml(formatCurrency(totals.grandTotal))}</div>
            </td>
            <td class="sum-light">
              <div class="sum-label">Valid until</div>
              <div class="sum-value">${validUntilLabel}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th class="qty">Qty</th>
        <th class="activity">Activity</th>
        <th>Description</th>
        <th class="num">Rate</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <table class="bottom">
    <tr>
      <td class="bottom-left">
        ${commercialHtml}
        ${notesHtml}
        ${footerHtml}
      </td>
      <td class="totals-wrap">
        <table class="totals">
          <tr>
            <td class="tot-label">Subtotal</td>
            <td class="tot-val">${escapeHtml(formatPlainAmount(totals.subtotal))}</td>
          </tr>
          ${discountRow}
          <tr>
            <td class="tot-label">Tax</td>
            <td class="tot-val">${escapeHtml(formatPlainAmount(totals.tax))}</td>
          </tr>
          <tr>
            <td class="tot-label">Total</td>
            <td class="tot-val">${escapeHtml(formatPlainAmount(totals.grandTotal))}</td>
          </tr>
          <tr class="tot-due-row">
            <td class="tot-label">Total</td>
            <td class="tot-val">${escapeHtml(formatCurrency(totals.grandTotal))}</td>
          </tr>
        </table>
        <div class="thank-you">Thank you.</div>
      </td>
    </tr>
  </table>

  <div class="sign-block">
    <div class="sign-line"><span class="label">Date:</span> ${
      signedDateLabel
        ? `<span class="blank" style="border-bottom:none;">${escapeHtml(signedDateLabel)}</span>`
        : `<span class="blank"></span>`
    }</div>
    <div class="sign-line"><span class="label">Customer:</span> ${customerSig}</div>
    <div class="sign-line"><span class="label">Tech:</span> ${techSig}</div>
    ${statusReasonHtml}
  </div>
  ${jobPhotoHtml}
</body>
</html>`;
}
