import { create } from 'zustand';
import { Task, Employee, Project } from '@/types/database';

interface TaskState {
  tasks: Task[];
  employees: Employee[];
  projects: Project[];
  selectedProject: string | null;
  selectedEmployee: string | null;
  
  setTasks: (tasks: Task[]) => void;
  setEmployees: (employees: Employee[]) => void;
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (projectId: string | null) => void;
  setSelectedEmployee: (employeeId: string | null) => void;
  
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  
  // Filter functions
  getTasksByProject: (projectId: string) => Task[];
  getTasksByEmployee: (employeeId: string) => Task[];
  getActiveTasks: () => Task[];
  getCompletedTasks: () => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  employees: [],
  projects: [],
  selectedProject: null,
  selectedEmployee: null,
  
  setTasks: (tasks) => set({ tasks }),
  setEmployees: (employees) => set({ employees }),
  setProjects: (projects) => set({ projects }),
  setSelectedProject: (projectId) => set({ selectedProject: projectId }),
  setSelectedEmployee: (employeeId) => set({ selectedEmployee: employeeId }),
  
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map((task) =>
      task.id === taskId ? { ...task, ...updates } : task
    ),
  })),
  
  getTasksByProject: (projectId) => {
    return get().tasks.filter((task) => task.projectId === projectId);
  },
  
  getTasksByEmployee: (employeeId) => {
    return get().tasks.filter((task) => task.technicianId === employeeId);
  },
  
  getActiveTasks: () => {
    return get().tasks.filter(
      (task) => task.status === 'in-progress' || task.status === 'pending'
    );
  },
  
  getCompletedTasks: () => {
    return get().tasks.filter((task) => task.status === 'completed');
  },
}));
