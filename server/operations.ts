import { Router } from 'express';
import { accountById, accounts, allow, atomic, audit, check, choice, clean, date, db, get, integer, list, notify, now, optional, own, publicAccount, remove, save, token, uid, type Account, type Row } from './core';
import { academicRows } from './academic';
import { analyzeComplaintWithHeuristics } from './services/aiHeuristics';
import type { AIAnalysis } from '../src/types';
import { analyzeIssue } from './provider';

export const operations = Router();
const admin = allow('admin');
const libraryStaff = allow('admin','librarian');
const eventCategories = ['Hackathons','Workshops','Technical events','Cultural events','Sports','Seminars','Club activities','Coding competitions'] as const;
export const percent = (a: number, b: number) => b ? Math.round(a * 100 / b) : null;
const searchable = (rows: Row[], q: unknown) => typeof q === 'string' ? rows.filter(row=>[row.title,row.category,row.author,row.description,row.company,row.id].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase().trim())) : rows;
function visibleComplaint(row: Row, user: Account) {
  if (user.role==='admin') return row;
  const { adminNotes, adminReplyDraft, assignedStaffEmail, ...publicFields } = row;
  return publicFields;
}
export function campusEvents(user: Account) {
  const selected=list('registrations',user.id);
  const saved=list('saved-events',user.id);
  const all=list('registrations');
  return list('events').filter(row=>user.role==='admin' || row.status==='published' || selected.some(item=>item.eventId===row.id)).map(row=>{
    const {code,...event}=row;
    const registration=selected.find(item=>item.eventId===row.id);
    return {...event,code:user.role==='admin'?code:undefined,registration, saved:saved.some(item=>item.eventId===row.id),registered:all.filter(item=>item.eventId===row.id).length};
  }) as Row[];
}
export function libraryBooks(user: Account) {
  const loans=list('loans').filter(row=>row.status==='issued');
  const holds=list('reservations');
  return list('books').map(row=>({...row, available:row.copies-loans.filter(loan=>loan.bookId===row.id).length-holds.filter(hold=>hold.bookId===row.id).length, reserved:holds.some(hold=>hold.bookId===row.id && hold.owner===user.id)})) as Row[];
}
operations.get('/events', (req,res)=>res.json(searchable(campusEvents(req.account!),req.query.q).filter(row=>!req.query.category||row.category===req.query.category)));
operations.post('/events',admin,(req,res)=>{
  const row=save('events',{id:uid(),...eventInput(req.body),code:token().slice(0,12),createdAt:now()});
  audit(req.account!.id,'Created event',row.id);
  res.status(201).json(row);
});
function eventInput(body: any) {
  return { title:clean(body.title,'Event title'),category:choice(body.category,eventCategories,'category'),
    organizer:clean(body.organizer,'Organizer'),description:clean(body.description,'Description',6000),room:clean(body.room,'Venue'),
    startsAt:date(body.startsAt,'Event date'),capacity:integer(body.capacity,'Capacity',1,10000),status:choice(body.status || 'draft',['draft','published','cancelled'] as const,'event status') };
}
operations.patch('/events/:id',admin,(req,res)=>{
  const previous=get('events',req.params.id);
  check(previous,'Event not found.',404);
  const row=atomic(()=>{
    const updated={...previous,...eventInput({...previous,...req.body})};
    const registrations=list('registrations').filter(item=>item.eventId===previous.id);
    check(updated.capacity>=registrations.length,'Capacity is below the current registration count.',409);
    audit(req.account!.id,'Updated event',previous.id);
    return save('events',updated);
  });
  if (row.status==='cancelled' && previous.status!=='cancelled') for (const reg of list('registrations').filter(item=>item.eventId===row.id)) notify(reg.owner!, 'Event cancelled', row.title,'Events');
  res.json(row);
});
operations.post('/events/:id/registration',(req,res)=>{
  const owner=req.account!.id;
  const result=atomic(()=>{
    const row=get('events',req.params.id);
    check(row?.status==='published' && row.startsAt>now(),'Registration is closed.',409);
    const id=row.id+':'+owner;
    check(!get('registrations',id),'You are already registered.',409);
    check(list('registrations').filter(item=>item.eventId===row.id).length<row.capacity,'This event is full.',409);
    return save('registrations',{id,owner,eventId:row.id,createdAt:now(),checkedIn:false});
  });
  notify(owner,'Event registration confirmed',get('events',result.eventId)!.title,'Events');
  res.status(201).json(result);
});
operations.delete('/events/:id/registration',(req,res)=>{
  const row=own('registrations',req.params.id+':'+req.account!.id,req.account!.id);
  check(!row.checkedIn,'Attendance is already recorded.',409);
  remove('registrations',row.id);
  res.sendStatus(204);
});
operations.post('/events/:id/save',(req,res)=>{
  const owner=req.account!.id;
  check(campusEvents(req.account!).some(row=>row.id===req.params.id),'Event not found.',404);
  const id=req.params.id+':'+owner;
  if (get('saved-events',id)) remove('saved-events',id);
  else save('saved-events',{id,owner,eventId:req.params.id});
  res.json({saved:Boolean(get('saved-events',id))});
});
operations.post('/events/:id/check-in',(req,res)=>{
  const row=own('registrations',req.params.id+':'+req.account!.id,req.account!.id);
  const event=get('events',req.params.id)!;
  check(event.status==='published' && event.code===req.body.code,'Invalid event check-in code.',403);
  check(+new Date(event.startsAt)-Date.now()<=3600000 && Date.now()-+new Date(event.startsAt)<=86400000,'Check-in is available around the event time.',409);
  res.json(save('registrations',{...row,checkedIn:true,checkedInAt:row.checkedInAt || now()}));
});

