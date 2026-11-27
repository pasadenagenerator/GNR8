import 'server-only';
import { MAX_RETAINED_ASSET_BYTES } from '@/gnr8/site/retained-asset-limits';

const tablePath = '/rest/v1/gnr8_runtime_raw_template_artifact_files';
const projection = 'file_path,media_type,file_size_bytes,sha256,content_bytes';
const maxBytes = MAX_RETAINED_ASSET_BYTES;

/** Experimental only: the bounded hosted verification failed on 2026-10-26.
 * Not wired into publication composition; retained for local reproduction.
 * Transport for the verified reader's single-file batches. Keep its scoped
 * filters and integrity checks, but avoid PostgreSQL's large bytea JSON/hex
 * response. Supabase's JSON-only query decoder receives the same row shape.
 * There are no retries and no fallback to an unverified local copy. */
export function createRetainedAssetReadFetch(fetcher: typeof fetch = globalThis.fetch): typeof fetch {
  return async (input, init) => {
    if (typeof input !== 'string' && !(input instanceof URL)) return fetcher(input, init);
    const url = new URL(input);
    if ((init?.method ?? 'GET') !== 'GET' || url.pathname !== tablePath ||
        url.searchParams.get('select') !== projection || url.searchParams.get('limit') !== '2' ||
        !/^eq\.[a-f0-9-]{36}$/i.test(url.searchParams.get('artifact_id') ?? '') ||
        !url.searchParams.get('file_path')?.startsWith('in.(') ||
        [...url.searchParams.keys()].some(key => !['select', 'limit', 'artifact_id', 'file_path'].includes(key))) {
      return fetcher(input, init);
    }
    const metadataUrl = new URL(url);
    metadataUrl.searchParams.set('select', projection.replace(',content_bytes', ''));
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    const metadata = await fetcher(metadataUrl.toString(), { ...init, headers });
    if (!metadata.ok) return metadata;
    const rows = await metadata.json();
    if (!Array.isArray(rows) || rows.length !== 1) return Response.json(rows);
    const row = rows[0];
    if (!Number.isSafeInteger(row?.file_size_bytes) || row.file_size_bytes < 0 || row.file_size_bytes > maxBytes) {
      return Response.json({ message: 'Retained binary size invalid' }, { status: 502 });
    }
    const binaryUrl = new URL(url);
    binaryUrl.searchParams.set('select', 'content_bytes');
    headers.set('Accept', 'application/octet-stream');
    const binary = await fetcher(binaryUrl.toString(), { ...init, headers });
    if (!binary.ok) return binary;
    if (binary.headers.get('content-type')?.split(';')[0].trim() !== 'application/octet-stream') {
      await binary.body?.cancel();
      return Response.json({ message: 'Retained binary response invalid' }, { status: 502 });
    }
    const reader = binary.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          size += next.value.byteLength;
          if (size > row.file_size_bytes) {
            await reader.cancel();
            return Response.json({ message: 'Retained binary size invalid' }, { status: 502 });
          }
          chunks.push(next.value);
        }
      } finally { reader.releaseLock(); }
    }
    if (size !== row.file_size_bytes) return Response.json({ message: 'Retained binary size invalid' }, { status: 502 });
    return Response.json([{ ...row, content_bytes: '\\x' + Buffer.concat(chunks).toString('hex') }]);
  };
}
