// Konfigurasi Tailwind CDN — dipakai bersama oleh index.html & daftar/index.html.
// Wajib dimuat SETELAH script cdn.tailwindcss.com.
// Gaya "Hangat & Ramah": latar krem, kartu putih, aksen hijau.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F2",
        sand: "#F1EFE9",
        line: "#8F8A7E",
        ink: {
          900: "#1C2A22",
          600: "#2F3B33",
          500: "#4B5A50",
          300: "#6B7A70",
        },
        brand: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          600: "#15803D",
          700: "#166534",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 24px -12px rgba(28,42,34,.25)",
      },
    },
  },
};
