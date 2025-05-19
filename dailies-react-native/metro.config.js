const { getDefaultConfig } = require("expo/metro-config"); // Use `require("metro-config").getDefaultConfig()` if not using Expo
const path = require("path");

// import { getDefaultConfig} from "expo/metro-config";
// import * as path from "path";

const projectRoot = __dirname;
const convexRoot = path.resolve(projectRoot, "../convex"); // Adjust path as needed

const config = getDefaultConfig(projectRoot);

config.watchFolders = [convexRoot]; // Add the external directory to Metro's watch list

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    "@convex": convexRoot, // Allows imports like `import x from "@convex"`
  },
  // Make sure Metro looks in your app's node_modules first
  nodeModulesPaths: [path.resolve(projectRoot, "node_modules")],
};

module.exports = config;