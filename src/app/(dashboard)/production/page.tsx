'use client';

/**
 * 🎓 LEARNING: This is the SUPERVISOR PRODUCTION TRACKING page
 * It shows BOMs assigned to supervisor and tracks production progress
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, CheckCircle, XCircle, Clock, Package, AlertCircle,
  Users, TrendingUp, Layers, Scissors, Wrench, Box, Truck, RefreshCw
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';

/**
 * 🎓 LEARNING: Production Step Interface
 * Each step in the production process has these properties
 */
interface ProductionStep {
  id: string;
  name: string;
  completed: boolean;
  startTime?: string;
  endTime?: string;
  operator?: string;
  notes?: string;
}

/**
 * 🎓 LEARNING: Production Record Interface
 * This tracks the entire production process for one BOM
 */
interface ProductionRecord {
  id: number;
  bomId: number;
  projectCode: string;
  moldSeries: string;
  totalMolds: number;
  targetParts: number;
  partsCompleted: number;
  
  // Pre-checks
  moldAvailable: boolean;
  manpowerAvailable: boolean;
  assignedWorkers: string[];
  
  // Production Steps (14 steps)
  steps: {
    // Step 1: Mold Preparation
    csr: ProductionStep;
    packing: ProductionStep;
    
    // Step 2: Lamination
    gelcoatApp: ProductionStep;
    fiberPlacement: ProductionStep;
    processType: 'Injection' | 'Infusion' | 'HLU' | '';
    curingTime: number;
    
    // Step 3-5
    demolding: ProductionStep;
    trimming: ProductionStep;
    
    // Post Operations
    drySanding: ProductionStep;
    waterSanding: ProductionStep;
    buffing: ProductionStep;
    
    // Rework (if needed)
    rework: {
      needed: boolean;
      step: string;
      reason: string;
      materialUsed: number;
    };
    
    // Packing & Dispatch
    palletMaking: ProductionStep;
    partLoading: ProductionStep;
    dispatch: ProductionStep;
  };
  
  // Material Consumption
  materialsUsed: {
    resinUsed: number;
    gelcoatUsed: number;
    pigmentUsed: number;
  };
  
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  startDate?: string;
  completionDate?: string;
}

// BOM interface for proper typing
interface BOM {
  id: number;
  projectCode: string;
  moldSeries: string;
  totalMolds: number;
  targetPartsCompletion: number;
  status: string;
  materials: {
    gelcoatPerMold: number;
  };
}

