import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Modul bersama PDF bukti pendaftaran (dipakai formulir, halaman siswa, admin)
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/bukti-pdf.js", import.meta.url), "utf8"), ctx);
const { buildPdfContent, gabungData, tanggalTeks, namaFile } = ctx.window.BuktiPdf;

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

test("kertas F4 (215 x 330 mm)", () => {
  const c = buildPdfContent(data, "x");
  assert.equal(c.kertas.join("x"), "215x330");
});

test("ada pernyataan persetujuan siswa & orang tua", () => {
  const c = buildPdfContent(data, "x");
  assert.match(c.pernyataan.judul, /Pernyataan/i);
  assert.match(c.pernyataan.pembuka, /orang tua\/wali/i);
  assert.ok(c.pernyataan.butir.length >= 3);
  assert.ok(c.pernyataan.butir.some((b) => /benar/i.test(b)));
});

test("kolom tanda tangan: calon siswa, orang tua/wali, panitia, Ketua SPMB (daftar lewat HP)", () => {
  const t = buildPdfContent(data, "x").ttd;
  assert.equal(t.map((x) => x.peran).join("|"), "Calon Siswa|Orang Tua/Wali|Panitia SPMB|Ketua SPMB");
  assert.equal(t[0].nama, "Siti Aminah");
  assert.equal(t[1].nama, "Ibu Siti");
});

test("mode kios loket: kolom keempat = Pengawas Loket", () => {
  const t = buildPdfContent(data, "x", { kiosk: true }).ttd;
  assert.equal(t.map((x) => x.peran).join("|"), "Calon Siswa|Orang Tua/Wali|Panitia SPMB|Pengawas Loket");
});

test("nama orang tua kosong → garis isian, bukan '-'", () => {
  const t = buildPdfContent({ ...data, namaOrtu: "" }, "x").ttd;
  assert.equal(t[1].nama, "");
});

test("tanggalTeks: ISO dibalik, format sheet dibiarkan", () => {
  assert.equal(tanggalTeks("2011-08-17"), "17-08-2011");
  assert.equal(tanggalTeks("17-08-2011"), "17-08-2011");
  assert.equal(tanggalTeks(""), "");
});

test("gabungData: data diri dari Data_Pendaftar + status & berkas dari Verifikasi_Berkas", () => {
  const diri = { noPendaftaran: "SPMB-2026-RPL-007", namaLengkap: "Siti", nisn: 12345678, tanggalLahir: "17-08-2011", namaOrtu: "Budi", jurusan1: "RPL" };
  const verif = { noPendaftaran: "SPMB-2026-RPL-007", nisn: "0012345678", statusPendaftaran: "Diterima", namaBerkas: "kk.pdf\nijazah.pdf", rowIndex: 9 };
  const g = gabungData(diri, verif);
  assert.equal(g.nisn, "0012345678");
  assert.equal(g.statusPendaftaran, "Diterima");
  assert.equal(g.namaBerkas, "ijazah.pdf"); // hanya berkas terbaru
  assert.equal(g.namaOrtu, "Budi");
  const c = buildPdfContent(g, "x");
  const ttl = c.sections[0].rows.find(([l]) => l === "Tempat, Tanggal Lahir")[1];
  assert.match(ttl, /17-08-2011$/);
  assert.equal(c.ttd[1].nama, "Budi");
});

test("gabungData: hanya baris verifikasi → status default Pending, tidak error", () => {
  const g = gabungData(null, { noPendaftaran: "A", namaLengkap: "X", nisn: "1", statusPendaftaran: "-" });
  assert.equal(g.statusPendaftaran, "Pending");
  assert.equal(g.nisn, "0000000001");
  assert.equal(g.namaBerkas, "");
});

test("namaFile aman untuk sistem berkas", () => {
  assert.equal(namaFile("SPMB-2026-RPL-007"), "Bukti-Pendaftaran-SPMB-2026-RPL-007.pdf");
  assert.equal(namaFile("a/b c"), "Bukti-Pendaftaran-a-b-c.pdf");
});

test("template kop surat ada dan cocok dengan yang dipakai bukti-pdf.js", async () => {
  const { existsSync, readFileSync: baca } = await import("node:fs");
  const kode = baca(new URL("../assets/js/umum/bukti-pdf.js", import.meta.url), "utf8");
  const nama = kode.match(/template\/([\w.-]+\.pdf)/)[1];
  const berkas = new URL(`../assets/template/${nama}`, import.meta.url);
  assert.ok(existsSync(berkas), `template tidak ada: assets/template/${nama}`);
  assert.equal(baca(berkas).subarray(0, 5).toString(), "%PDF-");
});
