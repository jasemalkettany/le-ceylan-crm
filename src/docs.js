import { photoTag, hydratePhotos, dayDate, prettyDate, programText } from './core.js';
import { S, esc, num, fmt, today, addDays, coById, supName, agentName, totals, flatLines, received, inCo, curCo, cfg, openModal, toast, ROOM_TYPES, nightsBetween } from './core.js';

const P = 'font-family:Poppins,Arial,Helvetica,sans-serif;color:#3C79A9;font-size:13px;line-height:1.5';
const th = 'padding:8px;border-bottom:2px solid #3C79A9;text-align:left;font-size:11px;color:#2B3B52;letter-spacing:.02em', td = 'padding:8px;border-bottom:1px solid #E4E0D8;vertical-align:top';
const kv = (k, v) => v ? `<tr><td style="padding:3px 12px 3px 0;color:#6A7790;white-space:nowrap">${esc(k)}</td><td style="padding:3px 0"><b>${esc(v)}</b></td></tr>` : '';
const blk = (t, v) => v ? `<div style="margin-top:14px"><div style="font-weight:700;color:#3C79A9;margin-bottom:4px">${esc(t)}</div><div style="white-space:pre-line">${esc(v)}</div></div>` : '';
const paxTxt = r => `${num(r.adults)} adults${num(r.children) ? ', ' + num(r.children) + ' children' : ''}`;
function head(co, title, no, date) {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><td style="vertical-align:top"><div style="font:700 22px Poppins,Arial;color:#3C79A9">${esc(co.name)}</div><div style="white-space:pre-line;color:#6A7790">${esc(co.address)}</div><div style="color:#6A7790">${esc(co.phone)}${co.email ? ' · ' + esc(co.email) : ''}</div>${co.trn ? `<div style="color:#6A7790">TRN ${esc(co.trn)}</div>` : ''}</td><td style="text-align:right;vertical-align:top"><div style="font:700 24px Poppins,Arial;color:#3C79A9">${esc(title)}</div><div>No. <b>${esc(no)}</b></div><div>Date ${esc(date)}</div></td></tr></table><div style="height:4px;background:linear-gradient(90deg,#3C79A9,#3C79A9 70%,#2B3033);border-radius:4px;margin-bottom:18px"></div>`;
}
function guest(r) { const a = S.agents.find(x => x.id === r.agent) || (S.myAgent?.id === r.agent ? S.myAgent : {}) || {}; return `<table style="border-collapse:collapse;margin-bottom:14px">${kv('Agent', a.name)}${kv('Agent ref', r.agentRef)}${kv('Lead guest', r.lead)}${kv('Pax', paxTxt(r))}${kv('Nationality', r.nationality)}${kv('Travel dates', (r.arrival || '') + ' to ' + (r.departure || ''))}${kv('Arrival flight', r.flightIn)}${kv('Departure flight', r.flightOut)}</table>`; }
function svc(r, priced, conf) {
  const qc = r.currency;
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><tr><th style="${th}">DATE</th><th style="${th}">SERVICE</th><th style="${th}">DETAILS</th>${conf ? `<th style="${th}">CONFIRMATION</th>` : ''}${priced ? `<th style="${th};text-align:right">AMOUNT (${esc(qc)})</th>` : ''}</tr>${flatLines(r).map(l => { const sn = l.type === 'Hotel' ? '' : supName(l.supplier, l); return `<tr><td style="${td};white-space:nowrap">${esc(l.date)}</td><td style="${td}">${esc(l.type)}${conf && sn ? ': ' + esc(sn) : ''}</td><td style="${td}">${esc(l.desc)}</td>${conf ? `<td style="${td}">${esc(l.conf)}</td>` : ''}${priced ? `<td style="${td};text-align:right">${esc(fmt(l.sell, qc))}</td>` : ''}</tr>`; }).join('')}</table>`;
}

