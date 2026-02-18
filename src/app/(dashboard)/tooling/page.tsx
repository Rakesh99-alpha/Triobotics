'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Box, Cog, Hammer, Layers, Wrench, Shield, Users2, 
  BarChart2, RotateCw, CheckCircle2, Sparkles, Factory, ArrowLeft
} from 'lucide-react';

const toolingModules = [
  { key: 'stockbuilding', title: 'Stock Building', subtitle: 'Raw material, Stock, Preparation.', icon: Box, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  { key: 'machining', title: 'Machining', subtitle: 'CNC, Manual, Finishing.', icon: Cog, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { key: 'patternfinishing', title: 'Pattern Finishing', subtitle: 'Pattern, Detailing, Prep.', icon: Hammer, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  { key: 'lamination', title: 'Lamination', subtitle: 'Composite, Layup, Curing.', icon: Layers, color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/30' },
  { key: 'mouldfinishing', title: 'Mold Finishing', subtitle: 'Mold, Polishing, Release.', icon: Wrench, color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  { key: 'welding', title: 'Welding', subtitle: 'Weld, Fabrication, Assembly.', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  { key: 'assembly', title: 'Assembly', subtitle: 'Fitting, Bonding, QA.', icon: Users2, color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30' },
  { key: 'cmm', title: 'CMM', subtitle: 'Measurement, Inspection.', icon: BarChart2, color: 'text-teal-400', bg: 'bg-teal-500/20', border: 'border-teal-500/30' },
  { key: 'trimline', title: 'Trimline', subtitle: 'Trimming, Cutting.', icon: RotateCw, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { key: 'quality', title: 'Quality Dept.', subtitle: 'QA, QC, Documentation.', icon: CheckCircle2, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  { key: 'maintenance', title: 'Maintenance', subtitle: 'Repairs, Upkeep.', icon: Sparkles, color: 'text-lime-400', bg: 'bg-lime-500/20', border: 'border-lime-500/30' }
];

export default function ToolingMainPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Tooling Modules</h1>
            <p className="text-zinc-400 text-sm mt-1">Select a department to view tasks</p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/rnd')} 
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-zinc-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-10">
        {toolingModules.map((mod, index) => {
          const IconComponent = mod.icon;
          return (
            <motion.div
              key={mod.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => router.push(`/tooling/${mod.key}`)} 
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:bg-white/10 transition-all cursor-pointer group hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${mod.bg} ${mod.border} rounded-lg flex items-center justify-center border`}>
                  <IconComponent className={`w-6 h-6 ${mod.color}`} />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white">{mod.title}</h3>
              <p className="text-sm text-zinc-400 mt-2">{mod.subtitle}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}