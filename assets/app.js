/* 洪小姐的工作台 — 应用逻辑 */
(function () {
'use strict';

const K = window.KNOWLEDGE;
let F = window.FEED || { updatedAt: '', note: '', radar: [], ecom: [] };
const LS = 'hong_workbench_v1';

/* ---------- 状态 ---------- */
const defaultState = { stars: {}, tasks: {}, boards: {}, names: [], products: [], seq: 1 };
let S = load();

function load() {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return JSON.parse(JSON.stringify(defaultState));
    return Object.assign(JSON.parse(JSON.stringify(defaultState)), JSON.parse(raw));
  } catch (e) { return JSON.parse(JSON.stringify(defaultState)); }
}
function save() { localStorage.setItem(LS, JSON.stringify(S)); refreshBadges(); }
async function loadFeed() {
  try {
    const res = await fetch('feed.json', { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      if (j && Array.isArray(j.radar)) { F = j; return; }
    }
  } catch (e) { /* file:// 或离线：退回本地打包的 data/feed.js */ }
}

/* ---------- 工具 ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function nl2br(t) { return esc(t).replace(/\n/g, '<br>'); }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1900);
}
const PLAT = {
  douyin: { n: '抖音', c: 't-douyin' }, xhs: { n: '小红书', c: 't-xhs' },
  wx: { n: '微信视频号', c: 't-wx' }, ecom: { n: '电商', c: 't-ecom' },
  policy: { n: '政策法规', c: 't-policy' }, report: { n: '行业报告', c: 't-report' },
  brand: { n: '品牌案例', c: 't-brand' }
};
function relClass(s) { return s >= 75 ? 'rel-h' : s >= 55 ? 'rel-m' : 'rel-l'; }
function relWord(s) { return s >= 75 ? '可靠' : s >= 55 ? '参考' : '存疑'; }

/* ---------- 星标 ---------- */
function isStar(id) { return !!S.stars[id]; }
function toggleStar(id, payload) {
  if (S.stars[id]) delete S.stars[id];
  else S.stars[id] = Object.assign({ at: new Date().toISOString().slice(0, 10) }, payload);
  save(); render();
}
function refreshBadges() {
  $('#badge-radar').textContent = F.radar.length;
  $('#badge-ecom').textContent = F.ecom.length;
  $('#badge-lib').textContent = S.products.length;
  $('#badge-star').textContent = Object.keys(S.stars).length;
}

/* ---------- 路由 ---------- */
const VIEWS = {
  dashboard: ['今日看板', '今天要看什么、要学什么、要决定什么。'],
  radar: ['热点雷达', '各平台大健康方向的热点与政策，点开看完整信息源与可靠度判断。'],
  ecom: ['电商爆款', '按平台看在卖什么、卖多少钱、为什么卖得动。'],
  learn: ['学习路线', '从合规到渠道，六个模块。勾掉一条少一条。'],
  compliance: ['合规红线', '会让你返工、下架、被索赔的地方，都在这里。'],
  brand: ['品牌构思板', '想到什么记什么，自动保存在本机。'],
  color: ['配色方案库', '五套可直接落地的配色，点色块复制色值。'],
  cases: ['对标品牌', '能学什么、不能照抄什么，都标出来了。'],
  library: ['竞品资料库', '导入相似产品，分类归档，一键做合规与定位分析。'],
  stars: ['我的星标', '你收藏过的所有东西。']
};
let cur = 'dashboard';
function go(v) {
  cur = v;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $$('.view').forEach(x => x.classList.add('hidden'));
  $('#view-' + v).classList.remove('hidden');
  $('#view-title').textContent = VIEWS[v][0];
  $('#view-desc').textContent = VIEWS[v][1];
  render();
  window.scrollTo(0, 0);
}

/* ---------- 渲染入口 ---------- */
function render() {
  ({
    dashboard: renderDash, radar: renderRadar, ecom: renderEcom, learn: renderLearn,
    compliance: renderCompliance, brand: renderBrand, color: renderColor,
    cases: renderCases, library: renderLibrary, stars: renderStars
  })[cur]();
  refreshBadges();
}

/* ================= 今日看板 ================= */
function taskStats() {
  let total = 0, done = 0;
  K.modules.forEach(m => m.tasks.forEach(t => { total++; if (S.tasks[t.id]) done++; }));
  return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
}
function renderDash() {
  const st = taskStats();
  const top = F.radar.slice().sort((a, b) => b.reliability.score - a.reliability.score).slice(0, 4);
  const hi = K.compliance.rules.filter(r => r.lvl === 'hi').slice(0, 4);
  const todo = (S.boards['b_todo'] || '').trim();

  $('#view-dashboard').innerHTML = `
  <div class="grid g4">
    <div class="card stat"><span class="num">${F.radar.length}</span><span class="lbl">在库热点情报</span></div>
    <div class="card stat"><span class="num">${F.ecom.length}</span><span class="lbl">电商爆款样本</span></div>
    <div class="card stat"><span class="num">${st.pct}<small style="font-size:15px">%</small></span>
      <span class="lbl">学习进度 ${st.done}/${st.total}</span>
      <div class="progress"><i style="width:${st.pct}%"></i></div></div>
    <div class="card stat"><span class="num">${S.products.length}</span><span class="lbl">资料库竞品数</span></div>
  </div>

  <div class="sec-title">先看这几条（按信源可靠度排序）</div>
  ${top.map(itemCard).join('')}

  <div class="grid g2" style="margin-top:22px">
    <div>
      <div class="sec-title">高危合规红线</div>
      ${hi.map(r => `<div class="risk"><h4>${esc(r.title)}</h4><p>${esc(r.body)}</p></div>`).join('')}
    </div>
    <div>
      <div class="sec-title">我的待决策</div>
      <div class="card">
        ${todo ? `<div class="p">${nl2br(todo)}</div>`
              : '<div class="muted">还没写。去「品牌构思板 → 待决策清单」记下现在卡在哪。</div>'}
      </div>
      <div class="sec-title">学习进度</div>
      <div class="card">
        ${K.modules.map(m => {
          const d = m.tasks.filter(t => S.tasks[t.id]).length, p = Math.round(d / m.tasks.length * 100);
          return `<div style="margin-bottom:11px">
            <div style="display:flex;font-size:12.5px;margin-bottom:3px">
              <span>${esc(m.title.split('（')[0])}</span>
              <span style="margin-left:auto;color:var(--ink-3)">${d}/${m.tasks.length}</span></div>
            <div class="progress"><i style="width:${p}%"></i></div></div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
  bindItems();
}

/* ================= 热点雷达 ================= */
let radarFilter = 'all', radarQ = '';
function itemCard(it) {
  const p = PLAT[it.platform] || { n: it.platform, c: 't-report' };
  return `<div class="item" data-id="${it.id}">
    <div class="item-head">
      <span class="tag ${p.c}">${esc(p.n)}</span>
      <span class="item-title js-open" data-id="${it.id}">${esc(it.title)}</span>
      <button class="star ${isStar(it.id) ? 'on' : ''} js-star" data-id="${it.id}" title="收藏">★</button>
    </div>
    <div class="item-sum">${esc(it.summary)}</div>
    <div class="subtags">${(it.tags || []).map(t => `<span class="subtag">#${esc(t)}</span>`).join('')}</div>
    <div class="item-foot">
      ${it.metric ? `<span class="metric">${esc(it.metric)}</span>` : ''}
      <span class="src">${esc(it.source.publisher)} · ${esc(it.source.date || '')}</span>
      <span class="spacer"></span>
      <span class="rel ${relClass(it.reliability.score)}" title="${esc(it.reliability.basis)}">
        可靠度 ${it.reliability.score} · ${relWord(it.reliability.score)}</span>
      <button class="btn-open js-open" data-id="${it.id}">展开详情</button>
    </div>
  </div>`;
}
function renderRadar() {
  const cats = [['all', '全部'], ['policy', '政策法规'], ['xhs', '小红书'], ['douyin', '抖音'],
                ['wx', '微信视频号'], ['brand', '品牌案例'], ['report', '行业报告']];
  let list = F.radar.filter(i => radarFilter === 'all' || i.platform === radarFilter);
  if (radarQ) {
    const q = radarQ.toLowerCase();
    list = list.filter(i => (i.title + i.summary + i.detail + (i.tags || []).join('')).toLowerCase().includes(q));
  }
  $('#view-radar').innerHTML = `
    <div class="filters">
      ${cats.map(c => `<button class="chip ${radarFilter === c[0] ? 'on' : ''}" data-f="${c[0]}">${c[1]}</button>`).join('')}
      <input class="search" id="q-radar" placeholder="搜索关键词…" value="${esc(radarQ)}">
    </div>
    <div class="muted" style="margin-bottom:14px">${F.note}</div>
    ${list.length ? list.map(itemCard).join('') : '<div class="empty">没有匹配的内容</div>'}`;
  $$('#view-radar .chip').forEach(b => b.onclick = () => { radarFilter = b.dataset.f; renderRadar(); });
  const q = $('#q-radar');
  q.oninput = () => { radarQ = q.value; const p = q.selectionStart; renderRadar(); const n = $('#q-radar'); n.focus(); n.setSelectionRange(p, p); };
  bindItems();
}
function bindItems() {
  $$('.js-open').forEach(b => b.onclick = () => openDetail(b.dataset.id));
  $$('.js-star').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const id = b.dataset.id;
    const src = F.radar.concat(F.ecom).find(x => x.id === id);
    toggleStar(id, src ? { title: src.title, kind: F.radar.indexOf(src) > -1 ? 'radar' : 'ecom' } : {});
  });
}
function openDetail(id) {
  const it = F.radar.concat(F.ecom).find(x => x.id === id);
  if (!it) return;
  const p = PLAT[it.platform] || { n: it.platform, c: 't-report' };
  $('#modal-body').innerHTML = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
      <span class="tag ${p.c}">${esc(p.n)}</span>
      <span class="rel ${relClass(it.reliability.score)}">可靠度 ${it.reliability.score} · ${relWord(it.reliability.score)}</span>
      <button class="star ${isStar(it.id) ? 'on' : ''} js-star" data-id="${it.id}">★</button>
    </div>
    <h2>${esc(it.title)}</h2>
    <p>${esc(it.summary || it.insight || '')}</p>
    <h4>完整信息</h4>
    <div class="quote">${esc(it.detail || '（无更多细节）')}</div>
    <h4>可靠度判断依据</h4>
    <div class="quote">${esc(it.reliability.basis)}</div>
    <h4>信息出处</h4>
    <dl class="kv">
      <dt>标题</dt><dd>${esc(it.source.name)}</dd>
      <dt>发布方</dt><dd>${esc(it.source.publisher)}</dd>
      <dt>日期</dt><dd>${esc(it.source.date || '未标注')}</dd>
      <dt>原文链接</dt><dd><a href="${esc(it.source.url)}" target="_blank" rel="noopener">${esc(it.source.url)}</a></dd>
      <dt>收录日期</dt><dd>${esc(it.date || '')}</dd>
    </dl>`;
  $('#modal-mask').classList.remove('hidden');
  $$('#modal-body .js-star').forEach(b => b.onclick = () => {
    toggleStar(b.dataset.id, { title: it.title, kind: 'radar' });
    b.classList.toggle('on', isStar(b.dataset.id));
  });
}

/* ================= 电商爆款 ================= */
let ecomFilter = 'all';
function ecomCard(it) {
  return `<div class="item" data-id="${it.id}">
    <div class="item-head">
      <span class="tag t-ecom">${esc(it.platform)}</span>
      <span class="item-title js-open" data-id="${it.id}">${esc(it.title)}</span>
      <button class="star ${isStar(it.id) ? 'on' : ''} js-star" data-id="${it.id}">★</button>
    </div>
    <div class="item-sum"><b>${esc(it.brand)}</b> ｜ 价格 ${esc(it.price)} ｜ ${esc(it.sales)}</div>
    <div class="item-sum">${esc(it.insight)}</div>
    <div class="subtags">${(it.tags || []).map(t => `<span class="subtag">#${esc(t)}</span>`).join('')}</div>
    <div class="item-foot">
      <span class="src">${esc(it.source.publisher)} · ${esc(it.source.date || '')}</span>
      <span class="spacer"></span>
      <span class="rel ${relClass(it.reliability.score)}" title="${esc(it.reliability.basis)}">
        可靠度 ${it.reliability.score} · ${relWord(it.reliability.score)}</span>
      <button class="btn-open js-open" data-id="${it.id}">展开详情</button>
    </div></div>`;
}
function renderEcom() {
  const plats = ['all'].concat(Array.from(new Set(F.ecom.map(e => e.platform))));
  const list = F.ecom.filter(e => ecomFilter === 'all' || e.platform === ecomFilter);
  $('#view-ecom').innerHTML = `
    <div class="filters">${plats.map(p =>
      `<button class="chip ${ecomFilter === p ? 'on' : ''}" data-f="${esc(p)}">${p === 'all' ? '全部平台' : esc(p)}</button>`).join('')}</div>
    ${list.map(ecomCard).join('')}`;
  $$('#view-ecom .chip').forEach(b => b.onclick = () => { ecomFilter = b.dataset.f; renderEcom(); });
  bindItems();
}

/* ================= 学习路线 ================= */
function renderLearn() {
  $('#view-learn').innerHTML = K.modules.map((m, i) => {
    const d = m.tasks.filter(t => S.tasks[t.id]).length;
    return `<div class="mod">
      <div class="mod-head">
        <span class="mod-idx">${i + 1}</span>
        <span class="mod-title">${esc(m.title)}</span>
        <span class="mod-meta">${esc(m.meta)} · ${d}/${m.tasks.length}</span>
      </div>
      <div class="p" style="margin:-2px 0 10px 34px">${esc(m.intro)}</div>
      <div style="margin-left:34px">
        ${m.tasks.map(t => `<div class="task ${S.tasks[t.id] ? 'done' : ''}" data-t="${t.id}">
          <span class="cbox">✓</span>
          <div><div class="task-t">${esc(t.t)}</div><div class="task-d">${esc(t.d)}</div></div>
        </div>`).join('')}
      </div></div>`;
  }).join('');
  $$('#view-learn .task').forEach(el => el.onclick = () => {
    const id = el.dataset.t;
    if (S.tasks[id]) delete S.tasks[id]; else S.tasks[id] = 1;
    save(); renderLearn();
  });
}

/* ================= 合规红线 ================= */
function renderCompliance() {
  const c = K.compliance;
  const lvlMap = { hi: ['lvl-hi', '高危', ''], mid: ['lvl-mid', '中危', 'warn'], low: ['lvl-low', '提示', 'info'] };
  $('#view-compliance').innerHTML = `
    <div class="card" style="margin-bottom:18px;border-left:4px solid var(--zhe)">
      <h3>为什么这一页要放在设计之前</h3>
      <div class="p">你有产线，产品做出来不是问题。真正的风险在标签和宣传：<b>原料合规是一条底线，标签合规是另一条底线，两者不能混为一谈</b>。很多品牌是包装印完了才发现"固体饮料"四个字要比商标大、警示语要占 20% 面积，直接返工报废。</div>
    </div>
    <div class="sec-title">条款清单</div>
    ${c.rules.map(r => {
      const L = lvlMap[r.lvl];
      return `<div class="risk ${L[2]}">
        <h4><span class="lvl ${L[0]}">${L[1]}</span>${esc(r.title)}</h4>
        <p>${esc(r.body)}</p>
        <p style="margin-top:7px;font-size:12px;color:var(--ink-3)">依据：${esc(r.src)} ·
          <a href="${esc(r.url)}" target="_blank" rel="noopener">查看出处</a></p>
      </div>`;
    }).join('')}

    <div class="sec-title">宣传禁用词库（包装 / 详情页 / 口播 / 达人脚本 通用）</div>
    <div class="card">
      <h3 style="color:var(--zhe)">高危词 · 几乎必被查</h3>
      <div class="wordbank">${c.banHigh.map(w => `<span class="word">${esc(w)}</span>`).join('')}</div>
      <div class="hr"></div>
      <h3 style="color:#8A6414">中危词 · 中医语境常用但易被认定暗示功效</h3>
      <div class="wordbank">${c.banMid.map(w => `<span class="word mid">${esc(w)}</span>`).join('')}</div>
      <div class="hr"></div>
      <div class="p">${esc(c.banNote)}</div>
    </div>

    <div class="sec-title">药食同源目录 106 种 · 按批次查</div>
    <div class="card">
      <h3>第一批 · 87种 · 卫法监发〔2002〕51号 · 无特殊限制</h3>
      <div class="p" style="font-size:13px">${esc(c.catalog.b1)}</div>
      <div class="hr"></div>
      <h3 style="color:var(--zhe)">第二批 · 6种 · 2019年第8号 · 仅限香辛料和调味品</h3>
      <div class="p"><b style="color:var(--zhe)">不能加进饮料、糕点</b>：${esc(c.catalog.b2)}</div>
      <div class="hr"></div>
      <h3 style="color:#8A6414">第三批 · 9种 · 2023年第9号 · 须标注不适宜人群</h3>
      <div class="p">${esc(c.catalog.b3)}<br><span class="muted">孕妇、哺乳期妇女及婴幼儿不推荐食用；党参、西洋参不宜与藜芦同用；天麻过敏体质不宜食用。</span></div>
      <div class="hr"></div>
      <h3 style="color:#8A6414">第四批 · 4种 · 2024年第4号 · 须标注不适宜人群</h3>
      <div class="p">${esc(c.catalog.b4)}</div>
    </div>`;
}

/* ================= 品牌构思板 ================= */
function renderBrand() {
  $('#view-brand').innerHTML = `
    <div class="grid g2">
      ${K.boards.map(b => `<div class="card note-card">
        <h3>${esc(b.title)}<span class="saved" id="sv-${b.id}">已保存</span></h3>
        <textarea data-b="${b.id}" placeholder="${esc(b.ph)}">${esc(S.boards[b.id] || '')}</textarea>
      </div>`).join('')}
    </div>

    <div class="sec-title">命名候选打分（1~5 分，总分越高越值得注册）</div>
    <div class="card">
      <div class="name-scroll">
      <div class="name-head">
        <span>候选名</span><span>显著性</span><span>好记</span><span>合规</span><span>可注册</span><span>总分</span><span></span>
      </div>
      <div id="name-list">${S.names.map(nameRow).join('')}</div>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn sm" id="add-name">+ 添加候选名</button>
        <span class="muted">显著性=是否独特不描述性 ｜ 好记=听一遍能否复述 ｜ 合规=有无功效暗示 ｜ 可注册=商标网查询后的把握</span>
      </div>
    </div>`;

  $$('#view-brand textarea').forEach(t => {
    let timer;
    t.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        S.boards[t.dataset.b] = t.value; save();
        const s = $('#sv-' + t.dataset.b);
        s.classList.add('show'); setTimeout(() => s.classList.remove('show'), 1200);
      }, 420);
    };
  });
  $('#add-name').onclick = () => {
    S.names.push({ id: 'n' + (S.seq++), name: '', a: 3, b: 3, c: 3, d: 3 });
    save(); renderBrand();
  };
  bindNames();
}
function nameRow(n) {
  const total = (+n.a) + (+n.b) + (+n.c) + (+n.d);
  return `<div class="name-row" data-n="${n.id}">
    <input type="text" value="${esc(n.name)}" placeholder="输入候选名…" data-k="name">
    ${['a', 'b', 'c', 'd'].map(k => `<input type="number" min="1" max="5" value="${n[k]}" data-k="${k}">`).join('')}
    <span class="score">${total}</span>
    <button class="del" data-del="${n.id}">×</button>
  </div>`;
}
function bindNames() {
  $$('.name-row').forEach(row => {
    const id = row.dataset.n, obj = S.names.find(x => x.id === id);
    row.querySelectorAll('input').forEach(inp => {
      inp.oninput = () => {
        obj[inp.dataset.k] = inp.dataset.k === 'name' ? inp.value : Math.max(1, Math.min(5, +inp.value || 1));
        row.querySelector('.score').textContent = (+obj.a) + (+obj.b) + (+obj.c) + (+obj.d);
        save();
      };
    });
    row.querySelector('.del').onclick = () => {
      S.names = S.names.filter(x => x.id !== id); save(); renderBrand();
    };
  });
}

/* ================= 配色 ================= */
function renderColor() {
  $('#view-color').innerHTML = `
    <div class="grid g2">${K.palettes.map(p => `
      <div class="pal">
        <div class="pal-bar">${p.colors.map(c =>
          `<div style="background:${c[0]}" data-hex="${c[0]}">
             <span style="color:${textOn(c[0])}">${esc(c[1])}</span></div>`).join('')}</div>
        <div class="pal-body">
          <h4>${esc(p.name)}</h4><p>${esc(p.use)}</p>
          <div class="pal-hex">${p.colors.map(c => `<code data-hex="${c[0]}">${c[0]}</code>`).join('')}</div>
        </div></div>`).join('')}
    </div>
    <div class="sec-title">配色六条规矩</div>
    <div class="card"><ul style="padding-left:18px">${K.paletteRules.map(r =>
      `<li class="p" style="margin-bottom:5px">${esc(r)}</li>`).join('')}</ul></div>`;
  $$('#view-color [data-hex]').forEach(el => el.onclick = () => {
    copy(el.dataset.hex); toast('已复制 ' + el.dataset.hex);
  });
}
function textOn(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#3A3632' : '#F7F4ED';
}
function copy(t) {
  const ta = document.createElement('textarea');
  ta.value = t; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

/* ================= 对标品牌 ================= */
function renderCases() {
  $('#view-cases').innerHTML = K.cases.map(c => `
    <div class="card" style="margin-bottom:13px">
      <div class="item-head" style="margin-bottom:8px">
        <span class="tag t-brand">${esc(c.tag)}</span>
        <span class="item-title" style="cursor:default">${esc(c.name)} · ${esc(c.what)}</span>
      </div>
      <h4 style="font-size:12px;letter-spacing:1.2px;color:var(--ink-3);margin:10px 0 6px">可以学</h4>
      <ul style="padding-left:18px">${c.learn.map(l => `<li class="p" style="margin-bottom:3px">${esc(l)}</li>`).join('')}</ul>
      <h4 style="font-size:12px;letter-spacing:1.2px;color:var(--zhe);margin:12px 0 6px">别照抄</h4>
      <div class="p" style="color:var(--zhe)">${esc(c.caution)}</div>
      <div class="item-foot"><span class="src">${esc(c.src)}</span><span class="spacer"></span>
        <a class="btn-open" href="${esc(c.url)}" target="_blank" rel="noopener">查看出处</a></div>
    </div>`).join('');
}

/* ================= 竞品资料库 ================= */
let libFilter = 'all';
function renderLibrary() {
  const cats = ['all'].concat(Array.from(new Set(S.products.map(p => p.cat).filter(Boolean))));
  const list = S.products.filter(p => libFilter === 'all' || p.cat === libFilter);
  $('#view-library').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <h3>导入一款相似产品</h3>
      <div class="form">
        <div class="grid g3">
          <div class="field"><label>产品名称 *</label><input id="p-name" placeholder="如：陈皮赤小豆薏米固体饮料"></div>
          <div class="field"><label>品牌</label><input id="p-brand" placeholder="如：某某堂"></div>
          <div class="field"><label>分类归档 *</label><input id="p-cat" placeholder="如：祛湿方向 / 睡眠方向 / 直接竞品" list="cats">
            <datalist id="cats">${cats.filter(c => c !== 'all').map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        </div>
        <div class="grid g4">
          <div class="field"><label>售价（元）</label><input id="p-price" type="number" step="0.01" placeholder="59.9"></div>
          <div class="field"><label>规格（条/袋数）</label><input id="p-count" type="number" placeholder="30"></div>
          <div class="field"><label>剂型</label><input id="p-form" placeholder="条袋冲剂 / 冻干块 / 三角包"></div>
          <div class="field"><label>渠道</label><input id="p-plat" placeholder="抖音 / 天猫 / 线下"></div>
        </div>
        <div class="field"><label>配料表 / 核心原料（顿号或逗号分隔）*</label>
          <input id="p-ing" placeholder="陈皮、赤小豆、薏苡仁、茯苓、山药"></div>
        <div class="field"><label>包装与详情页上的宣称文案（原样粘贴，用于合规扫描）</label>
          <textarea id="p-claim" placeholder="把它包装正面、详情页标题、卖点文案原样贴进来，越完整扫描越准"></textarea></div>
        <div class="grid g2">
          <div class="field"><label>包装主色（HEX，逗号分隔）</label><input id="p-color" placeholder="#2F4F4A,#D9A441,#F7F4ED"></div>
          <div class="field"><label>商品链接</label><input id="p-url" placeholder="https://…"></div>
        </div>
        <div class="field"><label>我的备注</label><textarea id="p-note" placeholder="为什么把它存进来？想学它哪里？" style="min-height:52px"></textarea></div>
        <div class="row"><button class="btn" id="p-save">存入资料库并分析</button>
          <span class="muted">数据保存在本机浏览器，记得定期用左下角「导出备份」。</span></div>
      </div>
    </div>

    <div class="filters">${cats.map(c =>
      `<button class="chip ${libFilter === c ? 'on' : ''}" data-f="${esc(c)}">${c === 'all' ? '全部分类' : esc(c)}</button>`).join('')}
    </div>
    ${list.length ? list.map(prodCard).join('') : '<div class="empty">资料库还是空的。把你看到的相似产品贴进来，会自动做合规扫描、价格定位和配色分析。</div>'}`;

  $('#p-save').onclick = addProduct;
  $$('#view-library .chip').forEach(b => b.onclick = () => { libFilter = b.dataset.f; renderLibrary(); });
  $$('[data-delp]').forEach(b => b.onclick = () => {
    if (!confirm('删除这条竞品记录？')) return;
    S.products = S.products.filter(p => p.id !== b.dataset.delp); save(); renderLibrary();
  });
  $$('[data-askp]').forEach(b => b.onclick = () => {
    copy(buildPrompt(S.products.find(p => p.id === b.dataset.askp)));
    toast('已复制深度分析请求，粘贴给我即可');
  });
  $$('#view-library .js-star').forEach(b => b.onclick = () => {
    const p = S.products.find(x => x.id === b.dataset.id);
    toggleStar(b.dataset.id, { title: p.name, kind: 'product' });
  });
}
function addProduct() {
  const g = id => ($('#' + id).value || '').trim();
  if (!g('p-name') || !g('p-ing') || !g('p-cat')) { toast('产品名称、分类、配料是必填的'); return; }
  S.products.unshift({
    id: 'p' + (S.seq++), name: g('p-name'), brand: g('p-brand'), cat: g('p-cat'),
    price: parseFloat(g('p-price')) || 0, count: parseInt(g('p-count')) || 0,
    form: g('p-form'), plat: g('p-plat'), ing: g('p-ing'), claim: g('p-claim'),
    colors: g('p-color'), url: g('p-url'), note: g('p-note'),
    at: new Date().toISOString().slice(0, 10)
  });
  save(); renderLibrary(); toast('已存入资料库');
}
function prodCard(p) {
  const a = analyze(p);
  const cols = (p.colors || '').split(/[,，\s]+/).filter(x => /^#?[0-9a-fA-F]{6}$/.test(x))
    .map(x => x[0] === '#' ? x : '#' + x);
  return `<div class="prod" style="margin-bottom:12px">
    <div class="prod-top">
      <div style="flex:1">
        <div class="prod-name">${esc(p.name)}</div>
        <div class="prod-brand">${esc(p.brand || '未填品牌')} · ${esc(p.cat)} · 收录 ${esc(p.at)}</div>
      </div>
      ${p.price ? `<div class="prod-price">¥${p.price}</div>` : ''}
      <button class="star ${isStar(p.id) ? 'on' : ''} js-star" data-id="${p.id}">★</button>
    </div>
    <div class="prod-meta">
      ${p.form ? `<span>剂型：${esc(p.form)}</span>` : ''}
      ${p.count ? `<span>规格：${p.count} 份</span>` : ''}
      ${p.plat ? `<span>渠道：${esc(p.plat)}</span>` : ''}
      ${cols.length ? `<span class="swatches">${cols.map(c => `<i style="background:${c}"></i>`).join('')}</span>` : ''}
      ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">商品链接</a>` : ''}
    </div>
    <div class="prod-meta"><span>配料：${esc(p.ing)}</span></div>
    ${p.note ? `<div class="p" style="font-size:12.5px">备注：${esc(p.note)}</div>` : ''}
    <div class="ai-box">
      <h5>◈ 智能分析（本地规则引擎：106种目录比对 + 禁用词扫描 + 色彩计算 + 同类价格对比）</h5>
      ${a.map(l => `<div class="ai-line">${l}</div>`).join('')}
      <div class="row" style="margin-top:9px">
        <button class="btn sm ghost" data-askp="${p.id}">复制深度分析请求</button>
        <button class="btn sm ghost" data-delp="${p.id}">删除</button>
      </div>
    </div></div>`;
}

/* ---------- 分析引擎 ---------- */
function splitIng(s) { return (s || '').split(/[、,，;；\/\s]+/).map(x => x.trim()).filter(Boolean); }
function catList(str) { return str.split(/\s+/).filter(Boolean); }
function analyze(p) {
  const C = K.compliance, out = [];
  const b1 = catList(C.catalog.b1), b2 = catList(C.catalog.b2), b3 = catList(C.catalog.b3), b4 = catList(C.catalog.b4);
  const ings = splitIng(p.ing);

  /* 1 原料比对 */
  const hit2 = [], hit34 = [], hit1 = [], other = [];
  ings.forEach(x => {
    const m = n => n.some(k => x.indexOf(k) > -1 || k.indexOf(x) > -1);
    if (m(b2)) hit2.push(x);
    else if (m(b3) || m(b4)) hit34.push(x);
    else if (m(b1)) hit1.push(x);
    else other.push(x);
  });
  let s1 = '<b>原料合规比对：</b>';
  if (hit1.length) s1 += `<span class="flag flag-ok">目录内无限制 ${hit1.length} 种</span>`;
  if (hit34.length) s1 += `<span class="flag flag-mid">须标注不适宜人群：${hit34.join('、')}</span>`;
  if (hit2.length) s1 += `<span class="flag flag-bad">仅限香辛料调味品，加进饮料涉嫌超范围：${hit2.join('、')}</span>`;
  if (other.length) s1 += `<span class="flag flag-mid">不在106目录，需单独核查是否为普通食品原料：${other.join('、')}</span>`;
  if (!ings.length) s1 += '未填写配料';
  out.push(s1);

  /* 2 文案扫描 */
  const text = (p.name + ' ' + (p.claim || '') + ' ' + (p.note || ''));
  const bad = C.banHigh.filter(w => text.indexOf(w) > -1);
  const mid = C.banMid.filter(w => text.indexOf(w) > -1);
  let s2 = '<b>宣称文案扫描：</b>';
  if (!bad.length && !mid.length) s2 += '<span class="flag flag-ok">未命中禁用词库</span>（注意：未命中不等于绝对合规，仍需人工复核整体语境）';
  else {
    if (bad.length) s2 += `<span class="flag flag-bad">高危 ${bad.length} 处：${bad.join('、')}</span>`;
    if (mid.length) s2 += `<span class="flag flag-mid">中危 ${mid.length} 处：${mid.join('、')}</span>`;
    s2 += `<br>对手在用这些表述，说明它要么在打擦边、要么有你没有的资质。<b>不要因为"别人也这么写"就照抄</b>，被投诉的成本你承担不起。反过来，这也是你的差异点：合规表达本身可以做成品牌调性。`;
  }
  out.push(s2);

  /* 3 价格定位 */
  if (p.price) {
    const unit = p.count ? (p.price / p.count) : 0;
    const same = S.products.filter(x => x.cat === p.cat && x.price > 0);
    const avg = same.length ? (same.reduce((a, b) => a + b.price, 0) / same.length) : 0;
    let s3 = `<b>价格定位：</b>整盒 ¥${p.price}`;
    if (unit) s3 += ` ｜ 单份 ¥${unit.toFixed(2)}`;
    if (unit) s3 += unit <= 2 ? '（属"随手买"区间，走走量和复购）'
      : unit <= 5 ? '（属年轻人日常自用主流区间，最容易起量）'
      : unit <= 10 ? '（偏高，需要强成分或强背书支撑）'
      : '（高客单，基本是礼赠或强功能定位）';
    if (same.length > 1) s3 += `<br>同分类「${esc(p.cat)}」已收录 ${same.length} 款，均价 ¥${avg.toFixed(1)}，本品${p.price > avg ? '高于' : '低于'}均价 ${Math.abs(p.price - avg).toFixed(1)} 元。`;
    out.push(s3);
  }

  /* 4 配色 */
  const cols = (p.colors || '').split(/[,，\s]+/).filter(x => /^#?[0-9a-fA-F]{6}$/.test(x))
    .map(x => x[0] === '#' ? x : '#' + x);
  if (cols.length) {
    const info = cols.map(hexInfo);
    const avgS = info.reduce((a, b) => a + b.s, 0) / info.length;
    let s4 = `<b>包装配色分析：</b>${info.map(i => `${i.hex} ${i.name}`).join(' ｜ ')}<br>平均饱和度 ${Math.round(avgS)}%，`;
    s4 += avgS < 30 ? '属低饱和莫兰迪国风区间，符合当前新中式主流，年轻客群接受度高。'
      : avgS < 55 ? '中等饱和，偏传统国潮，在货架上醒目但高级感一般。'
      : '高饱和，视觉冲击强但容易显"土味复古"，年轻化定位慎用。';
    if (cols.length > 3) s4 += ' 主色超过 3 种，视觉容易散——食品类"干净"比"丰富"重要。';
    out.push(s4);
  }

  /* 5 结构性建议 */
  const tips = [];
  if (ings.length > 5) tips.push('配料超过 5 味，用户理解成本高。当前平台数据显示用户偏好低理解门槛、认得出的单一食材组合。');
  if (ings.length && ings.length <= 3) tips.push('配料精简，走的是"单一超级食材"路线（类似楂堆的山楂打法），差异化好做但需要强内容支撑。');
  if (hit2.length) tips.push('它使用了仅限香辛料的物质，这是实打实的违规点——可作为你在合规上建立优势的对照，但别声张，也别学。');
  if (!p.claim) tips.push('没填宣称文案，建议把它的详情页标题和包装正面文字补上，扫描才准。');
  if (p.count && p.count >= 30) tips.push('大包装数（' + p.count + '份）+ 低单份价，是当前养生冲饮的主流成交结构，可作为你的规格参考。');
  if (tips.length) out.push('<b>可借鉴 / 提醒：</b>' + tips.join('<br>· '));

  out.push('<span style="color:var(--ink-3);font-size:11.5px">以上为本地规则引擎输出，用于快速筛查，不构成法律意见。正式上市前请以标准原文和属地市监部门口径为准。需要更深的配方逻辑、人群和定价推演，点「复制深度分析请求」发给我。</span>');
  return out;
}
function hexInfo(hex) {
  const c = hex.replace('#', '');
  let r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
    h *= 60;
  }
  s = Math.round(s * 100);
  let name;
  if (s < 12) name = l > .8 ? '茶白/宣纸白' : l > .5 ? '灰调' : l > .25 ? '墨灰' : '墨黑';
  else if (h < 15 || h >= 345) name = '朱砂红/绛红';
  else if (h < 40) name = '赭石/棕调';
  else if (h < 60) name = '杏黄/土黄';
  else if (h < 90) name = '柠绿';
  else if (h < 160) name = '木青/竹青';
  else if (h < 200) name = '青瓷青';
  else if (h < 250) name = '黛蓝/石青';
  else if (h < 290) name = '雾紫';
  else name = '藕粉/品红';
  return { hex, h: Math.round(h), s, name };
}
function buildPrompt(p) {
  return `请帮我深度分析这款竞品，我在做面向 18-33 岁的药食同源固体饮料品牌，有自有生产线。

产品名称：${p.name}
品牌：${p.brand || '未知'}
我的归档分类：${p.cat}
售价：${p.price ? '¥' + p.price : '未知'}${p.count ? '（' + p.count + '份）' : ''}
剂型：${p.form || '未知'}
渠道：${p.plat || '未知'}
配料：${p.ing}
它的宣称文案：${p.claim || '（未记录）'}
包装主色：${p.colors || '（未记录）'}
链接：${p.url || '（无）'}
我的备注：${p.note || '（无）'}

请从这几个角度分析：
1. 它的配方逻辑和真实功效诉求是什么，用了哪些认知红利
2. 它的定价策略与目标人群是否匹配，成本结构大概如何
3. 包装与命名有没有合规风险，我该怎么做得比它更稳
4. 它最值得我学的一点，和我应该做的差异化切口
5. 如果我要做一款直接对打的产品，配方、规格、价格、命名应该怎么定`;
}

/* ================= 星标 ================= */
function renderStars() {
  const ids = Object.keys(S.stars);
  if (!ids.length) { $('#view-stars').innerHTML = '<div class="empty">还没有收藏。在任何卡片右上角点 ★ 就能存进来。</div>'; return; }
  const radar = F.radar.filter(x => S.stars[x.id]), ecom = F.ecom.filter(x => S.stars[x.id]),
        prod = S.products.filter(x => S.stars[x.id]);
  $('#view-stars').innerHTML =
    (radar.length ? '<div class="sec-title">热点情报</div>' + radar.map(itemCard).join('') : '') +
    (ecom.length ? '<div class="sec-title">电商爆款</div>' + ecom.map(ecomCard).join('') : '') +
    (prod.length ? '<div class="sec-title">竞品</div>' + prod.map(prodCard).join('') : '');
  bindItems();
  $$('#view-stars [data-delp]').forEach(b => b.onclick = () => {
    if (!confirm('删除这条竞品记录？')) return;
    S.products = S.products.filter(p => p.id !== b.dataset.delp); save(); renderStars();
  });
  $$('#view-stars [data-askp]').forEach(b => b.onclick = () => {
    copy(buildPrompt(S.products.find(p => p.id === b.dataset.askp))); toast('已复制深度分析请求');
  });
}

/* ================= 导入导出 ================= */
$('#btn-export').onclick = () => {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '洪小姐工作台备份_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); toast('备份已导出');
};
$('#btn-import').onclick = () => $('#file-import').click();
$('#file-import').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      S = Object.assign(JSON.parse(JSON.stringify(defaultState)), JSON.parse(r.result));
      save(); render(); toast('备份已导入');
    } catch (err) { toast('文件格式不对'); }
  };
  r.readAsText(f);
};

/* ================= 初始化 ================= */
$('#modal-close').onclick = () => $('#modal-mask').classList.add('hidden');
$('#modal-mask').onclick = e => { if (e.target.id === 'modal-mask') $('#modal-mask').classList.add('hidden'); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#modal-mask').classList.add('hidden'); });
$$('.nav-item').forEach(b => b.onclick = () => {
  go(b.dataset.view);
  if (window.innerWidth <= 860) {
    const sb = document.querySelector('.sidebar'); if (sb) sb.classList.remove('open');
    const sc = document.getElementById('scrim'); if (sc) sc.classList.remove('show');
  }
});
const menuBtn = document.getElementById('menu-btn'), scrimEl = document.getElementById('scrim');
if (menuBtn) menuBtn.onclick = () => {
  const sb = document.querySelector('.sidebar'); if (sb) sb.classList.add('open');
  if (scrimEl) scrimEl.classList.add('show');
};
if (scrimEl) scrimEl.onclick = () => {
  const sb = document.querySelector('.sidebar'); if (sb) sb.classList.remove('open');
  scrimEl.classList.remove('show');
};
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

function initTop() {
  const d = new Date();
  const wk = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  $('#today').innerHTML = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 星期${wk}`;
  const upd = F.updatedAt.slice(0, 10);
  const days = Math.floor((new Date(d.toISOString().slice(0, 10)) - new Date(upd)) / 86400000);
  $('#upd-info').innerHTML = days <= 0
    ? `情报已更新<br>${esc(F.updatedAt)}`
    : `<span style="color:#A6614A">情报已过 ${days} 天</span><br>上次更新 ${esc(F.updatedAt)}`;
}

loadFeed().then(() => { initTop(); go('dashboard'); });
})();
