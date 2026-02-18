'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle, Clock, Users, 
  Plus, Search, Filter, AlertCircle, MoreVertical 
} from 'lucide-react';

// --- MOCK DATA (Replace with your real DB logic later) ---
const MODULE_DATA: Record<string, any> = {
  stockbuilding: { 
    title: "Stock Building", 
    tasks: [
      { id: 1, name: "Cut PU Blocks for Hull #42", status: "In Progress", due: "Today", assignee: "Rajesh" },
      { id: 2, name: "Prepare Wood Inserts", status: "Pending", due: "Tomorrow", assignee: "Amit" }
    ]
  },
  machining: { 
    title: "Machining Department", 
    tasks: [
      { id: 1, name: "CNC Route Deck Mold", status: "Completed", due: "Yesterday", assignee: "Sarah" },
      { id: 2, name: "Drill Mounting Holes", status: "In Progress", due: "Today", assignee: "Mike" }
    ]
  },
  default: { title: "Department View", tasks: [] }
};

export default function ToolingModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleKey = params.module as string;
  
  const data = MODULE_DATA[moduleKey] || { 
    title: moduleKey ? moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1) : "Module",
    tasks: [] 
  };

  return (
    <div className="space-y-8 font-sans text-white">
      
      {/* Header (From data-entry.html) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{data.title}</h1>
            <p className="text-zinc-400">Task Management & Schedule</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all">
           <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Task List */}
        <div className="lg:col-span-2 space-y-6">
           {/* Filters */}
           <div className="flex gap-4">
              <div className="relative flex-1">
                 <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500" />
                 <input type="text" placeholder="Search tasks..." className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white outline-none focus:border-purple-500/50" />
              </div>
              <button className="p-3 bg-zinc-900/50 border border-white/10 rounded-xl text-zinc-400 hover:text-white">
                 <Filter className="w-5 h-5" />
              </button>
           </div>

           {/* Active Tasks Card */}
           <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl min-h-[500px]">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                 <CheckCircle className="w-5 h-5 text-green-400" /> Active Tasks
              </h2>
              
              <div className="space-y-3">
                {data.tasks.length > 0 ? data.tasks.map((task: any) => (
                  <div 
                    key={task.id}
                    className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between group hover:bg-zinc-800/80 transition-all cursor-pointer"
                  >
                     <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${task.status === 'In Progress' ? 'bg-blue-500 animate-pulse' : task.status === 'Completed' ? 'bg-green-500' : 'bg-zinc-600'}`} />
                        <div>
                           <h3 className="font-bold group-hover:text-blue-300 transition-colors">{task.name}</h3>
                           <p className="text-xs text-zinc-400 flex items-center gap-2">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {task.due}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {task.assignee}</span>
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${task.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                            {task.status}
                        </span>
                        <button className="text-zinc-500 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                     </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                     <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p>No active tasks found for {data.title}.</p>
                  </div>
                )}
              </div>
           </div>
        </div>

        {/* Right Column: Stats & Team */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-3xl p-6 backdrop-blur-xl">
              <h2 className="text-lg font-bold mb-2">Efficiency</h2>
              <div className="text-4xl font-bold text-blue-300">92%</div>
              <p className="text-xs text-zinc-400 mt-1">Based on task completion</p>
           </div>

           <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold">Team Members</h2>
                 <span className="text-xs bg-white/10 px-2 py-1 rounded">4 Online</span>
              </div>
              <div className="space-y-3">
                 {['Rajesh Kumar', 'Amit Singh', 'Sarah Jenkins', 'Mike Ross'].map((name, i) => (
                    <div key={i} className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center text-xs font-bold">
                          {name.charAt(0)}
                       </div>
                       <span className="text-sm text-zinc-300">{name}</span>
                       <div className="ml-auto w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}