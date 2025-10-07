#!/usr/bin/env node

// Script to inject version information during build
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get git hash
let gitHash = 'dev';
try {
  gitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Could not get git hash, using fallback');
}

// Get package.json version
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const appVersion = packageJson.version || '1.0.0';

// Get build timestamp
const buildTime = new Date().toISOString();

// Create version info
const versionInfo = {
  appVersion,
  buildTime,
  gitHash,
  cacheVersion: `${appVersion}-${Date.now()}-${gitHash.substring(0, 8)}`
};

// Write version file
const versionPath = path.join(__dirname, '../client/config/version.js');
const versionContent = `// Auto-generated version file
// Generated at: ${new Date().toISOString()}

export const VERSION_INFO = ${JSON.stringify(versionInfo, null, 2)};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return \`\${appVersion}-\${timestamp}-\${shortHash}\`;
};
`;

fs.writeFileSync(versionPath, versionContent);

console.log('✅ Version information injected:');
console.log(`   App Version: ${appVersion}`);
console.log(`   Build Time: ${buildTime}`);
console.log(`   Git Hash: ${gitHash.substring(0, 8)}`);
console.log(`   Cache Version: ${versionInfo.cacheVersion}`);
