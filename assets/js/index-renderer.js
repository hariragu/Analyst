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

function card(stock){
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
      <span class="stat-pill">Price <strong style="color:#fff;">$${stock.price}</strong></span>
      <span class="stat-pill ${trendTone}">${upArrow} ${Math.abs(stock.priceChange52w)}% 52w</span>
      <span class="stat-pill">Cap <strong style="color:#fff;">${stock.marketCap}</strong></span>
      <span class="stat-pill">FCF <strong style="color:#fff;">${stock.fcfTtm}</strong></span>
      <span class="stat-pill">EV/FCF <strong style="color:#fff;">${stock.evFcf}</strong></span>
    </div>
    <div class="mt-4 text-sm text-soft leading-relaxed">${md(stock.summary)}</div>
    <div class="mt-4 flex gap-2 text-xs">
      <span style="color:#86efac;">Buy &lt; $${stock.buyBelow}</span>
      <span class="text-mute">·</span>
      <span style="color:#fcd34d;">Load &lt; $${stock.loadBelow}</span>
      <span class="text-mute">·</span>
      <span style="color:#fca5a5;">Trim &gt; $${stock.trimAbove}</span>
    </div>
  </a>`;
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
      const r = (s.rating||'').toUpperCase();
      if(state.filter === 'buy' && !r.includes('BUY')) return false;
      if(state.filter === 'hold' && !(r === 'HOLD' || r.includes('HOLD'))) return false;
      if(state.filter === 'sell' && !(r.includes('SELL') || r.includes('TRIM'))) return false;
    }
    if(!q) return true;
    const blob = `${s.ticker} ${s.name} ${s.sector} ${s.exchange}`.toLowerCase();
    return blob.includes(q);
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
    document.getElementById('stockCount').textContent = `${idx.stocks.length} ${idx.stocks.length === 1 ? 'ticker' : 'tickers'} covered`;
    state.all = idx.stocks;
    render();
  }catch(err){
    grid.innerHTML = `<div class="text-soft">Failed to load index: ${err.message}</div>`;
  }
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
