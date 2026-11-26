import { S, esc, num, fmt, today, addDays, coById, supName, agentName, totals, lineCalc, received, inCo, curCo, cfg, openModal, toast } from './core.js';

const P = 'font-family:Inter,Arial,Helvetica,sans-serif;color:#13233A;font-size:13px;line-height:1.5';
const th = 'padding:8px;border-bottom:2px solid #13233A;text-align:left;font-size:11px;color:#2B3B52;letter-spacing:.02em', td = 'padding:8px;border-bottom:1px solid #E4E0D8;vertical-align:top';
const kv = (k, v) => v ? `<tr><td style="padding:3px 12px 3px 0;color:#6B7A8C;white-space:nowrap">${esc(k)}</td><td style="padding:3px 0"><b>${esc(v)}</b></td></tr>` : '';
const blk = (t, v) => v ? `<div style="margin-top:14px"><div style="font-weight:700;color:#3C79A9;margin-bottom:4px">${esc(t)}</div><div style="white-space:pre-line">${esc(v)}</div></div>` : '';
const paxTxt = r => `${num(r.adults)} adults${num(r.children) ? ', ' + num(r.children) + ' children' : ''}`;
function head(co, title, no, date) {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px"><tr><td style="vertical-align:top"><div style="font:700 22px Outfit,Arial;color:#13233A">${esc(co.name)}</div><div style="white-space:pre-line;color:#6B7A8C">${esc(co.address)}</div><div style="color:#6B7A8C">${esc(co.phone)}${co.email ? ' · ' + esc(co.email) : ''}</div>${co.trn ? `<div style="color:#6B7A8C">TRN ${esc(co.trn)}</div>` : ''}</td><td style="text-align:right;vertical-align:top"><div style="font:700 24px Outfit,Arial;color:#3C79A9">${esc(title)}</div><div>No. <b>${esc(no)}</b></div><div>Date ${esc(date)}</div></td></tr></table><div style="height:4px;background:linear-gradient(90deg,#13233A,#3C79A9 60%,#E2A03F);border-radius:4px;margin-bottom:18px"></div>`;
}
function guest(r) { const a = S.agents.find(x => x.id === r.agent) || (S.myAgent?.id === r.agent ? S.myAgent : {}) || {}; return `<table style="border-collapse:collapse;margin-bottom:14px">${kv('Agent', a.name)}${kv('Agent ref', r.agentRef)}${kv('Lead guest', r.lead)}${kv('Pax', paxTxt(r))}${kv('Nationality', r.nationality)}${kv('Travel dates', (r.arrival || '') + ' to ' + (r.departure || ''))}${kv('Arrival flight', r.flightIn)}${kv('Departure flight', r.flightOut)}</table>`; }
function svc(r, priced, conf) {
  const qc = r.currency;
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><tr><th style="${th}">DATE</th><th style="${th}">SERVICE</th><th style="${th}">DETAILS</th>${conf ? `<th style="${th}">CONFIRMATION</th>` : ''}${priced ? `<th style="${th};text-align:right">AMOUNT (${esc(qc)})</th>` : ''}</tr>${(r.lines || []).map(l => { const c = lineCalc(l, qc); const sn = supName(l.supplier, l); return `<tr><td style="${td};white-space:nowrap">${esc(l.date)}</td><td style="${td}">${esc(l.type)}${sn && (l.type === 'Hotel' || conf) ? ': ' + esc(sn) : ''}</td><td style="${td}">${esc(l.desc)}${l.meal ? ' · ' + esc(l.meal) : ''}${num(l.units) > 1 ? ` · ${num(l.units)} ${l.type === 'Hotel' ? 'nights' : 'days'}` : ''}${num(l.qty) > 1 ? ` · x${num(l.qty)}` : ''}</td>${conf ? `<td style="${td}">${esc(l.conf)}</td>` : ''}${priced ? `<td style="${td};text-align:right">${esc(fmt(c.sell, qc))}</td>` : ''}</tr>`; }).join('')}</table>`;
}

export function buildDoc(kind, r) {
  const co = coById(r.company), t = totals(r), qc = r.currency; let h = '', title = '';
  if (kind === 'quotePrice' || kind === 'quoteNoPrice') {
    const pr = kind === 'quotePrice'; title = pr ? 'Quotation' : 'Tour proposal';
    h = (pr ? head(co, title, r.no || '', today()) : `<div style="font:700 26px Outfit,Arial;margin-bottom:14px">${esc(r.destination || '')} tour proposal</div>`) + guest(r) + svc(r, false) +
      (pr ? `<table style="margin-left:auto;border-collapse:collapse">${kv('Total package price', fmt(t.sell, qc))}${kv('Price per person', fmt(t.perPax, qc))}${kv('Valid until', r.validUntil)}</table>` : '') +
      blk('Itinerary', r.itinerary) + blk('Inclusions', r.inclusions) + blk('Exclusions', r.exclusions) + (pr ? `<p style="margin-top:22px;color:#6B7A8C">For bookings: ${esc(co.email)} · ${esc(co.phone)}</p>` : '');
  }
  if (kind === 'proforma' || kind === 'tax') {
    const tax = kind === 'tax'; title = tax ? 'Tax Invoice' : 'Proforma Invoice';
    const vat = tax ? num(co.vat) : 0, net = vat ? t.sell / (1 + vat / 100) : t.sell, rc = received(r);
    const a = S.agents.find(x => x.id === r.agent) || (S.myAgent?.id === r.agent ? S.myAgent : {}) || {};
    h = head(co, title, r.invoiceNo || '', r.invoiceDate || today()) + `<table style="width:100%;margin-bottom:12px"><tr><td style="vertical-align:top"><div style="color:#6B7A8C">Bill to</div><b>${esc(a.name)}</b><div style="white-space:pre-line">${esc(a.address)}</div>${a.trn ? '<div>TRN ' + esc(a.trn) + '</div>' : ''}</td><td style="vertical-align:top"><table style="margin-left:auto;border-collapse:collapse">${kv('Tour no', r.no)}${kv('Lead guest', r.lead)}${kv('Travel dates', (r.arrival || '') + ' to ' + (r.departure || ''))}${kv('Payment due', r.dueDate)}</table></td></tr></table>` + svc(r, true) +
      `<table style="margin-left:auto;border-collapse:collapse;min-width:300px">${num(r.discount) ? kv('Discount', '-' + fmt(r.discount, qc)) : ''}${vat ? kv('Amount before VAT', fmt(net, qc)) + kv('VAT ' + vat + '%', fmt(t.sell - net, qc)) : ''}${kv('Total', fmt(t.sell, qc))}${rc ? kv('Received', fmt(rc, qc)) + kv('Balance due', fmt(t.sell - rc, qc)) : ''}</table>` + blk('Bank details', co.bank);
  }
  if (kind === 'confirm') { title = 'Confirmation Voucher'; h = head(co, title, r.no || '', today()) + guest(r) + svc(r, false, true) + blk('Guest names', r.rooming) + blk('Itinerary', r.itinerary) + `<p style="margin-top:20px;color:#6B7A8C">Emergency contact: ${esc(co.phone)}</p>`; }
  if (kind === 'hotelv') {
    title = 'Hotel Voucher'; const hs = (r.lines || []).filter(l => l.type === 'Hotel');
    h = hs.length ? hs.map((l, i) => { const s = S.suppliers.find(x => x.id === l.supplier) || {}; return `<div style="${i ? 'page-break-before:always;margin-top:40px;' : ''}">` + head(co, title, (r.no || '') + '-H' + (i + 1), today()) + `<table style="border-collapse:collapse;margin-bottom:14px">${kv('To', s.name)}${kv('Hotel email', s.email)}${kv('Guest name', r.lead)}${kv('Check in', l.date)}${kv('Check out', addDays(l.date, l.units))}${kv('Nights', l.units)}${kv('Rooms', (l.qty || 1) + ' x ' + (l.desc || ''))}${kv('Meal plan', l.meal)}${kv('Pax', paxTxt(r))}${kv('Hotel confirmation', l.conf)}</table>` + blk('Rooming list', r.rooming) + `<p style="margin-top:16px">All charges as per contract are billed to ${esc(co.name)}. Extras are paid directly by the guest.</p></div>`; }).join('') : '<p>No hotel lines in this booking.</p>';
  }
  return { title, fn: (r.invoiceNo && kind.match(/proforma|tax/) ? r.invoiceNo : r.no || 'document') + '-' + kind, html: `<div style="${P}">${h}</div>` };
}

export function statement(agentId) {
  const a = S.agents.find(x => x.id === agentId) || {};
  const bk = S.bookings.filter(b => b.agent === agentId && b.status !== 'Cancelled' && inCo(b)); const ev = [];
  bk.forEach(b => { ev.push({ d: b.invoiceDate || b.arrival || '', ref: `${b.invoiceNo} · ${b.no} · ${b.lead || ''}`, dr: totals(b).sell, cr: 0, c: b.currency }); (b.payments || []).forEach(p => ev.push({ d: p.date || '', ref: `Payment ${p.ref || p.method || ''} · ${b.invoiceNo}`, dr: 0, cr: num(p.amount), c: b.currency })); });
  ev.sort((x, y) => x.d.localeCompare(y.d)); const curs = [...new Set(ev.map(e => e.c))];
  const co = coById(curCo() || bk[0]?.company || cfg().companies[0]?.id);
  const h = head(co, 'Statement of Account', a.code || '', today()) + `<p><b>${esc(a.name)}</b></p>` + curs.map(c => { let bal = 0; return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr><th style="${th}">DATE</th><th style="${th}">DETAILS</th><th style="${th};text-align:right">INVOICED</th><th style="${th};text-align:right">PAID</th><th style="${th};text-align:right">BALANCE (${esc(c)})</th></tr>${ev.filter(e => e.c === c).map(e => { bal += e.dr - e.cr; return `<tr><td style="${td}">${esc(e.d)}</td><td style="${td}">${esc(e.ref)}</td><td style="${td};text-align:right">${e.dr ? esc(fmt(e.dr, c)) : ''}</td><td style="${td};text-align:right">${e.cr ? esc(fmt(e.cr, c)) : ''}</td><td style="${td};text-align:right"><b>${esc(fmt(bal, c))}</b></td></tr>`; }).join('')}</table>`; }).join('') + (ev.length ? '' : '<p>No invoices yet.</p>') + blk('Bank details', co.bank);
  return { title: 'Statement', fn: 'statement-' + (a.name || 'agent').replace(/\W+/g, '-'), html: `<div style="${P}">${h}</div>` };
}

let cur = null;
export function showDoc(d) { cur = d; openModal(d.title, `<div style="max-width:800px;margin:auto">${d.html}</div>`, `<button class="btn s p" data-act="printDoc">Print or save as PDF</button>`); }
export function printDoc() {
  if (!cur) return; const w = window.open('', '_blank');
  if (!w) { toast('Allow pop-ups to print'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(cur.fn)}</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>@page{margin:14mm}body{margin:0;padding:24px}</style></head><body>${cur.html}</body></html>`);
  w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 600);
}
