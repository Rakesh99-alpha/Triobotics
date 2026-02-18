'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Calendar, Settings, Layers, 
  PenTool, Ruler, Save, AlertCircle, X, CheckCircle 
} from "lucide-react";

// --- CONFIGURATION ---
const FIELD_GROUPS = [
  { title: "Pattern & Process", icon: <Layers className="w-5 h-5 text-blue-400" />, fields: [0, 1, 2, 3, 4] },
  { title: "Quality Standards", icon: <Ruler className="w-5 h-5 text-green-400" />, fields: [5, 6, 7, 13] },
  { title: "Mould Specifications", icon: <Settings className="w-5 h-5 text-purple-400" />, condition: "mould_only", fields: [8, 9, 16, 18] },
  { title: "CMM & Finishing", icon: <PenTool className="w-5 h-5 text-orange-400" />, fields: [10, 11, 12, 14, 15, 17] }
];

const LABELS = [
  "Pattern Material", "Project Deliverables", "Part Production Process", "Part Extrapolation", "Flange",
  "Glossiness", "Shrinkage Allowance", "Barcol Hardness", "Mould Material", "Mould Thickness",
  "CMM - Surface", "CMM - Pattern", "CMM - Mould", "CMM Tolerance", "Trim Line Marking",
  "Trim Line Marking In", "No of Prints", "Special Requirements", "Colour Requirements"
];

const BASE_OPTIONS = [
  ["PU Block", "MDF", "PS Foam with Tooling Paste"], ["Master Pattern", "Direct Mould", "Both"],
  ["Hand Layup", "Spray Up", "Infusion", "RTM", "Other"], ["10", "15", "20", "25", "30", "35", "Other"],
  ["Default"], ["Glossy 90+10", "Semi-glossy 60+/-10", "Matte 30+/-10"], ["0.5", "0.7", "1.0"],
  ["30", "35", "40", "45"], ["Vinyl ester", "Epoxy"], ["10 mm", "12 mm", "15 mm"], ["Pattern", "Mould", "Both"],
  ["Surface", "Trim Line", "Hole Marking"], ["Surface", "Trim Line", "Hole Marking"],
  ["Less than 3 sqm ±1MM", "3.1-7.5 sqm ±1.5MM", "7.6-10 sqm ±2MM", "10-20 sqm ±2.5MM", "20-30 sqm ±3MM", "Above 30 sqm ±3MM"],
  ["Manual", "CMM"], ["Pattern", "Mould"], ["500", "750", "1000"],
  ["RPS Bushes", "Balls", "Offset lines", "Steel mesh", "First Article", "Skin Article"], ["Grey", "Blue", "Custom"]
];

