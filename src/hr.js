import { S, UI, esc, num, today, addDays, cfg, coById, tagFor, table, field, inp, sel, area, qMatch, byNew, prettyDate } from './core.js';
import { V, EDIT } from './staff.js';

const go = h => `href="#/${h}"`;
export const BRANCHES = ['UAE', 'Sri Lanka', 'Bali', 'Philippines', 'Lebanon', 'Remote'];
export const DEPTS = ['Management', 'Sales', 'Reservations', 'Operations', 'Finance', 'Marketing', 'HR', 'Drivers & guides', 'Other'];
export const LEAVE_TYPES = ['Annual', 'Sick', 'Unpaid', 'Emergency', 'Maternity / paternity', 'Other'];
const DOCS = [['passportExpiry', 'Passport'], ['visaExpiry', 'Visa / residence'], ['idExpiry', 'Emirates ID / national ID'], ['labourExpiry', 'Labour card / work permit'], ['contractEnd', 'Contract'], ['insuranceExpiry', 'Medical insurance']];
export const empName = id => (S.employees.find(e => e.id === id) || {}).name || '';
export const myEmployee = () => S.employees.find(e => e.userId === S.user?.uid);
const daysBetween = (a, b) => (a && b) ? Math.max(0, Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5) + 1) : 0;
export const leaveDays = l => num(l.days) || daysBetween(l.from, l.to);
export function leaveTaken(empId, type = 'Annual') { const y = today().slice(0, 4); return S.leaves.filter(l => l.employeeId === empId && l.status === 'Approved' && (l.type || 'Annual') === type && (l.from || '').startsWith(y)).reduce((s, l) => s + leaveDays(l), 0); }
export function expiries(within = 60) {
  const t = today(), end = addDays(t, within), out = [];
  S.employees.filter(e => e.status !== 'Left').forEach(e => DOCS.forEach(([k, l]) => { const d = e[k]; if (d && d <= end) out.push({ e, doc: l, d, late: d < t }); }));
  return out.sort((a, b) => a.d.localeCompare(b.d));
}

