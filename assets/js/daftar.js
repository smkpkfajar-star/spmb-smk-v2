const ICON_COPY_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
const ICON_CHECK_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"/></svg>';
const SUBMIT_LABEL = "Kirim Formulir Pendaftaran";

document.addEventListener("DOMContentLoaded", () => {
  const SHEETSON_CONFIG = window.APP_CONFIG.sheetson;
  const SUPABASE_CONFIG = window.APP_CONFIG.supabase;

  window.lastRegisteredData = null;

  initTabSwitcher();
  initFormValidationAndSubmit(SHEETSON_CONFIG, SUPABASE_CONFIG);
  initStatusChecker(SHEETSON_CONFIG);
});

/* --- 1. TAB & MOBILE MENU SWITCHER --- */
function initTabSwitcher() {
  const tabBtns = document.querySelectorAll(".tab-btn, [data-tab-link]");
  const tabPanels = document.querySelectorAll(".tab-panel");

  function switchTab(targetId) {
    tabPanels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.id !== `tab-${targetId}`);
    });

    tabBtns.forEach((btn) => {
      const match =
        btn.getAttribute("data-tab") === targetId ||
        btn.getAttribute("data-tab-link") === targetId;
      if (match) {
        btn.classList.add("active", "text-white", "bg-brand-600");
        btn.classList.remove("text-ink-600");
      } else {
        btn.classList.remove("active", "text-white", "bg-brand-600");
        btn.classList.add("text-ink-600");
      }
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target =
        btn.getAttribute("data-tab") || btn.getAttribute("data-tab-link");
      if (target) {
        if (target === "cek-status") {
          switchTab("cek-status");
        } else {
          switchTab("pendaftaran");
        }
      }
    });
  });

  if (window.location.hash === "#cek-status") {
    switchTab("cek-status");
  }
}


/* --- 2. FORM VALIDASI & SUBMIT PENDAFTARAN --- */
function initFormValidationAndSubmit(sheetConfig, supabaseConfig) {
  const regForm = document.getElementById("regForm");
  const noPendaftaranEl = document.getElementById("noPendaftaran");
  const submitBtn = document.getElementById("submitBtn");
  const jurusan1 = document.getElementById("jurusan1");
  const jurusan2 = document.getElementById("jurusan2");
  const jurusanSamaWarning = document.getElementById("jurusanSamaWarning");

  if (jurusan2 && jurusan1) {
    const cekJurusanSama = () => {
      if (jurusanSamaWarning) {
        const isSame =
          jurusan1.value && jurusan2.value && jurusan1.value === jurusan2.value;
        jurusanSamaWarning.classList.toggle("hidden", !isSame);
      }
    };
    jurusan1.addEventListener("change", cekJurusanSama);
    jurusan2.addEventListener("change", cekJurusanSama);
  }

  if (regForm) {
    initLongForm(regForm);

    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(regForm);

      // Semua pesan salah tampil sekaligus; halaman menggulir ke yang pertama
      if (!validateFormInputs(regForm, jurusan1, jurusan2, jurusanSamaWarning)) return;

      const nisnVal = document.getElementById("nisn").value.trim();
      const passwordVal = document.getElementById("password").value;
      const namaVal = document.getElementById("namaLengkap").value.trim();
      let akun = null;

      setButtonLoading(submitBtn, true, "Memeriksa NISN...");

      try {
        const existingRecords = await fetchRecordByNisn(sheetConfig, nisnVal);

        if (existingRecords.length > 0) {
          alert("Pendaftaran gagal! NISN tersebut sudah terdaftar di sistem.");
          setButtonLoading(
            submitBtn,
            false,
            SUBMIT_LABEL
          );
          return;
        }

        showUploadModal();
        startTipsRotator();

        updateUploadProgress(25, "Membuat akun siswa...");
        akun = await createStudentAccount(supabaseConfig, nisnVal, passwordVal, namaVal);

        updateUploadProgress(50, "Mengunggah berkas pendukung ke server aman...");
        const formData = await collectFormData(
          nisnVal,
          jurusan1,
          jurusan2,
          supabaseConfig,
          akun
        );

        updateUploadProgress(80, "Menyimpan data ke database pusat...");
        window.lastRegisteredData = formData;

        await sendDataToSheetson(sheetConfig, formData);
        // Catat nomor pendaftaran di akun siswa agar kiriman ganda bisa ditolak
        await akun.client.auth
          .updateUser({ data: { no_pendaftaran: formData.noPendaftaran } })
          .catch((err) => console.error("Gagal mencatat nomor di akun:", err));

        updateUploadProgress(100, "Pendaftaran Berhasil Dikirim!");
        await wait(600);

        hideUploadModal();
        setButtonLoading(
          submitBtn,
          false,
          SUBMIT_LABEL
        );
        handleRegistrationSuccess(formData);

        if (formData.uploadError) {
          alert(
            "Pendaftaran Anda BERHASIL tersimpan, tetapi berkas gagal diunggah.\n\n" +
              "Silakan klik tombol WhatsApp di bawah dan kirimkan berkas Anda langsung ke panitia."
          );
        }
      } catch (error) {
        console.error("DETAIL ERROR:", error);
        if (error.userFacing) {
          hideUploadModal();
          alert(error.message);
        } else {
          showUploadError(error.message || "Terjadi kesalahan jaringan atau server.");
        }
        setButtonLoading(
          submitBtn,
          false,
          SUBMIT_LABEL
        );
      } finally {
        // Jangan biarkan akun tetap masuk di HP yang mungkin dipakai bersama
        if (akun && akun.client) akun.client.auth.signOut().catch(() => {});
      }
    });
  }

  setupCopyButton(noPendaftaranEl);
}

