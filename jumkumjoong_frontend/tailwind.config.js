/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        first: "#3F464D",
        second: "#2186C4",
        third: "#7ECEFC",
        fourth: "#FFF6E6",
        fifth: "#FF8066",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
        pixel: ['"Press Start 2P"', "cursive"],
        logo: ["GlossySheenRegular-L35oy", "sans-serif"], // 로고용 폰트로 이름 변경
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
      },
      cursor: {
        custom: "url(/images/default-cursor.png), auto",
      },
    },
  },
  plugins: [],
};
