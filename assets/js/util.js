// Lightweight inline-markdown renderer for **bold** and _italic_.
// Safe: HTML-escapes first, then re-applies markup.
export function md(text){
  if(text == null) return '';
  let s = String(text)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/_(.+?)_/g, '<em>$1</em>');
  return s;
}

export function chip(text, tone){
  const t = tone && tone !== 'neutral' ? ` chip ${tone}` : ' chip';
  return `<span class="${t.trim()}">${md(text)}</span>`;
}

export function el(tag, attrs={}, html=''){
  const a = Object.entries(attrs).map(([k,v]) => v == null ? '' : ` ${k}="${String(v).replace(/"/g,'&quot;')}"`).join('');
  return `<${tag}${a}>${html}</${tag}>`;
}

export function tone2Class(t){
  if(t === 'pos') return 'text-pos';
  if(t === 'neg') return 'text-neg';
  if(t === 'warn') return 'text-warn';
  return '';
}

export function badgeFromRating(rating){
  if(!rating) return 'badge-hold';
  const r = rating.toUpperCase();
  if(r.includes('BUY')) return 'badge-buy';
  if(r.includes('SELL') || r.includes('TRIM')) return 'badge-sell';
  return 'badge-hold';
}

export async function loadJSON(url){
  const res = await fetch(url, { cache:'no-cache' });
  if(!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.json();
}

export function getParam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}
