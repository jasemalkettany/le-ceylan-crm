import { db, doc, getDoc, setDoc, collection, onSnapshot, query, where, orderBy, limit } from './fb.js';
import { S, UI, $, esc, userName, toast, uploadPhotos, photoTag, hydratePhotos } from './core.js';

// Team chat on the free database: channels, direct messages and one thread per booking.
const C = { channels: new Map(), reads: {}, unsubs: [], msgUnsub: null, open: '', msgs: [] };
export const chatState = C;
let onChange = () => { };

export function startChat(cb) {
  stopChat(); onChange = cb; const uid = S.user.uid;
  const put = s => { s.docs.forEach(d => C.channels.set(d.id, { id: d.id, ...d.data() })); s.docChanges().forEach(ch => { if (ch.type === 'removed') C.channels.delete(ch.doc.id); }); onChange(); };
  C.unsubs.push(onSnapshot(query(collection(db, 'channels'), where('dm', '==', false)), put, e => console.error('channels', e)));
  C.unsubs.push(onSnapshot(query(collection(db, 'channels'), where('members', 'array-contains', uid)), put, e => console.error('dms', e)));
  C.unsubs.push(onSnapshot(doc(db, 'chatReads', uid), s => { C.reads = s.exists() ? s.data() : {}; onChange(); }, () => { }));
}
export function stopChat() { C.unsubs.forEach(u => { try { u(); } catch (e) { } }); C.unsubs = []; closeThread(); C.channels.clear(); }
export const unreadCount = () => [...C.channels.values()].filter(c => c.lastAt && c.lastBy !== S.user?.uid && (!C.reads[c.id] || C.reads[c.id] < c.lastAt) && c.kind !== 'booking').length;
const isUnread = c => c.lastAt && c.lastBy !== S.user?.uid && (!C.reads[c.id] || C.reads[c.id] < c.lastAt);
export const chName = c => c.dm ? (userName((c.members || []).find(m => m !== S.user.uid)) || 'Direct message') : (c.kind === 'booking' ? c.name : '# ' + (c.name || 'channel'));

