import { S, UI, esc, num, fmt, today, cfg, agentName, userName, byNew, tagFor, qMatch, sel, inp, area, field, agentOpts, table, LINE_TYPES, MEALS, DEST, CURS, isAdmin, destArt } from './core.js';
import { V, EDIT } from './staff.js';

const go = h => `href="#/${h}"`;
export const RATE_COLS = ['Type', 'Destination', 'City', 'Supplier', 'Service', 'Meal', 'Valid from', 'Valid to', 'Cost', 'Currency', 'Unit', 'Notes'];
export const UNITS = ['per room per night', 'per person', 'per person per night', 'per car', 'per car per day', 'per day', 'per group', 'per trip'];

/* ---------- rates ---------- */
V.rates = { title: 'Rates', render() {
  const f = UI.filter; let r = S.rates.filter(qMatch);
  if (f.rdest) r = r.filter(x => x.destination === f.rdest);
  if (f.rtype) r = r.filter(x => x.type === f.rtype);
  r.sort((a, b) => (a.destination || '').localeCompare(b.destination || '') || (a.supplier || '').localeCompare(b.supplier || '') || (a.service || '').localeCompare(b.service || ''));
  const shown = r.slice(0, 400);
  return `<div class="card"><h2>Upload rates from Excel <span class="sub">hotels, transfers, tours, activities, guides</span></h2>
    <div class="drop" id="drop"><p style="margin:0 0 8px"><b>Drop an Excel or CSV file here</b>, or</p><label class="btn a" style="display:inline-flex">Choose file<input type="file" id="rateFile" accept=".xlsx,.xls,.csv" hidden></label>
    <p class="note" style="margin:10px 0 0">Columns: ${RATE_COLS.join(', ')}. <a href="#" data-act="rateTemplate">Download the template</a>.</p></div>
    <div id="ratePreview"></div></div>
  <div class="row" style="margin-bottom:12px">${sel('rdest', [['', 'All destinations'], ...DEST], f.rdest, 'data-filter="rdest" style="width:auto"')}${sel('rtype', [['', 'All types'], ...LINE_TYPES], f.rtype, 'data-filter="rtype" style="width:auto"')}<span class="sp"></span><a class="btn" ${go('rate/new')}>Add one rate</a>${isAdmin() && r.length ? `<button class="btn d" data-act="delRates">Delete these ${r.length}</button>` : ''}</div>
  <div class="card">${table(['Type', 'Destination', 'Supplier', 'Service', 'Meal', 'Valid', 'Cost ', 'Unit'], shown.map(x => `<tr class="click" data-go="rate/${esc(x.id)}"><td>${esc(x.type)}</td><td>${esc(x.destination)}<div class="note">${esc(x.city)}</div></td><td><b>${esc(x.supplier)}</b></td><td>${esc(x.service)}</td><td>${esc(x.meal)}</td><td>${esc(x.validFrom)} → ${esc(x.validTo)}${x.validTo && x.validTo < today() ? ' ' + tagFor('Expired') : ''}</td><td class="num">${esc(fmt(x.cost, x.currency))}</td><td class="note">${esc(x.unit)}</td></tr>`), 'No rates yet. Upload your rate sheet above.')}${r.length > shown.length ? `<p class="note">Showing ${shown.length} of ${r.length}. Use the filters or search to narrow.</p>` : ''}</div>`;
} };
EDIT.rate = r => `<div class="card"><h2>${esc(r.service || 'New rate')}</h2><div class="grid">${field('Type', sel('type', LINE_TYPES, r.type))}${field('Destination', sel('destination', DEST, r.destination))}${field('City / area', inp('city', r.city))}${field('Supplier / hotel', inp('supplier', r.supplier, 'text', 'list="supList"'))}${field('Service / room / vehicle', inp('service', r.service))}${field('Meal plan', sel('meal', ['', ...MEALS], r.meal))}${field('Valid from', inp('validFrom', r.validFrom, 'date'))}${field('Valid to', inp('validTo', r.validTo, 'date'))}${field('Cost', inp('cost', r.cost, 'number', 'step="any"'))}${field('Currency', sel('currency', CURS, r.currency))}${field('Unit', sel('unit', UNITS, r.unit))}</div><div style="margin-top:10px">${field('Notes (child policy, supplements…)', area('notes', r.notes))}</div>
  <datalist id="supList">${S.suppliers.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist></div>
  <div class="row"><button class="btn p" data-act="saveRate">Save</button><a class="btn" href="#/rates">Back</a><span class="sp"></span>${r.id ? `<button class="btn d" data-act="delRec" data-id="rates">Delete</button>` : ''}</div>`;

