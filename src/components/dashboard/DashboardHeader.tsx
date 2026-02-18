"use client";

import { motion } from 'framer-motion';
import { BarChart3, Zap, Bell, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export const DashboardHeader = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Zap className="w-2 h-2 text-white" />
        </motion.div>
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Store Management
        </h1>
        <p className="text-muted-foreground text-xs">
          Material Inventory System
        </p>
      </div>
    </div>
  );
};
