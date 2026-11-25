const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const SIGNING_ENV_PATH = path.resolve(__dirname, '.signing.env');
const KEYSTORE_PATH = path.resolve(__dirname, 'key.jks');

const SIGNING_KEYS = [
  'MYAPP_RELEASE_STORE_FILE',
  'MYAPP_RELEASE_STORE_PASSWORD',
  'MYAPP_RELEASE_KEY_ALIAS',
  'MYAPP_RELEASE_KEY_PASSWORD',
];

function loadSigningEnv() {
  if (!fs.existsSync(SIGNING_ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(SIGNING_ENV_PATH, 'utf8')
      .split('\n')
      .filter((line) => /\S/.test(line) && !line.trimStart().startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      }),
  );
}

function withAndroidReleaseSigning(config) {
  const env = loadSigningEnv();
  // gradle.properties is Latin-1; use an ASCII path relative to android/app/ to avoid corrupting non-ASCII parent folders
  const storePath = '../../key.jks';

  config = withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter((item) => !SIGNING_KEYS.includes(item.key));
    c.modResults.push(
      { type: 'property', key: 'MYAPP_RELEASE_STORE_FILE', value: storePath },
      {
        type: 'property',
        key: 'MYAPP_RELEASE_STORE_PASSWORD',
        value: env.RELEASE_STORE_PASSWORD || '',
      },
      {
        type: 'property',
        key: 'MYAPP_RELEASE_KEY_ALIAS',
        value: env.RELEASE_KEY_ALIAS || '',
      },
      {
        type: 'property',
        key: 'MYAPP_RELEASE_KEY_PASSWORD',
        value: env.RELEASE_KEY_PASSWORD || '',
      },
    );
    return c;
  });

  config = withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    if (gradle.includes('signingConfigs.release')) return c;

    gradle = gradle.replace(
      /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\})/,
      `$1\n        release {\n            storeFile file(MYAPP_RELEASE_STORE_FILE)\n            storePassword MYAPP_RELEASE_STORE_PASSWORD\n            keyAlias MYAPP_RELEASE_KEY_ALIAS\n            keyPassword MYAPP_RELEASE_KEY_PASSWORD\n        }`,
    );

    const target = 'signingConfig signingConfigs.debug';
    const lastIdx = gradle.lastIndexOf(target);
    if (lastIdx !== -1) {
      gradle =
        gradle.slice(0, lastIdx) +
        'signingConfig signingConfigs.release' +
        gradle.slice(lastIdx + target.length);
    }

    c.modResults.contents = gradle;
    return c;
  });

  return config;
}

function withGradleHeap(config) {
  return withGradleProperties(config, (c) => {
    const idx = c.modResults.findIndex(
      (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs',
    );
    const entry = {
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
    };
    if (idx !== -1) {
      c.modResults[idx] = entry;
    } else {
      c.modResults.push(entry);
    }
    return c;
  });
}

module.exports = ({ config }) => {
  config = withGradleHeap(config);
  if (fs.existsSync(SIGNING_ENV_PATH) && fs.existsSync(KEYSTORE_PATH)) {
    config = withAndroidReleaseSigning(config);
  }
  return config;
};
