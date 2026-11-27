// Staff side of the agent portal: Sri Lanka builder settings, offer audiences, sign-ups, visa requests,
// agent quotations follow-up, contacts and email campaigns, public register/unsubscribe pages.
import { db, auth, doc, collection, setDoc, updateDoc, getDoc, deleteDoc, createLogin, sendPasswordResetEmail } from './fb.js';
import { S, UI, $, esc, num, fmt, today, cfg, toast, openModal, closeModal, save, table, field, inp, sel, area, tagFor, isAdmin, confirmBtn, userName, CURS } from './core.js';
import { V, EDIT } from './staff.js';
import { redraw, gmailSend, tiers, setKitParser } from './more.js';

const go = h => `href="#/${h}"`;
const lines = t => String(t || '').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const cells = l => l.split('|').map(x => x.trim());

/* ---------- Sri Lanka builder settings (staff only, published per profit group) ---------- */
// Sample data so the builder works from day one. Distances and rates are approximate: replace with your own.
export const SL_SAMPLE = {
  currency: 'USD', startArea: 'Airport', endArea: 'Airport', minKm: 100, warnKm: 180, guideMin: 10, guideDay: 60, guideRoom: 30, driverRoom: 15, markupPP: 30, guideLangs: 'English, Arabic, German, French, Russian',
  areasText: `# Area | route order | can swap with (comma) | min km per extra night | included free items (;) | arrival-day text
Airport | 0 | | 0 | |
Negombo | 1 | Colombo | 100 | | Arrive at the airport and transfer to Negombo for a relaxed first evening by the lagoon.
Colombo | 2 | Negombo | 100 | Colombo city drive; Shopping visit | Drive to Colombo for a city tour: Galle Face Green, the Fort and Pettah markets.
Dambulla | 10 | Sigiriya, Habarana, Kandy | 100 | | Drive to the Cultural Triangle. Visit the Dambulla Cave Temple.
Sigiriya | 11 | Dambulla, Habarana | 100 | | Climb Sigiriya Rock Fortress and enjoy the village countryside.
Habarana | 12 | Dambulla, Sigiriya | 100 | | Stay in Habarana, the base for jeep safaris in Minneriya and Kaudulla.
Trincomalee | 13 | Pasikudah | 100 | | Drive to the east coast beaches of Trincomalee.
Pasikudah | 14 | Trincomalee | 100 | | Drive to the calm shallow bay of Pasikudah.
Kandy | 20 | Nuwara Eliya, Hatton, Ella | 100 | Temple of the Tooth (outside visit); Gem museum | Drive to Kandy, the hill capital. Evening at the Kandy lake.
Hatton | 30 | Nuwara Eliya, Ella | 100 | | Tea country around Hatton and Adam's Peak.
Nuwara Eliya | 31 | Ella, Hatton | 100 | Tea factory visit | Drive through the tea plantations to Nuwara Eliya, little England.
Ella | 32 | Nuwara Eliya | 100 | Nine Arch Bridge | Scenic drive or train to Ella. Visit the Nine Arch Bridge.
Yala | 40 | Ella | 100 | | Drive south to Yala for an afternoon jeep safari.
Mirissa | 50 | Galle, Bentota | 100 | | Drive to the south coast and relax at Mirissa beach.
Galle | 51 | Mirissa, Bentota | 100 | Galle Fort walk | Explore the Dutch Galle Fort.
Bentota | 52 | Galle, Mirissa | 100 | Turtle hatchery | Relax on the west coast beach of Bentota.`,
  kmText: `# From | To | km (approximate: please check)
Airport | Negombo | 10
Airport | Colombo | 35
Airport | Dambulla | 150
Airport | Sigiriya | 165
Airport | Habarana | 165
Airport | Kandy | 100
Airport | Bentota | 100
Airport | Galle | 150
Airport | Mirissa | 175
Negombo | Dambulla | 145
Negombo | Kandy | 110
Colombo | Kandy | 115
Colombo | Bentota | 65
Colombo | Galle | 125
Dambulla | Sigiriya | 20
Dambulla | Habarana | 25
Dambulla | Kandy | 72
Dambulla | Trincomalee | 105
Dambulla | Yala | 250
Sigiriya | Kandy | 90
Sigiriya | Habarana | 15
Habarana | Trincomalee | 85
Habarana | Pasikudah | 110
Trincomalee | Pasikudah | 115
Kandy | Nuwara Eliya | 77
Kandy | Hatton | 80
Kandy | Ella | 140
Kandy | Bentota | 160
Hatton | Nuwara Eliya | 45
Hatton | Ella | 100
Nuwara Eliya | Ella | 55
Nuwara Eliya | Yala | 145
Ella | Yala | 100
Yala | Mirissa | 115
Yala | Galle | 150
Mirissa | Galle | 35
Galle | Bentota | 60
Mirissa | Bentota | 90
Nuwara Eliya | Bentota | 190
Nuwara Eliya | Galle | 210
Ella | Bentota | 210
Ella | Galle | 190
Ella | Mirissa | 170
Kandy | Galle | 210
Yala | Bentota | 200
Sigiriya | Trincomalee | 95
Airport | Trincomalee | 250
Airport | Pasikudah | 280`,
  vehiclesText: `# Vehicle | up to guests | rate per km
Car | 2 | 0.40
KDH van | 9 | 0.50
Minibus | 19 | 0.70
33-seater coach | 33 | 1.00`,
  routesText: `# Title | style | stops (Area:nights, comma) | short summary
Colombo & Beach 3N | Short break | Colombo:1, Bentota:2 | A quick taste of the city and the west coast.
Hills & Beach 5N | Hills & Beach | Kandy:2, Nuwara Eliya:1, Bentota:2 | Hill capital, tea country and beach.
Culture & Beach 6N | Culture | Dambulla:2, Kandy:2, Bentota:2 | Rock fortress, temples and beach time.
Classic Sri Lanka 7N | Classic | Dambulla:2, Kandy:2, Nuwara Eliya:1, Bentota:2 | The best of the island in one week.
Adventure 7N | Adventure | Sigiriya:2, Kandy:1, Ella:2, Yala:1, Mirissa:1 | Climb, hike, safari and whales.
Grand Tour 10N | Classic | Sigiriya:2, Kandy:2, Nuwara Eliya:1, Ella:1, Yala:1, Galle:1, Bentota:2 | The whole island, coast to hills.`,
};
export function parseKit(t) {
  const k = { ...t };
  k.areas = lines(t.areasText).map(l => { const [name, order, swaps, minKm, freeItems, dayText] = cells(l); return { name, order: order === '' ? '' : num(order), swaps: swaps || '', minKm: num(minKm) || '', freeItems: freeItems || '', dayText: dayText || '' }; }).filter(a => a.name);
  k.km = {}; lines(t.kmText).forEach(l => { const [a, b, km] = cells(l); if (a && b && num(km)) k.km[[a, b].sort().join('|')] = num(km); });
  k.vehicles = lines(t.vehiclesText).map(l => { const [name, max, perKm] = cells(l); return { name, max: num(max), perKm: num(perKm) }; }).filter(v => v.name).sort((a, b) => a.max - b.max);
  k.routes = lines(t.routesText).map((l, i) => { const [title, style, stops, summary, photo] = cells(l); return { id: 'r' + (i + 1), title, style: style || '', summary: summary || '', photo: photo || '', stops: String(stops || '').split(',').map(x => x.trim()).filter(Boolean).map(x => { const [a, n] = x.split(':'); return { area: a.trim(), nights: Math.max(1, num(n) || 1) }; }) }; }).filter(r => r.title && r.stops.length);
  delete k.areasText; delete k.kmText; delete k.vehiclesText; delete k.routesText;
  return k;
}
setKitParser(parseKit);
export async function loadKit() { try { const s = await getDoc(doc(db, 'settings', 'srilanka')); UI.kit = s.exists() ? s.data() : { ...SL_SAMPLE, sample: true }; } catch (e) { UI.kit = { ...SL_SAMPLE, sample: true }; } return UI.kit; }
V.slkit = { title: 'Sri Lanka builder', render() {
  if (!UI.kit) { loadKit().then(() => redraw()); return '<div class="empty">Loading…</div>'; }
  const t = UI.kit, k = parseKit(t);
  const f = (id, l, v, ty = 'number') => `<label>${l}<input id="${id}" type="${ty}" step="any" value="${esc(v ?? '')}"></label>`;
  const ta = (id, l, v, h = 220) => `<label>${l}<textarea id="${id}" style="min-height:${h}px;font:12px/1.5 ui-monospace,Menlo,monospace">${esc(v || '')}</textarea></label>`;
  const unknown = k.routes.flatMap(r => r.stops.map(s => s.area)).filter(a => !k.areas.find(x => x.name === a));
  return `<div class="pagehead"><div><h1>Sri Lanka package builder</h1><p class="lead">Areas, distances, vehicles and ready routes agents build from. Paste lines straight from Excel: one per line, columns split by |. After saving, publish the portal prices so agents get the update.</p></div><button class="btn p" data-act="saveKit">Save</button></div>
  ${t.sample ? '<div class="warn">These are sample settings with approximate distances and placeholder rates. Replace them with your real figures, then save.</div>' : ''}
  ${unknown.length ? `<div class="errbox">Routes use areas that are not in the area list: ${esc([...new Set(unknown)].join(', '))}</div>` : ''}
  <div class="card"><h2>Rates and rules <span class="sub">in ${esc(t.currency || 'USD')} · net cost · profit groups add their markup</span></h2><div class="grid">${f('k_cur', 'Currency', t.currency || 'USD', 'text')}${f('k_pp', 'Service fee per person', t.markupPP)}${f('k_gday', 'National guide per day', t.guideDay)}${f('k_groom', 'Guide room per night', t.guideRoom)}${f('k_droom', 'Driver room per night (hotels that do not give one)', t.driverRoom)}${f('k_gmin', 'Guide required from guests', t.guideMin || 10)}${f('k_min', 'Minimum km on a leisure day', t.minKm || 100)}${f('k_warn', 'Warn when a drive is over km', t.warnKm || 180)}${f('k_start', 'Start and end area', t.startArea || 'Airport', 'text')}${f('k_langs', 'Guide languages (comma)', t.guideLangs, 'text')}</div></div>
  <div class="card"><h2>Areas <span class="sub">${k.areas.length} areas</span></h2>${ta('k_areas', 'Area | route order | can swap with | min km per extra night | included free items (;) | arrival-day text', t.areasText, 300)}<p class="note">Route order sets the recommended direction: agents are warned when a route goes back and forth. "Can swap with" lists the areas an agent may put on the second night onwards.</p></div>
  <div class="g2"><div class="card"><h2>Driving distances <span class="sub">${Object.keys(k.km).length} pairs</span></h2>${ta('k_km', 'From | To | km', t.kmText, 300)}</div><div class="card"><h2>Vehicles by group size</h2>${ta('k_veh', 'Vehicle | up to guests | rate per km', t.vehiclesText, 140)}<p class="note">Agents get the first vehicle that fits their group.</p></div></div>
  <div class="card"><h2>Ready routes <span class="sub">${k.routes.length} routes</span></h2>${ta('k_routes', 'Title | style | stops (Area:nights, comma) | summary | photo link (optional)', t.routesText, 200)}</div>
  <div class="card"><h2>Hotels and activities</h2><p class="note" style="margin:0">Hotels come from your Sri Lanka hotel rates (the City column must match the area name, the star rating from the supplier). Activities come from Sri Lanka tour and activity rates with the same City. Mark hotels that give a free driver room on the supplier page.</p></div>
  <div class="row"><button class="btn p" data-act="saveKit">Save</button><a class="btn" ${go('portalset')}>Go to publishing</a></div>`;
} };

