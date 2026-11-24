import { useMemo, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download, Layers3, MapPin, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { Badge, Empty, Fields, Header, Markup, Modal, Panel, Problem, QueryView, Tabs, clock, dayKey, fullDate, isoFields, localDateValue, send, shortDate, useAction, useData, type Field, type Item, type User } from './ui';
import { FocusTimer, StudySchedule } from './learning';

function academicFields(user:User,row?:Item):Field[]{
  const cohort:Field[]=[{name:'title',label:'Title',value:row?.title},{name:'department',label:'Department',value:row?.department||user.department},{name:'section',label:'Section',value:row?.section||'A'},{name:'semester',label:'Semester',value:row?.semester||'5'}];
  if(user.role==='admin')cohort.push({name:'facultyId',label:'Faculty account ID',value:row?.facultyId});
  return cohort;
}
function scheduleFields(user:User,row?:Item):Field[]{
  return [...academicFields(user,row),{name:'room',label:'Room',value:row?.room},{name:'startsAt',label:'Start',type:'datetime-local',value:row?.startsAt&&localDateValue(row.startsAt)},{name:'endsAt',label:'End',type:'datetime-local',value:row?.endsAt&&localDateValue(row.endsAt)}];
}
function dateOffset(value:Date,days:number){const d=new Date(value);d.setDate(d.getDate()+days);return d;}
function ClassList({items,select}:{items:Item[];select:(row:Item)=>void}){
  return items.length?<>{items.map(row=><button className="schedule-row full-row" key={row.id} onClick={()=>select(row)}><div className="schedule-time"><strong>{clock(row.startsAt)}</strong><small>{clock(row.endsAt)}</small></div><div className="schedule-accent accent-0"/><div className="line-content"><b>{row.title}</b><p><MapPin size={14}/>{row.room} · {row.faculty}</p></div><Badge tone={row.status==='cancelled'?'amber':'mint'}>{row.status==='cancelled'?'Cancelled':'Scheduled'}</Badge></button>)}</>:<Empty title="No classes in this view"/>;
}
function Roster({row}:{row:Item}){
  const query=useData('/attendance/'+row.id+'/roster'),[selected,setSelected]=useState<Record<string,boolean>>({}),action=useAction();
  return <QueryView query={query}>{rows=>rows.length?<><h3>Record attendance</h3>{rows.map(item=><label className="check-field topic" key={item.id}><input type="checkbox" checked={selected[item.id]??item.present??false} onChange={event=>{const checked=event.target.checked;setSelected(old=>({...old,[item.id]:checked}));}}/>{item.name}</label>)}
    <button className="btn neutral" disabled={action.busy} onClick={()=>void action.run(()=>send('/attendance/'+row.id+'/roster','PUT',{entries:rows.map(item=>({id:item.id,present:selected[item.id]??item.present??false}))}),'Attendance recorded').catch(()=>{})}>Save attendance</button>{action.feedback}</>:<Empty title="No students assigned to this cohort"/>}</QueryView>;
}
function Timetable({user}:{user:User}){
  const query=useData('/timetable'),exams=useData('/exams'),assignments=useData('/assignments'),action=useAction();
  const [view,setView]=useState('Week'),[anchor,setAnchor]=useState(new Date()),[modal,setModal]=useState(''),[selected,setSelected]=useState<Item>();
  const [preview,setPreview]=useState<{csv:string;rows:Item[]}>();
  const staff=['faculty','admin'].includes(user.role);
  const dates=useMemo(()=>{
    if(view==='Day')return [anchor];
    if(view==='Week'){const start=dateOffset(anchor,-((anchor.getDay()+6)%7));return Array.from({length:7},(_,i)=>dateOffset(start,i));}
    const first=new Date(anchor.getFullYear(),anchor.getMonth(),1),start=dateOffset(first,-((first.getDay()+6)%7));
    return Array.from({length:42},(_,i)=>dateOffset(start,i));
  },[anchor,view]);
  function move(offset:number){setAnchor(old=>view==='Month'?new Date(old.getFullYear(),old.getMonth()+offset,1):dateOffset(old,offset*(view==='Week'?7:1)));}
  function select(row:Item){setSelected(row);setModal('detail');}
  return <><Header title="Timetable" description="See your classes, exams and deadlines in one calendar." actions={<><a className="btn neutral" href="/api/timetable/export"><Download size={17}/> Export calendar</a>{staff&&<><button className="btn neutral" onClick={()=>{setPreview(undefined);setModal('import');}}><Upload size={17}/> Import CSV</button><button className="btn primary" onClick={()=>setModal('create')}><Plus size={18}/> Schedule class</button></>}</>}/>
    <Panel className="calendar-panel" title={new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'}).format(anchor)} action={<div className="actions"><button className="icon-btn" aria-label="Previous period" onClick={()=>move(-1)}><ChevronLeft size={19}/></button><button className="btn neutral small" onClick={()=>setAnchor(new Date())}>Today</button><button className="icon-btn" aria-label="Next period" onClick={()=>move(1)}><ChevronRight size={19}/></button></div>}>
      <Tabs options={['Day','Week','Month']} value={view} onChange={setView}/>
      <QueryView query={query}>{items=>{
        const sorted=[...items].sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
        if(view==='Day')return <ClassList select={select} items={sorted.filter(row=>dayKey(row.startsAt)===dayKey(anchor.toISOString()))}/>;
        const special:Item[]=[...(exams.data||[]).map(row=>({...row,entry:'Exam'})),...(assignments.data||[]).map(row=>({...row,startsAt:row.dueAt,entry:'Due'}))];
        return <div className={'calendar-grid '+(view==='Month'?'month':'week')}>{dates.map(day=>{
          const key=dayKey(day.toISOString());const rows=sorted.filter(row=>dayKey(row.startsAt)===key);
          return <div key={key} className={'calendar-cell '+(day.getMonth()!==anchor.getMonth()?'out-month':'')}><button className={'calendar-day '+(key===dayKey(new Date().toISOString())?'today':'')} onClick={()=>{setAnchor(day);setView('Day');}}>{view==='Week'&&<small>{new Intl.DateTimeFormat('en-IN',{weekday:'short'}).format(day)}</small>}{day.getDate()}</button>
            {rows.map(row=><button className={'calendar-item '+(row.status==='cancelled'?'cancelled':'')} key={row.id} onClick={()=>select(row)}><small>{clock(row.startsAt)}</small><b>{row.title}</b><span>{row.room}</span></button>)}
            {special.filter(row=>dayKey(row.startsAt)===key).map(row=><Link to={'/app/coursework?tab='+(row.entry==='Exam'?'Exams':'Assignments')} key={row.id} className="calendar-item special"><small>{row.entry}</small><b>{row.title}</b></Link>)}
          </div>;
        })}</div>;
      }}</QueryView>
    </Panel>
    <div className="spaced"><StudySchedule/></div>
    {(modal==='create'||modal==='edit')&&<Modal title={modal==='edit'?'Reschedule class':'Schedule a class'} close={()=>setModal('')}><Fields fields={scheduleFields(user,modal==='edit'?selected:undefined)} label={modal==='edit'?'Save schedule':'Schedule class'} submit={async values=>{
      await action.run(()=>send('/timetable'+(modal==='edit'?'/'+selected!.id:''),modal==='edit'?'PATCH':'POST',isoFields(values,'startsAt','endsAt')),'Timetable updated');
      setModal('');
    }}/></Modal>}
    {modal==='detail'&&selected&&<Modal title={selected.title} close={()=>setModal('')}>
      <p>{fullDate(selected.startsAt)} – {clock(selected.endsAt)}</p><p>{selected.room} · {selected.faculty}</p><p>{selected.department} · Semester {selected.semester} · Section {selected.section}</p>
      {staff&&<><div className="actions"><button className="btn neutral" onClick={()=>setModal('edit')}>Reschedule</button>{selected.status!=='cancelled'&&<button className="btn danger" disabled={action.busy} onClick={()=>void action.run(()=>send('/timetable/'+selected.id,'PATCH',{status:'cancelled'}),'Class cancelled').then(()=>setModal('')).catch(()=>{})}>Cancel class</button>}</div>
      {selected.status!=='cancelled'&&+new Date(selected.startsAt)<=Date.now()&&<Roster row={selected}/>}</>}
    </Modal>}
    {modal==='import'&&<Modal title="Import timetable CSV" close={()=>setModal('')}>
      <p className="muted">Headers must be title, department, section, semester, facultyId, room, startsAt, endsAt. Use ISO date and time values.</p>
      <Fields fields={[{name:'csv',label:'CSV data',type:'textarea',value:preview?.csv}]} label="Validate and preview" submit={async values=>{
        setPreview(undefined);setPreview({csv:values.csv,rows:await send('/timetable/import','POST',{...values,preview:true})});
      }}><label className="field"><span>Choose a CSV file (optional)</span><input type="file" accept=".csv,text/csv" onChange={async event=>{const field=event.currentTarget.form?.elements.namedItem('csv') as HTMLTextAreaElement|null;const file=event.target.files?.[0];if(file&&field&&file.size<=65000)field.value=await file.text();}}/></label></Fields>
      {preview&&<><p>{preview.rows.length} classes validated.</p><button className="btn primary" disabled={action.busy} onClick={()=>void action.run(()=>send('/timetable/import','POST',{csv:preview.csv}),'Timetable imported').then(()=>setModal('')).catch(()=>{})}><Check size={17}/> Import validated classes</button></>}
    </Modal>}{action.feedback}
  </>;
}
function Submissions({row,user}:{row:Item;user:User}){
  const query=useData('/assignments/'+row.id+'/submissions'),action=useAction();
  return <QueryView query={query}>{items=>user.role==='student'?<>{items.length>0&&<p className="muted">Submitted {fullDate(items[0].createdAt)}</p>}{row.dueAt>new Date().toISOString()&&<Fields key={items[0]?.createdAt||'new'} fields={[{name:'content',label:'Your submission',type:'textarea',value:items[0]?.content}]} label={items.length?'Update submission':'Submit assignment'} submit={values=>action.run(()=>send('/assignments/'+row.id+'/submissions','POST',values),'Submission saved')}/>}
    {action.feedback}</>:items.length?items.map(item=><details className="plan-blocks" key={item.id}><summary>{item.student} · {fullDate(item.createdAt)}</summary><Markup>{item.content}</Markup></details>):<Empty title="No submissions yet"/>}</QueryView>;
}
function AttendanceCalculator({rows}:{rows:Item[]}){
  const [result,setResult]=useState('');
  const attended=rows.filter(item=>item.present).length,total=rows.length;
  const subjects=[...new Set(rows.map(row=>row.subject))];
  return <div className="two-columns"><Panel title="Recorded attendance" subtitle={total?attended+' present out of '+total+' records':undefined}>{subjects.length?subjects.map(subject=>{
    const group=rows.filter(row=>row.subject===subject),value=Math.round(group.filter(row=>row.present).length*100/group.length);
    return <div className="line-item" key={subject}><b>{subject}</b><Badge tone={value<75?'amber':'mint'}>{value}%</Badge></div>;
  }):<Empty title="No attendance records"/>}</Panel><Panel title="Attendance calculator">
    <Fields fields={[{name:'present',label:'Classes attended',type:'number',value:attended},{name:'total',label:'Classes held',type:'number',value:total},{name:'target',label:'Target attendance (%)',type:'number',value:75}]} label="Calculate" submit={async values=>{
      const present=Number(values.present),total=Number(values.total),target=Number(values.target)/100;
      if(present<0||total<1||present>total||target<=0||target>1)throw new Error('Check the attendance counts and enter a target up to 100%.');
      const needed=present/total>=target?0:target===1?Infinity:Math.ceil((target*total-present)/(1-target));
      setResult(needed===Infinity?'A 100% target is unreachable with recorded absences.':needed?'Attend the next '+needed+' classes without an absence to reach your target.':'You already meet your target.');
    }}/>{result&&<p role="status">{result}</p>}
  </Panel></div>;
}
export function Academics({timetable=false}:{timetable?:boolean}){
  const user=useOutletContext<User>();
  return timetable?<Timetable user={user}/>:<Coursework user={user}/>;
}
function Coursework({user}:{user:User}){
  const [params,setParams]=useSearchParams(),[modal,setModal]=useState(''),[selected,setSelected]=useState<Item>();
  const options=['Assignments','Exams','Attendance','Subjects','Announcements'];
  const tab=options.includes(params.get('tab')||'')?params.get('tab')!:'Assignments';
  const path='/'+tab.toLowerCase();
  const query=useData(path),action=useAction();
  const staff=['admin','faculty'].includes(user.role);
  const fields=tab==='Announcements'?[{name:'title',label:'Title'},{name:'description',label:'Announcement',type:'textarea'}]:[...academicFields(user),
    ...(tab==='Assignments'?[{name:'dueAt',label:'Deadline',type:'datetime-local'}]:tab==='Exams'?[{name:'startsAt',label:'Exam date',type:'datetime-local'},{name:'room',label:'Room'}]:[]),
    {name:'description',label:'Description',type:'textarea',optional:true}];
  return <><Header title="Coursework" description="Assignments, exams, attendance and course announcements." actions={staff&&tab!=='Attendance'&&<button className="btn primary" onClick={()=>setModal('create')}><Plus size={18}/> New {tab==='Announcements'?'announcement':tab.slice(0,-1).toLowerCase()}</button>}/>
    <div className="page-tabs"><Tabs options={options} value={tab} onChange={value=>setParams({tab:value})}/></div>
    <QueryView query={query}>{items=>tab==='Attendance'?<AttendanceCalculator key={tab} rows={items}/>:<Panel title={tab}>{items.length?items.map(row=><button className="line-item full-row" key={row.id} onClick={()=>{setSelected(row);setModal('details');}}>
      <span className={'tile-icon '+(tab==='Exams'?'amber':'violet')}><BookOpen size={18}/></span><div className="line-content"><b>{row.title}</b><p>{row.room||row.department||row.description}</p></div>{(row.dueAt||row.startsAt)&&<Badge tone="soft">{shortDate(row.dueAt||row.startsAt)}</Badge>}<ChevronRight size={16}/>
    </button>):<Empty title={'No '+tab.toLowerCase()+' yet'}/>}</Panel>}</QueryView>
    {modal==='create'&&<Modal title={'New '+tab.slice(0,-1).toLowerCase()} close={()=>setModal('')}><Fields fields={fields} label="Publish" submit={async data=>{await action.run(()=>send(path,'POST',isoFields(data,'dueAt','startsAt')),'Published');setModal('');}}/></Modal>}
    {modal==='details'&&selected&&<Modal title={selected.title} close={()=>setModal('')}><div className="stack">{selected.description&&<Markup>{selected.description}</Markup>}{(selected.dueAt||selected.startsAt)&&<p>{fullDate(selected.dueAt||selected.startsAt)}{selected.room&&' · '+selected.room}</p>}{tab==='Assignments'&&<Submissions row={selected} user={user}/>}</div></Modal>}
    {action.feedback}
  </>;
}
export function Productivity(){
  const [tab,setTab]=useState('Tasks'),[modal,setModal]=useState(''),[selected,setSelected]=useState<Item>(),[confirm,setConfirm]=useState(false);
  const action=useAction();
  const path='/'+tab.toLowerCase();
  const query=useData(path,tab!=='Focus timer'&&tab!=='Calendar');
  const allTasks=useData('/tasks'),assignments=useData('/assignments'),exams=useData('/exams');
  const tabs=['Tasks','Notes','Goals','Bookmarks','Calendar','Focus timer'];
  const task=tab==='Tasks'||tab==='Goals';
  function streak(rows:Item[]){
    const days=new Set(rows.filter(item=>item.completedAt).map(item=>dayKey(item.completedAt)));
    let count=0,day=new Date();
    if(!days.has(dayKey(day.toISOString())))day=dateOffset(day,-1);
    while(days.has(dayKey(day.toISOString()))){count++;day=dateOffset(day,-1);}
    return count;
  }
  return <><Header title="Study Space" description="Keep your tasks, notes and academic goals together." actions={<><Badge tone="mint">{streak(allTasks.data||[])} day study streak</Badge>{!['Focus timer','Calendar'].includes(tab)&&<button className="btn primary" onClick={()=>{setSelected(undefined);setModal('edit');}}><Plus size={17}/> Add {tab.slice(0,-1).toLowerCase()}</button>}</>}/>
    <div className="page-tabs"><Tabs options={tabs} value={tab} onChange={setTab}/></div>
    {tab==='Focus timer'?<FocusTimer/>:tab==='Calendar'?<Panel title="Personal deadlines">
      {[...(allTasks.data||[]),...(assignments.data||[]),...(exams.data||[])].filter(row=>row.dueAt||row.startsAt).sort((a,b)=>(a.dueAt||a.startsAt).localeCompare(b.dueAt||b.startsAt)).map(row=><div className="line-item" key={row.id}><CalendarDays size={18}/><div className="line-content"><b>{row.title}</b><p>{fullDate(row.dueAt||row.startsAt)}</p></div></div>)}
      {!allTasks.data?.some(row=>row.dueAt)&&!assignments.data?.length&&!exams.data?.length&&<Empty title="No deadlines yet"/>}
    </Panel>:<Panel title={tab}><QueryView query={query}>{items=>items.length?items.map(row=><div className="line-item" key={row.id}>
      {task&&<input type="checkbox" aria-label={'Complete '+row.title} checked={row.done} disabled={action.busy} onChange={event=>void action.run(()=>send(path+'/'+row.id,'PATCH',{done:event.target.checked}),'Progress updated').catch(()=>{})}/>}
      <button className={'plain-button line-content '+(row.done?'completed':'')} onClick={()=>{setSelected(row);setModal('edit');}}><b>{row.title}</b>{row.dueAt&&<p>Due {shortDate(row.dueAt)}</p>}</button>
      <button className="icon-btn" aria-label={'Delete '+row.title} onClick={()=>{setSelected(row);setConfirm(true);}}><Trash2 size={17}/></button>
    </div>):<Empty title={'No '+tab.toLowerCase()+' yet'}/>}</QueryView></Panel>}
    {modal==='edit'&&<Modal title={selected?'Edit '+tab.slice(0,-1).toLowerCase():'Add '+tab.slice(0,-1).toLowerCase()} close={()=>setModal('')}>
      <Fields fields={[{name:'title',label:'Title',value:selected?.title},{name:'content',label:'Details',type:'textarea',optional:true,value:selected?.content},...(!selected&&task?[{name:'dueAt',label:'Due date',type:'datetime-local',optional:true}]:[])]} submit={async values=>{await action.run(()=>send(path+(selected?'/'+selected.id:''),selected?'PATCH':'POST',isoFields(values,'dueAt')));setModal('');}}/>
    </Modal>}
    {confirm&&selected&&<Modal title={'Delete '+selected.title+'?'} close={()=>setConfirm(false)}><button className="btn danger" disabled={action.busy} onClick={()=>void action.run(()=>send(path+'/'+selected.id,'DELETE'),'Deleted').then(()=>setConfirm(false)).catch(()=>{})}>Delete item</button></Modal>}
    {action.feedback}
  </>;
}

