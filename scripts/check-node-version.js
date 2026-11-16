#!/usr/bin/env node

const version = process.version;
const major = Number(version.replace(/^v/, '').split('.')[0]);
// Default projects stay on Node 22. Only the explicitly selected Astro Worker
// installation profile uses Node 26; this is not a repository-wide upgrade.
const profile = process.env.GNR8_NODE_PROFILE || 'default';
const expected = profile === 'default' ? 22 : profile === 'astro-worker' ? 26 : null;
const isSupported = expected !== null && major === expected;

if (!isSupported) {
  console.error('ERROR:');
  console.error(expected === null ? `Unknown GNR8_NODE_PROFILE: ${profile}` : `GNR8 ${profile} requires Node ${expected}.x`);
  console.error('');
  console.error('Current:');
  console.error(version);
  console.error('');
  console.error('Run:');
  console.error(`Select Node ${expected ?? 'for a valid profile'}${expected ? '.x' : ''}.`);
  console.error('Use GNR8_NODE_PROFILE=astro-worker only for the Astro Worker installation.');
  process.exit(1);
}
