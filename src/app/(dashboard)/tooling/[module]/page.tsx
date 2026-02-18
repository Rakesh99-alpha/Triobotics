'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, CheckCircle, Clock, Users, 
  Save, Calculator, Filter, AlertCircle 
} from 'lucide-react';
import { calculateTarget, STATION_NORMS } from '@/lib/norms';

// Mock eSSL Data (In real app, this comes from your Attendance API)
const ACTIVE_STAFF = 4; // 4 People punched in today

export default function ToolingModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleKey = params.module as string;
  
  // Load Tasks for this module (Simulated)
  const [tasks, setTasks] = useState([
    { id: 1, name: "STEEL BASE MAKING", status: "Pending" },
    { id: 2, name: "STOCK CUTTING", status: "In Progress" },
    { id: 3, name: "STOCK BONDING", status: "Pending" }
  ]);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Form Inputs (Matches Excel Sheet 3)
  const [inputs, setInputs] = useState({
    manpower: ACTIVE_STAFF, // Auto-filled from eSSL
    hours: 8,               // Default shift
    actualSQM: 0
  });

  const [calculated, setCalculated] = useState({
    targetSQM: "0.00",
    efficiency: "0"
  });

  // --- THE EXCEL FORMULA ENGINE ---
  useEffect(() => {
    if (selectedTask && inputs.manpower > 0) {
        // 1. Calculate Target (Sheet 3 Formula: Mins / Norm)
        const target = calculateTarget(selectedTask.name, inputs.manpower, inputs.hours);
        
        // 2. Calculate Efficiency (Actual / Target %)
        const eff = inputs.actualSQM > 0 ? ((inputs.actualSQM / parseFloat(target)) * 100).toFixed(0) : "0";

        setCalculated({ targetSQM: target, efficiency: eff });
    }
  }, [inputs, selectedTask]);

  const handleSubmit = () => {
      if(!selectedTask) return;
      // Save to DB logic here...
      alert(`Entry Saved!\nEfficiency: ${calculated.efficiency}%`);
      // Reset
      setInputs({ ...inputs, actualSQM: 0 });
      setSelectedTask(null);
  };

  return (
    <div className="space-y-6 font-sans text-white">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-xl border border-white/10 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold capitalize tracking-tight">{moduleKey} Dept</h1>
            <p className="text-zinc-400">Daily Production Entry</p>
          </div>
        </div>
        <div className="flex gap-3">
           {/* eSSL Integration Badge */}
           <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-bold flex items-center gap-2 animate-pulse">
              <Users className="w-4 h-4" /> {ACTIVE_STAFF} Staff Present (eSSL)
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: TASK SELECTION */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl min-h-[500px]">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Select Station</h2>
              <button className="p-2 bg-white/5 rounded-lg text-zinc-400"><Filter className="w-4 h-4"/></button>
           </div>
           
           <div className="space-y-3">
              {tasks.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                        selectedTask?.id === task.id 
                        ? "bg-blue-600/20 border-blue-500/50 ring-1 ring-blue-500/50" 
                        : "bg-zinc-900/50 border-white/5 hover:bg-white/5"
                    }`}
                  >
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                            selectedTask?.id === task.id ? "bg-blue-500 text-white" : "bg-zinc-800 text-zinc-500"
                        }`}>
                            {task.id}
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{task.name}</h3>
                            {/* Pull Norm from Library */}
                            <p className="text-xs text-zinc-400">Standard Norm: {STATION_NORMS[task.name]?.avg || 60} mins/sqm</p>
                        </div>
                     </div>
                     <div className="text-right">
                         <span className="text-xs text-zinc-500 block">Status</span>
                         <span className="text-sm font-bold text-yellow-400">{task.status}</span>
                     </div>
                  </div>
              ))}
           </div>
        </div>

        {/* RIGHT: DATA ENTRY (Excel Sheet 3 Logic) */}
        <div className="space-y-6">
            {selectedTask ? (
                <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl sticky top-6">
                    <div className="mb-6 border-b border-white/10 pb-4">
                        <h3 className="text-xl font-bold text-white">{selectedTask.name}</h3>
                        <p className="text-zinc-400 text-sm">Enter today's production data</p>
                    </div>

                    <div className="space-y-5">
                        {/* Input 1: Manpower */}
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">1. Manpower (Nos)</label>
                            <div className="flex items-center bg-zinc-800/50 rounded-xl border border-white/5 overflow-hidden">
                                <div className="p-3 text-zinc-400 border-r border-white/5"><Users className="w-5 h-5"/></div>
                                <input 
                                    type="number" 
                                    className="w-full bg-transparent p-3 text-white outline-none font-mono font-bold"
                                    value={inputs.manpower}
                                    onChange={e => setInputs({...inputs, manpower: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>

                        {/* Input 2: Hours */}
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">2. Available Hours</label>
                            <div className="flex items-center bg-zinc-800/50 rounded-xl border border-white/5 overflow-hidden">
                                <div className="p-3 text-zinc-400 border-r border-white/5"><Clock className="w-5 h-5"/></div>
                                <input 
                                    type="number" 
                                    className="w-full bg-transparent p-3 text-white outline-none font-mono font-bold"
                                    value={inputs.hours}
                                    onChange={e => setInputs({...inputs, hours: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>

                        {/* CALCULATED TARGET (Blue Box) */}
                        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl text-center">
                            <p className="text-[10px] text-blue-300 uppercase font-bold mb-1">Target Output (Calculated)</p>
                            <div className="text-3xl font-bold text-white font-mono">{calculated.targetSQM} <span className="text-sm text-zinc-400">SQM</span></div>
                        </div>

                        {/* Input 3: Actual Output */}
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">3. Actual Completed (SQM)</label>
                            <div className="flex items-center bg-zinc-800/50 rounded-xl border border-white/5 overflow-hidden focus-within:border-green-500/50 transition-colors">
                                <div className="p-3 text-zinc-400 border-r border-white/5"><CheckCircle className="w-5 h-5"/></div>
                                <input 
                                    type="number" 
                                    className="w-full bg-transparent p-3 text-white outline-none font-mono font-bold text-lg"
                                    placeholder="0.00"
                                    onChange={e => setInputs({...inputs, actualSQM: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>

                        {/* EFFICIENCY RESULT */}
                        <div className="flex justify-between items-center pt-4 border-t border-white/10">
                            <span className="text-zinc-400 text-sm">Efficiency Score</span>
                            <span className={`text-2xl font-bold ${parseInt(calculated.efficiency) >= 100 ? "text-green-400" : parseInt(calculated.efficiency) >= 80 ? "text-yellow-400" : "text-red-400"}`}>
                                {calculated.efficiency}%
                            </span>
                        </div>

                        <button onClick={handleSubmit} className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg">
                            <Save className="w-5 h-5" /> Submit Daily Log
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 border border-white/5 rounded-3xl bg-white/[0.02] p-10">
                    <Calculator className="w-16 h-16 opacity-20 mb-4" />
                    <p className="text-lg font-medium text-zinc-400">No Station Selected</p>
                    <p className="text-sm">Select a task on the left to enter data.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}