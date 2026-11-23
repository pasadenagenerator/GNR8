/** Deploy-only config. The original, committed Stacki config is never edited. */
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = 'native-studio/prebuilt-image-v1.json';
const HEX = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export async function preparePrebuiltStudioDeployConfig(input) {
  const { studio, store, sourceId, commit, workerId, site } = input ?? {};
  if (typeof studio !== 'string' || !store || typeof store.read !== 'function' ||
      !site || !HEX.test(sourceId) || !HEX32.test(workerId) ||
      !/^[a-f0-9]{40,64}$/.test(commit) ||
      !HEX32.test(site.accountId) ||
      !UUID.test(site.siteId))
    throw Error('native_studio_prebuilt_image_input_invalid');
  const receipt = await store.read(KEY);
  const image = `registry.cloudflare.com/${site.accountId}/gnr8-${site.siteId}-studio@sha256:${receipt?.digest}`;
  if (!receipt || Object.keys(receipt).sort().join() !==
      'accountId,commit,digest,siteId,sourceId,workerId' ||
      receipt.accountId !== site.accountId || receipt.siteId !== site.siteId ||
      receipt.sourceId !== sourceId || receipt.commit !== commit ||
      receipt.workerId !== workerId || !HEX.test(receipt.digest))
    throw Error('native_studio_prebuilt_image_unverified');
  const originalPath = join(studio, 'cloudflare', 'wrangler.jsonc');
  let config;
  try { config = JSON.parse(await readFile(originalPath, 'utf8')); }
  catch { throw Error('native_studio_prebuilt_config_unverified'); }
  if (config.account_id !== site.accountId ||
      config.name !== `gnr8-${site.siteId}-studio` ||
      !Array.isArray(config.containers) || config.containers.length !== 1 ||
      config.containers[0]?.class_name !== 'PreviewContainer' ||
      config.containers[0]?.image !== '../Dockerfile')
    throw Error('native_studio_prebuilt_config_unverified');
  const deployConfig = { ...config,
    containers: [{ ...config.containers[0], image }] };
  const relative = `cloudflare/.gnr8-deploy-${randomUUID()}.jsonc`;
  const path = join(studio, relative);
  await writeFile(path, JSON.stringify(deployConfig) + '\n',
    { flag: 'wx', mode: 0o600 });
  return { relative, image, cleanup: () => rm(path, { force: true }) };
}