/* --- FORM PANJANG: kemajuan isian & daftar isi --- */
function initLongForm(regForm) {
  initChoiceButtons();
  initBerkasInfo();
  initPasswordToggles();
  // ?jurusan=RPL dari beranda → kartu jurusan langsung terpilih
  const pilihan = new URLSearchParams(window.location.search).get("jurusan");
  if (pilihan) {
    const tile = document.querySelector(`.choice[data-for="jurusan1"][data-value="${pilihan.toUpperCase().replace(/[^A-Z]/g, "")}"]`);
    if (tile) tile.click();
  }
  const update = () => updateFormProgress(regForm);
  regForm.addEventListener("input", update);
  regForm.addEventListener("change", update);
  regForm.addEventListener("click", (e) => {
    if (e.target.closest(".choice")) update();
  });
  update();

  // Sorot bagian yang sedang dibaca di daftar isi
  const links = [...document.querySelectorAll(".section-link[data-section]")];
  if (links.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const n = entry.target.id.replace("bagian-", "");
          links.forEach((l) => {
            const on = l.dataset.section === n;
            l.classList.toggle("border-ink-900", on);
            l.classList.toggle("text-ink-900", on);
            l.classList.toggle("font-semibold", on);
            l.classList.toggle("border-transparent", !on);
            if (on) l.setAttribute("aria-current", "step");
            else l.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    links.forEach((l) => {
      const sec = document.getElementById(`bagian-${l.dataset.section}`);
      if (sec) observer.observe(sec);
    });
  }
}

function isFieldFilled(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  if (el.type === "checkbox") return el.checked;
  if (id === "nisn") return /^\d{10}$/.test(el.value.trim());
  if (id === "whatsapp" || id === "waOrtu") return /^\d{9,13}$/.test(el.value.trim());
  if (id === "password") return el.value.length >= 8;
  if (id === "passwordUlang") {
    const pw = document.getElementById("password");
    return el.value.length >= 8 && pw && el.value === pw.value;
  }
  return el.value.trim() !== "";
}

function updateFormProgress() {
  const FS = window.FormSteps;
  const filled = {};
  FS.REQUIRED_FIELDS.forEach((id) => (filled[id] = isFieldFilled(id)));
  const { sections, percent } = FS.sectionProgress(filled);
  const bar = document.getElementById("formProgress");
  const text = document.getElementById("formProgressText");
  if (bar) bar.style.width = `${percent}%`;
  if (text) text.textContent = `${percent}%`;
  document.querySelectorAll(".section-link[data-section]").forEach((link) => {
    const check = link.querySelector(".section-check");
    if (check) check.classList.toggle("hidden", !sections[link.dataset.section]);
  });
}

// Tombol pilihan besar yang mengisi <select> tersembunyi (mis. jenisKelamin)
function initChoiceButtons() {
  document.querySelectorAll(".choice[data-for]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const select = document.getElementById(btn.dataset.for);
      if (!select) return;
      select.value = btn.dataset.value;
      document.querySelectorAll(`.choice[data-for="${btn.dataset.for}"]`).forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn))
      );
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

// Tombol "Lihat" untuk menampilkan/menyembunyikan password
function initPasswordToggles() {
  document.querySelectorAll(".toggle-password[data-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Sembunyikan" : "Lihat";
      btn.setAttribute("aria-pressed", String(show));
    });
  });
}

