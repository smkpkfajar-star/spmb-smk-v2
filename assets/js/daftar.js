document.addEventListener("DOMContentLoaded", () => {
  const SHEETSON_CONFIG = {
    apiKey: "oGKHOLLKHVzlDAWCpD2zHUWGSj3G4o8l2vajRqzpBW6e3Ha1SgJWLRxwAPk",
    spreadsheetId: "1vFCAMSse_I294GIaqVRKNP4L-Zpw8pr1EHgzJqxdYUs",
  };

  const SUPABASE_CONFIG = {
    url: "https://ldozvlpdsobuyyccomfo.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxkb3p2bHBkc29idXl5Y2NvbWZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDg0OTI2OCwiZXhwIjoyMTA2NDI1MjY4fQ.yL75HvLTDRD2AQr3CAUYDvpJstcqnEkUklTy16pTP8Q",
    bucketName: "spmb-berkas",
  };

  window.lastRegisteredData = null;

  initTabSwitcher();
  initFormValidationAndSubmit(SHEETSON_CONFIG, SUPABASE_CONFIG);
  initStatusChecker(SHEETSON_CONFIG);
  initMobileMenu();
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
        btn.classList.remove("text-slate-600");
      } else {
        btn.classList.remove("active", "text-white", "bg-brand-600");
        btn.classList.add("text-slate-600");
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

function initMobileMenu() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuIcon = document.getElementById("menu-icon");

  if (menuBtn && mobileMenu && menuIcon) {
    menuBtn.addEventListener("click", () => {
      const isHidden = mobileMenu.classList.contains("hidden");
      if (isHidden) {
        mobileMenu.classList.remove("hidden");
        menuIcon.classList.remove("fa-bars");
        menuIcon.classList.add("fa-xmark");
      } else {
        mobileMenu.classList.add("hidden");
        menuIcon.classList.remove("fa-xmark");
        menuIcon.classList.add("fa-bars");
      }
    });

    mobileMenu.querySelectorAll("button, a").forEach((el) => {
      el.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
        menuIcon.classList.remove("fa-xmark");
        menuIcon.classList.add("fa-bars");
      });
    });
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
    jurusan2.addEventListener("change", () => {
      if (jurusanSamaWarning) {
        const isSame =
          jurusan1.value && jurusan2.value && jurusan1.value === jurusan2.value;
        jurusanSamaWarning.classList.toggle("hidden", !isSame);
      }
    });
  }

  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(regForm);

      if (!validateFormInputs(regForm, jurusan1, jurusan2, jurusanSamaWarning))
        return;

      const nisnVal = document.getElementById("nisn").value.trim();

      setButtonLoading(submitBtn, true, "Memeriksa NISN...");

      try {
        const existingRecords = await fetchRecordByNisn(sheetConfig, nisnVal);

        if (existingRecords.length > 0) {
          alert("Pendaftaran gagal! NISN tersebut sudah terdaftar di sistem.");
          setButtonLoading(
            submitBtn,
            false,
            '<i class="fa-solid fa-paper-plane"></i> Kirim Formulir Pendaftaran'
          );
          return;
        }

        showUploadModal();
        startTipsRotator();

        updateUploadProgress(25, "Menyiapkan data pendaftaran...");
        await wait(500);

        updateUploadProgress(50, "Mengunggah berkas pendukung ke server aman...");
        const formData = await collectFormData(
          nisnVal,
          jurusan1,
          jurusan2,
          supabaseConfig
        );

        updateUploadProgress(80, "Menyimpan data ke database pusat...");
        window.lastRegisteredData = formData;

        await sendDataToSheetson(sheetConfig, formData);

        updateUploadProgress(100, "Pendaftaran Berhasil Dikirim!");
        await wait(600);

        hideUploadModal();
        setButtonLoading(
          submitBtn,
          false,
          '<i class="fa-solid fa-paper-plane"></i> Kirim Formulir Pendaftaran'
        );
        handleRegistrationSuccess(formData);
      } catch (error) {
        console.error("DETAIL ERROR:", error);
        showUploadError(error.message || "Terjadi kesalahan jaringan atau server.");
        setButtonLoading(
          submitBtn,
          false,
          '<i class="fa-solid fa-paper-plane"></i> Kirim Formulir Pendaftaran'
        );
      }
    });
  }

  setupCopyButton(noPendaftaranEl);
}

/* --- MODAL UPLOAD PROGRESS & TIPS INTERAKTIF --- */
let tipInterval = null;

