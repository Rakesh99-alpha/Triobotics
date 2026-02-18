// User and Role Types for Dynamic Authentication

export type UserRole = 
  | 'md'           // Managing Director - Full access
  | 'admin'        // Admin - User management
  | 'hr'           // HR Department
  | 'pm'           // Project Manager
  | 'supervisor'   // Production Supervisor
  | 'store'        // Store Manager
  | 'purchase'     // Purchase Team
  | 'design'       // Design Team
  | 'quality'      // Quality Control
  | 'dispatch'     // Dispatch Team
  | 'viewer';      // Read-only access

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  createdBy?: string;
}

export interface RoleConfig {
  id: UserRole;
  name: string;
  description: string;
  color: string;
  defaultPermissions: string[];
  allowedRoutes: string[];
  dashboardPath: string;
}

// Permission types
export type Permission = 
  | 'users:read' | 'users:write' | 'users:delete'
  | 'inventory:read' | 'inventory:write' | 'inventory:delete'
  | 'purchase:read' | 'purchase:write' | 'purchase:approve'
  | 'production:read' | 'production:write'
  | 'reports:read' | 'reports:export'
  | 'settings:read' | 'settings:write'
  | 'dashboard:md' | 'dashboard:admin' | 'dashboard:supervisor';

// Firestore collection names
export const USER_COLLECTIONS = {
  USERS: 'users',
  ROLES: 'roles',
  ACTIVITY_LOGS: 'activity_logs',
  SESSIONS: 'sessions',
};

// Default role configurations
export const ROLE_CONFIGS: RoleConfig[] = [
  {
    id: 'md',
    name: 'Managing Director',
    description: 'Full system access with all permissions',
    color: 'purple',
    defaultPermissions: ['*'], // All permissions
    allowedRoutes: ['*'],
    dashboardPath: '/rnd',
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'User management and system configuration',
    color: 'red',
    defaultPermissions: ['users:read', 'users:write', 'users:delete', 'settings:read', 'settings:write'],
    allowedRoutes: ['/admin', '/employee', '/settings'],
    dashboardPath: '/admin',
  },
  {
    id: 'hr',
    name: 'HR Manager',
    description: 'Employee and attendance management',
    color: 'pink',
    defaultPermissions: ['users:read', 'users:write', 'reports:read'],
    allowedRoutes: ['/hr', '/employee', '/reports'],
    dashboardPath: '/hr',
  },
  {
    id: 'pm',
    name: 'Project Manager',
    description: 'Project planning and tracking',
    color: 'blue',
    defaultPermissions: ['production:read', 'production:write', 'reports:read'],
    allowedRoutes: ['/pm', '/production', '/tooling', '/reports'],
    dashboardPath: '/pm',
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Production floor operations',
    color: 'green',
    defaultPermissions: ['production:read', 'production:write'],
    allowedRoutes: ['/supervisor', '/tooling'],
    dashboardPath: '/supervisor',
  },
  {
    id: 'store',
    name: 'Store Manager',
    description: 'Inventory and stock management',
    color: 'yellow',
    defaultPermissions: ['inventory:read', 'inventory:write'],
    allowedRoutes: ['/store', '/empStore', '/inventory'],
    dashboardPath: '/empStore',
  },
  {
    id: 'purchase',
    name: 'Purchase Officer',
    description: 'Purchase orders and vendor management',
    color: 'orange',
    defaultPermissions: ['purchase:read', 'purchase:write', 'inventory:read'],
    allowedRoutes: ['/purchase', '/store'],
    dashboardPath: '/purchase',
  },
  {
    id: 'design',
    name: 'Design Engineer',
    description: 'Design and tooling management',
    color: 'cyan',
    defaultPermissions: ['production:read'],
    allowedRoutes: ['/design', '/tooling'],
    dashboardPath: '/design',
  },
  {
    id: 'quality',
    name: 'Quality Controller',
    description: 'Quality inspection and control',
    color: 'teal',
    defaultPermissions: ['production:read', 'reports:read'],
    allowedRoutes: ['/quality', '/reports'],
    dashboardPath: '/quality',
  },
  {
    id: 'dispatch',
    name: 'Dispatch Coordinator',
    description: 'Shipping and dispatch operations',
    color: 'indigo',
    defaultPermissions: ['inventory:read', 'reports:read'],
    allowedRoutes: ['/dispatch', '/inventory'],
    dashboardPath: '/dispatch',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to dashboards',
    color: 'gray',
    defaultPermissions: ['reports:read'],
    allowedRoutes: ['/reports'],
    dashboardPath: '/reports',
  },
];

// Helper to get role config
export const getRoleConfig = (role: UserRole): RoleConfig | undefined => {
  return ROLE_CONFIGS.find(r => r.id === role);
};

// Helper to check permission
export const hasPermission = (userPermissions: string[], requiredPermission: Permission): boolean => {
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(requiredPermission);
};

// Helper to check route access
export const canAccessRoute = (role: UserRole, route: string): boolean => {
  const config = getRoleConfig(role);
  if (!config) return false;
  if (config.allowedRoutes.includes('*')) return true;
  return config.allowedRoutes.some(r => route.startsWith(r));
};
