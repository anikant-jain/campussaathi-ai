import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { io } from 'socket.io-client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';

let root:string, proc:ChildProcess, dir:string, dbPath:string, port:number;
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function start(override:NodeJS.ProcessEnv={}){
  proc=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,DEMO_MODE:'true',NODE_ENV:'test',HOST:'127.0.0.1',PORT:String(port),DATABASE_URL:'',CAMPUS_DB:dbPath,AI_PROVIDER:'demo',ENABLE_REMINDERS:'false',...override},stdio:['ignore','pipe','pipe']});
  let output='', lastError: unknown;
  proc.stdout?.on('data',chunk=>output+=chunk);
  proc.stderr?.on('data',chunk=>{output+=chunk;if(!String(chunk).includes('ExperimentalWarning')) process.stderr.write(chunk);});
  const deadline=Date.now()+45000;
  while(Date.now()<deadline){
    try{if((await fetch(root+'/health')).ok)return;}catch(error){lastError=error instanceof Error?error.cause||error:error;}
    if(proc.exitCode!==null)break;
    await pause(100);
  }
  throw new Error('Server did not start. '+output,{cause:lastError});
}
async function stop(){
  if(!proc||proc.exitCode!==null)return;
  const exited=once(proc,'exit');proc.kill();await exited;
}
before(async()=>{
  dir=await mkdtemp(join(tmpdir(),'campus-tests-'));dbPath=join(dir,'campus.sqlite');
  const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');
  const address=listener.address();assert(address&&typeof address!=='string');port=address.port;
  await new Promise<void>(resolve=>listener.close(()=>resolve()));
  root='http://127.0.0.1:'+port+'/api';await start();
});
after(async()=>{await stop();if(dir)await rm(dir,{recursive:true,force:true});});
async function request(path:string,method='GET',cookie='',body?:any){
  const data=body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body);
  return fetch(root+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(data&&!(data instanceof FormData)?{'Content-Type':'application/json'}:{})},body:data});
}
async function login(email:string,password='CampusDemo!26'){
  const response=await request('/auth/login','POST','',{email,password});
  assert.equal(response.status,200,await response.clone().text());
  return response.headers.get('set-cookie')!.split(';')[0];
}
let studentSession: Promise<string>, adminSession: Promise<string>, librarianSession: Promise<string>;
const student=()=>studentSession ||= login('aman.singhal@campussaathi.edu');
const admin=()=>adminSession ||= login('dean.welfare@campussaathi.edu');
const librarian=()=>librarianSession ||= login('library@campussaathi.edu');
function pdf(){
  const stream='BT /F1 12 Tf 20 260 Td (Graphs contain vertices and edges.) Tj ET\n';
  const rows=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream'];
  let body='%PDF-1.4\n';const offsets:number[]=[];
  for(const [i,row] of rows.entries()){offsets.push(body.length);body+=(i+1)+' 0 obj\n'+row+'\nendobj\n';}
  const at=body.length;
  return body+'xref\n0 6\n0000000000 65535 f \n'+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+at+'\n%%EOF\n';
}
test('registration always creates a student; private routes and cross-origin mutation are restricted',async()=>{
  assert.equal((await request('/dashboard')).status,401);
  const response=await request('/auth/register','POST','',{email:'test@campus.example',name:'Test Student',password:'test-password!123',role:'admin'});
  const user=await response.json();assert.equal(user.role,'student');
  const cookie=response.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await request('/analytics','GET',cookie)).status,403);
  assert.equal((await request('/users/profile','PATCH',cookie,{role:'admin',department:'Computer Science'})).status,200);
  assert.equal((await (await request('/auth/me','GET',cookie)).json()).department,undefined);
  const cross=await fetch(root+'/tasks',{method:'POST',headers:{Cookie:cookie,Origin:'https://unrelated.invalid','Content-Type':'application/json'},body:'{"title":"Cross-origin"}'});
  assert.equal(cross.status,403);
});
test('one-time password reset invalidates the previous session',async()=>{
  const cookie=await login('test@campus.example','test-password!123');
  const result=await (await request('/auth/forgot-password','POST','',{email:'test@campus.example'})).json();
  const data={token:result.resetToken,password:'replacement-pass!123'};
  assert.equal((await request('/auth/reset-password','POST','',data)).status,200);
  assert.equal((await request('/auth/reset-password','POST','',data)).status,410);
  assert.equal((await request('/auth/me','GET',cookie)).status,401);
  await login('test@campus.example',data.password);
});
test('event capacity is atomic and role permission is enforced',async()=>{
  const owner=await admin(), a=await student(), b=await librarian();
  const data={title:'One spot',organizer:'QA',category:'Workshops',description:'Capacity check',room:'Hall',capacity:1,status:'published',startsAt:new Date(Date.now()+1800000).toISOString()};
  assert.equal((await request('/events','POST',a,data)).status,403);
  const event=await (await request('/events','POST',owner,data)).json();
  const attempts=await Promise.all([a,b].map(cookie=>request('/events/'+event.id+'/registration','POST',cookie)));
  assert.deepEqual(attempts.map(r=>r.status).sort(),[201,409]);
  const winner=attempts[0].ok?a:b;
  assert.equal((await request('/events/'+event.id+'/registration','POST',winner)).status,409);
  assert.equal((await request('/events/'+event.id+'/check-in','POST',winner,{code:event.code})).status,200);
  assert.equal((await request('/events/'+event.id+'/registration','DELETE',winner)).status,409);
});
test('library reservation, issue and return keep availability consistent',async()=>{
  const a=await student(), staff=await librarian();
  const catalog=await (await request('/library','GET',a)).json();
  const row=catalog.find((book:any)=>book.id==='book-1');
  assert(row.available>0);
  assert.equal((await request('/library/'+row.id+'/reservation','POST',a)).status,201);
  assert.equal((await request('/library/'+row.id+'/reservation','POST',a)).status,409);
  assert.equal((await request('/library/'+row.id+'/issue','POST',a,{userId:'STU-1029'})).status,403);
  const issue=await request('/library/'+row.id+'/issue','POST',staff,{userId:'STU-1029'});assert.equal(issue.status,201);
  const loan=await issue.json();assert.equal(loan.status,'issued');
  assert.equal((await request('/library/loans/'+loan.id+'/return','POST',staff)).status,200);
  const live=await (await request('/library','GET',a)).json();assert.equal(live.find((book:any)=>book.id===row.id).available,row.available);
});
test('PDF permissions and database-backed assistant citations',async()=>{
  const a=await student(), staff=await admin(), form=new FormData();
  form.set('file',new Blob([pdf()],{type:'application/pdf'}),'graphs.pdf');
  const upload=await request('/documents','POST',a,form);
  assert.equal(upload.status,201,await upload.clone().text());const doc=await upload.json();
  assert.equal((await request('/documents/'+doc.id+'/file','GET',staff)).status,404);
  assert.equal((await request('/documents/'+doc.id+'/file','GET',a)).status,200);
  const conversation=await (await request('/ai/conversations','POST',a,{})).json();
  const path='/ai/conversations/'+conversation.id+'/messages';
  assert.equal((await request(path,'GET',staff)).status,404);
  const result=await request(path,'POST',a,{content:'What are graphs?',documentId:doc.id,agent:'library'});
  assert.match(result.headers.get('content-type')||'',/event-stream/);
  const payload=await result.text();
  assert.match(payload,/vertices and edges/);assert.match(payload,/"page":1/);
  const persisted=await (await request(path,'GET',a)).json();
  assert.equal(persisted[1].mode,'demo');
  assert.equal(persisted[1].sources[0].documentId,doc.id);
});
test('complaint status notifies the owner and prevents cross-account access',async()=>{
  const a=await student(), staff=await admin(), other=await librarian();
  const created=await request('/complaints','POST',a,{description:'The Wi-Fi disconnects in the computer lab.'});
  assert.equal(created.status,201);const ticket=await created.json();
  assert.equal(ticket.aiAnalysis.isLiveAi,false);
  assert.equal((await request('/complaints/'+ticket.id,'GET',other)).status,404);
  assert.equal((await request('/complaints/'+ticket.id,'PATCH',a,{status:'resolved'})).status,403);
  const socket=io(root.replace('/api',''),{transports:['websocket'],extraHeaders:{Cookie:a},timeout:1500,reconnection:false});
  try{
    await once(socket,'connect',{signal:AbortSignal.timeout(3000)});
    const received=once(socket,'notifications:changed',{signal:AbortSignal.timeout(3000)});
    assert.equal((await request('/complaints/'+ticket.id,'PATCH',staff,{status:'resolved',reply:'Wi-Fi access point replaced.'})).status,200);
    await received;
  }finally{socket.close();}
  const notes=await (await request('/notifications','GET',a)).json();
  assert(notes.some((note:any)=>note.message==='Wi-Fi access point replaced.'));
  assert.equal((await request('/notifications/'+notes[0].id+'/read','PATCH',other)).status,404);
});
test('schedule conflicts, exam drafts and the map validate inputs',async()=>{
  const f=await login('r.chandra@campussaathi.edu'), s=await student();
  const classes=await (await request('/timetable','GET',f)).json();
  const first=classes[0];
  assert.equal((await request('/timetable','POST',f,{...first,title:'Colliding class'})).status,409);
  assert.equal((await request('/timetable/export','GET',s)).headers.get('content-type')?.includes('text/calendar'),true);
  const result=await (await request('/navigation/route?from=gate&to=library&accessible=true','GET',s)).json();
  assert.deepEqual(result.path,['gate','admin','tech','library']);
  const exam=await request('/ai/exam-plan','POST',s,{subject:'Databases',examAt:new Date(Date.now()+3*86400000).toISOString(),hours:3,target:80,syllabus:'SQL, normalization',weak:'SQL'});
  assert.equal(exam.status,200);assert.equal((await exam.json()).topics[0],'SQL');
});
test('task remains after restarting the server',async()=>{
  const cookie=await student();
  const result=await request('/tasks','POST',cookie,{title:'Persistence test task'});assert.equal(result.status,201);
  const row=await result.json();
  await stop();await start();
  const tasks=await (await request('/tasks','GET',cookie)).json();assert(tasks.some((task:any)=>task.id===row.id));
});
test('practice grading and mock interview history are isolated by account',async()=>{
  const s=await student(), staff=await admin();
  const draft=await (await request('/practice/draft','POST',s,{mode:'quiz',sample:'coding'})).json();
  const save=await request('/practice','POST',s,draft);assert.equal(save.status,201);
  const deck=await save.json();assert.equal(deck.questions[0].answer,undefined);
  const answers=draft.questions.map((row:any)=>row.answer);
  assert.equal((await request('/practice/'+deck.id+'/attempt','POST',staff,{answers})).status,404);
  const grade=await request('/practice/'+deck.id+'/attempt','POST',s,{answers});
  assert.equal(grade.status,201);assert.equal((await grade.json()).score,3);
  const started=await request('/careers/sessions','POST',s,{kind:'technical',target:'Software intern'});
  assert.equal(started.status,201);const session=await started.json();
  const response={answers:session.questions.map(()=> 'I would start with a reproducible example and use evidence to decide what to try next.')};
  assert.equal((await request('/careers/sessions/'+session.id+'/answers','PUT',staff,response)).status,404);
  const saved=await request('/careers/sessions/'+session.id+'/answers','PUT',s,response);
  assert.equal((await saved.json()).answers.length,3);
});
test('OpenAI-compatible tool calling passes scoped records into real SSE transport',async()=>{
  const requests:any[]=[];
  const provider=createHttpServer(async(req,res)=>{
    let body='';
    for await (const part of req)body+=part;
    const data=JSON.parse(body);requests.push(data);
    if(!data.stream){
      return res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({choices:[{message:{role:'assistant',tool_calls:[{id:'read1',type:'function',function:{name:'personal_attendance',arguments:'{}'}}]}}]}));
    }
    res.writeHead(200,{'Content-Type':'text/event-stream'});
    for(const content of ['Recorded attendance: ','86%.']){
      res.write('data: '+JSON.stringify({choices:[{delta:{content}}]})+'\n\n');
    }
    res.end('data: [DONE]\n\n');
  });
  provider.listen(0,'127.0.0.1');await once(provider,'listening');
  try{
    const address=provider.address();assert(address&&typeof address!=='string');
    await stop();await start({AI_PROVIDER:'openai',OPENAI_API_KEY:'local-test-key',OPENAI_MODEL:'local-contract-fixture',OPENAI_BASE_URL:'http://127.0.0.1:'+address.port});
    const cookie=await student();
    const conversation=await (await request('/ai/conversations','POST',cookie,{})).json();
    const result=await request('/ai/conversations/'+conversation.id+'/messages','POST',cookie,{content:'What is my attendance?'});
    const frames=await result.text();
    assert.match(frames,/"mode":"live"/);
    assert.match(frames,/"content":"Recorded attendance: 86%\."/);
    assert.equal(requests.length,2);
    assert.equal(requests[0].tool_choice.function.name,'personal_attendance');
    const evidence=JSON.parse(requests[1].messages.at(-1).content);
    assert.deepEqual(evidence.records,[{total:50,present:43,percentage:86}]);
  }finally{await new Promise<void>(resolve=>provider.close(()=>resolve()));}
});