operations.get('/library', (req,res)=>res.json(searchable(libraryBooks(req.account!),req.query.q)));
operations.get('/library/activity',(req,res)=>{
  const user=req.account!;
  const privileged=user.role==='admin'||user.role==='librarian';
  res.json({ loans:list('loans',privileged?undefined:user.id), reservations:list('reservations',privileged?undefined:user.id) });
});
operations.post('/library',libraryStaff,(req,res)=>{
  const row=save('books',{id:uid(),title:clean(req.body.title,'Book title'),author:clean(req.body.author,'Author'),category:clean(req.body.category,'Category'),
    description:optional(req.body.description,'Description',3000),copies:integer(req.body.copies,'Copies',1,5000)});
  audit(req.account!.id,'Added book',row.id);
  res.status(201).json(row);
});
operations.post('/library/:id/reservation',(req,res)=>{
  const owner=req.account!.id;
  res.status(201).json(atomic(()=>{
    const row=libraryBooks(req.account!).find(item=>item.id===req.params.id);
    check(row,'Book not found.',404);
    const id=row.id+':'+owner;
    check(!get('reservations',id) && !list('loans',owner).some(item=>item.bookId===row.id && item.status==='issued'),'You already have this book on hold or on loan.',409);
    check(row.available>0,'No copies are currently available.',409);
    return save('reservations',{id,owner,bookId:row.id,title:row.title,createdAt:now()});
  }));
});
operations.delete('/library/:id/reservation',(req,res)=>{
  const row=own('reservations',req.params.id+':'+req.account!.id,req.account!.id);
  remove('reservations',row.id);res.sendStatus(204);
});
operations.post('/library/:id/issue',libraryStaff,(req,res)=>{
  const member=accountById(clean(req.body.userId,'Borrower ID'));
  check(member,'Borrower not found.',404);
  const result=atomic(()=>{
    const row=libraryBooks(member).find(item=>item.id===req.params.id);
    check(row,'Book not found.',404);
    const hold=get('reservations',row.id+':'+member.id);
    check(!list('loans',member.id).some(item=>item.bookId===row.id && item.status==='issued'),'Borrower already has an active loan.',409);
    check(hold || row.available>0,'No copies are currently available.',409);
    if (hold) remove('reservations',hold.id);
    return save('loans',{id:uid(),owner:member.id,bookId:row.id,title:row.title,createdAt:now(),dueAt:new Date(Date.now()+14*86400000).toISOString(),status:'issued'});
  });
  notify(member.id,'Library loan issued',result.title,'Library');
  res.status(201).json(result);
});
operations.post('/library/loans/:id/return',libraryStaff,(req,res)=>{
  const result=atomic(()=>{
    const row=get('loans',req.params.id);
    check(row?.status==='issued','Active loan not found.',404);
    return save('loans',{...row,status:'returned',returnedAt:now()});
  });
  notify(result.owner!,'Library return recorded',result.title,'Library');
  res.json(result);
});

