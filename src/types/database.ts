import { Timestamp } from 'firebase/firestore';

export type UserRole = 'Admin' | 'MD' | 'PM' | 'HR' | 'Manager' | 'Supervisor' | 'Technician';

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'paused' | 'cancelled';

export type ProjectStatus = 'planning' | 'in-progress' | 'delayed' | 'completed' | 'on-hold';

export interface Task {
  id: string;
  projectId: string;
  technicianId: string;
  supervisorId: string;
  taskName: string;
  taskDescription?: string;
  
  // Time Tracking
  tStart: Timestamp;
  tStop: Timestamp | null;
  tStandard: number; // in minutes
  tActual: number | null; // in minutes
  
  // Efficiency Metrics (auto-calculated)
  tei: number | null; // Task Efficiency Index
  calculatedAt: Timestamp | null;
  
  // Status
  status: TaskStatus;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  managerId?: string | null;
  supervisorId?: string | null;
  
  // Efficiency Metrics (auto-calculated)
  eei: number; // Employee Efficiency Index
  
  // Current Period Stats (rolling 30 days)
  current30Days: {
    tasksCompleted: number;
    totalTStandard: number;
    totalTActual: number;
    averageTei: number;
    lastCalculated: Timestamp | null;
  };
  
  // Status
  currentStatus: 'active' | 'absent' | 'on-leave' | 'suspended';
  currentProjectId?: string | null;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Project {
  id: string;
  projectName: string;
  clientName?: string;
  projectType?: string;
  
  // Timeline
  startDate: Timestamp;
  expectedEndDate: Timestamp;
  actualEndDate: Timestamp | null;
  status: ProjectStatus;
  
  // Efficiency Metrics (aggregated)
  projectTei: number | null;
  completionRate: number;
  onTimeRate: number;
  
  // Resource Allocation
  assignedTechnicians: string[];
  assignedManagers: string[];
  assignedSupervisors: string[];
  
  // Financial
  budget?: number;
  actualCost?: number;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StaffAdjustmentRequest {
  id: string;
  requestedBy: string; // PM user ID
  requestedAt: Timestamp;
  
  // Request Details
  technicianId: string;
  fromProjectId: string;
  toProjectId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Justification
  currentEei: number;
  targetProjectNeed: string;
  expectedImpact: string;
  
  // Approval Flow
  status: 'pending' | 'approved-by-manager' | 'approved-by-hr' | 'completed' | 'rejected';
  managerApproval: {
    managerId: string | null;
    approvedAt: Timestamp | null;
    comments: string;
  };
  hrApproval: {
    hrId: string | null;
    approvedAt: Timestamp | null;
    comments: string;
  };
  
  // Execution
  effectiveDate: Timestamp | null;
  completedAt: Timestamp | null;
}
