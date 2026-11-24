import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { DB_NAME, SETTINGS_KEYS } from '@/constants/app';
import { SpikeWidget } from './SpikeWidget';

async function readSpikeCount(): Promise<number> {
  let db: SQLiteDatabase | null = null;
  try {
    db = await openDatabaseAsync(DB_NAME, { useNewConnection: true });
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE id = ? AND deleted_at IS NULL',
      SETTINGS_KEYS.SPIKE_WIDGET,
    );
    if (!row) {
      return 0;
    }
    const parsed = Number.parseInt(row.value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  } finally {
    if (db) {
      await db.closeAsync().catch(() => {});
    }
  }
}

/** Headless Android widget handler that reads the spike counter from SQLite on render events. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const count = await readSpikeCount();
      props.renderWidget(<SpikeWidget count={count} />);
      break;
    }
    default:
      break;
  }
}
