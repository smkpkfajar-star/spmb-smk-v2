import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../assets/js/umum/pengaturan.js", import.meta.url), "utf8"), ctx);
const { dariBaris, BAWAAN } = ctx.window.Pengaturan;

test("bawaan: SPMB dibuka & pop-up nyala (bila tabel belum ada / gagal dibaca)", () => {
  assert.equal(BAWAAN.spmbDibuka, true);
  assert.equal(BAWAAN.popupPromo, true);
  const h = dariBaris([]);
  assert.equal(h.spmbDibuka, true);
  assert.equal(h.popupPromo, true);
});

test("membaca baris tabel pengaturan", () => {
  const h = dariBaris([{ kunci: "spmb_dibuka", nilai: false }, { kunci: "popup_promo", nilai: false }]);
  assert.equal(h.spmbDibuka, false);
  assert.equal(h.popupPromo, false);
  const h2 = dariBaris([{ kunci: "spmb_dibuka", nilai: true }, { kunci: "lain", nilai: false }]);
  assert.equal(h2.spmbDibuka, true);
  assert.equal(h2.popupPromo, true);
});

test("data aneh tidak membuat error", () => {
  assert.equal(dariBaris(null).spmbDibuka, true);
  assert.equal(dariBaris({ bukan: "array" }).popupPromo, true);
});

/* ---------- jadwal, pesan tutup, banner ---------- */
const { dalamJadwal, pesanKhusus, pesanDitutup } = ctx.window.Pengaturan;
const T = (s) => Date.parse(s);
const SEKARANG = T("2027-03-01T12:00:00Z");

test("jadwal: batas kosong = tanpa batas", () => {
  assert.equal(dalamJadwal(null, null, SEKARANG), true);
  assert.equal(dalamJadwal(T("2027-03-01T00:00:00Z"), null, SEKARANG), true);
  assert.equal(dalamJadwal(null, T("2027-03-02T00:00:00Z"), SEKARANG), true);
});

test("jadwal: sebelum buka & sesudah tutup = ditutup (batas tutup tidak ikut)", () => {
  assert.equal(dalamJadwal(T("2027-03-02T00:00:00Z"), null, SEKARANG), false);
  assert.equal(dalamJadwal(null, T("2027-03-01T12:00:00Z"), SEKARANG), false);
  assert.equal(dalamJadwal(T("2027-03-01T12:00:00Z"), null, SEKARANG), true);
});

test("saklar MATI mengalahkan jadwal; saklar nyala mengikuti jadwal", () => {
  const baris = (saklar) => [
    { kunci: "spmb_dibuka", nilai: saklar },
    { kunci: "jadwal_buka", nilai: true, waktu: "2027-02-01T00:00:00Z" },
    { kunci: "jadwal_tutup", nilai: true, waktu: "2027-04-01T00:00:00Z" },
  ];
  assert.equal(dariBaris(baris(true), SEKARANG).spmbDibuka, true);
  assert.equal(dariBaris(baris(false), SEKARANG).spmbDibuka, false);
  assert.equal(dariBaris(baris(true), T("2027-05-01T00:00:00Z")).spmbDibuka, false);
  assert.equal(dariBaris(baris(true), T("2027-01-01T00:00:00Z")).spmbDibuka, false);
});

test("waktu rusak/kosong diabaikan (dianggap tanpa batas)", () => {
  const h = dariBaris([{ kunci: "jadwal_buka", nilai: true, waktu: "bukan tanggal" }, { kunci: "jadwal_tutup", nilai: true, waktu: null }], SEKARANG);
  assert.equal(h.jadwalBuka, null);
  assert.equal(h.jadwalTutup, null);
  assert.equal(h.spmbDibuka, true);
});

test("banner: tampil hanya bila nyala DAN ada teks", () => {
  assert.equal(dariBaris([{ kunci: "banner_info", nilai: true, teks: "Loket tutup jam 12" }]).bannerAktif, true);
  assert.equal(dariBaris([{ kunci: "banner_info", nilai: true, teks: "   " }]).bannerAktif, false);
  assert.equal(dariBaris([{ kunci: "banner_info", nilai: false, teks: "Loket tutup jam 12" }]).bannerAktif, false);
  assert.equal(dariBaris([]).bannerAktif, false);
  assert.equal(dariBaris([{ kunci: "banner_info", nilai: true, teks: " Halo " }]).bannerTeks, "Halo");
});

