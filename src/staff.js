import { S, UI, esc, num, fmt, today, addDays, cfg, coById, agentName, supName, userName, inCo, qMatch, byNew, tagFor, totals, lineCalc, received,
  sel, inp, area, field, coOpts, agentOpts, supOpts, table, LINE_TYPES, MEALS, DEST, CURS, curCo, routeArt, fx } from './core.js';

export const V = {};
const go = h => `href="#/${h}"`;

/* ---------- dashboard ---------- */
V.dashboard = { title: 'Dashboard', render() {
  const inq = S.inquiries.filter(inCo), qs = S.quotes.filter(inCo), bk = S.bookings.filter(inCo);
  const t = today(), in30 = addDays(t, 30);
  const open = inq.filter(i => !['Confirmed', 'Lost'].includes(i.status)).length;
  const pend = qs.filter(q => ['Draft', 'Sent'].includes(q.status || 'Draft')).length;
  const reqs = S.requests.filter(r => (r.status || 'New request') === 'New request').length;
  const live = bk.filter(b => b.status !== 'Cancelled');
  const arr = live.filter(b => b.arrival >= t && b.arrival <= in30).sort((a, b) => a.arrival.localeCompare(b.arrival));
  const onTour = live.filter(b => b.arrival <= t && (b.departure || b.arrival) >= t);
  const owed = {}; live.forEach(b => { const bal = totals(b).sell - received(b); if (bal > .5) owed[b.currency] = (owed[b.currency] || 0) + bal; });
  const list = o => Object.keys(o).length ? Object.entries(o).map(([c, v]) => esc(fmt(v, c))).join('<br>') : '0';
  const name = (S.me?.name || '').split(' ')[0];
  return `<div class="hero">${routeArt()}<h2>Good ${new Date().getHours() < 12 ? 'morning' : 'day'}${name ? ', ' + esc(name) : ''}.</h2><p>${onTour.length} group${onTour.length === 1 ? '' : 's'} on tour today · ${arr.length} arrival${arr.length === 1 ? '' : 's'} in the next 30 days</p></div>
  <div class="kpis">
    <div class="kpi"><span>Open inquiries</span><b>${open}</b></div>
    <div class="kpi s"><span>Quotes waiting</span><b>${pend}</b></div>
    <div class="kpi g"><span>New portal requests</span><b>${reqs}</b></div>
    <div class="kpi"><span>Owed by agents</span><b style="font-size:20px">${list(owed)}</b></div>
  </div>
  <div class="g2">
    <div class="card"><h2>Upcoming arrivals</h2>${table(['Tour', 'Arrival', 'Agent', 'Lead guest', 'Status'], arr.slice(0, 10).map(b => `<tr class="click" data-go="booking/${esc(b.id)}"><td><b>${esc(b.no)}</b></td><td>${esc(b.arrival)}</td><td>${esc(agentName(b.agent))}</td><td>${esc(b.lead)}</td><td>${tagFor(b.status)}</td></tr>`), 'No arrivals in the next 30 days.')}</div>
    <div class="card"><h2>Latest inquiries <a class="btn s" style="margin-left:auto" ${go('inquiry/new')}>New inquiry</a></h2>${table(['Inquiry', 'Agent', 'Destination', 'Status'], inq.sort(byNew).slice(0, 8).map(i => `<tr class="click" data-go="inquiry/${esc(i.id)}"><td><b>${esc(i.no)}</b><div class="note">${esc(i.lead)}</div></td><td>${esc(agentName(i.agent))}</td><td>${esc(i.destination)}</td><td>${tagFor(i.status)}</td></tr>`), 'No inquiries yet.')}</div>
  </div>`;
} };

