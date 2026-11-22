import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../assets/js/form-steps.js", import.meta.url), "utf8");
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
