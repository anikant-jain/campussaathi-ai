import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads';
import { resolve } from 'node:path';
import type { SQLInputValue } from 'node:sqlite';

type ResultRow = Record<string,string|number|bigint|null|Uint8Array>;
export function connectPostgres() {
  const {port1,port2}=new MessageChannel();
  const worker=new Worker(resolve('server/postgres-worker.cjs'),{workerData:{port:port2},transferList:[port2]});
  worker.unref();port1.unref();
  worker.on('error',error=>{console.error('Database worker stopped:',error.message);process.exitCode=1;});
  function request(method:string,sql:string,parameters: SQLInputValue[]=[]): any {
    const signal=new Int32Array(new SharedArrayBuffer(4));
    port1.postMessage({method,sql,parameters,signal});
    if(Atomics.wait(signal,0,0,20000)==='timed-out'){
      void worker.terminate();
      throw new Error('PostgreSQL connection timed out. Restart the server once the database is reachable.');
    }
    const result=receiveMessageOnPort(port1)?.message;
    if (!result || result.error) throw new Error(result?.error || 'PostgreSQL returned no result');
    return result.value;
  }
  return {
    exec(sql:string){return request('exec',sql);},
    prepare(sql:string){
      return {
        all:(...values:SQLInputValue[])=> request('all',sql,values) as ResultRow[],
        get:(...values:SQLInputValue[])=> request('all',sql,values)[0] as ResultRow|undefined,
        run:(...values:SQLInputValue[])=>({changes:request('run',sql,values)}),
      };
    },
  };
}

