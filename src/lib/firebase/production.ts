import { Project, ProjectFormData, Task } from '@/types/production';

// --- 1. PROJECT FUNCTIONS ---

// Get all projects from storage
export const getAllProjects = async (): Promise<Project[]> => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('boms'); // We use 'boms' as our main project DB
  return data ? JSON.parse(data) : [];
};

// Create a new project
export const createProject = async (data: ProjectFormData): Promise<string> => {
  const projects = await getAllProjects();
  
  const newProject: Project = {
    id: `PRJ-${Date.now()}`,
    ...data,
    status: 'Pending',
    progress: 0,
    createdAt: new Date().toISOString(),
  };

  const updated = [newProject, ...projects];
  localStorage.setItem('boms', JSON.stringify(updated));
  return newProject.id;
};

// Delete a project
export const deleteProject = async (projectId: string): Promise<void> => {
  const projects = await getAllProjects();
  const updated = projects.filter(p => p.id !== projectId);
  localStorage.setItem('boms', JSON.stringify(updated));
};

// --- 2. TASK FUNCTIONS (For PM Assigning Work) ---

// Create a Task (Work Order) for a Supervisor
export const createTask = async (taskData: Omit<Task, 'id' | 'status' | 'completedSQM'>): Promise<string> => {
  const tasks = JSON.parse(localStorage.getItem('tooling_jobs') || "[]");
  
  const newTask: Task = {
    id: `TSK-${Date.now()}`,
    status: 'Pending',
    completedSQM: 0,
    ...taskData
  };

  const updated = [...tasks, newTask];
  localStorage.setItem('tooling_jobs', JSON.stringify(updated));
  return newTask.id;
};

// Get tasks for a specific project
export const getTasksForProject = async (projectId: string): Promise<Task[]> => {
  const tasks = JSON.parse(localStorage.getItem('tooling_jobs') || "[]");
  return tasks.filter((t: Task) => t.projectId === projectId);
};