V.employees = { title: 'Employees', render() {
  const br = UI.filter.br || ''; const st = UI.filter.est || 'Active';
  const r = S.employees.filter(qMatch).filter(e => !br || e.branch === br).filter(e => !st || (e.status || 'Active') === st).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const exp = expiries(60);
  return `<div class="pagehead"><div><h1>Team directory</h1><p class="lead">Everyone across UAE, Sri Lanka and Bali — contracts, documents and leave in one file.</p></div><a class="btn p" ${go('employee/new')}>+ Add employee</a></div>
  <div class="strip"><a ${go('employees')}><span>Active employees</span><b>${S.employees.filter(e => (e.status || 'Active') === 'Active').length}</b></a><a ${go('leave')}><span>Leave requests waiting</span><b>${S.leaves.filter(l => (l.status || 'Pending') === 'Pending').length}</b></a><a ${go('expiries')} class="${exp.length ? 'hot' : ''}"><span>Documents expiring in 60 days</span><b>${exp.length}</b></a><a ${go('attendance')}><span>Checked in today</span><b>${S.attendance.filter(a => a.date === today()).length}</b></a></div>
  <div class="card"><div class="row" style="margin-bottom:10px">${sel('br', [['', 'All branches'], ...BRANCHES], br, 'data-filter="br" style="width:auto"')}${sel('est', [['', 'All'], 'Active', 'On leave', 'Left'], st, 'data-filter="est" style="width:auto"')}</div>
  ${table(['Name', 'Position', 'Department', 'Branch', 'Company', 'Joined', 'Annual leave left ', 'Status'], r.map(e => `<tr class="click" data-go="employee/${esc(e.id)}"><td><b>${esc(e.name)}</b><div class="note">${esc(e.email)}</div></td><td>${esc(e.position)}</td><td>${esc(e.department)}</td><td>${esc(e.branch)}</td><td>${esc(coById(e.company).short || coById(e.company).name)}</td><td>${esc(e.joinDate)}</td><td class="num">${num(e.annualLeave || 30) - leaveTaken(e.id)}</td><td>${tagFor(e.status || 'Active')}</td></tr>`), 'No employees yet.')}</div>`;
} };
EDIT.employee = r => { const mine = S.leaves.filter(l => l.employeeId === r.id).sort(byNew);
  return `<div class="pagehead"><div><h1>${esc(r.name || 'New employee')}</h1><p class="lead">${esc([r.position, r.branch].filter(Boolean).join(' · '))}</p></div><a class="link" href="#/employees">All employees</a></div>
  <div class="card"><h2>Personal and job</h2><div class="grid">${field('Full name', inp('name', r.name))}${field('Position', inp('position', r.position))}${field('Department', sel('department', DEPTS, r.department))}${field('Branch', sel('branch', BRANCHES, r.branch))}${field('Company (employer)', sel('company', cfg().companies.map(c => [c.id, c.name]), r.company))}${field('Reports to', sel('managerId', [['', '—'], ...S.employees.filter(e => e.id !== r.id).map(e => [e.id, e.name])], r.managerId))}
  ${field('Work email', inp('email', r.email, 'email'))}${field('Phone / WhatsApp', inp('phone', r.phone))}${field('Nationality', inp('nationality', r.nationality))}${field('Date of birth', inp('dob', r.dob, 'date'))}${field('Joining date', inp('joinDate', r.joinDate, 'date'))}${field('Status', sel('status', ['Active', 'On leave', 'Left'], r.status || 'Active'))}
  ${field('CRM login', sel('userId', [['', '— none —'], ...S.users.filter(u => u.role !== 'agent').map(u => [u.id, u.name || u.email])], r.userId))}</div></div>
  <div class="card"><h2>Contract and pay</h2><div class="grid">${field('Contract type', sel('contractType', ['Full time', 'Part time', 'Commission', 'Freelance', 'Intern'], r.contractType))}${field('Contract end', inp('contractEnd', r.contractEnd, 'date'))}${field('Probation ends', inp('probationEnd', r.probationEnd, 'date'))}${field('Basic salary', inp('salary', r.salary, 'number', 'step="any"'))}${field('Allowances', inp('allowances', r.allowances, 'number', 'step="any"'))}${field('Salary currency', sel('salaryCur', ['AED', 'LKR', 'IDR', 'PHP', 'USD', 'LBP'], r.salaryCur))}${field('Commission %', inp('commission', r.commission, 'number', 'step="any"'))}${field('Annual leave days', inp('annualLeave', r.annualLeave ?? 30, 'number'))}</div></div>
  <div class="card"><h2>Documents and expiry dates <span class="sub">you get an alert 60 days before anything expires</span></h2><div class="grid">${field('Passport no.', inp('passportNo', r.passportNo))}${DOCS.map(([k, l]) => field(l + ' expiry', inp(k, r[k], 'date'))).join('')}</div>
  <label style="margin-top:10px">Links to documents (Google Drive)<textarea data-f="docLinks" placeholder="One link per line">${esc(r.docLinks)}</textarea></label></div>
  <div class="card"><h2>Emergency contact and notes</h2><div class="grid">${field('Emergency contact', inp('emergency', r.emergency))}${field('Bank / IBAN for salary', inp('bank', r.bank))}</div><label style="margin-top:10px">Notes${area('notes', r.notes)}</label></div>
  ${r.id ? `<div class="card"><h2>Leave <span class="sub">${num(r.annualLeave || 30) - leaveTaken(r.id)} annual days left this year</span></h2>${table(['Type', 'From', 'To', 'Days', 'Status'], mine.map(l => `<tr><td>${esc(l.type)}</td><td>${esc(l.from)}</td><td>${esc(l.to)}</td><td>${leaveDays(l)}</td><td>${tagFor(l.status || 'Pending')}</td></tr>`), 'No leave yet.')}</div>` : ''}
  <div class="row"><button class="btn p" data-act="saveEmployee">Save</button><span class="sp"></span>${r.id ? `<button class="btn d s" data-act="delRec" data-id="employees">Delete</button>` : ''}</div>`; };

