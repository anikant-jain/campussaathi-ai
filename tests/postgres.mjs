import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';

const pg = await PGlite.create({extensions:{vector}});
const socket = new PGLiteSocketServer({db:pg,host:'127.0.0.1',port:0,maxConnections:8});
let app;
async function run(entry,args,env){
  const child=spawn(process.execPath,[entry,...args],{env,stdio:'inherit'});
  const [code]=await once(child,'exit');assert.equal(code,0);
}
try {
  await socket.start();
  const url='postgresql://postgres:postgres@'+socket.getServerConn()+'/postgres?connection_limit=1&statement_cache_size=0&sslmode=disable';
  const env={...process.env,DATABASE_URL:url,NODE_ENV:'test',DEMO_MODE:'true',AI_PROVIDER:'demo',ENABLE_REMINDERS:'false'};
  await run('node_modules/prisma/build/index.js',['migrate','deploy'],env);
  const available=await pg.query("SELECT '[1,2]'::vector <=> '[1,2]'::vector AS distance");
  assert.equal(available.rows[0].distance,0);
  await run('node_modules/tsx/dist/cli.mjs',['server/seed.ts'],env);
  const rows=await pg.query("SELECT id FROM records WHERE kind='events'");
  assert.equal(rows.rows.length,4);
  const listener=createServer();
  listener.listen(0,'127.0.0.1');await once(listener,'listening');
  const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
  app=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...env,HOST:'127.0.0.1',PORT:String(port)},stdio:'inherit'});
  const api='http://127.0.0.1:'+port+'/api';
  let ready=false;
  for(let n=0;n<100;n++){try{ready=(await fetch(api+'/health')).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert(ready);
  const auth=await fetch(api+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'aman.singhal@campussaathi.edu',password:'CampusDemo!26'})});
  assert.equal(auth.status,200);
  const cookie=auth.headers.get('set-cookie').split(';')[0];
  const dashboard=await fetch(api+'/dashboard',{headers:{Cookie:cookie}});
  assert.equal(dashboard.status,200);
  assert.equal((await dashboard.json()).attendance,86);
  const task=await fetch(api+'/tasks',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{"title":"PostgreSQL persisted task"}'});
  assert.equal(task.status,201);
  const record=await pg.query("SELECT data FROM records WHERE kind='tasks' AND id=$1",[(await task.json()).id]);
  assert.equal(JSON.parse(record.rows[0].data).title,'PostgreSQL persisted task');
  console.log('PostgreSQL integration passed (Prisma migration, pgvector, seed, sessions, dashboard, persistence).');
} finally {
  if(app && app.exitCode===null){const exited=once(app,'exit');app.kill();await exited;}
  await socket.stop();
  await pg.close();
}

