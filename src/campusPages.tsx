import { useEffect, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { ArrowRight, ArrowUpRight, BookOpen, Bookmark, BriefcaseBusiness, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, FileText, Landmark, MapPin, Navigation, Plus, QrCode, SlidersHorizontal, Sparkles, Trash2, TriangleAlert, Users } from 'lucide-react';
import { Badge, Empty, Fields, Header, Markup, Modal, Panel, Problem, QueryView, SearchBox, SpeechButton, Tabs, fileData, fullDate, isoFields, localDateValue, match, roleLabels, send, shortDate, useAction, useData, type Field, type Item, type User } from './ui';
import { DraftPage, UploadDocument } from './learning';
import { CareerPractice } from './careers';

const categories=['Hackathons','Workshops','Technical events','Cultural events','Sports','Seminars','Club activities','Coding competitions'];
const eventFields=(row?:Item):Field[]=>[
  {name:'title',label:'Event title',value:row?.title},{name:'category',label:'Category',options:categories,value:row?.category},{name:'organizer',label:'Organizer',value:row?.organizer},
  {name:'room',label:'Venue',value:row?.room},{name:'startsAt',label:'Event date',type:'datetime-local',value:row?.startsAt&&localDateValue(row.startsAt)},{name:'capacity',label:'Capacity',type:'number',value:row?.capacity||30},
  {name:'status',label:'Status',options:['draft','published','cancelled'],value:row?.status||'draft'},{name:'description',label:'Description',type:'textarea',value:row?.description},
];
function EventQR({row}:{row:Item}){
  const [qr,setQr]=useState(''),[error,setError]=useState<unknown>(null);
  useEffect(()=>{
    const url=new URL('/app/events',window.location.origin);
    url.searchParams.set('event',row.id);url.searchParams.set('code',row.code);
    let active=true;
    QRCode.toDataURL(url.href,{margin:2,width:220}).then(data=>{if(active)setQr(data);}).catch(error=>{if(active)setError(error);});
    return()=>{active=false;};
  },[row.id,row.code]);
  return <details className="plan-blocks"><summary><QrCode size={16}/> Check-in QR for organizers</summary>{qr&&<img src={qr} alt={'Check-in QR code for '+row.title} width={220} height={220}/>}<p>Check-in code <code>{row.code}</code></p>{error!==null&&<Problem error={error}/>}</details>;
}
export function Events(){
  const user=useOutletContext<User>(),query=useData('/events'),action=useAction();
  const [params,setParams]=useSearchParams(),[search,setSearch]=useState(''),[category,setCategory]=useState(''),[tab,setTab]=useState('Discover'),[modal,setModal]=useState('');
  const selected=query.data?.find(row=>row.id===params.get('event'));
  const close=()=>setParams({});
  return <><Header title="Campus Events" description="Find workshops, competitions, and things to do around campus." actions={user.role==='admin'&&<button className="btn primary" onClick={()=>setModal('create')}><Plus size={18}/> Create event</button>}/>
    <div className="filter-bar"><Tabs options={['Discover','Saved','Registrations','Calendar']} value={tab} onChange={setTab}/><SearchBox value={search} onChange={setSearch} label="Search events"/><label className="pill-input"><SlidersHorizontal size={16}/><span className="sr-only">Filter by category</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="">All categories</option>{categories.map(option=><option key={option}>{option}</option>)}</select></label></div>
    <QueryView query={query}>{rows=>{
      const filtered=rows.filter(item=>match(item,search)&&(!category||item.category===category)&&(tab==='Saved'?item.saved:tab==='Registrations'?item.registration:tab==='Calendar'?item.status==='published':true)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
      if(!filtered.length)return <Panel><Empty title="No matching events"/></Panel>;
      if(tab==='Calendar')return <Panel title="Event calendar">{filtered.map(row=><button className="line-item full-row" key={row.id} onClick={()=>setParams({event:row.id})}><CalendarDays size={18}/><div className="line-content"><b>{row.title}</b><p>{fullDate(row.startsAt)} · {row.room}</p></div><ChevronRight size={17}/></button>)}</Panel>;
      return <div className="card-grid">{filtered.map((item,i)=><article className="panel event-card" key={item.id}>
        <div className={'event-art '+['violet','mint','amber','blue'][i%4]}><CalendarDays size={50}/><Badge tone="light">{item.category}</Badge><button aria-label={item.saved?'Remove saved event':'Save event'} className={'icon-btn '+(item.saved?'saved':'')} disabled={action.busy} onClick={()=>void action.run(()=>send('/events/'+item.id+'/save','POST'),item.saved?'Event removed from saved':'Event saved').catch(()=>{})}><Bookmark size={19}/></button></div>
        <div className="event-card-body"><p className="event-date">{shortDate(item.startsAt)} · {item.organizer}</p><h2>{item.title}</h2><p>{item.description}</p><div className="card-footer"><small><MapPin size={14}/> {item.room}</small><button className="text-link" onClick={()=>setParams({event:item.id})}>Details <ArrowRight size={15}/></button></div>
        {(item.registration||item.status!=='published')&&<Badge tone={item.status==='cancelled'?'amber':'mint'}>{item.status!=='published'?item.status:item.registration.checkedIn?'Attended':'Registered'}</Badge>}</div>
      </article>)}</div>;
    }}</QueryView>
    {selected&&!modal&&<Modal title={selected.title} close={close}><p>{selected.description}</p><div className="info-list"><span><CalendarDays size={17}/> {fullDate(selected.startsAt)}</span><span><MapPin size={17}/> {selected.room}</span><span><Users size={17}/> {selected.registered} / {selected.capacity} registered</span></div>
      <div className="actions">
      {selected.registration?<button className="btn neutral" disabled={action.busy||selected.registration.checkedIn} onClick={()=>void action.run(()=>send('/events/'+selected.id+'/registration','DELETE'),'Registration cancelled').catch(()=>{})}>Cancel registration</button>:
        <button className="btn primary" disabled={action.busy||selected.status!=='published'||selected.registered>=selected.capacity||+new Date(selected.startsAt)<=Date.now()} onClick={()=>void action.run(()=>send('/events/'+selected.id+'/registration','POST'),'Registration confirmed').catch(()=>{})}>Register for event</button>}
      {user.role==='admin'&&<button className="btn neutral" onClick={()=>setModal('edit')}>Edit event</button>}
      </div>
      {selected.code&&<EventQR row={selected}/>}
      {selected.registration&&!selected.registration.checkedIn&&selected.status==='published'&&<div className="spaced"><Fields fields={[{name:'code',label:'Event check-in code',value:params.get('code')||''}]} label="Check in" submit={values=>action.run(()=>send('/events/'+selected.id+'/check-in','POST',values),'Attendance recorded')}/></div>}
      {action.error!==null&&<Problem error={action.error}/>}
    </Modal>}
    {modal&&<Modal title={modal==='edit'?'Edit event':'Create an event'} close={()=>setModal('')}><Fields fields={eventFields(modal==='edit'?selected:undefined)} label="Save event" submit={async values=>{
      await action.run(()=>send('/events'+(modal==='edit'?'/'+selected!.id:''),modal==='edit'?'PATCH':'POST',isoFields(values,'startsAt')),'Event saved');setModal('');
    }}/></Modal>}
    {action.feedback}
  </>;
}
const bookFields:Field[]=[{name:'title',label:'Book title'},{name:'author',label:'Author'},{name:'category',label:'Category'},{name:'copies',label:'Copies',type:'number',value:2},{name:'description',label:'Description',type:'textarea',optional:true}];
export function Library(){
  const user=useOutletContext<User>(),cache=useQueryClient(),action=useAction();
  const [tab,setTab]=useState('Catalog'),[search,setSearch]=useState(''),[modal,setModal]=useState(''),[selected,setSelected]=useState<Item>();
  const books=useData('/library'),activity=useData<{loans:Item[];reservations:Item[]}>('/library/activity'),docs=useData('/documents');
  const staff=['admin','librarian'].includes(user.role);
  return <><Header title="Digital Library" description="Find your next book, manage loans, and learn from PDF materials." actions={<>
    {staff&&<button className="btn neutral" onClick={()=>setModal('book')}><Plus size={17}/> Add book</button>}
    <button className="btn primary" onClick={()=>setModal('upload')}><Plus size={17}/> Upload PDF</button></>}/>
    <div className="filter-bar"><Tabs options={['Catalog','Loans & holds','PDF materials']} value={tab} onChange={setTab}/>{tab!=='Loans & holds'&&<SearchBox value={search} onChange={setSearch} label={tab==='Catalog'?'Search books':'Search documents'}/>}
      {tab==='Catalog'&&<Link className="btn neutral" to={'/app/assistant?q='+encodeURIComponent(search?'Find available books about '+search:'Find available Python books')}><Sparkles size={16}/> Ask about books</Link>}</div>
    {tab==='Catalog'&&<QueryView query={books}>{rows=>{
      const filtered=rows.filter(row=>match(row,search));
      return filtered.length?<div className="card-grid">{filtered.map((row,i)=><article className="panel book-card" key={row.id}>
        <div className={'book-cover '+['violet','mint','blue','amber'][i%4]}><BookOpen size={28}/></div><div className="line-content"><Badge tone="soft">{row.category}</Badge><h2>{row.title}</h2><p>{row.author}</p><small>{row.description}</small></div>
        <div className="card-footer"><Badge tone={row.available?'mint':'amber'}>{row.available?'Available · '+row.available:'All copies held'}</Badge>
          <button className="text-link" onClick={()=>{setSelected(row);setModal('details');}}>Details <ArrowRight size={15}/></button></div>
      </article>)}</div>:<Panel><Empty title="No matching books" detail="Try a title, author or subject."/></Panel>;
    }}</QueryView>}
    {tab==='Loans & holds'&&<QueryView query={activity}>{rows=><div className="two-columns"><Panel title={staff?'Campus loans':'My loans'}>{rows.loans.length?rows.loans.map(row=><div className="line-item" key={row.id}><div className="line-content"><b>{row.title}</b><p>{row.status==='returned'?'Returned':(+new Date(row.dueAt)<Date.now()?'Overdue · ':'Due ')+fullDate(row.dueAt)}{staff?' · '+row.owner:''}</p></div>
      {staff&&row.status==='issued'&&<button className="btn neutral small" disabled={action.busy} onClick={()=>void action.run(()=>send('/library/loans/'+row.id+'/return','POST'),'Book returned').catch(()=>{})}>Record return</button>}</div>):<Empty title="No loans"/>}</Panel>
      <Panel title={staff?'Campus holds':'My holds'}>{rows.reservations.length?rows.reservations.map(row=><div className="line-item" key={row.id}><div className="line-content"><b>{row.title}</b><p>{staff?row.owner+' · ':''}Held since {shortDate(row.createdAt)}</p></div>{staff?<button className="btn neutral small" disabled={action.busy} onClick={()=>void action.run(()=>send('/library/'+row.bookId+'/issue','POST',{userId:row.owner}),'Book issued').catch(()=>{})}>Issue book</button>:<button className="btn neutral small" disabled={action.busy} onClick={()=>void action.run(()=>send('/library/'+row.bookId+'/reservation','DELETE'),'Hold cancelled').catch(()=>{})}>Cancel hold</button>}</div>):<Empty title="No active holds"/>}</Panel></div>}</QueryView>}
    {tab==='PDF materials'&&<Panel title="Study materials"><QueryView query={docs}>{rows=>{
      const filtered=rows.filter(row=>row.kind==='material'&&match(row,search));
      return filtered.length?filtered.map(row=><div className="line-item" key={row.id}><span className="tile-icon violet"><FileText size={18}/></span><div className="line-content"><b>{row.title}</b><p>{row.pages} pages · {row.visibility}</p></div><div className="actions"><a className="btn neutral small" href={'/api/documents/'+row.id+'/file'} rel="noreferrer" target="_blank">Read PDF <ArrowUpRight size={15}/></a><Link className="btn neutral small" to={'/app/assistant?document='+row.id}><Sparkles size={15}/> Ask PDF</Link>
        {row.owner===user.id&&<button className="icon-btn" aria-label={'Delete '+row.title} onClick={()=>{setSelected(row);setModal('delete');}}><Trash2 size={17}/></button>}</div></div>):<Empty title="No matching PDFs" detail="Upload a PDF to read it or ask a question about it."/>;
    }}</QueryView></Panel>}
    {modal==='details'&&selected&&<Modal title={selected.title} close={()=>setModal('')}><p>{selected.author} · {selected.category}</p><p>{selected.description}</p><div className="actions"><button className="btn primary" disabled={action.busy||(!selected.reserved&&!selected.available)} onClick={()=>void action.run(()=>send('/library/'+selected.id+'/reservation',selected.reserved?'DELETE':'POST'),selected.reserved?'Hold cancelled':'Book reserved').then(()=>setModal('')).catch(()=>{})}>{selected.reserved?'Cancel reservation':'Reserve a copy'}</button>{staff&&<button className="btn neutral" onClick={()=>setModal('issue')}>Issue a copy</button>}</div>{action.error!==null&&<Problem error={action.error}/>}</Modal>}
    {modal==='upload'&&<Modal title="Upload PDF material" close={()=>setModal('')}><UploadDocument publish={staff||user.role==='faculty'} onUpload={()=>{setModal('');setTab('PDF materials');void cache.invalidateQueries({queryKey:['/documents']});}}/></Modal>}
    {modal==='book'&&<Modal title="Add a catalog book" close={()=>setModal('')}><Fields fields={bookFields} submit={async values=>{await action.run(()=>send('/library','POST',values),'Book added');setModal('');}}/></Modal>}
    {modal==='issue'&&selected&&<Modal title={'Issue '+selected.title} close={()=>setModal('')}><Fields fields={[{name:'userId',label:'Borrower account ID'}]} label="Issue book" submit={async values=>{await action.run(()=>send('/library/'+selected.id+'/issue','POST',values),'Book issued');setModal('');}}/></Modal>}
    {modal==='delete'&&selected&&<Modal title={'Delete '+selected.title+'?'} close={()=>setModal('')}><button className="btn danger" disabled={action.busy} onClick={()=>void action.run(()=>send('/documents/'+selected.id,'DELETE'),'Document deleted').then(()=>setModal('')).catch(()=>{})}>Delete PDF</button></Modal>}
    {action.feedback}
  </>;
}
const statuses=['submitted','ai_analyzed','assigned','in_progress','escalated','resolved'];
const prettyStatus=(state:string)=>state.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
export function Complaints(){
  const user=useOutletContext<User>(),query=useData('/complaints'),dept=useData('/departments'),action=useAction();
  const [id,setId]=useState(''),[modal,setModal]=useState(''),[search,setSearch]=useState(''),[status,setStatus]=useState('');
  const [description,setDescription]=useState(''),[language,setLanguage]=useState('English'),[image,setImage]=useState(''),[voice,setVoice]=useState(false);
  const [analysis,setAnalysis]=useState<any>(),[error,setError]=useState<unknown>(null),[loading,setLoading]=useState(false);
  const selected=query.data?.find(row=>row.id===id);
  const title=user.role==='admin'?'Campus Complaints':'My Complaints';
  async function preview(){setLoading(true);setError(null);try{setAnalysis(await send('/complaints/preview','POST',{description,image}));}catch(error){setError(error);}finally{setLoading(false);}}
  return <><Header title={title} description="Report a campus issue, follow its progress, and contact the responsible team." actions={<button className="btn primary" onClick={()=>{setDescription('');setImage('');setAnalysis(null);setError(null);setVoice(false);setModal('new');}}><Plus size={18}/> Report an issue</button>}/>
    <div className="filter-bar"><SearchBox value={search} onChange={setSearch} label="Search complaints"/><label className="pill-input"><span className="sr-only">Filter status</span><select value={status} onChange={event=>setStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(option=><option key={option} value={option}>{prettyStatus(option)}</option>)}</select></label></div>
    <Panel title="Complaint tickets"><QueryView query={query}>{rows=>{
      const filtered=rows.filter(row=>match(row,search)&&(!status||row.status===status));
      return filtered.length?filtered.map(row=><button className="line-item full-row" key={row.id} onClick={()=>{setId(row.id);setModal('detail');}}><span className={'tile-icon '+(row.priority==='critical'?'amber':'violet')}><TriangleAlert size={18}/></span><div className="line-content"><b>{row.title}</b><p>{row.id} · {dept.data?.find(item=>item.id===row.department)?.title||row.department}</p></div><Badge tone={row.status==='resolved'?'mint':row.priority==='critical'?'amber':'soft'}>{prettyStatus(row.status)}</Badge><ChevronRight size={16}/></button>):<Empty title="No matching tickets"/>;
    }}</QueryView></Panel>
    {modal==='new'&&<Modal title="Report a campus issue" close={()=>setModal('')}><Fields fields={[{name:'title',label:'Title (optional)',optional:true},{name:'locationDetails',label:'Campus location',optional:true}]} label="Submit complaint" submit={async values=>{
      await action.run(()=>send('/complaints','POST',{...values,description,image,inputMode:image?'multimodal':voice?'voice':'text'}),'Complaint submitted');setModal('');
    }}>
      <div className="stack"><label className="field"><span>Describe the issue</span><textarea required value={description} onChange={event=>{setDescription(event.target.value);setAnalysis(null);}} rows={4}/></label>
        <div className="actions"><label className="pill-input"><span className="sr-only">Speech language</span><select value={language} onChange={event=>setLanguage(event.target.value)}><option>English</option><option>Hindi</option></select></label><SpeechButton language={language} onText={text=>{setDescription(old=>old?old+' '+text:text);setVoice(true);setAnalysis(null);}} onError={setError}/>
        <label className="field"><span>Photo (optional)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async event=>{try{const file=event.target.files?.[0];setImage(file?await fileData(file):'');setAnalysis(null);}catch(error){setError(error);}}}/></label></div>
        <button className="btn neutral" type="button" disabled={!description.trim()||loading} onClick={()=>void preview()}><Sparkles size={16}/>{loading?'Reviewing…':'Preview classification'}</button>
        {error!==null&&<Problem error={error}/>}
        {analysis&&<div className="preview-box"><Badge tone={analysis.isLiveAi?'mint':'amber'}>{analysis.isLiveAi?'AI recommendation':'Rule-based suggestion'}</Badge><h3>{analysis.category} · {analysis.priority}</h3><p>{analysis.summary}</p><small>{analysis.recommendedAction}</small></div>}
      </div>
    </Fields></Modal>}
    {modal==='detail'&&selected&&<Modal title={selected.title} close={()=>setModal('')}><div className="actions"><Badge>{selected.id}</Badge><Badge tone={selected.status==='resolved'?'mint':'soft'}>{prettyStatus(selected.status)}</Badge><Badge tone="amber">{selected.priority}</Badge></div>
      <p className="preserve">{selected.originalDescription}</p>{selected.locationDetails&&<p><MapPin size={15}/> {selected.locationDetails}</p>}
      {typeof selected.imageUrl==='string'&&selected.imageUrl.startsWith('data:image/')&&<img className="complaint-image" src={selected.imageUrl} alt="Submitted complaint evidence"/>}
      <h3>Ticket timeline</h3><ol className="timeline">{selected.timeline?.map((item:any)=><li key={item.id}><b>{item.title}</b><p>{item.description}</p><small>{fullDate(item.timestamp)}</small></li>)}</ol>
      {user.role==='admin'&&<Fields key={selected.updatedAt} fields={[{name:'status',label:'Status',options:statuses,value:selected.status},{name:'department',label:'Department',options:dept.data?.map(row=>({value:row.id,label:row.title}))||[],value:selected.department},{name:'priority',label:'Priority',options:['low','medium','high','critical'],value:selected.priority},{name:'assignedTo',label:'Assigned staff',optional:true,value:selected.assignedTo},{name:'reply',label:'Response (optional)',type:'textarea',optional:true}]} label="Update ticket" submit={values=>action.run(()=>send('/complaints/'+selected.id,'PATCH',values),'Ticket updated')}/>}
      {user.id===selected.owner&&selected.status==='resolved'&&(selected.rating?<Badge tone="mint">Resolution confirmed · {selected.rating}/5</Badge>:<Fields fields={[{name:'rating',label:'Resolution rating',options:['1','2','3','4','5']},{name:'feedback',label:'Feedback',type:'textarea',optional:true}]} label="Confirm resolution" submit={values=>action.run(()=>send('/complaints/'+selected.id+'/feedback','POST',values),'Feedback sent')}/>)}
    </Modal>}{action.feedback}
  </>;
}
export function MapPage(){
  const user=useOutletContext<User>(),data=useData<{buildings:Item[];edges:Item[];sample:boolean}>('/navigation'),action=useAction();
  const [search,setSearch]=useState(''),[current,setCurrent]=useState(''),[floor,setFloor]=useState(''),[route,setRoute]=useState<{path:string[];distance:number}>(),[error,setError]=useState<unknown>(null),[modal,setModal]=useState('');
  const nodes=data.data?.buildings||[],edges=data.data?.edges||[];
  const selected=nodes.find(node=>node.id===current);
  const options=nodes.map(node=>({value:node.id,label:node.title}));
  return <><Header title="Campus Map" description="Find a building, explore its rooms, or plan an accessible walking route."
    actions={<>{data.data?.sample&&<Badge tone="amber">Sample campus map</Badge>}{user.role==='admin'&&<><button className="btn neutral" onClick={()=>setModal('building')}><Plus size={17}/> Add building</button><button className="btn neutral" onClick={()=>setModal('edge')}>Edit path</button></>}</>}/>
    <QueryView query={data}>{value=><div className="map-layout"><Panel title="Apex Institute" subtitle={value.sample?'Illustrative campus layout':'Campus walking network'}>
      <svg className="campus-map" role="img" aria-label="Campus buildings and walking paths" viewBox="0 0 470 350">
        <rect x="0" y="0" width="470" height="350" rx="16" fill="var(--map-base)"/>
        <rect x="185" y="130" width="95" height="60" rx="24" fill="var(--map-green)"/><rect x="320" y="235" width="45" height="60" rx="20" fill="var(--map-green)"/>
        {edges.map(edge=>{const from=nodes.find(node=>node.id===edge.from),to=nodes.find(node=>node.id===edge.to);return from&&to?<line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--map-path)" strokeWidth="11" strokeLinecap="round"/>:null;})}
        {route&&<polyline fill="none" stroke="#6456ec" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" points={route.path.map(id=>{const node=nodes.find(row=>row.id===id)!;return node.x+','+node.y;}).join(' ')}/>}
        {nodes.map(node=><g key={node.id}><circle cx={node.x} cy={node.y} r={current===node.id?11:8} fill={current===node.id?'#6456ec':'var(--map-node)'} stroke="var(--panel)" strokeWidth="3"/><text x={node.x} y={node.y-13} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text)">{node.title}</text></g>)}
      </svg>
      {route&&<div className="route-summary"><Badge tone="mint">{route.distance} m</Badge><span>{route.path.map(id=>nodes.find(node=>node.id===id)?.title).join(' → ')}</span></div>}
      </Panel><div className="stack"><Panel title="Walking directions"><Fields key={'route:'+nodes.length} fields={[{name:'from',label:'From',options,value:nodes.find(node=>node.id==='gate')?.id},{name:'to',label:'To',options},{name:'accessible',label:'Step-free route',type:'checkbox'}]} label="Find route" submit={async values=>{
        setError(null);setRoute(undefined);
        const response=await fetch('/api/navigation/route?'+new URLSearchParams({from:values.from,to:values.to,accessible:String(values.accessible)}));const result=await response.json();
        if(!response.ok){setError(result.message);return;}setRoute(result);setCurrent(values.to);
      }}/>{error!==null&&<Problem error={error}/>}</Panel>
      <Panel title="Find a location"><SearchBox value={search} onChange={setSearch} label="Search buildings and rooms"/>
        <div className="location-list">{nodes.filter(node=>match({...node,description:node.description+' '+(node.rooms||[]).join(' ')},search)).map(node=><button className={'list-button '+(node.id===current?'selected':'')} key={node.id} onClick={()=>{setCurrent(node.id);setFloor('');}}><MapPin size={16}/>{node.title}<ChevronRight size={15}/></button>)}</div>
      </Panel></div></div>}</QueryView>
    {selected&&<Panel className="spaced" title={selected.title} subtitle={selected.description} action={user.role==='admin'&&<button className="btn neutral small" onClick={()=>setModal('edit')}>Edit building</button>}>
      <label className="field"><span>Floor</span><select value={floor} onChange={event=>setFloor(event.target.value)}><option value="">All floors</option>{selected.floor.split('·').map((option:string)=><option key={option.trim()}>{option.trim()}</option>)}</select></label>
      <p className="muted">{floor?'Selected floor: '+floor+'. ':''}{selected.rooms?.length?selected.rooms.join(' · '):'No individual rooms are listed.'}</p>
      <Link className="text-link" to={'/app/assistant?q='+encodeURIComponent('Where is '+selected.title+'?')}><Sparkles size={16}/> Ask the campus assistant</Link>
    </Panel>}
    {(modal==='building'||modal==='edit')&&<Modal title={modal==='edit'?'Edit campus building':'Add campus building'} close={()=>setModal('')}><Fields fields={([
      {name:'title',label:'Building name'},{name:'description',label:'Description',type:'textarea'},{name:'x',label:'Map X (10–450)',type:'number'},{name:'y',label:'Map Y (10–330)',type:'number'},
      {name:'floor',label:'Floors, separated by ·'},{name:'rooms',label:'Rooms, separated by commas',optional:true},
    ] as Field[]).map(field=>({...field,value:modal==='edit'?(field.name==='rooms'?selected?.rooms?.join(', '):selected?.[field.name]):undefined}))} submit={async values=>{await action.run(()=>send('/navigation/buildings','POST',{...values,id:modal==='edit'?selected?.id:undefined}),'Map updated');setRoute(undefined);setModal('');}}/></Modal>}
    {modal==='edge'&&<Modal title="Add or update a walking path" close={()=>setModal('')}><Fields fields={[{name:'from',label:'From',options},{name:'to',label:'To',options},{name:'distance',label:'Distance (metres)',type:'number'},{name:'accessible',label:'Step-free',type:'checkbox'}]} submit={async values=>{await action.run(()=>send('/navigation/edges','POST',values),'Path saved');setRoute(undefined);setModal('');}}/></Modal>}{action.feedback}
  </>;
}
export function Placements(){
  const user=useOutletContext<User>(),jobs=useData('/placements'),applications=useData('/applications'),interviews=useData('/interviews'),action=useAction();
  const [tab,setTab]=useState('Opportunities'),[q,setQ]=useState(''),[modal,setModal]=useState(''),[selected,setSelected]=useState<Item>();
  return <><Header title="Placement Coach" description="Explore opportunities, track applications, and prepare for interviews." actions={<><Link to="/app/practice" className="btn neutral">Aptitude & coding practice <ArrowRight size={16}/></Link>{['admin','placement'].includes(user.role)&&<button className="btn primary" onClick={()=>setModal('new')}><Plus size={17}/> Post opportunity</button>}</>}/>
    <div className="filter-bar"><Tabs options={['Opportunities','Application tracker','Prepare','Interview history']} value={tab} onChange={setTab}/>{tab==='Opportunities'&&<SearchBox value={q} onChange={setQ} label="Search opportunities"/>}</div>
    {tab==='Prepare'&&<><CareerPractice/><div className="spaced"><DraftPage agent="placement" embedded/></div></>}
    {tab==='Opportunities'&&<QueryView query={jobs}>{rows=>{
      const filtered=rows.filter(row=>match(row,q));
      return filtered.length?<div className="card-grid">{filtered.map(row=><Panel key={row.id} className="job-card"><span className="tile-icon mint"><BriefcaseBusiness size={21}/></span><h2>{row.title}</h2><p>{row.company} · {row.location}</p><p>{row.description}</p><div className="card-footer"><Badge tone="soft">{shortDate(row.dueAt)}</Badge><button className="text-link" onClick={()=>{setSelected(row);setModal('job');}}>View role <ArrowRight size={15}/></button></div></Panel>)}</div>:<Panel><Empty title="No matching opportunities"/></Panel>;
    }}</QueryView>}
    {tab==='Application tracker'&&<Panel title="My applications"><QueryView query={applications}>{rows=>rows.length?rows.map(row=><div className="line-item" key={row.id}><div className="line-content"><b>{row.title}</b></div><label className="pill-input"><span className="sr-only">Application status for {row.title}</span><select value={row.status} disabled={action.busy} onChange={event=>void action.run(()=>send('/applications/'+row.id,'PATCH',{status:event.target.value}),'Application updated').catch(()=>{})}>{['Planned','Applied','Interviewing','Offer','Declined','Withdrawn'].map(option=><option key={option}>{option}</option>)}</select></label></div>):<Empty title="No tracked applications"/>}</QueryView></Panel>}
    {tab==='Interview history'&&<div className="two-columns"><CareerPractice history/><Panel title="Saved interview preparation"><QueryView query={interviews}>{rows=>rows.length?rows.map(row=><details className="plan-blocks" key={row.id}><summary>{row.title}</summary><Markup>{row.content}</Markup></details>):<Empty title="No saved drafts"/>}</QueryView></Panel></div>}
    {modal==='job'&&selected&&<Modal title={selected.title} close={()=>setModal('')}><p>{selected.company} · {selected.location}</p><Markup>{selected.description}</Markup><p>Apply by {fullDate(selected.dueAt)}</p><button className="btn primary" disabled={action.busy||applications.data?.some(row=>row.linked===selected.id)||+new Date(selected.dueAt)<=Date.now()} onClick={()=>void action.run(()=>send('/applications','POST',{title:selected.title,linked:selected.id}),'Opportunity tracked').then(()=>setModal('')).catch(()=>{})}>{applications.data?.some(row=>row.linked===selected.id)?'Already tracking':'Track application'}</button></Modal>}
    {modal==='new'&&<Modal title="Post a placement opportunity" close={()=>setModal('')}><Fields fields={[{name:'title',label:'Job title'},{name:'company',label:'Company'},{name:'location',label:'Location'},{name:'dueAt',label:'Deadline',type:'datetime-local'},{name:'description',label:'Job description',type:'textarea'}]} label="Publish opportunity" submit={async values=>{await action.run(()=>send('/placements','POST',isoFields(values,'dueAt')),'Opportunity published');setModal('');}}/></Modal>}{action.feedback}
  </>;
}
export function AdminDirectory(){
  const user=useOutletContext<User>(),action=useAction();
  const [tab,setTab]=useState('Accounts'),[q,setQ]=useState(''),[role,setRole]=useState(''),[page,setPage]=useState(1),[modal,setModal]=useState(''),[selected,setSelected]=useState<Item>(),[reset,setReset]=useState('');
  const query=useData<{items:Item[];total:number;page:number}>('/admin/accounts?'+new URLSearchParams({q,role,page:String(page)}));
  const departments=useData('/departments'),audit=useData('/admin/audit'),ai=useData<{mode:string;model:string}>('/ai/status');
  return <><Header title="Campus Directory" description="Manage campus accounts, departments, and audit history." actions={tab==='Departments'&&<button className="btn primary" onClick={()=>setModal('department')}><Plus size={17}/> Add department</button>}/>
    <div className="filter-bar"><Tabs options={['Accounts','Departments','Audit log','AI configuration']} value={tab} onChange={setTab}/>{tab==='Accounts'&&<><SearchBox value={q} onChange={value=>{setQ(value);setPage(1);}} label="Find campus accounts"/><label className="pill-input"><span className="sr-only">Filter account role</span><select value={role} onChange={event=>{setRole(event.target.value);setPage(1);}}><option value="">All roles</option>{Object.entries(roleLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label></>}</div>
    {tab==='Accounts'&&<Panel title="Campus accounts"><QueryView query={query}>{data=><>{data.items.length?data.items.map(row=><div className="line-item" key={row.id}><span className="tile-icon violet"><Users size={17}/></span><div className="line-content"><b>{row.name}</b><p>{row.email} · {row.id}</p></div><Badge tone="soft">{roleLabels[row.role as User['role']]}</Badge>{row.id!==user.id&&<button className="btn neutral small" onClick={()=>{setSelected(row);setReset('');setModal('account');}}>Manage</button>}</div>):<Empty title="No matching accounts"/>}
      <div className="card-footer"><span>Page {page} · {data.total} accounts</span><div className="actions"><button className="icon-btn" aria-label="Previous page" disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={18}/></button><button className="icon-btn" aria-label="Next page" disabled={page*20>=data.total} onClick={()=>setPage(page+1)}><ChevronRight size={18}/></button></div></div></>}</QueryView></Panel>}
    {tab==='Departments'&&<Panel title="Departments"><QueryView query={departments}>{rows=>rows.length?rows.map(row=><div className="line-item" key={row.id}><span className="tile-icon blue"><Landmark size={18}/></span><div className="line-content"><b>{row.title}</b><p>{row.description}</p></div></div>):<Empty title="No departments"/>}</QueryView></Panel>}
    {tab==='Audit log'&&<Panel title="Recent administrative activity"><QueryView query={audit}>{rows=>rows.length?rows.slice(0,100).map(row=><div className="line-item" key={row.id}><div className="line-content"><b>{row.action}</b><p>{row.owner} · {row.subject} · {fullDate(row.createdAt)}</p></div></div>):<Empty title="No audit entries yet"/>}</QueryView></Panel>}
    {tab==='AI configuration'&&<Panel title="Provider status"><QueryView query={ai}>{config=><><Badge tone={config.mode==='live'?'mint':'amber'}>{config.mode==='live'?'Live provider configured':'Local demo'}</Badge><p>{config.model||'Configure the provider and model through server environment variables.'}</p></>}</QueryView></Panel>}
    {modal==='department'&&<Modal title="Add a department" close={()=>setModal('')}><Fields fields={[{name:'title',label:'Department name'},{name:'description',label:'Description',type:'textarea',optional:true}]} submit={async values=>{await action.run(()=>send('/departments','POST',values),'Department added');setModal('');}}/></Modal>}
    {modal==='account'&&selected&&<Modal title={'Manage '+selected.name} close={()=>setModal('')}>
      <Fields fields={[{name:'role',label:'Role',value:selected.role,options:Object.entries(roleLabels).map(([value,label])=>({value,label}))},...['department','section','semester','academicYear','enrollment'].map(name=>({name,label:({academicYear:'Academic year',enrollment:'Enrollment number'} as Record<string,string>)[name]||name[0].toUpperCase()+name.slice(1),optional:true,value:selected[name]}))]} label="Update account" submit={async values=>{await action.run(()=>send('/admin/users/'+selected.id,'PATCH',values),'Account updated');setModal('');}}/>
      <button className="btn neutral spaced" disabled={action.busy} onClick={()=>void action.run(()=>send('/admin/users/'+selected.id+'/reset','POST'),'Reset link issued').then(data=>setReset(window.location.origin+'/reset-password?token='+encodeURIComponent(data.resetToken))).catch(()=>{})}>Issue one-time password reset</button>
      {reset&&<label className="field"><span>Reset link to share after verifying identity</span><input value={reset} readOnly/></label>}
    </Modal>}{action.feedback}
  </>;
}

