/* ============================================================
   kiosk.js — "Mode Teras" untuk komputer pendaftaran di sekolah.
   Nyalakan sekali dengan  daftar/?kiosk=1  (diingat di komputer itu),
   matikan dengan  daftar/?kiosk=0 .
   - Kontras sangat tinggi (lihat .kiosk di style.css)
   - Setelah sukses: hitung mundur lalu form kosong lagi
   - Form setengah terisi & ditinggal: tanya "Masih mengisi?", lalu dikosongkan
   ============================================================ */
(function (root) {
  const KIOSK_SUCCESS_RESET_S = 60;
  const KIOSK_IDLE_S = 180;
  const KIOSK_IDLE_WARN_S = 30;
  const STORAGE_KEY = "spmb-kiosk";

  // Fungsi murni: tentukan mode dari URL + nilai tersimpan.
  // store: "1" = simpan, null = hapus, undefined = biarkan.
  function resolveMode(search, stored) {
    const param = new URLSearchParams(search).get("kiosk");
    if (param === "1") return { on: true, store: "1" };
    if (param === "0") return { on: false, store: null };
    return { on: stored === "1", store: undefined };
  }

  root.Kiosk = { resolveMode, KIOSK_SUCCESS_RESET_S, KIOSK_IDLE_S, KIOSK_IDLE_WARN_S };

  if (typeof document === "undefined" || !root.location) return;

  let stored = null;
  try { stored = root.localStorage.getItem(STORAGE_KEY); } catch (_) {}
  const mode = resolveMode(root.location.search, stored);
  try {
    if (mode.store === "1") root.localStorage.setItem(STORAGE_KEY, "1");
    if (mode.store === null) root.localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
  if (!mode.on) return;

  document.documentElement.classList.add("kiosk");
  document.documentElement.classList.remove("dark"); // mode teras selalu terang

  // Kembali ke form kosong (tanpa parameter, mode tetap diingat)
  function resetKiosk() {
    root.location.replace(root.location.pathname);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);
    const successCard = $("successCard");
    const uploadModal = $("uploadModal");
    const idleModal = $("kioskIdle");

    // --- Setelah sukses: hitung mundur ---
    let successTimer = null;
    const nextBtn = $("kioskNext");
    if (nextBtn) nextBtn.addEventListener("click", resetKiosk);
    if (successCard) {
      new MutationObserver(() => {
        if (successCard.classList.contains("hidden") || successTimer) return;
        let left = KIOSK_SUCCESS_RESET_S;
        const label = $("kioskCountdown");
        if (label) label.textContent = left;
        successTimer = setInterval(() => {
          left -= 1;
          if (label) label.textContent = left;
          if (left <= 0) resetKiosk();
        }, 1000);
      }).observe(successCard, { attributes: true, attributeFilter: ["class"] });
    }

    // --- Form ditinggal ---
    let lastActivity = Date.now();
    let warnTimer = null;
    const markActive = () => { lastActivity = Date.now(); };
    ["input", "change", "click", "keydown", "touchstart", "pointerdown"].forEach((ev) =>
      document.addEventListener(ev, markActive, { passive: true })
    );

    const formHasData = () =>
      [...document.querySelectorAll("#regForm input, #regForm select, #regForm textarea")].some((el) =>
        el.type === "checkbox" ? el.checked : el.type === "file" ? el.files && el.files.length : el.value.trim() !== ""
      );
    const busy = () =>
      (uploadModal && !uploadModal.classList.contains("hidden")) ||
      (successCard && !successCard.classList.contains("hidden"));

    function hideIdle() {
      clearInterval(warnTimer);
      warnTimer = null;
      if (idleModal) idleModal.classList.add("hidden");
      markActive();
    }
    const stayBtn = $("kioskStay");
    if (stayBtn) stayBtn.addEventListener("click", hideIdle);

    setInterval(() => {
      if (warnTimer || busy() || !formHasData()) return;
      if (Date.now() - lastActivity < KIOSK_IDLE_S * 1000) return;
      let left = KIOSK_IDLE_WARN_S;
      const label = $("kioskIdleCountdown");
      if (label) label.textContent = left;
      if (idleModal) idleModal.classList.remove("hidden");
      if (stayBtn) stayBtn.focus();
      warnTimer = setInterval(() => {
        left -= 1;
        if (label) label.textContent = left;
        if (left <= 0) resetKiosk();
      }, 1000);
    }, 5000);
  });
})(typeof window !== "undefined" ? window : globalThis);
