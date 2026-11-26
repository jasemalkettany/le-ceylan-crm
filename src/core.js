import { auth, db, doc, setDoc, deleteDoc, collection, onSnapshot, query, where, runTransaction } from './fb.js';

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
export const STAFF_ROLES = ['admin', 'manager', 'staff'];

export const S = {
  user: null, me: null, settings: null, loaded: {},
  agents: [], suppliers: [], rates: [], itineraries: [], offers: [], inquiries: [], quotes: [], bookings: [], requests: [], users: [],
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
export const curCo = () => { try { return localStorage.getItem('lc_co') || ''; } catch (e) { return ''; } };
export const inCo = r => !curCo() || !r.company || r.company === curCo();
export const fx = (amt, from, to) => { const r = cfg().fx || {}; if (from === to) return num(amt); const a = num(r[from]), b = num(r[to]); if (!a || !b) return NaN; return num(amt) * a / b; };
export const byNew = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '');
export const search = () => ($('#q')?.value || '').trim().toLowerCase();
export const qMatch = r => { const q = search(); if (!q) return true; return JSON.stringify(r).toLowerCase().includes(q) || agentName(r.agent).toLowerCase().includes(q); };

export function tagFor(s) {
  const ok = ['Confirmed', 'Accepted', 'Completed', 'Paid', 'Published', 'Active', 'Done'];
  const bad = ['Lost', 'Rejected', 'Cancelled', 'Overdue', 'Suspended', 'Declined'];
  const acc = ['Sent', 'Quoted', 'In progress', 'Part paid', 'Working', 'New request', 'Pending'];
  const gr = ['Draft', 'Expired', 'Unpaid'];
  const c = ok.includes(s) ? 'ok' : bad.includes(s) ? 'bad' : acc.includes(s) ? 'acc' : gr.includes(s) ? 'gr' : '';
  return `<span class="tag ${c}">${esc(s || 'New')}</span>`;
}

/* money */
export function lineCalc(l, qc) {
  const units = num(l.qty || 1) * Math.max(1, num(l.units || 1));
  const costLocal = units * num(l.unitCost);
  const cost = fx(costLocal, l.costCur || qc, qc);
  const so = l.sellOverride;
  const sell = so !== '' && so != null ? num(so) : cost * (1 + num(l.markup) / 100);
  return { cost, sell, costLocal };
}
export function totals(rec) {
  const qc = rec.currency || 'AED'; let cost = 0, sell = 0, bad = false;
  for (const l of rec.lines || []) { const c = lineCalc(l, qc); if (isNaN(c.cost)) bad = true; else { cost += c.cost; sell += c.sell; } }
  sell -= num(rec.discount);
  const pax = Math.max(1, num(rec.adults) + num(rec.children));
  return { cost, sell, profit: sell - cost, margin: sell ? (sell - cost) / sell * 100 : 0, perPax: sell / pax, bad };
}
export const received = b => (b.payments || []).reduce((s, p) => s + num(p.amount), 0);

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
    for (const c of ['agents', 'suppliers', 'rates', 'itineraries', 'offers', 'inquiries', 'quotes', 'bookings', 'requests', 'users']) sub(c, collection(db, c), onData);
  } else if (S.me?.role === 'agent' && S.me.agentId) {
    const aid = S.me.agentId;
    unsubs.push(onSnapshot(doc(db, 'agents', aid), s => { S.myAgent = s.exists() ? { id: s.id, ...s.data() } : null; onData(); }, () => { }));
    sub('offers', query(collection(db, 'offers'), where('published', '==', true)), onData);
    sub('itineraries', query(collection(db, 'itineraries'), where('published', '==', true)), onData);
    sub('bookings', query(collection(db, 'portalBookings'), where('agent', '==', aid)), onData);
    sub('requests', query(collection(db, 'requests'), where('agentId', '==', aid)), onData);
  }
}

export async function save(col, rec, { silent } = {}) {
  const { id, ...data } = rec;
  const now = new Date().toISOString();
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
  const copy = { agent: b.agent, company: b.company, no: b.no, invoiceNo: b.invoiceNo || '', invoiceDate: b.invoiceDate || '', dueDate: b.dueDate || '', status: b.status || '', currency: qc,
    lead: b.lead || '', adults: b.adults || 0, children: b.children || 0, nationality: b.nationality || '', arrival: b.arrival || '', departure: b.departure || '', agentRef: b.agentRef || '',
    flightIn: b.flightIn || '', flightOut: b.flightOut || '', rooming: b.rooming || '', itinerary: b.itinerary || '', inclusions: b.inclusions || '', exclusions: b.exclusions || '', discount: b.discount || 0,
    payments: (b.payments || []).map(p => ({ date: p.date || '', amount: num(p.amount) })),
    lines: (b.lines || []).map(l => ({ type: l.type, date: l.date || '', desc: l.desc || '', meal: l.meal || '', qty: l.qty || 1, units: l.units || 1, conf: l.conf || '', supplierName: supName(l.supplier), unitCost: 0, sellOverride: +(lineCalc(l, qc).sell || 0).toFixed(2) })),
    updatedAt: new Date().toISOString() };
  try { await setDoc(doc(db, 'portalBookings', b.id), copy); } catch (e) { console.error('portal copy', e); }
}
export async function remove(col, id) { try { await deleteDoc(doc(db, col, id)); toast('Deleted'); return true; } catch (e) { toast('Could not delete: ' + (e.code || '')); return false; } }

export async function nextNo(key, prefix) {
  const ref = doc(db, 'settings', 'counters');
  try {
    const n = await runTransaction(db, async tx => { const s = await tx.get(ref); const cur = num(s.exists() ? s.data()[key] : 0) + 1; tx.set(ref, { [key]: cur }, { merge: true }); return cur; });
    return prefix + String(n).padStart(4, '0');
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
