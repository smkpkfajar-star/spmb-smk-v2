import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {}, URLSearchParams };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/jurusan.js", import.meta.url), "utf8"), ctx);
const { JURUSAN, daftarUrl, findJurusan, typeSteps } = ctx.window.Jurusan;

test("kelima jurusan lengkap", () => {
  assert.deepEqual([...JURUSAN.map((j) => j.id)], ["TKR", "TSM", "TITL", "RPL", "DKV"]);
  for (const j of JURUSAN) {
    assert.ok(j.nama && j.ringkas && j.deskripsi, j.id);
    assert.ok(j.belajar.length >= 3, j.id + " belajar");
    assert.ok(j.prospek.length >= 3, j.id + " prospek");
  }
});

test("daftarUrl memilih jurusan di formulir", () => {
  assert.equal(daftarUrl("RPL"), "daftar/?jurusan=RPL#bagian-4");
});

test("findJurusan tidak peka huruf besar/kecil", () => {
  assert.equal(findJurusan("rpl").id, "RPL");
  assert.equal(findJurusan("xyz"), null);
});

test("typeSteps: urutan teks saat diketik", () => {
  assert.deepEqual([...typeSteps("abc")], ["a", "ab", "abc"]);
  assert.deepEqual([...typeSteps("")], []);
});
