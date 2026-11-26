import { S, esc, field, DEST, photoTag, dayDate, prettyDate, today, userName } from './core.js';

export const photosField = (path, arr = []) => `<div class="photos">${arr.map((p, i) => `<div class="ph">${photoTag(p)}<button type="button" class="icon x" data-act="rmPhoto" data-k="${path}" data-id="${i}" aria-label="Remove photo">✕</button></div>`).join('')}<label class="ph add">+ Add photos<input type="file" accept="image/*" multiple class="photoIn" data-path="${path}" hidden></label></div>
  <div class="row" style="margin-top:6px"><input class="urlIn" data-path="${path}" placeholder="…or paste a photo web address (https://)" style="flex:1"><button type="button" class="btn s" data-act="addPhotoUrl" data-k="${path}">Add</button></div>`;
// day-by-day programme builder, used by itineraries and quotations
export function programBuilder(rec, { withDates = false, copyFrom = false } = {}) {
  const pr = rec.program || [];
  return `<div class="card"><h2>Day-by-day programme <span class="sub">${pr.length} day${pr.length === 1 ? '' : 's'} · the itinerary document is generated from these days</span><span class="sp"></span>
    ${copyFrom && S.itineraries.length ? `<select data-act-change="copyItin" style="max-width:240px"><option value="">Copy a ready-made itinerary…</option>${S.itineraries.map(i => `<option value="${esc(i.id)}">${esc(i.title)}</option>`).join('')}</select>` : ''}
    <button class="btn s p" data-act="pickDays">+ From day plans</button><button class="btn s" data-act="addDay">+ Custom day</button></h2>
  ${pr.map((d, i) => `<div class="day"><div class="dayhead"><b>Day ${i + 1}</b>${withDates && dayDate(rec, i) ? `<span class="note">${esc(prettyDate(dayDate(rec, i)))}</span>` : ''}<span class="sp"></span><button class="icon" data-act="moveDay" data-id="${i}" data-k="-1" aria-label="Move up">↑</button><button class="icon" data-act="moveDay" data-id="${i}" data-k="1" aria-label="Move down">↓</button><button class="icon" data-act="rmDay" data-id="${i}" aria-label="Remove day">✕</button></div>
    <div class="grid">${field('Title', `<input data-path="program.${i}.title" value="${esc(d.title)}" placeholder="Colombo to Kandy">`)}${field('Overnight', `<input data-path="program.${i}.overnight" value="${esc(d.overnight)}" placeholder="Kandy">`)}${field('Meals', `<input data-path="program.${i}.meals" value="${esc(d.meals)}" placeholder="Breakfast, Dinner">`)}</div>
    <label style="margin-top:8px">Description<textarea data-path="program.${i}.description" style="min-height:70px">${esc(d.description)}</textarea></label>
    <div style="margin-top:8px">${photosField(`program.${i}.photos`, d.photos)}</div></div>`).join('') || '<div class="empty"><b>No days yet</b><br>Add days from your day plans library, or write a custom day.</div>'}</div>`;
}
export function dayPicker(rec, qq = '') {
  const ds = rec.destinations?.length ? rec.destinations : (rec.destination ? [rec.destination] : []);
  let r = S.dayplans.filter(d => !ds.length || !d.destination || ds.includes(d.destination));
  if (qq) r = r.filter(d => JSON.stringify(d).toLowerCase().includes(qq.toLowerCase()));
  return `<input id="dpq" placeholder="Search day plans…" value="${esc(qq)}" style="margin-bottom:8px"><p class="note">${esc(ds.join(', ') || 'All destinations')}</p>
  <div class="tiles">${r.map(d => `<div class="tile"><div class="cover">${photoTag((d.photos || [])[0])}</div><div class="bd"><span class="note">${esc(d.destination)}${d.city ? ' · ' + esc(d.city) : ''}</span><h3>${esc(d.title)}</h3><p class="note" style="margin:0">${esc((d.description || '').slice(0, 90))}</p><button class="btn s p" data-act="addDayPlan" data-id="${esc(d.id)}">Add this day</button></div></div>`).join('') || '<div class="empty">No day plans yet. Add them under Rates & supply → Day plans.</div>'}</div>`;
}


const dueTag = t => !t.due ? '' : t.status !== 'Done' && t.due < today() ? `<span class="tag bad">${esc(t.due)}</span>` : t.due === today() ? `<span class="tag acc">Today</span>` : esc(t.due);
export const fileTasks = (ref) => { const r = S.tasks.filter(t => t.ref === ref); return r.length ? r.map(t => `<div class="row" style="padding:6px 0;border-top:1px solid var(--line2)"><input type="checkbox" data-act="toggleTask" data-id="${esc(t.id)}" ${t.status === 'Done' ? 'checked' : ''} style="width:18px;min-height:18px"><span style="flex:1;${t.status === 'Done' ? 'text-decoration:line-through;color:var(--mute)' : ''}">${esc(t.title)}</span><span class="note">${esc(userName(t.assignee))}</span>${dueTag(t)}</div>`).join('') : '<p class="note">No tasks on this file yet.</p>'; };
