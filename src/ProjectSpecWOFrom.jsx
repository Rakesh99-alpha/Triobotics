'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, Calendar, User, Settings, Save, 
  CheckCircle, Package, Layers, FileText, ArrowRight 
} from "lucide-react";

// --- 1. Initial State ---
const initialForm = {
  docNo: "PSS-001",
  date: new Date().toISOString().substring(0, 10),
  customerName: "",
  projectName: "",
  projectNumber: "",
  workOrderDate: new Date().toISOString().substring(0, 10),
  projectStartDate: "",
  projectEndDate: "",
  patternMaterial: "",
  deliverables: "",
  process: "",
  description: "", 
};

// --- 2. Logic Generator (Preserving your logic) ---
function generateWorkOrder(form: typeof initialForm) {
  const woNo = "WO-" + Date.now().toString().slice(-6); 
  
  // LOGIC: Routing changes based on "Deliverables"
  const routingSteps =
    form.deliverables === "Master Pattern"
      ? ["Pattern Prep", "Tooling/Mold", "Layup", "Cure", "Trim", "QC", "Ship"]
      : ["Tooling/Mold", "Layup", "Infusion", "Cure", "Trim", "QC", "Ship"];

  // LOGIC: BOM generation
  const bom = [
    { name: "Resin (Standard)", qty: 60, units: "kg" },
    { name: "Glass Fiber", qty: 50, units: "kg" },
  ];

  // Add the pattern material if selected
  if (form.patternMaterial) {
    bom.push({ name: form.patternMaterial, qty: 1, units: "block/set" });
  }

  // Add extras based on process
  if (form.process === "Infusion") {
    bom.push({ name: "Infusion Mesh", qty: 20, units: "sqm" });
    bom.push({ name: "Vacuum Bagging Film", qty: 25, units: "sqm" });
  }

  return {
    WO: woNo,
    project: form.projectName,
    customer: form.customerName,
    start: form.projectStartDate,
    end: form.projectEndDate,
    routing: routingSteps,
    BOM: bom,
    specSheet: form,
    status: "Scheduled",
  };
}

