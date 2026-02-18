'use client';

import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Shield, 
  Mail, Key, CheckCircle, XCircle, Trash2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined?: string;
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    role: 'supervisor',
    password: 'Trio@2025',
    status: 'Active'
  });

  // ════════ FIREBASE LISTENER ════════
  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('joined', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: Employee[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
      setEmployees(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const handleCreateUser = async () => {
    if (!newEmp.name || !newEmp.email) return alert("Please fill all fields");
    setSaving(true);
    try {
      await addDoc(collection(db, 'employees'), {
        name: newEmp.name,
        email: newEmp.email,
        role: newEmp.role,
        status: 'Active',
        joined: new Date().toISOString().split('T')[0]
      });
      setShowModal(false);
      setNewEmp({ name: '', email: '', role: 'supervisor', password: 'Trio@2025', status: 'Active' });
    } catch (err) {
      console.error('Error creating employee:', err);
      alert('Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this employee?")) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (err) {
        console.error('Error deleting employee:', err);
      }
    }
  };

  return (
    <div className="space-y-8 font-sans text-white pb-10">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-4xl font-light tracking-tight">Employee Directory</h1>
           <p className="text-zinc-400 mt-1">Manage Access & Roles</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
           <UserPlus className="w-5 h-5" /> Onboard Employee
        </button>
      </div>

      {/* Data Grid */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl min-h-[600px]">
         
         {/* Toolbar */}
         <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2 text-zinc-400">
                <Users className="w-5 h-5" />
                <span className="font-bold">{employees.length}</span> <span>Total Staff</span>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input 
                    placeholder="Search name or email..." 
                    className="pl-9 pr-4 py-2 bg-zinc-900/50 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-blue-500 w-64 transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
         </div>

         {/* Table */}
         <div className="overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm">
               <thead className="bg-black/20 text-zinc-400 uppercase font-bold text-xs">
                  <tr>
                     <th className="p-4">Employee Name</th>
                     <th className="p-4">Email Access</th>
                     <th className="p-4">Role</th>
                     <th className="p-4">Status</th>
                     <th className="p-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5 bg-zinc-900/20">
                  {loading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-zinc-400">
                      <RefreshCw className="w-5 h-5 animate-spin inline mr-2" /> Loading employees...
                    </td></tr>
                  ) : employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map((emp) => (
                     <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-600 flex items-center justify-center text-xs">
                                {emp.name.charAt(0)}
                            </div>
                            {emp.name}
                        </td>
                        <td className="p-4 text-zinc-400">{emp.email}</td>
                        <td className="p-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${
                                emp.role === 'md' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' :
                                emp.role === 'pm' ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' :
                                'bg-zinc-700 text-zinc-300 border-zinc-600'
                            }`}>
                                {emp.role}
                            </span>
                        </td>
                        <td className="p-4">
                            <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Active
                            </div>
                        </td>
                        <td className="p-4 text-right">
                            <button onClick={() => handleDelete(emp.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* ADD USER MODAL */}
      <AnimatePresence>
        {showModal && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
                <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Onboard Employee</h2>
                        <button onClick={() => setShowModal(false)}><XCircle className="w-6 h-6 text-zinc-500 hover:text-white"/></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Full Name</label>
                            <input className="w-full bg-zinc-800 border border-white/10 rounded-xl p-3 text-white outline-none mt-1" placeholder="e.g. Sarah Jenkins" onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Company Email</label>
                            <div className="flex items-center bg-zinc-800 border border-white/10 rounded-xl mt-1 overflow-hidden">
                                <div className="p-3 text-zinc-400"><Mail className="w-4 h-4"/></div>
                                <input className="w-full bg-transparent p-3 pl-0 text-white outline-none" placeholder="name@company.com" onChange={e => setNewEmp({...newEmp, email: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Assign Role</label>
                            <div className="flex items-center bg-zinc-800 border border-white/10 rounded-xl mt-1 overflow-hidden">
                                <div className="p-3 text-zinc-400"><Shield className="w-4 h-4"/></div>
                                <select className="w-full bg-transparent p-3 pl-0 text-white outline-none cursor-pointer" onChange={e => setNewEmp({...newEmp, role: e.target.value})}>
                                    <option value="supervisor">Supervisor (Production)</option>
                                    <option value="pm">Project Manager</option>
                                    <option value="store">Store Keeper</option>
                                    <option value="md">MD / Executive</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 uppercase font-bold">Temporary Password</label>
                            <div className="flex items-center bg-zinc-800 border border-white/10 rounded-xl mt-1 overflow-hidden">
                                <div className="p-3 text-zinc-400"><Key className="w-4 h-4"/></div>
                                <input className="w-full bg-transparent p-3 pl-0 text-zinc-400 outline-none" value={newEmp.password} readOnly />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">User must change this on first login.</p>
                        </div>
                    </div>

                    <button onClick={handleCreateUser} disabled={saving} className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                        {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        {saving ? 'Creating...' : 'Create Account'}
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}