operations.get('/complaints',(req,res)=>res.json(searchable(list('complaints',req.account!.role==='admin'?undefined:req.account!.id),req.query.q).map(row=>visibleComplaint(row,req.account!))));
operations.get('/complaints/:id',(req,res)=>{
  const user=req.account!;
  const row=get('complaints',req.params.id);
  check(row && (user.role==='admin'||row.owner===user.id),'Ticket not found.',404);
  res.json(visibleComplaint(row,user));
});
operations.post('/complaints/preview',async (req,res,next)=>{
  try { res.json(await analyzeIssue(clean(req.body.description,'Issue description',5000),req.body.image)); }
  catch(error) { next(error); }
});
operations.post('/complaints',async (req,res,next)=>{
  try {
    const user=req.account!;
    const description=clean(req.body.description,'Issue description',5000);
    const locationDetails=optional(req.body.locationDetails,'Location',300);
    const image=optional(req.body.image,'Image',2000000);
    check(!image || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(image),'Choose a PNG, JPEG, or WebP image.');
    const analysis=await analyzeIssue(description,image);
    const id='CS-'+new Date().getFullYear()+'-'+uid().slice(0,8).toUpperCase();
    const inputMode=choice(req.body.inputMode || (image?'image':'text'),['text','voice','image','multimodal'] as const,'input mode');
    const result=save('complaints',{id,owner:user.id,userId:user.id,userName:user.name,title:optional(req.body.title,'Title')||analysis.summary,originalDescription:description,inputMode,
      locationDetails,imageUrl:image,department:analysis.recommendedDepartment,priority:analysis.priority,status:'submitted',aiAnalysis:analysis,
      createdAt:now(),updatedAt:now(),timeline:[{id:uid(),status:'submitted',title:'Complaint registered',description:'Ticket submitted for campus staff review.',actor:user.name,timestamp:now()}]});
    for (const admin of accounts().filter(account=>account.role==='admin')) notify(admin.id,'New complaint '+id,result.title,'Complaints');
    res.status(201).json(visibleComplaint(result,user));
  } catch(error) {next(error);}
});
const complaintStatuses=['submitted','ai_analyzed','assigned','in_progress','escalated','resolved'] as const;
operations.patch('/complaints/:id',admin,(req,res)=>{
  const previous=get('complaints',req.params.id);
  check(previous,'Ticket not found.',404);
  const status=req.body.status===undefined?previous.status:choice(req.body.status,complaintStatuses,'status');
  const department=req.body.department===undefined?previous.department:clean(req.body.department,'Department');
  check(get('departments',department),'Department not found.',404);
  const priority=req.body.priority===undefined?previous.priority:choice(req.body.priority,['low','medium','high','critical'] as const,'priority');
  const reply=optional(req.body.reply,'Reply',5000);
  const assignedTo=req.body.assignedTo===undefined?previous.assignedTo:optional(req.body.assignedTo,'Assignee');
  const updatedAt=now();
  const row=atomic(()=>{
    const updated=save('complaints',{...previous,status,department,priority,assignedTo,updatedAt,resolvedAt:status==='resolved'?previous.resolvedAt || updatedAt:null,
      adminReplySent:reply || previous.adminReplySent, timeline:[...previous.timeline,{id:uid(),status,title:reply?'Staff response':'Ticket updated',description:reply||status.replaceAll('_',' '),actor:req.account!.name,timestamp:updatedAt}]});
    audit(req.account!.id,'Updated complaint',previous.id);
    return updated;
  });
  if (row.owner) notify(row.owner,'Complaint updated · '+row.id,reply || 'Status: '+status.replaceAll('_',' '),'Complaints');
  res.json(row);
});
operations.post('/complaints/:id/feedback',(req,res)=>{
  const previous=own('complaints',req.params.id,req.account!.id);
  check(previous.status==='resolved','Feedback is available after resolution.',409);
  res.json(save('complaints',{...previous,confirmedAt:now(),rating:integer(req.body.rating,'Rating',1,5),feedback:optional(req.body.feedback,'Feedback',500)}));
});

operations.get('/placements',(req,res)=>res.json(searchable(list('placements').filter(row=>row.status==='published'||['admin','placement'].includes(req.account!.role)),req.query.q)));
operations.post('/placements',allow('admin','placement'),(req,res)=>{
  const row=save('placements',{id:uid(),title:clean(req.body.title,'Job title'),company:clean(req.body.company,'Company'),description:clean(req.body.description,'Job description',9000),
    location:clean(req.body.location,'Location'),dueAt:date(req.body.dueAt,'Application deadline'),status:'published',createdAt:now()});
  for (const account of accounts()) if (account.role==='student') notify(account.id,'New placement opportunity',row.title,'Placements');
  res.status(201).json(row);
});

