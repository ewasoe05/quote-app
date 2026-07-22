/** Zip entry path helpers for quote + literature share bundles (pure, no RN). */

function sanitizeEntryName(name: string): string {
  const cleaned = name.replace(/[^\w.\-()+ ]+/g, '_').trim();
  return cleaned.length > 0 ? cleaned : 'file.pdf';
}

function uniqueEntryName(used: Set<string>, preferred: string): string {
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  const dot = preferred.lastIndexOf('.');
  const base = dot > 0 ? preferred.slice(0, dot) : preferred;
  const ext = dot > 0 ? preferred.slice(dot) : '';
  let n = 2;
  while (used.has(`${base}-${n}${ext}`)) n += 1;
  const next = `${base}-${n}${ext}`;
  used.add(next);
  return next;
}

/** Zip entry paths for quote PDF + literature (used by share packaging + checks). */
export function buildLiteratureZipEntryNames(input: {
  quoteFileName: string;
  literature: { productName: string; fileName: string }[];
}): string[] {
  const used = new Set<string>();
  const names = [uniqueEntryName(used, input.quoteFileName)];
  for (const item of input.literature) {
    const folder = sanitizeEntryName(item.productName);
    const fileName = sanitizeEntryName(item.fileName);
    const withPdf = /\.pdf$/i.test(fileName) ? fileName : `${fileName}.pdf`;
    names.push(uniqueEntryName(used, `Literature/${folder}/${withPdf}`));
  }
  return names;
}
