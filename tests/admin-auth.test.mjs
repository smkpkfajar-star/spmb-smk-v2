import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../assets/js/admin/auth.js", import.meta.url), "utf8");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const { modulesFor, isStaffRole, usernameToEmail, canOpen } = ctx.window.AdminAuth;
const ids = (role) => [...modulesFor(role).map((m) => m.id)];

test("modul per peran", () => {
  assert.deepEqual(ids("superadmin"), ["verifikasi", "keuangan", "tes-fisik", "superadmin"]);
  assert.deepEqual(ids("verifikasi"), ["verifikasi"]);
  assert.deepEqual(ids("keuangan"), ["keuangan"]);
  assert.deepEqual(ids("tes_fisik"), ["tes-fisik"]);
  assert.deepEqual(ids("pendaftar"), []);
});

test("hanya peran petugas yang boleh masuk admin", () => {
  assert.equal(isStaffRole("superadmin"), true);
  assert.equal(isStaffRole("tes_fisik"), true);
  assert.equal(isStaffRole("pendaftar"), false);
  assert.equal(isStaffRole(undefined), false);
});

test("canOpen: superadmin semua, lainnya sesuai daftar", () => {
  assert.equal(canOpen("superadmin", ["keuangan"]), true);
  assert.equal(canOpen("keuangan", ["keuangan"]), true);
  assert.equal(canOpen("keuangan", ["verifikasi"]), false);
  assert.equal(canOpen("verifikasi", []), true);
  assert.equal(canOpen("pendaftar", []), false);
});

test("username menjadi alamat login", () => {
  const w = { APP_CONFIG: { emailDomain: { petugas: "petugas.spmb.local" } } };
  ctx.window.APP_CONFIG = w.APP_CONFIG;
  assert.equal(usernameToEmail("  Bendahara1 "), "bendahara1@petugas.spmb.local");
  assert.equal(usernameToEmail("x@y.z"), "x@y.z");
});

test("folderUrl: /admin tanpa garis miring diarahkan ke /admin/", () => {
  const { folderUrl } = ctx.window.AdminAuth;
  assert.equal(folderUrl("/admin", "", ""), "/admin/");
  assert.equal(folderUrl("/admin", "?a=1", "#x"), "/admin/?a=1#x");
  assert.equal(folderUrl("/sekolah/admin", "", ""), "/sekolah/admin/");
  assert.equal(folderUrl("/admin/", "", ""), null);
  assert.equal(folderUrl("/admin/dashboard.html", "", ""), null);
  assert.equal(folderUrl("/admin/index.html", "", ""), null);
});

test("routeFromHash: modul dikenal, selain itu dashboard", () => {
  const { routeFromHash } = ctx.window.AdminAuth;
  assert.equal(routeFromHash("#verifikasi"), "verifikasi");
  assert.equal(routeFromHash("#tes-fisik"), "tes-fisik");
  assert.equal(routeFromHash("#superadmin"), "superadmin");
  assert.equal(routeFromHash(""), "dashboard");
  assert.equal(routeFromHash("#entah"), "dashboard");
});

test("link menu memakai #modul (satu halaman)", () => {
  const { MODULES } = ctx.window.AdminAuth;
  assert.deepEqual([...MODULES.map((m) => m.href)], ["#verifikasi", "#keuangan", "#tes-fisik", "#superadmin"]);
});
