import { createHash } from 'node:crypto';

/** Verify a legacy SQL file before it enters generation or preview. New Git
 * references will use the same byte/size/hash invariant after hydration. */
export function verifiedRawFileRow(row: {
  media_type: string; file_size_bytes: number; sha256: string;
  content_bytes: Buffer | Uint8Array | null;
}) {
  if (!row.content_bytes || !Number.isSafeInteger(row.file_size_bytes) ||
      row.file_size_bytes < 0 ||
      !/^[a-f0-9]{64}$/.test(row.sha256) || !row.media_type) {
    throw new Error('RAW_IMPORT_ASSET_INTEGRITY_FAILED');
  }
  const bytes = Buffer.from(row.content_bytes);
  if (bytes.length !== row.file_size_bytes ||
      createHash('sha256').update(bytes).digest('hex') !== row.sha256) {
    throw new Error('RAW_IMPORT_ASSET_INTEGRITY_FAILED');
  }
  return { mediaType: row.media_type, sizeBytes: row.file_size_bytes,
    sha256: row.sha256, bytes };
}
