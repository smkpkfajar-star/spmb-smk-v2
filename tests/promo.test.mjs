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
