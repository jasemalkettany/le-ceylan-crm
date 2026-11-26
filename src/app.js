import { auth, db, doc, getDoc, setDoc, writeBatch, collection, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createLogin } from './fb.js';
import { S, UI, $, esc, num, fmt, today, addDays, toast, clone, cfg, coById, agentName, supName, isStaff, isAdmin, curCo, totals, lineCalc, save, remove, nextNo, savePortalCopy, startData, stopAll,
  openModal, closeModal, confirmBtn, download, csv, routeArt, LINE_TYPES } from './core.js';
import { V, EDIT, ratePicker, totHTML } from './staff.js';
import { RATE_COLS } from './admin.js';
import { P } from './portal.js';
import { buildDoc, statement, showDoc, printDoc } from './docs.js';

const root = $('#root');
const ICON = {
  dashboard: 'M3 12l9-8 9 8M5 10v10h14V10', inquiries: 'M4 4h16v12H7l-3 3z', quotes: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5', requests: 'M4 12h16M12 4v16', bookings: 'M4 6h16v14H4zM8 3v6M16 3v6M4 11h16',
  rates: 'M4 19V9M10 19V5M16 19v-7M22 19H2', itineraries: 'M5 19c3-10 11-4 14-14M5 19h.01M19 5h.01', offers: 'M3 12l9-9 9 9-9 9zM12 8v8', agents: 'M8 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 6-6s6 2 6 6M17 11a3 3 0 100-6M22 21c0-3-2-5-4-5.5',
  suppliers: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6', finance: 'M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', users: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6', settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7 5 11l2 1v1l-2 1 2 4 2-.5 1.5 1L11 22h4l.5-2.5 1.5-1 2 .5 2-4-2-1z',
  home: 'M3 12l9-8 9 8M5 10v10h14V10', account: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
};
const ico = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k] || ICON.dashboard}"/></svg>`;
const STAFF_NAV = [['Overview', [['dashboard', 'Dashboard']]], ['Sales', [['inquiries', 'Inquiries'], ['quotes', 'Quotations'], ['requests', 'Portal requests']]], ['Operations', [['bookings', 'Bookings']]], ['Products', [['rates', 'Rates'], ['itineraries', 'Itineraries'], ['offers', 'Portal offers']]], ['Contacts', [['agents', 'Travel agents'], ['suppliers', 'Suppliers']]], ['Money', [['finance', 'Finance']]], ['Admin', [['users', 'Users and logins'], ['settings', 'Settings']]]];
const AGENT_NAV = [['Portal', [['home', 'Offers'], ['itineraries', 'Itineraries'], ['requests', 'My requests'], ['bookings', 'My bookings'], ['account', 'My account']]]];
const EDIT_COL = { inquiry: 'inquiries', quote: 'quotes', booking: 'bookings', agent: 'agents', supplier: 'suppliers', rate: 'rates', itinerary: 'itineraries', offer: 'offers', request: 'requests' };

/* ---------- auth ---------- */
function loginView(msg = '') {
  root.innerHTML = `<div class="login"><form id="loginForm"><div class="logo">Le Ceylan</div><h2>Sign in</h2>
  <label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label>
  <div class="err" id="loginErr">${esc(msg)}</div><button class="btn p" type="submit" style="justify-content:center">Sign in</button><button class="btn" type="button" data-act="forgot" style="justify-content:center;border:0">Forgot password?</button></form></div>`;
}
onAuthStateChanged(auth, async user => {
  stopAll(); S.user = user; S.me = null; UI.edit = null;
  if (!user) { loginView(); return; }
  root.innerHTML = '<div class="boot">Opening your workspace…</div>';
  try {
    const ref = doc(db, 'users', user.uid); const s = await getDoc(ref);
    if (!s.exists()) { await signOut(auth); loginView('This login is not set up yet. Ask your account manager.'); return; }
    S.me = { id: s.id, ...s.data() };
    if (S.me.active === false) { await signOut(auth); loginView('This login is suspended.'); return; }
  } catch (e) { console.error(e); await signOut(auth); loginView('Could not open your workspace: ' + (e.code || e.message)); return; }
  shell(); startData(onData);
  if (!location.hash || location.hash === '#/') location.hash = isStaff() ? '#/dashboard' : '#/home'; else route();
});

