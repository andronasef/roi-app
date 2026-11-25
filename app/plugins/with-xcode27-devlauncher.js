const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Resolve expo-dev-launcher's DevLauncherToolbar.swift under bun's isolated
 * node_modules layout and bump the `compiler(>=6.4)` guard so Xcode 27.0
 * (Swift 6.4 / iOS 27.0 SDK, lacking `axisBehavior(.verticalPreferred)`) builds.
 */
function patchDevLauncherToolbar(appRoot) {
  let devLauncherDir;
  try {
    devLauncherDir = path.dirname(
      require.resolve('expo-dev-launcher/package.json', { paths: [appRoot] })
    );
  } catch {
    const devClientDir = path.dirname(
      require.resolve('expo-dev-client/package.json', { paths: [appRoot] })
    );
    devLauncherDir = path.dirname(
      require.resolve('expo-dev-launcher/package.json', {
        paths: [devClientDir, appRoot],
      })
    );
  }

  const toolbarPath = path.join(
    devLauncherDir,
    'ios',
    'SwiftUI',
    'Navigation',
    'DevLauncherToolbar.swift'
  );
  if (!fs.existsSync(toolbarPath)) {
    return false;
  }

  const current = fs.readFileSync(toolbarPath, 'utf8');
  const target = '#if os(iOS) && compiler(>=6.4)';
  const replacement = '#if os(iOS) && compiler(>=6.5)';
  if (!current.includes(target)) {
    return false;
  }

  fs.writeFileSync(toolbarPath, current.replace(target, replacement), 'utf8');
  return true;
}

const withXcode27DevLauncher = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      patchDevLauncherToolbar(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);
};

module.exports = withXcode27DevLauncher;
module.exports.patchDevLauncherToolbar = patchDevLauncherToolbar;
