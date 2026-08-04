/* ============================================================
   app.js – Logika browser untuk tampilan cek.py
   Semua pemrosesan berjalan di sisi klien (tidak ada server).
   ============================================================ */

// ============================================================
// STATE
// ============================================================
const state = {
  bandFile1: null,
  bandFile2: null,
  bandName1: '',
  bandName2: '',
  pasteDebounce: null,
  currentInputMethod: 'upload', // 'upload' | 'paste'
};

// ============================================================
// INPUT METHOD TOGGLE (Upload ↔ Paste)
// ============================================================
function switchInputMethod(method) {
  state.currentInputMethod = method;
  document.getElementById('im-upload').classList.toggle('active', method === 'upload');
  document.getElementById('im-paste').classList.toggle('active', method === 'paste');
  document.getElementById('input-upload').classList.toggle('hidden', method !== 'upload');
  document.getElementById('input-paste').classList.toggle('hidden', method !== 'paste');
  const resultEl = document.getElementById('result-hitung');
  resultEl.classList.add('hidden');
  resultEl.innerHTML = '';
  if (method === 'paste') setTimeout(() => document.getElementById('paste-input').focus(), 80);
}

function switchInputMethodDup(method) {
  document.getElementById('dup-im-upload').classList.toggle('active', method === 'upload');
  document.getElementById('dup-im-paste').classList.toggle('active', method === 'paste');
  document.getElementById('dup-input-upload').classList.toggle('hidden', method !== 'upload');
  document.getElementById('dup-input-paste').classList.toggle('hidden', method !== 'paste');
  const resultEl = document.getElementById('result-duplikat');
  resultEl.classList.add('hidden');
  resultEl.innerHTML = '';
  if (method === 'paste') setTimeout(() => document.getElementById('dup-paste-input').focus(), 80);
}

function switchInputMethodBand(method) {
  document.getElementById('band-im-upload').classList.toggle('active', method === 'upload');
  document.getElementById('band-im-paste').classList.toggle('active', method === 'paste');
  document.getElementById('band-input-upload').classList.toggle('hidden', method !== 'upload');
  document.getElementById('band-input-paste').classList.toggle('hidden', method !== 'paste');
  const resultEl = document.getElementById('result-bandingkan');
  resultEl.classList.add('hidden');
  resultEl.innerHTML = '';
}

// ============================================================
// PASTE INPUT HANDLER — HITUNG TRANSAKSI
// ============================================================
function handlePasteInput(value) {
  const charCount = document.getElementById('paste-char-count');
  const statusEl  = document.getElementById('paste-status');
  const resultEl  = document.getElementById('result-hitung');
  const clearBtn  = document.getElementById('btn-clear-paste');

  charCount.textContent = value.length.toLocaleString('id-ID') + ' karakter';
  clearBtn.classList.toggle('hidden', !value.trim());

  if (!value.trim()) {
    statusEl.textContent = '';
    statusEl.className = 'paste-status';
    resultEl.classList.add('hidden');
    resultEl.innerHTML = '';
    return;
  }

  statusEl.textContent = 'Memproses…';
  statusEl.className = 'paste-status typing';

  clearTimeout(state.pasteDebounce);
  state.pasteDebounce = setTimeout(() => {
    const cleaned = value.trim().replace(/,\s*([\]}])/g, '$1');
    try {
      const data = JSON.parse(cleaned);
      const [tipe, daftar] = deteksiStruktur(data);
      let hasil;
      switch (tipe) {
        case 'rotio':  hasil = prosesRotio(daftar);  break;
        case 'kai':    hasil = prosesKai(daftar);    break;
        case 'hokben': hasil = prosesHokben(daftar); break;
        case 'kopken': hasil = prosesKopken(daftar); break;
        case 'fore':   hasil = prosesFore(daftar);   break;
        case 'fave':   hasil = prosesFave(daftar);   break;
        case 'sams':   hasil = prosesSams(daftar);   break;
      }
      statusEl.textContent = '✓ JSON valid · ' + tipe;
      statusEl.className = 'paste-status valid';
      const { detail, ringkasan } = hasil;
      const csvFilename = 'tempel_' + tipe + '.csv';
      resultEl.innerHTML = `
        <div class="result-header">
          <div class="result-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Ringkasan Transaksi
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span class="result-badge">${tipe.toUpperCase()}</span>
            <button class="btn-download" onclick='downloadCSV(${JSON.stringify(detail)}, "${escapeHtml(csvFilename)}")'>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Unduh CSV
            </button>
          </div>
        </div>
        <div class="alert-box success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Teks JSON berhasil diproses — Struktur terdeteksi: <strong>${tipe}</strong>
        </div>
        ${renderSummary(ringkasan, '')}
        <div class="section-label">Detail Per Transaksi (${formatNumber(detail.length)} baris)</div>
        ${renderDetailTable(detail, tipe)}
      `;
      resultEl.classList.remove('hidden');
    } catch (err) {
      statusEl.textContent = '✗ JSON tidak valid';
      statusEl.className = 'paste-status invalid';
      resultEl.innerHTML = `
        <div class="alert-box error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span><strong>Error:</strong> ${escapeHtml(err.message)}</span>
        </div>`;
      resultEl.classList.remove('hidden');
    }
  }, 600);
}

