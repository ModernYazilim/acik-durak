/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import { Platform } from 'react-native';

// Simgedeki lacivert tonundan türetilmiş, saf siyah ve saf beyaz kullanılmayan palet.
// Koyu modda zemin lacivert, metin kırık beyaz; uzun kullanımda gözü daha az yorar.
export const Colors = {
  light: {
    text: '#1A2033',
    background: '#FAFAFC',
    backgroundElement: '#EEF0F4',
    backgroundSelected: '#DFE3EA',
    textSecondary: '#5B6478',
    neutral: '#6B7385',
    link: '#0B5CAD',
    warnBackground: '#FFF3D6',
    warnText: '#7A4A00',
    seaSoft: '#E1F1FA',
    redSoft: '#FCE6E7',
  },
  dark: {
    text: '#E6E9F0',
    background: '#0F1524',
    backgroundElement: '#1A2235',
    backgroundSelected: '#273149',
    textSecondary: '#9AA3B5',
    neutral: '#4A556E',
    link: '#7DB8F2',
    warnBackground: '#3A2F14',
    warnText: '#F2C76B',
    seaSoft: '#15354D',
    redSoft: '#3D1C24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
