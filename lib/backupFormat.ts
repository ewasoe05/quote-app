/**
 * Pure backup format helpers (no filesystem / SQLite).
 * Zip layout:
 *   manifest.json
 *   db/quote-app.db
 *   files/...   (relative paths under the app documents directory)
 */

export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_KIND = 'quote-app-backup';
export const BACKUP_MANIFEST_PATH = 'manifest.json';
export const BACKUP_DB_ENTRY = 'db/quote-app.db';
export const BACKUP_FILES_PREFIX = 'files/';

export type BackupManifest = {
  formatVersion: number;
  kind: typeof BACKUP_KIND;
  exportedAt: string;
  databaseName: string;
  fileCount: number;
};

export function buildBackupManifest(input: {
  exportedAt?: string;
  databaseName: string;
  fileCount: number;
}): BackupManifest {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    kind: BACKUP_KIND,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    databaseName: input.databaseName,
    fileCount: input.fileCount,
  };
}

export function isValidBackupManifest(value: unknown): value is BackupManifest {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return (
    m.formatVersion === BACKUP_FORMAT_VERSION &&
    m.kind === BACKUP_KIND &&
    typeof m.exportedAt === 'string' &&
    typeof m.databaseName === 'string' &&
    typeof m.fileCount === 'number'
  );
}

/** Document-relative paths that belong in a backup (logo + media trees). */
export function shouldIncludeDocumentRelativePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) return false;
  if (/^business-logo\.[a-z0-9]+$/i.test(normalized)) return true;
  if (normalized === 'products' || normalized.startsWith('products/')) return true;
  if (normalized === 'quotes' || normalized.startsWith('quotes/')) return true;
  return false;
}

export function backupZipEntryForDocumentPath(relativePath: string): string {
  return `${BACKUP_FILES_PREFIX}${relativePath.replace(/^\/+/, '')}`;
}

export function documentPathFromBackupZipEntry(entry: string): string | null {
  if (!entry.startsWith(BACKUP_FILES_PREFIX)) return null;
  const relative = entry.slice(BACKUP_FILES_PREFIX.length);
  if (!shouldIncludeDocumentRelativePath(relative)) return null;
  return relative;
}

export function backupFileName(exportedAt = new Date()): string {
  const y = exportedAt.getFullYear();
  const m = String(exportedAt.getMonth() + 1).padStart(2, '0');
  const d = String(exportedAt.getDate()).padStart(2, '0');
  return `quote-app-backup-${y}-${m}-${d}.zip`;
}