// Tampilkan nama & ukuran berkas yang dipilih
function initBerkasInfo() {
  const input = document.getElementById("berkasFile");
  const info = document.getElementById("berkasInfo");
  if (!input || !info) return;
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) {
      info.classList.add("hidden");
      return;
    }
    const size = file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`;
    info.textContent = `✓ ${file.name} (${size})`;
    info.classList.remove("hidden");
  });
}






/* --- MODAL UPLOAD PROGRESS & TIPS INTERAKTIF --- */
let tipInterval = null;

function showUploadModal() {
  const modal = document.getElementById("uploadModal");
  const actionBtn = document.getElementById("uploadModalAction");
  if (modal) {
    modal.classList.remove("hidden");
    if (actionBtn) actionBtn.classList.add("hidden");
    document.getElementById("uploadModalIcon").className = "spinner mx-auto";
    const bar = document.getElementById("uploadProgressBar");
    if (bar) bar.className = "h-2.5 rounded-full bg-brand-600 transition-all duration-300";
    document.getElementById("uploadModalTitle").textContent =
      "Sedang mengirim pendaftaran";
    document.getElementById("uploadModalDesc").textContent =
      "Mohon jangan menutup atau merefresh halaman ini agar pendaftaran Anda sukses tercatat.";
  }
}

function hideUploadModal() {
  const modal = document.getElementById("uploadModal");
  if (modal) modal.classList.add("hidden");
  stopTipsRotator();
}

function updateUploadProgress(percentage, textStatus) {
  const progressBar = document.getElementById("uploadProgressBar");
  const desc = document.getElementById("uploadModalDesc");
  if (progressBar) progressBar.style.width = `${percentage}%`;
  if (desc && textStatus) desc.textContent = textStatus;
}

function showUploadError(errorMessage) {
  stopTipsRotator();
  const icon = document.getElementById("uploadModalIcon");
  const title = document.getElementById("uploadModalTitle");
  const desc = document.getElementById("uploadModalDesc");
  const progressBar = document.getElementById("uploadProgressBar");
  const actionBtn = document.getElementById("uploadModalAction");

  if (icon)
    icon.className = "spinner-error mx-auto";
  if (title) title.textContent = "Pendaftaran belum terkirim";
  if (desc)
    desc.textContent = `Penyebab: ${errorMessage}. Silakan periksa koneksi internet Anda dan coba lagi.`;
  if (progressBar)
    progressBar.className =
      "h-2.5 w-full rounded-full bg-red-600 transition-all duration-300";
  if (actionBtn) {
    actionBtn.classList.remove("hidden");
    const closeBtn = document.getElementById("closeUploadModalBtn");
    if (closeBtn) {
      closeBtn.onclick = () => hideUploadModal();
    }
  }
}

function startTipsRotator() {
  const tips = [
    "Tips: pastikan dokumen terbaca jelas agar verifikasi lebih cepat.",
    "Tips: simpan nomor pendaftaran untuk cek status secara berkala.",
    "Tips: berkas yang belum ada bisa disusulkan dari halaman siswa.",
    "Tips: setelah terkirim, konfirmasi ke WhatsApp panitia.",
  ];
  let index = 0;
  const tipEl = document.getElementById("uploadTipText");

  if (tipEl) {
    tipInterval = setInterval(() => {
      index = (index + 1) % tips.length;
      tipEl.textContent = tips[index];
    }, 3500);
  }
}

function stopTipsRotator() {
  if (tipInterval) {
    clearInterval(tipInterval);
    tipInterval = null;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearErrors(form) {
  form.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.classList.add("hidden");
  });
  const pernyataanError = document.getElementById("pernyataanError");
  if (pernyataanError) pernyataanError.classList.add("hidden");
}

function validateFormInputs(regForm, jurusan1, jurusan2, jurusanSamaWarning, options = { scroll: true }) {
  let isValid = true;

  const fields = {
    namaLengkap: "Nama lengkap wajib diisi.",
    jenisKelamin: "Pilih jenis kelamin.",
    tempatLahir: "Tempat lahir wajib diisi.",
    tanggalLahir: "Tanggal lahir wajib diisi.",
    agama: "Pilih agama.",
    alamat: "Alamat lengkap wajib diisi.",
    asalSekolah: "Asal SMP wajib diisi.",
    namaOrtu: "Nama orang tua/wali wajib diisi.",
  };

  for (const [id, msg] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el && !el.value.trim()) {
      showFieldError(el, msg);
      isValid = false;
    }
  }

  const nisn = document.getElementById("nisn");
  if (nisn && !/^\d{10}$/.test(nisn.value.trim())) {
    showFieldError(nisn, "NISN harus 10 angka. Lihat di rapor atau tanya sekolah asal.");
    isValid = false;
  }

  const whatsapp = document.getElementById("whatsapp");
  if (whatsapp && !/^\d{9,13}$/.test(whatsapp.value.trim())) {
    showFieldError(whatsapp, "Nomor WhatsApp harus 9–13 angka, contoh 081234567890.");
    isValid = false;
  }

  const waOrtu = document.getElementById("waOrtu");
  if (waOrtu && !/^\d{9,13}$/.test(waOrtu.value.trim())) {
    showFieldError(waOrtu, "Nomor WhatsApp orang tua harus 9–13 angka, contoh 081234567890.");
    isValid = false;
  }

  const berkasFile = document.getElementById("berkasFile");
  if (berkasFile) {
    if (berkasFile.files && berkasFile.files[0]) {
      const file = berkasFile.files[0];
      const maxAllowedSize = 5 * 1024 * 1024;

      if (file.size > maxAllowedSize) {
        showFieldError(berkasFile, "Ukuran file lebih dari 5 MB. Pilih file yang lebih kecil atau kirim lewat WhatsApp.");
        isValid = false;
      }
    }
  }

  if (jurusan1 && !jurusan1.value) {
    showFieldError(jurusan1, "Pilih jurusan utama terlebih dahulu.");
    isValid = false;
  }

  if (
    jurusan1 &&
    jurusan2 &&
    jurusan1.value &&
    jurusan2.value &&
    jurusan1.value === jurusan2.value
  ) {
    if (jurusanSamaWarning) jurusanSamaWarning.classList.remove("hidden");
    isValid = false;
  }

  const password = document.getElementById("password");
  const passwordUlang = document.getElementById("passwordUlang");
  if (password && password.value.length < 8) {
    showFieldError(password, "Password minimal 8 karakter.");
    isValid = false;
  } else if (password && passwordUlang && password.value !== passwordUlang.value) {
    showFieldError(passwordUlang, "Password tidak sama. Ketik ulang password yang sama persis.");
    isValid = false;
  }

  const pernyataan = document.getElementById("pernyataan");
  const pernyataanError = document.getElementById("pernyataanError");
  if (pernyataan && !pernyataan.checked) {
    if (pernyataanError) {
      pernyataanError.textContent =
        "Anda harus menyetujui pernyataan kebenaran data.";
      pernyataanError.classList.remove("hidden");
    }
    isValid = false;
  }

  if (!isValid && options.scroll !== false) {
    const firstError = regForm.querySelector(
      ".field-error:not(.hidden), #pernyataanError:not(.hidden)"
    );
    if (firstError)
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return isValid;
}

function showFieldError(inputEl, message) {
  const errorEl = inputEl.closest("div").querySelector(".field-error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
}

function setButtonLoading(btn, isLoading, htmlContent) {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.innerHTML = htmlContent;
}

/* --- AKUN SISWA (Supabase Auth) --- */
// Login siswa memakai NISN; alamat ini hanya pengenal, tidak pernah dikirimi email.
const STUDENT_EMAIL_DOMAIN = window.APP_CONFIG.emailDomain.siswa;

function studentEmail(nisn) {
  return `${nisn}@${STUDENT_EMAIL_DOMAIN}`;
}

function userError(message) {
  const err = new Error(message);
  err.userFacing = true;
  return err;
}

// Membuat akun siswa. Bila akun NISN ini sudah ada dan password cocok
// (kiriman ulang setelah gagal di tengah jalan), akun itu dipakai lagi.
async function createStudentAccount(supabaseConfig, nisn, password, namaLengkap) {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error("Library Supabase belum dimuat. Muat ulang halaman lalu coba lagi.");
  }
  const client = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = studentEmail(nisn);

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { nama_lengkap: namaLengkap } },
  });
  if (!error && data.session) return { client, userId: data.user.id, existing: false };
  if (!error) throw new Error("Akun dibuat tetapi belum aktif (konfirmasi email masih menyala di Supabase)");

  if (/already registered|already exists/i.test(error.message)) {
    const login = await client.auth.signInWithPassword({ email, password });
    if (!login.error) {
      const sudah = (login.data.user.user_metadata || {}).no_pendaftaran;
      if (sudah) {
        await client.auth.signOut().catch(() => {});
        throw userError(`NISN ini sudah terdaftar dengan nomor ${sudah}.\n\nCek perkembangannya di menu Cek Status.`);
      }
      return { client, userId: login.data.user.id, existing: true };
    }
    throw userError(
      "NISN ini sudah punya akun pendaftaran.\n\nKalau Anda belum pernah mendaftar, hubungi panitia lewat WhatsApp."
    );
  }
  if (/password/i.test(error.message)) {
    throw userError("Password belum memenuhi syarat. Gunakan minimal 8 karakter, campuran huruf dan angka.");
  }
  throw new Error("Gagal membuat akun siswa: " + error.message);
}

async function uploadFileToSupabase(file, akun, bucketName) {
  const fileExt = file.name.split(".").pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  // Folder "siswa/<id-akun>/" harus sama dengan policy upload di Supabase Storage.
  const filePath = `siswa/${akun.userId}/${fileName}`;

  const { error } = await akun.client.storage.from(bucketName).upload(filePath, file);
  if (error) {
    throw new Error("Supabase Storage Error: " + error.message);
  }

  const { data: publicUrlData } = akun.client.storage.from(bucketName).getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}

/* --- NOMOR PENDAFTARAN & WAKTU DAFTAR --- */
// Waktu Indonesia Barat (UTC+7) dalam bentuk "2026-11-22 15:22:27":
// mudah dibaca panitia di Google Sheets dan tetap urut bila diurutkan.
function waktuWIB(date) {
  return new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

const POLA_NOMOR = /^SPMB-\d{4}-[0-9A-Z]{4,}$/;

// Cadangan bila database belum siap: waktu (milidetik) + 6 karakter acak.
function nomorCadangan(date) {
  const acak = Array.from({ length: 6 }, () => "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 36)]).join("");
  return `SPMB-${waktuWIB(date).slice(0, 4)}-${date.getTime().toString(36).toUpperCase()}${acak}`;
}

// Nomor urut dari database Supabase (SPMB-2026-0001, 0002, ...). Database menjamin
// tidak ada nomor yang sama (kolom unik + urutan otomatis), dan kiriman ulang oleh
// akun yang sama mendapat nomor yang sama.
async function ambilNomorPendaftaran(client, now = new Date()) {
  try {
    const { data, error } = await client.rpc("ambil_no_pendaftaran");
    if (!error && typeof data === "string" && POLA_NOMOR.test(data)) return data;
    console.warn("Nomor urut database belum tersedia, memakai nomor cadangan:", error && error.message);
  } catch (err) {
    console.warn("Nomor urut database gagal, memakai nomor cadangan:", err);
  }
  return nomorCadangan(now);
}

// "2026-11-22 15:22:27" atau ISO lama → "22-11-2026 pukul 15.22 WIB"
function waktuDaftarTeks(v) {
  let s = String(v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (isNaN(d)) return "-";
    s = waktuWIB(d);
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]} pukul ${m[4]}.${m[5]} WIB` : "-";
}

