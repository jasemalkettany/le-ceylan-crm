import { S, UI, esc, num, fmt, today, addDays, cfg, coById, agentName, supName, userName, inCo, qMatch, byNew, tagFor, totals, flatLines, received,
  sel, inp, area, field, coOpts, agentOpts, supOpts, table, DEST, CURS, curCo, ROOM_TYPES, nightsBetween, hotelNet, hotelPax, transportNet, activityNet, miscNet, rateTo } from './core.js';

export const V = {};
const go = h => `href="#/${h}"`;
const longDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
export const crumbs = t => `<div class="crumbs"><span>Workspace</span><span class="sep">›</span><b>${esc(t)}</b><span class="sp"></span><span class="note">${esc(longDate())}</span></div>`;
const destOf = r => (r.destinations && r.destinations.length ? r.destinations.join(', ') : r.destination || '');
const paxOf = r => num(r.adults) + num(r.children);

/* ---------- dashboard ---------- */
V.dashboard = { title: 'Dashboard', render() {
  const qs = S.quotes.filter(inCo), bk = S.bookings.filter(inCo);
  const t = today();
  const live = bk.filter(b => b.status !== 'Cancelled');
  const awaiting = live.filter(b => (b.status || 'Under process') === 'Under process');
  const confirmed = live.filter(b => b.status === 'Confirmed');
  const onTour = live.filter(b => b.arrival && b.arrival <= t && (b.departure || b.arrival) >= t);
  const f = UI.filter.dash || 'Active';
  let list = live.slice();
  if (f === 'Active') list = list.filter(b => !['Completed'].includes(b.status) && (b.departure || b.arrival || '9') >= t);
  if (f === 'Awaiting confirmation') list = awaiting;
  list.sort((a, b) => (a.arrival || '').localeCompare(b.arrival || ''));
  const openQ = qs.filter(q => ['Draft', 'Sent', 'Awaiting approval'].includes(q.status || 'Draft'));
  const name = (S.me?.name || '').split(' ')[0];
  const reqs = S.requests.filter(r => (r.status || 'New request') === 'New request').length;
  return `<div class="pagehead"><div><h1>Your reservations, at a glance.</h1><p class="lead">Welcome back${name ? ', ' + esc(name) : ''}. ${live.filter(b => b.status !== 'Completed').length} live booking${live.length === 1 ? '' : 's'} and ${onTour.reduce((s, b) => s + paxOf(b), 0)} travellers to look after.</p></div><a class="btn p" ${go('quote/new')}>+ New quotation</a></div>
  <div class="strip"><a ${go('bookings')}><span>Awaiting confirmation</span><b>${awaiting.length}</b></a><a ${go('bookings')}><span>Confirmed bookings</span><b>${confirmed.length}</b></a><a ${go('bookings')}><span>Travelling now</span><b>${onTour.length}</b></a></div>
  <div class="cols"><div>
    <div class="card"><h2>Bookings in motion <a class="link" ${go('bookings')}>View bookings ↗</a></h2>
      <div class="seg">${['Active', 'Awaiting confirmation', 'All bookings'].map(x => `<button class="${f === x ? 'on' : ''}" data-act="filter" data-k="dash" data-id="${x}">${x}</button>`).join('')}</div>
      ${table(['Ref', 'Agent', 'Lead guest', 'Arrival', 'Pax', 'Status'], list.slice(0, 10).map(b => `<tr class="click" data-go="booking/${esc(b.id)}"><td><b class="ref">${esc(b.no)}</b></td><td>${esc(agentName(b.agent))}</td><td>${esc(b.lead)}</td><td>${esc(b.arrival)}</td><td>${paxOf(b)}</td><td>${tagFor(b.status || 'Under process')}</td></tr>`), '<b>No bookings in this view</b><br>Choose another filter, or mark a quotation as booked to start a new booking.')}</div>
    <div class="card"><h2>Latest quotations <a class="link" ${go('quotes')}>View all ↗</a></h2>
      ${table(['Ref', 'Agent', 'Destinations', 'Travel', 'Selling ', 'Status'], qs.slice().sort(byNew).slice(0, 8).map(q => `<tr class="click" data-go="quote/${esc(q.id)}"><td><b class="ref">${esc(q.no)}</b></td><td>${esc(agentName(q.agent))}</td><td>${esc(destOf(q)) || '—'}</td><td>${q.arrival ? esc(q.arrival) : '—'}</td><td class="num">${esc(fmt(totals(q).sell, q.currency))}</td><td>${tagFor(q.status || 'Draft')}</td></tr>`), 'No quotations yet.')}</div>
  </div><div>
    <div class="card queue"><h2>Your work queue</h2>
      <a ${go('quotes')}><div><b>Open quotations</b><span>Draft, sent or awaiting approval</span></div><em>${openQ.length}</em></a>
      <a ${go('requests')}><div><b>Portal requests</b><span>New requests from agents</span></div><em>${reqs}</em></a>
      <a ${go('bookings')}><div><b>Under process</b><span>Confirmations outstanding</span></div><em>${awaiting.length}</em></a>
      <a ${go('bookings')}><div><b>On tour</b><span>Travelling right now</span></div><em>${onTour.length}</em></a></div>
  </div></div>`;
} };