V.leave = { title: 'Leave', render() {
  const me = myEmployee(); const st = UI.filter.lst || 'Pending';
  const r = S.leaves.filter(l => !st || (l.status || 'Pending') === st).sort((a, b) => (a.from || '').localeCompare(b.from || ''));
  return `<div class="pagehead"><div><h1>Leave</h1><p class="lead">Requests from the team, with approval and balances.</p></div></div>
  ${me ? `<div class="card"><h2>Request leave for yourself <span class="sub">${num(me.annualLeave || 30) - leaveTaken(me.id)} annual days left</span></h2><form id="leaveForm" class="grid">${field('Type', sel('type', LEAVE_TYPES, 'Annual'))}${field('From', inp('from', '', 'date', 'required'))}${field('To', inp('to', '', 'date', 'required'))}${field('Reason', inp('reason', ''))}<div style="align-self:end"><button class="btn p" type="submit">Send request</button></div></form></div>` : ''}
  <div class="card"><div class="row" style="margin-bottom:10px">${sel('lst', [['', 'All'], 'Pending', 'Approved', 'Rejected'], st, 'data-filter="lst" style="width:auto"')}</div>
  ${table(['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', ''], r.map(l => `<tr><td><b>${esc(empName(l.employeeId))}</b></td><td>${esc(l.type)}</td><td>${esc(l.from)}</td><td>${esc(l.to)}</td><td>${leaveDays(l)}</td><td>${esc(l.reason)}</td><td>${tagFor(l.status || 'Pending')}</td><td class="num">${UI.canHR && (l.status || 'Pending') === 'Pending' ? `<button class="btn s p" data-act="leaveDecide" data-id="${esc(l.id)}" data-k="Approved">Approve</button> <button class="btn s d" data-act="leaveDecide" data-id="${esc(l.id)}" data-k="Rejected">Reject</button>` : ''}</td></tr>`), 'No leave requests here.')}</div>`;
} };

V.attendance = { title: 'Attendance', render() {
  const d = UI.filter.attDate || today(); const me = myEmployee(); const mine = me && S.attendance.find(a => a.employeeId === me.id && a.date === today());
  const rows = S.employees.filter(e => (e.status || 'Active') !== 'Left').sort((a, b) => (a.branch || '').localeCompare(b.branch || '') || (a.name || '').localeCompare(b.name || '')).map(e => { const a = S.attendance.find(x => x.employeeId === e.id && x.date === d); const lv = S.leaves.find(l => l.employeeId === e.id && l.status === 'Approved' && l.from <= d && l.to >= d);
    return `<tr><td><b>${esc(e.name)}</b></td><td>${esc(e.branch)}</td><td>${esc(a?.in || '')}</td><td>${esc(a?.out || '')}</td><td>${lv ? tagFor('Sent').replace(/>[^<]+</, '>On leave<') : a ? tagFor('Active').replace(/>[^<]+</, '>Present<') : '<span class="tag gr">Not checked in</span>'}</td><td class="note">${esc(a?.note || '')}</td></tr>`; });
  return `<div class="pagehead"><div><h1>Attendance</h1><p class="lead">Each person checks in and out from the CRM. Times are their own local time.</p></div></div>
  ${me ? `<div class="card"><h2>Today, ${esc(prettyDate(today()))}</h2><div class="row">${!mine ? `<button class="btn p" data-act="checkIn">Check in</button>` : !mine.out ? `<span>Checked in at <b>${esc(mine.in)}</b></span><button class="btn p" data-act="checkOut">Check out</button>` : `<span>In <b>${esc(mine.in)}</b> · out <b>${esc(mine.out)}</b></span>`}</div></div>` : '<div class="warn">Your login is not linked to an employee file yet. HR can link it in the employee\'s file.</div>'}
  ${UI.canHR ? `<div class="card"><div class="row" style="margin-bottom:10px"><label style="width:200px">Day<input type="date" data-filter="attDate" value="${esc(d)}"></label></div>${table(['Employee', 'Branch', 'In', 'Out', 'Status', 'Note'], rows, 'No employees yet.')}</div>` : ''}`;
} };

V.expiries = { title: 'Expiry alerts', render() {
  const r = expiries(90);
  return `<div class="pagehead"><div><h1>Expiry alerts</h1><p class="lead">Passports, visas, IDs, work permits, contracts and insurance that expire within 90 days.</p></div></div>
  <div class="card">${table(['Employee', 'Document', 'Expires', 'Branch', ''], r.map(x => `<tr class="click" data-go="employee/${esc(x.e.id)}"><td><b>${esc(x.e.name)}</b></td><td>${esc(x.doc)}</td><td>${esc(x.d)}</td><td>${esc(x.e.branch)}</td><td>${x.late ? tagFor('Overdue').replace(/>[^<]+</, '>Expired<') : tagFor('Pending').replace(/>[^<]+</, '>Renew soon<')}</td></tr>`), 'Nothing expires in the next 90 days.')}</div>`;
} };