test("pesan tutup: pesan superadmin > tanggal buka berikutnya > bawaan", () => {
  const dgnPesan = dariBaris([{ kunci: "pesan_tutup", nilai: true, teks: "Gelombang 2 dibuka 1 April" }], SEKARANG);
  assert.equal(pesanKhusus(dgnPesan, SEKARANG), "Gelombang 2 dibuka 1 April");
  const dgnJadwal = dariBaris([{ kunci: "jadwal_buka", nilai: true, waktu: "2027-03-05T01:00:00Z" }], SEKARANG);
  assert.match(pesanKhusus(dgnJadwal, SEKARANG), /^Pendaftaran dibuka pada .*WIB\.$/);
  const polos = dariBaris([], SEKARANG);
  assert.equal(pesanKhusus(polos, SEKARANG), "");
  assert.match(pesanDitutup(polos, SEKARANG), /belum bisa diisi/);
});

test("saklar mati: tanggal buka tidak dijanjikan (tetap tertutup)", () => {
  const h = dariBaris([{ kunci: "spmb_dibuka", nilai: false }, { kunci: "jadwal_buka", nilai: true, waktu: "2027-03-05T01:00:00Z" }], SEKARANG);
  assert.equal(pesanKhusus(h, SEKARANG), "");
});

/* ---------- kontak, kuota, hasil seleksi, perawatan, hitung mundur ---------- */
const { normalWa, linkWa, tampilWa, teksHitungMundur, statusKuota, sembunyikanHasil } = ctx.window.Pengaturan;

test("nomor WhatsApp dinormalkan ke format 62…", () => {
  assert.equal(normalWa("0882 3212 784"), "628823212784");
  assert.equal(normalWa("+62 882-3212-784"), "628823212784");
  assert.equal(normalWa("8823212784"), "628823212784");
  assert.equal(normalWa("628823212784"), "628823212784");
  assert.equal(normalWa("12345"), "");
  assert.equal(normalWa(""), "");
  assert.equal(normalWa(null), "");
});

test("tautan & tampilan WhatsApp; nomor rusak jatuh ke nomor bawaan", () => {
  assert.equal(linkWa("0812 3456 7890"), "https://wa.me/6281234567890");
  assert.equal(linkWa("rusak"), "https://wa.me/628823212784");
  assert.equal(linkWa("0812 3456 7890", "Halo & hai"), "https://wa.me/6281234567890?text=Halo%20%26%20hai");
  assert.equal(tampilWa("628823212784"), "+62 882-3212-784");
});

test("kontak_wa & jam_layanan dibaca; nomor tak valid diabaikan", () => {
  const h = dariBaris([{ kunci: "kontak_wa", nilai: true, teks: "081234567890" }, { kunci: "jam_layanan", nilai: true, teks: " Senin–Sabtu 08.00 " }]);
  assert.equal(h.kontakWa, "6281234567890");
  assert.equal(h.jamLayanan, "Senin–Sabtu 08.00");
  assert.equal(dariBaris([{ kunci: "kontak_wa", nilai: true, teks: "abc" }]).kontakWa, "628823212784");
  assert.equal(dariBaris([]).kontakWa, "628823212784");
});

test("kuota per jurusan dibaca dari kolom angka; nilai aneh diabaikan", () => {
  const h = dariBaris([
    { kunci: "kuota_dkv", nilai: true, angka: 36 },
    { kunci: "kuota_rpl", nilai: true, angka: null },
    { kunci: "kuota_tkr", nilai: true, angka: 0 },
    { kunci: "kuota_tsm", nilai: true, angka: -5 },
    { kunci: "kuota_titl", nilai: true, angka: "12" },
  ]);
  assert.deepEqual({ ...h.kuotaJurusan }, { DKV: 36, TKR: 0 });
  assert.deepEqual({ ...dariBaris([]).kuotaJurusan }, {});
});

test("statusKuota: tanpa batas, sisa, penuh", () => {
  assert.deepEqual({ ...statusKuota(null, 10) }, { terbatas: false, penuh: false, sisa: null });
  assert.deepEqual({ ...statusKuota(36, 30) }, { terbatas: true, penuh: false, sisa: 6 });
  assert.deepEqual({ ...statusKuota(36, 36) }, { terbatas: true, penuh: true, sisa: 0 });
  assert.deepEqual({ ...statusKuota(36, 40) }, { terbatas: true, penuh: true, sisa: 0 });
  assert.equal(statusKuota(0, 0).penuh, true);
});

