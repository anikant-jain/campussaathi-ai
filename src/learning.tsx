import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bookmark, Check, ChevronRight, Clock3, Copy, FileText, LibraryBig, MessageSquare, Pencil, Plus, RotateCcw, Sparkles, SquarePen, Timer, Trash2, Volume2, Zap } from 'lucide-react';
import { Badge, Empty, Fields, Header, Markup, Modal, Panel, Problem, QueryView, SpeechButton, Tabs, fileData, fullDate, localDateValue, msg, send, useAction, useData, type Field, type Item } from './ui';

const prompts=['What is my next lecture?','What is my attendance?','Which events are coming up?','Find available Python books'];
const tutorPrompts=['Explain binary search step by step','Generate five practice questions on graphs','Make flashcards from my notes','Explain database normalization in simple terms'];
export function UploadDocument({kind='material',publish=false,onUpload}:{kind?:string;publish?:boolean;onUpload:(row:Item)=>void}){
  const [error,setError]=useState<unknown>(null),[busy,setBusy]=useState(false);
  return <form className="form" onSubmit={async event=>{
    event.preventDefault();setBusy(true);setError(null);
    const data=new FormData(event.currentTarget);data.set('kind',kind);
    try{onUpload(await send('/documents','POST',data));}catch(error){setError(error);}finally{setBusy(false);}
  }}>
    <label className="field wide"><span>PDF file</span><input type="file" name="file" accept="application/pdf,.pdf" required/><small>Text-based PDF, up to 5 MB and 100 pages.</small></label>
    {publish&&<><label className="field"><span>Visibility</span><select name="visibility" defaultValue="private"><option value="private">Private</option><option value="campus">Campus-wide</option></select></label><label className="check-field"><input type="checkbox" name="index" value="true"/> Use configured embeddings if publishing</label></>}
    {error!==null&&<Problem error={error}/>}
    <div className="wide"><button className="btn primary" disabled={busy}>{busy?'Reading PDF…':'Upload PDF'}</button></div>
  </form>;
}
export function ChatPage({tutor=false}:{tutor?:boolean}){
  const [params]=useSearchParams(),loc=useLocation(),cache=useQueryClient();
  const conversations=useData('/ai/conversations');
  const status=useData<{mode:string;provider:string|null;model:string|null}>('/ai/status');
  const docs=useData('/documents');
  const [id,setId]=useState('');
  const history=useData('/ai/conversations/'+id+'/messages',!!id);
  const [draft,setDraft]=useState(params.get('q')||'');
  const [documentId,setDocument]=useState(params.get('document')||'');
  const [image,setImage]=useState('');
  const [language,setLanguage]=useState('English'),[mode,setMode]=useState('Step-by-step');
  const [running,setRunning]=useState(false),[partial,setPartial]=useState(''),[optimistic,setOptimistic]=useState('');
  const [error,setError]=useState<unknown>(null),[modal,setModal]=useState(''),[copied,setCopied]=useState('');
  const action=useAction();
  const tail=useRef<HTMLDivElement>(null);
  const controller=useRef<AbortController>();
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{if(params.get('q'))setDraft(params.get('q')!);if(params.get('document'))setDocument(params.get('document')!);},[loc.search]);
  useEffect(()=>{if(partial||optimistic)tail.current?.scrollIntoView({block:'nearest'});},[partial,optimistic]);
  const current=conversations.data?.find(row=>row.id===id);
  async function ask(event?:FormEvent,regenerate=false){
    event?.preventDefault();
    if(running||(!regenerate&&!draft.trim()))return;
    const text=draft.trim();
    setRunning(true);setError(null);setPartial('');setOptimistic(regenerate?'':text);
    const abort=new AbortController();controller.current=abort;
    try {
      let key=id;
      if(!key){const row=await send<Item>('/ai/conversations','POST',{});key=row.id;setId(key);}
      const response=await fetch('/api/ai/conversations/'+key+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:text,regenerate,documentId,image,language,mode,agent:tutor?'tutor':documentId?'library':undefined}),signal:abort.signal});
      if(!response.ok)throw new Error((await response.json()).message||'Could not send your message.');
      const reader=response.body?.getReader();
      if(!reader)throw new Error('No response stream.');
      const decoder=new TextDecoder();let pending='',done=false;
      for(;;){
        const chunk=await reader.read();
        if(chunk.done)break;
        pending+=decoder.decode(chunk.value,{stream:true});
        const frames=pending.split('\n\n');pending=frames.pop()||'';
        for(const frame of frames){
          if(!frame.startsWith('data: '))continue;
          const payload=JSON.parse(frame.slice(6));
          if(payload.error)throw new Error(payload.error);
          if(payload.delta)setPartial(value=>value+payload.delta);
          if(payload.done)done=true;
        }
      }
      if(!done)throw new Error('The response ended before it was saved.');
      if(!regenerate){setDraft('');setImage('');}
      await Promise.all([cache.invalidateQueries({queryKey:['/ai/conversations']}),cache.invalidateQueries({queryKey:['/ai/conversations/'+key+'/messages']})]);
    }catch(error){if(!abort.signal.aborted)setError(error);}
    finally{setRunning(false);setPartial('');setOptimistic('');}
  }
  return <><Header title={tutor?'AI Doubt Solver':'Campus Assistant'} description={tutor?'Work through questions, notes, and practice problems at your own pace.':'Ask about classes, events, books, and campus services.'}
    actions={<>{tutor&&<Link to="/app/practice" className="btn neutral">Quizzes & flashcards <ArrowRight size={16}/></Link>}<Badge tone={status.data?.mode==='live'?'mint':'amber'}><Sparkles size={14}/>{status.data?.mode==='live'?'Live AI configured':status.isPending?'Checking AI…':'Local demo · campus lookup'}</Badge></>}/>
    <div className="chat-layout"><Panel className="chat-history" title="Conversations" action={<button className="icon-btn" aria-label="New conversation" disabled={running} onClick={()=>{setId('');setDraft('');setDocument('');setImage('');setError(null);}}><SquarePen size={18}/></button>}>
      <QueryView query={conversations}>{items=>items.length?<div className="history-list">{items.map(item=><button className={item.id===id?'active':''} disabled={running} key={item.id} onClick={()=>{setId(item.id);setError(null);setDraft('');setDocument('');setImage('');}}><MessageSquare size={16}/><span>{item.title}</span></button>)}</div>:<Empty title="No conversations yet"/>}</QueryView>
    </Panel>
    <Panel className="chat-panel">
      {current&&<div className="chat-toolbar"><b>{current.title}</b><button className="icon-btn" disabled={running} aria-label="Rename conversation" onClick={()=>setModal('rename')}><Pencil size={16}/></button><button className="icon-btn" disabled={running} aria-label="Delete conversation" onClick={()=>setModal('delete')}><Trash2 size={17}/></button></div>}
      <div className="chat-scroll" aria-live={running?'off':'polite'}>
        {!id&&!optimistic&&<div className="chat-welcome"><span className="tile-icon violet"><Sparkles size={25}/></span><h2>{tutor?'What are you working on?':'How can I help today?'}</h2><div className="prompt-grid">{(tutor?tutorPrompts:prompts).map(prompt=><button className="btn neutral" key={prompt} onClick={()=>setDraft(prompt)}>{prompt} <ChevronRight size={15}/></button>)}</div></div>}
        {id&&<QueryView query={history}>{items=>items.map(item=><article key={item.id} className={'message '+item.role}>
          <div className="message-author">{item.role==='user'?'You':<><Sparkles size={15}/> CampusSaathi {item.mode==='demo'&&<Badge tone="amber">Database demo</Badge>}</>}</div>
          {item.role==='user'?<p className="preserve">{item.content}</p>:<Markup>{item.content}</Markup>}
          {item.sources?.length>0&&<div className="sources">{item.sources.map((source:any)=><a key={source.id} href={'/api/documents/'+source.documentId+'/file#page='+source.page} target="_blank" rel="noreferrer">[{source.id}] {source.title} · p. {source.page}</a>)}</div>}
          {item.role==='assistant'&&<div className="message-actions">
            <button className="icon-btn" aria-label="Copy answer" onClick={async()=>{try{await navigator.clipboard.writeText(item.content);setCopied(item.id);}catch(error){setError(error);}}}>{copied===item.id?<Check size={16}/>:<Copy size={16}/>}</button>
            {'speechSynthesis'in window&&<button className="icon-btn" aria-label="Read answer aloud" onClick={()=>{speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(item.content);voice.lang=language==='Hindi'?'hi-IN':'en-IN';speechSynthesis.speak(voice);}}><Volume2 size={17}/></button>}
            <button className="icon-btn" aria-label="Bookmark answer" onClick={()=>void action.run(()=>send('/bookmarks','POST',{title:current?.title||'Assistant answer',content:item.content}),'Answer bookmarked').catch(()=>{})}><Bookmark size={16}/></button>
            {item.id===items.at(-1)?.id&&<button className="icon-btn" aria-label="Regenerate answer" disabled={running} onClick={()=>void ask(undefined,true)}><RotateCcw size={16}/></button>}
          </div>}
        </article>)}</QueryView>}
        {optimistic&&<article className="message user"><div className="message-author">You</div><p>{optimistic}</p></article>}
        {running&&<article className="message assistant"><div className="message-author"><Sparkles size={15}/> CampusSaathi</div>{partial?<Markup>{partial}</Markup>:<p role="status">Looking that up…</p>}</article>}
        <div ref={tail}/>
      </div>
      {error!==null&&<Problem error={error}/>}
      <form onSubmit={ask} className="composer" aria-busy={running}>
        <label className="sr-only" htmlFor="chat-message">Message</label><textarea id="chat-message" placeholder={tutor?'Enter your academic question…':'Ask anything about your campus…'} value={draft} onChange={event=>setDraft(event.target.value)} rows={3} required/>
        <div className="composer-tools">
          <SpeechButton language={language} onText={text=>setDraft(value=>value?value+' '+text:text)} onError={setError}/>
          <button className="icon-btn" type="button" aria-label="Upload a PDF" onClick={()=>setModal('upload')}><FileText size={17}/></button>
          <label className="pill-input"><span className="sr-only">Attach existing PDF</span><select value={documentId} onChange={event=>setDocument(event.target.value)}><option value="">PDF context</option>{docs.data?.filter(row=>row.kind!=='resume').map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
          {status.data?.mode==='live'&&<label className="pill-input image-input"><span>{image?'Image attached':'Add image'}</span><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Attach image" onChange={async event=>{const file=event.target.files?.[0];try{setImage(file?await fileData(file):'');}catch(error){setError(error);}}}/></label>}
          <label className="pill-input"><span className="sr-only">Response language</span><select value={language} onChange={event=>setLanguage(event.target.value)}><option>English</option><option>Hindi</option></select></label>
          {tutor&&<label className="pill-input"><span className="sr-only">Explanation mode</span><select value={mode} onChange={event=>setMode(event.target.value)}><option>Step-by-step</option><option>Simple</option><option>Detailed</option><option>Exam answer</option></select></label>}
          <button className="btn primary send-msg" disabled={running||!draft.trim()}>{running?'Sending…':'Send'} <ArrowRight size={17}/></button>
        </div>
      </form>
    </Panel></div>
    {modal==='upload'&&<Modal title="Upload study notes" close={()=>setModal('')}><UploadDocument onUpload={row=>{setDocument(row.id);void cache.invalidateQueries({queryKey:['/documents']});setModal('');}}/></Modal>}
    {modal==='rename'&&current&&<Modal title="Rename conversation" close={()=>setModal('')}><Fields fields={[{name:'title',label:'Conversation title',value:current.title}]} submit={async values=>{await action.run(()=>send('/ai/conversations/'+id,'PATCH',values),'Conversation renamed');setModal('');}}/></Modal>}
    {modal==='delete'&&<Modal title="Delete this conversation?" close={()=>setModal('')}><p>This removes the conversation and its messages.</p><button className="btn danger" disabled={action.busy} onClick={()=>void action.run(()=>send('/ai/conversations/'+id,'DELETE'),'Conversation deleted').then(()=>{setModal('');setId('');}).catch(()=>{})}>Delete conversation</button></Modal>}
    {action.feedback}
  </>;
}
export function FocusTimer(){
  const [duration,setDuration]=useState(25),[remaining,setRemaining]=useState(25*60),[deadline,setDeadline]=useState<number|null>(null);
  useEffect(()=>{
    if(!deadline)return;
    const timer=setInterval(()=>{const rest=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(rest);if(!rest)setDeadline(null);},250);
    return()=>clearInterval(timer);
  },[deadline]);
  const reset=(min:number)=>{setDeadline(null);setDuration(min);setRemaining(min*60);};
  return <Panel title="Focus timer" subtitle="Alternate focused work and short breaks." className="focus-panel">
    <Tabs options={['25 min focus','5 min break']} label="Timer mode" value={duration===25?'25 min focus':'5 min break'} onChange={value=>reset(value.startsWith('25')?25:5)}/>
    <div className="timer" aria-label="Time remaining">{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</div>
    <div className="actions"><button className="btn primary" onClick={()=>deadline?setDeadline(null):setDeadline(Date.now()+(remaining||duration*60)*1000)}>{deadline?'Pause':'Start timer'}</button><button className="btn neutral" onClick={()=>reset(duration)}><RotateCcw size={16}/> Reset</button></div>
    {remaining===0&&<p role="status">Timer finished. {duration===25?'Take a short break.':'Ready for another focus block?'}</p>}
  </Panel>;
}
export function StudySchedule(){
  const [draft,setDraft]=useState<any>(),action=useAction();
  return <div className="two-columns"><Panel title="Study schedule planner" subtitle="Build study blocks around recorded classes and upcoming exams.">
    <Fields fields={[{name:'priorities',label:'Priority topics',optional:true,hint:'Separate topics with commas.'},{name:'startsAt',label:'Earliest start (optional)',type:'datetime-local',optional:true},{name:'blocks',label:'Number of study blocks',type:'number',value:4},{name:'minutes',label:'Minutes per block',type:'number',value:40}]} label="Preview free time" submit={async values=>setDraft(await send('/ai/study-schedule','POST',{...values,startsAt:values.startsAt?new Date(values.startsAt).toISOString():undefined}))}/>
  </Panel><Panel title="Review study blocks" action={draft&&<Badge tone={draft.mode==='live'?'mint':'amber'}>{draft.mode==='live'?'AI study suggestions':'Schedule lookup'}</Badge>}>
    {draft?.sessions.length?<><Markup>{draft.content}</Markup><button className="btn primary" disabled={action.busy} onClick={()=>void action.run(()=>send('/study-plans','POST',draft),'Study schedule saved').then(()=>setDraft(undefined)).catch(()=>{})}><Check size={17}/> Approve and save schedule</button></>:<Empty title={draft?'No time slots found':'No schedule preview'} detail="Available blocks are checked against your class timetable."/>}{action.feedback}
  </Panel></div>;
}
export function ExamPanic(){
  const saved=useData('/study-plans'), action=useAction();
  const [plan,setPlan]=useState<any>(),[active,setActive]=useState<Item>();
  function updateTopic(index:number,completed:boolean){
    if(!active)return;
    const previous=active;
    const checked=completed?[...new Set([...active.checked,index])]:active.checked.filter((item:number)=>item!==index);
    setActive({...active,checked});
    void action.run(()=>send<Item>('/study-plans/'+previous.id,'PATCH',{checked}),'Progress saved')
      .then(saved=>setActive(item=>item?.id===saved.id?saved:item))
      .catch(()=>setActive(item=>item?.id===previous.id?previous:item));
  }
  const fields:Field[]=[{name:'subject',label:'Subject'},{name:'examAt',label:'Exam date',type:'datetime-local',value:localDateValue(new Date(Date.now()+3*86400000).toISOString())},{name:'hours',label:'Hours available',type:'number',value:4},{name:'target',label:'Target marks (%)',type:'number',value:80},
    {name:'syllabus',label:'Syllabus topics',type:'textarea',hint:'Separate topics with commas or line breaks.'},{name:'completed',label:'Completed topics',optional:true},{name:'weak',label:'Weak topics',optional:true}];
  return <><Header title="Exam Panic Mode" description="Build a focused revision plan for the time you have." actions={<Badge tone="amber"><Zap size={14}/> Exam preparation</Badge>}/>
    <div className="two-columns"><Panel title="Plan your preparation"><Fields fields={fields} label="Preview study plan" submit={async values=>{
      setActive(undefined);setPlan(await send('/ai/exam-plan','POST',{...values,examAt:new Date(values.examAt).toISOString()}));
    }}/></Panel><div className="stack"><FocusTimer/><Panel title="Saved study plans"><QueryView query={saved}>{rows=>rows.length?rows.map(row=><button className="list-button" key={row.id} onClick={()=>{setPlan(undefined);setActive(row);}}><FileText size={16}/>{row.title}<ChevronRight size={16}/></button>):<Empty title="No saved plans"/>}</QueryView></Panel></div></div>
    {(plan||active)&&<Panel className="spaced" title={(plan||active).title} subtitle={(plan||active).dueAt?'Exam '+fullDate((plan||active).dueAt):undefined} action={!active?<Badge tone={plan.mode==='demo'?'amber':'mint'}>{plan.mode==='demo'?'Local plan builder':'AI draft'}</Badge>:<Badge tone="mint">Saved plan</Badge>}>
      {plan&&<><details className="plan-blocks"><summary>Study blocks ({plan.sessions.length})</summary><ol>{plan.sessions.map((session:any)=><li key={session.minute}>{session.minute} min · <b>{session.topic}</b> · {session.activity} · {session.focus} min focus / {session.break} min break</li>)}</ol></details><Markup>{plan.content}</Markup><button className="btn primary" disabled={action.busy} onClick={()=>void action.run(()=>send<Item>('/study-plans','POST',{...plan,content:plan.content+'\n\n### Study blocks\n'+plan.sessions.map((session:any)=>'- '+session.minute+' min · '+session.topic+' · '+session.activity).join('\n')}),'Plan saved').then(row=>{setPlan(undefined);setActive(row);}).catch(()=>{})}><Check size={17}/> Approve and save plan</button></>}
      {active&&<><div className="progress-block"><progress value={active.checked.length} max={active.topics.length||1}/><span>{active.checked.length} of {active.topics.length} topics complete</span></div>
        {active.topics.map((topic:string,i:number)=><label key={i} className="check-field topic"><input type="checkbox" checked={active.checked.includes(i)} disabled={action.busy} onChange={event=>updateTopic(i,event.target.checked)}/>{topic}</label>)}
        {active.content&&<Markup>{active.content}</Markup>}</>}
    </Panel>}
    {action.feedback}
  </>;
}
type DraftAgent='teaching'|'intelligence'|'timetable'|'placement';
const draftCopy:Record<DraftAgent,[string,string,string,string]>={
  teaching:['Teaching Assistant','Create a lesson plan, quiz, question paper, or teaching notes to review.','Teaching request','Draft a 50-minute lesson on binary search trees.'],
  intelligence:['Campus Intelligence','Interpret aggregate campus records and plan operational improvements.','Operational question','Create a weekly briefing from the campus metrics.'],
  timetable:['Study schedule planner','Draft a study schedule around your upcoming classes and priorities.','Study priorities','Plan three sessions for my next exam around my classes.'],
  placement:['Career preparation','Get resume feedback, interview questions, or a roadmap for a role.','What would you like to practice?','Run a technical interview for a TypeScript internship.'],
};
export function DraftPage({agent,embedded=false}:{agent:DraftAgent;embedded?:boolean}){
  const [title,desc,label,example]=draftCopy[agent], [draft,setDraft]=useState<any>();
  const [content,setContent]=useState(''),[name,setName]=useState(''),[upload,setUpload]=useState(false),[documentId,setDocument]=useState('');
  const cache=useQueryClient(),docs=useData('/documents'),action=useAction();
  return <>{!embedded&&<Header title={title} description={desc}/>}<div className="two-columns">
    <Panel title={embedded?title:'Draft request'} subtitle={embedded?desc:undefined}><Fields fields={[{name:'prompt',label,type:'textarea',value:example}]} label="Generate draft" submit={async values=>{
      const result=await send('/ai/draft','POST',{...values,agent,documentId});setDraft(result);setContent(result.content);setName(result.title||title);
    }}>
      {agent==='placement'&&<div className="actions"><label className="field"><span>Resume PDF (optional)</span><select value={documentId} onChange={event=>setDocument(event.target.value)}><option value="">No resume attached</option>{docs.data?.filter(row=>row.kind==='resume').map(row=><option key={row.id} value={row.id}>{row.title}</option>)}</select></label><button type="button" className="btn neutral" onClick={()=>setUpload(true)}><FileText size={17}/> Upload resume</button></div>}
    </Fields></Panel>
    <Panel title="Review and edit" action={draft&&<Badge tone={draft.mode==='demo'?'amber':'mint'}>{draft.mode==='demo'?'Local data':'AI draft'}</Badge>}>
      {draft?<><div className="stack"><label className="field"><span>Draft title</span><input value={name} onChange={event=>setName(event.target.value)}/></label><label className="field"><span>Draft content</span><textarea rows={9} value={content} onChange={event=>setContent(event.target.value)}/></label></div>
      <details className="plan-blocks"><summary>Preview Markdown</summary><Markup>{content}</Markup></details>
      {draft.sources?.length>0&&<div className="sources">{draft.sources.map((source:any)=><a key={source.id} href={'/api/documents/'+source.documentId+'/file#page='+source.page} target="_blank" rel="noreferrer">[{source.id}] {source.title} · p. {source.page}</a>)}</div>}
      <button disabled={action.busy||!name.trim()||!content.trim()} className="btn primary" onClick={()=>void action.run(()=>send(agent==='placement'?'/interviews':agent==='timetable'?'/study-plans':'/notes','POST',{title:name,content}),'Draft saved').catch(()=>{})}><Check size={16}/> Approve and save draft</button></>:<Empty title="No draft yet" detail="Submit a request and the result will appear here for review."/>}
    </Panel></div>{upload&&<Modal title="Upload a resume" close={()=>setUpload(false)}><UploadDocument kind="resume" onUpload={row=>{setDocument(row.id);setUpload(false);void cache.invalidateQueries({queryKey:['/documents']});}}/></Modal>}{action.feedback}</>;
}

