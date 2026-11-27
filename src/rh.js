// Agent portal, RateHawk-style layout in Le Ceylan colours:
// home with a search band and an account dashboard, hotel results with filters and a map, and a hotel page with a rooms table.
import { S, UI, $, esc, num, fmt, today, cfg, toast, photoTag } from './core.js';
import { P } from './portal.js';
import { redraw } from './more.js';
import { money, agentCur, conv } from './agentx.js';

const go = h => `href="#/${h}"`;
const portal = () => cfg().portal || {};
const me = () => S.myAgent || {};
const nightsOf = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5)) : 0);
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const nice = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const starsH = n => num(n) ? `<span class="rh-stars" aria-label="${num(n)} stars">${'★'.repeat(num(n))}</span>` : '';
const hs = () => { const s = (UI.hs = UI.hs || { dest: '', city: '', cin: '', cout: '', rooms: 1, name: '', stars: '', max: '', sort: 'price', open: {} }); s.meals = s.meals || []; s.starSet = s.starSet || []; s.guests = s.guests || 2; return s; };
const hotels = () => (S.portal || []).filter(d => d.kind === 'hotel');
const roomOk = (r, cin) => !cin || ((!r.validFrom || r.validFrom <= cin) && (!r.validTo || r.validTo >= cin));
const perNight = u => /night/i.test(u || '');
const mapSrc = q => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed`;
const mapQ = h => h.mapQ || [h.name, h.address || h.area, h.city, h.destination].filter(Boolean).join(', ');

/* cancellation wording for one rate, given the check-in date */
export function cancelInfo(r, cin) {
  const t = String(r.cancel || '').trim(); const fd = num(r.freeDays);
  if (/non.?ref/i.test(t)) return { cls: 'bad', text: 'Non-refundable' };
  if (fd > 0) {
    if (!cin) return { cls: 'ok', text: `Free cancellation up to ${fd} days before arrival` };
    const dl = addDays(cin, -fd);
    return dl >= today() ? { cls: 'ok', text: `Free cancellation until ${nice(dl)}`, dl } : { cls: 'bad', text: 'Inside cancellation period: charges apply' };
  }
  return t ? { cls: '', text: t } : { cls: '', text: 'Cancellation policy on request' };
}

/* recently viewed hotels, kept in this browser only */
const RKEY = 'lc_recent_hotels';
const recent = () => { try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch (e) { return []; } };
function remember(h, s) { try { const list = [{ id: h.id, name: h.name, city: h.city || h.destination, cin: s.cin, cout: s.cout, rooms: s.rooms }, ...recent().filter(x => x.id !== h.id)].slice(0, 6); localStorage.setItem(RKEY, JSON.stringify(list)); } catch (e) { } }

/* ---------- account dashboard numbers from the agent's bookings ---------- */
function accountStats() {
  const cur = agentCur(), t = today(), soon = addDays(t, 7);
  const st = { notDue: 0, due: 0, overdue: 0, arrivals: 0, dueSoon: 0, cur };
  for (const b of S.bookings || []) {
    if (/cancel/i.test(b.status || '')) continue;
    const paid = (b.payments || []).reduce((s, p) => s + num(p.amount), 0);
    const open = conv(Math.max(0, num(b.sellTotal) - paid), b.currency || cur, cur);
    if (open > 0.5) {
      if (b.dueDate && b.dueDate < t) st.overdue += open;
      else if (b.dueDate && b.dueDate <= soon) { st.due += open; st.dueSoon++; }
      else st.notDue += open;
    }
    if (b.arrival && b.arrival >= t && b.arrival <= soon) st.arrivals++;
  }
  return st;
}
function dashboard() {
  const a = me(), st = accountStats(), c = st.cur, m = v => fmt(Math.round(v), c);
  const unpaid = st.notDue + st.due + st.overdue; const credit = num(a.creditLimit); const wallet = num(a.wallet);
  const rec = recent();
  return `<h2 class="rh-h2">Your account</h2><div class="rh-dash">
  <div class="card rh-stat"><h3>Payments</h3><div class="rh-line"><span>Not yet due</span><b>${m(st.notDue)}</b></div><div class="rh-line"><span>Due in 7 days</span><b>${m(st.due)}</b></div><div class="rh-line ${st.overdue > 0 ? 'hot' : ''}"><span>Overdue</span><b>${m(st.overdue)}</b></div><div class="rh-total"><span>Total unpaid</span><b>${m(unpaid)}</b></div><a class="link" ${go('accounts')}>Statement & invoices →</a></div>
  <div class="card rh-stat"><h3>Coming up</h3><div class="rh-big"><b>${st.arrivals}</b><span>guests arriving in the next 7 days</span></div><div class="rh-big ${st.dueSoon ? 'warn' : ''}"><b>${st.dueSoon}</b><span>payments due in the next 7 days</span></div><a class="link" ${go('bookings')}>My bookings →</a></div>
  <div class="card rh-stat"><h3>Balance & credit</h3><div class="rh-line"><span>Wallet / deposit</span><b>${m(wallet)}</b></div><div class="rh-line"><span>Credit limit</span><b>${credit ? m(credit) : 'Not set'}</b></div>${credit ? `<div class="rh-line ${credit - unpaid < 0 ? 'hot' : ''}"><span>Available credit</span><b>${m(credit - unpaid)}</b></div>` : ''}<p class="note" style="margin:8px 0 0">Need a top-up or a credit limit? Contact your account manager.</p></div>
  </div>${rec.length ? `<h2 class="rh-h2">You recently viewed</h2><div class="rh-recent">${rec.map(r => `<a class="card" href="#/hotel/${esc(r.id)}" data-act="rhOpenRecent" data-id="${esc(r.id)}" data-cin="${esc(r.cin || '')}" data-cout="${esc(r.cout || '')}"><b>${esc(r.name)}</b><span class="note">${esc(r.city || '')}${r.cin ? ' · ' + nice(r.cin) + ' – ' + nice(r.cout) : ''}</span></a>`).join('')}</div>` : ''}`;
}

/* ---------- search band with tabs ---------- */
const MAIN_DEST = ['Sri Lanka', 'Bali', 'Maldives', 'Thailand', 'Malaysia'];
function searchBand() {
  const s = hs(), tab = UI.rhTab || 'hotels';
  const dests = [...new Set([...hotels().map(h => h.destination).filter(Boolean), ...MAIN_DEST])];
  const tabs = [['hotels', 'Hotels'], ['packages', 'Sri Lanka packages'], ['tours', 'Tours & transfers'], ['offline', 'Offline request']];
  const body = tab === 'hotels' ? `<div class="rh-form"><label><span>Destination</span><select id="rb_dest">${dests.map(d => `<option ${d === s.dest ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label><label><span>Check-in</span><input id="rb_cin" type="date" value="${esc(s.cin)}" min="${today()}"></label><label><span>Check-out</span><input id="rb_cout" type="date" value="${esc(s.cout)}" min="${today()}"></label><label><span>Rooms</span><input id="rb_rooms" type="number" min="1" value="${esc(s.rooms || 1)}"></label><label><span>Guests</span><input id="rb_guests" type="number" min="1" value="${esc(s.guests || 2)}"></label><button class="btn p" data-act="rhSearch">Search</button></div>`
    : tab === 'packages' ? `<div class="rh-form one"><p>Pick a ready route, choose hotels and activities, and see the price straight away.</p><a class="btn p" ${go('slbuild')}>Build a Sri Lanka package</a></div>`
    : tab === 'tours' ? `<div class="rh-form one"><p>Tours, transfers and activities with your prices.</p><a class="btn p" ${go('tours')}>See tours & transfers</a></div>`
    : `<div class="rh-form one"><p>Groups, special requests or anything not listed: send it to our team.</p><a class="btn p" href="#/request/new">New offline request</a></div>`;
  return `<div class="rh-band"><h1>${esc(portal().headline || 'Welcome')}${me().name ? ', ' + esc(me().name) : ''}</h1><p>${esc(portal().welcome || 'Search hotels, build packages and follow your bookings in one place.')}</p><div class="rh-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-act="rhTab" data-id="${k}">${l}</button>`).join('')}</div>${body}</div>`;
}

/* home: search band and account dashboard on top, then the existing deals and destinations */
const homeBase = P.home.render;
P.home = { ...P.home, render(...a) {
  const h = homeBase.apply(this, a); const i = h.indexOf('<div class="phero"'), j = h.indexOf('<div class="row" style="margin:22px 0 10px">');
  const top = searchBand() + dashboard();
  return i >= 0 && j > i ? h.slice(0, i) + top + h.slice(j) : top + h;
} };

/* ---------- hotel results ---------- */
function results() {
  const s = hs(); const n = nightsOf(s.cin, s.cout), rooms = Math.max(1, num(s.rooms));
  let res = hotels().filter(h => h.destination === s.dest && (!s.city || h.city === s.city) && (!s.name || (h.name || '').toLowerCase().includes(s.name.toLowerCase())) && (!s.starSet.length || s.starSet.includes(String(num(h.stars)))))
    .map(h => { const rs = (h.rooms || []).filter(r => roomOk(r, s.cin) && (!s.meals.length || s.meals.includes(r.meal || 'Room only')) && (!s.free || cancelInfo(r, s.cin).cls === 'ok')); return { h, rs }; })
    .filter(x => x.rs.length).map(x => { const best = x.rs.reduce((a, b) => (b.price < a.price ? b : a)); return { ...x, best, min: best.price }; })
    .filter(x => !num(s.max) || x.min <= num(s.max));
  res.sort(s.sort === 'stars' ? (a, b) => num(b.h.stars) - num(a.h.stars) || a.min - b.min : s.sort === 'name' ? (a, b) => (a.h.name || '').localeCompare(b.h.name || '') : (a, b) => a.min - b.min);
  return { res, n, rooms };
}
const totalFor = (r, n, rooms) => (perNight(r.unit) && n ? r.price * n * rooms : 0);
P.hotels = { title: 'Hotels', render() {
  const s = hs(); const all = hotels();
  const dests = [...new Set(all.map(h => h.destination).filter(Boolean))].sort(); if (!s.dest && dests.length) s.dest = dests[0];
  const cities = [...new Set(all.filter(h => h.destination === s.dest).map(h => h.city).filter(Boolean))].sort();
  const meals = [...new Set(all.filter(h => h.destination === s.dest).flatMap(h => (h.rooms || []).map(r => r.meal || 'Room only')))].sort();
  const { res, n, rooms } = results(); const mapView = s.view === 'map';
  const sel = mapView ? (res.find(x => x.h.id === s.mapH) || res[0]) : null;
  const card = ({ h, rs, best }) => { const ci = cancelInfo(best, s.cin); const tot = totalFor(best, n, rooms);
    return `<div class="card rh-hotel ${sel && sel.h.id === h.id ? 'sel' : ''}"><a class="rh-ph" href="#/hotel/${esc(h.id)}">${photoTag((h.photos || [])[0], 'width:100%;height:100%;object-fit:cover;display:block')}</a>
    <div class="rh-info"><div>${starsH(h.stars)}</div><a class="rh-name" href="#/hotel/${esc(h.id)}">${esc(h.name)}</a><div class="note">${esc([h.area, h.city, h.destination].filter(Boolean).join(', '))} · <button class="link" data-act="rhMapH" data-id="${esc(h.id)}">Show on map</button></div>${(h.amenities || []).length ? `<div class="rh-amen">${h.amenities.slice(0, 5).map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>
    <div class="rh-offer"><div class="rh-room"><b>${esc(best.service)}</b><div class="rh-meta"><span>${esc(best.meal || 'Room only')}</span><span class="rh-c ${ci.cls}">${esc(ci.text)}</span></div></div>
    <div class="rh-price">${tot ? `<b>${esc(money(tot, h.currency))}</b><span class="note">for ${n} night${n > 1 ? 's' : ''} · ${rooms} room${rooms > 1 ? 's' : ''}</span>` : `<span class="note">from</span><b>${esc(money(best.price, h.currency))}</b><span class="note">${esc(best.unit || '')}</span>`}<a class="btn p" href="#/hotel/${esc(h.id)}">Show all rooms${rs.length > 1 ? ` (${rs.length})` : ''}</a></div></div></div>`; };
  const chk = (key, val, label) => `<label class="rh-chk"><input type="checkbox" data-act-change="rhChk" data-id="${key}" value="${esc(val)}" ${(key === 'free' ? s.free : (s[key] || []).includes(val)) ? 'checked' : ''}> ${label}</label>`;
  return `<div class="rh-res">
  <aside class="rh-side">
    <div class="card rh-sum"><b>${esc(s.dest || 'Choose a destination')}</b>${s.city ? `<div class="note">${esc(s.city)}</div>` : ''}<div class="note">${s.cin ? `${nice(s.cin)} – ${nice(s.cout)}` : 'Any dates'}</div><div class="note">${num(s.rooms) || 1} room${num(s.rooms) > 1 ? 's' : ''} · ${num(s.guests) || 2} guests</div><button class="link" data-act="rhEdit">Change search</button></div>
    <div class="rh-view"><button class="${mapView ? '' : 'on'}" data-act="rhView" data-id="list">List view</button><button class="${mapView ? 'on' : ''}" data-act="rhView" data-id="map">Map view</button></div>
    <div class="card rh-filt"><h3>Hotel name</h3><input id="rf_name" value="${esc(s.name)}" placeholder="For example, Cinnamon" data-act-change="rhName">
    ${cities.length ? `<h3>Area</h3><select data-act-change="rhCity"><option value="">All areas</option>${cities.map(c => `<option ${c === s.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}
    <h3>Sort by</h3><select data-act-change="rhSort">${[['price', 'Lowest price'], ['stars', 'Stars'], ['name', 'Name']].map(([v, l]) => `<option value="${v}" ${v === s.sort ? 'selected' : ''}>${l}</option>`).join('')}</select>
    ${meals.length ? `<h3>Meals</h3>${meals.map(m => chk('meals', m, esc(m))).join('')}` : ''}
    <h3>Star rating</h3>${[5, 4, 3, 2].map(x => chk('starSet', String(x), starsH(x))).join('')}
    <h3>Cancellation</h3>${chk('free', '1', 'Free cancellation')}
    <h3>Max price from</h3><input type="number" value="${esc(s.max)}" placeholder="Any" data-act-change="rhMax">
    ${s.name || s.city || s.meals.length || s.starSet.length || s.free || num(s.max) ? `<button class="btn s" style="margin-top:12px;width:100%" data-act="rhClear">Clear filters</button>` : ''}</div>
  </aside>
  <section class="rh-list ${mapView ? 'withmap' : ''}"><div class="card rh-head"><h1>${esc(s.city || s.dest || 'Hotels')}: ${res.length} ${res.length === 1 ? 'hotel' : 'hotels'}</h1><p class="note">Our contracted hotels with your prices${n ? ` for ${n} nights` : ''}. Availability is confirmed on request.</p></div>
    <div class="${mapView ? 'rh-split' : ''}"><div>${res.map(card).join('') || '<div class="empty">No hotels match. Try another area or clear a filter.</div>'}</div>
    ${mapView ? `<div class="rh-map card">${sel ? `<iframe title="Map of ${esc(sel.h.name)}" src="${esc(mapSrc(mapQ(sel.h)))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="rh-mapcap"><b>${esc(sel.h.name)}</b> <a class="link" href="#/hotel/${esc(sel.h.id)}">Open</a></div>` : '<div class="empty">No hotel to show.</div>'}</div>` : ''}</div>
  </section></div>`;
} };

