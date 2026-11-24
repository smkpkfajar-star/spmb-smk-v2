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
          </div>
          <div id="newSlot"></div>
          <div id="dobelSlot"></div>
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
        const NAMA_SHEET = ["Data_Pendaftar", "Verifikasi_Berkas", "Keuangan_Voucher", "Tes_Fisik_Seragam"];
        let data = null; // { daftar, verif, uang, fisik }
        const baruDash = new Set(); // pendaftar masuk sendiri yang belum diklik (rowIndex)
        const lencana = '<span class="mr-1.5 inline-block rounded-full bg-pink-500 px-1.5 py-0.5 align-middle text-[10.5px] font-semibold uppercase leading-none tracking-wide text-white">Baru</span>';
        const showNew = AdminUI.newBanner(document.getElementById("newSlot"), () => {
          baruDash.clear();
          showNew(0);
          tampilDash();
        });
        function tampilDash() {
          const { daftar, verif, uang, fisik } = data;
          const $s = document.getElementById("dashStats");
          const $t = document.getElementById("terbaru");
          const count = (rows, f, v, d) => rows.filter((r) => val(r[f], d) === v).length;
          $s.innerHTML = AdminUI.statCards([
            { label: "total pendaftar", value: daftar.length },
            { label: "pending", value: count(verif, "statusPendaftaran", "Pending", "Pending"), tone: "wait" },
            { label: "diterima", value: count(verif, "statusPendaftaran", "Diterima", "Pending"), tone: "ok" },
            { label: "sudah lunas", value: count(uang, "statusBiayaDaftar", "Lunas", "Belum Bayar"), tone: "info" },
            { label: "sudah tes fisik", value: fisik.filter((r) => val(r.statusTesFisik, "Belum Tes") !== "Belum Tes").length, tone: "ok" },
          ]);
          renderDobel(daftar);
          const status = new Map(verif.map((r) => [r.noPendaftaran, r.statusPendaftaran]));
          const recent = [...daftar].sort((a, b) => AdminUI.waktuKey(b.createdAt) - AdminUI.waktuKey(a.createdAt)).slice(0, 10);
          $t.innerHTML = recent.length
            ? `<div class="overflow-x-auto rounded-lg border border-hairline bg-white"><table class="w-full text-left text-[14.5px]">
                <thead class="border-b border-hairline bg-brand-50 text-[12.5px] text-ink-500"><tr>
                  <th scope="col" class="px-4 py-3 font-medium">Siswa</th><th scope="col" class="px-4 py-3 font-medium">Jurusan</th>
                  <th scope="col" class="px-4 py-3 font-medium">Daftar</th><th scope="col" class="px-4 py-3 font-medium">Status</th></tr></thead>
                <tbody class="divide-y divide-hairline">${recent
                  .map(
                    (r) => `<tr data-rid="${esc(r.rowIndex)}" class="${baruDash.has(String(r.rowIndex)) ? "bg-pink-100" : ""}"><td class="px-4 py-3">${baruDash.has(String(r.rowIndex)) ? lencana : ""}<b class="font-semibold">${esc(r.namaLengkap || "-")}</b><br><span class="font-mono text-[12.8px] text-ink-500">${esc(r.noPendaftaran || "")}</span></td>
                      <td class="px-4 py-3">${esc(r.jurusan1 || "-")}</td>
                      <td class="px-4 py-3 font-mono text-[13px] text-ink-600">${esc(AdminUI.formatWaktu(r.createdAt))}</td>
                      <td class="px-4 py-3">${AdminUI.badge(status.get(r.noPendaftaran) || "Pending")}</td></tr>`
                  )
                  .join("")}</tbody></table></div>`
            : `<div class="rounded-lg border border-dashed border-hairline p-10 text-center text-[15px] text-ink-500">Belum ada pendaftar.</div>`;
        }
        // klik baris baru → warnanya jadi sama seperti yang lain
        document.getElementById("terbaru").addEventListener("click", (e) => {
          const tr = e.target.closest("tr[data-rid]");
          if (!tr || !baruDash.delete(tr.dataset.rid)) return;
          tr.classList.remove("bg-pink-100");
          tr.querySelectorAll("span.uppercase").forEach((b) => b.remove());
          showNew(baruDash.size);
        });
        // Langsung: pendaftar baru masuk sendiri. Hanya baris baru dari tiap sheet yang diminta (4 permintaan kecil).
        async function tambahBaru(masuk) {
          if (!data) return;
          const ada = new Set(data.daftar.map((r) => String(r.rowIndex)));
          const segar = masuk.filter((r) => !ada.has(String(r.rowIndex)));
          if (!segar.length) return;
          const [verif, uang, fisik] = await Promise.all(
            [["verif", "Verifikasi_Berkas"], ["uang", "Keuangan_Voucher"], ["fisik", "Tes_Fisik_Seragam"]].map(([k, sheet]) =>
              Sheetson.rowsAfter(sheet, data[k].length).catch(() => [])
            )
          );
          // array yang sama dengan salinan sementara Sheetson → pindah menu tetap konsisten
          data.daftar.push(...segar);
          data.verif.push(...verif);
          data.uang.push(...uang);
          data.fisik.push(...fisik);
          segar.forEach((r) => baruDash.add(String(r.rowIndex)));
          tampilDash();
          showNew(baruDash.size);
        }
        let watcher = null; // mulai memantau setelah data pertama tampil
        // Perubahan status oleh petugas lain: segarkan diam-diam bila tab dibuka lagi setelah >5 menit tersembunyi
        let tersembunyiSejak = 0;
        const saatTampil = () => {
          if (document.visibilityState === "hidden") return void (tersembunyiSejak = Date.now());
          if (tersembunyiSejak && Date.now() - tersembunyiSejak > 5 * 60000) loadDash(true);
          tersembunyiSejak = 0;
        };
        document.addEventListener("visibilitychange", saatTampil);
        const lepasSegar = AdminUI.daftarPengamat({ stop: () => { document.removeEventListener("visibilitychange", saatTampil); lepasSegar(); } });
        async function loadDash(fresh) {
          const $s = document.getElementById("dashStats");
          const bar = document.createElement("div");
          bar.className = "loadbar";
          document.body.appendChild(bar);
          try {
            const [daftar, verif, uang, fisik] = await Promise.all(NAMA_SHEET.map((s) => Sheetson.getRows(s, { fresh: fresh === true })));
            data = { daftar, verif, uang, fisik };
            tampilDash();
            showNew(baruDash.size);
            if (!watcher) watcher = AdminUI.watchNew("Data_Pendaftar", () => data.daftar.length, tambahBaru);
            bar.remove();
          } catch (e) {
            bar.remove();
            $s.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3 bg-red-50 p-4 text-[15px] font-semibold text-red-700"><span>${esc(e.message)}. Periksa internet Anda.</span><button type="button" data-coba class="rounded-md bg-ink-900 px-3 py-1.5 text-[14px] font-medium text-white hover:opacity-90">Coba lagi</button></div>`;
            $s.querySelector("[data-coba]").addEventListener("click", () => loadDash(true));
          }
        }
        /* ---------- nomor pendaftaran dobel: peringatan + "Beri nomor baru" ---------- */
        const SHEETS_NOMOR = ["Data_Pendaftar", "Verifikasi_Berkas", "Keuangan_Voucher", "Tes_Fisik_Seragam"];
        const bolehGanti = ["superadmin", "verifikasi"].includes(profile.role);
        let grupDobel = [];
        const toWa = (n) => {
          const d = String(n || "").replace(/\D/g, "");
          return d.startsWith("0") ? "62" + d.slice(1) : d.startsWith("62") ? d : d ? "62" + d : "";
        };
        function renderDobel(daftar) {
          grupDobel = AdminUI.cariNomorDobel(daftar);
          const $d = document.getElementById("dobelSlot");
          if (!grupDobel.length) {
            $d.innerHTML = "";
            return;
          }
          const orangHtml = (g, r, i) => `
            <li class="flex flex-wrap items-center justify-between gap-2 py-2">
              <span class="min-w-0">
                <b class="font-semibold">${esc(r.namaLengkap || "-")}</b>
                <span class="text-[13px] text-ink-600"> · NISN ${esc(r.nisn || "-")} · ${esc(r.jurusan1 || "-")} · daftar ${esc(AdminUI.formatWaktu(r.createdAt))}</span>
              </span>
              ${
                i === 0
                  ? `<span class="rounded-full bg-white px-2.5 py-1 text-[12.5px] font-medium text-ink-600 shadow-[inset_0_0_0_1px_rgb(var(--hairline))]">daftar lebih dulu · tetap ${esc(g.nomor)}</span>`
                  : bolehGanti
                    ? `<button type="button" data-ganti="${esc(g.nomor)}|${esc(r.rowIndex)}" class="rounded-full bg-red-600 px-3.5 py-1.5 text-[13.5px] font-semibold text-white hover:bg-red-700">Beri nomor baru</button>`
                    : `<span class="text-[12.5px] text-red-700">minta superadmin/verifikasi memberi nomor baru</span>`
              }
            </li>`;
          $d.innerHTML = `
            <section class="mt-6 rounded-lg border border-red-300 bg-red-50 p-4" role="alert" aria-labelledby="dobelJudul">
              <h2 id="dobelJudul" class="flex items-center gap-2 text-[15px] font-semibold text-red-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
                Nomor pendaftaran dobel (${grupDobel.length})
              </h2>
              <p class="mt-1 text-[13.5px] text-ink-600">Pendaftar yang lebih dulu tetap memegang nomornya. Yang belakangan diberi nomor baru — otomatis diganti di keempat sheet, lalu kabari lewat WhatsApp.</p>
              ${grupDobel
                .map(
                  (g) => `<div class="mt-3"><p class="font-mono text-[13px] font-medium">${esc(g.nomor)} · dipakai ${g.orang.length} pendaftar</p>
                    <ul class="divide-y divide-red-200">${g.orang.map((r, i) => orangHtml(g, r, i)).join("")}</ul></div>`
                )
                .join("")}
            </section>`;
        }
        async function beriNomorBaru(nomor, rowIndex, btn) {
          const g = grupDobel.find((x) => x.nomor === nomor);
          const orang = g && g.orang.find((r) => String(r.rowIndex) === String(rowIndex));
          if (!orang) return;
          if (!confirm(`Beri nomor baru untuk ${orang.namaLengkap}?\n\nNomor ${nomor} tetap dipegang ${g.orang[0].namaLengkap} (daftar lebih dulu).\nNomor baru otomatis diganti di keempat sheet.`)) return;
          btn.disabled = true;
          btn.textContent = "Memproses…";
          try {
            const semua = await Promise.all(SHEETS_NOMOR.map((s) => Sheetson.getRows(s, { fresh: true })));
            const terpakai = [...new Set(semua.flatMap((rows) => rows.map((r) => String(r.noPendaftaran ?? "").trim()).filter((n) => n && n !== "-")))];
            const { data: baru, error } = await AdminAuth.getClient().rpc("ganti_no_pendaftaran", {
              p_nisn: String(orang.nisn ?? ""),
              p_jurusan: orang.jurusan1,
              p_terpakai: terpakai,
            });
            if (error) {
              throw new Error(
                /function|schema cache|not find/i.test(error.message)
                  ? "Fungsi database belum terpasang. Jalankan ulang supabase/02-nomor-pendaftaran.sql di Supabase."
                  : error.message
              );
            }
            // urutan kemunculan orang ini di antara pemegang nomor yang sama (menurut baris Data_Pendaftar)
            const urutanKe = semua[0]
              .filter((r) => String(r.noPendaftaran ?? "").trim() === nomor)
              .sort((a, b) => a.rowIndex - b.rowIndex)
              .findIndex((r) => String(r.rowIndex) === String(orang.rowIndex));
            AdminAuth.catat({
              aksi: "Beri nomor baru",
              modul: "Dashboard",
              sasaran: `${orang.namaLengkap || ""} · NISN ${orang.nisn || "-"}`,
              detail: { perubahan: [`No. pendaftaran: ${nomor} → ${baru}`] },
            });
            const terlewat = [];
            for (let i = 0; i < SHEETS_NOMOR.length; i++) {
              const row = AdminUI.barisMilik(semua[i], nomor, orang.namaLengkap, Math.max(urutanKe, 0));
              if (row) await Sheetson.patchRow(SHEETS_NOMOR[i], row.rowIndex, { noPendaftaran: baru });
              else terlewat.push(SHEETS_NOMOR[i]);
            }
            AdminUI.toast(
              terlewat.length
                ? `Nomor baru ${baru}. Periksa manual sheet: ${terlewat.join(", ")}`
                : `${orang.namaLengkap}: nomor baru ${baru} (keempat sheet diperbarui)`,
              terlewat.length ? "error" : "ok"
            );
            const wa = toWa(orang.waOrtu) || toWa(orang.whatsapp);
            if (wa) window.open(`https://wa.me/${wa}?text=${encodeURIComponent(AdminUI.pesanNomorBaru(orang.namaLengkap, nomor, baru))}`, "_blank", "noopener");
            await loadDash(true);
          } catch (e) {
            btn.disabled = false;
            btn.textContent = "Beri nomor baru";
            AdminUI.toast(e.message, "error");
          }
        }
        document.getElementById("dobelSlot").addEventListener("click", (e) => {
          const b = e.target.closest("button[data-ganti]");
          if (!b) return;
          const [nomor, rowIndex] = b.dataset.ganti.split("|");
          beriNomorBaru(nomor, rowIndex, b);
        });

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
          ekspor: [
            { label: "Jurusan cadangan", get: (r) => r.jurusan2 },
            { label: "Status verifikasi", get: (r) => AdminUI.isi(r.statusPendaftaran, "Pending") },
            { label: "Status berkas", get: (r) => r.statusBerkas },
            { label: "Catatan", get: (r) => r.catatanAdmin },
            { label: "Ortu dihubungi (WA)", get: (r) => r.tglFollowUpWa },
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
          ekspor: [
            { label: "Status bayar", get: (r) => AdminUI.isi(r.statusBiayaDaftar, "Belum Bayar") },
            { label: "Metode", get: (r) => r.metodePembayaran },
            { label: "Kode voucher", get: (r) => r.kodeVoucher },
            { label: "Status voucher", get: (r) => AdminUI.isi(r.statusVoucher, "Tidak Ada") },
            { label: "Potongan (Rp)", get: (r) => r.potonganBiaya, angka: true },
            { label: "Catatan", get: (r) => r.catatanBendahara },
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
          ekspor: [
            { label: "Tinggi (cm)", get: (r) => r.tinggiBadan, angka: true },
            { label: "Berat (kg)", get: (r) => r.beratBadan, angka: true },
            { label: "Tato/tindik", get: (r) => r.tatoTindik },
            { label: "Status tes", get: (r) => AdminUI.isi(r.statusTesFisik, "Belum Tes") },
            { label: "Ukuran seragam", get: (r) => r.ukuranSeragam },
            { label: "Tgl ukur seragam", get: (r) => r.tglUkurSeragam },
            { label: "Catatan", get: (r) => r.catatanTesFisik },
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
      async mount(app, profile, sub) {
        app.innerHTML = `
      <p class="font-mono text-[12.5px] uppercase tracking-wider text-ink-500">Superadmin</p>
      <h1 id="saJudul" class="mt-1 text-[26px] font-semibold tracking-tight">Superadmin</h1>
      <p id="saDesk" class="mt-1 text-[15px] text-ink-600"></p>

      <!-- PENGATURAN SITUS -->
      <section data-sub="pengaturan" class="mt-6 hidden rounded-lg border border-hairline bg-white p-5" aria-labelledby="pengaturanJudul">
        <h2 id="pengaturanJudul" class="sr-only">Pengaturan situs</h2>
        <p class="text-[14.5px] text-ink-600">Berlaku langsung untuk semua pengunjung tanpa perlu mengubah kode.</p>
        <div id="pengaturanIsi" class="mt-4 divide-y divide-hairline border-y border-hairline" aria-hidden="true"><div class="skeleton my-3 h-14"></div><div class="skeleton my-3 h-14"></div></div>
        <p id="pengaturanInfo" class="mt-3 hidden rounded-lg p-3 text-[14.5px]"></p>
      </section>

      <!-- REKAP -->
      <section data-sub="rekap" class="mt-6 hidden" aria-labelledby="rekapJudul">
        <div class="flex items-center justify-between gap-3">
          <h2 id="rekapJudul" class="text-lg font-semibold">Rekap</h2>
        </div>
        <div id="rekap" class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div class="skeleton h-32" aria-hidden="true"></div><div class="skeleton h-32" aria-hidden="true"></div><div class="skeleton h-32" aria-hidden="true"></div><div class="skeleton h-32" aria-hidden="true"></div></div>
      </section>

      <!-- UNDUH -->
      <section data-sub="rekap" class="mt-6 hidden rounded-lg border border-hairline bg-white p-5" aria-labelledby="unduhJudul">
        <h2 id="unduhJudul" class="text-lg font-semibold">Unduh data (bisa dibuka di Excel)</h2>
        <div class="mt-3 flex flex-wrap gap-2" id="unduh"></div>
      </section>

      <!-- PETUGAS -->
      <section data-sub="petugas" class="mt-6 hidden rounded-lg border border-hairline bg-white p-5" aria-labelledby="petugasJudul">
        <div class="flex flex-wrap items-center justify-end gap-3">
          <h2 id="petugasJudul" class="sr-only">Akun petugas</h2>
          <button id="btnTambah" type="button" class="rounded-full bg-brand-600 px-5 py-2.5 text-[15px] font-bold text-white hover:bg-brand-700">+ Tambah petugas</button>
        </div>
        <div id="petugas" class="mt-3 space-y-2" aria-hidden="true"><div class="skeleton h-12"></div><div class="skeleton h-12"></div><div class="skeleton h-12"></div></div>
      </section>

      <!-- RESET PASSWORD -->
      <section data-sub="reset" class="mt-6 hidden rounded-lg border border-hairline bg-white p-5" aria-labelledby="resetJudul">
        <h2 id="resetJudul" class="sr-only">Reset password</h2>
        <form id="resetForm" class="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" novalidate>
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

      <!-- RIWAYAT AKTIVITAS -->
      <section data-sub="riwayat" class="mt-6 hidden" aria-labelledby="riwayatJudul">
        <h2 id="riwayatJudul" class="sr-only">Riwayat aktivitas</h2>
        <div class="flex flex-wrap items-center gap-2">
          <label for="rwCari" class="sr-only">Cari</label>
          <input id="rwCari" type="search" placeholder="Cari nama, no. pendaftaran, aktivitas…" class="h-10 min-w-[220px] flex-1 rounded-md border border-line/50 bg-white px-3 text-[14.5px] focus:border-ink-900 focus:outline-none" />
          <label for="rwPetugas" class="sr-only">Petugas</label>
          <select id="rwPetugas" class="h-10 rounded-md border border-line/50 bg-white px-2 text-[14px]"><option value="">Semua petugas</option></select>
          <label for="rwAksi" class="sr-only">Aktivitas</label>
          <select id="rwAksi" class="h-10 rounded-md border border-line/50 bg-white px-2 text-[14px]"><option value="">Semua aktivitas</option></select>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p id="rwJumlah" class="font-mono text-[12.5px] text-ink-500"></p>
          <span id="rwLangsung" class="inline-flex items-center gap-2 text-[13px] text-ink-500" role="status" aria-live="polite">
            <span class="relative flex h-2.5 w-2.5" aria-hidden="true"><span data-rw-denyut class="absolute inline-flex h-full w-full rounded-full opacity-75" style="background:#A1A1AA"></span><span data-rw-titik class="relative inline-flex h-2.5 w-2.5 rounded-full" style="background:#A1A1AA"></span></span>
            <span data-rw-teks>Menghubungkan…</span>
          </span>
        </div>
        <div id="rwDaftar" class="mt-2"><div class="skeleton h-12"></div><div class="skeleton mt-2 h-12"></div><div class="skeleton mt-2 h-12"></div></div>
        <button id="rwLagi" type="button" class="mt-4 hidden h-10 rounded-full px-5 text-[14px] font-medium shadow-[inset_0_0_0_1px_rgb(var(--garis-tombol))] hover:bg-sand">Muat lebih banyak</button>
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
        let rekapData = null; // { daftar, verif, uang }
        function tampilRekap() {
          const { daftar, verif, uang } = rekapData;
          document.getElementById("rekap").innerHTML =
            `<div class="rounded-lg border border-hairline bg-white p-5"><h3 class="text-[13px] text-ink-500">Total pendaftar</h3><p class="mt-1 text-[40px] font-semibold leading-none tracking-tight tabular-nums">${daftar.length}</p></div>` +
            card("Per jurusan (pilihan 1)", countBy(daftar, "jurusan1", "-", AdminUI.URUTAN_JURUSAN)) +
            card("Status pendaftaran", countBy(verif, "statusPendaftaran", "Pending")) +
            card("Pembayaran", countBy(uang, "statusBiayaDaftar", "Belum Bayar"));
        }
        async function loadRekap(fresh) {
          const el = document.getElementById("rekap");
          document.body.classList.add("is-loading");
          try {
            const [daftar, verif, uang] = await Promise.all(SHEETS.slice(0, 3).map((s) => Sheetson.getRows(s, { fresh: fresh === true })));
            document.body.classList.remove("is-loading");
            rekapData = { daftar, verif, uang };
            tampilRekap();
            if (rkAktif) rkMulai();
          } catch (e) {
            document.body.classList.remove("is-loading");
            el.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-4 text-[15px] font-semibold text-red-700"><span>${esc(e.message)}. Periksa internet Anda.</span><button type="button" data-coba class="rounded-md bg-ink-900 px-3 py-1.5 text-[14px] font-medium text-white hover:opacity-90">Coba lagi</button></div>`;
            el.querySelector("[data-coba]").addEventListener("click", () => loadRekap(true));
          }
        }
        /* Rekap langsung: hanya jalan saat sub-menu Rekap terbuka. Pendaftar baru → hanya baris baru
           yang diminta (4 permintaan kecil per kedatangan); tab dibuka lagi >5 menit → segarkan diam-diam. */
        let rkAktif = false;
        let rkPantau = null;
        let rkLepas = null;
        let rkSembunyi = 0;
        async function rkTambah(masuk) {
          const ada = new Set(rekapData.daftar.map((r) => String(r.rowIndex)));
          const segar = masuk.filter((r) => !ada.has(String(r.rowIndex)));
          if (!segar.length) return;
          const [verif, uang] = await Promise.all(
            [["verif", "Verifikasi_Berkas"], ["uang", "Keuangan_Voucher"]].map(([k, sheet]) => Sheetson.rowsAfter(sheet, rekapData[k].length).catch(() => []))
          );
          rekapData.daftar.push(...segar);
          rekapData.verif.push(...verif);
          rekapData.uang.push(...uang);
          tampilRekap();
        }
        const rkTampil = () => {
          if (document.visibilityState === "hidden") return void (rkSembunyi = Date.now());
          if (rkSembunyi && Date.now() - rkSembunyi > 5 * 60000) loadRekap(true);
          rkSembunyi = 0;
        };
        function rkMulai() {
          if (rkPantau || !rekapData) return;
          rkPantau = AdminUI.watchNew("Data_Pendaftar", () => rekapData.daftar.length, rkTambah);
          document.addEventListener("visibilitychange", rkTampil);
          rkLepas = AdminUI.daftarPengamat({ stop: rkBerhenti });
        }
        function rkBerhenti() {
          if (rkPantau) rkPantau.stop();
          rkPantau = null;
          document.removeEventListener("visibilitychange", rkTampil);
          if (rkLepas) rkLepas();
          rkLepas = null;
        }

        /* ---------- pengaturan situs (tabel "pengaturan", supabase/03-pengaturan.sql) ---------- */
        const SAKLAR = [
          {
            kunci: "spmb_dibuka",
            judul: "Pendaftaran SPMB dibuka",
            nyala: "Formulir pendaftaran bisa diisi.",
            mati: "Ditutup: formulir diganti pesan \"pendaftaran ditutup\", tombol Daftar di beranda disembunyikan, pendaftar baru ditolak. Cek status & login siswa tetap bisa.",
            tanyaMati: "Tutup pendaftaran SPMB sekarang?\n\nCalon siswa tidak bisa mendaftar sampai dibuka lagi. Cek status & login siswa tetap bisa.",
          },
          {
            kunci: "popup_promo",
            judul: "Pop-up promo di beranda",
            nyala: "Pop-up \"Daftar Ulang Makin Ringan! Rp2 Juta\" muncul saat beranda dibuka.",
            mati: "Pop-up promo tidak ditampilkan.",
          },
          {
            kunci: "hasil_diumumkan",
            judul: "Hasil seleksi diumumkan",
            nyala: "Siswa bisa melihat hasil (Diterima / Ditolak) di login siswa dan cek status.",
            mati: "Hasil disembunyikan: siswa hanya melihat \"Diverifikasi, menunggu pengumuman\". Data di panel admin tidak berubah.",
            tanyaMati: "Sembunyikan hasil seleksi dari siswa?\n\nSiswa yang sudah dinyatakan Diterima/Ditolak hanya akan melihat \"menunggu pengumuman\" sampai saklar ini dinyalakan lagi.",
            tanyaNyala: "Umumkan hasil seleksi sekarang?\n\nSemua siswa langsung bisa melihat status Diterima / Ditolak mereka. Pastikan data sudah benar.",
            perlu06: true,
          },
          {
            kunci: "perawatan",
            judul: "Mode perawatan situs",
            nyala: "Situs publik menampilkan layar \"sedang pemeliharaan\" dan pendaftar baru ditolak. Panel admin tetap bisa dipakai.",
            mati: "Situs berjalan normal.",
            bahayaNyala: true,
            tanyaNyala: "Aktifkan mode perawatan?\n\nBeranda, formulir daftar, dan login siswa langsung tertutup layar \"sedang pemeliharaan\" untuk semua pengunjung. Panel admin tetap bisa dipakai.",
            perlu06: true,
          },
        ];
        const fmtWaktu = (iso) => {
          if (!iso) return "";
          const d = new Date(iso);
          return isNaN(d) ? "" : d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        };
        const infoPengaturan = (pesan, baik) => {
          const el = document.getElementById("pengaturanInfo");
          el.textContent = pesan;
          el.className = `mt-3 rounded-lg p-3 text-[14.5px] ${baik ? "bg-ok-50 text-ok-700" : "bg-red-50 text-red-700"}`;
        };
        async function loadPengaturan() {
          const wadah = document.getElementById("pengaturanIsi");
          // Kolom bertahap: SQL 06 (angka) → SQL 05 (teks, waktu) → hanya saklar lama
          const TAHAP_KOLOM = ["kunci,nilai,diubah,teks,waktu,angka", "kunci,nilai,diubah,teks,waktu", "kunci,nilai,diubah"];
          let data, error;
          let tahap = 0;
          for (; tahap < TAHAP_KOLOM.length; tahap++) {
            ({ data, error } = await db.from("pengaturan").select(TAHAP_KOLOM[tahap]));
            if (!error || !/teks|waktu|angka|column/i.test(error.message)) break;
          }
          const lanjutan = tahap < 2;
          if (error) {
            wadah.removeAttribute("aria-hidden");
            wadah.innerHTML = "";
            infoPengaturan(
              /pengaturan|schema cache|does not exist|42P01|PGRST2/i.test(error.message + " " + (error.code || ""))
                ? "Tabel pengaturan belum dibuat. Jalankan supabase/03-pengaturan.sql di Supabase (SQL Editor → New query → Run), lalu muat ulang halaman ini."
                : "Gagal memuat pengaturan: " + error.message,
              false
            );
            return;
          }
          const peta = new Map((data || []).map((r) => [r.kunci, r]));
          wadah.removeAttribute("aria-hidden");
          wadah.innerHTML =
            SAKLAR.filter((k) => !k.perlu06 || peta.has(k.kunci)).map((k) => {
              const r = peta.get(k.kunci);
              const on = r ? r.nilai !== false : true;
              const buruk = k.bahayaNyala ? on : !on;
              return `<div class="flex items-start justify-between gap-4 py-4">
              <div class="min-w-0">
                <p class="text-[15.5px] font-semibold" id="lbl-${k.kunci}">${esc(k.judul)}</p>
                <p class="mt-0.5 text-[14px] ${buruk ? "font-medium text-red-700" : "text-ink-600"}">${esc(on ? k.nyala : k.mati)}</p>
                ${r && r.diubah ? `<p class="mt-1 font-mono text-[12px] text-ink-500">diubah ${esc(fmtWaktu(r.diubah))}</p>` : ""}
              </div>
              <button type="button" role="switch" aria-checked="${on}" aria-labelledby="lbl-${k.kunci}" data-saklar="${k.kunci}"
                class="relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50"
                style="background:${on ? (k.bahayaNyala ? "#DC2626" : "#16A34A") : "#A1A1AA"}">
                <span class="sr-only">${on ? "Nyala" : "Mati"}</span>
                <span class="inline-block h-6 w-6 rounded-full bg-white shadow transition-transform" style="transform:translateX(${on ? "28px" : "4px"})" aria-hidden="true"></span>
              </button>
            </div>`;
            }).join("") +
            (lanjutan
              ? pengaturanLanjutanHtml(peta) + (tahap === 0 && peta.has("kuota_dkv") ? pengaturanTambahanHtml(peta) : `<p class="py-4 text-[14px] text-ink-600">Kontak panitia, kuota per jurusan, pengumuman hasil, dan mode perawatan belum aktif. Jalankan <span class="font-mono text-[13px]">supabase/06-pengaturan-tambahan.sql</span> di Supabase (SQL Editor → New query → Run), lalu muat ulang halaman ini.</p>`)
              : `<p class="py-4 text-[14px] text-ink-600">Jadwal otomatis, pesan saat ditutup, dan banner pengumuman belum aktif. Jalankan <span class="font-mono text-[13px]">supabase/05-pengaturan-lanjutan.sql</span> di Supabase (SQL Editor → New query → Run), lalu muat ulang halaman ini.</p>`);
        }

        /* --- jadwal otomatis, pesan saat ditutup, banner pengumuman (supabase/05-pengaturan-lanjutan.sql) --- */
        const WIB = "Asia/Jakarta";
        // ISO (UTC) → isi kolom datetime-local menurut jam WIB; sebaliknya WIB → ISO
        const keInputWIB = (iso) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: WIB }).slice(0, 16).replace(" ", "T") : "");
        const dariInputWIB = (v) => (v ? new Date(v + ":00+07:00").toISOString() : null);
        const kolom = "w-full rounded-md border border-line/60 bg-white px-3 py-2.5 text-[15px] focus:border-ink-900 focus:outline-none focus:ring-2 focus:ring-pink-500/30";
        const tombolSimpan = (id) =>
          `<button type="button" data-simpan="${id}" class="btn rounded-full bg-ink-900 px-5 py-2 text-[14px] font-medium text-white disabled:opacity-60">Simpan</button>`;
        function pengaturanLanjutanHtml(peta) {
          const buka = peta.get("jadwal_buka");
          const tutup = peta.get("jadwal_tutup");
          const pesan = peta.get("pesan_tutup");
          const banner = peta.get("banner_info");
          const bannerOn = !!banner && banner.nilai === true;
          return `
            <div class="py-5" data-blok="jadwal">
              <p class="text-[15.5px] font-semibold">Jadwal buka &amp; tutup otomatis</p>
              <p class="mt-0.5 text-[14px] text-ink-600">Pendaftaran membuka dan menutup sendiri pada jam ini (WIB). Kosongkan bila tidak dipakai. Saklar &ldquo;Pendaftaran SPMB dibuka&rdquo; di atas tetap yang utama: bila MATI, pendaftaran tertutup walau jadwal sedang berjalan.</p>
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1 text-[13px] text-ink-500">Dibuka mulai<input id="jadwalBuka" type="datetime-local" value="${esc(keInputWIB(buka && buka.waktu))}" class="${kolom}" /></label>
                <label class="flex flex-col gap-1 text-[13px] text-ink-500">Ditutup mulai<input id="jadwalTutup" type="datetime-local" value="${esc(keInputWIB(tutup && tutup.waktu))}" class="${kolom}" /></label>
              </div>
              <div class="mt-3 flex items-center gap-3">${tombolSimpan("jadwal")}<span data-hasil class="text-[13.5px]" role="status"></span></div>
            </div>
            <div class="py-5" data-blok="pesan">
              <label for="pesanTutup" class="text-[15.5px] font-semibold">Pesan saat pendaftaran ditutup</label>
              <p class="mt-0.5 text-[14px] text-ink-600">Tampil di beranda dan halaman daftar. Kosongkan untuk memakai tulisan bawaan (atau tanggal buka berikutnya bila jadwal sudah diisi).</p>
              <textarea id="pesanTutup" rows="2" maxlength="280" placeholder="Contoh: Gelombang 1 sudah ditutup. Gelombang 2 dibuka 1 Maret 2027." class="mt-3 ${kolom}">${esc((pesan && pesan.teks) || "")}</textarea>
              <div class="mt-3 flex items-center gap-3">${tombolSimpan("pesan")}<span data-hasil class="text-[13.5px]" role="status"></span></div>
            </div>
            <div class="py-5" data-blok="banner">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-[15.5px] font-semibold" id="lbl-banner">Banner pengumuman</p>
                  <p class="mt-0.5 text-[14px] text-ink-600">${bannerOn ? "Tampil di bagian atas beranda dan halaman daftar. Pengunjung bisa menutupnya." : "Tidak ditampilkan. Isi teks lalu nyalakan."}</p>
                </div>
                <button type="button" role="switch" aria-checked="${bannerOn}" aria-labelledby="lbl-banner" data-banner-saklar
                  class="relative mt-1 inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50" style="background:${bannerOn ? "#16A34A" : "#A1A1AA"}">
                  <span class="sr-only">${bannerOn ? "Nyala" : "Mati"}</span>
                  <span class="inline-block h-6 w-6 rounded-full bg-white shadow transition-transform" style="transform:translateX(${bannerOn ? "28px" : "4px"})" aria-hidden="true"></span>
                </button>
              </div>
              <label for="bannerTeks" class="sr-only">Teks banner</label>
              <textarea id="bannerTeks" rows="2" maxlength="280" placeholder="Contoh: Hari ini loket panitia tutup pukul 12.00." class="mt-3 ${kolom}">${esc((banner && banner.teks) || "")}</textarea>
              <div class="mt-3 flex items-center gap-3">${tombolSimpan("banner")}<span data-hasil class="text-[13.5px]" role="status"></span></div>
            </div>`;
        }
        function pengaturanTambahanHtml(peta) {
          const teks = (k) => esc((peta.get(k) && peta.get(k).teks) || "");
          const kuotaInput = AdminUI.URUTAN_JURUSAN.map((j) => {
            const r = peta.get("kuota_" + j.toLowerCase());
            return `<label class="flex flex-col gap-1 text-[13px] text-ink-500">${esc(j)}<input data-kuota="${esc(j.toLowerCase())}" type="number" inputmode="numeric" min="0" max="999" placeholder="tanpa batas" value="${r && Number.isInteger(r.angka) ? r.angka : ""}" class="${kolom}" /></label>`;
          }).join("");
          return `
            <div class="py-5" data-blok="kontak">
              <p class="text-[15.5px] font-semibold">Kontak panitia</p>
              <p class="mt-0.5 text-[14px] text-ink-600">Nomor WhatsApp dipakai semua tombol &ldquo;Chat panitia&rdquo; di beranda dan formulir. Kosongkan untuk memakai nomor bawaan.</p>
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1 text-[13px] text-ink-500">Nomor WhatsApp<input id="kontakWa" type="tel" inputmode="tel" maxlength="20" placeholder="0882 3212 784" value="${teks("kontak_wa")}" class="${kolom}" /></label>
                <label class="flex flex-col gap-1 text-[13px] text-ink-500">Jam layanan<input id="jamLayanan" type="text" maxlength="120" placeholder="Senin–Sabtu, 08.00–15.00 WIB" value="${teks("jam_layanan")}" class="${kolom}" /></label>
              </div>
              <div class="mt-3 flex items-center gap-3">${tombolSimpan("kontak")}<span data-hasil class="text-[13.5px]" role="status"></span></div>
            </div>
            <div class="py-5" data-blok="kuota">
              <p class="text-[15.5px] font-semibold">Kuota per jurusan</p>
              <p class="mt-0.5 text-[14px] text-ink-600">Batas pendaftar jurusan utama tahun ini. Bila penuh, jurusan itu tidak bisa dipilih dan database menolak pendaftar baru. Kosong = tanpa batas. Pendaftar yang sudah masuk tidak terhapus bila kuota diturunkan.</p>
              <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">${kuotaInput}</div>
              <div class="mt-3 flex items-center gap-3">${tombolSimpan("kuota")}<span data-hasil class="text-[13.5px]" role="status"></span></div>
            </div>
            <div class="py-5" data-blok="perawatan">
              <label for="pesanPerawatan" class="text-[15.5px] font-semibold">Pesan saat mode perawatan</label>
              <p class="mt-0.5 text-[14px] text-ink-600">Tampil di layar pemeliharaan. Kosongkan untuk tulisan bawaan.</p>
              <textarea id="pesanPerawatan" rows="2" maxlength="280" placeholder="Contoh: Situs sedang diperbarui, kembali lagi pukul 14.00 WIB." class="mt-3 ${kolom}">${teks("pesan_perawatan")}</textarea>
              <div class="mt-3 flex items-center gap-3">${tombolSimpan("perawatan")}<span data-hasil class="text-[13.5px]" role="status"></span></div>
            </div>`;
        }
        async function simpanBaris(kunci, isi) {
          const { data: u } = await db.auth.getUser();
          const { data, error } = await db
            .from("pengaturan")
            .update({ ...isi, diubah: new Date().toISOString(), diubah_oleh: u && u.user ? u.user.id : null })
            .eq("kunci", kunci)
            .select("kunci");
          if (error || !data || !data.length) throw new Error(error ? error.message : "hanya superadmin yang boleh mengubah");
        }
        const tampilWIB = (iso) => (iso ? new Date(iso).toLocaleString("id-ID", { timeZone: WIB, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " WIB" : "kosong");
        async function simpanLanjutan(blok, tombol) {
          const hasil = blok.querySelector("[data-hasil]");
          const lapor = (teks, baik) => {
            hasil.textContent = teks;
            hasil.className = `text-[13.5px] ${baik ? "text-ok-700" : "font-medium text-red-700"}`;
          };
          const jenis = tombol.dataset.simpan;
          tombol.disabled = true;
          try {
            if (jenis === "jadwal") {
              const buka = dariInputWIB(document.getElementById("jadwalBuka").value);
              const tutup = dariInputWIB(document.getElementById("jadwalTutup").value);
              if (buka && tutup && new Date(tutup) <= new Date(buka)) return lapor("Waktu tutup harus setelah waktu buka.", false);
              await simpanBaris("jadwal_buka", { waktu: buka });
              await simpanBaris("jadwal_tutup", { waktu: tutup });
              AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: "Jadwal pendaftaran", detail: { perubahan: [`Dibuka mulai: ${tampilWIB(buka)}`, `Ditutup mulai: ${tampilWIB(tutup)}`] } });
            } else if (jenis === "kontak") {
              let wa = document.getElementById("kontakWa").value.replace(/[\s().-]/g, "");
              if (wa.startsWith("+")) wa = wa.slice(1);
              if (wa && !/^(0|62|8)\d{8,13}$/.test(wa)) return lapor("Nomor WhatsApp tidak valid. Contoh: 0882 3212 784", false);
              if (wa.startsWith("0")) wa = "62" + wa.slice(1);
              else if (wa.startsWith("8")) wa = "62" + wa;
              const jam = document.getElementById("jamLayanan").value.trim();
              await simpanBaris("kontak_wa", { teks: wa || null });
              await simpanBaris("jam_layanan", { teks: jam || null });
              AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: "Kontak panitia", detail: { perubahan: [`WhatsApp: ${wa || "(bawaan)"}`, `Jam layanan: ${jam || "(kosong)"}`] } });
            } else if (jenis === "kuota") {
              const ringkas = [];
              const nilai = {};
              for (const el of document.querySelectorAll("[data-kuota]")) {
                const mentah = el.value.trim();
                const n = mentah === "" ? null : Number(mentah);
                if (n !== null && (!Number.isInteger(n) || n < 0 || n > 999)) return lapor(`Kuota ${el.dataset.kuota.toUpperCase()} harus angka bulat 0–999 (atau kosong).`, false);
                nilai[el.dataset.kuota] = n;
                ringkas.push(`${el.dataset.kuota.toUpperCase()}: ${n === null ? "tanpa batas" : n}`);
              }
              for (const [j, n] of Object.entries(nilai)) await simpanBaris("kuota_" + j, { angka: n });
              AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: "Kuota per jurusan", detail: { perubahan: ringkas } });
            } else if (jenis === "perawatan") {
              const teks = document.getElementById("pesanPerawatan").value.trim();
              await simpanBaris("pesan_perawatan", { teks: teks || null });
              AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: "Pesan perawatan", detail: { keterangan: teks || "(dikosongkan, pakai tulisan bawaan)" } });
            } else if (jenis === "pesan") {
              const teks = document.getElementById("pesanTutup").value.trim();
              await simpanBaris("pesan_tutup", { teks: teks || null });
              AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: "Pesan saat ditutup", detail: { keterangan: teks || "(dikosongkan, pakai tulisan bawaan)" } });
            } else {
              const teks = document.getElementById("bannerTeks").value.trim();
              await simpanBaris("banner_info", { teks: teks || null });
              AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: "Banner pengumuman", detail: { keterangan: teks || "(teks dikosongkan)" } });
            }
            lapor("Tersimpan.", true);
            AdminUI.toast("Pengaturan tersimpan.");
          } catch (e) {
            lapor("Gagal menyimpan: " + e.message, false);
          } finally {
            tombol.disabled = false;
          }
        }
        // Saklar banner: nyala hanya bila teks terisi
        async function ubahBanner(tombol) {
          const nilaiBaru = tombol.getAttribute("aria-checked") !== "true";
          const teks = document.getElementById("bannerTeks").value.trim();
          if (nilaiBaru && !teks) return infoPengaturan("Isi teks banner lebih dulu, lalu nyalakan.", false);
          tombol.disabled = true;
          try {
            await simpanBaris("banner_info", { nilai: nilaiBaru, teks: teks || null });
            AdminUI.toast(`Banner pengumuman: ${nilaiBaru ? "NYALA" : "MATI"}`);
            AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: "Banner pengumuman", detail: { perubahan: [`Banner pengumuman: ${nilaiBaru ? "Mati → Nyala" : "Nyala → Mati"}`] } });
            document.getElementById("pengaturanInfo").className = "mt-3 hidden rounded-lg p-3 text-[14.5px]";
            loadPengaturan();
          } catch (e) {
            tombol.disabled = false;
            infoPengaturan("Gagal menyimpan: " + e.message, false);
          }
        }
        document.getElementById("pengaturanIsi").addEventListener("click", async (e) => {
          const simpan = e.target.closest("[data-simpan]");
          if (simpan) return simpanLanjutan(simpan.closest("[data-blok]"), simpan);
          const banner = e.target.closest("[data-banner-saklar]");
          if (banner) return ubahBanner(banner);
          const tombol = e.target.closest("[data-saklar]");
          if (!tombol) return;
          const k = SAKLAR.find((x) => x.kunci === tombol.dataset.saklar);
          const nilaiBaru = tombol.getAttribute("aria-checked") !== "true";
          if (!nilaiBaru && k.tanyaMati && !window.confirm(k.tanyaMati)) return;
          if (nilaiBaru && k.tanyaNyala && !window.confirm(k.tanyaNyala)) return;
          tombol.disabled = true;
          const { data: u } = await db.auth.getUser();
          const { data, error } = await db
            .from("pengaturan")
            .update({ nilai: nilaiBaru, diubah: new Date().toISOString(), diubah_oleh: u && u.user ? u.user.id : null })
            .eq("kunci", k.kunci)
            .select("kunci");
          if (error || !data || !data.length) {
            tombol.disabled = false;
            infoPengaturan("Gagal menyimpan" + (error ? ": " + error.message : " (hanya superadmin yang boleh mengubah)."), false);
            return;
          }
          AdminUI.toast(`${k.judul}: ${nilaiBaru ? "NYALA" : "MATI"}`);
          AdminAuth.catat({ aksi: "Ubah pengaturan situs", modul: "Superadmin", sasaran: k.judul, detail: { perubahan: [`${k.judul}: ${nilaiBaru ? "Mati → Nyala" : "Nyala → Mati"}`] } });
          document.getElementById("pengaturanInfo").className = "mt-3 hidden rounded-lg p-3 text-[14.5px]";
          loadPengaturan();
        });

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
              AdminAuth.catat({ aksi: "Unduh CSV", modul: "Superadmin", sasaran: s, detail: { keterangan: `${rows.length} baris` } });
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
        let daftarPetugas = [];
        async function loadPetugas() {
          const el = document.getElementById("petugas");
          const { data, error } = await db.from("profiles").select("id, email, nama_lengkap, role").in("role", STAFF_ROLES).order("role");
          if (error) {
            el.innerHTML = `<p class="rounded-2xl bg-red-50 p-4 text-[15px] font-semibold text-red-700">Gagal memuat petugas: ${esc(error.message)}</p>`;
            return;
          }
          daftarPetugas = data;
          el.innerHTML = `<ul class="divide-y divide-line/40">${data
            .map(
              (p) => `<li class="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><b>${esc(p.nama_lengkap || "-")}</b><br><span class="text-[14px] text-ink-500">username: ${esc(username(p.email))}</span></span>
                <span class="flex items-center gap-2"><label class="flex items-center gap-2 text-[15px]"><span class="sr-only">Peran ${esc(p.nama_lengkap)}</span>
                  <select data-role="${esc(p.id)}" ${p.id === profile.id ? "disabled" : ""} class="rounded-xl border-2 border-line bg-white px-3 py-2 text-[15px]">
                    ${[...STAFF_ROLES, "pendaftar"].map((r) => `<option value="${r}" ${r === p.role ? "selected" : ""}>${r === "pendaftar" ? "Nonaktif (bukan petugas)" : esc(AdminAuth.ROLE_LABEL[r])}</option>`).join("")}
                  </select></label>
                  <button type="button" data-ubah="${esc(p.id)}" class="rounded-xl border-2 border-line bg-white px-3 py-2 text-[15px] font-semibold hover:border-ink-500" aria-label="Ubah nama atau password ${esc(p.nama_lengkap || username(p.email))}">Ubah</button></span>
              </li>`
            )
            .join("")}</ul>`;
        }
        document.getElementById("petugas").addEventListener("change", async (e) => {
          const sel = e.target.closest("select[data-role]");
          if (!sel) return;
          const lama = daftarPetugas.find((x) => x.id === sel.dataset.role);
          const { error } = await db.from("profiles").update({ role: sel.value }).eq("id", sel.dataset.role);
          if (error) AdminUI.toast("Gagal mengubah peran: " + error.message, "error");
          else {
            AdminUI.toast("Peran diperbarui.");
            AdminAuth.catat({
              aksi: "Ubah peran",
              modul: "Superadmin",
              sasaran: lama ? `${lama.nama_lengkap || ""} (${username(lama.email)})` : null,
              detail: { perubahan: [`Tugas: ${lama ? AdminAuth.ROLE_LABEL[lama.role] || lama.role : "–"} → ${AdminAuth.ROLE_LABEL[sel.value] || sel.value}`] },
            });
          }
          loadPetugas();
        });
        document.getElementById("petugas").addEventListener("click", (e) => {
          const btn = e.target.closest("button[data-ubah]");
          if (!btn) return;
          const p = daftarPetugas.find((x) => x.id === btn.dataset.ubah);
          if (!p) return;
          const dirinya = p.id === profile.id;
          AdminUI.openDialog({
            title: "Ubah petugas",
            subtitle: `Username: ${username(p.email)}`,
            fields: [
              { name: "nama", label: "Nama petugas", type: "text" },
              { name: "password", label: "Password baru (min. 8 karakter)", type: "text", help: "Kosongkan bila password tidak diganti. Beritahukan password baru langsung ke petugas." },
            ],
            values: { nama: p.nama_lengkap || "" },
            onSave: async (v) => {
              const { nama, password } = AdminUI.cekUbahPetugas(v);
              if (nama !== (p.nama_lengkap || "")) {
                const { error, data: upd } = await db.from("profiles").update({ nama_lengkap: nama }).eq("id", p.id).select("id");
                if (error || !upd || !upd.length) throw new Error("Gagal mengubah nama" + (error ? ": " + error.message : "."));
              }
              if (password) {
                const { error } = await db.rpc("reset_password", { target_email: p.email, new_password: password });
                if (error) throw new Error("Nama tersimpan, tapi password gagal diganti: " + error.message);
              }
              AdminUI.toast(password ? `Data ${nama} diperbarui, password diganti.` : `Data ${nama} diperbarui.`);
              const ubahan = nama !== (p.nama_lengkap || "") ? [`Nama: ${p.nama_lengkap || "–"} → ${nama}`] : [];
              if (password) ubahan.push("Password diganti");
              if (ubahan.length) AdminAuth.catat({ aksi: "Ubah petugas", modul: "Superadmin", sasaran: username(p.email), detail: { perubahan: ubahan } });
              // nama sendiri tampil di menu samping → muat ulang agar ikut berubah
              if (dirinya && nama !== (p.nama_lengkap || "")) return setTimeout(() => location.reload(), 900);
              loadPetugas();
            },
          });
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
              AdminAuth.catat({ aksi: "Tambah petugas", modul: "Superadmin", sasaran: `${v.nama} (${v.username})`, detail: { keterangan: `Tugas: ${AdminAuth.ROLE_LABEL[v.role] || v.role}` } });
              loadPetugas();
            },
          })
        );

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
            AdminAuth.catat({ aksi: "Reset password", modul: "Superadmin", sasaran: email.split("@")[0] });
            show(`Password ${email.split("@")[0]} sudah diganti. Beritahukan password baru secara langsung.`, true);
            document.getElementById("resetPw").value = "";
          }
        });

        /* ---------- riwayat aktivitas (tabel "riwayat", supabase/04-riwayat.sql) ---------- */
        const RW_PER_MUAT = 100;
        let rwBaris = [];
        let rwHabis = false;
        const rwWaktu = (iso) =>
          new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const RW_WARNA = (aksi) =>
          /^Masuk$/.test(aksi) ? "#16A34A" : /^Keluar/.test(aksi) ? "#A1A1AA" : /Reset|peran|pengaturan|petugas/i.test(aksi) ? "#EC4899"
            : /Ubah data|nomor/i.test(aksi) ? "#0284C7" : "#D97706";
        function rwTerfilter() {
          const q = document.getElementById("rwCari").value.trim().toLowerCase();
          const pt = document.getElementById("rwPetugas").value;
          const ak = document.getElementById("rwAksi").value;
          return rwBaris.filter((r) => {
            if (pt && r.pelaku_nama !== pt) return false;
            if (ak && r.aksi !== ak) return false;
            if (!q) return true;
            return [r.pelaku_nama, r.aksi, r.modul, r.sasaran, AdminUI.teksDetailRiwayat(r.detail)].join(" ").toLowerCase().includes(q);
          });
        }
        function rwIsiPilihan(id, nilai, semua) {
          const sel = document.getElementById(id);
          const pilih = sel.value;
          sel.innerHTML = `<option value="">${semua}</option>` + [...new Set(nilai.filter(Boolean))].sort().map((v) => `<option>${esc(v)}</option>`).join("");
          sel.value = pilih;
        }
        function renderRiwayat() {
          const rows = rwTerfilter();
          const wadah = document.getElementById("rwDaftar");
          document.getElementById("rwJumlah").textContent = `${rows.length} dari ${rwBaris.length} aktivitas dimuat${rwHabis ? "" : " (terbaru dulu)"}`;
          document.getElementById("rwLagi").classList.toggle("hidden", rwHabis);
          if (!rows.length) {
            wadah.innerHTML = `<div class="rounded-lg border border-dashed border-hairline p-8 text-center text-[15px] text-ink-500">${rwBaris.length ? "Tidak ada aktivitas yang cocok." : "Belum ada aktivitas tercatat."}</div>`;
            return;
          }
          const detailHtml = (r) => {
            const d = r.detail || {};
            if (Array.isArray(d.perubahan) && d.perubahan.length)
              return `<ul class="space-y-0.5">${d.perubahan.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
            return esc(d.keterangan || "");
          };
          const petugas = (r) => `<span class="block font-medium">${esc(r.pelaku_nama || "–")}</span><span class="block text-[12.5px] text-ink-500">${esc(AdminAuth.ROLE_LABEL[r.peran] || r.peran || "")}</span>`;
          const aksi = (r) => `<span class="inline-flex items-center gap-1.5 whitespace-nowrap"><span class="h-2 w-2 shrink-0 rounded-full" style="background:${RW_WARNA(r.aksi)}" aria-hidden="true"></span>${esc(r.aksi)}</span>${r.modul ? `<span class="block text-[12.5px] text-ink-500">${esc(r.modul)}</span>` : ""}`;
          wadah.innerHTML = `
            <div class="hidden overflow-auto rounded-lg border border-hairline bg-white md:block">
              <table class="w-full border-separate border-spacing-0 text-left text-[14px] leading-snug">
                <thead class="text-[12.5px] text-ink-500"><tr>
                  ${["Waktu (WIB)", "Petugas", "Aktivitas", "Pendaftar / sasaran", "Detail"].map((h) => `<th scope="col" class="sticky top-0 border-b border-hairline bg-brand-50 px-4 py-3 font-medium whitespace-nowrap">${h}</th>`).join("")}
                </tr></thead>
                <tbody>${rows
                  .map(
                    (r) => `<tr class="bg-white align-top even:bg-sand" ${rwBaru.has(r.id) ? "data-rw-baru" : ""}>
                      <td class="border-b border-hairline px-4 py-2.5 font-mono text-[12.5px] whitespace-nowrap text-ink-600">${esc(rwWaktu(r.waktu))}</td>
                      <td class="border-b border-hairline px-4 py-2.5">${petugas(r)}</td>
                      <td class="border-b border-hairline px-4 py-2.5">${aksi(r)}</td>
                      <td class="border-b border-hairline px-4 py-2.5">${esc(r.sasaran || "–")}</td>
                      <td class="min-w-[220px] border-b border-hairline px-4 py-2.5 text-ink-600">${detailHtml(r)}</td>
                    </tr>`
                  )
                  .join("")}</tbody>
              </table>
            </div>
            <div class="divide-y divide-hairline rounded-lg border border-hairline bg-white md:hidden">
              ${rows
                .map(
                  (r) => `<article class="p-4 text-[14px]" ${rwBaru.has(r.id) ? "data-rw-baru" : ""}>
                    <div class="flex items-start justify-between gap-3"><div class="min-w-0">${aksi(r)}</div><span class="shrink-0 font-mono text-[12px] text-ink-500">${esc(rwWaktu(r.waktu))}</span></div>
                    <div class="mt-2">${petugas(r)}</div>
                    ${r.sasaran ? `<p class="mt-1.5">${esc(r.sasaran)}</p>` : ""}
                    ${r.detail ? `<div class="mt-1 text-ink-600">${detailHtml(r)}</div>` : ""}
                  </article>`
                )
                .join("")}
            </div>`;
          // sorot sebentar aktivitas yang baru masuk
          wadah.querySelectorAll("[data-rw-baru]").forEach((el) =>
            el.animate && el.animate([{ backgroundColor: "rgb(252 231 243)" }, { backgroundColor: "rgb(252 231 243)", offset: 0.5 }, { backgroundColor: "transparent" }], { duration: 3000, easing: "ease-out" })
          );
          rwBaru.clear();
        }

        /* --- langsung (realtime): aktivitas baru muncul sendiri tanpa muat ulang --- */
        const rwBaru = new Set();
        let rwSaluran = null;
        let rwStatus = "";
        let rwTimer = null;
        let rwLepas = null;
        function rwTampilStatus(status) {
          rwStatus = status;
          const wadah = document.getElementById("rwLangsung");
          if (!wadah) return;
          const nyala = status === "SUBSCRIBED";
          const warna = nyala ? "#16A34A" : status === "MENGHUBUNGKAN" ? "#A1A1AA" : "#D97706";
          wadah.querySelector("[data-rw-titik]").style.background = warna;
          const denyut = wadah.querySelector("[data-rw-denyut]");
          denyut.style.background = warna;
          denyut.classList.toggle("animate-ping", nyala);
          wadah.querySelector("[data-rw-teks]").textContent = nyala ? "Langsung — aktivitas baru muncul otomatis" : status === "MENGHUBUNGKAN" ? "Menghubungkan…" : "Diperbarui otomatis tiap 20 detik";
        }
        function rwTambah(rows) {
          const ada = new Set(rwBaris.map((r) => r.id));
          const baru = (rows || []).filter((r) => r && !ada.has(r.id));
          if (!baru.length) return;
          baru.forEach((r) => rwBaru.add(r.id));
          rwBaris = baru.concat(rwBaris).sort((a, b) => (a.waktu < b.waktu ? 1 : a.waktu > b.waktu ? -1 : b.id - a.id));
          rwIsiPilihan("rwPetugas", rwBaris.map((r) => r.pelaku_nama), "Semua petugas");
          rwIsiPilihan("rwAksi", rwBaris.map((r) => r.aksi), "Semua aktivitas");
          renderRiwayat();
        }
        async function rwCekBaru() {
          if (document.visibilityState !== "visible" || !rwBaris.length) return;
          const { data, error } = await db
            .from("riwayat")
            .select("id,waktu,pelaku_nama,peran,aksi,modul,sasaran,detail")
            .gt("id", Math.max(...rwBaris.map((r) => r.id)))
            .order("id", { ascending: false })
            .limit(50);
          if (!error) rwTambah(data);
        }
        function rwMulaiLangsung() {
          if (rwSaluran || rwTimer) return;
          rwTampilStatus("MENGHUBUNGKAN");
          try {
            rwSaluran = db
              .channel("riwayat-langsung")
              .on("postgres_changes", { event: "INSERT", schema: "public", table: "riwayat" }, (p) => rwTambah([p.new]))
              .subscribe((status) => rwTampilStatus(status));
          } catch {
            rwTampilStatus("CADANGAN");
          }
          // cadangan: tetap cek berkala (realtime bisa "terhubung" tapi tabel belum terdaftar di Supabase)
          rwTimer = setInterval(rwCekBaru, 20000);
          setTimeout(() => rwStatus !== "SUBSCRIBED" && rwTampilStatus("CADANGAN"), 8000);
          rwLepas = AdminUI.daftarPengamat({ stop: rwBerhentiLangsung });
        }
        function rwBerhentiLangsung() {
          if (rwSaluran) db.removeChannel(rwSaluran).catch(() => {});
          rwSaluran = null;
          clearInterval(rwTimer);
          rwTimer = null;
          if (rwLepas) rwLepas();
          rwLepas = null;
        }

        async function loadRiwayat(dariAwal) {
          const wadah = document.getElementById("rwDaftar");
          const tombolLagi = document.getElementById("rwLagi");
          if (dariAwal) {
            rwBaris = [];
            rwHabis = false;
          }
          tombolLagi.disabled = true;
          const { data, error } = await db
            .from("riwayat")
            .select("id,waktu,pelaku_nama,peran,aksi,modul,sasaran,detail")
            .order("waktu", { ascending: false })
            .order("id", { ascending: false })
            .range(rwBaris.length, rwBaris.length + RW_PER_MUAT - 1);
          tombolLagi.disabled = false;
          if (error) {
            document.getElementById("rwJumlah").textContent = "";
            tombolLagi.classList.add("hidden");
            wadah.innerHTML = `<p class="rounded-lg bg-red-50 p-4 text-[15px] text-red-700">${
              /riwayat|schema cache|does not exist|42P01|PGRST2/i.test(error.message + " " + (error.code || ""))
                ? "Tabel riwayat belum dibuat. Jalankan supabase/04-riwayat.sql di Supabase (SQL Editor → New query → Run), lalu muat ulang halaman ini."
                : "Gagal memuat riwayat: " + esc(error.message)
            }</p>`;
            return;
          }
          rwBaris = rwBaris.concat(data || []);
          rwHabis = !data || data.length < RW_PER_MUAT;
          rwMulaiLangsung();
          rwIsiPilihan("rwPetugas", rwBaris.map((r) => r.pelaku_nama), "Semua petugas");
          rwIsiPilihan("rwAksi", rwBaris.map((r) => r.aksi), "Semua aktivitas");
          renderRiwayat();
        }
        ["rwCari", "rwPetugas", "rwAksi"].forEach((id) => document.getElementById(id).addEventListener("input", renderRiwayat));
        document.getElementById("rwLagi").addEventListener("click", () => loadRiwayat(false));

        /* ---------- sub-halaman (menu samping: Superadmin → …) ---------- */
        const INFO_SUB = {
          pengaturan: ["Pengaturan situs", "Buka/tutup pendaftaran SPMB dan atur pop-up promo di beranda."],
          rekap: ["Rekap & unduh data", "Ringkasan jumlah pendaftar dan unduhan data lengkap (bisa dibuka di Excel)."],
          petugas: ["Akun petugas", "Tambah petugas, ubah nama/password, dan atur tugas tiap akun."],
          reset: ["Reset password", "Untuk siswa (isi NISN) atau petugas (isi username) yang lupa password."],
          riwayat: ["Riwayat aktivitas", "Catatan siapa melakukan apa di panel admin. Hanya superadmin yang bisa melihat; catatan tidak bisa diubah atau dihapus."],
        };
        const MUAT = { pengaturan: () => loadPengaturan(), rekap: () => loadRekap(), petugas: () => loadPetugas(), riwayat: () => loadRiwayat(true) };
        const sudahDimuat = new Set();
        const pindahSub = (s) => {
          const id = INFO_SUB[s] ? s : "pengaturan";
          app.querySelectorAll("[data-sub]").forEach((el) => el.classList.toggle("hidden", el.dataset.sub !== id));
          document.getElementById("saJudul").textContent = INFO_SUB[id][0];
          document.getElementById("saDesk").textContent = INFO_SUB[id][1];
          document.title = `${INFO_SUB[id][0]} · Superadmin — Admin SPMB`;
          if (MUAT[id] && !sudahDimuat.has(id)) {
            sudahDimuat.add(id);
            MUAT[id]();
          } else if (id === "riwayat") {
            rwCekBaru();
            rwMulaiLangsung();
          }
          if (id !== "riwayat") rwBerhentiLangsung();
          rkAktif = id === "rekap";
          if (rkAktif) rkMulai();
          else rkBerhenti();
        };
        this.pindahSub = pindahSub;
        pindahSub(sub);
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

    let modulAktif = null;
    async function go() {
      const id = root.AdminAuth.routeFromHash(root.location.hash);
      const sub = root.AdminAuth.subFromHash(root.location.hash);
      const mod = MODULES[id];
      const daftarSub = (root.AdminAuth.MODULES.find((m) => m.id === id) || {}).sub || [];
      const subJudul = sub && (daftarSub.find((x) => x.id === sub) || {}).title;
      root.AdminUI.setActiveNav(id, subJudul ? `${mod.title} · ${subJudul}` : mod.title, sub);
      root.scrollTo({ top: 0 });
      // pindah sub-menu di modul yang sama: cukup ganti tampilan, data tidak dimuat ulang
      if (sub && modulAktif === id && typeof mod.pindahSub === "function" && app.querySelector("[data-sub]")) {
        mod.pindahSub(sub);
        return;
      }
      modulAktif = id;
      const my = ++token;
      root.AdminUI.stopAllWatchers();
      document.querySelectorAll("[data-admin-overlay]").forEach((el) => el.remove());
      document.title = `${mod.title} — Admin SPMB`;
      if (!root.AdminAuth.canOpen(profile.role, mod.roles)) {
        app.innerHTML = `<div class="rounded-lg border border-dashed border-hairline p-10 text-center">
          <p class="text-[17px] font-semibold">Anda tidak punya akses ke modul ini</p>
          <p class="mt-1 text-[15px] text-ink-600">Pilih modul sesuai tugas Anda di menu.</p>
          <a href="#dashboard" class="mt-5 inline-flex rounded-full bg-ink-900 px-5 py-2.5 text-[14px] font-medium text-white">Ke Dashboard</a></div>`;
        return;
      }
      app.innerHTML = SKELETON;
      try {
        await mod.mount(app, profile, sub);
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
