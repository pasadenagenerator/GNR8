#!/usr/bin/env node

const version = process.version;
const major = Number(version.replace(/^v/, '').split('.')[0]);
const isSupported = Number.isInteger(major) && major >= 22 && major < 23;

if (!isSupported) {
  console.error('ERROR:');
  console.error('GNR8 requires Node 22.x');
  console.error('');
  console.error('Current:');
  console.error(version);
  console.error('');
  console.error('Run:');
  console.error('brew install node@22');
  console.error('export PATH="/opt/homebrew/opt/node@22/bin:$PATH"');
  process.exit(1);
}
