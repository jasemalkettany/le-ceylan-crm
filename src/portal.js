import { S, UI, esc, num, fmt, today, tagFor, byNew, totals, received, table, inp, area, field, destArt, routeArt, DEST } from './core.js';

export const P = {};
const go = h => `href="#/${h}"`;

P.home = { title: 'Offers', render() {
  const offers = S.offers.filter(o => !o.validTo || o.validTo >= today()).sort(byNew);
  const a = S.myAgent || {};
  return `<div class="hero">${routeArt()}<h2>Welcome${a.name ? ', ' + esc(a.name) : ''}.</h2><p>Current offers, ready-made itineraries and your bookings in one place.</p></div>
  <div class="row" style="margin-bottom:12px"><h2 style="font-size:20px">Current offers</h2><span class="sp"></span><a class="btn a" ${go('request/new')}>Request availability</a></div>
  <div class="tiles">${offers.map(o => `<a class="tile" style="text-decoration:none;color:inherit" ${go('offer/' + esc(o.id))}><div class="art">${destArt(o.destination)}<span>${esc(o.destination || '')}</span></div><div class="bd"><h3>${esc(o.title)}</h3>${o.travel ? `<div class="note">Travel ${esc(o.travel)}</div>` : ''}${num(o.priceFrom) ? `<div class="price">From ${esc(fmt(o.priceFrom, o.currency))}</div>` : ''}${o.validTo ? `<div class="note">Book by ${esc(o.validTo)}</div>` : ''}</div></a>`).join('') || '<div class="empty">No offers right now. Browse the itineraries or request availability.</div>'}</div>`;
} };
P.offer = { title: 'Offer', render(id) {
  const o = S.offers.find(x => x.id === id); if (!o) return '<div class="empty">This offer is no longer available.</div>';
  return `<div class="card" style="padding:0;overflow:hidden"><div style="height:160px">${destArt(o.destination)}</div><div style="padding:20px"><h2 style="font-size:26px">${esc(o.title)}</h2><p class="note">${esc(o.destination)}${o.travel ? ' · travel ' + esc(o.travel) : ''}${o.validTo ? ' · book by ' + esc(o.validTo) : ''}</p>${num(o.priceFrom) ? `<p class="price" style="font:700 22px Outfit;color:var(--sea)">From ${esc(fmt(o.priceFrom, o.currency))}</p>` : ''}<p style="white-space:pre-line">${esc(o.body)}</p></div></div>
  <div class="row"><a class="btn a" href="#/request/new?offer=${esc(o.id)}">Request this offer</a><a class="btn" href="#/home">Back</a></div>`;
} };
P.itineraries = { title: 'Itineraries', render() {
  const f = UI.filter.pdest || '';
  const r = S.itineraries.filter(i => !f || i.destination === f).sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
  const dests = [...new Set(S.itineraries.map(i => i.destination).filter(Boolean))];
  return `<div class="tabs"><button class="${!f ? 'on' : ''}" data-act="filter" data-k="pdest" data-id="">All</button>${dests.map(d => `<button class="${f === d ? 'on' : ''}" data-act="filter" data-k="pdest" data-id="${esc(d)}">${esc(d)}</button>`).join('')}</div>
  <div class="tiles">${r.map(i => `<a class="tile" style="text-decoration:none;color:inherit" ${go('itinerary/' + esc(i.id))}><div class="art">${destArt(i.destination)}<span>${esc(i.destination)}</span></div><div class="bd"><h3>${esc(i.title)}</h3><p class="note" style="margin:0">${num(i.nights) ? num(i.nights) + ' nights · ' : ''}${esc((i.summary || '').slice(0, 100))}</p>${num(i.priceFrom) ? `<div class="price">From ${esc(fmt(i.priceFrom, i.currency))} <span class="note">per person</span></div>` : ''}</div></a>`).join('') || '<div class="empty">No itineraries published yet.</div>'}</div>`;
} };
P.itinerary = { title: 'Itinerary', render(id) {
  const i = S.itineraries.find(x => x.id === id); if (!i) return '<div class="empty">This itinerary is no longer available.</div>';
  const blk = (t, v) => v ? `<div class="card"><h2>${t}</h2><div style="white-space:pre-line">${esc(v)}</div></div>` : '';
  return `<div class="card" style="padding:0;overflow:hidden"><div style="height:170px">${destArt(i.destination)}</div><div style="padding:20px"><h2 style="font-size:26px">${esc(i.title)}</h2><p class="note">${esc(i.destination)}${num(i.nights) ? ' · ' + num(i.nights) + ' nights' : ''}${i.code ? ' · ' + esc(i.code) : ''}</p>${num(i.priceFrom) ? `<p style="font:700 22px Outfit;color:var(--sea);margin:6px 0">From ${esc(fmt(i.priceFrom, i.currency))} <span class="note">per person</span></p>` : ''}<p>${esc(i.summary)}</p></div></div>
  ${blk('Day by day', i.days)}<div class="g2">${blk('Hotels', i.hotels)}${blk('Inclusions', i.inclusions)}${blk('Exclusions', i.exclusions)}</div>
  <div class="row"><a class="btn a" href="#/request/new?itin=${esc(i.id)}">Request availability</a><a class="btn" href="#/itineraries">Back</a></div>`;
} };
P.requests = { title: 'My requests', render() {
  const r = S.requests.slice().sort(byNew);
  return `<div class="row" style="margin-bottom:12px"><a class="btn a" ${go('request/new')}>New request</a></div><div class="card">${table(['Sent', 'Request', 'Dates', 'Pax', 'Status', 'Reply'], r.map(x => `<tr><td>${esc((x.createdAt || '').slice(0, 10))}</td><td><b>${esc(x.title || 'Availability request')}</b><div class="note">${esc(x.byName)}</div></td><td>${esc(x.arrival)} → ${esc(x.departure)}</td><td>${num(x.adults)}A ${num(x.children) ? num(x.children) + 'C' : ''}</td><td>${tagFor(x.status || 'New request')}</td><td style="white-space:pre-line">${esc(x.reply)}</td></tr>`), 'No requests yet.')}</div>`;
} };
P.newRequest = { title: 'Request availability', render(params) {
  const it = S.itineraries.find(x => x.id === params.itin); const of = S.offers.find(x => x.id === params.offer);
  const title = it ? it.title : of ? of.title : '';
  return `<div class="card"><h2>${esc(title || 'Request availability')}</h2><form id="reqForm" class="grid">
    <input type="hidden" name="title" value="${esc(title)}"><input type="hidden" name="itineraryId" value="${esc(it?.id || '')}"><input type="hidden" name="offerId" value="${esc(of?.id || '')}">
    ${title ? '' : `<label>Destination<select name="destination">${DEST.map(d => `<option>${d}</option>`).join('')}</select></label>`}
    <label>Arrival<input name="arrival" type="date" required></label><label>Departure<input name="departure" type="date" required></label>
    <label>Adults<input name="adults" type="number" min="1" value="2" required></label><label>Children<input name="children" type="number" min="0" value="0"></label>
    <label>Children ages<input name="childAges" placeholder="e.g. 5, 9"></label><label>Nationality<input name="nationality" required></label>
    <label>Lead guest<input name="lead"></label><label>Your reference<input name="agentRef"></label>
    <label style="grid-column:1/-1">Anything else (hotel category, rooms, budget, special requests)<textarea name="notes"></textarea></label>
    <div><button class="btn p" type="submit">Send request</button></div></form></div>`;
} };
P.bookings = { title: 'My bookings', render() {
  const r = S.bookings.slice().sort((a, b) => (b.arrival || '').localeCompare(a.arrival || ''));
  return `<div class="card">${table(['Tour', 'Lead guest', 'Arrival', 'Departure', 'Total ', 'Balance ', 'Status', ''], r.map(b => { const t = totals(b).sell, rc = received(b); return `<tr><td><b>${esc(b.no)}</b><div class="note">${esc(b.agentRef)}</div></td><td>${esc(b.lead)}</td><td>${esc(b.arrival)}</td><td>${esc(b.departure)}</td><td class="num">${esc(fmt(t, b.currency))}</td><td class="num">${esc(fmt(t - rc, b.currency))}</td><td>${tagFor(b.status)}</td><td><button class="btn s" data-act="agentDoc" data-k="confirm" data-id="${esc(b.id)}">Voucher</button> <button class="btn s" data-act="agentDoc" data-k="proforma" data-id="${esc(b.id)}">Invoice</button></td></tr>`; }), 'No bookings yet.')}</div>`;
} };
P.account = { title: 'My account', render() {
  const a = S.myAgent || {};
  return `<div class="card"><h2>${esc(a.name)}</h2><div class="grid"><div><span class="note">Agent code</span><div>${esc(a.code)}</div></div><div><span class="note">Contact</span><div>${esc(a.contact)}</div></div><div><span class="note">Email</span><div>${esc(a.email)}</div></div><div><span class="note">Phone</span><div>${esc(a.phone)}</div></div><div><span class="note">Billing currency</span><div>${esc(a.currency)}</div></div></div></div>
  <div class="card"><h2>Your login</h2><p>${esc(S.me?.name)} · ${esc(S.me?.email)}</p><button class="btn" data-act="myReset">Email me a password reset link</button></div>`;
} };
