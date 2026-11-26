// Agent portal v2: TourRadar-style pages, offer audiences, agent currency, Sri Lanka route builder,
// agent branding, quotations with versions, visa requests, help videos.
import { db, doc, collection, setDoc, updateDoc, getDoc } from './fb.js';
import { S, UI, $, esc, num, fmt, today, cfg, coById, toast, openModal, closeModal, save, table, compressPhoto, photoTag, tagFor } from './core.js';
import { P } from './portal.js';
import { redraw } from './more.js';

const go = h => `href="#/${h}"`;
const portal = () => cfg().portal || {};
const me = () => S.myAgent || {};

/* ---------- money in the agent's own currency ---------- */
export const agentCur = () => me().currency || portal().currency || 'USD';
export function conv(v, from, to = agentCur()) {
  if (!from || from === to) return num(v);
  const fx = cfg().fx || {}; const a = num(fx[from]), b = num(fx[to]);
  return a && b ? num(v) * a / b : num(v);
}
export const money = (v, from) => { const to = (cfg().fx || {})[from] && (cfg().fx || {})[agentCur()] ? agentCur() : from; return fmt(Math.ceil(conv(v, from, to)), to); };

/* ---------- who sees an offer or itinerary ---------- */
export function visibleTo(o, a = me()) {
  if (o.published === false) return false;
  const t = today();
  if (o.startDate && o.startDate > t) return false;
  if (o.validTo && o.validTo < t) return false;
  const aud = o.aud || 'all'; if (aud === 'all') return true;
  const list = s => String(s || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (aud === 'country') return list(o.audCountries).includes(String(a.country || '').trim().toLowerCase());
  if (aud === 'group') return list(o.audGroups).includes(String(a.tier || 'A').toLowerCase());
  if (aud === 'agents') return (o.audAgents || []).includes(a.id);
  return true;
}
const liveOffers = () => (S.offers || []).filter(o => visibleTo(o));
const liveItins = () => (S.itineraries || []).filter(o => visibleTo(o));
const pct = o => num(o.oldPrice) > num(o.priceFrom) && num(o.priceFrom) ? Math.round((1 - num(o.priceFrom) / num(o.oldPrice)) * 100) : 0;
function countdown(to) { const ms = new Date(to + 'T23:59:59') - new Date(); if (ms <= 0) return 'ended'; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4); return `${d}d ${h}h ${m}m`; }
setInterval(() => document.querySelectorAll('[data-cd]').forEach(e => { e.textContent = countdown(e.dataset.cd); }), 30000);

const card = (o, kind) => { const off = pct(o); const ph = (o.photos || [])[0] || ((o.program || [])[0]?.photos || [])[0];
  return `<a class="tcard" ${go(kind + '/' + esc(o.id))}><div class="tc-ph">${photoTag(ph)}${off ? `<em class="tc-off">${off}% off</em>` : ''}${o.badge ? `<em class="tc-badge">${esc(o.badge)}</em>` : ''}</div><div class="tc-bd"><b>${esc(o.title)}</b><div class="note">${esc(o.destination || '')}${num(o.nights) ? ' · ' + num(o.nights) + ' nights' : ''}${o.travel ? ' · ' + esc(o.travel) : ''}</div>
  ${num(o.priceFrom) ? `<div class="tc-pr">${off ? `<s>${esc(money(o.oldPrice, o.currency))}</s> ` : 'From '}<strong>${esc(money(o.priceFrom, o.currency))}</strong> <span class="note">${o.priceUnit || 'per person'}</span></div>` : ''}${o.countdown && o.validTo ? `<div class="tc-cd">Ends in <span data-cd="${esc(o.validTo)}">${countdown(o.validTo)}</span></div>` : ''}</div></a>`; };

/* ---------- home ---------- */
const MAIN_DEST = ['Sri Lanka', 'Bali', 'Maldives', 'Thailand', 'Malaysia'];
P.home = { title: 'Home', render() {
  const p = portal(), a = me(); const offers = liveOffers(); const itins = liveItins();
  const tab = UI.dealTab || 'Top deals';
  const dests = [...new Set([...offers, ...itins].map(o => o.destination).filter(Boolean))];
  const deck = [...offers.map(o => [o, 'offer']), ...itins.filter(i => num(i.priceFrom)).map(o => [o, 'itinerary'])].filter(([o]) => tab === 'Top deals' || o.destination === tab).sort(([x], [y]) => pct(y) - pct(x) || (x.validTo || '9').localeCompare(y.validTo || '9'));
  const ending = offers.filter(o => o.countdown && o.validTo).sort((x, y) => x.validTo.localeCompare(y.validTo))[0];
  const ban = (p.banner || '').startsWith('https://') ? ` style="background-image:linear-gradient(180deg,rgba(29,43,56,.35),rgba(29,43,56,.55)),url('${esc(p.banner)}')"` : '';
  return `${ending ? `<a class="cdbar" ${go('offer/' + esc(ending.id))}><b>${esc(ending.title)}</b>${pct(ending) ? ` · up to ${pct(ending)}% off` : ''}<span class="cdpill">ends in <span data-cd="${esc(ending.validTo)}">${countdown(ending.validTo)}</span></span></a>` : ''}
  <div class="phero"${ban}><h1>${esc(p.headline || 'Welcome')}${a.name ? ', ' + esc(a.name) : ''}</h1><p>${esc(p.welcome || 'Ready packages, hotels, tours and your bookings in one place.')}</p>
  <div class="psearch"><label><span>Where?</span><select id="ps_where">${MAIN_DEST.map(d => `<option>${d}</option>`).join('')}</select></label><label><span>When?</span><input id="ps_when" type="month"></label><label><span>Travellers</span><input id="ps_pax" type="number" min="1" value="2"></label><button class="btn p" data-act="pSearch" aria-label="Search">Search</button></div></div>
  <div class="row" style="margin:22px 0 10px"><h2 style="font-size:22px;margin:0">Deals for you</h2></div>
  <div class="chips">${['Top deals', ...dests].map(d => `<button class="chip ${tab === d ? 'on' : ''}" data-act="dealTab" data-id="${esc(d)}">${esc(d === 'Top deals' ? d : d + ' deals')}</button>`).join('')}</div>
  <div class="tgrid">${deck.map(([o, k]) => card(o, k)).join('') || '<div class="empty">No deals right now. Build a package or search hotels below.</div>'}</div>
  <h2 style="font-size:22px;margin:28px 0 10px">Destinations</h2>
  <div class="dgrid">${MAIN_DEST.map(d => `<div class="dcard"><b>${d}</b><div class="note">${d === 'Sri Lanka' ? 'Packages by route · build your own' : d === 'Maldives' ? 'Resorts with transfers and meal plans' : 'Hotels, tours and transfers'}</div><div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">${d === 'Sri Lanka' ? `<a class="btn s p" ${go('slbuild')}>Build a package</a>` : `<a class="btn s p" ${go('hotels')} data-act="hsDest" data-id="${d}">Hotels</a>`}<a class="btn s" ${go('dest/' + encodeURIComponent(d))}>Deals & itineraries</a></div></div>`).join('')}</div>`;
} };