/* ---------- itineraries ---------- */
V.itineraries = { title: 'Itineraries', render() {
  const r = S.itineraries.filter(qMatch).sort(byNew);
  return `<div class="card"><h2>Upload a draft itinerary <span class="sub">from a Word file (.docx) or text file</span></h2><div class="drop" id="drop"><label class="btn a" style="display:inline-flex">Choose Word file<input type="file" id="itinFile" accept=".docx,.txt" hidden></label><p class="note" style="margin:10px 0 0">The text becomes a draft. Check it, add the price, then publish it to the agent portal.</p></div></div>
  <div class="row" style="margin-bottom:12px"><a class="btn p" ${go('itinerary/new')}>New itinerary</a></div>
  <div class="tiles">${r.map(i => `<a class="tile" style="text-decoration:none;color:inherit" ${go('itinerary/' + esc(i.id))}><div class="art">${destArt(i.destination)}<span>${esc(i.destination || 'Destination')}</span></div><div class="bd"><div class="row">${tagFor(i.published ? 'Published' : 'Draft')}<span class="note">${num(i.nights) ? num(i.nights) + ' nights' : ''}</span></div><h3>${esc(i.title || 'Untitled')}</h3><p class="note" style="margin:0">${esc((i.summary || '').slice(0, 110))}</p>${num(i.priceFrom) ? `<div class="price">From ${esc(fmt(i.priceFrom, i.currency))}</div>` : ''}</div></a>`).join('') || '<div class="empty">No itineraries yet.</div>'}</div>`;
} };
EDIT.itinerary = r => `<div class="card"><h2>${esc(r.title || 'New itinerary')} ${tagFor(r.published ? 'Published' : 'Draft')}</h2><div class="grid">${field('Title', inp('title', r.title, 'text', 'placeholder="Sri Lanka Highlights 7 Nights"'))}${field('Code', inp('code', r.code))}${field('Destination', sel('destination', DEST, r.destination))}${field('Nights', inp('nights', r.nights, 'number'))}${field('Price from (per person)', inp('priceFrom', r.priceFrom, 'number', 'step="any"'))}${field('Currency', sel('currency', CURS, r.currency))}${field('Valid until', inp('validTo', r.validTo, 'date'))}</div>
  <div style="margin-top:10px">${field('Short summary', area('summary', r.summary, 'style="min-height:70px"'))}</div><div class="grid" style="margin-top:10px">${field('Day-by-day', area('days', r.days, 'style="min-height:260px"'))}<div style="display:grid;gap:10px">${field('Hotels', area('hotels', r.hotels))}${field('Inclusions', area('inclusions', r.inclusions))}${field('Exclusions', area('exclusions', r.exclusions))}</div></div></div>
  <div class="row"><button class="btn p" data-act="saveItin">Save</button>${r.published ? `<button class="btn" data-act="publishItin" data-id="0">Unpublish</button>` : `<button class="btn a" data-act="publishItin" data-id="1">Publish to agent portal</button>`}<a class="btn" href="#/itineraries">Back</a><span class="sp"></span>${r.id ? `<button class="btn d" data-act="delRec" data-id="itineraries">Delete</button>` : ''}</div>`;