function showUploadModal() {
  const modal = document.getElementById("uploadModal");
  const actionBtn = document.getElementById("uploadModalAction");
  if (modal) {
    modal.classList.remove("hidden");
    if (actionBtn) actionBtn.classList.add("hidden");
    document.getElementById("uploadModalIcon").className =
      "fa-solid fa-cloud-arrow-up animate-bounce text-brand-600";
    document.getElementById("uploadModalTitle").textContent =
      "Sedang Mengunggah Berkas & Data";
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
    icon.className =
      "fa-solid fa-triangle-exclamation text-rose-600 animate-pulse";
  if (title) title.textContent = "Gagal Mengunggah Berkas / Data!";
  if (desc)
    desc.textContent = `Penyebab: ${errorMessage}. Silakan periksa koneksi internet Anda dan coba lagi.`;
  if (progressBar)
    progressBar.className =
      "bg-rose-600 h-2.5 rounded-full transition-all duration-300 w-full";
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
    "💡 Tips: Pastikan dokumen yang diunggah terbaca jelas agar verifikasi lebih cepat.",
    "🚀 Tahukah kamu? Sekolah kami memiliki fasilitas laboratorium komputer berstandar industri.",
    "⭐ Sabar ya, sistem sedang mengenkripsi data kamu agar aman sampai ke panitia.",
    "🎯 Jangan lupa catat Nomor Pendaftaran setelah sukses terkirim untuk cek status secara berkala!",
    "📱 Kamu juga bisa langsung konfirmasi ke WhatsApp panitia setelah form berhasil terkirim.",
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

function validateFormInputs(regForm, jurusan1, jurusan2, jurusanSamaWarning) {
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
    showFieldError(nisn, "NISN harus tepat 10 digit angka.");
    isValid = false;
  }

  const whatsapp = document.getElementById("whatsapp");
  if (whatsapp && !/^\d{9,13}$/.test(whatsapp.value.trim())) {
    showFieldError(whatsapp, "Nomor WhatsApp tidak valid (9-13 digit).");
    isValid = false;
  }

  const waOrtu = document.getElementById("waOrtu");
  if (waOrtu && !/^\d{9,13}$/.test(waOrtu.value.trim())) {
    showFieldError(waOrtu, "Nomor WA Orang Tua tidak valid.");
    isValid = false;
  }

  const berkasFile = document.getElementById("berkasFile");
  if (berkasFile) {
    if (berkasFile.files && berkasFile.files[0]) {
      const file = berkasFile.files[0];
      const maxAllowedSize = 5 * 1024 * 1024;

      if (file.size > maxAllowedSize) {
        showFieldError(berkasFile, "Ukuran file terlalu besar! Maksimal 5MB.");
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

  if (!isValid) {
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

async function uploadFileToSupabase(file, supabaseConfig) {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error(
      "Library Supabase belum dimuat di HTML. Tambahkan script CDN Supabase."
    );
  }

  const supabase = window.supabase.createClient(
    supabaseConfig.url,
    supabaseConfig.anonKey
  );

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabase.storage
    .from(supabaseConfig.bucketName)
    .upload(filePath, file);

  if (error) {
    throw new Error("Supabase Storage Error: " + error.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from(supabaseConfig.bucketName)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

async function collectFormData(nisnVal, jurusan1, jurusan2, supabaseConfig) {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const fileInput = document.getElementById("berkasFile");
  let fileUrl = "-";
  let fileName = "-";

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    fileName = file.name;
    fileUrl = await uploadFileToSupabase(file, supabaseConfig);
  }

  const kodeVoucherInput = document.getElementById("kodeVoucher");
  const kodeVoucherVal = kodeVoucherInput ? kodeVoucherInput.value.trim() : "";
  const isFileUploaded = fileUrl !== "-";

  return {
    noPendaftaran: `SPMB-${randomNum}`,
    createdAt: new Date().toISOString(),
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
    statusBerkas: isFileUploaded ? "Sudah Unggah" : "Belum Unggah",
    catatanAdmin: "-",
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

  const successCard = document.getElementById("successCard");
  if (!successCard) return;

  const elNoPendaftaran = document.getElementById("noPendaftaran");
  if (elNoPendaftaran) {
    elNoPendaftaran.textContent = data.noPendaftaran;
  }

  const btnWhatsApp = document.getElementById("btnWhatsApp");
  if (btnWhatsApp) {
    const nomorAdmin = "6281332517626";
    const pesan = `Halo Panitia SPMB, saya telah mengisi formulir pendaftaran online.\n\n*Nama Lengkap:* ${data.namaLengkap}\n*No. Pendaftaran:* ${data.noPendaftaran}\n*Jurusan:* ${data.jurusan1 || "-"}\n\nBerikut saya kirimkan konfirmasi pendaftaran saya. Mohon verifikasi selanjutnya. Terima kasih.`;
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
        '<i class="fa-solid fa-check text-emerald-600"></i>';
      setTimeout(() => {
        copyNoBtn.innerHTML = '<i class="fa-regular fa-copy text-base"></i>';
      }, 2000);
    });
  }
}

/* --- FETCH DATA BERDASARKAN NISN --- */
async function fetchRecordByNisn(config, nisn) {
  // Sheetson v2: gunakan where untuk filter kolom
  const whereClause = encodeURIComponent(JSON.stringify({ nisn: nisn }));
  const url = `https://api.sheetson.com/v2/sheets/Verifikasi_Berkas?where=${whereClause}`;
  console.log("🌐 Sedang mengambil data dari URL:", url);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "X-Spreadsheet-Id": config.spreadsheetId,
      },
    });

    const textResponse = await res.text();
    console.log("📥 Respon Mentah dari Sheetson:", textResponse);

    const json = JSON.parse(textResponse);
    console.log("📊 Objek JSON Parsed:", json);

    // Sheetson v2 menggunakan 'results'
    const records = json.results || json.data || [];
    console.log("🔍 Data array yang ditemukan:", records);

    return records;
  } catch (error) {
    console.error("❌ Gagal melakukan fetch ke Sheetson:", error);
    return [];
  }
}

/* --- KIRIM DATA KE SHEETSON --- */
async function sendDataToSheetson(config, data) {
  await Promise.all([
    fetch(`https://api.sheetson.com/v2/sheets/Data_Pendaftar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Spreadsheet-Id": config.spreadsheetId,
      },
      body: JSON.stringify({
        noPendaftaran: data.noPendaftaran,
        createdAt: data.createdAt,
        namaLengkap: data.namaLengkap,
        jenisKelamin: data.jenisKelamin,
        nisn: data.nisn,
        tempatLahir: data.tempatLahir,
        tanggalLahir: data.tanggalLahir,
        agama: data.agama,
        whatsapp: data.whatsapp,
        alamat: data.alamat,
        asalSekolah: data.asalSekolah,
        namaOrtu: data.namaOrtu,
        waOrtu: data.waOrtu,
        jurusan1: data.jurusan1,
        jurusan2: data.jurusan2,
      }),
    }),

    fetch(`https://api.sheetson.com/v2/sheets/Verifikasi_Berkas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Spreadsheet-Id": config.spreadsheetId,
      },
      body: JSON.stringify({
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
      }),
    }),

    fetch(`https://api.sheetson.com/v2/sheets/Keuangan_Voucher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Spreadsheet-Id": config.spreadsheetId,
      },
      body: JSON.stringify({
        noPendaftaran:    data.noPendaftaran,
        namaLengkap:      data.namaLengkap,
        kodeVoucher:      data.kodeVoucher,
        statusVoucher:    data.statusVoucher,
        potonganBiaya:    data.potonganBiaya,
        statusBiayaDaftar: data.statusBiayaDaftar,
        metodePembayaran: data.metodePembayaran,
        catatanBendahara: data.catatanBendahara,
      }),
    }),

    fetch(`https://api.sheetson.com/v2/sheets/Tes_Fisik_Seragam`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Spreadsheet-Id": config.spreadsheetId,
      },
      body: JSON.stringify({
        noPendaftaran:  data.noPendaftaran,
        namaLengkap:    data.namaLengkap,
        tinggiBadan:    data.tinggiBadan,
        beratBadan:     data.beratBadan,
        tatoTindik:     data.tatoTindik,
        catatanTesFisik: data.catatanTesFisik,
        statusTesFisik: data.statusTesFisik,
        ukuranSeragam:  data.ukuranSeragam,
        tglUkurSeragam: data.tglUkurSeragam,
      }),
    }),
  ]);
}