/* ---------- lists ---------- */
V.inquiries = { title: 'Inquiries', render() {
  const r = S.inquiries.filter(inCo).filter(qMatch).sort(byNew);
  return `<div class="row" style="margin-bottom:14px"><a class="btn p" ${go('inquiry/new')}>New inquiry</a></div><div class="card">${table(['Inquiry', 'Agent', 'Lead guest', 'Destination', 'Travel dates', 'Pax', 'Status', ''], r.map(i => `<tr class="click" data-go="inquiry/${esc(i.id)}"><td><b>${esc(i.no)}</b><div class="note">${esc((i.createdAt || '').slice(0, 10))}</div></td><td>${esc(agentName(i.agent))}</td><td>${esc(i.lead)}</td><td>${esc(i.destination)}</td><td>${esc(i.arrival || '')}${i.departure ? ' → ' + esc(i.departure) : ''}</td><td>${num(i.adults)}A ${num(i.children) ? num(i.children) + 'C' : ''}</td><td>${tagFor(i.status)}</td><td><button class="btn s" data-act="quoteFrom" data-id="${esc(i.id)}">Make quote</button></td></tr>`), 'No inquiries yet.')}</div>`;
} };
V.quotes = { title: 'Quotations', render() {
  const r = S.quotes.filter(inCo).filter(qMatch).sort(byNew);
  return `<div class="row" style="margin-bottom:14px"><a class="btn p" ${go('quote/new')}>New quotation</a></div><div class="card">${table(['Quote', 'Agent', 'Lead guest', 'Arrival', 'Sell ', 'Profit ', 'Status', 'By'], r.map(q => { const t = totals(q); return `<tr class="click" data-go="quote/${esc(q.id)}"><td><b>${esc(q.no)}</b>${q.option ? ' <span class="note">' + esc(q.option) + '</span>' : ''}</td><td>${esc(agentName(q.agent))}</td><td>${esc(q.lead)}</td><td>${esc(q.arrival)}</td><td class="num">${esc(fmt(t.sell, q.currency))}</td><td class="num">${esc(fmt(t.profit, q.currency))}</td><td>${tagFor(q.status || 'Draft')}</td><td class="note">${esc(userName(q.createdBy))}</td></tr>`; }), 'No quotations yet.')}</div>`;
} };
V.bookings = { title: 'Bookings', render() {
  const st = UI.filter.bk || 'Active';
  let r = S.bookings.filter(inCo).filter(qMatch);
  if (st === 'Active') r = r.filter(b => !['Completed', 'Cancelled'].includes(b.status)); else if (st !== 'All') r = r.filter(b => b.status === st);
  r.sort((a, b) => (a.arrival || '').localeCompare(b.arrival || ''));
  const tabs = ['Active', 'Completed', 'Cancelled', 'All'].map(x => `<button class="${st === x ? 'on' : ''}" data-act="filter" data-k="bk" data-id="${x}">${x}</button>`).join('');
  return `<div class="tabs">${tabs}</div><div class="card">${table(['Tour', 'Agent', 'Lead guest', 'Arrival', 'Sell ', 'Balance ', 'Status'], r.map(b => { const t = totals(b), rc = received(b); return `<tr class="click" data-go="booking/${esc(b.id)}"><td><b>${esc(b.no)}</b><div class="note">${esc(b.invoiceNo)}</div></td><td>${esc(agentName(b.agent))}</td><td>${esc(b.lead)}</td><td>${esc(b.arrival)}</td><td class="num">${esc(fmt(t.sell, b.currency))}</td><td class="num">${esc(fmt(t.sell - rc, b.currency))}</td><td>${tagFor(b.status)}</td></tr>`; }), 'No bookings here. Accept a quotation and convert it to a booking.')}</div>`;
} };
V.agents = { title: 'Travel agents', render() {
  const r = S.agents.filter(inCo).filter(qMatch).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const logins = id => S.users.filter(u => u.agentId === id && u.active !== false).length;
  return `<div class="row" style="margin-bottom:14px"><a class="btn p" ${go('agent/new')}>New agent</a></div><div class="card">${table(['Agent', 'Code', 'Country', 'Contact', 'Phone', 'Billing', 'Portal'], r.map(a => `<tr class="click" data-go="agent/${esc(a.id)}"><td><b>${esc(a.name)}</b><div class="note">${esc(a.email)}</div></td><td>${esc(a.code)}</td><td>${esc(a.country)}</td><td>${esc(a.contact)}</td><td>${esc(a.phone)}</td><td>${esc(a.currency)}</td><td>${logins(a.id) ? tagFor('Active') + ` <span class="note">${logins(a.id)} login${logins(a.id) > 1 ? 's' : ''}</span>` : '<span class="tag gr">No login</span>'}</td></tr>`), 'No agents yet.')}</div>`;
} };
V.suppliers = { title: 'Suppliers', render() {
  const r = S.suppliers.filter(qMatch).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  return `<div class="row" style="margin-bottom:14px"><a class="btn p" ${go('supplier/new')}>New supplier</a></div><div class="card">${table(['Supplier', 'Type', 'Destination', 'Contact', 'Email', 'Phone', 'Rates'], r.map(a => `<tr class="click" data-go="supplier/${esc(a.id)}"><td><b>${esc(a.name)}</b></td><td>${esc(a.type)}</td><td>${esc(a.destination)}</td><td>${esc(a.contact)}</td><td>${esc(a.email)}</td><td>${esc(a.phone)}</td><td class="num">${S.rates.filter(x => x.supplierId === a.id).length}</td></tr>`), 'No suppliers yet.')}</div>`;
} };

