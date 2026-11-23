import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/beranda/promo.js", import.meta.url), "utf8"), ctx);
const { perluTampil } = ctx.window.Promo;

test("pop-up promo tampil setiap kali beranda dibuka / di-refresh", () => {
  assert.equal(perluTampil({ hash: "" }), true);
  assert.equal(perluTampil({ hash: "#" }), true);
  // walau sebelumnya sudah ditutup, refresh tetap menampilkan lagi
  assert.equal(perluTampil({ hash: "", ditutup: true }), true);
});

test("tidak menghalangi tautan langsung (#login siswa, #faq, dst.)", () => {
  assert.equal(perluTampil({ hash: "#login" }), false);
  assert.equal(perluTampil({ hash: "#faq" }), false);
});

test("transformTerbang: dari tiket besar ke ikon kecil di pojok", () => {
  const { transformTerbang } = ctx.window.Promo;
  // tiket 400x570 di tengah layar → ikon 80x114 di pojok kanan bawah
  const t = transformTerbang({ left: 440, top: 100, width: 400, height: 570 }, { left: 1176, top: 762, width: 80, height: 114 });
  assert.equal(t.skala, 0.2);
  assert.equal(t.dx, 1216 - 640); // selisih titik tengah X
  assert.equal(t.dy, 819 - 385); // selisih titik tengah Y
});
