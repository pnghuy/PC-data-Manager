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
  const t = LAB.i18n ? LAB.i18n.t : (k) => k;
  const app = document.getElementById('app');

  let DB = null;
  const VIEW_KEY = 'tinhte-lab-view';
  let savedView = 'rank';
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'grid' || v === 'table' || v === 'rank') savedView = v;
  } catch (e) { /* bỏ qua */ }

  const state = {
    q: '',
    sort: 'newest',
    category: 'all',
    brand: 'all',
    view: savedView,
    rankMetric: '',
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
    if (state.brand && state.brand !== 'all') p.set('b', state.brand);
    if (state.view && state.view !== 'rank') p.set('v', state.view);
    if (state.view === 'rank' && state.rankMetric) p.set('rm', state.rankMetric);
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
    state.brand = params.get('b') || 'all';
    const vParam = params.get('v');
    if (vParam === 'grid' || vParam === 'table' || vParam === 'rank') state.view = vParam;
    if (params.get('rm')) state.rankMetric = params.get('rm');
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
      if (state.brand !== 'all' && l.brand !== state.brand) return false;
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
    const meta = [l.brand, t('testsCount', { n: l.testCount }), l.dateLabel].filter(Boolean).map(esc);
    if (!l.measured) meta.push('<span class="ref-tag">' + esc(t('refLabel')) + '</span>');

    // Thẻ xem nhanh kết quả nếu đang sắp xếp theo bài test
    let metricBox = '';
    if (metricKey) {
      const mm = DB.metrics[metricKey] || {};
      const val = l.v[metricKey];
      if (val != null) {
        const rk = LAB.rankOf(DB, metricKey, val);
        metricBox =
          '<div class="card-metric">' +
          '<b>' + esc(U.fmtNumber(val, mm.decimals)) + (mm.unit ? ' <small>' + esc(mm.unit) + '</small>' : '') + '</b>' +
          '<small>' + esc(mm.fullLabel || mm.label || '') + '</small>' +
          (rk ? '<small class="card-rank">#' + rk.rank + '/' + rk.total + '</small>' : '') +
          '</div>';
      } else {
        metricBox = '<div class="card-metric"><b class="muted">—</b><small>' + esc(mm.fullLabel || '') + '</small></div>';
      }
    }

    // Các điểm test tiêu biểu của máy: khi đang lọc theo danh mục, chỉ hiện bài thuộc đúng danh mục đó
    const benchPills = [];
    const ownCharts = l.charts.filter((ch) => !ch.ref || !l.measured);
    let pickedCharts;
    if (state.category !== 'all') {
      const ownInCat = ownCharts.filter((ch) => ch.category === state.category);
      pickedCharts = ownInCat.length ? ownInCat : l.charts.filter((ch) => ch.category === state.category);
    } else {
      pickedCharts = ownCharts;
    }
    pickedCharts.slice(0, 3).forEach((ch) => {
      const hl = ch.items.find((i) => i.highlight);
      const mainIdx = ch.series.length - 1;
      if (hl && hl.values[mainIdx] != null) {
        const valStr = U.fmtNumber(hl.values[mainIdx], ch.decimals) + (ch.unit ? ' ' + ch.unit : '');
        const refSuffix = ch.ref && l.measured ? ' <small>(' + esc(t('refShort')) + ')</small>' : '';
        benchPills.push('<div class="bench-row"><span>' + esc(ch.title) + refSuffix + '</span><b>' + esc(valStr) + '</b></div>');
      }
    });

    return (
      '<div class="card-cell">' +
      '<a class="card" href="#/may/' + encodeURIComponent(l.id) + '">' +
      thumb(l, 'card-thumb') +
      '<div class="card-body">' +
      '<div class="card-title">' + esc(fullName(l)) + '</div>' +
      '<div class="card-spec">' +
      (r.cpu ? '<div><span>CPU</span> ' + esc(r.cpu) + '</div>' : '') +
      (r.gpu ? '<div><span>GPU</span> ' + esc(r.gpu) + '</div>' : '') +
      '</div>' +
      '<div class="card-meta">' + meta.join(' · ') + '</div>' +
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
    document.title = LAB.CONFIG.siteName + ' – ' + t('siteTitle');

    const sortOptions = buildSortOptionsHtml();

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

    // 3 nút icon chuyển chế độ xem (không ghi chữ)
    const viewSwitch =
      '<div class="view-switch" role="group" aria-label="' + esc(t('viewAria')) + '">' +
      '<button type="button" class="vbtn' + (state.view === 'grid' ? ' active' : '') + '" data-view="grid" aria-pressed="' + (state.view === 'grid') + '" aria-label="' + esc(t('viewGrid')) + '" title="' + esc(t('viewGrid')) + '">' +
      '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.2"/><rect x="11" y="3" width="6" height="6" rx="1.2"/><rect x="3" y="11" width="6" height="6" rx="1.2"/><rect x="11" y="11" width="6" height="6" rx="1.2"/></svg>' +
      '</button>' +
      '<button type="button" class="vbtn' + (state.view === 'table' ? ' active' : '') + '" data-view="table" aria-pressed="' + (state.view === 'table') + '" aria-label="' + esc(t('viewTable')) + '" title="' + esc(t('viewTable')) + '">' +
      '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/></svg>' +
      '</button>' +
      '<button type="button" class="vbtn' + (state.view === 'rank' ? ' active' : '') + '" data-view="rank" aria-pressed="' + (state.view === 'rank') + '" aria-label="' + esc(t('viewRank')) + '" title="' + esc(t('viewRank')) + '">' +
      '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="10" width="3.5" height="7" rx="0.8"/><rect x="8.25" y="4" width="3.5" height="13" rx="0.8"/><rect x="13.5" y="7" width="3.5" height="10" rx="0.8"/></svg>' +
      '</button>' +
      '</div>';

    app.innerHTML =
      syncStatus +
      issuesBox +
      '<section class="page-head">' +
      '<div class="page-title"><h1>' + esc(t('heroTitle')) + '</h1>' +
      '<p>' + esc(t('heroDesc')) + '</p></div>' +
      '<label class="search">' +
      '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input id="q" type="search" autocomplete="off" placeholder="' + esc(t('searchPh')) + '" value="' +
      esc(state.q) +
      '">' +
      '</label>' +
      '</section>' +
      '<div class="filter-chips" id="catChips"></div>' +
      '<div class="brand-chips" id="brandChips" aria-label="' + esc(t('filterBrandAria')) + '"></div>' +
      '<div class="toolbar">' +
      '<div id="count" class="muted"></div>' +
      '<div class="toolbar-right">' +
      '<label class="sort" id="sortWrap"' + (state.view === 'rank' ? ' hidden' : '') + '>' + esc(t('sortLabel')) + ' <select id="sort">' + sortOptions + '</select></label>' +
      viewSwitch +
      '</div>' +
      '</div>' +
      '<div id="results"></div>' +
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
        renderFilterChips();
        updateResults();
      }, 120);
    });

    sortSel.addEventListener('change', () => {
      state.sort = sortSel.value;
      history.replaceState(null, '', homeHash());
      updateResults();
    });

    app.querySelectorAll('.view-switch .vbtn').forEach((btn) => {
      btn.onclick = () => {
        state.view = btn.dataset.view;
        try { localStorage.setItem(VIEW_KEY, state.view); } catch (e) { /* bỏ qua */ }
        app.querySelectorAll('.view-switch .vbtn').forEach((b) => {
          const on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on);
        });
        const sw = document.getElementById('sortWrap');
        if (sw) sw.hidden = state.view === 'rank';
        history.replaceState(null, '', homeHash());
        updateResults();
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

    renderFilterChips();
    updateResults();
  }

  // Cập nhật chéo số lượng máy trên thanh Danh mục và thanh Hãng (không giật trang)
  function renderFilterChips() {
    const catEl = document.getElementById('catChips');
    const brandEl = document.getElementById('brandChips');
    if (!catEl || !brandEl) return;

    const tokens = U.normalize(state.q).split(/\s+/).filter(Boolean);
    const textPool = DB.laptops.filter((l) => tokens.every((tk) => l.search.includes(tk)));
    const hasCat = (l, c) => c === 'all' || l.charts.some((ch) => ch.category === c);

    // Nếu hãng đang chọn không còn máy trong danh mục mới thì tự trả về "Tất cả hãng"
    const catPool = textPool.filter((l) => hasCat(l, state.category));
    if (state.brand !== 'all' && !catPool.some((l) => l.brand === state.brand)) {
      state.brand = 'all';
    }
    // Ngược lại, nếu danh mục đang chọn không còn máy trong hãng mới thì trả về "Tất cả máy"
    const brandPool = textPool.filter((l) => state.brand === 'all' || l.brand === state.brand);
    if (state.category !== 'all' && !brandPool.some((l) => hasCat(l, state.category))) {
      state.category = 'all';
    }

    // 1. Thanh Danh mục (đếm theo hãng & từ khoá hiện tại)
    const catsDef = [
      { id: 'all', label: t('catAll', { n: brandPool.length }), plain: true },
      { id: 'cpu', label: t('catCpu') },
      { id: 'gpu', label: t('catGpu') },
      { id: 'games', label: t('catGames') },
      { id: 'ai', label: t('catAi') },
      { id: 'system', label: t('catSystem') },
    ];
    const catHtml = catsDef
      .map((c) => {
        const cnt = c.id === 'all' ? brandPool.length : brandPool.filter((l) => hasCat(l, c.id)).length;
        if (c.id !== 'all' && cnt === 0) return '';
        const text = c.plain ? esc(c.label) : esc(c.label) + ' <span>' + cnt + '</span>';
        return (
          '<button type="button" class="chip' +
          (state.category === c.id ? ' active' : '') +
          '" data-cat="' + esc(c.id) + '" aria-pressed="' + (state.category === c.id) + '">' +
          text + '</button>'
        );
      })
      .join('');
    catEl.innerHTML = catHtml;
    catEl.querySelectorAll('.chip').forEach((btn) => {
      btn.onclick = () => {
        state.category = btn.dataset.cat;
        state.shown = LAB.CONFIG.pageSize || 24;
        renderFilterChips();
        history.replaceState(null, '', homeHash());
        updateResults();
      };
    });

    // 2. Thanh Hãng (đếm theo danh mục & từ khoá hiện tại)
    const activeCatPool = textPool.filter((l) => hasCat(l, state.category));
    const brandCounts = {};
    activeCatPool.forEach((l) => { if (l.brand) brandCounts[l.brand] = (brandCounts[l.brand] || 0) + 1; });
    const brandList = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a] || a.localeCompare(b, 'vi'));

    if (brandList.length < 2) {
      brandEl.hidden = true;
      brandEl.innerHTML = '';
    } else {
      brandEl.hidden = false;
      brandEl.innerHTML =
        '<button type="button" class="bchip' + (state.brand === 'all' ? ' active' : '') + '" data-brand="all">' + esc(t('allBrands')) + '</button>' +
        brandList
          .map(
            (b) =>
              '<button type="button" class="bchip' +
              (state.brand === b ? ' active' : '') +
              '" data-brand="' + esc(b) + '" aria-pressed="' + (state.brand === b) + '">' +
              esc(b) + ' <span>' + brandCounts[b] + '</span></button>'
          )
          .join('');
      brandEl.querySelectorAll('.bchip').forEach((btn) => {
        btn.onclick = () => {
          state.brand = btn.dataset.brand;
          state.shown = LAB.CONFIG.pageSize || 24;
          renderFilterChips();
          history.replaceState(null, '', homeHash());
          updateResults();
        };
      });
    }
    syncSortSelect();
  }

  function buildSortOptionsHtml() {
    const baseSorts = [
      { id: 'newest', label: t('sortNewest') },
      { id: 'name', label: t('sortName') },
      { id: 'tests', label: t('sortTests') },
    ];
    const metricSorts = (DB.sorts || []).filter((s) => state.category === 'all' || s.category === state.category);
    const all = baseSorts.concat(metricSorts);
    if (!all.some((s) => s.id === state.sort)) state.sort = 'newest';
    return all
      .map((s) => '<option value="' + esc(s.id) + '"' + (s.id === state.sort ? ' selected' : '') + '>' + esc(s.label) + '</option>')
      .join('');
  }

  function syncSortSelect() {
    const sortSel = document.getElementById('sort');
    if (!sortSel) return;
    sortSel.innerHTML = buildSortOptionsHtml();
    sortSel.value = state.sort;
  }

  // Chọn 2 cột điểm phù hợp với danh mục đang lọc cho chế độ bảng gọn
  function pickTableMetrics(metricKey) {
    const preferredByCat = {
      cpu: ['cinebench-2024.da-nhan', 'geekbench-6.da-nhan', 'cinebench-2026.da-nhan', 'cinebench-r23.da-nhan'],
      gpu: ['3dmark-time-spy.score', '3dmark-fire-strike.score', '3dmark-steel-nomad-light.score', '3dmark-wild-life-extreme.score'],
      games: ['cyberpunk-2077-1080p-low-settings.score', 'cyberpunk-2077-1080p-low-settings-frame-gen-2x.score'],
      system: ['pcmark-10.score', 'procyon-battery.score', 'pcmark-10-applications.score'],
      all: ['cinebench-2024.da-nhan', '3dmark-time-spy.score', 'geekbench-6.da-nhan', 'cinebench-2026.da-nhan'],
    };
    const cols = [];
    if (metricKey && DB.metrics[metricKey] && (state.category === 'all' || DB.metrics[metricKey].category === state.category)) {
      cols.push(metricKey);
    }
    const pref = preferredByCat[state.category] || (state.category === 'all' ? preferredByCat.all : []);
    pref.forEach((k) => {
      if (cols.length >= 2) return;
      if (cols.indexOf(k) < 0 && DB.metrics[k] && DB.stats[k]) cols.push(k);
    });
    if (cols.length < 2 && state.category !== 'all') {
      Object.values(DB.metrics)
        .filter((m) => m.dynamic && m.category === state.category && DB.stats[m.key])
        .forEach((m) => {
          if (cols.length < 2 && cols.indexOf(m.key) < 0) cols.push(m.key);
        });
    }
    if (cols.length < 2 && state.category === 'all') {
      (DB.sorts || []).forEach((s) => {
        const k = s.id.slice(2);
        if (cols.length < 2 && cols.indexOf(k) < 0 && DB.metrics[k]) cols.push(k);
      });
    }
    return cols;
  }

  function renderTableView(list, metricKey) {
    const cols = pickTableMetrics(metricKey);
    const shortTitle = (k) => {
      const m = DB.metrics[k];
      if (!m) return k;
      const base = m.testTitle ? m.testTitle.replace('Cinebench ', 'CB ').replace('3DMark ', '') : m.label;
      return m.seriesKey && m.seriesKey !== 'score' ? base + ' (' + m.label + ')' : base;
    };
    const rows = list
      .map((l) => {
        const spec = [l.raw.cpu, l.raw.gpu].filter(Boolean).join(' · ');
        const cells = cols
          .map((k) => {
            const val = l.v[k];
            const m = DB.metrics[k] || {};
            if (val == null) return '<td class="num muted">—</td>';
            return '<td class="num">' + esc(U.fmtNumber(val, m.decimals)) + '</td>';
          })
          .join('');
        return (
          '<tr>' +
          '<td><a class="ctbl-name" href="#/may/' + encodeURIComponent(l.id) + '">' + esc(fullName(l)) + '</a>' +
          (l.variant ? '<div class="ctbl-sub">' + esc(l.variant) + '</div>' : '') +
          '</td>' +
          '<td class="ctbl-spec">' + esc(spec || '—') + '</td>' +
          cells +
          '<td class="ctbl-act">' + cmpButton(l.id, 'cmp-toggle') + '</td>' +
          '</tr>'
        );
      })
      .join('');
    return (
      '<div class="ctbl-wrap"><table class="ctbl">' +
      '<thead><tr>' +
      '<th>' + esc(t('colLaptop')) + '</th><th>' + esc(t('colHw')) + '</th>' +
      cols.map((k) => '<th class="num">' + esc(shortTitle(k)) + '</th>').join('') +
      '<th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>'
    );
  }

  function renderRankView(list) {
    // Lấy tất cả bài test có ít nhất 1 máy Tinh tế đo (để cả danh mục ít máy như AI cục bộ vẫn hiện đúng)
    const allMetrics = Object.values(DB.metrics)
      .filter((m) => !m.noRank && m.type !== 'text' && DB.stats[m.key] && DB.stats[m.key].values.length >= 1)
      .sort((a, b) => LAB.SECTION_ORDER.indexOf(a.category) - LAB.SECTION_ORDER.indexOf(b.category) || (a.fullLabel || '').localeCompare(b.fullLabel || '', 'vi'))
      .map((m) => ({ key: m.key, label: m.fullLabel + (m.lowerBetter ? ' (' + t('lowerBetter') + ')' : ''), category: m.category }));

    const pool = allMetrics.filter((s) => state.category === 'all' || s.category === state.category);
    if (!pool.length) {
      return '<div class="empty">' + esc(state.category === 'all' ? t('rankNone') : t('rankNoCat')) + '</div>';
    }

    let activeKey = state.rankMetric;
    if (!pool.some((s) => s.key === activeKey)) {
      const pref = ['cinebench-2024.da-nhan', '3dmark-time-spy.score', 'geekbench-6.da-nhan', 'cinebench-2026.da-nhan'];
      activeKey = pref.find((k) => pool.some((s) => s.key === k)) || pool[0].key;
      state.rankMetric = activeKey;
    }

    const meta = DB.metrics[activeKey] || {};
    const lower = !!meta.lowerBetter;
    const ranked = list
      .filter((l) => l.measured && l.v[activeKey] != null)
      .sort((a, b) => (lower ? a.v[activeKey] - b.v[activeKey] : b.v[activeKey] - a.v[activeKey]));

    // Cột trái: danh sách bài test theo nhóm (điện thoại dùng ô chọn)
    const catTitles = { cpu: t('catCpu'), gpu: t('catGpu'), games: t('catGames'), ai: t('catAi'), system: t('catSystem') };
    const countOf = (k) => list.filter((l) => l.measured && l.v[k] != null).length;
    let lastCat = '';
    const side = pool
      .map((s) => {
        const head = s.category !== lastCat ? '<div class="lb-side-h">' + esc(catTitles[s.category] || t('catOther')) + '</div>' : '';
        lastCat = s.category;
        const on = s.key === activeKey;
        return head + '<button type="button" class="lb-side-item' + (on ? ' active' : '') + '" data-rm="' + esc(s.key) + '" aria-pressed="' + on + '">' +
          '<span>' + esc(s.label) + '</span><i>' + countOf(s.key) + '</i></button>';
      })
      .join('');
    const optsHtml = pool
      .map((s) => '<option value="' + esc(s.key) + '"' + (s.key === activeKey ? ' selected' : '') + '>' + esc(s.label) + '</option>')
      .join('');

    const head =
      '<div class="lb-head">' +
      '<div><h2>' + esc(meta.fullLabel || activeKey) + '</h2>' +
      '<div class="lb-desc">' + esc(lower ? t('lowerBetterDesc') : t('higherBetterDesc')) + '. ' + esc(t('rankMeasured', { n: ranked.length })) + '.</div></div>' +
      '<select class="lb-sel" id="rankMetricSel" aria-label="' + esc(t('rankSelectAria')) + '">' + optsHtml + '</select>' +
      '</div>';

    let body;
    if (!ranked.length) {
      body = '<div class="empty">' + esc(t('rankNoMatch')) + '</div>';
    } else {
      const vals = ranked.map((l) => l.v[activeKey]);
      const maxV = Math.max(...vals);
      const minV = Math.min(...vals);
      body =
        '<div class="lb-list">' +
        ranked
          .map((l, idx) => {
            const v = l.v[activeKey];
            const pct = lower ? (v > 0 && minV > 0 ? (minV / v) * 100 : 100) : maxV > 0 ? (v / maxV) * 100 : 0;
            const w = Math.max(2, Math.min(100, pct)).toFixed(1);
            const sub = meta.category === 'gpu' || meta.category === 'games' ? l.raw.gpu : meta.category === 'cpu' ? l.raw.cpu : [l.raw.cpu, l.raw.gpu].filter(Boolean).join(' · ');
            return (
              '<div class="lb-row">' +
              '<span class="lb-rank">' + (idx + 1) + '</span>' +
              '<div class="lb-info"><a class="lb-name" href="#/may/' + encodeURIComponent(l.id) + '">' + esc(dispName(l)) + '</a>' +
              (sub ? '<div class="lb-sub">' + esc(sub) + '</div>' : '') +
              '</div>' +
              '<div class="lb-bar"><span style="width:' + w + '%"></span></div>' +
              '<div class="lb-val">' + esc(U.fmtNumber(v, meta.decimals)) + (meta.unit ? ' <small>' + esc(meta.unit) + '</small>' : '') + '</div>' +
              '<div class="lb-act">' + cmpButton(l.id, 'cmp-toggle') + '</div>' +
              '</div>'
            );
          })
          .join('') +
        '</div>';
    }

    return '<div class="lb"><nav class="lb-side" aria-label="' + esc(t('rankSelectAria')) + '">' + side + '</nav><div class="lb-main">' + head + body + '</div></div>';
  }

  function updateResults() {
    const list = filterAndSort();
    const metricKey = state.sort.startsWith('m:') ? state.sort.slice(2) : null;
    const results = document.getElementById('results');
    const more = document.getElementById('more');
    const count = document.getElementById('count');

    const filters = [];
    if (state.q) filters.push('“' + state.q + '”');
    if (state.brand !== 'all') filters.push(state.brand);
    count.textContent = filters.length
      ? t('foundCount', { n: list.length, f: filters.join(' · ') })
      : t('testedCount', { n: list.length });

    if (!list.length) {
      results.innerHTML = '<div class="empty">' + esc(t('emptyFilter')) + '</div>';
      more.innerHTML = '';
      return;
    }

    if (state.view === 'rank') {
      results.innerHTML = renderRankView(list);
      more.innerHTML = '';
      const pickMetric = (k) => {
        state.rankMetric = k;
        history.replaceState(null, '', homeHash());
        updateResults();
      };
      const sel = document.getElementById('rankMetricSel');
      if (sel) sel.onchange = () => pickMetric(sel.value);
      results.querySelectorAll('[data-rm]').forEach((b) => { b.onclick = () => pickMetric(b.dataset.rm); });
      results.querySelectorAll('.cmp-toggle').forEach((b) => { b.onclick = () => toggleCompare(b.dataset.cmp); });
      return;
    }

    const slice = list.slice(0, state.shown);
    if (state.view === 'table') {
      results.innerHTML = renderTableView(slice, metricKey);
    } else {
      results.innerHTML = '<div class="grid">' + slice.map((l) => card(l, metricKey)).join('') + '</div>';
    }
    results.querySelectorAll('.cmp-toggle').forEach((b) => { b.onclick = () => toggleCompare(b.dataset.cmp); });

    if (list.length > state.shown) {
      more.innerHTML = '<button class="btn" id="moreBtn">' + esc(t('loadMore', { n: list.length - state.shown })) + '</button>';
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
      rankBadge = '<span class="chart-badge chart-rank">' + esc(t('rankBadge', { rank: ch.rank.rank, total: ch.rank.total })) + '</span>';
    }
    if (ch.ref) rankBadge = '<span class="chart-badge">' + esc(t('refLabel')) + '</span>';
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
          (isHl ? ' <span class="hl-tag">' + esc(opts.compare ? t('bestTag') : t('currentTag')) + '</span>' : '') +
          (it.ref && (!isHl || opts.compare) ? ' <span class="ref-tag">' + esc(t('refShort')) + '</span>' : '') +
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
      '<button type="button" class="chart-dl" title="' + esc(t('dlImgTip')) + '">' +
      '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M10 3v10m0 0-4-4m4 4 4-4M3 15v2h14v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<span>' + esc(t('dlImg')) + '</span></button>' +
      '</div>' +
      legend +
      '<div class="chart-list">' + itemsHtml + '</div>' +
      (hiddenCount > 0 ? '<button type="button" class="btn chart-more">' + esc(t('showAll', { n: ch.items.length })) + '</button>' : '') +
      (opts.missing && opts.missing.length ? '<div class="chart-missing">' + esc(t('missingData')) + ' ' + opts.missing.map(esc).join(', ') + '</div>' : '') +
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
    return l.variant ? fullName(l) + ' (' + l.variant + ')' : fullName(l);
  }

  // Tên máy giữ đủ thương hiệu (vd "Strix SCAR 18 2026" → "ASUS Strix SCAR 18 2026")
  function fullName(l) {
    if (!l.brand || U.normalize(l.name).indexOf(U.normalize(l.brand)) === 0) return l.name;
    return l.brand + ' ' + l.name;
  }

  function cmpButton(id, cls) {
    const on = state.compare.indexOf(id) >= 0;
    return '<button type="button" class="' + cls + (on ? ' on' : '') + '" data-cmp="' + esc(id) + '" aria-pressed="' + on + '">' + esc(on ? t('cmpAdded') : t('cmpAdd')) + '</button>';
  }

  function toggleCompare(id) {
    const i = state.compare.indexOf(id);
    if (i >= 0) state.compare.splice(i, 1);
    else if (state.compare.length >= CMP_MAX) {
      flashTray(t('cmpMaxMsg', { n: CMP_MAX }));
      return;
    } else state.compare.push(id);
    document.querySelectorAll('[data-cmp="' + CSS.escape(id) + '"]').forEach((b) => {
      const on = state.compare.indexOf(id) >= 0;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      b.textContent = on ? t('cmpAdded') : t('cmpAdd');
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
    if (nav) nav.textContent = n ? t('navCompareN', { n }) : t('navCompare');
    if (!show) return;
    const chips = state.compare
      .map((id) => {
        const l = DB.byId[id];
        return '<span class="tray-chip"><span>' + esc(l ? dispName(l) : id) + '</span><button type="button" data-cmp="' + esc(id) + '" aria-label="' + esc(t('cmpRemove')) + '">×</button></span>';
      })
      .join('');
    tray.innerHTML =
      '<div class="container tray-inner">' +
      '<div class="tray-chips">' + (chips || '<span class="muted">' + esc(t('cmpNone')) + '</span>') + '<span class="tray-msg" role="status"></span></div>' +
      '<div class="tray-actions">' +
      (n ? '<button type="button" class="btn tray-clear">' + esc(t('cmpClear')) + '</button>' : '') +
      (n >= 2
        ? '<a class="btn btn-primary" href="' + compareHash(state.compare) + '">' + esc(t('cmpGo', { n })) + '</a>'
        : '<span class="tray-hint">' + esc(t('cmpHint')) + '</span>') +
      '</div>' +
      '</div>';
    tray.querySelectorAll('[data-cmp]').forEach((b) => { b.onclick = () => toggleCompare(b.dataset.cmp); });
    const clr = tray.querySelector('.tray-clear');
    if (clr) clr.onclick = () => {
      const ids = state.compare.slice();
      state.compare = [];
      ids.forEach((id) => document.querySelectorAll('[data-cmp="' + CSS.escape(id) + '"]').forEach((b) => {
        b.classList.remove('on'); b.setAttribute('aria-pressed', false); b.textContent = t('cmpAdd');
      }));
      renderTray();
    };
  }

  /* ---------- Trang so sánh nhiều máy ---------- */

  function renderCompare() {
    RENDERED = [];
    const list = state.compare.map((id) => DB.byId[id]).filter(Boolean);
    document.title = t('cmpTitle') + ' – ' + LAB.CONFIG.siteName;
    if (list.length < 2) {
      app.innerHTML =
        '<a class="back" href="' + homeHash() + '">' + esc(t('backAll')) + '</a>' +
        '<div class="empty"><b>' + esc(t('cmpNeed2')) + '</b><br>' + esc(t('cmpNeed2Hint', { n: CMP_MAX })) +
        (list.length ? '<br><br>' + esc(t('cmpSelected')) + ' <b>' + esc(dispName(list[0])) + '</b>' : '') +
        '<br><br><a class="btn btn-primary" href="' + homeHash() + '">' + esc(t('cmpPick')) + '</a></div>';
      window.scrollTo(0, 0);
      return;
    }
    document.title = list.map((l) => fullName(l)).join(' vs ') + ' – ' + LAB.CONFIG.siteName;

    // Đầu trang: mỗi máy một cột
    const heads = list
      .map(
        (l) =>
          '<div class="cmp-head">' +
          thumb(l, 'card-thumb') +
          '<a class="cmp-name" href="#/may/' + encodeURIComponent(l.id) + '">' + esc(fullName(l)) + '</a>' +
          '<div class="cmp-chip">' + esc([l.raw.cpu, l.raw.gpu].filter(Boolean).join(' · ')) + '</div>' +
          (l.measured ? '' : '<span class="tag tag-muted">' + esc(t('refLabel')) + '</span>') +
          '<button type="button" class="cmp-remove" data-remove="' + esc(l.id) + '">' + esc(t('cmpRemove')) + '</button>' +
          '</div>'
      )
      .join('');

    // Bảng thông số: chỉ các dòng có ít nhất một máy có số
    const metrics = LAB.SPECS.map((m) => ({ m, group: t('secSpecs') })).concat(
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

    // Bảng điểm: mỗi hàng một bài test (chỉ số Tinh tế đo), ô cao nhất tô màu, ô khác ghi % chênh
    const scoreKeys = Object.values(DB.metrics)
      .filter((m) => m.dynamic && list.some((l) => l.v[m.key] != null))
      .sort((a, b) =>
        LAB.SECTION_ORDER.indexOf(a.category) - LAB.SECTION_ORDER.indexOf(b.category) ||
        (a.testTitle || '').localeCompare(b.testTitle || '', 'vi') ||
        (a.seriesKey === 'score' ? 0 : 1) - (b.seriesKey === 'score' ? 0 : 1) ||
        (a.label || '').localeCompare(b.label || '', 'vi'));
    let lastScoreCat = '';
    const catShort = { cpu: t('catCpuFull'), gpu: t('catGpuFull'), games: t('catGamesFull'), ai: t('catAiFull'), system: t('catSystemFull') };
    const scoreRows = scoreKeys
      .map((m) => {
        const vals = list.map((l) => l.v[m.key]);
        const nums = vals.filter((x) => x != null);
        const best = nums.length >= 2 ? (m.lowerBetter ? Math.min(...nums) : Math.max(...nums)) : null;
        const groupRow = m.category !== lastScoreCat ? '<tr class="cmp-group"><th colspan="' + (cols + 1) + '">' + esc(catShort[m.category] || t('catOther')) + '</th></tr>' : '';
        lastScoreCat = m.category;
        const label = m.seriesKey && m.seriesKey !== 'score' ? esc(m.testTitle) + '<small>' + esc(m.label) + (m.lowerBetter ? ', ' + esc(t('lowerBetter')) : '') + '</small>' : esc(m.testTitle || m.label) + (m.lowerBetter ? '<small>' + esc(t('lowerBetter')) + '</small>' : '');
        return (
          groupRow +
          '<tr><th scope="row">' + label + '</th>' +
          vals
            .map((v) => {
              if (v == null) return '<td class="nil">—</td>';
              const isBest = best != null && v === best;
              let note = '';
              if (best != null && !isBest && best) {
                const pct = m.lowerBetter ? (best / v - 1) * 100 : (v / best - 1) * 100;
                note = '<em>' + (Math.abs(pct) < 0.05 ? '≈' : (pct > 0 ? '+' : '−') + Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0) + '%') + '</em>';
              } else if (isBest) note = '<em>' + esc(t('bestShort')) + '</em>';
              const w = best ? Math.max(2, Math.min(100, m.lowerBetter ? (best / v) * 100 : (v / best) * 100)) : 100;
              return '<td' + (isBest ? ' class="best"' : '') + '><span class="sv">' + esc(U.fmtNumber(v, m.decimals)) + '</span>' + note +
                (best != null ? '<span class="sm"><span style="width:' + w.toFixed(1) + '%"></span></span>' : '') + '</td>';
            })
            .join('') +
          '</tr>'
        );
      })
      .join('');
    const scoreTable = scoreRows
      ? '<section class="panel" id="sec-scores"><h2>' + esc(t('cmpScores')) + '</h2>' +
        '<div class="cmp-table-wrap"><table class="cmp-table cmp-scores" style="--cols:' + cols + '">' +
        '<thead><tr><th></th>' + list.map((l) => '<th scope="col">' + esc(dispName(l)) + '</th>').join('') + '</tr></thead>' +
        '<tbody>' + scoreRows + '</tbody></table></div>' +
        '<p class="kpi-note">' + esc(t('cmpScoresNote')) + '</p></section>'
      : '';

    const sections = [];
    const toc = (scoreTable ? ['<button type="button" data-target="sec-scores">' + esc(t('cmpScores')) + '</button>'] : [])
      .concat('<button type="button" data-target="sec-specs">' + esc(t('cmpSpecs')) + '</button>');
    const catTitles = { cpu: t('catCpuFull'), gpu: t('catGpuFull'), games: t('catGamesFull'), ai: t('catAiFull'), system: t('catSystemFull'), other: t('catOther') };
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
      '<a class="back" href="' + homeHash() + '">' + esc(t('backAll')) + '</a>' +
      '<section class="cmp-top"><h1>' + esc(t('cmpHeading', { n: list.length })) + '</h1>' +
      '<div class="actions"><button class="btn" type="button" id="copyLink">' + esc(t('cmpCopyLink')) + '</button>' +
      (list.length < CMP_MAX ? '<a class="btn" href="' + homeHash() + '">' + esc(t('cmpAddMore')) + '</a>' : '') +
      '</div></section>' +
      '<div class="cmp-heads" style="--cols:' + cols + '">' + heads + '</div>' +
      '<nav class="toc">' + toc.join('') + '</nav>' +
      scoreTable +
      '<section class="panel" id="sec-specs"><h2>' + esc(t('cmpSpecs')) + '</h2><div class="cmp-table-wrap"><table class="cmp-table" style="--cols:' + cols + '">' +
      '<thead><tr><th></th>' + list.map((l) => '<th scope="col">' + esc(dispName(l)) + '</th>').join('') + '</tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></section>' +
      sections.join('') +
      '<p class="legend muted">' + esc(t('cmpLegend')) + '</p>';

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

  // Dải phân bố: mỗi vạch là một máy Tinh tế đo, vạch đậm là máy đang xem
  function distStrip(key, value) {
    const st = DB.stats[key];
    if (!st || st.values.length < 3 || st.max === st.min) return '';
    const lower = !!(DB.metrics[key] || {}).lowerBetter;
    const pos = (v) => {
      const p = ((v - st.min) / (st.max - st.min)) * 100;
      return (lower ? 100 - p : p).toFixed(1);
    };
    let selfDone = false;
    const ticks = st.values
      .map((v) => {
        if (!selfDone && v === value) { selfDone = true; return ''; }
        return '<i style="left:' + pos(v) + '%"></i>';
      })
      .join('');
    return '<span class="dist" aria-hidden="true">' + ticks + '<b style="left:' + pos(value) + '%"></b></span>';
  }

  function renderDetail(id) {
    RENDERED = [];
    const l = DB.byId[id];
    if (!l) {
      document.title = t('notFound') + ' – ' + LAB.CONFIG.siteName;
      app.innerHTML =
        '<a class="back" href="' + homeHash() + '">' + esc(t('backAll')) + '</a>' +
        '<div class="empty">' + t('notFoundDesc', { id: esc(id) }) + '</div>';
      return;
    }

    const r = l.raw;
    document.title = fullName(l) + ' – ' + t('detailTitleSuffix') + ' | ' + LAB.CONFIG.siteName;

    const sub = [l.brand, l.dateLabel ? t('testDatePrefix', { d: l.dateLabel }) : '', l.variant, l.measured ? '' : t('refLong')].filter(Boolean).join(' · ');
    const info = [
      l.model ? esc(t('modelLabel')) + ' <b>' + esc(l.model) + '</b>' : '',
      l.tester ? esc(t('testerLabel')) + ' <b>' + esc(l.tester) + '</b>' : '',
      l.dateLabel ? esc(t('dateLabel')) + ' <b>' + esc(l.dateLabel) + '</b>' : '',
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
      cpu: { title: t('catCpuFull'), charts: [] },
      gpu: { title: t('catGpuFull'), charts: [] },
      games: { title: t('catGamesFull'), charts: [] },
      ai: { title: t('catAiFull'), charts: [] },
      system: { title: t('catSystemFull'), charts: [] },
      other: { title: t('catOther'), charts: [] },
    };

    l.charts.forEach((ch) => {
      const c = catMap[ch.category] || catMap.other;
      c.charts.push(ch);
    });

    // Dải tóm tắt nhanh tối đa 4 điểm nổi bật nhất (mỗi nhóm tối đa 1-2 bài đo thực tế)
    const kpis = [];
    const seenCats = {};
    l.charts
      .filter((ch) => !ch.ref || !l.measured)
      .forEach((ch) => {
        if (kpis.length >= 4) return;
        if (seenCats[ch.category] && l.charts.some((x) => !seenCats[x.category] && (!x.ref || !l.measured))) return;
        const hl = ch.items.find((i) => i.highlight);
        const mainIdx = ch.series.length - 1;
        const val = hl && hl.values[mainIdx];
        if (val == null) return;
        seenCats[ch.category] = true;
        const key = ch.ref ? null : ch.testKey + '.' + ch.series[mainIdx].key;
        kpis.push({
          dist: key ? distStrip(key, val) : '',
          cat: 'sec-' + (catMap[ch.category] ? ch.category : 'other'),
          label: ch.title,
          val: U.fmtNumber(val, ch.decimals),
          unit: ch.unit || '',
          rank: ch.rank && ch.rank.total > 1 ? ch.rank.rank + '/' + ch.rank.total : '',
        });
      });
    const kpiHtml =
      kpis.length >= 2
        ? '<div class="kpi-strip">' +
          kpis
            .map(
              (k) =>
                '<button type="button" class="kpi-card" data-jump="' + esc(k.cat) + '">' +
                '<span class="kpi-label">' + esc(k.label) + '</span>' +
                '<span class="kpi-val"><b>' + esc(k.val) + '</b>' + (k.unit ? ' <small>' + esc(k.unit) + '</small>' : '') +
                '</span>' + k.dist +
                (k.rank ? '<span class="kpi-rank">' + esc(t('kpiRank', { r: k.rank })) + '</span>' : '') +
                '</button>'
            )
            .join('') +
          '</div>' +
          (kpis.some((k) => k.dist) ? '<p class="kpi-note">' + esc(t('distHint')) + '</p>' : '')
        : '';

    // Tạo các tab nội dung (bấm tab chuyển nhóm ngay, kèm tab "Tất cả")
    const tabDefs = [];
    LAB.SECTION_ORDER.forEach((catId) => {
      const group = catMap[catId];
      if (!group || !group.charts.length) return;
      tabDefs.push({
        id: 'sec-' + catId,
        label: group.title + ' (' + group.charts.length + ')',
        html:
          '<section class="panel tab-panel" id="sec-' + catId + '">' +
          '<h2>' + esc(group.title) + '</h2>' +
          renderChartBlocks(group.charts) +
          '</section>',
      });
    });

    // Màn hình & Pin (nếu có thông tin trong laptops.json)
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
      return '<section class="panel" id="sec-' + sec.id + '"><h2>' + esc(sec.title) + '</h2>' + groupsHtml + '</section>';
    }).filter(Boolean);

    const specBundle =
      (specs ? '<section class="panel"><h2>' + esc(t('secSpecs')) + '</h2><div class="specs">' + specs + '</div></section>' : '') +
      staticSecs.join('') +
      (l.notes ? '<section class="panel"><h2>' + esc(t('secNotes')) + '</h2><p class="notes">' + esc(l.notes).replace(/\n/g, '<br>') + '</p></section>' : '');

    if (specBundle) {
      tabDefs.push({
        id: 'sec-info',
        label: t('tabSpecs'),
        html: '<div class="tab-panel" id="sec-info">' + specBundle + '</div>',
      });
    }

    const useTabs = tabDefs.length >= 2;
    const tabsNav = useTabs
      ? '<nav class="toc detail-tabs" role="tablist">' +
        tabDefs
          .map((tItem, i) => '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-dtab="' + esc(tItem.id) + '">' + esc(tItem.label) + '</button>')
          .join('') +
        '<button type="button" role="tab" aria-selected="false" data-dtab="all">' + esc(t('tabAll')) + '</button>' +
        '</nav>'
      : '';

    const panelsHtml = tabDefs.length
      ? tabDefs
          .map((tItem, i) => (useTabs && i > 0 ? tItem.html.replace('class="panel tab-panel"', 'class="panel tab-panel" hidden').replace('class="tab-panel"', 'class="tab-panel" hidden') : tItem.html))
          .join('')
      : '<div class="empty">' + esc(t('noCharts')) + '</div>';

    app.innerHTML =
      '<a class="back" href="' + homeHash() + '">' + esc(t('backAll')) + '</a>' +
      '<section class="detail-hero">' +
      thumb(l, 'detail-thumb') +
      '<div class="detail-head">' +
      (sub ? '<div class="eyebrow">' + esc(sub) + '</div>' : '') +
      '<h1>' + esc(fullName(l)) + '</h1>' +
      (info.length ? '<div class="detail-info">' + info.join('<span class="dot">•</span>') + '</div>' : '') +
      '<div class="actions">' +
      (l.review ? '<a class="btn" href="' + esc(l.review) + '" target="_blank" rel="noopener">' + esc(t('reviewBtn')) + '</a>' : '') +
      cmpButton(l.id, 'btn cmp-btn') +
      '<button class="btn" type="button" id="copyLink">' + esc(t('copyLink')) + '</button>' +
      '</div>' +
      '</div>' +
      '</section>' +
      kpiHtml +
      tabsNav +
      panelsHtml +
      '<p class="legend muted">' + esc(t('detailLegend')) + '</p>';

    app.querySelectorAll('.cmp-btn').forEach((b) => { b.onclick = () => toggleCompare(b.dataset.cmp); });

    const activateDetailTab = (tabId) => {
      app.querySelectorAll('.detail-tabs [data-dtab]').forEach((b) => {
        b.setAttribute('aria-selected', b.dataset.dtab === tabId);
      });
      app.querySelectorAll('.tab-panel').forEach((p) => {
        p.hidden = tabId !== 'all' && p.id !== tabId;
      });
    };
    app.querySelectorAll('.detail-tabs [data-dtab]').forEach((b) => {
      b.onclick = () => activateDetailTab(b.dataset.dtab);
    });
    app.querySelectorAll('.kpi-card[data-jump]').forEach((b) => {
      b.onclick = () => {
        if (useTabs) activateDetailTab(b.dataset.jump);
        const el = document.getElementById(b.dataset.jump);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });

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
      tabs.forEach((tabBtn) => {
        tabBtn.onclick = () => {
          tabs.forEach((x) => x.setAttribute('aria-selected', x === tabBtn));
          cards.forEach((c, i) => { c.hidden = String(i) !== tabBtn.dataset.tab; });
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
        label.textContent = t('dlCreating');
        const footer = DB.index.commitDate ? t('sourceUpdated', { d: U.fmtDate(U.parseDate(DB.index.commitDate)) }) : '';
        LAB.exportChartPNG(ch, visible, { footer, filename: 'tinhte-' + U.slugify(ch.title) })
          .catch((e) => { console.error(e); alert('PNG error: ' + e.message); })
          .finally(() => { label.textContent = t('dlImg'); });
      };
    });

    // Cuộn mượt khi bấm các tab TOC (trang so sánh)
    app.querySelectorAll('.toc button[data-target]').forEach((b) => {
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
          copyBtn.textContent = t('copied');
          setTimeout(() => (copyBtn.textContent = idle), 1800);
        };
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(done, () => window.prompt(t('copyLink'), url));
        } else {
          window.prompt(t('copyLink'), url);
        }
      };
    }
  }

  /* ---------- Chuyển giao diện Sáng / Tối & Đa ngôn ngữ ---------- */

  let syncThemeLabel = () => {};

  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const KEY = 'tinhte-lab-theme';
    const root = document.documentElement;

    const currentTheme = () => (root.dataset.theme === 'dark' ? 'dark' : 'light');

    syncThemeLabel = () => {
      const isLight = currentTheme() === 'light';
      const label = isLight ? t('themeToDark') : t('themeToLight');
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
      syncThemeLabel();
    });

    syncThemeLabel();
  }

  function updateSourceLine() {
    const src = document.getElementById('dataSource');
    if (!src || !DB) return;
    src.textContent =
      t('sourceCount', { n: DB.laptops.length }) +
      (DB.index.commitDate ? ' · ' + t('sourceUpdated', { d: U.fmtDate(U.parseDate(DB.index.commitDate)) }) : '');
  }

  function applyStaticI18n() {
    const navAll = document.getElementById('navAll');
    if (navAll) navAll.textContent = t('navAll');
    const navCmp = document.getElementById('navCompare');
    if (navCmp) navCmp.textContent = state.compare.length ? t('navCompareN', { n: state.compare.length }) : t('navCompare');
    const loading = document.getElementById('loadingState');
    if (loading) loading.textContent = t('loading');
    const foot = document.getElementById('footerNote');
    if (foot) foot.innerHTML = t('footerNote');
    const langSel = document.getElementById('langSelect');
    if (langSel) {
      langSel.setAttribute('aria-label', t('langLabel'));
      langSel.setAttribute('title', t('langLabel'));
    }
    syncThemeLabel();
    updateSourceLine();
  }

  function initLanguage() {
    const sel = document.getElementById('langSelect');
    if (!sel || !LAB.i18n) return;
    sel.value = LAB.i18n.getLang();
    sel.addEventListener('change', () => {
      LAB.i18n.setLang(sel.value);
      applyStaticI18n();
      if (DB) {
        route();
        renderTray();
      }
    });
    applyStaticI18n();
  }

  /* ---------- Khởi động ứng dụng ---------- */

  initThemeToggle();
  initLanguage();

  LAB.loadData()
    .then((db) => {
      DB = db;
      updateSourceLine();
      window.addEventListener('hashchange', route);
      route();
    })
    .catch((err) => {
      console.error(err);
      app.innerHTML =
        '<div class="empty"><b>' + esc(t('loadErrTitle')) + '</b><br>' +
        esc(err.message) +
        '<br><br>' + esc(t('loadErrHint')) + ' <button class="btn" onclick="location.reload()">' + esc(t('reloadBtn')) + '</button></div>';
    });
})();