export default function ProjectSpecificationSheet() {
  const [formData, setFormData] = useState({
    docNo: "PSS-" + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().substring(0, 10),
    customerName: "",
    projectName: "",
    projectNumber: "",
    projectStartDate: "",
    projectEndDate: "",
    fields: Array(19).fill(""),
    pasteThickness: ""
  });
  const [flangeOptions, setFlangeOptions] = useState(["Default"]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const process = formData.fields[2];
    let options = ["Default"];
    if (process === "Hand Layup" || process === "Spray Up") options = ["80mm", "100mm", "150mm", "200mm"];
    else if (process === "RTM") options = ["200mm"];
    else if (process === "Infusion") options = ["150mm"];
    setFlangeOptions(options);
  }, [formData.fields[2]]);

  // 1. Auto-Fill Customer Name on Load + project end date logic
  useEffect(() => {
    // Auto-fill customer name from saved session (if available)
    try {
      const session = localStorage.getItem('currentUser');
      if (session) {
        const user = JSON.parse(session);
        if (user?.name) {
          setFormData(prev => ({ ...prev, customerName: prev.customerName || user.name }));
        }
      }
    } catch (e) {
      // ignore malformed session data
      console.warn('Failed to read currentUser from localStorage', e);
    }

    // Existing date logic: auto-calc projectEndDate from projectStartDate
    if (formData.projectStartDate) {
      const confirmationDate = new Date(formData.projectStartDate);
      confirmationDate.setDate(confirmationDate.getDate() + 32);
      setFormData(prev => ({ ...prev, projectEndDate: confirmationDate.toISOString().substring(0, 10) }));
    }
  }, [formData.projectStartDate]);

  const updateField = (index: number, value: string) => {
    const updated = [...formData.fields];
    updated[index] = value;
    setFormData(prev => ({ ...prev, fields: updated }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateClick = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.customerName || !formData.projectName) {
        alert("Please fill in Customer and Project Name");
        return;
    }
    setShowPreview(true);
  };

  // 2. Modified Submit to Redirect to Customer Dashboard
  const handleFinalSubmit = () => {
    const newNotification = {
      id: Date.now(),
      type: 'New Project',
      title: `New Spec: ${formData.projectName}`,
      message: `PSS Received from Customer ${formData.customerName}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      data: { ...formData, status: "Submitted" } // Add Initial Status
    };

    // Save for PM
    const currentNotifications = JSON.parse(localStorage.getItem('erp_notifications') || "[]");
    localStorage.setItem('erp_notifications', JSON.stringify([newNotification, ...currentNotifications]));

    // Save for Customer Dashboard (So they can see their own project)
    const myProjects = JSON.parse(localStorage.getItem('my_projects') || "[]");
    localStorage.setItem('my_projects', JSON.stringify([newNotification, ...myProjects]));

    setShowPreview(false);
    alert("Specification Submitted! Redirecting to your Dashboard...");

    // REDIRECT TO CLIENT DASHBOARD
    window.location.href = '/customer';
  };

  const showPasteThickness = formData.fields[0] === "PS Foam with Tooling Paste";
  const isMasterPattern = formData.fields[1] === "Master Pattern";

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 md:p-12 relative">
      <div className="fixed inset-0 pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:2rem_2rem]" />
         <div className="absolute top-20 right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <header className="flex items-end justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="text-purple-400 w-8 h-8" /> 
              Project Specification
            </h1>
            <p className="text-zinc-400 mt-2">Technical requirements & quote generation</p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-zinc-500 font-bold uppercase">Doc Ref</div>
            <div className="font-mono text-purple-300 text-lg">{formData.docNo}</div>
          </div>
        </header>

        {/* Form Sections */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Calendar className="w-5 h-5 text-zinc-400" /> General Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Customer Name</label>
                    <input name="customerName" value={formData.customerName} onChange={handleChange} className="w-full mt-1 bg-zinc-800 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="Enter Client Name..." />
                </div>
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Project Name</label>
                    <input name="projectName" value={formData.projectName} onChange={handleChange} className="w-full mt-1 bg-zinc-800 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Project Number</label>
                    <input name="projectNumber" value={formData.projectNumber} onChange={handleChange} className="w-full mt-1 bg-zinc-800 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Confirmation Date</label>
                    <input type="date" name="projectStartDate" value={formData.projectStartDate} onChange={handleChange} className="w-full mt-1 bg-zinc-800 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 outline-none" />
                </div>
                <div>
                    <label className="text-xs text-purple-400 uppercase font-bold ml-1 flex items-center gap-1">Delivery (Auto +32d) <AlertCircle className="w-3 h-3" /></label>
                    <input type="date" name="projectEndDate" value={formData.projectEndDate} readOnly className="w-full mt-1 bg-zinc-800/50 border border-white/5 rounded-lg p-3 text-zinc-400 cursor-not-allowed" />
                </div>
            </div>
        </div>

        {FIELD_GROUPS.map((group, gIndex) => {
            if (group.condition === "mould_only" && isMasterPattern) return null;
            return (
                <div key={gIndex} className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">{group.icon} {group.title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {group.fields.map((fieldIndex) => {
                            if (isMasterPattern && [12].includes(fieldIndex)) return null; 
                            return (
                                <div key={fieldIndex}>
                                    <label className="text-xs text-zinc-500 uppercase font-bold ml-1 block mb-1">{LABELS[fieldIndex]}</label>
                                    <div className="relative">
                                        <select value={formData.fields[fieldIndex]} onChange={(e) => updateField(fieldIndex, e.target.value)} className="w-full appearance-none bg-zinc-800 border border-white/10 hover:border-purple-500/50 rounded-lg p-3 pr-8 text-sm text-white focus:border-purple-500 outline-none cursor-pointer">
                                            <option value="">Select Option...</option>
                                            {(fieldIndex === 4 ? flangeOptions : BASE_OPTIONS[fieldIndex]).map((opt, i) => (
                                                <option key={i} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                        {group.fields.includes(0) && showPasteThickness && (
                            <div className="col-span-1 md:col-span-2 bg-purple-900/10 p-4 rounded-xl border border-purple-500/30">
                                <label className="text-xs text-purple-300 uppercase font-bold ml-1 block mb-1">Paste Thickness Required</label>
                                <select name="pasteThickness" value={formData.pasteThickness} onChange={handleChange} className="w-full bg-zinc-900 border border-purple-500/50 rounded-lg p-3 text-white outline-none">
                                    <option value="">Select Thickness...</option>
                                    {[...Array(15)].map((_, i) => (<option key={i} value={`${i + 1} mm`}>{i + 1} mm</option>))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}

        <div className="pt-8 pb-20">
            <button onClick={handleGenerateClick} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg py-5 rounded-xl shadow-lg transition-all transform hover:scale-[1.01]">
                <Save className="w-6 h-6 mr-2 inline" /> Review & Submit Quote
            </button>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-zinc-100 w-full max-w-3xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl flex flex-col">
              <div className="bg-zinc-800 px-6 py-4 flex justify-between items-center border-b border-zinc-700">
                <h3 className="text-white font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Quote Preview</h3>
                <button onClick={() => setShowPreview(false)} className="text-zinc-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-white text-zinc-900 font-serif">
                 <div className="border-b-2 border-zinc-800 pb-4 mb-6 flex justify-between items-end">
                    <div><h1 className="text-4xl font-sans font-bold text-black">PSS</h1><p className="text-zinc-500 font-sans text-sm uppercase">Specification Sheet</p></div>
                    <div className="text-right font-sans"><div className="text-xs text-zinc-500 uppercase font-bold">Document Ref</div><div className="text-lg font-mono font-bold text-zinc-800">{formData.docNo}</div></div>
                 </div>
                 <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-100 grid grid-cols-2 gap-4 font-sans text-sm mb-6">
                    <div><span className="block text-xs font-bold text-zinc-400 uppercase">Customer</span><span className="font-bold text-lg">{formData.customerName || "—"}</span></div>
                    <div><span className="block text-xs font-bold text-zinc-400 uppercase">Project</span><span className="font-bold text-lg">{formData.projectName || "—"}</span></div>
                 </div>
                 <table className="w-full text-sm border-collapse font-sans">
                    <tbody>
                        {LABELS.map((label, i) => {
                             if (isMasterPattern && [8, 9, 12, 16, 17, 18].includes(i)) return null;
                             const value = formData.fields[i];
                             if (!value) return null;
                             return (<tr key={i} className="border-b border-zinc-50"><td className="py-2 text-zinc-500 font-medium pr-4">{label}</td><td className="py-2 font-bold text-zinc-800">{value}</td></tr>);
                        })}
                    </tbody>
                 </table>
              </div>
              <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex justify-end gap-3">
                 <button onClick={() => setShowPreview(false)} className="px-6 py-2 rounded-lg text-zinc-600 hover:bg-zinc-200 font-semibold">Edit</button>
                 <button onClick={handleFinalSubmit} className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Confirm & Send to PM</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}