import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Muat daftar.js di sandbox tanpa DOM nyata
const ctx = {
  window: { APP_CONFIG: { emailDomain: { siswa: "siswa.spmb.local" } } },
  document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
  console: { log() {}, error() {} },
};
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/daftar.js", import.meta.url), "utf8"), ctx);
const { buildPdfContent } = ctx;

const data = {
  noPendaftaran: "SPMB-734293",
  namaLengkap: "Siti Aminah",
  nisn: "0012345678",
  jenisKelamin: "Perempuan",
  tempatLahir: "Yogyakarta",
  tanggalLahir: "2011-08-17",
  agama: "Islam",
  whatsapp: "081200000101",
  asalSekolah: "SMP Negeri 1 Yogyakarta",
  alamat: "Jl. Pakuningratan No. 1",
  namaBerkas: "kk.pdf",
  namaOrtu: "Ibu Siti",
  waOrtu: "081300000101",
  jurusan1: "RPL",
  jurusan2: "-",
  statusPendaftaran: "Pending",
};

test("judul memuat nama sekolah", () => {
  const c = buildPdfContent(data, "https://contoh.sch.id/siswa/");
  assert.equal(c.school, "SMK TAMANSISWA JETIS");
});

test("tanggal lahir format Indonesia", () => {
  const c = buildPdfContent(data, "x");
  const ttl = c.sections[0].rows.find(([l]) => l === "Tempat, Tanggal Lahir")[1];
  assert.equal(ttl, "Yogyakarta, 17-08-2011");
});

test("jurusan ditulis lengkap, cadangan kosong jadi '-'", () => {
  const rows = Object.fromEntries([...buildPdfContent(data, "x").sections[1].rows].map((r) => [...r]));
  assert.equal(rows["Jurusan Utama"], "Rekayasa Perangkat Lunak (RPL)");
  assert.equal(rows["Jurusan Cadangan"], "-");
});

test("label tidak lebih panjang dari kolom label", () => {
  const all = buildPdfContent(data, "x").sections.flatMap((s) => [...s.rows]);
  for (const [label] of all) assert.ok(label.length <= 22, `label terlalu panjang: ${label}`);
});

test("catatan login memuat alamat halaman siswa", () => {
  const c = buildPdfContent(data, "https://contoh.sch.id/siswa/");
  assert.ok(c.loginNote.includes("https://contoh.sch.id/siswa/"));
  assert.ok(/NISN/.test(c.loginNote) && /password/.test(c.loginNote));
});
