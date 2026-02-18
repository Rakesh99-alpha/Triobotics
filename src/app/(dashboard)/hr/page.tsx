'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Users, Plus, Search, Edit2, Trash2, X, Mail, Phone, Briefcase, Calendar, RefreshCw } from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  joinDate: string;
  status: string;
  leaveBalance: number;
  leaveReason?: string;
  efficiency?: number;
  avatar?: string;
}

export default function HRDashboard() {
  const [user, setUser] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [activeTab, setActiveTab] = useState<'all' | 'teamleads' | 'pms'>('all');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // ════════ FIREBASE LISTENER ════════
  useEffect(() => {
    const q = query(collection(db, 'hr_employees'), orderBy('joinDate', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: Employee[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));
      setEmployees(items);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      setUser(currentUser.charAt(0).toUpperCase() + currentUser.slice(1));
    }
  }, []);

  const handleAddEmployee = async () => {
    if (!formData.name || !formData.employeeId || !formData.role) {
      alert('Please fill required fields');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'hr_employees'), {
        employeeId: formData.employeeId || '',
        name: formData.name || '',
        role: formData.role || '',
        department: formData.department || 'Production',
        phone: formData.phone || '',
        email: formData.email || '',
        joinDate: formData.joinDate || new Date().toISOString().split('T')[0],
        status: formData.status || 'Active',
        leaveBalance: formData.leaveBalance || 15,
        leaveReason: formData.leaveReason || '',
        efficiency: formData.efficiency || 85,
        avatar: (formData.name || '').charAt(0).toUpperCase()
      });
      setShowAddModal(false);
      setFormData({});
    } catch (err) {
      console.error('Error adding employee:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditEmployee = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    try {
      const { id, ...updates } = { ...selectedEmployee, ...formData };
      await updateDoc(doc(db, 'hr_employees', selectedEmployee.id), updates);
      setShowEditModal(false);
      setFormData({});
      setSelectedEmployee(null);
    } catch (err) {
      console.error('Error updating employee:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteDoc(doc(db, 'hr_employees', id));
    } catch (err) {
      console.error('Error deleting employee:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    router.push('/login');
  };

  const openEditModal = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData(emp);
    setShowEditModal(true);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'teamleads') {
      return matchesSearch && emp.role.includes('Team Lead');
    } else if (activeTab === 'pms') {
      return matchesSearch && emp.role.includes('Project Manager');
    }
    return matchesSearch;
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'Active').length,
    onLeave: employees.filter(e => e.status === 'On Leave').length,
    resigned: employees.filter(e => e.status === 'Resigned').length,
    teamLeads: employees.filter(e => e.role.includes('Team Lead')).length,
    pms: employees.filter(e => e.role.includes('Project Manager')).length,
  };

  const getDepartmentColor = (dept: string) => {
    const colors: Record<string, string> = {
      'HR': 'bg-purple-500',
      'Sales': 'bg-orange-500',
      'Production': 'bg-yellow-500',
      'QA': 'bg-pink-500',
      'IT': 'bg-blue-500',
      'Finance': 'bg-red-500'
    };
    return colors[dept] || 'bg-gray-500';
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-white/10 bg-white/5 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">HR Dashboard</h1>
                  <p className="text-zinc-400 text-sm mt-1">Employee Management System</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-400">HR Manager</p>
                  <p className="text-sm font-semibold text-green-300">{user}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all duration-300 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-white">{stats.total}</h3>
              <p className="text-xs text-zinc-400 mt-1">Total</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-green-300">{stats.active}</h3>
              <p className="text-xs text-zinc-400 mt-1">Active</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-yellow-300">{stats.onLeave}</h3>
              <p className="text-xs text-zinc-400 mt-1">On Leave</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-red-300">{stats.resigned}</h3>
              <p className="text-xs text-zinc-400 mt-1">Resigned</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-purple-300">{stats.teamLeads}</h3>
              <p className="text-xs text-zinc-400 mt-1">Team Leads</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-xl">
              <h3 className="text-2xl font-bold text-blue-300">{stats.pms}</h3>
              <p className="text-xs text-zinc-400 mt-1">Project Mgrs</p>
            </motion.div>
          </div>

          {/* Tabs and Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                All Employees
              </button>
              <button
                onClick={() => setActiveTab('teamleads')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'teamleads'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                Team Lead Supervisors
              </button>
              <button
                onClick={() => setActiveTab('pms')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'pms'
                    ? 'bg-green-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                Project Managers
              </button>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-lg focus:bg-white/10 focus:border-blue-500/50 outline-none"
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </button>
            </div>
          </div>

          {/* Employee Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((emp) => (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-purple-50/10 to-blue-50/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:border-white/20 transition-all"
              >
                {/* Avatar */}
                <div className="flex flex-col items-center mb-4">
                  <div className={`w-16 h-16 rounded-full ${getDepartmentColor(emp.department)} bg-opacity-20 border-4 border-${emp.department.toLowerCase()}-500/30 flex items-center justify-center mb-3`}>
                    <span className="text-2xl font-bold text-white">{emp.avatar || emp.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white text-center">{emp.name}</h3>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${getDepartmentColor(emp.department)} bg-opacity-20 text-white`}>
                    {emp.department}
                  </span>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center mb-3">
                  <span className={`px-4 py-1.5 rounded-lg text-sm font-semibold ${
                    emp.status === 'Active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    emp.status === 'On Leave' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 
                    'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {emp.status}
                  </span>
                </div>

                {/* Leave Reason */}
                {emp.status === 'On Leave' && emp.leaveReason && (
                  <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-200 font-semibold mb-1">Leave Reason:</p>
                    <p className="text-xs text-yellow-100">{emp.leaveReason}</p>
                  </div>
                )}

                {/* Efficiency */}
                {emp.efficiency && (
                  <div className="text-center mb-3">
                    <p className="text-xs text-zinc-400">Efficiency</p>
                    <p className="text-xl font-bold text-green-300">{emp.efficiency}%</p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="space-y-2 mb-4 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Mail className="w-3 h-3 text-blue-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Phone className="w-3 h-3 text-green-400" />
                    <span>{emp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Briefcase className="w-3 h-3 text-purple-400" />
                    <span>{emp.role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Calendar className="w-3 h-3 text-yellow-400" />
                    <span>Leave: {emp.leaveBalance} days</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg transition-all text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="flex-1 flex items-center justify-center gap-2 p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg transition-all text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400">No employees found</p>
            </div>
          )}
        </main>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Add New Employee</h3>
                <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Employee ID *</label>
                  <input
                    type="text"
                    value={formData.employeeId || ''}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="EMP001"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Role *</label>
                  <select
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/20 text-white rounded-xl outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="">Select Role</option>
                    <option value="Team Lead Supervisor">Team Lead Supervisor</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Technician">Technician</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Department</label>
                  <select
                    value={formData.department || 'Production'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/20 text-white rounded-xl outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="Production">Production</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                    <option value="QA">QA</option>
                    <option value="IT">IT</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@triovision.com"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Join Date</label>
                  <input
                    type="date"
                    value={formData.joinDate || ''}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Efficiency (%)</label>
                  <input
                    type="number"
                    value={formData.efficiency || 85}
                    onChange={(e) => setFormData({ ...formData, efficiency: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Leave Balance (days)</label>
                  <input
                    type="number"
                    value={formData.leaveBalance || 15}
                    onChange={(e) => setFormData({ ...formData, leaveBalance: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Status</label>
                  <select
                    value={formData.status || 'Active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/20 text-white rounded-xl outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>
                {formData.status === 'On Leave' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">Leave Reason</label>
                    <textarea
                      value={formData.leaveReason || ''}
                      onChange={(e) => setFormData({ ...formData, leaveReason: e.target.value })}
                      placeholder="E.g., Medical leave - Surgery recovery"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none resize-none"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={handleAddEmployee}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-all mt-6"
              >
                Add Employee
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {showEditModal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-lg w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Update Employee</h3>
                <button onClick={() => setShowEditModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">Employee: <strong className="text-white">{selectedEmployee.name}</strong></p>
                  <p className="text-sm text-zinc-400">ID: <strong className="text-white">{selectedEmployee.employeeId}</strong></p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Status</label>
                  <select
                    value={formData.status || selectedEmployee.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-800 border border-white/20 text-white rounded-xl outline-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>
                {(formData.status === 'On Leave' || selectedEmployee.status === 'On Leave') && (
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-2">Leave Reason</label>
                    <textarea
                      value={formData.leaveReason ?? selectedEmployee.leaveReason}
                      onChange={(e) => setFormData({ ...formData, leaveReason: e.target.value })}
                      placeholder="E.g., Medical leave - Surgery recovery"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none resize-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Leave Balance (days)</label>
                  <input
                    type="number"
                    value={formData.leaveBalance ?? selectedEmployee.leaveBalance}
                    onChange={(e) => setFormData({ ...formData, leaveBalance: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Efficiency (%)</label>
                  <input
                    type="number"
                    value={formData.efficiency ?? selectedEmployee.efficiency}
                    onChange={(e) => setFormData({ ...formData, efficiency: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl focus:bg-white/10 focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleEditEmployee}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-all mt-6"
              >
                Update Employee
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
