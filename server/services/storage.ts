import fs from 'fs';
import path from 'path';
import { Ticket, Department, NotificationItem, CampusInsight, DailyReport } from '../../src/types';
import { HACKATHON_DEMO_TICKETS, INITIAL_DEPARTMENTS, INITIAL_INSIGHTS, INITIAL_NOTIFICATIONS } from '../data/demo_seed';

interface DatabaseSchema {
  tickets: Ticket[];
  departments: Department[];
  notifications: NotificationItem[];
  insights: CampusInsight[];
  reports: DailyReport[];
  lastUpdated: string;
}

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

class StorageService {
  private db: DatabaseSchema;

  constructor() {
    this.db = this.init();
  }

  private init(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.tickets && parsed.departments) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Storage init fallback to demo seed:', err);
    }

    const initial: DatabaseSchema = {
      tickets: [...HACKATHON_DEMO_TICKETS],
      departments: [...INITIAL_DEPARTMENTS],
      notifications: [...INITIAL_NOTIFICATIONS],
      insights: [...INITIAL_INSIGHTS],
      reports: [],
      lastUpdated: new Date().toISOString()
    };
    this.persist(initial);
    return initial;
  }

  private persist(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write db.json:', err);
    }
  }

  public resetToHackathonDemo(): DatabaseSchema {
    this.db = {
      tickets: JSON.parse(JSON.stringify(HACKATHON_DEMO_TICKETS)),
      departments: JSON.parse(JSON.stringify(INITIAL_DEPARTMENTS)),
      notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
      insights: JSON.parse(JSON.stringify(INITIAL_INSIGHTS)),
      reports: [],
      lastUpdated: new Date().toISOString()
    };
    this.persist(this.db);
    return this.db;
  }

  // Tickets
  public getTickets(): Ticket[] {
    return [...this.db.tickets];
  }

  public getTicketById(id: string): Ticket | undefined {
    return this.db.tickets.find(t => t.id.toLowerCase() === id.toLowerCase());
  }

  public createTicket(ticket: Ticket): Ticket {
    this.db.tickets.unshift(ticket);
    this.db.lastUpdated = new Date().toISOString();
    this.persist(this.db);
    return ticket;
  }

  public updateTicket(id: string, updates: Partial<Ticket>): Ticket | null {
    const idx = this.db.tickets.findIndex(t => t.id.toLowerCase() === id.toLowerCase());
    if (idx === -1) return null;

    const existing = this.db.tickets[idx];
    const updated: Ticket = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.db.tickets[idx] = updated;
    this.db.lastUpdated = new Date().toISOString();
    this.persist(this.db);
    return updated;
  }

  public deleteTicket(id: string): boolean {
    const lenBefore = this.db.tickets.length;
    this.db.tickets = this.db.tickets.filter(t => t.id.toLowerCase() !== id.toLowerCase());
    if (this.db.tickets.length !== lenBefore) {
      this.persist(this.db);
      return true;
    }
    return false;
  }

  // Departments
  public getDepartments(): Department[] {
    return [...this.db.departments];
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.db.departments.find(d => d.id === id);
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return [...this.db.notifications];
  }

  public createNotification(notif: NotificationItem): NotificationItem {
    this.db.notifications.unshift(notif);
    this.persist(this.db);
    return notif;
  }

  public markNotificationAsRead(id: string): boolean {
    const n = this.db.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      this.persist(this.db);
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(): void {
    this.db.notifications.forEach(n => (n.read = true));
    this.persist(this.db);
  }

  // Insights
  public getInsights(): CampusInsight[] {
    return [...this.db.insights];
  }

  public setInsights(insights: CampusInsight[]): void {
    this.db.insights = insights;
    this.persist(this.db);
  }

  // Reports
  public getReports(): DailyReport[] {
    return [...this.db.reports];
  }

  public saveReport(report: DailyReport): DailyReport {
    this.db.reports.unshift(report);
    this.persist(this.db);
    return report;
  }
}

export const storage = new StorageService();