/* ---------- lists ---------- */
V.quotes = { title: 'Quotations', render() {
  const st = UI.filter.qst || '';
  const r = S.quotes.filter(inCo).filter(qMatch).filter(q => !st || (q.status || 'Draft') === st).sort(byNew);
  return `<div class="pagehead"><div><h1>Proformas & quotations</h1><p class="lead">Each quotation keeps its own rates. Copy one as a new option to compare prices.</p></div><a class="btn p" ${go('quote/new')}>+ New quotation</a></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${sel('qst', [['', 'All statuses'], 'Draft', 'Sent', 'Booked', 'Lost'], st, 'data-filter="qst" style="width:auto"')}</div>
  ${table(['Ref', 'Agent', 'Destinations', 'Travel dates', 'Pax', 'Selling ', 'Status', 'By'], r.map(q => `<tr class="click" data-go="quote/${esc(q.id)}"><td><b class="ref">${esc(q.no)}</b>${q.option ? ' <span class="note">' + esc(q.option) + '</span>' : ''}</td><td>${esc(agentName(q.agent))}</td><td>${esc(destOf(q)) || '—'}</td><td>${q.arrival ? esc(q.arrival) + ' → ' + esc(q.departure || '') : '—'}</td><td>${paxOf(q)}</td><td class="num">${esc(fmt(totals(q).sell, q.currency))}</td><td>${tagFor(q.status || 'Draft')}</td><td class="note">${esc(userName(q.createdBy))}</td></tr>`), 'No quotations yet.')}</div>`;
} };
V.bookings = { title: 'Bookings', render() {
  const st = UI.filter.bst || '';
  const r = S.bookings.filter(inCo).filter(qMatch).filter(b => !st || (b.status || 'Under process') === st).sort((a, b) => (a.arrival || '').localeCompare(b.arrival || ''));
  return `<div class="pagehead"><div><h1>Bookings</h1><p class="lead">Confirm each section in order — hotels, then transport, then the rest — and the vouchers fill in as you go.</p></div></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${sel('bst', [['', 'All statuses'], 'Under process', 'Confirmed', 'On tour', 'Completed', 'Cancelled'], st, 'data-filter="bst" style="width:auto"')}</div>
  ${table(['Ref', 'Agent', 'Lead guest', 'Arrival', 'Pax', 'Selling ', 'Balance ', 'Status'], r.map(b => { const t = totals(b), rc = received(b); return `<tr class="click" data-go="booking/${esc(b.id)}"><td><b class="ref">${esc(b.no)}</b><div class="note">${esc(b.invoiceNo)}</div></td><td>${esc(agentName(b.agent))}</td><td>${esc(b.lead)}</td><td>${esc(b.arrival)}</td><td>${paxOf(b)}</td><td class="num">${esc(fmt(t.sell, b.currency))}</td><td class="num">${esc(fmt(t.sell - rc, b.currency))}</td><td>${tagFor(b.status || 'Under process')}</td></tr>`; }), '<b>No bookings yet</b><br>Book a quotation from its pricing step and it lands here.')}</div>`;
} };
V.agents = { title: 'Travel Agents & Customers', render() {
  const r = S.agents.filter(inCo).filter(qMatch).sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  const logins = id => S.users.filter(u => u.agentId === id && u.active !== false).length;
  return `<div class="pagehead"><div><h1>Travel Agents & customers</h1><p class="lead">Register travel agents and direct customers. Issue portal logins under Team & Users.</p></div><a class="btn p" ${go('agent/new')}>+ New travel agent</a></div>
  <div class="card">${table(['No.', 'Company', 'Contact', 'Country', 'Billing', 'Type', 'Portal'], r.map(a => `<tr class="click" data-go="agent/${esc(a.id)}"><td class="ref">${esc(a.code)}</td><td><b>${esc(a.name)}</b></td><td>${esc(a.contact)}</td><td>${esc(a.country)}</td><td>${esc(a.currency)}</td><td>${esc(a.type || 'Travel Agent')}</td><td>${logins(a.id) ? tagFor('Active') : '<span class="tag gr">No login</span>'}</td></tr>`), 'No travel agents yet.')}</div>`;
} };
V.suppliers = { title: 'Suppliers', render() {
  const t = UI.filter.stype || '';
  const r = S.suppliers.filter(qMatch).filter(s => !t || s.type === t).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return `<div class="pagehead"><div><h1>Supplier register</h1><p class="lead">Supplier contacts, agreements and their rates in one register.</p></div><a class="btn p" ${go('supplier/new')}>+ Add supplier</a></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${sel('stype', [['', 'All types'], 'Hotel', 'Transport', 'Guide', 'Activity', 'Restaurant', 'Other'], t, 'data-filter="stype" style="width:auto"')}<span class="note">${r.length} suppliers</span></div>
  ${table(['Supplier', 'Type', 'Destination', 'Contact', 'Email', 'Phone', 'Rates '], r.map(a => `<tr class="click" data-go="supplier/${esc(a.id)}"><td><b>${esc(a.name)}</b></td><td>${esc(a.type)}</td><td>${esc(a.destination)}</td><td>${esc(a.contact)}</td><td>${esc(a.email)}</td><td>${esc(a.phone)}</td><td class="num">${S.rates.filter(x => x.supplierId === a.id).length}</td></tr>`), 'No suppliers registered.')}</div>`;
} };

