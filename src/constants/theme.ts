// 主题颜色常量定义
export const THEME_COLORS = {
  light: {
    '--primary-color': '#1E9CFF',
    '--primary-bg': 'rgba(47, 192, 255, 0.08)',
    '--main-bg': '#FFFFFF',
    '--secondary-bg': '#f5f5f5',
    '--text-color': '#334155',
    '--border-color': '#E2E8F0',
    '--shadow-color': 'rgba(236, 72, 153, 0.05)'
  },
  dark: {
    '--primary-color': '#1E9CFF',
    '--primary-bg': 'rgba(47, 192, 255, 0.08)',
    '--main-bg': '#1e1e1e',
    '--secondary-bg': '#2a2a2a',
    '--text-color': '#e5e5e5',
    '--border-color': '#404040',
    '--shadow-color': 'rgba(255, 255, 255, 0.15)'
  }
} as const

export type ThemeMode = keyof typeof THEME_COLORS
