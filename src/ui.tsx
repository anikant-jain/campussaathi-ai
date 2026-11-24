import { lazy, Suspense, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, CircleAlert, FileText, LoaderCircle, Mic, Search, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogTitle } from './components/ui/dialog';
const Markdown=lazy(()=>import('./markdown'));

export type Item = { id: string; [key: string]: any };
export type User = Item & { name:string; email:string; role:'student'|'faculty'|'admin'|'librarian'|'placement' };
export const roleLabels={student:'Student',faculty:'Faculty',admin:'Administrator',librarian:'Librarian',placement:'Placement Officer'};
export class ApiError extends Error { constructor(public status: number,message: string){super(message);} }
export async function api<T=any>(path: string, options: RequestInit = {}): Promise<T> {
  const body=options.body;
  const response=await fetch('/api'+path,{...options,headers:{...(body && !(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers}});
  if (!response.ok) {
    const data=await response.json().catch(()=>null);
    throw new ApiError(response.status,data?.message || 'The campus service is unavailable.');
  }
  return response.status===204?undefined as T:response.json();
}
export const send = <T=any>(path: string,method: string,body?: unknown) => api<T>(path,{method,body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});
export const useData = <T=Item[],>(path: string,enabled=true) => useQuery({queryKey:[path],queryFn:()=>api<T>(path),enabled});
export const msg=(error: unknown)=>error instanceof Error?error.message:'The request could not be completed.';
export const shortDate=(stamp: string)=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',timeZone:'Asia/Kolkata'}).format(new Date(stamp));
export const fullDate=(stamp: string)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(stamp));
export const clock=(stamp: string)=>new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(stamp));
export const dayKey=(stamp: string)=>new Intl.DateTimeFormat('en-CA',{dateStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(stamp));
export function localDateValue(stamp: string) {
  const date=new Date(stamp);
  return new Date(+date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
export const isoFields=(values: Record<string,any>,...keys: string[])=>Object.fromEntries(Object.entries(values).map(([key,v])=>[key,keys.includes(key)&&v?new Date(v).toISOString():v]));
export const initials=(name: string)=>name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
export function Avatar({user}:{user:User}) {
  return user.avatar?<img className="avatar" src={user.avatar} alt=""/>:<span className="avatar" aria-hidden="true">{initials(user.name)}</span>;
}
export function Header({title,description,actions}: {title:string; description?:string; actions?:ReactNode}) {
  return <div className="page-heading"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="actions">{actions}</div>}</div>;
}
export function Panel({title,subtitle,action,children,className=''}:{title?:string;subtitle?:string;action?:ReactNode;children:ReactNode;className?:string}) {
  return <section className={'panel '+className}>{(title||action)&&<div className="panel-head"><div>{title&&<h2>{title}</h2>}{subtitle&&<p>{subtitle}</p>}</div>{action}</div>}{children}</section>;
}
export function Empty({title='Nothing here yet',detail}: {title?:string;detail?:string}) {
  return <div className="empty"><FileText size={21}/><strong>{title}</strong>{detail&&<p>{detail}</p>}</div>;
}
export function Problem({error}: {error:unknown}) {
  return <p className="problem" role="alert"><CircleAlert size={17}/>{msg(error)}</p>;
}
export function Loading(){return <div className="skeletons" aria-busy="true" aria-label="Loading"><span/><span/><span/></div>;}
export function QueryView<T>({query,children}: {query:{data?:T;isPending:boolean;error:unknown};children:(data:T)=>ReactNode}) {
  if (query.isPending) return <Loading/>;
  if (query.error) return <Problem error={query.error}/>;
  return query.data!==undefined?<>{children(query.data)}</>:null;
}
export const Badge=({children,tone='violet'}:{children:ReactNode;tone?:string})=><span className={'badge '+tone}>{children}</span>;
export function SearchBox({value,onChange,label='Search'}:{value:string;onChange:(s:string)=>void;label?:string}){
  return <label className="search"><Search size={17}/><input aria-label={label} placeholder={label} type="search" value={value} onChange={event=>onChange(event.target.value)}/></label>;
}
export function Tabs({options,value,onChange,label='View'}:{options:readonly string[];value:string;onChange:(s:string)=>void;label?:string}){
  return <div className="tabs" role="group" aria-label={label}>{options.map(option=><button type="button" key={option} aria-pressed={option===value} onClick={()=>onChange(option)}>{option}</button>)}</div>;
}
export function Markup({children}: {children:string}) {
  return <Suspense fallback={<p className="preserve">{children}</p>}><Markdown content={children}/></Suspense>;
}
export function Modal({title,close,children}: {title:string;close:()=>void;children:ReactNode}) {
  const source=useRef<HTMLElement|null>(null);
  return <Dialog open onOpenChange={open=>{if(!open)close();}}>
    <DialogContent aria-describedby={undefined} onOpenAutoFocus={()=>{source.current=document.activeElement as HTMLElement|null;}} onCloseAutoFocus={event=>{event.preventDefault();source.current?.focus();}}>
      <div className="dialog-head"><DialogTitle>{title}</DialogTitle><DialogClose className="icon-btn" aria-label="Close dialog"><X size={20}/></DialogClose></div>
      {children}
    </DialogContent>
  </Dialog>;
}
export type Field={name:string; label:string; type?:string; options?:readonly (string|{value:string;label:string})[]; optional?:boolean; hint?:string; value?:any};
export function Fields({fields,submit,label='Save',children}: {fields:Field[];submit:(v:Record<string,any>)=>Promise<unknown>;label?:string;children?:ReactNode}) {
  const scope=useId();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<unknown>(null);
  async function onSubmit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError(null);
    const form=new FormData(event.currentTarget);
    const values=Object.fromEntries(fields.map(field=>[field.name,field.type==='checkbox'?form.has(field.name):form.get(field.name)??'']));
    try{await submit(values);}catch(error){setError(error);}finally{setBusy(false);}
  }
  return <form className="form" onSubmit={onSubmit} aria-busy={busy}>
    {fields.map(field=>{
      const labelId=scope+'-'+field.name;
      const helpId=field.hint?labelId+'-hint':undefined;
      const accessibility={'aria-labelledby':labelId,'aria-describedby':helpId};
      return <label className={field.type==='textarea'?'field wide':field.type==='checkbox'?'check-field':'field'} key={field.name}>
      {field.type!=='checkbox'&&<span id={labelId}>{field.label}</span>}
      {field.options?<select {...accessibility} name={field.name} defaultValue={field.value ?? ''} required={!field.optional}>
        <option value="">Select {field.label.toLowerCase()}</option>{field.options.map(option=>typeof option==='string'?<option key={option}>{option}</option>:<option key={option.value} value={option.value}>{option.label}</option>)}
      </select>:field.type==='textarea'?<textarea {...accessibility} name={field.name} defaultValue={field.value} required={!field.optional} rows={4}/>:field.type==='checkbox'?<><input {...accessibility} type="checkbox" name={field.name} defaultChecked={field.value}/><span id={labelId}>{field.label}</span></>:<input {...accessibility} type={field.type||'text'} name={field.name} defaultValue={field.value} required={!field.optional} autoComplete={field.type==='password'?'new-password':undefined}/>}
      {field.hint&&<small id={helpId}>{field.hint}</small>}
    </label>;})}
    {children&&<div className="wide">{children}</div>}{error!==null&&<div className="wide"><Problem error={error}/></div>}
    <div className="wide"><button className="btn primary" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<ArrowRight size={16}/>} {label}</button></div>
  </form>;
}
export function useAction() {
  const client=useQueryClient();
  const [error,setError]=useState<unknown>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(id);},[notice]);
  async function run<T>(promise: ()=>Promise<T>,message='Saved') {
    setBusy(true);setError(null);
    try{
      const result=await promise();
      await client.invalidateQueries({predicate:query=>query.queryKey[0]!=='/auth/me'});
      setNotice(message);
      return result;
    }catch(error){setError(error);throw error;}finally{setBusy(false);}
  }
  return {run,error,busy,notice,feedback:<>{error!==null&&<Problem error={error}/>}<div aria-live="polite">{notice&&<div className="toast"><Check size={17}/>{notice}</div>}</div></>};
}
export function fileData(file: File, max=1400000) {
  if (file.size>max) return Promise.reject(new Error('Choose a smaller image.'));
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read the image.'));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(file);});
}
export function SpeechButton({language='English',onText,onError}:{language?:string;onText:(s:string)=>void;onError:(s:string)=>void}){
  const [recording,setRecording]=useState(false);
  const speech=useRef<any>(null);
  const browser=window as any;
  const Speech=browser.SpeechRecognition||browser.webkitSpeechRecognition;
  useEffect(()=>()=>speech.current?.abort(),[]);
  if (!Speech) return null;
  return <button className={'icon-btn '+(recording?'recording':'')} type="button" aria-label={recording?'Stop voice input':'Start voice input'} onClick={()=>{
    if (recording){speech.current?.stop();return;}
    const recognition=new Speech();speech.current=recognition;
    recognition.lang=language==='Hindi'?'hi-IN':'en-IN';
    recognition.onresult=(event:any)=>onText(event.results[0][0].transcript);
    recognition.onend=()=>setRecording(false);
    recognition.onerror=(event:any)=>{setRecording(false);if(event.error!=='aborted')onError('Voice input unavailable: '+event.error);};
    try{recognition.start();setRecording(true);}catch{onError('Voice input could not start.');}
  }}><Mic size={18}/></button>;
}
export const match=(item: Item,query:string)=>[item.title,item.name,item.category,item.subject,item.company,item.author,item.description,item.id].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase());