function itinDoc(r, priced, brochure) {
  const co = coById(r.company); const t = brochure ? null : totals(r); const qc = r.currency;
  const pr = r.program || []; const dest = (r.destinations || []).join(' & ') || r.destination || '';
  const nights = brochure ? num(r.nights) : (r.arrival && r.departure ? Math.round((new Date(r.departure) - new Date(r.arrival)) / 864e5) : pr.length ? pr.length - 1 : 0);
  const cover = (r.photos || [])[0] || (pr.find(d => (d.photos || []).length)?.photos || [])[0];
  const hotels = brochure ? [] : (r.hotelNames || (r.hotelsIncluded === false ? [] : r.hotels || []));
  let h = (priced ? `<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><tr><td><div style="font:700 20px Poppins,Arial;color:#3C79A9">${esc(co.name)}</div><div style="color:#6A7790">${esc(co.phone)}${co.email ? ' · ' + esc(co.email) : ''}</div></td><td style="text-align:right;color:#6A7790">${esc(r.no || r.code || '')}</td></tr></table>` : '') +
    (cover ? `<div style="margin-bottom:16px">${photoTag(cover, 'width:100%;height:280px;object-fit:cover;border-radius:12px;display:block')}</div>` : '') +
    `<div style="font:700 28px Poppins,Arial;color:#3C79A9;line-height:1.15">${esc(r.title || (dest ? dest + ' itinerary' : 'Your itinerary'))}</div>
    <div style="color:#2B3033;font-weight:600;margin:6px 0 14px">${esc(dest)}${nights ? ` · ${nights} nights / ${nights + 1} days` : ''}${!brochure && r.arrival ? ` · ${esc(prettyDate(r.arrival))} – ${esc(prettyDate(r.departure))}` : ''}</div>` +
    (!brochure ? `<table style="border-collapse:collapse;margin-bottom:16px">${kv('Guest', r.lead)}${kv('Travellers', paxTxt(r))}</table>` : (r.summary ? `<p style="font-size:14px">${esc(r.summary)}</p>` : ''));
  if (pr.length) h += pr.map((d, i) => `<div style="display:flex;gap:16px;padding:14px 0;border-top:1px solid #DFE5EF;page-break-inside:avoid">${(d.photos || [])[0] ? `<div style="flex:0 0 210px">${photoTag(d.photos[0], 'width:210px;height:150px;object-fit:cover;border-radius:10px;display:block')}</div>` : ''}<div style="flex:1"><div style="font:600 12px Poppins,Arial;color:#2B3033;text-transform:uppercase;letter-spacing:.04em">Day ${i + 1}${!brochure && dayDate(r, i) ? ' · ' + esc(prettyDate(dayDate(r, i))) : ''}</div><div style="font:700 17px Poppins,Arial;color:#3C79A9;margin:2px 0 6px">${esc(d.title)}</div><div style="white-space:pre-line">${esc(d.description)}</div>${d.overnight || d.meals ? `<div style="margin-top:6px;color:#6A7790;font-size:12px">${d.overnight ? 'Overnight: <b>' + esc(d.overnight) + '</b>' : ''}${d.overnight && d.meals ? ' · ' : ''}${d.meals ? 'Meals: ' + esc(d.meals) : ''}</div>` : ''}</div></div>`).join('');
  else h += blk('Day by day', brochure ? r.days : r.itinerary);
  if (hotels.length) h += `<div style="margin-top:16px;font-weight:700;color:#3C79A9">Hotels</div><table style="width:100%;border-collapse:collapse;margin-top:6px">${hotels.map(x => `<tr><td style="${td}"><b>${esc(x.name)}</b>${x.category ? ' · ' + esc(x.category) : ''}</td><td style="${td}">${esc(x.checkIn)} → ${esc(x.checkOut)}</td><td style="${td}">${esc(x.meal)}</td></tr>`).join('')}</table>`;
  else if (brochure && r.hotels) h += blk('Hotels', r.hotels);
  h += blk('Inclusions', r.inclusions) + blk('Exclusions', r.exclusions);
  if (priced && t) h += `<div style="margin-top:18px;background:#EDF3F8;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px"><div><div style="color:#6A7790;font-size:12px">Package price</div><div style="font:700 22px Poppins,Arial;color:#3C79A9">${esc(fmt(t.sell, qc))}</div></div><div><div style="color:#6A7790;font-size:12px">Per person</div><div style="font:700 22px Poppins,Arial;color:#2B3033">${esc(fmt(t.perPax, qc))}</div></div></div>${r.validUntil ? `<p style="color:#6A7790">Valid until ${esc(r.validUntil)}.</p>` : ''}`;
  if (priced && brochure && num(r.priceFrom)) h += `<p style="font:700 18px Poppins,Arial;color:#2B3033;margin-top:16px">From ${esc(fmt(r.priceFrom, r.currency))} per person</p>`;
  if (priced) h += blk('Terms & conditions', r.terms) + `<p style="margin-top:18px;color:#6A7790">For bookings: ${esc(co.email)} · ${esc(co.phone)}</p>`;
  return h;
}
export function buildDoc(kind, r) {
  const co = coById(r.company), t = totals(r), qc = r.currency; let h = '', title = '';
  if (kind === 'itinPrice' || kind === 'itinPlain' || kind === 'itinBrochure') { const pr = kind !== 'itinPlain'; title = kind === 'itinBrochure' ? 'Itinerary brochure' : pr ? 'Itinerary with price & logo' : 'Itinerary without price & logo'; return { title, fn: (r.no || r.code || 'itinerary') + '-' + kind, html: `<div style="${P}">${itinDoc(r, pr, kind === 'itinBrochure')}</div>` }; }
  if (kind === 'quotePrice' || kind === 'quoteNoPrice') {
    const pr = kind === 'quotePrice'; title = pr ? 'Quotation' : 'Tour proposal';
    h = (pr ? head(co, title, r.no || '', today()) : `<div style="font:700 26px Poppins,Arial;margin-bottom:14px">${esc((r.destinations || []).join(' & ') || r.destination || '')} tour proposal</div>`) + guest(r) + svc(r, false) +
      (pr ? `<table style="margin-left:auto;border-collapse:collapse">${kv('Total package price', fmt(t.sell, qc))}${kv('Price per person', fmt(t.perPax, qc))}${kv('Valid until', r.validUntil)}</table>` : '') +
      blk('Itinerary', r.itinerary) + blk('Inclusions', r.inclusions) + blk('Exclusions', r.exclusions) + blk('Terms & conditions', r.terms) + (pr ? `<p style="margin-top:22px;color:#6A7790">For bookings: ${esc(co.email)} · ${esc(co.phone)}</p>` : '');
  }
  if (kind === 'proforma' || kind === 'tax') {
    const tax = kind === 'tax'; title = tax ? 'Tax Invoice' : 'Proforma Invoice';
    const vat = tax ? num(co.vat) : 0, net = vat ? t.sell / (1 + vat / 100) : t.sell, rc = received(r);
    const a = S.agents.find(x => x.id === r.agent) || (S.myAgent?.id === r.agent ? S.myAgent : {}) || {};
    h = head(co, title, r.invoiceNo || '', r.invoiceDate || today()) + `<table style="width:100%;margin-bottom:12px"><tr><td style="vertical-align:top"><div style="color:#6A7790">Bill to</div><b>${esc(a.name)}</b><div style="white-space:pre-line">${esc(a.address)}</div>${a.trn ? '<div>TRN ' + esc(a.trn) + '</div>' : ''}</td><td style="vertical-align:top"><table style="margin-left:auto;border-collapse:collapse">${kv('Tour no', r.no)}${kv('Lead guest', r.lead)}${kv('Travel dates', (r.arrival || '') + ' to ' + (r.departure || ''))}${kv('Payment due', r.dueDate)}</table></td></tr></table>` + svc(r, true) +
      `<table style="margin-left:auto;border-collapse:collapse;min-width:300px">${vat ? kv('Amount before VAT', fmt(net, qc)) + kv('VAT ' + vat + '%', fmt(t.sell - net, qc)) : ''}${kv('Total', fmt(t.sell, qc))}${rc ? kv('Received', fmt(rc, qc)) + kv('Balance due', fmt(t.sell - rc, qc)) : ''}</table>` + blk('Bank details', co.bank);
  }
  if (kind === 'confirm') { title = 'Confirmation Voucher'; h = head(co, title, r.no || '', today()) + guest(r) + svc(r, false, true) + blk('Guest names', r.rooming) + blk('Itinerary', r.itinerary) + `<p style="margin-top:20px;color:#6A7790">Emergency contact: ${esc(co.phone)}</p>`; }
  if (kind === 'hotelv') {
    title = 'Hotel Voucher'; const hs = r.hotelsIncluded === false ? [] : (r.hotels || []);
    h = hs.length ? hs.map((ho, i) => { const s = S.suppliers.find(x => x.id === ho.supplierId) || {}; const rooms = ROOM_TYPES.filter(([k]) => num(ho.rooms?.[k]?.n)).map(([k, l]) => `${num(ho.rooms[k].n)} ${l}`).join(', '); return `<div style="${i ? 'page-break-before:always;margin-top:40px;' : ''}">` + head(co, title, (r.no || '') + '-H' + (i + 1), today()) + `<table style="border-collapse:collapse;margin-bottom:14px">${kv('To', ho.name || s.name)}${kv('Hotel email', s.email)}${kv('Guest name', r.lead)}${kv('Check in', ho.checkIn)}${kv('Check out', ho.checkOut)}${kv('Nights', nightsBetween(ho.checkIn, ho.checkOut))}${kv('Room category', ho.category)}${kv('Rooms', rooms)}${kv('Meal plan', ho.meal)}${kv('Pax', paxTxt(r))}${kv('Hotel confirmation', ho.conf)}</table>` + blk('Rooming list', r.rooming) + blk('Special requests', r.notes) + `<p style="margin-top:16px">All charges as per contract are billed to ${esc(co.name)}. Extras are paid directly by the guest.</p></div>`; }).join('') : '<p>No hotels in this booking.</p>';
  }
  return { title, fn: (r.invoiceNo && kind.match(/proforma|tax/) ? r.invoiceNo : r.no || 'document') + '-' + kind, html: `<div style="${P}">${h}</div>` };
}

