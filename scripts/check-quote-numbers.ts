import assert from 'node:assert/strict';

import { formatQuoteNumber } from '../lib/quotes';

// --- Display formatting ---

assert.equal(formatQuoteNumber(1001), '#1001');
assert.equal(formatQuoteNumber(1042), '#1042');

// Rows written before the quote_number column existed sit at 0 until the
// backfill runs. Render nothing rather than a bogus "#0".
assert.equal(formatQuoteNumber(0), '');
assert.equal(formatQuoteNumber(-1), '');
assert.equal(formatQuoteNumber(Number.NaN), '');

/**
 * Mirrors the allocator in lib/db.ts. The DB owns the real implementation
 * (it needs a transaction); this pins the behaviour that matters:
 * numbers always move forward, and a deleted quote never has its number
 * reissued to a different customer.
 */
const FIRST_QUOTE_NUMBER = 1001;

function allocate(storedSeq: string | undefined): {
  assigned: number;
  nextSeq: string;
} {
  const stored = Number(storedSeq);
  const assigned =
    Number.isFinite(stored) && stored >= FIRST_QUOTE_NUMBER
      ? stored
      : FIRST_QUOTE_NUMBER;
  return { assigned, nextSeq: String(assigned + 1) };
}

// First ever quote starts at the configured floor, not at 1.
const first = allocate(undefined);
assert.equal(first.assigned, 1001);
assert.equal(first.nextSeq, '1002');

// Sequential allocation.
const second = allocate(first.nextSeq);
assert.equal(second.assigned, 1002);
const third = allocate(second.nextSeq);
assert.equal(third.assigned, 1003);

// A corrupt or missing counter falls back to the floor rather than NaN.
assert.equal(allocate('not-a-number').assigned, 1001);
assert.equal(allocate('12').assigned, 1001);

// Deleting quote 1003 must not hand 1003 to the next customer: the sequence
// is stored independently of the rows, so it keeps climbing.
assert.equal(allocate(third.nextSeq).assigned, 1004);

/**
 * Mirrors backfillQuoteNumbers: unnumbered rows get numbers oldest-first,
 * starting above whatever is already in use.
 */
function backfill(
  existing: { id: string; createdAt: string; quoteNumber: number }[]
): { id: string; quoteNumber: number }[] {
  const highest = existing.reduce((max, row) => Math.max(max, row.quoteNumber), 0);
  let next = Math.max(highest, FIRST_QUOTE_NUMBER - 1) + 1;

  return existing
    .filter((row) => row.quoteNumber < FIRST_QUOTE_NUMBER)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .map((row) => ({ id: row.id, quoteNumber: next++ }));
}

// Legacy rows, all at the 0 default, numbered in creation order.
const legacy = backfill([
  { id: 'c', createdAt: '2026-03-01T00:00:00.000Z', quoteNumber: 0 },
  { id: 'a', createdAt: '2026-01-01T00:00:00.000Z', quoteNumber: 0 },
  { id: 'b', createdAt: '2026-02-01T00:00:00.000Z', quoteNumber: 0 },
]);
assert.deepEqual(legacy, [
  { id: 'a', quoteNumber: 1001 },
  { id: 'b', quoteNumber: 1002 },
  { id: 'c', quoteNumber: 1003 },
]);

// A partially-migrated DB must not reuse numbers already assigned.
const partial = backfill([
  { id: 'a', createdAt: '2026-01-01T00:00:00.000Z', quoteNumber: 1001 },
  { id: 'b', createdAt: '2026-02-01T00:00:00.000Z', quoteNumber: 1002 },
  { id: 'c', createdAt: '2026-03-01T00:00:00.000Z', quoteNumber: 0 },
]);
assert.deepEqual(partial, [{ id: 'c', quoteNumber: 1003 }]);

// Fully-numbered DB: backfill is a no-op, so it's safe on every launch.
assert.deepEqual(
  backfill([{ id: 'a', createdAt: '2026-01-01T00:00:00.000Z', quoteNumber: 1001 }]),
  []
);

console.log('quote number checks passed');