/* ---------- shell and routing ---------- */
function shell() {
  const nav = isStaff() ? STAFF_NAV : AGENT_NAV;
  root.innerHTML = `<div class="shell"><nav class="side" id="side"><div class="logo">${isStaff() ? 'Le Ceylan' : esc(S.myAgent?.name || 'Agent portal')}</div>
  ${nav.map(([g, items]) => `<h4>${g}</h4>` + items.filter(([k]) => !(k === 'settings' && !isAdmin())).map(([k, l]) => `<a href="#/${k}" data-nav="${k}">${ico(k)}<span>${l}</span>${k === 'requests' && isStaff() ? '<span class="badge" id="reqBadge" hidden></span>' : ''}</a>`).join('')).join('')}
  <div class="me"><b>${esc(S.me.name || S.me.email)}</b>${esc(isStaff() ? S.me.role : 'Travel agent')}<br><button data-act="logout">Sign out</button></div></nav>
  <div><div class="top"><button class="btn s menu-btn" data-act="menu" aria-label="Menu">☰</button><h1 id="title"></h1>${isStaff() ? `<select id="coSel" style="width:auto;min-width:190px" aria-label="Company"></select>` : ''}<input id="q" placeholder="Search…" style="width:200px" aria-label="Search"></div><main id="main"><div class="empty">Loading…</div></main></div></div>`;
  $('#q').addEventListener('input', () => { if (!UI.edit) render(); });
  $('#coSel')?.addEventListener('change', e => { try { localStorage.setItem('lc_co', e.target.value); } catch (x) { } render(); });
}
function fillCo() { const s = $('#coSel'); if (!s) return; const v = curCo(); s.innerHTML = '<option value="">All companies</option>' + cfg().companies.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''); s.value = v; }
function parseHash() { const h = (location.hash || '').replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const [name, id] = path.split('/'); const params = Object.fromEntries(new URLSearchParams(qs || '')); return { name: name || '', id, params }; }
let current = {};
function route() {
  if (!S.me) return; current = parseHash(); UI.edit = null; closeModal();
  $('#side')?.classList.remove('open');
  if (isStaff() && EDIT_COL[current.name]) startEdit();
  render(); scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
function startEdit() {
  const { name, id, params } = current; const col = EDIT_COL[name];
  if (id && id !== 'new') { const r = S[col].find(x => x.id === id); if (!r) { UI.edit = { kind: name, col, waiting: id }; return; } UI.edit = { kind: name, col, rec: clone(r) }; }
  else UI.edit = { kind: name, col, rec: blank(name, params) };
  const r = UI.edit.rec; if (r && ['quote', 'booking'].includes(name)) { r.lines = r.lines || []; r.payments = r.payments || []; }
}
function blank(kind) {
  const co = curCo() || cfg().companies[0]?.id || ''; const cur = coById(co).currency || 'AED';
  return ({ inquiry: { company: co, status: 'New', source: 'Email', adults: 2, children: 0, destination: 'Sri Lanka' }, quote: { company: co, currency: cur, status: 'Draft', option: 'Option A', adults: 2, children: 0, lines: [], destination: 'Sri Lanka' },
    agent: { company: co, currency: 'USD', creditDays: 0 }, supplier: { type: 'Hotel', currency: 'USD', destination: 'Sri Lanka' }, rate: { type: 'Hotel', currency: 'USD', unit: 'per room per night', meal: 'BB', destination: 'Sri Lanka' },
    itinerary: { destination: 'Sri Lanka', currency: 'USD', published: false }, offer: { destination: 'Sri Lanka', currency: 'AED', published: false } })[kind] || {};
}
function onData() {
  fillCo();
  const b = $('#reqBadge'); if (b) { const n = S.requests.filter(r => (r.status || 'New request') === 'New request').length; b.hidden = !n; b.textContent = n; }
  if (UI.edit?.waiting) { const r = S[UI.edit.col].find(x => x.id === UI.edit.waiting); if (r) { startEdit(); render(); } return; }
  if (UI.edit) return; // never re-render under someone typing
  if (!isStaff()) { const bm = document.querySelector('.side .logo'); if (bm && S.myAgent) bm.textContent = S.myAgent.name; }
  render();
}
function render() {
  const m = $('#main'); if (!m) return; const { name, id, params } = current;
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === name || (EDIT_COL[name] && a.dataset.nav === EDIT_COL[name])));
  if (isStaff()) {
    if (!S.loaded.settings) { m.innerHTML = '<div class="empty">Loading…</div>'; return; }
    if (!cfg().companies.length && name !== 'settings') { $('#title').textContent = 'Welcome'; m.innerHTML = `<div class="card empty">Add your companies first. <a href="#/settings">Open Settings</a></div>`; return; }
    if (UI.edit) { $('#title').textContent = UI.edit.rec ? ({ inquiry: 'Inquiry', quote: 'Quotation', booking: 'Booking', agent: 'Travel agent', supplier: 'Supplier', rate: 'Rate', itinerary: 'Itinerary', offer: 'Portal offer', request: 'Portal request' })[UI.edit.kind] : 'Loading…'; m.innerHTML = UI.edit.rec ? EDIT[UI.edit.kind](UI.edit.rec) : '<div class="empty">Loading…</div>'; return; }
    const v = V[name] || V.dashboard; $('#title').textContent = v.title; m.innerHTML = v.render(id);
  } else {
    let v = P[name] || P.home, arg = id; if (name === 'request' && id === 'new') { v = P.newRequest; arg = params; }
    $('#title').textContent = v.title; m.innerHTML = v.render(arg);
  }
  bindPage();
}