async function collectFormData(nisnVal, jurusan1, jurusan2, supabaseConfig, akun) {
  const noPendaftaran = await ambilNomorPendaftaran(akun.client);
  const fileInput = document.getElementById("berkasFile");
  let fileUrl = "-";
  let fileName = "-";

  let uploadError = null;

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    fileName = file.name;
    // Gagal unggah TIDAK membatalkan pendaftaran: data tetap disimpan ke
    // spreadsheet dengan statusBerkas "Gagal Unggah", dan siswa diminta
    // mengirim berkas lewat WhatsApp panitia.
    try {
      fileUrl = await uploadFileToSupabase(file, akun, supabaseConfig.bucketName);
    } catch (err) {
      console.error("Upload berkas gagal:", err);
      uploadError = err.message || "Unggah berkas gagal";
    }
  }

  const kodeVoucherInput = document.getElementById("kodeVoucher");
  const kodeVoucherVal = kodeVoucherInput ? kodeVoucherInput.value.trim() : "";
  const isFileUploaded = fileUrl !== "-";
  let statusBerkas = "Belum Unggah";
  if (isFileUploaded) statusBerkas = "Sudah Unggah";
  else if (uploadError) statusBerkas = "Gagal Unggah";

  return {
    noPendaftaran,
    createdAt: waktuWIB(new Date()),
    namaLengkap: document.getElementById("namaLengkap").value.trim(),
    jenisKelamin: document.getElementById("jenisKelamin").value,
    nisn: nisnVal,
    tempatLahir: document.getElementById("tempatLahir").value.trim(),
    tanggalLahir: document.getElementById("tanggalLahir").value.trim(),
    agama: document.getElementById("agama").value,
    whatsapp: document.getElementById("whatsapp").value.trim(),
    alamat: document.getElementById("alamat").value.trim(),
    asalSekolah: document.getElementById("asalSekolah").value.trim(),
    namaOrtu: document.getElementById("namaOrtu").value.trim(),
    waOrtu: document.getElementById("waOrtu").value.trim(),
    jurusan1: jurusan1.value,
    jurusan2: jurusan2.value || "-",
    namaBerkas: fileName,
    urlBerkas: fileUrl,
    statusPendaftaran: "Pending",
    statusBerkas: statusBerkas,
    uploadError: uploadError,
    catatanAdmin: uploadError ? `Berkas gagal diunggah otomatis: ${uploadError}` : "-",
    tglFollowUpWa: "-",
    kodeVoucher: kodeVoucherVal || "-",
    statusVoucher: kodeVoucherVal ? "Pending" : "Tidak Ada",
    potonganBiaya: 0,
    statusBiayaDaftar: "Belum Bayar",
    metodePembayaran: "-",
    catatanBendahara: "-",
    tinggiBadan: 0,
    beratBadan: 0,
    tatoTindik: "-",
    butaWarna: "-",
    riwayatPenyakit: "-",
    catatanTesFisik: "-",
    statusTesFisik: "Belum Tes",
    ukuranSeragam: "-",
    tglUkurSeragam: "-",
  };
}