export default function SupervisorProductionPage() {
  const [user, setUser] = useState('');
  const [boms, setBoms] = useState<BOM[]>([]);
  const [productions, setProductions] = useState<ProductionRecord[]>([]);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [currentProduction, setCurrentProduction] = useState<ProductionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /**
   * Load data from Firebase with real-time listeners
   */
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUserName') || 'Supervisor';
    setUser(currentUser);

    // Listen to BOMs/projects (not completed)
    const bomQ = query(collection(db, 'projects'), where('status', 'in', ['Pending', 'In Progress', 'Not Started']));
    const unsubBoms = onSnapshot(bomQ, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setBoms(items);
      setLoading(false);
    }, () => setLoading(false));

    // Listen to production records
    const unsubProd = onSnapshot(collection(db, 'production_records'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setProductions(items);
    });

    return () => { unsubBoms(); unsubProd(); };
  }, []);

  /**
   * 🎓 LEARNING: Initialize new production tracking
   */
  const startProduction = (bom: BOM) => {
    const newProduction: ProductionRecord = {
      id: Date.now(),
      bomId: bom.id,
      projectCode: bom.projectCode,
      moldSeries: bom.moldSeries,
      totalMolds: bom.totalMolds,
      targetParts: bom.targetPartsCompletion,
      partsCompleted: 0,
      moldAvailable: false,
      manpowerAvailable: false,
      assignedWorkers: [],
      steps: {
        csr: { id: 'csr', name: 'CSR', completed: false },
        packing: { id: 'packing', name: 'Packing', completed: false },
        gelcoatApp: { id: 'gelcoat', name: 'Gelcoat Application', completed: false },
        fiberPlacement: { id: 'fiber', name: 'Fiber Placement', completed: false },
        processType: '',
        curingTime: 0,
        demolding: { id: 'demolding', name: 'Demolding', completed: false },
        trimming: { id: 'trimming', name: 'Trimming & Detailing', completed: false },
        drySanding: { id: 'drysand', name: 'Dry Sanding', completed: false },
        waterSanding: { id: 'watersand', name: 'Water Sanding', completed: false },
        buffing: { id: 'buffing', name: 'Buffing', completed: false },
        rework: { needed: false, step: '', reason: '', materialUsed: 0 },
        palletMaking: { id: 'pallet', name: 'Pallet Making', completed: false },
        partLoading: { id: 'loading', name: 'Part Loading', completed: false },
        dispatch: { id: 'dispatch', name: 'Dispatch', completed: false },
      },
      materialsUsed: {
        resinUsed: 0,
        gelcoatUsed: 0,
        pigmentUsed: 0,
      },
      status: 'Not Started',
    };
    
    setCurrentProduction(newProduction);
    setSelectedBOM(bom);
    setShowTrackingModal(true);
  };

  /**
   * 🎓 LEARNING: Toggle step completion
   */
  const toggleStep = (stepKey: string) => {
    if (!currentProduction) return;
    
    const updated = { ...currentProduction };
    const step = (updated.steps as any)[stepKey];
    
    if (step && typeof step === 'object' && 'completed' in step) {
      step.completed = !step.completed;
      
      // If completing, add timestamp
      if (step.completed) {
        step.endTime = new Date().toLocaleTimeString('en-IN', { hour12: false });
        if (!step.startTime) {
          step.startTime = step.endTime;
        }
      }
      
      setCurrentProduction(updated);
    }
  };

  /**
   * 🎓 LEARNING: Calculate total gelcoat used
   * Based on molds used and gelcoat per mold from BOM
   */
  const calculateGelcoatUsed = () => {
    if (!selectedBOM) return 0;
    return currentProduction?.materialsUsed.gelcoatUsed || 
           (selectedBOM.totalMolds * selectedBOM.materials.gelcoatPerMold);
  };

  /**
   * 🎓 LEARNING: Save production record
   */
  const saveProduction = async () => {
    if (!currentProduction) return;
    
    const updatedProduction = { ...currentProduction };
    
    const allStepsCompleted = 
      updatedProduction.steps.csr.completed &&
      updatedProduction.steps.packing.completed &&
      updatedProduction.steps.gelcoatApp.completed &&
      updatedProduction.steps.fiberPlacement.completed &&
      updatedProduction.steps.demolding.completed &&
      updatedProduction.steps.trimming.completed &&
      updatedProduction.steps.drySanding.completed &&
      updatedProduction.steps.waterSanding.completed &&
      updatedProduction.steps.buffing.completed &&
      updatedProduction.steps.palletMaking.completed &&
      updatedProduction.steps.partLoading.completed &&
      updatedProduction.steps.dispatch.completed;
    
    updatedProduction.status = allStepsCompleted ? 'Completed' : 'In Progress';
    if (!updatedProduction.startDate) {
      updatedProduction.startDate = new Date().toISOString().split('T')[0];
    }
    if (allStepsCompleted) {
      updatedProduction.completionDate = new Date().toISOString().split('T')[0];
    }
    
    if (updatedProduction.materialsUsed.gelcoatUsed === 0 && selectedBOM) {
      updatedProduction.materialsUsed = {
        ...updatedProduction.materialsUsed,
        gelcoatUsed: selectedBOM.totalMolds * (selectedBOM.materials?.gelcoatPerMold || 0)
      };
    }
    
    setCurrentProduction(updatedProduction);

    try {
      // Check if existing production record for this BOM
      const existingQ = query(collection(db, 'production_records'), where('bomId', '==', updatedProduction.bomId));
      const existingSnap = await getDocs(existingQ);
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...dataToSave } = updatedProduction as any;
      
      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        await updateDoc(doc(db, 'production_records', existingDoc.id), dataToSave);
      } else {
        await addDoc(collection(db, 'production_records'), dataToSave);
      }

      // Update project status if completed
      if (allStepsCompleted && selectedBOM) {
        const projQ = query(collection(db, 'projects'), where('projectCode', '==', selectedBOM.projectCode));
        const projSnap = await getDocs(projQ);
        if (!projSnap.empty) {
          await updateDoc(doc(db, 'projects', projSnap.docs[0].id), {
            status: 'Completed',
            actualCompletionDate: new Date().toISOString().split('T')[0]
          });
        }
      }
    } catch (err) {
      console.error('Save production error:', err);
    }
    
    setShowTrackingModal(false);
  };

  const handleLogout = () => {
    router.push('/login');
  };

  // Get existing production for a BOM
  const getProduction = (bomId: number) => {
    return productions.find(p => p.bomId === bomId);
  };

  const stats = {
    totalBOMs: boms.length,
    inProgress: productions.filter(p => p.status === 'In Progress').length,
    completed: productions.filter(p => p.status === 'Completed').length,
    partsToday: productions
      .filter(p => p.completionDate === new Date().toISOString().split('T')[0])
      .reduce((sum, p) => sum + p.partsCompleted, 0),
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Production Tracking</h1>
                  <p className="text-zinc-400 text-sm mt-1">Supervisor Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-400">Logged in as</p>
                  <p className="text-sm font-semibold text-green-300">{user}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-3xl font-bold text-white">{stats.totalBOMs}</h3>
              <p className="text-sm text-zinc-400 mt-2">Active BOMs</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-3xl font-bold text-blue-300">{stats.inProgress}</h3>
              <p className="text-sm text-zinc-400 mt-2">In Progress</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-3xl font-bold text-green-300">{stats.completed}</h3>
              <p className="text-sm text-zinc-400 mt-2">Completed</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h3 className="text-3xl font-bold text-purple-300">{stats.partsToday}</h3>
              <p className="text-sm text-zinc-400 mt-2">Parts Today</p>
            </div>
          </div>

          {/* BOM List */}
          <h2 className="text-xl font-bold text-white mb-6">Available BOMs</h2>
          <div className="space-y-4">
            {boms.map((bom) => {
              const production = getProduction(bom.id);
              return (
                <div key={bom.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex gap-3 mb-3">
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-semibold">
                          {bom.projectCode}
                        </span>
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-semibold">
                          Mold Series: {bom.moldSeries}
                        </span>
                        {production && (
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                            production.status === 'Completed' ? 'bg-green-500/20 text-green-300' :
                            production.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {production.status}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2">{bom.projectDescription}</h3>
                      <div className="grid grid-cols-4 gap-4 text-sm text-zinc-300">
                        <div><span className="text-zinc-400">Molds:</span> <strong>{bom.totalMolds}</strong></div>
                        <div><span className="text-zinc-400">Target Parts:</span> <strong>{bom.targetPartsCompletion}</strong></div>
                        <div><span className="text-zinc-400">Completed:</span> <strong>{production?.partsCompleted || 0}</strong></div>
                        <div><span className="text-zinc-400">Target Date:</span> <strong>{bom.targetCompletionDate}</strong></div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (production) {
                          setCurrentProduction(production);
                          setSelectedBOM(bom);
                          setShowTrackingModal(true);
                        } else {
                          startProduction(bom);
                        }
                      }}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
                    >
                      {production ? 'Continue Tracking' : 'Start Production'}
                    </button>
                  </div>
                </div>
              );
            })}
            {boms.length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                <Package className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
                <p>No BOMs assigned yet</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Production Tracking Modal */}
      <AnimatePresence>
        {showTrackingModal && currentProduction && selectedBOM && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTrackingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-2">{selectedBOM.projectCode}</h2>
              <p className="text-zinc-400 mb-6">{selectedBOM.projectDescription}</p>

              {/* Pre-Production Checks */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">Pre-Production Checks</h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentProduction.moldAvailable}
                      onChange={(e) => setCurrentProduction({...currentProduction, moldAvailable: e.target.checked})}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white font-medium">Mold Available ({selectedBOM.totalMolds} Molds - Series {selectedBOM.moldSeries})</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentProduction.manpowerAvailable}
                      onChange={(e) => setCurrentProduction({...currentProduction, manpowerAvailable: e.target.checked})}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white font-medium">Manpower Available</span>
                  </label>
                </div>
                
                {/* Assign Workers */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">
                    Assign Workers (comma separated)
                  </label>
                  <input
                    type="text"
                    value={currentProduction.assignedWorkers.join(', ')}
                    onChange={(e) => setCurrentProduction({
                      ...currentProduction,
                      assignedWorkers: e.target.value.split(',').map(w => w.trim()).filter(w => w)
                    })}
                    placeholder="Worker 1, Worker 2, Worker 3"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Production Steps */}
              <div className="space-y-6">
                {/* Step 1: Mold Preparation */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-purple-400" />
                    Step 1: Mold Preparation
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.csr.completed}
                        onChange={() => toggleStep('csr')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">CSR (Create Surface Reinforcement)</span>
                      {currentProduction.steps.csr.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.packing.completed}
                        onChange={() => toggleStep('packing')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Packing</span>
                      {currentProduction.steps.packing.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                  </div>
                </div>

                {/* Step 2: Lamination */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-400" />
                    Step 2: Lamination
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.gelcoatApp.completed}
                        onChange={() => toggleStep('gelcoatApp')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Gelcoat Application</span>
                      {currentProduction.steps.gelcoatApp.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.fiberPlacement.completed}
                        onChange={() => toggleStep('fiberPlacement')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Fiber Placement</span>
                      {currentProduction.steps.fiberPlacement.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                          Process Type
                        </label>
                        <select
                          value={currentProduction.steps.processType}
                          onChange={(e) => setCurrentProduction({
                            ...currentProduction,
                            steps: { ...currentProduction.steps, processType: e.target.value as any }
                          })}
                          className="w-full px-4 py-2.5 bg-zinc-800 border border-white/20 text-white rounded-xl outline-none"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="">Select Process</option>
                          <option value="Injection">Injection</option>
                          <option value="Infusion">Infusion</option>
                          <option value="HLU">HLU (Hand Lay-Up)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                          Curing Time (hours)
                        </label>
                        <input
                          type="number"
                          value={currentProduction.steps.curingTime}
                          onChange={(e) => setCurrentProduction({
                            ...currentProduction,
                            steps: { ...currentProduction.steps, curingTime: parseFloat(e.target.value) || 0 }
                          })}
                          step="0.5"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Demolding */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Step 3: Demolding</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentProduction.steps.demolding.completed}
                      onChange={() => toggleStep('demolding')}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white font-medium">Demolding Complete</span>
                    {currentProduction.steps.demolding.completed && (
                      <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                    )}
                  </label>
                </div>

                {/* Step 4: Trimming */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-yellow-400" />
                    Step 4: Trimming & Detailing
                  </h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentProduction.steps.trimming.completed}
                      onChange={() => toggleStep('trimming')}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white font-medium">Trimming & Detailing Complete</span>
                    {currentProduction.steps.trimming.completed && (
                      <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                    )}
                  </label>
                </div>

                {/* Step 5: Post Operations/Finishing */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Step 5: Post Operations / Finishing</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.drySanding.completed}
                        onChange={() => toggleStep('drySanding')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Dry Sanding</span>
                      {currentProduction.steps.drySanding.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.waterSanding.completed}
                        onChange={() => toggleStep('waterSanding')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Water Sanding</span>
                      {currentProduction.steps.waterSanding.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.buffing.completed}
                        onChange={() => toggleStep('buffing')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Buffing</span>
                      {currentProduction.steps.buffing.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                  </div>
                </div>

                {/* Step 6: Rework (If Needed) */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    Rework (If Needed)
                  </h3>
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={currentProduction.steps.rework.needed}
                      onChange={(e) => setCurrentProduction({
                        ...currentProduction,
                        steps: {
                          ...currentProduction.steps,
                          rework: { ...currentProduction.steps.rework, needed: e.target.checked }
                        }
                      })}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white font-medium">Rework Required</span>
                  </label>
                  
                  {currentProduction.steps.rework.needed && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                          Which step needs rework?
                        </label>
                        <select
                          value={currentProduction.steps.rework.step}
                          onChange={(e) => setCurrentProduction({
                            ...currentProduction,
                            steps: {
                              ...currentProduction.steps,
                              rework: { ...currentProduction.steps.rework, step: e.target.value }
                            }
                          })}
                          className="w-full px-4 py-2.5 bg-zinc-800 border border-white/20 text-white rounded-xl outline-none"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="">Select Step</option>
                          <option value="Lamination">Lamination</option>
                          <option value="Demolding">Demolding</option>
                          <option value="Trimming">Trimming</option>
                          <option value="Dry Sanding">Dry Sanding</option>
                          <option value="Water Sanding">Water Sanding</option>
                          <option value="Buffing">Buffing</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                          Reason for Rework
                        </label>
                        <textarea
                          value={currentProduction.steps.rework.reason}
                          onChange={(e) => setCurrentProduction({
                            ...currentProduction,
                            steps: {
                              ...currentProduction.steps,
                              rework: { ...currentProduction.steps.rework, reason: e.target.value }
                            }
                          })}
                          placeholder="Describe the issue..."
                          rows={3}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-zinc-300 mb-2">
                          Additional Material Used (kg)
                        </label>
                        <input
                          type="number"
                          value={currentProduction.steps.rework.materialUsed}
                          onChange={(e) => setCurrentProduction({
                            ...currentProduction,
                            steps: {
                              ...currentProduction.steps,
                              rework: { ...currentProduction.steps.rework, materialUsed: parseFloat(e.target.value) || 0 }
                            }
                          })}
                          step="0.1"
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 7: Packing & Loading */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Box className="w-5 h-5 text-green-400" />
                    Step 7: Packing & Loading
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.palletMaking.completed}
                        onChange={() => toggleStep('palletMaking')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Pallet Making</span>
                      {currentProduction.steps.palletMaking.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentProduction.steps.partLoading.completed}
                        onChange={() => toggleStep('partLoading')}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-white font-medium">Part Loading</span>
                      {currentProduction.steps.partLoading.completed && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                    </label>
                  </div>
                </div>

                {/* Step 8: Dispatch */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-400" />
                    Step 8: Dispatch
                  </h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentProduction.steps.dispatch.completed}
                      onChange={() => toggleStep('dispatch')}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-white font-medium">Dispatch Complete</span>
                    {currentProduction.steps.dispatch.completed && (
                      <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                    )}
                  </label>
                </div>
              </div>

              {/* Material Consumption */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">Material Consumption</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">
                      Resin Used (kg)
                    </label>
                    <input
                      type="number"
                      value={currentProduction.materialsUsed.resinUsed}
                      onChange={(e) => setCurrentProduction({
                        ...currentProduction,
                        materialsUsed: { ...currentProduction.materialsUsed, resinUsed: parseFloat(e.target.value) || 0 }
                      })}
                      step="0.1"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl outline-none"
                    />
                    <p className="text-xs text-zinc-400 mt-1">Planned: {selectedBOM.materials.resinQty} kg</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">
                      Gelcoat Used (kg)
                    </label>
                    <input
                      type="number"
                      value={currentProduction.materialsUsed.gelcoatUsed}
                      onChange={(e) => setCurrentProduction({
                        ...currentProduction,
                        materialsUsed: { ...currentProduction.materialsUsed, gelcoatUsed: parseFloat(e.target.value) || 0 }
                      })}
                      step="0.1"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl outline-none"
                    />
                    <p className="text-xs text-zinc-400 mt-1">
                      Auto: {selectedBOM.totalMolds * selectedBOM.materials.gelcoatPerMold} kg 
                      ({selectedBOM.totalMolds} molds × {selectedBOM.materials.gelcoatPerMold} kg)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">
                      Pigment Used (kg)
                    </label>
                    <input
                      type="number"
                      value={currentProduction.materialsUsed.pigmentUsed}
                      onChange={(e) => setCurrentProduction({
                        ...currentProduction,
                        materialsUsed: { ...currentProduction.materialsUsed, pigmentUsed: parseFloat(e.target.value) || 0 }
                      })}
                      step="0.1"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl outline-none"
                    />
                    <p className="text-xs text-zinc-400 mt-1">Planned: {selectedBOM.materials.pigmentQty} kg</p>
                  </div>
                </div>
              </div>

              {/* Parts Completed */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">Parts Completed</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={currentProduction.partsCompleted}
                    onChange={(e) => setCurrentProduction({
                      ...currentProduction,
                      partsCompleted: parseInt(e.target.value) || 0
                    })}
                    min="0"
                    max={currentProduction.targetParts}
                    className="w-32 px-4 py-2.5 bg-white/5 border border-white/10 text-white text-xl font-bold rounded-xl outline-none"
                  />
                  <span className="text-zinc-400">out of</span>
                  <span className="text-2xl font-bold text-white">{currentProduction.targetParts}</span>
                  <span className="text-zinc-400">parts</span>
                  <div className="ml-auto px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-lg font-semibold">
                    {currentProduction.targetParts > 0 ? 
                      ((currentProduction.partsCompleted / currentProduction.targetParts) * 100).toFixed(1) : 0}% Complete
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={saveProduction}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Save Progress
                </button>
                <button
                  onClick={() => setShowTrackingModal(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
