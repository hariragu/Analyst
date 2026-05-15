import { md, chip, loadJSON, getParam, badgeFromRating, tone2Class } from './util.js';

const ROOT = document.getElementById('app');

function setupCharts(palette){
  Chart.defaults.color = palette.ink;
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
}

function fmtNum(v){ return typeof v === 'number' ? v.toFixed(2).replace(/\.00$/,'') : v; }

function renderHero(s){
  const v = s.verdict, snap = s.snapshot;
  const badge = badgeFromRating(v.rating);
  return `
  <section class="grid-bg" style="border-bottom:1px solid var(--border);">
    <div class="container" style="padding:4rem 1.5rem;">
      <div class="flex ai-c gap-2 text-xs text-soft mb-3">
        <span class="pulse-dot"></span> Snapshot as of ${s.asOf}
        <span style="margin:0 .5rem;">·</span> Framework: ${s.framework}
      </div>
      <h1 class="text-5xl font-extrabold tracking-tight leading-tight">
        Is <span class="gradient-text">${s.name.split(',')[0]}</span> worth owning?
      </h1>
      <p class="mt-3 text-lg text-soft" style="max-width:48rem;">A 15-question, three-section investigation across <em>Business</em>, <em>Management</em>, and <em>Price</em>. Be honest, not clever.</p>

      <div class="grid cols-2 md:cols-6 gap-3 mt-10">
        ${kpiCard('Price', '$'+snap.price, snap.priceChange52w >=0 ? `52-wk +${snap.priceChange52w}%` : `52-wk ${snap.priceChange52w}%`, snap.priceChange52w >=0 ? 'pos':'neg')}
        ${kpiCard('EV / FCF', snap.evFcf, 'Reasonable', 'pos')}
        ${kpiCard('FCF Yield', snap.fcfYield, '+ growth', 'pos')}
        ${kpiCard('ROIC', snap.roic, '&gt; WACC '+snap.wacc, 'pos')}
        ${kpiCard('FCF Growth (4y)', snap.fcfGrowth4y, 'Compounding', 'pos')}
        ${kpiCard('Analyst PT', snap.analystPT, `${snap.analystUpside} · ${snap.analystRating}`, 'pos')}
      </div>

      <div class="glass mt-10 p-6 flex flex-col md:flex-row gap-6" style="align-items:flex-start;">
        <div class="flex-1">
          <div class="text-xs text-mute uppercase tracking-wider">One-line verdict</div>
          <div class="mt-2 text-2xl font-semibold leading-tight">${md(v.summary)}</div>
        </div>
        <div class="flex flex-col gap-2">
          <span class="verdict-pill badge-sell">Sell &gt; $${v.trimAbove}</span>
          <span class="verdict-pill badge-hold">Hold $${v.buyBelow}–$${v.trimAbove}</span>
          <span class="verdict-pill badge-buy">Buy &lt; $${v.buyBelow} · Load &lt; $${v.loadBelow}</span>
        </div>
      </div>
    </div>
  </section>`;
}

function kpiCard(label, value, sub, tone='pos'){
  return `
  <div class="glass p-4">
    <div class="text-xs text-mute">${label}</div>
    <div class="text-xl font-semibold mt-1">${value}</div>
    <div class="text-xs mt-1 ${tone2Class(tone)}">${sub}</div>
  </div>`;
}

