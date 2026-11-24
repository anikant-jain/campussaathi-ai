import { Router, Request, Response } from 'express';
import { storage } from '../services/storage';
import { analyzeComplaintWithGemini } from '../services/gemini';
import { Ticket, TicketStatus, Priority, DepartmentId } from '../../src/types';

const router = Router();

// GET all tickets with optional filter
router.get('/', (req: Request, res: Response) => {
  try {
    let tickets = storage.getTickets();
    const { department, status, priority, search, role, userId } = req.query;

    if (department && department !== 'all') {
      tickets = tickets.filter(t => t.department === department);
    }
    if (status && status !== 'all') {
      tickets = tickets.filter(t => t.status === status);
    }
    if (priority && priority !== 'all') {
      tickets = tickets.filter(t => t.priority === priority);
    }
    if (userId) {
      tickets = tickets.filter(t => t.userId === userId);
    }
    if (search) {
      const q = String(search).toLowerCase();
      tickets = tickets.filter(
        t =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.originalDescription.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.aiAnalysis?.category?.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single ticket
router.get('/:id', (req: Request, res: Response) => {
  try {
    const ticket = storage.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new ticket
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      inputMode = 'text',
      language = 'Hindi',
      imageUrl,
      voiceTranscript,
      userName = 'Student',
      userEmail = 'student@campussaathi.edu',
      userRole = 'student',
      userId = `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      locationDetails = 'Campus Grounds',
      precomputedAnalysis
    } = req.body;

    if (!description && !voiceTranscript) {
      return res.status(400).json({ success: false, message: 'Complaint text or voice transcript is required.' });
    }

    const complaintText = voiceTranscript || description;

    // Run AI analysis if not precomputed
    let aiAnalysis = precomputedAnalysis;
    if (!aiAnalysis) {
      aiAnalysis = await analyzeComplaintWithGemini({
        text: complaintText,
        languageHint: language
      });
    }

    // Auto-generate unique Ticket ID: CS-2026-XXXX
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `CS-2026-${randomNum}`;

    const newTicket: Ticket = {
      id: ticketId,
      title: title || aiAnalysis.summary || 'Campus Complaint',
      originalDescription: complaintText,
      inputMode: inputMode as any,
      language: language as any,
      imageUrl,
      voiceTranscript,
      aiAnalysis,
      department: aiAnalysis.recommendedDepartment as DepartmentId,
      priority: aiAnalysis.priority as Priority,
      status: 'submitted',
      userId,
      userName,
      userEmail,
      userRole,
      locationDetails,
      adminReplyDraft: aiAnalysis.suggestedReply,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        {
          id: `tl-${Date.now()}-1`,
          status: 'submitted',
          title: 'Complaint Registered',
          description: `Submitted by ${userName} via CampusSaathi ${inputMode.toUpperCase()}`,
          actor: userName,
          timestamp: new Date().toISOString()
        },
        {
          id: `tl-${Date.now()}-2`,
          status: 'ai_analyzed',
          title: 'CampusSaathi AI Engine Processed',
          description: `Language: ${aiAnalysis.originalLanguage} | Category: ${aiAnalysis.category} | Routed to: ${aiAnalysis.recommendedDepartment.replace('_', ' ').toUpperCase()} (${aiAnalysis.priority.toUpperCase()} priority, ${aiAnalysis.confidence}% confidence)`,
          actor: 'CampusSaathi AI',
          timestamp: new Date().toISOString()
        }
      ]
    };

    storage.createTicket(newTicket);

    // Create Notification
    storage.createNotification({
      id: `notif-${Date.now()}`,
      title: `New Ticket: ${ticketId}`,
      message: `${userName} reported "${newTicket.title}" (${newTicket.priority.toUpperCase()}) in ${newTicket.department.replace('_', ' ')}`,
      type: newTicket.priority === 'critical' ? 'urgent' : newTicket.priority === 'high' ? 'warning' : 'info',
      ticketId: newTicket.id,
      timestamp: new Date().toISOString(),
      read: false
    });

    res.status(201).json({ success: true, data: newTicket });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH update ticket
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = storage.getTicketById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const {
      status,
      department,
      priority,
      assignedTo,
      assignedStaffEmail,
      adminReplyDraft,
      adminReplySent,
      adminNotes,
      resolutionRemarks,
      actorName = 'Administrator'
    } = req.body;

    const updates: Partial<Ticket> = {};
    const timelineEvents = [...existing.timeline];

    if (department && department !== existing.department) {
      updates.department = department;
      timelineEvents.push({
        id: `tl-${Date.now()}-dept`,
        status: existing.status,
        title: 'Department Reassigned',
        description: `Department changed from ${existing.department} to ${department}`,
        actor: actorName,
        timestamp: new Date().toISOString()
      });
    }

    if (priority && priority !== existing.priority) {
      updates.priority = priority;
      timelineEvents.push({
        id: `tl-${Date.now()}-prio`,
        status: existing.status,
        title: 'Priority Updated',
        description: `Priority manually modified to ${priority.toUpperCase()}`,
        actor: actorName,
        timestamp: new Date().toISOString()
      });
    }

    if (assignedTo && assignedTo !== existing.assignedTo) {
      updates.assignedTo = assignedTo;
      if (assignedStaffEmail) updates.assignedStaffEmail = assignedStaffEmail;
      
      // Auto move status to assigned if currently submitted or ai_analyzed
      if (existing.status === 'submitted' || existing.status === 'ai_analyzed') {
        updates.status = 'assigned';
      }

      timelineEvents.push({
        id: `tl-${Date.now()}-assign`,
        status: 'assigned',
        title: 'Ticket Assigned',
        description: `Assigned to technician/officer: ${assignedTo}`,
        actor: actorName,
        timestamp: new Date().toISOString()
      });
    }

    if (status && status !== existing.status) {
      updates.status = status;
      if (status === 'resolved') {
        updates.resolvedAt = new Date().toISOString();
      }

      const statusLabels: Record<TicketStatus, string> = {
        submitted: 'Ticket Reopened',
        ai_analyzed: 'AI Analysis Confirmed',
        assigned: 'Staff Assigned',
        in_progress: 'Work In Progress',
        resolved: 'Complaint Resolved'
      };

      timelineEvents.push({
        id: `tl-${Date.now()}-status`,
        status: status as TicketStatus,
        title: statusLabels[status as TicketStatus] || 'Status Updated',
        description: resolutionRemarks 
          ? `Status changed to ${status}. Remarks: ${resolutionRemarks}` 
          : `Status updated to ${status} by ${actorName}`,
        actor: actorName,
        timestamp: new Date().toISOString()
      });

      // Send student notification
      storage.createNotification({
        id: `notif-${Date.now()}`,
        userId: existing.userId,
        title: `Ticket ${existing.id} Updated`,
        message: `Your complaint is now "${status.replace('_', ' ').toUpperCase()}". ${resolutionRemarks || ''}`,
        type: status === 'resolved' ? 'success' : 'info',
        ticketId: existing.id,
        timestamp: new Date().toISOString(),
        read: false
      });
    }

    if (adminReplyDraft !== undefined) updates.adminReplyDraft = adminReplyDraft;
    if (adminReplySent !== undefined) {
      updates.adminReplySent = adminReplySent;
      timelineEvents.push({
        id: `tl-${Date.now()}-reply`,
        status: existing.status,
        title: 'Admin Response Sent to Student',
        description: `Official message dispatched: "${adminReplySent}"`,
        actor: actorName,
        timestamp: new Date().toISOString()
      });
    }
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (resolutionRemarks !== undefined) updates.resolutionRemarks = resolutionRemarks;

    updates.timeline = timelineEvents;

    const updated = storage.updateTicket(id, updates);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST Reset to Hackathon Demo dataset
router.post('/demo/reset', (req: Request, res: Response) => {
  try {
    const data = storage.resetToHackathonDemo();
    res.json({
      success: true,
      message: 'Database successfully seeded with Hackathon Demo dataset (3 water, 2 projector, 2 wifi, 1 library, 1 electrical).',
      data
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
