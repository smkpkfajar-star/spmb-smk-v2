/* ============================================================
   pengaturan.js — saklar situs yang diatur superadmin (tabel Supabase "pengaturan"):
     spmb_dibuka  → pendaftaran SPMB dibuka / ditutup
     popup_promo  → pop-up promo di beranda nyala / mati
   Dibaca tanpa login (REST + anon key). Bila tabel belum dibuat atau internet
   bermasalah, dipakai nilai bawaan (dibuka & nyala) agar situs tetap jalan.
   Penegakan sebenarnya ada di database (supabase/03-pengaturan.sql).
   ============================================================ */
(function (root) {
  const BAWAAN = Object.freeze({ spmbDibuka: true, popupPromo: true });
  const KUNCI = { spmb_dibuka: "spmbDibuka", popup_promo: "popupPromo" };

  /* ---------- fungsi murni (dites) ---------- */
  function dariBaris(rows) {
    const hasil = { ...BAWAAN };
    (Array.isArray(rows) ? rows : []).forEach((r) => {
      const nama = r && KUNCI[r.kunci];
      if (nama) hasil[nama] = r.nilai !== false;
    });
    return hasil;
  }

  let janji = null;
  // Ambil pengaturan (sekali per halaman; segar: true = baca ulang dari server)
  function ambil({ segar = false, batasWaktu = 4000 } = {}) {
    if (janji && !segar) return janji;
    const c = root.APP_CONFIG && root.APP_CONFIG.supabase;
    if (!c || typeof fetch === "undefined") return Promise.resolve({ ...BAWAAN });
    janji = (async () => {
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), batasWaktu) : null;
      try {
        const r = await fetch(`${c.url}/rest/v1/pengaturan?select=kunci,nilai`, {
          headers: { apikey: c.anonKey, Authorization: `Bearer ${c.anonKey}` },
          cache: "no-store",
          signal: ctl ? ctl.signal : undefined,
        });
        if (!r.ok) return { ...BAWAAN };
        return dariBaris(await r.json());
      } catch {
        return { ...BAWAAN };
      } finally {
        if (t) clearTimeout(t);
      }
    })();
    return janji;
  }

  root.Pengaturan = { BAWAAN, KUNCI, dariBaris, ambil };
})(typeof window !== "undefined" ? window : globalThis);
