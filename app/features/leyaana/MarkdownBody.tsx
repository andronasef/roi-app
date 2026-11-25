import { useColorScheme } from 'nativewind';
import { useMemo, type ReactNode } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { Renderer, useMarkdown, type MarkedStyles } from 'react-native-marked';

import { FONT_FAMILIES, MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';

const LIGHT_PALETTE = {
  foreground: '#2C2721',
  mutedForeground: '#6B6358',
  muted: '#E9E3D8',
  border: '#DAD2C3',
} as const;

const DARK_PALETTE = {
  foreground: '#ECE5D4',
  mutedForeground: '#B4AC9C',
  muted: '#322F29',
  border: '#433E37',
} as const;

/**
 * Custom RTL warm-paper Markdown renderer:
 * - Logical RTL blockquotes (`border-s-2 border-accent ps-4 pe-3`) instead of physical left borders
 * - `maxFontSizeMultiplier` cap on headings
 * - Disables tappable links and remote images as defense-in-depth (T-04-07)
 */
export class RoiMarkdownRenderer extends Renderer {
  override blockquote(children: ReactNode[]): ReactNode {
    return (
      <View
        key={this.getKey()}
        className="my-2 rounded-e-lg border-s-2 border-accent bg-muted/40 py-2 pe-3 ps-4"
      >
        {children}
      </View>
    );
  }

  override heading(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return (
      <Text
        key={this.getKey()}
        selectable
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        style={styles}
      >
        {text}
      </Text>
    );
  }

  override link(
    children: string | ReactNode[],
    _href: string,
    styles?: TextStyle,
  ): ReactNode {
    return this.text(children, styles);
  }

  override image(): ReactNode {
    return null;
  }

  override linkImage(): ReactNode {
    return null;
  }
}

function buildMarkedStyles(isDark: boolean): MarkedStyles {
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  const baseText: TextStyle = {
    fontFamily: FONT_FAMILIES.ui.regular,
    fontSize: 16,
    lineHeight: 26,
    color: palette.foreground,
    writingDirection: 'rtl',
  };

  const headingText: TextStyle = {
    fontFamily: FONT_FAMILIES.ui.bold,
    fontWeight: 'normal',
    fontSize: 20,
    lineHeight: 28,
    color: palette.foreground,
    writingDirection: 'rtl',
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginVertical: 4,
  };

  return {
    text: baseText,
    strong: {
      ...baseText,
      fontFamily: FONT_FAMILIES.ui.bold,
      fontWeight: 'normal',
    },
    em: {
      ...baseText,
      fontStyle: 'italic',
    },
    strikethrough: {
      ...baseText,
      color: palette.mutedForeground,
    },
    link: {
      ...baseText,
      fontStyle: 'normal',
    },
    li: {
      ...baseText,
      flexShrink: 1,
    },
    paragraph: {
      paddingVertical: 4,
    },
    blockquote: {},
    codespan: {
      ...baseText,
      fontStyle: 'normal',
      fontWeight: 'normal',
      backgroundColor: palette.muted,
    },
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
      marginVertical: 8,
    },
    h1: headingText,
    h2: headingText,
    h3: headingText,
    h4: headingText,
    h5: headingText,
    h6: headingText,
  };
}

export interface MarkdownBodyProps {
  markdown: string;
}

/** Render Arabic RTL Markdown subset without nested FlatLists via useMarkdown(). */
export function MarkdownBody({ markdown }: MarkdownBodyProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const renderer = useMemo(
    () => new RoiMarkdownRenderer({ selectable: true }),
    [],
  );
  const styles = useMemo(() => buildMarkedStyles(isDark), [isDark]);
  const elements = useMarkdown(markdown, {
    colorScheme: isDark ? 'dark' : 'light',
    renderer,
    styles,
  });

  return <View className="gap-1">{elements}</View>;
}
