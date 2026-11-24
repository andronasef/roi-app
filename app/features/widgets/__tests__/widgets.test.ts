import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(__dirname, '../../..');

function extractPushSpikeWidgetParams(source: string): string[] {
  const fnMatch =
    source.match(
      /export\s+(?:async\s+)?function\s+pushSpikeWidget\s*\(([^)]*)\)/,
    ) ??
    source.match(
      /export\s+const\s+pushSpikeWidget\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/,
    );
  expect(fnMatch).not.toBeNull();
  const rawParams = (fnMatch?.[1] ?? '').trim();
  if (!rawParams) {
    return [];
  }
  return rawParams
    .split(',')
    .map((param) => param.trim())
    .filter((param) => param.length > 0);
}

describe('widget wiring and scheme invariants', () => {
  it('registers the Android widget task handler before expo-router/entry in app/index.ts', () => {
    const indexSource = fs.readFileSync(path.join(APP_ROOT, 'index.ts'), 'utf8');
    const registerIndex = indexSource.indexOf('features/widgets/android/register');
    const routerEntryIndex = indexSource.indexOf('expo-router/entry');

    expect(registerIndex).toBeGreaterThanOrEqual(0);
    expect(routerEntryIndex).toBeGreaterThan(registerIndex);
  });

  it('builds SPIKE_WIDGET_URL from SCHEME without a hardcoded scheme literal', () => {
    const appConstants = fs.readFileSync(
      path.join(APP_ROOT, 'constants', 'app.ts'),
      'utf8',
    );
    const appJson = JSON.parse(
      fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8'),
    ) as { expo: { scheme: string } };

    const urlMatch = appConstants.match(
      /export\s+const\s+SPIKE_WIDGET_URL\s*=\s*([^;\n]+);/,
    );
    expect(urlMatch).not.toBeNull();
    const urlExpr = urlMatch?.[1] ?? '';

    expect(urlExpr).toContain('${SCHEME}://');
    expect(urlExpr).toContain('spike');
    expect(urlExpr).toContain('from=widget');
    expect(urlExpr).not.toContain(`${appJson.expo.scheme}://`);
  });

  it('keeps the inline iOS widgetURL aligned with app.json expo.scheme and from=widget', () => {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(APP_ROOT, 'app.json'), 'utf8'),
    ) as { expo: { scheme: string } };
    const iosWidgetSource = fs.readFileSync(
      path.join(APP_ROOT, 'features', 'widgets', 'ios', 'RoiSpike.tsx'),
      'utf8',
    );

    expect(iosWidgetSource).toContain(`${appJson.expo.scheme}://spike`);
    expect(iosWidgetSource).toContain('from=widget');
  });

  it('exposes pushSpikeWidget with matching name and 1-parameter arity on Android and iOS', () => {
    const androidUpdate = fs.readFileSync(
      path.join(APP_ROOT, 'features', 'widgets', 'update.ts'),
      'utf8',
    );
    const iosUpdate = fs.readFileSync(
      path.join(APP_ROOT, 'features', 'widgets', 'update.ios.ts'),
      'utf8',
    );

    expect(extractPushSpikeWidgetParams(androidUpdate)).toHaveLength(1);
    expect(extractPushSpikeWidgetParams(iosUpdate)).toHaveLength(1);
  });
});
