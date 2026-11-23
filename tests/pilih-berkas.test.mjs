import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/pilih-berkas.js", import.meta.url), "utf8"), ctx);
const { ukuranBaru, namaFoto, perluDikecilkan } = ctx.window.PilihBerkas;

test("ukuranBaru: sisi terpanjang dibatasi, rasio tetap, tidak diperbesar", () => {
  assert.equal(ukuranBaru(4000, 3000, 2000).join("x"), "2000x1500");
  assert.equal(ukuranBaru(3000, 4000, 2000).join("x"), "1500x2000");
  assert.equal(ukuranBaru(800, 600, 2000).join("x"), "800x600");
});

test("namaFoto: nama berkas foto kamera berisi tanggal & jam", () => {
  assert.equal(namaFoto(new Date(2026, 10, 23, 9, 5, 7)), "foto-berkas-20261123-090507.jpg");
});

test("perluDikecilkan: foto kamera selalu, gambar besar ya, PDF tidak", () => {
  assert.equal(perluDikecilkan({ type: "image/jpeg", size: 300 * 1024 }, true), true);
  assert.equal(perluDikecilkan({ type: "image/jpeg", size: 300 * 1024 }, false), false);
  assert.equal(perluDikecilkan({ type: "image/png", size: 6 * 1024 * 1024 }, false), true);
  assert.equal(perluDikecilkan({ type: "application/pdf", size: 9 * 1024 * 1024 }, true), false);
});
