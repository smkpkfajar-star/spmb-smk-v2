import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

// daftar.js di sandbox
const dctx = {
  window: { APP_CONFIG: { emailDomain: { siswa: "siswa.spmb.local" } } },
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  console: { log() {}, error() {}, warn() {} },
};
dctx.window.window = dctx.window;
vm.createContext(dctx);
vm.runInContext(read("../assets/js/daftar/daftar.js"), dctx);

// admin-ui.js
const actx = { window: {} };
vm.createContext(actx);
vm.runInContext(read("../assets/js/umum/sheetson.js"), actx);
vm.runInContext(read("../assets/js/admin/ui.js"), actx);
const UI = actx.window.AdminUI;

/* ---------- waktu daftar ---------- */

test("waktuWIB: jam Indonesia barat, mudah dibaca dan bisa diurutkan", () => {
  // 08:22:27 UTC = 15:22:27 WIB
  assert.equal(dctx.waktuWIB(new Date("2026-11-22T08:22:27.901Z")), "2026-11-22 15:22:27");
  // lewat tengah malam WIB
  assert.equal(dctx.waktuWIB(new Date("2026-12-31T17:05:00Z")), "2027-01-01 00:05:00");
});

test("parseWaktu: format WIB baru dan ISO lama sama-sama terbaca", () => {
  const a = UI.parseWaktu("2026-11-22 15:22:27");
  const b = UI.parseWaktu("2026-11-22T08:22:27Z");
  assert.equal(a.getTime(), b.getTime());
  assert.equal(UI.parseWaktu(""), null);
  assert.equal(UI.parseWaktu("-"), null);
  assert.equal(UI.parseWaktu("bukan tanggal"), null);
});

test("formatWaktu: tanggal & jam WIB untuk panitia", () => {
  assert.equal(UI.formatWaktu("2026-11-22T08:22:27Z"), "22 Nov 2026, 15.22");
  assert.equal(UI.formatWaktu("2026-01-05 07:03:00"), "5 Jan 2026, 07.03");
  assert.equal(UI.formatWaktu(""), "-");
});

test("waktuKey: angka untuk mengurutkan, kosong = 0", () => {
  assert.ok(UI.waktuKey("2026-11-22 15:22:27") > UI.waktuKey("2026-11-22T08:08:26Z"));
  assert.equal(UI.waktuKey(undefined), 0);
});

/* ---------- penomoran halaman ---------- */

test("pageNumbers: sedikit halaman → semua tampil", () => {
  assert.deepEqual([...UI.pageNumbers(2, 5)], [1, 2, 3, 4, 5]);
});

test("pageNumbers: banyak halaman → awal, sekitar, akhir dengan …", () => {
  assert.deepEqual([...UI.pageNumbers(1, 20)], [1, 2, 3, "…", 20]);
  assert.deepEqual([...UI.pageNumbers(10, 20)], [1, "…", 9, 10, 11, "…", 20]);
  assert.deepEqual([...UI.pageNumbers(20, 20)], [1, "…", 18, 19, 20]);
});

/* ---------- nomor pendaftaran ---------- */

test("nomorSah: SPMB-tahun-KODEJURUSAN-001, kode harus jurusan yang dipilih", () => {
  assert.equal(dctx.nomorSah("SPMB-2026-DKV-001", "DKV"), true);
  assert.equal(dctx.nomorSah("SPMB-2026-TITL-999", "TITL"), true);
  assert.equal(dctx.nomorSah("SPMB-2026-RPL-001", "DKV"), false, "jurusan lain");
  assert.equal(dctx.nomorSah("SPMB-2026-100", "RPL"), false, "format lama");
  assert.equal(dctx.nomorSah("SPMB-2026-DKV-1", "DKV"), false, "harus 3 angka");
  assert.equal(dctx.nomorSah(null, "DKV"), false);
});

test("ambilNomorPendaftaran: meminta nomor jurusan yang dipilih ke database", async () => {
  let args;
  const client = { rpc: async (name, a) => (assert.equal(name, "ambil_no_pendaftaran"), (args = a), { data: "SPMB-2026-RPL-007", error: null }) };
  assert.equal(await dctx.ambilNomorPendaftaran(client, "RPL"), "SPMB-2026-RPL-007");
  assert.deepEqual({ ...args }, { p_jurusan: "RPL" });
});

test("ambilNomorPendaftaran: nomor jurusan lain / format lama tidak diterima", async () => {
  const client = { rpc: async () => ({ data: "SPMB-2026-TKR-005", error: null }) };
  assert.match(await dctx.ambilNomorPendaftaran(client, "RPL"), /^SPMB-2026-RPL-[0-9A-Z]{9,}$/);
  const lama = { rpc: async () => ({ data: "SPMB-2026-105", error: null }) };
  assert.match(await dctx.ambilNomorPendaftaran(lama, "RPL"), /^SPMB-2026-RPL-[0-9A-Z]{9,}$/);
});

test("ambilNomorPendaftaran: kuota jurusan penuh → pesan untuk pendaftar", async () => {
  const client = { rpc: async () => ({ data: null, error: { message: "PENUH: kuota nomor DKV habis" } }) };
  await assert.rejects(
    () => dctx.ambilNomorPendaftaran(client, "DKV"),
    (e) => e.userFacing === true && /DKV/.test(e.message) && /penuh/i.test(e.message)
  );
});

