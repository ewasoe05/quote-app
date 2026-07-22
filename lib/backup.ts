import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { Platform } from 'react-native';

import {
  BACKUP_DB_ENTRY,
  BACKUP_MANIFEST_PATH,
  backupFileName,
  backupZipEntryForDocumentPath,
  buildBackupManifest,
  documentPathFromBackupZipEntry,
  isValidBackupManifest,
  shouldIncludeDocumentRelativePath,
} from './backupFormat';
import {
  closeDatabase,
  DATABASE_NAME,
  getDatabase,
  initializeDatabase,
  seedDefaultCatalog,
} from './db';
import { addBreadcrumb, captureException } from './monitoring';

export {
  BACKUP_FORMAT_VERSION,
  BACKUP_KIND,
  backupFileName,
  buildBackupManifest,
  isValidBackupManifest,
  shouldIncludeDocumentRelativePath,
} from './backupFormat';

type ZipEntries = Record<string, Uint8Array>;

function isDirectory(entry: File | Directory): entry is Directory {
  return entry instanceof Directory;
}

function isFile(entry: File | Directory): entry is File {
  return entry instanceof File;
}

async function collectDocumentEntries(
  dir: Directory,
  relativePrefix: string,
  out: ZipEntries
): Promise<void> {
  if (!dir.exists) return;
  for (const entry of dir.list()) {
    const name = entry.name;
    const relative = relativePrefix ? `${relativePrefix}/${name}` : name;
    if (isDirectory(entry)) {
      if (!shouldIncludeDocumentRelativePath(relative)) continue;
      await collectDocumentEntries(entry, relative, out);
      continue;
    }
    if (!isFile(entry)) continue;
    if (!shouldIncludeDocumentRelativePath(relative)) continue;
    try {
      out[backupZipEntryForDocumentPath(relative)] = await entry.bytes();
    } catch {
      // Skip unreadable media; DB still restores quotes/products.
    }
  }
}

async function collectRootLogoFiles(out: ZipEntries): Promise<void> {
  const root = new Directory(Paths.document);
  if (!root.exists) return;
  for (const entry of root.list()) {
    if (!isFile(entry)) continue;
    if (!shouldIncludeDocumentRelativePath(entry.name)) continue;
    try {
      out[backupZipEntryForDocumentPath(entry.name)] = await entry.bytes();
    } catch {
      // Skip unreadable logo.
    }
  }
}

function databaseFile(): File {
  const directory = SQLite.defaultDatabaseDirectory;
  if (!directory) {
    throw new Error('SQLite database directory is unavailable on this platform.');
  }
  return new File(directory, DATABASE_NAME);
}

function companionDbFiles(): File[] {
  const directory = SQLite.defaultDatabaseDirectory;
  if (!directory) return [];
  return [
    new File(directory, `${DATABASE_NAME}-wal`),
    new File(directory, `${DATABASE_NAME}-shm`),
  ];
}

async function checkpointAndReadDatabase(): Promise<Uint8Array> {
  const db = await getDatabase();
  await db.execAsync('PRAGMA wal_checkpoint(FULL);');
  const file = databaseFile();
  if (!file.exists) {
    throw new Error('Database file was not found after checkpoint.');
  }
  return file.bytes();
}

function clearRestorableMedia(): void {
  const products = new Directory(Paths.document, 'products');
  const quotes = new Directory(Paths.document, 'quotes');
  if (products.exists) {
    products.delete();
  }
  if (quotes.exists) {
    quotes.delete();
  }
  const root = new Directory(Paths.document);
  if (!root.exists) return;
  for (const entry of root.list()) {
    if (!isFile(entry)) continue;
    if (!shouldIncludeDocumentRelativePath(entry.name)) continue;
    try {
      entry.delete();
    } catch {
      // Ignore.
    }
  }
}

function ensureDocumentParent(relativePath: string): void {
  const parts = relativePath.split('/').filter(Boolean);
  parts.pop();
  if (parts.length === 0) return;
  const dir = new Directory(Paths.document, ...parts);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
}

function writeDocumentBytes(relativePath: string, bytes: Uint8Array): void {
  ensureDocumentParent(relativePath);
  const parts = relativePath.split('/').filter(Boolean);
  const dest = new File(Paths.document, ...parts);
  if (dest.exists) {
    dest.delete();
  }
  dest.create({ intermediates: true });
  dest.write(bytes);
}

