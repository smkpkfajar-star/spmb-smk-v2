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
  { n: "a", jurusan1: "RPL", _jk: "Laki-laki", _asal: "SMP 2", ukuranSeragam: "M" },
  { n: "b", jurusan1: "DKV", _jk: "Perempuan", _asal: "SMP 1", ukuranSeragam: "-" },
  { n: "c", jurusan1: "RPL", _jk: "Perempuan", _asal: "SMP 2", ukuranSeragam: "" },
  { n: "d", _jurusan: "TKR", _jk: "", _asal: "MTs 3", ukuranSeragam: "XL" },
];
const ids = (r) => r.map((x) => x.n).join("");

test("SARING_UMUM: jurusan (juga dari Data_Pendaftar), jenis kelamin, asal sekolah", () => {
  const byId = Object.fromEntries(UI.SARING_UMUM.map((d) => [d.id, d]));
  assert.deepEqual(rows.map(byId.jurusan.get), ["RPL", "DKV", "RPL", "TKR"]);
  assert.deepEqual(rows.map(byId.jk.get), ["Laki-laki", "Perempuan", "Perempuan", "Belum diisi"]);
  assert.deepEqual(rows.map(byId.asal.get), ["SMP 2", "SMP 1", "SMP 2", "MTs 3"]);
});

test("saringTambahan: semua pilihan harus cocok; kosong = semua", () => {
  const defs = UI.SARING_UMUM;
  assert.equal(ids(UI.saringTambahan(rows, defs, {})), "abcd");
  assert.equal(ids(UI.saringTambahan(rows, defs, { jurusan: "RPL" })), "ac");
  assert.equal(ids(UI.saringTambahan(rows, defs, { jurusan: "RPL", jk: "Perempuan" })), "c");
  assert.equal(ids(UI.saringTambahan(rows, defs, { jurusan: "", asal: "SMP 2" })), "ac");
  assert.equal(ids(UI.saringTambahan(rows, defs, { jk: "Belum diisi" })), "d");
});

test("opsiSaring: urutan tetap bila ditentukan, plus jumlah tiap pilihan", () => {
  const def = { id: "s", get: (r) => (r.ukuranSeragam && r.ukuranSeragam !== "-" ? r.ukuranSeragam : "Belum diukur"), options: ["Belum diukur", "S", "M", "L", "XL"] };
  assert.deepEqual(plain(UI.opsiSaring(rows, def)), [
    { value: "Belum diukur", n: 2 },
    { value: "S", n: 0 },
    { value: "M", n: 1 },
    { value: "L", n: 0 },
    { value: "XL", n: 1 },
  ]);
});

test("opsiSaring: tanpa daftar tetap → nilai dari data, urut abjad; nilai tak dikenal tetap muncul", () => {
  const asal = UI.SARING_UMUM.find((d) => d.id === "asal");
  assert.deepEqual(plain(UI.opsiSaring(rows, asal)), [
    { value: "MTs 3", n: 1 },
    { value: "SMP 1", n: 1 },
    { value: "SMP 2", n: 2 },
  ]);
  const def = { id: "x", get: (r) => r.jurusan1 || "?", options: ["RPL"] };
  assert.deepEqual(plain(UI.opsiSaring(rows, def)).map((o) => o.value), ["RPL", "?", "DKV"]);
});

/* ---------- bunyi notifikasi pendaftar baru ---------- */

test("polaBunyi: lonceng tiga nada naik, diulang 2x, total ±2 detik, cukup keras", () => {
  const nada = UI.polaBunyi();
  assert.equal(nada.length, 6);
  const naik = (a) => a.every((n, i) => i === 0 || n.f > a[i - 1].f);
  assert.ok(naik(nada.slice(0, 3)) && naik(nada.slice(3)), "tiap putaran nadanya naik");
  assert.deepEqual(nada.slice(0, 3).map((n) => n.f), nada.slice(3).map((n) => n.f), "putaran kedua sama");
  const selesai = Math.max(...nada.map((n) => n.t + n.d));
  assert.ok(selesai >= 1.8 && selesai <= 2.6, `durasi ${selesai}s`);
  assert.ok(nada.every((n) => n.v >= 0.2 && n.v <= 0.5), "volume jelas tapi tidak pecah");
});

