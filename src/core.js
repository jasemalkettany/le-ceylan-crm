import { auth, db, doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, query, where, runTransaction } from './fb.js';

export const $ = s => document.querySelector(s);
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
export const fmt = (v, c) => { const n = num(v); const d = (c === 'IDR' || c === 'LKR') ? 0 : 2; return (c === 'AED' ? 'Dh ' : (c ? c + ' ' : '')) + n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d, n) => { if (!d) return ''; const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + num(n)); return t.toISOString().slice(0, 10); };
export const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => t.style.display = 'none', 2800); };
export const clone = o => JSON.parse(JSON.stringify(o ?? null));

export const LINE_TYPES = ['Hotel', 'Transfer', 'Tour', 'Activity', 'Guide', 'Meals', 'Entrance', 'Visa', 'Flight', 'Other'];
export const MEALS = ['RO', 'BB', 'HB', 'FB', 'AI'];
export const DEST = ['Sri Lanka', 'Maldives', 'Bali', 'Indonesia', 'Thailand', 'Malaysia', 'UAE', 'Turkey', 'Lebanon', 'Philippines'];
export const CURS = ['AED', 'USD', 'EUR', 'IDR', 'LKR', 'MVR', 'THB', 'MYR', 'SAR', 'PHP'];
export const STAFF_ROLES = ['admin', 'manager', 'salesmgr', 'salesexec', 'operations', 'accountant', 'dataentry', 'staff'];
export const ROLES = [['admin', 'Admin'], ['manager', 'Manager'], ['salesmgr', 'Sales Manager'], ['salesexec', 'Sales Executive'], ['operations', 'Operations'], ['accountant', 'Accountant'], ['dataentry', 'Data Entry']];
export const roleName = r => (ROLES.find(x => x[0] === r) || [r, r === 'staff' ? 'Staff' : r])[1];
export const APPROVAL_COLS = ['rates', 'offers', 'itineraries', 'dayplans', 'suppliers'];

export const S = {
  user: null, me: null, settings: null, loaded: {},
  agents: [], suppliers: [], rates: [], dayplans: [], employees: [], leaves: [], attendance: [], tasks: [], itineraries: [], offers: [], inquiries: [], quotes: [], bookings: [], requests: [], users: [],
  myAgent: null,
};
export const UI = { edit: null, tab: {}, filter: {} };

export const cfg = () => S.settings || { companies: [], fx: { AED: 1, USD: 3.6725 }, markup: 15 };
export const isStaff = () => STAFF_ROLES.includes(S.me?.role) && S.me?.active !== false;
export const isAdmin = () => ['admin', 'manager'].includes(S.me?.role) && S.me?.active !== false;
export const coById = id => cfg().companies.find(c => c.id === id) || { name: '', currency: 'AED' };
export const agentName = id => (S.agents.find(a => a.id === id) || (S.myAgent?.id === id ? S.myAgent : {}) || {}).name || '';
export const supName = (id, l) => (S.suppliers.find(a => a.id === id) || {}).name || l?.supplierName || '';
export const userName = id => { const u = S.users.find(x => x.id === id); return u?.name || u?.email || ''; };
export const curCo = () => { let v = ''; try { v = localStorage.getItem('lc_co') || ''; } catch (e) { } const al = S.me?.companies || []; if (al.length && !al.includes(v)) return al.length === 1 ? al[0] : ''; return v; };
export const inCo = r => { if (curCo()) return !r.company || r.company === curCo(); const al = S.me?.companies; return !al?.length || !r.company || al.includes(r.company); };
export const fx = (amt, from, to) => { const r = cfg().fx || {}; if (from === to) return num(amt); const a = num(r[from]), b = num(r[to]); if (!a || !b) return NaN; return num(amt) * a / b; };
export const byNew = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '');
export const search = () => ($('#q')?.value || '').trim().toLowerCase();
export const qMatch = r => { const q = search(); if (!q) return true; return JSON.stringify(r).toLowerCase().includes(q) || agentName(r.agent).toLowerCase().includes(q); };

export function tagFor(s) {
  const ok = ['Confirmed', 'Accepted', 'Booked', 'Completed', 'Paid', 'Published', 'Active', 'Done'];
  const bad = ['Lost', 'Rejected', 'Cancelled', 'Overdue', 'Suspended', 'Declined'];
  const acc = ['Sent', 'Quoted', 'In progress', 'Under process', 'Part paid', 'Working', 'New request', 'Pending', 'Awaiting approval'];
  const gr = ['Draft', 'Expired', 'Unpaid'];
  const c = s === 'On tour' ? 'hot' : ok.includes(s) ? 'ok' : bad.includes(s) ? 'bad' : acc.includes(s) ? 'acc' : gr.includes(s) ? 'gr' : '';
  return `<span class="tag ${c}">${esc(s || 'New')}</span>`;
}

