import { academicRows } from './academic';
import { accountById, accounts, atomic, get, list, notify, now, save, type Row } from './core';

export function scanReminders(at=new Date()) {
  const time=+at, members=accounts().filter(account=>account.role==='student'||account.role==='faculty');
  const check=(owner:string, row:Row, stamp:string, hours:number, type:string, title:string)=>{
    const due=+new Date(stamp);
    if (!(due>time && due<=time+hours*3600000)) return;
    const id=[owner,type,row.id,stamp].join(':');
    atomic(()=>{
      if(get('reminder-log',id))return;
      save('reminder-log',{id,owner,createdAt:now()});
      notify(owner,title,row.title,type);
    });
  };
  for(const account of members){
    for(const row of academicRows('timetable',account).filter(row=>row.status!=='cancelled'))check(account.id,row,row.startsAt,1,'Classes','Upcoming class');
    if(account.role!=='student')continue;
    for(const row of academicRows('exams',account))check(account.id,row,row.startsAt,48,'Exams','Exam coming up');
    const submitted=new Set(list('submissions',account.id).map(row=>row.assignmentId));
    for(const row of academicRows('assignments',account).filter(row=>!submitted.has(row.id)))check(account.id,row,row.dueAt,24,'Assignments','Assignment due soon');
    for(const row of list('registrations',account.id)){
      const event=get('events',row.eventId);
      if(event?.status==='published')check(account.id,event,event.startsAt,24,'Events','Event coming up');
    }
    for(const row of list('loans',account.id).filter(row=>row.status==='issued')){
      check(account.id,row,row.dueAt,24,'Library','Library loan due soon');
      if(+new Date(row.dueAt)<time){
        const id=account.id+':overdue:'+row.id;
        atomic(()=>{
          if(get('reminder-log',id))return;
          save('reminder-log',{id,owner:account.id,createdAt:now()});
          notify(account.id,'Library loan overdue',row.title,'Library');
        });
      }
    }
  }
}

