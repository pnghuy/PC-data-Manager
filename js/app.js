/*
 * Giao diện Tinh tế Laptop Lab:
 * - Đọc dữ liệu tự động từ GitHub repository pnghuy/tinhte-charts
 * - Tìm kiếm, lọc theo bài test, xem chi tiết và biểu đồ so sánh trực quan
 */
(function () {
  'use strict';
  const LAB = window.LAB;
  const U = LAB.util;
  const esc = U.esc;
  const app = document.getElementById('app');

  let DB = null;
  const state = {
    q: '',
    sort: 'newest',
    category: 'all',
    shown: LAB.CONFIG.pageSize || 24,
    showIssues: false,
    compare: [], // id các máy đang chọn để so sánh (tối đa CMP_MAX)
  };
  const CMP_MAX = 4;

  // Bài test cùng họ gộp thành một khung có tab (vd Cinebench 2026 / 2024 / R23)
  const FAMILIES = [
    { id: 'cinebench', label: 'Cinebench', tests: ['cinebench-2026', 'cinebench-2024', 'cinebench-r23'] },
    { id: 'geekbench', label: 'Geekbench', tests: ['geekbench-7', 'geekbench-6'] },
    { id: 'time-spy', label: '3DMark Time Spy', tests: ['3dmark-time-spy', '3dmark-time-spy-extreme'] },
    { id: 'fire-strike', label: '3DMark Fire Strike', tests: ['3dmark-fire-strike', '3dmark-fire-strike-extreme', '3dmark-fire-strike-ultra'] },
    { id: 'steel-nomad', label: '3DMark Steel Nomad', tests: ['3dmark-steel-nomad', '3dmark-steel-nomad-light'] },
  ];
  const familyOf = (tid) => FAMILIES.find((f) => f.tests.indexOf(tid) >= 0);

  // Biểu đồ đang hiện trên trang, để nút "Tải ảnh" lấy lại dữ liệu
  let RENDERED = [];

  // Màu theo nhận diện Tinh tế (xanh dương, xanh lá) như chart trong bài viết
  const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

  // Chưa có ảnh máy thì không chừa ô trống
  function thumb(l, cls) {
    if (!l.image) return '';
    return '<div class="' + cls + '"><img src="' + esc(l.image) + '" alt="' + esc(l.name) + '" loading="lazy" onerror="this.parentNode.remove()"></div>';
  }

  /* ---------- Định tuyến Hash ---------- */

  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/';
    const qi = h.indexOf('?');
    const path = qi >= 0 ? h.slice(0, qi) : h;
    const qs = qi >= 0 ? h.slice(qi + 1) : '';
    return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(qs) };
  }

  function homeHash() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.sort && state.sort !== 'newest') p.set('sort', state.sort);
    if (state.category && state.category !== 'all') p.set('cat', state.category);
    const s = p.toString();
    return '#/' + (s ? '?' + s : '');
  }

  function route() {
    const { parts, params } = parseHash();
    if (parts[0] === 'may' && parts[1]) {
      renderDetail(decodeURIComponent(parts[1]));
      renderTray();
      return;
    }
    if (parts[0] === 'so-sanh') {
      const ids = (params.get('m') || '').split(',').map((x) => decodeURIComponent(x)).filter((id) => DB.byId[id]);
      if (ids.length) state.compare = ids.slice(0, CMP_MAX);
      renderCompare();
      renderTray();
      return;
    }
    state.q = params.get('q') || '';
    state.sort = params.get('sort') || 'newest';
    state.category = params.get('cat') || 'all';
    state.shown = LAB.CONFIG.pageSize || 24;
    renderHome();
    renderTray();
  }

  /* ---------- Lọc & Sắp xếp ---------- */

  function filterAndSort() {
    const tokens = U.normalize(state.q).split(/\s+/).filter(Boolean);
    let list = DB.laptops.filter((l) => {
      const matchText = tokens.every((t) => l.search.includes(t));
      if (!matchText) return false;
      if (state.category !== 'all') {
        const hasCat = l.charts.some((ch) => ch.category === state.category);
        if (!hasCat) return false;
      }
      return true;
    });

    const s = state.sort;
    if (s === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } else if (s === 'tests') {
      list.sort((a, b) => b.testCount - a.testCount);
    } else if (s.startsWith('m:')) {
      const key = s.slice(2);
      const meta = DB.metrics[key] || {};
      const lower = meta.lowerBetter;
      list.sort((a, b) => {
        const x = a.v[key], y = b.v[key];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return lower ? x - y : y - x;
      });
    } else {
      list.sort((a, b) => {
        const x = a.date ? a.date.getTime() : 0;
        const y = b.date ? b.date.getTime() : 0;
        return y - x || a.name.localeCompare(b.name, 'vi');
      });
    }
    return list;
  }

  /* ---------- Card ở Trang chủ ---------- */

  function card(l, metricKey) {
    const r = l.raw;
    const tags = [];
    if (l.brand) tags.push('<span class="tag"><b>' + esc(l.brand) + '</b></span>');
    tags.push('<span class="tag">' + l.testCount + ' bài test</span>');
    if (!l.measured) tags.push('<span class="tag tag-muted">Số tham khảo</span>');
    if (l.dateLabel) tags.push('<span class="tag tag-muted">' + esc(l.dateLabel) + '</span>');

    // Thẻ xem nhanh kết quả nếu đang sắp xếp theo bài test
    let metricBox = '';
    if (metricKey) {
      const meta = DB.metrics[metricKey] || {};
      const val = l.v[metricKey];
      if (val != null) {
        const rk = LAB.rankOf(DB, metricKey, val);
        metricBox =
          '<div class="card-metric">' +
          '<b>' + esc(U.fmtNumber(val, meta.decimals)) + (meta.unit ? ' <small>' + esc(meta.unit) + '</small>' : '') + '</b>' +
          '<small>' + esc(meta.fullLabel || meta.label || '') + '</small>' +
          (rk ? '<small class="diff pos">#' + rk.rank + '/' + rk.total + '</small>' : '') +
          '</div>';
      } else {
        metricBox = '<div class="card-metric"><b class="muted">—</b><small>' + esc(meta.fullLabel || '') + '</small></div>';
      }
    }

    // Các điểm test tiêu biểu của máy
    const benchPills = [];
    l.charts.filter((ch) => !ch.ref || !l.measured).slice(0, 3).forEach((ch) => {
      const hl = ch.items.find((i) => i.highlight);
      if (hl && hl.values[0] != null) {
        const valStr = U.fmtNumber(hl.values[0], ch.decimals) + (ch.unit ? ' ' + ch.unit : '');
        benchPills.push('<span class="bench-pill">' + esc(ch.title) + ': <b>' + esc(valStr) + '</b></span>');
      }
    });

    return (
      '<div class="card-cell">' +
      '<a class="card" href="#/may/' + encodeURIComponent(l.id) + '">' +
      thumb(l, 'card-thumb') +
      '<div class="card-body">' +
      '<div class="card-title">' + esc(l.name) + '</div>' +
      '<div class="card-spec">' +
      (r.cpu ? '<div><span>CPU</span> ' + esc(r.cpu) + '</div>' : '') +
      (r.gpu ? '<div><span>GPU</span> ' + esc(r.gpu) + '</div>' : '') +
      '</div>' +
      (tags.length ? '<div class="card-tags">' + tags.join('') + '</div>' : '') +
      (benchPills.length ? '<div class="card-benchs">' + benchPills.join('') + '</div>' : '') +
      '</div>' +
      metricBox +
      '</a>' +
      '<div class="card-foot">' + cmpButton(l.id, 'cmp-toggle') + '</div>' +
      '</div>'
    );
  }

  /* ---------- Render Trang chủ ---------- */

  function renderHome() {
    document.title = LAB.CONFIG.siteName + ' – Tra cứu kết quả test laptop';

    // Xây dựng danh sách sắp xếp
    const baseSorts = [
      { id: 'newest', label: 'Mới test nhất' },
      { id: 'name', label: 'Tên A → Z' },
      { id: 'tests', label: 'Nhiều bài test nhất' },
    ];
    const metricSorts = DB.sorts || [];
    const sortOptions = baseSorts
      .concat(metricSorts)
      .map((s) => '<option value="' + esc(s.id) + '"' + (s.id === state.sort ? ' selected' : '') + '>' + esc(s.label) + '</option>')
      .join('');

    // Thanh lọc danh mục
    const cats = [
      { id: 'all', label: 'Tất cả máy (' + DB.laptops.length + ')' },
      { id: 'cpu', label: 'Hiệu năng CPU' },
      { id: 'gpu', label: 'Đồ hoạ' },
      { id: 'games', label: 'Game FPS' },
      { id: 'ai', label: 'AI cục bộ' },
      { id: 'system', label: 'Tổng thể & pin' },
    ].filter((c) => c.id === 'all' || DB.laptops.some((l) => l.charts.some((ch) => ch.category === c.id)));
    const catChips = cats
      .map(
        (c) =>
          '<button type="button" class="chip' +
          (state.category === c.id ? ' active' : '') +
          '" data-cat="' +
          esc(c.id) +
          '">' +
          esc(c.label) +
          '</button>'
      )
      .join('');

    // Dòng nguồn & lưu ý dữ liệu: chỉ hiện cho người quản lý khi mở với ?debug=1 (vd #/?debug=1)
    const debug = parseHash().params.get('debug') === '1';
    const syncStatus = debug
      ? '<div class="sync-bar">' +
        '<div class="sync-info">' +
        '<span class="sync-dot' + (DB.index.stale ? ' warn' : '') + '"></span>' +
        '<span>Nguồn: <b><a href="https://github.com/' + esc(DB.repo) + '/blob/' + esc(DB.branch) + '/' + esc(DB.khoPath) + '" target="_blank" rel="noopener">' + esc(DB.repo) + ' · ' + esc(DB.khoPath) + '</a></b>' +
        (DB.index.stale ? ' (bản đệm' + (DB.index.error ? ': ' + esc(DB.index.error) : '') + ')' : '') +
        '</span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
        (DB.issues && DB.issues.length ? '<button type="button" class="sync-btn" id="toggleIssues" style="color:#f59e0b;">' + DB.issues.length + ' lưu ý dữ liệu</button>' : '') +
        '<button type="button" class="sync-btn" id="refreshBtn">Tải lại dữ liệu</button>' +
        '</div>' +
        '</div>'
      : '';

    // Hộp cảnh báo dữ liệu nếu reviewer muốn xem
    let issuesBox = '';
    if (debug && DB.issues && DB.issues.length && state.showIssues) {
      const issueItems = DB.issues
        .map(
          (it) =>
            '<li><b>[' + esc(it.level.toUpperCase()) + ']</b> ' +
            (it.path ? '<code>' + esc(it.path) + '</code>: ' : '') +
            esc(it.msg) +
            '</li>'
        )
        .join('');
      issuesBox =
        '<div class="issues-box">' +
        '<div class="issues-head"><span>Danh sách phát hiện khi đọc kho.json (' + DB.issues.length + ' mục):</span></div>' +
        '<ul class="issues-body" style="padding-left:18px;margin-bottom:0;">' +
        issueItems +
        '</ul></div>';
    }

    app.innerHTML =
      syncStatus +
      issuesBox +
      '<section class="hero">' +
      '<h1>Tra cứu kết quả test laptop</h1>' +
      '<p>Điểm CPU, đồ hoạ, game và pin do Tinh tế tự đo trên các máy đã review, so sánh trực tiếp với nhau.</p>' +
      '<label class="search">' +
      '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input id="q" type="search" autocomplete="off" placeholder="Tìm máy, hãng, CPU, GPU… (vd: zenbook, rtx 5090)" value="' +
      esc(state.q) +
      '">' +
      '</label>' +
      '</section>' +
      '<div class="filter-chips">' + catChips + '</div>' +
      '<div class="toolbar">' +
      '<div id="count" class="muted"></div>' +
      '<label class="sort">Sắp xếp <select id="sort">' + sortOptions + '</select></label>' +
      '</div>' +
      '<div id="grid" class="grid"></div>' +
      '<div id="more" class="more"></div>';

    // Gắn sự kiện
    const q = document.getElementById('q');
    const sortSel = document.getElementById('sort');
    let timer;
    q.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.q = q.value.trim();
        state.shown = LAB.CONFIG.pageSize || 24;
        history.replaceState(null, '', homeHash());
        updateResults();
      }, 120);
    });

    sortSel.addEventListener('change', () => {
      state.sort = sortSel.value;
      history.replaceState(null, '', homeHash());
      updateResults();
    });

    app.querySelectorAll('.filter-chips .chip').forEach((btn) => {
      btn.onclick = () => {
        state.category = btn.dataset.cat;
        state.shown = LAB.CONFIG.pageSize || 24;
        history.replaceState(null, '', homeHash());
        renderHome();
      };
    });

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        refreshBtn.textContent = 'Đang tải…';
        LAB.clearIndexCache();
        location.reload();
      };
    }

    const toggleIssues = document.getElementById('toggleIssues');
    if (toggleIssues) {
      toggleIssues.onclick = () => {
        state.showIssues = !state.showIssues;
        renderHome();
      };
    }

    if (!state.q && window.matchMedia('(min-width: 768px)').matches) q.focus();
    updateResults();
  }

  function updateResults() {
    const list = filterAndSort();
    const metricKey = state.sort.startsWith('m:') ? state.sort.slice(2) : null;
    const grid = document.getElementById('grid');
    const more = document.getElementById('more');
    const count = document.getElementById('count');

    count.textContent = state.q
      ? 'Tìm thấy ' + list.length + ' máy cho “' + state.q + '”'
      : list.length + ' máy đã test';

    if (!list.length) {
      grid.innerHTML = '<div class="empty">Không tìm thấy máy nào phù hợp với bộ lọc hiện tại. Thử đổi từ khoá hoặc chọn tab "Tất cả máy".</div>';
      more.innerHTML = '';
      return;
    }

    grid.innerHTML = list.slice(0, state.shown).map((l) => card(l, metricKey)).join('');
    grid.querySelectorAll('.cmp-toggle').forEach((b) => { b.onclick = () => toggleCompare(b.dataset.cmp); });
    if (list.length > state.shown) {
      more.innerHTML = '<button class="btn" id="moreBtn">Xem thêm (' + (list.length - state.shown) + ' máy)</button>';
      document.getElementById('moreBtn').onclick = () => {
        state.shown += LAB.CONFIG.pageSize || 24;
        updateResults();
      };
    } else {
      more.innerHTML = '';
    }
  }

  /* ---------- Render Biểu đồ Benchmark chi tiết ---------- */

  function renderChartCard(ch, opts) {
    opts = opts || {};
    const ci = RENDERED.push(ch) - 1;
    const isMultiSeries = ch.series && ch.series.length > 1;

    // Tìm giá trị max để tính % thanh dài nhất
    const allVals = [];
    ch.items.forEach((it) => it.values.forEach((v) => { if (v != null) allVals.push(v); }));
    const maxVal = allVals.length ? Math.max(...allVals) : 1;
    const minVal = allVals.length ? Math.min(...allVals) : 0;

    // Chú thích series nếu có nhiều series (vd: Single-core & Multi-core)
    let legend = '';
    if (isMultiSeries) {
      const itemsHtml = ch.series
        .map((s, idx) => {
          const color = SERIES_COLORS[idx % SERIES_COLORS.length];
          return '<span class="chart-legend-item"><span class="chart-legend-dot" style="background:' + color + '"></span>' + esc(s.label) + '</span>';
        })
        .join('');
      legend = '<div class="chart-legend">' + itemsHtml + '</div>';
    }

    // Thứ hạng của máy này trong số các máy Tinh tế tự đo cùng bài test
    let rankBadge = '';
    if (ch.rank && ch.rank.total > 1) {
      rankBadge = '<span class="chart-badge" style="color:var(--good);border-color:color-mix(in srgb, var(--good) 40%, var(--line));">Hạng #' + ch.rank.rank + ' / ' + ch.rank.total + ' máy Tinh tế đo</span>';
    }
    if (ch.ref) rankBadge = '<span class="chart-badge">Số tham khảo</span>';
    if (opts.compare) rankBadge = '';

    // Chỉ hiện các máy quanh máy đang xem, phần còn lại ẩn sau nút "Xem tất cả"
    const hlIdx = ch.items.findIndex((i) => i.highlight);
    const WINDOW = opts.compare ? 99 : 3;
    let lo = Math.max(0, hlIdx - WINDOW);
    let hi = Math.min(ch.items.length, lo + WINDOW * 2 + 1);
    lo = Math.max(0, hi - (WINDOW * 2 + 1));
    const hiddenCount = ch.items.length - (hi - lo);

    // Danh sách các máy so sánh trong bài test
    const itemsHtml = ch.items
      .map((it, idx) => {
        const isHl = it.highlight;
        const seriesRows = ch.series
          .map((s, sIdx) => {
            const v = it.values[sIdx];
            if (v == null) return '';
            let pct;
            if (ch.lowerBetter) {
              pct = v > 0 && minVal > 0 ? (minVal / v) * 100 : 100;
            } else {
              pct = maxVal > 0 ? (v / maxVal) * 100 : 0;
            }
            pct = Math.max(4, Math.min(100, pct));
            const barColor = isMultiSeries ? SERIES_COLORS[sIdx % SERIES_COLORS.length] : isHl ? 'var(--accent)' : 'var(--muted)';

            return (
              '<div class="chart-bar-line" title="' + esc(s.label) + '">' +
              '<div class="chart-track">' +
              '<div class="chart-fill" style="width:' + pct.toFixed(1) + '%;background:' + barColor + ';"></div>' +
              '</div>' +
              '<div class="chart-val">' + esc(U.fmtNumber(v, ch.decimals)) + '</div>' +
              '</div>'
            );
          })
          .join('');

        const nameHtml = it.id && (!isHl || opts.compare) ? '<a href="#/may/' + encodeURIComponent(it.id) + '">' + esc(it.name) + '</a>' : esc(it.name);
        const extra = idx < lo || idx >= hi;
        return (
          '<div class="chart-item' + (isHl ? ' chart-item-hl' : '') + (extra ? ' chart-item-extra' : '') + '" data-ii="' + idx + '"' + (extra ? ' hidden' : '') + '>' +
          '<div class="chart-item-head">' +
          '<span class="chart-item-name">' +
          nameHtml +
          (isHl ? ' <span class="hl-tag">' + (opts.compare ? 'Tốt nhất' : 'Máy đang xem') + '</span>' : '') +
          (it.ref && (!isHl || opts.compare) ? ' <span class="ref-tag">tham khảo</span>' : '') +
          (it.diff ? ' <span class="diff-tag">' + esc(it.diff) + '</span>' : '') +
          '</span>' +
          (it.sub ? '<span class="chart-item-sub">' + esc(it.sub) + '</span>' : '') +
          '</div>' +
          '<div class="chart-series-list">' + seriesRows + '</div>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="chart-card" data-ci="' + ci + '"' + (opts.hidden ? ' hidden' : '') + '>' +
      '<div class="chart-head">' +
      '<div class="chart-title-wrap">' +
      '<h3 class="chart-title">' +
      esc(ch.title) +
      (ch.unit ? '<span class="chart-badge">' + esc(ch.unit) + '</span>' : '') +
      rankBadge +
      '</h3>' +
      (ch.subtitle ? '<div class="chart-sub">' + esc(ch.subtitle) + '</div>' : '') +
      '</div>' +
      '<button type="button" class="chart-dl" title="Tải biểu đồ này về dạng ảnh PNG">' +
      '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M10 3v10m0 0-4-4m4 4 4-4M3 15v2h14v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span>Tải ảnh</span></button>' +
      '</div>' +
      legend +
      '<div class="chart-list">' + itemsHtml + '</div>' +
      (hiddenCount > 0 ? '<button type="button" class="btn chart-more">Xem tất cả ' + ch.items.length + ' máy</button>' : '') +
      (opts.missing && opts.missing.length ? '<div class="chart-missing">Chưa có số: ' + opts.missing.map(esc).join(', ') + '</div>' : '') +
      '</div>'
    );
  }

  /* Gộp các bài cùng họ (Cinebench, Geekbench, 3DMark…) thành một khung có tab */
  function renderChartBlocks(charts, opts) {
    const done = {};
    const out = [];
    charts.forEach((ch) => {
      if (done[ch.testKey]) return;
      const fam = familyOf(ch.testKey);
      const members = fam
        ? charts.filter((c) => fam.tests.indexOf(c.testKey) >= 0).sort((a, b) => fam.tests.indexOf(a.testKey) - fam.tests.indexOf(b.testKey))
        : [ch];
      // Một máy có cả bài đo và bài tham khảo cùng tên thì vẫn tách riêng
      if (members.length < 2 || new Set(members.map((c) => c.testKey)).size !== members.length) {
        out.push(renderChartCard(ch, Object.assign({}, opts, { missing: opts && opts.missingOf ? opts.missingOf(ch) : opts && opts.missing })));
        return;
      }
      members.forEach((c) => { done[c.testKey] = true; });
      const tabs = members
        .map((c, i) => '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-tab="' + i + '">' + esc(c.title.replace(fam.label, '').trim() || c.title) + '</button>')
        .join('');
      out.push(
        '<div class="chart-group">' +
        '<div class="chart-tabs" role="tablist" aria-label="' + esc(fam.label) + '"><span class="chart-tabs-label">' + esc(fam.label) + '</span>' + tabs + '</div>' +
        members.map((c, i) => renderChartCard(c, Object.assign({}, opts, { hidden: i > 0, missing: opts && opts.missingOf ? opts.missingOf(c) : null }))).join('') +
        '</div>'
      );
    });
    return out.join('');
  }

  /* ---------- Chọn máy để so sánh ---------- */

  // Tên kèm cấu hình khi có nhiều máy trùng tên (vd ba bản Acer Nitro ProPanel)
  function dispName(l) {
    return l.variant ? l.name + ' (' + l.variant + ')' : l.name;
  }

  function cmpButton(id, cls) {
    const on = state.compare.indexOf(id) >= 0;
    return '<button type="button" class="' + cls + (on ? ' on' : '') + '" data-cmp="' + esc(id) + '" aria-pressed="' + on + '">' + (on ? '✓ Đã chọn so sánh' : '+ So sánh') + '</button>';
  }

  function toggleCompare(id) {
    const i = state.compare.indexOf(id);
    if (i >= 0) state.compare.splice(i, 1);
    else if (state.compare.length >= CMP_MAX) {
      flashTray('Chỉ so sánh tối đa ' + CMP_MAX + ' máy một lúc. Bỏ bớt một máy trước nhé.');
      return;
    } else state.compare.push(id);
    document.querySelectorAll('[data-cmp="' + CSS.escape(id) + '"]').forEach((b) => {
      const on = state.compare.indexOf(id) >= 0;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      b.textContent = on ? '✓ Đã chọn so sánh' : '+ So sánh';
    });
    renderTray();
  }

  function compareHash(ids) {
    return '#/so-sanh?m=' + ids.map(encodeURIComponent).join(',');
  }

  let trayMsgTimer;
  function flashTray(msg) {
    renderTray(true);
    const m = document.querySelector('#cmpTray .tray-msg');
    if (!m) return;
    m.textContent = msg;
    clearTimeout(trayMsgTimer);
    trayMsgTimer = setTimeout(() => { m.textContent = ''; }, 3500);
  }

  function renderTray(force) {
    let tray = document.getElementById('cmpTray');
    if (!tray) {
      tray = document.createElement('div');
      tray.id = 'cmpTray';
      tray.className = 'cmp-tray';
      document.body.appendChild(tray);
    }
    const onCompare = parseHash().parts[0] === 'so-sanh';
    const n = state.compare.length;
    const show = (n > 0 || force) && !onCompare;
    tray.hidden = !show;
    document.body.classList.toggle('has-tray', show);
    const nav = document.getElementById('navCompare');
    if (nav) nav.textContent = n ? 'So sánh (' + n + ')' : 'So sánh';
    if (!show) return;
    const chips = state.compare
      .map((id) => {
        const l = DB.byId[id];
        return '<span class="tray-chip"><span>' + esc(l ? dispName(l) : id) + '</span><button type="button" data-cmp="' + esc(id) + '" aria-label="Bỏ máy này">×</button></span>';
      })
      .join('');
    tray.innerHTML =
      '<div class="container tray-inner">' +
      '<div class="tray-chips">' + (chips || '<span class="muted">Chưa chọn máy nào</span>') + '<span class="tray-msg" role="status"></span></div>' +
      '<div class="tray-actions">' +
      (n ? '<button type="button" class="btn tray-clear">Bỏ chọn</button>' : '') +
      (n >= 2
        ? '<a class="btn btn-primary" href="' + compareHash(state.compare) + '">So sánh ' + n + ' máy →</a>'
        : '<span class="tray-hint">Chọn thêm ít nhất 1 máy</span>') +
      '</div>' +
      '</div>';
    tray.querySelectorAll('[data-cmp]').forEach((b) => { b.onclick = () => toggleCompare(b.dataset.cmp); });
    const clr = tray.querySelector('.tray-clear');
    if (clr) clr.onclick = () => {
      const ids = state.compare.slice();
      state.compare = [];
      ids.forEach((id) => document.querySelectorAll('[data-cmp="' + CSS.escape(id) + '"]').forEach((b) => {
        b.classList.remove('on'); b.setAttribute('aria-pressed', false); b.textContent = '+ So sánh';
      }));
      renderTray();
    };
  }

  /* ---------- Trang so sánh nhiều máy ---------- */

  function renderCompare() {
    RENDERED = [];
    const list = state.compare.map((id) => DB.byId[id]).filter(Boolean);
    document.title = 'So sánh laptop – ' + LAB.CONFIG.siteName;
    if (list.length < 2) {
      app.innerHTML =
        '<a class="back" href="' + homeHash() + '">← Tất cả máy</a>' +
        '<div class="empty"><b>Chọn ít nhất 2 máy để so sánh.</b><br>Ở danh sách máy, bấm “+ So sánh” dưới mỗi máy (tối đa ' + CMP_MAX + ' máy), rồi bấm “So sánh” ở thanh dưới màn hình.' +
        (list.length ? '<br><br>Đang chọn: <b>' + esc(dispName(list[0])) + '</b>' : '') +
        '<br><br><a class="btn btn-primary" href="' + homeHash() + '">Chọn máy</a></div>';
      window.scrollTo(0, 0);
      return;
    }
    document.title = list.map((l) => l.name).join(' vs ') + ' – ' + LAB.CONFIG.siteName;

    // Đầu trang: mỗi máy một cột
    const heads = list
      .map(
        (l) =>
          '<div class="cmp-head">' +
          thumb(l, 'card-thumb') +
          '<a class="cmp-name" href="#/may/' + encodeURIComponent(l.id) + '">' + esc(l.name) + '</a>' +
          '<div class="cmp-chip">' + esc([l.raw.cpu, l.raw.gpu].filter(Boolean).join(' · ')) + '</div>' +
          (l.measured ? '' : '<span class="tag tag-muted">Số tham khảo</span>') +
          '<button type="button" class="cmp-remove" data-remove="' + esc(l.id) + '">Bỏ khỏi so sánh</button>' +
          '</div>'
      )
      .join('');

    // Bảng thông số: chỉ các dòng có ít nhất một máy có số
    const metrics = LAB.SPECS.map((m) => ({ m, group: 'Cấu hình' })).concat(
      ...LAB.STATIC_SECTIONS.map((sec) => [].concat(...sec.groups.map((g) => g.metrics.map((m) => ({ m, group: sec.title })))))
    );
    let lastGroup = '';
    const cols = list.length;
    const rows = metrics
      .map(({ m, group }) => {
        const vals = list.map((l) => l.raw[m.key]);
        if (!vals.some(Boolean)) return '';
        // Đánh dấu máy tốt nhất cho các dòng có số và có xếp hạng
        let best = null;
        if (!m.noRank && m.type !== 'text') {
          const nums = list.map((l) => l.v[m.key]).filter((x) => x != null);
          if (nums.length >= 2) best = m.lowerBetter ? Math.min(...nums) : Math.max(...nums);
        }
        const groupRow = group !== lastGroup ? '<tr class="cmp-group"><th colspan="' + (cols + 1) + '">' + esc(group) + '</th></tr>' : '';
        lastGroup = group;
        return (
          groupRow +
          '<tr><th scope="row">' + esc(m.label) + '</th>' +
          list
            .map((l, i) => {
              const v = vals[i];
              const isBest = best != null && l.v[m.key] === best;
              return '<td' + (isBest ? ' class="best"' : '') + '>' + (v ? esc(v) + (m.unit ? ' <small>' + esc(m.unit) + '</small>' : '') : '<span class="muted">—</span>') + '</td>';
            })
            .join('') +
          '</tr>'
        );
      })
      .join('');

    // Biểu đồ: mỗi bài test mà ít nhất một máy có số
    const byTest = {};
    list.forEach((l) => {
      l.charts.forEach((ch) => {
        if (byTest[ch.testKey] && !byTest[ch.testKey].ref) return;
        byTest[ch.testKey] = byTest[ch.testKey] || ch;
      });
    });
    const missingMap = {};
    const charts = Object.keys(byTest).map((tid) => {
      const base = byTest[tid];
      const mainIdx = base.series.length - 1;
      const items = [];
      const missing = [];
      list.forEach((l) => {
        const own = l.charts.find((c) => c.testKey === tid && !c.ref) || l.charts.find((c) => c.testKey === tid);
        if (!own) { missing.push(dispName(l)); return; }
        const hl = own.items.find((i) => i.highlight);
        const sub = base.category === 'gpu' || base.category === 'games' ? l.raw.gpu : base.category === 'cpu' ? l.raw.cpu : '';
        items.push({ name: l.name, sub, values: hl.values, highlight: false, ref: own.ref, id: l.id });
      });
      items.sort((a, b) => (base.lowerBetter ? a.values[mainIdx] - b.values[mainIdx] : b.values[mainIdx] - a.values[mainIdx]));
      // Máy tốt nhất (chỉ xét máy Tinh tế đo) và chênh lệch % của các máy còn lại
      const measured = items.filter((it) => !it.ref && it.values[mainIdx] != null);
      if (items.length >= 2 && measured.length) {
        const best = measured[0];
        best.highlight = true;
        const bv = best.values[mainIdx];
        items.forEach((it) => {
          const v = it.values[mainIdx];
          if (it === best || v == null || !bv) return;
          const pct = base.lowerBetter ? (bv / v - 1) * 100 : (v / bv - 1) * 100;
          it.diff = (pct > 0 ? '+' : '−') + Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0) + '%';
        });
      }
      missingMap[tid] = missing;
      return {
        testKey: tid, title: base.title, subtitle: base.subtitle, unit: base.unit, lowerBetter: base.lowerBetter,
        category: base.category, series: base.series, items, rank: null, ref: false, decimals: null,
      };
    });

    const sections = [];
    const toc = ['<button type="button" data-target="sec-specs">Thông số</button>'];
    const catTitles = { cpu: 'Hiệu năng CPU', gpu: 'Hiệu năng đồ hoạ', games: 'Chơi game thực tế', ai: 'AI chạy cục bộ', system: 'Hiệu năng tổng thể & pin', other: 'Bài test khác' };
    LAB.SECTION_ORDER.forEach((cat) => {
      const cs = charts
        .filter((c) => (catTitles[c.category] ? c.category : 'other') === cat)
        .sort((a, b) => b.items.length - a.items.length || a.title.localeCompare(b.title, 'vi'));
      if (!cs.length) return;
      toc.push('<button type="button" data-target="sec-' + cat + '">' + esc(catTitles[cat]) + ' (' + cs.length + ')</button>');
      sections.push(
        '<section class="panel" id="sec-' + cat + '"><h2>' + esc(catTitles[cat]) + '</h2>' +
        cs.map((c) => (familyOf(c.testKey) ? '' : renderChartCard(c, { compare: true, missing: missingMap[c.testKey] }))).join('') +
        renderChartBlocks(cs.filter((c) => familyOf(c.testKey)), { compare: true, missingOf: (c) => missingMap[c.testKey] }) +
        '</section>'
      );
    });

    app.innerHTML =
      '<a class="back" href="' + homeHash() + '">← Tất cả máy</a>' +
      '<section class="cmp-top"><h1>So sánh ' + list.length + ' máy</h1>' +
      '<div class="actions"><button class="btn" type="button" id="copyLink">🔗 Sao chép link so sánh</button>' +
      (list.length < CMP_MAX ? '<a class="btn" href="' + homeHash() + '">+ Thêm máy</a>' : '') +
      '</div></section>' +
      '<div class="cmp-heads" style="--cols:' + cols + '">' + heads + '</div>' +
      '<nav class="toc">' + toc.join('') + '</nav>' +
      '<section class="panel" id="sec-specs"><h2>Thông số</h2><div class="cmp-table-wrap"><table class="cmp-table" style="--cols:' + cols + '">' +
      '<thead><tr><th></th>' + list.map((l) => '<th scope="col">' + esc(dispName(l)) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></section>' +
      sections.join('') +
      '<p class="legend muted">Dòng “Tốt nhất” là máy Tinh tế đo có kết quả cao nhất trong nhóm đang so sánh; con số % là chênh lệch so với máy đó. Số “tham khảo” lấy từ nguồn ngoài, không dùng để chọn máy tốt nhất.</p>';

    app.querySelectorAll('[data-remove]').forEach((b) => {
      b.onclick = () => {
        state.compare = state.compare.filter((id) => id !== b.dataset.remove);
        history.replaceState(null, '', compareHash(state.compare));
        renderCompare();
        renderTray();
      };
    });
    bindDetailCommon();
    window.scrollTo(0, 0);
  }

  /* ---------- Render Trang Chi Tiết ---------- */

  function renderDetail(id) {
    RENDERED = [];
    const l = DB.byId[id];
    if (!l) {
      document.title = 'Không tìm thấy máy – ' + LAB.CONFIG.siteName;
      app.innerHTML =
        '<a class="back" href="' + homeHash() + '">← Tất cả máy</a>' +
        '<div class="empty">Không tìm thấy máy <b>' + esc(id) + '</b>. Có thể máy đã được đổi tên trong kho dữ liệu.</div>';
      return;
    }

    const r = l.raw;
    document.title = l.name + ' – Kết quả test | ' + LAB.CONFIG.siteName;

    const sub = [l.brand, l.dateLabel ? 'Test ' + l.dateLabel : '', l.variant, l.measured ? '' : 'Số tham khảo, không do Tinh tế tự đo'].filter(Boolean).join(' · ');
    const info = [
      l.model ? 'Model: <b>' + esc(l.model) + '</b>' : '',
      l.tester ? 'Người test: <b>' + esc(l.tester) + '</b>' : '',
      l.dateLabel ? 'Thời gian test: <b>' + esc(l.dateLabel) + '</b>' : '',
    ].filter(Boolean);

    // Cấu hình máy test
    const specs = LAB.SPECS.map((m) => {
      const rawVal = r[m.key];
      if (!rawVal) return '';
      return (
        '<div class="spec">' +
        '<div class="spec-label">' + esc(m.label) + '</div>' +
        '<div class="spec-value">' + esc(rawVal) + (m.unit ? ' <small>' + esc(m.unit) + '</small>' : '') + '</div>' +
        '</div>'
      );
    }).join('');

    // Phân nhóm các bài test theo Category
    const catMap = {
      cpu: { title: 'Hiệu năng CPU', charts: [] },
      gpu: { title: 'Hiệu năng đồ hoạ', charts: [] },
      games: { title: 'Chơi game thực tế', charts: [] },
      ai: { title: 'AI chạy cục bộ', charts: [] },
      system: { title: 'Hiệu năng tổng thể & pin', charts: [] },
      other: { title: 'Bài test khác', charts: [] },
    };

    l.charts.forEach((ch) => {
      const c = catMap[ch.category] || catMap.other;
      c.charts.push(ch);
    });

    // Tạo các Section biểu đồ
    const sectionHtmls = [];
    const tocButtons = [];

    LAB.SECTION_ORDER.forEach((catId) => {
      const group = catMap[catId];
      if (!group || !group.charts.length) return;
      const secId = 'sec-' + catId;
      tocButtons.push('<button type="button" data-target="' + secId + '">' + esc(group.title) + ' (' + group.charts.length + ')</button>');
      const chartsHtml = renderChartBlocks(group.charts);
      sectionHtmls.push(
        '<section class="panel" id="' + secId + '">' +
        '<h2>' + esc(group.title) + '</h2>' +
        chartsHtml +
        '</section>'
      );
    });

    // Màn hình & Pin (nếu có thông tin trong file meta laptops/*.json)
    const staticSecs = LAB.STATIC_SECTIONS.map((sec) => {
      const groupsHtml = sec.groups
        .map((g) => {
          const rows = g.metrics
            .map((m) => {
              const val = r[m.key];
              if (!val) return '';
              const n = l.v[m.key];
              const rk = n != null && !m.noRank ? LAB.rankOf(DB, m.key, n) : null;
              const showBar = rk && rk.total > 1;
              return (
                '<div class="metric' + (showBar ? '' : ' metric-plain') + '">' +
                '<div class="metric-label">' + esc(m.label) + '</div>' +
                '<div class="metric-value">' + esc(val) + (m.unit ? ' <small>' + esc(m.unit) + '</small>' : '') + '</div>' +
                (showBar
                  ? '<div class="metric-bar"><span style="width:' + rk.pct.toFixed(1) + '%"></span></div>' +
                    '<div class="metric-rank">#' + rk.rank + '<small>/' + rk.total + '</small></div>'
                  : '') +
                '</div>'
              );
            })
            .join('');
          return rows ? '<div class="group"><h3>' + esc(g.title) + '</h3><div class="metrics">' + rows + '</div></div>' : '';
        })
        .join('');
      if (!groupsHtml) return null;
      tocButtons.push('<button type="button" data-target="sec-' + sec.id + '">' + esc(sec.title) + '</button>');
      return '<section class="panel" id="sec-' + sec.id + '"><h2>' + esc(sec.title) + '</h2>' + groupsHtml + '</section>';
    }).filter(Boolean);

    app.innerHTML =
      '<a class="back" href="' + homeHash() + '">← Tất cả máy</a>' +
      '<section class="detail-hero">' +
      thumb(l, 'detail-thumb') +
      '<div class="detail-head">' +
      (sub ? '<div class="eyebrow">' + esc(sub) + '</div>' : '') +
      '<h1>' + esc(l.name) + '</h1>' +
      (info.length ? '<div class="detail-info">' + info.join('<span class="dot">•</span>') + '</div>' : '') +
      '<div class="actions">' +
      (l.review ? '<a class="btn" href="' + esc(l.review) + '" target="_blank" rel="noopener">📝 Bài review Tinh tế ↗</a>' : '') +
      cmpButton(l.id, 'btn cmp-btn') +
      '<button class="btn" type="button" id="copyLink">🔗 Sao chép link máy này</button>' +
      '</div>' +
      '</div>' +
      '</section>' +
      (tocButtons.length ? '<nav class="toc">' + tocButtons.join('') + '</nav>' : '') +
      (specs ? '<section class="panel"><h2>Cấu hình</h2><div class="specs">' + specs + '</div></section>' : '') +
      (sectionHtmls.length ? sectionHtmls.join('') : '<div class="empty">Chưa tìm thấy biểu đồ benchmark nào cho máy này.</div>') +
      (staticSecs.length ? staticSecs.join('') : '') +
      (l.notes ? '<section class="panel"><h2>Ghi chú đánh giá</h2><p class="notes">' + esc(l.notes).replace(/\n/g, '<br>') + '</p></section>' : '') +
      '<p class="legend muted">Mỗi biểu đồ so sánh máy đang xem với các máy cùng loại có cùng bài test. Dòng ghi “tham khảo” là số liệu lấy từ nguồn ngoài, không do Tinh tế tự đo, và không tính vào thứ hạng.</p>';

    app.querySelectorAll('.cmp-btn').forEach((b) => { b.onclick = () => toggleCompare(b.dataset.cmp); });
    bindDetailCommon();
    window.scrollTo(0, 0);
  }

  /* Sự kiện dùng chung cho trang máy và trang so sánh */
  function bindDetailCommon() {
    app.querySelectorAll('.chart-more').forEach((b) => {
      b.onclick = () => {
        b.parentElement.querySelectorAll('.chart-item-extra').forEach((el) => { el.hidden = false; });
        b.remove();
      };
    });

    // Tab trong khung bài cùng họ
    app.querySelectorAll('.chart-group').forEach((g) => {
      const tabs = g.querySelectorAll('.chart-tabs [data-tab]');
      const cards = g.querySelectorAll(':scope > .chart-card');
      tabs.forEach((t) => {
        t.onclick = () => {
          tabs.forEach((x) => x.setAttribute('aria-selected', x === t));
          cards.forEach((c, i) => { c.hidden = String(i) !== t.dataset.tab; });
        };
      });
    });

    // Tải ảnh PNG của biểu đồ: lấy đúng các dòng đang hiện
    app.querySelectorAll('.chart-dl').forEach((b) => {
      b.onclick = () => {
        const cardEl = b.closest('.chart-card');
        const ch = RENDERED[+cardEl.dataset.ci];
        const visible = Array.from(cardEl.querySelectorAll('.chart-item:not([hidden])')).map((el) => ch.items[+el.dataset.ii]);
        const label = b.querySelector('span');
        label.textContent = 'Đang tạo…';
        const footer = DB.index.commitDate ? 'Dữ liệu cập nhật ' + U.fmtDate(U.parseDate(DB.index.commitDate)) : '';
        LAB.exportChartPNG(ch, visible, { footer, filename: 'tinhte-' + U.slugify(ch.title) })
          .catch((e) => { console.error(e); alert('Không tạo được ảnh: ' + e.message); })
          .finally(() => { label.textContent = 'Tải ảnh'; });
      };
    });

    // Cuộn mượt khi bấm các tab TOC
    app.querySelectorAll('.toc button').forEach((b) => {
      b.onclick = () => {
        const el = document.getElementById(b.dataset.target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });

    // Nút copy link
    const copyBtn = document.getElementById('copyLink');
    if (copyBtn) {
      const idle = copyBtn.textContent;
      copyBtn.onclick = () => {
        const url = location.href;
        const done = () => {
          copyBtn.textContent = 'Đã sao chép link ✓';
          setTimeout(() => (copyBtn.textContent = idle), 1800);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done, () => window.prompt('Sao chép link:', url));
        } else {
          window.prompt('Sao chép link:', url);
        }
      };
    }
  }

  /* ---------- Chuyển giao diện Sáng / Tối ---------- */

  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const KEY = 'tinhte-lab-theme';
    const root = document.documentElement;

    const currentTheme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

    const syncLabel = () => {
      const isLight = currentTheme() === 'light';
      const label = isLight ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    };

    btn.addEventListener('click', () => {
      const next = currentTheme() === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {
        // Bỏ qua khi trình duyệt chặn localStorage
      }
      syncLabel();
    });

    syncLabel();
  }

  /* ---------- Khởi động ứng dụng ---------- */

  initThemeToggle();

  LAB.loadData()
    .then((db) => {
      DB = db;
      const src = document.getElementById('dataSource');
      if (src) src.textContent = DB.laptops.length + ' máy' + (DB.index.commitDate ? ' · Dữ liệu cập nhật ' + U.fmtDate(U.parseDate(DB.index.commitDate)) : '');
      window.addEventListener('hashchange', route);
      route();
    })
    .catch((err) => {
      console.error(err);
      app.innerHTML =
        '<div class="empty"><b>Không tải được kho dữ liệu benchmark.</b><br>' +
        esc(err.message) +
        '<br><br>Kiểm tra kết nối mạng hoặc thử <button class="btn" onclick="location.reload()">Tải lại trang</button></div>';
    });
})();
