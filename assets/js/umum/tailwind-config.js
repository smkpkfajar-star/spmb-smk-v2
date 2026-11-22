// Konfigurasi Tailwind CDN — dipakai semua halaman.
// Wajib dimuat SETELAH script cdn.tailwindcss.com.
// Gaya mengikuti design.md (referensi rpl.tamsis.site), dengan penyesuaian keterbacaan:
// lihat docs/superpowers/specs/2026-11-22-gaya-rpl-design.md
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      // Warna lewat variabel CSS (style.css: :root = terang, html.dark = gelap)
      colors: {
        cream: "rgb(var(--cream) / <alpha-value>)", // kanvas
        sand: "rgb(var(--sand) / <alpha-value>)", // permukaan lembut (tab, kepala tabel)
        hairline: "rgb(var(--hairline) / <alpha-value>)", // garis struktur tipis
        line: "rgb(var(--line) / <alpha-value>)", // garis kolom isian
        gold: { 400: "#F7C869", 500: "#F2B53A", 600: "#BA800C" },
        // aksen pink — dipakai hemat untuk sentuhan modern
        pink: { 50: "rgb(var(--pink-50) / <alpha-value>)", 100: "rgb(var(--pink-100) / <alpha-value>)", 200: "rgb(var(--pink-200) / <alpha-value>)", 400: "#F472B6", 500: "#EC4899", 600: "rgb(var(--pink-600) / <alpha-value>)" },
        surface: "rgb(var(--surface) / <alpha-value>)", // kartu/terminal gelap
        ink: {
          900: "rgb(var(--ink-900) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
        },
        // "brand" = tombol & aksi utama (hitam arang; terang saat mode gelap)
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
        },
        // warna status
        ok: { 50: "rgb(var(--ok-50) / <alpha-value>)", 600: "#16A34A", 700: "#16523A" },
        info: { 50: "rgb(var(--info-50) / <alpha-value>)", 700: "#0369A1" },
        warn: { 50: "rgb(var(--warn-50) / <alpha-value>)", 700: "#8A5A00" },
      },
      // bg-white = kartu (gelap saat mode gelap); text-white tetap putih kecuali di atas tombol yang ikut terang
      backgroundColor: { white: "rgb(var(--kartu) / <alpha-value>)" },
      textColor: {
        white: "rgb(var(--putih) / <alpha-value>)",
        ok: { 700: "rgb(var(--teks-ok) / <alpha-value>)" },
        info: { 700: "rgb(var(--teks-info) / <alpha-value>)" },
        warn: { 700: "rgb(var(--teks-warn) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", '"Courier New"', "monospace"],
      },
      boxShadow: {
        soft: "0 0 0 1px rgb(var(--hairline)), 0 8px 30px rgba(0,0,0,.06)",
      },
      // design.md: kartu & kolom isian bersudut tajam; tombol/badge tetap kapsul (rounded-full)
      borderRadius: {
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
      },
      letterSpacing: {
        display: "-0.055em",
      },
    },
  },
};
