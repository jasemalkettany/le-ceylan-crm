import { S, UI, esc, num, fmt, today, tagFor, byNew, totals, received, table, inp, area, field, destArt, routeArt, DEST, photoTag } from './core.js';

export const P = {};
const go = h => `href="#/${h}"`;

P.home = { title: 'Offers', render() {
  const offers = S.offers.filter(o => !o.validTo || o.validTo >= today()).sort(byNew);
  const a = S.myAgent || {};
  return `<div class="hero">${routeArt()}<h2>Welcome${a.name ? ', ' + esc(a.name) : ''}.</h2><p>Current offers, ready-made itineraries and your bookings in one place.</p></div>
  <div class="row" style="margin-bottom:12px"><h2 style="font-size:20px">Current offers</h2><span class="sp"></span><a class="btn a" ${go('request/new')}>Request availability</a></div>
  <div class="tiles">${offers.map(o => `<a class="tile" style="text-decoration:none;color:inherit" ${go('offer/' + esc(o.id))}><div class="cover">${photoTag((o.photos || [])[0])}</div><div class="bd"><span class="note">${esc(o.destination || '')}</span><h3>${esc(o.title)}</h3>${o.travel ? `<div class="note">Travel ${esc(o.travel)}</div>` : ''}${num(o.priceFrom) ? `<div class="price">From ${esc(fmt(o.priceFrom, o.currency))}</div>` : ''}${o.validTo ? `<div class="note">Book by ${esc(o.validTo)}</div>` : ''}</div></a>`).join('') || '<div class="empty">No offers right now. Browse the itineraries or request availability.</div>'}</div>`;
} };
P.offer = { title: 'Offer', render(id) {
  const o = S.offers.find(x => x.id === id); if (!o) return '<div class="empty">This offer is no longer available.</div>';
  return `<div class="card" style="padding:0;overflow:hidden">${(o.photos || [])[0] ? photoTag(o.photos[0], 'width:100%;height:300px;object-fit:cover;display:block') : ''}<div style="padding:20px"><h2 style="font-size:26px">${esc(o.title)}</h2><p class="note">${esc(o.destination)}${o.travel ? ' · travel ' + esc(o.travel) : ''}${o.validTo ? ' · book by ' + esc(o.validTo) : ''}</p>${num(o.priceFrom) ? `<p class="price" style="font:700 22px Outfit;color:var(--sea)">From ${esc(fmt(o.priceFrom, o.currency))}</p>` : ''}<p style="white-space:pre-line">${esc(o.body)}</p></div></div>${(o.photos || []).length > 1 ? `<div class="gallery">${o.photos.slice(1).map(p => photoTag(p)).join('')}</div>` : ''}
  <div class="row"><a class="btn a" href="#/request/new?offer=${esc(o.id)}">Request this offer</a><a class="btn" href="#/home">Back</a></div>`;
} };
P.itineraries = { title: 'Itineraries', render() {
  const f = UI.filter.pdest || '';
  const r = S.itineraries.filter(i => !f || i.destination === f).sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
  const dests = [...new Set(S.itineraries.map(i => i.destination).filter(Boolean))];
  return `<div class="tabs"><button class="${!f ? 'on' : ''}" data-act="filter" data-k="pdest" data-id="">All</button>${dests.map(d => `<button class="${f === d ? 'on' : ''}" data-act="filter" data-k="pdest" data-id="${esc(d)}">${esc(d)}</button>`).join('')}</div>
  <div class="tiles">${r.map(i => `<a class="tile" style="text-decoration:none;color:inherit" ${go('itinerary/' + esc(i.id))}><div class="cover">${photoTag((i.photos || [])[0] || ((i.program || [])[0]?.photos || [])[0])}</div><div class="bd"><span class="note">${esc(i.destination)}</span><h3>${esc(i.title)}</h3><p class="note" style="margin:0">${num(i.nights) ? num(i.nights) + ' nights · ' : ''}${esc((i.summary || '').slice(0, 100))}</p>${num(i.priceFrom) ? `<div class="price">From ${esc(fmt(i.priceFrom, i.currency))} <span class="note">per person</span></div>` : ''}</div></a>`).join('') || '<div class="empty">No itineraries published yet.</div>'}</div>`;
} };
P.itinerary = { title: 'Itinerary', render(id) {
  const i = S.itineraries.find(x => x.id === id); if (!i) return '<div class="empty">This itinerary is no longer available.</div>';
  const blk = (t, v) => v ? `<div class="card"><h2>${t}</h2><div style="white-space:pre-line">${esc(v)}</div></div>` : '';
  return `<div class="card" style="padding:0;overflow:hidden">${((i.photos || [])[0] || ((i.program || [])[0]?.photos || [])[0]) ? photoTag((i.photos || [])[0] || i.program[0].photos[0], 'width:100%;height:320px;object-fit:cover;display:block') : ''}<div style="padding:20px"><h2 style="font-size:26px">${esc(i.title)}</h2><p class="note">${esc(i.destination)}${num(i.nights) ? ' · ' + num(i.nights) + ' nights' : ''}${i.code ? ' · ' + esc(i.code) : ''}</p>${num(i.priceFrom) ? `<p style="font:700 22px Outfit;color:var(--sea);margin:6px 0">From ${esc(fmt(i.priceFrom, i.currency))} <span class="note">per person</span></p>` : ''}<p>${esc(i.summary)}</p></div></div>
  ${(i.program || []).length ? `<div class="card"><h2>Day by day</h2>${i.program.map((d, n) => `<div class="day pday">${(d.photos || [])[0] ? photoTag(d.photos[0]) : ''}<div><span class="note" style="color:var(--orange-d);font-weight:600">DAY ${n + 1}</span><h3 style="font-size:16px;margin:2px 0 6px">${esc(d.title)}</h3><div style="white-space:pre-line">${esc(d.description)}</div>${d.overnight ? `<div class="note" style="margin-top:6px">Overnight: ${esc(d.overnight)}</div>` : ''}</div></div>`).join('')}</div>` : blk('Day by day', i.days)}
  ${(i.photos || []).length > 1 ? `<div class="gallery">${i.photos.slice(1).map(p => photoTag(p)).join('')}</div>` : ''}<div class="g2">${blk('Hotels', i.hotels)}${blk('Inclusions', i.inclusions)}${blk('Exclusions', i.exclusions)}</div>
  <div class="row"><a class="btn a" href="#/request/new?itin=${esc(i.id)}">Request availability</a><button class="btn" data-act="agentItin" data-id="${esc(i.id)}">Brochure (PDF)</button><a class="btn" href="#/itineraries">Back</a></div>`;
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
  return `<div class="card">${table(['Tour', 'Lead guest', 'Arrival', 'Departure', 'Total ', 'Balance ', 'Status', ''], r.map(b => { const t = totals(b).sell, rc = received(b); return `<tr><td><b>${esc(b.no)}</b><div class="note">${esc(b.agentRef)}</div></td><td>${esc(b.lead)}</td><td>${esc(b.arrival)}</td><td>${esc(b.departure)}</td><td class="num">${esc(fmt(t, b.currency))}</td><td class="num">${esc(fmt(t - rc, b.currency))}</td><td>${tagFor(b.status)}</td><td><button class="btn s" data-act="agentDoc" data-k="itinPlain" data-id="${esc(b.id)}">Itinerary</button> <button class="btn s" data-act="agentDoc" data-k="confirm" data-id="${esc(b.id)}">Voucher</button> <button class="btn s" data-act="agentDoc" data-k="proforma" data-id="${esc(b.id)}">Invoice</button></td></tr>`; }), 'No bookings yet.')}</div>`;
} };
P.invoices = { title: 'Invoices', render() {
  const r = S.bookings.filter(b => b.invoiceNo).sort((a, b) => (b.invoiceDate || '').localeCompare(a.invoiceDate || ''));
  return `<div class="pagehead"><div><h1>Invoices</h1><p class="lead">Every invoice issued to you, with what is paid and what is still due.</p></div></div>
  <div class="card">${table(['Invoice', 'Date', 'Tour', 'Lead guest', 'Due', 'Total ', 'Paid ', 'Balance ', 'Status', ''], r.map(b => { const t = totals(b).sell, rc = received(b), bal = t - rc; const st = bal <= .5 ? 'Paid' : rc > 0 ? 'Part paid' : (b.dueDate && b.dueDate < today() ? 'Overdue' : 'Unpaid'); return `<tr><td class="ref">${esc(b.invoiceNo)}</td><td>${esc(b.invoiceDate)}</td><td>${esc(b.no)}</td><td>${esc(b.lead)}</td><td>${esc(b.dueDate)}</td><td class="num">${esc(fmt(t, b.currency))}</td><td class="num">${esc(fmt(rc, b.currency))}</td><td class="num"><b>${esc(fmt(bal, b.currency))}</b></td><td>${tagFor(st)}</td><td><button class="btn s" data-act="agentDoc" data-k="proforma" data-id="${esc(b.id)}">Open</button></td></tr>`; }), 'No invoices yet.')}</div>`;
} };
P.statement = { title: 'Statement of account', render() {
  return `<div class="pagehead"><div><h1>Statement of account</h1><p class="lead">Invoices and payments with your running balance.</p></div><button class="btn p" data-act="myStatement">Print or save as PDF</button></div>
  <div class="card"><div id="stmtBox"></div></div>`;
} };
P.account = { title: 'My account', render() {
  const a = S.myAgent || {};
  return `<div class="card"><h2>${esc(a.name)}</h2><div class="grid"><div><span class="note">Agent code</span><div>${esc(a.code)}</div></div><div><span class="note">Contact</span><div>${esc(a.contact)}</div></div><div><span class="note">Email</span><div>${esc(a.email)}</div></div><div><span class="note">Phone</span><div>${esc(a.phone)}</div></div><div><span class="note">Billing currency</span><div>${esc(a.currency)}</div></div></div></div>
  <div class="card"><h2>Your login</h2><p>${esc(S.me?.name)} · ${esc(S.me?.email)}</p><button class="btn" data-act="myReset">Email me a password reset link</button></div>`;
} };