/* ---------- destination list ---------- */
P.dest = { title: 'Destination', render(id) {
  const d = decodeURIComponent(id || ''); const f = UI.df = UI.df || { max: '', nights: '' };
  let r = [...liveOffers().map(o => [o, 'offer']), ...liveItins().map(o => [o, 'itinerary'])].filter(([o]) => o.destination === d)
    .filter(([o]) => (!num(f.max) || conv(o.priceFrom, o.currency) <= num(f.max)) && (!f.nights || (f.nights === 's' ? num(o.nights) <= 5 : f.nights === 'm' ? num(o.nights) >= 6 && num(o.nights) <= 9 : num(o.nights) >= 10)));
  const row = ([o, k]) => { const off = pct(o); const ph = (o.photos || [])[0] || ((o.program || [])[0]?.photos || [])[0]; const route = (o.program || []).map(x => x.overnight).filter(Boolean); const uniq = route.filter((x, i) => x !== route[i - 1]);
    return `<div class="lrow"><div class="lr-ph">${photoTag(ph)}${off ? `<em class="tc-off">${off}% off</em>` : ''}</div><div class="lr-bd">${o.badge ? `<span class="tag acc">${esc(o.badge)}</span> ` : ''}<h3>${esc(o.title)}</h3><table class="facts">${num(o.nights) ? `<tr><td>Duration</td><td>${num(o.nights)} nights</td></tr>` : ''}${uniq.length ? `<tr><td>Route</td><td>${esc(uniq.join(' → '))}</td></tr>` : ''}${o.travel ? `<tr><td>Travel</td><td>${esc(o.travel)}</td></tr>` : ''}${o.validTo ? `<tr><td>Book by</td><td>${esc(o.validTo)}</td></tr>` : ''}</table></div>
    <div class="lr-pr">${num(o.priceFrom) ? `<div class="note">From</div>${off ? `<s class="note">${esc(money(o.oldPrice, o.currency))}</s>` : ''}<div class="big">${esc(money(o.priceFrom, o.currency))}</div><div class="note">per person</div>` : ''}<a class="btn p" ${go(k + '/' + esc(o.id))}>View</a></div></div>`; };
  return `<div class="pagehead"><div><p class="note"><a ${go('home')}>Home</a> / ${esc(d)}</p><h1>${esc(d)} deals & itineraries</h1></div></div>
  ${d === 'Sri Lanka' ? `<a class="slcta" ${go('slbuild')}><b>Build your own Sri Lanka package</b><span>Pick a ready route, choose hotels and activities, and get the price straight away.</span></a>` : `<div class="row" style="margin-bottom:12px"><a class="btn" ${go('hotels')} data-act="hsDest" data-id="${esc(d)}">Search ${esc(d)} hotels</a><a class="btn" ${go('tours')}>Tours & transfers</a></div>`}
  <div class="hlayout"><div class="card hfilter"><h2>Filter</h2><label>Length<select id="df_n"><option value="">Any</option><option value="s" ${f.nights === 's' ? 'selected' : ''}>Up to 5 nights</option><option value="m" ${f.nights === 'm' ? 'selected' : ''}>6 to 9 nights</option><option value="l" ${f.nights === 'l' ? 'selected' : ''}>10 nights +</option></select></label><label>Max price (${esc(agentCur())})<input id="df_max" type="number" value="${esc(f.max)}"></label><button class="btn" data-act="dfApply">Apply</button></div>
  <div>${r.map(row).join('') || '<div class="empty">Nothing published here yet.</div>'}</div></div>`;
} };

/* ---------- offer & itinerary pages: gallery + sticky booking box ---------- */
function gallery(ph) { if (!ph.length) return ''; return `<div class="pgal">${ph.slice(0, 5).map((p, i) => `<div class="${i === 0 ? 'g0' : ''}">${photoTag(p)}</div>`).join('')}</div>`; }
function bookBox(o, kind) { const off = pct(o);
  return `<aside class="bbox"><div class="note">From</div>${off ? `<s class="note">${esc(money(o.oldPrice, o.currency))}</s> <span class="tag bad">${off}% off</span>` : ''}<div class="big">${num(o.priceFrom) ? esc(money(o.priceFrom, o.currency)) : 'On request'}</div><div class="note">per person${o.priceBasis ? ' · ' + esc(o.priceBasis) : ''}</div>
  ${o.countdown && o.validTo ? `<div class="tc-cd" style="margin-top:8px">Offer ends in <span data-cd="${esc(o.validTo)}">${countdown(o.validTo)}</span></div>` : o.validTo ? `<div class="note" style="margin-top:6px">Book by ${esc(o.validTo)}</div>` : ''}
  <button class="btn p big" style="width:100%;margin-top:12px" data-act="pReq" data-k="${kind}" data-id="${esc(o.id)}">Check availability</button>
  <div class="bb-links"><button class="link" data-act="pPdf" data-k="${kind}" data-id="${esc(o.id)}">⬇ PDF with your logo & price</button>${kind === 'itinerary' ? `<button class="link" data-act="agentItin" data-id="${esc(o.id)}">⬇ Le Ceylan brochure</button>` : ''}${kind === 'itinerary' && o.destination === 'Sri Lanka' ? `<a class="link" ${go('slbuild')}>✎ Customize this trip</a>` : ''}</div>
  <p class="note" style="margin-top:10px">Hotels and services are subject to availability.</p></aside>`; }
