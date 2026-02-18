/**
 * Store Material Request Form (TRIO-F/STE/MRF-01)
 * Digital version of the physical material request form
 * Features: Fill form → Save to Firebase → Print hard copy → Send soft copy to store
 */

'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, Printer, Send, Save, CheckCircle,
  FileText, Package, Clock, Building2, AlertTriangle
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, addDoc } from 'firebase/firestore';

// ==========================================
// TYPES
// ==========================================
interface RequestItem {
  id: string;
  sno: number;
  materialName: string;
  quantity: number;
  uom: string;
  patternMould: string;
  projectName: string;
  takenBy: string;
  remarks: string;
}

interface MaterialRequestFormProps {
  employeeName: string;
  employeeId: string;
  department?: string;
  onClose: () => void;
  onSuccess?: (requestId: string) => void;
}

const UOM_OPTIONS = [
  'Kg', 'Grams', 'Liters', 'ML', 'Nos', 'Pcs', 'Meters', 'MM',
  'Feet', 'Inches', 'Boxes', 'Pairs', 'Sets', 'Rolls', 'Sheets',
  'Sq.Mtr', 'Cu.Mtr', 'Bottles', 'Drums', 'Bags'
];

const DEPARTMENTS = [
  'Stock Building', 'Machining', 'Pattern Finishing', 'Lamination',
  'Mold Finishing', 'Welding', 'Assembly', 'CMM', 'Trimline',
  'Quality Dept', 'Maintenance', 'R&D', 'Production', 'Tooling',
  'Design', 'Purchase', 'Store'
];

