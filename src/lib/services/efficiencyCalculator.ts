import { Task, Employee } from '@/types/database';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

// Calculate TEI for a single task
export function calculateTEI(tStandard: number, tActual: number): number {
  if (tActual === 0) return 0;
  const tei = (tStandard / tActual) * 100;
  return Math.round(tei * 100) / 100; // Round to 2 decimal places
}

// Calculate EEI for an employee (last 30 days)
export async function calculateEEI(employeeId: string): Promise<number> {
  try {
    // Get all completed tasks for this employee in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('technicianId', '==', employeeId),
      where('status', '==', 'completed'),
      where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return 0;
    }

    let totalTStandard = 0;
    let totalTActual = 0;

    snapshot.docs.forEach((doc) => {
      const task = doc.data() as Task;
      if (task.tStandard && task.tActual) {
        totalTStandard += task.tStandard;
        totalTActual += task.tActual;
      }
    });

    if (totalTActual === 0) return 0;

    const eei = (totalTStandard / totalTActual) * 100;
    
    // Update employee document with new EEI
    await updateDoc(doc(db, 'employees', employeeId), {
      eei: Math.round(eei * 100) / 100,
      'current30Days.tasksCompleted': snapshot.size,
      'current30Days.totalTStandard': totalTStandard,
      'current30Days.totalTActual': totalTActual,
      'current30Days.averageTei': Math.round(eei * 100) / 100,
      'current30Days.lastCalculated': Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return Math.round(eei * 100) / 100;
  } catch (error) {
    console.error('Error calculating EEI:', error);
    return 0;
  }
}

// Calculate Project TEI (average of all completed tasks in project)
export async function calculateProjectTEI(projectId: string): Promise<number> {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('projectId', '==', projectId),
      where('status', '==', 'completed')
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return 0;

    let totalTEI = 0;
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const task = doc.data() as Task;
      if (task.tei !== null && task.tei !== undefined) {
        totalTEI += task.tei;
        count++;
      }
    });

    if (count === 0) return 0;

    return Math.round((totalTEI / count) * 100) / 100;
  } catch (error) {
    console.error('Error calculating project TEI:', error);
    return 0;
  }
}

// Format minutes to hours and minutes display
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

// Get efficiency color based on TEI/EEI value
export function getEfficiencyColor(value: number): string {
  if (value >= 90) return 'text-green-600 bg-green-50 border-green-200';
  if (value >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (value >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

// Get efficiency status text
export function getEfficiencyStatus(value: number): string {
  if (value >= 90) return 'Excellent';
  if (value >= 80) return 'Good';
  if (value >= 70) return 'Acceptable';
  return 'Needs Improvement';
}
