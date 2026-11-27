import { auth, db, doc, getDoc, setDoc, writeBatch, collection, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createLogin } from './fb.js';
import { uploadPhotos, hydratePhotos, programText } from './core.js';
import { S, UI, $, esc, num, fmt, today, addDays, toast, clone, cfg, coById, agentName, supName, isStaff, isAdmin, curCo, totals, flatLines, save, remove, nextNo, savePortalCopy, startData, stopAll,
  openModal, closeModal, confirmBtn, download, csv, LINE_TYPES, DEST, CURS, tagFor } from './core.js';
import { V, EDIT, ratePicker, calcText, crumbs, DEFAULT_TERMS, DEFAULT_INC, DEFAULT_EXC } from './staff.js';
import { RATE_COLS, RATE_PAGES, accessFields, ROLE_PRESETS, SHEET_COLS, dayPicker } from './admin.js';
import { P } from './portal.js';
import { MORE_A, setRender, syncTiers, pendingCount, portalFooter } from './more.js';
import { AGENT_A, loadProfile } from './agentx.js';
import { RH_A } from './rh.js';
import { STUDIO_A, publicView, importContacts, publicHome } from './studio.js';
const HOST = location.hostname; const ON_CRM = /^crm\./.test(HOST); const ON_OWN = /leceylan\.ae$/.test(HOST);
const CRM_LIVE = true; // switch on once crm.leceylan.ae is served
const CRM_URL = 'https://crm.leceylan.ae/', AGENT_URL = 'https://www.leceylan.ae/';
async function publicOrLogin(msg) { if (ON_CRM) { loginView(msg); return; } if (msg) { loginView(msg); return; } root.innerHTML = '<div class="boot">Loading…</div>'; try { root.innerHTML = await publicHome(); } catch (e) { loginView(); } }
const DEMO_AGENT = { id: '_demo', name: 'Demo agency (sample)', country: 'United Arab Emirates', currency: 'AED', tier: 'A', creditLimit: 50000, wallet: 5000 };
Object.assign(MORE_A, AGENT_A, STUDIO_A, RH_A, {
  previewAgent() { const list = [...S.agents.filter(a => a.type !== 'Direct customer'), DEMO_AGENT];
    openModal('View the agent portal', `<p class="note">See the portal exactly as one of your agents sees it: their offers, prices in their currency and their profit group.</p><label>Agent<select id="pvAgent">${list.map(a => `<option value="${esc(a.id)}">${esc(a.name)}${a.country ? ' · ' + esc(a.country) : ''}${a.currency ? ' · ' + esc(a.currency) : ''}</option>`).join('')}</select></label><div class="row" style="margin-top:12px"><button class="btn p" data-act="startPreview">Open portal</button></div>`); },
  startPreview() { const aid = $('#pvAgent').value; const a = aid === DEMO_AGENT.id ? DEMO_AGENT : S.agents.find(x => x.id === aid); if (!a) return; closeModal(); stopChat(); S.realMe = S.me; S.me = { ...S.me, role: 'agent', agentId: aid, tier: a.tier || 'A', _preview: true }; S.myAgent = { ...a }; UI.prof = null; UI.sl = null; shell(); startData(onData); location.hash = '#/home'; route(); },
  exitPreview() { if (!S.realMe) return; S.me = S.realMe; S.realMe = null; S.myAgent = null; UI.prof = null; shell(); startData(onData); startChat(onChat); location.hash = '#/dashboard'; route(); },
});
import { ROLES, roleName } from './core.js';
import { buildDoc, statement, showDoc, printDoc } from './docs.js';
import { myEmployee, leaveDays } from './hr.js';
import { startChat, stopChat, chatView, openThread, closeThread, send, newChannel, newDM, unreadCount, chatState, drawMessages, uploadFile, downloadFile } from './chat.js';
import { taskForm, myOpenTasks } from './tasks.js';

const root = $('#root');
const ICON = {
  dashboard: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', quotes: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5', bookings: 'M4 6h16v14H4zM8 3v6M16 3v6M4 11h16', agents: 'M8 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 6-6s6 2 6 6M17 11a3 3 0 100-6M22 21c0-3-2-5-4-5.5',
  requests: 'M4 4h16v12H7l-3 3z', hotelRates: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6', transportRates: 'M5 17h14M6 17V9l2-4h8l2 4v8M7 21v-2M17 21v-2', suppliers: 'M3 7h18v13H3zM8 7V4h8v3', activityRates: 'M12 3l2.5 6H21l-5 4 2 7-6-4-6 4 2-7-5-4h6.5z', guideRates: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  finance: 'M3 7.5A2.5 2.5 0 015.5 5H18v3M3 7.5V18a2 2 0 002 2h14a1 1 0 001-1v-3M3 7.5A2.5 2.5 0 005.5 10H20v3M20 13h-4a1.5 1.5 0 000 3h4z', itineraries: 'M5 19c3-10 11-4 14-14', offers: 'M3 12l9-9 9 9-9 9z', users: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6', settings: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  home: 'M3 12l9-8 9 8M5 10v10h14V10', account: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
};
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k] || ICON.dashboard}"/></svg>`;
// modules across the top; each has its own side menu (RezLive-style layout, VoyEngine features)
const MODS_STAFF = [
  { k: 'dashboard', label: 'Dashboard', icon: 'dashboard', items: [['dashboard', 'Dashboard'], ['requests', 'Portal requests']] },
  { k: 'sales', label: 'Sales', icon: 'quotes', items: [['quotes', 'Quotations'], ['quote/new', 'New quotation'], ['agents', 'Travel Agents & Customers'], ['requests', 'Portal requests'], ['aquotes', 'Agent quotations'], ['visareq', 'Visa requests'], ['registrations', 'Agent sign-ups']] },
  { k: 'operations', label: 'Operations', icon: 'bookings', items: [['bookings', 'Bookings'], ['arrivals', 'Arrivals & departures']] },
  { k: 'rates', label: 'Rates & supply', icon: 'hotelRates', items: [['hotelRates', 'Hotels & Rates'], ['transportRates', 'Transport & Tours'], ['activityRates', 'Activities'], ['guideRates', 'Guides'], ['suppliers', 'Suppliers'], ['dayplans', 'Day plans'], ['itineraries', 'Itineraries'], ['offers', 'Portal Offers'], ['slkit', 'Sri Lanka builder'], ['approvals', 'Waiting approval']] },
  { k: 'finance', label: 'Finance', icon: 'finance', items: [['finance/recv', 'Invoices'], ['finance/stmt', 'Statements'], ['finance/pay', 'Supplier bills'], ['finance/pl', 'P&L & reports'], ['finance/qb', 'QuickBooks']] },
  { k: 'hr', label: 'HR', icon: 'users', items: [['employees', 'Employees'], ['leave', 'Leave'], ['attendance', 'Attendance'], ['expiries', 'Expiry alerts']] },
  { k: 'chat', label: 'Chat & tasks', icon: 'requests', items: [['chat', 'Team chat'], ['tasks', 'Tasks']] },
  { k: 'admin', label: 'Admin', icon: 'settings', items: [['users', 'Team & Users'], ['approvals', 'Approvals'], ['settings', 'Companies & settings'], ['portalset', 'Agent portal'], ['website', 'Website'], ['contacts', 'Agent contacts'], ['campaigns', 'Email campaigns']] },
];
const HR_ONLY = ['employees', 'employee', 'expiries'];
const MODS_AGENT = [
  { k: 'home', label: 'Home', icon: 'dashboard', items: [['home', 'Deals & destinations'], ['dest/Sri%20Lanka', 'Sri Lanka'], ['dest/Bali', 'Bali'], ['dest/Maldives', 'Maldives'], ['dest/Thailand', 'Thailand'], ['dest/Malaysia', 'Malaysia']] },
  { k: 'slbuild', label: 'Sri Lanka builder', icon: 'itineraries', items: [['slbuild', 'Build a package'], ['myquotes', 'My quotations']] },
  { k: 'hotels', label: 'Hotels', icon: 'hotelRates', items: [['hotels', 'Hotel search']] },
  { k: 'tours', label: 'Tours', icon: 'bookings', items: [['tours', 'Tours & transfers']] },
  { k: 'itineraries', label: 'Itineraries', icon: 'itineraries', items: [['itineraries', 'Ready-made itineraries']] },
  { k: 'requests', label: 'Requests', icon: 'requests', items: [['requests', 'My requests'], ['request/new', 'Request availability']] },
  { k: 'bookings', label: 'Bookings', icon: 'bookings', items: [['bookings', 'My bookings']] },
  { k: 'accounts', label: 'Accounts', icon: 'finance', items: [['invoices', 'Invoices'], ['statement', 'Statement of account']] },
  { k: 'visa', label: 'Visa', icon: 'requests', items: [['visa', 'Visa requests']] },
  { k: 'account', label: 'My account', icon: 'account', items: [['account', 'Profile & branding'], ['help', 'Help & tutorials']] },
];
export const SECTIONS_LIST = [['sales', 'Sales'], ['operations', 'Operations'], ['rates', 'Rates & supply'], ['finance', 'Finance'], ['admin', 'Admin']];
const canSee = k => !isStaff() || k === 'dashboard' || k === 'chat' || k === 'hr' || S.me.role === 'admin' || (S.me.sections || ROLE_PRESETS[S.me.role] || ['sales']).includes(k);
const mods = () => (isStaff() ? MODS_STAFF : MODS_AGENT).filter(m => canSee(m.k));
const ROUTE_MOD = (r) => { r = r || ''; if (!r) return (isStaff() ? MODS_STAFF : MODS_AGENT)[0]; const all = isStaff() ? MODS_STAFF : MODS_AGENT; return (all.find(m => m.k !== 'dashboard' && m.items.some(([h]) => h === r || h.split('/')[0] === r.split('/')[0])) || all[0]); };
const EDIT_COL = { employee: 'employees', dayplan: 'dayplans', quote: 'quotes', booking: 'bookings', agent: 'agents', supplier: 'suppliers', rate: 'rates', itinerary: 'itineraries', offer: 'offers', request: 'requests' };
const EDIT_NAV = { employee: 'employees', dayplan: 'dayplans', quote: 'quotes', booking: 'bookings', agent: 'agents', supplier: 'suppliers', itinerary: 'itineraries', offer: 'offers', request: 'requests' };