/* ---------- editing ---------- */
function store(el) { const r = UI.edit?.rec; if (!r) return;
  if (el.dataset.f) r[el.dataset.f] = el.value;
  else if (el.dataset.l != null && r.lines?.[+el.dataset.l]) r.lines[+el.dataset.l][el.dataset.k] = el.value;
  else if (el.dataset.p != null && r.payments?.[+el.dataset.p]) r.payments[+el.dataset.p][el.dataset.k] = el.value; }
function updateCalc() { const r = UI.edit?.rec; if (!r?.lines) return; const qc = r.currency || 'AED';
  r.lines.forEach((l, i) => { const el = document.getElementById('lc' + i); if (!el) return; const c = lineCalc(l, qc); el.innerHTML = isNaN(c.cost) ? '<span class="tag bad">no rate</span>' : esc(fmt(c.cost, qc)); const so = document.querySelector(`[data-l="${i}"][data-k="sellOverride"]`); if (so) so.placeholder = isNaN(c.sell) ? '' : c.sell.toFixed(2); });
  const tb = document.getElementById('totbox'); if (tb) tb.innerHTML = totHTML(r); }
document.addEventListener('input', e => { if (!UI.edit || !e.target.closest('#main')) return; store(e.target); if (e.target.dataset.l != null || ['discount', 'adults', 'children'].includes(e.target.dataset.f)) updateCalc(); });
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.filter) { UI.filter[el.dataset.filter] = el.value; render(); return; }
  if (el.dataset.actChange === 'useItin') { const it = S.itineraries.find(x => x.id === el.value); if (it && UI.edit?.rec) { Object.assign(UI.edit.rec, { itinerary: it.days || '', inclusions: it.inclusions || UI.edit.rec.inclusions || '', exclusions: it.exclusions || UI.edit.rec.exclusions || '' }); render(); toast('Itinerary copied'); } return; }
  if (el.id === 'rateFile' && el.files[0]) { readRates(el.files[0]); return; }
  if (el.id === 'itinFile' && el.files[0]) { readItin(el.files[0]); return; }
  if (!UI.edit || !el.closest('#main')) return;
  store(el);
  if (el.tagName === 'SELECT' && ((el.dataset.l != null && ['type', 'costCur'].includes(el.dataset.k)) || el.dataset.f === 'currency')) render(); else updateCalc();
});
function bindPage() {
  const d = $('#drop'); if (!d) return;
  d.ondragover = e => { e.preventDefault(); d.classList.add('over'); }; d.ondragleave = () => d.classList.remove('over');
  d.ondrop = e => { e.preventDefault(); d.classList.remove('over'); const f = e.dataTransfer.files[0]; if (!f) return; if ($('#rateFile')) readRates(f); else readItin(f); };
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
      if (!sid) { const ref = doc(collection(db, 'suppliers')); sid = ref.id; supByName.set(k, sid); batch.set(ref, { name: r.supplier, type: r.type === 'Hotel' ? 'Hotel' : r.type === 'Transfer' ? 'Transport' : r.type === 'Guide' ? 'Guide' : 'Activity', destination: r.destination, city: r.city, currency: r.currency, createdAt: now, updatedAt: now, createdBy: S.user.uid }); n++; }
      batch.set(doc(collection(db, 'rates')), { ...r, supplierId: sid, createdAt: now, updatedAt: now, createdBy: S.user.uid }); n++;
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

/* ---------- QuickBooks CSV ---------- */
const qd = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
function qbExport(kind) {
  const co = curCo(); if (!co && kind !== 'cust') { toast('Choose one company at the top first'); return; }
  const from = $('#qbFrom').value, to = $('#qbTo').value; const inR = d => (!from || d >= from) && (!to || d <= to);
  const bk = S.bookings.filter(b => b.company === co && b.status !== 'Cancelled'); const short = coById(co).short || 'all'; let rows;
  if (kind === 'inv') { rows = [['*InvoiceNo', '*Customer', '*InvoiceDate', '*DueDate', 'Memo', 'Item(Product/Service)', 'ItemDescription', 'ItemQuantity', 'ItemRate', '*ItemAmount', 'Currency']];
    bk.filter(b => inR(b.invoiceDate || '')).forEach(b => { (b.lines || []).forEach(l => { const c = lineCalc(l, b.currency); rows.push([b.invoiceNo, agentName(b.agent), qd(b.invoiceDate), qd(b.dueDate || b.invoiceDate), `${b.no} ${b.lead || ''}`, 'Tour package - ' + l.type, (l.desc || l.type) + (l.date ? ' ' + l.date : ''), 1, c.sell.toFixed(2), c.sell.toFixed(2), b.currency]); }); if (num(b.discount)) rows.push([b.invoiceNo, agentName(b.agent), qd(b.invoiceDate), qd(b.dueDate || b.invoiceDate), b.no, 'Discount', 'Discount', 1, (-num(b.discount)).toFixed(2), (-num(b.discount)).toFixed(2), b.currency]); }); }
  if (kind === 'pay') { rows = [['Date', 'Customer', 'InvoiceNo', 'Amount', 'PaymentMethod', 'Reference', 'Currency']]; bk.forEach(b => (b.payments || []).filter(p => inR(p.date || '')).forEach(p => rows.push([qd(p.date), agentName(b.agent), b.invoiceNo, num(p.amount).toFixed(2), p.method, p.ref, b.currency]))); }
  if (kind === 'bills') { rows = [['BillNo', 'Supplier', 'BillDate', 'DueDate', 'Account', 'LineDescription', 'LineAmount', 'Currency']]; bk.filter(b => inR(b.arrival || '')).forEach(b => (b.lines || []).forEach((l, i) => { if (!l.supplier) return; const c = lineCalc(l, b.currency); rows.push([`${b.no}-${i + 1}`, supName(l.supplier), qd(l.date || b.arrival), qd(l.date || b.arrival), 'Cost of sales - ' + l.type, `${l.desc || ''}${l.conf ? ' Conf ' + l.conf : ''}`, c.costLocal.toFixed(2), l.costCur || b.currency]); })); }
  if (kind === 'cust') { rows = [['Name', 'Company', 'Email', 'Phone', 'Billing Address', 'Currency', 'Tax Reg No']]; S.agents.filter(a => !co || a.company === co).forEach(a => rows.push([a.name, a.name, a.email, a.phone, (a.address || '').replace(/\n/g, ' '), a.currency, a.trn])); }
  if (rows.length < 2) { toast('Nothing in this date range'); return; }
  download(`quickbooks-${kind}-${short}-${today()}.csv`, csv(rows));
}

/* ---------- actions ---------- */
const A = {
  menu() { $('#side').classList.toggle('open'); },
  logout() { signOut(auth); location.hash = ''; },
  async forgot() { const em = document.querySelector('#loginForm [name=email]').value.trim(); if (!em) { $('#loginErr').textContent = 'Type your email first.'; return; } try { await sendPasswordResetEmail(auth, em); } catch (e) { } $('#loginErr').textContent = 'If that email has a login, a reset link is on its way.'; },
  async myReset() { try { await sendPasswordResetEmail(auth, S.me.email); toast('Reset link sent to ' + S.me.email); } catch (e) { toast('Could not send the email'); } },
  closeModal, printDoc,
  filter(id, el) { UI.filter[el.dataset.k] = id; render(); },
  tab(id, el) { UI.tab[el.dataset.k] = id; render(); },
  doc(kind) { showDoc(buildDoc(kind, UI.edit.rec)); },
  agentDoc(id, el) { const b = S.bookings.find(x => x.id === id); if (b) showDoc(buildDoc(el.dataset.k, b)); },
  stmt() { const a = $('#stmtAgent').value; if (!a) { toast('Choose an agent'); return; } showDoc(statement(a)); },
  qb(kind) { qbExport(kind); },
  quoteFrom(id) {
    const i = S.inquiries.find(x => x.id === id) || UI.edit?.rec; if (!i) return;
    const { id: _, no, status, createdAt, updatedAt, createdBy, notes, source, owner, ...rest } = i;
    location.hash = '#/quote/new'; // route() builds a blank quote; we then fill it from the inquiry
    setTimeout(() => { if (UI.edit?.kind !== 'quote') return; Object.assign(UI.edit.rec, rest, { inquiry: i.id, request: notes || '', currency: S.agents.find(a => a.id === i.agent)?.currency || coById(i.company).currency || 'AED' }); render(); }, 0);
  },
  async saveInquiry() { const r = UI.edit.rec; if (!r.no) r.no = await nextNo('inq', 'INQ-'); const id = await save('inquiries', r); if (id) location.hash = '#/inquiries'; },
  addLine(type) { const r = UI.edit.rec; const last = r.lines[r.lines.length - 1]; r.lines.push({ type, date: last?.date || r.arrival || '', qty: type === 'Hotel' || type === 'Transfer' ? 1 : (num(r.adults) + num(r.children)) || 1, units: 1, unitCost: '', costCur: r.currency, markup: cfg().markup ?? 15, meal: type === 'Hotel' ? 'BB' : '' }); render(); },
  rmLine(i) { UI.edit.rec.lines.splice(+i, 1); render(); },
  pickRates() { openModal('Add from your rates', `<div id="rpBody">${ratePicker(UI.edit.rec)}</div>`); const upd = () => { $('#rpBody').innerHTML = ratePicker(UI.edit.rec, $('#rpq').value, $('#rpt').value); wire(); const q = $('#rpq'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }; const wire = () => { $('#rpq').oninput = upd; $('#rpt').onchange = upd; }; wire(); },
  addRate(id) {
    const x = S.rates.find(r => r.id === id); const r = UI.edit.rec; if (!x) return;
    const last = r.lines.filter(l => l.date).slice(-1)[0];
    const nights = x.type === 'Hotel' && r.arrival && r.departure ? Math.max(1, Math.round((new Date(r.departure) - new Date(r.arrival)) / 864e5)) : 1;
    r.lines.push({ type: x.type, date: last ? addDays(last.date, num(last.type === 'Hotel' ? last.units : 0)) : r.arrival || '', supplier: x.supplierId || '', desc: x.service, meal: x.meal || '', qty: x.type === 'Hotel' ? 1 : (/person|pax/i.test(x.unit || '') ? (num(r.adults) + num(r.children)) || 1 : 1), units: nights, unitCost: x.cost, costCur: x.currency, markup: cfg().markup ?? 15, rateId: x.id });
    closeModal(); render(); toast('Added: ' + x.service);
  },
  async saveQuote() { const r = UI.edit.rec; if (!r.no) r.no = await nextNo('qt', 'QT-'); const id = await save('quotes', r); if (!id) return; if (!r.id) { r.id = id; history.replaceState(null, '', '#/quote/' + id); current = parseHash(); }
    if (r.inquiry) { const i = S.inquiries.find(x => x.id === r.inquiry); if (i && ['New', 'Working'].includes(i.status || 'New')) await save('inquiries', { ...i, status: 'Quoted' }, { silent: true }); } render(); },
  dupQuote() { const r = clone(UI.edit.rec); delete r.id; delete r.createdAt; delete r.createdBy; r.status = 'Draft'; const o = (r.option || 'Option A').match(/([A-Z])$/); r.option = o ? 'Option ' + String.fromCharCode(o[1].charCodeAt(0) + 1) : 'Option B'; UI.edit.rec = r; history.replaceState(null, '', '#/quote/new'); current = parseHash(); toast('Copied as ' + r.option + '. Change it, then Save'); render(); },
  async toBooking() {
    const q = UI.edit.rec; if (!q.agent) { toast('Choose an agent first'); return; }
    const ex = S.bookings.find(b => b.quote === q.id); if (ex) { location.hash = '#/booking/' + ex.id; return; }
    const { id, no, status, option, validUntil, createdAt, updatedAt, createdBy, ...rest } = q;
    const ag = S.agents.find(a => a.id === q.agent);
    const b = { ...rest, quote: q.id, quoteNo: no, status: 'Confirmed', payments: [], no: await nextNo('tour', (coById(q.company).short || 'LC') + '-'), invoiceNo: await nextNo('inv', 'INV-'), invoiceDate: today(), dueDate: addDays(today(), num(ag?.creditDays)) };
    const nid = await save('bookings', b, { silent: true }); if (!nid) return;
    await savePortalCopy({ ...b, id: nid });
    await save('quotes', { ...q, status: 'Accepted' }, { silent: true });
    if (q.inquiry) { const i = S.inquiries.find(x => x.id === q.inquiry); if (i) await save('inquiries', { ...i, status: 'Confirmed' }, { silent: true }); }
    toast('Booking ' + b.no + ' created'); location.hash = '#/booking/' + nid;
  },
  addPay() { UI.edit.rec.payments.push({ date: today(), amount: '', method: 'Bank transfer', ref: '' }); render(); },
  rmPay(i) { UI.edit.rec.payments.splice(+i, 1); render(); },
  async saveBooking() { const id = await save('bookings', UI.edit.rec); if (id) { await savePortalCopy(UI.edit.rec); render(); } },
  async saveSimple(col) { if (!UI.edit.rec.name) { toast('Name is needed'); return; } const id = await save(col, UI.edit.rec); if (id) location.hash = '#/' + col; },
  async delRec(col, btn) { if (!confirmBtn(btn, 'Click again to delete')) return; const id = UI.edit.rec.id; if (await remove(col, id)) { if (col === 'bookings') remove('portalBookings', id); location.hash = '#/' + col; } },
  async saveRate() { const r = UI.edit.rec; if (!r.supplier || !r.service) { toast('Supplier and service are needed'); return; } const s = S.suppliers.find(x => (x.name || '').toLowerCase() === r.supplier.toLowerCase()); if (s) r.supplierId = s.id; else { const sid = await save('suppliers', { name: r.supplier, type: r.type === 'Hotel' ? 'Hotel' : 'Other', destination: r.destination, currency: r.currency }, { silent: true }); r.supplierId = sid; } r.cost = num(r.cost); if (await save('rates', r)) location.hash = '#/rates'; },
  rateTemplate() { download('rates-template.csv', csv([RATE_COLS, ['Hotel', 'Sri Lanka', 'Kandy', 'Earl\'s Regency', 'Deluxe Room', 'BB', '2026-11-01', '2027-04-30', '120', 'USD', 'per room per night', 'Extra bed USD 35'], ['Transfer', 'Sri Lanka', 'Colombo', 'Island Cabs', 'Airport to Negombo - car', '', '2026-11-01', '2027-10-31', '25', 'USD', 'per car', ''], ['Activity', 'Bali', 'Ubud', 'Bali Swing', 'Swing with lunch', '', '2026-11-01', '2027-10-31', '450000', 'IDR', 'per person', '']])); },
  importRates,
  async delRates(_, btn) { const f = UI.filter; let r = S.rates; const q = ($('#q')?.value || '').toLowerCase(); if (f.rdest) r = r.filter(x => x.destination === f.rdest); if (f.rtype) r = r.filter(x => x.type === f.rtype); if (q) r = r.filter(x => JSON.stringify(x).toLowerCase().includes(q)); if (!confirmBtn(btn, `Click again to delete ${r.length} rates`)) return; let batch = writeBatch(db), n = 0; for (const x of r) { batch.delete(doc(db, 'rates', x.id)); if (++n >= 400) { await batch.commit(); batch = writeBatch(db); n = 0; } } if (n) await batch.commit(); toast(r.length + ' rates deleted'); },
  async saveItin() { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } const id = await save('itineraries', r); if (id && !r.id) location.hash = '#/itinerary/' + id; },
  async publishItin(f) { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } r.published = f === '1'; const id = await save('itineraries', r, { silent: true }); if (id) { r.id = id; toast(r.published ? 'Published to the agent portal' : 'Unpublished'); render(); } },
  async saveOffer() { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } const id = await save('offers', r); if (id && !r.id) location.hash = '#/offer/' + id; },
  async publishOffer(f) { const r = UI.edit.rec; if (!r.title) { toast('Title is needed'); return; } r.published = f === '1'; const id = await save('offers', r, { silent: true }); if (id) { r.id = id; toast(r.published ? 'Published to the agent portal' : 'Unpublished'); render(); } },
  async saveRequest() { if (await save('requests', UI.edit.rec)) location.hash = '#/requests'; },
  async reqToInquiry() {
    const q = UI.edit.rec; const ag = S.agents.find(a => a.id === q.agentId);
    const inq = { no: await nextNo('inq', 'INQ-'), company: ag?.company || curCo() || cfg().companies[0]?.id, agent: q.agentId, source: 'Portal', status: 'Working', lead: q.lead || '', adults: q.adults, children: q.children, childAges: q.childAges || '', nationality: q.nationality, arrival: q.arrival, departure: q.departure, destination: q.destination || S.itineraries.find(i => i.id === q.itineraryId)?.destination || '', agentRef: q.agentRef || '', notes: `${q.title ? q.title + '\n' : ''}${q.notes || ''}` };
    const id = await save('inquiries', inq, { silent: true }); if (!id) return;
    await save('requests', { ...q, inquiry: id, status: 'In progress' }, { silent: true }); toast('Inquiry ' + inq.no + ' created'); location.hash = '#/inquiry/' + id;
  },
  async resetPw(id) { const u = S.users.find(x => x.id === id); if (!u) return; try { await sendPasswordResetEmail(auth, u.email); toast('Password email sent to ' + u.email); } catch (e) { toast('Could not send: ' + (e.code || '')); } },
  async toggleUser(id, btn) { const u = S.users.find(x => x.id === id); if (!u) return; if (u.active !== false && !confirmBtn(btn, 'Click again to suspend')) return; await save('users', { ...u, active: u.active === false }, { silent: true }); toast(u.active === false ? 'Reactivated' : 'Suspended'); },
  addCo() { collectSettings(); S.settings.companies.push({ id: 'co' + Date.now().toString(36), name: '', currency: 'AED' }); render(); },
  rmCo(i, btn) { if (!confirmBtn(btn, 'Click again to remove')) return; collectSettings(); S.settings.companies.splice(+i, 1); render(); },
  async saveSettings() { collectSettings(); try { await setDoc(doc(db, 'settings', 'main'), clone(S.settings)); toast('Settings saved'); } catch (e) { toast('Could not save: ' + (e.code || '')); } },
};
function collectSettings() {
  if (!S.settings) S.settings = { companies: [], fx: { AED: 1, USD: 3.6725 }, markup: 15 };
  document.querySelectorAll('[data-co]').forEach(el => { const c = S.settings.companies[+el.dataset.co]; if (c) c[el.dataset.k] = el.value; });
  S.settings.fx = S.settings.fx || {}; document.querySelectorAll('.fxin').forEach(el => { if (el.value !== '') S.settings.fx[el.dataset.cur] = num(el.value); else delete S.settings.fx[el.dataset.cur]; });
  const m = $('#dMarkup'); if (m) S.settings.markup = num(m.value); const fd = $('#fxDate'); if (fd) S.settings.fxDate = fd.value;
}
document.addEventListener('click', e => {
  if (e.target.id === 'modal') { closeModal(); return; }
  const t = e.target.closest('[data-act]'); if (t) { if (t.tagName === 'A') e.preventDefault(); A[t.dataset.act]?.(t.dataset.id, t, e); return; }
  const g = e.target.closest('[data-go]'); if (g && !e.target.closest('button,a,input,select')) location.hash = '#/' + g.dataset.go;
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

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
      await setDoc(doc(db, 'users', uid), { email: data.email.toLowerCase(), name: data.name, role: isAgent ? 'agent' : data.role, agentId: isAgent ? data.agentId : '', active: true, createdAt: new Date().toISOString(), createdBy: S.user.uid });
      await sendPasswordResetEmail(auth, data.email);
      toast('Login created. A set-password email went to ' + data.email); f.reset();
    } catch (x) { toast(x.code === 'auth/email-already-in-use' ? 'That email already has a login' : 'Could not create: ' + (x.code || x.message)); }
    btn.disabled = false; btn.textContent = 'Create login'; return;
  }
  if (f.id === 'reqForm') {
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const it = S.itineraries.find(i => i.id === fd.itineraryId);
    const id = await save('requests', { ...fd, destination: fd.destination || it?.destination || '', adults: num(fd.adults), children: num(fd.children), agentId: S.me.agentId, byName: S.me.name || S.me.email, status: 'New request' }, { silent: true });
    if (id) { toast('Request sent. We will reply here soon.'); location.hash = '#/requests'; } else btn.disabled = false;
  }
});
