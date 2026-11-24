export type Role = 'student' | 'faculty' | 'admin';

export type DepartmentId =
  | 'it_support'
  | 'electrical'
  | 'civil_maintenance'
  | 'hostel_management'
  | 'library'
  | 'transport'
  | 'academic_admin'
  | 'security'
  | 'housekeeping';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type TicketStatus =
  | 'submitted'
  | 'ai_analyzed'
  | 'assigned'
  | 'in_progress'
  | 'resolved';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: DepartmentId;
  hostelBlock?: string;
  roomNumber?: string;
  phone?: string;
}

export interface Department {
  id: DepartmentId;
  name: string;
  description: string;
  headName: string;
  headEmail: string;
  staffCount: number;
  slaHours: number;
  icon: string;
}

export interface AIAnalysis {
  originalLanguage: 'Hindi' | 'English' | 'Hinglish' | 'Other';
  translatedText: string;
  category: string;
  recommendedDepartment: DepartmentId;
  priority: Priority;
  summary: string;
  recommendedAction: string;
  suggestedReply: string;
  confidence: number; // 0 - 100
  isLiveAi: boolean; // true if returned by Gemini, false if demo/heuristic
  visualFindings?: string;
  sentiment?: 'frustrated' | 'urgent' | 'neutral' | 'calm';
}

export interface TicketTimelineEvent {
  id: string;
  status: TicketStatus;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
}

export interface Ticket {
  id: string; // e.g. CS-2026-1042
  title: string;
  originalDescription: string;
  inputMode: 'text' | 'voice' | 'image' | 'multimodal';
  language: 'Hindi' | 'English' | 'Hinglish';
  imageUrl?: string;
  voiceTranscript?: string;
  voiceAudioUrl?: string;
  
  // AI processing fields
  aiAnalysis: AIAnalysis;
  
  // Operational fields
  department: DepartmentId;
  priority: Priority;
  status: TicketStatus;
  
  // User info
  userId: string;
  userName: string;
  userEmail: string;
  userRole: Role;
  locationDetails?: string;
  
  // Assignment & Resolution
  assignedTo?: string;
  assignedStaffEmail?: string;
  adminReplyDraft?: string;
  adminReplySent?: string;
  adminNotes?: string;
  resolutionRemarks?: string;
  resolvedAt?: string;
  
  // Timestamps & Timeline
  createdAt: string;
  updatedAt: string;
  timeline: TicketTimelineEvent[];
}

export interface NotificationItem {
  id: string;
  userId?: string; // or 'all' / 'admin'
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'urgent';
  ticketId?: string;
  timestamp: string;
  read: boolean;
}

export interface CampusInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'cluster' | 'critical';
  title: string;
  description: string;
  recommendedAction: string;
  affectedDepartment: DepartmentId;
  confidence: number;
  ticketCount: number;
  timestamp: string;
}

export interface DailyReport {
  id: string;
  date: string;
  totalComplaints: number;
  resolvedCount: number;
  pendingCount: number;
  criticalCount: number;
  mostReportedIssue: string;
  maxPendingDepartment: string;
  repeatingProblems: string[];
  criticalUnresolvedIssues: string[];
  recommendedActions: string[];
  aiExecutiveSummary: string;
  generatedAt: string;
  isAiGenerated: boolean;
}
