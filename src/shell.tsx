import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { Activity, ArrowDown, ArrowRight, Bell, BookOpen, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronsUpDown, CircleHelp, ClipboardCheck, Command, GraduationCap, LayoutGrid, ListTodo, LogOut, MapPin, Moon, PanelLeftClose, PanelLeftOpen, Search, Settings, ShieldCheck, Sparkles, Sun, TriangleAlert, Zap } from 'lucide-react';
import { ApiError, Avatar, Badge, Fields, Loading, Modal, Problem, QueryView, SearchBox, fileData, fullDate, roleLabels, send, useAction, useData, type User } from './ui';
import { Dashboard, ServiceOverview } from './dashboard';

const AdminOverview=lazy(()=>import('./adminOverview').then(module=>({default:module.AdminOverview})));
const Academics=lazy(()=>import('./academics').then(module=>({default:module.Academics})));
const Productivity=lazy(()=>import('./academics').then(module=>({default:module.Productivity})));
const Complaints=lazy(()=>import('./campusPages').then(module=>({default:module.Complaints})));
const Events=lazy(()=>import('./campusPages').then(module=>({default:module.Events})));
const Library=lazy(()=>import('./campusPages').then(module=>({default:module.Library})));
const MapPage=lazy(()=>import('./campusPages').then(module=>({default:module.MapPage})));
const Placements=lazy(()=>import('./campusPages').then(module=>({default:module.Placements})));
const AdminDirectory=lazy(()=>import('./campusPages').then(module=>({default:module.AdminDirectory})));
const ChatPage=lazy(()=>import('./learning').then(module=>({default:module.ChatPage})));
const DraftPage=lazy(()=>import('./learning').then(module=>({default:module.DraftPage})));
const ExamPanic=lazy(()=>import('./learning').then(module=>({default:module.ExamPanic})));
const Practice=lazy(()=>import('./practice').then(module=>({default:module.Practice})));

