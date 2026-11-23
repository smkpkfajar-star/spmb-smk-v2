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

test("sesi diam: keluar setelah 20 menit tanpa aktivitas", () => {
  const { BATAS_DIAM, sesiHabis, sisaDiam } = ctx.window.AdminAuth;
  assert.equal(BATAS_DIAM, 20 * 60 * 1000);
  const t0 = 1_000_000;
  assert.equal(sesiHabis(t0, t0 + 19 * 60 * 1000), false);
  assert.equal(sesiHabis(t0, t0 + 20 * 60 * 1000), true);
  assert.equal(sesiHabis(t0, t0 + 60 * 60 * 1000), true);
  // belum pernah tercatat (sesi lama sebelum fitur ini) → tidak langsung dikeluarkan
  assert.equal(sesiHabis(null, t0), false);
  assert.equal(sesiHabis(NaN, t0), false);
  assert.equal(sisaDiam(t0, t0 + 19 * 60 * 1000), 60 * 1000);
  assert.equal(sisaDiam(t0, t0 + 25 * 60 * 1000), 0);
});

test("sub-menu superadmin: #superadmin/petugas → modul superadmin, sub petugas", () => {
  const { routeFromHash, subFromHash, MODULES } = ctx.window.AdminAuth;
  assert.equal(routeFromHash("#superadmin/petugas"), "superadmin");
  assert.equal(subFromHash("#superadmin/petugas"), "petugas");
  assert.equal(subFromHash("#superadmin/rekap"), "rekap");
  // tanpa sub / sub tak dikenal → sub pertama (pengaturan situs)
  assert.equal(subFromHash("#superadmin"), "pengaturan");
  assert.equal(subFromHash("#superadmin/entah"), "pengaturan");
  // modul tanpa sub-menu
  assert.equal(subFromHash("#verifikasi"), null);
  const sa = MODULES.find((m) => m.id === "superadmin");
  assert.equal(sa.sub.map((s) => s.id).join(","), "pengaturan,rekap,petugas,reset");
});
