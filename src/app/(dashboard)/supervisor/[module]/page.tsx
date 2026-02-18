'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, CheckCircle, Clock, Users, 
  Plus, Save, Calculator, AlertCircle, MoreVertical, Filter 
} from 'lucide-react';
import { calculateTarget, STATION_NORMS } from '@/lib/norms';

// --- MOCK TASKS (Simulating your Sheet 3 Stations) ---
const MODULE_TASKS: Record<string, any[]> = {
  stockbuilding: [
    { id: 1, name: "STEEL BASE MAKING", status: "Pending" },
    { id: 2, name: "STOCK CUTTING", status: "In Progress" },
    { id: 3, name: "STOCK BONDING", status: "Pending" },
    { id: 4, name: "CURING", status: "Pending" }
  ],
  assembly: [
    { id: 1, name: "ASSEMBLY", status: "Pending" },
    { id: 2, name: "SURFACE SANDING (80)", status: "In Progress" }
  ]
};

export default function ToolingModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleKey = params.module as string;
  
  const [tasks, setTasks] = useState(MODULE_TASKS[moduleKey] || []);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  
  // Input State for "Sheet 3" Logic
  const [inputs, setInputs] = useState({
    manpower: 0,
    hours: 8, // Default shift
    actualSQM: 0
  });
  
  const [calculated, setCalculated] = useState({
    targetSQM: "0.00",
    efficiency: "0"
  });

  // --- THE EXCEL FORMULA LOGIC ---
  useEffect(() => {
    if (selectedTask && inputs.manpower > 0) {
        // 1. Calculate Target based on Norms (Sheet 3 Logic)
        const target = calculateTarget(selectedTask.name, inputs.manpower, inputs.hours);
        
        // 2. Calculate Efficiency
        // Efficiency = (Actual / Target) * 100
        const eff = inputs.actualSQM > 0 ? ((inputs.actualSQM / parseFloat(target)) * 100).toFixed(0) : "0";

        setCalculated({ targetSQM: target, efficiency: eff });
    }
  }, [inputs, selectedTask]);

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
           <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-300 text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4" /> Team A
           </div>
           <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-300 text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" /> Shift 1
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: TASK LIST (Select a Station) */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl min-h-[600px]">
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
                            <p className="text-xs text-zinc-400">Norm: {STATION_NORMS[task.name]?.avg || 60} mins/sqm</p>
                        </div>
                     </div>
                     <span className={`text-xs px-3 py-1 rounded-full ${
                         task.status === 'In Progress' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-800 text-zinc-500'
                     }`}>{task.status}</span>
                  </div>
              ))}
           </div>
        </div>

        {/* RIGHT: DATA ENTRY PANEL (Matches Excel Logic) */}
        <div className="space-y-6">
            
            {selectedTask ? (
                <div className="bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-3xl p-8 shadow-2xl sticky top-6">
                    <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                        {selectedTask.name}
                    </h3>

                    <div className="space-y-5">
                        {/* Input 1: Manpower */}
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">1. Manpower (Nos)</label>
                            <div className="flex items-center bg-zinc-800/50 rounded-xl border border-white/5 overflow-hidden">
                                <div className="p-3 text-zinc-400 border-r border-white/5"><Users className="w-5 h-5"/></div>
                                <input 
                                    type="number" 
                                    className="w-full bg-transparent p-3 text-white outline-none font-mono"
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
                                    className="w-full bg-transparent p-3 text-white outline-none font-mono"
                                    value={inputs.hours}
                                    onChange={e => setInputs({...inputs, hours: parseFloat(e.target.value)})}
                                />
                            </div>
                        </div>

                        {/* OUTPUT: Estimated Productivity (Excel Formula) */}
                        <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                            <p className="text-xs text-blue-300 uppercase font-bold mb-1">Estimated Target (Sheet 3)</p>
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
                            <span className="text-zinc-400 text-sm">Efficiency</span>
                            <span className={`text-xl font-bold ${parseInt(calculated.efficiency) >= 100 ? "text-green-400" : "text-orange-400"}`}>
                                {calculated.efficiency}%
                            </span>
                        </div>

                        <button className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg">
                            <Save className="w-5 h-5" /> Submit Log
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 border border-white/5 rounded-3xl bg-white/[0.02] p-10">
                    <Calculator className="w-16 h-16 opacity-20 mb-4" />
                    <p>Select a station from the list to start data entry.</p>
                </div>
            )}
            
        </div>

      </div>
    </div>
  );
}