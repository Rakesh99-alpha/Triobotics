'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Plus,
  CheckCircle,
  RefreshCw,
  Package,
  Building2,
  AlertTriangle,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Upload,
  Settings,
  Boxes,
  ArrowRight,
  Save,
  X,
  Search,
  Edit2
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import {
  collection,
  writeBatch,
  doc,
  addDoc,
  onSnapshot
} from 'firebase/firestore';

// ==========================================
// TYPES
// ==========================================

type SetupStep = 'welcome' | 'materials' | 'suppliers' | 'locations' | 'settings' | 'review';
type Category = 'Raw Material' | 'Consumable' | 'Tool' | 'Safety Equipment';

interface MaterialItem {
  id?: string;
  code: string;
  name: string;
  category: Category;
  unit: string;
  currentStock: number;
  minStock: number;
  purchasePrice: number;
  location: string;
  supplier?: string;
}

interface SupplierItem {
  id?: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
}

interface LocationItem {
  id?: string;
  code: string;
  name: string;
  type: 'warehouse' | 'rack' | 'bin' | 'zone';
  capacity: number;
  currentUtilization: number;
  isActive: boolean;
}

// ==========================================
// CONSTANTS
// ==========================================

const CATEGORIES: Category[] = ['Raw Material', 'Consumable', 'Tool', 'Safety Equipment'];
const UNITS = ['Kg', 'Liters', 'Pieces', 'Meters', 'Rolls', 'Boxes', 'Pairs', 'Sets', 'Sheets', 'Nos'];
const LOCATION_TYPES: LocationItem['type'][] = ['warehouse', 'rack', 'bin', 'zone'];

const STEPS: { id: SetupStep; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'welcome', label: 'Welcome', icon: Database, description: 'Get started with store setup' },
  { id: 'materials', label: 'Materials', icon: Package, description: 'Add inventory materials' },
  { id: 'suppliers', label: 'Suppliers', icon: Building2, description: 'Add your suppliers/vendors' },
  { id: 'locations', label: 'Locations', icon: MapPin, description: 'Define storage locations' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Configure store settings' },
  { id: 'review', label: 'Review', icon: CheckCircle, description: 'Review & save everything' },
];

const SAMPLE_MATERIALS: MaterialItem[] = [
  { code: 'GC-WHT-001', name: 'Gelcoat White', category: 'Raw Material', unit: 'Kg', currentStock: 500, minStock: 200, purchasePrice: 350, location: 'Rack A1' },
  { code: 'GC-BLK-002', name: 'Gelcoat Black', category: 'Raw Material', unit: 'Kg', currentStock: 150, minStock: 100, purchasePrice: 380, location: 'Rack A2' },
  { code: 'FG-MAT-003', name: 'Fiberglass Mat', category: 'Raw Material', unit: 'Rolls', currentStock: 80, minStock: 150, purchasePrice: 1200, location: 'Rack B1' },
  { code: 'RS-POL-004', name: 'Resin Polyester', category: 'Raw Material', unit: 'Liters', currentStock: 300, minStock: 250, purchasePrice: 220, location: 'Rack B2' },
  { code: 'HD-MKP-005', name: 'Hardener MEKP', category: 'Raw Material', unit: 'Liters', currentStock: 50, minStock: 30, purchasePrice: 450, location: 'Rack C1' },
  { code: 'RW-WAX-006', name: 'Release Wax', category: 'Consumable', unit: 'Kg', currentStock: 25, minStock: 20, purchasePrice: 850, location: 'Rack C2' },
  { code: 'AC-SOL-007', name: 'Acetone', category: 'Consumable', unit: 'Liters', currentStock: 100, minStock: 50, purchasePrice: 180, location: 'Rack D1' },
  { code: 'BR-SET-008', name: 'Brushes Set', category: 'Tool', unit: 'Sets', currentStock: 10, minStock: 5, purchasePrice: 650, location: 'Rack D2' },
  { code: 'SG-GLV-009', name: 'Safety Gloves', category: 'Safety Equipment', unit: 'Pairs', currentStock: 100, minStock: 50, purchasePrice: 120, location: 'Rack E1' },
  { code: 'SM-N95-010', name: 'Safety Mask N95', category: 'Safety Equipment', unit: 'Pieces', currentStock: 200, minStock: 100, purchasePrice: 35, location: 'Rack E2' },
];

