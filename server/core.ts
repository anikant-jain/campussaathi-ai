import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { HACKATHON_DEMO_TICKETS, INITIAL_DEPARTMENTS } from './data/demo_seed';
import { connectPostgres } from './postgres';

export const demo = process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE !== 'false';
if (process.env.NODE_ENV === 'production' && (process.env.SESSION_SECRET?.length ?? 0) < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
export const roles = ['student', 'faculty', 'admin', 'librarian', 'placement'] as const;
export type Role = typeof roles[number];
export type Row = { id: string; owner?: string; [key: string]: any };
export type Account = Row & { name: string; email: string; role: Role; password: string };
declare global { namespace Express { interface Request { account?: Account } } }

export const postgres = Boolean(process.env.DATABASE_URL);
if (postgres && !/^postgres(?:ql)?:\/\//.test(process.env.DATABASE_URL!)) throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
const dbFile = process.env.CAMPUS_DB || resolve('server/data/campus.sqlite');
if (!postgres && dbFile !== ':memory:') mkdirSync(dirname(dbFile), { recursive: true });
export const db = postgres ? connectPostgres() : new DatabaseSync(dbFile);
if (postgres) db.prepare('SELECT 1 FROM accounts LIMIT 1').all();
else db.exec(`
  PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS resets(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL, id TEXT NOT NULL, owner TEXT, data TEXT NOT NULL, PRIMARY KEY(kind,id));
  CREATE INDEX IF NOT EXISTS records_owner ON records(kind,owner);
  CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, content BLOB NOT NULL);
`);
export const uid = (): string => randomUUID();
export const now = () => new Date().toISOString();
export const token = () => randomBytes(32).toString('base64url');
export const digest = (s: string) => createHash('sha256').update(s).update(process.env.SESSION_SECRET || '').digest('hex');
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hash, 'hex'));
}
export const publicAccount = ({ password, ...account }: Account) => account;
const decode = <T>(value: any): T | undefined => value ? JSON.parse(String(value.data)) : undefined;
export const accountByEmail = (email: string) => decode<Account>(db.prepare('SELECT data FROM accounts WHERE email=?').get(email));
export const accountById = (id: string) => decode<Account>(db.prepare('SELECT data FROM accounts WHERE id=?').get(id));
export const accounts = () => db.prepare('SELECT data FROM accounts ORDER BY email').all().map(row => decode<Account>(row)!);
export function saveAccount(account: Account) {
  db.prepare('INSERT INTO accounts(id,email,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,data=excluded.data').run(account.id, account.email, JSON.stringify(account));
  return account;
}
export function list(kind: string, owner?: string): Row[] {
  const rows = owner === undefined
    ? db.prepare('SELECT data FROM records WHERE kind=? ORDER BY rowid DESC').all(kind)
    : db.prepare('SELECT data FROM records WHERE kind=? AND owner=? ORDER BY rowid DESC').all(kind, owner);
  return rows.map(row => decode<Row>(row)!);
}
export const get = (kind: string, id: string) => decode<Row>(db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind, id));
export function save(kind: string, row: Row) {
  db.prepare('INSERT INTO records(kind,id,owner,data) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET owner=excluded.owner,data=excluded.data')
    .run(kind, row.id, row.owner || null, JSON.stringify(row));
  return row;
}
export const remove = (kind: string, id: string) => db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind,id);
export function atomic<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function check(ok: unknown, message: string, status = 400): asserts ok {
  if (!ok) throw new HttpError(status, message);
}
export function clean(value: unknown, label: string, max = 200) {
  check(typeof value === 'string' && value.trim().length > 0 && value.length <= max, label + ' is required (maximum ' + max + ' characters).');
  return value.trim();
}
export const optional = (value: unknown, label: string, max = 200) => value === undefined || value === '' ? '' : clean(value, label, max);
export function date(value: unknown, label: string) {
  const input = clean(value, label, 40);
  const parsed = new Date(input);
  check(!Number.isNaN(+parsed), 'Enter a valid ' + label.toLowerCase() + '.');
  return parsed.toISOString();
}
export function integer(value: unknown, label: string, min: number, max: number) {
  const n = Number(value);
  check(value !== '' && value !== null && Number.isInteger(n) && n >= min && n <= max, label + ' must be between ' + min + ' and ' + max + '.');
  return n;
}
export function choice<T extends string>(value: unknown, values: readonly T[], label: string): T {
  check(typeof value === 'string' && values.includes(value as T), 'Select a valid ' + label + '.');
  return value as T;
}
export function own(kind: string, id: string, owner: string) {
  const row = get(kind, id);
  check(row && row.owner === owner, 'Record not found.', 404);
  return row;
}
export const sessionCookie = 'campus_session';
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export function sessionValue(header = '') {
  return header.split(';').map(part => part.trim()).find(part => part.startsWith(sessionCookie + '='))?.slice(sessionCookie.length + 1) || '';
}
export function authenticate(raw: string) {
  if (!raw || raw.length > 100) return;
  const session = db.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(digest(raw), Date.now());
  const account=session && accountById(String(session.user_id));
  return account && accountEnabled(account) ? account : undefined;
}
export function login(res: Response, account: Account) {
  const raw = token();
  const ttl = 7 * 86400000;
  db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(raw), account.id, Date.now() + ttl);
  res.cookie(sessionCookie, raw, { ...cookieOptions, maxAge: ttl });
  return publicAccount(account);
}
export function requireUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.account) return next(new HttpError(401, 'Sign in to continue.'));
  next();
}
export const allow = (...allowed: Role[]) => (req: Request, _res: Response, next: NextFunction) =>
  req.account && allowed.includes(req.account.role) ? next() : next(new HttpError(403, 'Your role cannot perform this action.'));
