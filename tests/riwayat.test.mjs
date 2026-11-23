import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/sheetson.js", import.meta.url), "utf8"), ctx);
vm.runInContext(readFileSync(new URL("../assets/js/admin/ui.js", import.meta.url), "utf8"), ctx);
const { ringkasPerubahan, teksDetailRiwayat } = ctx.window.AdminUI;

test("ringkasPerubahan: hanya kolom yang berubah, pakai label, kosong jadi –", () => {
  const label = { statusPendaftaran: "Status verifikasi", catatanAdmin: "Catatan" };
  const r = ringkasPerubahan(
    { statusPendaftaran: "Pending", catatanAdmin: "-", jurusan1: "RPL" },
    { statusPendaftaran: "Diterima", catatanAdmin: "Berkas lengkap" },
    label
  );
  assert.equal(r.join(" | "), "Status verifikasi: Pending → Diterima | Catatan: – → Berkas lengkap");
});

test("ringkasPerubahan: tanpa label memakai nama kolom; nilai sama diabaikan", () => {
  assert.equal(ringkasPerubahan({ a: "1" }, { a: "1", b: "x" }).join(" | "), "b: – → x");
});

test("teksDetailRiwayat: daftar perubahan atau keterangan", () => {
  assert.equal(teksDetailRiwayat({ perubahan: ["A: 1 → 2", "B: – → x"] }), "A: 1 → 2 · B: – → x");
  assert.equal(teksDetailRiwayat({ keterangan: "Excel, 12 pendaftar" }), "Excel, 12 pendaftar");
  assert.equal(teksDetailRiwayat(null), "");
});
