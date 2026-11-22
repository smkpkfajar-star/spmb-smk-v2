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