export function closeThread() { if (C.msgUnsub) { C.msgUnsub(); C.msgUnsub = null; } C.open = ''; C.msgs = []; }
export async function openThread(cid, seed) {
  if (C.open === cid) return; closeThread(); C.open = cid;
  if (seed && !C.channels.has(cid)) { try { const s = await getDoc(doc(db, 'channels', cid)); if (!s.exists()) await setDoc(doc(db, 'channels', cid), { ...seed, createdAt: new Date().toISOString(), createdBy: S.user.uid }); } catch (e) { console.error(e); } }
  C.msgUnsub = onSnapshot(query(collection(db, 'channels', cid, 'messages'), orderBy('at'), limit(400)), s => { C.msgs = s.docs.map(d => ({ id: d.id, ...d.data() })); drawMessages(); markRead(cid); }, e => { console.error('messages', e); });
}
async function markRead(cid) { const now = new Date().toISOString(); if ((C.reads[cid] || '') >= (C.channels.get(cid)?.lastAt || '')) return; try { await setDoc(doc(db, 'chatReads', S.user.uid), { [cid]: now }, { merge: true }); } catch (e) { } }
/* files: photos are compressed; other files are split into parts so they fit the free database (8 MB each) */
const PART = 900000;
export async function uploadFile(file) {
  if (/^image\//.test(file.type)) { const ids = await uploadPhotos([file]); return { kind: 'photo', id: ids[0], name: file.name, size: file.size }; }
  if (file.size > 8 * 1024 * 1024) throw new Error('Files over 8 MB: share a Google Drive link instead');
  const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  const ref = doc(collection(db, 'files')); const n = Math.ceil(data.length / PART);
  for (let i = 0; i < n; i++) await setDoc(doc(db, 'files', ref.id, 'parts', String(i)), { d: data.slice(i * PART, (i + 1) * PART) });
  await setDoc(ref, { name: file.name, type: file.type, size: file.size, parts: n, by: S.user.uid, at: new Date().toISOString() });
  return { kind: 'file', id: ref.id, name: file.name, size: file.size };
}
export async function downloadFile(id) {
  const f = await getDoc(doc(db, 'files', id)); if (!f.exists()) { toast('File not found'); return; } const meta = f.data(); let data = '';
  for (let i = 0; i < meta.parts; i++) { const p = await getDoc(doc(db, 'files', id, 'parts', String(i))); data += p.data().d; }
  const a = document.createElement('a'); a.href = data; a.download = meta.name; document.body.appendChild(a); a.click(); a.remove();
}
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const attHTML = a => a.kind === 'photo' ? `<a href="#" data-act="viewPhoto" data-id="${esc(a.id)}" class="att">${photoTag(a.id, 'max-width:240px;max-height:180px;border-radius:10px;display:block')}</a>` : a.kind === 'link' ? `<a class="att file" href="${esc(a.url)}" target="_blank" rel="noopener"><span class="fi">LINK</span>${esc(a.name || a.url)}</a>` : `<a href="#" class="att file" data-act="dlFile" data-id="${esc(a.id)}"><span class="fi">${esc((a.name.split('.').pop() || 'file').slice(0, 4).toUpperCase())}</span>${esc(a.name)} <span class="note">${kb(a.size || 0)}</span></a>`;

export async function send(text, atts = []) {
  const cid = C.open; text = (text || '').trim(); if (!cid || (!text && !atts.length)) return;
  const at = new Date().toISOString();
  try { await setDoc(doc(collection(db, 'channels', cid, 'messages')), { text, by: S.user.uid, at, atts });
    await setDoc(doc(db, 'channels', cid), { lastAt: at, lastText: (text || (atts.length ? 'Shared ' + atts.map(a => a.name).join(', ') : '')).slice(0, 80), lastBy: S.user.uid }, { merge: true });
    await setDoc(doc(db, 'chatReads', S.user.uid), { [cid]: at }, { merge: true }); }
  catch (e) { console.error(e); toast('Message not sent: ' + (e.code || '')); }
}
export async function newChannel(name) { name = name.trim(); if (!name) return null; const id = 'ch_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now().toString(36).slice(-4); await setDoc(doc(db, 'channels', id), { name, dm: false, members: [], kind: 'channel', createdAt: new Date().toISOString(), createdBy: S.user.uid }); return id; }
export async function newDM(other) { const m = [S.user.uid, other].sort(); const id = 'dm_' + m.join('_'); if (!C.channels.has(id)) await setDoc(doc(db, 'channels', id), { dm: true, members: m, kind: 'dm', createdAt: new Date().toISOString(), createdBy: S.user.uid }, { merge: true }); return id; }

function drawMessages() {
  const box = $('#msgs'); if (!box) return; const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  let last = '';
  box.innerHTML = C.msgs.map(m => { const day = (m.at || '').slice(0, 10); const sep = day !== last ? `<div class="msgday">${esc(new Date(m.at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))}</div>` : ''; last = day; const mine = m.by === S.user.uid;
    return sep + `<div class="msg ${mine ? 'me' : ''}"><div class="who">${mine ? 'You' : esc(userName(m.by) || 'Someone')} · ${esc(new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}<button class="mtask" data-act="taskFromMsg" data-id="${esc(m.id)}" title="Make this a task">+ Task</button></div>${m.text ? `<div class="txt">${esc(m.text)}</div>` : ''}${(m.atts || []).length ? `<div class="atts">${m.atts.map(attHTML).join('')}</div>` : ''}</div>`; }).join('') || '<div class="empty">No messages yet. Say hello.</div>';
  hydratePhotos(box);
  if (atBottom || box.dataset.first !== '1') { box.scrollTop = box.scrollHeight; box.dataset.first = '1'; }
}

export function chatView(id) {
  const list = [...C.channels.values()].sort((a, b) => (b.lastAt || b.createdAt || '').localeCompare(a.lastAt || a.createdAt || ''));
  const chans = list.filter(c => !c.dm && c.kind !== 'booking'), dms = list.filter(c => c.dm), files = list.filter(c => c.kind === 'booking').slice(0, 15);
  const cur = C.channels.get(id); const row = c => `<a href="#/chat/${esc(c.id)}" class="chrow ${c.id === id ? 'on' : ''} ${isUnread(c) && c.id !== id ? 'unread' : ''}"><b>${esc(chName(c))}</b><span>${esc(c.lastText || '')}</span></a>`;
  return `<div class="pagehead"><div><h1>Team chat</h1><p class="lead">Channels, direct messages and a thread on every booking — free, inside your CRM.</p></div></div>
  <div class="chat"><div class="chlist">
    <div class="chhead">Channels</div>${chans.map(row).join('') || '<p class="note">No channels yet.</p>'}
    <form id="newChannel" class="row" style="margin:6px 0 14px"><input name="name" placeholder="New channel, e.g. Sri Lanka ops" style="flex:1"><button class="btn s">Add</button></form>
    <div class="chhead">Direct messages</div>${dms.map(row).join('') || '<p class="note">None yet.</p>'}
    <select id="dmPick" style="margin:6px 0 14px"><option value="">Message someone…</option>${S.users.filter(u => u.role !== 'agent' && u.id !== S.user.uid && u.active !== false).map(u => `<option value="${esc(u.id)}">${esc(u.name || u.email)}</option>`).join('')}</select>
    ${files.length ? `<div class="chhead">Booking threads</div>${files.map(row).join('')}` : ''}
  </div><div class="chpane">${id ? `<div class="chtitle">${esc(cur ? chName(cur) : 'Loading…')}${cur?.ref ? ` <a class="link" style="font-size:13px;margin-left:8px" href="#/${cur.kind === 'booking' ? (cur.refType || 'booking') : 'booking'}/${esc(cur.ref)}">Open file</a>` : ''}</div>
    <div id="msgs" class="msgs"><div class="empty">Loading…</div></div>
    <div id="pendAtts" class="pend">${(UI.atts || []).map((a, i) => `<span class="chip">${esc(a.name)} <button type="button" data-act="rmAtt" data-id="${i}" aria-label="Remove">✕</button></span>`).join('')}</div>
    <form id="chatForm" class="chatin"><textarea name="text" placeholder="Write a message… (Enter to send, Shift+Enter for a new line)" rows="2"></textarea>
      <div class="chtools"><label class="btn s" title="Share photos or files">Attach<input type="file" id="chatFile" multiple hidden></label><button type="button" class="btn s" data-act="addLink">Drive link</button><button type="button" class="btn s" data-act="newTask">New task</button><span class="sp"></span><button class="btn p">Send</button></div></form>` : '<div class="empty" style="margin:auto"><b>Pick a channel or person</b><br>Or open the chat from any booking.</div>'}</div></div>`;
}
export { drawMessages };
