/** Read-only health gate for an unchanged native Studio after its first deploy.
 * The caller supplies an already authenticated owner's short-lived session.
 * This module never creates a session, changes Studio or marks a site ready.
 */
const SESSION = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;
const HOST = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function origin(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && HOST.test(url.hostname) &&
        url.origin === value && !url.username && !url.password) return url.origin;
  } catch { /* Reject malformed hosts without exposing input. */ }
  throw Error('native_studio_health_input_invalid');
}

/** Public, unauthenticated entry check. This proves the site gateway reaches
 * native Stacki login; it does not start or certify the protected Container.
 */
export async function verifyPublicStudioEntry(input, transport = fetch) {
  const studio = origin(input?.studioOrigin);
  if (typeof transport !== 'function') throw Error('native_studio_health_input_invalid');
  try {
    const response = await transport(`${studio}/studio/`, { method: 'GET',
      redirect: 'manual', headers: { accept: 'text/html' },
      signal: AbortSignal.timeout(30_000) });
    if (response.status !== 200 ||
        !response.headers.get('content-type')?.toLowerCase().includes('text/html') ||
        response.headers.get('cache-control')?.toLowerCase() !== 'no-store')
      throw Error('native_studio_public_entry_unready');
    const html = await response.text();
    if (html.length > 64_000 || !html.includes('aria-label="Stacki"') ||
        !html.includes('href="/studio/auth/login"') ||
        !html.includes('id="login-message"'))
      throw Error('native_studio_public_entry_unready');
    return { state: 'public-studio-entry-healthy', studioOrigin: studio };
  } catch (error) {
    if (error instanceof Error && error.message === 'native_studio_public_entry_unready')
      throw error;
    throw Error('native_studio_public_entry_unavailable');
  }
}

/** Observe an unauthenticated Cloudflare Access challenge for the protected
 * editor route. This is only network evidence; the exact Access application,
 * audience and policy must be verified through the control plane separately.
 */
export async function verifyAccessProtectedStudioEntry(input, transport = fetch) {
  const studio = origin(input?.studioOrigin);
  const team = String(input?.authDomain ?? '').toLowerCase();
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) ||
      typeof transport !== 'function')
    throw Error('native_studio_health_input_invalid');
  try {
    const response = await transport(`${studio}/studio/`, { method: 'GET',
      redirect: 'manual', headers: { accept: 'text/html' },
      signal: AbortSignal.timeout(30_000) });
    if (response.status !== 302) throw Error('native_studio_access_entry_unready');
    let location;
    try { location = new URL(response.headers.get('location') ?? '', studio); }
    catch { throw Error('native_studio_access_entry_unready'); }
    if (location.protocol !== 'https:' || location.username || location.password ||
        ![team, new URL(studio).hostname].includes(location.hostname) ||
        !(location.pathname === '/cdn-cgi/access/login' ||
          location.pathname.startsWith('/cdn-cgi/access/login/')))
      throw Error('native_studio_access_entry_unready');
    await response.body?.cancel();
    return { state: 'access-studio-challenge-observed', studioOrigin: studio };
  } catch (error) {
    if (error instanceof Error && error.message === 'native_studio_access_entry_unready')
      throw error;
    throw Error('native_studio_access_entry_unavailable');
  }
}

async function readJson(transport, url, cookie) {
  const response = await transport(url, { method: 'GET', redirect: 'manual',
    headers: { cookie, accept: 'application/json' }, signal: AbortSignal.timeout(30_000) });
  if (response.status !== 200) throw Error('native_studio_health_unavailable');
  try { return await response.json(); }
  catch { throw Error('native_studio_health_invalid_response'); }
}

export async function verifyAuthenticatedStudioHealth(input, transport = fetch) {
  const { studioOrigin, previewOrigin, sessionToken, githubId, githubLogin } = input ?? {};
  const studio = origin(studioOrigin), preview = origin(previewOrigin);
  if (studio === preview || typeof sessionToken !== 'string' ||
      sessionToken.length > 4096 || !SESSION.test(sessionToken) ||
      !Number.isSafeInteger(githubId) || githubId < 1 ||
      typeof githubLogin !== 'string' || !/^[A-Za-z0-9-]{1,39}$/.test(githubLogin) ||
      typeof transport !== 'function') throw Error('native_studio_health_input_invalid');
  const cookie = `__Host-studio=${sessionToken}`;
  try {
    const identity = await readJson(transport, `${studio}/studio/api/session`, cookie);
    if (!record(identity) || identity.kind !== 'github' ||
        identity.id !== githubId || identity.login !== githubLogin)
      throw Error('native_studio_health_identity_mismatch');
    const status = await readJson(transport, `${studio}/studio/api/status`, cookie);
    if (!record(status) || status.github !== true || status.ai !== true ||
        !record(status.synchronization) ||
        typeof status.synchronization.kind !== 'string' ||
        status.synchronization.kind === 'failed')
      throw Error('native_studio_health_container_unready');
    const editor = await transport(`${studio}/studio/`, { method: 'GET',
      redirect: 'manual', headers: { cookie, accept: 'text/html' },
      signal: AbortSignal.timeout(30_000) });
    if (editor.status !== 200 ||
        !editor.headers.get('content-type')?.toLowerCase().includes('text/html'))
      throw Error('native_studio_health_editor_unready');
    const editorHtml = await editor.text();
    if (editorHtml.length > 64_000 ||
        !editorHtml.includes('/studio/studio.js') ||
        !editorHtml.includes('id="root"'))
      throw Error('native_studio_health_editor_unready');
    const route = await readJson(transport,
      `${studio}/studio/api/preview-url?page=%2F`, cookie);
    if (!record(route) || route.origin !== preview || typeof route.url !== 'string')
      throw Error('native_studio_health_preview_unready');
    const entry = new URL(route.url);
    if (entry.origin !== preview || entry.pathname !== '/__studio-entry' ||
        !SESSION.test(entry.searchParams.get('token') ?? '') ||
        entry.searchParams.get('page') !== '/')
      throw Error('native_studio_health_preview_unready');
    const handoff = await transport(entry.href, { method: 'GET', redirect: 'manual',
      signal: AbortSignal.timeout(30_000) });
    const previewCookie = handoff.headers.get('set-cookie') ?? '';
    const previewSession = /^__Host-studio-preview=([^;]+);/.exec(previewCookie)?.[1];
    if (handoff.status !== 302 || handoff.headers.get('location') !== '/#avb-design' ||
        !previewSession || !SESSION.test(previewSession) ||
        !/;\s*Secure(?:;|$)/i.test(previewCookie) ||
        !/;\s*HttpOnly(?:;|$)/i.test(previewCookie))
      throw Error('native_studio_health_preview_unready');
    await handoff.body?.cancel();
    const page = await transport(`${preview}/`, { method: 'GET', redirect: 'manual',
      headers: { cookie: `__Host-studio-preview=${previewSession}`, accept: 'text/html' },
      signal: AbortSignal.timeout(30_000) });
    if (page.status !== 200 ||
        !page.headers.get('content-type')?.toLowerCase().includes('text/html'))
      throw Error('native_studio_health_preview_unready');
    await page.body?.cancel();
    return { state: 'authenticated-studio-healthy', githubId, previewOrigin: preview };
  } catch (error) {
    if (error instanceof Error && /^native_studio_health_[a-z_]+$/.test(error.message))
      throw error;
    throw Error('native_studio_health_unavailable');
  }
}
