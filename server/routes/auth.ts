import { Router, Request, Response } from 'express';
import { User, Role } from '../../src/types';

const router = Router();

export const DEMO_USERS: Record<Role, User> = {
  student: {
    id: 'STU-1029',
    name: 'Aman Singhal',
    email: 'aman.singhal@campussaathi.edu',
    role: 'student',
    hostelBlock: 'Block B',
    roomNumber: '214',
    phone: '+91 98765 43210'
  },
  faculty: {
    id: 'FAC-201',
    name: 'Dr. Ramesh Chandra',
    email: 'r.chandra@campussaathi.edu',
    role: 'faculty',
    department: 'academic_admin',
    phone: '+91 98111 22334'
  },
  admin: {
    id: 'ADM-001',
    name: 'Prof. S. K. Mahajan (Dean Student Welfare)',
    email: 'dean.welfare@campussaathi.edu',
    role: 'admin',
    phone: '+91 99999 88888'
  }
};

// GET current demo users
router.get('/demo-users', (req: Request, res: Response) => {
  res.json({ success: true, data: DEMO_USERS });
});

// POST Login
router.post('/login', (req: Request, res: Response) => {
  const { role = 'student', email } = req.body;
  const user = DEMO_USERS[role as Role] || {
    id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
    name: email ? email.split('@')[0] : 'Campus User',
    email: email || 'user@campussaathi.edu',
    role: role as Role
  };

  res.json({
    success: true,
    user,
    token: `cs-token-${role}-${Date.now()}`
  });
});

export default router;
