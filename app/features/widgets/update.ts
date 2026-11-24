import { createElement } from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { SpikeWidget } from './android/SpikeWidget';

/** Push a fresh counter snapshot to the Android RoiSpike home-screen widget. */
export async function pushSpikeWidget(count: number): Promise<void> {
  await requestWidgetUpdate({
    widgetName: 'RoiSpike',
    renderWidget: () => createElement(SpikeWidget, { count }),
  });
}
