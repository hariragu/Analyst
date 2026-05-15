import { loadJSON, badgeFromRating, md } from './util.js';

const grid = document.getElementById('grid');
const search = document.getElementById('search');
const filters = document.getElementById('filters');
const empty = document.getElementById('empty');

let state = { all: [], filter: 'all', query: '' };

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

function emptyState(pendingCount){
  return `
    <div class="empty-state">
      <div class="text-3xl">🔍</div>
      <div class="font-semibold mt-3 text-lg" style="color:#fff;">No published analyses yet match this filter</div>
      <div class="text-sm text-soft mt-2" style="max-width:30rem;">
        ${pendingCount > 0
          ? `<strong>${pendingCount}</strong> ${pendingCount === 1 ? 'company is' : 'companies are'} in the deep-dive queue. Each will appear here once its 15-question analysis is complete.`
          : 'New companies are queued for analysis and will appear here once published.'}
      </div>
      ${pendingCount > 0 ? `<a href="./upcoming.html" class="upcoming-cta mt-4">See what's coming →</a>` : ''}
    </div>`;
}

function render(){
  const pendingCount = state.all.filter(s => s.status === 'screened' || s.status === 'watchlist').length;
  const analyzedOnly = state.all.filter(s => s.status === 'analyzed');

  const q = state.query.toLowerCase().trim();
  const filtered = analyzedOnly.filter(s => {
    if(state.filter !== 'all'){
      const r = (s.rating||'').toUpperCase();
      if(state.filter === 'buy' && !r.includes('BUY')) return false;
      if(state.filter === 'hold' && !(r === 'HOLD' || r.includes('HOLD'))) return false;
      if(state.filter === 'sell' && !(r.includes('SELL') || r.includes('TRIM'))) return false;
    }
    if(!q) return true;
    const blob = `${s.ticker} ${s.name} ${s.sector} ${s.exchange} ${s.summary||''}`.toLowerCase();
    return blob.includes(q);
  });

  if(filtered.length === 0){
    grid.innerHTML = '';
    empty.innerHTML = emptyState(pendingCount);
    empty.style.display = 'block';
  } else {
    grid.innerHTML = filtered.map(analyzedCard).join('');
    empty.style.display = 'none';
  }
}

function renderUpcomingBanner(pendingCount, screens){
  const el = document.getElementById('upcomingBanner');
  if(!el) return;
  if(pendingCount === 0){
    el.innerHTML = '';
    return;
  }
  const screenLabels = screens.map(s => s.title).join(' · ');
  el.innerHTML = `
    <a href="./upcoming.html" class="upcoming-banner">
      <div class="ub-left">
        <span class="ub-dot"></span>
        <div>
          <div class="ub-title">${pendingCount} companies in the deep-dive queue</div>
          ${screenLabels ? `<div class="ub-sub">${screenLabels}</div>` : ''}
        </div>
      </div>
      <div class="ub-cta">View upcoming →</div>
    </a>`;
}

async function main(){
  try{
    const idx = await loadJSON('./data/index.json');
    document.getElementById('siteTitle').textContent = idx.site.title;
    document.getElementById('siteTagline').textContent = idx.site.tagline;
    document.getElementById('siteFramework').textContent = idx.site.framework;
    const analyzed = idx.stocks.filter(s => s.status === 'analyzed').length;
    const pending = idx.stocks.filter(s => s.status === 'screened' || s.status === 'watchlist').length;
    document.getElementById('stockCount').textContent =
      `${analyzed} ${analyzed === 1 ? 'analysis' : 'analyses'} published · ${pending} upcoming`;
    state.all = idx.stocks;
    renderUpcomingBanner(pending, idx.screens || []);
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
