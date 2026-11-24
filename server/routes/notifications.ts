import { Router, Request, Response } from 'express';
import { storage } from '../services/storage';

const router = Router();

// GET all notifications
router.get('/', (req: Request, res: Response) => {
  try {
    const notifications = storage.getNotifications();
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH mark notification read
router.patch('/:id/read', (req: Request, res: Response) => {
  try {
    const ok = storage.markNotificationAsRead(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST mark all read
router.post('/mark-all-read', (req: Request, res: Response) => {
  try {
    storage.markAllNotificationsAsRead();
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
