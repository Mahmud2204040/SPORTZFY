const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro will recursively watch/consider subfolders of the Expo project.
// Since we copied the Next.js+Prisma backend into `SPORTZFY/backend`,
// exclude it to avoid bundling/watcher failures.
const existingBlockList = config?.resolver?.blockList;
const existing = Array.isArray(existingBlockList) ? existingBlockList : [];

config.resolver.blockList = [
  ...existing,
  /backend[\\/]node_modules[\\/].*/,
  /backend[\\/]node_modules$/,
  /backend[\\/]/,
];

module.exports = config;