export const audit = (actor: string, action: string, subject: string) =>
  save('audit', { id: uid(), owner: actor, action, subject, createdAt: now() });
export let emitNotification: (userId: string) => void = () => {};
export function setEmitter(fn: typeof emitNotification) { emitNotification = fn; }
export function notify(owner: string, title: string, message: string, category = 'Campus') {
  if (get('preferences', owner)?.muted === true && category !== 'Complaints') return;
  const row = save('notifications', { id: uid(), owner, title, message, category, createdAt: now(), read: false });
  emitNotification(owner);
  return row;
}
export const demoAccounts = [
  { id: 'STU-1029', name: 'Aman Singhal', email: 'aman.singhal@campussaathi.edu', role: 'student' as const, department: 'Computer Science', enrollment: 'CS-2026-029', semester: '5', section: 'A', academicYear: '2026–27', skills: 'Python, JavaScript', interests: 'AI, design, coding', goals: 'Software engineering' },
  { id: 'FAC-201', name: 'Dr. Ramesh Chandra', email: 'r.chandra@campussaathi.edu', role: 'faculty' as const, department: 'Computer Science' },
  { id: 'ADM-001', name: 'S. K. Mahajan', email: 'dean.welfare@campussaathi.edu', role: 'admin' as const },
  { id: 'LIB-001', name: 'Neha Kapoor', email: 'library@campussaathi.edu', role: 'librarian' as const },
  { id: 'PLC-001', name: 'Meera Nair', email: 'placements@campussaathi.edu', role: 'placement' as const },
];
export const demoPassword = 'CampusDemo!26';
export const accountEnabled=(account:Account)=>demo || !demoAccounts.some(person=>person.id===account.id);
const day = (offset: number, hour = 10, minute = 0) => {
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  target.setDate(target.getDate() + offset);
  return target.toISOString();
};
export const buildings: Row[] = [
  { id: 'gate', title: 'Main Gate', x: 57, y: 252, description: 'Visitor entry and security desk', floor: 'Ground' },
  { id: 'tech', title: 'Technology Block', x: 166, y: 88, description: 'Computer Science department, classrooms and CS laboratory', floor: 'Ground · Level 1 · Level 2', rooms: ['Room 204', 'CS Laboratory', 'Accessible washroom'] },
  { id: 'library', title: 'Central Library', x: 315, y: 104, description: 'Library, study rooms and digital resources', floor: 'Ground · Level 1', rooms: ['Reading Hall', 'Digital Lab'] },
  { id: 'admin', title: 'Administration', x: 111, y: 175, description: 'Registrar, fees office and student services', floor: 'Ground · Level 1' },
  { id: 'cafe', title: 'Campus Cafeteria', x: 265, y: 232, description: 'Dining hall and student commons', floor: 'Ground' },
  { id: 'auditorium', title: 'Auditorium', x: 407, y: 173, description: 'Seminars, performances and workshops', floor: 'Ground' },
  { id: 'clinic', title: 'Medical Room', x: 407, y: 272, description: 'Campus health and first aid', floor: 'Ground' },
  { id: 'parking', title: 'Visitor Parking', x: 105, y: 310, description: 'Accessible parking and visitor drop-off', floor: 'Ground' },
];
export const edges: [string, string, number, boolean][] = [
  ['gate','admin',110,true],['gate','parking',75,true],['admin','tech',126,true],['tech','library',166,true],['library','auditorium',136,true],
  ['admin','cafe',180,true],['cafe','auditorium',162,true],['cafe','clinic',156,true],['auditorium','clinic',106,true],['tech','cafe',139,false],
];
export function seed() {
  if (!demo || get('meta', 'demo-v1')) return;
  atomic(() => {
    for (const account of demoAccounts) if (!accountByEmail(account.email)) saveAccount({ ...account, password: hashPassword(demoPassword) });
    const legacyPath = process.env.DATA_PATH || 'server/data/db.json';
    const legacy = existsSync(legacyPath) ? JSON.parse(readFileSync(legacyPath, 'utf8')) : {};
    for (const item of legacy.departments || INITIAL_DEPARTMENTS) save('departments', { ...item, title: item.name });
    for (const item of legacy.tickets || HACKATHON_DEMO_TICKETS) save('complaints', { ...item, owner: item.userId });
    for (const item of legacy.notifications || []) if (demoAccounts.some(account => account.id === item.userId)) save('notifications', { ...item, owner: item.userId, createdAt: item.timestamp });
    for (const item of legacy.reports || []) save('reports', item);
    const add = (kind: string, id: string, item: Record<string, unknown>) => save(kind, { id, ...item });
    const owner = 'STU-1029';
    const base = { facultyId: 'FAC-201', department: 'Computer Science', section: 'A', semester: '5', status: 'scheduled' };
    for (const [index, name] of ['Data Structures','Operating Systems','Database Management','Computer Networks','Software Engineering'].entries()) {
      add('subjects', 'subject-' + index, { title: name, facultyId: 'FAC-201', department: 'Computer Science' });
      for (let a = 0; a < 10; a++) add('attendance', 'att-' + index + '-' + a, { owner, subject: name, present: a < [9,8,9,8,9][index], createdAt: day(-a - 1) });
    }
    for (const [i, [title, room, hour, minute]] of [['Data Structures','Room 204',9,0],['Operating Systems Lab','CS Lab 2',11,0],['Database Management','Room 301',14,0]].entries()) {
      for (const offset of [0,1,3,6]) add('timetable', 'class-' + i + '-' + offset, { ...base, title, room, startsAt: day(offset, Number(hour), Number(minute)), endsAt: day(offset, Number(hour) + 1), faculty: 'Dr. Ramesh Chandra' });
    }
    for (const [i,[title,subject]] of [['Binary Search Tree Visualizer','Data Structures'],['Process Scheduling Report','Operating Systems'],['Normalization Case Study','Database Management']].entries()) {
      add('assignments','assignment-'+i,{...base,title,subject,description:'Submit a short report and explain your approach with examples.',dueAt:day(i+2,17)});
    }
    add('exams','exam-1',{...base,title:'Data Structures Midterm',subject:'Data Structures',startsAt:day(8,9),room:'Room 204',description:'Trees, graphs, sorting and time complexity.'});
    add('exams','exam-2',{...base,title:'Operating Systems Practical',subject:'Operating Systems',startsAt:day(12,11),room:'CS Lab 2',description:'Processes, scheduling and synchronization.'});
    const eventSeed = [
      ['Build for Bharat 2026','Hackathons','Innovation Cell','48 hours to build something that matters. Bring a team or find one at the kickoff.',3,'Innovation Lab',90],
      ['Design Systems Workshop','Workshops','Design Club','Design reusable components and put a small interface together with your peers.',5,'Studio B',30],
      ['Campus Cultural Night','Cultural events','Cultural Council','Music, dance, theatre and showcases from across campus.',9,'Auditorium',180],
      ['Campus Coding League','Coding competitions','Coding Club','A timed problem-solving session followed by solution discussions.',11,'CS Lab 2',45],
    ] as const;
    eventSeed.forEach(([title,category,organizer,description,offset,room,capacity],i)=>add('events','event-'+i,{title,category,organizer,description,startsAt:day(offset,16),room,capacity,status:'published',code:token().slice(0,12)}));
    const bookSeed = [
      ['Introduction to Algorithms','Thomas H. Cormen et al.','Computer Science','Algorithms and data structures'],
      ['Python Crash Course','Eric Matthes','Programming','Python fundamentals and projects'],
      ['Designing Data-Intensive Applications','Martin Kleppmann','Systems','Practical architecture for reliable data systems'],
      ['Operating System Concepts','Abraham Silberschatz et al.','Systems','Processes, memory and deadlocks'],
      ['The Design of Everyday Things','Don Norman','Design','Human-centered product design'],
      ['Database System Concepts','Abraham Silberschatz et al.','Computer Science','Relational models, SQL, and database architecture'],
    ];
    bookSeed.forEach(([title,author,category,description],i)=>add('books','book-'+i,{title,author,category,description,copies: i === 2 ? 1 : 3}));
    add('loans','loan-1',{owner,bookId:'book-2',title:bookSeed[2][0],createdAt:day(-4),dueAt:day(4),status:'issued'});
    add('placements','job-1',{title:'Software Engineering Intern',company:'Northstar Labs',description:'Build TypeScript services and collaborate on data-intensive tools. Python and REST experience helpful.',dueAt:day(6),location:'Bengaluru · Hybrid',status:'published'});
    add('placements','job-2',{title:'Product Design Intern',company:'Fieldnote Studio',description:'Work on research, design systems, and accessible digital products.',dueAt:day(10),location:'Remote',status:'published'});
    add('tasks','task-1',{owner,title:'Review graph traversal notes',dueAt:day(1),done:false,createdAt:day(0)});
    add('tasks','task-2',{owner,title:'Complete SQL practice set',dueAt:day(0),done:true,createdAt:day(-1),completedAt:day(0)});
    add('announcements','announcement-1',{title:'Welcome to the campus workspace',description:'Your timetable, library and campus services are available in one place.',createdAt:day(0)});
    for (const [i,item] of [['Design Systems Workshop registrations are open','Find the workshop in Campus Events.'],['Library loan due soon','Designing Data-Intensive Applications is due later this week.'],['Midterm timetable published','Check Exams for your upcoming dates.']].entries()) {
      add('notifications','notice-'+i,{owner,title:item[0],message:item[1],createdAt:day(-i),category:'Campus',read:i===2});
    }
    for (const building of buildings) save('buildings', building);
    for (const [id, a] of edges.entries()) add('edges', 'edge-'+id, { from:a[0],to:a[1],distance:a[2],accessible:a[3] });
    add('meta','demo-v1',{createdAt:now()});
  });
}