/* ---------- offers ---------- */
V.offers = { title: 'Portal offers', render() {
  const r = S.offers.filter(qMatch).sort(byNew);
  return `<div class="row" style="margin-bottom:12px"><a class="btn p" ${go('offer/new')}>New offer</a><span class="note">Published offers are the first thing agents see when they sign in.</span></div>
  <div class="tiles">${r.map(o => `<a class="tile" style="text-decoration:none;color:inherit" ${go('offer/' + esc(o.id))}><div class="art">${destArt(o.destination)}<span>${esc(o.destination || '')}</span></div><div class="bd"><div class="row">${tagFor(o.published ? (o.validTo && o.validTo < today() ? 'Expired' : 'Published') : 'Draft')}${o.validTo ? `<span class="note">until ${esc(o.validTo)}</span>` : ''}</div><h3>${esc(o.title || 'Untitled')}</h3>${num(o.priceFrom) ? `<div class="price">From ${esc(fmt(o.priceFrom, o.currency))}</div>` : ''}</div></a>`).join('') || '<div class="empty">No offers yet.</div>'}</div>`;
} };
EDIT.offer = r => `<div class="card"><h2>${esc(r.title || 'New offer')} ${tagFor(r.published ? 'Published' : 'Draft')}</h2><div class="grid">${field('Title', inp('title', r.title, 'text', 'placeholder="Maldives early-bird: 4th night free"'))}${field('Destination', sel('destination', DEST, r.destination))}${field('Price from', inp('priceFrom', r.priceFrom, 'number', 'step="any"'))}${field('Currency', sel('currency', CURS, r.currency))}${field('Book by', inp('validTo', r.validTo, 'date'))}${field('Travel window', inp('travel', r.travel, 'text', 'placeholder="1 Jan – 31 Mar 2027"'))}</div><div style="margin-top:10px">${field('Offer details', area('body', r.body, 'style="min-height:180px"'))}</div></div>
  <div class="row"><button class="btn p" data-act="saveOffer">Save</button>${r.published ? `<button class="btn" data-act="publishOffer" data-id="0">Unpublish</button>` : `<button class="btn a" data-act="publishOffer" data-id="1">Publish to agent portal</button>`}<a class="btn" href="#/offers">Back</a><span class="sp"></span>${r.id ? `<button class="btn d" data-act="delRec" data-id="offers">Delete</button>` : ''}</div>`;

/* ---------- portal requests ---------- */
V.requests = { title: 'Portal requests', render() {
  const r = S.requests.filter(qMatch).sort(byNew);
  return `<div class="card">${table(['Received', 'Agent', 'Request', 'Dates', 'Pax', 'Status'], r.map(x => `<tr class="click" data-go="request/${esc(x.id)}"><td>${esc((x.createdAt || '').slice(0, 10))}</td><td><b>${esc(agentName(x.agentId))}</b><div class="note">${esc(x.byName)}</div></td><td>${esc(x.title || 'Availability request')}</td><td>${esc(x.arrival)} → ${esc(x.departure)}</td><td>${num(x.adults)}A ${num(x.children) ? num(x.children) + 'C' : ''}</td><td>${tagFor(x.status || 'New request')}</td></tr>`), 'No requests from agents yet.')}</div>`;
} };
EDIT.request = r => `<div class="card"><h2>${esc(r.title || 'Availability request')} ${tagFor(r.status || 'New request')}</h2>
  <div class="grid"><div><span class="note">Agent</span><div><b>${esc(agentName(r.agentId))}</b> · ${esc(r.byName)}</div></div><div><span class="note">Dates</span><div>${esc(r.arrival)} → ${esc(r.departure)}</div></div><div><span class="note">Pax</span><div>${num(r.adults)} adults${num(r.children) ? ', ' + num(r.children) + ' children' : ''}</div></div><div><span class="note">Nationality</span><div>${esc(r.nationality)}</div></div></div>
  <p style="white-space:pre-line">${esc(r.notes)}</p>
  <div class="grid">${field('Status', sel('status', ['New request', 'In progress', 'Quoted', 'Confirmed', 'Declined'], r.status || 'New request'))}</div><div style="margin-top:10px">${field('Reply shown to the agent', area('reply', r.reply))}</div></div>
  <div class="row"><button class="btn p" data-act="saveRequest">Save</button>${r.inquiry ? `<a class="btn" ${go('inquiry/' + esc(r.inquiry))}>Open inquiry</a>` : `<button class="btn a" data-act="reqToInquiry">Create inquiry</button>`}<a class="btn" href="#/requests">Back</a></div>`;

