import { Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  environment,
  frame,
  multilineTextAlignment,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { PlatformColor } from 'react-native';

export interface RoiSpikeProps {
  verse: string;
  count: string;
}

const RoiSpikeLayout = (props: RoiSpikeProps, _env: WidgetEnvironment) => {
  'widget';

  return (
    <VStack
      alignment="trailing"
      spacing={8}
      modifiers={[
        containerBackground(PlatformColor('systemBackground'), 'widget'),
        widgetURL('roi://spike?from=widget'),
        environment('locale', 'ar'),
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topTrailing' }),
        padding({ all: 12 }),
      ]}
    >
      <Text
        modifiers={[
          multilineTextAlignment('trailing'),
          frame({ maxWidth: Infinity, alignment: 'trailing' }),
        ]}
      >
        {props.verse}
      </Text>
      <Text
        modifiers={[
          multilineTextAlignment('trailing'),
          frame({ maxWidth: Infinity, alignment: 'trailing' }),
        ]}
      >
        {props.count}
      </Text>
    </VStack>
  );
};

export default createWidget<RoiSpikeProps>('RoiSpike', RoiSpikeLayout, {
  verse: '',
  count: '',
});
