/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/react-app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a192f',
          dark: '#020c1b',
          light: '#112240',
          slate: '#8892b0',
          text: '#ccd6f6',
          primary: '#64ffda',
          secondary: '#00ff41',
          danger: '#ff0033',
          alert: '#ef4444',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
};
