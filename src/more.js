import { db, doc, collection, updateDoc, setDoc, writeBatch, getDocs, getDoc } from './fb.js';
let parseKitFn = t => t; export const setKitParser = f => { parseKitFn = f; };
import { S, UI, $, esc, num, fmt, today, cfg, coById, toast, openModal, closeModal, save, tagFor, table, field, inp, sel, CURS, photoTag, isAdmin, APPROVAL_COLS, flatLines, confirmBtn, userName } from './core.js';
import { V, EDIT } from './staff.js';
import { P } from './portal.js';

let rerender = () => { };
export const setRender = f => { rerender = f; };
export const redraw = () => rerender();
export const MORE_MODS = {};
const go = h => `href="#/${h}"`;
export const DEFAULT_TIERS = [{ id: 'A', name: 'Standard', markup: 15 }, { id: 'B', name: 'Preferred', markup: 10 }, { id: 'C', name: 'VIP', markup: 7 }];
export const tiers = () => (cfg().tiers?.length ? cfg().tiers : DEFAULT_TIERS);
const portal = () => cfg().portal || {};
const nightsOf = (a, b) => (a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5)) : 0);
const isBoss = () => S.me?.role === 'admin';

/* ---------- approvals: data entry adds, only the admin confirms ---------- */
const OPEN = { rates: 'rate', offers: 'offer', itineraries: 'itinerary', dayplans: 'dayplan', suppliers: 'supplier' };
const KIND = { rates: 'Rate', offers: 'Offer', itineraries: 'Itinerary', dayplans: 'Day plan', suppliers: 'Supplier' };
const pending = () => APPROVAL_COLS.flatMap(c => (S[c] || []).filter(x => x.approved === false).map(x => ({ c, x })));
export const pendingCount = () => pending().length;
V.approvals = { title: 'Approvals', render() {
  const r = pending().sort((a, b) => (b.x.updatedAt || '').localeCompare(a.x.updatedAt || ''));
  const label = ({ c, x }) => c === 'rates' ? `${x.supplier || ''} · ${x.service || ''}${x.meal ? ' · ' + x.meal : ''} · ${fmt(x.cost, x.currency)}` : (x.title || x.name || 'Untitled');
  return `<div class="pagehead"><div><h1>Approvals</h1><p class="lead">Data entry adds rates, hotels, offers and itineraries. They stay out of quotations and the agent portal until the admin approves them.</p></div>${isBoss() && r.length ? `<button class="btn p" data-act="approveAll">Approve all ${r.length}</button>` : ''}</div>
  ${isBoss() ? '' : '<div class="warn">Only the admin can approve. You can open and check each entry.</div>'}
  <div class="card">${table(['Type', 'Entry', 'Destination', 'Entered by', 'Date', ''], r.map(e => `<tr><td>${tagFor('Awaiting approval')} <span class="note">${KIND[e.c]}</span></td><td><a ${go(OPEN[e.c] + '/' + esc(e.x.id))}><b>${esc(label(e))}</b></a></td><td>${esc(e.x.destination || '')}</td><td>${esc(userName(e.x.updatedBy || e.x.createdBy))}</td><td class="note">${esc((e.x.updatedAt || '').slice(0, 10))}</td><td>${isBoss() ? `<div class="row"><button class="btn s p" data-act="approveRec" data-id="${e.c}|${esc(e.x.id)}">Approve</button><button class="btn s d" data-act="rejectRec" data-id="${e.c}|${esc(e.x.id)}">Reject</button></div>` : ''}</td></tr>`), 'Nothing waiting for approval.')}</div>`;
} };

