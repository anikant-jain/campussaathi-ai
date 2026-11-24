import { Router, Request, Response } from 'express';
import { storage } from '../services/storage';

const router = Router();

// GET all departments with live statistics
router.get('/', (req: Request, res: Response) => {
  try {
    const departments = storage.getDepartments();
    const tickets = storage.getTickets();

    const deptsWithStats = departments.map(d => {
      const deptTickets = tickets.filter(t => t.department === d.id);
      const pendingCount = deptTickets.filter(t => t.status !== 'resolved').length;
      const resolvedCount = deptTickets.filter(t => t.status === 'resolved').length;
      const criticalCount = deptTickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length;

      return {
        ...d,
        totalTickets: deptTickets.length,
        pendingTickets: pendingCount,
        resolvedTickets: resolvedCount,
        criticalTickets: criticalCount
      };
    });

    res.json({ success: true, count: deptsWithStats.length, data: deptsWithStats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
