import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../..');
const APP_ROOT = path.join(REPO_ROOT, 'app');
const SHARED_SRC = path.join(REPO_ROOT, 'shared', 'src');

const APP_SOURCE_DIRS = [
  'app',
  'components',
  'constants',
  'features',
  'hooks',
  'lib',
  'services',
] as const;

function walkSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function collectAppSourceFiles(): string[] {
  return APP_SOURCE_DIRS.flatMap((dir) =>
    walkSourceFiles(path.join(APP_ROOT, dir)),
  );
}

describe('static repository guards', () => {
  it('allows @react-native-firebase imports only in app/services/telemetry.ts', () => {
    const telemetryFile = path.join(APP_ROOT, 'services', 'telemetry.ts');
    const offenders: string[] = [];

    for (const file of collectAppSourceFiles()) {
      if (file === telemetryFile) {
        continue;
      }
      const content = fs.readFileSync(file, 'utf8');
      if (/@react-native-firebase\//.test(content)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('forbids physical-direction utility classes and tracking-* classes in app source', () => {
    const forbiddenClassPattern =
      /(?:^|[\s'"`])(ml-|mr-|pl-|pr-|left-|right-|text-left\b|text-right\b|border-l-|border-r-|tracking-)/;
    const offenders: string[] = [];

    for (const file of collectAppSourceFiles()) {
      const content = fs.readFileSync(file, 'utf8');
      if (forbiddenClassPattern.test(content)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('resolves tailwindcss major 3 from app/ and keeps admin/ isolated', () => {
    const appRequire = createRequire(path.join(APP_ROOT, 'package.json'));
    const appTwPkgPath = appRequire.resolve('tailwindcss/package.json');
    const appTwPkg = JSON.parse(fs.readFileSync(appTwPkgPath, 'utf8')) as {
      version: string;
    };
    const appMajor = Number(appTwPkg.version.split('.')[0]);
    expect(appMajor).toBe(3);

    const adminPkgPath = path.join(REPO_ROOT, 'admin', 'package.json');
    const adminPkg = JSON.parse(fs.readFileSync(adminPkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declaredAdminTw =
      adminPkg.dependencies?.tailwindcss ?? adminPkg.devDependencies?.tailwindcss;
    const adminRequire = createRequire(adminPkgPath);

    if (declaredAdminTw) {
      const expectedMajor = Number(
        declaredAdminTw.replace(/^[~^]/, '').split('.')[0],
      );
      const adminTwPkgPath = adminRequire.resolve('tailwindcss/package.json');
      const adminTwPkg = JSON.parse(fs.readFileSync(adminTwPkgPath, 'utf8')) as {
        version: string;
      };
      expect(Number(adminTwPkg.version.split('.')[0])).toBe(expectedMajor);
    } else {
      expect(() => adminRequire.resolve('tailwindcss/package.json')).toThrow();
    }
  });

  it('keeps shared/src free of node:, expo, and react-native imports', () => {
    const forbiddenImport =
      /(?:from\s+['"]|require\(\s*['"]|import\(\s*['"])(node:|expo(?:-|\b)|react-native(?:-|\/|\b))/;
    const offenders: string[] = [];

    for (const file of walkSourceFiles(SHARED_SRC)) {
      const content = fs.readFileSync(file, 'utf8');
      if (forbiddenImport.test(content)) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps (dev) routes gated behind DEV_TOOLS_ENABLED', () => {
    const constantsApp = fs.readFileSync(
      path.join(APP_ROOT, 'constants', 'app.ts'),
      'utf8',
    );
    const devLayout = fs.readFileSync(
      path.join(APP_ROOT, 'app', '(dev)', '_layout.tsx'),
      'utf8',
    );

    expect(constantsApp).toContain("process.env.EXPO_PUBLIC_DEV_TOOLS === '1'");
    expect(devLayout).toContain('DEV_TOOLS_ENABLED');
    expect(devLayout).toContain('Redirect');
  });

  it('forbids offlineAccess, serverAuthCode, setUserId, setUserProperty, and allowFontScaling={false}', () => {
    const offenders: string[] = [];

    for (const file of collectAppSourceFiles()) {
      const content = fs.readFileSync(file, 'utf8');
      if (
        /\bofflineAccess\b/.test(content) ||
        /\bserverAuthCode\b/.test(content) ||
        /\bsetUserId\b/.test(content) ||
        /\bsetUserProperty\b/.test(content) ||
        /allowFontScaling\s*=\s*\{\s*false\s*\}/.test(content)
      ) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });

  it('tracks no Firebase config files, .signing.env, or .jks files in git', () => {
    const stdout = execFileSync('git', ['ls-files'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const trackedSecrets = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => {
        const base = path.basename(line);
        return (
          base === 'google-services.json' ||
          base === 'GoogleService-Info.plist' ||
          base === '.signing.env' ||
          base.endsWith('.jks')
        );
      });

    expect(trackedSecrets).toEqual([]);
  });
});
