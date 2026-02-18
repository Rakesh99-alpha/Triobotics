'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, Calendar, User, Settings, Save, 
  CheckCircle, Package, Layers, FileText, ArrowRight, Calculator 
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, addDoc } from 'firebase/firestore';

// --- CONFIGURATION ---
const PROCESS_OPTIONS = ['Hand Layup', 'Infusion', 'RTM', 'Spray Up'];
const DELIVERABLES = ['Master Pattern', 'Direct Mould', 'Production Part'];
const MATERIALS = ['PU Block', 'PS Foam', 'MDF', 'Wood'];

// Generate document number - using timestamp for uniqueness
const generateDocNo = () => `PSS-${Date.now().toString().slice(-4)}`;

export default function CustomerProjectForm() {
  const router = useRouter();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const docNoRef = useRef(generateDocNo());
  
  // Form State (Matches your PSS requirements)
  const [formData, setFormData] = useState({
    docNo: '',
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    projectName: '',
    projectNumber: '',
    startDate: '',
    deliveryDate: '',
    patternMaterial: '',
    deliverables: 'Production Part',
    process: 'Hand Layup',
    dimensions: { length: 0, width: 0, sqm: 0 }
  });

  // Initialize docNo on mount to avoid hydration mismatch
  useEffect(() => {
    setFormData(prev => ({ ...prev, docNo: docNoRef.current }));
  }, []);

  // --- AUTO-CALCULATE SQM ---
  useEffect(() => {
    const sqm = parseFloat((formData.dimensions.length * formData.dimensions.width).toFixed(2));
    setFormData(prev => ({ ...prev, dimensions: { ...prev.dimensions, sqm } }));
  }, [formData.dimensions.length, formData.dimensions.width]);

  // --- SUBMIT HANDLER (The "Auto-BOM" Engine) ---
  const handleSubmit = async () => {
    if (!formData.customerName || !formData.projectName || formData.dimensions.sqm <= 0) {
        alert("Please fill in Customer Name, Project Name, and Dimensions.");
        return;
    }

    // 1. Calculate BOM based on Norms (The Math)
    const area = formData.dimensions.sqm;
    const resin = (area * 1.5).toFixed(1); // 1.5kg/sqm
    const gelcoat = (area * 0.6).toFixed(1); // 0.6kg/sqm
    const fiber = (area * 2.2).toFixed(1); // 2.2kg/sqm
    const manpower = Math.ceil(area / 5); // 1 man per 5 sqm

    // 2. Create the Project Object
    const newProject = {
        id: Date.now(),
        projectCode: formData.projectNumber || `PRJ-${Math.floor(Math.random()*1000)}`,
        projectDescription: formData.projectName,
        customer: formData.customerName,
        
        // Production Data
        moldSeries: '32', // Default
        totalMolds: 1, // Default
        targetPartsCompletion: 1, // Default
        sqmPerPart: area,
        
        // Dates
        startDate: formData.startDate,
        targetCompletionDate: formData.deliveryDate,
        
        // The Auto-BOM
        ebom: {
            resin: resin,
            gelcoat: gelcoat,
            fiber: fiber,
            manpower: manpower
        },
        
        // Meta
        status: 'Pending',
        progress: 0,
        createdDate: new Date().toISOString(),
        specs: {
            process: formData.process,
            material: formData.patternMaterial,
            deliverable: formData.deliverables
        }
    };

    // 3. Save to Firebase
    setSaving(true);
    try {
      await addDoc(collection(db, 'projects'), newProject);
      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to save project:', err);
      alert('Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
    
    // Optional: Auto-redirect to PM page after 2s if you are testing flow
    // setTimeout(() => router.push('/pm'), 2000);
  };

  if (isSubmitted) {
      return (
          <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-sans p-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center max-w-lg backdrop-blur-xl"
              >
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-green-400" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Spec Sheet Submitted!</h2>
                  <p className="text-zinc-400 mb-8">Project <strong>{formData.projectName}</strong> has been sent to the Project Manager with an auto-generated BOM.</p>
                  <button onClick={() => setIsSubmitted(false)} className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all">
                      Submit Another
                  </button>
              </motion.div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 md:p-8 pb-20">
      
      {/* Header */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-10">
        <div>
            <h1 className="text-4xl font-light tracking-tight">Customer Portal</h1>
            <p className="text-zinc-400 mt-1">Project Specification Sheet (PSS)</p>
        </div>
        <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[10px] text-zinc-500 uppercase font-bold">Doc No</p>
            <p className="font-mono text-blue-300">{formData.docNo}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* LEFT: FORM */}
         <div className="lg:col-span-2 space-y-6">
             
             {/* 1. Client Details */}
             <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                 <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-300">
                     <User className="w-5 h-5" /> Client Information
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                         <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">Customer Name</label>
                         <input 
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-all"
                            placeholder="e.g. Wonderla Resorts"
                            value={formData.customerName}
                            onChange={e => setFormData({...formData, customerName: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">Project Name</label>
                         <input 
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-all"
                            placeholder="e.g. Water Slide Hull"
                            value={formData.projectName}
                            onChange={e => setFormData({...formData, projectName: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">Project Number (Optional)</label>
                         <input 
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-all"
                            placeholder="PRJ-XXXX"
                            value={formData.projectNumber}
                            onChange={e => setFormData({...formData, projectNumber: e.target.value})}
                         />
                     </div>
                     <div>
                         <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">Delivery Deadline</label>
                         <input 
                            type="date"
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 transition-all"
                            value={formData.deliveryDate}
                            onChange={e => setFormData({...formData, deliveryDate: e.target.value})}
                         />
                     </div>
                 </div>
             </div>

             {/* 2. Technical Specs */}
             <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                 <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-300">
                     <Settings className="w-5 h-5" /> Technical Specifications
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div>
                         <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">Process</label>
                         <select 
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white outline-none cursor-pointer"
                            value={formData.process}
                            onChange={e => setFormData({...formData, process: e.target.value})}
                         >
                             {PROCESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">Pattern Material</label>
                         <select 
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white outline-none cursor-pointer"
                            value={formData.patternMaterial}
                            onChange={e => setFormData({...formData, patternMaterial: e.target.value})}
                         >
                             <option value="">Select...</option>
                             {MATERIALS.map(o => <option key={o} value={o}>{o}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="block text-xs text-zinc-500 uppercase font-bold mb-2">Deliverable</label>
                         <select 
                            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white outline-none cursor-pointer"
                            value={formData.deliverables}
                            onChange={e => setFormData({...formData, deliverables: e.target.value})}
                         >
                             {DELIVERABLES.map(o => <option key={o} value={o}>{o}</option>)}
                         </select>
                     </div>
                 </div>
             </div>

         </div>

         {/* RIGHT: LIVE CALCULATOR */}
         <div className="space-y-6">
             <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-3xl p-6 backdrop-blur-xl sticky top-6">
                 <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                     <Calculator className="w-5 h-5 text-blue-400" /> Dimensions
                 </h3>
                 
                 <div className="space-y-4">
                     <div>
                         <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Length (Meters)</label>
                         <input 
                            type="number"
                            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl p-4 text-white text-right font-mono text-lg outline-none focus:border-blue-500"
                            placeholder="0.00"
                            onChange={e => setFormData({ ...formData, dimensions: { ...formData.dimensions, length: parseFloat(e.target.value) || 0 } })}
                         />
                     </div>
                     <div>
                         <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Width (Meters)</label>
                         <input 
                            type="number"
                            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl p-4 text-white text-right font-mono text-lg outline-none focus:border-blue-500"
                            placeholder="0.00"
                            onChange={e => setFormData({ ...formData, dimensions: { ...formData.dimensions, width: parseFloat(e.target.value) || 0 } })}
                         />
                     </div>
                     
                     <div className="pt-4 border-t border-white/10">
                         <div className="flex justify-between items-center">
                             <span className="text-sm text-zinc-400">Total Area</span>
                             <span className="text-2xl font-bold text-white">{formData.dimensions.sqm} <span className="text-sm font-normal text-zinc-500">m²</span></span>
                         </div>
                     </div>

                     {/* Auto-BOM Preview */}
                     {formData.dimensions.sqm > 0 && (
                         <div className="mt-4 bg-black/30 rounded-xl p-4 space-y-2 text-sm">
                             <p className="text-xs text-zinc-500 uppercase font-bold mb-2">Est. Requirements</p>
                             <div className="flex justify-between">
                                 <span className="text-zinc-300">Resin</span>
                                 <span className="text-white font-mono">{(formData.dimensions.sqm * 1.5).toFixed(1)} kg</span>
                             </div>
                             <div className="flex justify-between">
                                 <span className="text-zinc-300">Gelcoat</span>
                                 <span className="text-white font-mono">{(formData.dimensions.sqm * 0.6).toFixed(1)} kg</span>
                             </div>
                         </div>
                     )}
                 </div>

                 <button 
                    onClick={handleSubmit}
                    disabled={saving}
                    className="w-full mt-8 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                 >
                     <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Submit Requirements'}
                 </button>
             </div>
         </div>

      </div>
    </div>
  );
}