/* ============================================================
   main.js — Perilaku bersama seluruh halaman
   ============================================================ */

const ICON_MENU =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const ICON_CLOSE =
  '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

document.addEventListener("DOMContentLoaded", () => {
  // Tahun berjalan di footer
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Toggle menu mobile
  const menuBtn = document.getElementById("menuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  if (menuBtn && mobileMenu) {
    const openMenu = () => {
      mobileMenu.classList.remove(
        "scale-y-0",
        "opacity-0",
        "pointer-events-none"
      );
      mobileMenu.classList.add("scale-y-100", "opacity-100");
      menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.innerHTML = ICON_CLOSE;
    };
    const closeMenu = () => {
      mobileMenu.classList.add("scale-y-0", "opacity-0", "pointer-events-none");
      mobileMenu.classList.remove("scale-y-100", "opacity-100");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.innerHTML = ICON_MENU;
    };

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = mobileMenu.classList.contains("scale-y-100");
      isOpen ? closeMenu() : openMenu();
    });

    document.querySelectorAll(".mobile-link").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    // Tutup saat klik di luar
    document.addEventListener("click", (e) => {
      if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
        closeMenu();
      }
    });
  }

  // Efek shadow navbar saat scroll
  const navInner = document.getElementById("navInner");
  if (navInner) {
    window.addEventListener("scroll", () => {
      navInner.classList.toggle("shadow-soft", window.scrollY > 12);
    });
  }

  // FAQ accordion
  document.querySelectorAll(".faq-item").forEach((item) => {
    const trigger = item.querySelector(".faq-trigger");
    if (!trigger) return;
    trigger.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      document
        .querySelectorAll(".faq-item.open")
        .forEach((el) => el.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
});

/* Toast notifikasi */
function showToast(message, type = "info") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className =
    "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-sm font-medium px-5 py-3 rounded-xl shadow-2xl " +
    (type === "error"
      ? "bg-rose-600 text-white"
      : type === "success"
      ? "bg-emerald-600 text-white"
      : "bg-slate-900 text-white");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.remove(), 3200);
}