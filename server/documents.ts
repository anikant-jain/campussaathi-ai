import { Router } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { atomic, check, clean, db, get, list, now, own, postgres, remove, save, uid, type Account, type Row } from './core';
import { provider } from './provider';

export const documents=Router();
const upload=multer({ storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:4,fieldSize:1000} });
export function canRead(row: Row, user: Account) {
  return row.owner===user.id || row.visibility==='campus' && row.kind==='material';
}
export function splitText(text: string, chunkSize=950, overlap=130) {
  const normalized=text.replace(/\s+/g,' ').trim();
  const found: string[]=[];
  for (let start=0;start<normalized.length;) {
    let end=Math.min(normalized.length,start+chunkSize);
    const space=normalized.lastIndexOf(' ',end);
    if (end<normalized.length && space>start+chunkSize/2) end=space;
    found.push(normalized.slice(start,end).trim());
    if (end===normalized.length) break;
    start=end-overlap;
  }
  return found;
}
export async function embedding(input: string) {
  const cfg=provider();
  const model=process.env.EMBEDDING_MODEL;
  if (!cfg || !model) return null;
  const gemini=cfg.type==='gemini';
  const response=await fetch(gemini?'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':embedContent':(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/,'')+'/embeddings',{
    method:'POST',signal:AbortSignal.timeout(18000),
    headers:{'Content-Type':'application/json',...(gemini?{'x-goog-api-key':cfg.key}:{Authorization:'Bearer '+cfg.key})},
    body:JSON.stringify(gemini?{model:'models/'+model,content:{parts:[{text:input}]}}:{model,input}),
  });
  if(!response.ok) return null;
  const data:any=await response.json();
  const vector=gemini?data.embedding?.values:data.data?.[0]?.embedding;
  if (!Array.isArray(vector) || !vector.length || vector.length>4096 || !vector.every(Number.isFinite)) return null;
  return vector as number[];
}
const terms=(input: string)=>new Set((input.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(word=>word.length>2));
function similarity(a: number[], b: number[]) {
  if (a.length!==b.length) return 0;
  let dot=0,x=0,y=0;
  for (let i=0;i<a.length;i++) {dot+=a[i]*b[i];x+=a[i]*a[i];y+=b[i]*b[i];}
  return dot/(Math.sqrt(x*y)||1);
}
export async function retrieve(user: Account, query: string, documentId?: string) {
  const allowed=list('documents').filter(row=>canRead(row,user)&&(!documentId||row.id===documentId));
  if (documentId) check(allowed.length,'Document not found.',404);
  const index=new Map(allowed.map(row=>[row.id,row]));
  const chunks=list('document-chunks').filter(row=>index.has(row.documentId));
  const q=terms(query);
  const queryVector=chunks.some(row=>row.embedding)?await embedding(query).catch(()=>null):null;
  const rank=new Map<string,number>();
  if (postgres && queryVector && allowed.length) {
    const marks=allowed.map(()=>'?').join(',');
    const rows=db.prepare("SELECT id, 1-(embedding <=> ?::vector) AS rank FROM records WHERE kind='document-chunks' AND embedding IS NOT NULL AND vector_dims(embedding)=? AND (data::jsonb->>'documentId') IN ("+marks+")").all(JSON.stringify(queryVector),queryVector.length,...allowed.map(row=>row.id));
    for (const row of rows) rank.set(String(row.id),Number(row.rank));
  }
  return chunks.map(row=>{
    const common=[...terms(row.content)].filter(term=>q.has(term)).length;
    const score=queryVector&&row.embedding?(rank.get(row.id)??similarity(queryVector,row.embedding))+common*0.04:common;
    return {title:index.get(row.documentId)!.title,page:row.page,content:row.content,documentId:row.documentId,score};
  }).filter(row=>Boolean(documentId)||row.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
}
documents.get('/',(req,res)=>res.json(list('documents').filter(row=>canRead(row,req.account!))));
documents.post('/',upload.single('file'),async (req,res,next)=>{
  try {
    const file=req.file;
    check(file && file.buffer.subarray(0,5).toString()==='%PDF-' && /\.pdf$/i.test(file.originalname),'Upload a valid PDF file.');
    const kind=req.body.kind==='resume'?'resume':'material';
    const publicDoc=kind==='material' && req.body.visibility==='campus';
    const user=req.account!;
    check(!publicDoc||['faculty','admin','librarian'].includes(user.role),'Your role cannot publish campus-wide material.',403);
    const parser=new PDFParse({data:new Uint8Array(file.buffer),isEvalSupported:false,disableFontFace:true});
    const reader=await parser.getText({first:100}).catch(()=>null).finally(()=>parser.destroy().catch(()=>{}));
    check(reader,'This file could not be read. Upload an unencrypted, text-based PDF.');
    check(reader.total<=100,'Use a PDF with 100 pages or fewer.');
    check(reader.pages.some(page=>page.text.trim()),'The PDF contains no extractable text. Upload a text-based PDF.');
    const chunks=reader.pages.flatMap(({num,text})=>splitText(text.slice(0,25000)).map(content=>({page:num,content}))).slice(0,150);
    const title=req.body.title ? clean(req.body.title,'Title') : clean(file.originalname.replace(/\.pdf$/i,''),'Filename');
    const id=uid();
    const row={id,owner:user.id,title,kind,visibility:publicDoc?'campus':'private',pages:reader.total,size:file.size,createdAt:now()};
    atomic(()=>{
      save('documents',row);
      db.prepare('INSERT INTO assets VALUES(?,?)').run(id,file.buffer);
      for (const chunk of chunks) save('document-chunks',{id:uid(),owner:user.id,documentId:id,...chunk});
    });
    // Private documents use local retrieval. Campus-wide material can be indexed with a configured provider.
    if (publicDoc && req.body.index==='true' && process.env.EMBEDDING_MODEL && provider()) {
      const input=list('document-chunks',user.id).filter(item=>item.documentId===id);
      for (let i=0;i<input.length;i+=8) {
        await Promise.all(input.slice(i,i+8).map(async item=>{
          const vector=await embedding(item.content).catch(()=>null);
          if (vector && get('documents',id)) atomic(()=>{
            save('document-chunks',{...item,embedding:vector});
            if (postgres) db.prepare("UPDATE records SET embedding=?::vector WHERE kind='document-chunks' AND id=?").run(JSON.stringify(vector),item.id);
          });
        }));
      }
    }
    res.status(201).json(row);
  } catch(error) { next(error); }
});
documents.get('/:id/file',(req,res)=>{
  const row=get('documents',req.params.id);
  check(row&&canRead(row,req.account!),'Document not found.',404);
  const file=db.prepare('SELECT content FROM assets WHERE id=?').get(row.id);
  check(file,'File not found.',404);
  res.set({'Content-Type':'application/pdf','Content-Disposition':'inline','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox"}).send(Buffer.from(file.content as Uint8Array));
});
documents.delete('/:id',(req,res)=>{
  const row=own('documents',req.params.id,req.account!.id);
  atomic(()=>{
    for (const part of list('document-chunks',row.owner).filter(item=>item.documentId===row.id)) remove('document-chunks',part.id);
    db.prepare('DELETE FROM assets WHERE id=?').run(row.id);
    remove('documents',row.id);
  });
  res.sendStatus(204);
});