/* --- GENERATE PDF --- */
window.triggerDownloadPDF = function () {
  if (window.lastRegisteredData) {
    generatePDF(window.lastRegisteredData);
  } else {
    alert("Belum ada data pendaftaran aktif pada sesi ini.");
  }
};

function generatePDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PANITIA PENERIMAAN PESERTA DIDIK BARU (SPMB)", 105, 20, {
    align: "center",
  });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("BUKTI REGISTRASI ONLINE - TAHUN AJARAN 2026/2027", 105, 27, {
    align: "center",
  });

  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);

  doc.setFillColor(240, 243, 255);
  doc.rect(20, 38, 170, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Nomor Pendaftaran:", 25, 49);
  doc.setTextColor(79, 70, 229);
  doc.text(data.noPendaftaran, 70, 49);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("A. Data Diri Calon Siswa", 20, 68);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  let startY = 75;
  const lineHeight = 7;
  const labels = [
    ["Nama Lengkap", `: ${data.namaLengkap}`],
    ["NISN", `: ${data.nisn}`],
    ["Jenis Kelamin", `: ${data.jenisKelamin}`],
    ["Tempat, Tanggal Lahir", `: ${data.tempatLahir}, ${data.tanggalLahir}`],
    ["Agama", `: ${data.agama}`],
    ["No. WhatsApp Siswa", `: ${data.whatsapp}`],
    ["Asal Sekolah (SMP)", `: ${data.asalSekolah}`],
    ["Alamat", `: ${data.alamat}`],
    ["Berkas Diunggah", `: ${data.namaBerkas || "-"}`],
  ];

  labels.forEach(([label, val]) => {
    doc.text(label, 25, startY);
    doc.text(val, 65, startY);
    startY += lineHeight;
  });

  startY += 5;
  doc.setFont("helvetica", "bold");
  doc.text("B. Data Orang Tua & Pilihan Jurusan", 20, startY);
  startY += 7;

  doc.setFont("helvetica", "normal");
  const labels2 = [
    ["Nama Orang Tua/Wali", `: ${data.namaOrtu}`],
    ["No. WhatsApp Ortu", `: ${data.waOrtu}`],
    ["Pilihan Jurusan Utama", `: ${data.jurusan1}`],
    ["Pilihan Jurusan Cadangan", `: ${data.jurusan2}`],
    ["Status Pendaftaran", `: ${data.statusPendaftaran}`],
  ];

  labels2.forEach(([label, val]) => {
    doc.text(label, 25, startY);
    doc.text(val, 65, startY);
    startY += lineHeight;
  });

  startY += 15;
  doc.text(
    "Simpan bukti pendaftaran ini sebagai tanda bukti yang sah.",
    20,
    startY
  );

  doc.text("Panitia SPMB", 150, startY + 10, { align: "center" });
  doc.text("( ____________________ )", 150, startY + 28, { align: "center" });

  doc.save(`Bukti-Pendaftaran-${data.noPendaftaran}.pdf`);
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
      '<i class="fa-solid fa-spinner animate-spin"></i> Memeriksa...'
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

function renderStatusResult(found, statusResultEl) {
  const resNama    = document.getElementById("resNama");
  const resNisn    = document.getElementById("resNisn");
  const resJurusan = document.getElementById("resJurusan");
  const resBadge   = document.getElementById("resBadge");

  if (resNama)    resNama.textContent    = found.namaLengkap || "-";
  if (resNisn)    resNisn.textContent    = found.nisn        || "-";
  if (resJurusan) resJurusan.textContent = found.jurusan1    || "-";

  if (resBadge) {
    resBadge.className =
      "self-start sm:self-auto text-xs font-bold px-4 py-2 rounded-full";
  }

  let timelineContainer = document.getElementById("timelineContainer");
  if (!timelineContainer && statusResultEl) {
    timelineContainer = document.createElement("div");
    timelineContainer.id = "timelineContainer";
    statusResultEl.appendChild(timelineContainer);
  }

  // ✅ Hanya 4 status yang dipakai
  const status = found.statusPendaftaran
    ? found.statusPendaftaran.trim()
    : "Pending";

  // 4 kondisi utama
  const isPending     = status === "Pending";
  const isDiverifikasi = status === "Diverifikasi";
  const isDiterima    = status === "Diterima";
  const isDitolak     = status === "Ditolak";

  // 4 step — selesai berdasarkan urutan status
  const step1Done = !isPending || isDiverifikasi || isDiterima || isDitolak;
  const step2Done = isDiverifikasi || isDiterima || isDitolak;
  const step3Done = isDiterima || isDitolak;
  const step4Done = isDiterima;

  // Badge
  if (resBadge) {
    if (isDiterima) {
      resBadge.textContent = "Diterima";
      resBadge.classList.add("bg-emerald-100", "text-emerald-700");
    } else if (isDitolak) {
      resBadge.textContent = "Tidak Diterima";
      resBadge.classList.add("bg-rose-100", "text-rose-700");
    } else if (isDiverifikasi) {
      resBadge.textContent = "Diverifikasi";
      resBadge.classList.add("bg-blue-100", "text-blue-700");
    } else {
      resBadge.textContent = "Menunggu Verifikasi";
      resBadge.classList.add("bg-amber-100", "text-amber-800");
    }
  }

  function dotClass(isDone, isActive, isRed = false) {
    if (isDone && isRed) return "bg-rose-500";
    if (isDone)          return "bg-emerald-500";
    if (isActive)        return "bg-brand-500 animate-pulse";
    return "bg-slate-300";
  }

  function timelineStep(dotDone, isActive, title, desc, isRed = false) {
    return `
      <div class="relative">
        <div class="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full
          ${dotClass(dotDone, isActive, isRed)} ring-4 ring-white shadow-sm"></div>
        <h4 class="text-sm font-bold ${dotDone ? "text-slate-800" : "text-slate-400"} leading-tight">
          ${title}
        </h4>
        <p class="text-xs text-slate-500 mt-1">${desc}</p>
      </div>
    `;
  }

  if (timelineContainer) {
    timelineContainer.innerHTML = `
      <div class="space-y-3 pt-4">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tahapan Seleksi</h3>

        <div class="relative pl-6 space-y-6 border-l-2 border-slate-200 ml-2 my-2">

          ${timelineStep(
            step1Done, isPending,
            "📋 Pendaftaran Diterima",
            step1Done
              ? "Formulir pendaftaran Anda telah berhasil diterima sistem."
              : "Pendaftaran belum masuk ke sistem."
          )}

          ${timelineStep(
            step2Done, step1Done && !step2Done,
            "🔎 Verifikasi Berkas",
            step2Done
              ? `Berkas <strong>${found.namaBerkas || "dokumen"}</strong> telah diverifikasi panitia.${
                  found.catatanAdmin && found.catatanAdmin !== "-"
                    ? `<br><span class="text-amber-600 font-medium">Catatan: ${found.catatanAdmin}</span>`
                    : ""
                }`
              : "Panitia sedang memeriksa berkas pendaftaran Anda."
          )}

          ${timelineStep(
            step3Done, step2Done && !step3Done,
            isDitolak ? "❌ Tidak Diterima" : "🏆 Pengumuman Hasil",
            step3Done
              ? isDiterima
                ? "Selamat! Anda dinyatakan <strong class='text-emerald-600'>LULUS</strong> seleksi."
                : "Mohon maaf, Anda belum dapat diterima pada seleksi ini."
              : "Menunggu hasil sidang pleno seleksi.",
            isDitolak && step3Done
          )}

          ${timelineStep(
            step4Done, isDiterima && !step4Done,
            "📝 Daftar Ulang",
            step4Done
              ? "Selamat bergabung! Proses daftar ulang telah selesai."
              : isDitolak
              ? "Tahap ini tidak berlaku."
              : "Segera lakukan daftar ulang sesuai jadwal.",
          )}

        </div>

        <div class="pt-4 border-t border-slate-100">
          <a id="btnWhatsAppStatus" href="#" target="_blank"
             class="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition flex items-center justify-center gap-2">
            <i class="fa-brands fa-whatsapp text-base"></i> Konfirmasi / Tanya Status via WhatsApp
          </a>
        </div>
      </div>
    `;
  }

  const btnWhatsAppStatus = document.getElementById("btnWhatsAppStatus");
  if (btnWhatsAppStatus) {
    const currentStatusText = resBadge ? resBadge.textContent : "Menunggu";
    const waMessage = encodeURIComponent(
      `Halo Admin, saya ingin menanyakan status pendaftaran saya.\n\n` +
        `*No. Pendaftaran:* ${found.noPendaftaran || "-"}\n` +
        `*NISN:* ${found.nisn || "-"}\n` +
        `*Nama Lengkap:* ${found.namaLengkap || "-"}\n` +
        `*Jurusan:* ${found.jurusan1 || "-"}\n` +
        `*Status Saat Ini:* ${currentStatusText}\n\n` +
        `Mohon bantuannya, terima kasih.`
    );
    btnWhatsAppStatus.href = `https://wa.me/6281332517626?text=${waMessage}`;
  }

  if (statusResultEl) {
    statusResultEl.classList.remove("hidden");
    statusResultEl.style.opacity = "0";
    statusResultEl.style.transform = "translateY(15px)";
    statusResultEl.style.transition = "all 0.4s ease-out";
    requestAnimationFrame(() => {
      statusResultEl.style.opacity = "1";
      statusResultEl.style.transform = "translateY(0)";
    });
    statusResultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}