/* money — a costing has four sections, each line in its own currency */
export const ROOM_TYPES = [['SGL', 'Single', 1], ['DBL', 'Double', 2], ['TPL', 'Triple', 3], ['QUAD', 'Quad', 4], ['CWB', 'Child w/ bed', 1], ['CNB', 'Child no bed', 1], ['GUIDE', 'Guide room', 0]];
export const nightsBetween = (a, b) => (a && b) ? Math.max(0, Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5)) : 0;
export function hotelNet(h) { const n = nightsBetween(h.checkIn, h.checkOut); return ROOM_TYPES.reduce((s, [k]) => s + num(h.rooms?.[k]?.n) * num(h.rooms?.[k]?.rate) * n, 0); }
export function hotelPax(h) { return ROOM_TYPES.reduce((s, [k, , occ]) => s + num(h.rooms?.[k]?.n) * occ, 0); }
export function transportNet(t) { if (t.method === 'fixed') return num(t.qty || 1) * num(t.price); if (t.method === 'package') return num(t.pax) * num(t.price); return num(t.km) * num(t.perKm) + num(t.days) * num(t.perDay) + num(t.extras); }
export const activityNet = a => (a.per === 'group' ? 1 : num(a.pax)) * num(a.price) * Math.max(1, num(a.qty || 1));
export const miscNet = m => num(m.qty || 1) * num(m.price);
export function rateTo(cur, q) { const sc = q.currency || 'AED'; if (!cur || cur === sc) return 1; const own = num(q.fx?.[cur]); if (own) return own; const r = cfg().fx || {}; const a = num(r[cur]), b = num(r[sc]); return a && b ? a / b : NaN; }
export const SECTIONS = [['hotels', 'Hotels', hotelNet], ['transport', 'Transport & tours', transportNet], ['activities', 'Activities & entrance fees', activityNet], ['misc', 'Miscellaneous', miscNet]];
export function totals(q) {
  if (q.sellTotal != null) { const pax = Math.max(1, num(q.adults) + num(q.children)); return { net: 0, sell: num(q.sellTotal), profit: 0, perPax: num(q.sellTotal) / pax, bySec: {}, bad: false }; }
  let net = 0, bad = false; const bySec = {};
  for (const [k, , fn] of SECTIONS) {
    let s = 0; const off = (k === 'hotels' && q.hotelsIncluded === false) || (k === 'transport' && q.transportIncluded === false);
    if (!off) for (const it of q[k] || []) { const v = fn(it) * rateTo(it.currency || q.currency, q); if (isNaN(v)) bad = true; else s += v; }
    bySec[k] = s; net += s;
  }
  const pax = Math.max(1, num(q.adults) + num(q.children));
  const m = num(q.markup ?? 15);
  const profit = q.markupMethod === 'fixed' ? m : q.markupMethod === 'pp' ? m * pax : net * m / 100;
  const discount = (net + profit) * num(q.discountPct) / 100;
  const sell = net + profit - discount;
  return { net, profit, discount, sell, perPax: sell / pax, margin: sell ? (sell - net) / sell * 100 : 0, cost: net, bySec, bad };
}
// every costing line as one flat list, with its share of the selling price
export function flatLines(q) {
  if (q.flat) return q.flat;
  const t = totals(q); const ratio = t.net ? t.sell / t.net : 1; const out = [];
  const push = (sec, idx, it, type, date, desc, netLocal) => { const net = netLocal * rateTo(it.currency || q.currency, q); out.push({ sec, idx, type, date: date || '', desc, supplier: it.supplierId || '', supplierName: it.supplierName || it.name || '', meal: it.meal || '', conf: it.conf || '', paid: num(it.paid), currency: it.currency || q.currency, netLocal, net, sell: isNaN(net) ? 0 : net * ratio }); };
  if (q.hotelsIncluded !== false) (q.hotels || []).forEach((h, i) => { const n = nightsBetween(h.checkIn, h.checkOut); const rooms = ROOM_TYPES.filter(([k]) => num(h.rooms?.[k]?.n)).map(([k]) => num(h.rooms[k].n) + ' ' + k).join(', '); push('hotels', i, h, 'Hotel', h.checkIn, `${h.name || 'Hotel'}${h.category ? ' · ' + h.category : ''} · ${rooms || 'rooms'} · ${n} night${n === 1 ? '' : 's'}${h.meal ? ' · ' + h.meal : ''}`, hotelNet(h)); });
  if (q.transportIncluded !== false) (q.transport || []).forEach((t, i) => push('transport', i, t, t.method === 'package' ? 'Package' : 'Transport', t.date, t.desc || t.vehicle || 'Transport', transportNet(t)));
  (q.activities || []).forEach((a, i) => push('activities', i, a, 'Activity', a.date, a.name || 'Activity', activityNet(a)));
  (q.misc || []).forEach((m, i) => push('misc', i, m, 'Other', m.date, m.desc || 'Service', miscNet(m)));
  return out;
}
export const lineCalc = (l) => ({ cost: l.net, sell: l.sell, costLocal: l.netLocal });
export const received = b => (b.payments || []).reduce((s, p) => s + num(p.amount), 0);