/* ---------- offers & itineraries: who sees them, dates, discount ---------- */
function audCard(r) {
  const aud = r.aud || 'all';
  return `<div class="card"><h2>Who sees it <span class="sub">and when</span></h2><div class="grid">${field('Audience', sel('aud', [['all', 'All agents'], ['country', 'Agents in certain countries'], ['group', 'Certain profit groups'], ['agents', 'Chosen agents only']], aud))}
  ${aud === 'country' ? field('Countries (comma)', inp('audCountries', r.audCountries, 'text', 'placeholder="Jordan, Saudi Arabia"')) : ''}${aud === 'group' ? field('Groups (comma)', inp('audGroups', r.audGroups, 'text', `placeholder="${tiers().map(t => t.id).join(', ')}"`)) : ''}
  ${field('Show from', inp('startDate', r.startDate, 'date'))}${field('Old price (shows the discount)', inp('oldPrice', r.oldPrice, 'number', 'step="any"'))}${field('Badge', inp('badge', r.badge, 'text', 'placeholder="Jordan National Day"'))}${field('Countdown to end date', sel('countdown', [['', 'No'], ['1', 'Yes']], r.countdown ? '1' : ''))}</div>
  ${aud === 'agents' ? `<div class="chips" style="margin-top:10px">${S.agents.filter(a => a.type !== 'Direct customer').map(a => `<button type="button" class="chip ${(r.audAgents || []).includes(a.id) ? 'on' : ''}" data-act="audAgent" data-id="${esc(a.id)}">${esc(a.name)}${a.country ? ' · ' + esc(a.country) : ''}</button>`).join('')}</div>` : ''}
  <p class="note">Prices are shown to each agent in their own currency. Agents see the offer only between the show-from date and the book-by date.</p></div>`;
}
for (const k of ['offer', 'itinerary']) { const base = EDIT[k]; if (!base) continue; EDIT[k] = r => { const h = base(r); const key = '<div class="row"><button class="btn p"'; const i = h.lastIndexOf(key); return i >= 0 ? h.slice(0, i) + audCard(r) + h.slice(i) : h + audCard(r); }; }

