import Slider from '@react-native-community/slider';
import { toArabicDigits } from '@roi/shared';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Text, View, type TextProps } from 'react-native';

import {
  FONT_FAMILIES,
  MAX_FONT_SIZE_MULTIPLIER,
  MIN_TOUCH,
  SCRIPTURE_FONT_DEFAULT,
  SCRIPTURE_FONT_OPTIONS,
  SCRIPTURE_LINE_HEIGHT,
  SCRIPTURE_SIZES,
  SCRIPTURE_SLIDER_INVERTED,
  SCRIPTURE_STEP_DEFAULT,
  type ScriptureFontCandidate,
} from '@/constants/theme';
import ar from '@/locales/ar.json';
import {
  getScriptureFont,
  getScriptureStep,
  setScriptureFont,
  setScriptureStep,
} from '@/services/storage';

interface ScriptureSizeContextValue {
  step: number;
  setStep: (nextStep: number) => void;
  fontCandidate: ScriptureFontCandidate;
  setFontCandidate: (nextFont: ScriptureFontCandidate) => void;
  size: number;
  lineHeight: number;
}

const ScriptureSizeContext = createContext<ScriptureSizeContextValue | null>(
  null,
);

function isScriptureFontCandidate(
  value: string | undefined,
): value is ScriptureFontCandidate {
  return (
    value !== undefined &&
    (SCRIPTURE_FONT_OPTIONS as readonly string[]).includes(value)
  );
}

function clampStep(value: number): number {
  const maxStep = SCRIPTURE_SIZES.length - 1;
  return Math.max(0, Math.min(maxStep, Math.round(value)));
}

export function ScriptureSizeProvider({ children }: { children: ReactNode }) {
  const [step, setStepState] = useState<number>(() =>
    getScriptureStep(SCRIPTURE_STEP_DEFAULT),
  );
  const [fontCandidate, setFontCandidateState] =
    useState<ScriptureFontCandidate>(() => {
      const stored = getScriptureFont();
      return isScriptureFontCandidate(stored)
        ? stored
        : SCRIPTURE_FONT_DEFAULT;
    });

  const setStep = useCallback((nextStep: number) => {
    const clamped = clampStep(nextStep);
    setScriptureStep(clamped);
    setStepState(clamped);
  }, []);

  const setFontCandidate = useCallback((nextFont: ScriptureFontCandidate) => {
    setScriptureFont(nextFont);
    setFontCandidateState(nextFont);
  }, []);

  const value = useMemo<ScriptureSizeContextValue>(() => {
    const size =
      SCRIPTURE_SIZES[clampStep(step)] ?? SCRIPTURE_SIZES[SCRIPTURE_STEP_DEFAULT];
    const lineHeight = Math.round(size * SCRIPTURE_LINE_HEIGHT);
    return {
      step,
      setStep,
      fontCandidate,
      setFontCandidate,
      size,
      lineHeight,
    };
  }, [step, setStep, fontCandidate, setFontCandidate]);

  return (
    <ScriptureSizeContext.Provider value={value}>
      {children}
    </ScriptureSizeContext.Provider>
  );
}

export function useScriptureSize(): ScriptureSizeContextValue {
  const ctx = useContext(ScriptureSizeContext);
  if (!ctx) {
    throw new Error(
      'useScriptureSize must be used within a ScriptureSizeProvider',
    );
  }
  return ctx;
}

export interface ScriptureProps extends TextProps {
  bold?: boolean;
  candidate?: ScriptureFontCandidate;
}

export function Scripture({
  bold = false,
  candidate,
  style,
  className,
  ...rest
}: ScriptureProps) {
  const { size, lineHeight, fontCandidate } = useScriptureSize();
  const activeCandidate = candidate ?? fontCandidate;
  const familySet = FONT_FAMILIES.scripture[activeCandidate];
  const fontFamily = bold ? familySet.bold : familySet.regular;

  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
      className={className ? `text-foreground ${className}` : 'text-foreground'}
      style={[
        {
          fontFamily,
          fontSize: size,
          lineHeight,
          writingDirection: 'rtl',
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function ScriptureSizeSlider() {
  const { step, setStep } = useScriptureSize();
  const accessibilityValueText = `${toArabicDigits(step + 1)} ${ar.scriptureSizeOutOf}`;

  return (
    <View
      className="w-full flex-row items-center gap-3 px-2"
      style={{ minHeight: MIN_TOUCH }}
    >
      <Text
        aria-hidden
        className="text-sm text-muted-foreground"
        style={{ fontFamily: FONT_FAMILIES.ui.regular }}
      >
        أ
      </Text>
      <View className="flex-1 justify-center" style={{ minHeight: MIN_TOUCH }}>
        <Slider
          minimumValue={0}
          maximumValue={SCRIPTURE_SIZES.length - 1}
          step={1}
          value={step}
          inverted={SCRIPTURE_SLIDER_INVERTED}
          onValueChange={(value) => setStep(Math.round(value))}
          accessibilityLabel={ar.scriptureSizeLabel}
          accessibilityValue={{ text: accessibilityValueText }}
          minimumTrackTintColor="#8A7A3B"
          maximumTrackTintColor="#D5CEC0"
          thumbTintColor="#8A7A3B"
        />
      </View>
      <Text
        aria-hidden
        className="text-2xl text-foreground"
        style={{ fontFamily: FONT_FAMILIES.ui.bold }}
      >
        أ
      </Text>
    </View>
  );
}
