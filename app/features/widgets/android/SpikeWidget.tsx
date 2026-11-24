import { TORTURE_FIXTURES, toArabicDigits } from '@roi/shared';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { SPIKE_WIDGET_URL } from '@/constants/app';
import { FONT_FAMILIES } from '@/constants/theme';

const PS23_1 = TORTURE_FIXTURES.find((fixture) => fixture.id === 'ps23-1') ?? TORTURE_FIXTURES[0];

export interface SpikeWidgetProps {
  count: number;
}

/** Android home-screen spike widget displaying Psalm 23:1 and the Arabic-Indic counter. */
export function SpikeWidget({ count }: SpikeWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: SPIKE_WIDGET_URL }}
      accessibilityLabel={PS23_1.text}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        backgroundColor: '#FAF6EE',
        borderRadius: 16,
        padding: 14,
      }}
    >
      <TextWidget
        text={PS23_1.text}
        style={{
          width: 'match_parent',
          fontFamily: FONT_FAMILIES.scripture.amiri.regular,
          fontSize: 18,
          color: '#2C2720',
          textAlign: 'right',
        }}
      />
      <TextWidget
        text={toArabicDigits(count)}
        style={{
          width: 'match_parent',
          fontFamily: FONT_FAMILIES.ui.regular,
          fontSize: 13,
          color: '#6B6358',
          textAlign: 'right',
        }}
      />
    </FlexWidget>
  );
}