export function findRoute(nodes: Row[], edges: Row[], from: string, to: string, accessible: boolean) {
  const remaining=new Set(nodes.map(node=>node.id));
  const distance=new Map([[from,0]]);
  const parent=new Map<string,string>();
  while (remaining.size) {
    const current=[...remaining].sort((a,b)=>(distance.get(a)??Infinity)-(distance.get(b)??Infinity))[0];
    const base=distance.get(current);
    if (base===undefined || current===to) break;
    remaining.delete(current);
    for (const edge of edges) {
      if (accessible && !edge.accessible) continue;
      const neighbor=edge.from===current?edge.to:edge.to===current?edge.from:null;
      if (!neighbor || !remaining.has(neighbor) || base+edge.distance>=(distance.get(neighbor)??Infinity)) continue;
      distance.set(neighbor,base+edge.distance);
      parent.set(neighbor,current);
    }
  }
  if (!distance.has(to)) return null;
  const path=[to];
  while (path[0]!==from) path.unshift(parent.get(path[0])!);
  return {distance:distance.get(to),path};
}
operations.get('/navigation',(_req,res)=>res.json({buildings:list('buildings'),edges:list('edges'),sample:!get('meta','verified-map')}));
operations.get('/navigation/route',(req,res)=>{
  const nodes=list('buildings');
  const from=clean(req.query.from,'Start');
  const to=clean(req.query.to,'Destination');
  check(nodes.some(row=>row.id===from)&&nodes.some(row=>row.id===to),'Select valid locations.');
  const route=findRoute(nodes,list('edges'),from,to,req.query.accessible==='true');
  check(route,'No route is available for these settings.',404);
  res.json(route);
});
operations.post('/navigation/buildings',admin,(req,res)=>{
  const id=optional(req.body.id,'Building ID')||uid();
  const old=get('buildings',id);
  const row=save('buildings',{...old,id,title:clean(req.body.title,'Building name'),description:clean(req.body.description,'Description',2500),
    x:integer(req.body.x,'Horizontal position',10,450),y:integer(req.body.y,'Vertical position',10,330),floor:clean(req.body.floor,'Floors'),
    rooms:optional(req.body.rooms,'Rooms',1000).split(',').map(room=>room.trim()).filter(Boolean)});
  res.status(201).json(row);
});
operations.post('/navigation/edges',admin,(req,res)=>{
  const from=clean(req.body.from,'Start building'), to=clean(req.body.to,'End building');
  check(from!==to && get('buildings',from) && get('buildings',to),'Select two distinct buildings.');
  res.status(201).json(save('edges',{id:[from,to].sort().join(':'),from,to,distance:integer(req.body.distance,'Distance',1,20000),accessible:req.body.accessible===true}));
});
operations.get('/notifications',(req,res)=>res.json(list('notifications',req.account!.id)));
operations.patch('/notifications/:id/read',(req,res)=>res.json(save('notifications',{...own('notifications',req.params.id,req.account!.id),read:true})));
operations.post('/notifications/mark-all-read',(req,res)=>{ atomic(()=>list('notifications',req.account!.id).filter(row=>!row.read).forEach(row=>save('notifications',{...row,read:true})));res.json({ok:true}); });
operations.get('/departments',(req,res)=>res.json(list('departments').map(({headEmail,...row})=>req.account!.role==='admin'?{...row,headEmail}:row)));
operations.post('/departments',admin,(req,res)=>{
  const row=save('departments',{id:uid(),title:clean(req.body.title,'Department name'),description:optional(req.body.description,'Description',3000)});
  audit(req.account!.id,'Created department',row.id);
  res.status(201).json(row);
});
operations.get('/students',allow('faculty','admin'),(req,res)=>res.json(accounts().filter(user=>user.role==='student'&&(req.account!.role==='admin'||user.department===req.account!.department)).map(({id,name,department,section,semester,enrollment})=>({id,name,department,section,semester,enrollment}))));
operations.get('/faculty',admin,(_req,res)=>res.json(accounts().filter(user=>user.role==='faculty').map(publicAccount)));
operations.get('/dashboard',(req,res)=>{
  const user=req.account!;
  const owner=user.id;
  const attendance=list('attendance',owner);
  const tasks=list('tasks',owner);
  const assignments=academicRows('assignments',user);
  const submitted=new Set(list('submissions',owner).map(row=>row.assignmentId));
  const events=campusEvents(user).filter(row=>row.status==='published' && row.startsAt>now());
  const keywords=[user.skills,user.interests,user.department,user.goals].filter(Boolean).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(word=>word.length>2);
  const score=(row: Row)=>keywords.filter(word=>(row.title+' '+row.description+' '+row.category).toLowerCase().includes(word)).length;
  const today=(stamp: string)=>new Date(stamp).toLocaleDateString('en-CA',{timeZone:process.env.CAMPUS_TIMEZONE || 'Asia/Kolkata'});
  const timetable=academicRows('timetable',user).filter(row=>row.status!=='cancelled').sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  const groups=[...new Set(attendance.map(row=>row.subject))].map(subject=>{
    const rows=attendance.filter(row=>row.subject===subject);
    return {subject,value:percent(rows.filter(row=>row.present).length,rows.length)};
  });
  res.json({ timetable:timetable.filter(row=>today(row.startsAt)===today(now())),next:timetable.find(row=>row.startsAt>now()),
    attendance:percent(attendance.filter(row=>row.present).length,attendance.length),attendanceGroups:groups,
    exams:academicRows('exams',user).filter(row=>row.startsAt>now()).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)),assignments:assignments.filter(row=>!submitted.has(row.id)),
    events:events.sort((a,b)=>score(b)-score(a)||a.startsAt.localeCompare(b.startsAt)).slice(0,3),tasks,
    loans:list('loans',owner).filter(row=>row.status==='issued'),placements:list('placements').filter(row=>row.status==='published'&&row.dueAt>now()),
    complaints:list('complaints',owner).filter(row=>row.status!=='resolved'),notifications:list('notifications',owner).slice(0,4),
    announcements:list('announcements').filter(row=>!row.department||row.department===user.department).slice(0,4)
  });
});
export function analytics(from?: string,to?: string) {
  const within=(stamp?: string)=>!!stamp && (!from||stamp>=from) && (!to||stamp<=to);
  const people=accounts();
  const attendance=list('attendance').filter(row=>within(row.createdAt));
  const complaints=list('complaints').filter(row=>within(row.createdAt));
  const resolved=complaints.filter(row=>row.resolvedAt);
  const classes=list('timetable').filter(row=>row.status!=='cancelled'&&within(row.startsAt));
  return { from,to, students:people.filter(user=>user.role==='student').length,faculty:people.filter(user=>user.role==='faculty').length,
    departments:list('departments').length, attendance:percent(attendance.filter(row=>row.present).length,attendance.length),
    pending:complaints.filter(row=>row.status!=='resolved').length,resolved:resolved.length,
    resolutionHours:resolved.length?Math.round(resolved.reduce((total,row)=>total+(+new Date(row.resolvedAt)-+new Date(row.createdAt))/3600000,0)/resolved.length):null,
    classrooms:new Set(classes.map(row=>row.room)).size,classes:classes.length,
    eventParticipation:list('registrations').filter(row=>within(row.createdAt)).length,
    libraryLoans:list('loans').filter(row=>within(row.createdAt)).length,placementActivity:list('applications').filter(row=>within(row.createdAt)).length,
    complaintGroups:[...new Set(complaints.map(row=>row.department))].map(department=>({name:get('departments',department)?.title||department,value:complaints.filter(row=>row.department===department).length})),
    attendanceTrend:[...new Set(attendance.map(row=>row.createdAt.slice(0,10)))].sort().map(day=>{
      const group=attendance.filter(row=>row.createdAt.startsWith(day));return {name:day.slice(5),value:percent(group.filter(row=>row.present).length,group.length)};
    })
  };
}
operations.get('/analytics',admin,(req,res)=>{
  const from=req.query.from?date(req.query.from,'Start date'):undefined;
  const to=req.query.to?date(String(req.query.to).length===10?req.query.to+'T23:59:59.999Z':req.query.to,'End date'):undefined;
  check(!from||!to||from<=to,'Start date must precede end date.');
  const report=analytics(from,to);
  if (req.query.format==='csv') return res.attachment('campus-analytics.csv').type('text/csv').send('metric,value\n'+Object.entries(report).filter(([,x])=>typeof x==='number').map(([k,v])=>k+','+v).join('\n'));
  res.json(report);
});
operations.get('/admin/accounts',admin,(req,res)=>{
  const q=String(req.query.q || '').toLowerCase();
  const page=req.query.page?integer(req.query.page,'Page',1,10000):1;
  const matched=accounts().filter(user=>(user.name+' '+user.email).toLowerCase().includes(q)&&(!req.query.role||req.query.role===user.role));
  res.json({items:matched.slice((page-1)*20,page*20).map(publicAccount),total:matched.length,page});
});