/* ---------- finance ---------- */
V.finance = { title: 'Finance', render() {
  const ft = UI.tab.fin || 'recv';
  const bk = S.bookings.filter(inCo).filter(b => b.status !== 'Cancelled');
  const tabs = [['recv', 'Receivables'], ['pay', 'Supplier payables'], ['pl', 'P&L per tour'], ['stmt', 'Agent statement'], ['qb', 'QuickBooks export']].map(([k, l]) => `<button class="${ft === k ? 'on' : ''}" data-act="tab" data-k="fin" data-id="${k}">${l}</button>`).join('');
  let body = '';
  if (ft === 'recv') body = table(['Invoice', 'Tour', 'Agent', 'Due', 'Invoiced ', 'Received ', 'Balance ', 'Status'], bk.map(b => { const t = totals(b).sell, r = received(b), bal = t - r; const st = bal <= .5 ? 'Paid' : r > 0 ? 'Part paid' : (b.dueDate && b.dueDate < today() ? 'Overdue' : 'Unpaid'); return { b, t, r, bal, st }; }).filter(x => x.st !== 'Paid').sort((x, y) => (x.b.dueDate || '').localeCompare(y.b.dueDate || '')).map(({ b, t, r, bal, st }) => `<tr class="click" data-go="booking/${esc(b.id)}"><td><b>${esc(b.invoiceNo)}</b></td><td>${esc(b.no)}</td><td>${esc(agentName(b.agent))}</td><td>${esc(b.dueDate)}</td><td class="num">${esc(fmt(t, b.currency))}</td><td class="num">${esc(fmt(r, b.currency))}</td><td class="num"><b>${esc(fmt(bal, b.currency))}</b></td><td>${tagFor(st)}</td></tr>`), 'Nothing owed. Every invoice is paid.');
  if (ft === 'pay') { const rows = []; bk.forEach(b => (b.lines || []).forEach(l => { const c = lineCalc(l, b.currency); const cc = l.costCur || b.currency; const due = c.costLocal - num(l.paid); if (due > .5) rows.push(`<tr class="click" data-go="booking/${esc(b.id)}"><td>${esc(b.no)}</td><td>${esc(supName(l.supplier) || l.desc)}</td><td>${esc(l.type)}</td><td>${esc(l.date || b.arrival)}</td><td class="num">${esc(fmt(c.costLocal, cc))}</td><td class="num">${esc(fmt(l.paid, cc))}</td><td class="num"><b>${esc(fmt(due, cc))}</b></td></tr>`); })); body = `<p class="note">The owner approves every supplier payment before it is paid.</p>` + table(['Tour', 'Supplier', 'Service', 'Date', 'Cost ', 'Paid ', 'To pay '], rows, 'No unpaid supplier costs.'); }
  if (ft === 'pl') body = table(['Tour', 'Agent', 'Arrival', 'Sell ', 'Cost ', 'Profit ', 'Margin '], bk.slice().sort((a, b) => (b.arrival || '').localeCompare(a.arrival || '')).map(b => { const t = totals(b); return `<tr class="click" data-go="booking/${esc(b.id)}"><td>${esc(b.no)}</td><td>${esc(agentName(b.agent))}</td><td>${esc(b.arrival)}</td><td class="num">${esc(fmt(t.sell, b.currency))}</td><td class="num">${esc(fmt(t.cost, b.currency))}</td><td class="num"><b>${esc(fmt(t.profit, b.currency))}</b></td><td class="num">${t.margin.toFixed(1)}%</td></tr>`; }), 'No bookings yet.');
  if (ft === 'stmt') body = `<div class="row"><div style="flex:1;max-width:380px">${sel('stmtAgent', agentOpts(), '', 'id="stmtAgent"')}</div><button class="btn p" data-act="stmt">Open statement</button></div><p class="note">Every invoice and payment for the agent, with a running balance.</p>`;
  if (ft === 'qb') body = `<div class="grid"><label>From${inp('qbFrom', today().slice(0, 8) + '01', 'date', 'id="qbFrom"')}</label><label>To${inp('qbTo', today(), 'date', 'id="qbTo"')}</label></div>
    <div class="row" style="margin-top:12px"><button class="btn p" data-act="qb" data-id="inv">Invoices CSV</button><button class="btn" data-act="qb" data-id="pay">Payments received CSV</button><button class="btn" data-act="qb" data-id="bills">Supplier bills CSV</button><button class="btn" data-act="qb" data-id="cust">Customers CSV</button></div>
    <p class="note">Choose one company at the top first. Import the files in QuickBooks Online under Settings → Import data.</p>`;
  return `<div class="tabs">${tabs}</div><div class="card">${body}</div>`;
} };

