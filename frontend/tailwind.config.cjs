module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bullish: '#00C896',
        bearish: '#FF4D6D',
        highlight: '#3B82F6'
      },
      borderRadius: {
        xl: '16px',
        xxl: '20px'
      }
    }
  },
  plugins: []
};