// ============================================================
// PASTE INPUT HANDLER — CEK DUPLIKAT
// ============================================================
function handlePasteInputDup(value) {
  const charCount = document.getElementById('dup-paste-char-count');
  const statusEl  = document.getElementById('dup-paste-status');
  const clearBtn  = document.getElementById('dup-btn-clear');

  charCount.textContent = value.length.toLocaleString('id-ID') + ' karakter';
  clearBtn.classList.toggle('hidden', !value.trim());

  if (!value.trim()) {
    statusEl.textContent = '';
    statusEl.className = 'paste-status';
    document.getElementById('result-duplikat').classList.add('hidden');
    document.getElementById('result-duplikat').innerHTML = '';
    return;
  }

  statusEl.textContent = 'Memproses…';
  statusEl.className = 'paste-status typing';

  clearTimeout(state.pasteDebounce);
  state.pasteDebounce = setTimeout(() => {
    const daftar = bacaDaftarNostruk(value);
    const duplikat = cekDuplikat(daftar);

    statusEl.textContent = duplikat.length > 0 ? `✓ ${duplikat.length} duplikat ditemukan` : '✓ Tidak ada duplikat';
    statusEl.className = 'paste-status ' + (duplikat.length > 0 ? 'invalid' : 'valid');

    renderHasilDuplikat(daftar, duplikat, 'tempel_nostruk');
  }, 400);
}

// ============================================================
// PASTE INPUT HANDLER — BANDINGKAN
// ============================================================
function handlePasteInputBand(num, value) {
  const charEl   = document.getElementById(`band${num}-char-count`);
  const statusEl = document.getElementById(`band${num}-paste-status`);
  const clearBtn = document.getElementById(`band${num}-btn-clear`);

  charEl.textContent = value.length.toLocaleString('id-ID') + ' karakter';
  clearBtn.classList.toggle('hidden', !value.trim());

  if (!value.trim()) {
    statusEl.textContent = '';
    statusEl.className = 'paste-status';
    if (num === 1) state.bandPaste1 = null;
    else state.bandPaste2 = null;
    document.getElementById('btn-bandingkan-paste').disabled = !(state.bandPaste1 && state.bandPaste2);
    return;
  }

  const daftar = bacaDaftarNostruk(value);
  if (num === 1) { state.bandPaste1 = daftar; state.bandPasteName1 = 'Teks 1'; }
  else           { state.bandPaste2 = daftar; state.bandPasteName2 = 'Teks 2'; }

  statusEl.textContent = `✓ ${formatNumber(daftar.length)} no struk`;
  statusEl.className = 'paste-status valid';

  document.getElementById('btn-bandingkan-paste').disabled = !(state.bandPaste1 && state.bandPaste2);
}

// ============================================================
// CLEAR PASTE
// ============================================================
function clearPaste(mode) {
  if (mode === 'hitung') {
    const ta = document.getElementById('paste-input');
    ta.value = '';
    handlePasteInput('');
    ta.focus();
  } else if (mode === 'duplikat') {
    const ta = document.getElementById('dup-paste-input');
    ta.value = '';
    handlePasteInputDup('');
    ta.focus();
  }
}

