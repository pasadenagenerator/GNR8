/** Pure, read-only check of one Cloudflare Access application policy list.
 * The caller must obtain the complete list for the exact bound application
 * and freshly resolve each principal from current GNR8 membership.
 *
 * Cloudflare API: GET /accounts/{account_id}/access/apps/{app_id}/policies
 * https://developers.cloudflare.com/api/resources/zero_trust/subresources/access/subresources/applications/subresources/policies/methods/list/
 */
const EMAIL = /^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (): never => { throw Error('native_studio_access_policy_unverified'); };

function expectedEmails(principals: readonly string[]): string[] {
  if (!Array.isArray(principals) || principals.length < 1 || principals.length > 200) fail();
  const emails = principals.map(principal => {
    if (typeof principal !== 'string' || !principal.startsWith('access:')) fail();
    const email = principal.slice('access:'.length);
    if (email.length > 193 || !EMAIL.test(email)) fail();
    return email;
  });
  if (new Set(emails).size !== emails.length) fail();
  return emails.sort();
}

/** Require the sole effective policy to allow exactly the current owners and
 * admins by individual verified email. Unknown selectors and incomplete
 * pagination are rejected; this is not a claim that a user has signed in.
 */
export function inspectNativeStudioAccessPolicyReadback(
  body: unknown, principals: readonly string[],
) {
  const expected = expectedEmails(principals);
  if (!object(body)) fail();
  const parsed = body as Record<string, unknown>;
  const result = parsed.result;
  const info = parsed.result_info;
  if (parsed.success !== true || !Array.isArray(result) ||
      result.length !== 1 || !object(info) ||
      info.page !== 1 || info.count !== 1 || info.total_count !== 1 ||
      (info.total_pages !== undefined && info.total_pages !== 1)) fail();
  const policy = (result as unknown[])[0];
  if (!object(policy) || policy.decision !== 'allow' ||
      !Array.isArray(policy.include) || policy.include.length !== expected.length ||
      (policy.require !== undefined &&
        (!Array.isArray(policy.require) || policy.require.length !== 0)) ||
      (policy.exclude !== undefined &&
        (!Array.isArray(policy.exclude) || policy.exclude.length !== 0)) ||
      (policy.approval_required !== undefined && policy.approval_required !== false) ||
      (policy.approval_groups !== undefined &&
        (!Array.isArray(policy.approval_groups) || policy.approval_groups.length !== 0)) ||
      (policy.purpose_justification_required !== undefined &&
        policy.purpose_justification_required !== false)) fail();
  const actual = ((policy as Record<string, unknown>).include as unknown[]).map((rule: unknown) => {
    if (!object(rule) || Object.keys(rule).join() !== 'email') fail();
    const emailRule = (rule as Record<string, unknown>).email;
    if (!object(emailRule) || Object.keys(emailRule).join() !== 'email' ||
        typeof emailRule.email !== 'string' || !EMAIL.test(emailRule.email)) fail();
    return (emailRule as Record<string, string>).email;
  }).sort();
  if (new Set(actual).size !== actual.length ||
      JSON.stringify(actual) !== JSON.stringify(expected)) fail();
  return { state: 'observed-exact-access-policy' as const,
    memberCount: actual.length };
}
