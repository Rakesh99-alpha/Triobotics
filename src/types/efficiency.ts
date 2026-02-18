export interface TEICalculationResult {
  tei: number;
  tStandard: number;
  tActual: number;
  taskId: string;
  technicianId: string;
  projectId: string;
  calculatedAt: Date;
}

export interface EEICalculationResult {
  eei: number;
  tasksCompleted: number;
  totalTStandard: number;
  totalTActual: number;
  employeeId: string;
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

export interface ProjectTEIResult {
  projectTei: number;
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  averageTei: number;
  calculatedAt: Date;
}
