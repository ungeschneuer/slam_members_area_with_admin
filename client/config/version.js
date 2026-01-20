// Auto-generated version file
// Generated at: 2026-01-20T11:18:19.119Z

export const VERSION_INFO = {
  "appVersion": "1.0.0",
  "buildTime": "2026-01-20T11:18:19.118Z",
  "gitHash": "9c6119d90bf6b0508fed061150e16a0773a47513",
  "cacheVersion": "1.0.0-1768907899119-9c6119d9"
};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return `${appVersion}-${timestamp}-${shortHash}`;
};
