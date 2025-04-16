/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./kernelboard/templates/**/*.html"],
  safelist: [ 'code-block-fade' ],
  theme: {
    extend: {
      colors: {
        primary: '#5865F2',   // Blurple, Discord's brand color
        secondary: '#00BFFF', // Electric cyan
        secondary_dark: '#089182',
        accent: '#8B5CF6',    // Vibrant purple
        neutral: '#C9C9C9',   // Gray
        dark: '#202020',      // Dark Gray
        discord: '#5865F2',   // Discord's brand color, blurple
      }
    }
  }
}