/* ---------- nomor dobel: deteksi & perbaikan ---------- */

const DP = [
  { rowIndex: 2, noPendaftaran: "SPMB-2026-000", namaLengkap: "A", createdAt: "2026-11-22 17:18:43" },
  { rowIndex: 3, noPendaftaran: "SPMB-2026-100", namaLengkap: "Lama", createdAt: "2026-11-22 17:18:46" },
  { rowIndex: 7, noPendaftaran: "SPMB-2026-100", namaLengkap: "Baru", createdAt: "2026-11-22 21:27:33" },
  { rowIndex: 8, noPendaftaran: "-", namaLengkap: "Kosong", createdAt: "2026-11-22 22:00:00" },
  { rowIndex: 9, noPendaftaran: "", namaLengkap: "Kosong2", createdAt: "" },
];

test("cariNomorDobel: hanya nomor yang dipakai >1 orang; yang daftar lebih dulu di urutan pertama", () => {
  const g = plain(UI.cariNomorDobel(DP));
  assert.equal(g.length, 1);
  assert.equal(g[0].nomor, "SPMB-2026-100");
  assert.deepEqual(g[0].orang.map((r) => r.namaLengkap), ["Lama", "Baru"]);
  // urutan baris di sheet tidak menentukan; waktu daftar yang menentukan
  const terbalik = [{ ...DP[2], rowIndex: 3 }, { ...DP[1], rowIndex: 7 }];
  assert.deepEqual(plain(UI.cariNomorDobel(terbalik))[0].orang.map((r) => r.namaLengkap), ["Lama", "Baru"]);
  assert.equal(UI.cariNomorDobel([]).length, 0);
});

test("barisMilik: cocokkan lewat nama; bila nama tak membantu, lewat urutan kemunculan", () => {
  const uang = [
    { rowIndex: 3, noPendaftaran: "SPMB-2026-100", namaLengkap: "Lama" },
    { rowIndex: 7, noPendaftaran: "SPMB-2026-100", namaLengkap: " baru " },
  ];
  assert.equal(UI.barisMilik(uang, "SPMB-2026-100", "Baru", 1).rowIndex, 7);
  assert.equal(UI.barisMilik(uang, "SPMB-2026-100", "Baru", 0).rowIndex, 7, "nama unik menang atas urutan");
  const samaNama = [
    { rowIndex: 3, noPendaftaran: "SPMB-2026-100", namaLengkap: "Budi" },
    { rowIndex: 7, noPendaftaran: "SPMB-2026-100", namaLengkap: "Budi" },
  ];
  assert.equal(UI.barisMilik(samaNama, "SPMB-2026-100", "Budi", 1).rowIndex, 7);
  assert.equal(UI.barisMilik(uang, "SPMB-2026-999", "Baru", 0), null);
});

test("pesanNomorBaru: pesan WhatsApp berisi nama, nomor lama & nomor baru", () => {
  const p = UI.pesanNomorBaru("Budi", "SPMB-2026-100", "SPMB-2026-101");
  assert.match(p, /Budi/);
  assert.match(p, /SPMB-2026-100/);
  assert.match(p, /SPMB-2026-101/);
});

test("cekUbahPetugas: nama wajib, password boleh kosong (tidak diganti) atau min. 8", () => {
  const { cekUbahPetugas } = UI;
  assert.deepEqual({ ...cekUbahPetugas({ nama: "  Bu Sari ", password: "-" }) }, { nama: "Bu Sari", password: null });
  assert.deepEqual({ ...cekUbahPetugas({ nama: "Bu Sari", password: "rahasia123" }) }, { nama: "Bu Sari", password: "rahasia123" });
  assert.throws(() => cekUbahPetugas({ nama: "-", password: "-" }), /nama/i);
  assert.throws(() => cekUbahPetugas({ nama: "Bu Sari", password: "pendek" }), /8 karakter/);
});
