// Auto-generated version file
// Generated at: 2025-10-27T11:09:08.071Z

export const VERSION_INFO = {
  "appVersion": "1.0.0",
  "buildTime": "2025-10-27T11:09:08.070Z",
  "gitHash": "756b2a9b288bba7ebbf5ddbacd523335a8a54ec0",
  "cacheVersion": "1.0.0-1761563348071-756b2a9b"
};

// Generate cache version string
export const getCacheVersion = () => {
  const { appVersion, buildTime, gitHash } = VERSION_INFO;
  const shortHash = gitHash.substring(0, 8);
  const timestamp = new Date(buildTime).getTime();
  return `${appVersion}-${timestamp}-${shortHash}`;
};