/* ---------- agent sign-ups ---------- */
V.registrations = { title: 'Agent sign-ups', render() {
  const r = (S.registrations || []).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return `<div class="pagehead"><div><h1>Agent sign-ups</h1><p class="lead">Agencies that registered from the portal. Approving creates the agent and their login, and emails them a set-password link.</p></div><button class="btn" data-act="copyReg">Copy registration link</button></div>
  <div class="card">${table(['Date', 'Agency', 'Contact', 'Country', 'Currency', 'Status', ''], r.map(x => `<tr><td class="note">${esc((x.createdAt || '').slice(0, 10))}</td><td><b>${esc(x.agency)}</b><div class="note">${esc(x.license || '')}</div></td><td>${esc(x.name)}<div class="note">${esc(x.email)} · ${esc(x.phone)}</div></td><td>${esc(x.country)}</td><td>${esc(x.currency)}</td><td>${tagFor(x.status || 'New request')}</td><td>${x.status === 'Approved' ? '' : `<div class="row"><select id="rt_${esc(x.id)}">${tiers().map(t => `<option value="${esc(t.id)}">${esc(t.id)} · ${esc(t.name)}</option>`).join('')}</select><button class="btn s p" data-act="approveReg" data-id="${esc(x.id)}">Approve</button><button class="btn s d" data-act="rejectReg" data-id="${esc(x.id)}">Reject</button></div>`}</td></tr>`), 'No sign-ups yet.')}</div>`;
} };

