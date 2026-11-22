import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../assets/js/daftar/form-steps.js", import.meta.url), "utf8");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const { STEP_FIELDS, stepOfField, firstErrorStep, errorsInStep } = ctx.window.FormSteps;

test("STEP_FIELDS sesuai spec", () => {
  assert.deepEqual([...STEP_FIELDS[2]], ["namaOrtu", "waOrtu"]);
  assert.deepEqual([...STEP_FIELDS[3]], ["berkasFile"]);
  assert.deepEqual([...STEP_FIELDS[4]], ["jurusan1", "jurusan2", "password", "passwordUlang", "pernyataan"]);
  assert.equal(STEP_FIELDS[1].length, 9);
});

test("stepOfField", () => {
  assert.equal(stepOfField("nisn"), 1);
  assert.equal(stepOfField("waOrtu"), 2);
  assert.equal(stepOfField("berkasFile"), 3);
  assert.equal(stepOfField("pernyataan"), 4);
  assert.equal(stepOfField("passwordUlang"), 4);
  assert.equal(stepOfField("x"), null);
});

test("firstErrorStep", () => {
  assert.equal(firstErrorStep(["pernyataan", "nisn"]), 1);
  assert.equal(firstErrorStep(["jurusan2"]), 4);
  assert.equal(firstErrorStep([]), null);
});

test("errorsInStep", () => {
  assert.deepEqual([...errorsInStep(1, ["nisn", "waOrtu"])], ["nisn"]);
  assert.deepEqual([...errorsInStep(3, ["nisn"])], []);
});

test("sectionProgress: bagian lengkap & persentase kolom wajib", () => {
  const { sectionProgress, REQUIRED_FIELDS } = ctx.window.FormSteps;
  const filled = Object.fromEntries(REQUIRED_FIELDS.map((id) => [id, false]));
  let p = sectionProgress(filled);
  assert.equal(p.percent, 0);
  assert.equal(p.sections[1], false);
  assert.equal(p.sections[3], true); // berkas opsional → selalu dianggap lengkap

  ["namaLengkap", "jenisKelamin", "nisn", "tempatLahir", "tanggalLahir", "agama", "whatsapp", "alamat", "asalSekolah"].forEach((id) => (filled[id] = true));
  p = sectionProgress(filled);
  assert.equal(p.sections[1], true);
  assert.equal(p.sections[2], false);
  assert.equal(p.percent, Math.round((9 / REQUIRED_FIELDS.length) * 100));

  REQUIRED_FIELDS.forEach((id) => (filled[id] = true));
  p = sectionProgress(filled);
  assert.equal(p.percent, 100);
  assert.deepEqual([1, 2, 3, 4].map((s) => p.sections[s]), [true, true, true, true]);
});

test("REQUIRED_FIELDS tidak memuat kolom opsional", () => {
  const { REQUIRED_FIELDS } = ctx.window.FormSteps;
  assert.ok(!REQUIRED_FIELDS.includes("berkasFile"));
  assert.ok(!REQUIRED_FIELDS.includes("jurusan2"));
  assert.ok(REQUIRED_FIELDS.includes("pernyataan"));
});