/* ---------- editors ---------- */
export const EDIT = {};
EDIT.inquiry = r => `<div class="card"><h2>${esc(r.no || 'New inquiry')} ${r.id ? tagFor(r.status) : ''}</h2><div class="grid">
  ${field('Company', sel('company', coOpts(), r.company))}${field('Agent', sel('agent', agentOpts(), r.agent))}${field('Source', sel('source', ['Email', 'WhatsApp', 'Phone', 'Portal', 'Walk-in'], r.source))}${field('Status', sel('status', ['New', 'Working', 'Quoted', 'Confirmed', 'Lost'], r.status))}
  ${field('Lead guest', inp('lead', r.lead))}${field('Nationality', inp('nationality', r.nationality))}${field('Adults', inp('adults', r.adults, 'number', 'min="0"'))}${field('Children', inp('children', r.children, 'number', 'min="0"'))}
  ${field('Child ages', inp('childAges', r.childAges))}${field('Destination', sel('destination', DEST, r.destination))}${field('Arrival', inp('arrival', r.arrival, 'date'))}${field('Departure', inp('departure', r.departure, 'date'))}
  ${field('Hotel category', sel('category', ['', '3 star', '4 star', '5 star', 'Luxury villa', 'Mixed'], r.category))}${field('Budget', inp('budget', r.budget))}${field('Agent reference', inp('agentRef', r.agentRef))}${field('Handled by', sel('owner', [['', '—'], ...S.users.filter(u => u.role !== 'agent').map(u => [u.id, u.name || u.email])], r.owner))}</div>
  <div style="margin-top:12px">${field('Request details', area('notes', r.notes))}</div></div>
  <div class="row"><button class="btn p" data-act="saveInquiry">Save</button>${r.id ? `<button class="btn a" data-act="quoteFrom" data-id="${esc(r.id)}">Make quote</button>` : ''}<a class="btn" href="#/inquiries">Back</a><span class="sp"></span>${r.id ? `<button class="btn d" data-act="delRec" data-id="inquiries">Delete</button>` : ''}</div>
  ${r.id ? `<div class="card" style="margin-top:16px"><h2>Quotations for this inquiry</h2>${table(['Quote', 'Sell ', 'Status'], S.quotes.filter(q => q.inquiry === r.id).map(q => `<tr class="click" data-go="quote/${esc(q.id)}"><td>${esc(q.no)} ${esc(q.option)}</td><td class="num">${esc(fmt(totals(q).sell, q.currency))}</td><td>${tagFor(q.status || 'Draft')}</td></tr>`), 'None yet.')}</div>` : ''}`;

