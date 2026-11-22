/* ============================================================
   form-steps.js — pembagian kolom formulir ke 4 langkah.
   Fungsi murni (tanpa DOM) agar bisa dites dengan node:test.
   Dipakai daftar.js lewat window.FormSteps.
   ============================================================ */
(function (root) {
  const STEP_FIELDS = Object.freeze({
    1: Object.freeze(["namaLengkap", "jenisKelamin", "nisn", "tempatLahir", "tanggalLahir", "agama", "whatsapp", "alamat", "asalSekolah"]),
    2: Object.freeze(["namaOrtu", "waOrtu"]),
    3: Object.freeze(["berkasFile"]),
    4: Object.freeze(["jurusan1", "jurusan2", "pernyataan"]),
  });

  const STEP_TITLES = Object.freeze({ 1: "Data Diri", 2: "Orang Tua / Wali", 3: "Berkas", 4: "Jurusan & Kirim" });
  const TOTAL_STEPS = 4;

  function stepOfField(id) {
    for (const step of [1, 2, 3, 4]) if (STEP_FIELDS[step].includes(id)) return step;
    return null;
  }

  function firstErrorStep(errorFieldIds) {
    const steps = errorFieldIds.map(stepOfField).filter((s) => s !== null);
    return steps.length ? Math.min(...steps) : null;
  }

  function errorsInStep(step, errorFieldIds) {
    return errorFieldIds.filter((id) => stepOfField(id) === step);
  }

  root.FormSteps = { STEP_FIELDS, STEP_TITLES, TOTAL_STEPS, stepOfField, firstErrorStep, errorsInStep };
})(typeof window !== "undefined" ? window : globalThis);
