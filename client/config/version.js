// Auto-generated version file
// Generated at: 2025-10-07T23:09:24.290Z

export const VERSION_INFO = {
  "appVersion": "1.0.0",
  "buildTime": "2025-10-07T23:09:24.290Z",
  "gitHash": "6665931b8b22f00e8aec8bca141af7f65bb7e029",
  "cacheVersion": "1.0.0-1759878564290-6665931b"
};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return `${appVersion}-${timestamp}-${shortHash}`;
};
