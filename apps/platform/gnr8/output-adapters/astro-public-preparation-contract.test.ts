import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_HOST_TRANSITION_VERSION, PUBLIC_REPLACEMENT_VERSION, readPublicPreparation } from './astro-public-preparation-contract';

test('host transition binds a new host to the exact current pointer and source artifact', () => {
  const preparation = {
    version: PUBLIC_HOST_TRANSITION_VERSION,
    host: 'ladja-zaba.app.pasadenagenerator.com',
    expectedActivePointer: {siteVersionId:'current',artifactId:'current-artifact'},
    sourceSiteVersionId:'source',sourceArtifactId:'source-artifact',sourceArtifactSha256:'a'.repeat(64),
    sourceCandidateId:'candidate',sourceCandidateContentSha256:'b'.repeat(64),sourceTechnicalEvidenceSha256:'c'.repeat(64),
  };
  assert.deepEqual(readPublicPreparation({publicPreparation:preparation}),preparation);
  assert.equal(readPublicPreparation({publicPreparation:{...preparation,expectedActivePointer:null}}),null);
  assert.equal(readPublicPreparation({publicPreparation:{...preparation,contactRecipientChange:{from:'a@b.com',to:'c@d.com'}}}),null);
});

test('same-host replacement requires an exact active pointer and no recipient change', () => {
  const preparation = {
    version: PUBLIC_REPLACEMENT_VERSION,
    host: 'ladja-zaba.app.pasadenagenerator.com',
    expectedActivePointer: {siteVersionId:'current',artifactId:'current-artifact'},
    sourceSiteVersionId:'new-source',sourceArtifactId:'new-artifact',sourceArtifactSha256:'a'.repeat(64),
    sourceCandidateId:'new-candidate',sourceCandidateContentSha256:'b'.repeat(64),sourceTechnicalEvidenceSha256:'c'.repeat(64),
  };
  assert.deepEqual(readPublicPreparation({publicPreparation:preparation}),preparation);
  assert.equal(readPublicPreparation({publicPreparation:{...preparation,expectedActivePointer:null}}),null);
  assert.equal(readPublicPreparation({publicPreparation:{...preparation,contactRecipientChange:{from:'a@b.com',to:'c@d.com'}}}),null);
});
