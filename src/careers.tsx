import { useState } from 'react';
import { ArrowRight, FileText, MessageCircleMore, Sparkles, Volume2 } from 'lucide-react';
import { Badge, Empty, Fields, Markup, Modal, Panel, Problem, QueryView, SpeechButton, Tabs, fullDate, send, useAction, useData, type Item } from './ui';
import { UploadDocument } from './learning';
import { useQueryClient } from '@tanstack/react-query';

function ResumeMatch(){
  const docs=useData('/documents'),cache=useQueryClient();
  const [upload,setUpload]=useState(false),[result,setResult]=useState<any>();
  return <div className="two-columns"><Panel title="Resume and job description" action={<button className="btn neutral small" onClick={()=>setUpload(true)}><FileText size={15}/> Upload resume</button>}>
    <Fields fields={[{name:'documentId',label:'Resume PDF',options:docs.data?.filter(row=>row.kind==='resume').map(row=>({value:row.id,label:row.title}))||[]},{name:'description',label:'Job description',type:'textarea'}]} label="Compare skills" submit={async values=>setResult(await send('/careers/resume-match','POST',values))}/>
  </Panel><Panel title="Compatibility estimate">{result?<><Badge tone="amber">{result.estimate===null?'Insufficient recognized skills':result.estimate+'% keyword overlap'}</Badge><p className="muted">Uses recognized skill keywords in the job description and your resume. This is an estimate.</p>
  <h3 className="spaced">Matched skills</h3><p>{result.matched.join(', ')||'None found.'}</p><h3 className="spaced">Skills to review</h3><p>{result.missing.join(', ')||'None found.'}</p></>:<Empty title="No comparison yet"/>}</Panel>
  {upload&&<Modal title="Upload a resume PDF" close={()=>setUpload(false)}><UploadDocument kind="resume" onUpload={()=>{setUpload(false);void cache.invalidateQueries({queryKey:['/documents']});}}/></Modal>}</div>;
}
export function CareerPractice({history=false}:{history?:boolean}){
  const [tab,setTab]=useState('Mock interview'),[active,setActive]=useState<Item>(),[answers,setAnswers]=useState<string[]>([]),[voiceError,setVoiceError]=useState('');
  const query=useData('/careers/sessions'),action=useAction();
  const open=(row:Item)=>{setActive(row);setAnswers(row.questions.map((_:string,i:number)=>row.answers[i]||''));};
  if(history)return <Panel title="Mock interview sessions"><QueryView query={query}>{rows=>rows.length?rows.map(row=><details className="plan-blocks" key={row.id}><summary>{row.title} · {fullDate(row.createdAt)}</summary>{row.questions.map((question:string,i:number)=><div className="line-item" key={i}><div className="line-content"><b>{question}</b><p>{row.answers[i]||'Awaiting answer'}</p></div></div>)}{row.feedback&&<Markup>{row.feedback}</Markup>}</details>):<Empty title="No mock interviews yet"/>}</QueryView></Panel>;
  return <><div className="page-tabs"><Tabs options={['Mock interview','Resume match']} value={tab} onChange={setTab}/></div>{tab==='Resume match'?<ResumeMatch/>:<div className="two-columns">
    <div className="stack"><Panel title="Start a mock interview"><Fields fields={[{name:'target',label:'Target role',value:'Software engineering intern'},{name:'kind',label:'Interview type',options:[{value:'technical',label:'Technical'},{value:'hr',label:'HR'}],value:'technical'},{name:'personalized',label:'Generate personalized questions with AI',type:'checkbox'}]} label="Start interview" submit={async values=>open(await action.run(()=>send<Item>('/careers/sessions','POST',values),'Interview started'))}/></Panel>
    <Panel title="Resume a session"><QueryView query={query}>{rows=>rows.length?rows.map(row=><button className="list-button" key={row.id} onClick={()=>open(row)}><MessageCircleMore size={16}/>{row.title}<ArrowRight size={15}/></button>):<Empty title="No previous sessions"/>}</QueryView></Panel></div>
    <Panel title={active?.title||'Interview questions'} action={active&&<Badge tone={active.mode==='live'?'mint':'amber'}>{active.mode==='live'?'AI questions':'Sample questions'}</Badge>}>
      {active?<><div className="stack">{active.questions.map((question:string,i:number)=><div className="stack" key={i}>
        <label className="field"><span>{question}</span><textarea rows={3} value={answers[i]} onChange={event=>{const value=event.target.value;setAnswers(old=>old.map((answer,j)=>i===j?value:answer));}}/></label>
        <div className="actions"><SpeechButton onText={text=>setAnswers(old=>old.map((answer,j)=>i===j?[answer,text].filter(Boolean).join(' '):answer))} onError={setVoiceError}/>{'speechSynthesis'in window&&<button className="icon-btn" aria-label={'Read question '+(i+1)+' aloud'} onClick={()=>{speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(question);voice.lang='en-IN';speechSynthesis.speak(voice);}}><Volume2 size={17}/></button>}</div>
      </div>)}</div>
      <div className="actions spaced"><button className="btn primary" disabled={action.busy||answers.some(answer=>!answer.trim())} onClick={()=>void action.run(()=>send<Item>('/careers/sessions/'+active.id+'/answers','PUT',{answers}),'Answers saved').then(open).catch(()=>{})}>Save answers</button>
      {active.answers.length===active.questions.length&&<button className="btn neutral" disabled={action.busy||JSON.stringify(answers)!==JSON.stringify(active.answers)} onClick={()=>void action.run(()=>send<Item>('/careers/sessions/'+active.id+'/feedback','POST'),'Feedback ready').then(open).catch(()=>{})}><Sparkles size={16}/> Request AI feedback</button>}</div>
      {voiceError&&<Problem error={voiceError}/>}
      {active.feedback&&<><Badge tone="amber">AI coaching feedback</Badge><Markup>{active.feedback}</Markup></>}</>:<Empty title="Start or resume an interview"/>}
    </Panel></div>}{action.feedback}</>;
}

