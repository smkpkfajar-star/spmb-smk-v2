/* ============================================================
   main.js — Perilaku bersama seluruh halaman
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Tahun berjalan di footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Toggle menu mobile
  // Toggle menu mobile
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (menuBtn && mobileMenu) {
  const openMenu = () => {
    mobileMenu.classList.remove('scale-y-0', 'opacity-0', 'pointer-events-none');
    mobileMenu.classList.add('scale-y-100', 'opacity-100');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  };
  const closeMenu = () => {
    mobileMenu.classList.add('scale-y-0', 'opacity-0', 'pointer-events-none');
    mobileMenu.classList.remove('scale-y-100', 'opacity-100');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
  };

  menuBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('scale-y-100');
    isOpen ? closeMenu() : openMenu();
  });

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Tutup saat klik di luar
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
      closeMenu();
    }
  });
}

  // Efek shadow navbar saat scroll
  const navInner = document.getElementById('navInner');
  if (navInner) {
    window.addEventListener('scroll', () => {
      navInner.classList.toggle('shadow-card', window.scrollY > 12);
    });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // Counter animasi
  const counters = document.querySelectorAll('[data-target]');
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const counter = entry.target;
      const target = +counter.getAttribute('data-target');
      const suffix = counter.getAttribute('data-suffix') || '';
      let count = 0;
      const speed = 200;
      const updateCount = () => {
        count += target / speed;
        if (count < target) {
          counter.innerText = Math.ceil(count) + suffix;
          setTimeout(updateCount, 15);
        } else {
          counter.innerText = target + suffix;
        }
      };
      updateCount();
      obs.unobserve(counter);
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));

});

/* Toast notifikasi */
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-sm font-medium px-5 py-3 rounded-xl shadow-2xl ' +
    (type === 'error' ? 'bg-rose-600 text-white' : type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.remove(), 3200);
}