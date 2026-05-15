import { md, chip, loadJSON, getParam, badgeFromRating, tone2Class, setSources } from './util.js';

const ROOT = document.getElementById('app');

function setupCharts(palette){
  Chart.defaults.color = palette.ink;
  Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
}

function fmtNum(v){ return typeof v === 'number' ? v.toFixed(2).replace(/\.00$/,'') : v; }

function cur(s){ return (s && s.currencySymbol) || '$'; }
function unitSuffix(s){ return (s && s.units) || 'B'; }
function priceLabel(s, v){ return `${cur(s)}${v}`; }

function srcTypeIcon(t){
  const tt = (t||'').toLowerCase();
  if(tt.includes('10-k') || tt.includes('annual')) return '📄';
  if(tt.includes('10-q') || tt.includes('quarter')) return '📊';
  if(tt.includes('call') || tt.includes('transcript')) return '🎙️';
  if(tt.includes('news') || tt.includes('article')) return '📰';
  if(tt.includes('letter')) return '✉️';
  if(tt.includes('investor') || tt.includes('deck') || tt.includes('presentation')) return '🖥️';
  if(tt.includes('regulator') || tt.includes('govt') || tt.includes('filing')) return '🏛️';
  if(tt.includes('research') || tt.includes('report')) return '🔬';
  if(tt.includes('blog') || tt.includes('substack')) return '✍️';
  if(tt.includes('podcast') || tt.includes('interview')) return '🎧';
  return '🔗';
}

