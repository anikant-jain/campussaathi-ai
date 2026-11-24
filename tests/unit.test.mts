import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.CAMPUS_DB=':memory:';
process.env.DATABASE_URL='';
const { hashPassword,checkPassword,atomic,save,get }=await import('../server/core.ts');
const { hasConflict,csvCells }=await import('../server/academic.ts');
const { validAnalysis,providerText,readImage }=await import('../server/provider.ts');
const { makePlan,makeStudySchedule,selectAgent }=await import('../server/assistant.ts');
const { findRoute }=await import('../server/operations.ts');
const { splitText }=await import('../server/documents.ts');
const { compareResume }=await import('../server/careers.ts');

test('scrypt uses independent salts and checks passwords',()=>{
  const a=hashPassword('example-long-password');
  const b=hashPassword('example-long-password');
  assert.notEqual(a,b);
  assert.equal(checkPassword('example-long-password',a),true);
  assert.equal(checkPassword('incorrect-password',a),false);
});
test('transaction rolls back all writes on failure',()=>{
  assert.throws(()=>atomic(()=>{save('events',{id:'rollback',title:'Transient'});throw new Error('failure');}),/failure/);
  assert.equal(get('events','rollback'),undefined);
});
test('adjacent classes do not collide and overlapping room reservations do',()=>{
  const a={id:'1',room:'R2',facultyId:'f1',department:'CSE',section:'A',semester:'5',startsAt:'09:00',endsAt:'10:00',status:'scheduled'};
  assert(hasConflict(a,{...a,id:'2',room:'r2',startsAt:'09:59',endsAt:'11:00'}));
  assert(!hasConflict(a,{...a,id:'2',startsAt:'10:00',endsAt:'11:00'}));
  assert(!hasConflict(a,{...a,id:'2',status:'cancelled'}));
  assert.deepEqual(csvCells('"Design, UI","Room ""A""",test'),['Design, UI','Room "A"','test']);
});
test('walking routes honor step-free edges',()=>{
  const nodes=['a','b','c'].map(id=>({id}));
  const routes=[{id:'ab',from:'a',to:'b',distance:2,accessible:true},{id:'bc',from:'b',to:'c',distance:2,accessible:true},{id:'ac',from:'a',to:'c',distance:1,accessible:false}];
  assert.deepEqual(findRoute(nodes,routes,'a','c',false),{path:['a','c'],distance:1});
  assert.deepEqual(findRoute(nodes,routes,'a','c',true),{path:['a','b','c'],distance:4});
});
test('tutoring validates images and filters provider thought chunks',()=>{
  assert.throws(()=>readImage('data:image/png;base64,dGVzdA=='),/does not match/);
  assert.equal(providerText('gemini',{candidates:[{content:{parts:[{text:'private',thought:true},{text:'visible'}]}}]},true),'visible');
  assert.equal(providerText('openai',{choices:[{delta:{content:'fragment'}}]},true),'fragment');
  assert.equal(validAnalysis({priority:'extreme'}),false);
  assert.equal(selectAgent('Find a library book'),'library');
});
test('exam planner budgets focus and break time and document chunks overlap',()=>{
  const plan=makePlan(['Trees','Graphs'],1);
  assert.deepEqual(plan.map(row=>row.topic),['Trees','Graphs']);
  assert(plan.every(row=>row.minute+row.focus+row.break<=60));
  const chunks=splitText('data structures graphs practice '.repeat(100));
  assert(chunks.length>1 && chunks.every(chunk=>chunk.length<=950));
});
test('study blocks avoid active classes and resume matching uses whole skill terms',()=>{
  const start=+new Date('2026-11-24T03:00:00Z');
  const classes=[{id:'1',status:'scheduled',startsAt:'2026-11-24T03:30:00Z',endsAt:'2026-11-24T04:30:00Z'}];
  const slots=makeStudySchedule(classes,[{id:'exam',subject:'Networks'}],start,2,45,[]);
  assert.equal(slots[0].startsAt,'2026-11-24T04:30:00.000Z');
  assert.equal(slots[0].topic,'Networks');
  const match=compareResume('JavaScript, TypeScript and SQL','Java and SQL internship');
  assert.deepEqual(match.matched,['sql']);
  assert.deepEqual(match.missing,['java']);
  assert.equal(match.estimate,50);
});

