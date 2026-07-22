/** Field-trades brand palette — navy splash + interactive brand blue. */

const brandBlue = '#1F6FEB';
const navy = '#0B3A5B';

export const Brand = {
  blue: brandBlue,
  navy,
  splash: navy,
} as const;

export default {
  light: {
    text: '#12263A',
    background: '#F4F6F8',
    surface: '#FFFFFF',
    field: '#EEF1F4',
    tint: brandBlue,
    navy,
    border: '#D5DCE3',
    muted: '#5A6B7D',
    danger: '#D11A2A',
    success: '#1F7A3F',
    tabIconDefault: '#8A97A6',
    tabIconSelected: brandBlue,
  },
  dark: {
    text: '#E8EEF4',
    background: '#0E1419',
    surface: '#161D25',
    field: 'rgba(255,255,255,0.07)',
    tint: brandBlue,
    navy: '#9EC0DE',
    border: 'rgba(255,255,255,0.12)',
    muted: '#9AA8B5',
    danger: '#FF6B6F',
    success: '#3DDC84',
    tabIconDefault: '#6B7785',
    tabIconSelected: brandBlue,
  },
};