const PROJECT_OPTIONS = [
  'Project Alpha', 'Project Beta', 'Project Gamma',
  'Maintenance', 'General', 'R&D', 'Tooling', 'Quality'
];

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function MaterialRequestForm({
  employeeName,
  employeeId,
  department = '',
  onClose,
  onSuccess
}: MaterialRequestFormProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRequestNo, setSavedRequestNo] = useState('');

  // Form header
  const now = new Date();
  const [formData, setFormData] = useState({
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
    department: department,
    materialRequiredTime: '',
    instructions: ''
  });

  // Items
  const [items, setItems] = useState<RequestItem[]>([
    createEmptyItem(1)
  ]);

  function createEmptyItem(sno: number): RequestItem {
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      sno,
      materialName: '',
      quantity: 0,
      uom: 'Nos',
      patternMould: '',
      projectName: '',
      takenBy: employeeName,
      remarks: ''
    };
  }

  const addItem = () => {
    setItems(prev => [...prev, createEmptyItem(prev.length + 1)]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id).map((it, idx) => ({ ...it, sno: idx + 1 })));
  };

  const updateItem = (id: string, field: keyof RequestItem, value: string | number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  // Validate
  const validItems = items.filter(i => i.materialName.trim() && i.quantity > 0);
  const isValid = validItems.length > 0 && formData.department;

  // ==========================================
  // SAVE TO FIREBASE
  // ==========================================
  const handleSave = async (sendToStore: boolean = false) => {
    if (!isValid || saving) return;
    setSaving(true);

    try {
      const ts = new Date();
      const reqNo = `MRF/${ts.getFullYear()}/${String(ts.getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0')}`;

      const docRef = await addDoc(collection(db, 'material_requests'), {
        requestNumber: reqNo,
        docNo: 'TRIO-F/STE/MRF-01',
        revision: 2,
        date: formData.date,
        time: formData.time,
        department: formData.department,
        materialRequiredTime: formData.materialRequiredTime,
        instructions: formData.instructions,
        items: validItems.map((item, idx) => ({
          sno: idx + 1,
          materialName: item.materialName,
          quantity: item.quantity,
          uom: item.uom,
          patternMould: item.patternMould,
          projectName: item.projectName,
          takenBy: item.takenBy,
          remarks: item.remarks,
        })),
        totalItems: validItems.length,
        requestedBy: employeeName,
        requestedById: employeeId,
        status: sendToStore ? 'sent_to_store' : 'draft',
        sentToStore: sendToStore,
        createdAt: ts.toISOString(),
        updatedAt: ts.toISOString(),
      });

      // If sending to store, create notification
      if (sendToStore) {
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'material_request',
            title: 'New Material Request',
            message: `${employeeName} (${formData.department}) requested ${validItems.length} material(s) — MRF: ${reqNo}`,
            documentType: 'material_request',
            documentId: docRef.id,
            forRole: ['store', 'admin', 'md'],
            priority: 'medium',
            read: false,
            createdAt: ts.toISOString(),
            createdBy: employeeName,
          });
        } catch { /* notification failure non-critical */ }

        // Log employee activity
        try {
          await addDoc(collection(db, 'employee_activities'), {
            employeeId,
            action: `Submitted Material Request ${reqNo} — ${validItems.length} items to Store`,
            timestamp: ts.toISOString(),
            type: 'material_request' as string,
          });
        } catch { /* */ }
      }

      setSaved(true);
      setSavedRequestNo(reqNo);
      onSuccess?.(docRef.id);
    } catch (err) {
      console.error('Failed to save material request:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // PRINT
  // ==========================================
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) { alert('Please allow popups'); return; }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Store Material Request Form - ${savedRequestNo || 'Draft'}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #000; }
          
          .form-container { width: 100%; border: 2px solid #333; }
          
          /* Header */
          .header { display: flex; border-bottom: 2px solid #333; }
          .header-logo { width: 180px; padding: 8px 12px; border-right: 1px solid #333; display: flex; align-items: center; }
          .header-logo img { max-width: 150px; }
          .header-title { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; padding: 8px; }
          .header-info { width: 220px; border-left: 1px solid #333; }
          .header-info-row { display: flex; border-bottom: 1px solid #ccc; padding: 3px 6px; font-size: 10px; }
          .header-info-row:last-child { border-bottom: none; }
          .header-info-label { font-weight: bold; width: 60px; }
          .header-info-value { flex: 1; text-align: right; }
          
          /* Sub-header */
          .sub-header { display: flex; border-bottom: 2px solid #333; background: #f5f5f5; }
          .sub-header-cell { padding: 5px 8px; border-right: 1px solid #333; font-size: 10px; }
          .sub-header-cell:last-child { border-right: none; }
          .sub-header-label { font-weight: bold; }
          .sub-header-value { margin-left: 4px; }
          
          /* Table */
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th { background: #e8e8e8; font-size: 10px; font-weight: bold; padding: 6px 4px; border: 1px solid #333; text-align: center; }
          .items-table td { padding: 5px 4px; border: 1px solid #999; text-align: center; font-size: 10px; min-height: 24px; }
          .items-table td.left { text-align: left; padding-left: 6px; }
          .items-table tr.empty td { height: 24px; }
          
          /* Instructions */
          .instructions { border-top: 2px solid #333; padding: 6px 8px; min-height: 50px; }
          .instructions-label { font-weight: bold; font-size: 10px; margin-bottom: 4px; }
          .instructions-text { font-size: 10px; color: #333; }
          
          /* Footer */
          .footer { display: flex; border-top: 2px solid #333; min-height: 60px; }
          .footer-cell { flex: 1; padding: 8px; text-align: center; border-right: 1px solid #333; display: flex; flex-direction: column; justify-content: flex-end; }
          .footer-cell:last-child { border-right: none; }
          .footer-label { font-weight: bold; font-size: 10px; border-top: 1px solid #333; padding-top: 4px; margin-top: 30px; }
          
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Total empty rows needed for print (minimum 15 rows)
  const totalRows = Math.max(15, items.length);
  const emptyRowsCount = totalRows - validItems.length;

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-orange-900/20 to-amber-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Store Material Request Form</h2>
              <p className="text-xs text-zinc-400">TRIO-F/STE/MRF-01 · Rev: 2 · {employeeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" /> Saved: {savedRequestNo}
              </span>
            )}
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg"><X className="w-5 h-5 text-zinc-400" /></button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Header Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Date *</label>
              <input type="date" value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Time</label>
              <input type="time" value={formData.time} onChange={e => setFormData(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50"
                style={{ colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Department *</label>
              <select value={formData.department} onChange={e => setFormData(f => ({ ...f, department: e.target.value }))}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50">
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Material Required Time</label>
              <input type="text" value={formData.materialRequiredTime}
                onChange={e => setFormData(f => ({ ...f, materialRequiredTime: e.target.value }))}
                placeholder="e.g. 10:00 AM / Urgent / Tomorrow"
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/50" />
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" /> Material Items ({validItems.length})
              </h3>
              <button onClick={addItem}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            {/* Table header */}
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-t-xl overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_80px_70px_120px_120px_100px_120px_36px] gap-0 bg-zinc-800 border-b border-zinc-700 text-[10px] font-semibold text-zinc-300 uppercase">
                <div className="px-2 py-2.5 text-center border-r border-zinc-700/50">S.No</div>
                <div className="px-2 py-2.5 border-r border-zinc-700/50">Material Name</div>
                <div className="px-2 py-2.5 text-center border-r border-zinc-700/50">Quantity</div>
                <div className="px-2 py-2.5 text-center border-r border-zinc-700/50">UOM</div>
                <div className="px-2 py-2.5 text-center border-r border-zinc-700/50">Pattern/Mould</div>
                <div className="px-2 py-2.5 text-center border-r border-zinc-700/50">Project Name</div>
                <div className="px-2 py-2.5 text-center border-r border-zinc-700/50">Taken By</div>
                <div className="px-2 py-2.5 text-center border-r border-zinc-700/50">Remarks</div>
                <div className="px-1 py-2.5 text-center"></div>
              </div>

              {/* Item rows */}
              {items.map((item, idx) => (
                <div key={item.id}
                  className="grid grid-cols-[40px_1fr_80px_70px_120px_120px_100px_120px_36px] gap-0 border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  {/* S.No */}
                  <div className="px-2 py-1.5 text-center text-zinc-500 text-xs border-r border-zinc-800/30 flex items-center justify-center">
                    {idx + 1}
                  </div>
                  {/* Material Name */}
                  <div className="px-1 py-1 border-r border-zinc-800/30">
                    <input type="text" value={item.materialName}
                      onChange={e => updateItem(item.id, 'materialName', e.target.value)}
                      placeholder="Enter material name..."
                      className="w-full bg-transparent text-sm text-white outline-none px-1 py-0.5" />
                  </div>
                  {/* Quantity */}
                  <div className="px-1 py-1 border-r border-zinc-800/30">
                    <input type="number" value={item.quantity || ''} min={0}
                      onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-transparent text-sm text-white text-center outline-none px-1 py-0.5" />
                  </div>
                  {/* UOM */}
                  <div className="px-0.5 py-1 border-r border-zinc-800/30">
                    <select value={item.uom} onChange={e => updateItem(item.id, 'uom', e.target.value)}
                      className="w-full bg-transparent text-xs text-white outline-none py-0.5">
                      {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  {/* Pattern/Mould */}
                  <div className="px-1 py-1 border-r border-zinc-800/30">
                    <input type="text" value={item.patternMould}
                      onChange={e => updateItem(item.id, 'patternMould', e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-xs text-white text-center outline-none px-1 py-0.5" />
                  </div>
                  {/* Project */}
                  <div className="px-0.5 py-1 border-r border-zinc-800/30">
                    <select value={item.projectName} onChange={e => updateItem(item.id, 'projectName', e.target.value)}
                      className="w-full bg-transparent text-xs text-white outline-none py-0.5">
                      <option value="">Select</option>
                      {PROJECT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {/* Taken By */}
                  <div className="px-1 py-1 border-r border-zinc-800/30">
                    <input type="text" value={item.takenBy}
                      onChange={e => updateItem(item.id, 'takenBy', e.target.value)}
                      className="w-full bg-transparent text-xs text-white text-center outline-none px-1 py-0.5" />
                  </div>
                  {/* Remarks */}
                  <div className="px-1 py-1 border-r border-zinc-800/30">
                    <input type="text" value={item.remarks}
                      onChange={e => updateItem(item.id, 'remarks', e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-xs text-white text-center outline-none px-1 py-0.5" />
                  </div>
                  {/* Delete */}
                  <div className="flex items-center justify-center">
                    <button onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400 disabled:opacity-20 disabled:cursor-not-allowed">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick add */}
            <button onClick={addItem}
              className="w-full py-2 border border-dashed border-zinc-700 rounded-b-xl text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 text-xs transition-colors">
              + Add another material row
            </button>
          </div>

          {/* Instructions */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Instructions</label>
            <textarea value={formData.instructions}
              onChange={e => setFormData(f => ({ ...f, instructions: e.target.value }))}
              rows={2} placeholder="Any special instructions..."
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none focus:border-orange-500/50" />
          </div>

          {/* Validation messages */}
          {!formData.department && (
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-900/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4" /> Please select a department
            </div>
          )}
          {validItems.length === 0 && items.some(i => i.materialName) && (
            <div className="flex items-center gap-2 text-amber-400 text-xs bg-amber-900/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4" /> At least one item needs a material name and quantity &gt; 0
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/80">
          <div className="text-xs text-zinc-500">
            {validItems.length} item{validItems.length !== 1 ? 's' : ''} · Requested by: {employeeName}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm">
              Cancel
            </button>

            {saved && (
              <button onClick={handlePrint}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-white text-sm flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print Hard Copy
              </button>
            )}

            <button onClick={() => handleSave(false)} disabled={!isValid || saving || saved}
              className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Draft
            </button>

            <button onClick={() => handleSave(true)} disabled={!isValid || saving || saved}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-lg shadow-orange-500/20">
              <Send className="w-4 h-4" /> {saving ? 'Sending...' : 'Send to Store'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ HIDDEN PRINT TEMPLATE ═══ */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef}>
          <div className="form-container" style={{ width: '100%', border: '2px solid #333', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000' }}>
            
            {/* Header Row */}
            <div style={{ display: 'flex', borderBottom: '2px solid #333' }}>
              {/* Logo */}
              <div style={{ width: '180px', padding: '8px 12px', borderRight: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/Tlogo.png" alt="TrioVision" style={{ maxWidth: '160px', maxHeight: '50px', objectFit: 'contain' }} />
              </div>
              {/* Title */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold', padding: '8px' }}>
                STORE MATERIAL REQUEST FORM
              </div>
              {/* Doc Info */}
              <div style={{ width: '220px', borderLeft: '1px solid #333' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '3px 6px', fontSize: '10px' }}>
                  <span style={{ fontWeight: 'bold', width: '60px' }}>Doc No:</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>TRIO-F/STE/MRF-01</span>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #ccc', padding: '3px 6px', fontSize: '10px' }}>
                  <span style={{ fontWeight: 'bold', width: '60px' }}>Rev:</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>2</span>
                </div>
                <div style={{ display: 'flex', padding: '3px 6px', fontSize: '10px' }}>
                  <span style={{ fontWeight: 'bold', width: '60px' }}>Date:</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>{formData.date ? new Date(formData.date).toLocaleDateString('en-IN') : '—'}</span>
                </div>
              </div>
            </div>

            {/* Sub-header */}
            <div style={{ display: 'flex', borderBottom: '2px solid #333', background: '#f5f5f5', fontSize: '10px' }}>
              <div style={{ padding: '5px 8px', borderRight: '1px solid #333', width: '25%' }}>
                <span style={{ fontWeight: 'bold' }}>DATE:</span>
                <span style={{ marginLeft: '8px' }}>{formData.date ? new Date(formData.date).toLocaleDateString('en-IN') : ''}</span>
              </div>
              <div style={{ padding: '5px 8px', borderRight: '1px solid #333', width: '20%' }}>
                <span style={{ fontWeight: 'bold' }}>TIME:</span>
                <span style={{ marginLeft: '8px' }}>{formData.time}</span>
              </div>
              <div style={{ padding: '5px 8px', borderRight: '1px solid #333', width: '25%' }}>
                <span style={{ fontWeight: 'bold' }}>DEPARTMENT:</span>
                <span style={{ marginLeft: '8px' }}>{formData.department}</span>
              </div>
              <div style={{ padding: '5px 8px', width: '30%' }}>
                <span style={{ fontWeight: 'bold' }}>MATERIAL REQUIRED TIME:</span>
                <span style={{ marginLeft: '8px' }}>{formData.materialRequiredTime}</span>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e8e8e8' }}>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center', width: '40px' }}>S.NO</th>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center' }}>MATERIAL NAME</th>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center', width: '70px' }}>QUANTITY</th>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center', width: '50px' }}>UOM</th>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center', width: '100px' }}>PATTERN/MOULD</th>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center' }}>PROJECT NAME</th>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center', width: '90px' }}>TAKEN BY</th>
                  <th style={{ fontSize: '10px', fontWeight: 'bold', padding: '6px 4px', border: '1px solid #333', textAlign: 'center', width: '90px' }}>REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {validItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', textAlign: 'center', fontSize: '10px' }}>{idx + 1}</td>
                    <td style={{ padding: '5px 6px', border: '1px solid #999', textAlign: 'left', fontSize: '10px' }}>{item.materialName}</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', textAlign: 'center', fontSize: '10px' }}>{item.quantity}</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', textAlign: 'center', fontSize: '10px' }}>{item.uom}</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', textAlign: 'center', fontSize: '10px' }}>{item.patternMould || ''}</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', textAlign: 'center', fontSize: '10px' }}>{item.projectName || ''}</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', textAlign: 'center', fontSize: '10px' }}>{item.takenBy || ''}</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', textAlign: 'center', fontSize: '10px' }}>{item.remarks || ''}</td>
                  </tr>
                ))}
                {/* Empty rows */}
                {Array.from({ length: emptyRowsCount }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td style={{ padding: '5px 4px', border: '1px solid #999', height: '24px', fontSize: '10px' }}>&nbsp;</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999' }}>&nbsp;</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999' }}>&nbsp;</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999' }}>&nbsp;</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999' }}>&nbsp;</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999' }}>&nbsp;</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999' }}>&nbsp;</td>
                    <td style={{ padding: '5px 4px', border: '1px solid #999' }}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Instructions */}
            <div style={{ borderTop: '2px solid #333', padding: '6px 8px', minHeight: '50px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '4px' }}>Instructions:</div>
              <div style={{ fontSize: '10px', color: '#333' }}>{formData.instructions || ''}</div>
            </div>

            {/* Footer / Signatures */}
            <div style={{ display: 'flex', borderTop: '2px solid #333', minHeight: '60px' }}>
              <div style={{ flex: 1, padding: '8px', textAlign: 'center', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid #333', paddingTop: '4px', marginTop: '30px' }}>
                  SIGNATURE OF REQUESTOR
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px', textAlign: 'center', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid #333', paddingTop: '4px', marginTop: '30px' }}>
                  SIGNATURE OF HOD
                </div>
              </div>
              <div style={{ flex: 1, padding: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid #333', paddingTop: '4px', marginTop: '30px' }}>
                  PLANT MANAGER
                </div>
              </div>
            </div>

            {/* MRF Number watermark */}
            {savedRequestNo && (
              <div style={{ textAlign: 'right', padding: '4px 8px', fontSize: '9px', color: '#999' }}>
                Ref: {savedRequestNo} · Generated: {new Date().toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}