import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/sheetson.js", import.meta.url), "utf8"), ctx);
vm.runInContext(readFileSync(new URL("../assets/js/admin/ui.js", import.meta.url), "utf8"), ctx);
const UI = ctx.window.AdminUI;
const plain = (x) => JSON.parse(JSON.stringify(x));

const rows = [
  { noPendaftaran: "SPMB-2026-RPL-001", namaLengkap: "Ani", nisn: "0012345678", _jk: "Perempuan", jurusan1: "RPL", _asal: "SMP 1", _waktuAsli: "2026-11-22T14:56:00.000Z", tinggiBadan: "160", potonganBiaya: "-" },
  { noPendaftaran: "SPMB-2026-DKV-001", namaLengkap: "Budi", nisn: "-", _jk: "", _jurusan: "DKV", _asal: null, _waktuAsli: "", tinggiBadan: "0", potonganBiaya: "250000" },
];

test("tabelEkspor: kolom umum + kolom modul, nomor urut, '-' jadi kosong, angka tetap angka", () => {
  const t = UI.tabelEkspor(rows, [
    { label: "Tinggi (cm)", get: (r) => r.tinggiBadan, angka: true },
    { label: "Potongan (Rp)", get: (r) => r.potonganBiaya, angka: true },
  ]);
  assert.deepEqual(plain(t.header), ["No", "No. pendaftaran", "Nama", "NISN", "Jenis kelamin", "Jurusan", "Asal sekolah", "Waktu daftar", "Tinggi (cm)", "Potongan (Rp)"]);
  assert.deepEqual(plain(t.body[0]), [1, "SPMB-2026-RPL-001", "Ani", "0012345678", "Perempuan", "RPL", "SMP 1", "22 Nov 2026, 21.56", 160, ""]);
  // jurusan dari Data_Pendaftar bila kolom sheet kosong; NISN "-" → ""; waktu kosong → ""; 0 → ""
  assert.deepEqual(plain(t.body[1]), [2, "SPMB-2026-DKV-001", "Budi", "", "", "DKV", "", "", "", 250000]);
});

test("keteranganFilter: 'Semua data' bila tanpa filter", () => {
  assert.equal(UI.keteranganFilter([]), "Semua data (tanpa filter)");
  assert.equal(UI.keteranganFilter(["Status: Pending", "", "Jurusan: RPL"]), "Status: Pending · Jurusan: RPL");
});

test("namaFileLaporan: judul aman untuk nama file + tanggal WIB", () => {
  const d = new Date("2026-11-22T18:30:00Z"); // 23 Nov 01.30 WIB
  assert.equal(UI.namaFileLaporan("Keuangan & Voucher", "xlsx", d), "Laporan Keuangan dan Voucher 2026-11-23.xlsx");
  assert.equal(UI.namaFileLaporan("Tes Fisik / Seragam", "pdf", d), "Laporan Tes Fisik Seragam 2026-11-23.pdf");
});

test("tabelEkspor: NISN diambil dari Data_Pendaftar bila sheet modul tidak punya kolom NISN", () => {
  const t = UI.tabelEkspor([{ noPendaftaran: "X", namaLengkap: "C", _nisn: "0098765432" }]);
  assert.equal(t.body[0][3], "0098765432");
});
