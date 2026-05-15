import { loadJSON, badgeFromRating, md } from './util.js';

const grid = document.getElementById('grid');
const search = document.getElementById('search');
const filters = document.getElementById('filters');
const empty = document.getElementById('empty');

let state = { all: [], filter: 'all', query: '' };

function ratingTone(r){
  const u = (r||'').toUpperCase();
  if(u.includes('BUY')) return 'pos';
  if(u.includes('SELL') || u.includes('TRIM')) return 'neg';
  return 'warn';
}

function analyzedCard(stock){
  const badge = badgeFromRating(stock.rating);
  const upArrow = stock.priceChange52w >= 0 ? '▲' : '▼';
  const trendTone = stock.priceChange52w >= 0 ? 'text-pos' : 'text-neg';
  return `
  <a href="./stock.html?ticker=${stock.ticker}" class="stock-card" style="--logo-from:${stock.logoFrom};">
    <div class="flex ai-c jc-b">
      <div class="flex ai-c gap-3">
        <div class="logo" style="background:linear-gradient(135deg, ${stock.logoFrom}, ${stock.logoTo});">${stock.logoText}</div>
        <div>
          <div class="text-base font-semibold">${stock.ticker}</div>
          <div class="text-xs text-soft">${stock.name}</div>
        </div>
      </div>
      <span class="verdict-pill ${badge}">${stock.rating}</span>
    </div>
    <div class="text-xs text-mute mt-3">${stock.exchange} · ${stock.sector}</div>
    <div class="mt-4 flex gap-2" style="flex-wrap:wrap;">
      ${stock.price != null ? `<span class="stat-pill">Price <strong style="color:#fff;">$${stock.price}</strong></span>` : ''}
      ${stock.priceChange52w != null ? `<span class="stat-pill ${trendTone}">${upArrow} ${Math.abs(stock.priceChange52w)}% 52w</span>` : ''}
      ${stock.marketCap ? `<span class="stat-pill">Cap <strong style="color:#fff;">${stock.marketCap}</strong></span>` : ''}
      ${stock.fcfTtm ? `<span class="stat-pill">FCF <strong style="color:#fff;">${stock.fcfTtm}</strong></span>` : ''}
      ${stock.evFcf ? `<span class="stat-pill">EV/FCF <strong style="color:#fff;">${stock.evFcf}</strong></span>` : ''}
    </div>
    <div class="mt-4 text-sm text-soft leading-relaxed">${md(stock.summary || '')}</div>
    ${(stock.buyBelow != null || stock.loadBelow != null || stock.trimAbove != null) ? `
    <div class="mt-4 flex gap-2 text-xs">
      ${stock.buyBelow != null ? `<span style="color:#86efac;">Buy &lt; $${stock.buyBelow}</span>` : ''}
      ${stock.loadBelow != null ? `<span class="text-mute">·</span><span style="color:#fcd34d;">Load &lt; $${stock.loadBelow}</span>` : ''}
      ${stock.trimAbove != null ? `<span class="text-mute">·</span><span style="color:#fca5a5;">Trim &gt; $${stock.trimAbove}</span>` : ''}
    </div>` : ''}
  </a>`;
}

