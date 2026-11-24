import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen, BriefcaseBusiness, CalendarDays, ClipboardList, Clock3, GraduationCap, MapPin, Sparkles, Target, TrendingUp, TriangleAlert, Users, Zap } from 'lucide-react';
import { Badge, Empty, Fields, Header, Panel, QueryView, clock, fullDate, shortDate, useData, type Item, type User } from './ui';

type DashboardData={timetable:Item[];next?:Item;attendance:number|null;attendanceGroups:{subject:string;value:number}[];exams:Item[];assignments:Item[];events:Item[];tasks:Item[];loans:Item[];placements:Item[];complaints:Item[];notifications:Item[];announcements:Item[]};
export function Tile({label,value,detail,to,tone,Icon}:{label:string;value:ReactNode;detail:ReactNode;to:string;tone:string;Icon:typeof CalendarDays}){
  return <Link to={to} className="panel metric-card"><div><span className={'tile-icon '+tone}><Icon size={19}/></span><ArrowUpRight className="metric-arrow" size={17}/></div><p>{label}</p><strong>{value}</strong><small>{detail}</small></Link>;
}
function Countdown({stamp}:{stamp:string}){
  const [seconds,setSeconds]=useState(()=>Math.max(0,Math.ceil((+new Date(stamp)-Date.now())/1000)));
  useEffect(()=>{const id=setInterval(()=>setSeconds(Math.max(0,Math.ceil((+new Date(stamp)-Date.now())/1000))),1000);return()=>clearInterval(id);},[stamp]);
  const hours=Math.floor(seconds/3600);
  return <span>{hours>24?Math.floor(hours/24)+'d ':''}{hours%24}h {Math.floor(seconds/60)%60}m</span>;
}
export function Dashboard(){
  const user=useOutletContext<User>(), data=useData<DashboardData>('/dashboard'), navigate=useNavigate();
  const [question,setQuestion]=useState('');
  const date=new Date();
  const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'numeric',hourCycle:'h23',timeZone:'Asia/Kolkata'}).format(date));
  const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const pretty=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Kolkata'}).format(date);
  const ask=(event:FormEvent)=>{event.preventDefault();if(question.trim())navigate('/app/assistant?q='+encodeURIComponent(question.trim()));};
  const firstName=user.name.startsWith('Dr. ')?user.name:user.name.split(' ')[0];
  return <>
    <div className="dashboard-header"><div><span className="eyebrow"><span/> CAMPUS OVERVIEW</span><h1>{greeting}, {firstName}.</h1><p>{user.role==='faculty'?'Your teaching schedule and campus updates at a glance.':'Here’s what’s happening on your campus today.'}</p></div><span className="date-chip"><CalendarDays size={16}/>{pretty}</span></div>
    <section className="assistant-hero">
      <div className="hero-content"><Badge tone="light"><Sparkles size={13}/> CampusSaathi Assistant</Badge><h2>Your campus, at your fingertips.</h2><p>Find classes, books, events, and answers in seconds.</p>
      <form className="hero-search" onSubmit={ask}><Sparkles size={18}/><input aria-label="Ask anything about your campus" placeholder="Ask anything about your campus..." value={question} onChange={event=>setQuestion(event.target.value)} required/><button aria-label="Ask campus assistant"><ArrowRight size={19}/></button></form></div>
      <div className="hero-illustration" aria-hidden="true"><div className="orbit o1"/><div className="orbit o2"/><div className="orbit o3"/><div className="hero-core"><Sparkles size={38}/></div><span className="satellite s1"><CalendarDays size={19}/></span><span className="satellite s2"><BookOpen size={20}/></span><span className="satellite s3"><GraduationCap size={20}/></span><i className="star a"/><i className="star b"/><i className="star c"/></div>
    </section>
    <QueryView query={data}>{d=>{
      const done=d.tasks.filter(task=>task.done).length;
      return <>
      <div className="metrics">
        <Tile label={user.role==='faculty'?'Teaching today':'Classes today'} value={d.timetable.length} detail={d.next?<>Next in <Countdown stamp={d.next.startsAt}/></>:'No upcoming class'} Icon={CalendarDays} tone="violet" to="/app/timetable"/>
        <Tile label={user.role==='faculty'?'Open assignments':'Attendance'} value={user.role==='faculty'?d.assignments.length:d.attendance===null?'—':d.attendance+'%'} detail={user.role==='faculty'?'Published coursework':d.attendance===null?'No attendance recorded':'Across your recorded classes'} Icon={TrendingUp} tone="mint" to="/app/coursework"/>
        <Tile label={user.role==='faculty'?'Upcoming exams':'Assignments due'} value={user.role==='faculty'?d.exams.length:d.assignments.filter(a=>new Date(a.dueAt)>=date).length} detail={user.role==='faculty'?'In your teaching timetable':'Awaiting submission'} Icon={ClipboardList} tone="amber" to="/app/coursework"/>
        <Tile label="Study progress" value={d.tasks.length?Math.round(100*done/d.tasks.length)+'%':'—'} detail={done+' of '+d.tasks.length+' tasks complete'} Icon={Target} tone="blue" to="/app/study"/>
      </div>
      <div className="dashboard-grid">
        <Panel title="Today's schedule" subtitle="Classes and labs on your timetable" action={<Link className="text-link" to="/app/timetable">View timetable <ArrowRight size={15}/></Link>}>
          {d.timetable.length?d.timetable.map((item,i)=><div className="schedule-row" key={item.id}><div className="schedule-time"><strong>{clock(item.startsAt)}</strong><small>{clock(item.endsAt)}</small></div><div className={'schedule-accent accent-'+i%3}/><div className="line-content"><b>{item.title}</b><p><MapPin size={13}/>{item.room} <span>·</span> {item.faculty}</p></div><Badge tone={i%2?'mint':'soft'}>{item.title.includes('Lab')?'Lab':'Lecture'}</Badge></div>):<Empty title="No classes today" detail={d.next?'Next: '+d.next.title+' · '+fullDate(d.next.startsAt):'Your timetable is clear.'}/>}
        </Panel>
        <Panel title="Upcoming exams" subtitle="Your next assessment dates" action={<Link className="icon-btn" to="/app/coursework?tab=Exams" aria-label="Open exam timetable"><ArrowUpRight size={18}/></Link>}>
          {d.exams.length?d.exams.slice(0,3).map(item=><div className="line-item" key={item.id}><span className="tile-icon amber"><CalendarDays size={17}/></span><div className="line-content"><b>{item.title}</b><p>{item.room}</p></div><small>{shortDate(item.startsAt)}</small></div>):<Empty title="No upcoming exams"/>}
          <Link to="/app/exam-panic" className="inline-promo"><Zap size={17}/> Open Exam Panic Mode <ArrowRight size={15}/></Link>
        </Panel>
        <Panel title="Recommended events" subtitle="Coming up on campus" action={<Link className="text-link" to="/app/events">Browse events <ArrowRight size={15}/></Link>}>
          {d.events.length?<div className="mini-events">{d.events.slice(0,2).map((item,i)=><Link to={'/app/events?event='+item.id} key={item.id} className="mini-event"><div className={'event-art '+(i?'mint':'violet')}><Activity size={34}/><span>{item.category}</span></div><b>{item.title}</b><small>{shortDate(item.startsAt)} · {item.room}</small></Link>)}</div>:<Empty title="No events scheduled"/>}
        </Panel>
        <Panel title="Campus activity" action={<Link className="icon-btn" aria-label="View notifications" to="/app/notifications"><Bell size={18}/></Link>}>
          {d.notifications.slice(0,3).map(item=><div className="line-item" key={item.id}><span className="notice-dot"/><div className="line-content"><b>{item.title}</b><p>{item.message}</p></div></div>)}
          {d.announcements.slice(0,1).map(item=><div className="line-item" key={item.id}><span className="notice-dot"/><div className="line-content"><b>{item.title}</b><p>{item.description}</p></div></div>)}
          {!d.notifications.length&&!d.announcements.length&&<Empty title="No new campus activity"/>}
        </Panel>
        <Panel title="Your campus services" className="wide">
          <div className="service-grid">{[[BookOpen,'Library',d.loans.length+' active loans','library','violet'],[BriefcaseBusiness,'Placements',d.placements.length+' open opportunities','placements','mint'],[TriangleAlert,'Complaints',d.complaints.length+' pending tickets','complaints','amber']].map(([Icon,title,desc,path,tone])=>{
            const Graphic=Icon as typeof BookOpen;
            return <Link to={'/app/'+path} className="service-link" key={String(path)}><span className={'tile-icon '+tone}><Graphic size={18}/></span><span><b>{String(title)}</b><small>{String(desc)}</small></span><ArrowUpRight size={15}/></Link>;
          })}</div>
        </Panel>
      </div>
      </>;
    }}</QueryView>
  </>;
}
export function ServiceOverview({role}:{role:'librarian'|'placement'}){
  const library=role==='librarian';
  const books=useData('/library',library);
  const activity=useData<{loans:Item[];reservations:Item[]}>('/library/activity',library);
  const jobs=useData('/placements',!library);
  const data=useData<DashboardData>('/dashboard');
  const path=library?'/app/library':'/app/placements';
  const borrowed=activity.data?.loans.filter(row=>row.status==='issued')||[];
  const open=jobs.data?.filter(row=>row.status==='published'&&+new Date(row.dueAt)>Date.now())||[];
  return <><Header title={library?'Library operations':'Placement operations'} description={library?'Review the campus catalog, active loans, and outstanding holds.':'Review current opportunities and publish new openings.'}
    actions={<Link className="btn primary" to={path}>Open {library?'Digital Library':'Placement Coach'} <ArrowRight size={17}/></Link>}/>
    {library?<QueryView query={activity}>{value=><div className="metrics">
      <Tile label="Catalog titles" value={books.data?.length??'—'} detail="Titles in the campus library" to={path} tone="violet" Icon={BookOpen}/>
      <Tile label="Active loans" value={borrowed.length} detail="Issued copies" to={path} tone="blue" Icon={BookOpen}/>
      <Tile label="Active holds" value={value.reservations.length} detail="Reservations awaiting issue" to={path} tone="mint" Icon={ClipboardList}/>
      <Tile label="Overdue loans" value={borrowed.filter(row=>+new Date(row.dueAt)<Date.now()).length} detail="Past their return date" to={path} tone="amber" Icon={Clock3}/>
    </div>}</QueryView>:<QueryView query={jobs}>{value=><div className="metrics">
      <Tile label="Open opportunities" value={open.length} detail="Accepting applications" to={path} tone="violet" Icon={BriefcaseBusiness}/>
      <Tile label="Listed opportunities" value={value.length} detail="Campus placement records" to={path} tone="blue" Icon={ClipboardList}/>
      <Tile label="Closing this week" value={open.filter(row=>+new Date(row.dueAt)<Date.now()+7*86400000).length} detail="Upcoming deadlines" to={path} tone="amber" Icon={CalendarDays}/>
    </div>}</QueryView>}
    <div className="two-columns"><Panel title={library?'Next loan due dates':'Upcoming application deadlines'}>
      {(library?borrowed:open).length?(library?borrowed:open).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)).slice(0,6).map(row=><div className="line-item" key={row.id}><div className="line-content"><b>{row.title}</b><p>{fullDate(row.dueAt)}</p></div></div>):<Empty title={library?'No active loans':'No open opportunities'}/>}
    </Panel><Panel title="Campus updates"><QueryView query={data}>{value=>value.announcements.length?value.announcements.map(row=><div className="line-item" key={row.id}><div className="line-content"><b>{row.title}</b><p>{row.description}</p></div></div>):<Empty title="No campus announcements"/>}</QueryView></Panel></div>
  </>;
}
