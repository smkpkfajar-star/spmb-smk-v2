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
