const { getDefaultConfig } = require("expo/metro-config"); // Use `require("metro-config").getDefaultConfig()` if not using Expo
const path = require("path");

// import { getDefaultConfig} from "expo/metro-config";
// import * as path from "path";

const projectRoot = __dirname;
const convexRoot = path.resolve(projectRoot, "../convex"); // Adjust path as needed
const taskyConvexRoot = path.resolve(projectRoot, "../../tasky/convex");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [convexRoot, taskyConvexRoot]; // Add external Convex directories to Metro's watch list

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    "@convex": convexRoot, // Allows imports like `import x from "@convex"`
    "tasky-convex": taskyConvexRoot,
  },
  // Make sure Metro looks in your app's node_modules first
  nodeModulesPaths: [path.resolve(projectRoot, "node_modules")],
};

module.exports = config;