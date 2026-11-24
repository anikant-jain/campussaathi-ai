import { Router } from 'express';
import nodemailer from 'nodemailer';
import type { Account } from './core';
import { accountByEmail, accountById, accountEnabled, allow, atomic, audit, check, checkPassword, clean, cookieOptions, db, demo, demoAccounts, digest, hashPassword, login, now, optional, publicAccount, requireUser, roles, saveAccount, sessionCookie, sessionValue, token, uid, choice, get, save, list } from './core';

export const auth = Router();
const email = (value: unknown) => {
  const result = clean(value, 'Email', 254).toLowerCase();
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result), 'Enter a valid email.');
  return result;
};
function password(value: unknown) {
  const result = clean(value, 'Password', 128);
  check(result.length >= 10, 'Use at least ten characters for your password.');
  return result;
}
const dummyHash = hashPassword(token());
auth.get('/demo-users', (_req, res) => res.json(demo ? demoAccounts.map(({ name, email, role }) => ({ name, email, role })) : []));
auth.get('/me', requireUser, (req, res) => res.json(publicAccount(req.account!)));
auth.post('/login', (req, res) => {
  const account = accountByEmail(email(req.body.email));
  const valid = checkPassword(clean(req.body.password, 'Password', 128), account?.password || dummyHash);
  check(valid && account && accountEnabled(account), 'Email or password is incorrect.', 401);
  res.json(login(res, account));
});
auth.post('/register', (req, res) => {
  const address = email(req.body.email);
  check(!accountByEmail(address), 'Email is already registered.', 409);
  const account = saveAccount({ id: uid(), email: address, name: clean(req.body.name, 'Name'), role: 'student', password: hashPassword(password(req.body.password)), createdAt: now() });
  res.status(201).json(login(res, account));
});
auth.post('/logout', (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token=?').run(digest(sessionValue(req.headers.cookie)));
  res.clearCookie(sessionCookie, cookieOptions).json({ ok: true });
});
const smtp=process.env.SMTP_HOST && process.env.PUBLIC_ORIGIN && nodemailer.createTransport({
  host:process.env.SMTP_HOST, port:Number(process.env.SMTP_PORT||587), secure:process.env.SMTP_PORT==='465',
  auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,
  connectionTimeout:10000,socketTimeout:15000,
});
auth.post('/forgot-password', (req, res) => {
  const account = accountByEmail(email(req.body.email));
  const reset = token();
  if (account) atomic(() => {
    db.prepare('DELETE FROM resets WHERE user_id=? OR expires<=?').run(account.id, Date.now());
    db.prepare('INSERT INTO resets VALUES (?,?,?)').run(digest(reset), account.id, Date.now() + 1800000);
  });
  if (demo && account) return res.json({ resetToken: reset, message: 'Local demo reset link is ready.' });
  if (smtp) {
    if (account) {
      const link=new URL('/reset-password',process.env.PUBLIC_ORIGIN);
      link.searchParams.set('token',reset);
      void smtp.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:account.email,subject:'CampusSaathi password reset',text:'Reset your password within 30 minutes: '+link.href}).catch(()=>console.error('Password reset email delivery failed.'));
    }
    return res.json({message:'If the address is registered, a reset link will be sent.'});
  }
  res.json({ message: 'Contact campus support to verify your identity and request a password reset.' });
});
auth.post('/reset-password', (req, res) => {
  const key = digest(clean(req.body.token, 'Reset token', 100));
  const replacement = password(req.body.password);
  atomic(() => {
    const record = db.prepare('SELECT user_id FROM resets WHERE token=? AND expires>?').get(key, Date.now());
    check(record, 'The reset link has expired or already been used.', 410);
    const account = accountById(String(record.user_id))!;
    saveAccount({ ...account, password: hashPassword(replacement) });
    db.prepare('DELETE FROM resets WHERE user_id=?').run(account.id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(account.id);
  });
  res.json({ ok: true });
});
export const users = Router();
users.get('/profile', (req, res) => res.json(publicAccount(req.account!)));
users.patch('/profile', (req, res) => {
  const account = { ...req.account! };
  if (req.body.name !== undefined) account.name = clean(req.body.name, 'Name');
  for (const field of ['skills','interests','goals','section','semester','academicYear','enrollment','department']) {
    if (req.body[field] === undefined) continue;
    // Academic cohort is provisioned by campus staff.
    if (!['skills','interests','goals'].includes(field)) continue;
    account[field] = optional(req.body[field], field, 1200);
  }
  if (req.body.avatar !== undefined) {
    const avatar = optional(req.body.avatar, 'Profile image', 600000);
    check(!avatar || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(avatar), 'Choose a PNG, JPEG, or WebP image.');
    account.avatar = avatar;
  }
  res.json(publicAccount(saveAccount(account)));
});
users.get('/preferences', (req, res) => res.json(get('preferences', req.account!.id) || { muted: false }));
users.put('/preferences', (req, res) => {
  check(typeof req.body.muted === 'boolean', 'Choose a notification preference.');
  res.json(save('preferences', { id: req.account!.id, owner: req.account!.id, muted: req.body.muted }));
});
export const adminUsers = Router();
adminUsers.use(allow('admin'));
adminUsers.get('/', (_req, res) => res.json(list('audit')));
adminUsers.patch('/:id', (req, res) => {
  const account = accountById(req.params.id);
  check(account, 'Account not found.', 404);
  check(account.id !== req.account!.id, 'Another administrator must edit your campus role.');
  const role = req.body.role === undefined ? account.role : choice(req.body.role, roles, 'role');
  const result = atomic(() => {
    const updated: Account = { ...account, role };
    for (const field of ['department','section','semester','academicYear','enrollment']) if (req.body[field] !== undefined) updated[field] = optional(req.body[field], field);
    saveAccount(updated);
    if (role !== account.role) db.prepare('DELETE FROM sessions WHERE user_id=?').run(account.id);
    audit(req.account!.id, 'Updated account', account.id);
    return publicAccount(updated);
  });
  res.json(result);
});
adminUsers.post('/:id/reset', (req, res) => {
  const account = accountById(req.params.id);
  check(account, 'Account not found.', 404);
  const reset = token();
  atomic(() => {
    db.prepare('DELETE FROM resets WHERE user_id=?').run(account.id);
    db.prepare('INSERT INTO resets VALUES (?,?,?)').run(digest(reset), account.id, Date.now() + 1800000);
    audit(req.account!.id, 'Issued password reset', account.id);
  });
  res.json({ resetToken: reset });
});

