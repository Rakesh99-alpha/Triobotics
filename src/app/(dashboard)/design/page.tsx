'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, UploadCloud, CheckCircle, 
  Wrench, AlertTriangle, Clock, Layers, Sparkles, History
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, updateDoc, doc } from 'firebase/firestore';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

// Status badge helper for dark theme
const getStatusBadge = (status: string) => {
  switch(status) {
    case 'Approved': return "bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold";
    case 'Pending': return "bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-xs font-bold";
    case 'In Review': return "bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold";
    default: return "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 px-3 py-1 rounded-full text-xs font-bold";
  }
};

export default function DesignToolingDashboard() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [molds, setMolds] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('design'); // 'design' or 'tooling'

  // 1. Listen to Design Requests (Assigned by PM)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'design_tasks'), (snap) => {
      setDesigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 2. Listen to Molds from Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'molds'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMolds(items);
    });
    return () => unsub();
  }, []);

  // 2. Upload Logic (Simulated)
  const handleUpload = async (taskId: string) => {
    const fileName = prompt("Enter CAD File Name (e.g., Final_Rev3.stp):");
    if (!fileName) return;

    // Update status to 'In Review' for PM to see
    await updateDoc(doc(db, 'design_tasks', taskId), {
      status: 'In Review',
      file: fileName,
      uploadDate: new Date().toISOString()
    });
    alert("File Uploaded! Sent to PM for Approval.");
  };

  // 3. Tooling Maintenance Logic
  const toggleMoldStatus = async (moldId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Maintenance' : 'Active';
    try {
      await updateDoc(doc(db, 'molds', moldId), { status: newStatus });
    } catch (err) {
      console.error('Failed to update mold status:', err);
      // Fallback: update local state
      setMolds(prev => prev.map(m => m.id === moldId ? { ...m, status: newStatus } : m));
    }
  };

  return (
    <div className="min-h-screen text-white font-sans space-y-8">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Design & Tooling Center</h1>
            <p className="text-zinc-400">Engineering Lifecycle Management</p>
          </div>
        </div>
        
        {/* Tab Switcher */}
        <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex backdrop-blur-xl">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('design')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'design' 
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" /> Design Studio
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('tooling')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tooling' 
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-4 h-4" /> Tooling Maintenance
          </motion.button>
        </div>
      </motion.div>

      {/* --- TAB 1: DESIGN STUDIO --- */}
      <AnimatePresence mode="wait">
      {activeTab === 'design' && (
        <motion.div 
          key="design-tab"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={staggerContainer}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Active Tasks */}
          <motion.div 
            variants={fadeInUp}
            transition={{ duration: 0.4 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
          >
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400"/> Pending Design Tasks
            </h3>
            <motion.div variants={staggerContainer} className="space-y-4">
              {designs.map((task, index) => (
                <motion.div 
                  key={task.id} 
                  variants={fadeInUp}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white group-hover:text-purple-300 transition-colors">{task.projectName}</h4>
                    <span className={getStatusBadge(task.status)}>{task.status}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-4 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Required by: {task.deadline}
                  </p>
                  
                  {task.status === 'Pending' ? (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpload(task.id)} 
                      className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/20 transition-all"
                    >
                      <UploadCloud className="w-4 h-4" /> Upload CAD
                    </motion.button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-zinc-300 bg-white/5 p-3 rounded-lg border border-white/5">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="font-medium">{task.file}</span>
                      {task.status === 'Approved' && (
                        <motion.div 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                          className="ml-auto"
                        >
                          <CheckCircle className="w-4 h-4 text-green-400"/>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
              {designs.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No new design requests.</p>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Version History (The "Mega Industry" Feature) */}
          <motion.div 
            variants={fadeInUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
          >
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" /> Version Control
            </h3>
            <div className="relative border-l-2 border-purple-500/30 ml-3 space-y-6 pl-6">
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.2 }}
                 className="relative"
               >
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-zinc-900 shadow-lg shadow-green-500/30"></span>
                  <p className="text-sm font-bold text-white">SpaceX Nose Cone - Rev 3</p>
                  <p className="text-xs text-zinc-500">Approved by MD • Yesterday</p>
               </motion.div>
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.3 }}
                 className="relative"
               >
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-zinc-600 border-2 border-zinc-900"></span>
                  <p className="text-sm font-bold text-zinc-500">SpaceX Nose Cone - Rev 2</p>
                  <p className="text-xs text-zinc-600">Rejected (Wall thickness issue)</p>
               </motion.div>
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.4 }}
                 className="relative"
               >
                  <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-zinc-600 border-2 border-zinc-900"></span>
                  <p className="text-sm font-bold text-zinc-500">SpaceX Nose Cone - Rev 1</p>
                  <p className="text-xs text-zinc-600">Initial Design • 3 days ago</p>
               </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- TAB 2: TOOLING CENTER --- */}
      <AnimatePresence mode="wait">
      {activeTab === 'tooling' && (
        <motion.div 
          key="tooling-tab"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {molds.map((mold, index) => (
            <motion.div 
              key={mold.id} 
              variants={fadeInUp}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className={`bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl border-l-4 transition-all ${
                mold.status === 'Active' ? 'border-l-green-500' : 'border-l-red-500'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg text-white">{mold.name}</h4>
                  <p className="text-xs text-zinc-500">ID: {mold.id}</p>
                </div>
                <motion.div 
                  whileHover={{ rotate: 10 }}
                  className={`p-2 rounded-lg ${
                    mold.status === 'Active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {mold.status === 'Active' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                </motion.div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-2 font-bold">
                  <span className="text-zinc-400">Mold Health</span>
                  <span className={mold.life > 50 ? 'text-green-400' : 'text-orange-400'}>{mold.life}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${mold.life}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${mold.life > 50 ? 'bg-gradient-to-r from-green-600 to-green-400' : 'bg-gradient-to-r from-orange-600 to-orange-400'}`}
                  />
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleMoldStatus(mold.id, mold.status)}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  mold.status === 'Active' 
                  ? 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' 
                  : 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-500/20 hover:from-green-500 hover:to-green-400'
                }`}
              >
                {mold.status === 'Active' ? <><Wrench className="w-4 h-4"/> Report Issue</> : <><CheckCircle className="w-4 h-4"/> Mark Ready</>}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}