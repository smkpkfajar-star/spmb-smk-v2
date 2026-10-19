/* ============================================================
   main.js — Perilaku bersama seluruh halaman
   (menu mobile, efek navbar scroll, toast notifikasi, tahun footer)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Tahun berjalan di footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Toggle menu mobile
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const isHidden = mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      menuBtn.setAttribute('aria-expanded', String(isHidden));
      menuBtn.innerHTML = isHidden ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });
    document.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Efek shadow navbar saat halaman di-scroll
  const navInner = document.getElementById('navInner');
  if (navInner) {
    window.addEventListener('scroll', () => {
      navInner.classList.toggle('shadow-card', window.scrollY > 12);
    });
  }

  // FAQ accordion (dipakai di index.html)
  document.querySelectorAll('.faq-item').forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
});

/* Notifikasi toast singkat, dipakai lintas halaman */
function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-sm font-medium px-5 py-3 rounded-xl shadow-2xl';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-sm font-medium px-5 py-3 rounded-xl shadow-2xl ' +
    (type === 'error' ? 'bg-rose-600 text-white' : type === 'success' ? 'bg-emerald-600 text-white' : 'bg-ink-900 text-white');
  toast.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.add('hidden'), 3200);
}

document.addEventListener("DOMContentLoaded", () => {
    const counters = document.querySelectorAll("[data-target]");
    const speed = 200; // Semakin kecil angka, semakin cepat animasi

    const startCounting = (counter) => {
      const target = +counter.getAttribute("data-target");
      const suffix = counter.getAttribute("data-suffix") || "";
      let count = 0;

      const updateCount = () => {
        const increment = target / speed;
        count += increment;

        if (count < target) {
          counter.innerText = Math.ceil(count) + suffix;
          setTimeout(updateCount, 15);
        } else {
          counter.innerText = target + suffix;
        }
      };

      updateCount();
    };

    // Menggunakan Intersection Observer agar animasi berjalan saat elemen terlihat di layar
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startCounting(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
  });
