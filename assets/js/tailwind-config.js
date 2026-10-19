// Konfigurasi Tailwind CDN — dipakai bersama oleh index.html & daftar.html
// Wajib dimuat SETELAH script cdn.tailwindcss.com dan SEBELUM konten <body> dirender.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B1220',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          400: '#94A3B8',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50:  '#F8FAFC',
        },
        brand: {
          700: '#4338CA',
          600: '#4F46E5',
          500: '#6366F1',
          100: '#E0E7FF',
          50:  '#EEF2FF',
        },
        spark: {
          500: '#F59E0B',
          400: '#FBBF24',
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.10)',
        card: '0 1px 3px rgba(15,23,42,0.06), 0 12px 32px -12px rgba(79,70,229,0.18)',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    }
  }
}
