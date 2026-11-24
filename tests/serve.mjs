import { spawn } from 'node:child_process';
const child=spawn(process.execPath,['build-server/index.cjs'],{
  env:{...process.env,NODE_ENV:'test',DEMO_MODE:'true',PORT:process.env.TEST_PORT||'5188',HOST:'127.0.0.1',DATABASE_URL:'',CAMPUS_DB:':memory:',AI_PROVIDER:'demo',ENABLE_REMINDERS:'false'},
  stdio:'inherit',
});
for (const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exitCode=code ?? 1);