const days = list => list.length ? `<div class="card"><div class="row"><h2 style="margin:0">Itinerary</h2><span class="sp"></span><button class="link" data-act="daysAll">Expand all</button></div>${list.map((d, n) => `<details class="dacc" ${UI.daysOpen ? 'open' : ''}><summary><span class="dno">Day ${n + 1}</span>${esc(d.title || d.overnight || '')}</summary><div class="pday">${(d.photos || [])[0] ? photoTag(d.photos[0]) : ''}<div><div style="white-space:pre-line">${esc(d.description || '')}</div>${d.overnight ? `<div class="note" style="margin-top:6px">Overnight: ${esc(d.overnight)}</div>` : ''}</div></div></details>`).join('')}</div>` : '';
P.offer = { title: 'Offer', render(id) {
  const o = (S.offers || []).find(x => x.id === id); if (!o || !visibleTo(o)) return '<div class="empty">This offer is no longer available.</div>';
  return `<p class="note"><a ${go('home')}>Home</a> / <a ${go('dest/' + encodeURIComponent(o.destination || ''))}>${esc(o.destination || '')}</a></p><h1 style="margin:4px 0 12px">${esc(o.title)}</h1>${gallery(o.photos || [])}
  <div class="pcols"><div><div class="card"><div class="ptags">${o.badge ? `<span class="tag acc">${esc(o.badge)}</span>` : ''}${o.destination ? `<span class="tag">${esc(o.destination)}</span>` : ''}${o.travel ? `<span class="tag">Travel ${esc(o.travel)}</span>` : ''}</div><div style="white-space:pre-line;margin-top:10px">${esc(o.body || '')}</div></div>${days(o.program || [])}</div>${bookBox(o, 'offer')}</div>`;
} };
P.itinerary = { title: 'Itinerary', render(id) {
  const i = (S.itineraries || []).find(x => x.id === id); if (!i || !visibleTo(i)) return '<div class="empty">This itinerary is no longer available.</div>';
  const ph = [...(i.photos || []), ...(i.program || []).flatMap(d => d.photos || [])];
  const blk = (t, v) => v ? `<div class="card"><h2>${t}</h2><div style="white-space:pre-line">${esc(v)}</div></div>` : '';
  const route = (i.program || []).map(x => x.overnight).filter(Boolean).filter((x, n, a) => x !== a[n - 1]);
  return `<p class="note"><a ${go('home')}>Home</a> / <a ${go('dest/' + encodeURIComponent(i.destination || ''))}>${esc(i.destination || '')}</a></p><h1 style="margin:4px 0 4px">${esc(i.title)}</h1><p class="note" style="margin:0 0 12px">${num(i.nights) ? num(i.nights) + ' nights' : ''}${route.length ? ' · ' + esc(route.join(' → ')) : ''}</p>${gallery(ph)}
  <div class="pcols"><div>${i.summary ? `<div class="card"><p style="margin:0">${esc(i.summary)}</p></div>` : ''}${(i.program || []).length ? days(i.program) : blk('Day by day', i.days)}<div class="g2">${blk('Hotels', i.hotels)}${blk('Inclusions', i.inclusions)}${blk('Exclusions', i.exclusions)}</div></div>${bookBox(i, 'itinerary')}</div>`;
} };

/* ---------- agent branding: logo, details, own markup ---------- */
export async function loadProfile(force) { if (UI.prof && !force) return UI.prof; const aid = S.me?.agentId; if (!aid) return {}; try { const s = await getDoc(doc(db, 'agentProfiles', aid)); UI.prof = s.exists() ? s.data() : {}; } catch (e) { UI.prof = {}; } return UI.prof; }
const prof = () => UI.prof || {};
const accountBase = P.account.render;
P.account = { title: 'My account', render() {
  if (!UI.prof) { loadProfile().then(() => redraw()); }
  const p = prof(), a = me();
  return accountBase() + `<div class="card"><h2>Your branding <span class="sub">used on the quotations and itineraries you send your clients · our details are not shown</span></h2>
  <div class="grid"><div><span class="note">Your logo</span><div class="logobox">${p.logo ? `<img src="${esc(p.logo)}" alt="Logo">` : '<span class="note">No logo yet</span>'}</div><input type="file" accept="image/*" id="brLogo"></div>
  <label>Name on documents<input id="br_name" value="${esc(p.name || a.name || '')}"></label><label>Phone<input id="br_phone" value="${esc(p.phone || a.phone || '')}"></label><label>Email<input id="br_email" value="${esc(p.email || a.email || '')}"></label><label>Website<input id="br_web" value="${esc(p.web || '')}"></label><label>Address<input id="br_addr" value="${esc(p.address || '')}"></label>
  <label>Your profit on our price %<input id="br_mk" type="number" step="any" value="${esc(p.markupPct ?? 10)}"></label></div>
  <div class="row" style="margin-top:12px"><button class="btn p" data-act="saveBrand">Save branding</button><span class="note">Prices in your portal are shown in ${esc(agentCur())}.</span></div></div>`;
} };

