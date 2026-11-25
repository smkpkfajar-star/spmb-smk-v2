import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/sheetson.js", import.meta.url), "utf8"), ctx);
vm.runInContext(readFileSync(new URL("../assets/js/siswa/siswa.js", import.meta.url), "utf8"), ctx);
const { appendLine, findMyRow, nisnFromEmail } = ctx.window.Siswa;

test("appendLine menambah baris baru, mengganti '-' atau kosong", () => {
  assert.equal(appendLine("-", "b.pdf"), "b.pdf");
  assert.equal(appendLine("", "b.pdf"), "b.pdf");
  assert.equal(appendLine(undefined, "b.pdf"), "b.pdf");
  assert.equal(appendLine("a.pdf", "b.pdf"), "a.pdf\nb.pdf");
});

test("findMyRow mencocokkan NISN walau tersimpan sebagai angka", () => {
  const rows = [{ nisn: 12345678, noPendaftaran: "A" }, { nisn: "0099990011", noPendaftaran: "B" }];
  assert.equal(findMyRow(rows, "0012345678").noPendaftaran, "A");
  assert.equal(findMyRow(rows, "0099990011").noPendaftaran, "B");
  assert.equal(findMyRow(rows, "1111111111"), null);
});

test("nisnFromEmail", () => {
  assert.equal(nisnFromEmail("0099990011@siswa.spmb.local"), "0099990011");
});

test("langkahSiswa: urutan Terdaftar → Berkas → Verifikasi → Hasil", () => {
  const { langkahSiswa } = ctx.window.Siswa;
  const st = (row) => langkahSiswa(row).map((l) => l.state).join(",");
  assert.equal(langkahSiswa({}).map((l) => l.label).join(","), "Terdaftar,Berkas,Verifikasi,Hasil");
  assert.equal(st({}), "done,now,todo,todo");
  assert.equal(st({ statusBerkas: "Belum Unggah", statusPendaftaran: "Pending" }), "done,now,todo,todo");
  assert.equal(st({ statusBerkas: "Sudah Unggah", statusPendaftaran: "Pending" }), "done,done,now,todo");
  assert.equal(st({ statusBerkas: "Berkas Ditolak", statusPendaftaran: "Pending" }), "done,bad,todo,todo");
  assert.equal(st({ statusBerkas: "Gagal Unggah" }), "done,bad,todo,todo");
  assert.equal(st({ statusBerkas: "Berkas Terverifikasi", statusPendaftaran: "Diverifikasi" }), "done,done,done,now");
  assert.equal(st({ statusBerkas: "Berkas Terverifikasi", statusPendaftaran: "Diterima" }), "done,done,done,done");
  assert.equal(st({ statusBerkas: "Sudah Unggah", statusPendaftaran: "Ditolak" }), "done,done,done,bad");
  assert.match(langkahSiswa({ statusPendaftaran: "Diterima" })[3].ket, /diterima/i);
});

test("nadaStatus memberi warna badge", () => {
  const { nadaStatus } = ctx.window.Siswa;
  assert.equal(nadaStatus("Diterima"), "ok");
  assert.equal(nadaStatus("Berkas Terverifikasi"), "ok");
  assert.equal(nadaStatus("Sudah Unggah"), "ok");
  assert.equal(nadaStatus("Berkas Ditolak"), "bad");
  assert.equal(nadaStatus("Gagal Unggah"), "bad");
  assert.equal(nadaStatus("Diverifikasi"), "info");
  assert.equal(nadaStatus("Pending"), "wait");
  assert.equal(nadaStatus("Belum Unggah"), "wait");
});

/* ---------- pengunduran diri ---------- */
test("bisaMundur: sebelum ditolak/mundur boleh; sesudahnya tidak", () => {
  const { bisaMundur } = ctx.window.Siswa;
  ["", "-", "Pending", "Diverifikasi", "Diterima", "diterima", undefined, null].forEach((s) => assert.equal(bisaMundur(s), true, String(s)));
  ["Ditolak", "Mengundurkan Diri", "mengundurkan diri"].forEach((s) => assert.equal(bisaMundur(s), false, s));
});

test("catatanMundur: satu baris rapi, alasan dipotong 200 huruf", () => {
  const { catatanMundur } = ctx.window.Siswa;
  assert.equal(catatanMundur("", "24 Nov 2026, 14.05 WIB"), "Pengunduran diri oleh siswa (24 Nov 2026, 14.05 WIB)");
  assert.equal(catatanMundur("  pindah\nkota   ", "t"), "Pengunduran diri oleh siswa (t): pindah kota");
  assert.equal(catatanMundur("x".repeat(500), "t").length, "Pengunduran diri oleh siswa (t): ".length + 200);
  assert.equal(catatanMundur(null, "t"), "Pengunduran diri oleh siswa (t)");
});

test("catatanUntukSiswa: baris sistem pengunduran diri disembunyikan, catatan panitia tetap", () => {
  const { catatanUntukSiswa } = ctx.window.Siswa;
  assert.equal(catatanUntukSiswa("Foto KK buram\nPengunduran diri oleh siswa (t): pindah"), "Foto KK buram");
  assert.equal(catatanUntukSiswa("Pengunduran diri oleh siswa (t)"), "");
  assert.equal(catatanUntukSiswa("Catatan biasa"), "Catatan biasa");
  assert.equal(catatanUntukSiswa(undefined), "");
});

test("langkahSiswa: mengundurkan diri → verifikasi dihentikan, hasil bertanda", () => {
  const { langkahSiswa, nadaStatus } = ctx.window.Siswa;
  const l = langkahSiswa({ statusBerkas: "Sudah Unggah", statusPendaftaran: "Mengundurkan Diri" });
  assert.equal(l.map((x) => x.state).join(","), "done,done,todo,bad");
  assert.equal(l[3].ket, "Mengundurkan diri");
  assert.equal(nadaStatus("Mengundurkan Diri"), "info");
});

test("berkasTerbaru: hanya berkas paling baru (baris terakhir) yang dipakai", () => {
  const { berkasTerbaru } = ctx.window.Sheetson;
  const b = (r) => (berkasTerbaru(r) ? { ...berkasTerbaru(r) } : null);
  assert.equal(b({}), null);
  assert.equal(b({ urlBerkas: "-", namaBerkas: "-" }), null);
  assert.deepEqual(b({ urlBerkas: "https://x/a.pdf", namaBerkas: "a.pdf" }), { url: "https://x/a.pdf", nama: "a.pdf" });
  // data lama berisi beberapa berkas → ambil yang terakhir beserta namanya
  assert.deepEqual(b({ urlBerkas: "https://x/a.pdf\nhttps://x/b.png", namaBerkas: "a.pdf\nb.png" }), { url: "https://x/b.png", nama: "b.png" });
  assert.deepEqual(b({ urlBerkas: "https://x/a.pdf\r\nhttps://x/b.png\r\n", namaBerkas: "a.pdf\r\nb.png" }), { url: "https://x/b.png", nama: "b.png" });
  // nama tidak berpasangan → pakai nama terakhir yang ada
  assert.deepEqual(b({ urlBerkas: "https://x/a.pdf\nhttps://x/b.png", namaBerkas: "a.pdf" }), { url: "https://x/b.png", nama: "a.pdf" });
});
