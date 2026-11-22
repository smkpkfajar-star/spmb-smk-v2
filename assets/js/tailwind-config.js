// Konfigurasi Tailwind CDN — dipakai semua halaman.
// Wajib dimuat SETELAH script cdn.tailwindcss.com.
// Gaya mengikuti design.md (referensi rpl.tamsis.site), dengan penyesuaian keterbacaan:
// lihat docs/superpowers/specs/2026-11-22-gaya-rpl-design.md
tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Nama token lama dipertahankan agar halaman tidak perlu ditulis ulang semuanya
        cream: "#FFFFFF", // kanvas
        sand: "#F5F5F5", // permukaan lembut (tab, kepala tabel)
        hairline: "#E5E7EB", // garis struktur tipis
        line: "#737373", // garis kolom isian (lebih tegas dari design.md demi keterbacaan)
        gold: { 400: "#F7C869", 500: "#F2B53A", 600: "#BA800C" },
        surface: "#07170F", // kartu/terminal gelap
        ink: {
          900: "#171717",
          600: "#525252",
          500: "#666666",
          300: "#8A8A8A",
        },
        // "brand" = tombol & aksi utama (hitam arang)
        brand: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          600: "#171717",
          700: "#0A0A0A",
        },
        // warna status (tidak ada di design.md, dipertahankan untuk orang awam)
        ok: { 50: "#EAF5EF", 600: "#16A34A", 700: "#16523A" },
        info: { 50: "#E0F2FE", 700: "#0369A1" },
        warn: { 50: "#FEF3C7", 700: "#8A5A00" },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", '"Courier New"', "monospace"],
      },
      boxShadow: {
        soft: "0 0 0 1px #EAEAEA, 0 8px 30px rgba(0,0,0,.06)",
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
