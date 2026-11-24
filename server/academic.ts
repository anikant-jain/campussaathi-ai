import { Router } from 'express';
import { accountById, accounts, allow, atomic, audit, check, clean, date, get, integer, list, notify, now, optional, own, remove, save, uid, type Account, type Row } from './core';

export const academics = Router();
export function academicRows(kind: string, user: Account) {
  if (user.role === 'admin') return list(kind);
  if (user.role === 'faculty') return list(kind).filter(row => row.facultyId === user.id);
  if (user.role !== 'student' || !user.department || !user.section || !user.semester) return [];
  return list(kind).filter(row => row.department === user.department && row.section === user.section && row.semester === user.semester);
}
const staff = allow('faculty','admin');
function parseAcademic(body: any, user: Account) {
  const facultyId = user.role === 'faculty' ? user.id : clean(body.facultyId, 'Faculty account ID');
  const faculty = accountById(facultyId);
  check(faculty?.role === 'faculty', 'Select a faculty account.');
  const department = clean(body.department, 'Department');
  if (user.role === 'faculty') check(department === user.department, 'Select a cohort in your department.', 403);
  return { title: clean(body.title, 'Title'), department, section: clean(body.section, 'Section'), semester: clean(body.semester, 'Semester'), facultyId, faculty: faculty.name };
}
function alertCohort(row: Row, title: string, message: string) {
  for (const user of accounts()) if (user.id === row.facultyId || (user.role === 'student' && user.department === row.department && user.section === row.section && user.semester === row.semester)) notify(user.id,title,message,'Academics');
}
export function hasConflict(a: Row, b: Row) {
  const sameGroup = a.department === b.department && a.section === b.section && a.semester === b.semester;
  return a.id !== b.id && b.status !== 'cancelled' && a.status !== 'cancelled' &&
    a.startsAt < b.endsAt && b.startsAt < a.endsAt &&
    (a.room.toLowerCase() === b.room.toLowerCase() || a.facultyId === b.facultyId || sameGroup);
}
function parseClass(body: any, user: Account, id = uid()): Row {
  const startsAt = date(body.startsAt,'Start date');
  const endsAt = date(body.endsAt,'End date');
  check(startsAt < endsAt, 'Class end must be after its start.');
  return { id,...parseAcademic(body,user), startsAt, endsAt, room: clean(body.room,'Room'), status:'scheduled' };
}
function writeClass(row: Row) {
  const overlap = list('timetable').find(existing => hasConflict(row,existing));
  check(!overlap, 'Schedule conflicts with ' + (overlap?.title || 'an existing class') + '.', 409);
  return save('timetable',row);
}
export function csvCells(line: string) {
  const values: string[] = [];
  let field = '', quoted = false;
  for (let i=0;i<line.length;i++) {
    const c=line[i];
    if (c === '"' && quoted && line[i+1] === '"') { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { values.push(field); field = ''; }
    else field += c;
  }
  check(!quoted, 'CSV contains an unterminated quoted field.');
  values.push(field);
  return values;
}
function ical(value: string) {
  return String(value).replace(/[\\;,]/g, match => '\\' + match).replace(/\r?\n/g,'\\n');
}
academics.get('/timetable/export', (req,res) => {
  const stamp = (input: string) => input.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const body = academicRows('timetable',req.account!).filter(row=>row.status!=='cancelled').flatMap(row => [
    'BEGIN:VEVENT','UID:'+row.id+'@campussaathi','DTSTAMP:'+stamp(now()),'DTSTART:'+stamp(row.startsAt),'DTEND:'+stamp(row.endsAt),'SUMMARY:'+ical(row.title),'LOCATION:'+ical(row.room),'END:VEVENT'
  ]);
  res.attachment('campus-timetable.ics').type('text/calendar').send(['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CampusSaathi//Timetable//EN',...body,'END:VCALENDAR'].join('\r\n')+'\r\n');
});
academics.post('/timetable/import',staff,(req,res)=>{
  const lines=clean(req.body.csv,'CSV',65000).split(/\r?\n/).filter(line=>line.trim());
  check(lines.length>1 && lines.length<=201,'Include one to 200 timetable rows.');
  const headers=csvCells(lines.shift()!).map(header=>header.trim());
  const expected=['title','department','section','semester','facultyId','room','startsAt','endsAt'];
  check(headers.length===expected.length && expected.every(header=>headers.includes(header)), 'Use headers: '+expected.join(', '));
  const rows=lines.map(line=>{
    const cells=csvCells(line);
    check(cells.length===headers.length,'Every CSV row must match the header.');
    return parseClass(Object.fromEntries(headers.map((header,index)=>[header,cells[index]])),req.account!);
  });
  if (req.body.preview === true) {
    const existing=list('timetable');
    for (const row of rows) check(![...existing,...rows].some(candidate=>hasConflict(row,candidate)),'Schedule conflict for '+row.title+'.',409);
    return res.json(rows);
  }
  res.status(201).json(atomic(()=>rows.map(writeClass)));
});
academics.post('/timetable',staff,(req,res)=>{
  const row=atomic(()=>writeClass(parseClass(req.body,req.account!)));
  alertCohort(row,'Class scheduled',row.title+' · '+row.room);
  res.status(201).json(row);
});
academics.patch('/timetable/:id',staff,(req,res)=>{
  const previous=academicRows('timetable',req.account!).find(row=>row.id===req.params.id);
  check(previous,'Class not found.',404);
  const result=atomic(()=>{
    if (req.body.status==='cancelled') return save('timetable',{...previous,status:'cancelled'});
    return writeClass(parseClass({...previous,...req.body},req.account!,previous.id));
  });
  alertCohort(result,result.status==='cancelled'?'Class cancelled':'Class rescheduled',result.title+' · '+result.room);
  res.json(result);
});
for (const kind of ['timetable','exams','assignments','subjects']) {
  academics.get('/'+kind,(req,res)=>res.json(academicRows(kind,req.account!)));
}
for (const kind of ['exams','assignments','subjects']) {
  academics.post('/'+kind,staff,(req,res)=>{
    const core=parseAcademic(req.body,req.account!);
    const description=optional(req.body.description,'Description',5000);
    const extra=kind==='exams'?{startsAt:date(req.body.startsAt,'Exam date'),room:clean(req.body.room,'Room')}:
      kind==='assignments'?{dueAt:date(req.body.dueAt,'Due date')}:{};
    const row=save(kind,{id:uid(),...core,...extra,description});
    if (kind!=='subjects') alertCohort(row,kind==='exams'?'Exam published':'Assignment published',row.title);
    res.status(201).json(row);
  });
}
academics.get('/assignments/:id/submissions',(req,res)=>{
  const assignment=academicRows('assignments',req.account!).find(row=>row.id===req.params.id);
  check(assignment,'Assignment not found.',404);
  const rows=list('submissions').filter(row=>row.assignmentId===assignment.id);
  res.json(req.account!.role==='student'?rows.filter(row=>row.owner===req.account!.id):rows);
});
academics.post('/assignments/:id/submissions',allow('student'),(req,res)=>{
  const user=req.account!;
  const assignment=academicRows('assignments',user).find(item=>item.id===req.params.id);
  check(assignment,'Assignment not found.',404);
  check(assignment.dueAt>=now(),'Submission window is closed.',409);
  res.status(201).json(save('submissions',{id:assignment.id+':'+user.id,owner:user.id,student:user.name,assignmentId:assignment.id,content:clean(req.body.content,'Submission',20000),createdAt:now()}));
});
academics.get('/attendance',(req,res)=>{
  const user=req.account!;
  const rows=user.role==='admin'?list('attendance'):user.role==='faculty'?list('attendance').filter(row=>get('timetable',row.classId)?.facultyId===user.id):list('attendance',user.id);
  res.json(rows);
});
academics.get('/attendance/:id/roster',staff,(req,res)=>{
  const row=academicRows('timetable',req.account!).find(item=>item.id===req.params.id);
  check(row,'Class not found.',404);
  res.json(accounts().filter(user=>user.role==='student' && user.department===row.department && user.semester===row.semester && user.section===row.section).map(user=>({id:user.id,name:user.name,present:get('attendance',row.id+':'+user.id)?.present})));
});
academics.put('/attendance/:id/roster',staff,(req,res)=>{
  const row=academicRows('timetable',req.account!).find(item=>item.id===req.params.id);
  check(row && row.status!=='cancelled','Class not found.',404);
  check(row.startsAt<=now(),'Attendance opens at the class start time.',409);
  check(Array.isArray(req.body.entries) && req.body.entries.length<=500,'Enter attendance for this class.');
  atomic(()=>{
    for (const entry of req.body.entries) {
      const user=entry && accountById(String(entry.id));
      check(user?.role==='student' && user.department===row.department && user.semester===row.semester && user.section===row.section && typeof entry.present==='boolean','Invalid attendance entry.');
      save('attendance',{id:row.id+':'+user.id,owner:user.id,classId:row.id,subject:row.title,present:entry.present,createdAt:row.startsAt});
    }
    audit(req.account!.id,'Recorded attendance',row.id);
  });
  res.json({ok:true});
});
academics.get('/announcements',(req,res)=>res.json(list('announcements').filter(row=>req.account!.role==='admin'||!row.department||row.department===req.account!.department)));
academics.post('/announcements',staff,(req,res)=>{
  const user=req.account!;
  const announcement=save('announcements',{id:uid(),owner:user.id,title:clean(req.body.title,'Title'),description:clean(req.body.description,'Message',6000),department:user.role==='faculty'?user.department:'',createdAt:now()});
  for (const member of accounts()) if (!announcement.department || member.department===announcement.department) notify(member.id,announcement.title,announcement.description,'Announcements');
  res.status(201).json(announcement);
});
const privateResources = ['tasks','notes','goals','bookmarks','study-plans','flashcards','quizzes','interviews','applications'] as const;
for (const kind of privateResources) {
  academics.get('/'+kind,(req,res)=>res.json(list(kind,req.account!.id)));
  academics.post('/'+kind,(req,res)=>{
    const owner=req.account!.id;
    const title=clean(req.body.title,'Title');
    const content=optional(req.body.content,'Content',35000);
    const dueAt=req.body.dueAt?date(req.body.dueAt,'Due date'):'';
    const topics=Array.isArray(req.body.topics)?req.body.topics.slice(0,80).map((item: unknown)=>clean(item,'Topic',200)):[];
    const linked=optional(req.body.linked,'Linked record');
    if (kind==='applications') check(get('placements',linked)?.status==='published','Opportunity not found.',404);
    const id=kind==='applications'?linked+':'+owner:uid();
    check(!get(kind,id),'This opportunity is already tracked.',409);
    res.status(201).json(save(kind,{id,owner,title,content,dueAt,topics,linked,checked:[],done:false,status:'Planned',createdAt:now()}));
  });
  academics.patch('/'+kind+'/:id',(req,res)=>{
    const previous=own(kind,req.params.id,req.account!.id);
    const row={...previous};
    if (req.body.done!==undefined) {
      check(typeof req.body.done==='boolean','Invalid completion state.');
      row.done=req.body.done;
      row.completedAt=row.done?now():null;
    }
    if (req.body.title!==undefined) row.title=clean(req.body.title,'Title');
    if (req.body.content!==undefined) row.content=optional(req.body.content,'Content',35000);
    if (req.body.status!==undefined) row.status=clean(req.body.status,'Status',50);
    if (Array.isArray(req.body.checked)) row.checked=[...new Set(req.body.checked.map((item: unknown)=>integer(item,'Topic index',0,Math.max(0,row.topics.length-1))))];
    res.json(save(kind,row));
  });
  academics.delete('/'+kind+'/:id',(req,res)=>{ own(kind,req.params.id,req.account!.id);remove(kind,req.params.id);res.sendStatus(204); });
}