/* photos: compressed in the browser and kept in the database (works on the free plan) */
const photoCache = {};
export async function compressPhoto(file, max = 1400) {
  const bmp = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let q = .78, url = c.toDataURL('image/jpeg', q); while (url.length > 850000 && q > .35) { q -= .1; url = c.toDataURL('image/jpeg', q); }
  return url;
}
export async function uploadPhotos(files) {
  const ids = [];
  for (const f of files) { if (!/^image\//.test(f.type)) continue; const data = await compressPhoto(f); const ref = doc(collection(db, 'photos')); await setDoc(ref, { data, name: f.name, createdAt: new Date().toISOString(), createdBy: S.user?.uid || '' }); photoCache[ref.id] = data; ids.push(ref.id); }
  return ids;
}
// a photo is either an uploaded id or a web address (from Excel)
export const photoTag = (p, style = '') => !p ? '' : /^https:\/\//.test(p) ? `<img src="${esc(p)}" alt="" style="${style}" loading="lazy">` : `<img data-photo="${esc(p)}" alt="" style="${style}">`;
export async function hydratePhotos(root = document) {
  for (const img of root.querySelectorAll('img[data-photo]')) {
    const id = img.dataset.photo; if (img.src && img.dataset.done) continue;
    if (!photoCache[id]) { try { const s = await getDoc(doc(db, 'photos', id)); photoCache[id] = s.exists() ? s.data().data : ''; } catch (e) { photoCache[id] = ''; } }
    if (photoCache[id]) { img.src = photoCache[id]; img.dataset.done = '1'; }
  }
}

/* day-by-day programme shared by itineraries and quotations */
export const programText = (rec) => (rec.program || []).map((d, i) => `Day ${i + 1} – ${d.title || ''}${d.description ? '\n' + d.description : ''}${d.overnight ? '\nOvernight: ' + d.overnight : ''}${d.meals ? '\nMeals: ' + d.meals : ''}`).join('\n\n');
export const dayDate = (rec, i) => rec.arrival ? addDays(rec.arrival, i) : '';
export const prettyDate = d => d ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

/* data */
const unsubs = [];
export function stopAll() { while (unsubs.length) try { unsubs.pop()(); } catch (e) { } }
function sub(name, q, onData) {
  unsubs.push(onSnapshot(q, s => { S[name] = s.docs.map(d => ({ id: d.id, ...d.data() })); S.loaded[name] = true; onData(); },
    e => { console.error(name, e); S.loaded[name] = true; onData(); }));
}
export function startData(onData) {
  stopAll();
  unsubs.push(onSnapshot(doc(db, 'settings', 'main'), s => { S.settings = s.exists() ? s.data() : null; S.loaded.settings = true; onData(); }, e => { S.loaded.settings = true; onData(); }));
  if (isStaff()) {
    const own = S.me.role === 'salesexec';
    for (const c of ['agents', 'suppliers', 'rates', 'itineraries', 'offers', 'dayplans', 'inquiries', 'quotes', 'bookings', 'requests', 'users', 'tasks', 'agentQuotes', 'visaRequests', 'registrations', 'contacts', 'campaigns']) sub(c, own && ['quotes', 'bookings'].includes(c) ? query(collection(db, c), where('createdBy', '==', S.user.uid)) : collection(db, c), onData);
    UI.canHR = S.me.role === 'admin' || (S.me.sections || []).includes('hr');
    for (const c of ['employees', 'leaves', 'attendance']) sub(c, UI.canHR ? collection(db, c) : query(collection(db, c), where('userId', '==', S.user.uid)), onData);
  } else if (S.me?.role === 'agent' && S.me.agentId) {
    const aid = S.me.agentId;
    unsubs.push(onSnapshot(doc(db, 'agents', aid), s => { S.myAgent = s.exists() ? { id: s.id, ...s.data() } : null; onData(); }, () => { }));
    sub('offers', query(collection(db, 'offers'), where('published', '==', true)), onData);
    sub('itineraries', query(collection(db, 'itineraries'), where('published', '==', true)), onData);
    sub('bookings', query(collection(db, 'portalBookings'), where('agent', '==', aid)), onData);
    sub('requests', query(collection(db, 'requests'), where('agentId', '==', aid)), onData);
    sub('portal', query(collection(db, 'portalHotels'), where('tier', '==', S.me.tier || 'A')), onData);
    sub('agentQuotes', query(collection(db, 'agentQuotes'), where('agentId', '==', aid)), onData);
    sub('visaRequests', query(collection(db, 'visaRequests'), where('agentId', '==', aid)), onData);
  }
}

export async function save(col, rec, { silent } = {}) {
  const { id, ...data } = rec;
  const now = new Date().toISOString();
  if (S.me?.role === 'dataentry' && APPROVAL_COLS.includes(col)) { data.approved = false; data.published = false; }
  data.updatedAt = now; if (!data.createdAt) data.createdAt = now; if (!data.createdBy) data.createdBy = S.user?.uid || '';
  const ref = id ? doc(db, col, id) : doc(collection(db, col));
  try { await setDoc(ref, clone(data)); if (!silent) toast('Saved'); return ref.id; }
  catch (e) { console.error(e); toast('Could not save: ' + (e.code || e.message)); return null; }
}
// Agents never read the real booking (it holds your costs and markups).
// They read this copy, which carries selling prices only.
export async function savePortalCopy(b) {
  if (!b.id) return;
  const qc = b.currency || 'AED';
  const t = totals(b);
  const copy = { sellTotal: +t.sell.toFixed(2), flat: flatLines(b).map(l => ({ type: l.type, date: l.date, desc: l.desc, meal: l.meal, conf: l.conf, supplierName: supName(l.supplier, l), sell: +(l.sell || 0).toFixed(2) })), agent: b.agent, company: b.company, no: b.no, invoiceNo: b.invoiceNo || '', invoiceDate: b.invoiceDate || '', dueDate: b.dueDate || '', status: b.status || '', currency: qc,
    lead: b.lead || '', adults: b.adults || 0, children: b.children || 0, nationality: b.nationality || '', arrival: b.arrival || '', departure: b.departure || '', agentRef: b.agentRef || '',
    flightIn: b.flightIn || '', flightOut: b.flightOut || '', rooming: b.rooming || '', itinerary: b.itinerary || '', inclusions: b.inclusions || '', exclusions: b.exclusions || '', discount: b.discount || 0,
    payments: (b.payments || []).map(p => ({ date: p.date || '', amount: num(p.amount) })),
    program: (b.program || []).map(d => ({ title: d.title || '', description: d.description || '', overnight: d.overnight || '', meals: d.meals || '', photos: (d.photos || []).slice(0, 3) })), hotelNames: (b.hotelsIncluded === false ? [] : (b.hotels || [])).map(h => ({ name: h.name || '', category: h.category || '', checkIn: h.checkIn || '', checkOut: h.checkOut || '', meal: h.meal || '' })), destinations: b.destinations || [],
    updatedAt: new Date().toISOString() };
  try { await setDoc(doc(db, 'portalBookings', b.id), copy); } catch (e) { console.error('portal copy', e); }
}
export async function remove(col, id) { try { await deleteDoc(doc(db, col, id)); toast('Deleted'); return true; } catch (e) { toast('Could not delete: ' + (e.code || '')); return false; } }

export async function nextNo(key, prefix, base = 0) {
  const ref = doc(db, 'settings', 'counters');
  try {
    const n = await runTransaction(db, async tx => { const s = await tx.get(ref); const cur = num(s.exists() ? s.data()[key] : 0) + 1; tx.set(ref, { [key]: cur }, { merge: true }); return cur; });
    return prefix + String(n + base).padStart(4, '0');
  } catch (e) { console.error(e); return prefix + Date.now().toString().slice(-6); }
}

/* small render helpers */
export const sel = (name, opts, val, extra = '') => `<select data-f="${name}" ${extra}>${opts.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
export const inp = (name, val, type = 'text', extra = '') => `<input data-f="${name}" type="${type}" value="${esc(val ?? '')}" ${extra}>`;
export const area = (name, val, extra = '') => `<textarea data-f="${name}" ${extra}>${esc(val)}</textarea>`;
export const field = (l, h) => `<label>${esc(l)}${h}</label>`;
export const coOpts = () => cfg().companies.map(c => [c.id, c.name]);
export const agentOpts = (blank = '— choose agent —') => [['', blank], ...S.agents.filter(inCo).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(a => [a.id, a.name + (a.code ? ' · ' + a.code : '')])];
export const supOpts = () => [['', '—'], ...S.suppliers.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(a => [a.id, a.name + (a.destination ? ' · ' + a.destination : '')])];
export function table(head, rows, empty) {
  if (!rows.length) return `<div class="empty">${empty}</div>`;
  return `<div class="scroll"><table class="stack"><thead><tr>${head.map(h => `<th class="${h.endsWith(' ') ? 'num' : ''}">${esc(h.trim())}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
// label cells for the stacked mobile table
new MutationObserver(() => { for (const c of document.querySelectorAll('table.stack td:not([data-l])')) { let i = 0, p = c; while ((p = p.previousElementSibling)) i += p.colSpan; c.dataset.l = c.closest('table').rows[0].cells[i]?.textContent || ''; } }).observe(document, { childList: true, subtree: true });

export function download(name, text, type = 'text/csv') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export const csv = rows => rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');

export function openModal(title, bodyHtml, actionsHtml = '') {
  $('#mbar').innerHTML = `<b>${esc(title)}</b>${actionsHtml}<button class="btn s" data-act="closeModal">Close</button>`;
  $('#mbody').innerHTML = bodyHtml; $('#modal').classList.add('open'); $('#modal').setAttribute('aria-hidden', 'false');
}
export function closeModal() { $('#modal').classList.remove('open'); $('#modal').setAttribute('aria-hidden', 'true'); }

export function confirmBtn(btn, label = 'Click again to confirm') { if (btn.dataset.sure === '1') return true; btn.dataset.sure = '1'; btn.dataset.old = btn.textContent; btn.textContent = label; setTimeout(() => { if (btn.isConnected) { btn.dataset.sure = ''; btn.textContent = btn.dataset.old; } }, 4000); return false; }

// decorative route art (horizon with a travel arc)
export const routeArt = (w = 520, h = 220) => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true"><defs><linearGradient id="sea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3C79A9" stop-opacity=".55"/><stop offset="1" stop-color="#13233A" stop-opacity="0"/></linearGradient></defs><circle cx="${w * .78}" cy="${h * .62}" r="${h * .28}" fill="#E2A03F" opacity=".9"/><rect x="0" y="${h * .66}" width="${w}" height="${h * .34}" fill="url(#sea)"/><path d="M${w * .08} ${h * .7} Q ${w * .45} ${h * .02} ${w * .9} ${h * .5}" stroke="#73B3DE" stroke-width="2.5" fill="none" stroke-dasharray="2 9" stroke-linecap="round"/><circle cx="${w * .08}" cy="${h * .7}" r="5" fill="#73B3DE"/><circle cx="${w * .9}" cy="${h * .5}" r="5" fill="#fff"/>${[0, 1, 2].map(i => `<path d="M${w * (.12 + i * .1)} ${h * .86 + i * 4} q 18 -8 36 0" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/>`).join('')}</svg>`;
export const destArt = (d) => { const pal = { 'Sri Lanka': ['#2F7D62', '#E2A03F'], 'Maldives': ['#3C79A9', '#73B3DE'], 'Bali': ['#2F7D62', '#C9A86A'], 'Indonesia': ['#2F7D62', '#C9A86A'], 'Thailand': ['#9A6413', '#E2A03F'], 'Malaysia': ['#13233A', '#3C79A9'], 'UAE': ['#9A6413', '#E9C89B'], 'Turkey': ['#C2553D', '#E2A03F'], 'Lebanon': ['#2B3B52', '#73B3DE'], 'Philippines': ['#3C79A9', '#E2A03F'] }[d] || ['#13233A', '#3C79A9']; return `<svg viewBox="0 0 300 120" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true"><rect width="300" height="120" fill="${pal[0]}"/><circle cx="230" cy="48" r="26" fill="${pal[1]}"/><path d="M0 92 Q 75 70 150 90 T 300 84 V120 H0Z" fill="#000" opacity=".18"/><path d="M0 104 Q 80 88 160 104 T 300 100 V120 H0Z" fill="#000" opacity=".22"/></svg>`; };