function header(r, kind) {
  return `<div class="card" id="sec-trip"><h2>${esc(r.no || (kind === 'quote' ? 'New quotation' : 'Booking'))}${r.option ? ' <span class="sub">' + esc(r.option) + '</span>' : ''} ${r.id ? tagFor(r.status || 'Draft') : ''}</h2><div class="grid">
  ${field('Company', sel('company', coOpts(), r.company))}${field('Agent', sel('agent', agentOpts(), r.agent))}${field('Lead guest', inp('lead', r.lead))}${field('Destination', sel('destination', DEST, r.destination))}
  ${field('Arrival', inp('arrival', r.arrival, 'date'))}${field('Departure', inp('departure', r.departure, 'date'))}${field('Adults', inp('adults', r.adults, 'number', 'min="0"'))}${field('Children', inp('children', r.children, 'number', 'min="0"'))}
  ${field('Nationality', inp('nationality', r.nationality))}${field('Selling currency', sel('currency', CURS, r.currency))}
  ${kind === 'quote' ? field('Option', inp('option', r.option, 'text', 'placeholder="Option A"')) + field('Valid until', inp('validUntil', r.validUntil, 'date')) + field('Status', sel('status', ['Draft', 'Sent', 'Accepted', 'Rejected'], r.status || 'Draft'))
    : field('Status', sel('status', ['Confirmed', 'In progress', 'Completed', 'Cancelled'], r.status)) + field('Invoice no', inp('invoiceNo', r.invoiceNo, 'text', 'readonly')) + field('Invoice date', inp('invoiceDate', r.invoiceDate, 'date')) + field('Payment due', inp('dueDate', r.dueDate, 'date')) + field('Agent reference', inp('agentRef', r.agentRef))}
  ${field('Discount', inp('discount', r.discount, 'number', 'step="any"'))}</div></div>`;
}
export const totHTML = r => { const qc = r.currency || 'AED', t = totals(r); return `<div><span class="note">Total cost</span><b>${esc(fmt(t.cost, qc))}</b></div><div><span class="note">Total sell</span><b>${esc(fmt(t.sell, qc))}</b></div><div><span class="note">Profit</span><b style="color:${t.profit < 0 ? 'var(--clay)' : 'var(--palm)'}">${esc(fmt(t.profit, qc))}</b></div><div><span class="note">Margin</span><b>${t.margin.toFixed(1)}%</b></div><div><span class="note">Per person</span><b>${esc(fmt(t.perPax, qc))}</b></div>`; };
function linesCard(r, booking) {
  const qc = r.currency || 'AED'; const t = totals(r);
  const rows = (r.lines || []).map((l, i) => {
    const c = lineCalc(l, qc);
    const L = (k, v, ty = 'text', x = '') => `<input data-l="${i}" data-k="${k}" type="${ty}" value="${esc(v ?? '')}" ${x}>`;
    const LS = (k, o, v) => `<select data-l="${i}" data-k="${k}">${o.map(x => { const [a, b] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(a)}" ${String(a) === String(v ?? '') ? 'selected' : ''}>${esc(b)}</option>`; }).join('')}</select>`;
    return `<tr><td style="min-width:96px">${LS('type', LINE_TYPES, l.type)}</td><td>${L('date', l.date, 'date')}</td><td style="min-width:150px">${LS('supplier', supOpts(), l.supplier)}</td><td style="min-width:180px">${L('desc', l.desc, 'text', 'placeholder="Deluxe room / Airport transfer"')}</td><td style="width:74px">${l.type === 'Hotel' ? LS('meal', ['', ...MEALS], l.meal) : ''}</td><td style="width:64px">${L('qty', l.qty, 'number', 'step="any" title="Rooms, pax or cars"')}</td><td style="width:64px">${L('units', l.units, 'number', 'step="any" title="Nights or days"')}</td><td style="width:100px">${L('unitCost', l.unitCost, 'number', 'step="any"')}</td><td style="width:82px">${LS('costCur', CURS, l.costCur || qc)}</td><td style="width:66px">${L('markup', l.markup, 'number', 'step="any"')}</td><td class="num" id="lc${i}">${isNaN(c.cost) ? '<span class="tag bad">no rate</span>' : esc(fmt(c.cost, qc))}</td><td style="width:104px">${L('sellOverride', l.sellOverride, 'number', 'step="any" placeholder="' + (isNaN(c.sell) ? '' : c.sell.toFixed(2)) + '"')}</td>${booking ? `<td style="width:110px">${L('conf', l.conf, 'text', 'placeholder="Conf no"')}</td><td style="width:92px">${L('paid', l.paid, 'number', 'step="any" title="Paid to supplier, in cost currency"')}</td>` : ''}<td><button class="btn s d" data-act="rmLine" data-id="${i}" aria-label="Remove line">×</button></td></tr>`;
  }).join('');
  return `<div class="card" id="sec-services"><h2>Services and costing <span class="sub">Qty = rooms, pax or cars · Nts/days = nights or days · leave Sell empty to use the markup</span></h2>${t.bad ? '<div class="warn">A line has a cost currency with no exchange rate. Add the rate in Settings.</div>' : ''}
  <div class="scroll"><table class="lines"><thead><tr><th>Type</th><th>Date</th><th>Supplier</th><th>Description</th><th>Meal</th><th>Qty</th><th>Nts/days</th><th>Unit cost</th><th>Cost cur</th><th>Markup %</th><th class="num">Cost (${esc(qc)})</th><th>Sell</th>${booking ? '<th>Conf no</th><th>Paid supplier</th>' : ''}<th></th></tr></thead><tbody>${rows || `<tr><td colspan="14" class="empty">No services yet. Pick from your rates or add a line.</td></tr>`}</tbody></table></div>
  <div class="row" style="margin-top:10px"><button class="btn a s" data-act="pickRates">+ From rates</button>${LINE_TYPES.slice(0, 6).map(x => `<button class="btn s" data-act="addLine" data-id="${x}">+ ${x}</button>`).join('')}<button class="btn s" data-act="addLine" data-id="Other">+ Other</button></div>
  <div class="tot" id="totbox">${totHTML(r)}</div></div>`;
}
const textCard = r => `<div class="card" id="sec-terms"><h2>Itinerary and terms ${S.itineraries.length ? `<span class="sp"></span><select data-act-change="useItin" style="max-width:280px"><option value="">Copy from an itinerary…</option>${S.itineraries.map(i => `<option value="${esc(i.id)}">${esc(i.title)}</option>`).join('')}</select>` : ''}</h2><div class="grid">${field('Day-by-day itinerary', area('itinerary', r.itinerary, 'style="min-height:160px" placeholder="Day 1 – Arrive Colombo, transfer to Negombo…"'))}${field('Inclusions', area('inclusions', r.inclusions))}${field('Exclusions', area('exclusions', r.exclusions))}${field('Internal notes', area('notes', r.notes))}</div></div>`;

EDIT.quote = r => `<div class="steps no-print"><a href="#sec-trip">Trip</a><a href="#sec-services">Services and costing</a><a href="#sec-terms">Itinerary and terms</a></div>` + header(r, 'quote') + linesCard(r, false) + textCard(r) +
  `<div class="row"><button class="btn p" data-act="saveQuote">Save</button><button class="btn" data-act="doc" data-id="quotePrice">Quotation with price</button><button class="btn" data-act="doc" data-id="quoteNoPrice">Without price</button><button class="btn" data-act="dupQuote">Copy as new option</button>${r.id ? `<button class="btn a" data-act="toBooking">Convert to booking</button>` : ''}<a class="btn" href="#/quotes">Back</a><span class="sp"></span>${r.id ? `<button class="btn d" data-act="delRec" data-id="quotes">Delete</button>` : ''}</div>`;

EDIT.booking = r => { const t = totals(r), rc = received(r); return header(r, 'booking') + linesCard(r, true) + `
  <div class="g2"><div class="card"><h2>Payments received <span class="sub">Balance ${esc(fmt(t.sell - rc, r.currency))}</span></h2><table class="lines"><thead><tr><th>Date</th><th>Amount (${esc(r.currency)})</th><th>Method</th><th>Reference</th><th></th></tr></thead><tbody>${(r.payments || []).map((p, i) => `<tr><td><input data-p="${i}" data-k="date" type="date" value="${esc(p.date)}"></td><td><input data-p="${i}" data-k="amount" type="number" step="any" value="${esc(p.amount)}"></td><td><select data-p="${i}" data-k="method">${['Bank transfer', 'Cash', 'Card', 'Cheque', 'Payment link'].map(m => `<option ${m === p.method ? 'selected' : ''}>${m}</option>`).join('')}</select></td><td><input data-p="${i}" data-k="ref" value="${esc(p.ref)}"></td><td><button class="btn s d" data-act="rmPay" data-id="${i}" aria-label="Remove payment">×</button></td></tr>`).join('')}</tbody></table><div class="row" style="margin-top:8px"><button class="btn s" data-act="addPay">Add payment</button></div></div>
  <div class="card"><h2>Guests and flights</h2><div class="grid">${field('Arrival flight', inp('flightIn', r.flightIn))}${field('Departure flight', inp('flightOut', r.flightOut))}</div><div style="margin-top:10px">${field('Guest names / rooming list', area('rooming', r.rooming))}</div></div></div>` + textCard(r) + `
  <div class="row"><button class="btn p" data-act="saveBooking">Save</button><button class="btn" data-act="doc" data-id="proforma">Proforma invoice</button><button class="btn" data-act="doc" data-id="tax">Tax invoice</button><button class="btn" data-act="doc" data-id="confirm">Confirmation voucher</button><button class="btn" data-act="doc" data-id="hotelv">Hotel vouchers</button><a class="btn" href="#/bookings">Back</a><span class="sp"></span><button class="btn d" data-act="delRec" data-id="bookings">Delete</button></div>`; };

EDIT.agent = r => { const logins = S.users.filter(u => u.agentId === r.id); return `<div class="card"><h2>${esc(r.name || 'New travel agent')}</h2><div class="grid">${field('Company', sel('company', coOpts(), r.company))}${field('Agency name', inp('name', r.name))}${field('Agent code', inp('code', r.code, 'text', 'placeholder="AG-1001"'))}${field('Country', inp('country', r.country))}${field('City', inp('city', r.city))}${field('Contact person', inp('contact', r.contact))}${field('Email', inp('email', r.email, 'email'))}${field('Phone / WhatsApp', inp('phone', r.phone))}${field('Billing currency', sel('currency', CURS, r.currency))}${field('Credit days', inp('creditDays', r.creditDays, 'number'))}${field('TRN / tax no', inp('trn', r.trn))}${field('Sales owner', sel('owner', [['', '—'], ...S.users.filter(u => u.role !== 'agent').map(u => [u.id, u.name || u.email])], r.owner))}</div><div class="grid" style="margin-top:10px">${field('Address', area('address', r.address))}${field('Notes', area('notes', r.notes))}</div></div>
  ${r.id ? `<div class="card"><h2>Portal logins <a class="btn s a" style="margin-left:auto" href="#/users">Create login</a></h2>${table(['Name', 'Email', 'Status'], logins.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${tagFor(u.active === false ? 'Suspended' : 'Active')}</td></tr>`), 'No portal login yet. Create one under Users and logins.')}</div>` : ''}
  <div class="row"><button class="btn p" data-act="saveSimple" data-id="agents">Save</button><a class="btn" href="#/agents">Back</a><span class="sp"></span>${r.id ? `<button class="btn d" data-act="delRec" data-id="agents">Delete</button>` : ''}</div>`; };

