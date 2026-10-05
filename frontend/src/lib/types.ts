export const ROLES = ['ADMIN', 'MANAGER', 'SALES'] as const;
export type Role = (typeof ROLES)[number];

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const DEAL_STAGES = [
  'LEAD_IN',
  'CONTACT_MADE',
  'DEMO_SCHEDULED',
  'PROPOSAL_SENT',
  'WON',
  'LOST',
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const ACTIVITY_TYPES = ['CALL', 'MEETING', 'NOTE', 'TASK'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  LOST: 'Lost',
};

export const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  LEAD_IN: 'Lead In',
  CONTACT_MADE: 'Contact Made',
  DEMO_SCHEDULED: 'Demo Scheduled',
  PROPOSAL_SENT: 'Proposal Sent',
  WON: 'Won',
  LOST: 'Lost',
};

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  CALL: 'Call',
  MEETING: 'Meeting',
  NOTE: 'Note',
  TASK: 'Task',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Sales',
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRef {
  id: string;
  name: string;
  email?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  ownerId: string;
  owner: UserRef;
  createdAt: string;
  updatedAt: string;
  _count?: { deals: number; activities: number };
}

export interface Deal {
  id: string;
  title: string;
  /** Decimal serialized as string by the API */
  value: string;
  currency: string;
  stage: DealStage;
  expectedCloseDate: string | null;
  closedAt: string | null;
  leadId: string | null;
  ownerId: string;
  owner?: UserRef;
  lead?: { id: string; name: string; company: string | null } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { activities: number };
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  leadId: string | null;
  dealId: string | null;
  userId: string;
  user: UserRef;
  lead?: { id: string; name: string; company: string | null } | null;
  deal?: { id: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetail extends Lead {
  deals: Deal[];
  activities: Activity[];
}

export interface DealDetail extends Deal {
  activities: Activity[];
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface DashboardSummary {
  metrics: {
    totalLeads: number;
    activeDeals: number;
    totalRevenue: number;
    conversionRate: number;
    wonDeals: number;
    lostDeals: number;
  };
  pipeline: { stage: DealStage; count: number; value: number }[];
  leadsByStatus: { status: LeadStatus; count: number }[];
  monthly: { key: string; revenue: number; won: number; created: number }[];
}