function replaceDatabaseBytes(bytes: Uint8Array): void {
  const file = databaseFile();
  for (const companion of companionDbFiles()) {
    try {
      if (companion.exists) companion.delete();
    } catch {
      // Ignore.
    }
  }
  if (file.exists) {
    file.delete();
  }
  file.create({ intermediates: true });
  file.write(bytes);
}

/**
 * Build a backup zip of the SQLite DB plus document media (logo, literature, signatures, photos).
 */
export async function createBackupZipFile(): Promise<{ uri: string; fileName: string }> {
  addBreadcrumb('backup.export.start');
  const entries: ZipEntries = {};

  const dbBytes = await checkpointAndReadDatabase();
  entries[BACKUP_DB_ENTRY] = dbBytes;

  await collectRootLogoFiles(entries);
  await collectDocumentEntries(new Directory(Paths.document, 'products'), 'products', entries);
  await collectDocumentEntries(new Directory(Paths.document, 'quotes'), 'quotes', entries);

  const fileCount = Object.keys(entries).filter((key) =>
    key.startsWith('files/')
  ).length;
  const manifest = buildBackupManifest({
    databaseName: DATABASE_NAME,
    fileCount,
  });
  entries[BACKUP_MANIFEST_PATH] = strToU8(JSON.stringify(manifest, null, 2));

  const zipped = zipSync(entries, { level: 0 });
  const fileName = backupFileName();
  const out = new File(Paths.cache, fileName);
  if (out.exists) {
    out.delete();
  }
  out.create();
  out.write(zipped);

  addBreadcrumb('backup.export.ready', { fileCount });
  return { uri: out.uri, fileName };
}

/** Share the backup zip via the system share sheet (Files / iCloud Drive). */
export async function exportBackup(): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error(
      Platform.OS === 'web'
        ? 'Backup sharing is not available in this browser. Use a device build to save to Files or iCloud.'
        : 'Sharing is not available on this device.'
    );
  }

  const { uri, fileName } = await createBackupZipFile();
  await Sharing.shareAsync(uri, {
    mimeType: 'application/zip',
    UTI: 'public.zip-archive',
    dialogTitle: 'Save Quote App backup',
  });
  addBreadcrumb('backup.export.shared', { fileName });
}

function parseBackupZip(bytes: Uint8Array): {
  dbBytes: Uint8Array;
  files: Array<{ relativePath: string; bytes: Uint8Array }>;
} {
  const unzipped = unzipSync(bytes);
  const manifestRaw = unzipped[BACKUP_MANIFEST_PATH];
  if (!manifestRaw) {
    throw new Error('This file is not a Quote App backup (missing manifest).');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(manifestRaw));
  } catch {
    throw new Error('Backup manifest is not valid JSON.');
  }
  if (!isValidBackupManifest(parsed)) {
    throw new Error('Backup manifest version or kind is unsupported.');
  }

  const dbBytes = unzipped[BACKUP_DB_ENTRY];
  if (!dbBytes || dbBytes.length === 0) {
    throw new Error('Backup is missing the database file.');
  }

  const files: Array<{ relativePath: string; bytes: Uint8Array }> = [];
  for (const [entry, data] of Object.entries(unzipped)) {
    const relative = documentPathFromBackupZipEntry(entry);
    if (!relative) continue;
    files.push({ relativePath: relative, bytes: data });
  }

  return { dbBytes, files };
}

/**
 * Replace the local DB + media from a backup zip URI, then reopen SQLite.
 * Does not re-seed catalog when the imported DB already has the seed flag.
 */
export async function restoreBackupFromUri(uri: string): Promise<{ fileCount: number }> {
  addBreadcrumb('backup.import.start');
  const source = new File(uri);
  if (!source.exists) {
    throw new Error('Could not read the selected backup file.');
  }
  const bytes = await source.bytes();
  const { dbBytes, files } = parseBackupZip(bytes);

  await closeDatabase();
  replaceDatabaseBytes(dbBytes);
  clearRestorableMedia();
  for (const file of files) {
    writeDocumentBytes(file.relativePath, file.bytes);
  }

  await initializeDatabase();
  await seedDefaultCatalog();
  addBreadcrumb('backup.import.done', { fileCount: files.length });
  return { fileCount: files.length };
}

/** Pick a backup zip from Files / iCloud and restore it. */
export async function importBackup(): Promise<{ fileCount: number } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'public.zip-archive', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  try {
    return await restoreBackupFromUri(result.assets[0].uri);
  } catch (err) {
    captureException(err, { stage: 'backup-import' });
    throw err;
  }
}
