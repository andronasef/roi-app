// @react-native-firebase/app can't find its insertion point in the SDK 58
// AppDelegate (React Native now starts from SceneDelegate), so add the call here.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
      const file = path.join(dir, 'AppDelegate.swift');
      const src = fs.readFileSync(file, 'utf8');
      if (!src.includes('FirebaseApp.configure()')) {
        fs.writeFileSync(
          file,
          src.replace(
            /(\n\s*)(let delegate = ReactNativeDelegate\(\))/,
            '$1FirebaseApp.configure()$1$2',
          ),
        );
      }
      return cfg;
    },
  ]);