function clearPasteBand(num) {
  const ta = document.getElementById(`band${num}-paste-input`);
  ta.value = '';
  handlePasteInputBand(num, '');
  ta.focus();
}

// ============================================================
// JALANKAN BANDINGKAN (PASTE MODE)
// ============================================================
function jalankanBandingkanPaste() {
  if (!state.bandPaste1 || !state.bandPaste2) return;
  // Reuse jalankanBandingkan logic tapi pakai state paste
  const savedF1 = state.bandFile1, savedF2 = state.bandFile2;
  const savedN1 = state.bandName1, savedN2 = state.bandName2;
  state.bandFile1 = state.bandPaste1;
  state.bandFile2 = state.bandPaste2;
  state.bandName1 = state.bandPasteName1 || 'Teks 1';
  state.bandName2 = state.bandPasteName2 || 'Teks 2';
  jalankanBandingkan();
  state.bandFile1 = savedF1; state.bandFile2 = savedF2;
  state.bandName1 = savedN1; state.bandName2 = savedN2;
}


// ============================================================
// TABS
// ============================================================
function switchTab(tab) {
  ['hitung', 'duplikat', 'bandingkan'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`tab-${t}`).setAttribute('aria-selected', t === tab);
    document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== tab);
  });
}

// ============================================================
// DRAG & DROP
// ============================================================
function setupDropzone(zoneId, handler) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave',    ()  => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handler(file);
  });
}

setupDropzone('dropzone-hitung',   f => handleFileHitung(f));
setupDropzone('dropzone-duplikat', f => handleFileDuplikat(f));
setupDropzone('dropzone-band1',    f => handleFileBand(1, f));
setupDropzone('dropzone-band2',    f => handleFileBand(2, f));

// ============================================================
// FORMAT RUPIAH
// ============================================================
function formatRupiah(value) {
  const n = Math.round(parseFloat(value) || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatNumber(n) {
  return n.toLocaleString('id-ID');
}

// ============================================================
// DETEKSI STRUKTUR JSON TRANSAKSI
// ============================================================
function deteksiStruktur(data) {
  // fave: dict dengan "Data" berisi list
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data['Data'])) {
    const daftar = data['Data'];
    if (daftar.length > 0 && 'grand_total' in daftar[0] && 'tax_amount' in daftar[0]) {
      return ['fave', daftar];
    }
    throw new Error("Struktur dict dengan key 'Data' ditemukan, tetapi isinya tidak cocok dengan pola 'fave' (field 'grand_total'/'tax_amount' tidak ditemukan).");
  }
  // kopken: dict dengan "result"
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data['result'])) {
    const daftar = data['result'];
    if (daftar.length > 0 && 'dpp' in daftar[0] && 'pajak' in daftar[0]) {
      return ['kopken', daftar];
    }
    throw new Error("Struktur dict dengan key 'result' ditemukan, tetapi isinya tidak cocok dengan pola 'kopken'.");
  }
  // sams / hokben / fore: dict dengan "data"
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data['data'])) {
    const daftar = data['data'];
    if (daftar.length > 0 && typeof daftar[0] === 'object') {
      const d0 = daftar[0];
      if ('subtotal' in d0 && 'dpp' in d0 && 'tax' in d0 && 'total' in d0) return ['sams', daftar];
      if ('tax' in d0) return ['hokben', daftar];
      if ('pajak' in d0 && 'total' in d0) return ['fore', daftar];
    }
    throw new Error("Struktur dict dengan key 'data' tidak cocok dengan pola yang didukung (sams/hokben/fore).");
  }
  // list-based
  if (!Array.isArray(data) || data.length === 0) throw new Error("Data JSON harus berupa list dan tidak boleh kosong.");
  const contoh = data[0];
  if (typeof contoh !== 'object') throw new Error("Setiap elemen list harus berupa object/dict.");
  // kai
  if ('biayatotal' in contoh) return ['kai', data];
  // rotio
  const kunci = Object.values(contoh)[0];
  if (kunci && typeof kunci === 'object' && '4' in kunci) return ['rotio', data];
  throw new Error("Struktur JSON tidak dikenali. Struktur yang didukung: rotio, kai, hokben, kopken, fore, fave, sams.");
}

