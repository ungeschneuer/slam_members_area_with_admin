// Auto-generated version file
// Generated at: 2025-10-23T16:23:48.969Z

export const VERSION_INFO = {
  "appVersion": "1.0.0",
  "buildTime": "2025-10-23T16:23:48.969Z",
  "gitHash": "0337fa27aecce8c0875e62fff8df7bbcd3dbcab0",
  "cacheVersion": "1.0.0-1761236628969-0337fa27"
};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return `${appVersion}-${timestamp}-${shortHash}`;
};
