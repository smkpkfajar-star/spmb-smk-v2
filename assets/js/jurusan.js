/* ============================================================
   jurusan.js — beranda: penjelajah jurusan (klik → detail),
   judul hero berganti kata, dan panel terminal yang mengetik.
   Tanpa library. Animasi mati bila pengguna memilih "kurangi gerakan"
   atau saat mode teras (kiosk).

   CATATAN ISI: "belajar" & "prospek" ditulis umum; mohon dicek panitia/guru jurusan.
   ============================================================ */
(function (root) {
  const JURUSAN = Object.freeze([
    {
      id: "TKR",
      nama: "Teknik Kendaraan Ringan",
      dot: "#171717",
      ringkas: "Mesin, sasis, dan kelistrikan mobil.",
      deskripsi:
        "Pemeliharaan mesin mobil, sasis, kelistrikan bodi, dan diagnosa kerusakan menggunakan scan tool, langsung di bengkel praktik.",
      belajar: ["Pemeliharaan mesin mobil", "Sasis & pemindah tenaga", "Kelistrikan bodi", "Diagnosa engine scan tool"],
      prospek: ["Mekanik bengkel resmi/umum", "Teknisi servis kendaraan", "Service advisor", "Membuka bengkel sendiri"],
    },
    {
      id: "TSM",
      nama: "Teknik Sepeda Motor",
      dot: "#DC2626",
      ringkas: "Servis injeksi, matic, hingga motor listrik.",
      deskripsi:
        "Servis mesin injeksi, perbaikan motor matic/manual, serta pengenalan konversi dan perawatan motor listrik.",
      belajar: ["Servis mesin & sistem injeksi", "Perbaikan motor matic/manual", "Kelistrikan sepeda motor", "Dasar motor listrik"],
      prospek: ["Mekanik dealer/bengkel motor", "Teknisi motor listrik", "Quality control perakitan", "Usaha bengkel motor"],
    },
    {
      id: "TITL",
      nama: "Teknik Instalasi Tenaga Listrik",
      dot: "#F2B53A",
      ringkas: "Instalasi bangunan, panel, dan energi terbarukan.",
      deskripsi:
        "Instalasi listrik bangunan, panel dan kontrol motor industri, serta dasar sistem energi terbarukan.",
      belajar: ["Instalasi listrik bangunan", "Panel & kontrol motor listrik", "Gambar teknik listrik", "Dasar panel surya"],
      prospek: ["Teknisi instalasi listrik", "Teknisi panel industri", "Teknisi perawatan gedung", "Instalatir mandiri"],
    },
    {
      id: "RPL",
      nama: "Rekayasa Perangkat Lunak",
      dot: "#16523A",
      ringkas: "Web, mobile, basis data, dan deploy.",
      deskripsi:
        "Pengembangan aplikasi web & mobile modern, basis data, hingga deploy ke server — dikerjakan seperti tim developer sungguhan.",
      belajar: ["Pemrograman web & mobile", "Basis data & backend API", "Git & kerja tim", "Desain antarmuka (UI/UX)"],
      prospek: ["Web/mobile developer", "Programmer", "Tester / QA", "Freelancer & startup"],
    },
    {
      id: "DKV",
      nama: "Desain Komunikasi Visual",
      dot: "#0369A1",
      ringkas: "Branding, ilustrasi, foto, dan video.",
      deskripsi:
        "Branding, ilustrasi digital, fotografi, videografi, dan motion graphic dengan standar industri kreatif.",
      belajar: ["Desain grafis & branding", "Ilustrasi digital", "Fotografi & videografi", "Motion graphic"],
      prospek: ["Desainer grafis", "Content creator", "Fotografer/videografer", "Ilustrator lepas"],
    },
  ]);

  const findJurusan = (id) => JURUSAN.find((j) => j.id === String(id || "").toUpperCase()) || null;
  const daftarUrl = (id) => `daftar/?jurusan=${encodeURIComponent(id)}#bagian-4`;
  const typeSteps = (text) => Array.from({ length: text.length }, (_, i) => text.slice(0, i + 1));

  root.Jurusan = { JURUSAN, findJurusan, daftarUrl, typeSteps };
  if (typeof document === "undefined") return;

  /* ---------- DOM ---------- */
  const calm = () =>
    document.documentElement.classList.contains("kiosk") ||
    (root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // Ketik teks ke elemen; token dipakai agar ketikan lama berhenti bila ada yang baru
  async function typeInto(el, text, speed = 28) {
    const token = (el._typeToken = (el._typeToken || 0) + 1);
    if (calm()) {
      el.textContent = text;
      return;
    }
    el.textContent = "";
    for (const step of typeSteps(text)) {
      if (el._typeToken !== token) return;
      el.textContent = step;
      await wait(speed);
    }
  }

  function renderDetail(j) {
    const panel = document.getElementById("jurusanDetail");
    if (!panel) return;
    panel.classList.remove("jurusan-in");
    void panel.offsetWidth; // mulai ulang animasi masuk
    panel.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="tag" style="--dot:${j.dot}">jurusan/${j.id.toLowerCase()}</span>
          <h3 class="mt-3 text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">${esc(j.nama)}</h3>
        </div>
        <span class="font-mono text-[40px] font-medium leading-none tracking-tight text-hairline sm:text-[56px]" aria-hidden="true">${j.id}</span>
      </div>
      <p class="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">${esc(j.deskripsi)}</p>
      <div class="mt-7 grid gap-6 sm:grid-cols-2">
        <div>
          <p class="font-mono text-[12.5px] text-ink-500">yang dipelajari</p>
          <ul class="mt-2.5 space-y-2 text-[15px]">${j.belajar.map((b) => `<li class="flex gap-2.5"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" aria-hidden="true"></span>${esc(b)}</li>`).join("")}</ul>
        </div>
        <div>
          <p class="font-mono text-[12.5px] text-ink-500">prospek kerja</p>
          <ul class="mt-2.5 space-y-2 text-[15px]">${j.prospek.map((b) => `<li class="flex gap-2.5"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-900" aria-hidden="true"></span>${esc(b)}</li>`).join("")}</ul>
        </div>
      </div>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row">
        <a href="${daftarUrl(j.id)}" class="btn inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink-900 px-6 text-[15px] font-semibold text-white">Daftar jurusan ${j.id} <span aria-hidden="true">→</span></a>
        <a href="https://wa.me/628823212784?text=${encodeURIComponent(`Halo panitia SPMB, saya ingin bertanya tentang jurusan ${j.nama}.`)}" target="_blank" rel="noopener" class="btn inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold shadow-[inset_0_0_0_1px_#D4D4D4]">Tanya jurusan ini</a>
      </div>`;
    panel.classList.add("jurusan-in");
  }

  function select(id, { type = true } = {}) {
    const j = findJurusan(id);
    if (!j) return;
    document.querySelectorAll("[data-jurusan]").forEach((b) => {
      const on = b.dataset.jurusan === j.id;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    // HP: geser deretan tab agar jurusan aktif terlihat (tanpa menggulir halaman)
    const active = document.querySelector(`[data-jurusan="${j.id}"]`);
    const list = active && active.parentElement;
    if (list && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2, behavior: calm() ? "auto" : "smooth" });
    }
    const cmd = document.getElementById("jurusanCmd");
    const line = `cd jurusan/${j.id.toLowerCase()} && cat README.md`;
    if (cmd) type ? typeInto(cmd, line, 22) : (cmd.textContent = line);
    renderDetail(j);
  }

  function initExplorer() {
    const tabs = [...document.querySelectorAll("[data-jurusan]")];
    if (!tabs.length) return;
    tabs.forEach((b, i) => {
      b.addEventListener("click", () => select(b.dataset.jurusan));
      b.addEventListener("keydown", (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const next = tabs[(i + d + tabs.length) % tabs.length];
        next.focus();
        select(next.dataset.jurusan);
      });
    });
    select("RPL", { type: false });
    // Ketik perintah pertama saat bagian jurusan mulai terlihat
    const section = document.getElementById("jurusan");
    if (section && "IntersectionObserver" in root) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          const cur = tabs.find((t) => t.getAttribute("aria-selected") === "true");
          if (cur) select(cur.dataset.jurusan);
        }
      }, { threshold: 0.25 });
      io.observe(section);
    }
  }

  // Judul hero: kata terakhir berganti dengan efek ketik/hapus
  async function initHeroWord() {
    const el = document.getElementById("heroWord");
    if (!el || calm()) return;
    const words = (el.dataset.words || "").split("|").filter(Boolean);
    if (words.length < 2) return;
    let i = 0;
    for (;;) {
      await wait(2600);
      const cur = words[i];
      for (let n = cur.length; n >= 0; n--) {
        el.textContent = cur.slice(0, n);
        await wait(45);
      }
      i = (i + 1) % words.length;
      for (const step of typeSteps(words[i])) {
        el.textContent = step;
        await wait(70);
      }
    }
  }

  // Panel terminal: baris diketik satu per satu saat pertama kali terlihat
  function initTerminal() {
    const box = document.getElementById("termLines");
    if (!box || calm() || !("IntersectionObserver" in root)) return;
    const lines = [...box.querySelectorAll("[data-type]")];
    const texts = lines.map((l) => l.textContent);
    const io = new IntersectionObserver(async (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      lines.forEach((l) => (l.textContent = ""));
      for (let k = 0; k < lines.length; k++) {
        await typeInto(lines[k], texts[k], lines[k].dataset.type === "cmd" ? 30 : 10);
        await wait(lines[k].dataset.type === "cmd" ? 250 : 60);
      }
    }, { threshold: 0.4 });
    io.observe(box);
  }

  document.addEventListener("DOMContentLoaded", () => {
    initExplorer();
    initHeroWord();
    initTerminal();
  });
})(typeof window !== "undefined" ? window : globalThis);
