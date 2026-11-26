/*
 * Xuất một biểu đồ ra ảnh PNG (nền trắng, màu Tinh tế) để dùng trong bài viết hoặc chia sẻ.
 * Vẽ bằng canvas, không cần thư viện ngoài.
 * LAB.exportChartPNG(chart, items, { filename, footer })
 *   chart: { title, subtitle, unit, lowerBetter, series[{label}] }
 *   items: [{ name, sub, values[], highlight, ref }] theo đúng thứ tự đang hiện trên trang
 */
(function () {
  'use strict';
  const LAB = window.LAB;
  const FONT = "'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
  const C = {
    bg: '#ffffff', text: '#1c1e21', muted: '#65676b', line: '#e4e6eb', track: '#e9edf3',
    hlBg: '#e7f1fe', accent: '#0768ea', other: '#9aa4b2', series: ['#0768ea', '#5aaf33', '#f59e0b'],
  };

  function wrap(ctx, text, maxW, maxLines) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !cur) cur = t;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  function fmt(v) {
    return LAB.util.fmtNumber(v);
  }

  LAB.exportChartPNG = async function (chart, items, opts) {
    opts = opts || {};
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* bỏ qua */ }
    const series = chart.series && chart.series.length ? chart.series : [{ label: '' }];
    const multi = series.length > 1;
    const W = 1200, PAD = 48, NAME_W = 400, GAP = 24, VAL_W = 110;
    const BAR_X = PAD + NAME_W + GAP;
    const BAR_MAX = W - PAD - BAR_X - VAL_W;
    const BAR_H = multi ? 16 : 22, BAR_GAP = 8;

    const measure = document.createElement('canvas').getContext('2d');
    measure.font = '600 19px ' + FONT;
    const rows = items.map((it) => {
      const name = it.name + (it.ref ? ' (tham khảo)' : '');
      const lines = wrap(measure, name, NAME_W, 2);
      const barsH = series.length * BAR_H + (series.length - 1) * BAR_GAP;
      const textH = lines.length * 24 + (it.sub ? 20 : 0);
      return { it, lines, h: Math.max(barsH, textH) + 24 };
    });

    const titleH = 44, subH = chart.subtitle ? 30 : 0, legendH = multi ? 36 : 0;
    const headH = PAD + titleH + subH + legendH + 16;
    const bodyH = rows.reduce((s, r) => s + r.h, 0);
    const H = headH + bodyH + 24 + 56;

    const scale = 2;
    const cv = document.createElement('canvas');
    cv.width = W * scale;
    cv.height = H * scale;
    const ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // Tiêu đề
    let y = PAD + 30;
    ctx.fillStyle = C.text;
    ctx.font = '700 30px ' + FONT;
    ctx.fillText(chart.title, PAD, y);
    if (chart.unit) {
      const tw = ctx.measureText(chart.title).width;
      ctx.font = '500 18px ' + FONT;
      ctx.fillStyle = C.muted;
      ctx.fillText('(' + chart.unit + ')', PAD + tw + 12, y);
    }
    y += titleH - 30;
    if (chart.subtitle) {
      ctx.font = '400 17px ' + FONT;
      ctx.fillStyle = C.muted;
      ctx.fillText(chart.subtitle, PAD, y + 20);
      y += subH;
    }
    if (multi) {
      let lx = PAD;
      ctx.font = '500 16px ' + FONT;
      series.forEach((s, i) => {
        ctx.fillStyle = C.series[i % C.series.length];
        ctx.beginPath();
        ctx.arc(lx + 7, y + 22, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.text;
        ctx.fillText(s.label, lx + 20, y + 28);
        lx += 20 + ctx.measureText(s.label).width + 28;
      });
      y += legendH;
    }
    y = headH;

    // Thang đo
    const all = [];
    items.forEach((it) => it.values.forEach((v) => { if (v != null) all.push(v); }));
    const max = all.length ? Math.max(...all) : 1;
    const min = all.length ? Math.min(...all) : 0;

    rows.forEach((r, ri) => {
      const it = r.it;
      if (it.highlight) {
        ctx.fillStyle = C.hlBg;
        ctx.fillRect(PAD - 14, y, W - 2 * PAD + 28, r.h);
        ctx.fillStyle = C.accent;
        ctx.fillRect(PAD - 14, y, 4, r.h);
      } else if (ri > 0 && !rows[ri - 1].it.highlight) {
        ctx.fillStyle = C.line;
        ctx.fillRect(PAD - 14, y, W - 2 * PAD + 28, 1);
      }
      const textBlockH = r.lines.length * 24 + (it.sub ? 20 : 0);
      let ty = y + (r.h - textBlockH) / 2 + 18;
      ctx.fillStyle = C.text;
      ctx.font = (it.highlight ? '700 ' : '500 ') + '19px ' + FONT;
      r.lines.forEach((ln) => { ctx.fillText(ln, PAD, ty); ty += 24; });
      if (it.sub) {
        ctx.font = '400 15px ' + FONT;
        ctx.fillStyle = C.muted;
        ctx.fillText(it.sub, PAD, ty - 4);
      }

      const barsH = series.length * BAR_H + (series.length - 1) * BAR_GAP;
      let by = y + (r.h - barsH) / 2;
      series.forEach((s, si) => {
        const v = it.values[si];
        ctx.fillStyle = C.track;
        ctx.fillRect(BAR_X, by, BAR_MAX, BAR_H);
        if (v != null) {
          let pct = chart.lowerBetter ? (v > 0 && min > 0 ? min / v : 1) : max > 0 ? v / max : 0;
          pct = Math.max(0.03, Math.min(1, pct));
          ctx.fillStyle = multi ? C.series[si % C.series.length] : it.highlight ? C.accent : C.other;
          ctx.fillRect(BAR_X, by, BAR_MAX * pct, BAR_H);
          ctx.fillStyle = C.text;
          ctx.font = '700 ' + (multi ? 16 : 18) + 'px ' + FONT;
          ctx.fillText(fmt(v), BAR_X + BAR_MAX + 12, by + BAR_H - (multi ? 2 : 4));
        }
        by += BAR_H + BAR_GAP;
      });
      y += r.h;
    });

    // Chân ảnh
    y += 24;
    ctx.fillStyle = C.line;
    ctx.fillRect(PAD, y, W - 2 * PAD, 1);
    ctx.font = '700 16px ' + FONT;
    ctx.fillStyle = C.accent;
    ctx.fillText('Tinh tế', PAD, y + 34);
    const bw = ctx.measureText('Tinh tế ').width;
    ctx.fillStyle = C.text;
    ctx.font = '500 16px ' + FONT;
    ctx.fillText('Laptop Lab', PAD + bw, y + 34);
    if (opts.footer) {
      ctx.font = '400 15px ' + FONT;
      ctx.fillStyle = C.muted;
      ctx.textAlign = 'right';
      ctx.fillText(opts.footer, W - PAD, y + 34);
      ctx.textAlign = 'left';
    }

    const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Trình duyệt không tạo được ảnh');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (opts.filename || LAB.util.slugify(chart.title) || 'bieu-do') + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
})();
