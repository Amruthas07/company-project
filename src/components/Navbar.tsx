import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  RotateCcw,
  Activity,
  Layers,
  Cpu,
  AlertTriangle,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';
import { store } from '../services/store';
import { User } from '../types/threat';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  currentTab: 'admin' | 'employee' | 'scenarios' | 'ml';
  onSelectTab: (tab: 'admin' | 'employee' | 'scenarios' | 'ml') => void;
  currentUser: User;
  users: User[];
  pendingIncidentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  users,
  pendingIncidentCount,
}) => {
  const { user: authUser, logout, switchUser } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleUserChange = (userId: string) => {
    store.setCurrentUser(userId);
    switchUser(userId);
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Zone 1: Wordmark with icon */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-mono">
                SentinelAI
              </span>
              <span className="text-xs text-cyan-400 font-mono">SOC·v2.6</span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5">
              Insider Threat Detection System
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onSelectTab('admin')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'admin'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>SecOps Console</span>
            {pendingIncidentCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => onSelectTab('employee')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'employee'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Employee Workspace</span>
            {currentUser.isRestricted && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
            )}
          </button>

          <button
            onClick={() => onSelectTab('scenarios')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'scenarios'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Demo Scenarios</span>
          </button>

          <button
            onClick={() => onSelectTab('ml')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'ml'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ML & CERT Specs</span>
          </button>
        </nav>

        {/* Zone 3: Active Persona Switcher, Auth Controls & Reset */}
        <div className="flex items-center gap-2.5">
          {/* Active persona select */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] text-slate-400 hidden sm:inline">Active User:</span>
            <select
              value={currentUser.id}
              onChange={(e) => handleUserChange(e.target.value)}
              aria-label="Switch active user profile"
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                  {u.name} ({u.role === 'admin' ? 'Admin' : u.title.split(' ')[0]})
                </option>
              ))}
            </select>
            {currentUser.isRestricted && (
              <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/80 font-mono flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> Restricted
              </span>
            )}
          </div>

          {/* Quick Sign In and Register buttons */}
          <button
            onClick={() => openAuth('login')}
            title="Sign In to Enterprise Console"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-750 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Sign In</span>
          </button>

          <button
            onClick={() => openAuth('register')}
            title="Register new employee identity"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Register</span>
          </button>

          <button
            onClick={() => store.resetDemo()}
            title="Reset simulation to initial baseline state"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </header>
  );
};