/* ---------- users and logins ---------- */
V.users = { title: 'Users and logins', render() {
  const ft = UI.tab.users || 'staff';
  const tabs = [['staff', 'Team logins'], ['agents', 'Agent portal logins']].map(([k, l]) => `<button class="${ft === k ? 'on' : ''}" data-act="tab" data-k="users" data-id="${k}">${l}</button>`).join('');
  const isA = ft === 'agents';
  const list = S.users.filter(u => isA ? u.role === 'agent' : u.role !== 'agent').filter(qMatch);
  const form = isAdmin() ? `<div class="card"><h2>${isA ? 'Create an agent portal login' : 'Create a team login'}</h2><form id="newLogin" class="grid">
    ${isA ? field('Agent company', sel('agentId', agentOpts(), '', 'required')) : field('Role', sel('role', [['staff', 'Staff'], ['manager', 'Manager'], ['admin', 'Admin']], 'staff'))}
    ${field('Full name', inp('name', '', 'text', 'required'))}${field('Email', inp('email', '', 'email', 'required'))}
    <div style="align-self:end"><button class="btn p" type="submit">Create login</button></div></form>
    <p class="note">They get an email to set their own password. Nobody else sees it.</p></div>` : '';
  return `<div class="tabs">${tabs}</div>${form}<div class="card">${table(isA ? ['Name', 'Email', 'Agent', 'Status', ''] : ['Name', 'Email', 'Role', 'Status', ''], list.map(u => `<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${isA ? esc(agentName(u.agentId)) : esc(u.role)}</td><td>${tagFor(u.active === false ? 'Suspended' : 'Active')}</td><td class="num">${isAdmin() && u.id !== S.user.uid ? `<button class="btn s" data-act="resetPw" data-id="${esc(u.id)}">Send password email</button> <button class="btn s ${u.active === false ? '' : 'd'}" data-act="toggleUser" data-id="${esc(u.id)}">${u.active === false ? 'Reactivate' : 'Suspend'}</button>` : ''}</td></tr>`), 'No logins yet.')}</div>`;
} };

/* ---------- settings ---------- */
V.settings = { title: 'Settings', render() {
  const c = cfg();
  const coForm = (co, i) => { const f = (k, l, t = 'text') => `<label>${l}<input data-co="${i}" data-k="${k}" type="${t}" value="${esc(co[k] ?? '')}"></label>`; return `<div class="card" style="background:var(--sand);box-shadow:none"><div class="grid">${f('name', 'Company name')}${f('short', 'Tour number prefix')}<label>Base currency<select data-co="${i}" data-k="currency">${CURS.map(x => `<option ${x === co.currency ? 'selected' : ''}>${x}</option>`).join('')}</select></label>${f('trn', 'TRN / tax no')}${f('vat', 'VAT %', 'number')}${f('phone', 'Phone')}${f('email', 'Email')}${f('web', 'Website')}</div><div class="grid" style="margin-top:10px"><label>Address<textarea data-co="${i}" data-k="address">${esc(co.address)}</textarea></label><label>Bank details on invoices<textarea data-co="${i}" data-k="bank">${esc(co.bank)}</textarea></label></div><div class="row" style="margin-top:8px"><button class="btn s d" data-act="rmCo" data-id="${i}">Remove company</button></div></div>`; };
  return `<div class="card"><h2>Your companies <span class="sub">each prints its own details on invoices and vouchers</span></h2>${(c.companies || []).map(coForm).join('')}<button class="btn" data-act="addCo">Add company</button></div>
  <div class="card"><h2>Exchange rates <span class="sub">value of 1 unit in AED · update from XE.com</span></h2><div class="grid">${CURS.map(k => `<label>${k}<input class="fxin" data-cur="${k}" type="number" step="any" value="${esc((c.fx || {})[k] ?? '')}"></label>`).join('')}</div>
  <div class="grid" style="margin-top:12px"><label>Default markup %<input id="dMarkup" type="number" step="any" value="${esc(c.markup ?? 15)}"></label><label>Rates last updated<input id="fxDate" type="date" value="${esc(c.fxDate || '')}"></label></div></div>
  <div class="row"><button class="btn p" data-act="saveSettings">Save settings</button></div>`;
} };