// ============================================================
// PROSES PER TIPE
// ============================================================
function prosesRotio(data) {
  const detail = [];
  let tSubtotal = 0, tDpp = 0, tTax = 0, tTotal = 0;
  for (const record of data) {
    for (const [trxId, isi] of Object.entries(record)) {
      const n4 = parseFloat(isi['4']) || 0;
      const subtotal = n4 / 1.1, dpp = n4 / 1.1, tax = n4 / 11, total = n4;
      tSubtotal += subtotal; tDpp += dpp; tTax += tax; tTotal += total;
      detail.push({ id_transaksi: trxId, tanggal: isi['0'] || '', outlet: isi['outlet'] || '', subtotal, dpp, tax, total });
    }
  }
  return { detail, ringkasan: { tipe: 'rotio', jumlah: detail.length, total_subtotal: tSubtotal, total_dpp: tDpp, total_tax: tTax, total_keseluruhan: tTotal } };
}

function prosesKai(data) {
  const detail = [];
  let tBiaya = 0, tDpp = 0, tTax = 0;
  for (const isi of data) {
    const n = parseFloat(isi['biayatotal']) || 0;
    const tax = n / 11, dpp = n - tax;
    tBiaya += n; tDpp += dpp; tTax += tax;
    detail.push({ kode_lokasi: isi['kode_lokasi'] || '', nama_lokasi: isi['nama_lokasi'] || '', kode_cus_out: isi['kode_cus_out'] || '', waktu_out: isi['waktu_out'] || '', biayatotal: n, dpp, tax, kode_bank_out: isi['kode_bank_out'] || '' });
  }
  return { detail, ringkasan: { tipe: 'kai', jumlah: detail.length, total_biayatotal: tBiaya, total_dpp: tDpp, total_tax: tTax } };
}

function prosesHokben(data) {
  const detail = [];
  let tDpp = 0, tTax = 0, tTotal = 0;
  for (const isi of data) {
    const tax = parseFloat(isi['tax']) || 0;
    const total = tax / 0.1, dpp = total - tax;
    tDpp += dpp; tTax += tax; tTotal += total;
    detail.push({ no_transaksi: isi['no_transaksi'] || '', trans_date: isi['trans_date'] || '', jam: isi['jam'] || '', branch_id: isi['branch_id'] || '', dpp, tax, total });
  }
  return { detail, ringkasan: { tipe: 'hokben', jumlah: detail.length, total_dpp: tDpp, total_tax: tTax, total_total: tTotal } };
}

function prosesKopken(data) {
  const detail = [];
  let tDpp = 0, tTax = 0, tTotal = 0;
  for (const isi of data) {
    const dpp = parseFloat(isi['dpp']) || 0;
    const tax = parseFloat(isi['pajak']) || 0;
    const total = parseFloat(isi['total']) || 0;
    tDpp += dpp; tTax += tax; tTotal += total;
    detail.push({ no_struk: isi['no_struk'] || '', waktu_transaksi: isi['waktu_transaksi'] || '', outlet_id: isi['outlet_id'] || '', dpp, tax, total, jenis_pembayaran: isi['jenis_pembayaran'] || '' });
  }
  return { detail, ringkasan: { tipe: 'kopken', jumlah: detail.length, total_dpp: tDpp, total_tax: tTax, total_total: tTotal } };
}

function prosesFore(data) {
  const detail = [];
  let tDpp = 0, tTax = 0, tTotal = 0;
  for (const isi of data) {
    const total = parseFloat(isi['total']) || 0;
    const tax = parseFloat(isi['pajak']) || 0;
    const dpp = total - tax;
    tDpp += dpp; tTax += tax; tTotal += total;
    detail.push({ billing_id: isi['billing_id'] || '', tgl: isi['tgl'] || '', counter_name: isi['counter_name'] || '', dpp, tax, total });
  }
  return { detail, ringkasan: { tipe: 'fore', jumlah: detail.length, total_dpp: tDpp, total_tax: tTax, total_total: tTotal } };
}