EDIT.supplier = r => `<div class="card"><h2>${esc(r.name || 'New supplier')}</h2><div class="grid">${field('Supplier name', inp('name', r.name))}${field('Type', sel('type', ['Hotel', 'Transport', 'Activity', 'Guide', 'Restaurant', 'Visa', 'Airline', 'Other'], r.type))}${field('Destination', sel('destination', DEST, r.destination))}${field('City', inp('city', r.city))}${field('Contact person', inp('contact', r.contact))}${field('Reservations email', inp('email', r.email, 'email'))}${field('Phone', inp('phone', r.phone))}${field('Currency', sel('currency', CURS, r.currency))}${field('Payment terms', inp('terms', r.terms))}</div><div class="grid" style="margin-top:10px">${field('Address', area('address', r.address))}${field('Bank details', area('bank', r.bank))}${field('Notes', area('notes', r.notes))}</div></div>
  ${r.id ? `<div class="card"><h2>Rates from this supplier</h2>${table(['Service', 'Meal', 'Valid', 'Cost ', 'Unit'], S.rates.filter(x => x.supplierId === r.id).map(x => `<tr><td>${esc(x.service)}</td><td>${esc(x.meal)}</td><td>${esc(x.validFrom)} → ${esc(x.validTo)}</td><td class="num">${esc(fmt(x.cost, x.currency))}</td><td>${esc(x.unit)}</td></tr>`), 'No rates yet. Upload them under Rates.')}</div>` : ''}
  <div class="row"><button class="btn p" data-act="saveSimple" data-id="suppliers">Save</button><a class="btn" href="#/suppliers">Back</a><span class="sp"></span>${r.id ? `<button class="btn d" data-act="delRec" data-id="suppliers">Delete</button>` : ''}</div>`;