/* ---------- hotel page ---------- */
P.hotel = { title: 'Hotel', render(id) {
  const h = hotels().find(x => x.id === id); if (!h) return '<div class="empty">This hotel is not available. <a href="#/hotels">Back to hotels</a></div>';
  const s = hs(); remember(h, s); const n = nightsOf(s.cin, s.cout), rooms = Math.max(1, num(s.rooms));
  const rs = (h.rooms || []).map((r, k) => ({ r, k })).filter(({ r }) => roomOk(r, s.cin)).sort((a, b) => a.r.price - b.r.price);
  const ph = h.photos || [];
  const gal = ph.length ? `<div class="rh-gal n${Math.min(ph.length, 5)}">${ph.slice(0, 5).map((p, i) => `<div class="g${i}">${photoTag(p, 'width:100%;height:100%;object-fit:cover;display:block')}</div>`).join('')}</div>` : '';
  const row = ({ r, k }) => { const ci = cancelInfo(r, s.cin); const tot = totalFor(r, n, rooms);
    return `<tr><td data-l="Room"><b>${esc(r.service)}</b>${r.notes ? `<div class="note">${esc(r.notes)}</div>` : ''}</td><td data-l="Meals">${esc(r.meal || 'Room only')}</td><td data-l="Cancellation"><span class="rh-c ${ci.cls}">${esc(ci.text)}</span></td>
    <td data-l="Your price" class="num"><b>${esc(money(tot || r.price, h.currency))}</b><div class="note">${tot ? `${n} night${n > 1 ? 's' : ''} · ${rooms} room${rooms > 1 ? 's' : ''}` : esc(r.unit || '')}</div></td><td><button class="btn p s" data-act="hsReq" data-id="${esc(h.id)}" data-k="${k}">Request</button></td></tr>`; };
  return `<div class="rh-crumb"><a href="#/hotels">← Back to results</a> · ${esc(h.destination || '')}${h.city ? ' · ' + esc(h.city) : ''}</div>
  <div class="card rh-top"><div><div>${starsH(h.stars)}</div><h1>${esc(h.name)}</h1><div class="note">${esc([h.address || h.area, h.city, h.destination].filter(Boolean).join(', '))}</div></div><div class="rh-from">${rs.length ? `<span class="note">from</span><b>${esc(money(rs[0].r.price, h.currency))}</b><span class="note">${esc(rs[0].r.unit || '')}</span>` : ''}<button class="btn p" data-act="rhJump">Choose a room</button></div></div>
  ${gal}
  <div class="rh-cols"><div class="card"><h2>About the hotel</h2><p style="margin:0;white-space:pre-line">${esc(h.description || 'Details coming soon.')}</p>${(h.amenities || []).length ? `<h2 style="margin-top:16px">Amenities</h2><div class="rh-amen big">${h.amenities.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>
  <div class="card rh-mapbox"><h2>Location</h2><iframe title="Map of ${esc(h.name)}" src="${esc(mapSrc(mapQ(h)))}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div>
  <div class="card rh-dates"><div><span class="note">Check-in</span><b>${s.cin ? nice(s.cin) : '—'}</b></div><div><span class="note">Check-out</span><b>${s.cout ? nice(s.cout) : '—'}</b></div><div><span class="note">Rooms</span><b>${rooms}</b></div><div><span class="note">Guests</span><b>${num(s.guests) || 2}</b></div><button class="btn" data-act="rhEdit">Change</button></div>
  <div class="card" id="rhRooms"><h2>Available rooms <span class="sub">${n ? `for ${n} night${n > 1 ? 's' : ''}, ${rooms} room${rooms > 1 ? 's' : ''}` : 'add dates to see the total'}</span></h2>
  <div class="rh-rooms"><table><thead><tr><th>Room</th><th>Meals</th><th>Cancellation</th><th class="num">Your price</th><th></th></tr></thead><tbody>${rs.map(row).join('') || '<tr><td colspan="5" class="empty">No rates for these dates. Send us a request and we will check.</td></tr>'}</tbody></table></div>
  <p class="note" style="margin:10px 0 0">Prices are for your agency. Availability is confirmed by our team after your request.</p></div>`;
} };

/* ---------- actions ---------- */
export const RH_A = {
  rhTab(id) { UI.rhTab = id; redraw(); },
  rhSearch() { const s = hs(); const v = k => $('#' + k)?.value ?? ''; const d = v('rb_dest'); if (d !== s.dest) s.city = '';
    Object.assign(s, { dest: d, cin: v('rb_cin'), cout: v('rb_cout'), rooms: v('rb_rooms') || 1, guests: v('rb_guests') || 2 });
    if (s.cin && s.cout && s.cout <= s.cin) { toast('Check-out must be after check-in'); return; }
    if (d === 'Sri Lanka' && !hotels().some(h => h.destination === 'Sri Lanka')) { location.hash = '#/slbuild'; return; }
    location.hash = '#/hotels'; redraw(); },
  rhEdit() { UI.rhTab = 'hotels'; location.hash = '#/home'; setTimeout(() => $('#rb_dest')?.focus(), 50); },
  rhView(id) { hs().view = id; redraw(); },
  rhMapH(id) { const s = hs(); s.view = 'map'; s.mapH = id; redraw(); },
  rhChk(key, el) { const s = hs(); if (key === 'free') s.free = el.checked; else { const a = s[key]; const i = a.indexOf(el.value); if (el.checked && i < 0) a.push(el.value); if (!el.checked && i >= 0) a.splice(i, 1); } redraw(); },
  rhName(_, el) { hs().name = el.value; redraw(); },
  rhCity(_, el) { hs().city = el.value; redraw(); },
  rhSort(_, el) { hs().sort = el.value; redraw(); },
  rhMax(_, el) { hs().max = el.value; redraw(); },
  rhClear() { Object.assign(hs(), { name: '', city: '', meals: [], starSet: [], free: false, max: '' }); redraw(); },
  rhJump() { $('#rhRooms')?.scrollIntoView({ behavior: 'smooth' }); },
  rhOpenRecent(id, el) { const s = hs(); if (el.dataset.cin) { s.cin = el.dataset.cin; s.cout = el.dataset.cout; } location.hash = '#/hotel/' + id; },
};
