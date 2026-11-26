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

test("rincianProses: pembayaran, voucher, tes fisik; catatan internal tidak ikut", () => {
  const { rincianProses, nadaStatus } = ctx.window.Siswa;
  const ringkas = (u, f, d) => [...rincianProses(u, f, d)].map((x) => `${x.label}=${x.nilai}`);
  assert.deepEqual(ringkas(null, null, true), []);
  const uang = { statusBiayaDaftar: "Lunas", metodePembayaran: "Transfer", kodeVoucher: "-", statusVoucher: "Tidak Ada", potonganBiaya: 0, catatanBendahara: "rahasia" };
  assert.deepEqual(ringkas(uang, null, true), ["Pembayaran biaya pendaftaran=Lunas", "Metode pembayaran=Transfer"]);
  assert.deepEqual(ringkas({ statusBiayaDaftar: "-" }, null, true), ["Pembayaran biaya pendaftaran=Belum Bayar"]);
  const vc = { statusBiayaDaftar: "Belum Bayar", kodeVoucher: "HEMAT", statusVoucher: "Valid", potonganBiaya: 250000 };
  assert.deepEqual(ringkas(vc, null, true), ["Pembayaran biaya pendaftaran=Belum Bayar", "Voucher HEMAT=Valid", "Potongan biaya=Rp 250.000"]);
  const fisik = { statusTesFisik: "Lulus Tes", tinggiBadan: 168, beratBadan: 55, ukuranSeragam: "L", tatoTindik: "Tidak Ada", catatanTesFisik: "rahasia" };
  assert.deepEqual(ringkas(null, fisik, true), ["Tes fisik=Lulus Tes", "Tinggi / berat badan=168 cm / 55 kg", "Ukuran seragam=L"]);
  assert.deepEqual(ringkas(null, { statusTesFisik: "Belum Tes", tinggiBadan: 0, beratBadan: 0, ukuranSeragam: "-" }, true), ["Tes fisik=Belum Tes"]);
  // hasil tes belum boleh terlihat sebelum pengumuman
  assert.deepEqual(ringkas(null, { statusTesFisik: "Tidak Lulus" }, false), ["Tes fisik=Sudah dites (hasil menunggu pengumuman)"]);
  assert.deepEqual(ringkas(null, { statusTesFisik: "Belum Tes" }, false), ["Tes fisik=Belum Tes"]);
  const semua = JSON.stringify(rincianProses(uang, fisik, true));
  assert.ok(!/rahasia|Tato|Tidak Ada/.test(semua.replace(/"Transfer"/g, "")), "catatan internal tidak boleh bocor");
  assert.equal(nadaStatus("Lunas"), "ok");
  assert.equal(nadaStatus("Lulus Tes"), "ok");
  assert.equal(nadaStatus("Tidak Lulus"), "bad");
  assert.equal(nadaStatus("Belum Bayar"), "wait");
  assert.equal(nadaStatus("Belum Tes"), "wait");
});

test("berkas dipisah per jenis: daftarBerkas, statusBerkasDari, ringkasBerkas, statusBerkasTampil", () => {
  const { daftarBerkas, statusBerkasDari, ringkasBerkas } = ctx.window.Sheetson;
  const { statusBerkasTampil } = ctx.window.Siswa;
  const u = (n) => `https://x.supabase.co/storage/${n}.pdf`;
  assert.deepEqual([...daftarBerkas({}).map((b) => b.id)], ["ijazah", "skl", "kk", "kartuPelajar"]);
  assert.equal(statusBerkasDari({}), "Belum Unggah");
  assert.equal(statusBerkasDari({ urlKk: u("kk") }), "Sebagian Unggah");
  assert.equal(statusBerkasDari({ urlIjazah: u("i"), urlKk: u("kk") }), "Sebagian Unggah");
  assert.equal(statusBerkasDari({ urlIjazah: u("i"), urlKk: u("kk"), urlKartuPelajar: u("kp") }), "Sudah Unggah");
  assert.equal(statusBerkasDari({ urlSkl: u("s"), urlKk: u("kk"), urlKartuPelajar: u("kp") }), "Sudah Unggah"); // SKL menggantikan ijazah
  assert.equal(statusBerkasDari({ urlBerkas: u("lama"), namaBerkas: "kk.pdf" }), "Sudah Unggah"); // data lama: satu berkas
  assert.equal(ringkasBerkas({ urlIjazah: u("i"), urlKk: u("kk") }), "Ijazah, Kartu Keluarga");
  assert.equal(ringkasBerkas({ urlKk: "-" }), "");
  // keputusan panitia didahulukan; selain itu dihitung dari berkas
  assert.equal(statusBerkasTampil({ statusBerkas: "Berkas Terverifikasi" }), "Berkas Terverifikasi");
  assert.equal(statusBerkasTampil({ statusBerkas: "Berkas Ditolak", urlKk: u("kk") }), "Berkas Ditolak");
  assert.equal(statusBerkasTampil({ statusBerkas: "Belum Unggah", urlKk: u("kk") }), "Sebagian Unggah");
});