function prosesFave(data) {
  const detail = [];
  let tDpp = 0, tTax = 0, tTotal = 0;
  for (const isi of data) {
    const dpp = parseFloat(isi['base_amount']) || 0;
    const tax = parseFloat(isi['tax_amount']) || 0;
    const total = parseFloat(isi['grand_total']) || 0;
    tDpp += dpp; tTax += tax; tTotal += total;
    detail.push({ transaction_id: isi['transaction_id'] || '', created_date_time: isi['created_date_time'] || '', revenue_center_name: isi['revenue_center_name'] || '', dpp, tax, total });
  }
  return { detail, ringkasan: { tipe: 'fave', jumlah: detail.length, total_dpp: tDpp, total_tax: tTax, total_total: tTotal } };
}

function prosesSams(data) {
  const detail = [];
  let tSub = 0, tDpp = 0, tTax = 0, tTotal = 0;
  for (const isi of data) {
    const subtotal = parseFloat(isi['subtotal']) || 0;
    const dpp = parseFloat(isi['dpp']) || 0;
    const tax = parseFloat(isi['tax']) || 0;
    const total = parseFloat(isi['total']) || 0;
    tSub += subtotal; tDpp += dpp; tTax += tax; tTotal += total;
    detail.push({ no_struk: isi['no_struk'] || '', date_trans: isi['date_trans'] || '', nama_usaha: isi['nama_usaha'] || '', subtotal, dpp, tax, total });
  }
  return { detail, ringkasan: { tipe: 'sams', jumlah: detail.length, total_subtotal: tSub, total_dpp: tDpp, total_tax: tTax, total_keseluruhan: tTotal } };
}

// ============================================================
// RENDER SUMMARY CARDS
// ============================================================
function renderSummary(ringkasan, filename) {
  const { tipe, jumlah } = ringkasan;

  // Build summary cards HTML
  let cards = `
    <div class="summary-card accent-indigo">
      <div class="summary-label">Jumlah Transaksi</div>
      <div class="summary-value big">${formatNumber(jumlah)}</div>
    </div>`;

  if (tipe === 'rotio' || tipe === 'sams') {
    cards += `
      <div class="summary-card accent-green">
        <div class="summary-label">Total Subtotal</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_subtotal)}</div>
      </div>
      <div class="summary-card accent-orange">
        <div class="summary-label">Total DPP</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_dpp)}</div>
      </div>
      <div class="summary-card accent-violet">
        <div class="summary-label">Total Tax (PPN)</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_tax)}</div>
      </div>
      <div class="summary-card accent-cyan">
        <div class="summary-label">Total Keseluruhan</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_keseluruhan)}</div>
      </div>`;
  } else if (tipe === 'kai') {
    cards += `
      <div class="summary-card accent-green">
        <div class="summary-label">Total Biayatotal</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_biayatotal)}</div>
      </div>
      <div class="summary-card accent-orange">
        <div class="summary-label">Total DPP</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_dpp)}</div>
      </div>
      <div class="summary-card accent-violet">
        <div class="summary-label">Total Tax</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_tax)}</div>
      </div>`;
  } else {
    // hokben, kopken, fore, fave
    cards += `
      <div class="summary-card accent-orange">
        <div class="summary-label">Total DPP</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_dpp)}</div>
      </div>
      <div class="summary-card accent-violet">
        <div class="summary-label">Total Tax</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_tax)}</div>
      </div>
      <div class="summary-card accent-cyan">
        <div class="summary-label">Total Keseluruhan</div>
        <div class="summary-value">${formatRupiah(ringkasan.total_total)}</div>
      </div>`;
  }

  return `<div class="summary-grid">${cards}</div>`;
}

// ============================================================
// RENDER DETAIL TABLE
// ============================================================
// Simpan data detail global agar bisa di-re-render saat ganti limit
const _tableRegistry = {};