/* ---------- finance ---------- */
V.finance = { title: 'Accounts & Finance', render() {
  const ft = UI.tab.fin || 'recv';
  const bk = S.bookings.filter(inCo).filter(b => b.status !== 'Cancelled');
  const tabs = [['recv', 'Invoices'], ['stmt', 'Statements'], ['pay', 'Supplier bills'], ['pl', 'P&L & reports'], ['qb', 'Accounts & export']].map(([k, l]) => `<button class="${ft === k ? 'on' : ''}" data-act="tab" data-k="fin" data-id="${k}">${l}</button>`).join('');
  let body = '';
  if (ft === 'recv') body = table(['Invoice', 'Tour', 'Agent', 'Due', 'Invoiced ', 'Received ', 'Balance ', 'Status'], bk.map(b => { const t = totals(b).sell, r = received(b), bal = t - r; const st = bal <= .5 ? 'Paid' : r > 0 ? 'Part paid' : (b.dueDate && b.dueDate < today() ? 'Overdue' : 'Unpaid'); return { b, t, r, bal, st }; }).sort((x, y) => (x.b.dueDate || '').localeCompare(y.b.dueDate || '')).map(({ b, t, r, bal, st }) => `<tr class="click" data-go="booking/${esc(b.id)}"><td><b class="ref">${esc(b.invoiceNo)}</b></td><td>${esc(b.no)}</td><td>${esc(agentName(b.agent))}</td><td>${esc(b.dueDate)}</td><td class="num">${esc(fmt(t, b.currency))}</td><td class="num">${esc(fmt(r, b.currency))}</td><td class="num"><b>${esc(fmt(bal, b.currency))}</b></td><td>${tagFor(st)}</td></tr>`), 'No invoices yet. Invoices come from bookings.');
  if (ft === 'pay') { const rows = []; bk.forEach(b => flatLines(b).forEach(l => { const due = l.netLocal - num(l.paid); if (due > .5) rows.push(`<tr class="click" data-go="booking/${esc(b.id)}"><td class="ref">${esc(b.no)}</td><td>${esc(supName(l.supplier, l))}</td><td>${esc(l.desc)}</td><td>${esc(l.date || b.arrival)}</td><td class="num">${esc(fmt(l.netLocal, l.currency))}</td><td class="num">${esc(fmt(l.paid, l.currency))}</td><td class="num"><b>${esc(fmt(due, l.currency))}</b></td></tr>`); })); body = `<p class="note">The owner approves every supplier payment before it is paid.</p>` + table(['Tour', 'Supplier', 'Service', 'Date', 'Cost ', 'Paid ', 'To pay '], rows, 'No unpaid supplier bills.'); }
  if (ft === 'pl') body = table(['Tour', 'Agent', 'Arrival', 'Selling ', 'Net cost ', 'Profit ', 'Margin '], bk.slice().sort((a, b) => (b.arrival || '').localeCompare(a.arrival || '')).map(b => { const t = totals(b); return `<tr class="click" data-go="booking/${esc(b.id)}"><td class="ref">${esc(b.no)}</td><td>${esc(agentName(b.agent))}</td><td>${esc(b.arrival)}</td><td class="num">${esc(fmt(t.sell, b.currency))}</td><td class="num">${esc(fmt(t.net, b.currency))}</td><td class="num"><b>${esc(fmt(t.sell - t.net, b.currency))}</b></td><td class="num">${t.margin.toFixed(1)}%</td></tr>`; }), 'No bookings yet.');
  if (ft === 'stmt') body = `<div class="row"><div style="flex:1;max-width:380px">${sel('stmtAgent', agentOpts(), '', 'id="stmtAgent"')}</div><button class="btn p" data-act="stmt">Open statement</button></div><p class="note">Every invoice and payment for the agent, with a running balance.</p>`;
  if (ft === 'qb') body = `<h3 style="font-size:15px;margin-bottom:8px">QuickBooks export</h3><div class="grid"><label>From${inp('qbFrom', today().slice(0, 8) + '01', 'date', 'id="qbFrom"')}</label><label>To${inp('qbTo', today(), 'date', 'id="qbTo"')}</label></div>
    <div class="row" style="margin-top:12px"><button class="btn p" data-act="qb" data-id="inv">Invoices CSV</button><button class="btn" data-act="qb" data-id="pay">Payments received CSV</button><button class="btn" data-act="qb" data-id="bills">Supplier bills CSV</button><button class="btn" data-act="qb" data-id="cust">Customers CSV</button></div>
    <p class="note">Choose one company at the top first. Import the files in QuickBooks Online under Settings → Import data.</p>`;
  return `<div class="pagehead"><div><h1>Accounts & finance</h1><p class="lead">Invoices, statements, supplier bills and exports.</p></div></div><div class="tabs">${tabs}</div><div class="card">${body}</div>`;
} };

/* ---------- quotation: the 8 steps ---------- */
export const STEPS = ['Agent', 'Trip basics', 'Hotels', 'Transport & tours', 'Activities', 'Miscellaneous', 'Terms & notes', 'Breakdown & pricing'];
export const DEFAULT_TERMS = `Rates are net and non-commissionable unless stated otherwise.
Quotation is valid for 7 days from the date of issue, subject to availability at reconfirmation.
Rooms and services are not held until a written confirmation and deposit are received.
Cancellation charges follow each supplier's policy, advised at confirmation.
Rates exclude anything not listed under inclusions.`;
export const DEFAULT_INC = `Airport transfers (arrival & departure)
Accommodation and meals as mentioned above
Dedicated private chauffeur guide in air-conditioned private transport throughout the tour`;
export const DEFAULT_EXC = `International airfare
Lunches & beverages unless specified
Entrance fees unless specified
Personal expenses & tips
Travel insurance`;