function handleRegistrationSuccess(data) {
  const regForm = document.getElementById("regForm");
  if (regForm) regForm.classList.add("hidden");
  ["formIndex", "formIntro"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const successCard = document.getElementById("successCard");
  if (!successCard) return;

  const elNoPendaftaran = document.getElementById("noPendaftaran");
  if (elNoPendaftaran) {
    elNoPendaftaran.textContent = data.noPendaftaran;
  }

  const btnWhatsApp = document.getElementById("btnWhatsApp");
  if (btnWhatsApp) {
    const nomorAdmin = "628823212784";
    const catatanBerkas = data.uploadError
      ? `\n\nBerkas *${data.namaBerkas}* gagal terunggah di website, jadi saya lampirkan lewat chat ini.`
      : "";
    const pesan = `Halo Panitia SPMB, saya telah mengisi formulir pendaftaran online.\n\n*Nama Lengkap:* ${data.namaLengkap}\n*No. Pendaftaran:* ${data.noPendaftaran}\n*Jurusan:* ${data.jurusan1 || "-"}${catatanBerkas}\n\nBerikut saya kirimkan konfirmasi pendaftaran saya. Mohon verifikasi selanjutnya. Terima kasih.`;
    const whatsappUrl = `https://wa.me/${nomorAdmin}?text=${encodeURIComponent(pesan)}`;

    const newBtnWA = btnWhatsApp.cloneNode(true);
    btnWhatsApp.parentNode.replaceChild(newBtnWA, btnWhatsApp);

    newBtnWA.addEventListener("click", (e) => {
      e.preventDefault();
      window.open(whatsappUrl, "_blank");
    });
  }

  successCard.classList.remove("hidden");
  successCard.style.opacity = "0";
  successCard.style.transform = "translateY(15px)";
  successCard.style.transition = "all 0.4s ease-out";

  requestAnimationFrame(() => {
    successCard.style.opacity = "1";
    successCard.style.transform = "translateY(0)";
  });

  successCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setupCopyButton(noPendaftaranEl) {
  const copyNoBtn = document.getElementById("copyNo");
  if (copyNoBtn && noPendaftaranEl) {
    copyNoBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(noPendaftaranEl.textContent);
      copyNoBtn.innerHTML =
        ICON_CHECK_SVG;
      setTimeout(() => {
        copyNoBtn.innerHTML = ICON_COPY_SVG;
      }, 2000);
    });
  }
}

/* --- FETCH DATA BERDASARKAN NISN --- */
// Filter "where" Sheetson tidak bisa diandalkan untuk kolom NISN (teks vs angka,
// dan baris baru kadang tidak ikut terfilter). Jadi: coba filter dulu, lalu bila
// kosong pindai semua halaman dan cocokkan NISN tanpa memedulikan nol di depan.
const SHEETSON_PAGE_SIZE = 100;

function sameNisn(a, b) {
  const norm = (v) => String(v ?? "").trim().replace(/^0+/, "");
  return norm(a) !== "" && norm(a) === norm(b);
}

// Sheetson mengirim "cache-control: max-age=14400" (4 jam) dan jawabannya
// di-cache Cloudflare. Tanpa penanda waktu, Cek Status & cek NISN membaca data basi.
async function sheetsonGet(config, query) {
  const res = await fetch(`https://api.sheetson.com/v2/sheets/Verifikasi_Berkas?${query}&_=${Date.now()}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "X-Spreadsheet-Id": config.spreadsheetId,
    },
  });
  if (!res.ok) throw new Error(`Sheetson HTTP ${res.status}`);
  return res.json();
}

async function fetchRecordByNisn(config, nisn) {
  const variants = [nisn];
  if (/^\d+$/.test(nisn)) variants.push(Number(nisn));
  for (const value of variants) {
    const json = await sheetsonGet(config, `where=${encodeURIComponent(JSON.stringify({ nisn: value }))}`);
    const rows = (json.results || []).filter((row) => sameNisn(row.nisn, nisn));
    if (rows.length) return rows;
  }

  for (let skip = 0; ; skip += SHEETSON_PAGE_SIZE) {
    const json = await sheetsonGet(config, `limit=${SHEETSON_PAGE_SIZE}&skip=${skip}`);
    const page = json.results || [];
    const rows = page.filter((row) => sameNisn(row.nisn, nisn));
    if (rows.length) return rows;
    if (!json.hasNextPage || page.length === 0) return [];
  }
}

// Contoh fungsi untuk mengubah format tanggal YYYY-MM-DD menjadi DD-MM-YYYY (Standar Indonesia)
function formatTanggalIndonesia(tanggalString) {
  if (!tanggalString) return "";
  const bagian = tanggalString.split("-"); // Memecah [YYYY, MM, DD]
  if (bagian.length !== 3) return tanggalString;
  return `${bagian[2]}-${bagian[1]}-${bagian[0]}`; // Menjadi DD-MM-YYYY
}

// fetch() tidak melempar error untuk status HTTP 4xx/5xx, jadi status dicek manual.
// Error sementara (429 / 5xx) dicoba ulang dengan jeda bertahap.
async function postToSheet(config, sheetName, body) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(`https://api.sheetson.com/v2/sheets/${sheetName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
          "X-Spreadsheet-Id": config.spreadsheetId,
        },
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      if (attempt === maxAttempts) {
        throw new Error(`Gagal terhubung ke server saat menyimpan ${sheetName}`);
      }
      await wait(1000 * attempt);
      continue;
    }

    if (res.ok) return res;

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === maxAttempts) {
      throw new Error(`Server menolak penyimpanan ${sheetName} (HTTP ${res.status})`);
    }
    await wait(1000 * attempt);
  }
}

