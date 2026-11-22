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
vm.runInContext(read("../assets/js/daftar.js"), dctx);

// admin-ui.js
const actx = { window: {} };
vm.createContext(actx);
vm.runInContext(read("../assets/js/sheetson.js"), actx);
vm.runInContext(read("../assets/js/admin-ui.js"), actx);
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

test("BLOK_JURUSAN: DKV 0–99, RPL 100–199, TKR 200–299, TSM 300–399, TITL 400–499", () => {
  assert.deepEqual({ ...vm.runInContext("BLOK_JURUSAN", dctx) }, { DKV: 0, RPL: 1, TKR: 2, TSM: 3, TITL: 4 });
});

test("ambilNomorPendaftaran: meminta nomor jurusan yang dipilih ke database", async () => {
  let args;
  const client = { rpc: async (name, a) => (assert.equal(name, "ambil_no_pendaftaran"), (args = a), { data: "SPMB-2026-107", error: null }) };
  assert.equal(await dctx.ambilNomorPendaftaran(client, "RPL"), "SPMB-2026-107");
  assert.deepEqual({ ...args }, { p_jurusan: "RPL" });
});

test("ambilNomorPendaftaran: nomor dari blok jurusan lain tidak diterima", async () => {
  const client = { rpc: async () => ({ data: "SPMB-2026-205", error: null }) };
  assert.match(await dctx.ambilNomorPendaftaran(client, "RPL"), /^SPMB-2026-1[0-9A-Z]{9,}$/);
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
  assert.match(await dctx.ambilNomorPendaftaran(client, "TITL", at), /^SPMB-2026-4[0-9A-Z]{9,}$/);
  assert.match(await dctx.ambilNomorPendaftaran(client, "DKV", at), /^SPMB-2026-0[0-9A-Z]{9,}$/);
  const banyak = new Set();
  for (let i = 0; i < 500; i++) banyak.add(dctx.nomorCadangan("TKR", at));
  assert.equal(banyak.size, 500, "nomor cadangan pada milidetik yang sama pun tidak boleh sama");
});

test("ambilNomorPendaftaran: balasan database aneh tidak dipakai", async () => {
  const client = { rpc: async () => ({ data: "<b>x</b>", error: null }) };
  assert.match(await dctx.ambilNomorPendaftaran(client, "TSM"), /^SPMB-\d{4}-3[0-9A-Z]+$/);
});

/* ---------- bukti PDF ---------- */

test("bukti PDF mencantumkan waktu pendaftaran", () => {
  const c = dctx.buildPdfContent({ noPendaftaran: "SPMB-2026-0001", createdAt: "2026-11-22 15:22:27" }, "x");
  const rows = c.sections.flatMap((s) => s.rows);
  assert.deepEqual([...rows.find((r) => r[0] === "Waktu Pendaftaran")], ["Waktu Pendaftaran", "22-11-2026 pukul 15.22 WIB"]);
});
