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
  };

  const SERIES_COLORS = ['#2f7cf6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  const PLACEHOLDER =
    '<svg class="ph" viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="16" width="40" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M6 48h52" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  function thumb(l, cls) {
    return (
      '<div class="' + cls + '">' + PLACEHOLDER +
      (l.image ? '<img src="' + esc(l.image) + '" alt="' + esc(l.name) + '" loading="lazy" onerror="this.remove()">' : '') +
      '</div>'
    );
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
      return;
    }
    state.q = params.get('q') || '';
    state.sort = params.get('sort') || 'newest';
    state.category = params.get('cat') || 'all';
    state.shown = LAB.CONFIG.pageSize || 24;
    renderHome();
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
    l.charts.slice(0, 3).forEach((ch) => {
      const hl = ch.items.find((i) => i.highlight);
      if (hl && hl.values[0] != null) {
        const valStr = U.fmtNumber(hl.values[0], ch.decimals) + (ch.unit ? ' ' + ch.unit : '');
        benchPills.push('<span class="bench-pill">' + esc(ch.title) + ': <b>' + esc(valStr) + '</b></span>');
      }
    });

    return (
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
      '</a>'
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
      { id: 'gpu', label: 'Đồ hoạ 3DMark' },
      { id: 'games', label: 'Game FPS' },
      { id: 'system', label: 'Tổng thể PCMark' },
    ];
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

    // Trạng thái nguồn dữ liệu GitHub
    const syncStatus =
      '<div class="sync-bar">' +
      '<div class="sync-info">' +
      '<span class="sync-dot' + (DB.index.stale ? ' warn' : '') + '"></span>' +
      '<span>Nguồn: <b><a href="https://github.com/' + esc(DB.repo) + '" target="_blank" rel="noopener">' + esc(DB.repo) + '</a></b>' +
      (DB.index.commitDate ? ' · Cập nhật ' + esc(U.fmtDate(new Date(DB.index.commitDate))) : '') +
      (DB.index.stale ? ' (Bản đệm)' : '') +
      '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;">' +
      (DB.issues && DB.issues.length
        ? '<button type="button" class="sync-btn" id="toggleIssues" style="color:#f59e0b;">' +
          DB.issues.length +
          ' lưu ý dữ liệu</button>'
        : '') +
      '<button type="button" class="sync-btn" id="refreshBtn">🔄 Làm mới dữ liệu</button>' +
      '</div>' +
      '</div>';

    // Hộp cảnh báo dữ liệu nếu reviewer muốn xem
    let issuesBox = '';
    if (DB.issues && DB.issues.length && state.showIssues) {
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
        '<div class="issues-head"><span>Danh sách phát hiện khi đọc repo (' + DB.issues.length + ' mục):</span></div>' +
        '<ul class="issues-body" style="padding-left:18px;margin-bottom:0;">' +
        issueItems +
        '</ul></div>';
    }

    app.innerHTML =
      syncStatus +
      issuesBox +
      '<section class="hero">' +
      '<h1>Tra cứu kết quả test laptop</h1>' +
      '<p>Dữ liệu benchmark CPU, GPU, thời lượng pin và game thực tế từ repository <b>' +
      esc(DB.repo) +
      '</b> của Tinh tế.</p>' +
      '<label class="search">' +
      '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input id="q" type="search" autocomplete="off" placeholder="Tìm tên máy, hãng, CPU, GPU, hoặc bài test… (vd: zephyrus, scar 18, ultra 9)" value="' +
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

  function renderChartCard(ch, l) {
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

    // Thứ hạng của máy này trong toàn lab cho bài test này
    let rankBadge = '';
    const hlItem = ch.items.find((i) => i.highlight);
    if (hlItem) {
      const firstMetricKey = ch.testKey + '.' + ch.series[0].key;
      const rk = LAB.rankOf(DB, firstMetricKey, hlItem.values[0]);
      if (rk && rk.total > 1) {
        rankBadge = '<span class="chart-badge" style="color:var(--good);border-color:color-mix(in srgb, var(--good) 40%, var(--line));">Hạng #' + rk.rank + ' / ' + rk.total + ' máy</span>';
      }
    }

    // Danh sách các máy so sánh trong bài test
    const itemsHtml = ch.items
      .map((it) => {
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
            const seriesLabel = isMultiSeries ? '<small class="muted" style="margin-right:6px;">' + esc(s.label) + '</small>' : '';

            return (
              '<div class="chart-bar-line">' +
              '<div class="chart-track">' +
              '<div class="chart-fill" style="width:' + pct.toFixed(1) + '%;background:' + barColor + ';"></div>' +
              '</div>' +
              '<div class="chart-val">' +
              seriesLabel +
              esc(U.fmtNumber(v, ch.decimals)) +
              (ch.unit ? ' <small>' + esc(ch.unit) + '</small>' : '') +
              '</div>' +
              '</div>'
            );
          })
          .join('');

        return (
          '<div class="chart-item' + (isHl ? ' chart-item-hl' : '') + '">' +
          '<div class="chart-item-head">' +
          '<span class="chart-item-name">' +
          esc(it.name) +
          (isHl ? ' <span class="hl-tag">Máy đang xem</span>' : '') +
          '</span>' +
          '</div>' +
          '<div class="chart-series-list">' + seriesRows + '</div>' +
          '</div>'
        );
      })
      .join('');

    const githubFileUrl = 'https://github.com/' + esc(DB.repo) + '/blob/' + esc(DB.branch) + '/' + esc(ch.path);

    return (
      '<div class="chart-card">' +
      '<div class="chart-head">' +
      '<div class="chart-title-wrap">' +
      '<h3 class="chart-title">' +
      esc(ch.title) +
      (ch.unit ? '<span class="chart-badge">' + esc(ch.unit) + '</span>' : '') +
      rankBadge +
      '</h3>' +
      (ch.subtitle ? '<div class="chart-sub">' + esc(ch.subtitle) + '</div>' : '') +
      '</div>' +
      '<div><a class="chart-badge" href="' + esc(githubFileUrl) + '" target="_blank" rel="noopener">📄 ' + esc(ch.file) + ' ↗</a></div>' +
      '</div>' +
      legend +
      '<div class="chart-list">' + itemsHtml + '</div>' +
      '</div>'
    );
  }

  /* ---------- Render Trang Chi Tiết ---------- */

  function renderDetail(id) {
    const l = DB.byId[id];
    if (!l) {
      document.title = 'Không tìm thấy máy – ' + LAB.CONFIG.siteName;
      app.innerHTML =
        '<a class="back" href="' + homeHash() + '">← Tất cả máy</a>' +
        '<div class="empty">Không tìm thấy máy <b>' + esc(id) + '</b> trong dữ liệu của repo.<br>Hãy kiểm tra lại tên thư mục trong <code>data/</code>.</div>';
      return;
    }

    const r = l.raw;
    document.title = l.name + ' – Kết quả test | ' + LAB.CONFIG.siteName;

    const sub = [l.brand, l.dateLabel ? 'Test ' + l.dateLabel : '', l.dir ? 'Thư mục: ' + l.dir : ''].filter(Boolean).join(' · ');
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
      system: { title: 'Hiệu năng tổng thể', charts: [] },
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
      const chartsHtml = group.charts.map((ch) => renderChartCard(ch, l)).join('');
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

    // Đường dẫn thư mục máy trên GitHub
    const githubDirUrl = l.dir
      ? 'https://github.com/' + esc(DB.repo) + '/tree/' + esc(DB.branch) + '/data/' + esc(l.dir)
      : 'https://github.com/' + esc(DB.repo) + '/tree/' + esc(DB.branch) + '/data';

    // Thẻ hướng dẫn bổ sung thông số nếu chưa có file laptops/<id>.json
    let metaNotice = '';
    if (!l.hasMeta) {
      metaNotice =
        '<div class="notice" style="margin-top:20px;">' +
        '💡 <b>Mẹo cho Reviewer Tinh tế:</b> Để bổ sung đầy đủ thông số cấu hình (RAM, SSD, màn hình nits, pin Wh) và link bài review trên Tinh tế cho máy này, ' +
        'bạn chỉ cần tạo file <code>' + esc(l.metaPath) + '</code> trên repo GitHub. ' +
        '<button type="button" class="btn" style="padding:4px 8px;font-size:12px;margin-left:8px;" id="copyMetaTemplate">Sao chép mẫu JSON</button>' +
        '</div>';
    }

    app.innerHTML =
      '<a class="back" href="' + homeHash() + '">← Tất cả máy</a>' +
      '<section class="detail-hero">' +
      thumb(l, 'detail-thumb') +
      '<div class="detail-head">' +
      (sub ? '<div class="eyebrow">' + esc(sub) + '</div>' : '') +
      '<h1>' + esc(l.name) + '</h1>' +
      (info.length ? '<div class="detail-info">' + info.join('<span class="dot">•</span>') + '</div>' : '') +
      '<div class="actions">' +
      '<a class="btn btn-primary" href="' + esc(githubDirUrl) + '" target="_blank" rel="noopener">📂 Thư mục trên GitHub ↗</a>' +
      (l.review ? '<a class="btn" href="' + esc(l.review) + '" target="_blank" rel="noopener">📝 Bài review Tinh tế ↗</a>' : '') +
      '<button class="btn" type="button" id="copyLink">🔗 Sao chép link máy này</button>' +
      '</div>' +
      '</div>' +
      '</section>' +
      (tocButtons.length ? '<nav class="toc">' + tocButtons.join('') + '</nav>' : '') +
      (specs ? '<section class="panel"><h2>Cấu hình nhận diện được</h2><div class="specs">' + specs + '</div></section>' : '') +
      (sectionHtmls.length ? sectionHtmls.join('') : '<div class="empty">Chưa tìm thấy biểu đồ benchmark nào cho máy này.</div>') +
      (staticSecs.length ? staticSecs.join('') : '') +
      metaNotice +
      (l.notes ? '<section class="panel"><h2>Ghi chú đánh giá</h2><p class="notes">' + esc(l.notes).replace(/\n/g, '<br>') + '</p></section>' : '') +
      '<p class="legend muted">Thanh màu so sánh thể hiện tương quan điểm số với các mẫu máy khác trong cùng bài test. Máy được đánh dấu là mẫu máy chính được đánh giá.</p>';

    // Cuộn mượt khi bấm các tab TOC
    app.querySelectorAll('.toc button').forEach((b) => {
      b.onclick = () => {
        const el = document.getElementById(b.dataset.target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });

    // Nút copy link máy
    const copyBtn = document.getElementById('copyLink');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const url = location.href;
        const done = () => {
          copyBtn.textContent = 'Đã sao chép link ✓';
          setTimeout(() => (copyBtn.textContent = '🔗 Sao chép link máy này'), 1800);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done, () => window.prompt('Sao chép link:', url));
        } else {
          window.prompt('Sao chép link:', url);
        }
      };
    }

    // Nút copy template meta JSON
    const copyMetaBtn = document.getElementById('copyMetaTemplate');
    if (copyMetaBtn) {
      copyMetaBtn.onclick = () => {
        const sampleMeta = {
          name: l.name,
          brand: l.brand,
          model: l.model || '',
          cpu: r.cpu || '',
          gpu: r.gpu || '',
          gpu_tgp_w: '',
          ram: '16 GB',
          storage: '1 TB SSD',
          weight_kg: '1.5',
          test_date: l.date ? U.fmtDate(l.date) : '',
          tester: 'Tinh tế',
          review_url: 'https://tinhte.vn/',
          display: {
            size: '16',
            resolution: '2560 x 1600',
            refresh_hz: 120,
            panel: 'IPS',
            brightness: 400,
            srgb: 100,
            dcip3: 98,
            deltae: 1.2,
          },
          battery: {
            wh: 75,
            charger_w: 100,
            office: '8:30',
            video: '10:00',
            gaming: '1:30',
          },
          notes: '',
        };
        const text = JSON.stringify(sampleMeta, null, 2);
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(() => {
            copyMetaBtn.textContent = 'Đã copy mẫu JSON ✓';
            setTimeout(() => (copyMetaBtn.textContent = 'Sao chép mẫu JSON'), 1800);
          });
        } else {
          window.prompt('Copy mẫu JSON:', text);
        }
      };
    }

    window.scrollTo(0, 0);
  }

  /* ---------- Khởi động ứng dụng ---------- */

  LAB.loadData()
    .then((db) => {
      DB = db;
      window.addEventListener('hashchange', route);
      route();
    })
    .catch((err) => {
      console.error(err);
      app.innerHTML =
        '<div class="empty"><b>Không tải được dữ liệu từ GitHub repository.</b><br>' +
        esc(err.message) +
        '<br><br>Kiểm tra kết nối mạng hoặc thử <button class="btn" onclick="location.reload()">Tải lại trang</button></div>';
    });
})();