/* --- KIRIM DATA KE SHEETSON --- */
async function sendDataToSheetson(config, data) {
  var tanggalSimpan = formatTanggalIndonesia(data.tanggalLahir);

  // Verifikasi_Berkas dipakai untuk cek NISN dobel, jadi ditulis PALING AKHIR,
  // setelah sheet lain sukses. Bila ada yang gagal, siswa masih bisa mengirim ulang
  // tanpa terblokir pesan "NISN sudah terdaftar".
  await Promise.all([
    postToSheet(config, "Data_Pendaftar", {
      noPendaftaran: data.noPendaftaran,
      createdAt: data.createdAt,
      namaLengkap: data.namaLengkap,
      jenisKelamin: data.jenisKelamin,
      nisn: data.nisn,
      tempatLahir: data.tempatLahir,
      tanggalLahir: tanggalSimpan,
      agama: data.agama,
      whatsapp: data.whatsapp,
      alamat: data.alamat,
      asalSekolah: data.asalSekolah,
      namaOrtu: data.namaOrtu,
      waOrtu: data.waOrtu,
      jurusan1: data.jurusan1,
      jurusan2: data.jurusan2,
    }),

    postToSheet(config, "Keuangan_Voucher", {
      noPendaftaran:     data.noPendaftaran,
      namaLengkap:       data.namaLengkap,
      kodeVoucher:       data.kodeVoucher,
      statusVoucher:     data.statusVoucher,
      potonganBiaya:     data.potonganBiaya,
      statusBiayaDaftar: data.statusBiayaDaftar,
      metodePembayaran:  data.metodePembayaran,
      catatanBendahara:  data.catatanBendahara,
    }),

    postToSheet(config, "Tes_Fisik_Seragam", {
      noPendaftaran:   data.noPendaftaran,
      namaLengkap:     data.namaLengkap,
      tinggiBadan:     data.tinggiBadan,
      beratBadan:      data.beratBadan,
      tatoTindik:      data.tatoTindik,
      catatanTesFisik: data.catatanTesFisik,
      statusTesFisik:  data.statusTesFisik,
      ukuranSeragam:   data.ukuranSeragam,
      tglUkurSeragam:  data.tglUkurSeragam,
    }),
  ]);

  await postToSheet(config, "Verifikasi_Berkas", {
    noPendaftaran:     data.noPendaftaran,
    namaLengkap:       data.namaLengkap,
    nisn:              data.nisn,
    jurusan1:          data.jurusan1,
    jurusan2:          data.jurusan2,
    namaBerkas:        data.namaBerkas,
    urlBerkas:         data.urlBerkas,
    statusBerkas:      data.statusBerkas,
    catatanAdmin:      data.catatanAdmin,
    waOrtu:            data.waOrtu,
    tglFollowUpWa:     data.tglFollowUpWa,
    statusPendaftaran: data.statusPendaftaran,
  });
}

/* --- GENERATE PDF --- */
window.triggerDownloadPDF = function () {
  if (window.lastRegisteredData) {
    generatePDF(window.lastRegisteredData);
  } else {
    alert("Belum ada data pendaftaran aktif pada sesi ini.");
  }
};

const NAMA_JURUSAN = {
  TKR: "Teknik Kendaraan Ringan (TKR)",
  TSM: "Teknik Sepeda Motor (TSM)",
  TITL: "Teknik Instalasi Tenaga Listrik (TITL)",
  RPL: "Rekayasa Perangkat Lunak (RPL)",
  DKV: "Desain Komunikasi Visual (DKV)",
};

// Isi bukti pendaftaran (tanpa jsPDF, agar bisa dites)
function buildPdfContent(data, siswaUrl) {
  const v = (x) => (x === undefined || x === null || String(x).trim() === "" ? "-" : String(x));
  const jurusan = (k) => (k && k !== "-" ? NAMA_JURUSAN[k] || k : "-");
  return {
    school: "SMK TAMANSISWA JETIS",
    title: "BUKTI PENDAFTARAN ONLINE",
    subtitle: "Penerimaan Peserta Didik Baru (SPMB) Tahun Ajaran 2026/2027",
    noPendaftaran: v(data.noPendaftaran),
    sections: [
      {
        heading: "A. Data Diri Calon Siswa",
        rows: [
          ["Nama Lengkap", v(data.namaLengkap)],
          ["NISN", v(data.nisn)],
          ["Jenis Kelamin", v(data.jenisKelamin)],
          ["Tempat, Tanggal Lahir", `${v(data.tempatLahir)}, ${v(formatTanggalIndonesia(data.tanggalLahir))}`],
          ["Agama", v(data.agama)],
          ["No. WhatsApp Siswa", v(data.whatsapp)],
          ["Asal Sekolah", v(data.asalSekolah)],
          ["Alamat", v(data.alamat)],
          ["Berkas Diunggah", v(data.namaBerkas)],
        ],
      },
      {
        heading: "B. Orang Tua & Pilihan Jurusan",
        rows: [
          ["Nama Orang Tua/Wali", v(data.namaOrtu)],
          ["No. WhatsApp Ortu", v(data.waOrtu)],
          ["Jurusan Utama", jurusan(data.jurusan1)],
          ["Jurusan Cadangan", jurusan(data.jurusan2)],
          ["Status Pendaftaran", v(data.statusPendaftaran)],
          ["Waktu Pendaftaran", waktuDaftarTeks(data.createdAt)],
        ],
      },
    ],
    loginNote:
      `Lengkapi berkas atau cek berkas di ${siswaUrl} ` +
      "dengan login memakai NISN dan password yang dibuat saat mendaftar. Jangan beri tahu password ke siapa pun.",
  };
}

