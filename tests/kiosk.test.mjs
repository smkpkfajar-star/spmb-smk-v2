import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../assets/js/daftar/kiosk.js", import.meta.url), "utf8");
const ctx = { window: {}, URLSearchParams };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const { resolveMode, KIOSK_SUCCESS_RESET_S, KIOSK_IDLE_S, KIOSK_IDLE_WARN_S } = ctx.window.Kiosk;

test("?kiosk=1 / ?kiosk=0 di alamat tidak lagi mengubah mode (hanya login petugas loket)", () => {
  assert.deepEqual({ ...resolveMode("?kiosk=1", null) }, { on: false, store: undefined });
  assert.deepEqual({ ...resolveMode("?kiosk=0", "1") }, { on: true, store: undefined });
});
test("tanpa parameter mengikuti yang tersimpan", () => {
  assert.deepEqual({ ...resolveMode("", "1") }, { on: true, store: undefined });
  assert.deepEqual({ ...resolveMode("", null) }, { on: false, store: undefined });
});
test("waktu sesuai rancangan", () => {
  assert.equal(KIOSK_SUCCESS_RESET_S, 60);
  assert.equal(KIOSK_IDLE_S, 180);
  assert.equal(KIOSK_IDLE_WARN_S, 30);
});