const SAMPLE_SUPPLIERS: SupplierItem[] = [
  { name: 'Supreme Chemicals Pvt Ltd', contact: 'Rajesh Kumar', phone: '+91 9876543210', email: 'sales@supremechem.com', gstin: '27AABCS1234F1ZX', address: 'Plot 45, MIDC Industrial Area', city: 'Pune' },
  { name: 'Fiberglass India Corp', contact: 'Amit Sharma', phone: '+91 9765432109', email: 'info@fiberglass.co.in', gstin: '27AABCF5678G2YZ', address: 'Unit 12, Industrial Estate', city: 'Mumbai' },
  { name: 'SafeGuard Equipments', contact: 'Priya Patel', phone: '+91 9654321098', email: 'orders@safeguard.in', gstin: '27AABCS9012H3AB', address: 'Shop 8, Main Market', city: 'Nashik' },
  { name: 'Industrial Tools Mart', contact: 'Vikram Singh', phone: '+91 9543210987', email: 'sales@toolsmart.com', gstin: '27AABCI3456I4CD', address: 'Building 3, Tool Complex', city: 'Aurangabad' },
  { name: 'Composite Materials Ltd', contact: 'Suresh Reddy', phone: '+91 9432109876', email: 'contact@compositemat.in', gstin: '27AABCC7890J5EF', address: 'Sector 15, Chemical Zone', city: 'Hyderabad' },
];