test("ambilNomorPendaftaran: database belum siap → nomor cadangan berawalan kode jurusan dan tetap unik", async () => {
  const client = { rpc: async () => ({ data: null, error: { message: "function not found" } }) };
  const at = new Date("2026-11-22T08:22:27.901Z");
  assert.match(await dctx.ambilNomorPendaftaran(client, "TITL", at), /^SPMB-2026-TITL-[0-9A-Z]{9,}$/);
  assert.match(await dctx.ambilNomorPendaftaran(client, "DKV", at), /^SPMB-2026-DKV-[0-9A-Z]{9,}$/);
  const banyak = new Set();
  for (let i = 0; i < 500; i++) banyak.add(dctx.nomorCadangan("TKR", at));
  assert.equal(banyak.size, 500, "nomor cadangan pada milidetik yang sama pun tidak boleh sama");
});

test("ambilNomorPendaftaran: balasan database aneh tidak dipakai", async () => {
  const client = { rpc: async () => ({ data: "<b>x</b>", error: null }) };
  assert.match(await dctx.ambilNomorPendaftaran(client, "TSM"), /^SPMB-\d{4}-TSM-[0-9A-Z]{9,}$/);
});

/* ---------- bukti PDF ---------- */

test("bukti PDF mencantumkan waktu pendaftaran", () => {
  const c = dctx.buildPdfContent({ noPendaftaran: "SPMB-2026-0001", createdAt: "2026-11-22 15:22:27" }, "x");
  const rows = c.sections.flatMap((s) => s.rows);
  assert.deepEqual([...rows.find((r) => r[0] === "Waktu Pendaftaran")], ["Waktu Pendaftaran", "22-11-2026 pukul 15.22 WIB"]);
});

/* ---------- cari berdasarkan tanggal daftar ---------- */

test("tanggalWIB: tanggal kalender WIB dari waktu daftar", () => {
  assert.equal(UI.tanggalWIB(UI.waktuKey("2026-11-22T17:30:00Z")), "2026-11-23"); // 00.30 WIB
  assert.equal(UI.tanggalWIB(0), "");
});

test("filterTanggal: dari–sampai (termasuk kedua ujung), salah satu boleh kosong", () => {
  const rows = [
    { n: "a", _waktu: UI.waktuKey("2026-11-20 08:00:00") },
    { n: "b", _waktu: UI.waktuKey("2026-11-21 23:59:00") },
    { n: "c", _waktu: UI.waktuKey("2026-11-22 00:01:00") },
    { n: "d", _waktu: 0 },
  ];
  const n = (r) => r.map((x) => x.n).join("");
  assert.equal(n(UI.filterTanggal(rows, "", "")), "abcd");
  assert.equal(n(UI.filterTanggal(rows, "2026-11-21", "2026-11-21")), "b");
  assert.equal(n(UI.filterTanggal(rows, "2026-11-21", "")), "bc");
  assert.equal(n(UI.filterTanggal(rows, "", "2026-11-21")), "ab");
  // tertukar → tetap benar
  assert.equal(n(UI.filterTanggal(rows, "2026-11-22", "2026-11-20")), "abc");
});

/* ---------- pengaman nomor dobel ---------- */

test("ambilNomorPendaftaran: nomor sudah dipakai NISN lain di sheet → minta nomor berikutnya", async () => {
  const panggilan = [];
  const client = {
    rpc: async (name, a) => {
      panggilan.push({ ...a });
      return { data: a.p_lewati ? "SPMB-2026-RPL-002" : "SPMB-2026-RPL-001", error: null };
    },
  };
  const dipakai = async (no) => no === "SPMB-2026-RPL-001";
  assert.equal(await dctx.ambilNomorPendaftaran(client, "RPL", new Date(), dipakai), "SPMB-2026-RPL-002");
  assert.deepEqual(panggilan, [{ p_jurusan: "RPL" }, { p_jurusan: "RPL", p_lewati: "SPMB-2026-RPL-001" }]);
});

test("ambilNomorPendaftaran: selalu bentrok → berhenti setelah 5x dan memakai nomor cadangan unik", async () => {
  let n = 0;
  const client = { rpc: async () => ({ data: `SPMB-2026-RPL-${String(++n).padStart(3, "0")}`, error: null }) };
  const hasil = await dctx.ambilNomorPendaftaran(client, "RPL", new Date(), async () => true);
  assert.equal(n, 5);
  assert.match(hasil, /^SPMB-\d{4}-RPL-[0-9A-Z]{9,}$/);
});

test("ambilNomorPendaftaran: pemeriksaan sheet gagal (internet) → nomor tetap dipakai, pendaftaran jalan", async () => {
  const client = { rpc: async () => ({ data: "SPMB-2026-DKV-007", error: null }) };
  const gagal = async () => { throw new Error("network"); };
  assert.equal(await dctx.ambilNomorPendaftaran(client, "DKV", new Date(), gagal), "SPMB-2026-DKV-007");
});

test("nomorDipakaiOrangLain: nomor sama milik NISN lain = bentrok; milik NISN sendiri (kirim ulang) = aman", () => {
  const rows = [{ noPendaftaran: "SPMB-2026-100", nisn: 9999000120 }];
  assert.equal(dctx.bentrokNomor(rows, "SPMB-2026-100", "9999000124"), true);
  assert.equal(dctx.bentrokNomor(rows, "SPMB-2026-100", "9999000120"), false);
  assert.equal(dctx.bentrokNomor([{ noPendaftaran: "SPMB-2026-100", nisn: 12345678 }], "SPMB-2026-100", "0012345678"), false);
  assert.equal(dctx.bentrokNomor(rows, "SPMB-2026-101", "9999000124"), false);
});