/* ---------- auth ---------- */
function loginView(msg = '') {
  root.innerHTML = `<div class="login"><div class="login-l"><div class="brand"><img src="logo.png" alt="Le Ceylan Destinations" class="lclogo"></div><form id="loginForm"><h1>Welcome back.</h1><p class="lead">Sign in to your travel workspace.</p>
  <label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label>
  <div class="err" id="loginErr">${esc(msg)}</div><button class="btn p big" type="submit">Sign in →</button><button class="link" type="button" data-act="forgot" style="justify-self:end">Forgot password?</button>
  <p class="note" style="border-top:1px solid var(--line);padding-top:14px;margin-top:6px">Travel agent? Sign in at <a href="https://www.leceylan.ae/">www.leceylan.ae</a>.</p></form></div>
  <div class="login-r"><h2>Every trip. Every detail.<br><span>One workspace.</span></h2><p>One workspace for the people, plans and details behind every journey.</p>
  <ul><li><b>Build the right quotation</b><span>Hotel rates, transport and activities together.</span></li><li><b>Keep every booking moving</b><span>Clear confirmations, passenger details and itineraries.</span></li><li><b>Know where your business stands</b><span>Invoices, supplier bills and multi-currency accounts.</span></li></ul>
  <div class="dests">${DEST.slice(0, 8).map(d => `<span>${esc(d)}</span>`).join('')}</div></div></div>`;
}
onAuthStateChanged(auth, async user => {
  stopAll(); stopChat(); S.user = user; S.me = null; UI.edit = null;
  if (!user) { if (/^#\/(register|unsub)/.test(location.hash)) root.innerHTML = publicView(location.hash); else publicOrLogin(); return; }
  root.innerHTML = '<div class="boot">Opening the register…</div>';
  try {
    const ref = doc(db, 'users', user.uid); const s = await getDoc(ref);
    if (!s.exists()) { await signOut(auth); loginView('This login is not set up yet. Ask your account manager.'); return; }
    S.me = { id: s.id, ...s.data() };
    if (S.me.active === false) { await signOut(auth); loginView('This login is suspended.'); return; }
  } catch (e) { console.error(e); await signOut(auth); loginView('Could not open your workspace: ' + (e.code || e.message)); return; }
  if (CRM_LIVE && ON_OWN && isStaff() && !ON_CRM) { location.href = CRM_URL; return; }
  if (ON_OWN && !isStaff() && ON_CRM) { location.href = AGENT_URL; return; }
  shell(); startData(onData); if (isStaff()) startChat(onChat);
  if (!location.hash || location.hash === '#/') location.hash = isStaff() ? '#/dashboard' : '#/home'; else route();
});

/* ---------- shell and routing ---------- */
function shell() {
  const initials = (S.me.name || S.me.email || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  root.innerHTML = `<header class="hdr"><button class="btn s menu-btn" data-act="menu" aria-label="Menu">☰</button><div class="brand"><img src="logo.png" alt="Le Ceylan Destinations" class="lclogo"><div class="brand-sub"><b id="brandName">${isStaff() ? 'CRM' : 'Agents'}</b><span>${isStaff() ? '' : esc(S.myAgent?.name || '')}</span></div></div><span class="sp"></span>
    ${isStaff() && ['admin', 'manager'].includes(S.me.role) ? `<button class="btn s" data-act="previewAgent">View agent portal</button>` : ''}${isStaff() ? `<select id="coSel" aria-label="Company"></select>` : ''}<input id="q" placeholder="Search…" aria-label="Search">
    <div class="me"><i>${esc(initials)}</i><div><b>${esc(S.me.name || S.me.email)}</b><span>${esc(isStaff() ? roleName(S.me.role) : 'Travel agent')}</span></div><button class="link" data-act="logout">Sign out</button></div></header>${S.me._preview ? `<div class="pvbar">Preview: you are seeing the agent portal as <b>${esc(S.myAgent?.name || '')}</b> sees it. Saving and sending are switched off. <button class="btn s" data-act="exitPreview">Back to the CRM</button></div>` : ''}
  <nav class="mods" id="mods">${mods().map(m => `<a href="#/${m.k === 'hr' && !UI.canHR ? 'leave' : m.items[0][0]}" data-mod="${m.k}">${ico(m.icon)}<span>${m.label}</span>${m.k === 'dashboard' && isStaff() ? '<em class="badge" id="reqBadge" hidden></em>' : m.k === 'chat' ? '<em class="badge" id="chatBadge" hidden></em>' : ''}</a>`).join('')}</nav>
  <div class="body"><aside class="sub" id="sub"></aside><main id="main"><div class="empty">Opening the register…</div></main></div>${isStaff() ? '' : '<footer class="pfoot" id="pfoot"></footer>'}`;
  $('#q').addEventListener('input', () => { if (!UI.edit) render(); });
  $('#coSel')?.addEventListener('change', e => { try { localStorage.setItem('lc_co', e.target.value); } catch (x) { } render(); });
}
function drawNav(routeKey) {
  const m = ROUTE_MOD(routeKey);
  document.querySelectorAll('[data-mod]').forEach(a => a.classList.toggle('on', a.dataset.mod === m.k));
  const sub = $('#sub'); if (!sub) return;
  const full = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
  sub.innerHTML = `<h3>${esc(m.label)}</h3><div class="subbox">${m.items.filter(([h]) => UI.canHR || !HR_ONLY.includes(h)).map(([h, l]) => `<a href="#/${h}" class="${h === full || h === routeKey ? 'on' : ''}">${esc(l)}</a>`).join('')}</div>
    ${isStaff() ? `<div class="subbox help"><b>Your account manager</b><span>${esc(cfg().companies.map(c => c.name).filter(Boolean).join(' · ') || 'Le Ceylan')}</span></div>` : `<div class="subbox help"><b>Your account manager</b><span>${esc(cfg().companies[0]?.phone || '')}</span><span>${esc(cfg().companies[0]?.email || '')}</span></div>`}`;
}
function fillCo() { const s = $('#coSel'); if (!s) return; const v = curCo(); const allowed = S.me?.companies?.length ? cfg().companies.filter(c => S.me.companies.includes(c.id)) : cfg().companies; s.innerHTML = (allowed.length > 1 ? '<option value="">All companies</option>' : '') + allowed.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''); s.value = v; }
function parseHash() { const h = (location.hash || '').replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const [name, id] = path.split('/'); const params = Object.fromEntries(new URLSearchParams(qs || '')); return { name: name || '', id, params }; }
let current = {};
function route() {
  if (!S.me) return; current = parseHash(); UI.edit = null; UI.step = 0; UI.agentQ = ''; closeModal(); if (current.name !== 'chat') closeThread();
  $('#sub')?.classList.remove('open');
  if (isStaff() && EDIT_COL[current.name]) startEdit();
  render(); scrollTo(0, 0);
}
window.addEventListener('hashchange', () => { if (!S.user) { if (/^#\/(register|unsub)/.test(location.hash)) root.innerHTML = publicView(location.hash); else if (!$('#loginForm')) publicOrLogin(); return; } route(); });
function startEdit() {
  const { name, id, params } = current; const col = EDIT_COL[name];
  if (id && id !== 'new') { const r = S[col].find(x => x.id === id); if (!r) { UI.edit = { kind: name, col, waiting: id }; return; } UI.edit = { kind: name, col, rec: clone(r) }; }
  else UI.edit = { kind: name, col, rec: blank(name, params) };
  const r = UI.edit.rec;
  if (r && ['quote', 'booking'].includes(name)) for (const k of ['hotels', 'transport', 'activities', 'misc', 'payments', 'destinations', 'program']) r[k] = r[k] || [];
  if (name === 'quote' && r && !r.id && params?.req) { const q = S.requests.find(x => x.id === params.req); if (q) { Object.assign(r, { agent: q.agentId, lead: q.lead || '', adults: q.adults, children: q.children, childAges: q.childAges || '', nationality: q.nationality || '', arrival: q.arrival, departure: q.departure, agentRef: q.agentRef || '', notes: `${q.title ? q.title + '\n' : ''}${q.notes || ''}`, request: q.id, destinations: q.destination ? [q.destination] : [] }); const ag = S.agents.find(a => a.id === q.agentId); if (ag) { r.currency = ag.currency || r.currency; r.company = ag.company || r.company; } } }
}
function blank(kind) {
  const co = curCo() || cfg().companies[0]?.id || ''; const cur = coById(co).currency || 'AED';
  return ({ quote: { company: co, currency: cur, status: 'Draft', option: 'Option A', adults: 2, children: 0, destinations: [], hotelsIncluded: true, transportIncluded: true, hotels: [], transport: [], activities: [], misc: [], markupMethod: 'percent', markup: cfg().markup ?? 15, discountPct: 0, terms: DEFAULT_TERMS, inclusions: DEFAULT_INC, exclusions: DEFAULT_EXC, fx: {} },
    agent: { company: co, currency: 'USD', creditDays: 0, type: 'Travel Agent' }, supplier: { type: 'Hotel', currency: 'USD', destination: 'Sri Lanka' },
    rate: { type: (UI.rateTypes || ['Hotel'])[0], currency: 'USD', unit: (UI.rateTypes || ['Hotel'])[0] === 'Hotel' ? 'per room per night' : 'per person', meal: (UI.rateTypes || ['Hotel'])[0] === 'Hotel' ? 'BB' : '', destination: 'Sri Lanka' },
    itinerary: { destination: 'Sri Lanka', currency: 'USD', published: false, program: [], photos: [] }, offer: { destination: 'Sri Lanka', currency: 'AED', published: false, photos: [] }, dayplan: { destination: 'Sri Lanka', photos: [] }, employee: { status: 'Active', branch: 'UAE', company: co, annualLeave: 30, contractType: 'Full time', salaryCur: 'AED' } })[kind] || {};
}
function badges() { const c = $('#chatBadge'); if (c) { const n = unreadCount() + myOpenTasks(); c.hidden = !n; c.textContent = n; } }
function onChat() { badges(); if (current.name !== 'chat') return; const list = $('.chlist'); if (!list) { render(); return; } const tmp = document.createElement('div'); tmp.innerHTML = chatView(current.id); list.replaceWith(tmp.querySelector('.chlist')); const t1 = $('.chtitle'), t2 = tmp.querySelector('.chtitle'); if (t1 && t2) t1.innerHTML = t2.innerHTML; }
function onData() {
  fillCo(); syncTiers(); document.body.dataset.role = S.me?.role || '';
  badges();
  const b = $('#reqBadge'); if (b) { const n = S.requests.filter(r => (r.status || 'New request') === 'New request').length; b.hidden = !n; b.textContent = n; }
  if (UI.edit?.waiting) { const r = S[UI.edit.col].find(x => x.id === UI.edit.waiting); if (r) { startEdit(); render(); } return; }
  if (UI.edit) return; // never re-render under someone typing
  if (current.name === 'chat') { onChat(); return; }
  if (!isStaff() && S.myAgent) { const bm = $('#brandName'); if (bm) bm.textContent = S.myAgent.name; }
  render();
}
const EDIT_TITLE = { employee: 'Employees', dayplan: 'Day plans', quote: 'Quotations', booking: 'Bookings', agent: 'Travel Agents & Customers', supplier: 'Suppliers', rate: 'Rates', itinerary: 'Itineraries', offer: 'Portal Offers', request: 'Portal requests' };
function setCrumbs(t) { const c = $('#crumbs'); if (c) c.innerHTML = `<span>Workspace</span><span class="sep">›</span><b>${esc(t)}</b>`; document.title = t + ' · Le Ceylan'; }
setRender(() => render());
function render() {
  const m = $('#main'); if (!m) return; document.body.dataset.role = S.me?.role || ''; const pf = $('#pfoot'); if (pf) pf.innerHTML = portalFooter(); const { name, id, params } = current;
  const navKey = EDIT_NAV[name] || (name === 'rate' ? UI.ratePage || 'hotelRates' : name === 'finance' ? 'finance/' + (id || 'recv') : name === 'request' && !isStaff() ? 'request/new' : name);
  drawNav(navKey);
  const modOk = canSee(ROUTE_MOD(navKey).k);
  if (!modOk) { setCrumbs('No access'); m.innerHTML = `<div class="pagehead"><div><h1>No access</h1><p class="lead">Your login doesn't include this section. Ask your admin to add it.</p></div></div>`; return; }
  const wrap = (title, html) => html.includes('class="pagehead"') ? html : `<div class="pagehead"><div><h1>${esc(title)}</h1></div></div>${html}`;
  if (isStaff()) {
    if (!S.loaded.settings) { m.innerHTML = '<div class="empty">Opening the register…</div>'; return; }
    if (!cfg().companies.length && name !== 'settings') { setCrumbs('Welcome'); m.innerHTML = `<div class="pagehead"><div><h1>Welcome.</h1><p class="lead">Add your companies first, then everything else opens up.</p></div><a class="btn p" href="#/settings">Open Settings</a></div>`; return; }
    if (UI.edit) { setCrumbs(EDIT_TITLE[UI.edit.kind]); m.innerHTML = UI.edit.rec ? wrap(EDIT_TITLE[UI.edit.kind], EDIT[UI.edit.kind](UI.edit.rec)) : '<div class="empty">Opening…</div>'; bindPage(); hydratePhotos(m); return; }
    if (HR_ONLY.includes(name) && !UI.canHR) { m.innerHTML = `<div class="pagehead"><div><h1>No access</h1><p class="lead">Only HR can open employee files.</p></div></div>`; return; }
    if (name === 'chat') { setCrumbs('Team chat'); const keep = $('#chatForm textarea')?.value; m.innerHTML = chatView(id); if (keep) $('#chatForm textarea').value = keep; if (id) { const seed = id.startsWith('bk_') ? (() => { const b = S.bookings.find(x => x.id === id.slice(3)); return { name: 'Booking ' + (b?.no || ''), dm: false, members: [], kind: 'booking', ref: id.slice(3), refType: 'booking' }; })() : id.startsWith('qt_') ? (() => { const q = S.quotes.find(x => x.id === id.slice(3)); return { name: 'Quotation ' + (q?.no || ''), dm: false, members: [], kind: 'booking', ref: id.slice(3), refType: 'quote' }; })() : null; openThread(id, seed); drawMessages(); } bindPage(); return; }
    const v = V[name] || V.dashboard; setCrumbs(v.title); m.innerHTML = wrap(v.title, v.render(id));
  } else {
    let v = P[name] || P.home, arg = id; if (name === 'request' && id === 'new') { v = P.newRequest; arg = params; }
    setCrumbs(v.title); m.innerHTML = wrap(v.title, v.render(arg));
    if (name === 'statement') { const bx = $('#stmtBox'); if (bx) bx.innerHTML = statement(S.me.agentId).html; }
  }
  bindPage(); hydratePhotos(m);
}

/* ---------- editing ---------- */
const NUMERIC = /\.(n|rate|km|perKm|days|perDay|extras|qty|price|pax|paid|amount)$|^(adults|children|markup|discountPct)$|^fx\./;
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { const k = ks[i]; if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; } o[ks[ks.length - 1]] = val; }
function store(el) { const r = UI.edit?.rec; if (!r) return;
  if (el.dataset.path) setPath(r, el.dataset.path, NUMERIC.test(el.dataset.path) && el.value !== '' ? num(el.value) : el.value);
  else if (el.dataset.f) r[el.dataset.f] = el.value; }
function refreshCalcs() { const q = UI.edit?.rec; if (!q) return;
  document.querySelectorAll('[data-calc]').forEach(el => { const k = el.dataset.calc; if (k.startsWith('room:')) { const [, ref, part] = k.split(':'); el.textContent = calcText('room:' + ref, q)[part]; } else el.innerHTML = calcText(k, q); }); }
document.addEventListener('input', e => { if (e.target.id === 'agentQ') { UI.agentQ = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#agentQ'); n.focus(); n.setSelectionRange(pos, pos); return; } if (!UI.edit || !e.target.closest('#main')) return; store(e.target); refreshCalcs(); markDirty(); });
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'contactsIn' && el.files?.[0]) { importContacts(el.files[0]).catch(x => toast('Could not read the file: ' + x.message)); el.value = ''; return; }
  if (el.dataset.actChange && (AGENT_A[el.dataset.actChange] || STUDIO_A[el.dataset.actChange] || RH_A[el.dataset.actChange])) { A[el.dataset.actChange](el.dataset.id, el); return; }
  if (el.dataset.filter) { UI.filter[el.dataset.filter] = el.value; render(); return; }
  if (el.dataset.actChange === 'useItin') { const it = S.itineraries.find(x => x.id === el.value); if (it && UI.edit?.rec) { Object.assign(UI.edit.rec, { itinerary: it.days || '', inclusions: it.inclusions || UI.edit.rec.inclusions || '', exclusions: it.exclusions || UI.edit.rec.exclusions || '' }); render(); toast('Itinerary copied'); } return; }
  if (el.id === 'roleSel' || el.id === 'roleEdit') { const box = el.id === 'roleSel' ? $('#accessBox') : $('#accessEdit'); if (box) box.innerHTML = accessFields({ role: el.value }); return; }
  if (el.id === 'rateFile' && el.files[0]) { readRates(el.files[0]); return; }
  if (el.id === 'chatFile' && el.files.length) { const files = [...el.files]; toast('Uploading…'); (async () => { UI.atts = UI.atts || []; for (const f of files) { try { UI.atts.push(await uploadFile(f)); } catch (e) { toast(e.message || 'Upload failed'); } } drawPend(); toast('Ready to send'); })(); el.value = ''; return; }
  if (el.id === 'dmPick' && el.value) { newDM(el.value).then(id => { location.hash = '#/chat/' + id; }); return; }
  if (el.dataset.actChange === 'taskStatus') { const t = S.tasks.find(x => x.id === el.dataset.id); if (t) save('tasks', { ...t, status: el.value, doneAt: el.value === 'Done' ? new Date().toISOString() : '' }, { silent: true }); return; }
  if (el.classList?.contains('photoIn') && el.files.length && UI.edit) { const path = el.dataset.path; toast('Uploading photos…'); uploadPhotos([...el.files]).then(ids => { const arr = getPath(UI.edit.rec, path) || []; setPath(UI.edit.rec, path, arr.concat(ids)); markDirty(); render(); toast(ids.length + ' photo' + (ids.length === 1 ? '' : 's') + ' added'); }).catch(e => { console.error(e); toast('Could not upload: ' + (e.code || e.message)); }); return; }
  if (el.dataset.actChange === 'copyItin' && UI.edit?.rec) { const it = S.itineraries.find(x => x.id === el.value); if (it) { const r = UI.edit.rec; r.program = clone(it.program || []); if (!r.program.length && it.days) r.itinerary = it.days; if (it.inclusions) r.inclusions = it.inclusions; if (it.exclusions) r.exclusions = it.exclusions; markDirty(); render(); toast('Copied: ' + it.title); } return; }
  if (el.classList?.contains('sheetIn') && el.files[0]) { routeSheet(el.files[0], el.dataset.kind); return; }
  if (el.classList?.contains('qbIn') && el.files[0]) { readQB(el.files[0], el.dataset.kind); return; }
  if (!UI.edit || !el.closest('#main')) return;
  store(el); markDirty();
  if (el.tagName === 'SELECT' && /(^currency$|\.currency$|^markupMethod$|\.method$)/.test(el.dataset.path || el.dataset.f || '')) render(); else refreshCalcs();
});
function markDirty() { const s = $('#saveState'); if (s) s.textContent = 'Unsaved changes'; }
function bindPage() {
  const d = $('#drop'); if (!d) return;
  d.ondragover = e => { e.preventDefault(); d.classList.add('over'); }; d.ondragleave = () => d.classList.remove('over');
  d.ondrop = e => { e.preventDefault(); d.classList.remove('over'); const f = e.dataTransfer.files[0]; if (!f) return; if ($('#rateFile')) readRates(f); else routeSheet(f, d.dataset.kind); };
}

/* ---------- uploads ---------- */
const isoDate = v => { if (!v) return ''; if (v instanceof Date) return new Date(v.getTime() - v.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); const s = String(v).trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; } return s; };
async function readRates(file) {
  try {
    const XLSX = await import('xlsx');
    // CSV dates stay as text so 01/11/2026 is read day-first, not US-style
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true, raw: /\.csv$/i.test(file.name) });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    const key = (o, names) => { for (const k of Object.keys(o)) { const n = k.toLowerCase().replace(/[^a-z]/g, ''); if (names.includes(n)) return o[k]; } return ''; };
    const out = [], bad = [];
    rows.forEach((o, i) => {
      const r = { type: String(key(o, ['type', 'servicetype', 'category']) || 'Hotel').trim(), destination: String(key(o, ['destination', 'country'])).trim(), city: String(key(o, ['city', 'area', 'location'])).trim(),
        supplier: String(key(o, ['supplier', 'hotel', 'hotelname', 'suppliername'])).trim(), service: String(key(o, ['service', 'roomtype', 'room', 'vehicle', 'description', 'tour'])).trim(), meal: String(key(o, ['meal', 'mealplan', 'board'])).trim().toUpperCase(),
        validFrom: isoDate(key(o, ['validfrom', 'from', 'start'])), validTo: isoDate(key(o, ['validto', 'to', 'end', 'until'])), cost: num(key(o, ['cost', 'rate', 'price', 'net', 'netrate'])), currency: String(key(o, ['currency', 'cur']) || 'USD').trim().toUpperCase(), unit: String(key(o, ['unit', 'per', 'basis'])).trim() || 'per room per night', notes: String(key(o, ['notes', 'remarks', 'note'])).trim() };
      const t = LINE_TYPES.find(x => x.toLowerCase() === r.type.toLowerCase()); r.type = t || (/(transport|car|van|vehicle)/i.test(r.type) ? 'Transfer' : 'Other');
      if (!r.supplier || !r.service || !r.cost) bad.push(i + 2); else out.push(r);
    });
    UI.pendingRates = out;
    $('#ratePreview').innerHTML = `<div style="margin-top:14px"><div class="row"><b>${out.length} rates ready from ${esc(file.name)}</b>${bad.length ? `<span class="tag bad">${bad.length} rows skipped (missing supplier, service or cost): rows ${bad.slice(0, 12).join(', ')}${bad.length > 12 ? '…' : ''}</span>` : ''}<span class="sp"></span><button class="btn p" data-act="importRates" ${out.length ? '' : 'disabled'}>Import ${out.length} rates</button></div>
      <div class="scroll" style="max-height:280px;margin-top:8px"><table><thead><tr><th>Type</th><th>Destination</th><th>Supplier</th><th>Service</th><th>Meal</th><th>Valid</th><th class="num">Cost</th></tr></thead><tbody>${out.slice(0, 50).map(r => `<tr><td>${esc(r.type)}</td><td>${esc(r.destination)}</td><td>${esc(r.supplier)}</td><td>${esc(r.service)}</td><td>${esc(r.meal)}</td><td>${esc(r.validFrom)} → ${esc(r.validTo)}</td><td class="num">${esc(fmt(r.cost, r.currency))}</td></tr>`).join('')}</tbody></table></div></div>`;
  } catch (e) { console.error(e); toast('Could not read that file'); }
}
async function importRates() {
  const rows = UI.pendingRates || []; if (!rows.length) return;
  const supByName = new Map(S.suppliers.map(s => [(s.name || '').toLowerCase(), s.id])); const now = new Date().toISOString();
  let batch = writeBatch(db), n = 0;
  const commit = async () => { if (n) { await batch.commit(); batch = writeBatch(db); n = 0; } };
  try {
    for (const r of rows) {
      const k = r.supplier.toLowerCase(); let sid = supByName.get(k);
      if (!sid) { const ref = doc(collection(db, 'suppliers')); sid = ref.id; supByName.set(k, sid); batch.set(ref, { name: r.supplier, type: r.type === 'Hotel' ? 'Hotel' : r.type === 'Transfer' ? 'Transport' : r.type === 'Guide' ? 'Guide' : 'Activity', destination: r.destination, city: r.city, currency: r.currency, ...(S.me.role === 'dataentry' ? { approved: false, published: false } : {}), createdAt: now, updatedAt: now, createdBy: S.user.uid }); n++; }
      batch.set(doc(collection(db, 'rates')), { ...r, supplierId: sid, ...(S.me.role === 'dataentry' ? { approved: false, published: false } : {}), createdAt: now, updatedAt: now, createdBy: S.user.uid }); n++;
      if (n >= 400) await commit();
    }
    await commit(); toast(`${rows.length} rates imported`); UI.pendingRates = null; render();
  } catch (e) { console.error(e); toast('Import stopped: ' + (e.code || e.message)); }
}
async function readItin(file) {
  try {
    const mammoth = file.name.endsWith('.docx') ? (await import('mammoth/mammoth.browser.js')).default : null;
    let text = mammoth ? (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value : await file.text();
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    const title = (lines[0] || file.name.replace(/\.\w+$/, '')).slice(0, 120);
    const nights = num((text.match(/(\d+)\s*nights?/i) || [])[1]);
    const id = await save('itineraries', { title, days: lines.slice(1).join('\n'), nights: nights || '', destination: (['Sri Lanka', 'Maldives', 'Bali', 'Thailand', 'Malaysia', 'Turkey', 'Lebanon', 'Philippines', 'Indonesia', 'UAE'].find(d => text.includes(d)) || ''), currency: 'USD', published: false, source: file.name }, { silent: true });
    if (id) { toast('Draft created. Check it, then publish'); location.hash = '#/itinerary/' + id; }
  } catch (e) { console.error(e); toast('Could not read that file'); }
}

/* ---------- Excel import: offers and itineraries ---------- */
function routeSheet(file, kind) { if (/\.(docx|txt)$/i.test(file.name)) return readItin(file); readSheet(file, kind); }
async function sheetRows(file) { const XLSX = await import('xlsx'); const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true, raw: /\.csv$/i.test(file.name) }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }); }
const pick = (o, names) => { for (const k of Object.keys(o)) { const n = k.toLowerCase().replace(/[^a-z]/g, ''); if (names.includes(n)) return String(o[k] instanceof Date ? isoDate(o[k]) : o[k]).trim(); } return ''; };
const urls = v => String(v || '').split(/[\s,;]+/).filter(u => /^https:\/\//.test(u));
const yes = v => /^(y|yes|true|1|publish|published)$/i.test(String(v).trim());
async function readSheet(file, kind) {
  try {
    const rows = await sheetRows(file); let out = [];
    if (kind === 'offers') out = rows.map(o => ({ title: pick(o, ['title', 'offer', 'name']), destination: pick(o, ['destination', 'country']), priceFrom: num(pick(o, ['pricefrom', 'price', 'from'])), currency: (pick(o, ['currency', 'cur']) || 'AED').toUpperCase(), validTo: isoDate(pick(o, ['bookby', 'validto', 'validuntil', 'until'])), travel: pick(o, ['travelwindow', 'travel', 'traveldates']), body: pick(o, ['details', 'description', 'body', 'text']), photos: urls(pick(o, ['photourls', 'photos', 'photo', 'images', 'image'])), published: yes(pick(o, ['publish', 'published'])) })).filter(x => x.title);
    if (kind === 'dayplans') out = rows.map(o => ({ title: pick(o, ['title', 'day', 'name']), destination: pick(o, ['destination', 'country']), city: pick(o, ['city', 'area']), overnight: pick(o, ['overnight', 'stay']), meals: pick(o, ['meals']), description: pick(o, ['description', 'details', 'text']), photos: urls(pick(o, ['photourls', 'photos', 'photo', 'images', 'image'])) })).filter(x => x.title);
    if (kind === 'itineraries') { const map = new Map();
      rows.forEach(o => { const t = pick(o, ['title', 'itinerary', 'name']); if (!t) return; let it = map.get(t); if (!it) { it = { title: t, code: pick(o, ['code']), destination: pick(o, ['destination', 'country']), nights: num(pick(o, ['nights'])) || '', priceFrom: num(pick(o, ['pricefrom', 'price'])) || '', currency: (pick(o, ['currency']) || 'USD').toUpperCase(), validTo: isoDate(pick(o, ['validuntil', 'validto'])), summary: pick(o, ['summary', 'overview']), hotels: pick(o, ['hotels']), inclusions: pick(o, ['inclusions']), exclusions: pick(o, ['exclusions']), published: yes(pick(o, ['publish', 'published'])), photos: [], program: [], _days: [] }; map.set(t, it); }
        const day = pick(o, ['day']), dt = pick(o, ['daytitle']), txt = pick(o, ['daybyday', 'description', 'program', 'programme', 'details']), ph = urls(pick(o, ['photourls', 'photos', 'photo', 'images', 'image']));
        if (dt || (day && txt)) it.program.push({ title: dt || `Day ${day}`, description: txt, overnight: pick(o, ['overnight']), meals: pick(o, ['meals']), photos: ph }); else { if (txt) it._days.push(day ? `Day ${day} – ${txt}` : txt); if (ph.length) it.photos.push(...ph); } });
      out = [...map.values()].map(({ _days, ...it }) => { const r = { ...it, days: _days.join('\n') }; if (r.program.length) { r.days = programText(r); if (!r.photos.length) r.photos = (r.program.find(d => d.photos.length)?.photos || []).slice(0, 1); } return r; }); }
    UI.pendingSheet = { kind, out };
    $('#sheetPreview').innerHTML = `<div style="margin-top:14px"><div class="row"><b>${out.length} ${kind} ready from ${esc(file.name)}</b><span class="sp"></span><button class="btn p" data-act="importSheet" ${out.length ? '' : 'disabled'}>Import ${out.length}</button></div>
      <div class="scroll" style="max-height:260px;margin-top:8px"><table><thead><tr><th>Title</th><th>Destination</th><th>Price from</th><th>Publish</th></tr></thead><tbody>${out.slice(0, 40).map(x => `<tr><td>${esc(x.title)}</td><td>${esc(x.destination)}</td><td>${x.priceFrom ? esc(fmt(x.priceFrom, x.currency)) : ''}</td><td>${x.published ? 'Yes' : 'Draft'}</td></tr>`).join('')}</tbody></table></div></div>`;
  } catch (e) { console.error(e); toast('Could not read that file'); }
}
async function importSheet() {
  const p = UI.pendingSheet; if (!p?.out.length) return; const now = new Date().toISOString(); let batch = writeBatch(db), n = 0;
  try { for (const x of p.out) { batch.set(doc(collection(db, p.kind)), { ...x, ...(S.me.role === 'dataentry' ? { approved: false, published: false } : {}), createdAt: now, updatedAt: now, createdBy: S.user.uid }); if (++n >= 400) { await batch.commit(); batch = writeBatch(db); n = 0; } } if (n) await batch.commit(); toast(`${p.out.length} ${p.kind} imported`); UI.pendingSheet = null; render(); }
  catch (e) { console.error(e); toast('Import stopped: ' + (e.code || e.message)); }
}

/* ---------- QuickBooks import ---------- */
async function readQB(file, kind) {
  try {
    const rows = await sheetRows(file); let out = [];
    if (kind === 'customers') out = rows.map(o => { const name = pick(o, ['customer', 'name', 'displayname', 'company', 'companyname', 'customerfullname']); const ex = S.agents.find(a => (a.name || '').toLowerCase() === name.toLowerCase());
      return { name, email: pick(o, ['email', 'emailaddress']), phone: pick(o, ['phone', 'phonenumbers', 'mobile']), address: pick(o, ['billingaddress', 'billaddress', 'address', 'fulladdress']), currency: pick(o, ['currency']).toUpperCase().slice(0, 3), trn: pick(o, ['taxregno', 'trn', 'taxid', 'taxnumber']), ex }; }).filter(x => x.name);
    if (kind === 'payments') out = rows.map(o => { const ref = pick(o, ['invoiceno', 'invoicenumber', 'num', 'no', 'refno', 'reference', 'invoice', 'appliedto']); const amount = Math.abs(num(String(pick(o, ['amount', 'paymentamount', 'total'])).replace(/[^0-9.\-]/g, ''))); const date = isoDate(pick(o, ['date', 'paymentdate', 'transactiondate']));
      const b = S.bookings.find(x => x.invoiceNo && ref && (x.invoiceNo === ref || ref.includes(x.invoiceNo)));
      const dup = b && (b.payments || []).some(p => p.date === date && Math.abs(num(p.amount) - amount) < .01);
      return { ref, amount, date, method: pick(o, ['paymentmethod', 'method']) || 'Bank transfer', memo: pick(o, ['memo', 'description']), b, dup }; }).filter(x => x.amount);
    UI.pendingQB = { kind, out };
    const head = kind === 'customers' ? ['Customer', 'Email', 'Currency', 'Action'] : ['Date', 'Invoice', 'Amount', 'Match'];
    const body = out.slice(0, 60).map(x => kind === 'customers' ? `<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.currency)}</td><td>${x.ex ? tagFor('Sent').replace(/>[^<]+</, '>Update<') : tagFor('Active').replace(/>[^<]+</, '>New agent<')}</td></tr>`
      : `<tr><td>${esc(x.date)}</td><td>${esc(x.ref)}</td><td class="num">${esc(fmt(x.amount))}</td><td>${!x.b ? '<span class="tag bad">No invoice found</span>' : x.dup ? '<span class="tag gr">Already recorded</span>' : '<span class="tag ok">' + esc(x.b.no) + '</span>'}</td></tr>`).join('');
    const ready = kind === 'customers' ? out.length : out.filter(x => x.b && !x.dup).length;
    $('#qbPreview').innerHTML = `<div class="card" style="margin-top:14px"><div class="row"><b>${ready} ${kind === 'customers' ? 'customers' : 'payments'} ready to import</b><span class="sp"></span><button class="btn p" data-act="importQB" ${ready ? '' : 'disabled'}>Import ${ready}</button></div><div class="scroll" style="max-height:300px;margin-top:8px"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></div>`;
  } catch (e) { console.error(e); toast('Could not read that file'); }
}
async function importQB() {
  const p = UI.pendingQB; if (!p) return; let n = 0;
  if (p.kind === 'customers') for (const x of p.out) { const { ex, ...d } = x; const clean = Object.fromEntries(Object.entries(d).filter(([, v]) => v)); if (ex) await save('agents', { ...ex, ...clean }, { silent: true }); else await save('agents', { ...clean, company: curCo() || cfg().companies[0]?.id || '', currency: clean.currency || 'USD', type: 'Travel Agent', creditDays: 0 }, { silent: true }); n++; }
  if (p.kind === 'payments') { const byB = new Map(); for (const x of p.out) { if (!x.b || x.dup) continue; const cur = byB.get(x.b.id) || clone(x.b); cur.payments = cur.payments || []; cur.payments.push({ date: x.date, amount: x.amount, method: x.method, ref: 'QuickBooks ' + (x.memo || x.ref) }); byB.set(x.b.id, cur); n++; }
    for (const b of byB.values()) { await save('bookings', b, { silent: true }); await savePortalCopy(b); } }
  toast(`${n} imported from QuickBooks`); UI.pendingQB = null; render();
}

/* ---------- QuickBooks CSV ---------- */
const qd = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
function qbExport(kind) {
  const co = curCo(); if (!co && kind !== 'cust') { toast('Choose one company at the top first'); return; }
  const from = $('#qbFrom').value, to = $('#qbTo').value; const inR = d => (!from || d >= from) && (!to || d <= to);
  const bk = S.bookings.filter(b => b.company === co && b.status !== 'Cancelled'); const short = coById(co).short || 'all'; let rows;
  if (kind === 'inv') { rows = [['*InvoiceNo', '*Customer', '*InvoiceDate', '*DueDate', 'Memo', 'Item(Product/Service)', 'ItemDescription', 'ItemQuantity', 'ItemRate', '*ItemAmount', 'Currency']];
    bk.filter(b => inR(b.invoiceDate || '')).forEach(b => flatLines(b).forEach(l => rows.push([b.invoiceNo, agentName(b.agent), qd(b.invoiceDate), qd(b.dueDate || b.invoiceDate), `${b.no} ${b.lead || ''}`, 'Tour package - ' + l.type, (l.desc || l.type) + (l.date ? ' ' + l.date : ''), 1, l.sell.toFixed(2), l.sell.toFixed(2), b.currency]))); }
  if (kind === 'pay') { rows = [['Date', 'Customer', 'InvoiceNo', 'Amount', 'PaymentMethod', 'Reference', 'Currency']]; bk.forEach(b => (b.payments || []).filter(p => inR(p.date || '')).forEach(p => rows.push([qd(p.date), agentName(b.agent), b.invoiceNo, num(p.amount).toFixed(2), p.method, p.ref, b.currency]))); }
  if (kind === 'bills') { rows = [['BillNo', 'Supplier', 'BillDate', 'DueDate', 'Account', 'LineDescription', 'LineAmount', 'Currency']]; bk.filter(b => inR(b.arrival || '')).forEach(b => flatLines(b).forEach((l, i) => { if (!l.supplier) return; rows.push([`${b.no}-${i + 1}`, supName(l.supplier, l), qd(l.date || b.arrival), qd(l.date || b.arrival), 'Cost of sales - ' + l.type, `${l.desc || ''}${l.conf ? ' Conf ' + l.conf : ''}`, l.netLocal.toFixed(2), l.currency]); })); }
  if (kind === 'cust') { rows = [['Name', 'Company', 'Email', 'Phone', 'Billing Address', 'Currency', 'Tax Reg No']]; S.agents.filter(a => !co || a.company === co).forEach(a => rows.push([a.name, a.name, a.email, a.phone, (a.address || '').replace(/\n/g, ' '), a.currency, a.trn])); }
  if (rows.length < 2) { toast('Nothing in this date range'); return; }
  download(`quickbooks-${kind}-${short}-${today()}.csv`, csv(rows));
}

function drawPend() { const p = $('#pendAtts'); if (p) p.innerHTML = (UI.atts || []).map((a, i) => `<span class="chip">${esc(a.name)} <button type="button" data-act="rmAtt" data-id="${i}" aria-label="Remove">✕</button></span>`).join(''); }

/* ---------- access ---------- */
function readAccess(box, role) {
  const sections = [...box.querySelectorAll('input[name=sec]:checked')].map(i => i.value);
  const allCo = cfg().companies.map(c => c.id); const cos = [...box.querySelectorAll('input[name=co]:checked')].map(i => i.value);
  return { sections: role === 'admin' ? ROLE_PRESETS.admin : sections, companies: cos.length === allCo.length ? [] : cos };
}

/* ---------- actions ---------- */
const A = MORE_A;
Object.assign(A, {
  menu() { $('#sub').classList.toggle('open'); },
  logout() { signOut(auth); location.hash = ''; },
  async forgot() { const em = document.querySelector('#loginForm [name=email]').value.trim(); if (!em) { $('#loginErr').textContent = 'Type your email first.'; return; } try { await sendPasswordResetEmail(auth, em); } catch (e) { } $('#loginErr').textContent = 'If that email has a login, a reset link is on its way.'; },
  async myReset() { try { await sendPasswordResetEmail(auth, S.me.email); toast('Reset link sent to ' + S.me.email); } catch (e) { toast('Could not send the email'); } },
  closeModal, printDoc,
  filter(id, el) { UI.filter[el.dataset.k] = id; render(); },
  tab(id, el) { UI.tab[el.dataset.k] = id; render(); },
  doc(kind) { showDoc(buildDoc(kind, UI.edit.rec)); },
  agentItin(id) { const i = S.itineraries.find(x => x.id === id); if (i) showDoc(buildDoc('itinPlain', { ...i, program: i.program || [] })); },
  myStatement() { showDoc(statement(S.me.agentId)); },
  agentDoc(id, el) { const b = S.bookings.find(x => x.id === id); if (b) showDoc(buildDoc(el.dataset.k, b)); },
  stmt() { const a = $('#stmtAgent').value; if (!a) { toast('Choose an agent'); return; } showDoc(statement(a)); },
  qb(kind) { qbExport(kind); },
  step(i) { UI.step = +i; render(); scrollTo(0, 0); },
  rmAtt(i) { UI.atts.splice(+i, 1); drawPend(); },
  addLink() { openModal('Share a Google Drive link', `<form id="linkForm" style="display:grid;gap:12px"><label>Link<input name="url" required placeholder="https://drive.google.com/…"></label><label>Name<input name="name" placeholder="Hotel contract 2027"></label><div class="row"><span class="sp"></span><button class="btn p">Add to message</button></div></form>`); },
  viewPhoto(id) { openModal('Photo', `<div style="text-align:center">${`<img data-photo="${esc(id)}" style="max-width:100%;border-radius:12px">`}</div>`); hydratePhotos($('#mbody')); },
  dlFile(id) { toast('Downloading…'); downloadFile(id); },
  newTask(_, el) { const pre = {}; if (el?.dataset.ref) Object.assign(pre, { ref: el.dataset.ref, refType: el.dataset.reftype, refLabel: el.dataset.reflabel }); else if (current.name === 'chat' && chatState.open) { const c = chatState.channels.get(chatState.open); Object.assign(pre, { channel: chatState.open, ref: c?.ref || '', refType: c?.refType || '', refLabel: c?.ref ? c.name : '' }); } openModal('New task', taskForm(pre)); },
  taskFromMsg(mid) { const m = chatState.msgs.find(x => x.id === mid); const c = chatState.channels.get(chatState.open); openModal('Make a task', taskForm({ title: (m?.text || '').slice(0, 120), notes: m?.text || '', channel: chatState.open, ref: c?.ref || '', refType: c?.refType || '', refLabel: c?.ref ? c.name : '' })); },
  toggleTask(id) { const t = S.tasks.find(x => x.id === id); if (!t) return; const done = t.status !== 'Done'; save('tasks', { ...t, status: done ? 'Done' : 'Open', doneAt: done ? new Date().toISOString() : '' }, { silent: true }); toast(done ? 'Done' : 'Reopened'); },
  async saveEmployee() { const r = UI.edit.rec; if (!r.name) { toast('Name is needed'); return; } const id = await save('employees', r); if (id) location.hash = '#/employees'; },
  async leaveDecide(id, el) { const l = S.leaves.find(x => x.id === id); if (!l) return; await save('leaves', { ...l, status: el.dataset.k, decidedBy: S.user.uid, decidedAt: new Date().toISOString() }, { silent: true }); toast('Leave ' + el.dataset.k.toLowerCase()); },
  async checkIn() { const e = myEmployee(); if (!e) return; const t = new Date(); await save('attendance', { id: e.id + '_' + today(), employeeId: e.id, userId: S.user.uid, date: today(), in: t.toTimeString().slice(0, 5) }, { silent: true }); toast('Checked in'); },
  async checkOut() { const e = myEmployee(); const a = e && S.attendance.find(x => x.employeeId === e.id && x.date === today()); if (!a) return; await save('attendance', { ...a, out: new Date().toTimeString().slice(0, 5) }, { silent: true }); toast('Checked out'); },
  rmPhoto(i, el) { const arr = getPath(UI.edit.rec, el.dataset.k) || []; arr.splice(+i, 1); markDirty(); render(); },
  addPhotoUrl(_, el) { const inp = el.parentElement.querySelector('.urlIn'); const u = (inp?.value || '').trim(); if (!/^https:\/\//.test(u)) { toast('Paste a web address starting with https://'); return; } const arr = getPath(UI.edit.rec, el.dataset.k) || []; setPath(UI.edit.rec, el.dataset.k, arr.concat(u)); markDirty(); render(); },
  pickDays() { openModal('Add days from your day plans', `<div id="dpBody">${dayPicker(UI.edit.rec)}</div>`); const wire = () => { $('#dpq').oninput = () => { const v = $('#dpq').value; $('#dpBody').innerHTML = dayPicker(UI.edit.rec, v); wire(); hydratePhotos($('#dpBody')); const q = $('#dpq'); q.focus(); q.setSelectionRange(v.length, v.length); }; }; wire(); hydratePhotos($('#dpBody')); },
  addDayPlan(id) { const d = S.dayplans.find(x => x.id === id); if (!d) return; const r = UI.edit.rec; (r.program = r.program || []).push({ dayId: d.id, title: d.title || '', description: d.description || '', overnight: d.overnight || '', meals: d.meals || '', photos: (d.photos || []).slice() }); markDirty(); toast('Day ' + r.program.length + ': ' + d.title); render(); },
  addDay() { const r = UI.edit.rec; (r.program = r.program || []).push({ title: '', description: '', overnight: '', meals: '', photos: [] }); markDirty(); render(); },
  moveDay(i, el) { const r = UI.edit.rec; i = +i; const j = i + +el.dataset.k; if (j < 0 || j >= r.program.length) return; [r.program[i], r.program[j]] = [r.program[j], r.program[i]]; markDirty(); render(); },
  rmDay(i) { UI.edit.rec.program.splice(+i, 1); markDirty(); render(); },
  async saveDayPlan() { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } const id = await save('dayplans', r); if (id) location.hash = '#/dayplans'; },
  pickAgent(id) { const q = UI.edit.rec; q.agent = id; const ag = S.agents.find(a => a.id === id); if (ag) { q.currency = ag.currency || q.currency; if (ag.company) q.company = ag.company; } markDirty(); render(); },
  toggleDest(d) { const q = UI.edit.rec; q.destinations = q.destinations || []; const i = q.destinations.indexOf(d); if (i >= 0) q.destinations.splice(i, 1); else q.destinations.push(d); markDirty(); render(); },
  setIncl(v, el) { UI.edit.rec[el.dataset.k] = v === '1'; markDirty(); render(); },
  addItem(_, el) { const q = UI.edit.rec; const k = el.dataset.k; const cur = q.currency || 'AED'; const pax = num(q.adults) + num(q.children);
    const item = { hotels: { name: '', category: 'Standard', meal: 'BB', checkIn: q.arrival || '', checkOut: q.departure || '', currency: 'USD', dest: (q.destinations || [])[0] || 'Sri Lanka', rooms: {} }, activities: { date: q.arrival || '', name: '', per: 'person', pax: pax || 1, price: '', currency: 'USD' }, misc: { date: '', desc: '', qty: 1, price: '', currency: cur }, payments: { date: today(), amount: '', method: 'Bank transfer', ref: '' } }[k];
    (q[k] = q[k] || []).push(item); markDirty(); render(); },
  rmItem(i, el) { UI.edit.rec[el.dataset.k].splice(+i, 1); markDirty(); render(); },
  addTransport(dest) { const q = UI.edit.rec; const saved = S.rates.filter(x => x.approved !== false && ['Transfer', 'Tour'].includes(x.type) && (!x.destination || x.destination === dest));
    openModal('Add transport — ' + dest, `<div class="grid" style="grid-template-columns:1fr"><label>Pricing method<select id="trMethod"><option value="mileage">Mileage — per km or day</option><option value="fixed">Fixed-price transfer or tour</option><option value="package">Resort package — per person</option></select></label>
      <label>Route / saved rate<select id="trRate"><option value="">Custom (enter manually)</option>${saved.map(x => `<option value="${esc(x.id)}">${esc(x.supplier)} · ${esc(x.service)} · ${esc(fmt(x.cost, x.currency))} ${esc(x.unit || '')}</option>`).join('')}</select></label>
      <p class="note">A saved rate fills the line. Everything stays editable on this costing only.</p><div class="row"><span class="sp"></span><button class="btn" data-act="closeModal">Cancel</button><button class="btn p" data-act="confirmTransport" data-id="${esc(dest)}">Add line</button></div></div>`); },
  confirmTransport(dest) { const q = UI.edit.rec; const method = $('#trMethod').value; const x = S.rates.find(r => r.id === $('#trRate').value); const pax = num(q.adults) + num(q.children);
    const t = { dest, method, date: q.arrival || '', desc: x ? x.service : '', supplierId: x?.supplierId || '', currency: x?.currency || 'USD' };
    if (method === 'fixed') Object.assign(t, { qty: 1, price: x ? x.cost : '' }); else if (method === 'package') Object.assign(t, { pax: pax || 1, price: x ? x.cost : '' }); else Object.assign(t, { vehicle: '', km: '', perKm: /km/i.test(x?.unit || '') ? x.cost : '', days: '', perDay: /day/i.test(x?.unit || '') ? x.cost : '', extras: '' });
    (q.transport = q.transport || []).push(t); closeModal(); markDirty(); render(); },
  pickRates(_, el) { const k = el.dataset.k; const titles = { hotels: 'Add from rate database', activities: 'Browse activities' }; openModal(titles[k] || 'Rates', `<div id="rpBody">${ratePicker(UI.edit.rec, k)}</div>`); const wire = () => { $('#rpq').oninput = () => { const v = $('#rpq').value; $('#rpBody').innerHTML = ratePicker(UI.edit.rec, k, v); wire(); const q = $('#rpq'); q.focus(); q.setSelectionRange(v.length, v.length); }; }; wire(); },
  addRate(id, el) { const x = S.rates.find(r => r.id === id); const q = UI.edit.rec; if (!x) return; const k = el.dataset.k; const pax = num(q.adults) + num(q.children);
    if (k === 'hotels') q.hotels.push({ name: x.supplier, supplierId: x.supplierId || '', category: x.service, meal: x.meal || 'BB', checkIn: q.arrival || '', checkOut: q.departure || '', currency: x.currency, dest: x.destination || (q.destinations || [])[0] || '', rooms: { DBL: { n: 1, rate: x.cost } }, rateId: x.id });
    else q.activities.push({ date: q.arrival || '', name: x.service + (x.supplier ? ' — ' + x.supplier : ''), supplierId: x.supplierId || '', per: /person|pax/i.test(x.unit || '') ? 'person' : 'group', pax: pax || 1, price: x.cost, currency: x.currency, rateId: x.id });
    closeModal(); markDirty(); render(); toast('Added: ' + (x.supplier || x.service)); },
  async saveQuote() { const r = UI.edit.rec; if ((r.program || []).length) r.itinerary = programText(r); if (!r.no) r.no = await nextNo('pf', 'PF-', 1000); const id = await save('quotes', r); if (!id) return; if (!r.id) { r.id = id; history.replaceState(null, '', '#/quote/' + id); current = parseHash(); }
    if (r.request) { const q = S.requests.find(x => x.id === r.request); if (q && !q.quote) await save('requests', { ...q, quote: id, status: 'Quoted' }, { silent: true }); } render(); },
  dupQuote() { const r = clone(UI.edit.rec); delete r.id; delete r.createdAt; delete r.createdBy; r.status = 'Draft'; const o = (r.option || 'Option A').match(/([A-Z])$/); r.option = o ? 'Option ' + String.fromCharCode(o[1].charCodeAt(0) + 1) : 'Option B'; UI.edit.rec = r; history.replaceState(null, '', '#/quote/new'); current = parseHash(); toast('Copied as ' + r.option + '. Change it, then Save'); render(); },
  async toBooking() {
    const q = UI.edit.rec; if (!q.agent) { toast('Select the agent first'); UI.step = 0; render(); return; }
    if (!q.id) { await A.saveQuote(); if (!q.id) return; }
    const ex = S.bookings.find(b => b.quote === q.id); if (ex) { location.hash = '#/booking/' + ex.id; return; }
    const { id, no, status, option, validUntil, createdAt, updatedAt, createdBy, ...rest } = q;
    const ag = S.agents.find(a => a.id === q.agent);
    const b = { ...clone(rest), quote: q.id, quoteNo: no, status: 'Under process', payments: [], no: await nextNo('tour', (coById(q.company).short || 'LC') + '-', 1000), invoiceNo: await nextNo('inv', 'INV-', 1000), invoiceDate: today(), dueDate: addDays(today(), num(ag?.creditDays)) };
    const nid = await save('bookings', b, { silent: true }); if (!nid) return;
    await savePortalCopy({ ...b, id: nid });
    await save('quotes', { ...q, status: 'Booked' }, { silent: true });
    if (q.request) { const r = S.requests.find(x => x.id === q.request); if (r) await save('requests', { ...r, status: 'Confirmed' }, { silent: true }); }
    toast('Booking ' + b.no + ' created'); location.hash = '#/booking/' + nid;
  },
  async saveBooking() { if ((UI.edit.rec.program || []).length) UI.edit.rec.itinerary = programText(UI.edit.rec); const id = await save('bookings', UI.edit.rec); if (id) { await savePortalCopy(UI.edit.rec); render(); } },
  async saveSimple(col) { if (!UI.edit.rec.name) { toast('Name is needed'); return; } const id = await save(col, UI.edit.rec); if (id) location.hash = '#/' + col; },
  async delRec(col, btn) { if (!confirmBtn(btn, 'Click again to delete')) return; const id = UI.edit.rec.id; if (await remove(col, id)) { if (col === 'bookings') remove('portalBookings', id); location.hash = '#/' + col; } },
  async saveRate() { const r = UI.edit.rec; if (!r.supplier || !r.service) { toast('Supplier and service are needed'); return; } const s = S.suppliers.find(x => (x.name || '').toLowerCase() === r.supplier.toLowerCase()); if (s) r.supplierId = s.id; else { const sid = await save('suppliers', { name: r.supplier, type: r.type === 'Hotel' ? 'Hotel' : 'Other', destination: r.destination, currency: r.currency }, { silent: true }); r.supplierId = sid; } r.cost = num(r.cost); if (await save('rates', r)) location.hash = '#/' + (UI.ratePage || 'hotelRates'); },
  rateTemplate() { download('rates-template.csv', csv([RATE_COLS, ['Hotel', 'Sri Lanka', 'Kandy', 'Earl\'s Regency', 'Deluxe Room', 'BB', '2026-11-01', '2027-04-30', '120', 'USD', 'per room per night', 'Extra bed USD 35'], ['Transfer', 'Sri Lanka', 'Colombo', 'Island Cabs', 'Airport to Negombo - car', '', '2026-11-01', '2027-10-31', '25', 'USD', 'per car', ''], ['Activity', 'Bali', 'Ubud', 'Bali Swing', 'Swing with lunch', '', '2026-11-01', '2027-10-31', '450000', 'IDR', 'per person', '']])); },
  importRates, importSheet, importQB,
  sheetTemplate(kind) { const ex = { offers: ['Maldives early-bird 4th night free', 'Maldives', '4999', 'AED', '2027-01-31', '1 Feb – 30 Apr 2027', 'Stay 4 pay 3 at selected resorts. Seaplane transfers included.', 'https://example.com/photo.jpg', 'Yes'], itineraries: ['Sri Lanka Highlights', 'SL-7N', 'Sri Lanka', '7', '899', 'USD', '2027-10-31', 'Culture, tea country and beach in one week.', '1', 'Arrival in Colombo', 'Meet and greet at the airport, transfer to Negombo.', 'Negombo', 'Dinner', 'https://example.com/day1.jpg', 'Jetwing Lagoon; Earl\'s Regency', 'Private car and driver guide', 'Flights', 'Yes'], dayplans: ['Colombo to Kandy', 'Sri Lanka', 'Kandy', 'Kandy', 'Breakfast, Dinner', 'Drive to Kandy via the Pinnawala elephant orphanage. Evening visit to the Temple of the Tooth.', 'https://example.com/kandy.jpg'] }[kind]; download(kind + '-template.csv', csv([SHEET_COLS[kind], ex])); },
  async delRates(_, btn) { const f = UI.filter; let r = S.rates.filter(x => (UI.rateTypes || []).includes(x.type)); const q = ($('#q')?.value || '').toLowerCase(); if (f.rdest) r = r.filter(x => x.destination === f.rdest); if (q) r = r.filter(x => JSON.stringify(x).toLowerCase().includes(q)); if (!confirmBtn(btn, `Click again to delete ${r.length} rates`)) return; let batch = writeBatch(db), n = 0; for (const x of r) { batch.delete(doc(db, 'rates', x.id)); if (++n >= 400) { await batch.commit(); batch = writeBatch(db); n = 0; } } if (n) await batch.commit(); toast(r.length + ' rates deleted'); },
  async saveItin() { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } if ((r.program || []).length) { r.days = programText(r); if (!r.nights) r.nights = Math.max(0, r.program.length - 1); } const id = await save('itineraries', r); if (id && !r.id) location.hash = '#/itinerary/' + id; },
  async publishItin(f) { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } if ((r.program || []).length) r.days = programText(r); r.published = f === '1'; const id = await save('itineraries', r, { silent: true }); if (id) { r.id = id; toast(r.published ? 'Published to the agent portal' : 'Unpublished'); render(); } },
  async saveOffer() { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } const id = await save('offers', r); if (id && !r.id) location.hash = '#/offer/' + id; },
  async publishOffer(f) { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } r.published = f === '1'; const id = await save('offers', r, { silent: true }); if (id) { r.id = id; toast(r.published ? 'Published to the agent portal' : 'Unpublished'); render(); } },
  async saveRequest() { if (await save('requests', UI.edit.rec)) location.hash = '#/requests'; },
  reqToQuote() { location.hash = '#/quote/new?req=' + UI.edit.rec.id; },
  editAccess(id) { const u = S.users.find(x => x.id === id); if (!u) return;
    openModal('Access — ' + (u.name || u.email), `<div style="display:grid;gap:14px"><label style="max-width:240px">Role<select id="roleEdit">${ROLES.map(([v, l]) => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><div id="accessEdit">${accessFields(u)}</div>
      <div class="row"><span class="sp"></span><button class="btn" data-act="closeModal">Cancel</button><button class="btn p" data-act="saveAccess" data-id="${esc(id)}">Save access</button></div></div>`); },
  async saveAccess(id) { const u = S.users.find(x => x.id === id); if (!u) return; const role = $('#roleEdit').value; const acc = readAccess($('#mbody'), role);
    if (!acc.companies.length && ![...$('#mbody').querySelectorAll('input[name=co]:checked')].length) { toast('Tick at least one company'); return; }
    if (await save('users', { ...u, role, ...acc }, { silent: true })) { closeModal(); toast('Access updated'); } },
  async resetPw(id) { const u = S.users.find(x => x.id === id); if (!u) return; try { await sendPasswordResetEmail(auth, u.email); toast('Password email sent to ' + u.email); } catch (e) { toast('Could not send: ' + (e.code || '')); } },
  async toggleUser(id, btn) { const u = S.users.find(x => x.id === id); if (!u) return; if (u.active !== false && !confirmBtn(btn, 'Click again to suspend')) return; await save('users', { ...u, active: u.active === false }, { silent: true }); toast(u.active === false ? 'Reactivated' : 'Suspended'); },
  addCo() { collectSettings(); S.settings.companies.push({ id: 'co' + Date.now().toString(36), name: '', currency: 'AED' }); render(); },
  rmCo(i, btn) { if (!confirmBtn(btn, 'Click again to remove')) return; collectSettings(); S.settings.companies.splice(+i, 1); render(); },
  async saveSettings() { collectSettings(); try { await setDoc(doc(db, 'settings', 'main'), clone(S.settings)); toast('Settings saved'); } catch (e) { toast('Could not save: ' + (e.code || '')); } },
});
function collectSettings() {
  if (!S.settings) S.settings = { companies: [], fx: { AED: 1, USD: 3.6725 }, markup: 15 };
  document.querySelectorAll('[data-co]').forEach(el => { const c = S.settings.companies[+el.dataset.co]; if (c) c[el.dataset.k] = el.value; });
  S.settings.fx = S.settings.fx || {}; document.querySelectorAll('.fxin').forEach(el => { if (el.value !== '') S.settings.fx[el.dataset.cur] = num(el.value); else delete S.settings.fx[el.dataset.cur]; });
  const m = $('#dMarkup'); if (m) S.settings.markup = num(m.value); const im = $('#iMarkup'); if (im) S.settings.interMarkup = num(im.value); const fd = $('#fxDate'); if (fd) S.settings.fxDate = fd.value; const gc = $('#gClient'); if (gc) S.settings.googleClientId = gc.value.trim();
}
document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  const t = e.target.closest('[data-act]'); if (t) { if (t.tagName === 'A') e.preventDefault(); if (S.me?._preview && ['slSave', 'saveBrand', 'visaSend', 'hsSend', 'newReqSubmit'].includes(t.dataset.act)) { toast('Preview only: this works for the agent'); return; } A[t.dataset.act]?.(t.dataset.id, t, e); return; }
  const g = e.target.closest('[data-go]'); if (g && !e.target.closest('button,a,input,select')) location.hash = '#/' + g.dataset.go;
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); if (e.key === 'Enter' && !e.shiftKey && e.target.closest?.('#chatForm')) { e.preventDefault(); $('#chatForm').requestSubmit(); } });