const SAMPLE_LOCATIONS: LocationItem[] = [
  { code: 'WH-01', name: 'Main Warehouse', type: 'warehouse', capacity: 1000, currentUtilization: 0, isActive: true },
  { code: 'RA-A', name: 'Rack A - Raw Materials', type: 'rack', capacity: 200, currentUtilization: 0, isActive: true },
  { code: 'RA-B', name: 'Rack B - Composites', type: 'rack', capacity: 200, currentUtilization: 0, isActive: true },
  { code: 'RA-C', name: 'Rack C - Chemicals', type: 'rack', capacity: 150, currentUtilization: 0, isActive: true },
  { code: 'RA-D', name: 'Rack D - Tools', type: 'rack', capacity: 100, currentUtilization: 0, isActive: true },
  { code: 'RA-E', name: 'Rack E - Safety', type: 'rack', capacity: 100, currentUtilization: 0, isActive: true },
  { code: 'ZN-QC', name: 'QC Zone', type: 'zone', capacity: 50, currentUtilization: 0, isActive: true },
  { code: 'ZN-RJ', name: 'Rejected Items Zone', type: 'zone', capacity: 30, currentUtilization: 0, isActive: true },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function StoreSetupWizard() {
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [settings, setSettings] = useState({
    lowStockThreshold: 20,
    expiryAlertDays: 30,
    autoReorder: false,
    requireQCForIncoming: true,
    allowNegativeStock: false,
  });

  const [existingMaterials, setExistingMaterials] = useState<MaterialItem[]>([]);
  const [existingSuppliers, setExistingSuppliers] = useState<SupplierItem[]>([]);
  const [existingLocations, setExistingLocations] = useState<LocationItem[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [completedSteps, setCompletedSteps] = useState<SetupStep[]>([]);

  useEffect(() => {
    const unsubMats = onSnapshot(collection(db, 'inventory_materials'), (snap) => {
      setExistingMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() })) as MaterialItem[]);
    });
    const unsubSupp = onSnapshot(collection(db, 'inventory_suppliers'), (snap) => {
      setExistingSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as SupplierItem[]);
    });
    const unsubLoc = onSnapshot(collection(db, 'inventory_locations'), (snap) => {
      setExistingLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })) as LocationItem[]);
    });
    return () => { unsubMats(); unsubSupp(); unsubLoc(); };
  }, []);

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  const goNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx].id);
  };

  const goBack = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx].id);
  };

  const loadSampleMaterials = () => setMaterials(SAMPLE_MATERIALS);
  const loadSampleSuppliers = () => setSuppliers(SAMPLE_SUPPLIERS);
  const loadSampleLocations = () => setLocations(SAMPLE_LOCATIONS);

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveStatus('Saving materials...');
    try {
      if (materials.length > 0) {
        const batch = writeBatch(db);
        materials.forEach((mat) => {
          const ref = doc(collection(db, 'inventory_materials'));
          batch.set(ref, {
            code: mat.code,
            name: mat.name,
            category: mat.category,
            unit: mat.unit,
            current_stock: mat.currentStock,
            min_stock: mat.minStock,
            purchase_price: mat.purchasePrice,
            location: mat.location,
            supplier: mat.supplier || '',
            lastUpdated: new Date().toISOString(),
          });
        });
        await batch.commit();
        setSaveStatus(`Saved ${materials.length} materials`);
      }

      if (suppliers.length > 0) {
        setSaveStatus('Saving suppliers...');
        const batch = writeBatch(db);
        suppliers.forEach((sup) => {
          const ref = doc(collection(db, 'inventory_suppliers'));
          batch.set(ref, {
            name: sup.name,
            contact: sup.contact,
            phone: sup.phone,
            email: sup.email,
            gst: sup.gstin,
            address: sup.address,
            city: sup.city,
          });
        });
        await batch.commit();
        setSaveStatus(`Saved ${suppliers.length} suppliers`);
      }

      if (locations.length > 0) {
        setSaveStatus('Saving locations...');
        const batch = writeBatch(db);
        locations.forEach((loc) => {
          const ref = doc(collection(db, 'inventory_locations'));
          batch.set(ref, {
            code: loc.code,
            name: loc.name,
            type: loc.type,
            capacity: loc.capacity,
            currentUtilization: loc.currentUtilization,
            isActive: loc.isActive,
          });
        });
        await batch.commit();
        setSaveStatus(`Saved ${locations.length} locations`);
      }

      setSaveStatus('Saving settings...');
      await addDoc(collection(db, 'store_settings'), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });

      setSaveStatus('All data saved successfully!');
      setCompletedSteps(prev => [...prev, 'review']);
    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus('Error saving data. Check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
              <Database className="w-7 h-7 text-cyan-400" />
            </div>
            Store Setup Wizard
          </h1>
          <p className="text-zinc-400 mt-2 ml-14">Configure your inventory store step by step</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {STEPS.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isCompleted = completedSteps.includes(step.id);
              const Icon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                        : isCompleted
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-sm">{step.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 'welcome' && (
              <WelcomeStep
                existingMaterials={existingMaterials.length}
                existingSuppliers={existingSuppliers.length}
                existingLocations={existingLocations.length}
                onNext={goNext}
              />
            )}
            {currentStep === 'materials' && (
              <MaterialsStep
                materials={materials}
                setMaterials={setMaterials}
                existingCount={existingMaterials.length}
                onLoadSample={loadSampleMaterials}
              />
            )}
            {currentStep === 'suppliers' && (
              <SuppliersStep
                suppliers={suppliers}
                setSuppliers={setSuppliers}
                existingCount={existingSuppliers.length}
                onLoadSample={loadSampleSuppliers}
              />
            )}
            {currentStep === 'locations' && (
              <LocationsStep
                locations={locations}
                setLocations={setLocations}
                existingCount={existingLocations.length}
                onLoadSample={loadSampleLocations}
              />
            )}
            {currentStep === 'settings' && (
              <SettingsStep settings={settings} setSettings={setSettings} />
            )}
            {currentStep === 'review' && (
              <ReviewStep
                materials={materials}
                suppliers={suppliers}
                locations={locations}
                settings={settings}
                saving={saving}
                saveStatus={saveStatus}
                onSave={handleSaveAll}
                existingMaterials={existingMaterials.length}
                existingSuppliers={existingSuppliers.length}
                existingLocations={existingLocations.length}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {currentStep !== 'welcome' && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {currentStep !== 'review' ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-medium transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save All Data'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// WELCOME STEP
// ==========================================

function WelcomeStep({
  existingMaterials,
  existingSuppliers,
  existingLocations,
  onNext,
}: {
  existingMaterials: number;
  existingSuppliers: number;
  existingLocations: number;
  onNext: () => void;
}) {
  const hasExistingData = existingMaterials > 0 || existingSuppliers > 0 || existingLocations > 0;

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center"
        >
          <Boxes className="w-10 h-10 text-cyan-400" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-3">Welcome to Store Setup</h2>
        <p className="text-zinc-400">
          Set up your inventory store in a few simple steps. Add materials, suppliers,
          storage locations, and configure your store settings.
        </p>
      </div>

      {hasExistingData && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 max-w-xl mx-auto">
          <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" /> Existing Data Found
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-white">{existingMaterials}</p>
              <p className="text-xs text-zinc-400">Materials</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-white">{existingSuppliers}</p>
              <p className="text-xs text-zinc-400">Suppliers</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-white">{existingLocations}</p>
              <p className="text-xs text-zinc-400">Locations</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-3">You can add more data or skip steps where data already exists.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
        {STEPS.slice(1, 5).map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-sm font-bold text-blue-400">
                  {idx + 1}
                </div>
                <Icon className="w-5 h-5 text-zinc-400" />
              </div>
              <h3 className="font-semibold mb-1">{step.label}</h3>
              <p className="text-xs text-zinc-500">{step.description}</p>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 text-lg"
        >
          Get Started <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// MATERIALS STEP
// ==========================================

function MaterialsStep({
  materials,
  setMaterials,
  existingCount,
  onLoadSample,
}: {
  materials: MaterialItem[];
  setMaterials: React.Dispatch<React.SetStateAction<MaterialItem[]>>;
  existingCount: number;
  onLoadSample: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<MaterialItem>({
    code: '', name: '', category: 'Raw Material', unit: 'Kg',
    currentStock: 0, minStock: 0, purchasePrice: 0, location: '',
  });

  const resetForm = () => {
    setForm({ code: '', name: '', category: 'Raw Material', unit: 'Kg', currentStock: 0, minStock: 0, purchasePrice: 0, location: '' });
    setEditIdx(null);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!form.code || !form.name) return;
    if (editIdx !== null) {
      setMaterials(prev => prev.map((m, i) => i === editIdx ? form : m));
    } else {
      setMaterials(prev => [...prev, form]);
    }
    resetForm();
  };

  const handleEdit = (idx: number) => { setForm(materials[idx]); setEditIdx(idx); setShowForm(true); };
  const handleDelete = (idx: number) => { setMaterials(prev => prev.filter((_, i) => i !== idx)); };

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Materials / Inventory Items</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Add materials that will be tracked in the store.
            {existingCount > 0 && <span className="text-blue-400"> ({existingCount} already in database)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onLoadSample} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm transition-colors">
            <Upload className="w-4 h-4" /> Load Samples
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Material
          </button>
        </div>
      </div>

      {materials.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input type="text" placeholder="Search materials..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:border-blue-500" />
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editIdx !== null ? 'Edit Material' : 'Add New Material'}</h3>
              <button onClick={resetForm} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Code *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. GC-WHT-001" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="Material name" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Unit</label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Opening Stock</label>
                <input type="number" value={form.currentStock} onChange={e => setForm({ ...form, currentStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Min Stock Level</label>
                <input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Purchase Price (&#8377;)</label>
                <input type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Location</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Rack A1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={resetForm} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                {editIdx !== null ? 'Update' : 'Add Material'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length > 0 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800/50 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Category</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-right px-4 py-3">Min</th>
                  <th className="text-right px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map((m, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-zinc-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-400">{m.code}</td>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300">{m.category}</span></td>
                    <td className={`px-4 py-3 text-right ${m.currentStock <= m.minStock ? 'text-red-400' : 'text-green-400'}`}>
                      {m.currentStock} {m.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">{m.minStock}</td>
                    <td className="px-4 py-3 text-right">&#8377;{m.purchasePrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{m.location}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(idx)} className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(idx)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-zinc-800/30 border-t border-zinc-800 text-xs text-zinc-400">
            {materials.length} material(s) ready to save
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
          <Package className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-1">No materials added yet</p>
          <p className="text-xs text-zinc-500">Click &quot;Add Material&quot; or load sample data to get started</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUPPLIERS STEP
// ==========================================

function SuppliersStep({
  suppliers,
  setSuppliers,
  existingCount,
  onLoadSample,
}: {
  suppliers: SupplierItem[];
  setSuppliers: React.Dispatch<React.SetStateAction<SupplierItem[]>>;
  existingCount: number;
  onLoadSample: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierItem>({ name: '', contact: '', phone: '', email: '', gstin: '', address: '', city: '' });

  const resetForm = () => { setForm({ name: '', contact: '', phone: '', email: '', gstin: '', address: '', city: '' }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.name || !form.phone) return;
    if (editIdx !== null) { setSuppliers(prev => prev.map((s, i) => i === editIdx ? form : s)); }
    else { setSuppliers(prev => [...prev, form]); }
    resetForm();
  };

  const handleEdit = (idx: number) => { setForm(suppliers[idx]); setEditIdx(idx); setShowForm(true); };
  const handleDelete = (idx: number) => { setSuppliers(prev => prev.filter((_, i) => i !== idx)); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Suppliers / Vendors</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Add your material suppliers.
            {existingCount > 0 && <span className="text-blue-400"> ({existingCount} already in database)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onLoadSample} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm transition-colors">
            <Upload className="w-4 h-4" /> Load Samples
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editIdx !== null ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button onClick={resetForm} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><label className="block text-xs text-zinc-400 mb-1">Company Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Contact Person</label>
                <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Phone *</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="+91 XXXXXXXXXX" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">GSTIN</label>
                <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="27AABCS1234F1ZX" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">City</label>
                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
              <div className="md:col-span-2 lg:col-span-3"><label className="block text-xs text-zinc-400 mb-1">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={resetForm} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                {editIdx !== null ? 'Update' : 'Add Supplier'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s, idx) => (
            <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10"><Building2 className="w-4 h-4 text-purple-400" /></div>
                  <div><h3 className="font-semibold text-sm">{s.name}</h3><p className="text-xs text-zinc-500">{s.city}</p></div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(idx)} className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors text-blue-400"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(idx)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-zinc-400">
                <p>Contact: {s.contact}</p>
                <p>Phone: {s.phone}</p>
                <p>Email: {s.email}</p>
                {s.gstin && <p className="font-mono text-zinc-500">GSTIN: {s.gstin}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
          <Building2 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-1">No suppliers added yet</p>
          <p className="text-xs text-zinc-500">Click &quot;Add Supplier&quot; or load sample data</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// LOCATIONS STEP
// ==========================================

function LocationsStep({
  locations,
  setLocations,
  existingCount,
  onLoadSample,
}: {
  locations: LocationItem[];
  setLocations: React.Dispatch<React.SetStateAction<LocationItem[]>>;
  existingCount: number;
  onLoadSample: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<LocationItem>({ code: '', name: '', type: 'rack', capacity: 100, currentUtilization: 0, isActive: true });

  const resetForm = () => { setForm({ code: '', name: '', type: 'rack', capacity: 100, currentUtilization: 0, isActive: true }); setEditIdx(null); setShowForm(false); };

  const handleSave = () => {
    if (!form.code || !form.name) return;
    if (editIdx !== null) { setLocations(prev => prev.map((l, i) => i === editIdx ? form : l)); }
    else { setLocations(prev => [...prev, form]); }
    resetForm();
  };

  const handleEdit = (idx: number) => { setForm(locations[idx]); setEditIdx(idx); setShowForm(true); };
  const handleDelete = (idx: number) => { setLocations(prev => prev.filter((_, i) => i !== idx)); };

  const typeColors: Record<string, string> = {
    warehouse: 'from-blue-500/20 to-blue-600/20 border-blue-500/20 text-blue-400',
    rack: 'from-green-500/20 to-green-600/20 border-green-500/20 text-green-400',
    bin: 'from-orange-500/20 to-orange-600/20 border-orange-500/20 text-orange-400',
    zone: 'from-purple-500/20 to-purple-600/20 border-purple-500/20 text-purple-400',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Storage Locations</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Define warehouses, racks, bins, and zones.
            {existingCount > 0 && <span className="text-blue-400"> ({existingCount} already in database)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onLoadSample} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm transition-colors">
            <Upload className="w-4 h-4" /> Load Samples
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Location
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editIdx !== null ? 'Edit Location' : 'Add New Location'}</h3>
              <button onClick={resetForm} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div><label className="block text-xs text-zinc-400 mb-1">Code *</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. RA-A" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="Rack A - Raw Materials" /></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as LocationItem['type'] })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                  {LOCATION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select></div>
              <div><label className="block text-xs text-zinc-400 mb-1">Capacity</label>
                <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={resetForm} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                {editIdx !== null ? 'Update' : 'Add Location'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {locations.map((loc, idx) => (
            <div key={idx} className={`bg-gradient-to-br ${typeColors[loc.type]} border rounded-xl p-4 transition-colors`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span className="font-mono text-xs">{loc.code}</span></div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(idx)} className="p-1 hover:bg-white/10 rounded transition-colors"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(idx)} className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <h3 className="font-medium text-sm text-white mb-1">{loc.name}</h3>
              <p className="text-xs opacity-70 capitalize">{loc.type} &bull; Cap: {loc.capacity}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
          <MapPin className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-1">No locations defined yet</p>
          <p className="text-xs text-zinc-500">Click &quot;Add Location&quot; or load sample data</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SETTINGS STEP
// ==========================================

function SettingsStep({
  settings,
  setSettings,
}: {
  settings: { lowStockThreshold: number; expiryAlertDays: number; autoReorder: boolean; requireQCForIncoming: boolean; allowNegativeStock: boolean };
  setSettings: React.Dispatch<React.SetStateAction<typeof settings>>;
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold">Store Settings</h2>
        <p className="text-zinc-400 text-sm mt-1">Configure how your inventory store behaves</p>
      </div>
      <div className="space-y-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <label className="flex items-center justify-between">
            <div><h3 className="font-medium text-sm">Low Stock Alert Threshold</h3><p className="text-xs text-zinc-500 mt-0.5">Percentage below min stock to trigger alerts</p></div>
            <div className="flex items-center gap-2">
              <input type="number" value={settings.lowStockThreshold} onChange={e => setSettings({ ...settings, lowStockThreshold: Number(e.target.value) })}
                className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-right focus:outline-none focus:border-blue-500" />
              <span className="text-sm text-zinc-400">%</span>
            </div>
          </label>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <label className="flex items-center justify-between">
            <div><h3 className="font-medium text-sm">Expiry Alert Days</h3><p className="text-xs text-zinc-500 mt-0.5">Days before expiry to trigger alert</p></div>
            <div className="flex items-center gap-2">
              <input type="number" value={settings.expiryAlertDays} onChange={e => setSettings({ ...settings, expiryAlertDays: Number(e.target.value) })}
                className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-right focus:outline-none focus:border-blue-500" />
              <span className="text-sm text-zinc-400">days</span>
            </div>
          </label>
        </div>
        {([
          { key: 'autoReorder' as const, label: 'Auto Reorder', desc: 'Automatically create purchase requests when stock is low' },
          { key: 'requireQCForIncoming' as const, label: 'Require QC for Incoming', desc: 'All incoming materials must pass quality check' },
          { key: 'allowNegativeStock' as const, label: 'Allow Negative Stock', desc: 'Allow material issues even when stock is zero' },
        ]).map(({ key, label, desc }) => (
          <div key={key} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <label className="flex items-center justify-between cursor-pointer">
              <div><h3 className="font-medium text-sm">{label}</h3><p className="text-xs text-zinc-500 mt-0.5">{desc}</p></div>
              <button onClick={() => setSettings(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings[key] ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// REVIEW STEP
// ==========================================

function ReviewStep({
  materials, suppliers, locations, settings, saving, saveStatus, onSave,
  existingMaterials, existingSuppliers, existingLocations,
}: {
  materials: MaterialItem[]; suppliers: SupplierItem[]; locations: LocationItem[];
  settings: Record<string, unknown>; saving: boolean; saveStatus: string; onSave: () => void;
  existingMaterials: number; existingSuppliers: number; existingLocations: number;
}) {
  const totalValue = materials.reduce((sum, m) => sum + m.currentStock * m.purchasePrice, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Review &amp; Save</h2>
        <p className="text-zinc-400 text-sm mt-1">Review your setup data before saving to the database</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-5">
          <Package className="w-6 h-6 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{materials.length}</p>
          <p className="text-xs text-zinc-400">New Materials</p>
          {existingMaterials > 0 && <p className="text-xs text-blue-400 mt-1">+{existingMaterials} existing</p>}
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-xl p-5">
          <Building2 className="w-6 h-6 text-purple-400 mb-2" />
          <p className="text-2xl font-bold">{suppliers.length}</p>
          <p className="text-xs text-zinc-400">New Suppliers</p>
          {existingSuppliers > 0 && <p className="text-xs text-purple-400 mt-1">+{existingSuppliers} existing</p>}
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-5">
          <MapPin className="w-6 h-6 text-green-400 mb-2" />
          <p className="text-2xl font-bold">{locations.length}</p>
          <p className="text-xs text-zinc-400">New Locations</p>
          {existingLocations > 0 && <p className="text-xs text-green-400 mt-1">+{existingLocations} existing</p>}
        </div>
        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/20 rounded-xl p-5">
          <Boxes className="w-6 h-6 text-cyan-400 mb-2" />
          <p className="text-2xl font-bold">&#8377;{totalValue.toLocaleString()}</p>
          <p className="text-xs text-zinc-400">Total Stock Value</p>
        </div>
      </div>

      {materials.length === 0 && suppliers.length === 0 && locations.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-400 text-sm">No new data to save</p>
            <p className="text-xs text-zinc-400 mt-0.5">Go back to add materials, suppliers, or locations before saving.</p>
          </div>
        </div>
      )}

      {materials.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" /> <h3 className="font-semibold text-sm">Materials ({materials.length})</h3>
          </div>
          <div className="p-4 max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {materials.map((m, i) => (
                <span key={i} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs">{m.name} <span className="text-zinc-500">({m.currentStock} {m.unit})</span></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400" /> <h3 className="font-semibold text-sm">Suppliers ({suppliers.length})</h3>
          </div>
          <div className="p-4 max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {suppliers.map((s, i) => (
                <span key={i} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs">{s.name} <span className="text-zinc-500">({s.city})</span></span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" /> <h3 className="font-semibold text-sm">Settings</h3>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
              <span className="text-zinc-400">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className={typeof value === 'boolean' ? (value ? 'text-green-400' : 'text-red-400') : 'text-white'}>
                {typeof value === 'boolean' ? (value ? 'ON' : 'OFF') : String(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>{saveStatus && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">{saveStatus}</motion.p>}</div>
        <button onClick={onSave} disabled={saving || (materials.length === 0 && suppliers.length === 0 && locations.length === 0)}
          className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-medium transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          {saving ? 'Saving to Firebase...' : 'Save All to Database'}
        </button>
      </div>

      <div className="mt-4 p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <h3 className="font-semibold mb-4 text-sm">Next Steps After Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="font-medium text-blue-400 mb-1">1. Store Dashboard</p>
            <p className="text-zinc-400">View analytics, alerts, and inventory at <span className="font-mono text-blue-300">/store</span></p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="font-medium text-green-400 mb-1">2. Data Entry</p>
            <p className="text-zinc-400">Issue/purchase materials at <span className="font-mono text-green-300">/empStore</span></p>
          </div>
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="font-medium text-purple-400 mb-1">3. Purchase Orders</p>
            <p className="text-zinc-400">Create POs at <span className="font-mono text-purple-300">/purchase</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