function renderSummary(s){
  const e = s.executiveSummary;
  return `
  <section id="summary" class="fade-in">
    <div class="text-cyan text-xs uppercase tracking-wider mono">Executive summary</div>
    <h2 class="sec-title">The thesis in 60 seconds</h2>
    <div class="grid md:cols-2 gap-6 mt-6">
      <div class="glass p-6">
        <div class="text-sm text-soft uppercase tracking-wider mb-3">Why own it</div>
        <ul style="list-style:none; padding:0; margin:0;">
          ${e.pros.map(p => `<li class="bullet-row"><span class="mark text-pos">▲</span><span>${md(p)}</span></li>`).join('')}
        </ul>
      </div>
      <div class="glass p-6">
        <div class="text-sm text-soft uppercase tracking-wider mb-3">Why pause</div>
        <ul style="list-style:none; padding:0; margin:0;">
          ${e.cons.map(c => `<li class="bullet-row"><span class="mark text-neg">▼</span><span>${md(c)}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  </section>`;
}

function renderFinancials(s){
  const f = s.financials;
  return `
  <section id="financials" class="fade-in">
    <div class="text-cyan text-xs uppercase tracking-wider mono">Financials</div>
    <h2 class="sec-title">From cash burn to cash compounding</h2>
    <p class="text-soft mt-2" style="max-width:48rem;">Free cash flow went from <span class="mono">${f.fcfB[0]<0?'-':''}$${Math.abs(f.fcfB[0])}B</span> in ${f.years[0]} to <span class="mono">$${f.fcfB[f.fcfB.length-1]}B</span> in ${f.years[f.years.length-1]} — a structural shift.</p>

    <div class="grid lg:cols-3 gap-6 mt-8">
      <div class="glass p-5" style="grid-column: span 2;">
        <div class="flex ai-c jc-b mb-3">
          <div class="text-sm font-semibold">Revenue, FCF & Operating Margin</div>
          <div class="flex gap-2 text-xs">
            <span class="chip"><span style="width:8px;height:8px;border-radius:999px;background:#a78bfa;display:inline-block;"></span> Revenue ($B)</span>
            <span class="chip"><span style="width:8px;height:8px;border-radius:999px;background:#22d3ee;display:inline-block;"></span> FCF ($B)</span>
            <span class="chip"><span style="width:8px;height:8px;border-radius:999px;background:#fcd34d;display:inline-block;"></span> Op Mgn %</span>
          </div>
        </div>
        <canvas id="finChart" height="160"></canvas>
      </div>

      <div class="glass p-5">
        <div class="text-sm font-semibold mb-3">Revenue mix</div>
        <canvas id="mixChart" height="200"></canvas>
        <div class="text-xs text-soft mt-3">Advertising slice is embedded inside Mobility/Delivery at very high incremental margin.</div>
      </div>
    </div>

    <div class="grid md:cols-3 gap-6 mt-6">
      ${kvBox('Valuation snapshot', f.tables.valuation)}
      ${kvBox('Balance sheet & returns', f.tables.balance)}
      ${kvBox('Capital return', f.tables.capitalReturn)}
    </div>
  </section>`;
}

function kvBox(title, rows){
  return `
  <div class="glass p-5">
    <div class="text-sm font-semibold mb-3">${title}</div>
    <table class="kv">
      ${rows.map(r => `<tr><td>${md(r[0])}</td><td>${md(r[1])}</td></tr>`).join('')}
    </table>
  </div>`;
}

function renderQuestion(q){
  let body = '';
  if(q.body) body += `<p class="leading-relaxed mt-4">${md(q.body)}</p>`;
  if(q.bullets){
    body += `<ul style="list-style:none; padding:0; margin: .75rem 0 0;">` +
      q.bullets.map(b => `<li class="bullet-row"><span class="mark text-cyan">•</span><span>${md(b)}</span></li>`).join('') +
      `</ul>`;
  }
  if(q.ordered){
    body += `<ol class="mt-3" style="padding-left:1.4rem;">` +
      q.ordered.map(b => `<li style="padding:.2rem 0; font-size:.92rem;">${md(b)}</li>`).join('') +
      `</ol>`;
  }
  if(q.table){
    body += `<div class="overflow-x-auto mt-4"><table class="w-full text-sm" style="border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid var(--border);">`+
      q.table.header.map(h => `<th class="text-xs uppercase tracking-wider text-mute" style="text-align:left; padding:.5rem .5rem;">${h}</th>`).join('') +
      `</tr></thead><tbody>` +
      q.table.rows.map(r => `<tr style="border-bottom:1px solid var(--border);">` +
        r.map((c,i) => `<td style="padding:.55rem .5rem; ${i>=3?'text-align:right;font-family:JetBrains Mono,monospace;':''}">${md(c)}</td>`).join('') +
        `</tr>`).join('') +
      `</tbody></table></div>`;
    if(q.footnote) body += `<p class="mt-3 text-sm text-soft">${md(q.footnote)}</p>`;
  }
  if(q.splitList){
    const sl = q.splitList;
    body += `<div class="grid md:cols-2 gap-4 mt-4">
      <div>
        <div class="text-xs uppercase tracking-wider ${tone2Class(sl.leftTone)} mb-2">${sl.leftTitle}</div>
        <ul style="list-style:none; padding:0; margin:0;">${sl.left.map(x => `<li class="bullet-row"><span>• ${md(x)}</span></li>`).join('')}</ul>
      </div>
      <div>
        <div class="text-xs uppercase tracking-wider ${tone2Class(sl.rightTone)} mb-2">${sl.rightTitle}</div>
        <ul style="list-style:none; padding:0; margin:0;">${sl.right.map(x => `<li class="bullet-row"><span>• ${md(x)}</span></li>`).join('')}</ul>
      </div>
    </div>`;
  }
  if(q.riskMatrix){
    body += `<table class="w-full text-sm mt-4" style="border-collapse:collapse;">
      <thead><tr style="border-bottom:1px solid var(--border);">
        <th class="text-xs uppercase tracking-wider text-mute" style="text-align:left; padding:.5rem .75rem;">Risk</th>
        <th class="text-xs uppercase tracking-wider text-mute" style="text-align:center;">Probability</th>
        <th class="text-xs uppercase tracking-wider text-mute" style="text-align:center;">Severity</th>
        <th class="text-xs uppercase tracking-wider text-mute" style="text-align:left; padding-left:.5rem;">Mitigant</th>
      </tr></thead>
      <tbody>` + q.riskMatrix.map(r => `
        <tr class="risk-row">
          <td>${md(r[0])}</td>
          <td style="text-align:center;">${chip(r[1], severityTone(r[1]))}</td>
          <td style="text-align:center;">${chip(r[2], severityTone(r[2]))}</td>
          <td style="font-size:.82rem; color:var(--ink-soft);">${md(r[3])}</td>
        </tr>`).join('') + `</tbody></table>`;
  }
  if(q.timeline){
    body += `<div class="grid md:cols-2 gap-4 mt-4">` +
      q.timeline.map(t => `
        <div class="border rounded p-4">
          <div class="text-xs uppercase tracking-wider ${tone2Class(t.tone)}">${t.era}</div>
          <p class="text-sm mt-1">${md(t.note)}</p>
        </div>`).join('') +
      `</div>`;
  }
  if(q.tiles){
    body += `<div class="grid md:cols-3 gap-4 mt-4">` +
      q.tiles.map(t => `
        <div class="rounded border p-4 text-center">
          <div class="text-xs uppercase text-mute">${t.label}</div>
          <div class="text-2xl font-bold mt-1 mono">${t.value}</div>
        </div>`).join('') +
      `</div>`;
    if(q.footnote) body += `<p class="mt-3 text-sm text-soft">${md(q.footnote)}</p>`;
  }
  if(q.triggers){
    body += `<div class="grid md:cols-3 gap-4 mt-4">` +
      q.triggers.map(t => `
        <div class="rounded border p-4">
          <div class="text-xs uppercase ${tone2Class(t.tone)} mb-1">${t.title}</div>
          <p class="text-sm">${md(t.body)}</p>
        </div>`).join('') +
      `</div>`;
  }
  if(q.chart === 'valuation'){
    body += `<div class="mt-4"><canvas id="valChart" height="100"></canvas></div>`;
  }

  return `
  <div id="${q.id}" class="qcard glass p-6">
    <div class="flex jc-b gap-4">
      <div>
        <div class="qnum">Q${q.n}</div>
        <div class="q-title">${q.title}</div>
        ${q.sub ? `<div class="q-sub">${q.sub}</div>` : ''}
      </div>
      ${chip(q.chip, q.chipTone)}
    </div>
    ${body}
  </div>`;
}

function severityTone(label){
  const l = (label||'').toLowerCase();
  if(l.includes('low')) return 'pos';
  if(l.includes('high') || l.includes('severe')) return 'neg';
  return 'warn';
}

function renderSection(sec){
  return `
  <section id="${sec.id}" class="fade-in">
    <div class="text-cyan text-xs uppercase tracking-wider mono">${sec.label}</div>
    <h2 class="sec-title">${sec.title}</h2>
    <div style="display:flex; flex-direction:column; gap:1.25rem; margin-top:2rem;">
      ${sec.questions.map(renderQuestion).join('')}
    </div>
  </section>`;
}

function renderScorecard(s){
  const sc = s.scorecard;
  const max = 5;
  return `
  <section id="scorecard" class="fade-in">
    <div class="text-cyan text-xs uppercase tracking-wider mono">Synthesis</div>
    <h2 class="sec-title">One-page scorecard</h2>
    <div class="glass p-6 mt-6">
      <div style="display:flex; flex-direction:column; gap:1rem;">
        ${sc.dimensions.map(d => `
          <div class="grid" style="grid-template-columns: 5fr 6fr 1fr; align-items:center; gap:.75rem;">
            <div class="text-sm">${d.label}</div>
            <div class="scorebar"><span style="width:${(d.score/max)*100}%"></span></div>
            <div class="text-right mono">${d.score.toFixed(1)}</div>
          </div>`).join('')}
      </div>
      <div class="grid md:cols-3 gap-4 mt-6">
        <div class="rounded border p-4" style="border-color:rgba(34,197,94,.3); background:rgba(34,197,94,.08);">
          <div class="text-xs uppercase tracking-wider text-pos">Buy zone</div>
          <div class="text-xl font-bold mt-1">&lt; $${s.verdict.buyBelow} · Load &lt; $${s.verdict.loadBelow}</div>
        </div>
        <div class="rounded border p-4" style="border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.08);">
          <div class="text-xs uppercase tracking-wider text-warn">Hold zone</div>
          <div class="text-xl font-bold mt-1">$${s.verdict.buyBelow} – $${s.verdict.trimAbove}</div>
        </div>
        <div class="rounded border p-4" style="border-color:rgba(239,68,68,.3); background:rgba(239,68,68,.08);">
          <div class="text-xs uppercase tracking-wider text-neg">Trim / sell</div>
          <div class="text-xl font-bold mt-1">&gt; $${s.verdict.trimAbove}</div>
        </div>
      </div>
      <p class="mt-6 text-sm text-soft leading-relaxed">${md(sc.summary)}</p>
    </div>
  </section>`;
}

function renderHeader(s){
  const badge = badgeFromRating(s.verdict.rating);
  return `
  <header class="site-header">
    <div class="container flex ai-c jc-b" style="padding:.85rem 1.5rem;">
      <div class="flex ai-c gap-3">
        <a href="./index.html" class="text-mute text-sm" title="Back to all stocks">&larr;</a>
        <div class="logo" style="background:linear-gradient(135deg, ${s.logoFrom}, ${s.logoTo});">${s.logoText}</div>
        <div>
          <div class="text-xs text-soft">Equity Analysis</div>
          <div class="text-base font-semibold">${s.name} <span class="mono text-mute" style="margin-left:.5rem;">${s.exchange}: ${s.ticker}</span></div>
        </div>
      </div>
      <div class="flex ai-c gap-4 text-sm" style="flex-wrap:wrap;">
        <div class="text-soft">Price <span style="color:#fff; font-weight:600;">$${s.snapshot.price}</span></div>
        <div class="text-soft">Mkt Cap <span style="color:#fff; font-weight:600;">${s.snapshot.marketCap}</span></div>
        <div class="text-soft">TTM FCF <span style="color:#fff; font-weight:600;">${s.snapshot.fcfTtm}</span></div>
        <span class="verdict-pill ${badge}">${s.verdict.rating} · Buy &lt; $${s.verdict.buyBelow}</span>
      </div>
    </div>
  </header>`;
}

function renderNav(s){
  const items = [
    ['#summary','Executive summary'],
    ['#financials','Financials'],
  ];
  s.sections.forEach((sec,i) => {
    items.push(['#'+sec.id, `${i+1} · ${sec.title.split('·')[0].trim()}`]);
    sec.questions.forEach(q => items.push(['#'+q.id, `Q${q.n} ${q.title.length > 28 ? q.title.slice(0,28)+'…' : q.title}`, true]));
  });
  items.push(['#scorecard','Scorecard']);
  return `
  <aside class="hidden lg:block scrollnav sticky top-24 self-start" style="width:16rem; max-height:80vh; overflow-y:auto;">
    <div class="text-xs uppercase tracking-wider text-mute mb-2" style="padding:0 .75rem;">Sections</div>
    ${items.map(([href, label, indent]) => `<a class="navlink${indent?'':''}" href="${href}" style="${indent?'margin-left:.75rem;':''}">${label}</a>`).join('')}
  </aside>`;
}

function renderShell(s){
  return `
  ${renderHeader(s)}
  ${renderHero(s)}
  <div class="container flex gap-10" style="padding:2.5rem 1.5rem;">
    ${renderNav(s)}
    <main class="flex-1" style="display:flex; flex-direction:column; gap:5rem;">
      ${renderSummary(s)}
      ${renderFinancials(s)}
      ${s.sections.map(renderSection).join('')}
      ${renderScorecard(s)}
      <footer class="text-center text-xs text-mute" style="padding:2rem 0; border-top:1px solid var(--border);">
        Educational analysis · Not investment advice · Framework: <a class="underline" href="https://safalniveshak.com" target="_blank">Vishal Khandelwal</a> · Data as of ${s.asOf}
      </footer>
    </main>
  </div>`;
}

function bootCharts(s){
  const palette = { violet:'#a78bfa', cyan:'#22d3ee', amber:'#fcd34d', ink:'#aab1c0' };
  setupCharts(palette);
  const f = s.financials;

  new Chart(document.getElementById('finChart'), {
    data: {
      labels: f.years,
      datasets: [
        { type:'bar', label:'Revenue ($B)', data:f.revenueB, backgroundColor:'rgba(167,139,250,0.55)', borderRadius:6, yAxisID:'y' },
        { type:'bar', label:'FCF ($B)',     data:f.fcfB,     backgroundColor:'rgba(34,211,238,0.7)',   borderRadius:6, yAxisID:'y' },
        { type:'line', label:'Op Margin %', data:f.opMargin, borderColor:palette.amber, backgroundColor:'rgba(252,211,77,0.15)', tension:0.35, yAxisID:'y1', fill:true, pointRadius:4 }
      ]
    },
    options: {
      plugins:{ legend:{ display:false } },
      scales: {
        y:{ position:'left', grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ callback:v=>'$'+v+'B' } },
        y1:{ position:'right', grid:{ display:false }, ticks:{ callback:v=>v+'%' } },
        x:{ grid:{ display:false } }
      }
    }
  });

  new Chart(document.getElementById('mixChart'), {
    type:'doughnut',
    data: {
      labels: f.mix.labels,
      datasets:[{ data: f.mix.values, backgroundColor:['#a78bfa','#22d3ee','#fcd34d','#34d399','#fca5a5'], borderColor:'#10131c', borderWidth:3 }]
    },
    options:{ cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, padding:14 } } } }
  });

  const valCanvas = document.getElementById('valChart');
  if(valCanvas){
    const vals = f.valuation;
    new Chart(valCanvas, {
      type:'bar',
      data:{
        labels: vals.map(v => v.label),
        datasets: [{
          data: vals.map(v => v.value),
          backgroundColor: vals.map(v => v.tone === 'pos' ? '#34d399' : '#a78bfa'),
          borderRadius: 6
        }]
      },
      options:{ indexAxis:'y', plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ color:'rgba(255,255,255,0.05)' } }, y:{ grid:{ display:false } } } }
    });
  }
}

function bootScrollSpy(){
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => io.observe(el));

  const links = document.querySelectorAll('.navlink');
  const sections = [...document.querySelectorAll('main section[id]')];
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        const id = e.target.id;
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#'+id));
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach(s => spy.observe(s));

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if(id.length>1){
        e.preventDefault();
        document.querySelector(id)?.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  });
}

async function main(){
  const ticker = (getParam('ticker') || 'UBER').toUpperCase();
  try{
    const s = await loadJSON(`./data/stocks/${ticker}.json`);
    document.title = `${s.name} (${s.ticker}) — Equity Analysis`;
    ROOT.innerHTML = renderShell(s);
    bootCharts(s);
    bootScrollSpy();
  }catch(err){
    ROOT.innerHTML = `
      <div class="container" style="padding:6rem 1.5rem;">
        <h1 class="text-3xl font-bold">Analysis not found</h1>
        <p class="text-soft mt-3">No data for ticker <span class="mono">${ticker}</span>.</p>
        <p class="mt-4"><a href="./index.html" class="text-cyan">&larr; Back to all stocks</a></p>
        <pre class="mt-4 text-xs text-mute">${(err && err.message) || err}</pre>
      </div>`;
  }
}

main();
