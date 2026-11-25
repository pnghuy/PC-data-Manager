/*
 * Đọc & xử lý dữ liệu benchmark.
 * ------------------------------------------------------------------
 * - Nguồn duy nhất: kho.json ở gốc repo pnghuy/tinhte-charts (kho máy của Tinhte Chart Studio).
 * - Mỗi máy Tinh tế tự đo (measured) là một thẻ trên web; các dòng số tham khảo chỉ xuất hiện
 *   trong biểu đồ so sánh và được ghi rõ "tham khảo".
 * - Biểu đồ so sánh tự dựng từ mọi máy cùng loại có cùng bài test (laptop/PC không lẫn với card rời).
 */
(function () {
  'use strict';
  const LAB = window.LAB;
  const CFG = LAB.CONFIG;

  /* ================= Tiện ích chung ================= */

  const EMPTY = /^(|-|--|—|n\/a|na)$/i;

  function toNumber(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (v == null) return null;
    let s = String(v).replace(/[\s\u00a0]/g, '');
    if (EMPTY.test(s)) return null;
    const m = s.match(/^-?[\d.,]+/);
    if (!m) return null;
    s = m[0];
    const hasDot = s.includes('.');
    const hasComma = s.includes(',');
    if (hasDot && hasComma) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (hasComma) {
      s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (hasDot && /^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  // Thời lượng pin → số phút. Nhận: "11:18", "11g18p", "11h18m", "45p", 678 (phút)
  function parseDuration(v) {
    if (typeof v === 'number') return Math.round(v);
    if (v == null) return null;
    const s = String(v).trim().toLowerCase();
    if (EMPTY.test(s)) return null;
    let m = s.match(/^(\d+)\s*:\s*(\d{1,2})(?:\s*:\s*\d{1,2})?$/);
    if (m) return +m[1] * 60 + +m[2];
    m = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:g|h|giờ|gio)\s*(?:(\d{1,2})\s*(?:p|m|phút|phut)?)?$/);
    if (m) return Math.round(toNumber(m[1]) * 60) + (m[2] ? +m[2] : 0);
    m = s.match(/^(\d+)\s*(?:p|m|phút|phut)$/);
    if (m) return +m[1];
    const n = toNumber(s);
    return n == null ? null : Math.round(n);
  }

  function formatDuration(min) {
    if (min == null) return '';
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (!h) return m + 'p';
    return h + 'g ' + String(m).padStart(2, '0') + 'p';
  }

  function fmtNumber(n, decimals) {
    if (n == null) return '';
    const d = decimals != null ? decimals : Number.isInteger(n) ? 0 : 2;
    return n.toLocaleString('vi-VN', { maximumFractionDigits: d });
  }

  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }
  const compact = (s) => normalize(s).replace(/[^a-z0-9]+/g, '');
  const slugify = (s) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  function parseDate(s) {
    s = String(s || '').trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    return null;
  }

  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => (d ? pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() : '');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function safeUrl(u) {
    u = String(u || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }

  /* ================= Nhận diện tên máy / CPU / GPU ================= */

  const GPU_RE = /\b(rtx|gtx|geforce|quadro|radeon|arc\s*[a-z]?\d|adreno|iris|graphics)\b/i;
  const CPU_RE = /(\bcore\s*(i[3579]|ultra|[3579]\b)|\bultra\s*x?\d|\bryzen|\bsnapdragon|\bx\d?\s*elite|\bxeon|\bceleron|\bpentium|\bi[3579]-?\d{4,5}|\bapple\s*m\d|\bm[1-9]\s*(pro|max|ultra)?\b|\bmediatek|\bkompanio|\b\d{3,5}(hx|hs|h|u|v)\b)/i;

  function classify(s) {
    if (GPU_RE.test(s)) return 'gpu';
    if (CPU_RE.test(s)) return 'cpu';
    return null;
  }

  const cleanHw = (s) => String(s).replace(/[®™]|\((r|tm)\)/gi, '').replace(/\bprocessor\b/gi, '').replace(/\s+/g, ' ').trim();

  // "Zephyrus DUO (Ultra 9 386H)" → { base: "Zephyrus DUO", hw: ["Ultra 9 386H"] }
  // "RTX 5090 150W (Zephyrus DUO)" → { base: "Zephyrus DUO", hw: ["RTX 5090 150W"] }
  function splitName(name) {
    const inside = [];
    let base = String(name || '')
      .replace(/\(([^)]*)\)?/g, (m, g) => { if (g.trim()) inside.push(g.trim()); return ' '; })
      .replace(/\s+/g, ' ')
      .trim();
    if (base && classify(base)) {
      const i = inside.findIndex((p) => !classify(p));
      if (i >= 0) {
        const nm = inside.splice(i, 1)[0];
        inside.push(base);
        base = nm;
      }
    }
    return { base, hw: inside };
  }

  const BRANDS = [
    ['ASUS', /\b(asus|rog|zenbook|vivobook|tuf|expertbook|proart|zephyrus|strix)\b/],
    ['Lenovo', /\b(lenovo|thinkpad|thinkbook|legion|yoga|ideapad|loq)\b/],
    ['Dell', /\b(dell|xps|alienware|inspiron|latitude|vostro)\b/],
    ['HP', /\b(hp|omen|envy|spectre|elitebook|probook|pavilion|victus|omnibook|zbook)\b/],
    ['Acer', /\b(acer|nitro|predator|swift|aspire|travelmate)\b/],
    ['MSI', /\b(msi|crosshair|katana|stealth|raider|titan|prestige|cyborg|sword|vector|pulse|thin gf|bravo)\b/],
    ['Razer', /\b(razer|blade)\b/],
    ['Apple', /\b(apple|macbook)\b/],
    ['Samsung', /\b(samsung|galaxy book)\b/],
    ['Microsoft', /\b(microsoft|surface)\b/],
    ['Gigabyte', /\b(gigabyte|aorus|aero)\b/],
    ['Huawei', /\b(huawei|matebook)\b/],
    ['LG', /\b(lg gram|lg)\b/],
    ['Xiaomi', /\b(xiaomi|redmibook)\b/],
  ];
  function detectBrand(text) {
    const t = normalize(text).replace(/[-_]+/g, ' ');
    const hit = BRANDS.find((b) => b[1].test(t));
    return hit ? hit[0] : '';
  }

  /* ================= Bộ nhớ đệm trình duyệt ================= */

  const LS = {
    get(k) { try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* đầy bộ nhớ / bị chặn */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* bỏ qua */ } },
    keys(prefix) {
      const out = [];
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefix)) out.push(k); } } catch (e) { /* bỏ qua */ }
      return out;
    },
  };

  /* ================= Tải kho.json từ GitHub ================= */
  /*
   * Toàn bộ điểm số lấy từ một file duy nhất: kho.json ở gốc repo tinhte-charts.
   * Đây là kho máy mà Tinhte Chart Studio đọc/ghi, mỗi máy một dòng với tên đầy đủ,
   * CPU, GPU, loại thiết bị, cờ "measured" (Tinh tế tự đo) và điểm theo id bài test.
   * Không đọc các file chart trong data/ nữa: tên máy trong chart có thể bị sửa riêng
   * cho từng bài (vd bài tài trợ chỉ ghi tên chip), còn kho.json luôn giữ tên gốc.
   *
   * Thứ tự thử: raw.githubusercontent.com → jsDelivr → bản đệm trong trình duyệt
   * → bản snapshot đi kèm web (data/kho-snapshot.js).
   */

  const GH = CFG.github;
  const REPO = GH.owner + '/' + GH.repo;
  const BRANCH = GH.branch || 'main';
  const KHO_PATH = String(GH.khoFile || 'kho.json').replace(/^\/+/, '');
  const CACHE_KEY = 'lab:kho:' + REPO + '@' + BRANCH;

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  async function loadKho(force) {
    const cached = LS.get(CACHE_KEY);
    const maxAge = (CFG.cacheMinutes == null ? 10 : CFG.cacheMinutes) * 60000;
    if (!force && cached && Date.now() - cached.time < maxAge) return { kho: cached.kho, source: cached.source, time: cached.time };

    const urls = [
      ['github', 'https://raw.githubusercontent.com/' + REPO + '/' + encodeURIComponent(BRANCH) + '/' + KHO_PATH],
      ['jsdelivr', 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + encodeURIComponent(BRANCH) + '/' + KHO_PATH],
    ];
    let lastErr = null;
    for (const [source, url] of urls) {
      try {
        const kho = await fetchJSON(url);
        if (!kho || typeof kho.devices !== 'object') throw new Error('kho.json không có "devices"');
        LS.set(CACHE_KEY, { kho, source, time: Date.now() });
        return { kho, source, time: Date.now() };
      } catch (e) {
        lastErr = e;
        console.warn('[Laptop Lab] Không tải được kho từ ' + source + ':', e);
      }
    }
    if (cached) return { kho: cached.kho, source: cached.source, time: cached.time, stale: true, error: lastErr && lastErr.message };
    if (LAB.KHO_SNAPSHOT) return { kho: LAB.KHO_SNAPSHOT, source: 'snapshot', time: null, stale: true, error: lastErr && lastErr.message };
    throw lastErr || new Error('Không tải được kho.json');
  }

  /* ================= Danh mục bài test ================= */

  // Bài test chuẩn (id giống Tinhte Chart Studio) + bài test riêng khai báo trong kho.tests
  function buildTests(kho) {
    const tests = {};
    (LAB.TESTS || []).forEach((t) => { tests[t.id] = Object.assign({}, t); });
    Object.keys(kho.tests || {}).forEach((id) => {
      tests[id] = Object.assign({ id, unit: 'điểm' }, tests[id] || {}, kho.tests[id], { id });
    });
    Object.values(tests).forEach((t) => {
      t.series = Array.isArray(t.series) && t.series.length ? t.series.map(String) : null;
      t.lowerBetter = !!t.lower || /thap.*tot|lower.*better/.test(normalize(t.sub || ''));
      t.category = categoryOf(t.title, t.unit);
    });
    return tests;
  }

  function categoryOf(title, unit) {
    if (/fps/i.test(unit || '')) return 'games';
    const t = compact(title);
    const c = LAB.CATEGORIES.find((x) => x.match && x.match.test(t));
    return c ? c.id : 'other';
  }

  function seriesKeys(test) {
    if (!test.series) return [{ label: /fps/i.test(test.unit || '') ? 'FPS' : 'Điểm', key: 'score' }];
    const used = {};
    return test.series.map((label, i) => {
      let key = slugify(label) || 's' + (i + 1);
      if (used[key]) key += '-' + (i + 1);
      used[key] = true;
      return { label, key };
    });
  }

  /* ================= Tên hiển thị ================= */

  // Giống quy tắc của Chart Studio: laptop/PC ghi kèm chip trong ngoặc, bài đồ hoạ ghi GPU,
  // bài CPU ghi CPU. Dòng tham khảo theo chip (chipOnly) chỉ hiện tên chip.
  function chipOf(dev, test) {
    const gpuTest = test.cat ? test.cat === 'gpu' : test.category !== 'cpu' && test.category !== 'system';
    return gpuTest ? dev.gpu || dev.cpu : dev.cpu || dev.gpu;
  }
  function deviceLabel(dev, test) {
    if (dev.type === 'gpu' || dev.type === 'cpu') return dev.name;
    const chip = chipOf(dev, test);
    if (dev.chipOnly) return chip ? (dev.note ? chip + ' (' + dev.note + ')' : chip) : dev.name;
    if (!chip) return dev.name;
    const inner = chip.replace(/\s*\(([^()]*)\)$/, ', $1');
    return dev.name + ' (' + inner + ')';
  }

  // Laptop và PC so với nhau; card đồ hoạ rời, CPU desktop đứng riêng
  const groupOf = (type) => (type === 'gpu' ? 'gpu' : type === 'cpu' ? 'cpu' : 'system');

  /* ================= Dựng cơ sở dữ liệu ================= */

  LAB.loadData = async function (opts) {
    opts = opts || {};
    const loaded = await loadKho(opts.force);
    const kho = loaded.kho;
    const TESTS = buildTests(kho);

    const issues = [];
    const addIssue = (level, path, msg) => issues.push({ level, path, msg });

    // --- 1. Chuẩn hoá danh sách máy trong kho ---
    const devices = [];
    Object.keys(kho.devices || {}).forEach((id) => {
      const d = kho.devices[id] || {};
      const name = String(d.name || '').trim();
      if (!name) { addIssue('warn', id, 'Máy không có tên, bỏ qua.'); return; }
      const scores = {};
      Object.keys(d.scores || {}).forEach((tid) => {
        const t = TESTS[tid];
        if (!t) { addIssue('warn', id, 'Bài test "' + tid + '" chưa khai báo trong kho.tests, bỏ qua điểm này.'); return; }
        const vals = (Array.isArray(d.scores[tid]) ? d.scores[tid] : [d.scores[tid]]).map(toNumber);
        const need = t.series ? t.series.length : 1;
        if (vals.length !== need || vals.some((v) => v == null)) {
          addIssue('warn', id, '"' + name + '" có điểm ' + t.title + ' sai số cột (cần ' + need + '), bỏ qua.');
          return;
        }
        scores[tid] = vals;
      });
      devices.push({
        id, name,
        cpu: cleanHw(d.cpu || ''), gpu: cleanHw(d.gpu || ''),
        type: d.type || 'laptop',
        group: groupOf(d.type || 'laptop'),
        measured: d.measured === true,
        chipOnly: d.chipOnly === true,
        note: d.note || '',
        scores,
      });
    });

    // --- 2. Chọn máy hiện thành thẻ cho member ---
    // Laptop/PC do Tinh tế tự đo, có tên máy thật (không phải dòng chỉ ghi tên chip).
    const isCard = (d) => d.measured && !d.chipOnly && (d.type === 'laptop' || d.type === 'desktop') && !classify(d.name);
    const cards = devices.filter(isCard);

    // Dòng số tham khảo trùng tên + chip với một máy đã đo thì gộp vào máy đó
    const sameMachine = (a, b) => normalize(a.name) === normalize(b.name) && normalize(a.cpu) === normalize(b.cpu) && normalize(a.gpu) === normalize(b.gpu);
    devices.forEach((d) => {
      if (d.measured || d.chipOnly) return;
      const host = cards.find((c) => sameMachine(c, d));
      if (!host) return;
      d.mergedInto = host.id;
      host.refScores = host.refScores || {};
      Object.keys(d.scores).forEach((tid) => { if (!host.scores[tid]) host.refScores[tid] = d.scores[tid]; });
    });

    const cardNames = {};
    cards.forEach((c) => { const k = normalize(c.name); cardNames[k] = (cardNames[k] || 0) + 1; });

    // --- 3. Danh mục metric ---
    const METRICS = {};
    LAB.SPECS.concat(...LAB.STATIC_SECTIONS.map((s) => [].concat(...s.groups.map((g) => g.metrics.map((m) => Object.assign({ category: s.id, groupTitle: s.title }, m))))))
      .forEach((m) => { METRICS[m.key] = Object.assign({ category: m.category || 'specs' }, m); });

    // --- 4. Biểu đồ so sánh cho từng bài test của một máy ---
    function buildChart(dev, tid, ref) {
      const t = TESTS[tid];
      const sk = seriesKeys(t);
      const mainIdx = sk.length - 1; // xếp theo cột cuối (vd Đa nhân), giống chart trong bài
      const pool = devices.filter((d) => d.group === dev.group && d.scores[tid] && d.id !== dev.id && !d.mergedInto);
      const self = { name: deviceLabel(dev, t), values: (ref ? dev.refScores : dev.scores)[tid], highlight: true, ref: !!ref, measured: !ref };
      const items = [self].concat(pool.map((d) => ({ name: deviceLabel(d, t), values: d.scores[tid], highlight: false, ref: !d.measured, measured: d.measured, id: isCard(d) ? d.id : null })));
      items.sort((a, b) => (t.lowerBetter ? a.values[mainIdx] - b.values[mainIdx] : b.values[mainIdx] - a.values[mainIdx]));
      // Thứ hạng chỉ tính trên các máy Tinh tế tự đo
      const measuredItems = items.filter((it) => it.measured);
      const rank = self.measured ? { rank: measuredItems.indexOf(self) + 1, total: measuredItems.length } : null;
      return {
        testKey: tid, title: t.title, subtitle: t.sub || '', unit: t.unit || '', lowerBetter: t.lowerBetter,
        category: t.category, series: sk, items, rank, ref: !!ref, decimals: null,
      };
    }

    // --- 5. Dựng danh sách máy cho giao diện ---
    const laptops = cards.map((dev) => {
      const charts = Object.keys(dev.scores).map((tid) => buildChart(dev, tid, false))
        .concat(Object.keys(dev.refScores || {}).map((tid) => buildChart(dev, tid, true)))
        .sort((a, b) => LAB.SECTION_ORDER.indexOf(a.category) - LAB.SECTION_ORDER.indexOf(b.category) || a.title.localeCompare(b.title, 'vi'));
      const raw = { cpu: dev.cpu, gpu: dev.gpu };
      const l = {
        id: dev.id, dev, raw, v: {},
        name: dev.name,
        // Nhiều cấu hình cùng tên (vd Acer Nitro ProPanel 3050/4050/5050): thêm chip vào tên hiển thị
        variant: cardNames[normalize(dev.name)] > 1 ? [dev.cpu, dev.gpu].filter(Boolean).join(' · ') : '',
        brand: detectBrand(dev.name),
        model: '', tester: '', date: null, dateLabel: '', image: '', review: '', notes: '',
        charts,
      };
      charts.forEach((ch) => {
        if (ch.ref) return;
        const hl = ch.items.find((i) => i.highlight);
        ch.series.forEach((s, si) => {
          const key = ch.testKey + '.' + s.key;
          l.v[key] = hl.values[si];
          if (!METRICS[key]) {
            const t = TESTS[ch.testKey];
            METRICS[key] = {
              key, dynamic: true, testKey: ch.testKey, seriesKey: s.key, label: s.label, unit: t.unit, lowerBetter: t.lowerBetter,
              category: t.category, testTitle: t.title, groupTitle: t.title,
              fullLabel: s.key === 'score' ? t.title : t.title + ' – ' + s.label,
            };
          }
        });
      });
      l.testCount = charts.length;
      l.search = normalize([dev.name, l.brand, dev.cpu, dev.gpu].concat(charts.map((c) => c.title)).join(' '));
      return l;
    });
    Object.values(METRICS).forEach((m) => { if (!m.dynamic) m.fullLabel = (m.groupTitle && m.category !== 'specs' ? m.groupTitle + ' – ' : '') + m.label; });

    // --- 6. Thống kê để sắp xếp & xếp hạng trên trang chủ (chỉ máy Tinh tế đo) ---
    const stats = {};
    Object.keys(METRICS).forEach((k) => {
      const vals = laptops.map((l) => l.v[k]).filter((x) => x != null);
      if (vals.length) stats[k] = { values: vals, max: Math.max(...vals), min: Math.min(...vals) };
    });
    const catOrder = LAB.SECTION_ORDER;
    const sorts = Object.values(METRICS)
      .filter((m) => !m.noRank && m.type !== 'text' && stats[m.key] && stats[m.key].values.length >= 2)
      .sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.fullLabel.localeCompare(b.fullLabel, 'vi'))
      .map((m) => ({ id: 'm:' + m.key, label: m.fullLabel + (m.lowerBetter ? ' (thấp = tốt)' : ''), category: m.category }));

    const byId = {};
    laptops.forEach((l) => { byId[l.id] = l; });

    const index = { source: loaded.source, stale: !!loaded.stale, error: loaded.error, commitDate: kho.updated || null };
    return { laptops, byId, devices, tests: TESTS, stats, metrics: METRICS, sorts, issues, index, repo: REPO, branch: BRANCH, khoPath: KHO_PATH };
  };

  LAB.clearIndexCache = function () { LS.del(CACHE_KEY); };

  // Thứ hạng & % thanh so sánh của 1 giá trị
  LAB.rankOf = function (db, key, value) {
    const meta = db.metrics[key] || {};
    const st = db.stats[key];
    if (!st || value == null) return null;
    const better = st.values.filter((x) => (meta.lowerBetter ? x < value : x > value)).length;
    let pct;
    if (meta.lowerBetter) pct = value > 0 ? (st.min / value) * 100 : 100;
    else pct = st.max > 0 ? (value / st.max) * 100 : 0;
    return { rank: better + 1, total: st.values.length, pct: Math.max(3, Math.min(100, pct)) };
  };

  LAB.util = { toNumber, parseDuration, formatDuration, fmtNumber, normalize, slugify, parseDate, fmtDate, esc, safeUrl, splitName, classify };
})();
