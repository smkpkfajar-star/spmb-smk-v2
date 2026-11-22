import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/sheetson.js", import.meta.url), "utf8"), ctx);
vm.runInContext(readFileSync(new URL("../assets/js/admin-ui.js", import.meta.url), "utf8"), ctx);
const { filterRows, changedFields, toCsv, badgeTone } = ctx.window.AdminUI;

const rows = [
  { noPendaftaran: "SPMB-111111", namaLengkap: "Budi Santoso", nisn: 99990011, statusPendaftaran: "Pending" },
  { noPendaftaran: "SPMB-222222", namaLengkap: "Siti Aminah", nisn: "0012345678", statusPendaftaran: "Diterima" },
];
const names = (r) => [...r.map((x) => x.namaLengkap)];

test("filterRows: cari nama tanpa beda huruf besar/kecil", () => {
  assert.deepEqual(names(filterRows(rows, "budi", {})), ["Budi Santoso"]);
});
test("filterRows: cari nomor pendaftaran sebagian", () => {
  assert.deepEqual(names(filterRows(rows, "222", {})), ["Siti Aminah"]);
});
test("filterRows: NISN ber-nol cocok dengan yang tersimpan sebagai angka", () => {
  assert.deepEqual(names(filterRows(rows, "0099990011", {})), ["Budi Santoso"]);
  assert.deepEqual(names(filterRows(rows, "12345678", {})), ["Siti Aminah"]);
});
test("filterRows: filter status persis, kosong = semua", () => {
  assert.deepEqual(names(filterRows(rows, "", { statusPendaftaran: "Diterima" })), ["Siti Aminah"]);
  assert.equal(filterRows(rows, "", { statusPendaftaran: "" }).length, 2);
});

test("changedFields hanya kolom yang berubah", () => {
  const before = { statusBerkas: "Sudah Unggah", catatanAdmin: "-", tinggiBadan: 160 };
  const after = { statusBerkas: "Berkas Terverifikasi", catatanAdmin: "-", tinggiBadan: "160" };
  assert.deepEqual({ ...changedFields(before, after) }, { statusBerkas: "Berkas Terverifikasi" });
});

test("toCsv: BOM, kutip, koma, baris baru", () => {
  const csv = toCsv([{ a: 'Kata "x"', b: "1,2\nbaris" }], [
    { key: "a", label: "Kolom A" },
    { key: "b", label: "Kolom B" },
  ]);
  assert.equal(csv, '﻿Kolom A,Kolom B\r\n"Kata ""x""","1,2\nbaris"\r\n');
});

test("badgeTone mengenali status", () => {
  assert.equal(badgeTone("Diterima"), "ok");
  assert.equal(badgeTone("Lunas"), "ok");
  assert.equal(badgeTone("Ditolak"), "bad");
  assert.equal(badgeTone("Gagal Unggah"), "bad");
  assert.equal(badgeTone("Pending"), "wait");
  assert.equal(badgeTone("Belum Bayar"), "wait");
  assert.equal(badgeTone("Tidak Ada"), "wait");
  assert.equal(badgeTone("Tidak Lulus"), "bad");
});

test("paginate: 25 per halaman, halaman dibatasi", () => {
  const { paginate } = ctx.window.AdminUI;
  const rows = Array.from({ length: 60 }, (_, i) => ({ i }));
  const p1 = paginate(rows, 1, 25);
  assert.equal(p1.pages, 3);
  assert.equal(p1.items.length, 25);
  assert.equal(p1.items[0].i, 0);
  const p3 = paginate(rows, 3, 25);
  assert.equal(p3.items.length, 10);
  assert.equal(p3.items[0].i, 50);
  assert.equal(paginate(rows, 9, 25).page, 3);
  assert.equal(paginate(rows, 0, 25).page, 1);
  assert.equal(paginate([], 1, 25).pages, 1);
});

test("sortRows: teks & angka, naik/turun, tidak mengubah aslinya", () => {
  const { sortRows } = ctx.window.AdminUI;
  const rows = [{ n: "budi", t: 160 }, { n: "Ani", t: 9 }, { n: "citra", t: "" }];
  assert.deepEqual([...sortRows(rows, "n", "asc").map((r) => r.n)], ["Ani", "budi", "citra"]);
  assert.deepEqual([...sortRows(rows, "t", "desc").map((r) => r.t)], [160, 9, ""]);
  assert.equal(rows[0].n, "budi");
});