/* ---------- visa requests ---------- */
V.visareq = { title: 'Visa requests', render() {
  const r = (S.visaRequests || []).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return `<div class="pagehead"><div><h1>Visa requests</h1><p class="lead">Sent by agents from the portal with their documents.</p></div></div>
  <div class="card">${table(['Date', 'Agent', 'Country', 'Traveller', 'Travel', 'Files', 'Status'], r.map(x => `<tr><td class="note">${esc((x.createdAt || '').slice(0, 10))}</td><td>${esc(x.agentName)}<div class="note">${esc(x.byName)}</div></td><td>${esc(x.country)}</td><td>${esc(x.name)}<div class="note">${esc(x.nationality || '')}</div></td><td>${esc(x.travelDate || '')}</td><td><button class="btn s" data-act="visaFiles" data-id="${esc(x.id)}">${num(x.fileCount)} files</button></td><td><select data-act-change="visaStatus" data-id="${esc(x.id)}">${['New request', 'Under process', 'Approved', 'Rejected'].map(s => `<option ${s === (x.status || 'New request') ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`), 'No visa requests yet.')}</div>`;
} };

/* ---------- agent quotations from the portal ---------- */
V.aquotes = { title: 'Agent quotations', render() {
  const r = (S.agentQuotes || []).slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const an = id => (S.agents.find(a => a.id === id) || {}).name || '';
  return `<div class="pagehead"><div><h1>Agent quotations</h1><p class="lead">Packages agents built themselves in the portal. Follow up on the ones that were not sent to you yet.</p></div></div>
  <div class="card">${table(['Updated', 'Agent', 'Quote', 'Route', 'Guests', 'Total', 'Versions', 'Status', ''], r.map(q => `<tr><td class="note">${esc((q.updatedAt || '').slice(0, 16).replace('T', ' '))}</td><td>${esc(an(q.agentId))}<div class="note">${esc(q.byName || '')}</div></td><td><b>${esc(q.qname || q.title)}</b><div class="note">${esc(q.no || '')} · arrival ${esc(q.start || '…')}</div></td><td class="note">${esc(q.routeText || '')}</td><td>${num(q.pax)}</td><td class="num">${esc(fmt(q.total, q.currency))}</td><td>${(q.versions || []).length}</td><td>${tagFor(q.status || 'Draft')}</td><td><button class="btn s" data-act="followUp" data-id="${esc(q.id)}">Follow up</button></td></tr>`), 'No portal quotations yet.')}</div>`;
} };

/* ---------- contacts & email campaigns ---------- */
const contactList = () => (S.contacts || []).slice().sort((a, b) => (a.agency || '').localeCompare(b.agency || ''));
const regEmails = () => new Set(S.users.filter(u => u.role === 'agent').map(u => (u.email || '').toLowerCase()));
V.contacts = { title: 'Agent contacts', render() {
  const f = UI.cf = UI.cf || { country: '', lang: '', status: '' }; const reg = regEmails();
  const all = contactList(); const countries = [...new Set(all.map(c => c.country).filter(Boolean))].sort(), langs = [...new Set(all.map(c => c.lang).filter(Boolean))].sort();
  const r = all.filter(c => (!f.country || c.country === f.country) && (!f.lang || c.lang === f.lang) && (!f.status || (f.status === 'reg' ? reg.has((c.email || '').toLowerCase()) : f.status === 'notreg' ? !reg.has((c.email || '').toLowerCase()) : c.status === f.status)));
  return `<div class="pagehead"><div><h1>Agent contacts</h1><p class="lead">Everyone you email: agents with and without a portal login. Import from Excel with the columns Agency, Name, Email, Phone, Country, Language.</p></div><div class="row"><label class="btn">Import Excel / CSV<input type="file" accept=".xlsx,.xls,.csv" id="contactsIn" hidden></label><button class="btn" data-act="syncContacts">Add all portal agents</button><a class="btn p" ${go('campaigns')}>New email campaign</a></div></div>
  <div class="card"><div class="grid"><label>Country<select data-act-change="cfSet" data-id="country"><option value="">All</option>${countries.map(c => `<option ${c === f.country ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label>Language<select data-act-change="cfSet" data-id="lang"><option value="">All</option>${langs.map(c => `<option ${c === f.lang ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label>Status<select data-act-change="cfSet" data-id="status"><option value="">All</option><option value="reg" ${f.status === 'reg' ? 'selected' : ''}>Registered in portal</option><option value="notreg" ${f.status === 'notreg' ? 'selected' : ''}>Not registered yet</option><option value="Bounced" ${f.status === 'Bounced' ? 'selected' : ''}>Bounced</option><option value="Unsubscribed" ${f.status === 'Unsubscribed' ? 'selected' : ''}>Unsubscribed</option></select></label></div>
  <p class="note">${r.length} of ${all.length} contacts</p>${table(['Agency', 'Name', 'Email', 'Country', 'Language', 'Portal', 'Status', ''], r.slice(0, 500).map(c => `<tr><td><b>${esc(c.agency)}</b></td><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.country)}</td><td>${esc(c.lang)}</td><td>${reg.has((c.email || '').toLowerCase()) ? tagFor('Active') : '<span class="note">Not yet</span>'}</td><td>${c.status ? tagFor(c.status === 'Bounced' ? 'Cancelled' : c.status) + ' <span class="note">' + esc(c.status) + '</span>' : ''}</td><td><select data-act-change="contactStatus" data-id="${esc(c.id)}"><option value="">OK</option><option ${c.status === 'Bounced' ? 'selected' : ''}>Bounced</option><option ${c.status === 'Unsubscribed' ? 'selected' : ''}>Unsubscribed</option></select></td></tr>`), 'No contacts yet. Import your agent list.')}</div>`;
} };
const DEFAULT_CAMPAIGN = { subject: 'Our new agent portal is live', body: `Dear {name},\n\nWe are happy to invite {agency} to the new Le Ceylan agent portal.\n\nCheck our latest offers, build Sri Lanka packages with instant prices, search hotels and tours in Bali, Maldives, Thailand and Malaysia, and follow your bookings and invoices, all in one place.\n\nRegister here: {register}\n\nWe look forward to working with you.\n\nBest regards,\nLe Ceylan Destinations` };
V.campaigns = { title: 'Email campaigns', render() {
  const c = UI.camp = UI.camp || { ...DEFAULT_CAMPAIGN, to: 'notreg', country: '', lang: '' };
  const aud = campAudience(c); const past = (S.campaigns || []).slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const countries = [...new Set(contactList().map(x => x.country).filter(Boolean))].sort(), langs = [...new Set(contactList().map(x => x.lang).filter(Boolean))].sort();
  return `<div class="pagehead"><div><h1>Email campaigns</h1><p class="lead">Emails go one by one from your own Gmail, addressed to each agent by name, with an unsubscribe link. Bounced and unsubscribed contacts are skipped.</p></div></div>
  <div class="pcols"><div class="card"><h2>Write</h2><label>Subject<input id="cp_subj" value="${esc(c.subject)}"></label><label style="margin-top:10px">Message <span class="note">· {name} {agency} {register} {portal} are filled in for each agent</span><textarea id="cp_body" style="min-height:300px">${esc(c.body)}</textarea></label>
  <div class="grid" style="margin-top:10px"><label>Send to<select id="cp_to"><option value="notreg" ${c.to === 'notreg' ? 'selected' : ''}>Not registered yet</option><option value="reg" ${c.to === 'reg' ? 'selected' : ''}>Registered agents</option><option value="all" ${c.to === 'all' ? 'selected' : ''}>Everyone</option></select></label><label>Country<select id="cp_country"><option value="">All</option>${countries.map(x => `<option ${x === c.country ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label><label>Language<select id="cp_lang"><option value="">All</option>${langs.map(x => `<option ${x === c.lang ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label></div>
  <div class="row" style="margin-top:12px"><button class="btn" data-act="campPreview">Update count & preview</button><button class="btn" data-act="campTest">Send a test to me</button><span class="sp"></span><button class="btn p" data-act="campSend">Send to ${aud.length} contacts</button></div>
  ${UI.campProg ? `<p class="note">${esc(UI.campProg)}</p>` : ''}</div>
  <div class="card"><h2>Preview <span class="sub">${aud[0] ? 'for ' + esc(aud[0].email) : ''}</span></h2><div style="white-space:pre-line;font-size:14px">${esc(fill(c.body, aud[0] || { name: 'Ahmad', agency: 'Sample Travel' }))}</div></div></div>
  <div class="card"><h2>Sent campaigns</h2>${table(['Date', 'Subject', 'Sent', 'Failed', 'By'], past.map(p => `<tr><td class="note">${esc((p.createdAt || '').slice(0, 16).replace('T', ' '))}</td><td>${esc(p.subject)}</td><td>${num(p.sent)}</td><td>${num(p.failed)}</td><td>${esc(userName(p.by))}</td></tr>`), 'No campaigns yet.')}</div>`;
} };
const base = () => location.origin + location.pathname;
function fill(t, c) { return String(t || '').replace(/\{name\}/g, c.name || 'partner').replace(/\{agency\}/g, c.agency || 'your agency').replace(/\{register\}/g, base() + '#/register').replace(/\{portal\}/g, base()); }
function campAudience(c) { const reg = regEmails(); return contactList().filter(x => /.+@.+\..+/.test(x.email || '') && !x.status && (!c.country || x.country === c.country) && (!c.lang || x.lang === c.lang) && (c.to === 'all' || (c.to === 'reg' ? reg.has(x.email.toLowerCase()) : !reg.has(x.email.toLowerCase())))); }
const unsubLine = e => `\n\n—\nTo stop receiving these emails: ${base()}#/unsub?e=${encodeURIComponent(e)}`;

/* ---------- public pages: register and unsubscribe (no login) ---------- */
export function publicView(hash) {
  const box = inner => `<div class="login"><div class="login-l" style="max-width:560px"><img src="logo.png" alt="Le Ceylan Destinations" class="lclogo">${inner}</div><div class="login-r"><h2>Every trip. <span>Every detail.</span></h2></div></div>`;
  if (hash.startsWith('#/unsub')) { const e = decodeURIComponent((hash.split('e=')[1] || '').split('&')[0]); return box(`<h1>Unsubscribe</h1><p class="lead">Stop campaign emails to <b>${esc(e)}</b>?</p><button class="btn p" data-act="doUnsub" data-id="${esc(e)}">Unsubscribe</button><p class="note" id="unsubMsg"></p>`); }
  return box(`<form id="regForm" onsubmit="return false"><h1>Register your agency</h1><p class="lead">Fill in your details. We review and send your login by email.</p>
  <label>Agency name<input name="agency" required maxlength="120"></label><label>Your name<input name="name" required maxlength="80"></label><label>Email<input name="email" type="email" required maxlength="120"></label><label>Phone / WhatsApp<input name="phone" required maxlength="40"></label>
  <label>Country<input name="country" required maxlength="60"></label><label>Billing currency<select name="currency">${['USD', 'AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EUR'].map(c => `<option>${c}</option>`).join('')}</select></label><label>Trade license / IATA no. (optional)<input name="license" maxlength="60"></label>
  <div class="err" id="regErr"></div><button class="btn p big" type="button" data-act="doRegister">Send registration →</button><a class="link" href="#/">Already registered? Sign in</a></form>`);
}

/* ---------- actions ---------- */
export const STUDIO_A = {
  async saveKit(_, btn) {
    const v = id => $('#' + id)?.value ?? '';
    const t = { currency: v('k_cur').trim() || 'USD', markupPP: num(v('k_pp')), guideDay: num(v('k_gday')), guideRoom: num(v('k_groom')), driverRoom: num(v('k_droom')), guideMin: num(v('k_gmin')) || 10, minKm: num(v('k_min')) || 100, warnKm: num(v('k_warn')) || 180, startArea: v('k_start').trim() || 'Airport', endArea: v('k_start').trim() || 'Airport', guideLangs: v('k_langs'), areasText: v('k_areas'), kmText: v('k_km'), vehiclesText: v('k_veh'), routesText: v('k_routes'), updatedAt: new Date().toISOString() };
    btn.disabled = true; try { await setDoc(doc(db, 'settings', 'srilanka'), t); UI.kit = t; toast('Saved. Publish portal prices to update agents.'); } catch (e) { toast('Could not save: ' + (e.code || '')); } btn.disabled = false; redraw(); },
  audAgent(id) { const r = UI.edit?.rec; if (!r) return; const a = new Set(r.audAgents || []); a.has(id) ? a.delete(id) : a.add(id); r.audAgents = [...a]; UI.edit.dirty = true; redraw(); },
  async doRegister(_, btn) {
    const f = $('#regForm'); const d = Object.fromEntries(new FormData(f)); const err = $('#regErr');
    for (const k of ['agency', 'name', 'email', 'phone', 'country']) if (!String(d[k] || '').trim()) { err.textContent = 'Please fill in all fields.'; return; }
    if (!/.+@.+\..+/.test(d.email)) { err.textContent = 'Check the email address.'; return; }
    btn.disabled = true; try { await setDoc(doc(collection(db, 'registrations')), { agency: d.agency.trim(), name: d.name.trim(), email: d.email.trim().toLowerCase(), phone: d.phone.trim(), country: d.country.trim(), currency: d.currency, license: (d.license || '').trim(), status: 'New request', createdAt: new Date().toISOString() });
      f.innerHTML = '<h1>Thank you!</h1><p class="lead">We received your registration and will email your login shortly.</p>'; } catch (e) { err.textContent = 'Could not send. Please try again.'; btn.disabled = false; } },
  async doUnsub(e, btn) { btn.disabled = true; try { await setDoc(doc(db, 'unsubs', e.toLowerCase().replace(/[^a-z0-9@._-]/g, '_')), { email: e.toLowerCase(), at: new Date().toISOString() }); $('#unsubMsg').textContent = 'Done. You will not receive campaign emails anymore.'; } catch (x) { $('#unsubMsg').textContent = 'Could not save. Please reply to our email instead.'; btn.disabled = false; } },
  copyReg() { const u = base() + '#/register'; navigator.clipboard?.writeText(u).then(() => toast('Copied: ' + u), () => toast(u)); },
  async approveReg(id, btn) {
    const r = (S.registrations || []).find(x => x.id === id); if (!r) return; if (!confirmBtn(btn, 'Click again to approve')) return; btn.disabled = true;
    try {
      const tier = $('#rt_' + id)?.value || 'A';
      let ag = S.agents.find(a => (a.email || '').toLowerCase() === r.email);
      const aid = ag?.id || await save('agents', { name: r.agency, contact: r.name, email: r.email, phone: r.phone, country: r.country, currency: r.currency || 'USD', type: 'Travel Agent', tier, license: r.license || '', company: S.settings?.companies?.[0]?.id || '' }, { silent: true });
      const pw = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%'[b % 57]).join('');
      let uid = null; try { uid = await createLogin(r.email, pw); } catch (x) { if (x.code !== 'auth/email-already-in-use') throw x; }
      if (uid) await setDoc(doc(db, 'users', uid), { email: r.email, name: r.name, role: 'agent', agentId: aid, tier, active: true, createdAt: new Date().toISOString(), createdBy: S.user.uid });
      await sendPasswordResetEmail(auth, r.email);
      await updateDoc(doc(db, 'registrations', id), { status: 'Approved', agentId: aid, approvedBy: S.user.uid, approvedAt: new Date().toISOString() });
      toast(uid ? 'Approved. Login created and set-password email sent.' : 'Approved. This email already had a login; a reset email was sent.');
    } catch (e) { toast('Could not approve: ' + (e.code || e.message)); btn.disabled = false; }
  },
  async rejectReg(id, btn) { if (!confirmBtn(btn, 'Click again to reject')) return; try { await updateDoc(doc(db, 'registrations', id), { status: 'Rejected' }); } catch (e) { toast('Could not update'); } },
  async visaFiles(id) { const x = (S.visaRequests || []).find(v => v.id === id); if (!x) return; const out = []; for (let i = 0; i < num(x.fileCount); i++) { try { const s = await getDoc(doc(db, 'visaRequests', id, 'files', String(i))); if (s.exists()) out.push(s.data()); } catch (e) { } }
    UI.vfiles = out; openModal(`${x.name} · ${x.country} visa`, out.map((f, i) => `<div class="row" style="margin-bottom:8px"><b>${esc(f.doc)}</b><span class="note">${esc(f.name)}</span><span class="sp"></span><button class="btn s" data-act="visaDl" data-id="${i}">Download</button></div>${/^data:image/.test(f.data) ? `<img src="${esc(f.data)}" style="max-width:100%;border-radius:8px;margin-bottom:12px">` : ''}`).join('') || '<p class="note">No files.</p>'); },
  visaDl(i) { const f = UI.vfiles?.[+i]; if (!f) return; const a = document.createElement('a'); a.href = f.data; a.download = f.name || 'file'; a.click(); },
  async visaStatus(id, el) { try { await updateDoc(doc(db, 'visaRequests', id), { status: el.value }); toast('Updated'); } catch (e) { toast('Could not update'); } },
  async followUp(id) { const q = (S.agentQuotes || []).find(x => x.id === id); if (!q) return; const an = (S.agents.find(a => a.id === q.agentId) || {}).name || 'agent'; const due = new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10);
    await save('tasks', { title: `Follow up ${an}: ${q.qname || q.title}`, notes: `Portal quotation ${q.no || ''} · ${q.routeText || ''} · ${q.pax} guests · ${fmt(q.total, q.currency)}. Contact ${q.byName || ''}.`, assignee: S.user.uid, due, ref: q.id, refType: 'agentQuote', refLabel: q.no || '', status: 'Open', by: S.user.uid }, { silent: true }); toast('Follow-up task added for ' + due); },
  async contactStatus(id, el) { try { await updateDoc(doc(db, 'contacts', id), { status: el.value }); } catch (e) { toast('Could not update'); } },
  cfSet(k, el) { UI.cf[k] = el.value; redraw(); },
  async syncContacts(_, btn) { btn.disabled = true; const have = new Set(contactList().map(c => (c.email || '').toLowerCase())); let n = 0;
    for (const a of S.agents.filter(a => a.type !== 'Direct customer' && /.+@.+\..+/.test(a.email || ''))) { if (have.has(a.email.toLowerCase())) continue; await save('contacts', { agency: a.name, name: a.contact || '', email: a.email.toLowerCase(), phone: a.phone || '', country: a.country || '', lang: a.lang || '', agentId: a.id }, { silent: true }); have.add(a.email.toLowerCase()); n++; }
    toast(n + ' agents added to contacts'); btn.disabled = false; },
  campPreview() { const c = UI.camp; Object.assign(c, { subject: $('#cp_subj').value, body: $('#cp_body').value, to: $('#cp_to').value, country: $('#cp_country').value, lang: $('#cp_lang').value }); redraw(); },
  async campTest(_, btn) { STUDIO_A.campPreview(); const c = UI.camp; btn.disabled = true; try { await gmailSend({ to: S.me.email, subject: '[Test] ' + c.subject, text: fill(c.body, { name: S.me.name, agency: 'Test Agency' }) + unsubLine(S.me.email) }); toast('Test sent to ' + S.me.email); } catch (e) { toast(e.message); } btn.disabled = false; },
  async campSend(_, btn) {
    STUDIO_A.campPreview(); const c = UI.camp; const aud = campAudience(c); if (!aud.length) { toast('No contacts match'); return; }
    if (!confirmBtn(btn, `Click again to email ${aud.length} contacts`)) return; btn.disabled = true;
    let unsubs = new Set(); try { const { getDocs } = await import('./fb.js'); const s = await getDocs(collection(db, 'unsubs')); s.docs.forEach(d => unsubs.add((d.data().email || '').toLowerCase())); } catch (e) { }
    let sent = 0, failed = 0; const log = [];
    for (const x of aud) { if (unsubs.has(x.email.toLowerCase())) continue;
      try { await gmailSend({ to: x.email, subject: fill(c.subject, x), text: fill(c.body, x) + unsubLine(x.email) }); sent++; log.push(x.email); } catch (e) { failed++; if (/quota|limit|rate/i.test(e.message)) { toast('Gmail daily limit reached. Sent ' + sent + '. Send the rest tomorrow.'); break; } }
      UI.campProg = `Sending… ${sent} sent, ${failed} failed of ${aud.length}`; const p = document.querySelector('.pcols .card p.note:last-child'); if (p) p.textContent = UI.campProg;
      await new Promise(r => setTimeout(r, 1200)); }
    await save('campaigns', { subject: c.subject, body: c.body, to: c.to, country: c.country, lang: c.lang, sent, failed, recipients: log.slice(0, 2000), by: S.user.uid }, { silent: true });
    UI.campProg = `Done: ${sent} sent, ${failed} failed.`; btn.disabled = false; redraw(); },
};

/* contacts import uses the same Excel reader as the rest of the app */
export async function importContacts(file) {
  const XLSX = await import('xlsx'); const wb = XLSX.read(await file.arrayBuffer(), { raw: /\.csv$/i.test(file.name) });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const pick = (r, ...ks) => { for (const k of Object.keys(r)) if (ks.some(x => k.toLowerCase().replace(/[^a-z]/g, '').includes(x))) return String(r[k]).trim(); return ''; };
  const have = new Set(contactList().map(c => (c.email || '').toLowerCase())); let n = 0, skip = 0;
  for (const r of rows) { const email = pick(r, 'email', 'mail').toLowerCase(); if (!/.+@.+\..+/.test(email) || have.has(email)) { skip++; continue; }
    await save('contacts', { agency: pick(r, 'agency', 'company'), name: pick(r, 'name', 'contact'), email, phone: pick(r, 'phone', 'mobile', 'whatsapp'), country: pick(r, 'country'), lang: pick(r, 'language', 'lang'), status: /bounce/i.test(pick(r, 'status')) ? 'Bounced' : /unsub/i.test(pick(r, 'status')) ? 'Unsubscribed' : '' }, { silent: true }); have.add(email); n++; }
  toast(`${n} contacts imported${skip ? `, ${skip} skipped (no email or already there)` : ''}`);
}

/* ---------- itineraries in several languages ---------- */
export const LANGS = ['Arabic', 'French', 'German', 'Russian', 'Japanese', 'Chinese', 'Spanish', 'Italian'];
export const RTL = ['Arabic'];
// days are written as blocks separated by a blank line: first line is the title, the rest is the description
export const parseDays = t => String(t || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).map(b => { const [title, ...rest] = b.split('\n'); return { title: title.trim(), description: rest.join('\n').trim() }; });
const daysText = r => (r.program || []).map(d => `${d.title || ''}\n${d.description || ''}`.trim()).join('\n\n');
{ const base = EDIT.itinerary; if (base) EDIT.itinerary = r => { const h = base(r); const L = UI.trLang || 'Arabic'; const tr = (r.tr || {})[L] || {}; const rtl = RTL.includes(L) ? ' dir="rtl"' : '';
  const card = `<div class="card"><h2>Translations <span class="sub">agents pick the language on the itinerary page and in the PDF</span></h2><div class="chips">${LANGS.map(l => `<button type="button" class="chip ${l === L ? 'on' : ''}" data-act="trLang" data-id="${l}">${l}${(r.tr || {})[l]?.title ? ' ✓' : ''}</button>`).join('')}</div>
  <div class="grid"><label>Title in ${L}<input${rtl} data-act-change="trSet" data-id="title" value="${esc(tr.title || '')}"></label></div><label style="margin-top:8px">Summary in ${L}<textarea${rtl} data-act-change="trSet" data-id="summary">${esc(tr.summary || '')}</textarea></label>
  <label style="margin-top:8px">Day by day in ${L} <span class="note">· one block per day, title on the first line, a blank line between days</span><textarea${rtl} style="min-height:220px" data-act-change="trSet" data-id="days" placeholder="${esc(daysText(r).slice(0, 300))}">${esc(tr.days || '')}</textarea></label></div>`;
  const key = '<div class="row"><button class="btn p"'; const i = h.lastIndexOf(key); return i >= 0 ? h.slice(0, i) + card + h.slice(i) : h + card; }; }
Object.assign(STUDIO_A, {
  trLang(id) { UI.trLang = id; redraw(); },
  trSet(k, el) { const r = UI.edit?.rec; if (!r) return; const L = UI.trLang || 'Arabic'; r.tr = r.tr || {}; r.tr[L] = { ...(r.tr[L] || {}), [k]: el.value }; UI.edit.dirty = true; },
});

/* ---------- public website (leceylan.ae): hero with login, destinations, offers, about, contact ---------- */
const W_DEFAULT = { headline: 'Your destination partner in Asia', hero: 'img/hero.jpg', sub: 'B2B destination management for travel agents across the GCC and MENA: Sri Lanka, Bali, Maldives, Thailand and Malaysia.', about: 'Le Ceylan is a destination management company serving travel agents and corporate clients across the GCC and MENA. Our own teams in Sri Lanka, Bali and the UAE handle every detail on the ground, from hotels and private transfers to guided tours and groups.', why: 'Own teams on the ground\nFast quotations and instant online prices\nArabic-speaking support\nTrusted by agents across the GCC', dests: 'Sri Lanka | img/srilanka.jpg | Culture, tea country and beaches\nBali | img/bali.jpg | Villas, temples and island life\nMaldives | | Overwater villas and private islands\nThailand | | Bangkok, Phuket and Krabi\nMalaysia | | Kuala Lumpur, Langkawi and Penang', phone: '+971 58 593 9503', email: 'Reservation@leceylan.me', whatsapp: '+971585939503', address: 'Dubai, United Arab Emirates', showPrices: '' };
const wcfg = () => ({ ...W_DEFAULT, ...(cfg().website || {}) });
V.website = { title: 'Website', render() {
  const w = wcfg(); const f = (id, l, v, ph = '') => `<label>${l}<input id="${id}" value="${esc(v || '')}" placeholder="${esc(ph)}"></label>`; const ta = (id, l, v, h = 90) => `<label>${l}<textarea id="${id}" style="min-height:${h}px">${esc(v || '')}</textarea></label>`;
  const offers = (S.offers || []).filter(o => o.published !== false && (o.aud || 'all') === 'all' && (!o.validTo || o.validTo >= today()));
  return `<div class="pagehead"><div><h1>Website</h1><p class="lead">The public home page people see before they sign in (leceylan.ae): login boxes, destinations, offers, about us and contact.</p></div><div class="row"><button class="btn" data-act="saveSite">Save</button><button class="btn p" data-act="publishSite">Publish website</button></div></div>
  <div class="card"><h2>Top of the page</h2><div class="grid">${f('w_head', 'Headline', w.headline)}${f('w_sub', 'Line under it', w.sub)}${f('w_hero', 'Background photo link (https)', w.hero, 'https://…')}</div></div>
  <div class="g2"><div class="card"><h2>About us</h2>${ta('w_about', 'About text', w.about, 120)}${ta('w_why', 'Why us (one per line)', w.why)}</div>
  <div class="card"><h2>Contact</h2><div class="grid">${f('w_phone', 'Phone', w.phone)}${f('w_email', 'Email', w.email)}${f('w_wa', 'WhatsApp', w.whatsapp)}${f('w_addr', 'Address', w.address)}</div></div></div>
  <div class="card"><h2>Destinations <span class="sub">Name | photo link | short text</span></h2>${ta('w_dests', '', w.dests, 120)}</div>
  <div class="card"><h2>Offers on the website <span class="sub">${offers.length} offers open to all agents · the 6 newest are shown</span></h2><label>Show prices to the public<select id="w_prices"><option value="">No, "ask for price"</option><option value="1" ${w.showPrices ? 'selected' : ''}>Yes</option></select></label></div>
  <p class="note">${cfg().websitePublished ? 'Last published ' + esc(cfg().websitePublished.slice(0, 16).replace('T', ' ')) : 'Not published yet'}. To use www.leceylan.ae, the domain has to point to this site: I can set it up when you give me access to where the domain is registered.</p>`;
} };
const readSite = () => { const v = id => ($('#' + id)?.value ?? '').trim(); return { headline: v('w_head'), sub: v('w_sub'), hero: v('w_hero'), about: v('w_about'), why: v('w_why'), dests: v('w_dests'), phone: v('w_phone'), email: v('w_email'), whatsapp: v('w_wa'), address: v('w_addr'), showPrices: v('w_prices') }; };
async function thumb(p, max = 520) {
  let src = p; if (!src) return ''; if (/^https:\/\//.test(src)) return src;
  try { const s = await getDoc(doc(db, 'photos', p)); src = s.exists() ? s.data().data : ''; } catch (e) { return ''; } if (!src) return '';
  return await new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .7)); }; im.onerror = () => res(''); im.src = src; });
}
Object.assign(STUDIO_A, {
  async saveSite() { try { await setDoc(doc(db, 'settings', 'main'), { website: readSite() }, { merge: true }); toast('Saved. Press Publish website to put it live.'); } catch (e) { toast('Could not save: ' + (e.code || '')); } },
  async publishSite(_, btn) {
    const w = { ...wcfg(), ...readSite() }; btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      const offers = (S.offers || []).filter(o => o.published !== false && (o.aud || 'all') === 'all' && (!o.validTo || o.validTo >= today())).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6);
      const out = []; for (const o of offers) out.push({ title: o.title || '', destination: o.destination || '', nights: num(o.nights) || '', badge: o.badge || '', validTo: o.validTo || '', price: w.showPrices && num(o.priceFrom) ? fmt(o.priceFrom, o.currency) : '', photo: await thumb((o.photos || [])[0] || ((o.program || [])[0]?.photos || [])[0]) });
      const dests = lines(w.dests).map(l => { const [name, photo, text] = cells(l); return { name, photo: /^(https:\/\/|img\/)/.test(photo || '') ? photo : '', text: text || '' }; });
      const p = cfg().portal || {};
      await setDoc(doc(db, 'settings', 'public'), { ...w, why: lines(w.why), dests, offers: out, social: { instagram: p.instagram || '', facebook: p.facebook || '', linkedin: p.linkedin || '', tiktok: p.tiktok || '' }, updatedAt: new Date().toISOString() });
      await setDoc(doc(db, 'settings', 'main'), { website: readSite(), websitePublished: new Date().toISOString() }, { merge: true });
      toast('Website published');
    } catch (e) { toast('Could not publish: ' + (e.code || e.message)); }
    btn.disabled = false; btn.textContent = 'Publish website';
  },
  siteGo(id) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); },
  siteTab(id) { document.querySelectorAll('.lgtab').forEach(b => b.classList.toggle('on', b.dataset.id === id)); const h = $('#lgWho'); if (h) h.textContent = id === 'team' ? 'Le Ceylan CRM' : 'Agents Log in'; },
});
export async function publicHome() {
  let w = null; try { const s = await getDoc(doc(db, 'settings', 'public')); w = s.exists() ? s.data() : null; } catch (e) { }
  w = { ...W_DEFAULT, why: W_DEFAULT.why.split('\n'), dests: lines(W_DEFAULT.dests).map(l => { const [name, photo, text] = cells(l); return { name, photo, text }; }), offers: [], ...(w || {}) };
  if (!w.hero) w.hero = W_DEFAULT.hero;
  const wa = String(w.whatsapp || '').replace(/[^\d]/g, '');
  const img = (p, alt) => p ? `<img src="${esc(p)}" alt="${esc(alt)}" loading="lazy">` : '';
  return `<div class="site"><header class="s-hdr"><img src="logo.png" alt="Le Ceylan Destinations" class="lclogo"><nav>${[['s-dest', 'Destinations'], ['s-offers', 'Offers'], ['s-about', 'About us'], ['s-contact', 'Contact']].map(([i, l]) => `<button class="link" data-act="siteGo" data-id="${i}">${l}</button>`).join('')}</nav><button class="btn p s" data-act="siteGo" data-id="s-login">Sign in</button></header>
  <section class="s-hero"${w.hero ? ` style="background-image:linear-gradient(90deg,rgba(29,43,56,.78),rgba(29,43,56,.25)),url('${esc(w.hero)}')"` : ''}><div class="s-hero-in"><div class="s-copy"><h1>${esc(w.headline)}</h1><p>${esc(w.sub)}</p><div class="row" style="gap:10px;flex-wrap:wrap"><a class="btn big" href="#/register">Register your agency</a>${wa ? `<a class="btn big ghost" href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp us</a>` : ''}</div></div>
  <div class="s-login" id="s-login"><div class="lgtabs"><button class="lgtab on" data-act="siteTab" data-id="agent">Agents Log in</button><button class="lgtab" data-act="siteTab" data-id="team">Le Ceylan CRM</button></div><form id="loginForm"><h2 id="lgWho">Agents Log in</h2><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><div class="err" id="loginErr"></div><button class="btn p big" type="submit" style="width:100%">Sign in</button><div class="row" style="justify-content:space-between;margin-top:8px"><button class="link" type="button" data-act="forgot">Forgot password?</button><a class="link" href="#/register">New agency? Register</a></div></form></div></div></section>
  <div class="s-trust">${[['5', 'destinations across Asia'], ['Own teams', 'on the ground in Sri Lanka & Bali'], ['24/7', 'support while your guests travel'], ['عربي', 'Arabic-speaking team']].map(([b, t]) => `<div><b>${b}</b><span>${t}</span></div>`).join('')}</div>
  <section class="s-sec s-bento-sec"><p class="s-kick">Why agents book with us</p><h2>Everything you need to sell Asia</h2><div class="s-bento">
    <div class="bt b-big b-deep"><b>Contracted hotels</b><p>Our own rates in Sri Lanka, Bali, Maldives, Thailand and Malaysia, with your profit already built in.</p><div class="bt-mock"><div><span>★★★★★</span><b>Beach resort · Galle</b><em>✓ Free cancellation</em></div><strong>Dh 1,240</strong></div></div>
    <div class="bt b-photo" style="background-image:url('img/srilanka.jpg')"><b>Sri Lanka packages in minutes</b><p>Pick a route, choose hotels and tours, and see the price instantly.</p></div>
    <div class="bt b-light"><b>Prices in your currency</b><p>Dirham, Riyal, Dollar and more, on every page and PDF.</p><div class="bt-cur">Dh · SAR · KWD · USD · EUR</div></div>
    <div class="bt b-white"><b>Your brand on every PDF</b><p>Itineraries and quotes with your logo and your own markup, or with ours.</p></div>
    <div class="bt b-light"><b>Arabic-speaking team</b><p>Support before and during the trip, 7 days a week.</p><div class="bt-cur">عربي · English · සිංහල · Bahasa</div></div>
    <div class="bt b-deep b-wide"><b>Offers & live deals</b><p>Seasonal offers for your market with countdowns, ready to share with clients.</p></div>
    <div class="bt b-photo b-wide" style="background-image:url('img/team.jpg')"><b>Our own team on the ground</b><p>Meet & greet, drivers and guides we know personally.</p></div>
  </div></section>
  <section class="s-sec alt"><div class="s-feat"><div><p class="s-kick">For travel agents</p><h2 style="text-align:left">Built for the way you work</h2></div><div class="s-feat-g">${[['Better margins', 'Net rates for your profit group, with your markup on top. You decide what your client pays.'], ['Credit & wallet', 'Pay by bank transfer, top up a deposit, or book on credit once approved.'], ['Fast quotations', 'Packages, hotels and tours priced instantly, with versions saved for every quote.'], ['Confidence in every booking', 'We reconfirm every service and send vouchers, invoices and statements to your portal.']].map(([t, d]) => `<div><b>${t}</b><hr><p>${d}</p></div>`).join('')}</div></div></section>
  <section class="s-sec" id="s-dest"><p class="s-kick">Where we operate</p><h2>Destinations</h2><div class="s-grid">${(w.dests || []).map(d => `<div class="s-card">${d.photo ? img(d.photo, d.name) : `<div class="s-ph-empty">${esc(d.name)}</div>`}<div class="s-cb"><b>${esc(d.name)}</b><p>${esc(d.text || '')}</p></div></div>`).join('')}</div></section>
  ${(w.offers || []).length ? `<section class="s-sec alt" id="s-offers"><h2>Current offers</h2><div class="s-grid">${w.offers.map(o => `<div class="s-card">${o.photo ? img(o.photo, o.title) : `<div class="s-ph-empty">${esc(o.destination)}</div>`}<div class="s-cb">${o.badge ? `<span class="tag bad">${esc(o.badge)}</span>` : ''}<b>${esc(o.title)}</b><p>${esc([o.destination, o.nights ? o.nights + ' nights' : ''].filter(Boolean).join(' · '))}</p><p class="s-pr">${o.price ? 'From ' + esc(o.price) : 'Sign in for agent prices'}</p></div></div>`).join('')}</div></section>` : '<div id="s-offers"></div>'}
  <section class="s-sec"><p class="s-kick">For travel agents</p><h2>How it works</h2><div class="s-steps">${[['1', 'Register your agency', 'Sign up in two minutes. We approve you and send your login.'], ['2', 'Pick or build a trip', 'Ready packages and offers, or build your own Sri Lanka route with instant prices.'], ['3', 'Confirm & travel', 'We confirm hotels and services and send vouchers and invoices in your portal.']].map(([n, t, d]) => `<div class="s-step"><i>${n}</i><b>${t}</b><p>${d}</p></div>`).join('')}</div><div style="text-align:center;margin-top:26px"><a class="btn p big" href="#/register">Register your agency</a></div></section>
  <section class="s-sec alt"><div class="s-mg"><div class="s-mg-ph"><img src="img/team.jpg" alt="Le Ceylan team welcoming guests at the airport" loading="lazy"></div><div><p class="s-kick">On the ground</p><h2 style="text-align:left">Meet & greet by our own team</h2><p class="s-lead">Every guest is welcomed at the airport by Le Ceylan staff with fresh orchid garlands, and looked after by our local team until they fly home.</p><img src="img/welcome.jpg" alt="A group of guests welcomed in Sri Lanka" class="s-mg-2" loading="lazy"></div></div></section>
  <section class="s-sec" id="s-about"><div class="s-about"><div><h2>About us</h2><p>${esc(w.about)}</p></div><ul class="s-why">${(w.why || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></section>
  <section class="s-sec alt" id="s-contact"><h2>Contact us</h2><div class="s-contact">${w.phone ? `<div><span>Phone</span><b>${esc(w.phone)}</b></div>` : ''}${w.email ? `<div><span>Email</span><a href="mailto:${esc(w.email)}">${esc(w.email)}</a></div>` : ''}${wa ? `<div><span>WhatsApp</span><a href="https://wa.me/${wa}" target="_blank" rel="noopener">${esc(w.whatsapp)}</a></div>` : ''}${w.address ? `<div><span>Office</span><b>${esc(w.address)}</b></div>` : ''}</div></section>
  <section class="s-cta"><h2>Become a Le Ceylan partner agent</h2><p>Get our net rates, ready packages and offers, and book online.</p><a class="btn big" href="#/register">Register now</a></section>
  <footer class="s-foot">© ${new Date().getFullYear()} Le Ceylan Destinations · ${['instagram', 'facebook', 'linkedin', 'tiktok'].filter(k => /^https:\/\//.test(w.social?.[k] || '')).map(k => `<a href="${esc(w.social[k])}" target="_blank" rel="noopener">${k[0].toUpperCase() + k.slice(1)}</a>`).join(' · ')}</footer></div>`;
}
