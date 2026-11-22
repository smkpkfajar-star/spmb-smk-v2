/* ============================================================
   admin-modules.js — semua modul admin dalam SATU halaman.
   Sidebar & topbar tetap; hanya isi #app yang berganti (tanpa muat ulang halaman).
   Rute: dashboard.html#verifikasi, #keuangan, #tes-fisik, #superadmin (kosong = dashboard).
   ============================================================ */
(function (root) {
  const MODULES = {
    "dashboard": {
      title: 'Dashboard',
      roles: [],
      async mount(app, profile) {

        const esc = Sheetson.escapeHtml;
        const ditolak = false;
        const cards = AdminAuth.modulesFor(profile.role)
          .map(
            (m) => `<a href="${m.href}" class="group block px-4 py-3.5 hover:bg-brand-50">
              <span class="flex items-center justify-between text-[15px] font-medium">${esc(m.title)}<span aria-hidden="true" class="text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-900">→</span></span>
              <span class="mt-0.5 block text-[13.5px] text-ink-500">${esc(m.desc)}</span></a>`
          )
          .join("");
        app.innerHTML = `
          ${ditolak ? `<p class="mb-4 bg-warn-50 p-4 text-[15px] font-semibold text-warn-700" role="alert">Anda tidak punya akses ke halaman itu. Pilih modul sesuai tugas Anda.</p>` : ""}
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 class="text-[26px] font-semibold tracking-tight">Halo, ${esc(profile.nama_lengkap || "Petugas")}</h1>
              <p class="mt-1 text-[15px] text-ink-600">Ringkasan pendaftaran SPMB 2026/2027.</p>
            </div>
            <button id="reloadDash" type="button" class="btn rounded-full px-4 py-2 text-[14px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))]">Muat ulang</button>
          </div>
          <div id="newSlot"></div>
          <div id="dashStats" class="mt-6"><div class="grid grid-cols-2 gap-4 sm:grid-cols-5" aria-hidden="true"><div class="skeleton h-16"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div><div class="skeleton h-16"></div></div></div>

          <div class="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
            <section aria-labelledby="terbaruJudul">
              <h2 id="terbaruJudul" class="text-[15px] font-semibold">Pendaftar terbaru</h2>
              <div id="terbaru" class="mt-3"><div class="space-y-2" aria-hidden="true"><div class="skeleton h-12"></div><div class="skeleton h-12"></div><div class="skeleton h-12"></div><div class="skeleton h-12"></div><div class="skeleton h-12"></div></div></div>
            </section>
            <section aria-labelledby="modulJudul">
              <h2 id="modulJudul" class="text-[15px] font-semibold">Modul tugas Anda</h2>
              <div class="mt-3 divide-y divide-hairline rounded-lg border border-hairline bg-white">${cards}</div>
              <p class="mt-3 text-[13px] text-ink-500">Perubahan langsung tersimpan di Google Sheets panitia, yang tetap bisa dibuka seperti biasa.</p>
            </section>
          </div>`;

        const val = (v, d) => (v && v !== "-" ? v : d);
        let jumlahDiketahui = 0;
        const showNew = AdminUI.newBanner(document.getElementById("newSlot"), () => loadDash(true));
        const watcher = AdminUI.watchNew("Data_Pendaftar", () => jumlahDiketahui, showNew);
        async function loadDash(fresh) {
          const $s = document.getElementById("dashStats");
          const $t = document.getElementById("terbaru");
          const bar = document.createElement("div");
          bar.className = "loadbar";
          document.body.appendChild(bar);
          try {
            const [daftar, verif, uang, fisik] = await Promise.all(
              ["Data_Pendaftar", "Verifikasi_Berkas", "Keuangan_Voucher", "Tes_Fisik_Seragam"].map((s) => Sheetson.getRows(s, { fresh: fresh === true }))
            );
            jumlahDiketahui = daftar.length;
            watcher.reset();
            showNew(0);
            const count = (rows, f, v, d) => rows.filter((r) => val(r[f], d) === v).length;
            $s.innerHTML = AdminUI.statCards([
              { label: "total pendaftar", value: daftar.length },
              { label: "pending", value: count(verif, "statusPendaftaran", "Pending", "Pending"), tone: "wait" },
              { label: "diterima", value: count(verif, "statusPendaftaran", "Diterima", "Pending"), tone: "ok" },
              { label: "sudah lunas", value: count(uang, "statusBiayaDaftar", "Lunas", "Belum Bayar"), tone: "info" },
              { label: "sudah tes fisik", value: fisik.filter((r) => val(r.statusTesFisik, "Belum Tes") !== "Belum Tes").length, tone: "ok" },
            ]);
            const status = new Map(verif.map((r) => [r.noPendaftaran, r.statusPendaftaran]));
            const recent = [...daftar].sort((a, b) => AdminUI.waktuKey(b.createdAt) - AdminUI.waktuKey(a.createdAt)).slice(0, 10);
            $t.innerHTML = recent.length
              ? `<div class="overflow-x-auto rounded-lg border border-hairline bg-white"><table class="w-full text-left text-[14.5px]">
                  <thead class="border-b border-hairline bg-brand-50 text-[12.5px] text-ink-500"><tr>
                    <th scope="col" class="px-4 py-3 font-medium">Siswa</th><th scope="col" class="px-4 py-3 font-medium">Jurusan</th>
                    <th scope="col" class="px-4 py-3 font-medium">Daftar</th><th scope="col" class="px-4 py-3 font-medium">Status</th></tr></thead>
                  <tbody class="divide-y divide-hairline">${recent
                    .map(
                      (r) => `<tr><td class="px-4 py-3"><b class="font-semibold">${esc(r.namaLengkap || "-")}</b><br><span class="font-mono text-[12.8px] text-ink-500">${esc(r.noPendaftaran || "")}</span></td>
                        <td class="px-4 py-3">${esc(r.jurusan1 || "-")}</td>
                        <td class="px-4 py-3 font-mono text-[13px] text-ink-600">${esc(AdminUI.formatWaktu(r.createdAt))}</td>
                        <td class="px-4 py-3">${AdminUI.badge(status.get(r.noPendaftaran) || "Pending")}</td></tr>`
                    )
                    .join("")}</tbody></table></div>`
              : `<div class="rounded-lg border border-dashed border-hairline p-10 text-center text-[15px] text-ink-500">Belum ada pendaftar.</div>`;
            bar.remove();
          } catch (e) {
            bar.remove();
            $s.innerHTML = `<p class="bg-red-50 p-4 text-[15px] font-semibold text-red-700">${esc(e.message)}. Periksa internet lalu tekan Muat ulang.</p>`;
          }
        }
        document.getElementById("reloadDash").addEventListener("click", () => loadDash(true));
        loadDash();
      
      },
    },
    "verifikasi": {
      title: 'Verifikasi Berkas',
      roles: ["verifikasi"],
      async mount(app, profile) {

        const esc = Sheetson.escapeHtml;

        const links = (row) => {
          const urls = String(row.urlBerkas || "").split(/\r?\n/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
          if (!urls.length) return `<span class="text-ink-500">Belum ada</span>`;
          return urls
            .map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="mr-2 inline-block font-bold text-brand-700 underline">Berkas ${i + 1}</a>`)
            .join("");
        };
        const toWa = (n) => {
          const d = String(n || "").replace(/\D/g, "");
          return d.startsWith("0") ? "62" + d.slice(1) : d.startsWith("62") ? d : d ? "62" + d : "";
        };
        const today = () => new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");

        const hitung = (rows, field, value, fallback) => rows.filter((r) => (r[field] && r[field] !== "-" ? r[field] : fallback) === value).length;
        AdminUI.modulePage({
          sheet: "Verifikasi_Berkas",
          stats: (rows) => [
            { label: "total", value: rows.length, filter: "" },
            { label: "pending", value: hitung(rows, "statusPendaftaran", "Pending", "Pending"), tone: "wait", filter: "Pending" },
            { label: "diverifikasi", value: hitung(rows, "statusPendaftaran", "Diverifikasi", "Pending"), tone: "info", filter: "Diverifikasi" },
            { label: "diterima", value: hitung(rows, "statusPendaftaran", "Diterima", "Pending"), tone: "ok", filter: "Diterima" },
            { label: "ditolak", value: hitung(rows, "statusPendaftaran", "Ditolak", "Pending"), tone: "bad", filter: "Ditolak" },
          ],
          title: "Verifikasi Berkas",
          intro: "Periksa berkas, ubah status, dan hubungi orang tua bila ada yang kurang.",
          filter: { field: "statusPendaftaran", label: "Status pendaftaran", options: ["Pending", "Diverifikasi", "Diterima", "Ditolak"] },
          saring: [
            { id: "berkas", label: "Status berkas", get: (r) => AdminUI.isi(r.statusBerkas, "Belum diisi"), options: ["Belum Unggah", "Sudah Unggah", "Gagal Unggah", "Berkas Terverifikasi", "Berkas Ditolak"] },
            { id: "catatan", label: "Catatan", get: (r) => (AdminUI.isi(r.catatanAdmin, "") ? "Ada catatan" : "Tanpa catatan"), options: ["Ada catatan", "Tanpa catatan"] },
            { id: "wa", label: "Chat ortu", get: (r) => (AdminUI.isi(r.tglFollowUpWa, "") ? "Sudah dihubungi" : "Belum dihubungi"), options: ["Belum dihubungi", "Sudah dihubungi"] },
          ],
          columns: [
            { label: "Siswa", sortKey: "namaLengkap", render: (r) => `<b>${esc(r.namaLengkap || "-")}</b><br><span class="font-mono text-[12.5px] text-ink-500">${esc(r.noPendaftaran || "")}<br>NISN ${esc(r.nisn || "-")}</span>` },
            { label: "Jurusan", sortKey: "jurusan1", render: (r) => esc(r.jurusan1 || "-") + (r.jurusan2 && r.jurusan2 !== "-" ? `<br><span class="text-[13px] text-ink-500">Cadangan: ${esc(r.jurusan2)}</span>` : "") },
            { label: "Status verifikasi", sortKey: "statusPendaftaran", render: (r) => AdminUI.badge(r.statusPendaftaran || "Pending") },
            { label: "Berkas", wrap: true, render: links },
            { label: "Catatan", wrap: true, render: (r) => esc(r.catatanAdmin && r.catatanAdmin !== "-" ? r.catatanAdmin : "") + (r.tglFollowUpWa && r.tglFollowUpWa !== "-" ? `<br><span class="text-[13px] text-ink-500">WA ortu: ${esc(r.tglFollowUpWa)}</span>` : "") },
            { label: "Status berkas", sortKey: "statusBerkas", render: (r) => AdminUI.badge(r.statusBerkas) },
          ],
          editTitle: (r) => `Verifikasi: ${r.namaLengkap || r.noPendaftaran}`,
          fields: [
            { name: "statusBerkas", label: "Status berkas", type: "select", options: ["Belum Unggah", "Sudah Unggah", "Gagal Unggah", "Berkas Terverifikasi", "Berkas Ditolak"] },
            { name: "statusPendaftaran", label: "Status pendaftaran", type: "select", options: ["Pending", "Diverifikasi", "Diterima", "Ditolak"], help: "Siswa melihat status ini di menu Cek Status." },
            { name: "catatanAdmin", label: "Catatan untuk siswa", type: "textarea", help: "Contoh: Foto KK buram, mohon unggah ulang." },
          ],
          actions: [
            {
              label: "Chat ortu",
              show: (r) => !!toWa(r.waOrtu),
              run: async (r, page) => {
                const pesan =
                  `Assalamualaikum / Selamat siang Bapak/Ibu orang tua dari *${r.namaLengkap}*.\n\n` +
                  `Kami dari Panitia SPMB SMK Tamansiswa Jetis terkait pendaftaran nomor *${r.noPendaftaran}*.\n` +
                  (r.catatanAdmin && r.catatanAdmin !== "-" ? `Catatan: ${r.catatanAdmin}\n` : "") +
                  `\nTerima kasih.`;
                window.open(`https://wa.me/${toWa(r.waOrtu)}?text=${encodeURIComponent(pesan)}`, "_blank", "noopener");
                try {
                  const tgl = today();
                  await Sheetson.patchRow("Verifikasi_Berkas", r.rowIndex, { tglFollowUpWa: tgl });
                  r.tglFollowUpWa = tgl;
                  page.rerender();
                } catch (e) {
                  AdminUI.toast("WhatsApp dibuka, tapi tanggal follow-up gagal disimpan.", "error");
                }
              },
            },
          ],
        });
      
      },
    },
    "keuangan": {
      title: 'Keuangan & Voucher',
      roles: ["keuangan"],
      async mount(app, profile) {

        const esc = Sheetson.escapeHtml;
        const rupiah = (v) => {
          const n = Number(v);
          return Number.isFinite(n) && n > 0 ? "Rp " + n.toLocaleString("id-ID") : "-";
        };

        const hitung = (rows, field, value, fallback) => rows.filter((r) => (r[field] && r[field] !== "-" ? r[field] : fallback) === value).length;
        AdminUI.modulePage({
          sheet: "Keuangan_Voucher",
          stats: (rows) => [
            { label: "total", value: rows.length, filter: "" },
            { label: "lunas", value: hitung(rows, "statusBiayaDaftar", "Lunas", "Belum Bayar"), tone: "ok", filter: "Lunas" },
            { label: "belum bayar", value: hitung(rows, "statusBiayaDaftar", "Belum Bayar", "Belum Bayar"), tone: "wait", filter: "Belum Bayar" },
            { label: "voucher pending", value: hitung(rows, "statusVoucher", "Pending", "Tidak Ada"), tone: "info" },
          ],
          title: "Keuangan & Voucher",
          intro: "Catat pembayaran, metode bayar, dan validasi kode voucher.",
          filter: { field: "statusBiayaDaftar", label: "Status bayar", options: ["Belum Bayar", "Lunas"] },
          saring: [
            { id: "voucher", label: "Voucher", get: (r) => AdminUI.isi(r.statusVoucher, "Tidak Ada"), options: ["Tidak Ada", "Pending", "Valid", "Tidak Valid"] },
            { id: "metode", label: "Metode", get: (r) => AdminUI.isi(r.metodePembayaran, "Belum diisi"), options: ["Belum diisi", "Tunai", "Transfer"] },
          ],
          columns: [
            { label: "Siswa", sortKey: "namaLengkap", render: (r) => `<b>${esc(r.namaLengkap || "-")}</b><br><span class="font-mono text-[12.5px] text-ink-500">${esc(r.noPendaftaran || "")}</span>` },
            { label: "Voucher", render: (r) => (r.kodeVoucher && r.kodeVoucher !== "-" ? `<b>${esc(r.kodeVoucher)}</b> ` : "") + AdminUI.badge(r.statusVoucher || "Tidak Ada") },
            { label: "Potongan", sortKey: "potonganBiaya", render: (r) => esc(rupiah(r.potonganBiaya)) },
            { label: "Status bayar", sortKey: "statusBiayaDaftar", render: (r) => AdminUI.badge(r.statusBiayaDaftar || "Belum Bayar") },
            { label: "Metode", render: (r) => esc(r.metodePembayaran || "-") },
            { label: "Catatan", wrap: true, render: (r) => esc(r.catatanBendahara && r.catatanBendahara !== "-" ? r.catatanBendahara : "") },
          ],
          editTitle: (r) => `Keuangan: ${r.namaLengkap || r.noPendaftaran}`,
          fields: [
            { name: "statusBiayaDaftar", label: "Status pembayaran", type: "select", options: ["Belum Bayar", "Lunas"] },
            { name: "metodePembayaran", label: "Metode pembayaran", type: "select", options: ["-", "Tunai", "Transfer"] },
            { name: "statusVoucher", label: "Status voucher", type: "select", options: ["Tidak Ada", "Pending", "Valid", "Tidak Valid"] },
            { name: "potonganBiaya", label: "Potongan biaya (Rp)", type: "number", help: "Angka saja, tanpa titik. Contoh: 250000" },
            { name: "catatanBendahara", label: "Catatan bendahara", type: "textarea" },
          ],
        });
      
      },
    },
    "tes-fisik": {
      title: 'Tes Fisik & Seragam',
      roles: ["tes_fisik"],
      async mount(app, profile) {

        const esc = Sheetson.escapeHtml;
        const num = (v, unit) => (Number(v) > 0 ? `${esc(v)} ${unit}` : "-");
        const today = () => new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");

        const hitung = (rows, field, value, fallback) => rows.filter((r) => (r[field] && r[field] !== "-" ? r[field] : fallback) === value).length;
        AdminUI.modulePage({
          sheet: "Tes_Fisik_Seragam",
          stats: (rows) => [
            { label: "total", value: rows.length, filter: "" },
            { label: "belum tes", value: hitung(rows, "statusTesFisik", "Belum Tes", "Belum Tes"), tone: "wait", filter: "Belum Tes" },
            { label: "lulus tes", value: hitung(rows, "statusTesFisik", "Lulus Tes", "Belum Tes"), tone: "ok", filter: "Lulus Tes" },
            { label: "tidak lulus", value: hitung(rows, "statusTesFisik", "Tidak Lulus", "Belum Tes"), tone: "bad", filter: "Tidak Lulus" },
            { label: "sudah ukur seragam", value: rows.filter((r) => r.ukuranSeragam && r.ukuranSeragam !== "-").length, tone: "info" },
          ],
          title: "Tes Fisik & Seragam",
          intro: "Isi hasil pengukuran, tes fisik, dan ukuran seragam.",
          filter: { field: "statusTesFisik", label: "Status tes", options: ["Belum Tes", "Lulus Tes", "Tidak Lulus"] },
          saring: [
            { id: "seragam", label: "Seragam", get: (r) => AdminUI.isi(r.ukuranSeragam, "Belum diukur"), options: ["Belum diukur", "S", "M", "L", "XL", "XXL"] },
            { id: "tato", label: "Tato/tindik", get: (r) => AdminUI.isi(r.tatoTindik, "Belum diisi"), options: ["Belum diisi", "Tidak Ada", "Ada"] },
          ],
          columns: [
            { label: "Siswa", sortKey: "namaLengkap", render: (r) => `<b>${esc(r.namaLengkap || "-")}</b><br><span class="font-mono text-[12.5px] text-ink-500">${esc(r.noPendaftaran || "")}</span>` },
            { label: "Tinggi / Berat", sortKey: "tinggiBadan", render: (r) => `${num(r.tinggiBadan, "cm")} / ${num(r.beratBadan, "kg")}` },
            { label: "Tato/Tindik", render: (r) => esc(r.tatoTindik || "-") },
            { label: "Status tes", sortKey: "statusTesFisik", render: (r) => AdminUI.badge(r.statusTesFisik || "Belum Tes") },
            { label: "Seragam", sortKey: "ukuranSeragam", render: (r) => `<b>${esc(r.ukuranSeragam || "-")}</b>` + (r.tglUkurSeragam && r.tglUkurSeragam !== "-" ? `<br><span class="text-[13px] text-ink-500">${esc(r.tglUkurSeragam)}</span>` : "") },
            { label: "Catatan", wrap: true, render: (r) => esc(r.catatanTesFisik && r.catatanTesFisik !== "-" ? r.catatanTesFisik : "") },
          ],
          editTitle: (r) => `Tes fisik: ${r.namaLengkap || r.noPendaftaran}`,
          fields: [
            { name: "tinggiBadan", label: "Tinggi badan (cm)", type: "number" },
            { name: "beratBadan", label: "Berat badan (kg)", type: "number" },
            { name: "tatoTindik", label: "Tato / tindik", type: "select", options: ["-", "Tidak Ada", "Ada"] },
            { name: "statusTesFisik", label: "Hasil tes fisik", type: "select", options: ["Belum Tes", "Lulus Tes", "Tidak Lulus"] },
            { name: "ukuranSeragam", label: "Ukuran seragam", type: "select", options: ["-", "S", "M", "L", "XL", "XXL"], help: "Tanggal ukur terisi otomatis saat ukuran diubah." },
            { name: "catatanTesFisik", label: "Catatan", type: "textarea" },
          ],
          beforeSave: (changes) => {
            if (changes.ukuranSeragam && changes.ukuranSeragam !== "-") changes.tglUkurSeragam = today();
            return changes;
          },
        });
      
      },
    },
    "superadmin": {
      title: 'Superadmin',
      roles: ["superadmin"],
      async mount(app, profile) {
        app.innerHTML = `
      <h1 class="text-[26px] font-semibold tracking-tight">Superadmin</h1>
      <p class="mt-1 text-[15px] text-ink-600">Rekap pendaftaran, unduh data, kelola akun petugas, dan reset password.</p>

      <!-- REKAP -->
      <section class="mt-6" aria-labelledby="rekapJudul">
        <div class="flex items-center justify-between gap-3">
          <h2 id="rekapJudul" class="text-lg font-semibold">Rekap</h2>
          <button id="reloadRekap" type="button" class="rounded-full border-2 border-line bg-white px-4 py-2 text-[15px] font-semibold hover:border-ink-500">Muat ulang</button>
        </div>
        <div id="rekap" class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div class="skeleton h-32" aria-hidden="true"></div><div class="skeleton h-32" aria-hidden="true"></div><div class="skeleton h-32" aria-hidden="true"></div><div class="skeleton h-32" aria-hidden="true"></div></div>
      </section>

      <!-- UNDUH -->
      <section class="mt-8 rounded-lg border border-hairline bg-white p-5" aria-labelledby="unduhJudul">
        <h2 id="unduhJudul" class="text-lg font-semibold">Unduh data (bisa dibuka di Excel)</h2>
        <div class="mt-3 flex flex-wrap gap-2" id="unduh"></div>
      </section>

      <!-- PETUGAS -->
      <section class="mt-8 rounded-lg border border-hairline bg-white p-5" aria-labelledby="petugasJudul">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 id="petugasJudul" class="text-lg font-semibold">Akun petugas</h2>
          <button id="btnTambah" type="button" class="rounded-full bg-brand-600 px-5 py-2.5 text-[15px] font-bold text-white hover:bg-brand-700">+ Tambah petugas</button>
        </div>
        <div id="petugas" class="mt-3 space-y-2" aria-hidden="true"><div class="skeleton h-12"></div><div class="skeleton h-12"></div><div class="skeleton h-12"></div></div>
      </section>

      <!-- RESET PASSWORD -->
      <section class="mt-8 rounded-lg border border-hairline bg-white p-5" aria-labelledby="resetJudul">
        <h2 id="resetJudul" class="text-lg font-semibold">Reset password</h2>
        <p class="mt-1 text-[15px] text-ink-600">Untuk siswa (isi NISN) atau petugas (isi username) yang lupa password.</p>
        <form id="resetForm" class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" novalidate>
          <div>
            <label for="resetSiapa" class="mb-1.5 block text-[15px] font-semibold">NISN / username</label>
            <input id="resetSiapa" type="text" class="w-full rounded-xl border-2 border-line px-3.5 py-3 text-base focus:border-brand-600 focus:outline-none" />
          </div>
          <div>
            <label for="resetPw" class="mb-1.5 block text-[15px] font-semibold">Password baru (min. 8)</label>
            <input id="resetPw" type="text" autocomplete="off" class="w-full rounded-xl border-2 border-line px-3.5 py-3 text-base focus:border-brand-600 focus:outline-none" />
          </div>
          <button type="submit" class="rounded-full bg-brand-600 px-6 py-3 text-base font-bold text-white hover:bg-brand-700 disabled:opacity-60">Reset</button>
        </form>
        <p id="resetInfo" class="mt-3 hidden rounded-2xl p-3 text-[15px] font-semibold"></p>
      </section>
    `;

        const esc = Sheetson.escapeHtml;
        const db = AdminAuth.getClient();
        const SHEETS = ["Data_Pendaftar", "Verifikasi_Berkas", "Keuangan_Voucher", "Tes_Fisik_Seragam"];
        const STAFF_ROLES = ["verifikasi", "keuangan", "tes_fisik", "superadmin"];
        const today = new Date().toISOString().slice(0, 10);

        /* ---------- rekap ---------- */
        const card = (title, items) =>
          `<div class="rounded-lg border border-hairline bg-white p-5"><h3 class="text-[13px] text-ink-500">${esc(title)}</h3>
           <ul class="mt-2 space-y-1">${items.map(([k, v]) => `<li class="flex justify-between gap-3 text-[15px]"><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join("")}</ul></div>`;
        // urutan: daftar tetap bila diberikan (jurusan selalu tampil semua), selain itu terbanyak dulu
        const countBy = (rows, field, fallback, urutan) => {
          const m = new Map((urutan || []).map((k) => [k, 0]));
          rows.forEach((r) => {
            const k = r[field] && r[field] !== "-" ? r[field] : fallback;
            m.set(k, (m.get(k) || 0) + 1);
          });
          const e = [...m.entries()];
          return urutan ? e : e.sort((a, b) => b[1] - a[1]);
        };
        async function loadRekap(fresh) {
          const el = document.getElementById("rekap");
          document.body.classList.add("is-loading");
          try {
            const [daftar, verif, uang] = await Promise.all(SHEETS.slice(0, 3).map((s) => Sheetson.getRows(s, { fresh: fresh === true })));
            document.body.classList.remove("is-loading");
            el.innerHTML =
              `<div class="rounded-lg border border-hairline bg-white p-5"><h3 class="text-[13px] text-ink-500">Total pendaftar</h3><p class="mt-1 text-[40px] font-semibold leading-none tracking-tight tabular-nums">${daftar.length}</p></div>` +
              card("Per jurusan (pilihan 1)", countBy(daftar, "jurusan1", "-", AdminUI.URUTAN_JURUSAN)) +
              card("Status pendaftaran", countBy(verif, "statusPendaftaran", "Pending")) +
              card("Pembayaran", countBy(uang, "statusBiayaDaftar", "Belum Bayar"));
          } catch (e) {
            el.innerHTML = `<p class="rounded-2xl bg-red-50 p-4 text-[15px] font-semibold text-red-700">${esc(e.message)}</p>`;
          }
        }
        document.getElementById("reloadRekap").addEventListener("click", () => loadRekap(true));
        loadRekap();

        /* ---------- unduh CSV ---------- */
        const unduh = document.getElementById("unduh");
        SHEETS.forEach((s) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "rounded-full border-2 border-line bg-white px-4 py-2.5 text-[15px] font-semibold hover:border-ink-500";
          b.textContent = s.replace(/_/g, " ") + ".csv";
          b.addEventListener("click", async () => {
            b.disabled = true;
            try {
              const rows = await Sheetson.getRows(s, { fresh: true });
              // kolom bantu tampilan (_waktu, dst.) tidak ikut diunduh
              const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== "rowIndex" && !k.startsWith("_"));
              AdminUI.downloadFile(`${s}-${today}.csv`, AdminUI.toCsv(rows, keys.map((k) => ({ key: k, label: k }))));
              AdminUI.toast(`${rows.length} baris diunduh.`);
            } catch (e) {
              AdminUI.toast(e.message, "error");
            }
            b.disabled = false;
          });
          unduh.appendChild(b);
        });

        /* ---------- petugas ---------- */
        const domain = APP_CONFIG.emailDomain.petugas;
        const username = (email) => String(email || "").replace("@" + domain, "");
        async function loadPetugas() {
          const el = document.getElementById("petugas");
          const { data, error } = await db.from("profiles").select("id, email, nama_lengkap, role").in("role", STAFF_ROLES).order("role");
          if (error) {
            el.innerHTML = `<p class="rounded-2xl bg-red-50 p-4 text-[15px] font-semibold text-red-700">Gagal memuat petugas: ${esc(error.message)}</p>`;
            return;
          }
          el.innerHTML = `<ul class="divide-y divide-line/40">${data
            .map(
              (p) => `<li class="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><b>${esc(p.nama_lengkap || "-")}</b><br><span class="text-[14px] text-ink-500">username: ${esc(username(p.email))}</span></span>
                <label class="flex items-center gap-2 text-[15px]"><span class="sr-only">Peran ${esc(p.nama_lengkap)}</span>
                  <select data-role="${esc(p.id)}" ${p.id === profile.id ? "disabled" : ""} class="rounded-xl border-2 border-line bg-white px-3 py-2 text-[15px]">
                    ${[...STAFF_ROLES, "pendaftar"].map((r) => `<option value="${r}" ${r === p.role ? "selected" : ""}>${r === "pendaftar" ? "Nonaktif (bukan petugas)" : esc(AdminAuth.ROLE_LABEL[r])}</option>`).join("")}
                  </select></label>
              </li>`
            )
            .join("")}</ul>`;
        }
        document.getElementById("petugas").addEventListener("change", async (e) => {
          const sel = e.target.closest("select[data-role]");
          if (!sel) return;
          const { error } = await db.from("profiles").update({ role: sel.value }).eq("id", sel.dataset.role);
          if (error) AdminUI.toast("Gagal mengubah peran: " + error.message, "error");
          else AdminUI.toast("Peran diperbarui.");
          loadPetugas();
        });
        document.getElementById("btnTambah").addEventListener("click", () =>
          AdminUI.openDialog({
            title: "Tambah petugas",
            subtitle: "Berikan username dan password ini ke petugas.",
            fields: [
              { name: "nama", label: "Nama petugas", type: "text" },
              { name: "username", label: "Username (huruf kecil, tanpa spasi)", type: "text", help: "Contoh: bendahara1" },
              { name: "password", label: "Password (min. 8 karakter)", type: "text" },
              { name: "role", label: "Tugas", type: "select", options: ["verifikasi", "keuangan", "tes_fisik", "superadmin"] },
            ],
            values: { role: "verifikasi" },
            onSave: async (v) => {
              if (!/^[a-z0-9._-]{3,}$/.test(v.username)) throw new Error("Username minimal 3 huruf/angka, huruf kecil, tanpa spasi.");
              if (String(v.password).length < 8) throw new Error("Password minimal 8 karakter.");
              if (!v.nama || v.nama === "-") throw new Error("Isi nama petugas.");
              const tmp = supabase.createClient(APP_CONFIG.supabase.url, APP_CONFIG.supabase.anonKey, {
                auth: { persistSession: false, autoRefreshToken: false, storageKey: "spmb-tmp" },
              });
              const { data, error } = await tmp.auth.signUp({
                email: `${v.username}@${domain}`,
                password: String(v.password),
                options: { data: { nama_lengkap: v.nama } },
              });
              if (error) throw new Error(/already/i.test(error.message) ? "Username sudah dipakai." : error.message);
              await tmp.auth.signOut().catch(() => {});
              const { error: e2, data: upd } = await db.from("profiles").update({ role: v.role, nama_lengkap: v.nama }).eq("id", data.user.id).select("id");
              if (e2 || !upd || !upd.length) throw new Error("Akun dibuat, tapi peran gagal diatur. Atur peran dari daftar di bawah.");
              AdminUI.toast(`Petugas ${v.nama} ditambahkan.`);
              loadPetugas();
            },
          })
        );
        loadPetugas();

        /* ---------- reset password ---------- */
        document.getElementById("resetForm").addEventListener("submit", async (e) => {
          e.preventDefault();
          const info = document.getElementById("resetInfo");
          const siapa = document.getElementById("resetSiapa").value.trim().toLowerCase();
          const pw = document.getElementById("resetPw").value;
          const show = (msg, good) => {
            info.className = `mt-3 rounded-2xl p-3 text-[15px] font-semibold ${good ? "bg-ok-50 text-ok-700" : "bg-red-50 text-red-700"}`;
            info.textContent = msg;
          };
          if (!siapa || pw.length < 8) return show("Isi NISN/username dan password baru minimal 8 karakter.", false);
          const email = siapa.includes("@") ? siapa : /^\d+$/.test(siapa) ? `${siapa}@${APP_CONFIG.emailDomain.siswa}` : `${siapa}@${domain}`;
          const { error } = await db.rpc("reset_password", { target_email: email, new_password: pw });
          if (error) {
            show(
              /not found|tidak ditemukan/i.test(error.message)
                ? `Akun ${email.split("@")[0]} tidak ditemukan. Periksa lagi NISN/username.`
                : `Gagal mereset: ${error.message}. Pastikan file 01-admin-setup.sql sudah dijalankan di Supabase, atau hubungi pengelola teknis.`,
              false
            );
          } else {
            show(`Password ${email.split("@")[0]} sudah diganti. Beritahukan password baru secara langsung.`, true);
            document.getElementById("resetPw").value = "";
          }
        });
      
      },
    },
  };

  const SKELETON =
    '<div aria-hidden="true"><div class="skeleton h-7 w-56"></div><div class="skeleton mt-3 h-4 w-80 max-w-full"></div>' +
    '<div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">' + '<div class="skeleton h-16"></div>'.repeat(4) + "</div>" +
    '<div class="mt-8 space-y-2">' + '<div class="skeleton h-12"></div>'.repeat(6) + "</div></div>";

  async function start() {
    const profile = await root.AdminAuth.requireRole([]);
    root.AdminUI.renderShell(profile, "dashboard");
    const app = document.getElementById("app");
    let token = 0;

    async function go() {
      const id = root.AdminAuth.routeFromHash(root.location.hash);
      const mod = MODULES[id];
      const my = ++token;
      root.AdminUI.stopAllWatchers();
      document.querySelectorAll("[data-admin-overlay]").forEach((el) => el.remove());
      root.AdminUI.setActiveNav(id, mod.title);
      document.title = `${mod.title} — Admin SPMB`;
      root.scrollTo({ top: 0 });
      if (!root.AdminAuth.canOpen(profile.role, mod.roles)) {
        app.innerHTML = `<div class="rounded-lg border border-dashed border-hairline p-10 text-center">
          <p class="text-[17px] font-semibold">Anda tidak punya akses ke modul ini</p>
          <p class="mt-1 text-[15px] text-ink-600">Pilih modul sesuai tugas Anda di menu.</p>
          <a href="#dashboard" class="mt-5 inline-flex rounded-full bg-ink-900 px-5 py-2.5 text-[14px] font-medium text-white">Ke Dashboard</a></div>`;
        return;
      }
      app.innerHTML = SKELETON;
      try {
        await mod.mount(app, profile);
      } catch (e) {
        if (my === token) app.innerHTML = `<p class="bg-red-50 p-4 text-[15px] font-medium text-red-700">${root.Sheetson.escapeHtml(e.message)}</p>`;
      }
    }
    root.addEventListener("hashchange", go);
    go();
  }

  root.AdminModules = { MODULES, start };
  document.addEventListener("DOMContentLoaded", start);
})(window);
