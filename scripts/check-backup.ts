import assert from 'node:assert/strict';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

import {
  BACKUP_DB_ENTRY,
  BACKUP_FORMAT_VERSION,
  BACKUP_KIND,
  BACKUP_MANIFEST_PATH,
  backupFileName,
  backupZipEntryForDocumentPath,
  buildBackupManifest,
  documentPathFromBackupZipEntry,
  isValidBackupManifest,
  shouldIncludeDocumentRelativePath,
} from '../lib/backupFormat';
import { resolveMonitoringEnabled } from '../lib/monitoringConfig';

assert.equal(BACKUP_FORMAT_VERSION, 1);
assert.equal(BACKUP_KIND, 'quote-app-backup');

const manifest = buildBackupManifest({
  exportedAt: '2026-07-22T12:00:00.000Z',
  databaseName: 'quote-app.db',
  fileCount: 2,
});
assert.equal(isValidBackupManifest(manifest), true);
assert.equal(
  isValidBackupManifest({ ...manifest, formatVersion: 99 }),
  false
);
assert.equal(isValidBackupManifest({ kind: 'other' }), false);

assert.equal(shouldIncludeDocumentRelativePath('business-logo.png'), true);
assert.equal(shouldIncludeDocumentRelativePath('products/p1/a.pdf'), true);
assert.equal(shouldIncludeDocumentRelativePath('quotes/q1/job-site.jpg'), true);
assert.equal(shouldIncludeDocumentRelativePath('../etc/passwd'), false);
assert.equal(shouldIncludeDocumentRelativePath('cache/tmp.bin'), false);

assert.equal(
  backupZipEntryForDocumentPath('products/p1/cut.pdf'),
  'files/products/p1/cut.pdf'
);
assert.equal(
  documentPathFromBackupZipEntry('files/quotes/q1/customer-signature.svg'),
  'quotes/q1/customer-signature.svg'
);
assert.equal(documentPathFromBackupZipEntry('db/quote-app.db'), null);

assert.match(backupFileName(new Date('2026-07-22T15:00:00Z')), /quote-app-backup-2026-07-22\.zip/);

// Round-trip zip layout used by export/import.
const zipped = zipSync({
  [BACKUP_MANIFEST_PATH]: strToU8(JSON.stringify(manifest)),
  [BACKUP_DB_ENTRY]: new Uint8Array([1, 2, 3, 4]),
  'files/business-logo.png': new Uint8Array([137, 80]),
  'files/products/p1/cut.pdf': new Uint8Array([37, 80, 68, 70]),
});
const unzipped = unzipSync(zipped);
assert.ok(unzipped[BACKUP_MANIFEST_PATH]);
assert.deepEqual(
  Array.from(unzipped[BACKUP_DB_ENTRY]!),
  [1, 2, 3, 4]
);
const parsed = JSON.parse(strFromU8(unzipped[BACKUP_MANIFEST_PATH]!));
assert.equal(isValidBackupManifest(parsed), true);

// DSN gate: empty / whitespace stays off; only a real DSN enables reporting.
assert.equal(resolveMonitoringEnabled(''), false);
assert.equal(resolveMonitoringEnabled('   '), false);
assert.equal(resolveMonitoringEnabled(undefined), false);
assert.equal(resolveMonitoringEnabled('https://example.ingest.sentry.io/1'), true);

console.log('backup + monitoring checks passed');
