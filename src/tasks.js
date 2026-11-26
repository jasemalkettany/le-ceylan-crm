import { S, UI, esc, today, tagFor, table, userName, isAdmin, prettyDate } from './core.js';
import { V } from './staff.js';

const go = h => `href="#/${h}"`;
export const myOpenTasks = () => S.tasks.filter(t => t.assignee === S.user?.uid && t.status !== 'Done').length;
const refLink = t => t.ref ? `<a class="link" href="#/${esc(t.refType || 'booking')}/${esc(t.ref)}">${esc(t.refLabel || 'Open file')}</a>` : '';
const dueTag = t => !t.due ? '' : t.status !== 'Done' && t.due < today() ? `<span class="tag bad">${esc(t.due)}</span>` : t.due === today() ? `<span class="tag acc">Today</span>` : esc(t.due);

V.tasks = { title: 'Tasks', render() {
  const f = UI.filter.tk || 'mine'; const st = UI.filter.tks || 'open';
  let r = S.tasks.slice();
  if (f === 'mine') r = r.filter(t => t.assignee === S.user.uid); else if (f === 'byme') r = r.filter(t => t.by === S.user.uid);
  if (st === 'open') r = r.filter(t => t.status !== 'Done'); else if (st === 'done') r = r.filter(t => t.status === 'Done');
  r.sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const seg = [['mine', 'My tasks'], ['byme', 'Assigned by me'], ...(isAdmin() ? [['all', 'All tasks']] : [])].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="filter" data-k="tk" data-id="${k}">${l}</button>`).join('');
  const seg2 = [['open', 'Open'], ['done', 'Done'], ['any', 'All']].map(([k, l]) => `<button class="${st === k ? 'on' : ''}" data-act="filter" data-k="tks" data-id="${k}">${l}</button>`).join('');
  return `<div class="pagehead"><div><h1>Tasks</h1><p class="lead">Follow-ups for the team, linked to bookings, quotations and chats.</p></div><button class="btn p" data-act="newTask">+ New task</button></div>
  <div class="row"><div class="seg">${seg}</div><div class="seg">${seg2}</div></div>
  <div class="card">${table(['', 'Task', 'Assigned to', 'From', 'Due', 'Linked to', 'Status'], r.map(t => `<tr><td style="width:36px"><input type="checkbox" data-act="toggleTask" data-id="${esc(t.id)}" ${t.status === 'Done' ? 'checked' : ''} aria-label="Done" style="width:18px;min-height:18px"></td><td><b style="${t.status === 'Done' ? 'text-decoration:line-through;color:var(--mute)' : ''}">${esc(t.title)}</b>${t.notes ? `<div class="note" style="white-space:pre-line">${esc(t.notes)}</div>` : ''}</td><td>${esc(userName(t.assignee))}</td><td class="note">${esc(userName(t.by))}</td><td>${dueTag(t)}</td><td>${refLink(t)}${t.channel ? ` <a class="link" href="#/chat/${esc(t.channel)}">Chat</a>` : ''}</td><td>${t.status === 'Done' ? tagFor('Done') : `<select data-act-change="taskStatus" data-id="${esc(t.id)}" style="width:auto;min-height:30px">${['Open', 'In progress', 'Done'].map(s => `<option ${s === (t.status || 'Open') ? 'selected' : ''}>${s}</option>`).join('')}</select>`}</td></tr>`), f === 'mine' ? 'Nothing assigned to you. Nice.' : 'No tasks here.')}</div>`;
} };

export function taskForm(pre = {}) {
  return `<form id="taskForm" style="display:grid;gap:12px"><label>Task<input name="title" required value="${esc(pre.title || '')}"></label>
  <div class="grid"><label>Assign to<select name="assignee" required>${S.users.filter(u => u.role !== 'agent' && u.active !== false).map(u => `<option value="${esc(u.id)}" ${u.id === (pre.assignee || S.user.uid) ? 'selected' : ''}>${esc(u.name || u.email)}</option>`).join('')}</select></label><label>Due<input type="date" name="due" value="${esc(pre.due || today())}"></label></div>
  <label>Notes<textarea name="notes" style="min-height:70px">${esc(pre.notes || '')}</textarea></label>
  <input type="hidden" name="ref" value="${esc(pre.ref || '')}"><input type="hidden" name="refType" value="${esc(pre.refType || '')}"><input type="hidden" name="refLabel" value="${esc(pre.refLabel || '')}"><input type="hidden" name="channel" value="${esc(pre.channel || '')}">
  ${pre.refLabel ? `<p class="note">Linked to ${esc(pre.refLabel)}</p>` : ''}<div class="row"><span class="sp"></span><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn p">Create task</button></div></form>`;
}
export { fileTasks } from './widgets.js';
