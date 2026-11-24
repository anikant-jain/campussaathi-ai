import { useState } from 'react';
import { Bookmark, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Badge, Empty, Fields, Header, Markup, Panel, QueryView, Tabs, fullDate, send, useAction, useData, type Item } from './ui';
export function Practice(){
  const [tab,setTab]=useState('Create deck'),[mode,setMode]=useState('quiz'),[preview,setPreview]=useState<any>(),[deck,setDeck]=useState<Item>(),[answers,setAnswers]=useState<Record<number,string>>({}),[grades,setGrades]=useState<Item>(),[flash,setFlash]=useState(0),[reveal,setReveal]=useState(false);
  const decks=useData('/practice'),attempts=useData('/practice/attempts'),docs=useData('/documents'),action=useAction();
  const begin=(item:Item)=>{setDeck(item);setAnswers({});setGrades(undefined);setFlash(0);setReveal(false);setTab('My decks');};
  return <><Header title="Practice Studio" description="Review flashcards, take quizzes, and track your attempts."/>
    <div className="page-tabs"><Tabs options={['Create deck','My decks','Attempts']} value={tab} onChange={setTab}/></div>
    {tab==='Create deck'&&<div className="two-columns"><Panel title="Create a practice deck">
      <label className="field"><span>Practice type</span><select value={mode} onChange={event=>{setMode(event.target.value);setPreview(undefined);}}><option value="quiz">Quiz</option><option value="flashcards">Flashcards</option></select></label>
      <Fields fields={[{name:'topic',label:'Topic or instructions',type:'textarea'},{name:'documentId',label:'Study PDF (optional)',optional:true,options:docs.data?.filter(row=>row.kind==='material').map(row=>({value:row.id,label:row.title}))||[]}]} label="Generate practice draft" submit={async values=>setPreview(await send('/practice/draft','POST',{...values,mode}))}/>
      <h3 className="spaced">Sample decks</h3><div className="actions"><button className="btn neutral small" disabled={action.busy} onClick={()=>void action.run(()=>send('/practice/draft','POST',{mode,sample:'coding'}),'Sample loaded').then(setPreview).catch(()=>{})}>Coding fundamentals</button><button className="btn neutral small" disabled={action.busy} onClick={()=>void action.run(()=>send('/practice/draft','POST',{mode,sample:'aptitude'}),'Sample loaded').then(setPreview).catch(()=>{})}>Aptitude practice</button></div>
    </Panel><Panel title="Review draft" action={preview&&<Badge tone="amber">{preview.status}</Badge>}>
      {preview?<><h3>{preview.title}</h3>{preview.questions.map((row:any,i:number)=><details className="plan-blocks" key={i}><summary>{row.prompt}</summary><p>{row.answer}</p><Markup>{row.explanation}</Markup></details>)}
      <button className="btn primary" disabled={action.busy} onClick={()=>void action.run(()=>send<Item>('/practice','POST',preview),'Deck saved').then(item=>{setPreview(undefined);begin(item);}).catch(()=>{})}><Check size={16}/> Approve and save deck</button></>:<Empty title="No draft yet"/>}
    </Panel></div>}
    {tab==='My decks'&&<div className="two-columns"><Panel title="Saved decks"><QueryView query={decks}>{rows=>rows.length?rows.map(row=><button className="list-button" key={row.id} onClick={()=>begin(row)}><Bookmark size={16}/>{row.title}<ChevronRight size={16}/></button>):<Empty title="No practice decks yet"/>}</QueryView></Panel>
    <Panel title={deck?.title||'Practice'}>
      {deck?.mode==='quiz'&&<><ol className="practice-items">{deck.questions.map((row:any,i:number)=><li key={i}><fieldset><legend>{row.prompt}</legend>{row.options.map((option:string)=><label key={option} className="check-field"><input name={'answer-'+i} type="radio" checked={answers[i]===option} disabled={!!grades} onChange={()=>setAnswers(old=>({...old,[i]:option}))}/>{option}</label>)}
      {grades&&<p className={grades.answers[i].correct?'answer-correct':'answer-wrong'}>{grades.answers[i].correct?'Correct. ':'Answer: '+grades.answers[i].answer+'. '}{grades.answers[i].explanation}</p>}</fieldset></li>)}</ol>
      {grades?<div className="actions"><Badge tone="mint">Score: {grades.score} / {grades.max}</Badge><button className="btn neutral" onClick={()=>begin(deck)}>Try again</button></div>:
        <button className="btn primary" disabled={action.busy||Object.keys(answers).length!==deck.questions.length} onClick={()=>void action.run(()=>send<Item>('/practice/'+deck.id+'/attempt','POST',{answers:deck.questions.map((_:unknown,i:number)=>answers[i])}),'Attempt recorded').then(setGrades).catch(()=>{})}>Grade quiz</button>}</>}
      {deck?.mode==='flashcards'&&<><Badge tone="soft">{flash+1} of {deck.questions.length}</Badge><h3 className="spaced">{deck.questions[flash].prompt}</h3>
      {reveal&&<><p className="spaced">{deck.questions[flash].answer}</p><Markup>{deck.questions[flash].explanation}</Markup></>}
      <div className="actions spaced"><button className="icon-btn" aria-label="Previous card" disabled={flash===0} onClick={()=>{setFlash(flash-1);setReveal(false);}}><ChevronLeft size={18}/></button><button className="btn neutral" onClick={()=>setReveal(!reveal)}>{reveal?'Hide answer':'Reveal answer'}</button><button className="icon-btn" aria-label="Next card" disabled={flash+1===deck.questions.length} onClick={()=>{setFlash(flash+1);setReveal(false);}}><ChevronRight size={18}/></button></div></>}
      {!deck&&<Empty title="Choose a deck to start"/>}
    </Panel></div>}
    {tab==='Attempts'&&<Panel title="Quiz history"><QueryView query={attempts}>{rows=>rows.length?rows.map(row=><div className="line-item" key={row.id}><div className="line-content"><b>{row.title}</b><p>{fullDate(row.createdAt)}</p></div><Badge tone="mint">{row.score} / {row.max}</Badge></div>):<Empty title="No quiz attempts"/>}</QueryView></Panel>}
    {action.feedback}
  </>;
}

