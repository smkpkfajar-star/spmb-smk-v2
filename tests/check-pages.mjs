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
const OPTIONAL_DAFTAR_IDS = new Set(["kodeVoucher", "timelineContainer", "toast", "btnWhatsAppStatus"]);
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
    if (/font-awesome|class="[^"]*fa-/.test(html)) problems.push(`${name}: masih memakai Font Awesome`);
    if (!/<meta name="robots" content="noindex"/.test(html)) problems.push(`${name}: tambahkan meta robots noindex`);
    const cdn = html.indexOf("cdn.tailwindcss.com"), cfg = html.indexOf("../assets/js/umum/tailwind-config.js");
    if (cdn < 0 || cfg < cdn) problems.push(`${name}: tailwind-config.js harus dimuat sesudah cdn.tailwindcss.com`);
    if (/supabase-js/.test(html) && !/app-config\.js/.test(html)) problems.push(`${name}: memakai Supabase tanpa app-config.js`);
    if (/pass\s*:\s*"|password\s*:\s*"[^"]+"/.test(html)) problems.push(`${name}: ada password tertulis`);
  }
}
if (/src="\.\/assets\//.test(pages["daftar/index.html"])) problems.push('daftar/index.html: path "./assets/" salah, pakai "../assets/"');
if (!/id="siswaPanel"/.test(pages["index.html"])) problems.push("index.html: panel login siswa (#siswaPanel) wajib ada");

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

// Setiap script/stylesheet lokal yang dimuat halaman harus benar-benar ada
const semuaHalaman = ["index.html"];
for (const dir of ["daftar", "siswa", "admin"]) {
  if (existsSync(join(root, dir))) readdirSync(join(root, dir)).filter((f) => f.endsWith(".html")).forEach((f) => semuaHalaman.push(`${dir}/${f}`));
}
for (const name of semuaHalaman) {
  for (const m of read(name).matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css))"/g)) {
    if (!existsSync(join(root, dirname(name), m[1]))) problems.push(`${name}: file "${m[1]}" tidak ditemukan`);
  }
}

if (problems.length) {
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} pelanggaran`);
  process.exit(1);
}
console.log("check-pages: semua lolos");