test("hasil seleksi: bawaan tampil; disembunyikan → Diterima/Ditolak jadi Diverifikasi", () => {
  assert.equal(dariBaris([]).hasilDiumumkan, true);
  assert.equal(dariBaris([{ kunci: "hasil_diumumkan", nilai: false }]).hasilDiumumkan, false);
  assert.equal(sembunyikanHasil("Diterima", true), "Diterima");
  assert.equal(sembunyikanHasil("Diterima", undefined), "Diterima");
  assert.equal(sembunyikanHasil("Diterima", false), "Diverifikasi");
  assert.equal(sembunyikanHasil("ditolak", false), "Diverifikasi");
  assert.equal(sembunyikanHasil("Pending", false), "Pending");
  assert.equal(sembunyikanHasil("Diverifikasi", false), "Diverifikasi");
  assert.equal(sembunyikanHasil(undefined, false), undefined);
});

test("perawatan menutup pendaftaran & tidak menjanjikan tanggal buka", () => {
  const h = dariBaris([{ kunci: "perawatan", nilai: true }, { kunci: "pesan_perawatan", nilai: true, teks: "Kembali jam 14.00" }, { kunci: "jadwal_buka", nilai: true, waktu: "2027-03-05T01:00:00Z" }], SEKARANG);
  assert.equal(h.perawatan, true);
  assert.equal(h.pesanPerawatan, "Kembali jam 14.00");
  assert.equal(h.spmbDibuka, false);
  assert.equal(pesanKhusus(h, SEKARANG), "");
  assert.equal(dariBaris([{ kunci: "perawatan", nilai: false }], SEKARANG).perawatan, false);
  assert.equal(dariBaris([], SEKARANG).perawatan, false);
});

test("hitung mundur: hari, jam, kurang dari sejam, sudah lewat", () => {
  const JAM = 3600000;
  assert.equal(teksHitungMundur(12 * 24 * JAM + 5), "Pendaftaran ditutup dalam 12 hari");
  assert.equal(teksHitungMundur(25 * JAM), "Pendaftaran ditutup dalam 1 hari");
  assert.equal(teksHitungMundur(5 * JAM + 100), "Pendaftaran ditutup dalam 5 jam");
  assert.equal(teksHitungMundur(20 * 60000), "Pendaftaran ditutup dalam kurang dari 1 jam");
  assert.equal(teksHitungMundur(0), "");
  assert.equal(teksHitungMundur(-5), "");
  assert.equal(teksHitungMundur(NaN), "");
});

test("ringkasKuota: hanya jurusan berkuota, berurutan, dengan nada", () => {
  const { ringkasKuota } = ctx.window.Pengaturan;
  const r = ringkasKuota([
    { jurusan: "TSM", kuota: 36, terisi: 36 },
    { jurusan: "DKV", kuota: 36, terisi: 10 },
    { jurusan: "RPL", kuota: 36, terisi: 32 },
    { jurusan: "TKR", kuota: null, terisi: 5 },
    { jurusan: "XXX", kuota: 10, terisi: 1 },
  ]).map((x) => ({ ...x }));
  assert.deepEqual(r.map((x) => x.jurusan), ["DKV", "RPL", "TSM"]);
  assert.deepEqual(r.map((x) => x.nada), ["ok", "wait", "bad"]);
  assert.equal(r[0].teks, "DKV · sisa 26 kursi");
  assert.equal(r[2].teks, "TSM · penuh");
  assert.equal(ringkasKuota(null).length, 0);
  assert.equal(ringkasKuota([]).length, 0);
});

test("ringkasKuota: nama jurusan & persen terisi untuk grafik", () => {
  const { ringkasKuota } = ctx.window.Pengaturan;
  const r = ringkasKuota([
    { jurusan: "RPL", kuota: 36, terisi: 9 },
    { jurusan: "TKR", kuota: 30, terisi: 45 },
    { jurusan: "DKV", kuota: 0, terisi: 0 },
  ]).map((x) => ({ ...x }));
  const per = Object.fromEntries(r.map((x) => [x.jurusan, x]));
  assert.equal(per.RPL.persen, 25);
  assert.equal(per.RPL.nama, "Rekayasa Perangkat Lunak");
  assert.equal(per.TKR.persen, 100); // melebihi kuota tidak lewat 100%
  assert.equal(per.DKV.persen, 100); // kuota 0 = penuh
  assert.equal(per.DKV.nada, "bad");
});