export default function ProjectSpecWOForm() {
  const [formData, setFormData] = useState(initialForm);
  const [workOrder, setWorkOrder] = useState<any>(null);

  // Load PSS number automatically on mount
  useEffect(() => {
    // You could fetch the next available Doc No here
    setFormData(prev => ({...prev, docNo: `PSS-${Math.floor(Math.random() * 1000)}`}));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if(!formData.customerName || !formData.projectName) {
        alert("Please fill in Customer and Project Name");
        return;
    }
    const newWO = generateWorkOrder(formData);
    setWorkOrder(newWO);

    // Save to localStorage (Simulating Backend Save)
    const allWOs = JSON.parse(localStorage.getItem("workorders") || "[]");
    localStorage.setItem("workorders", JSON.stringify([newWO, ...allWOs]));
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-7xl mx-auto"
      >
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <ClipboardList className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Project Specification Sheet</h1>
            <p className="text-zinc-400 mt-1">Define Specs & Generate Work Orders</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* LEFT SIDE: THE INPUT FORM */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Row 1: Document Info */}
              <div className="flex gap-4">
                 <div className="w-1/3">
                    <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Doc No</label>
                    <input name="docNo" value={formData.docNo} readOnly className="w-full mt-1 bg-zinc-900/30 border border-white/5 rounded-lg px-4 py-2 text-zinc-500 cursor-not-allowed" />
                 </div>
                 <div className="w-1/3">
                    <label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Date</label>
                    <input name="date" value={formData.date} readOnly className="w-full mt-1 bg-zinc-900/30 border border-white/5 rounded-lg px-4 py-2 text-zinc-500 cursor-not-allowed" />
                 </div>
              </div>

              {/* Section 1: Client Details */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                  <User className="w-4 h-4 text-purple-400" /> Client Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Customer Name *</label>
                    <input name="customerName" value={formData.customerName} onChange={handleChange} placeholder="Enter Client Name" className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Project Name *</label>
                    <input name="projectName" value={formData.projectName} onChange={handleChange} placeholder="e.g. Hull 42" className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Project #</label>
                    <input name="projectNumber" value={formData.projectNumber} onChange={handleChange} placeholder="PRJ-000" className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors" />
                  </div>
                </div>
              </div>

              {/* Section 2: Timeline */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                  <Calendar className="w-4 h-4 text-blue-400" /> Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Start Date</label>
                    <input type="date" name="projectStartDate" value={formData.projectStartDate} onChange={handleChange} className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Delivery Date</label>
                    <input type="date" name="projectEndDate" value={formData.projectEndDate} onChange={handleChange} className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors" />
                  </div>
                </div>
              </div>

              {/* Section 3: Tech Specs */}
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-white flex items-center gap-2 border-b border-white/5 pb-2">
                  <Settings className="w-4 h-4 text-green-400" /> Technical Specs
                </h3>
                
                {/* Pattern Material */}
                <div>
                  <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Pattern Material</label>
                  <select name="patternMaterial" value={formData.patternMaterial} onChange={handleChange} className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none cursor-pointer">
                    <option value="">-- Select Material --</option>
                    <option value="PU Block">PU Block (High Density)</option>
                    <option value="PS Foam with Tooling Paste">PS Foam with Tooling Paste</option>
                    <option value="MDF">MDF (Standard)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Deliverables</label>
                    <select name="deliverables" value={formData.deliverables} onChange={handleChange} className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none cursor-pointer">
                      <option value="">-- Select --</option>
                      <option value="Master Pattern">Master Pattern</option>
                      <option value="Direct Mould">Direct Mould</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Process</label>
                    <select name="process" value={formData.process} onChange={handleChange} className="w-full mt-1 bg-zinc-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none cursor-pointer">
                      <option value="">-- Select --</option>
                      <option value="Hand Layup">Hand Layup</option>
                      <option value="Infusion">Vacuum Infusion</option>
                      <option value="RTM">RTM</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]">
                <Save className="w-5 h-5" /> Generate Work Order
              </button>
            </form>
          </div>

          {/* RIGHT SIDE: THE PREVIEW */}
          <div className="flex flex-col">
            <AnimatePresence mode="wait">
            {!workOrder ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 bg-white/5 border border-white/10 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-500 p-12 min-h-[500px]"
              >
                <FileText className="w-20 h-20 mb-4 opacity-20" />
                <p className="text-lg font-medium">Ready to Generate</p>
                <p className="text-sm opacity-60">Fill out the PSS form to create a Work Order preview</p>
              </motion.div>
            ) : (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-100 text-zinc-900 rounded-xl overflow-hidden shadow-2xl relative min-h-[600px] flex flex-col"
              >
                {/* Visual "Paper" Header */}
                <div className="bg-zinc-200 p-6 border-b border-zinc-300 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-800">WORK ORDER</h2>
                    <p className="text-sm text-zinc-600 font-mono">{workOrder.WO}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold uppercase tracking-wide">
                    <CheckCircle className="w-3 h-3" />
                    {workOrder.status}
                  </div>
                </div>

                <div className="p-8 space-y-8 flex-1">
                  {/* Project Summary */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold">Client</p>
                      <p className="font-semibold text-lg">{workOrder.customer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-bold">Project</p>
                      <p className="font-semibold text-lg">{workOrder.project}</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-white p-4 rounded-lg border border-zinc-200 flex justify-between items-center shadow-sm">
                    <div>
                      <span className="text-zinc-400 text-xs block uppercase font-bold">Start</span>
                      <span className="font-mono font-bold text-zinc-700">{workOrder.start || "TBD"}</span>
                    </div>
                    <div className="text-zinc-300"><ArrowRight className="w-5 h-5" /></div>
                    <div className="text-right">
                      <span className="text-zinc-400 text-xs block uppercase font-bold">Delivery</span>
                      <span className="font-mono font-bold text-red-600">{workOrder.end || "TBD"}</span>
                    </div>
                  </div>

                  {/* Routing Steps */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Production Routing
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {workOrder.routing.map((step: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white border border-zinc-300 rounded text-sm font-semibold text-zinc-600 shadow-sm">
                          {i+1}. {step}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bill of Materials Table */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" /> Bill of Materials
                    </h4>
                    <div className="border border-zinc-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-200 text-zinc-600 font-semibold">
                          <tr>
                            <th className="px-4 py-2">Material</th>
                            <th className="px-4 py-2 text-center">Qty</th>
                            <th className="px-4 py-2 text-right">Units</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                          {workOrder.BOM.map((item: any, i: number) => (
                            <tr key={i}>
                              <td className="px-4 py-2 font-medium text-zinc-800">{item.name}</td>
                              <td className="px-4 py-2 font-mono text-center">{item.qty}</td>
                              <td className="px-4 py-2 text-zinc-500 text-right">{item.units}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-zinc-100 p-4 border-t border-zinc-300 text-center">
                   <p className="text-xs text-zinc-500">Work Order generated via ERP • Approved for Production</p>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}