/* rate picker shown in a modal while editing a quote or booking */
export function ratePicker(rec, q = '', type = '') {
  const dest = rec.destination; const d = rec.arrival || '';
  let r = S.rates.filter(x => !dest || !x.destination || x.destination === dest);
  if (type) r = r.filter(x => x.type === type);
  if (q) r = r.filter(x => JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  r = r.sort((a, b) => (a.supplier || '').localeCompare(b.supplier || '')).slice(0, 200);
  const valid = x => !d || ((!x.validFrom || x.validFrom <= d) && (!x.validTo || x.validTo >= d));
  return `<div class="row" style="margin-bottom:10px"><input id="rpq" placeholder="Search hotel, room, route…" value="${esc(q)}" style="flex:1;min-width:200px"><select id="rpt" style="width:auto">${['', ...LINE_TYPES].map(t => `<option value="${t}" ${t === type ? 'selected' : ''}>${t || 'All types'}</option>`).join('')}</select></div>
  <p class="note">${esc(dest || 'All destinations')}${d ? ' · rates valid on ' + esc(d) + ' are marked' : ''}</p>` +
    table(['Type', 'Supplier', 'Service', 'Meal', 'Valid', 'Cost ', ''], r.map(x => `<tr><td>${esc(x.type)}</td><td><b>${esc(x.supplier)}</b><div class="note">${esc(x.city)}</div></td><td>${esc(x.service)}</td><td>${esc(x.meal)}</td><td>${valid(x) ? tagFor('Active') : '<span class="tag gr">Other dates</span>'}<div class="note">${esc(x.validFrom)} → ${esc(x.validTo)}</div></td><td class="num">${esc(fmt(x.cost, x.currency))}<div class="note">${esc(x.unit)}</div></td><td><button class="btn s a" data-act="addRate" data-id="${esc(x.id)}">Add</button></td></tr>`), 'No rates match. Upload rates under Rates.');
}