/* ---------- forms ---------- */
document.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target; const fd = Object.fromEntries(new FormData(f));
  if (f.id === 'loginForm') { $('#loginErr').textContent = ''; try { await signInWithEmailAndPassword(auth, fd.email.trim(), fd.password); } catch (x) { $('#loginErr').textContent = /invalid|wrong|not-found/.test(x.code || '') ? 'Email or password is not right.' : 'Could not sign in: ' + (x.code || x.message); } return; }
  if (f.id === 'newLogin') {
    const data = Object.fromEntries([...f.querySelectorAll('[data-f]')].map(el => [el.dataset.f, el.value.trim()]));
    const isAgent = 'agentId' in data; if (isAgent && !data.agentId) { toast('Choose the agent company'); return; }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const pw = Array.from(crypto.getRandomValues(new Uint8Array(18)), b => 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#%'[b % 57]).join('');
      const uid = await createLogin(data.email, pw);
      const access = isAgent ? {} : readAccess(f, data.role);
      await setDoc(doc(db, 'users', uid), { email: data.email.toLowerCase(), name: data.name, role: isAgent ? 'agent' : data.role, agentId: isAgent ? data.agentId : '', active: true, ...access, createdAt: new Date().toISOString(), createdBy: S.user.uid });
      await sendPasswordResetEmail(auth, data.email);
      toast('Login created. A set-password email went to ' + data.email); f.reset();
    } catch (x) { toast(x.code === 'auth/email-already-in-use' ? 'That email already has a login' : 'Could not create: ' + (x.code || x.message)); }
    btn.disabled = false; btn.textContent = 'Create login'; return;
  }
  if (f.id === 'chatForm') { const text = f.querySelector('textarea').value; const atts = UI.atts || []; if (!text.trim() && !atts.length) return; f.querySelector('textarea').value = ''; UI.atts = []; drawPend(); await send(text, atts); return; }
  if (f.id === 'newChannel') { const id = await newChannel(fd.name || ''); if (id) location.hash = '#/chat/' + id; return; }
  if (f.id === 'linkForm') { if (!/^https:\/\//.test(fd.url)) { toast('Use a link that starts with https://'); return; } (UI.atts = UI.atts || []).push({ kind: 'link', url: fd.url, name: fd.name || 'Shared link' }); closeModal(); drawPend(); return; }
  if (f.id === 'taskForm') { const id = await save('tasks', { title: fd.title, notes: fd.notes, assignee: fd.assignee, due: fd.due, ref: fd.ref, refType: fd.refType, refLabel: fd.refLabel, channel: fd.channel, status: 'Open', by: S.user.uid }, { silent: true });
    if (id) { closeModal(); toast('Task created for ' + (S.users.find(u => u.id === fd.assignee)?.name || 'teammate')); if (fd.channel && chatState.open === fd.channel) send(`Task for ${S.users.find(u => u.id === fd.assignee)?.name || 'teammate'}: ${fd.title}${fd.due ? ' (due ' + fd.due + ')' : ''}`); } return; }
  if (f.id === 'leaveForm') { const me = myEmployee(); if (!me) return; const d = Object.fromEntries([...f.querySelectorAll('[data-f]')].map(el => [el.dataset.f, el.value])); if (!d.from || !d.to || d.to < d.from) { toast('Check the dates'); return; }
    if (await save('leaves', { employeeId: me.id, userId: S.user.uid, type: d.type, from: d.from, to: d.to, reason: d.reason, status: 'Pending', days: leaveDays(d) }, { silent: true })) { toast('Leave request sent'); f.reset(); } return; }
  if (f.id === 'reqForm') {
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const it = S.itineraries.find(i => i.id === fd.itineraryId);
    const id = await save('requests', { ...fd, destination: fd.destination || it?.destination || '', adults: num(fd.adults), children: num(fd.children), agentId: S.me.agentId, byName: S.me.name || S.me.email, status: 'New request' }, { silent: true });
    if (id) { toast('Request sent. We will reply here soon.'); location.hash = '#/requests'; } else btn.disabled = false;
  }
});
