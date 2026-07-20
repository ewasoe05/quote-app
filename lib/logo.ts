import { File, Paths } from 'expo-file-system';

/**
 * Copy a picked image into the app documents directory so the URI
 * survives cache cleanup and app restarts.
 */
export async function persistBusinessLogo(sourceUri: string): Promise<string> {
  const cleanPath = sourceUri.split('?')[0] ?? sourceUri;
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(cleanPath);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const dest = new File(Paths.document, `business-logo.${ext}`);

  if (dest.exists) {
    dest.delete();
  }

  const source = new File(sourceUri);
  await source.copy(dest);
  return dest.uri;
}

export async function clearPersistedBusinessLogo(
  logoUri: string | null | undefined
): Promise<void> {
  if (!logoUri) return;
  try {
    const file = new File(logoUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore missing/unreadable logo files.
  }
}
