// Auto-generated version file
// Generated at: 2026-01-23T19:09:01.643Z

export const VERSION_INFO = {
  "appVersion": "1.0.0",
  "buildTime": "2026-01-23T19:09:01.642Z",
  "gitHash": "3e0e28312bdc5dcbe5986b9f7a04b8bb8b7bbe69",
  "cacheVersion": "1.0.0-1769195341643-3e0e2831"
};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return `${appVersion}-${timestamp}-${shortHash}`;
};