function renderDetailTable(detail, tipe, tableId) {
  if (!detail.length) return '<div class="alert-box info">Tidak ada detail transaksi.</div>';

  const id = tableId || ('tbl_' + Date.now());
  _tableRegistry[id] = { detail, tipe };

  const cols = Object.keys(detail[0]);
  const moneyFields = new Set(['subtotal','dpp','tax','total','biayatotal','total_subtotal','total_dpp','total_tax','total_keseluruhan','total_biayatotal','total_total']);

  function buildRows(rows) {
    return rows.map(row =>
      `<tr>${cols.map(c => {
        const v = row[c];
        if (moneyFields.has(c)) return `<td class="money">${formatRupiah(v)}</td>`;
        if (typeof v === 'number') return `<td>${formatNumber(v)}</td>`;
        return `<td class="mono">${escapeHtml(String(v))}</td>`;
      }).join('')}</tr>`
    ).join('');
  }

  const thead = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  const initRows = detail.slice(0, 20);

  return `
    <div class="table-controls">
      <span class="table-info" id="${id}-info">Menampilkan <strong>1–${Math.min(20, detail.length)}</strong> dari <strong>${formatNumber(detail.length)}</strong> baris</span>
      <div class="table-limit-wrap">
        <label class="table-limit-label" for="${id}-limit">Tampilkan</label>
        <select class="table-limit-select" id="${id}-limit" onchange="updateTableView('${id}', this.value)">
          <option value="10">10</option>
          <option value="20" selected>20</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="all">Semua</option>
        </select>
        <span class="table-limit-label">baris</span>
      </div>
    </div>
    <div class="table-scroll-wrap">
      <div class="table-wrap">
        <table class="data-table" id="${id}-table">
          <thead>${thead}</thead>
          <tbody id="${id}-body">${buildRows(initRows)}</tbody>
        </table>
      </div>
    </div>`;
}

function updateTableView(id, limitVal) {
  const reg = _tableRegistry[id];
  if (!reg) return;
  const { detail } = reg;
  const cols = Object.keys(detail[0]);
  const moneyFields = new Set(['subtotal','dpp','tax','total','biayatotal','total_subtotal','total_dpp','total_tax','total_keseluruhan','total_biayatotal','total_total']);

  const limit = limitVal === 'all' ? detail.length : parseInt(limitVal);
  const rows = detail.slice(0, limit);

  const tbody = document.getElementById(id + '-body');
  const info  = document.getElementById(id + '-info');
  if (!tbody) return;

  tbody.innerHTML = rows.map(row =>
    `<tr>${cols.map(c => {
      const v = row[c];
      if (moneyFields.has(c)) return `<td class="money">${formatRupiah(v)}</td>`;
      if (typeof v === 'number') return `<td>${formatNumber(v)}</td>`;
      return `<td class="mono">${escapeHtml(String(v))}</td>`;
    }).join('')}</tr>`
  ).join('');

  if (info) info.innerHTML = `Menampilkan <strong>1–${formatNumber(rows.length)}</strong> dari <strong>${formatNumber(detail.length)}</strong> baris`;
}

