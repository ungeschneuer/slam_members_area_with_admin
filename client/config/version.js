// Auto-generated version file
// Generated at: 2026-02-01T23:32:16.470Z

export const VERSION_INFO = {
  "appVersion": "1.0.0",
  "buildTime": "2026-02-01T23:32:16.470Z",
  "gitHash": "4483e6173d12c785ac11def105226022e73a9041",
  "cacheVersion": "1.0.0-1769988736470-4483e617"
};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return `${appVersion}-${timestamp}-${shortHash}`;
};