/* client document under the agent's logo, with the agent's own profit added */
function clientDoc({ title, sub, lines = [], dayList = [], priceLines = [], notes = '' }) {
  const p = prof(), a = me();
  const head = `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #3C79A9;padding-bottom:12px;margin-bottom:16px">${p.logo ? `<img src="${esc(p.logo)}" style="max-height:70px;max-width:220px">` : `<b style="font-size:22px">${esc(p.name || a.name || '')}</b>`}<div style="text-align:right;font-size:12px;color:#43546A">${esc(p.name || a.name || '')}<br>${esc(p.phone || a.phone || '')}<br>${esc(p.email || a.email || '')}${p.web ? '<br>' + esc(p.web) : ''}</div></div>`;
  return `<div style="font:14px/1.55 Arial,sans-serif;color:#1D2B38;max-width:820px;margin:auto">${head}<h1 style="font-size:24px;margin:0 0 4px">${esc(title)}</h1><div style="color:#6C7C8E;margin-bottom:14px">${esc(sub || '')}</div>
  ${lines.length ? `<table style="width:100%;border-collapse:collapse;margin-bottom:14px">${lines.map(([k, v]) => `<tr><td style="padding:5px 8px;border-bottom:1px solid #E1E9F1;color:#6C7C8E;width:32%">${esc(k)}</td><td style="padding:5px 8px;border-bottom:1px solid #E1E9F1">${esc(v)}</td></tr>`).join('')}</table>` : ''}
  ${dayList.map((d, n) => `<div style="margin:0 0 12px"><b style="color:#3C79A9">Day ${n + 1}</b> · <b>${esc(d.title || '')}</b><div style="white-space:pre-line">${esc(d.description || '')}</div>${d.overnight ? `<div style="color:#6C7C8E;font-size:12px">Overnight: ${esc(d.overnight)}</div>` : ''}</div>`).join('')}
  ${priceLines.length ? `<div style="background:#F5F9FC;border:1px solid #E1E9F1;border-radius:8px;padding:12px 14px;margin-top:10px">${priceLines.map(([k, v]) => `<div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
  ${notes ? `<p style="color:#6C7C8E;font-size:12px;margin-top:14px;white-space:pre-line">${esc(notes)}</p>` : ''}</div>`;
}
function printHtml(html, title) { const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to download the PDF'); return; } w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{margin:14mm}body{margin:0}</style></head><body>${html}<script>setTimeout(()=>print(),400)<\/script></body></html>`); w.document.close(); }
const withMk = v => v * (1 + num(prof().markupPct ?? 10) / 100);

/* ---------- Sri Lanka route builder ---------- */
const kit = () => (S.portal || []).find(d => d.kind === 'slkit') || null;
const areaOf = (k, n) => (k.areas || []).find(a => a.name === n) || { name: n };
const kmKey = (a, b) => [a, b].sort().join('|');
export const kmBetween = (k, a, b) => a === b ? 0 : num((k.km || {})[kmKey(a, b)]);
const slHotels = (area) => (S.portal || []).filter(d => d.kind === 'hotel' && d.destination === 'Sri Lanka' && (d.city || '').toLowerCase() === area.toLowerCase());
const slActs = (area) => (S.portal || []).filter(d => d.kind === 'tour' && d.destination === 'Sri Lanka').flatMap(d => (d.items || []).map((x, i) => ({ ...x, key: d.id + ':' + i, currency: d.currency }))).filter(x => (x.city || '').toLowerCase() === area.toLowerCase() && x.type !== 'Transfer');
export function stopsOf(nights) { const s = []; nights.forEach((a, i) => { if (s.length && s[s.length - 1].area === a) s[s.length - 1].nights++; else s.push({ area: a, nights: 1, first: i }); }); return s; }
const addDays = (d, n) => { if (!d) return ''; const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
export function routeChecks(k, nights) {
  const st = stopsOf(nights), out = [];
  const seen = new Set(); st.forEach((s, i) => { if (seen.has(s.area)) out.push({ t: 'bad', m: `${s.area} appears twice. The route goes back and forth.` }); seen.add(s.area); });
  const ord = st.map(s => areaOf(k, s.area).order).filter(o => o !== undefined && o !== '' && !isNaN(o)).map(Number);
  const up = ord.every((o, i) => !i || o >= ord[i - 1]), down = ord.every((o, i) => !i || o <= ord[i - 1]);
  if (ord.length > 2 && !up && !down) { const rec = [...st].sort((x, y) => num(areaOf(k, x.area).order) - num(areaOf(k, y.area).order)).map(s => s.area); out.push({ t: 'bad', m: `This order is not how the route runs. Recommended: ${[...new Set(rec)].join(' → ')}.`, fix: true }); }
  for (let i = 1; i < st.length; i++) { const km = kmBetween(k, st[i - 1].area, st[i].area); if (!km) out.push({ t: 'acc', m: `Driving distance ${st[i - 1].area} → ${st[i].area} is not set yet. We will confirm it.` }); else if (km >= num(k.warnKm || 180)) out.push({ t: 'acc', m: `${st[i].area} is about ${Math.round(km / 40)} hours (${km} km) from ${st[i - 1].area}. Consider a stop in between.` }); }
  return out;
}
export function slPrice(k, s) {
  const nights = s.nights || [], st = stopsOf(nights), adults = Math.max(1, num(s.adults)), kids = num(s.children), pax = adults + kids, rooms = Math.max(1, Math.ceil(adults / 2));
  const cur = k.currency || 'USD'; const lines = []; let total = 0; const add = (label, v, grp) => { v = Math.ceil(num(v) * 100) / 100; total += v; lines.push({ label, v, grp }); };
  const ab = [];
  st.forEach((x, i) => {
    const date = addDays(s.start, x.first); const hs = slHotels(x.area).filter(h => !s.cats?.[i] || String(h.stars || '') === String(s.cats[i]));
    const pickRoom = h => (h.rooms || []).filter(r => !date || ((!r.validFrom || r.validFrom <= date) && (!r.validTo || r.validTo >= date))).sort((a, b) => a.price - b.price)[0];
    let h = hs.find(y => y.id === s.hotels?.[i]) || hs.filter(pickRoom).sort((a, b) => pickRoom(a).price - pickRoom(b).price)[0];
    const r = h && (h.rooms || []).find((y, j) => j === s.room?.[i] && (!date || ((!y.validFrom || y.validFrom <= date) && (!y.validTo || y.validTo >= date)))) || (h && pickRoom(h));
    if (h && r) { const perP = /person/i.test(r.unit || ''); add(`${x.area}: ${h.name}, ${r.service}${r.meal ? ' ' + r.meal : ''} × ${x.nights} night${x.nights > 1 ? 's' : ''}`, conv(r.price, h.currency, cur) * x.nights * (perP ? pax : rooms), 'Hotels'); if (!h.driverRoom) add(`Driver room at ${h.name}`, num(k.driverRoom) * x.nights, 'Transport'); }
    else ab.push(x.area);
    x.hotel = h; x.room = r;
  });
  const legs = []; const ends = [k.startArea || 'Airport', ...st.map(x => x.area), k.endArea || k.startArea || 'Airport'];
  for (let i = 1; i < ends.length; i++) legs.push(kmBetween(k, ends[i - 1], ends[i]));
  const leisure = st.reduce((a, x) => a + (x.nights - 1) * num(areaOf(k, x.area).minKm || k.minKm || 100), 0);
  const km = legs.reduce((a, b) => a + b, 0) + leisure;
  const veh = (k.vehicles || []).find(v => pax <= num(v.max)) || (k.vehicles || []).slice(-1)[0] || { name: 'Vehicle', perKm: 0 };
  add(`${veh.name} with chauffeur, about ${km} km`, km * num(veh.perKm), 'Transport');
  const needGuide = pax >= num(k.guideMin || 10) || s.guide;
  if (needGuide) { add(`National guide${s.guideLang ? ' (' + s.guideLang + ')' : ''} × ${nights.length + 1} days`, num(k.guideDay) * (nights.length + 1), 'Guide'); add(`Guide accommodation × ${nights.length} nights`, num(k.guideRoom) * nights.length, 'Guide'); }
  Object.entries(s.acts || {}).forEach(([key, on]) => { if (!on) return; const a = st.flatMap(x => slActs(x.area)).find(y => y.key === key); if (a) add(a.service, conv(a.price, a.currency, cur) * (/person/i.test(a.unit || '') ? pax : 1), 'Activities'); });
  add('Service & handling', num(k.markupPP) * pax, 'Service');
  return { total, perPerson: total / pax, pax, rooms, lines, cur, stops: st, km, vehicle: veh, needGuide, missing: ab };
}
function slDays(k, s, res) {
  const st = res.stops, out = []; let day = 0;
  st.forEach((x, i) => { const A = areaOf(k, x.area); const prev = i ? st[i - 1].area : null;
    for (let n = 0; n < x.nights; n++) { day++; const acts = n === 0 ? slActs(x.area).filter(a => s.acts?.[a.key]).map(a => a.service) : [];
      out.push({ title: n === 0 ? (prev ? `${prev} to ${x.area}` : `Arrival · transfer to ${x.area}`) : `${x.area}`, description: [n === 0 ? (A.dayText || '') : (A.leisureText || `Day at leisure in ${x.area}, or join an optional excursion.`), (A.freeItems && n === 0) ? 'Included: ' + A.freeItems : '', acts.length ? 'Your activities: ' + acts.join(', ') : ''].filter(Boolean).join('\n'), overnight: x.hotel ? `${x.hotel.name}, ${x.area}` : x.area }); } });
  out.push({ title: 'Departure', description: 'Transfer to the airport for your flight home.', overnight: '' });
  return out;
}
const slState = () => UI.sl;
P.slbuild = { title: 'Sri Lanka builder', render() {
  const k = kit(); if (!k) return '<div class="empty">The Sri Lanka package builder is being prepared. Please check back soon or send us a request.</div>';
  if (!UI.sl) return slPick(k);
  const s = UI.sl, res = slPrice(k, s), checks = routeChecks(k, s.nights), st = res.stops;
  const nightRows = s.nights.map((a, i) => { const firstOf = i === 0 || s.nights[i - 1] !== a; const swaps = String(areaOf(k, a).swaps || '').split(',').map(x => x.trim()).filter(Boolean);
    return `<div class="nrow"><span class="nno">Night ${i + 1}</span><b>${esc(a)}</b>${firstOf ? '<span class="note">first night of this stop</span>' : `${swaps.length ? `<select data-act-change="slSwap" data-id="${i}"><option value="">Replace with…</option>${swaps.map(w => `<option>${esc(w)}</option>`).join('')}</select>` : ''}<button class="link" data-act="slDel" data-id="${i}">Remove night</button>`}<span class="sp"></span>${(i === s.nights.length - 1 || s.nights[i + 1] !== a) ? `<button class="link" data-act="slAdd" data-id="${i}">+ Add a night in ${esc(a)}</button>` : ''}</div>`; }).join('');
  const stopCards = st.map((x, i) => { const hs = slHotels(x.area); const cats = [...new Set(hs.map(h => String(h.stars || '')).filter(Boolean))].sort().reverse(); const list = hs.filter(h => !s.cats?.[i] || String(h.stars || '') === String(s.cats[i]));
    return `<div class="card"><div class="row"><h3 style="margin:0">${esc(x.area)} <span class="note">${x.nights} night${x.nights > 1 ? 's' : ''}${s.start ? ' · from ' + esc(addDays(s.start, x.first)) : ''}</span></h3><span class="sp"></span><select data-act-change="slCat" data-id="${i}"><option value="">Any category</option>${cats.map(c => `<option value="${c}" ${String(s.cats?.[i] || '') === c ? 'selected' : ''}>${c}★</option>`).join('')}</select></div>
    ${list.length ? `<div class="hpick">${list.map(h => `<label class="hopt ${x.hotel?.id === h.id ? 'on' : ''}"><input type="radio" name="h${i}" data-act-change="slHotel" data-id="${i}" value="${esc(h.id)}" ${x.hotel?.id === h.id ? 'checked' : ''}>${photoTag((h.photos || [])[0])}<span><b>${esc(h.name)}</b> ${num(h.stars) ? '★'.repeat(num(h.stars)) : ''}<br><span class="note">${esc((h.rooms || [])[0]?.meal || '')}</span></span></label>`).join('')}</div>` : `<p class="note">No contracted hotels here yet.</p>`}
    <button class="link" data-act="slOther" data-id="${esc(x.area)}">Want a hotel that is not listed? Ask us for a manual quote</button>
    ${(() => { const A = areaOf(k, x.area); const acts = slActs(x.area); return (A.freeItems || acts.length) ? `<div class="acts"><b>Activities</b>${String(A.freeItems || '').split(';').map(t => t.trim()).filter(Boolean).map(t => `<label class="act fixed"><input type="checkbox" checked disabled> ${esc(t)} <span class="tag ok">Included</span></label>`).join('')}${acts.map(a => `<label class="act"><input type="checkbox" data-act-change="slAct" data-id="${esc(a.key)}" ${s.acts?.[a.key] ? 'checked' : ''}> ${esc(a.service)} <span class="note">${esc(money(a.price, a.currency))} ${esc(a.unit || '')}</span></label>`).join('')}</div>` : ''; })()}</div>`; }).join('');
  const byGrp = res.lines.reduce((m, l) => { m[l.grp] = (m[l.grp] || 0) + l.v; return m; }, {});
  return `<div class="pagehead"><div><p class="note"><a ${go('home')}>Home</a> / <a ${go('dest/Sri%20Lanka')}>Sri Lanka</a></p><h1>${esc(s.title)}</h1><p class="lead">${s.nights.length} nights · ${esc(stopsOf(s.nights).map(x => x.area).join(' → '))}</p></div><button class="btn" data-act="slReset">Choose another route</button></div>
  <div class="pcols"><div>
  <div class="card"><h2>Travel details</h2><div class="grid"><label>Arrival date<input type="date" data-act-change="slField" data-k="start" value="${esc(s.start || '')}"></label><label>Adults<input type="number" min="1" data-act-change="slField" data-k="adults" value="${esc(s.adults)}"></label><label>Children<input type="number" min="0" data-act-change="slField" data-k="children" value="${esc(s.children || 0)}"></label>
  <label>National guide<select data-act-change="slField" data-k="guide"><option value="">${res.pax >= num(k.guideMin || 10) ? 'Included (10+ guests)' : 'No (chauffeur only)'}</option>${res.pax < num(k.guideMin || 10) ? `<option value="1" ${s.guide ? 'selected' : ''}>Yes, add a national guide (extra charge)</option>` : ''}</select></label>${res.needGuide ? `<label>Guide language<select data-act-change="slField" data-k="guideLang">${String(k.guideLangs || 'English').split(',').map(l => l.trim()).map(l => `<option ${s.guideLang === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>` : ''}</div>
  ${s.guide && res.pax < num(k.guideMin || 10) ? '<p class="warn" style="margin-top:10px">By Sri Lanka regulation a national guide applies for 10 or more guests. For smaller groups it is optional and charged extra. Languages are subject to availability.</p>' : ''}<p class="note" style="margin:8px 0 0">Vehicle: ${esc(res.vehicle.name)} for ${res.pax} guest${res.pax > 1 ? 's' : ''}.</p></div>
  <div class="card"><h2>Your route <span class="sub">change from the second night of a stop onwards</span></h2>${nightRows}
  ${checks.map(c => `<div class="${c.t === 'bad' ? 'errbox' : 'warn'}" style="margin-top:8px">${esc(c.m)}${c.fix ? ' <button class="btn s" data-act="slFix">Fix it for me</button>' : ''}</div>`).join('')}</div>
  ${stopCards}</div>
  <aside class="bbox"><div class="note">Total for ${res.pax} guest${res.pax > 1 ? 's' : ''}</div><div class="big">${esc(money(res.total, res.cur))}</div><div class="note">${esc(money(res.perPerson, res.cur))} per person</div>
  <div class="bb-break">${Object.entries(byGrp).map(([g, v]) => `<div><span>${esc(g)}</span><span>${esc(money(v, res.cur))}</span></div>`).join('')}</div>
  ${res.missing.length ? `<p class="warn">No hotel price yet for: ${esc(res.missing.join(', '))}. We will add it in our reply.</p>` : ''}
  <label style="margin-top:10px">Name this quote<input data-act-change="slField" data-k="qname" value="${esc(s.qname || '')}" placeholder="e.g. Mr Ahmad family"></label>
  <button class="btn p big" style="width:100%;margin-top:10px" data-act="slSave">Save quotation${s.qid ? ' (new version)' : ''}</button>
  <button class="btn" style="width:100%;margin-top:8px" data-act="slSend">Check availability with us</button>
  <div class="bb-links"><button class="link" data-act="slPdf" data-k="client">⬇ Client PDF with your logo & profit</button><button class="link" data-act="slPdf" data-k="net">⬇ Net quote (your price)</button></div>
  <p class="note" style="margin-top:10px">Hotels are subject to availability. Please check with us before confirming to your client.</p></aside></div>`;
} };
function slPick(k) {
  const routes = (k.routes || []).filter(r => (r.stops || []).length);
  const styles = [...new Set(routes.map(r => r.style).filter(Boolean))]; const f = UI.slStyle || '';
  return `<div class="pagehead"><div><p class="note"><a ${go('home')}>Home</a> / Sri Lanka</p><h1>Build a Sri Lanka package</h1><p class="lead">Choose a ready route. You can then change nights, hotels and activities, and the price updates straight away.</p></div></div>
  <div class="chips"><button class="chip ${!f ? 'on' : ''}" data-act="slStyle" data-id="">All routes</button>${styles.map(x => `<button class="chip ${f === x ? 'on' : ''}" data-act="slStyle" data-id="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <div class="tgrid">${routes.filter(r => !f || r.style === f).map(r => { const n = r.stops.reduce((a, x) => a + num(x.nights), 0); return `<button class="tcard" data-act="slStart" data-id="${esc(r.id)}" style="text-align:left"><div class="tc-ph">${photoTag(r.photo)}${r.style ? `<em class="tc-badge">${esc(r.style)}</em>` : ''}</div><div class="tc-bd"><b>${esc(r.title)}</b><div class="note">${n} nights · ${esc(r.stops.map(x => `${x.nights}N ${x.area}`).join(' · '))}</div>${r.summary ? `<div class="note" style="margin-top:4px">${esc(r.summary)}</div>` : ''}</div></button>`; }).join('') || '<div class="empty">No routes published yet.</div>'}</div>`;
}

/* ---------- my quotations with versions ---------- */
P.myquotes = { title: 'My quotations', render() {
  const r = (S.agentQuotes || []).slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return `<div class="pagehead"><div><h1>My quotations</h1><p class="lead">Every package you build is saved here with its versions.</p></div><a class="btn p" ${go('slbuild')}>New Sri Lanka package</a></div>
  <div class="card">${table(['Quote', 'Route', 'Guests', 'Total', 'Versions', 'Updated', ''], r.map(q => `<tr><td><b>${esc(q.qname || q.title)}</b><div class="note">${esc(q.no || '')}</div></td><td class="note">${esc(q.routeText || '')}</td><td>${num(q.pax)}</td><td class="num">${esc(money(q.total, q.currency))}</td><td>${(q.versions || []).length}</td><td class="note">${esc((q.updatedAt || '').slice(0, 10))}</td><td><button class="btn s" data-act="slOpen" data-id="${esc(q.id)}">Open</button></td></tr>`), 'No saved quotations yet.')}</div>`;
} };

/* ---------- visa ---------- */
P.visa = { title: 'Visa', render() {
  const list = portal().visa || []; const v = UI.visaC || list[0]?.country || '';
  const c = list.find(x => x.country === v);
  const mine = (S.visaRequests || []).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return `<div class="pagehead"><div><h1>Visa requests</h1><p class="lead">Send us the documents and we apply for your clients.</p></div></div>
  ${list.length ? `<div class="chips">${list.map(x => `<button class="chip ${x.country === v ? 'on' : ''}" data-act="visaC" data-id="${esc(x.country)}">${esc(x.country)}</button>`).join('')}</div>` : '<div class="empty">Visa services will be listed here soon.</div>'}
  ${c ? `<div class="card"><h2>${esc(c.country)} visa ${num(c.fee) ? `<span class="sub">${esc(money(c.fee, c.currency || 'USD'))} per person</span>` : ''}</h2><div style="white-space:pre-line">${esc(c.requirements || '')}</div>
  <div class="grid" style="margin-top:12px"><label>Traveller full name (as in passport)<input id="vz_name"></label><label>Nationality<input id="vz_nat"></label><label>Travel date<input id="vz_date" type="date"></label></div>
  <div class="grid" style="margin-top:8px">${String(c.docs || 'Passport copy, Photo').split(',').map(x => x.trim()).filter(Boolean).map((d, i) => `<label>${esc(d)}<input type="file" accept="image/*,application/pdf" class="vzFile" data-doc="${esc(d)}"></label>`).join('')}</div>
  <div class="row" style="margin-top:12px"><button class="btn p" data-act="visaSend" data-id="${esc(c.country)}">Send visa request</button><span class="note">Photos and scans are compressed before upload. PDFs up to 700 KB.</span></div></div>` : ''}
  <div class="card"><h2>Sent requests</h2>${table(['Date', 'Country', 'Traveller', 'Status'], mine.map(x => `<tr><td class="note">${esc((x.createdAt || '').slice(0, 10))}</td><td>${esc(x.country)}</td><td>${esc(x.name)}</td><td>${tagFor(x.status || 'New request')}</td></tr>`), 'No visa requests yet.')}</div>`;
} };

/* ---------- help videos ---------- */
const embed = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/); return m ? `https://www.youtube.com/embed/${m[1]}` : (/^https:\/\//.test(u) ? u : ''); };
P.help = { title: 'Help', render() {
  const vids = portal().videos || []; const langs = [...new Set(vids.map(v => v.lang).filter(Boolean))]; const l = UI.helpLang || langs[0] || '';
  return `<div class="pagehead"><div><h1>Help & tutorials</h1><p class="lead">Short videos on how to use the portal.</p></div></div>
  ${langs.length ? `<div class="chips">${langs.map(x => `<button class="chip ${x === l ? 'on' : ''}" data-act="helpLang" data-id="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
  <div class="vgrid">${vids.filter(v => v.lang === l).map(v => `<div class="card"><h3 style="margin-top:0">${esc(v.title)}</h3>${embed(v.url) ? `<div class="vwrap"><iframe src="${esc(embed(v.url))}" allowfullscreen loading="lazy" title="${esc(v.title)}"></iframe></div>` : ''}</div>`).join('') || '<div class="empty">Tutorial videos are coming soon.</div>'}</div>`;
} };

/* ---------- actions ---------- */
const nightsFromRoute = r => r.stops.flatMap(x => Array(Math.max(1, num(x.nights))).fill(x.area));
const req = (title, text, extra = {}) => { UI.hsReq = { title, text, ...extra }; const co = coById(me().company); const wa = String(co.whatsapp || portal().whatsapp || co.phone || '').replace(/[^\d]/g, ''); const em = portal().email || co.email || '';
  openModal('Check availability', `<p class="note">Choose how to send it. We reply with availability and confirmation.</p><textarea id="hsText" style="min-height:200px">${esc(text)}</textarea><div class="row" style="margin-top:12px"><button class="btn p" data-act="hsSend" data-k="wa" ${wa ? '' : 'disabled'}>Send on WhatsApp</button><button class="btn" data-act="hsSend" data-k="mail" ${em ? '' : 'disabled'}>Send by email</button></div>`); };
function slText(k, s, res) { return `Sri Lanka package: ${s.title}${s.qname ? ' (' + s.qname + ')' : ''}\nArrival: ${s.start || '…'} · ${s.nights.length} nights · ${res.pax} guests (${num(s.adults)} adults${num(s.children) ? ', ' + num(s.children) + ' children' : ''})\nRoute: ${res.stops.map(x => `${x.nights}N ${x.area}${x.hotel ? ' (' + x.hotel.name + ')' : ''}`).join(' → ')}\nVehicle: ${res.vehicle.name}${res.needGuide ? ` · national guide ${s.guideLang || ''}` : ''}\nTotal: ${money(res.total, res.cur)} (${money(res.perPerson, res.cur)} per person)${s.no ? '\nQuote ref: ' + s.no : ''}\n\nAgent: ${me().name || ''} · ${S.me?.name || ''}`; }
export const AGENT_A = {
  pSearch() { const d = $('#ps_where').value; UI.df = { max: '', nights: '' }; location.hash = d === 'Sri Lanka' ? '#/slbuild' : '#/dest/' + encodeURIComponent(d); },
  dealTab(id) { UI.dealTab = id; redraw(); },
  dfApply() { UI.df = { max: $('#df_max').value, nights: $('#df_n').value }; redraw(); },
  hsDest(id) { UI.hs = { ...(UI.hs || { open: {}, rooms: 1, sort: 'price', name: '', stars: '', max: '', cin: '', cout: '' }), dest: id, city: '' }; location.hash = '#/hotels'; },
  daysAll() { UI.daysOpen = !UI.daysOpen; redraw(); },
  pReq(id, el) { const k = el.dataset.k; const o = (k === 'offer' ? S.offers : S.itineraries).find(x => x.id === id); if (!o) return; req(o.title, `Hello, please check availability for:\n\n${o.title} (${o.destination || ''})\nPrice from: ${num(o.priceFrom) ? money(o.priceFrom, o.currency) + ' per person' : 'on request'}\nTravel date: \nGuests: \nNationality: \n\nAgent: ${me().name || ''} · ${S.me?.name || ''}`, { destination: o.destination }); },
  async pPdf(id, el) { await loadProfile(); const k = el.dataset.k; const o = (k === 'offer' ? S.offers : S.itineraries).find(x => x.id === id); if (!o) return;
    const price = num(o.priceFrom) ? withMk(conv(o.priceFrom, o.currency)) : 0;
    printHtml(clientDoc({ title: o.title, sub: [o.destination, num(o.nights) ? num(o.nights) + ' nights' : '', o.travel].filter(Boolean).join(' · '), lines: [], dayList: o.program || [], priceLines: price ? [['Price from, per person', fmt(Math.ceil(price), agentCur())]] : [], notes: [o.body, o.inclusions ? 'Includes:\n' + o.inclusions : '', o.exclusions ? 'Excludes:\n' + o.exclusions : '', 'Subject to availability at the time of booking.'].filter(Boolean).join('\n\n') }), o.title); },
  async saveBrand() {
    const aid = S.me?.agentId; if (!aid) return; const f = $('#brLogo')?.files?.[0]; let logo = prof().logo || '';
    try { if (f) { logo = await compressPhoto(f, 500); if (logo.length > 300000) logo = await compressPhoto(f, 320); }
      const d = { logo, name: $('#br_name').value.trim(), phone: $('#br_phone').value.trim(), email: $('#br_email').value.trim(), web: $('#br_web').value.trim(), address: $('#br_addr').value.trim(), markupPct: num($('#br_mk').value), agentId: aid, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, 'agentProfiles', aid), d); UI.prof = d; toast('Branding saved'); redraw(); } catch (e) { toast('Could not save: ' + (e.code || e.message)); } },
  slStyle(id) { UI.slStyle = id; redraw(); },
  slStart(id) { const k = kit(); const r = (k?.routes || []).find(x => x.id === id); if (!r) return; UI.sl = { routeId: r.id, title: r.title, nights: nightsFromRoute(r), adults: 2, children: 0, cats: {}, hotels: {}, room: {}, acts: {}, start: '' }; redraw(); },
  slReset() { UI.sl = null; redraw(); },
  slSwap(i, el) { const s = slState(); if (!el.value) return; s.nights[+i] = el.value; redraw(); },
  slDel(i) { const s = slState(); s.nights.splice(+i, 1); redraw(); },
  slAdd(i) { const s = slState(); s.nights.splice(+i + 1, 0, s.nights[+i]); redraw(); },
  slFix() { const s = slState(), k = kit(); const st = stopsOf(s.nights); const merged = []; st.forEach(x => { const m = merged.find(y => y.area === x.area); if (m) m.nights += x.nights; else merged.push({ ...x }); }); merged.sort((a, b) => num(areaOf(k, a.area).order) - num(areaOf(k, b.area).order)); s.nights = merged.flatMap(x => Array(x.nights).fill(x.area)); s.hotels = {}; s.cats = {}; redraw(); },
  slField(_, el) { const s = slState(); const k = el.dataset.k; s[k] = el.type === 'number' ? num(el.value) : el.value; if (k === 'guide') s.guide = !!el.value; redraw(); },
  slCat(i, el) { const s = slState(); s.cats[i] = el.value; delete s.hotels[i]; redraw(); },
  slHotel(i, el) { slState().hotels[i] = el.value; redraw(); },
  slAct(key, el) { slState().acts[key] = el.checked; redraw(); },
  slOther(area) { const s = slState(); req(`Hotel in ${area}`, `Hello, please quote a hotel in ${area} that is not in the portal:\n\nHotel name: \nRoom type: \nMeal plan: \nDates: ${s.start || '…'}\nGuests: ${num(s.adults)} adults${num(s.children) ? ', ' + num(s.children) + ' children' : ''}\nPackage: ${s.title}\n\nAgent: ${me().name || ''} · ${S.me?.name || ''}`, { destination: 'Sri Lanka' }); },
  async slSave(_, btn) {
    const s = slState(), k = kit(); if (!s) return; const res = slPrice(k, s); btn.disabled = true;
    const ver = { at: new Date().toISOString(), total: res.total, nights: s.nights.slice(), state: JSON.parse(JSON.stringify(s)) };
    const base = { agentId: S.me.agentId, userId: S.user.uid, byName: S.me.name || '', kind: 'sl', title: s.title, qname: s.qname || '', routeText: res.stops.map(x => `${x.nights}N ${x.area}`).join(' · '), pax: res.pax, total: Math.round(res.total * 100) / 100, perPerson: Math.round(res.perPerson * 100) / 100, currency: res.cur, start: s.start || '', state: JSON.parse(JSON.stringify(s)), updatedAt: ver.at };
    try {
      if (s.qid) { const q = (S.agentQuotes || []).find(x => x.id === s.qid) || {}; await updateDoc(doc(db, 'agentQuotes', s.qid), { ...base, versions: [...(q.versions || []), ver] }); toast('Saved as version ' + ((q.versions || []).length + 1)); }
      else { const ref = doc(collection(db, 'agentQuotes')); const no = 'AQ-' + Date.now().toString(36).toUpperCase().slice(-6); await setDoc(ref, { ...base, no, versions: [ver], status: 'Draft', createdAt: ver.at }); s.qid = ref.id; s.no = no; toast('Quotation saved · ' + no); }
    } catch (e) { toast('Could not save: ' + (e.code || e.message)); }
    btn.disabled = false; redraw(); },
  slOpen(id) { const q = (S.agentQuotes || []).find(x => x.id === id); if (!q) return; UI.sl = { ...JSON.parse(JSON.stringify(q.state || {})), qid: q.id, no: q.no }; location.hash = '#/slbuild'; },
  slSend() { const s = slState(), k = kit(); const res = slPrice(k, s); req(s.title, slText(k, s, res), { arrival: s.start || '', destination: 'Sri Lanka' }); if (s.qid) updateDoc(doc(db, 'agentQuotes', s.qid), { status: 'Sent to us', sentAt: new Date().toISOString() }).catch(() => { }); },
  async slPdf(_, el) { await loadProfile(); const s = slState(), k = kit(); const res = slPrice(k, s); const client = el.dataset.k === 'client'; const to = agentCur();
    const tot = conv(res.total, res.cur, to) * (client ? 1 + num(prof().markupPct ?? 10) / 100 : 1);
    printHtml(clientDoc({ title: s.qname ? `${s.title} · ${s.qname}` : s.title, sub: `Sri Lanka · ${s.nights.length} nights · ${res.pax} guests${s.start ? ' · arrival ' + s.start : ''}`, lines: [['Route', res.stops.map(x => `${x.nights}N ${x.area}`).join(' → ')], ['Hotels', res.stops.map(x => x.hotel ? `${x.area}: ${x.hotel.name}${x.room ? ' · ' + x.room.service + (x.room.meal ? ' ' + x.room.meal : '') : ''}` : `${x.area}: to be confirmed`).join('\n')], ['Transport', `${res.vehicle.name} with English-speaking chauffeur${res.needGuide ? `, national guide${s.guideLang ? ' (' + s.guideLang + ')' : ''}` : ''}`]], dayList: slDays(k, s, res), priceLines: [['Total package price', fmt(Math.ceil(tot), to)], ['Per person', fmt(Math.ceil(tot / res.pax), to)]], notes: 'Hotels are subject to availability at the time of booking. Prices may change with dates and availability.' }), s.title); },
  visaC(id) { UI.visaC = id; redraw(); },
  async visaSend(country, btn) {
    const name = $('#vz_name').value.trim(); if (!name) { toast('Add the traveller name'); return; }
    btn.disabled = true; btn.textContent = 'Uploading…';
    try {
      const ref = doc(collection(db, 'visaRequests')); const files = [];
      for (const inp of document.querySelectorAll('.vzFile')) { const f = inp.files?.[0]; if (!f) continue; let data;
        if (/^image\//.test(f.type)) data = await compressPhoto(f, 1600); else { if (f.size > 700000) { toast(f.name + ' is too large (max 700 KB)'); continue; } data = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); }); }
        files.push({ doc: inp.dataset.doc, name: f.name, data }); }
      await setDoc(ref, { agentId: S.me.agentId, byName: S.me.name || '', agentName: me().name || '', country, name, nationality: $('#vz_nat').value.trim(), travelDate: $('#vz_date').value, status: 'New request', fileCount: files.length, createdAt: new Date().toISOString() });
      for (let i = 0; i < files.length; i++) await setDoc(doc(db, 'visaRequests', ref.id, 'files', String(i)), { ...files[i], agentId: S.me.agentId });
      toast('Visa request sent'); redraw();
    } catch (e) { toast('Could not send: ' + (e.code || e.message)); btn.disabled = false; btn.textContent = 'Send visa request'; }
  },
  helpLang(id) { UI.helpLang = id; redraw(); },
};
