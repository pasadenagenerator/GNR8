/** The first segment is the capture's opaque runtime site ID (often site_...),
 * NOT the ownership-site UUID. Authority comes from the scoped, verified Git
 * manifest and exact path/name mapping, never from inferring identity here. */
export function validStackiDeliveryPath(path: string): boolean {
  return typeof path === 'string' && path.length <= 2048 &&
    /^\/api\/gnr8\/runtime\/preview-assets\/[A-Za-z0-9_-]{1,128}\/[a-f0-9-]{36}\/.+/.test(path) &&
    !/[?#\r\n\\]/.test(path) && new URL(path, 'https://local.invalid').pathname === path;
}
