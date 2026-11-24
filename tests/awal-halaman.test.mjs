import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/awal-halaman.js", import.meta.url), "utf8"), ctx);
const { perluKeAtas } = ctx.window.AwalHalaman;

test("refresh tanpa # → paksa ke atas", () => {
  assert.equal(perluKeAtas("reload", ""), true);
  assert.equal(perluKeAtas("reload", undefined), true);
});

test("refresh dengan # → biarkan browser menuju bagian itu", () => {
  assert.equal(perluKeAtas("reload", "#jurusan"), false);
});

test("buka biasa / Kembali-Maju → perilaku bawaan browser", () => {
  assert.equal(perluKeAtas("navigate", ""), false);
  assert.equal(perluKeAtas("back_forward", ""), false);
  assert.equal(perluKeAtas("", ""), false);
});
