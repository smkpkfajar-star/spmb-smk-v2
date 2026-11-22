/* ============================================================
   form-steps.js — pembagian kolom formulir ke 4 bagian dan
   perhitungan kemajuan isian (form panjang satu halaman).
   Fungsi murni (tanpa DOM) agar bisa dites dengan node:test.
   Dipakai daftar.js lewat window.FormSteps.
   ============================================================ */
(function (root) {
  const STEP_FIELDS = Object.freeze({
    1: Object.freeze(["namaLengkap", "jenisKelamin", "nisn", "tempatLahir", "tanggalLahir", "agama", "whatsapp", "alamat", "asalSekolah"]),
    2: Object.freeze(["namaOrtu", "waOrtu"]),
    3: Object.freeze(["berkasFile"]),
    4: Object.freeze(["jurusan1", "jurusan2", "password", "passwordUlang", "pernyataan"]),
  });

  const STEP_TITLES = Object.freeze({ 1: "Data Diri", 2: "Orang Tua / Wali", 3: "Berkas", 4: "Jurusan & Kirim" });
  const TOTAL_STEPS = 4;
  const OPTIONAL_FIELDS = Object.freeze(["berkasFile", "jurusan2"]);
  const REQUIRED_FIELDS = Object.freeze(
    [1, 2, 3, 4].flatMap((s) => STEP_FIELDS[s]).filter((id) => !OPTIONAL_FIELDS.includes(id))
  );

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

  // filled: { idKolom: true/false } untuk kolom wajib.
  // Bagian tanpa kolom wajib (berkas) selalu dianggap lengkap.
  function sectionProgress(filled) {
    const sections = {};
    for (const step of [1, 2, 3, 4]) {
      const req = STEP_FIELDS[step].filter((id) => !OPTIONAL_FIELDS.includes(id));
      sections[step] = req.every((id) => !!filled[id]);
    }
    const done = REQUIRED_FIELDS.filter((id) => !!filled[id]).length;
    return { sections, percent: Math.round((done / REQUIRED_FIELDS.length) * 100) };
  }

  root.FormSteps = {
    STEP_FIELDS, STEP_TITLES, TOTAL_STEPS, OPTIONAL_FIELDS, REQUIRED_FIELDS,
    stepOfField, firstErrorStep, errorsInStep, sectionProgress,
  };
})(typeof window !== "undefined" ? window : globalThis);