const nav=[
  {label:'Overview',path:'',icon:LayoutGrid,group:'Workspace'},
  {label:'AI Assistant',path:'assistant',icon:Sparkles,group:'Workspace'},
  {label:'Timetable',path:'timetable',icon:CalendarDays,group:'Academics'},
  {label:'Coursework',path:'coursework',icon:ClipboardCheck,group:'Academics'},
  {label:'Doubt Solver',path:'tutor',icon:CircleHelp,group:'Academics'},
  {label:'Exam Panic',path:'exam-panic',icon:Zap,group:'Academics'},
  {label:'Study Space',path:'study',icon:ListTodo,group:'Academics'},
  {label:'Practice Studio',path:'practice',icon:ClipboardCheck,group:'Academics'},
  {label:'Events',path:'events',icon:Activity,group:'Campus'},
  {label:'Digital Library',path:'library',icon:BookOpen,group:'Campus'},
  {label:'Campus Map',path:'map',icon:MapPin,group:'Campus'},
  {label:'Placement Coach',path:'placements',icon:BriefcaseBusiness,group:'Campus'},
  {label:'Complaints',path:'complaints',icon:TriangleAlert,group:'Campus'},
  {label:'Teaching Assistant',path:'teaching',icon:GraduationCap,group:'Operations',roles:['admin','faculty']},
  {label:'Campus Intelligence',path:'intelligence',icon:Activity,group:'Operations',roles:['admin']},
  {label:'Campus Directory',path:'directory',icon:ShieldCheck,group:'Operations',roles:['admin']},
];
export function Logo({compact=false}:{compact?:boolean}) {
  return <span className="brand"><span className="brand-mark"><GraduationCap size={21} strokeWidth={2.25}/></span>{!compact&&<span>CampusSaathi <em>AI</em></span>}</span>;
}
function ProductArt() {
  return <div className="product-art" aria-hidden="true">
    <div className="art-nav"><i/><i/><i/></div><div className="art-body"><span className="art-side"><i/><i/><i/><i/><i/></span><div className="art-content">
      <div className="art-hero"><Sparkles size={45}/><span><i/><i/><i/></span></div><div className="art-stats"><span/><span/><span/></div>
      <div className="art-chart"><i/><i/><i/><i/><i/><i/><i/></div>
    </div></div>
    <div className="art-float"><span className="tile-icon violet"><Zap size={19}/></span><span><b>Campus Assistant</b><small>Grounded in campus records</small></span></div>
  </div>;
}
function Landing(){
  return <div className="landing">
    <header className="landing-head"><Link to="/" aria-label="CampusSaathi home"><Logo/></Link><nav aria-label="Landing page"><a href="#features">Features</a><a href="#how">How it works</a><a href="#faq">FAQ</a></nav><div className="actions"><Link className="btn neutral" to="/login">Sign in</Link><Link className="btn primary landing-cta" to="/register">Get started <ArrowRight size={16}/></Link></div></header>
    <main>
      <section className="landing-hero">
        <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.4}} className="landing-copy">
          <span className="landing-label"><Sparkles size={15}/> Intelligent Campus Operating System</span>
          <h1>One Campus.<br/>One Platform.<br/><span>Infinite Possibilities.</span></h1>
          <p>Get to class on time, prepare for exams, discover what’s happening, and take care of campus business from one workspace.</p>
          <div className="actions"><Link className="btn primary" to="/login">Explore the campus <ArrowRight size={19}/></Link><a className="btn neutral" href="#features">See features <ArrowDown size={16}/></a></div>
          <div className="landing-roles"><span>Students</span><span>Faculty</span><span>Campus teams</span></div>
        </motion.div><ProductArt/>
      </section>
      <section id="features" className="landing-section"><h2>Everything you need for campus life</h2>
        <div className="feature-grid">
          {[[Sparkles,'Ask your campus','Check your schedule, attendance, and upcoming events in one conversation.'],[CalendarDays,'Plan your semester','See classes, exam dates, schedules, attendance, and deadlines together.'],[Zap,'Work through exam week','Make a revision plan, start a focus session, and track topics as you finish.'],[BookOpen,'Find what to read','Reserve a book, review your loans, or ask about an uploaded PDF.'],[GraduationCap,'Teach and coordinate','Publish assignments, record attendance, and review teaching drafts.'],[ShieldCheck,'Run campus operations','Manage events, complaints, and services with a shared view of activity.']].map(([Icon,title,copy])=>{
            const Graphic=Icon as typeof Sparkles;
            return <article className="panel landing-feature" key={String(title)}><span className="tile-icon violet"><Graphic size={22}/></span><h3>{String(title)}</h3><p>{String(copy)}</p></article>;
          })}
        </div>
      </section>
      <section id="how" className="landing-section landing-how"><h2>See your campus in action</h2><p>Choose a role at sign-in to explore the fictional Apex campus in local demo mode. Start with your overview, then try a campus question or register for an event.</p><Link className="btn primary" to="/login">Open the demo <ArrowRight size={17}/></Link></section>
      <section id="faq" className="landing-section landing-faq"><h2>Frequently asked questions</h2>
        <details><summary>Where does campus information come from?</summary><p>Timetables, attendance, library availability and other campus records come from the application database.</p></details>
        <details><summary>Do I need an AI key to try it?</summary><p>The local demo can look up campus records and extract passages from PDFs. A configured provider enables conversational tutoring, images and generated drafts.</p></details>
        <details><summary>Can I register as campus staff?</summary><p>Public registration creates a student account. Administrators provision staff roles.</p></details>
      </section>
    </main><footer className="landing-head"><Link to="/"><Logo/></Link><span>CampusSaathi AI · Campus workspace</span><Link to="/login">Sign in</Link></footer>
  </div>;
}
type AuthMode='login'|'register'|'forgot'|'reset';
function Auth({mode}:{mode:AuthMode}){
  const cache=useQueryClient(), navigate=useNavigate();
  const location=useLocation();
  const [search]=useSearchParams();
  const [reset,setReset]=useState('');
  const [notice,setNotice]=useState('');
  const [selected,setSelected]=useState<{role:User['role'];email:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<unknown>(null);
  const demos=useData<User[]>('/auth/demo-users',mode==='login');
  const headings={login:'Welcome back',register:'Create your account',forgot:'Reset your password',reset:'Set a new password'};
  const fields=mode==='register'?[{name:'name',label:'Full name'}]:[];
  const accountFields= mode!=='reset'?[{name:'email',label:'Campus email',type:'email',value:selected?.email}]:[];
  const passwordFields=mode==='forgot'?[]:[{name:'password',label:'Password',type:'password',value:selected?'CampusDemo!26':undefined}];
  async function finish(user: User){
    const returnTo=location.state?.returnTo;
    const destination=typeof returnTo==='string'&&/^\/app(?:\/|[?]|$)/.test(returnTo)?returnTo:'/app';
    cache.clear();cache.setQueryData(['/auth/me'],user);navigate(destination,{replace:true});
  }
  return <main className="auth-screen"><div className="auth-art"><Link to="/" aria-label="Home"><Logo/></Link><div><Badge tone="light">Apex Institute of Technology</Badge><h1>Your campus,<br/>in one place.</h1><p>One Campus. One Platform. Infinite Possibilities.</p></div><div className="auth-orbit"><Sparkles size={65}/></div></div>
    <section className="auth-form"><Link className="auth-home" to="/"><Logo/></Link>
      <div className="auth-inner"><h1>{headings[mode]}</h1><p>{mode==='login'?'Sign in to your campus workspace.':mode==='register'?'Sign up for a student account.':mode==='forgot'?'Enter the email associated with your account.':'Use your one-time reset link.'}</p>
      <Fields key={selected?.role||mode} fields={[...fields,...accountFields,...passwordFields]} label={{login:'Sign in',register:'Create account',forgot:'Request reset',reset:'Update password'}[mode]} submit={async values=>{
        if(mode==='login'||mode==='register') return finish(await send('/auth/'+mode,'POST',values));
        if(mode==='forgot'){const result=await send('/auth/forgot-password','POST',values);setReset(result.resetToken||'');setNotice(result.message);return;}
        await send('/auth/reset-password','POST',{...values,token:search.get('token')});
        navigate('/login',{replace:true});
      }}/>
      {notice&&<p role="status">{notice}</p>}
      {reset&&<Link className="text-link" to={'/reset-password?token='+encodeURIComponent(reset)}>Open local reset link <ArrowRight size={15}/></Link>}
      {mode==='login'&&<p className="auth-links"><Link to="/forgot-password">Forgot password?</Link><Link to="/register">Create an account</Link></p>}
      {mode!=='login'&&<Link className="text-link" to="/login">Back to sign in <ArrowRight size={15}/></Link>}
      {mode==='login'&&!!demos.data?.length&&<div className="demo-picker"><h2>Explore the demo</h2><p>Choose an account to sign in with fictional campus data.</p>
        <div>{demos.data.map(account=><button key={account.email} className="btn neutral" disabled={busy} onClick={async()=>{
          setBusy(true);setSelected(account);setError(null);
          try{await finish(await send('/auth/login','POST',{email:account.email,password:'CampusDemo!26'}));}catch(error){setError(error);}finally{setBusy(false);}
        }}>{roleLabels[account.role]}</button>)}</div>{error!==null&&<Problem error={error}/>}</div>}
      </div>
    </section>
  </main>;
}
function Preferences({user}:{user:User}){
  const action=useAction(), cache=useQueryClient();
  const preferences=useData<{muted:boolean}>('/users/preferences');
  const [picture,setPicture]=useState<File>();
  return <><div className="page-heading"><div><h1>Settings</h1><p>Manage your profile and campus notifications.</p></div></div>
    <div className="two-columns"><section className="panel"><div className="profile-head"><Avatar user={user}/><div><h2>{user.name}</h2><p>{user.email} · {roleLabels[user.role]}</p></div></div>
      {user.department&&<p className="muted">{user.department}{user.semester&&' · Semester '+user.semester+' · Section '+user.section}{user.enrollment&&' · '+user.enrollment}</p>}
      <Fields fields={[{name:'name',label:'Full name',value:user.name},...(['skills','interests','goals'].map(name=>({name,label:name[0].toUpperCase()+name.slice(1),optional:true,value:user[name]})))]} submit={async values=>{
        const avatar=picture?await fileData(picture,420000):undefined;
        const next=await action.run(()=>send<User>('/users/profile','PATCH',{...values,avatar}),'Profile updated');cache.setQueryData(['/auth/me'],next);
      }}><label className="field"><span>Profile picture</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>setPicture(event.target.files?.[0])}/></label></Fields>
    </section><section className="panel"><h2>Notifications</h2><p className="muted">Mute campus reminders while keeping complaint updates.</p><QueryView query={preferences}>{value=><Fields key={String(value.muted)} fields={[{name:'muted',label:'Mute reminders',type:'checkbox',value:value.muted}]} submit={values=>action.run(()=>send('/users/preferences','PUT',values),'Preferences saved')}/>}</QueryView></section></div>{action.feedback}</>;
}
function Notifications(){
  const query=useData('/notifications'), action=useAction();
  return <><div className="page-heading"><div><h1>Notifications</h1><p>Updates from across your campus.</p></div><button className="btn neutral" disabled={action.busy||!query.data?.some(row=>!row.read)} onClick={()=>void action.run(()=>send('/notifications/mark-all-read','POST'),'All notifications read').catch(()=>{})}>Mark all as read</button></div>
    <section className="panel"><QueryView query={query}>{items=>items.length?items.map(item=><div className="line-item" key={item.id}><span className={'tile-icon '+(item.read?'soft':'violet')}><Bell size={18}/></span><div className="line-content"><b>{item.title}</b><p>{item.message}</p><small>{fullDate(item.createdAt)}</small></div>{!item.read&&<button className="btn neutral small" disabled={action.busy} onClick={()=>void action.run(()=>send('/notifications/'+item.id+'/read','PATCH'),'Marked as read').catch(()=>{})}>Mark as read</button>}</div>):<p className="muted">You’re all caught up.</p>}</QueryView></section>{action.feedback}</>;
}
function Workspace({user}:{user:User}){
  const navigate=useNavigate(),location=useLocation(), cache=useQueryClient();
  const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('campus-sidebar')==='collapsed');
  const [dark,setDark]=useState(()=>localStorage.getItem('campus-theme')==='dark');
  const [palette,setPalette]=useState(false),[search,setSearch]=useState('');
  const action=useAction();
  const notifications=useData('/notifications');
  const unread=notifications.data?.filter(row=>!row.read).length||0;
  const available=nav.filter(item=>!item.roles||item.roles.includes(user.role));
  const path='/app'+(location.pathname.slice(4).split('/').slice(0,2).join('/')||'');
  const current=available.find(item=>'/app'+(item.path?'/'+item.path:'')===path);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('campus-theme',dark?'dark':'light');return()=>{delete document.documentElement.dataset.theme;};},[dark]);
  useEffect(()=>{localStorage.setItem('campus-sidebar',collapsed?'collapsed':'expanded');},[collapsed]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setPalette(open=>!open);}};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[]);
  useEffect(()=>{
    const socket=io({transports:['websocket','polling']});
    socket.on('notifications:changed',()=>{void cache.invalidateQueries({queryKey:['/notifications']});void cache.invalidateQueries({queryKey:['/dashboard']});});
    return()=>{socket.disconnect();};
  },[cache,user.id]);
  const close=()=>{setPalette(false);setSearch('');};
  const logout=async()=>{await send('/auth/logout','POST');cache.clear();navigate('/login',{replace:true});};
  return <div className={'app-shell '+(collapsed?'collapsed':'')}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="sidebar" aria-label="Campus workspace">
      <Link className="sidebar-brand" to="/app" aria-label="CampusSaathi overview"><Logo compact={collapsed}/></Link>
      <div className="campus-switch"><span className="campus-initial">A</span>{!collapsed&&<><div><strong>Apex Institute</strong><small>Campus workspace</small></div><ChevronsUpDown size={14}/></>}</div>
      <nav aria-label="Main navigation">{[...new Set(available.map(item=>item.group))].map(group=><div className="nav-group" key={group}>{!collapsed&&<span className="nav-heading">{group}</span>}{available.filter(item=>item.group===group).map(({label,path,icon:Icon})=><NavLink className={({isActive})=>'nav-item '+(isActive?'active':'')} aria-label={label} title={collapsed?label:undefined} end to={path?'/app/'+path:'/app'} key={path}><Icon size={17}/>{!collapsed&&<span>{label}</span>}</NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><Link className="nav-item" to="/app/settings" aria-label="Settings"><Settings size={17}/>{!collapsed&&<span>Settings</span>}</Link>
      <button className="nav-item" type="button" aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setCollapsed(!collapsed)}>{collapsed?<PanelLeftOpen size={17}/>:<><PanelLeftClose size={17}/><span>Collapse sidebar</span></>}</button></div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><span>/</span><b>{current?.label||(location.pathname.endsWith('settings')?'Settings':'Notifications')}</b></div>
      <button className="top-search" onClick={()=>setPalette(true)}><Search size={16}/><span>Search anything...</span><kbd><Command size={11}/> K</kbd></button>
      <div className="top-actions"><button className="icon-btn top-theme" aria-label={dark?'Use light theme':'Use dark theme'} onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
        <Link className="icon-btn bell" to="/app/notifications" aria-label={'Notifications'+(unread?' ('+unread+' unread)':'')}><Bell size={19}/>{unread>0&&<i/>}</Link>
        <details className="profile-menu"><summary aria-label="Account menu"><Avatar user={user}/><span><b>{user.name.split(' ').slice(0,2).join(' ')}</b><small>{roleLabels[user.role]}</small></span><ChevronDown size={15}/></summary>
          <div><Link to="/app/settings" onClick={event=>event.currentTarget.closest('details')?.removeAttribute('open')}><Settings size={16}/> Settings</Link><button type="button" onClick={()=>void action.run(logout,'Signed out').catch(()=>{})}><LogOut size={16}/> Sign out</button></div></details>
      </div>
    </header>
    <main id="main-content" className="content" tabIndex={-1}><AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.12}}><Suspense fallback={<Loading/>}><Outlet context={user}/></Suspense></motion.div></AnimatePresence></main>
    </div>
    {current?.path!=='assistant'&&<Link className="floating-ai" to="/app/assistant" aria-label="Open campus assistant"><Sparkles size={21}/></Link>}
    <nav className="bottom-nav" aria-label="Mobile navigation">{[available[0],available[2],available[1],available.find(item=>item.path==='events')!].map(({label,path,icon:Icon})=><NavLink key={path} to={path?'/app/'+path:'/app'} end><Icon size={19}/>{label.replace('AI ','')}</NavLink>)}<button onClick={()=>setPalette(true)}><Search size={19}/>More</button></nav>
    {palette&&<Modal title="Go to a campus tool" close={close}><SearchBox value={search} onChange={setSearch} label="Find a page"/><div className="palette-list">{[...available,{label:'Settings',path:'settings',icon:Settings},{label:'Notifications',path:'notifications',icon:Bell}].filter(item=>item.label.toLowerCase().includes(search.toLowerCase())).map(({label,path,icon:Icon})=><Link key={path} onClick={close} to={path?'/app/'+path:'/app'}><Icon size={17}/>{label}<ArrowRight size={15}/></Link>)}{search&&<Link onClick={close} to={'/app/assistant?q='+encodeURIComponent(search)}><Sparkles size={17}/>Ask the campus assistant<ArrowRight size={15}/></Link>}</div></Modal>}
    {action.feedback}
  </div>;
}
export function App(){
  const user=useData<User>('/auth/me');
  const location=useLocation();
  const guard=user.isPending?<Loading/>:user.data?<Workspace user={user.data}/>:user.error instanceof ApiError&&user.error.status!==401?<Problem error={user.error}/>:<Navigate to="/login" replace state={{returnTo:location.pathname+location.search}}/>;
  return <MotionConfig reducedMotion="user"><Routes>
    <Route path="/" element={<Landing/>}/><Route path="/login" element={user.data?<Navigate to="/app" replace/>:<Auth key="login" mode="login"/>}/>
    <Route path="/register" element={<Auth key="register" mode="register"/>}/><Route path="/forgot-password" element={<Auth key="forgot" mode="forgot"/>}/><Route path="/reset-password" element={<Auth key="reset" mode="reset"/>}/>
    <Route path="/app" element={guard}>
      <Route index element={user.data?.role==='admin'?<AdminOverview/>:user.data?.role==='librarian'||user.data?.role==='placement'?<ServiceOverview role={user.data.role}/>:<Dashboard/>}/><Route path="assistant" element={<ChatPage/>}/><Route path="tutor" element={<ChatPage tutor/>}/>
      <Route path="timetable" element={<Academics timetable/>}/><Route path="coursework" element={<Academics/>}/><Route path="study" element={<Productivity/>}/>
      <Route path="practice" element={<Practice/>}/>
      <Route path="exam-panic" element={<ExamPanic/>}/><Route path="events" element={<Events/>}/><Route path="library" element={<Library/>}/><Route path="complaints" element={<Complaints/>}/>
      <Route path="map" element={<MapPage/>}/><Route path="placements" element={<Placements/>}/><Route path="directory" element={user.data?.role==='admin'?<AdminDirectory/>:<Navigate to="/app" replace/>}/>
      <Route path="intelligence" element={user.data?.role==='admin'?<DraftPage agent="intelligence"/>:<Navigate to="/app" replace/>}/>
      <Route path="teaching" element={user.data&&['admin','faculty'].includes(user.data.role)?<DraftPage agent="teaching"/>:<Navigate to="/app" replace/>}/>
      <Route path="settings" element={user.data?<Preferences user={user.data}/>:null}/><Route path="notifications" element={<Notifications/>}/>
      <Route path="*" element={<Navigate to="/app" replace/>}/>
    </Route><Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></MotionConfig>;
}

