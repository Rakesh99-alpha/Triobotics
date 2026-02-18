'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, CheckCircle, Clock, DollarSign, 
  Layers, Package, TrendingUp, Users, Printer, AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { motion } from 'framer-motion';

// Mock Data for Graphs (since we don't have daily history yet)
const burnData = [
  { day: 'Start', Target: 0, Actual: 0 },
  { day: 'Day 5', Target: 20, Actual: 15 },
  { day: 'Day 10', Target: 40, Actual: 38 },
  { day: 'Day 15', Target: 60, Actual: 65 },
  { day: 'Day 20', Target: 80, Actual: 78 },
];

export default function ProjectCommandCenter() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [stats, setStats] = useState({ materialCost: 0, efficiency: 0 });

  useEffect(() => {
    // 1. Find the specific project
    const allData = JSON.parse(localStorage.getItem('erpProjectData') || "[]");
    // Handle string vs number ID comparison
    const found = allData.find((p: any) => String(p.id) === String(params.id));
    
    if (found) {
        setProject(found);
        
        // 2. Calculate Project Specifics
        const resin = parseFloat(found.ebom?.resin || 0) * 5; // $5/kg
        const gelcoat = parseFloat(found.ebom?.gelcoat || 0) * 8; // $8/kg
        const fiber = parseFloat(found.ebom?.fiber || 0) * 2.5; // $2.5/kg
        
        setStats({
            materialCost: Math.round(resin + gelcoat + fiber),
            efficiency: found.percentCompleted > 0 ? 94 : 0 // Mock efficiency if started
        });
    }
  }, [params.id]);

  if (!project) return <div className="p-20 text-center text-zinc-500">Loading Project...</div>;

  // Chart Data for this specific project
  const pieData = [
    { name: 'Completed', value: project.percentCompleted || 0, color: '#4ade80' },
    { name: 'Remaining', value: 100 - (project.percentCompleted || 0), color: '#f87171' }
  ];

  return (
    <div className="space-y-8 font-sans text-white pb-20">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-xl shadow-lg">
         <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
                onClick={() => router.back()} 
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{project.projectDescription}</h1>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        project.status === 'Completed' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 
                        project.status === 'In Progress' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                        'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    }`}>
                        {project.status}
                    </span>
                </div>
                <p className="text-zinc-400 mt-1 flex flex-wrap gap-4 text-sm">
                    <span>Code: <strong className="text-white font-mono">{project.projectCode}</strong></span>
                    <span>Client: <strong className="text-white">{project.destination || project.customer}</strong></span>
                    <span>PO: <strong className="text-white">{project.poReference}</strong></span>
                </p>
            </div>
         </div>
         <button onClick={() => window.print()} className="mt-4 md:mt-0 px-6 py-3 bg-white text-black font-bold rounded-xl flex items-center gap-2 hover:bg-zinc-200 shadow-xl transition-all">
             <Printer className="w-4 h-4" /> Print Report
         </button>
      </div>

      {/* --- SECTION 1: VISUAL ANALYTICS (Index Style) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* KPI Stack */}
         <div className="space-y-6">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-white/10 p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10" />
                <p className="text-zinc-400 text-xs uppercase font-bold">Estimated Material Cost</p>
                <h2 className="text-4xl font-light text-white mt-2">${stats.materialCost.toLocaleString()}</h2>
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Budget Approved</p>
            </motion.div>

            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{delay: 0.1}} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between relative overflow-hidden">
                <div>
                    <p className="text-zinc-400 text-xs uppercase font-bold">Total Manpower</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{project.ebom?.manpower || 4} <span className="text-lg font-normal text-zinc-500">Staff</span></h3>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><Users className="w-8 h-8"/></div>
            </motion.div>

             <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{delay: 0.2}} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between relative overflow-hidden">
                 <div>
                     <p className="text-zinc-400 text-xs uppercase font-bold">Parts Progress</p>
                     <h3 className="text-3xl font-bold text-white mt-1">{project.totalPartsProduced} <span className="text-lg font-normal text-zinc-500">/ {project.totalParts}</span></h3>
                 </div>
                 <div className="p-3 bg-green-500/20 rounded-2xl text-green-400"><Package className="w-8 h-8"/></div>
             </motion.div>
         </div>

         {/* Charts */}
         <div className="lg:col-span-2 space-y-6">
             {/* Timeline Graph */}
             <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl h-[320px]">
                <h3 className="text-lg font-light mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400"/> Production Velocity</h3>
                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={burnData}>
                            <defs>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="day" stroke="#52525b" axisLine={false} tickLine={false} />
                            <YAxis stroke="#52525b" axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                            <Area type="monotone" dataKey="Actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" strokeWidth={3} />
                            <Area type="monotone" dataKey="Target" stroke="#3b82f6" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>
         </div>
      </div>

      {/* --- SECTION 2: DETAILED BOM TABLE (Data Entry Style) --- */}
      <div className="bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
         <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
             <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                 <Layers className="w-5 h-5 text-purple-400" /> Engineering BOM
             </h3>
             <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30 font-mono">
                 AUTO-GENERATED
             </span>
         </div>
         
         <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-zinc-400 uppercase font-bold text-xs">
                <tr>
                    <th className="p-5">Material / Resource</th>
                    <th className="p-5">Category</th>
                    <th className="p-5 text-center">Unit Norm</th>
                    <th className="p-5 text-center">Total Required</th>
                    <th className="p-5 text-right">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-5 font-medium text-white">Polyester Resin (Iso)</td>
                    <td className="p-5 text-zinc-400">Raw Material</td>
                    <td className="p-5 text-center font-mono text-zinc-500">1.5 kg/m²</td>
                    <td className="p-5 text-center font-mono text-blue-300 font-bold">{project.ebom?.resin || 0} kg</td>
                    <td className="p-5 text-right"><span className="text-orange-400 text-xs font-bold uppercase bg-orange-400/10 px-2 py-1 rounded">Pending</span></td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-5 font-medium text-white">Gelcoat (White)</td>
                    <td className="p-5 text-zinc-400">Surface</td>
                    <td className="p-5 text-center font-mono text-zinc-500">0.6 kg/m²</td>
                    <td className="p-5 text-center font-mono text-blue-300 font-bold">{project.ebom?.gelcoat || 0} kg</td>
                    <td className="p-5 text-right"><span className="text-orange-400 text-xs font-bold uppercase bg-orange-400/10 px-2 py-1 rounded">Pending</span></td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                    <td className="p-5 font-medium text-white">Fiberglass CSM</td>
                    <td className="p-5 text-zinc-400">Reinforcement</td>
                    <td className="p-5 text-center font-mono text-zinc-500">2.0 kg/m²</td>
                    <td className="p-5 text-center font-mono text-blue-300 font-bold">{project.ebom?.fiber || 0} kg</td>
                    <td className="p-5 text-right"><span className="text-orange-400 text-xs font-bold uppercase bg-orange-400/10 px-2 py-1 rounded">Pending</span></td>
                </tr>
                <tr className="hover:bg-white/5 bg-purple-900/10">
                    <td className="p-5 font-bold text-white">Manpower Allocation</td>
                    <td className="p-5 text-zinc-400">Labor</td>
                    <td className="p-5 text-center font-mono text-zinc-500">1 per 5 sqm</td>
                    <td className="p-5 text-center font-mono text-white font-bold">{project.ebom?.manpower || 0} Staff</td>
                    <td className="p-5 text-right"><span className="text-green-400 text-xs font-bold uppercase bg-green-400/10 px-2 py-1 rounded">Allocated</span></td>
                </tr>
            </tbody>
         </table>
      </div>

    </div>
  );
}