// ============================================================
// GENERATE CSV DOWNLOAD
// ============================================================
function downloadCSV(detail, filename) {
  if (!detail.length) return;
  const cols = Object.keys(detail[0]);
  const rows = [cols.join(',')];
  for (const row of detail) {
    rows.push(cols.map(c => {
      const v = String(row[c] ?? '');
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','));
  }
  const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// HANDLER: HITUNG TRANSAKSI
// ============================================================
function handleFileHitung(file) {
  if (!file) return;
  const resultEl = document.getElementById('result-hitung');
  resultEl.innerHTML = `<div class="spinner"><div class="spinner-ring"></div></div>`;
  resultEl.classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const [tipe, daftar] = deteksiStruktur(data);

      let hasil;
      switch (tipe) {
        case 'rotio':   hasil = prosesRotio(daftar);   break;
        case 'kai':     hasil = prosesKai(daftar);     break;
        case 'hokben':  hasil = prosesHokben(daftar);  break;
        case 'kopken':  hasil = prosesKopken(daftar);  break;
        case 'fore':    hasil = prosesFore(daftar);    break;
        case 'fave':    hasil = prosesFave(daftar);    break;
        case 'sams':    hasil = prosesSams(daftar);    break;
      }

      const { detail, ringkasan } = hasil;
      const csvFilename = file.name.replace(/\.json$/i, '') + '.csv';

      resultEl.innerHTML = `
        <div class="result-header">
          <div class="result-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Ringkasan Transaksi
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <span class="result-badge">${tipe.toUpperCase()}</span>
            <button class="btn-download" onclick='downloadCSV(${JSON.stringify(detail)}, "${escapeHtml(csvFilename)}")'>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Unduh CSV
            </button>
          </div>
        </div>

        <div class="alert-box success">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          File "<strong>${escapeHtml(file.name)}</strong>" berhasil diproses — Struktur terdeteksi: <strong>${tipe}</strong>
        </div>

        ${renderSummary(ringkasan, file.name)}

        <div class="section-label">Detail Per Transaksi (${formatNumber(detail.length)} baris)</div>
        ${renderDetailTable(detail, tipe)}
      `;
    } catch (err) {
      resultEl.innerHTML = `
        <div class="alert-box error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span><strong>Error:</strong> ${escapeHtml(err.message)}</span>
        </div>`;
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ============================================================
// HANDLER: CEK DUPLIKAT
// ============================================================
function bacaDaftarNostruk(teks) {
  const rapi = teks.trim();
  if (rapi.startsWith('[')) {
    try {
      const arr = JSON.parse(rapi);
      if (Array.isArray(arr)) return arr.map(x => String(x).trim()).filter(x => x);
    } catch {}
  }
  return teks.split('\n').map(b => b.trim()).filter(b => b);
}

function cekDuplikat(daftar) {
  const counter = {};
  for (const ns of daftar) counter[ns] = (counter[ns] || 0) + 1;
  const dup = Object.entries(counter)
    .filter(([, n]) => n > 1)
    .map(([ns, n]) => ({ no_struk: ns, jumlah_muncul: n }))
    .sort((a, b) => b.jumlah_muncul - a.jumlah_muncul || a.no_struk.localeCompare(b.no_struk));
  return dup;
}

function handleFileDuplikat(file) {
  if (!file) return;
  const resultEl = document.getElementById('result-duplikat');
  resultEl.innerHTML = `<div class="spinner"><div class="spinner-ring"></div></div>`;
  resultEl.classList.remove('hidden');

  const reader = new FileReader();
  reader.onload = e => {
    const daftar = bacaDaftarNostruk(e.target.result);
    const duplikat = cekDuplikat(daftar);
    const csvFilename = file.name.replace(/\.(json|txt)$/i, '') + '_duplikat.csv';
    renderHasilDuplikat(daftar, duplikat, csvFilename.replace('_duplikat.csv', ''));
  };
  reader.readAsText(file, 'utf-8');
}

// Render hasil cek duplikat — digunakan oleh file upload maupun paste
function renderHasilDuplikat(daftar, duplikat, baseName) {
  const resultEl = document.getElementById('result-duplikat');
  const csvFilename = baseName + '_duplikat.csv';

  const badge = duplikat.length > 0
    ? `<span class="result-badge orange">${formatNumber(duplikat.length)} duplikat</span>`
    : `<span class="result-badge green">Tidak ada duplikat</span>`;

  let listHTML = '';
  if (duplikat.length === 0) {
    listHTML = `<div class="alert-box success">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      Tidak ditemukan no struk yang duplikat. Semua no struk unik.
    </div>`;
  } else {
    listHTML = `
      <button class="btn-download mb-4" onclick='downloadCSV(${JSON.stringify(duplikat)}, "${escapeHtml(csvFilename)}")'>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Unduh CSV Duplikat
      </button>
      <div class="table-scroll-wrap">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>#</th><th>No Struk</th><th>Jumlah Muncul</th></tr></thead>
            <tbody>
              ${duplikat.map((d, i) => `<tr>
                <td class="mono">${i+1}</td>
                <td class="mono">${escapeHtml(d.no_struk)}</td>
                <td class="dup-count">${d.jumlah_muncul}×</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  resultEl.innerHTML = `
    <div class="result-header">
      <div class="result-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="12" r="7"/><circle cx="15" cy="12" r="7"/></svg>
        Cek No Struk Duplikat
      </div>
      ${badge}
    </div>
    <div class="summary-grid">
      <div class="summary-card accent-indigo">
        <div class="summary-label">Total Diperiksa</div>
        <div class="summary-value big">${formatNumber(daftar.length)}</div>
      </div>
      <div class="summary-card ${duplikat.length > 0 ? 'accent-orange' : 'accent-green'}">
        <div class="summary-label">No Struk Duplikat</div>
        <div class="summary-value big">${formatNumber(duplikat.length)}</div>
      </div>
      <div class="summary-card accent-violet">
        <div class="summary-label">No Struk Unik</div>
        <div class="summary-value big">${formatNumber(new Set(daftar).size)}</div>
      </div>
    </div>
    ${listHTML}
  `;
  resultEl.classList.remove('hidden');
}

// ============================================================
// HANDLER: BANDINGKAN FILE
// ============================================================
function handleFileBand(num, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const daftar = bacaDaftarNostruk(e.target.result);
    if (num === 1) {
      state.bandFile1 = daftar;
      state.bandName1 = file.name;
    } else {
      state.bandFile2 = daftar;
      state.bandName2 = file.name;
    }
    const label = document.getElementById(`fname-band${num}`);
    label.textContent = `✓ ${file.name} (${formatNumber(daftar.length)} no struk)`;
    label.classList.remove('hidden');

    const btn = document.getElementById('btn-bandingkan');
    btn.disabled = !(state.bandFile1 && state.bandFile2);
  };
  reader.readAsText(file, 'utf-8');
}

function jalankanBandingkan() {
  if (!state.bandFile1 || !state.bandFile2) return;
  const resultEl = document.getElementById('result-bandingkan');
  resultEl.classList.remove('hidden');

  const setA = new Set(state.bandFile1);
  const setB = new Set(state.bandFile2);
  const hanyaDiA = [...setA].filter(x => !setB.has(x)).sort();
  const hanyaDiB = [...setB].filter(x => !setA.has(x)).sort();
  const total = hanyaDiA.length + hanyaDiB.length;

  const detail = [
    ...hanyaDiA.map(ns => ({ no_struk: ns, hanya_ada_di: state.bandName1 })),
    ...hanyaDiB.map(ns => ({ no_struk: ns, hanya_ada_di: state.bandName2 })),
  ];
  const csvFilename = state.bandName1.replace(/\.[^.]+$/, '') + '_vs_' + state.bandName2.replace(/\.[^.]+$/, '') + '.csv';

  let bodyHTML = '';
  if (total === 0) {
    bodyHTML = `<div class="alert-box success">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      Semua no struk di kedua file sudah berpasangan. Tidak ada yang tertinggal.
    </div>`;
  } else {
    const renderSection = (list, tag, cls) => list.length === 0 ? '' : `
      <div class="compare-section">
        <div class="compare-file-tag ${cls}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          Hanya di ${escapeHtml(tag)} (${formatNumber(list.length)})
        </div>
        <div class="table-scroll-wrap">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>#</th><th>No Struk</th></tr></thead>
              <tbody>${list.map((ns, i) => `<tr><td class="mono">${i+1}</td><td class="mono">${escapeHtml(ns)}</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
      </div>`;

    bodyHTML = `
      <button class="btn-download mb-4" onclick='downloadCSV(${JSON.stringify(detail)}, "${escapeHtml(csvFilename)}")'>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Unduh CSV Hasil Perbandingan
      </button>
      ${renderSection(hanyaDiA, state.bandName1, 'a')}
      ${renderSection(hanyaDiB, state.bandName2, 'b')}
    `;
  }

  resultEl.innerHTML = `
    <div class="result-header">
      <div class="result-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3v18M19 3v18M5 9h14M5 15h14"/></svg>
        Hasil Perbandingan
      </div>
      <span class="result-badge ${total > 0 ? 'red' : 'green'}">${total > 0 ? formatNumber(total) + ' tidak berpasangan' : 'Semua berpasangan'}</span>
    </div>
    <div class="summary-grid">
      <div class="summary-card accent-green">
        <div class="summary-label">${escapeHtml(state.bandName1)}</div>
        <div class="summary-value big">${formatNumber(state.bandFile1.length)}</div>
      </div>
      <div class="summary-card accent-purple">
        <div class="summary-label">${escapeHtml(state.bandName2)}</div>
        <div class="summary-value big">${formatNumber(state.bandFile2.length)}</div>
      </div>
      <div class="summary-card ${total > 0 ? 'accent-orange' : 'accent-indigo'}">
        <div class="summary-label">Tidak Berpasangan</div>
        <div class="summary-value big">${formatNumber(total)}</div>
      </div>
    </div>
    ${bodyHTML}
  `;
}

// ============================================================
// UTIL: ESCAPE HTML
// ============================================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
