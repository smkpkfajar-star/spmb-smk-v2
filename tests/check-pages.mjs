// Pemeriksa kontrak halaman: id yang dipakai JS, larangan Font Awesome,
// path script, dan pembungkus .field-error. Jalankan: node tests/check-pages.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const pages = { "index.html": read("index.html"), "daftar/index.html": read("daftar/index.html") };
const daftarJs = read("assets/js/daftar/daftar.js");
const mainJs = read("assets/js/beranda/main.js");
const problems = [];

const idsUsed = (js) => [...js.matchAll(/getElementById\(\s*["'`]([\w-]+)["'`]\s*\)/g)].map((m) => m[1]);
const hasId = (html, id) => new RegExp(`id=["']${id}["']`).test(html);

// dibuat dinamis oleh JS atau memang opsional
const OPTIONAL_DAFTAR_IDS = new Set(["kodeVoucher", "timelineContainer", "toast", "btnWhatsAppStatus", "spmbDitutup"]);
for (const id of new Set(idsUsed(daftarJs))) {
  if (!OPTIONAL_DAFTAR_IDS.has(id) && !hasId(pages["daftar/index.html"], id))
    problems.push(`daftar/index.html: id "${id}" dipakai daftar.js tapi tidak ada`);
}
for (const id of ["navbar", "navInner", "menuBtn", "mobileMenu", "year", "jurusan", "alur", "faq"]) {
  if (!hasId(pages["index.html"], id)) problems.push(`index.html: id "${id}" wajib ada`);
}
for (const id of new Set(idsUsed(mainJs))) {
  if (id !== "toast" && !hasId(pages["index.html"], id))
    problems.push(`index.html: id "${id}" dipakai main.js tapi tidak ada`);
}
if (/data-target=/.test(pages["index.html"])) problems.push("index.html: statistik [data-target] seharusnya dihapus");

for (const [name, html] of Object.entries(pages)) {
  if (/font-awesome|class="[^"]*\bfa-/.test(html)) problems.push(`${name}: masih memakai Font Awesome`);
  if (/["/]config\.js/.test(html)) problems.push(`${name}: masih memuat config.js`);
  const cdn = html.indexOf("cdn.tailwindcss.com");
  const cfg = html.indexOf("tailwind-config.js");
  if (cdn < 0 || cfg < 0 || cfg < cdn) problems.push(`${name}: tailwind-config.js harus dimuat sesudah cdn.tailwindcss.com`);
  // setiap .field-error harus berada di <div> yang juga memuat kolom isiannya
  const re = /<span[^>]*class="[^"]*\bfield-error\b/g;
  let m;
  while ((m = re.exec(html))) {
    // cari <div> yang benar-benar membungkus span (lewati div yang sudah ditutup)
    let depth = 0;
    let divStart = -1;
    const tags = [...html.slice(0, m.index).matchAll(/<\/?div\b/g)].reverse();
    for (const t of tags) {
      if (t[0] === "</div") depth++;
      else if (depth === 0) { divStart = t.index; break; }
      else depth--;
    }
    const block = html.slice(divStart, m.index);
    if (!/<(input|select|textarea)\b/.test(block) && !/<label[^>]*for=/.test(block))
      problems.push(`${name}: .field-error dekat posisi ${m.index} tidak satu <div> dengan kolomnya`);
  }
}
// Halaman admin & siswa: tema bersama, tanpa Font Awesome, tidak diindeks, tanpa password tertulis
for (const dir of ["admin", "siswa"]) {
  if (!existsSync(join(root, dir))) continue;
  for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith(".html"))) {
    const name = `${dir}/${file}`;
    const html = read(name);
    if (/http-equiv="refresh"/.test(html)) continue; // halaman pengalih
    if (/font-awesome|class="[^"]*\bfa-/.test(html)) problems.push(`${name}: masih memakai Font Awesome`);
    if (!/<meta name="robots" content="noindex"/.test(html)) problems.push(`${name}: tambahkan meta robots noindex`);
    const cdn = html.indexOf("cdn.tailwindcss.com"), cfg = html.indexOf("../assets/js/umum/tailwind-config.js");
    if (cdn < 0 || cfg < cdn) problems.push(`${name}: tailwind-config.js harus dimuat sesudah cdn.tailwindcss.com`);
    if (/supabase-js/.test(html) && !/app-config\.js/.test(html)) problems.push(`${name}: memakai Supabase tanpa app-config.js`);
    if (/pass\s*:\s*"|password\s*:\s*"[^"]+"/.test(html)) problems.push(`${name}: ada password tertulis`);
  }
}
if (/src="\.\/assets\//.test(pages["daftar/index.html"])) problems.push('daftar/index.html: path "./assets/" salah, pakai "../assets/"');
// Halaman akun siswa (/siswa/) = halaman sendiri; semua id yang dipakai siswa.js harus ada di sana
{
  const siswaHtml = read("siswa/index.html");
  const siswaJs = read("assets/js/siswa/siswa.js");
  const ids = new Set([...siswaJs.matchAll(/\$\(\s*["']([\w-]+)["']\s*\)/g)].map((m) => m[1]));
  for (const id of ids) if (!hasId(siswaHtml, id)) problems.push(`siswa/index.html: id "${id}" dipakai siswa.js tapi tidak ada`);
  if (/http-equiv="refresh"/.test(siswaHtml)) problems.push("siswa/index.html: seharusnya halaman akun, bukan pengalih");
  if (/id="siswaPanel"/.test(pages["index.html"])) problems.push("index.html: panel siswa tidak boleh lagi menjadi lapisan di beranda");
  if (/href="#login"/.test(pages["index.html"])) problems.push('index.html: tautan "#login" harus diganti "siswa/"');
}

// Semua nomor WhatsApp panitia yang tertulis harus sama
const WA_PANITIA = "628823212784";
const waFiles = ["index.html", "daftar/index.html", "assets/js/daftar/daftar.js"];
for (const dir of ["admin", "siswa"]) {
  if (existsSync(join(root, dir))) readdirSync(join(root, dir)).filter((f) => f.endsWith(".html")).forEach((f) => waFiles.push(`${dir}/${f}`));
}
for (const name of waFiles) {
  for (const m of read(name).matchAll(/wa\.me\/(\d{9,15})/g)) {
    if (m[1] !== WA_PANITIA) problems.push(`${name}: nomor WhatsApp ${m[1]} berbeda dari nomor panitia ${WA_PANITIA}`);
  }
}

// Urutan jurusan di mana pun: DKV, RPL, TITL, TKR, TSM
const URUTAN_JURUSAN = "DKV,RPL,TITL,TKR,TSM";
const urutan = (teks, re) => [...new Set([...teks.matchAll(re)].map((m) => m[1]))].join(",");
const cekUrutan = (nama, teks, re) => {
  const u = urutan(teks, re);
  if (u !== URUTAN_JURUSAN) problems.push(`${nama}: urutan jurusan ${u}, seharusnya ${URUTAN_JURUSAN}`);
};
cekUrutan("index.html (tab jurusan)", pages["index.html"], /data-jurusan="([A-Z]+)"/g);
cekUrutan("index.html (deskripsi)", pages["index.html"].match(/<meta\s+name="description"[\s\S]*?>/)[0], /\b(DKV|RPL|TITL|TKR|TSM)\b/g);
cekUrutan("daftar/index.html (jurusan utama)", pages["daftar/index.html"], /data-for="jurusan1" data-value="([A-Z]+)"/g);
cekUrutan("daftar/index.html (jurusan cadangan)", pages["daftar/index.html"], /data-for="jurusan2" data-value="([A-Z]+)"/g);
cekUrutan("daftar/index.html (pilihan jurusan1)", pages["daftar/index.html"].split('id="jurusan1"')[1].split("</select>")[0], /value="([A-Z]+)"/g);
cekUrutan("daftar/index.html (pilihan jurusan2)", pages["daftar/index.html"].split('id="jurusan2"')[1].split("</select>")[0], /value="([A-Z]+)"/g);
cekUrutan("admin/ui.js (URUTAN_JURUSAN)", read("assets/js/admin/ui.js").match(/const URUTAN_JURUSAN = [^\n]*/)[0], /"(DKV|RPL|TITL|TKR|TSM)"/g);

// Mode gelap: tema.js dimuat tepat setelah tailwind-config.js, dan ada tombol tema
for (const name of ["index.html", "daftar/index.html", "siswa/index.html", "admin/index.html", "admin/dashboard.html"]) {
  const h = read(name);
  if (!/tailwind-config\.js"><\/script>\s*<script src="[^"]*\/umum\/tema\.js"><\/script>/.test(h)) problems.push(`${name}: tema.js harus dimuat tepat setelah tailwind-config.js`);
  if (name !== "admin/dashboard.html" && !/data-tema\b/.test(h)) problems.push(`${name}: tombol mode gelap (data-tema) belum ada`);
}
if (!/data-tema\b/.test(read("assets/js/admin/ui.js"))) problems.push("admin/ui.js: tombol mode gelap di topbar belum ada");
// Warna tetap (#hex) di class arbitrer tidak ikut mode gelap — pakai variabel
for (const name of ["index.html", "daftar/index.html", "admin/index.html", "assets/js/admin/ui.js", "assets/js/admin/modules.js", "assets/js/daftar/daftar.js"]) {
  for (const m of read(name).matchAll(/-\[[^\]"'\s]*#(?:D4D4D4|E5E7EB|E5E5E5|EAEAEA|FBCFE8|171717|FAFAFA)[^\]"'\s]*\]/gi)) problems.push(`${name}: warna tetap ${m[0]} — pakai rgb(var(--…))`);
}

// Setiap latar .hero-bg punya lapisan cahaya bergerak sebagai anak pertama
for (const name of ["index.html", "daftar/index.html", "admin/index.html"]) {
  for (const m of read(name).matchAll(/<(?:section|main|label|div)[^>]*\bhero-bg\b[^>]*>(.{0,40})/g)) {
    if (!m[1].startsWith('<span class="cahaya"')) problems.push(`${name}: .hero-bg tanpa <span class="cahaya"> di awal`);
  }
}

// Setiap script/stylesheet lokal yang dimuat halaman harus benar-benar ada
const semuaHalaman = ["index.html"];
for (const dir of ["daftar", "siswa", "admin"]) {
  if (existsSync(join(root, dir))) readdirSync(join(root, dir)).filter((f) => f.endsWith(".html")).forEach((f) => semuaHalaman.push(`${dir}/${f}`));
}
for (const name of semuaHalaman) {
  for (const m of read(name).matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|svg|png|ico))"/g)) {
    if (!existsSync(join(root, dirname(name), m[1]))) problems.push(`${name}: file "${m[1]}" tidak ditemukan`);
  }
}

// Ikon tab browser & logo: setiap halaman utama memuat favicon + ikon PNG + ikon iPhone; logo lama "TS" teks tidak dipakai lagi
for (const name of semuaHalaman.filter((n) => !/http-equiv="refresh"/.test(read(n)))) {
  const html = read(name);
  for (const pola of [/rel="icon" href="[^"]*favicon\.ico"/, /rel="icon" href="[^"]*ikon-192\.png" type="image\/png"/, /rel="apple-touch-icon"/])
    if (!pola.test(html)) problems.push(`${name}: ikon belum dipasang (${pola.source})`);
}
for (const name of [...semuaHalaman, "assets/js/admin/ui.js"])
  if (/>TS<\/span>/.test(read(name))) problems.push(`${name}: masih memakai kotak teks "TS", ganti dengan assets/img/logo.webp`);

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} pelanggaran`);
  process.exit(1);
}
console.log("check-pages: semua lolos");
