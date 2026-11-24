import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Server } from 'socket.io';
import { auth, users, adminUsers } from './accountRoutes';
import { academics } from './academic';
import { assistant } from './assistant';
import { authenticate, demo, HttpError, requireUser, seed, sessionValue, setEmitter } from './core';
import { documents } from './documents';
import { operations } from './operations';
import { scanReminders } from './reminders';
import { practice } from './practice';
import { careers } from './careers';

seed();
const app=express();
const server=createServer(app);
const production=process.env.NODE_ENV==='production';
const trustProxy=Number(process.env.TRUST_PROXY_HOPS || 0);
if (trustProxy>0) app.set('trust proxy',trustProxy);
const origin=process.env.PUBLIC_ORIGIN?.replace(/\/$/,'');
const socket=new Server(server,{
  allowRequest:(req,done)=>done(null,!req.headers.origin || req.headers.origin===origin || !production&&/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.origin)),
});
socket.use((client,next)=>{
  const user=authenticate(sessionValue(client.request.headers.cookie));
  if (!user) return next(new Error('Sign in to continue.'));
  client.data.userId=user.id;
  next();
});
socket.on('connection',client=>client.join('user:'+client.data.userId));
setEmitter(user=>{
  for (const id of socket.sockets.adapter.rooms.get('user:'+user)||[]) {
    const client=socket.sockets.sockets.get(id);
    if (!client) continue;
    if (authenticate(sessionValue(client.request.headers.cookie))?.id===user) client.emit('notifications:changed');
    else client.disconnect(true);
  }
});
app.disable('x-powered-by');
app.use((req,res,next)=>{
  res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'microphone=(self), camera=(), geolocation=()'});
  if (!production) return next();
  res.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' wss:; object-src 'none'; frame-src 'self'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'");
  next();
});
app.get('/api/health',(_req,res)=>res.json({status:'ok',demo,database:process.env.DATABASE_URL?'postgresql':'sqlite'}));
const buckets=new Map<string,{count:number;expires:number}>();
const cleanup=setInterval(()=>{for (const [key,state] of buckets) if(state.expires<Date.now()) buckets.delete(key);},60000);
cleanup.unref();
app.use('/api',(req,res,next)=>{
  res.set('Cache-Control','no-store');
  if (req.method!=='GET'&&req.method!=='HEAD') {
    const requestOrigin=req.get('origin');
    const host=req.get('host');
    const sameHost=requestOrigin===req.protocol+'://'+host;
    if (req.get('sec-fetch-site')==='cross-site'||requestOrigin&&requestOrigin!==origin&&!sameHost&&(production||!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin))) return next(new HttpError(403,'Request origin is not allowed.'));
    if (!req.is('application/json')&&!req.is('multipart/form-data')&&Number(req.get('content-length')||0)>0) return next(new HttpError(415,'Use JSON or multipart form data.'));
  }
  req.account=authenticate(sessionValue(req.headers.cookie));
  const sensitive=/^\/auth\/(login|forgot-password|register|reset-password)$/.test(req.path);
  const ai=/^\/(ai|careers)\/|^\/practice\/draft$|^\/complaints(?:\/preview)?$/.test(req.path)&&req.method==='POST';
  const key=(sensitive?'auth:':ai?'ai:':'api:')+(sensitive?req.ip:req.account?.id||req.ip);
  const time=Date.now();
  const current=buckets.get(key);
  const bucket=current&&current.expires>time?current:{count:0,expires:time+(sensitive?900000:60000)};
  bucket.count++;
  buckets.set(key,bucket);
  if(bucket.count>(sensitive?16:ai?24:250)){
    res.set('Retry-After',String(Math.ceil((bucket.expires-time)/1000)));
    return next(new HttpError(429,'Too many requests. Try again shortly.'));
  }
  next();
});
app.use('/api',express.json({limit:'3mb'}));
app.use('/api/auth',auth);
app.use('/api',requireUser);
app.use('/api/users',users);
app.use('/api/admin/audit',adminUsers);
app.use('/api/admin/users',adminUsers);
app.use('/api/documents',documents);
app.use('/api/ai',assistant);
app.use('/api/practice',practice);
app.use('/api/careers',careers);
app.use('/api',academics,operations);
app.use('/api',(_req,_res,next)=>next(new HttpError(404,'API route not found.')));
const frontend=resolve('dist');
if (existsSync(frontend)) {
  app.use(express.static(frontend));
  app.get('*',(_req,res)=>res.sendFile(resolve(frontend,'index.html')));
}
app.use((error: any,_req: express.Request,res: express.Response,_next: express.NextFunction)=>{
  if (res.headersSent) return res.end();
  const status=error instanceof HttpError?error.status:error.code==='LIMIT_FILE_SIZE'?413:error.name==='MulterError'?400:Number.isInteger(error.status)&&error.status>=400&&error.status<500?error.status:500;
  if(status>=500 && !(error instanceof HttpError)) console.error(error);
  res.status(status).json({message:error instanceof HttpError?error.message:status===413?'This file or request is too large.':status===400?'Invalid request body or attachment.':'The request could not be completed.'});
});
const port=Number(process.env.PORT||5000);
if (!Number.isInteger(port)||port<1||port>65535) throw new Error('PORT must be a valid TCP port.');
server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log('CampusSaathi API listening on '+port));
if (process.env.ENABLE_REMINDERS !== 'false') {
  const scan=()=>{try{scanReminders();}catch(error){console.error('Reminder scan failed.',error);}};
  const reminders=setInterval(scan,60000);
  reminders.unref();
}