export function statement(agentId) {
  const a = S.agents.find(x => x.id === agentId) || (S.myAgent?.id === agentId ? S.myAgent : {}) || {};
  const bk = S.bookings.filter(b => b.agent === agentId && b.status !== 'Cancelled' && inCo(b)); const ev = [];
  bk.forEach(b => { ev.push({ d: b.invoiceDate || b.arrival || '', ref: `${b.invoiceNo} · ${b.no} · ${b.lead || ''}`, dr: totals(b).sell, cr: 0, c: b.currency }); (b.payments || []).forEach(p => ev.push({ d: p.date || '', ref: `Payment ${p.ref || p.method || ''} · ${b.invoiceNo}`, dr: 0, cr: num(p.amount), c: b.currency })); });
  ev.sort((x, y) => x.d.localeCompare(y.d)); const curs = [...new Set(ev.map(e => e.c))];
  const co = coById(curCo() || bk[0]?.company || cfg().companies[0]?.id);
  const h = head(co, 'Statement of Account', a.code || '', today()) + `<p><b>${esc(a.name)}</b></p>` + curs.map(c => { let bal = 0; return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr><th style="${th}">DATE</th><th style="${th}">DETAILS</th><th style="${th};text-align:right">INVOICED</th><th style="${th};text-align:right">PAID</th><th style="${th};text-align:right">BALANCE (${esc(c)})</th></tr>${ev.filter(e => e.c === c).map(e => { bal += e.dr - e.cr; return `<tr><td style="${td}">${esc(e.d)}</td><td style="${td}">${esc(e.ref)}</td><td style="${td};text-align:right">${e.dr ? esc(fmt(e.dr, c)) : ''}</td><td style="${td};text-align:right">${e.cr ? esc(fmt(e.cr, c)) : ''}</td><td style="${td};text-align:right"><b>${esc(fmt(bal, c))}</b></td></tr>`; }).join('')}</table>`; }).join('') + (ev.length ? '' : '<p>No invoices yet.</p>') + blk('Bank details', co.bank);
  return { title: 'Statement', fn: 'statement-' + (a.name || 'agent').replace(/\W+/g, '-'), html: `<div style="${P}">${h}</div>` };
}

let cur = null;
export function showDoc(d) { cur = d; openModal(d.title, `<div style="max-width:800px;margin:auto">${d.html}</div>`, `<button class="btn s p" data-act="printDoc">Print or save as PDF</button>`); hydratePhotos(document.querySelector('#mbody')); }
export function printDoc() {
  if (!cur) return; const w = window.open('', '_blank');
  if (!w) { toast('Allow pop-ups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(cur.fn)}</title><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet"><style>@page{margin:14mm}body{margin:0;padding:24px}</style></head><body>${document.querySelector('#mbody')?.innerHTML || cur.html}</body></html>`);
  w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 600);
}
