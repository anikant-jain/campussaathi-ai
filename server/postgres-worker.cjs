const { workerData } = require('node:worker_threads');
const { PrismaClient } = require('@prisma/client');

const port = workerData.port;
const client = new PrismaClient();
let transaction;
function respond(job, value, error) {
  port.postMessage({ value, error: error ? String(error.message || error) : undefined });
  Atomics.store(job.signal, 0, 1);
  Atomics.notify(job.signal, 0);
}
const rollback = Symbol('rollback');
function start(job) {
  let finish;
  const holding = new Promise(resolve => { finish = resolve; });
  const state = { finish, connection: undefined, result: undefined };
  transaction = state;
  state.result = client.$transaction(async connection => {
    // Serialize multi-record writes across app processes, including capacity and stock checks.
    await connection.$queryRawUnsafe('SELECT pg_advisory_xact_lock(510329)::text AS lock');
    state.connection = connection;
    respond(job, true);
    if ((await holding) === false) throw rollback;
  }, { maxWait: 9000, timeout: 18000 }).catch(error => {
    if (error === rollback) return;
    if (!state.connection) { transaction = undefined; respond(job, null, error); }
    else return error;
  });
}
port.on('message', async job => {
  try {
    if (job.sql === 'BEGIN IMMEDIATE') return start(job);
    if (job.sql === 'COMMIT' || job.sql === 'ROLLBACK') {
      if (!transaction) throw new Error('No PostgreSQL transaction is open');
      const state = transaction;
      transaction = undefined;
      state.finish(job.sql === 'COMMIT');
      const error = await state.result;
      return respond(job, true, error);
    }
    let index = 0;
    const sql = job.sql.replace(/ORDER BY rowid DESC/g, 'ORDER BY seq DESC').replace(/\?/g, () => '$' + (++index));
    const connection = transaction?.connection || client;
    const values = job.parameters.map(value => value instanceof Uint8Array ? Buffer.from(value) : value);
    const result = job.method === 'all'
      ? await connection.$queryRawUnsafe(sql, ...values)
      : await connection.$executeRawUnsafe(sql, ...values);
    respond(job, result);
  } catch (error) { respond(job, null, error); }
});

