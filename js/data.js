/*
 * Đọc & xử lý dữ liệu từ repo GitHub.
 * ------------------------------------------------------------------
 * - Lấy danh sách file qua GitHub API (1–2 request), tải nội dung từ raw.githubusercontent.com
 *   theo commit cố định → lưu cache trong trình duyệt, lần sau chỉ tải file mới/đã sửa.
 * - Nếu GitHub API bị giới hạn: dùng cache cũ, hoặc dự phòng qua jsDelivr CDN.
 * - Mỗi thư mục con trong data/ = 1 máy được review. Máy có "highlight": true trong
 *   biểu đồ là máy chính; các máy còn lại là máy so sánh trong bài.
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

  const isTruthy = (v) => v === true || /^(1|x|true|yes|co|có|an|ẩn)$/i.test(String(v == null ? '' : v).trim());

  function mostCommon(arr) {
    const count = new Map();
    let best = null;
    let bestN = 0;
    arr.forEach((x) => {
      const k = normalize(x);
      const n = (count.get(k) || 0) + 1;
      count.set(k, n);
      if (n > bestN) { bestN = n; best = x; }
    });
    return best;
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

  // "2026-07-rog-strix-scar-18" → { date: 1/7/2026, label: "07/2026", rest: "rog-strix-scar-18" }
  function parseFolder(dir) {
    const last = String(dir || '').split('/').pop();
    const m = last.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?[-_ ]?(.*)$/);
    if (!m || +m[2] < 1 || +m[2] > 12) return { date: null, label: '', rest: last };
    const date = new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 1);
    return { date, label: m[3] ? fmtDate(date) : pad2(m[2]) + '/' + m[1], rest: m[4] || '' };
  }

  const prettyFolder = (s) => String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

  /* ================= Nhận diện bài test ================= */

  const ALIASES = {};
  Object.keys(CFG.testAliases || {}).forEach((k) => { ALIASES[compact(k)] = compact(CFG.testAliases[k]); });

  function testKeyOf(title) {
    const k = compact(title) || 'khac';
    return ALIASES[k] || k;
  }

  function categoryOf(title, unit) {
    if (/fps/i.test(unit || '')) return 'games';
    const t = compact(title);
    const c = LAB.CATEGORIES.find((x) => x.match && x.match.test(t));
    return c ? c.id : 'other';
  }

  function seriesKeyOf(label) {
    const s = slugify(label);
    if (!s || /^(overall-score|overall|score|diem|diem-tong|tong-diem|ket-qua)$/.test(s)) return 'score';
    return s;
  }

  const KNOWN_TESTS = [
    ['cinebench', 'Cinebench'], ['geekbench', 'Geekbench'], ['pcmark', 'PCMark'], ['procyon', 'Procyon'],
    ['timespy', 'Time Spy'], ['firestrike', 'Fire Strike'], ['steelnomad', 'Steel Nomad'], ['wildlife', 'Wild Life'],
    ['cyberpunk', 'Cyberpunk'],
  ];
  function knownTest(s) {
    const t = compact(s);
    const hit = KNOWN_TESTS.find((k) => t.includes(k[0]));
    return hit ? hit[1] : null;
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

  /* ================= Tải dữ liệu từ GitHub ================= */

  const GH = CFG.github;
  const REPO = GH.owner + '/' + GH.repo;
  const BRANCH = GH.branch || 'main';
  const DATA_DIR = String(GH.dataDir || 'data').replace(/^\/+|\/+$/g, '');
  const META_DIR = String(GH.metaDir || 'laptops').replace(/^\/+|\/+$/g, '');
  const INDEX_KEY = 'lab:index:' + REPO + '@' + BRANCH;
  const BLOB_PREFIX = 'lab:blob:';

  const encPath = (p) => p.split('/').map(encodeURIComponent).join('/');
  const isWanted = (p) => /\.json$/i.test(p) && (p.startsWith(DATA_DIR + '/') || p.startsWith(META_DIR + '/'));

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const e = new Error('HTTP ' + res.status + (res.status === 403 || res.status === 429 ? ' (GitHub giới hạn lượt truy cập)' : ''));
      e.status = res.status;
      throw e;
    }
    return res.json();
  }

  async function loadIndex(force) {
    const cached = LS.get(INDEX_KEY);
    const maxAge = (CFG.cacheMinutes == null ? 10 : CFG.cacheMinutes) * 60000;
    if (!force && cached && cached.source === 'github' && Date.now() - cached.time < maxAge) return cached;
    try {
      const br = await getJSON('https://api.github.com/repos/' + REPO + '/branches/' + encodeURIComponent(BRANCH));
      const sha = br.commit.sha;
      const commitDate = br.commit.commit && br.commit.commit.committer ? br.commit.commit.committer.date : null;
      if (cached && cached.source === 'github' && cached.sha === sha) {
        cached.time = Date.now();
        LS.set(INDEX_KEY, cached);
        return cached;
      }
      const tree = await getJSON('https://api.github.com/repos/' + REPO + '/git/trees/' + sha + '?recursive=1');
      const files = tree.tree.filter((t) => t.type === 'blob' && isWanted(t.path)).map((t) => ({ path: t.path, sha: t.sha }));
      const idx = { source: 'github', sha, commitDate, time: Date.now(), files, truncated: !!tree.truncated };
      LS.set(INDEX_KEY, idx);
      return idx;
    } catch (err) {
      console.warn('[Laptop Lab] GitHub API lỗi:', err);
      if (cached) return Object.assign({}, cached, { stale: true, error: err.message });
      try {
        const list = await getJSON('https://data.jsdelivr.com/v1/packages/gh/' + REPO + '@' + encodeURIComponent(BRANCH) + '?structure=flat');
        const files = (list.files || [])
          .map((f) => ({ path: String(f.name).replace(/^\/+/, ''), sha: 'jsd-' + f.hash }))
          .filter((f) => isWanted(f.path));
        return { source: 'jsdelivr', sha: null, time: Date.now(), files, stale: true, error: err.message };
      } catch (err2) {
        if (window.LAB && window.LAB.GITHUB_SNAPSHOT) {
          const snap = window.LAB.GITHUB_SNAPSHOT;
          const files = Object.keys(snap).map((k) => ({ path: k, sha: 'snap-' + slugify(k) }));
          return { source: 'snapshot', sha: 'snapshot', time: Date.now(), files, stale: true, error: err.message };
        }
        throw err;
      }
    }
  }

  function fileUrl(idx, path) {
    if (idx.source === 'github' && idx.sha) return 'https://raw.githubusercontent.com/' + REPO + '/' + idx.sha + '/' + encPath(path);
    return 'https://cdn.jsdelivr.net/gh/' + REPO + '@' + encodeURIComponent(BRANCH) + '/' + encPath(path);
  }

  async function loadFiles(idx, onProgress) {
    const files = idx.files;
    const out = new Array(files.length);
    let next = 0;
    let done = 0;
    async function worker() {
      while (next < files.length) {
        const n = next++;
        const f = files[n];
        const key = BLOB_PREFIX + f.sha;
        let text = null;
        if (idx.source === 'snapshot' && window.LAB && window.LAB.GITHUB_SNAPSHOT) {
          const snapData = window.LAB.GITHUB_SNAPSHOT[f.path];
          if (snapData != null) text = typeof snapData === 'string' ? snapData : JSON.stringify(snapData);
        }
        if (text == null) {
          try { text = localStorage.getItem(key); } catch (e) { /* bỏ qua */ }
        }
        if (text == null) {
          try {
            const res = await fetch(fileUrl(idx, f.path));
            if (!res.ok) throw new Error('HTTP ' + res.status);
            text = await res.text();
            try { localStorage.setItem(key, text); } catch (e) { /* bỏ qua */ }
          } catch (e) {
            if (window.LAB && window.LAB.GITHUB_SNAPSHOT && window.LAB.GITHUB_SNAPSHOT[f.path]) {
              const snapData = window.LAB.GITHUB_SNAPSHOT[f.path];
              text = typeof snapData === 'string' ? snapData : JSON.stringify(snapData);
            } else {
              out[n] = { path: f.path, error: 'Không tải được file (' + e.message + ')' };
            }
          }
        }
        if (text != null) out[n] = { path: f.path, text };
        done++;
        if (onProgress) onProgress(done, files.length);
      }
    }
    await Promise.all(Array.from({ length: Math.min(8, files.length) }, worker));
    // Dọn cache của các file đã bị xoá / sửa
    const keep = new Set(files.map((f) => BLOB_PREFIX + f.sha));
    LS.keys(BLOB_PREFIX).forEach((k) => { if (!keep.has(k)) LS.del(k); });
    return out;
  }

  function parseJSON(text) {
    if (typeof text === 'object' && text !== null) return { data: text };
    text = String(text).replace(/^\uFEFF/, '');
    try { return { data: JSON.parse(text) }; } catch (e1) {
      try {
        return { data: JSON.parse(text.replace(/,(\s*[}\]])/g, '$1')), warning: 'Có dấu phẩy thừa trước } hoặc ] – web vẫn đọc được nhưng công cụ render video có thể báo lỗi.' };
      } catch (e2) {
        return { error: e1.message };
      }
    }
  }

  /* ================= Thông tin máy (laptops/*.json) ================= */

  // Làm phẳng: { display: { size: 16 } } → { display_size: 16 }
  function flattenMeta(meta) {
    const raw = {};
    Object.keys(meta || {}).forEach((k) => {
      const v = meta[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.keys(v).forEach((k2) => { raw[k.toLowerCase() + '_' + k2.toLowerCase()] = v[k2]; });
      } else raw[k.toLowerCase()] = v;
    });
    if (raw.charger_w != null && raw.battery_charger_w == null) raw.battery_charger_w = raw.charger_w;
    Object.keys(raw).forEach((k) => { if (raw[k] != null && typeof raw[k] !== 'string') raw[k] = String(raw[k]); });
    return raw;
  }

  function staticNumeric(meta, raw) {
    const t = meta.type || 'number';
    if (t === 'text') return null;
    if (t === 'duration') return parseDuration(raw);
    return toNumber(raw);
  }

  /* ================= Dựng cơ sở dữ liệu ================= */

  LAB.loadData = async function (opts) {
    opts = opts || {};
    const idx = await loadIndex(opts.force);
    const files = await loadFiles(idx, opts.onProgress);

    const issues = [];
    const addIssue = (level, path, msg) => issues.push({ level, path, msg });
    if (idx.truncated) addIssue('error', '', 'Repo quá lớn, GitHub trả về danh sách file không đầy đủ.');

    // --- 1. Đọc file ---
    const rawCharts = [];
    const metas = {};
    files.forEach((f) => {
      if (!f) return;
      if (f.error) { addIssue('error', f.path, f.error); return; }
      const p = parseJSON(f.text);
      if (p.error) { addIssue('error', f.path, 'File JSON bị lỗi cú pháp nên bị bỏ qua: ' + p.error); return; }
      if (p.warning) addIssue('warn', f.path, p.warning);
      if (f.path.startsWith(META_DIR + '/')) {
        const id = slugify(f.path.slice(META_DIR.length + 1).replace(/\.json$/i, ''));
        metas[id] = { data: p.data || {}, path: f.path, used: false };
        return;
      }
      const rel = f.path.slice(DATA_DIR.length + 1);
      const cut = rel.lastIndexOf('/');
      rawCharts.push({ path: f.path, dir: cut >= 0 ? rel.slice(0, cut) : '', file: rel.slice(cut + 1), data: p.data });
    });

    // --- 2. Chuẩn hoá biểu đồ & nhóm theo máy ---
    const groups = {};
    rawCharts.forEach((c) => {
      const d = c.data;
      if (!d || !Array.isArray(d.items)) { addIssue('warn', c.path, 'Không có danh sách "items" – bỏ qua.'); return; }
      const title = String(d.title || c.file.replace(/\.json$/i, '')).trim();
      const unit = String(d.unit || '').trim();
      const subtitle = String(d.subtitle || '').trim();
      const lowerBetter = /thap.*tot|lower.*better/.test(normalize(subtitle));
      const labels = Array.isArray(d.series) ? d.series.map((s) => String(s)) : [];

      const items = d.items
        .filter((it) => it && it.name != null)
        .map((it) => ({
          name: String(it.name).trim(),
          values: (Array.isArray(it.values) ? it.values : [it.value]).map(toNumber),
          highlight: isTruthy(it.highlight),
        }));
      if (!items.length) { addIssue('warn', c.path, 'Biểu đồ không có máy nào – bỏ qua.'); return; }

      const n = Math.max(labels.length, ...items.map((i) => i.values.length), 1);
      const usedKeys = {};
      const series = Array.from({ length: n }, (_, i) => {
        const label = labels[i] || (n === 1 ? (/fps/i.test(unit) ? 'FPS' : 'Điểm') : 'Kết quả ' + (i + 1));
        let key = labels[i] ? seriesKeyOf(label) : n === 1 ? 'score' : 's' + (i + 1);
        if (usedKeys[key]) key += '-' + (i + 1);
        usedKeys[key] = true;
        return { label, key };
      });

      const chart = {
        path: c.path, file: c.file, dir: c.dir, title, subtitle, unit, lowerBetter,
        testKey: testKeyOf(title), category: categoryOf(title, unit), series, items,
        decimals: typeof d.decimals === 'number' ? d.decimals : null,
      };

      const names = items.map((i) => normalize(i.name));
      const dupIdx = names.findIndex((nm, i) => names.indexOf(nm) !== i);
      if (dupIdx >= 0) addIssue('warn', c.path, 'Có 2 máy trùng tên "' + items[dupIdx].name + '" trong cùng biểu đồ – nên ghi thêm năm/đời máy để người đọc phân biệt.');

      const ft = knownTest(c.file);
      const tt = knownTest(title);
      if (ft && tt && ft !== tt) addIssue('warn', c.path, 'Tên file gợi ý bài test "' + ft + '" nhưng tiêu đề biểu đồ là "' + title + '" – kiểm tra xem có nhầm tiêu đề hay số liệu không.');

      const hl = items.find((i) => i.highlight);
      if (!hl) { addIssue('warn', c.path, 'Không có máy nào "highlight": true nên không biết đây là kết quả của máy nào – biểu đồ chưa được đưa lên web.'); return; }

      const gid = c.dir ? 'd:' + c.dir : 'r:' + slugify(splitName(hl.name).base || hl.name);
      (groups[gid] = groups[gid] || { gid, dir: c.dir, charts: [] }).charts.push(chart);
    });

    // Phát hiện số liệu bị copy nhầm giữa các biểu đồ trong cùng 1 bài
    Object.values(groups).forEach((g) => {
      const sigs = {};
      g.charts.forEach((ch) => ch.series.forEach((s, si) => {
        const vals = ch.items.map((it) => it.values[si]);
        if (vals.filter((v) => v != null).length < 2) return;
        const sig = vals.join('|');
        const prev = sigs[sig];
        if (prev && prev.ch !== ch && prev.ch.testKey !== ch.testKey) {
          addIssue('warn', ch.path, 'Số liệu "' + ch.title + ' – ' + s.label + '" giống hệt "' + prev.ch.title + ' – ' + prev.label + '" (' + prev.ch.file + '). Nhiều khả năng bị copy nhầm.');
        } else if (!prev) sigs[sig] = { ch, label: s.label };
      }));
    });

    // --- 3. Danh mục metric ---
    const METRICS = {};
    const testTitles = {};
    LAB.SPECS.concat(...LAB.STATIC_SECTIONS.map((s) => [].concat(...s.groups.map((g) => g.metrics.map((m) => Object.assign({ category: s.id, groupTitle: s.title }, m))))))
      .forEach((m) => { METRICS[m.key] = Object.assign({ category: m.category || 'specs' }, m); });

    // --- 4. Dựng danh sách máy ---
    const laptops = [];
    Object.values(groups).forEach((g) => {
      const splits = g.charts.map((ch) => splitName(ch.items.find((i) => i.highlight).name));
      const folder = parseFolder(g.dir);
      const autoName = mostCommon(splits.map((s) => s.base).filter(Boolean)) || prettyFolder(folder.rest || g.dir);
      const hw = [].concat(...splits.map((s) => s.hw)).map(cleanHw);
      const id = g.dir ? slugify(g.dir) : g.gid.slice(2);

      const metaEntry = metas[id];
      if (metaEntry) metaEntry.used = true;
      const raw = flattenMeta(metaEntry ? metaEntry.data : {});
      if (isTruthy(raw.hidden)) return;

      raw.cpu = raw.cpu || mostCommon(hw.filter((h) => classify(h) === 'cpu')) || '';
      raw.gpu = raw.gpu || mostCommon(hw.filter((h) => classify(h) === 'gpu')) || '';
      const name = raw.name || autoName;
      const metaDate = parseDate(raw.test_date);

      const l = {
        id, dir: g.dir, raw, v: {},
        name,
        brand: raw.brand || detectBrand(name + ' ' + g.dir),
        model: raw.model || '',
        tester: raw.tester || '',
        date: metaDate || folder.date,
        dateLabel: metaDate ? fmtDate(metaDate) : folder.label,
        image: safeUrl(raw.image_url),
        review: safeUrl(raw.review_url),
        notes: raw.notes || '',
        hasMeta: !!metaEntry,
        metaPath: META_DIR + '/' + id + '.json',
        charts: g.charts.slice().sort((a, b) => a.title.localeCompare(b.title, 'vi')),
      };

      // Số liệu tĩnh (màn hình, pin…)
      Object.keys(METRICS).forEach((k) => {
        const val = staticNumeric(METRICS[k], raw[k]);
        if (val != null) l.v[k] = val;
      });

      // Số liệu benchmark: lấy giá trị của máy "highlight"
      l.charts.forEach((ch) => {
        const h = ch.items.find((i) => i.highlight);
        const firstKey = ch.testKey + '.' + ch.series[0].key;
        if (firstKey in l.v) {
          ch.duplicate = true;
          addIssue('warn', ch.path, 'Máy này đã có biểu đồ khác cùng bài test "' + ch.title + '" – biểu đồ này không được tính vào xếp hạng.');
          return;
        }
        ch.series.forEach((s, si) => {
          const val = h.values[si];
          if (val == null) return;
          const key = ch.testKey + '.' + s.key;
          l.v[key] = val;
          (testTitles[ch.testKey] = testTitles[ch.testKey] || []).push(ch.title);
          if (!METRICS[key]) {
            METRICS[key] = { key, dynamic: true, testKey: ch.testKey, seriesKey: s.key, label: s.label, unit: ch.unit, lowerBetter: ch.lowerBetter, decimals: ch.decimals, category: ch.category };
          }
        });
      });

      l.testCount = l.charts.filter((c) => !c.duplicate).length;
      l.search = normalize([name, l.brand, l.model, raw.cpu, raw.gpu, g.dir, raw.display_panel].concat(g.charts.map((ch) => ch.items.find((i) => i.highlight).name)).join(' '));
      laptops.push(l);
    });

    // Tiêu đề hiển thị của từng bài test = tiêu đề xuất hiện nhiều nhất
    Object.values(METRICS).forEach((m) => {
      if (!m.dynamic) return;
      m.testTitle = mostCommon(testTitles[m.testKey] || [m.testKey]);
      m.groupTitle = m.testTitle;
      m.fullLabel = m.seriesKey === 'score' ? m.testTitle : m.testTitle + ' – ' + m.label;
    });
    Object.values(METRICS).forEach((m) => { if (!m.dynamic) m.fullLabel = (m.groupTitle && m.category !== 'specs' ? m.groupTitle + ' – ' : '') + m.label; });

    Object.values(metas).forEach((m) => {
      if (!m.used) addIssue('warn', m.path, 'File thông tin không khớp với thư mục nào trong ' + DATA_DIR + '/ – tên file phải trùng tên thư mục chứa biểu đồ của máy.');
    });

    // --- 5. Thống kê để xếp hạng ---
    const stats = {};
    Object.keys(METRICS).forEach((k) => {
      const vals = laptops.map((l) => l.v[k]).filter((x) => x != null);
      if (vals.length) stats[k] = { values: vals, max: Math.max(...vals), min: Math.min(...vals) };
    });

    // Các kiểu sắp xếp: chỉ những bài test có từ 2 máy trở lên
    const catOrder = LAB.SECTION_ORDER;
    const sorts = Object.values(METRICS)
      .filter((m) => !m.noRank && m.type !== 'text' && stats[m.key] && stats[m.key].values.length >= 2)
      .sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category) || a.fullLabel.localeCompare(b.fullLabel, 'vi'))
      .map((m) => ({ id: 'm:' + m.key, label: m.fullLabel + (m.lowerBetter ? ' (thấp = tốt)' : ''), category: m.category }));

    const byId = {};
    laptops.forEach((l) => { byId[l.id] = l; });

    return { laptops, byId, stats, metrics: METRICS, sorts, issues, index: idx, repo: REPO, branch: BRANCH, metaDir: META_DIR, dataDir: DATA_DIR };
  };

  LAB.clearIndexCache = function () { LS.del(INDEX_KEY); };

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
