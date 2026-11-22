import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync(new URL("../assets/js/sheetson.js", import.meta.url), "utf8");

function load(fakeFetch) {
  const ctx = {
    window: { APP_CONFIG: { sheetson: { apiKey: "KEY", spreadsheetId: "SHEET" } } },
    fetch: fakeFetch,
    Date,
    JSON,
    encodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.window.Sheetson;
}

test("getRows menggabungkan semua halaman dan selalu memakai penanda anti-cache", async () => {
  const urls = [];
  const pages = [
    { results: [{ rowIndex: 2 }, { rowIndex: 3 }], hasNextPage: true },
    { results: [{ rowIndex: 4 }], hasNextPage: false },
  ];
  const S = load(async (url, opts) => {
    urls.push(url);
    assert.equal(opts.cache, "no-store");
    assert.equal(opts.headers.Authorization, "Bearer KEY");
    assert.equal(opts.headers["X-Spreadsheet-Id"], "SHEET");
    return { ok: true, json: async () => pages.shift() };
  });
  const rows = await S.getRows("Verifikasi_Berkas");
  assert.deepEqual([...rows.map((r) => r.rowIndex)], [2, 3, 4]);
  assert.equal(urls.length, 2);
  assert.ok(urls.every((u) => u.includes("/v2/sheets/Verifikasi_Berkas?") && /[?&]_=\d+/.test(u)));
  assert.ok(urls[1].includes("skip=2"));
});

test("patchRow mengirim PATCH hanya berisi data yang diubah", async () => {
  let call;
  const S = load(async (url, opts) => {
    call = { url, opts };
    return { ok: true, json: async () => ({ rowIndex: 7 }) };
  });
  await S.patchRow("Keuangan_Voucher", 7, { statusBiayaDaftar: "Lunas" });
  assert.equal(call.opts.method, "PATCH");
  assert.ok(call.url.endsWith("/v2/sheets/Keuangan_Voucher/7"));
  assert.equal(call.opts.body, JSON.stringify({ statusBiayaDaftar: "Lunas" }));
});

test("patchRow melempar error bila server menolak", async () => {
  const S = load(async () => ({ ok: false, status: 429, json: async () => ({}) }));
  await assert.rejects(() => S.patchRow("X", 2, { a: 1 }), /429/);
});

test("normNisn & escapeHtml", () => {
  const S = load(async () => ({}));
  assert.equal(S.normNisn("0099"), "99");
  assert.equal(S.normNisn(99), "99");
  assert.equal(S.escapeHtml('<a "b">&'), "&lt;a &quot;b&quot;&gt;&amp;");
  assert.equal(S.escapeHtml(null), "");
});
