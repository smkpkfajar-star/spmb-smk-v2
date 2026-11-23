import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/pengaturan.js", import.meta.url), "utf8"), ctx);
const { dariBaris, BAWAAN } = ctx.window.Pengaturan;

test("bawaan: SPMB dibuka & pop-up nyala (bila tabel belum ada / gagal dibaca)", () => {
  assert.equal(BAWAAN.spmbDibuka, true);
  assert.equal(BAWAAN.popupPromo, true);
  const h = dariBaris([]);
  assert.equal(h.spmbDibuka, true);
  assert.equal(h.popupPromo, true);
});

test("membaca baris tabel pengaturan", () => {
  const h = dariBaris([{ kunci: "spmb_dibuka", nilai: false }, { kunci: "popup_promo", nilai: false }]);
  assert.equal(h.spmbDibuka, false);
  assert.equal(h.popupPromo, false);
  const h2 = dariBaris([{ kunci: "spmb_dibuka", nilai: true }, { kunci: "lain", nilai: false }]);
  assert.equal(h2.spmbDibuka, true);
  assert.equal(h2.popupPromo, true);
});

test("data aneh tidak membuat error", () => {
  assert.equal(dariBaris(null).spmbDibuka, true);
  assert.equal(dariBaris({ bukan: "array" }).popupPromo, true);
});
