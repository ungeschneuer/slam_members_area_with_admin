// Auto-generated version file
// Generated at: 2025-10-29T11:15:25.852Z

export const VERSION_INFO = {
  "appVersion": "1.0.0",
  "buildTime": "2025-10-29T11:15:25.851Z",
  "gitHash": "36ae63bef2112024e9692a12bebdd6f6df4b9711",
  "cacheVersion": "1.0.0-1761736525852-36ae63be"
};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return `${appVersion}-${timestamp}-${shortHash}`;
};
