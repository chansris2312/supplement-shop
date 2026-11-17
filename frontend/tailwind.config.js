/** Design tokens from CLAUDE.md section 6.1 / design/app/*.dc.html */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: '#F4FAF9',
        line: '#DCEBE7',
        field: '#C5DAD5',
        thead: '#EEF7F5',
        mint: '#DFF4EF',
        avatar: '#BFE8DF',
        primary: { DEFAULT: '#1E7F74', hover: '#165F57', dark: '#155E56' },
        ink: '#1B2A27',
        nav: '#17302C',
        muted: '#5B6B66',
        icon: '#3E5C56',
        warn: { bg: '#FFF4E0', text: '#6B4A12' },
        danger: '#A23B2A',
        signal: { bg: '#E6F6F2', line: '#C9EAE2' },
      },
      fontFamily: {
        prompt: ['Prompt', 'Tahoma', 'sans-serif'],
        sans: ['"Noto Sans Thai"', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
