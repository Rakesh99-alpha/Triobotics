'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return alert("Please fill details");

    // 1. Save User Session (Mock Login)
    const userSession = {
      name: form.name,
      email: form.email,
      role: 'customer',
      id: 'CUST-' + Date.now()
    };
    localStorage.setItem('currentUser', JSON.stringify(userSession));

    // 2. Redirect to Project Spec Sheet (to start their request)
    router.push('/projectspec');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:2rem_2rem]" />
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />

      <div className="bg-zinc-900/80 border border-white/10 p-8 rounded-2xl w-full max-w-md backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
             <ShieldCheck className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Client Portal</h1>
          <p className="text-zinc-400 text-sm mt-2">Register to start your project specification</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Company / Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
              <input 
                type="text" 
                placeholder="e.g. Acme Marine" 
                className="w-full bg-zinc-800 border border-white/10 rounded-xl py-3 pl-10 text-white outline-none focus:border-purple-500 transition-all"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
              <input 
                type="email" 
                placeholder="name@company.com" 
                className="w-full bg-zinc-800 border border-white/10 rounded-xl py-3 pl-10 text-white outline-none focus:border-purple-500 transition-all"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-zinc-800 border border-white/10 rounded-xl py-3 pl-10 text-white outline-none focus:border-purple-500 transition-all"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg mt-6 flex items-center justify-center gap-2 transition-transform transform hover:scale-[1.02]">
            Start Project <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}