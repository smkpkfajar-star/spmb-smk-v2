import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = {
  window: { APP_CONFIG: { emailDomain: { siswa: "siswa.spmb.local" } } },
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  console: { log() {}, error() {} },
};
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/daftar/daftar.js", import.meta.url), "utf8"), ctx);
const { statusStages, statusLabel } = ctx;
const states = (s) => [...statusStages(s).map((x) => x.state)];

test("tahapan per status", () => {
  assert.deepEqual(states("Pending"), ["done", "active", "todo", "todo"]);
  assert.deepEqual(states("Diverifikasi"), ["done", "done", "active", "todo"]);
  assert.deepEqual(states("Diterima"), ["done", "done", "done", "active"]);
  assert.deepEqual(states("Ditolak"), ["done", "done", "bad", "skip"]);
  assert.deepEqual(states(""), states("Pending"));
});

test("label status untuk siswa", () => {
  assert.equal(statusLabel("Pending").text, "Menunggu verifikasi");
  assert.equal(statusLabel("Ditolak").text, "Tidak diterima");
  assert.equal(statusLabel("Diterima").tone, "ok");
});