const P = (path, val, type = 'text', extra = '') => `<input data-path="${path}" type="${type}" value="${esc(val ?? '')}" ${extra}>`;
const PS = (path, opts, val, extra = '') => `<select data-path="${path}" ${extra}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
const PA = (path, val, extra = '') => `<textarea data-path="${path}" ${extra}>${esc(val)}</textarea>`;
const yesNo = (key, val) => `<div class="seg"><button class="${val !== false ? 'on' : ''}" data-act="setIncl" data-k="${key}" data-id="1">Yes — included</button><button class="${val === false ? 'on' : ''}" data-act="setIncl" data-k="${key}" data-id="0">No — not included</button></div>`;
const rmBtn = (sec, i, label) => `<button class="icon" data-act="rmItem" data-k="${sec}" data-id="${i}" aria-label="Remove ${label}">✕</button>`;

export function calcText(key, q) {
  const [k, i] = key.split(':'); const qc = q.currency || 'AED';
  if (k === 'dur') { const n = nightsBetween(q.arrival, q.departure); return `Duration: ${n} night${n === 1 ? '' : 's'} / ${n ? n + 1 : 0} days`; }
  if (k === 'hotel') { const h = q.hotels[i]; if (!h) return ''; const n = nightsBetween(h.checkIn, h.checkOut); const pn = ROOM_TYPES.reduce((s, [t]) => s + num(h.rooms?.[t]?.n) * num(h.rooms?.[t]?.rate), 0); return `${n} night${n === 1 ? '' : 's'} · ${hotelPax(h)} paying pax · ${fmt(pn, h.currency)} / night × ${n} = <b>${esc(fmt(hotelNet(h), h.currency))}</b>`; }
  if (k === 'room') { const [hi, t] = i.split('.'); const h = q.hotels[hi]; const r = h?.rooms?.[t] || {}; const occ = ROOM_TYPES.find(x => x[0] === t)[2]; return { pp: occ ? fmt(num(r.rate) / occ, h.currency) : '—', pn: num(r.n) ? fmt(num(r.n) * num(r.rate), h.currency) : '—' }; }
  if (k === 'tr') { const t = q.transport[i]; return t ? esc(fmt(transportNet(t), t.currency)) : ''; }
  if (k === 'act') { const a = q.activities[i]; return a ? esc(fmt(activityNet(a), a.currency)) : ''; }
  if (k === 'misc') { const m = q.misc[i]; return m ? esc(fmt(miscNet(m), m.currency)) : ''; }
  if (k === 'break') return breakdownHTML(q);
  return '';
}
export function breakdownHTML(q) {
  const qc = q.currency || 'AED'; const t = totals(q); const pax = Math.max(1, paxOf(q));
  const row = (l, v, b) => `<div class="bk-row${b ? ' b' : ''}"><span>${l}</span><span>${v}</span></div>`;
  const sec = (k, l) => { const items = (q[k] || []).length; return row(l, items ? esc(fmt(t.bySec[k], qc)) : '—'); };
  const prLabel = q.markupMethod === 'fixed' ? 'Profit (fixed)' : q.markupMethod === 'pp' ? `Profit (${fmt(q.markup, qc)} p.p.)` : `Profit (${num(q.markup ?? 15).toFixed(1)}%)`;
  return `<h2>Full breakdown — ${esc(q.no || 'new')}</h2>${t.bad ? '<div class="warn">A line uses a currency with no exchange rate. Add it under Exchange rates.</div>' : ''}
    ${sec('hotels', 'Hotels')}${sec('transport', 'Transport & tours')}${sec('activities', 'Activities & entrance fees')}${sec('misc', 'Miscellaneous')}
    ${row('Net total', esc(fmt(t.net, qc)), true)}${row(prLabel, esc(fmt(t.profit, qc)))}${row(`Discount (${num(q.discountPct)}%)`, '−' + esc(fmt(t.discount, qc)))}
    <div class="bk-sell"><span>Selling price</span><b>${esc(fmt(t.sell, qc))}</b></div>
    <div class="bk-pp"><div><span>Per person (${pax} pax)</span><b>${esc(fmt(t.perPax, qc))}</b></div><div class="alt"><span>Per family / group</span><b>${esc(fmt(t.sell, qc))}</b></div></div>`;
}
const stepBody = {
  0(q) { const a = S.agents.find(x => x.id === q.agent) || {}; const qq = (UI.agentQ || '').toLowerCase();
    const list = S.agents.filter(inCo).filter(x => !qq || (x.name + ' ' + x.country + ' ' + x.code).toLowerCase().includes(qq)).sort((x, y) => (x.name || '').localeCompare(y.name || '')).slice(0, 50);
    return `<div class="card"><h2>Select the agent <a class="btn s" style="margin-left:auto" href="#/agent/new">+ New agent</a></h2><input id="agentQ" placeholder="Company, country or number" value="${esc(UI.agentQ || '')}" style="margin-bottom:10px">
      ${table(['No.', 'Company', 'Country', 'Billing', ''], list.map(x => `<tr class="click ${x.id === q.agent ? 'sel' : ''}" data-act="pickAgent" data-id="${esc(x.id)}"><td class="ref">${esc(x.code)}</td><td><b>${esc(x.name)}</b></td><td>${esc(x.country)}</td><td>${esc(x.currency)}</td><td class="note">${x.id === q.agent ? '✓ selected' : ''}</td></tr>`), 'No agents yet. Add one first.')}</div>
      <div class="card"><h2>On this costing</h2><div class="grid">${field('Company', PS('company', coOpts(), q.company))}${field('Billing currency', PS('currency', CURS, q.currency))}${field('Lead guest', P('lead', q.lead))}${field('Agent reference', P('agentRef', q.agentRef))}</div>
      ${a.id ? `<div class="kv">${[['Agent no.', a.code], ['Company', a.name], ['Contact', a.contact], ['Country', a.country], ['Address', a.address], ['Phone', a.phone], ['Email', a.email]].filter(x => x[1]).map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>` : '<p class="note">No agent selected yet.</p>'}</div>`; },
  1(q) { const ds = q.destinations || [];
    return `<div class="card"><h2>Destinations</h2><p class="note">Pick one or combine several — Sri Lanka + Maldives on a single costing is fine.</p><div class="chips">${DEST.map(d => `<button class="${ds.includes(d) ? 'on' : ''}" data-act="toggleDest" data-id="${esc(d)}">${esc(d)}</button>`).join('')}</div></div>
    <div class="card"><h2>Dates & party</h2><div class="grid">${field('Arrival', P('arrival', q.arrival, 'date'))}${field('Departure', P('departure', q.departure, 'date'))}${field('Adults', P('adults', q.adults, 'number', 'min="0"'))}${field('Children', P('children', q.children, 'number', 'min="0"'))}${field('Children ages', P('childAges', q.childAges))}${field('Nationality', P('nationality', q.nationality))}</div><p class="note" data-calc="dur">${calcText('dur', q)}</p></div>`; },
  2(q) { const off = q.hotelsIncluded === false;
    return `<div class="card inc"><span>Hotels included in this package?</span>${yesNo('hotelsIncluded', q.hotelsIncluded)}</div>${off ? '' : `<p class="note">Enter <b>rooms booked</b>, not people — the per-person rate divides by standard occupancy automatically.</p>
    <div class="row" style="margin-bottom:12px"><button class="btn" data-act="addItem" data-k="hotels">+ One-off hotel (manual)</button><button class="btn p" data-act="pickRates" data-k="hotels">Add from rate database</button></div>
    ${(q.hotels || []).map((h, i) => `<div class="card block"><div class="grid g6">${field('Hotel', P(`hotels.${i}.name`, h.name, 'text', 'placeholder="Hotel name"'))}${field('Category', P(`hotels.${i}.category`, h.category))}${field('Meal plan', PS(`hotels.${i}.meal`, ['RO', 'BB', 'HB', 'FB', 'AI'], h.meal))}${field('Check-in', P(`hotels.${i}.checkIn`, h.checkIn, 'date'))}${field('Check-out', P(`hotels.${i}.checkOut`, h.checkOut, 'date'))}<div class="row" style="align-self:end">${PS(`hotels.${i}.dest`, DEST, h.dest, 'style="width:auto"')}${rmBtn('hotels', i, 'hotel stay')}</div></div>
      <table class="rooms"><thead><tr><th>Room type</th><th class="num">Rooms</th><th class="num">Rate / room / night</th><th class="num">Per person</th><th class="num">Per night</th></tr></thead><tbody>${ROOM_TYPES.map(([t, l, occ]) => { const c = calcText(`room:${i}.${t}`, q); return `<tr><td><b>${t}</b> <span class="note">${l}${occ ? ' ÷' + occ : ' — excluded from paying pax'}</span></td><td class="num">${P(`hotels.${i}.rooms.${t}.n`, h.rooms?.[t]?.n ?? 0, 'number', 'min="0" class="sm"')}</td><td class="num">${P(`hotels.${i}.rooms.${t}.rate`, h.rooms?.[t]?.rate ?? 0, 'number', 'step="any" class="md"')}</td><td class="num" data-calc="room:${i}.${t}:pp">${esc(c.pp)}</td><td class="num" data-calc="room:${i}.${t}:pn">${esc(c.pn)}</td></tr>`; }).join('')}</tbody></table>
      <div class="row" style="margin-top:8px"><label style="width:120px">Currency${PS(`hotels.${i}.currency`, CURS, h.currency)}</label><label style="flex:1">Supplier${PS(`hotels.${i}.supplierId`, supOpts(), h.supplierId)}</label><span class="sp"></span><span data-calc="hotel:${i}">${calcText('hotel:' + i, q)}</span></div></div>`).join('') || '<div class="card empty"><b>No hotel stays on this costing</b><br>Pull a hotel from the database to auto-fill its rates, or add a one-off property manually.</div>'}
    <p class="note">Database rates are copied into the costing — later rate edits never change this quote.</p>`}`; },
  3(q) { const off = q.transportIncluded === false; const ds = (q.destinations || []).length ? q.destinations : [q.destination || 'Sri Lanka'];
    return `<div class="card inc"><span>Transport included in this package?</span>${yesNo('transportIncluded', q.transportIncluded)}</div>${off ? '' : `<p class="note">Choose a destination, then select mileage, a fixed service price or a resort package.</p>
    <div class="row" style="margin-bottom:12px">${ds.map(d => `<button class="btn" data-act="addTransport" data-id="${esc(d)}">+ ${esc(d)}</button>`).join('')}</div>
    ${(q.transport || []).map((t, i) => `<div class="card block"><div class="row" style="margin-bottom:8px"><b>${esc(t.dest || '')}</b><span class="tag">${{ mileage: 'Mileage — per km or day', fixed: 'Fixed-price transfer or tour', package: 'Resort package — per person' }[t.method || 'mileage']}</span><span class="sp"></span><span>Net <b data-calc="tr:${i}">${calcText('tr:' + i, q)}</b></span>${rmBtn('transport', i, 'transport line')}</div>
      <div class="grid g6">${field('Description', P(`transport.${i}.desc`, t.desc, 'text', 'placeholder="Airport – Negombo / Day tour"'))}${field('Date', P(`transport.${i}.date`, t.date, 'date'))}
      ${t.method === 'fixed' ? field('Vehicles / qty', P(`transport.${i}.qty`, t.qty, 'number')) + field('Price', P(`transport.${i}.price`, t.price, 'number', 'step="any"'))
      : t.method === 'package' ? field('Pax', P(`transport.${i}.pax`, t.pax, 'number')) + field('Price per person', P(`transport.${i}.price`, t.price, 'number', 'step="any"'))
      : field('Vehicle', P(`transport.${i}.vehicle`, t.vehicle, 'text', 'placeholder="Car / Van / Coach"')) + field('Kilometres', P(`transport.${i}.km`, t.km, 'number')) + field('Rate per km', P(`transport.${i}.perKm`, t.perKm, 'number', 'step="any"')) + field('Days', P(`transport.${i}.days`, t.days, 'number')) + field('Rate per day', P(`transport.${i}.perDay`, t.perDay, 'number', 'step="any"')) + field('Bata, guide, parking, tolls', P(`transport.${i}.extras`, t.extras, 'number', 'step="any"'))}
      ${field('Currency', PS(`transport.${i}.currency`, CURS, t.currency))}${field('Supplier', PS(`transport.${i}.supplierId`, supOpts(), t.supplierId))}</div></div>`).join('') || '<div class="card empty"><b>No transport lines yet</b><br>Add a line per destination above. Saved rates auto-fill; everything stays editable on this costing only.</div>'}`}`; },
  4(q) { return `<div class="card"><h2>Activities, guides & entrance fees <span class="sp"></span><button class="btn s" data-act="pickRates" data-k="activities">Browse activities</button><button class="btn s p" data-act="addItem" data-k="activities">+ Add line</button></h2>
    ${(q.activities || []).length ? `<div class="scroll"><table class="lines"><thead><tr><th>Date</th><th>Activity / guide / entrance</th><th>Supplier</th><th>Charged</th><th>Pax</th><th>Price</th><th>Currency</th><th class="num">Net</th><th></th></tr></thead><tbody>${q.activities.map((a, i) => `<tr><td>${P(`activities.${i}.date`, a.date, 'date')}</td><td style="min-width:180px">${P(`activities.${i}.name`, a.name)}</td><td style="min-width:140px">${PS(`activities.${i}.supplierId`, supOpts(), a.supplierId)}</td><td>${PS(`activities.${i}.per`, [['person', 'Per person'], ['group', 'Per group']], a.per)}</td><td class="sm">${P(`activities.${i}.pax`, a.pax, 'number')}</td><td class="md">${P(`activities.${i}.price`, a.price, 'number', 'step="any"')}</td><td>${PS(`activities.${i}.currency`, CURS, a.currency)}</td><td class="num" data-calc="act:${i}">${calcText('act:' + i, q)}</td><td>${rmBtn('activities', i, 'activity')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>No activities on this costing</b><br>Entrance fees and meals are always their own lines — never bundled into hotel or transport.</div>'}</div>`; },
  5(q) { return `<div class="card"><h2>Miscellaneous lines <span class="sp"></span><button class="btn s p" data-act="addItem" data-k="misc">+ Add line</button></h2>
    ${(q.misc || []).length ? `<div class="scroll"><table class="lines"><thead><tr><th>Date</th><th>Description</th><th>Qty</th><th>Price</th><th>Currency</th><th class="num">Net</th><th></th></tr></thead><tbody>${q.misc.map((m, i) => `<tr><td>${P(`misc.${i}.date`, m.date, 'date')}</td><td style="min-width:220px">${P(`misc.${i}.desc`, m.desc)}</td><td class="sm">${P(`misc.${i}.qty`, m.qty, 'number')}</td><td class="md">${P(`misc.${i}.price`, m.price, 'number', 'step="any"')}</td><td>${PS(`misc.${i}.currency`, CURS, m.currency)}</td><td class="num" data-calc="misc:${i}">${calcText('misc:' + i, q)}</td><td>${rmBtn('misc', i, 'line')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>Nothing miscellaneous yet</b><br>Restaurant bookings, event tickets, flowers, cake — anything that fits nowhere else goes here.</div>'}</div>`; },
  6(q) { return `<div class="card"><h2>Terms & conditions <span class="sub">printed on the quotation and itinerary</span></h2>${PA('terms', q.terms ?? DEFAULT_TERMS, 'style="min-height:130px"')}<label style="margin-top:10px">Arabic version${PA('termsAr', q.termsAr, 'dir="rtl"')}</label></div>
    <div class="card"><h2>Day-by-day itinerary ${S.itineraries.length ? `<span class="sp"></span><select data-act-change="useItin" style="max-width:260px"><option value="">Copy from an itinerary…</option>${S.itineraries.map(i => `<option value="${esc(i.id)}">${esc(i.title)}</option>`).join('')}</select>` : ''}</h2>${PA('itinerary', q.itinerary, 'style="min-height:150px" placeholder="Day 1 – Arrive Colombo, transfer to Negombo…"')}</div>
    <div class="card"><h2>Notes & special requests <span class="sub">honeymoon, dietary needs, room preferences</span></h2>${PA('notes', q.notes)}</div>
    <div class="g2"><div class="card"><h2>Package inclusions <span class="sub">one per line</span></h2>${PA('inclusions', q.inclusions ?? DEFAULT_INC)}<label style="margin-top:10px">Arabic version${PA('inclusionsAr', q.inclusionsAr, 'dir="rtl"')}</label></div>
    <div class="card"><h2>Package exclusions <span class="sub">one per line</span></h2>${PA('exclusions', q.exclusions ?? DEFAULT_EXC)}<label style="margin-top:10px">Arabic version${PA('exclusionsAr', q.exclusionsAr, 'dir="rtl"')}</label></div></div>`; },
  7(q) { const qc = q.currency || 'AED';
    const used = [...new Set(['hotels', 'transport', 'activities', 'misc'].flatMap(k => (q[k] || []).map(x => x.currency || qc)))].filter(c => c !== qc);
    return `<div class="cols"><div>
    <div class="card"><h2>Exchange rates → ${esc(qc)}</h2>${used.length ? `<div class="grid">${used.map(c => `<label>1 ${esc(c)} = ? ${esc(qc)}${P(`fx.${c}`, q.fx?.[c] ?? (isNaN(rateTo(c, { ...q, fx: {} })) ? '' : +rateTo(c, { ...q, fx: {} }).toFixed(6)), 'number', 'step="any"')}</label>`).join('')}</div><p class="note">Taken from Settings (XE.com). Change them here for this quotation only.</p>` : `<p class="note">Every line is already in ${esc(qc)}. Nothing to convert.</p>`}</div>
    <div class="card"><h2>Profit</h2><div class="grid">${field('Method', PS('markupMethod', [['percent', 'Percentage markup'], ['fixed', 'Fixed amount'], ['pp', 'Per person (P.P.)']], q.markupMethod))}${field(q.markupMethod === 'fixed' ? `Amount (${qc})` : q.markupMethod === 'pp' ? `Per person (${qc})` : 'Markup %', P('markup', q.markup ?? 15, 'number', 'step="any"'))}${field('Discount %', P('discountPct', q.discountPct ?? 0, 'number', 'step="any"'))}</div><p class="note">Discount is deducted from the price after markup.</p></div>
    <div class="card"><h2>Issue</h2><div class="grid">${field('Option', P('option', q.option, 'text', 'placeholder="Option A"'))}${field('Valid until', P('validUntil', q.validUntil, 'date'))}${field('Status', PS('status', ['Draft', 'Sent', 'Lost'], ['Draft', 'Sent', 'Lost'].includes(q.status) ? q.status : 'Draft'))}</div>
      <div class="row" style="margin-top:12px"><button class="btn" data-act="doc" data-id="quotePrice">Quotation with price</button><button class="btn" data-act="doc" data-id="quoteNoPrice">Without price</button><button class="btn" data-act="dupQuote">Copy as new option</button></div>
      <div class="row" style="margin-top:8px"><button class="btn p" data-act="toBooking">Mark as booked → create booking</button></div></div>
    </div><div><div class="card bk" data-calc="break">${breakdownHTML(q)}</div></div></div>`; },
};
export const EDIT = {};
EDIT.quote = q => { const step = UI.step || 0; const a = S.agents.find(x => x.id === q.agent);
  return `<div class="pagehead"><div><h1>Proforma ${esc(q.no || '(new)')}</h1><p class="lead">${esc(a?.name || 'No agent yet')} · billed in ${esc(q.currency || 'AED')}</p></div><div class="row"><span class="note" id="saveState">${q.id ? 'All changes saved' : 'Not saved yet'}</span>${tagFor(q.status || 'Draft')}<button class="btn" data-act="saveQuote">Save</button><button class="btn" data-act="doc" data-id="quotePrice">Preview & export</button><a class="link" href="#/quotes">All quotations</a></div></div>
  <div class="steps">${STEPS.map((s, i) => `<button class="${i === step ? 'on' : i < step ? 'done' : ''}" data-act="step" data-id="${i}">${i < step ? '✓' : i + 1} ${s}</button>`).join('')}</div>
  ${stepBody[step](q)}
  <div class="row stepnav">${step ? `<button class="btn" data-act="step" data-id="${step - 1}">← Back</button>` : ''}<span class="sp"></span>${step < 7 ? `<button class="btn p" data-act="step" data-id="${step + 1}">Next: ${STEPS[step + 1]} →</button>` : `<button class="btn p" data-act="saveQuote">Save quotation</button>`}</div>
  ${q.id ? `<div class="row" style="margin-top:24px"><span class="sp"></span><button class="btn d s" data-act="delRec" data-id="quotes">Delete quotation</button></div>` : ''}`;
};

EDIT.booking = b => { const t = totals(b), rc = received(b); const lines = flatLines(b);
  const secs = [['hotels', 'Hotels'], ['transport', 'Transport & tours'], ['activities', 'Activities'], ['misc', 'Miscellaneous']];
  return `<div class="pagehead"><div><h1>Booking ${esc(b.no)}</h1><p class="lead">${esc(agentName(b.agent))} · ${esc(b.lead || '')} · ${esc(b.arrival || '')} → ${esc(b.departure || '')} · ${paxOf(b)} pax</p></div><div class="row">${tagFor(b.status || 'Under process')}<a class="link" href="#/bookings">All bookings</a></div></div>
  <div class="strip"><div><span>Selling price</span><b>${esc(fmt(t.sell, b.currency))}</b></div><div><span>Received</span><b>${esc(fmt(rc, b.currency))}</b></div><div><span>Balance</span><b>${esc(fmt(t.sell - rc, b.currency))}</b></div><div><span>Profit</span><b>${esc(fmt(t.sell - t.net, b.currency))}</b></div></div>
  <div class="card"><h2>Status and invoice</h2><div class="grid">${field('Status', PS('status', ['Under process', 'Confirmed', 'On tour', 'Completed', 'Cancelled'], b.status || 'Under process'))}${field('Invoice no', P('invoiceNo', b.invoiceNo, 'text', 'readonly'))}${field('Invoice date', P('invoiceDate', b.invoiceDate, 'date'))}${field('Payment due', P('dueDate', b.dueDate, 'date'))}${field('Agent reference', P('agentRef', b.agentRef))}</div></div>
  ${secs.map(([k, l]) => { const ls = lines.filter(x => x.sec === k); if (!ls.length) return ''; return `<div class="card"><h2>${l} <span class="sub">${ls.filter(x => x.conf).length} of ${ls.length} confirmed</span></h2><div class="scroll"><table class="lines"><thead><tr><th>Date</th><th>Service</th><th>Supplier</th><th>Confirmation no.</th><th>Paid to supplier</th><th class="num">Cost</th></tr></thead><tbody>${ls.map(x => `<tr><td>${esc(x.date)}</td><td>${esc(x.desc)}</td><td>${esc(supName(x.supplier, x))}</td><td>${P(`${k}.${x.idx}.conf`, x.conf, 'text', 'placeholder="Conf no"')}</td><td class="md">${P(`${k}.${x.idx}.paid`, x.paid || '', 'number', 'step="any"')}</td><td class="num">${esc(fmt(x.netLocal, x.currency))}</td></tr>`).join('')}</tbody></table></div></div>`; }).join('')}
  <div class="g2"><div class="card"><h2>Payments received</h2><table class="lines"><thead><tr><th>Date</th><th>Amount (${esc(b.currency)})</th><th>Method</th><th>Reference</th><th></th></tr></thead><tbody>${(b.payments || []).map((p, i) => `<tr><td>${P(`payments.${i}.date`, p.date, 'date')}</td><td>${P(`payments.${i}.amount`, p.amount, 'number', 'step="any"')}</td><td>${PS(`payments.${i}.method`, ['Bank transfer', 'Cash', 'Card', 'Cheque', 'Payment link'], p.method)}</td><td>${P(`payments.${i}.ref`, p.ref)}</td><td>${rmBtn('payments', i, 'payment')}</td></tr>`).join('')}</tbody></table><div class="row" style="margin-top:8px"><button class="btn s" data-act="addItem" data-k="payments">+ Add payment</button></div></div>
  <div class="card"><h2>Guests and flights</h2><div class="grid">${field('Arrival flight', P('flightIn', b.flightIn))}${field('Departure flight', P('flightOut', b.flightOut))}</div><label style="margin-top:10px">Guest names / rooming list${PA('rooming', b.rooming)}</label></div></div>
  <div class="row"><button class="btn p" data-act="saveBooking">Save</button><button class="btn" data-act="doc" data-id="proforma">Proforma invoice</button><button class="btn" data-act="doc" data-id="tax">Tax invoice</button><button class="btn" data-act="doc" data-id="confirm">Confirmation voucher</button><button class="btn" data-act="doc" data-id="hotelv">Hotel vouchers</button>${b.quote ? `<a class="btn" href="#/quote/${esc(b.quote)}">Open costing</a>` : ''}<span class="sp"></span><button class="btn d s" data-act="delRec" data-id="bookings">Delete</button></div>`;
};

EDIT.agent = r => { const logins = S.users.filter(u => u.agentId === r.id); return `<div class="pagehead"><div><h1>${esc(r.name || 'New travel agent')}</h1><p class="lead">${esc(r.code || '')}</p></div><a class="link" href="#/agents">All travel agents</a></div><div class="card"><div class="grid">${field('Company (ours)', sel('company', coOpts(), r.company))}${field('Agency name', inp('name', r.name))}${field('Agent no.', inp('code', r.code, 'text', 'placeholder="AG-1001"'))}${field('Type', sel('type', ['Travel Agent', 'Direct customer', 'Corporate'], r.type))}${field('Country', inp('country', r.country))}${field('City', inp('city', r.city))}${field('Contact person', inp('contact', r.contact))}${field('Email', inp('email', r.email, 'email'))}${field('Phone / WhatsApp', inp('phone', r.phone))}${field('Billing currency', sel('currency', CURS, r.currency))}${field('Credit days', inp('creditDays', r.creditDays, 'number'))}${field('TRN / tax no', inp('trn', r.trn))}${field('Sales owner', sel('owner', [['', '—'], ...S.users.filter(u => u.role !== 'agent').map(u => [u.id, u.name || u.email])], r.owner))}</div><div class="grid" style="margin-top:10px">${field('Address', area('address', r.address))}${field('Notes', area('notes', r.notes))}</div></div>
  ${r.id ? `<div class="card"><h2>Portal logins <a class="btn s" style="margin-left:auto" href="#/users">Issue login</a></h2>${table(['Name', 'Email', 'Status'], logins.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${tagFor(u.active === false ? 'Suspended' : 'Active')}</td></tr>`), 'No portal login yet.')}</div>` : ''}
  <div class="row"><button class="btn p" data-act="saveSimple" data-id="agents">Save</button><span class="sp"></span>${r.id ? `<button class="btn d s" data-act="delRec" data-id="agents">Delete</button>` : ''}</div>`; };

EDIT.supplier = r => `<div class="pagehead"><div><h1>${esc(r.name || 'New supplier')}</h1><p class="lead">${esc(r.type || '')}${r.destination ? ' · ' + esc(r.destination) : ''}</p></div><a class="link" href="#/suppliers">All suppliers</a></div><div class="card"><div class="grid">${field('Supplier name', inp('name', r.name))}${field('Type', sel('type', ['Hotel', 'Transport', 'Activity', 'Guide', 'Restaurant', 'Visa', 'Airline', 'Other'], r.type))}${field('Destination', sel('destination', DEST, r.destination))}${field('City', inp('city', r.city))}${field('Contact person', inp('contact', r.contact))}${field('Reservations email', inp('email', r.email, 'email'))}${field('Phone', inp('phone', r.phone))}${field('Currency', sel('currency', CURS, r.currency))}${field('Payment terms', inp('terms', r.terms))}</div><div class="grid" style="margin-top:10px">${field('Address', area('address', r.address))}${field('Bank details', area('bank', r.bank))}${field('Notes', area('notes', r.notes))}</div></div>
  ${r.id ? `<div class="card"><h2>Rates from this supplier</h2>${table(['Service', 'Meal', 'Valid', 'Cost ', 'Unit'], S.rates.filter(x => x.supplierId === r.id).map(x => `<tr><td>${esc(x.service)}</td><td>${esc(x.meal)}</td><td>${esc(x.validFrom)} → ${esc(x.validTo)}</td><td class="num">${esc(fmt(x.cost, x.currency))}</td><td>${esc(x.unit)}</td></tr>`), 'No rates yet.')}</div>` : ''}
  <div class="row"><button class="btn p" data-act="saveSimple" data-id="suppliers">Save</button><span class="sp"></span>${r.id ? `<button class="btn d s" data-act="delRec" data-id="suppliers">Delete</button>` : ''}</div>`;

/* rate database picker */
export const PICK_TYPES = { hotels: ['Hotel'], transport: ['Transfer', 'Tour'], activities: ['Activity', 'Guide', 'Entrance', 'Meals', 'Other'] };
export function ratePicker(q, sec, qq = '') {
  const ds = q.destinations || []; const d = q.arrival || '';
  let r = S.rates.filter(x => PICK_TYPES[sec].includes(x.type)).filter(x => !ds.length || !x.destination || ds.includes(x.destination));
  if (qq) r = r.filter(x => JSON.stringify(x).toLowerCase().includes(qq.toLowerCase()));
  r = r.sort((a, b) => (a.supplier || '').localeCompare(b.supplier || '')).slice(0, 200);
  const valid = x => !d || ((!x.validFrom || x.validFrom <= d) && (!x.validTo || x.validTo >= d));
  return `<input id="rpq" placeholder="Search hotel, room, route…" value="${esc(qq)}" style="margin-bottom:8px"><p class="note">${esc(ds.join(', ') || 'All destinations')}${d ? ' · rates valid on ' + esc(d) + ' are marked' : ''}</p>` +
    table(['Supplier', 'Service', 'Meal', 'Valid', 'Cost ', ''], r.map(x => `<tr><td><b>${esc(x.supplier)}</b><div class="note">${esc(x.destination)} ${esc(x.city)}</div></td><td>${esc(x.service)}</td><td>${esc(x.meal)}</td><td>${valid(x) ? tagFor('Active') : '<span class="tag gr">Other dates</span>'}<div class="note">${esc(x.validFrom)} → ${esc(x.validTo)}</div></td><td class="num">${esc(fmt(x.cost, x.currency))}<div class="note">${esc(x.unit)}</div></td><td><button class="btn s p" data-act="addRate" data-k="${sec}" data-id="${esc(x.id)}">Add</button></td></tr>`), 'No saved rates match. Upload rates under Rates & supply.');
}