function renderSources(s){
  if(!s.sources || !s.sources.length) return '';
  const groups = {};
  s.sources.forEach((src, i) => {
    const key = src.type || 'Reference';
    (groups[key] = groups[key] || []).push({ ...src, n: i + 1 });
  });
  const groupOrder = ['10-K', '10-Q', 'Annual Report', 'Shareholder Letter', 'Earnings Call',
                      'Investor Presentation', 'News', 'Research', 'Blog', 'Regulatory Filing',
                      'Podcast', 'Interview', 'Reference'];
  const groupKeys = Object.keys(groups).sort((a, b) => {
    const ia = groupOrder.indexOf(a), ib = groupOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return `
  <section id="sources" class="fade-in">
    <div class="text-cyan text-xs uppercase tracking-wider mono">Bibliography</div>
    <h2 class="sec-title">Sources &amp; further reading</h2>
    <p class="text-soft mt-2" style="max-width:48rem;">Every numbered citation in this analysis links here. Click the source link to read the original.</p>
    <div class="src-groups mt-6">
      ${groupKeys.map(g => `
        <div class="src-group">
          <div class="src-group-title">${srcTypeIcon(g)} ${g}</div>
          <ol class="src-list">
            ${groups[g].map(src => `
              <li id="src-${src.id}" class="src-row">
                <span class="src-num">[${src.n}]</span>
                <div class="src-body">
                  <a href="${src.url}" target="_blank" rel="noopener" class="src-title">${md(src.title)}</a>
                  <div class="src-meta">
                    ${src.publisher ? `<span class="src-pub">${md(src.publisher)}</span>` : ''}
                    ${src.date ? `<span class="src-date">· ${src.date}</span>` : ''}
                    ${src.pages ? `<span class="src-pages">· ${md(src.pages)}</span>` : ''}
                    ${src.accessed ? `<span class="src-acc">· accessed ${src.accessed}</span>` : ''}
                  </div>
                  ${src.note ? `<div class="src-note">${md(src.note)}</div>` : ''}
                </div>
              </li>`).join('')}
          </ol>
        </div>`).join('')}
    </div>
  </section>`;
}

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
        ${kpiCard('Price', priceLabel(s, snap.price), snap.priceChange52w >=0 ? `52-wk +${snap.priceChange52w}%` : `52-wk ${snap.priceChange52w}%`, snap.priceChange52w >=0 ? 'pos':'neg')}
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
          <span class="verdict-pill badge-sell">Sell &gt; ${priceLabel(s, v.trimAbove)}</span>
          <span class="verdict-pill badge-hold">Hold ${priceLabel(s, v.buyBelow)}–${priceLabel(s, v.trimAbove)}</span>
          <span class="verdict-pill badge-buy">Buy &lt; ${priceLabel(s, v.buyBelow)} · Load &lt; ${priceLabel(s, v.loadBelow)}</span>
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

function indTile(t){
  return `
  <div class="glass p-4">
    <div class="text-xs text-mute">${md(t.label)}</div>
    <div class="text-xl font-semibold mt-1 mono">${md(t.value)}</div>
    ${t.sub ? `<div class="text-xs text-soft mt-1">${md(t.sub)}</div>` : ''}
  </div>`;
}

function indSegBar(labels, values){
  if(!Array.isArray(values) || !values.length) return '';
  const total = values.reduce((a,b)=>a+(+b||0),0) || 1;
  const colors = ['#a78bfa','#22d3ee','#fcd34d','#34d399','#fca5a5','#60a5fa'];
  const segs = values.map((v,i) => {
    const pct = ((v/total)*100).toFixed(1);
    return `<span title="${md(labels[i]||'')}: ${pct}%" style="display:inline-block; height:100%; width:${pct}%; background:${colors[i%colors.length]};"></span>`;
  }).join('');
  const legend = labels.map((l,i) => `
    <span class="chip" style="border-color:rgba(255,255,255,.06);">
      <span style="width:9px;height:9px;border-radius:2px;background:${colors[i%colors.length]};display:inline-block;"></span>
      ${md(l)} <span class="mono text-mute" style="margin-left:.25rem;">${(((+values[i]||0)/total)*100).toFixed(0)}%</span>
    </span>`).join('');
  return `
    <div style="height:14px; border-radius:6px; overflow:hidden; background:#1c2030; display:flex; margin-top:.75rem;">${segs}</div>
    <div class="flex" style="flex-wrap:wrap; gap:.4rem; margin-top:.6rem;">${legend}</div>`;
}

function indSegmentCard(seg){
  return `
  <div class="glass p-6" style="border-left:3px solid var(--accent-2);">
    <div class="text-cyan text-xs uppercase tracking-wider mono">${md(seg.axis)}</div>
    <div class="q-title mt-1">${md(seg.title)}</div>
    ${seg.body ? `<div class="leading-relaxed mt-3" style="font-size:.92rem;">${md(seg.body)}</div>` : ''}
    ${indSegBar(seg.shareLabels, seg.shareValues)}
    ${seg.implications ? `<div class="q-answer mt-4"><span class="q-answer-label">Implication</span><span class="q-answer-text">${md(seg.implications)}</span></div>` : ''}
  </div>`;
}

function indPlayerCard(p, isLeader){
  const accent = isLeader ? 'var(--pos)' : 'var(--accent-2)';
  return `
  <div class="glass p-5" style="border-left:3px solid ${accent};">
    <div class="flex jc-b ai-c gap-3" style="flex-wrap:wrap;">
      <div>
        <div class="text-base font-semibold">${md(p.name)}</div>
        <div class="text-xs text-soft mt-1">${md(p.type)}${p.listed ? ` · <span class="mono">${md(p.listed)}</span>` : ''}</div>
      </div>
      <span class="chip ${p.tone || 'warn'}">Share ${md(p.share)}</span>
    </div>
    ${p.body ? `<p class="text-sm text-soft leading-relaxed mt-3">${md(p.body)}</p>` : ''}
  </div>`;
}

function renderIndustry(s){
  const ind = s.industry;
  if(!ind) return '';
  const sas = ind.sizeAndShape, seg = ind.segmentation, comp = ind.competitive, gr = ind.growth, imp = ind.implications;
  const hasShareChart = comp && comp.share_chart && Array.isArray(comp.share_chart.values);

  return `
  <section id="industry" class="fade-in">
    <div class="text-cyan text-xs uppercase tracking-wider mono">Industry context</div>
    <h2 class="sec-title">${md(ind.title || 'Industry primer')}</h2>
    ${ind.intro ? `<p class="text-soft mt-2" style="max-width:48rem;">${md(ind.intro)}</p>` : ''}

    ${sas ? `
    <div id="industry-size" class="mt-10">
      <div class="text-sm font-semibold text-soft uppercase tracking-wider mb-3">${md(sas.title)}</div>
      <div class="grid cols-2 md:cols-3 gap-3">
        ${(sas.tiles||[]).map(indTile).join('')}
      </div>
      ${sas.body ? `<p class="leading-relaxed mt-4" style="max-width:52rem;">${md(sas.body)}</p>` : ''}
    </div>` : ''}

    ${seg ? `
    <div id="industry-segments" class="mt-12">
      <div class="text-sm font-semibold text-soft uppercase tracking-wider mb-2">${md(seg.title)}</div>
      ${seg.intro ? `<p class="text-soft" style="max-width:48rem;">${md(seg.intro)}</p>` : ''}
      <div class="grid md:cols-2 gap-5 mt-5">
        ${(seg.segments||[]).map(indSegmentCard).join('')}
      </div>
    </div>` : ''}

    ${comp ? `
    <div id="industry-competitive" class="mt-12">
      <div class="text-sm font-semibold text-soft uppercase tracking-wider mb-2">${md(comp.title)}</div>
      ${comp.intro ? `<p class="text-soft" style="max-width:48rem;">${md(comp.intro)}</p>` : ''}
      <div class="grid lg:cols-2 gap-6 mt-5">
        <div>
          ${comp.leader ? `
          <div class="text-xs uppercase tracking-wider text-pos mb-2">Leader</div>
          ${indPlayerCard(comp.leader, true)}` : ''}
          ${(comp.followers && comp.followers.length) ? `
          <div class="text-xs uppercase tracking-wider text-warn mt-5 mb-2">Followers & challengers</div>
          <div style="display:flex; flex-direction:column; gap:.85rem;">
            ${comp.followers.map(p => indPlayerCard(p, false)).join('')}
          </div>` : ''}
        </div>
        ${hasShareChart ? `
        <div class="glass p-5" style="align-self:flex-start; position:sticky; top:5rem;">
          <div class="text-sm font-semibold mb-1">${md(comp.share_chart.title || 'Market share')}</div>
          <div class="text-xs text-soft mb-3">Share of national coal production (%)</div>
          <canvas id="industryShareChart" height="220"></canvas>
        </div>` : ''}
      </div>
    </div>` : ''}

    ${gr ? `
    <div id="industry-growth" class="mt-12">
      <div class="text-sm font-semibold text-soft uppercase tracking-wider mb-3">${md(gr.title)}</div>
      ${(gr.tiles && gr.tiles.length) ? `
      <div class="grid cols-2 md:cols-3 gap-3">
        ${gr.tiles.map(indTile).join('')}
      </div>` : ''}
      ${gr.body ? `<p class="leading-relaxed mt-4" style="max-width:52rem;">${md(gr.body)}</p>` : ''}
      ${(gr.drivers && gr.drivers.length) ? `
      <div class="mt-6">
        <div class="text-xs uppercase tracking-wider text-mute mb-2">Demand drivers — push (▲) vs drag (▼)</div>
        <div class="grid md:cols-3 gap-3">
          ${gr.drivers.map(d => `
            <div class="rounded border p-4">
              <div class="flex ai-c gap-2 ${tone2Class(d.tone)} text-xs uppercase tracking-wider">
                <span>${d.tone === 'pos' ? '▲' : d.tone === 'neg' ? '▼' : '◆'}</span>
                <span>${md(d.label)}</span>
              </div>
              <p class="text-sm text-soft mt-2 leading-relaxed">${md(d.body)}</p>
            </div>`).join('')}
        </div>
      </div>` : ''}
    </div>` : ''}

    ${imp ? `
    <div id="industry-implications" class="glass p-6 mt-12" style="border-left:3px solid var(--accent);">
      <div class="text-cyan text-xs uppercase tracking-wider mono">${md(imp.title || 'Implications')}</div>
      <p class="leading-relaxed mt-3">${md(imp.body)}</p>
    </div>` : ''}
  </section>`;
}

function renderFinancials(s){
  const f = s.financials;
  if(!f) return '';
  const C = cur(s), U = unitSuffix(s);

  const hasChart = Array.isArray(f.years) && f.years.length && Array.isArray(f.revenueB) && f.revenueB.length === f.years.length;
  const hasMix = f.mix && Array.isArray(f.mix.values) && f.mix.values.length;

  let intro = '';
  if(hasChart){
    intro = `<p class="text-soft mt-2" style="max-width:48rem;">Free cash flow went from <span class="mono">${f.fcfB[0]<0?'-':''}${C}${Math.abs(f.fcfB[0])}${U}</span> in ${f.years[0]} to <span class="mono">${C}${f.fcfB[f.fcfB.length-1]}${U}</span> in ${f.years[f.years.length-1]} — a structural shift.</p>`;
  } else if(f.intro){
    intro = `<p class="text-soft mt-2" style="max-width:48rem;">${md(f.intro)}</p>`;
  }

  const chartBlock = hasChart ? `
    <div class="grid lg:cols-3 gap-6 mt-8">
      <div class="glass p-5" style="grid-column: ${hasMix ? 'span 2' : '1 / -1'};">
        <div class="flex ai-c jc-b mb-3">
          <div class="text-sm font-semibold">Revenue, FCF &amp; Operating Margin</div>
          <div class="flex gap-2 text-xs">
            <span class="chip"><span style="width:8px;height:8px;border-radius:999px;background:#a78bfa;display:inline-block;"></span> Revenue (${C}${U})</span>
            <span class="chip"><span style="width:8px;height:8px;border-radius:999px;background:#22d3ee;display:inline-block;"></span> FCF (${C}${U})</span>
            <span class="chip"><span style="width:8px;height:8px;border-radius:999px;background:#fcd34d;display:inline-block;"></span> Op Mgn %</span>
          </div>
        </div>
        <canvas id="finChart" height="160"></canvas>
      </div>
      ${hasMix ? `
      <div class="glass p-5">
        <div class="text-sm font-semibold mb-3">${f.mix.title || 'Revenue mix'}</div>
        <canvas id="mixChart" height="200"></canvas>
        ${f.mix.note ? `<div class="text-xs text-soft mt-3">${md(f.mix.note)}</div>` : ''}
      </div>` : ''}
    </div>` : '';

  const tables = (f.tables || {});
  const tableCards = [];
  if(tables.valuation) tableCards.push(kvBox('Valuation snapshot', tables.valuation));
  if(tables.balance) tableCards.push(kvBox('Balance sheet & returns', tables.balance));
  if(tables.capitalReturn) tableCards.push(kvBox('Capital return', tables.capitalReturn));

  const tablesBlock = tableCards.length ? `<div class="grid md:cols-3 gap-6 mt-${hasChart ? '6' : '8'}">${tableCards.join('')}</div>` : '';

  return `
  <section id="financials" class="fade-in">
    <div class="text-cyan text-xs uppercase tracking-wider mono">Financials</div>
    <h2 class="sec-title">${f.title || 'Financial snapshot'}</h2>
    ${intro}
    ${chartBlock}
    ${tablesBlock}
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
  if(q.answer) body += `<div class="q-answer mt-3"><span class="q-answer-label">Short answer</span><span class="q-answer-text">${md(q.answer)}</span></div>`;
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
          <div class="text-xl font-bold mt-1">&lt; ${priceLabel(s, s.verdict.buyBelow)} · Load &lt; ${priceLabel(s, s.verdict.loadBelow)}</div>
        </div>
        <div class="rounded border p-4" style="border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.08);">
          <div class="text-xs uppercase tracking-wider text-warn">Hold zone</div>
          <div class="text-xl font-bold mt-1">${priceLabel(s, s.verdict.buyBelow)} – ${priceLabel(s, s.verdict.trimAbove)}</div>
        </div>
        <div class="rounded border p-4" style="border-color:rgba(239,68,68,.3); background:rgba(239,68,68,.08);">
          <div class="text-xs uppercase tracking-wider text-neg">Trim / sell</div>
          <div class="text-xl font-bold mt-1">&gt; ${priceLabel(s, s.verdict.trimAbove)}</div>
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
        <div class="text-soft">Price <span style="color:#fff; font-weight:600;">${priceLabel(s, s.snapshot.price)}</span></div>
        <div class="text-soft">Mkt Cap <span style="color:#fff; font-weight:600;">${s.snapshot.marketCap}</span></div>
        <div class="text-soft">TTM FCF <span style="color:#fff; font-weight:600;">${s.snapshot.fcfTtm}</span></div>
        <span class="verdict-pill ${badge}">${s.verdict.rating} · Buy &lt; ${priceLabel(s, s.verdict.buyBelow)}</span>
      </div>
    </div>
  </header>`;
}

function renderNav(s){
  const items = [
    ['#summary','Executive summary'],
  ];
  if(s.industry){
    items.push(['#industry','Industry primer']);
    items.push(['#industry-size','Size & shape', true]);
    items.push(['#industry-segments','Segmentation', true]);
    items.push(['#industry-competitive','Competitive map', true]);
    items.push(['#industry-growth','Growth', true]);
  }
  items.push(['#financials','Financials']);
  s.sections.forEach((sec,i) => {
    items.push(['#'+sec.id, `${i+1} · ${sec.title.split('·')[0].trim()}`]);
    sec.questions.forEach(q => items.push(['#'+q.id, `Q${q.n} ${q.title.length > 28 ? q.title.slice(0,28)+'…' : q.title}`, true]));
  });
  items.push(['#scorecard','Scorecard']);
  if(s.sources && s.sources.length) items.push(['#sources', `Sources (${s.sources.length})`]);
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
      ${renderIndustry(s)}
      ${renderFinancials(s)}
      ${s.sections.map(renderSection).join('')}
      ${renderScorecard(s)}
      ${renderSources(s)}
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
  if(!f) return;
  const C = cur(s), U = unitSuffix(s);

  const finCanvas = document.getElementById('finChart');
  if(finCanvas && Array.isArray(f.years) && f.years.length){
    new Chart(finCanvas, {
      data: {
        labels: f.years,
        datasets: [
          { type:'bar', label:`Revenue (${C}${U})`, data:f.revenueB, backgroundColor:'rgba(167,139,250,0.55)', borderRadius:6, yAxisID:'y' },
          { type:'bar', label:`FCF (${C}${U})`,     data:f.fcfB,     backgroundColor:'rgba(34,211,238,0.7)',   borderRadius:6, yAxisID:'y' },
          { type:'line', label:'Op Margin %', data:f.opMargin, borderColor:palette.amber, backgroundColor:'rgba(252,211,77,0.15)', tension:0.35, yAxisID:'y1', fill:true, pointRadius:4 }
        ]
      },
      options: {
        plugins:{ legend:{ display:false } },
        scales: {
          y:{ position:'left', grid:{ color:'rgba(255,255,255,0.05)' }, ticks:{ callback:v=>C+v+U } },
          y1:{ position:'right', grid:{ display:false }, ticks:{ callback:v=>v+'%' } },
          x:{ grid:{ display:false } }
        }
      }
    });
  }

  const mixCanvas = document.getElementById('mixChart');
  if(mixCanvas && f.mix){
    new Chart(mixCanvas, {
      type:'doughnut',
      data: {
        labels: f.mix.labels,
        datasets:[{ data: f.mix.values, backgroundColor:['#a78bfa','#22d3ee','#fcd34d','#34d399','#fca5a5','#f59e0b','#60a5fa'], borderColor:'#10131c', borderWidth:3 }]
      },
      options:{ cutout:'65%', plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, padding:14 } } } }
    });
  }

  const valCanvas = document.getElementById('valChart');
  if(valCanvas && f.valuation){
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
    setSources(s.sources || []);
    document.title = `${s.name} (${s.ticker}) — Equity Analysis`;
    ROOT.innerHTML = renderShell(s);
    bootCharts(s);
    bootScrollSpy();
    bootCitationHighlight();
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

// Briefly highlight the target source row when a citation is clicked.
function bootCitationHighlight(){
  document.body.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#src-"]');
    if(!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if(!target) return;
    target.classList.remove('src-flash');
    void target.offsetWidth;
    target.classList.add('src-flash');
  });
}

main();
