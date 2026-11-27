import { createHash, createHmac } from 'node:crypto';

/** One identity shared by the post-build intent and the final deploy gate. */
export function firstStudioDeployIdentity({ scope, accountId, workerId,
  sourceId, site, token, secrets, commit }) {
  const secretIdentity = createHmac('sha256', token)
    .update(JSON.stringify(secrets)).digest('hex');
  const identity = createHash('sha256').update(JSON.stringify({ scope,
    accountId, workerId, sourceId, site, secretIdentity, commit })).digest('hex');
  return { identity, tag: `gnr8-first-${identity}` };
}
