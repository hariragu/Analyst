import { loadJSON, md } from './util.js';

const screenList = document.getElementById('screenList');
const search = document.getElementById('search');
const empty = document.getElementById('empty');
const upcomingCount = document.getElementById('upcomingCount');

let state = { all: [], screens: [], query: '' };

function pendingCard(stock){
  const isWatchlist = stock.status === 'watchlist';
  const pillClass = isWatchlist ? 'badge-watchlist' : 'badge-pending';
  const pillText = isWatchlist ? 'Watchlist' : 'Pending';
  const footer = isWatchlist
    ? `<div class="mt-4 text-xs text-cyan italic">⏳ ${stock.watchlistEntryTrigger || 'Awaiting entry trigger'}</div>`
    : `<div class="mt-4 text-xs text-mute italic">↻ Awaiting 15-question deep dive</div>`;
  return `
  <div class="stock-card pending${isWatchlist ? ' watchlist' : ''}" style="--logo-from:${stock.logoFrom};" title="${isWatchlist ? 'On watchlist — waiting for entry trigger' : 'Awaiting deep dive — coming soon'}">
    <div class="flex ai-c jc-b">
      <div class="flex ai-c gap-3">
        <div class="logo" style="background:linear-gradient(135deg, ${stock.logoFrom}, ${stock.logoTo});">${stock.logoText}</div>
        <div>
          <div class="text-base font-semibold">${stock.ticker}${stock.priorityRank ? `<span class="rank-badge" title="Conviction rank">#${stock.priorityRank}</span>` : ''}</div>
          <div class="text-xs text-soft">${stock.name}</div>
        </div>
      </div>
      <span class="verdict-pill ${pillClass}">${pillText}</span>
    </div>
    <div class="text-xs text-mute mt-3">${stock.exchange} · ${stock.sector}</div>
    <div class="mt-4 text-sm text-soft leading-relaxed">${md(stock.thesis || '')}</div>
    ${stock.valueAngle ? `<div class="mt-3 value-angle"><span class="va-label">Value angle</span> ${md(stock.valueAngle)}</div>` : ''}
    ${footer}
  </div>`;
}

function unscreenedCard(stock){
  return `
  <div class="stock-card pending" style="--logo-from:${stock.logoFrom};">
    <div class="flex ai-c jc-b">
      <div class="flex ai-c gap-3">
        <div class="logo" style="background:linear-gradient(135deg, ${stock.logoFrom}, ${stock.logoTo});">${stock.logoText}</div>
        <div>
          <div class="text-base font-semibold">${stock.ticker}</div>
          <div class="text-xs text-soft">${stock.name}</div>
        </div>
      </div>
      <span class="verdict-pill badge-pending">Pending</span>
    </div>
    <div class="text-xs text-mute mt-3">${stock.exchange} · ${stock.sector}</div>
    ${stock.thesis ? `<div class="mt-4 text-sm text-soft leading-relaxed">${md(stock.thesis)}</div>` : ''}
    <div class="mt-4 text-xs text-mute italic">↻ Awaiting 15-question deep dive</div>
  </div>`;
}

function renderScreenSection(screen, picks){
  const methBadge = screen.methodologyType
    ? `<span class="method-badge" title="${screen.methodologyType}">${screen.methodologyType.startsWith('Systematic') ? '⚙️ Systematic' : '✍️ Analyst-pick'}</span>`
    : '';
  return `
  <section class="screen-section">
    <header class="screen-header">
      <div>
        <div class="screen-meta">
          <span class="screen-dot"></span>
          <span class="mono text-mute">${screen.market}</span>
          <span class="text-mute">· as of ${screen.asOf}</span>
          ${methBadge}
        </div>
        <h2 class="screen-title">${screen.title}</h2>
        <p class="screen-count">${picks.length} ${picks.length === 1 ? 'company' : 'companies'} in the queue</p>
      </div>
      <div class="screen-progress">
        <div class="screen-progress-bar"><span style="width:0%"></span></div>
        <div class="text-xs text-mute mt-1">0 of ${picks.length} analyses published</div>
      </div>
    </header>
    <div class="grid md:cols-2 lg:cols-3 gap-4 mt-6">
      ${picks.map(pendingCard).join('')}
    </div>
  </section>`;
}

function renderUngrouped(picks){
  return `
  <section class="screen-section">
    <header class="screen-header">
      <div>
        <div class="screen-meta">
          <span class="screen-dot"></span>
          <span class="mono text-mute">Unaffiliated</span>
        </div>
        <h2 class="screen-title">Other pending analyses</h2>
        <p class="screen-count">${picks.length} ${picks.length === 1 ? 'company' : 'companies'} queued without a screen</p>
      </div>
    </header>
    <div class="grid md:cols-2 lg:cols-3 gap-4 mt-6">
      ${picks.map(unscreenedCard).join('')}
    </div>
  </section>`;
}

function render(){
  const q = state.query.toLowerCase().trim();
  const pending = state.all.filter(s => s.status === 'screened' || s.status === 'watchlist');
  const filtered = pending.filter(s => {
    if(!q) return true;
    const blob = `${s.ticker} ${s.name} ${s.sector} ${s.exchange} ${s.thesis||''} ${s.valueAngle||''}`.toLowerCase();
    return blob.includes(q);
  });

  if(filtered.length === 0){
    screenList.innerHTML = '';
    empty.style.display = 'block';
    empty.innerHTML = pending.length === 0
      ? `<div class="empty-state">
           <div class="text-3xl">✓</div>
           <div class="font-semibold mt-3 text-lg" style="color:#fff;">No companies pending</div>
           <div class="text-sm text-soft mt-2">Every screened company has had its deep dive published. <a href="./index.html" class="text-cyan">View published analyses →</a></div>
         </div>`
      : `<div class="empty-state">
           <div class="text-3xl">🔍</div>
           <div class="font-semibold mt-3 text-lg" style="color:#fff;">No matches for "${state.query}"</div>
           <div class="text-sm text-soft mt-2">${pending.length} companies are pending. Try a different search.</div>
         </div>`;
    return;
  }
  empty.style.display = 'none';

  const byScreen = {};
  const unaffiliated = [];
  filtered.forEach(p => {
    if(p.screenId){
      (byScreen[p.screenId] = byScreen[p.screenId] || []).push(p);
    } else {
      unaffiliated.push(p);
    }
  });

  Object.values(byScreen).forEach(arr =>
    arr.sort((a, b) => (a.priorityRank||999) - (b.priorityRank||999))
  );

  const html = [];
  state.screens.forEach(s => {
    if(byScreen[s.id]) html.push(renderScreenSection(s, byScreen[s.id]));
  });
  Object.keys(byScreen).forEach(id => {
    if(!state.screens.find(s => s.id === id)){
      html.push(renderScreenSection({ id, title: id, market: '—', asOf: '—' }, byScreen[id]));
    }
  });
  if(unaffiliated.length) html.push(renderUngrouped(unaffiliated));

  screenList.innerHTML = html.join('');
}

async function main(){
  try{
    const idx = await loadJSON('./data/index.json');
    state.all = idx.stocks || [];
    state.screens = idx.screens || [];
    const pending = state.all.filter(s => s.status === 'screened' || s.status === 'watchlist').length;
    upcomingCount.textContent = `${pending} upcoming`;
    render();
  }catch(err){
    screenList.innerHTML = `<div class="text-soft">Failed to load index: ${err.message}</div>`;
  }
}

search.addEventListener('input', e => { state.query = e.target.value; render(); });

main();
