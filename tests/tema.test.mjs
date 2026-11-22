import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/tema.js", import.meta.url), "utf8"), ctx);
const { temaAwal } = ctx.Tema;

test("temaAwal: pilihan yang disimpan menang atas setelan perangkat", () => {
  assert.equal(temaAwal("gelap", false, false), "gelap");
  assert.equal(temaAwal("terang", true, false), "terang");
});

test("temaAwal: belum memilih → ikut setelan perangkat", () => {
  assert.equal(temaAwal(null, true, false), "gelap");
  assert.equal(temaAwal(null, false, false), "terang");
  assert.equal(temaAwal("isian-aneh", true, false), "gelap");
});

test("temaAwal: mode teras (kiosk) selalu terang", () => {
  assert.equal(temaAwal("gelap", true, true), "terang");
});
