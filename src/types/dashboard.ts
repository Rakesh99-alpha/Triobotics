import { UserRole } from './database';

export interface DashboardMetric {
  label: string;
  value: string | number;
  icon?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  format?: 'number' | 'percentage' | 'currency' | 'efficiency';
}

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  photoURL?: string;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}