function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const siswaUrl = new URL("../#login", window.location.href).href;
  const c = buildPdfContent(data, siswaUrl);
  const GREEN = [23, 23, 23]; // judul & nomor: hitam arang (design.md)
  const GOLD = [242, 181, 58];
  const INK = [28, 42, 34];
  const MUTED = [75, 90, 80];
  const LABEL_X = 25;
  const COLON_X = 72;
  const VALUE_X = 75;
  const VALUE_W = 190 - VALUE_X;
  const LINE = 6.2;

  // Kepala
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(c.school, 105, 20, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFontSize(12);
  doc.text(c.title, 105, 27, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(c.subtitle, 105, 33, { align: "center" });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(20, 37, 190, 37);

  // Nomor pendaftaran
  doc.setFillColor(254, 247, 230);
  doc.roundedRect(20, 42, 170, 18, 3, 3, "F");
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Nomor Pendaftaran", 26, 53);
  doc.setTextColor(...GREEN);
  doc.setFontSize(16);
  doc.text(c.noPendaftaran, 184, 53.5, { align: "right" });

  // Isi
  let y = 71;
  c.sections.forEach((section) => {
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(section.heading, 20, y);
    y += 7;
    doc.setFontSize(10);
    section.rows.forEach(([label, value]) => {
      const lines = doc.splitTextToSize(value, VALUE_W);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(label, LABEL_X, y);
      doc.text(":", COLON_X, y);
      doc.setTextColor(...INK);
      doc.text(lines, VALUE_X, y);
      y += LINE * lines.length;
    });
    y += 5;
  });

  // Catatan login
  doc.setFillColor(250, 247, 242);
  const note = doc.splitTextToSize(c.loginNote, 160);
  const noteH = note.length * 5 + 8;
  doc.roundedRect(20, y, 170, noteH, 3, 3, "F");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(note, 25, y + 6.5);
  y += noteH + 12;

  // Penutup
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const dicetak = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  doc.text("Simpan bukti pendaftaran ini sebagai tanda bukti yang sah.", 20, y);
  doc.text(`Yogyakarta, ${dicetak}`, 150, y + 10, { align: "center" });
  doc.setTextColor(...INK);
  doc.text("Panitia SPMB", 150, y + 16, { align: "center" });
  doc.text("( ____________________ )", 150, y + 36, { align: "center" });

  doc.save(`Bukti-Pendaftaran-${c.noPendaftaran}.pdf`);
}

/* --- 3. CEK STATUS PENDAFTARAN --- */
function initStatusChecker(config) {
  const cekStatusForm = document.getElementById("cekStatusForm");
  const cekNisn = document.getElementById("cekNisn");
  const cekStatusError = document.getElementById("cekStatusError");
  const statusResult = document.getElementById("statusResult");

  if (!cekStatusForm) return;

  cekStatusForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nisnVal = cekNisn ? cekNisn.value.trim() : "";

    if (cekStatusError) cekStatusError.classList.add("hidden");
    if (statusResult) statusResult.classList.add("hidden");

    if (!/^\d{10}$/.test(nisnVal)) {
      if (cekStatusError) {
        cekStatusError.textContent =
          "Masukkan NISN yang valid (10 digit angka).";
        cekStatusError.classList.remove("hidden");
      }
      return;
    }

    const cekBtn = cekStatusForm.querySelector('button[type="submit"]');
    const originalBtnText = cekBtn ? cekBtn.innerHTML : "Cek Status";

    setButtonLoading(
      cekBtn,
      true,
      'Memeriksa…'
    );

    try {
      const records = await fetchRecordByNisn(config, nisnVal);

      console.log(records);
      

      if (!records || records.length === 0) {
        if (cekStatusError) {
          cekStatusError.textContent =
            "NISN tidak ditemukan. Pastikan Anda sudah mendaftar.";
          cekStatusError.classList.remove("hidden");
        }
        return;
      }

      renderStatusResult(records[0], statusResult);
    } catch (err) {
      console.error("Gagal Cek Status:", err);
      if (cekStatusError) {
        cekStatusError.textContent =
          "Gagal terhubung ke server untuk memeriksa status.";
        cekStatusError.classList.remove("hidden");
      }
    } finally {
      // Button SELALU direset, termasuk saat early return
      setButtonLoading(cekBtn, false, originalBtnText);
    }
  });

  document.querySelectorAll(".tryNisn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (cekNisn) {
        cekNisn.value = btn.getAttribute("data-nisn");
        // bubbles: true agar event submit ter-trigger di semua browser
        cekStatusForm.dispatchEvent(new Event("submit", { bubbles: true }));
      }
    });
  });
}

