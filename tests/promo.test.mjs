import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/beranda/promo.js", import.meta.url), "utf8"), ctx);
const { perluTampil } = ctx.window.Promo;

test("pop-up promo tampil saat pertama buka beranda", () => {
  assert.equal(perluTampil({ ditutup: false, hash: "" }), true);
  assert.equal(perluTampil({ ditutup: false, hash: "#" }), true);
});

test("tidak tampil lagi setelah ditutup pada sesi yang sama", () => {
  assert.equal(perluTampil({ ditutup: true, hash: "" }), false);
});

test("tidak menghalangi tautan langsung (#login siswa, #faq, dst.)", () => {
  assert.equal(perluTampil({ ditutup: false, hash: "#login" }), false);
  assert.equal(perluTampil({ ditutup: false, hash: "#faq" }), false);
});