function pendingCard(stock){
  return `
  <div class="stock-card pending" style="--logo-from:${stock.logoFrom};" title="Awaiting deep dive — coming soon">
    <div class="flex ai-c jc-b">
      <div class="flex ai-c gap-3">
        <div class="logo" style="background:linear-gradient(135deg, ${stock.logoFrom}, ${stock.logoTo});">${stock.logoText}</div>
        <div>
          <div class="text-base font-semibold">${stock.ticker}${stock.priorityRank ? `<span class="rank-badge" title="Conviction rank">#${stock.priorityRank}</span>` : ''}</div>
          <div class="text-xs text-soft">${stock.name}</div>
        </div>
      </div>
      <span class="verdict-pill badge-pending">Pending</span>
    </div>
    <div class="text-xs text-mute mt-3">${stock.exchange} · ${stock.sector}</div>
    <div class="mt-4 text-sm text-soft leading-relaxed">${md(stock.thesis || '')}</div>
    ${stock.valueAngle ? `<div class="mt-3 value-angle"><span class="va-label">Value angle</span> ${md(stock.valueAngle)}</div>` : ''}
    <div class="mt-4 text-xs text-mute italic">↻ Awaiting 15-question deep dive</div>
  </div>`;
}

function card(stock){
  return stock.status === 'screened' ? pendingCard(stock) : analyzedCard(stock);
}

function comingSoonCard(){
  return `
    <div class="coming-soon">
      <div style="font-size:1.6rem;">+</div>
      <div class="font-semibold mt-1" style="color:var(--ink-soft);">More tickers coming</div>
      <div class="text-xs mt-1">Drop a JSON in <span class="mono">data/stocks/</span> and add to <span class="mono">data/index.json</span>.</div>
    </div>`;
}

function render(){
  const q = state.query.toLowerCase().trim();
  const filtered = state.all.filter(s => {
    if(state.filter !== 'all'){
      if(state.filter === 'pending'){
        if(s.status !== 'screened') return false;
      } else {
        if(s.status === 'screened') return false;
        const r = (s.rating||'').toUpperCase();
        if(state.filter === 'buy' && !r.includes('BUY')) return false;
        if(state.filter === 'hold' && !(r === 'HOLD' || r.includes('HOLD'))) return false;
        if(state.filter === 'sell' && !(r.includes('SELL') || r.includes('TRIM'))) return false;
      }
    }
    if(!q) return true;
    const blob = `${s.ticker} ${s.name} ${s.sector} ${s.exchange} ${s.thesis||''} ${s.valueAngle||''}`.toLowerCase();
    return blob.includes(q);
  });
  // Sort: analyzed first, then screened by priorityRank
  filtered.sort((a, b) => {
    const aPending = a.status === 'screened' ? 1 : 0;
    const bPending = b.status === 'screened' ? 1 : 0;
    if(aPending !== bPending) return aPending - bPending;
    if(aPending) return (a.priorityRank||999) - (b.priorityRank||999);
    return 0;
  });
  grid.innerHTML = filtered.map(card).join('') + comingSoonCard();
  empty.style.display = filtered.length === 0 ? 'block' : 'none';
}

async function main(){
  try{
    const idx = await loadJSON('./data/index.json');
    document.getElementById('siteTitle').textContent = idx.site.title;
    document.getElementById('siteTagline').textContent = idx.site.tagline;
    document.getElementById('siteFramework').textContent = idx.site.framework;
    const analyzed = idx.stocks.filter(s => s.status !== 'screened').length;
    const pending = idx.stocks.filter(s => s.status === 'screened').length;
    const total = idx.stocks.length;
    document.getElementById('stockCount').textContent =
      `${total} covered · ${analyzed} analysed · ${pending} pending`;
    state.all = idx.stocks;
    state.screens = idx.screens || [];
    renderScreensBanner(idx.screens || []);
    render();
  }catch(err){
    grid.innerHTML = `<div class="text-soft">Failed to load index: ${err.message}</div>`;
  }
}

function renderScreensBanner(screens){
  const el = document.getElementById('screensBanner');
  if(!el || !screens.length) return;
  el.innerHTML = screens.map(s => `
    <div class="screen-chip">
      <span class="screen-dot"></span>
      <strong>${s.title}</strong>
      <span class="text-mute">· ${s.pickCount} picks · ${s.market}</span>
    </div>`).join('');
}

search.addEventListener('input', e => { state.query = e.target.value; render(); });
filters.addEventListener('click', e => {
  const btn = e.target.closest('.filter-chip');
  if(!btn) return;
  state.filter = btn.dataset.filter;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.toggle('active', b === btn));
  render();
});

main();