function escapeText(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STATUS_LABEL = {
  Pending: { text: "Menunggu verifikasi", tone: "wait" },
  Diverifikasi: { text: "Diverifikasi", tone: "info" },
  Diterima: { text: "Diterima", tone: "ok" },
  Ditolak: { text: "Tidak diterima", tone: "bad" },
};
function statusLabel(status) {
  return STATUS_LABEL[String(status || "").trim()] || STATUS_LABEL.Pending;
}

// Tahapan seleksi: done | active | todo | bad | skip
function statusStages(status) {
  const s = String(status || "").trim();
  const verified = ["Diverifikasi", "Diterima", "Ditolak"].includes(s);
  return [
    { label: "Terdaftar", desc: "Formulir diterima sistem.", state: "done" },
    { label: "Verifikasi berkas", desc: "Panitia memeriksa data & berkas.", state: verified ? "done" : "active" },
    {
      label: "Pengumuman",
      desc: s === "Diterima" ? "Selamat, kamu dinyatakan diterima." : s === "Ditolak" ? "Mohon maaf, belum dapat diterima." : "Menunggu hasil seleksi.",
      state: s === "Diterima" ? "done" : s === "Ditolak" ? "bad" : s === "Diverifikasi" ? "active" : "todo",
    },
    {
      label: "Daftar ulang",
      desc: s === "Diterima" ? "Segera lakukan daftar ulang." : s === "Ditolak" ? "Tidak berlaku." : "Setelah pengumuman.",
      state: s === "Diterima" ? "active" : s === "Ditolak" ? "skip" : "todo",
    },
  ];
}

const TONE_DOT_COLOR = { ok: "#16A34A", bad: "#DC2626", wait: "#D97706", info: "#0369A1" };

function renderStatusResult(found, statusResultEl) {
  if (!statusResultEl) return;
  const label = statusLabel(found.statusPendaftaran);
  const stages = statusStages(found.statusPendaftaran);
  const val = (v) => (v && v !== "-" ? v : "");
  const catatan = val(found.catatanAdmin) && !/^Berkas gagal diunggah otomatis/.test(found.catatanAdmin) ? found.catatanAdmin : "";
  const jurusan = val(found.jurusan1) ? (NAMA_JURUSAN[found.jurusan1] || found.jurusan1) : "-";
  const siswaUrl = new URL("../#login", window.location.href).href;

  const dot = (st) =>
    ({
      done: '<span class="grid h-6 w-6 place-items-center rounded-full bg-ink-900 text-[12px] text-white">✓</span>',
      active: '<span class="grid h-6 w-6 place-items-center rounded-full bg-white ring-2 ring-gold-500"><span class="h-2.5 w-2.5 rounded-full bg-gold-500"></span></span>',
      bad: '<span class="grid h-6 w-6 place-items-center rounded-full bg-red-600 text-[13px] font-semibold text-white">!</span>',
      todo: '<span class="block h-6 w-6 rounded-full bg-white ring-[1.5px] ring-line/50"></span>',
      skip: '<span class="block h-6 w-6 rounded-full bg-sand ring-1 ring-hairline"></span>',
    })[st];

  const waMessage = encodeURIComponent(
    `Halo Panitia SPMB, saya ingin menanyakan status pendaftaran.\n\n` +
      `*No. Pendaftaran:* ${found.noPendaftaran || "-"}\n*NISN:* ${found.nisn || "-"}\n` +
      `*Nama:* ${found.namaLengkap || "-"}\n*Status saat ini:* ${label.text}\n\nTerima kasih.`
  );

  statusResultEl.innerHTML = `
    <div class="flex flex-col gap-4 border-b border-hairline p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div class="min-w-0">
        <p class="text-[24px] font-semibold leading-tight tracking-tight">${escapeText(found.namaLengkap || "-")}</p>
        <p class="mt-1 font-mono text-[13px] text-ink-500">${escapeText(found.noPendaftaran || "-")} · NISN ${escapeText(found.nisn || "-")}</p>
      </div>
      <span class="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-sand px-3.5 py-1.5 text-[14px] font-medium">
        <span class="h-2 w-2 rounded-full" style="background:${TONE_DOT_COLOR[label.tone]}"></span>${escapeText(label.text)}
      </span>
    </div>

    <dl class="grid border-b border-hairline sm:grid-cols-3">
      <div class="border-b border-hairline p-5 sm:border-b-0 sm:border-r sm:p-6">
        <dt class="text-[13px] text-ink-500">Jurusan pilihan</dt>
        <dd class="mt-1 text-[15px] font-medium">${escapeText(jurusan)}</dd>
      </div>
      <div class="border-b border-hairline p-5 sm:border-b-0 sm:border-r sm:p-6">
        <dt class="text-[13px] text-ink-500">Status berkas</dt>
        <dd class="mt-1 text-[15px] font-medium">${escapeText(val(found.statusBerkas) || "Belum unggah")}</dd>
      </div>
      <div class="p-5 sm:p-6">
        <dt class="text-[13px] text-ink-500">Berkas menyusul?</dt>
        <dd class="mt-1"><a href="${escapeText(siswaUrl)}" class="text-[15px] font-medium underline underline-offset-4">Lengkapi berkas →</a></dd>
      </div>
    </dl>

    <div class="p-5 sm:p-6">
      <h3 class="font-mono text-[12.8px] text-ink-500">tahapan seleksi</h3>
      <ol class="mt-5 grid gap-5 sm:grid-cols-4 sm:gap-0">
        ${stages
          .map(
            (st, i) => `<li class="relative flex gap-3 sm:block sm:pr-4">
              ${i < stages.length - 1 ? `<span class="absolute left-3 top-7 h-[calc(100%-4px)] w-px sm:left-7 sm:top-3 sm:h-px sm:w-[calc(100%-32px)] ${["done", "active", "bad"].includes(stages[i + 1].state) ? "bg-ink-900" : "bg-hairline"}" aria-hidden="true"></span>` : ""}
              <span class="relative z-10 shrink-0">${dot(st.state)}</span>
              <span class="block sm:mt-3">
                <span class="block text-[15px] font-medium ${st.state === "todo" || st.state === "skip" ? "text-ink-500" : st.state === "bad" ? "text-red-600" : ""}">${escapeText(st.label)}</span>
                <span class="mt-0.5 block text-[13.5px] leading-snug text-ink-500">${escapeText(st.desc)}</span>
              </span>
            </li>`
          )
          .join("")}
      </ol>

      ${
        catatan
          ? `<div class="mt-6 border-l-2 border-gold-500 bg-warn-50 px-4 py-3">
              <p class="font-mono text-[12px] text-warn-700">catatan panitia</p>
              <p class="mt-1 text-[15px] text-ink-900">${escapeText(catatan)}</p>
            </div>`
          : ""
      }

      <div class="mt-6 flex flex-col gap-3 sm:flex-row" id="timelineContainer">
        <a id="btnWhatsAppStatus" href="https://wa.me/628823212784?text=${waMessage}" target="_blank" rel="noopener" class="btn inline-flex h-12 items-center justify-center rounded-full bg-ink-900 px-6 text-[15px] font-semibold text-white">Tanya status lewat WhatsApp</a>
        <a href="${escapeText(siswaUrl)}" class="btn inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold shadow-[inset_0_0_0_1px_#D4D4D4]">Lengkapi berkas</a>
      </div>
    </div>`;

  statusResultEl.classList.remove("hidden");
  statusResultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