/* ---------- agent portal: design, contacts, profit groups ---------- */
V.portalset = { title: 'Agent portal', render() {
  const p = portal(), t = tiers();
  const f = (id, l, v, type = 'text', ph = '') => `<label>${l}<input id="${id}" type="${type}" value="${esc(v ?? '')}" placeholder="${esc(ph)}"></label>`;
  const agentsIn = id => S.agents.filter(a => (a.tier || 'A') === id).length;
  return `<div class="pagehead"><div><h1>Agent portal</h1><p class="lead">What agents see when they sign in, where their requests go, and how much profit each agent group pays.</p></div><button class="btn p" data-act="publishPortal">Publish hotel & tour prices</button></div>
  <div class="card"><h2>Look and welcome</h2><div class="grid">${f('ps_head', 'Headline', p.headline, 'text', 'Welcome to Le Ceylan')}${f('ps_text', 'Welcome text', p.welcome, 'text', 'Current offers, hotels, tours and your bookings')}${f('ps_banner', 'Banner photo link (https)', p.banner, 'url', 'https://…')}</div></div>
  <div class="card"><h2>Where requests go <span class="sub">agents choose WhatsApp or email · each company's own WhatsApp is used first</span></h2><div class="grid">${f('ps_wa', 'WhatsApp number', p.whatsapp, 'text', '+971 58 …')}${f('ps_email', 'Requests email', p.email, 'email', 'reservation@…')}<label>Price currency for agents<select id="ps_cur">${CURS.map(c => `<option ${c === (p.currency || 'USD') ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div></div>
  <div class="card"><h2>Page footer <span class="sub">company details come from each company in Settings · agents see their own company</span></h2><div class="grid">${f('ps_ig', 'Instagram link', p.instagram, 'url', 'https://instagram.com/…')}${f('ps_fb', 'Facebook link', p.facebook, 'url')}${f('ps_li', 'LinkedIn link', p.linkedin, 'url')}${f('ps_tt', 'TikTok link', p.tiktok, 'url')}</div>
  <label style="margin-top:10px">Payment options shown to agents<textarea id="ps_pay" style="min-height:80px" placeholder="Bank transfer · Visa / Mastercard · Payment link on request">${esc(p.payments || '')}</textarea></label></div>
  <div class="card"><h2>Help videos <span class="sub">one per line: Language | Title | YouTube link</span></h2><textarea id="ps_vid" style="min-height:90px" placeholder="Arabic | How to build a Sri Lanka package | https://youtu.be/…">${esc((p.videos || []).map(v => [v.lang, v.title, v.url].join(' | ')).join('\n'))}</textarea></div>
  <div class="card"><h2>Visa services <span class="sub">one per line: Country | fee | currency | documents (comma) | requirements</span></h2><textarea id="ps_visa" style="min-height:90px" placeholder="Sri Lanka | 50 | USD | Passport copy, Photo, Ticket | ETA approved within 48 hours">${esc((p.visa || []).map(v => [v.country, v.fee, v.currency, v.docs, v.requirements].join(' | ')).join('\n'))}</textarea></div>
  <div class="card"><h2>Profit groups <span class="sub">markup added on our net rate · choose the group on each agent</span></h2>
  <div id="tierRows">${t.map(x => `<div class="grid tierRow" data-id="${esc(x.id)}" style="margin-bottom:8px"><label>Group ${esc(x.id)} name<input class="tName" value="${esc(x.name)}"></label><label>Default markup %<input class="tMk" type="number" step="any" value="${esc(x.markup)}"></label>${['Hotel', 'Transfer', 'Tour', 'Guide', 'Other'].map(sv => `<label>${sv === 'Tour' ? 'Tours & activities' : sv === 'Transfer' ? 'Transport' : sv + 's'} %<input class="tSv" data-sv="${sv}" type="number" step="any" value="${esc(x.mk?.[sv] ?? '')}" placeholder="${esc(x.markup)}"></label>`).join('')}<label>Sri Lanka fee per person<input class="tSl" type="number" step="any" value="${esc(x.slPP ?? '')}" placeholder="from builder"></label><div class="note" style="align-self:end;padding-bottom:10px">${agentsIn(x.id)} agents</div></div>`).join('')}</div>
  <button class="btn s" data-act="addTier">Add group</button></div>
  <div class="row"><button class="btn p" data-act="savePortalSet">Save</button><span class="note">${p.published ? 'Prices last published ' + esc(p.published.slice(0, 16).replace('T', ' ')) : 'Prices not published yet'}. Publish again after you change rates or markups.</span></div>`;
} };

/* the agent editor gets the profit group (admin only) */
const agentEdit = EDIT.agent;
EDIT.agent = r => { const h = agentEdit(r); if (!isAdmin()) return h; const card = `<div class="card"><h2>Profit group <span class="sub">sets the prices this agent sees in the portal</span></h2><div class="grid">${field('Group', sel('tier', tiers().map(t => [t.id, `${t.id} · ${t.name} (${t.markup}%)`]), r.tier || 'A'))}</div></div>`; const k = '<div class="row"><button class="btn p"'; return h.includes(k) ? h.replace(k, card + k) : h + card; };

/* agent logins carry their group so they can only read their own prices */
const syncing = new Set();
export function syncTiers() {
  if (!isAdmin()) return;
  for (const u of S.users.filter(u => u.role === 'agent' && u.agentId)) { const a = S.agents.find(x => x.id === u.agentId); const t = a?.tier || 'A'; if (a && (u.tier || 'A') !== t && !syncing.has(u.id)) { syncing.add(u.id); updateDoc(doc(db, 'users', u.id), { tier: t }).catch(() => { }).finally(() => syncing.delete(u.id)); } }
}

/* turn approved net rates into selling prices per profit group */
const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 90);
const mkFor = (t, type) => { const m = t.mk || {}; const k = type === 'Hotel' ? 'Hotel' : type === 'Transfer' ? 'Transfer' : type === 'Guide' ? 'Guide' : ['Tour', 'Activity', 'Entrance'].includes(type) ? 'Tour' : 'Other'; return m[k] !== undefined && m[k] !== '' ? num(m[k]) : num(t.markup); };
export function buildPortal(kitT) {
  const pc = portal().currency || 'USD', fx = cfg().fx || {};
  const conv = (v, c) => { if (!c || c === pc) return v; const a = num(fx[c]), b = num(fx[pc]); return a && b ? v * a / b : NaN; };
  const rates = S.rates.filter(x => x.approved !== false && num(x.cost) && (!x.validTo || x.validTo >= today()));
  const hotels = {}, tours = {}; let skipped = 0;
  const supOf = x => S.suppliers.find(s => s.id === x.supplierId) || S.suppliers.find(s => (s.name || '').toLowerCase() === (x.supplier || '').toLowerCase()) || {};
  for (const x of rates) {
    if (isNaN(conv(1, x.currency))) { skipped++; continue; }
    if (x.type === 'Hotel') { const k = `${x.destination}|${x.supplier}`; const s = supOf(x); (hotels[k] = hotels[k] || { kind: 'hotel', name: x.supplier || s.name || '', destination: x.destination || s.destination || '', city: x.city || s.city || '', area: s.area || '', stars: s.stars || '', description: s.description || '', photos: (s.photos || []).slice(0, 4), company: x.company || s.company || '', driverRoom: s.driverRoom === 'Yes', rates: [] }).rates.push(x); }
    else if (x.type !== 'Guide') { const k = x.destination || 'Other'; (tours[k] = tours[k] || { kind: 'tour', name: k, destination: x.destination || '', rates: [] }).rates.push(x); }
  }
  const out = {};
  for (const t of tiers()) {
    const price = x => Math.ceil(conv(num(x.cost), x.currency) * (1 + mkFor(t, x.type) / 100));
    for (const [k, h] of Object.entries(hotels)) { const { rates: rs, ...rest } = h; out[`${t.id}_h_${slug(k)}`] = { ...rest, tier: t.id, currency: pc, rooms: rs.map(x => ({ service: x.service || '', meal: x.meal || '', validFrom: x.validFrom || '', validTo: x.validTo || '', price: price(x), unit: x.unit || '', notes: x.notes || '' })).sort((a, b) => a.price - b.price) }; }
    for (const [k, g] of Object.entries(tours)) { const { rates: rs, ...rest } = g; out[`${t.id}_t_${slug(k)}`] = { ...rest, tier: t.id, currency: pc, items: rs.map(x => ({ service: x.service || '', type: x.type || '', city: x.city || '', validFrom: x.validFrom || '', validTo: x.validTo || '', price: price(x), unit: x.unit || '', notes: x.notes || '' })).sort((a, b) => a.service.localeCompare(b.service)) }; }
  }
  if (kitT) { const k = parseKitFn(kitT); const kc = k.currency || 'USD';
    for (const t of tiers()) { const m = (v, type) => Math.round(conv(num(v), kc) * (1 + mkFor(t, type) / 100) * 100) / 100;
      out[`${t.id}_slkit`] = { ...k, kind: 'slkit', tier: t.id, currency: pc, vehicles: k.vehicles.map(v => ({ ...v, perKm: m(v.perKm, 'Transfer') })), guideDay: m(k.guideDay, 'Guide'), guideRoom: m(k.guideRoom, 'Guide'), driverRoom: m(k.driverRoom, 'Transfer'), markupPP: Math.round(conv(num(t.slPP !== undefined && t.slPP !== '' ? t.slPP : k.markupPP), kc) * 100) / 100 }; } }
  return { out, skipped, hotels: Object.keys(hotels).length, tours: Object.values(tours).reduce((s, g) => s + g.rates.length, 0) };
}
async function publishPortal(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
  try {
    let kitT = null; try { const ks = await getDoc(doc(db, 'settings', 'srilanka')); kitT = ks.exists() ? ks.data() : null; } catch (e) { }
    const { out, skipped, hotels, tours } = buildPortal(kitT); const now = new Date().toISOString();
    const old = await getDocs(collection(db, 'portalHotels'));
    let batch = writeBatch(db), n = 0; const flush = async () => { if (n) { await batch.commit(); batch = writeBatch(db); n = 0; } };
    for (const d of old.docs) if (!out[d.id]) { batch.delete(d.ref); if (++n >= 400) await flush(); }
    for (const [id, v] of Object.entries(out)) { batch.set(doc(db, 'portalHotels', id), { ...v, updatedAt: now }); if (++n >= 400) await flush(); }
    await flush();
    await setDoc(doc(db, 'settings', 'main'), { portal: { ...portal(), published: now } }, { merge: true });
    toast(`Published ${hotels} hotels and ${tours} tours${skipped ? ` · ${skipped} rates skipped (missing exchange rate)` : ''}`);
  } catch (e) { console.error(e); toast('Could not publish: ' + (e.code || e.message)); }
  if (btn) { btn.disabled = false; btn.textContent = 'Publish hotel & tour prices'; }
}

/* ---------- Gmail: each user sends from his own mailbox ---------- */
let gTok = null, gExp = 0;
function loadGIS() { if (window.google?.accounts?.oauth2) return Promise.resolve(); return new Promise((res, rej) => { if (document.getElementById('gis')) { document.getElementById('gis').addEventListener('load', res); return; } const s = document.createElement('script'); s.id = 'gis'; s.src = 'https://accounts.google.com/gsi/client'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function gToken() {
  if (gTok && gExp > Date.now() + 60e3) return Promise.resolve(gTok);
  const cid = cfg().googleClientId; if (!cid) return Promise.reject(new Error('The admin needs to add the Google client ID in Settings first.'));
  if (!window.google?.accounts?.oauth2) return Promise.reject(new Error('Google is still loading, press Send again.'));
  return new Promise((res, rej) => { const tc = google.accounts.oauth2.initTokenClient({ client_id: cid, scope: 'https://www.googleapis.com/auth/gmail.send', login_hint: S.me?.email || '', callback: r => { if (r.error) rej(new Error(r.error_description || r.error)); else { gTok = r.access_token; gExp = Date.now() + (r.expires_in || 3500) * 1000; res(gTok); } }, error_callback: e => rej(new Error(e?.message || 'Google sign-in was closed')) }); tc.requestAccessToken(); });
}
const b64 = s => btoa(unescape(encodeURIComponent(s)));
const b64url = s => b64(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export function mime({ to, cc, subject, text }) {
  const html = `<div style="font:14px Arial,sans-serif;color:#1D2B38">${esc(text).replace(/\n/g, '<br>')}</div>`;
  return ['To: ' + to, cc ? 'Cc: ' + cc : '', 'Subject: =?UTF-8?B?' + b64(subject) + '?=', 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', b64(html)].filter((l, i) => l || i > 3).join('\r\n');
}
export async function gmailSend(msg, threadId) {
  const tok = await gToken();
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: b64url(mime(msg)), ...(threadId ? { threadId } : {}) }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) { if (r.status === 401) gTok = null; throw new Error(j.error?.message || 'Gmail refused the email (' + r.status + ')'); } return j;
}
const supFor = it => S.suppliers.find(s => s.id === it.supplierId) || S.suppliers.find(s => (s.name || '').toLowerCase() === (it.supplierName || it.name || '').toLowerCase()) || null;
function mailDraft(b, k, idx) {
  const it = (b[k] || [])[+idx] || {}; const sup = supFor(it); const line = flatLines(b).find(x => x.sec === k && x.idx == idx) || {};
  const key = sup?.id || it.supplierName || it.name || ''; const prev = (b.emails || []).filter(e => e.supplier === key).slice(-1)[0];
  const co = coById(b.company); const ref = b.tourNo || b.no || b.invoiceNo || '';
  const subject = prev ? (/^re:/i.test(prev.subject) ? prev.subject : 'Re: ' + prev.subject) : `Booking request ${ref} – ${b.lead || 'Guest'} – ${line.date || b.arrival || ''}`;
  const pax = `${num(b.adults)} adults${num(b.children) ? `, ${num(b.children)} children${b.childAges ? ' (' + b.childAges + ')' : ''}` : ''}`;
  const text = `Dear ${sup?.contact || 'Reservations team'},\n\n${prev ? 'Following up on our booking below.' : 'Kindly book and confirm the following:'}\n\nOur reference: ${ref}\nGuest name: ${b.lead || ''}${b.nationality ? '\nNationality: ' + b.nationality : ''}\nService: ${line.desc || it.name || ''}\nDate: ${line.date || ''}${line.meal ? '\nMeal plan: ' + line.meal : ''}\nPax: ${pax}${it.notes ? '\nNotes: ' + it.notes : ''}\n\nPlease reply with the confirmation number.\n\nBest regards,\n${S.me?.name || ''}\n${co.name || ''}${co.phone ? '\n' + co.phone : ''}\n${S.me?.email || ''}`;
  return { to: sup?.email || '', cc: S.me?.email || '', subject, text, key, threadId: prev?.threadId || '', supName: sup?.name || it.supplierName || it.name || '' };
}
const emailLog = b => (b.emails || []).length ? `<div class="card"><h2>Emails sent to suppliers</h2>${table(['Sent', 'To', 'Subject', 'By'], b.emails.slice().reverse().map(e => `<tr><td class="note">${esc((e.at || '').slice(0, 16).replace('T', ' '))}</td><td>${esc(e.supName || '')}<div class="note">${esc(e.to)}</div></td><td>${esc(e.subject)}</td><td>${esc(e.by)}</td></tr>`))}</div>` : '';
/* ---------- Curative as Le Ceylan's ground handler in Sri Lanka ---------- */
const curCo = () => (cfg().companies || []).find(c => /curative/i.test(c.group || '') || /curative/i.test(c.name || ''));
const isLC = id => { const c = coById(id); return !/curative/i.test(c.group || c.name || ''); };
const SECS4 = ['hotels', 'transport', 'activities', 'misc'];
function linkCard(b) {
  const cv = curCo(); if (!b.id || !cv) return '';
  if (b.linkedFrom) { const lc = S.bookings.find(x => x.id === b.linkedFrom); return `<div class="card" style="border-left:4px solid var(--red)"><h2>From Le Ceylan booking ${esc(b.linkedNo || lc?.no || '')}</h2><p class="note" style="margin:0">Curative handles the services. Le Ceylan invoices the agent and collects the payment; this file invoices Le Ceylan. Confirmation numbers you enter here appear on the Le Ceylan booking automatically.</p></div>`; }
  if (b.linkedTo) { const x = S.bookings.find(y => y.id === b.linkedTo); return `<div class="card" style="border-left:4px solid var(--red)"><h2>Handled by ${esc(cv.name)} <span class="sub">${esc(x?.no || '')} · ${esc(x?.status || '')}</span></h2><p class="note" style="margin:0">Curative's team books and confirms the services. Their confirmation numbers fill in here. You invoice the agent and collect the payment as usual.</p></div>`; }
  if (b.company === cv.id || !isLC(b.company) || !(b.destinations || []).includes('Sri Lanka')) return '';
  return `<div class="card"><h2>Sri Lanka ground handling</h2><div class="row"><p class="note" style="margin:0;flex:1">Send this booking to ${esc(cv.name)}. They get the full file with the same guests, dates and services, so nothing is typed twice. You keep the invoice and payment.</p><button class="btn p" data-act="toCurative">Send to ${esc(cv.name)}</button></div></div>`;
}
function pullConf(b) {
  if (!b.linkedTo) return; const x = S.bookings.find(y => y.id === b.linkedTo); if (!x) return;
  for (const k of SECS4) (b[k] || []).forEach((it, i) => { const c = x[k]?.[i]?.conf; if (c && !it.conf) it.conf = c; });
}
const bookingEdit = EDIT.booking;
EDIT.booking = b => { pullConf(b); const h = bookingEdit(b); const k = '<div class="row"><button class="btn p"'; const card = linkCard(b); return (card && h.includes(k) ? h.replace(k, card + k) : h + card) + emailLog(b); };

/* ---------- agent portal: hotel search and tours ---------- */
const hs = () => (UI.hs = UI.hs || { dest: '', city: '', cin: '', cout: '', rooms: 1, name: '', stars: '', max: '', sort: 'price', open: {} });
const myCo = () => coById(S.myAgent?.company);
const waNo = () => String(myCo().whatsapp || portal().whatsapp || myCo().phone || '').replace(/[^\d]/g, '');
const reqEmail = () => portal().email || myCo().email || '';
const stars = n => num(n) ? `<span style="color:#E0A100;letter-spacing:1px">${'★'.repeat(num(n))}</span>` : '';
const roomOk = (r, cin) => !cin || ((!r.validFrom || r.validFrom <= cin) && (!r.validTo || r.validTo >= cin));
const perNight = u => /night/.test(u || '');
P.hotels = { title: 'Hotels', render() {
  const s = hs(); const all = (S.portal || []).filter(d => d.kind === 'hotel');
  const dests = [...new Set(all.map(h => h.destination).filter(Boolean))].sort(); if (!s.dest && dests.length) s.dest = dests[0];
  const cities = [...new Set(all.filter(h => h.destination === s.dest).map(h => h.city).filter(Boolean))].sort();
  const n = nightsOf(s.cin, s.cout), rooms = Math.max(1, num(s.rooms));
  let res = all.filter(h => h.destination === s.dest && (!s.city || h.city === s.city) && (!s.name || (h.name || '').toLowerCase().includes(s.name.toLowerCase())) && (!s.stars || num(h.stars) >= num(s.stars)))
    .map(h => ({ h, rs: (h.rooms || []).filter(r => roomOk(r, s.cin)) })).filter(x => x.rs.length).map(x => ({ ...x, min: Math.min(...x.rs.map(r => r.price)) }))
    .filter(x => !num(s.max) || x.min <= num(s.max));
  res.sort(s.sort === 'stars' ? (a, b) => num(b.h.stars) - num(a.h.stars) || a.min - b.min : s.sort === 'name' ? (a, b) => (a.h.name || '').localeCompare(b.h.name || '') : (a, b) => a.min - b.min);
  const total = r => perNight(r.unit) && n ? r.price * n * rooms : 0;
  const card = ({ h, rs, min }) => { const open = s.open[h.id]; return `<div class="card hres"><div class="hph">${photoTag((h.photos || [])[0], 'width:100%;height:100%;object-fit:cover;display:block')}</div><div class="hbd"><div class="row"><h3 style="margin:0">${esc(h.name)}</h3>${stars(h.stars)}</div><div class="note">${esc([h.area, h.city, h.destination].filter(Boolean).join(' · '))}</div>${h.description ? `<p class="note" style="margin:8px 0 0">${esc(h.description.slice(0, 220))}${h.description.length > 220 ? '…' : ''}</p>` : ''}
    <div class="row" style="margin-top:10px"><span class="note">${rs.length} room ${rs.length === 1 ? 'option' : 'options'}</span><span class="sp"></span><div style="text-align:right"><div class="note">from</div><b style="font-size:20px;color:var(--indigo)">${esc(fmt(min, h.currency))}</b><div class="note">${esc(rs[0]?.unit || '')}</div></div></div>
    <div class="row" style="margin-top:8px"><button class="btn s" data-act="hsOpen" data-id="${esc(h.id)}">${open ? 'Hide rooms' : 'View rooms & meals'}</button><span class="sp"></span><button class="btn s p" data-act="hsReq" data-id="${esc(h.id)}">Check & request</button></div>
    ${open ? `<div class="scroll" style="margin-top:10px">${table(['Room', 'Meal', 'Valid', 'Price', n ? `${n} nights × ${rooms} room${rooms > 1 ? 's' : ''}` : '', ''], rs.map((r, i) => `<tr><td><b>${esc(r.service)}</b>${r.notes ? `<div class="note">${esc(r.notes)}</div>` : ''}</td><td>${esc(r.meal)}</td><td class="note">${esc(r.validFrom)} → ${esc(r.validTo)}</td><td class="num">${esc(fmt(r.price, h.currency))}<div class="note">${esc(r.unit)}</div></td><td class="num">${total(r) ? esc(fmt(total(r), h.currency)) : ''}</td><td><button class="btn s" data-act="hsReq" data-id="${esc(h.id)}" data-k="${(h.rooms || []).indexOf(r)}">Request</button></td></tr>`))}</div>` : ''}</div></div>`; };
  return `<div class="pagehead"><div><h1>Hotels</h1><p class="lead">Our contracted hotels and tariffs. Availability is on request: choose a room and send it to us by WhatsApp or email.</p></div></div>
  <div class="card"><div class="grid hsearch"><label>Destination<select id="hs_dest">${dests.map(d => `<option ${d === s.dest ? 'selected' : ''}>${esc(d)}</option>`).join('') || '<option value="">No hotels yet</option>'}</select></label><label>City / area<select id="hs_city"><option value="">All areas</option>${cities.map(c => `<option ${c === s.city ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label>Check-in<input id="hs_cin" type="date" value="${esc(s.cin)}"></label><label>Check-out<input id="hs_cout" type="date" value="${esc(s.cout)}"></label><label>Rooms<input id="hs_rooms" type="number" min="1" value="${esc(s.rooms)}"></label><div style="align-self:end"><button class="btn p" data-act="hsSearch" style="width:100%">Search</button></div></div></div>
  <div class="hlayout"><div class="card hfilter"><h2>Filter</h2><label>Hotel name<input id="hs_name" value="${esc(s.name)}" placeholder="Type a name"></label><label>Stars<select id="hs_stars"><option value="">Any</option>${[5, 4, 3, 2].map(x => `<option value="${x}" ${String(x) === String(s.stars) ? 'selected' : ''}>${x} stars and up</option>`).join('')}</select></label><label>Max price from<input id="hs_max" type="number" value="${esc(s.max)}" placeholder="Any"></label><label>Sort by<select id="hs_sort">${[['price', 'Lowest price'], ['stars', 'Stars'], ['name', 'Name']].map(([v, l]) => `<option value="${v}" ${v === s.sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label><button class="btn" data-act="hsSearch">Apply</button></div>
  <div><p class="note">${res.length} ${res.length === 1 ? 'hotel' : 'hotels'}${n ? ` · ${n} nights` : ''}</p>${res.map(card).join('') || '<div class="empty">No hotels match. Try another area or remove a filter.</div>'}</div></div>`;
} };
P.tours = { title: 'Tours', render() {
  const f = UI.tf = UI.tf || { dest: '', type: '', name: '' };
  const items = (S.portal || []).filter(d => d.kind === 'tour').flatMap(d => (d.items || []).map((x, i) => ({ ...x, d, i, destination: d.destination, currency: d.currency }))).filter(x => !x.validTo || x.validTo >= today());
  const dests = [...new Set(items.map(x => x.destination).filter(Boolean))].sort(); const types = [...new Set(items.map(x => x.type).filter(Boolean))].sort();
  const r = items.filter(x => (!f.dest || x.destination === f.dest) && (!f.type || x.type === f.type) && (!f.name || (x.service + ' ' + x.city).toLowerCase().includes(f.name.toLowerCase())));
  return `<div class="pagehead"><div><h1>Tours & transfers</h1><p class="lead">Tours, transfers and activities with your prices. Send a request and we confirm.</p></div></div>
  <div class="card"><div class="grid"><label>Destination<select id="tf_dest"><option value="">All</option>${dests.map(d => `<option ${d === f.dest ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label><label>Type<select id="tf_type"><option value="">All</option>${types.map(d => `<option ${d === f.type ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label><label>Search<input id="tf_name" value="${esc(f.name)}" placeholder="Tour or city"></label><div style="align-self:end"><button class="btn p" data-act="tfApply">Apply</button></div></div></div>
  <div class="card">${table(['Tour / service', 'Destination', 'Type', 'Price', ''], r.map(x => `<tr><td><b>${esc(x.service)}</b>${x.notes ? `<div class="note">${esc(x.notes)}</div>` : ''}</td><td>${esc(x.destination)}${x.city ? `<div class="note">${esc(x.city)}</div>` : ''}</td><td>${esc(x.type)}</td><td class="num">${esc(fmt(x.price, x.currency))}<div class="note">${esc(x.unit)}</div></td><td><button class="btn s p" data-act="tourReq" data-id="${esc(x.d.id)}" data-k="${x.i}">Request</button></td></tr>`), 'No tours published yet.')}</div>`;
} };
function reqModal(title, text, extra = {}) {
  UI.hsReq = { title, text, ...extra };
  openModal('Send request', `<p class="note">Availability is on request. Choose how to send it and we reply with confirmation.</p><textarea id="hsText" style="min-height:190px">${esc(text)}</textarea><div class="row" style="margin-top:12px"><button class="btn p" data-act="hsSend" data-k="wa" ${waNo() ? '' : 'disabled'}>Send on WhatsApp</button><button class="btn" data-act="hsSend" data-k="mail" ${reqEmail() ? '' : 'disabled'}>Send by email</button></div>`);
}

/* ---------- agent portal footer, RezLive style ---------- */
const SOC = { instagram: ['Instagram', 'M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 16a4 4 0 100-8 4 4 0 000 8zM17.5 6.5h.01'], facebook: ['Facebook', 'M15 3h-2a4 4 0 00-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 011-1h2z'], linkedin: ['LinkedIn', 'M4 9h4v12H4zM6 3a2 2 0 110 4 2 2 0 010-4zM10 9h4v2c.6-1.2 2-2.2 4-2.2 3 0 4 2 4 5V21h-4v-6c0-1.5-.5-2.5-2-2.5S14 13.6 14 15v6h-4z'], tiktok: ['TikTok', 'M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.5 2.5 2.5 4.5 5 4.8']};
const sIco = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
export function portalFooter() {
  const p = portal(), co = myCo(); const lines = s => esc(s || '').replace(/\n/g, '<br>');
  const soc = Object.entries(SOC).filter(([k]) => /^https:\/\//.test(p[k] || '')).map(([k, [l, d]]) => `<a href="${esc(p[k])}" target="_blank" rel="noopener" aria-label="${l}">${sIco(d)}</a>`).join('');
  const wa = waNo();
  return `<div class="pf-in"><div><b class="pf-h">${esc(co.name || 'Le Ceylan')}</b><div class="pf-t">${lines(co.address)}</div>${co.trn ? `<div class="pf-t">TRN ${esc(co.trn)}</div>` : ''}</div>
  <div><b class="pf-h">Contact us</b>${co.phone ? `<div class="pf-t">${esc(co.phone)}</div>` : ''}${wa ? `<div class="pf-t"><a href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a></div>` : ''}${reqEmail() ? `<div class="pf-t"><a href="mailto:${esc(reqEmail())}">${esc(reqEmail())}</a></div>` : ''}${co.web ? `<div class="pf-t"><a href="${esc(/^https?:/.test(co.web) ? co.web : 'https://' + co.web)}" target="_blank" rel="noopener">${esc(co.web.replace(/^https?:\/\//, ''))}</a></div>` : ''}</div>
  <div><b class="pf-h">Payment options</b><div class="pf-t">${lines(p.payments || 'Bank transfer')}</div>${co.bank ? `<div class="pf-t" style="margin-top:6px">${lines(co.bank)}</div>` : ''}</div>
  <div><b class="pf-h">Follow us</b><div class="pf-soc">${soc || '<span class="pf-t">—</span>'}</div></div></div>
  <div class="pf-bot">© ${new Date().getFullYear()} ${esc(co.name || 'Le Ceylan')}. All rights reserved.</div>`;
}

/* ---------- actions ---------- */
export const MORE_A = {
  async toCurative(_, btn) {
    const b = UI.edit?.rec, cv = curCo(); if (!b?.id || !cv) return; if (!confirmBtn(btn, 'Click again to send')) return; btn.disabled = true;
    try {
      const me = coById(b.company);
      let ag = S.agents.find(a => a.company === cv.id && (a.internalFor === b.company || (a.name || '').toLowerCase() === (me.name || '').toLowerCase()));
      const agId = ag?.id || await save('agents', { name: me.name || 'Le Ceylan', company: cv.id, type: 'Travel Agent', currency: me.currency || 'USD', email: me.email || '', phone: me.phone || '', internalFor: b.company, creditDays: 30 }, { silent: true });
      const { id, emails, payments, invoiceNo, invoiceDate, dueDate, linkedTo, ...rest } = b;
      const no = (cv.short || 'CV') + '-' + String(b.no || '').replace(/^[A-Za-z]+-?/, '');
      const cvId = await save('bookings', { ...rest, company: cv.id, agent: agId, no, currency: rest.currency || 'USD', markupMethod: 'percent', markup: num(cfg().interMarkup ?? 10), discountPct: 0, payments: [], linkedFrom: b.id, linkedNo: b.no || '', agentRef: b.no || '', status: 'Under process' }, { silent: true });
      if (!cvId) throw new Error('save failed');
      await updateDoc(doc(db, 'bookings', b.id), { linkedTo: cvId, handledBy: cv.id }); b.linkedTo = cvId; b.handledBy = cv.id;
      toast('Sent to ' + cv.name + ' as ' + no); rerender();
    } catch (e) { toast('Could not send: ' + (e.code || e.message)); btn.disabled = false; }
  },
  async approveRec(v, btn) { const [c, id] = v.split('|'); btn.disabled = true; try { await updateDoc(doc(db, c, id), { approved: true, approvedBy: S.user.uid, approvedAt: new Date().toISOString() }); toast('Approved'); } catch (e) { toast('Could not approve: ' + (e.code || '')); btn.disabled = false; } },
  async approveAll(_, btn) { if (!confirmBtn(btn, `Click again to approve ${pendingCount()}`)) return; btn.disabled = true; let n = 0; try { let b = writeBatch(db), k = 0; for (const { c, x } of pending()) { b.update(doc(db, c, x.id), { approved: true, approvedBy: S.user.uid, approvedAt: new Date().toISOString() }); n++; if (++k >= 400) { await b.commit(); b = writeBatch(db); k = 0; } } if (k) await b.commit(); toast(n + ' approved'); } catch (e) { toast('Could not approve: ' + (e.code || '')); } btn.disabled = false; },
  async rejectRec(v, btn) { if (!confirmBtn(btn, 'Click again to delete')) return; const [c, id] = v.split('|'); const { deleteDoc } = await import('./fb.js'); try { await deleteDoc(doc(db, c, id)); toast('Rejected and removed'); } catch (e) { toast('Could not remove: ' + (e.code || '')); } },
  addTier() { const box = $('#tierRows'); const used = [...box.querySelectorAll('.tierRow')].map(x => x.dataset.id); const id = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(l => !used.includes(l)); if (!id) return; box.insertAdjacentHTML('beforeend', `<div class="grid tierRow" data-id="${id}" style="margin-bottom:8px"><label>Group ${id} name<input class="tName" value=""></label><label>Markup %<input class="tMk" type="number" step="any" value="12"></label></div>`); },
  async savePortalSet() {
    const v = id => ($('#' + id)?.value || '').trim();
    const banner = v('ps_banner'); if (banner && !/^https:\/\//.test(banner)) { toast('The banner link must start with https://'); return; }
    const t = [...document.querySelectorAll('.tierRow')].map(r => ({ id: r.dataset.id, name: r.querySelector('.tName').value.trim() || 'Group ' + r.dataset.id, markup: num(r.querySelector('.tMk').value), mk: Object.fromEntries([...r.querySelectorAll('.tSv')].filter(i => i.value !== '').map(i => [i.dataset.sv, num(i.value)])), slPP: r.querySelector('.tSl')?.value === '' ? '' : num(r.querySelector('.tSl')?.value) }));
    try { await setDoc(doc(db, 'settings', 'main'), { portal: { ...portal(), headline: v('ps_head'), welcome: v('ps_text'), banner, whatsapp: v('ps_wa'), email: v('ps_email'), instagram: v('ps_ig'), facebook: v('ps_fb'), linkedin: v('ps_li'), tiktok: v('ps_tt'), payments: ($('#ps_pay')?.value || '').trim(), videos: ($('#ps_vid')?.value || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(c => c[0] && c[2]).map(([lang, title, url]) => ({ lang, title, url })), visa: ($('#ps_visa')?.value || '').split('\n').map(l => l.split('|').map(x => x.trim())).filter(c => c[0]).map(([country, fee, currency, docs, requirements]) => ({ country, fee: num(fee), currency: currency || 'USD', docs: docs || '', requirements: requirements || '' })), currency: v('ps_cur') || 'USD' }, tiers: t }, { merge: true }); toast('Saved. Publish prices to update what agents see.'); } catch (e) { toast('Could not save: ' + (e.code || '')); }
  },
  publishPortal(_, btn) { publishPortal(btn); },
  mailSup(idx, el) {
    const b = UI.edit?.rec; if (!b) return; if (!b.id) { toast('Save the booking first'); return; }
    const d = mailDraft(b, el.dataset.k, idx); UI.mail = { ...d, k: el.dataset.k, idx };
    loadGIS().catch(() => { });
    openModal('Email ' + (d.supName || 'supplier'), `<div style="display:grid;gap:10px"><label>To<input id="mTo" type="email" value="${esc(d.to)}" placeholder="hotel reservations email"></label><label>Copy to<input id="mCc" value="${esc(d.cc)}"></label><label>Subject<input id="mSubj" value="${esc(d.subject)}"></label><label>Message<textarea id="mBody" style="min-height:280px">${esc(d.text)}</textarea></label>
      <div class="row"><span class="note">Sends from your own Gmail (${esc(S.me?.email || '')}). ${d.threadId ? 'Goes in the same email thread as before.' : ''}</span><span class="sp"></span><button class="btn p" data-act="mailSend">Send email</button></div></div>`);
  },
  async mailSend(_, btn) {
    const m = UI.mail, b = UI.edit?.rec; if (!m || !b) return;
    const to = $('#mTo').value.trim(), cc = $('#mCc').value.trim(), subject = $('#mSubj').value.trim(), text = $('#mBody').value;
    if (!/.+@.+\..+/.test(to)) { toast('Add the supplier email'); return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await gmailSend({ to, cc, subject, text }, m.threadId);
      const entry = { at: new Date().toISOString(), to, cc, subject, by: S.me?.name || S.me?.email || '', byUid: S.user.uid, supplier: m.key, supName: m.supName, sec: m.k, idx: +m.idx, threadId: r.threadId || '' };
      const list = [...((S.bookings.find(x => x.id === b.id) || {}).emails || []), entry];
      await updateDoc(doc(db, 'bookings', b.id), { emails: list }); b.emails = list;
      closeModal(); toast('Email sent to ' + to); rerender();
    } catch (e) { toast(e.message || 'Could not send'); btn.disabled = false; btn.textContent = 'Send email'; }
  },
  hsSearch() { const s = hs(); const v = id => $('#' + id)?.value ?? ''; const nd = v('hs_dest'); if (nd !== s.dest) s.city = ''; Object.assign(s, { dest: nd, city: nd !== s.dest ? '' : v('hs_city'), cin: v('hs_cin'), cout: v('hs_cout'), rooms: v('hs_rooms') || 1, name: v('hs_name'), stars: v('hs_stars'), max: v('hs_max'), sort: v('hs_sort') || 'price' }); if (s.cin && s.cout && s.cout <= s.cin) { toast('Check-out must be after check-in'); s.cout = ''; } rerender(); },
  hsOpen(id) { const s = hs(); s.open[id] = !s.open[id]; rerender(); },
  hsReq(id, el) {
    const h = (S.portal || []).find(d => d.id === id); if (!h) return; const s = hs(); const r = el.dataset.k !== undefined ? (h.rooms || [])[+el.dataset.k] : null; const n = nightsOf(s.cin, s.cout);
    const text = `Hello, please check availability:\n\nHotel: ${h.name}${h.city ? ', ' + h.city : ''} (${h.destination})${r ? `\nRoom: ${r.service}\nMeal: ${r.meal}\nRate: ${fmt(r.price, h.currency)} ${r.unit}` : ''}\nCheck-in: ${s.cin || '…'}\nCheck-out: ${s.cout || '…'}${n ? ` (${n} nights)` : ''}\nRooms: ${num(s.rooms) || 1}\nGuests: \nNationality: \n\nAgent: ${S.myAgent?.name || ''} · ${S.me?.name || ''}`;
    reqModal(`${h.name}${r ? ' · ' + r.service : ''}`, text, { arrival: s.cin, departure: s.cout, destination: h.destination });
  },
  tfApply() { const f = UI.tf; Object.assign(f, { dest: $('#tf_dest').value, type: $('#tf_type').value, name: $('#tf_name').value }); rerender(); },
  tourReq(id, el) { const d = (S.portal || []).find(x => x.id === id); const x = d?.items?.[+el.dataset.k]; if (!x) return; reqModal(x.service, `Hello, please check availability:\n\n${x.type || 'Tour'}: ${x.service} (${d.destination}${x.city ? ', ' + x.city : ''})\nRate: ${fmt(x.price, d.currency)} ${x.unit}\nDate: \nGuests: \n\nAgent: ${S.myAgent?.name || ''} · ${S.me?.name || ''}`, { destination: d.destination }); },
  async hsSend(_, el) {
    const q = UI.hsReq; if (!q) return; const text = $('#hsText').value;
    const url = el.dataset.k === 'wa' ? `https://wa.me/${waNo()}?text=${encodeURIComponent(text)}` : `mailto:${reqEmail()}?subject=${encodeURIComponent('Availability request · ' + q.title)}&body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    closeModal();
    await save('requests', { agentId: S.me.agentId, byName: S.me.name || '', title: q.title, arrival: q.arrival || '', departure: q.departure || '', destination: q.destination || '', notes: text, status: 'New request', channel: el.dataset.k === 'wa' ? 'WhatsApp' : 'Email' }, { silent: true });
    toast('Request saved in My requests');
  },
  async seedCos(_, btn) {
    if (!confirmBtn(btn, 'Click again to set up the four companies')) return;
    const cos = (cfg().companies || []).map(c => ({ ...c }));
    const has = re => cos.find(c => re.test(c.name || ''));
    const base = has(/le ceylan/i);
    if (base && !/uae|sri|bali/i.test(base.name)) Object.assign(base, { name: 'Le Ceylan UAE', group: 'Le Ceylan', country: 'UAE', currency: base.currency || 'AED' });
    const add = (name, extra) => { if (!has(new RegExp(name.replace(/ /g, '.*'), 'i'))) cos.push({ id: 'co' + Math.random().toString(36).slice(2, 8), name, ...extra }); };
    add('Le Ceylan UAE', { group: 'Le Ceylan', country: 'UAE', currency: 'AED', short: 'LC', vat: 5 });
    add('Le Ceylan Sri Lanka', { group: 'Le Ceylan', country: 'Sri Lanka', currency: 'USD', short: 'LK' });
    add('Le Ceylan Bali', { group: 'Le Ceylan', country: 'Indonesia', currency: 'USD', short: 'BL' });
    const cur = has(/curative/i); if (cur) Object.assign(cur, { name: /vacation/i.test(cur.name) ? cur.name : 'Curative Vacations Sri Lanka', group: 'Curative', country: 'Sri Lanka' }); else add('Curative Vacations Sri Lanka', { group: 'Curative', country: 'Sri Lanka', currency: 'USD', short: 'CV' });
    try { await setDoc(doc(db, 'settings', 'main'), { companies: cos }, { merge: true }); toast('Companies set up. Fill in their details and save.'); } catch (e) { toast('Could not save: ' + (e.code || '')); }
  },
};
