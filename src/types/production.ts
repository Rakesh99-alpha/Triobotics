export interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  client: string;
  startDate: string;
  deliveryDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold';
  progress: number;
  manager: string; // PM Name
  priority: 'Normal' | 'High' | 'Urgent';
  createdAt: string;
}

export interface ProjectFormData {
  projectCode: string;
  projectName: string;
  client: string;
  startDate: string;
  deliveryDate: string;
  manager: string;
  priority: 'Normal' | 'High' | 'Urgent';
}

export interface Task {
  id: string;
  projectId: string;
  departmentId: string; // e.g., 'stockbuilding'
  operation: string;    // e.g., 'Base Making'
  assignedTo: string;   // Supervisor Name
  status: 'Pending' | 'In Progress' | 'Completed';
  targetSQM: number;
  completedSQM: number;
  dueDate: string;
}