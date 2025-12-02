// Client-related types
export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'IRA' | 'Brokerage' | '401k' | 'Roth IRA' | 'Trust';
  balance: number;
}

export interface Client {
  id: string;
  name: string;
  aum: number;
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive' | 'Moderate-Aggressive';
  goals: Goal[];
  accounts: Account[];
  advisor: string;
  lastContact: string;
}

// CRM Update types
export interface FieldUpdate {
  id: string;
  fieldName: string;
  currentValue: string;
  proposedValue: string;
  confidence: number;
  sourceSnippet: string;
}

export interface Task {
  id: string;
  owner: string;
  description: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface AuditLog {
  summary: string;
  tags: string[];
  timestamp: string;
}

export interface CRMUpdateResult {
  fieldUpdates: FieldUpdate[];
  tasks: Task[];
  auditLog: AuditLog;
}

// Timeline types
export interface TimelineEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  type: 'crm_update' | 'meeting' | 'task_completed';
}

