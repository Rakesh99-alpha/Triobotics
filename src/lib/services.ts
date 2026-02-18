import { db } from './firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, where, getDocs 
} from 'firebase/firestore';

// --- COLLECTIONS REFERENCES ---
const BOMS_COLLECTION = 'projects';
const JOBS_COLLECTION = 'work_orders';
const LOGS_COLLECTION = 'daily_logs';
const COLLECTION_NAME = BOMS_COLLECTION; // alias for clarity

// --- 1. PROJECT MANAGER FUNCTIONS ---

// Create a New Project (returns cloud id)
export const createProject = async (projectData: any) => {
  try {
    const docRef = await addDoc(collection(db, BOMS_COLLECTION), {
      ...projectData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error creating project:", e);
    throw e;
  }
};

// Add New Project (From Excel or Manual) - compatibility helper
export const addProjectToCloud = async (projectData: any) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...projectData,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding project:", error);
    throw error;
  }
};

// 2. Delete Project
export const deleteProjectFromCloud = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
};

// 3. Real-Time Listener (This makes clients update automatically)
export const subscribeToProjects = (callback: (data: any[]) => void) => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(projects);
  });
};

// --- 4. ASSIGN / JOB FUNCTIONS ---

// Assign a Task to Supervisor
export const assignTask = async (taskData: any) => {
  try {
    const docRef = await addDoc(collection(db, JOBS_COLLECTION), {
      ...taskData,
      status: 'Pending',
      progress: 0,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (e) {
    console.error("Error assigning task:", e);
    throw e;
  }
};

// --- 5. SUPERVISOR FUNCTIONS ---

// Listen to My Tasks (Real-time)
export const subscribeToMyTasks = (supervisorName: string, callback: (data: any[]) => void) => {
  const q = query(
    collection(db, JOBS_COLLECTION), 
    where("assignedTo", "==", supervisorName)
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tasks);
  });
};

// Submit Daily Work
export const submitDailyLog = async (logData: any, jobId: string, newProgress: number) => {
  try {
    // 1. Save the Log
    await addDoc(collection(db, LOGS_COLLECTION), {
      ...logData,
      timestamp: new Date().toISOString()
    });

    // 2. Update the Job Status
    const jobRef = doc(db, JOBS_COLLECTION, jobId);
    await updateDoc(jobRef, {
      currentProgress: newProgress,
      status: newProgress >= 100 ? 'Completed' : 'In Progress'
    });
  } catch (e) {
    console.error("Error submitting log:", e);
    throw e;
  }
};

// --- 6. SHARED / MD FUNCTIONS ---

// Get All Projects (Real-time) for MD/PM Dashboard (kept for compatibility)
export const subscribeToAllProjects = (callback: (data: any[]) => void) => {
  const q = query(collection(db, BOMS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(projects);
  });
};