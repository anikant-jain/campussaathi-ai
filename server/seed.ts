import 'dotenv/config';
import { check, clean, accountByEmail, demo, hashPassword, now, saveAccount, seed, uid } from './core';

if (process.argv.includes('--admin')) {
  const email=clean(process.env.INIT_ADMIN_EMAIL,'INIT_ADMIN_EMAIL',254).toLowerCase();
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'INIT_ADMIN_EMAIL must be an email address');
  const password=clean(process.env.INIT_ADMIN_PASSWORD,'INIT_ADMIN_PASSWORD',128);
  check(password.length>=14,'INIT_ADMIN_PASSWORD must have at least 14 characters');
  check(!accountByEmail(email),'An account with this email already exists');
  saveAccount({id:uid(),email,name:clean(process.env.INIT_ADMIN_NAME || 'Campus Administrator','Administrator name'),role:'admin',password:hashPassword(password),createdAt:now()});
  console.log('Administrator created.');
} else {
  check(demo,'Demo seeding is disabled outside local demo mode.');
  seed();
  console.log('Fictional campus data is ready.');
}

