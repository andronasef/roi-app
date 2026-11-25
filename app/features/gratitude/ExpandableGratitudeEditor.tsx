import { Minimize2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';

export interface ExpandableGratitudeEditorProps {
  /** Same controlled state as the collapsed Today card (no cursor/text loss). */
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  onCollapse: () => void;
  dateLabel: string;
  saving: boolean;
}

/**
 * Full-screen distraction-free writing overlay (D-10). Mount it to expand, unmount to collapse;
 * it fades/slides in over 260ms and honours the system Reduce Motion setting.
 */
export function ExpandableGratitudeEditor({
  value,
  onChangeText,
  onBlur,
  onCollapse,
  dateLabel,
  saving,
}: ExpandableGratitudeEditorProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 260,
      reduceMotion: ReduceMotion.System,
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  return (
    <Animated.View
      className="absolute inset-0 bg-background"
      style={animatedStyle}
    >
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-row items-center justify-between border-b border-border px-6 py-2">
            <View className="gap-1">
              <Text className="text-start text-sm font-bold text-foreground">
                {dateLabel}
              </Text>
              <Text className="text-start text-sm text-muted-foreground">
                {saving ? 'بيتحفظ...' : 'اتحفظ تلقائي'}
              </Text>
            </View>
            <Pressable
              onPress={onCollapse}
              accessibilityRole="button"
              accessibilityLabel="تصغير مساحة الكتابة"
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
            >
              <Icon as={Minimize2} size={22} className="text-foreground" />
            </Pressable>
          </View>

          <TextInput
            autoFocus
            multiline
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            placeholder="اكتب حاجة بتشكر ربنا عليها النهاردة..."
            textAlignVertical="top"
            accessibilityLabel="سطر الشكر"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="flex-1 px-6 py-8 text-start text-base text-foreground"
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}
