/**
 * SentinelAI - AI-Based User Behavior and Threat Detection System
 * Main Application Entry Point with AuthProvider and reactive store sync
 */

import React, { useState, useEffect } from 'react';
import { store } from './services/store';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { EmployeePortal } from './components/EmployeePortal';
import { ScenarioGuide } from './components/ScenarioGuide';
import { MlInspector } from './components/MlInspector';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainLayout() {
  const [users, setUsers] = useState(store.getUsers());
  const [files, setFiles] = useState(store.getFiles());
  const [events, setEvents] = useState(store.getEvents());
  const [incidents, setIncidents] = useState(store.getIncidents());
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [currentTab, setCurrentTab] = useState<'admin' | 'employee' | 'scenarios' | 'ml'>('admin');
  const { user: authUser } = useAuth();

  // Sync store updates
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setUsers(store.getUsers());
      setFiles(store.getFiles());
      setEvents(store.getEvents());
      setIncidents(store.getIncidents());
      setCurrentUser(store.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const pendingIncidentCount = incidents.filter(
    (i) => i.status === 'PENDING_VERIFICATION' || i.status === 'RESTRICTED'
  ).length;

  const handleSwitchToEmployee = (userId: string) => {
    store.setCurrentUser(userId);
    setCurrentTab('employee');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Navigation Contract */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        users={users}
        pendingIncidentCount={pendingIncidentCount}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'admin' && (
          <AdminDashboard
            users={users}
            events={events}
            incidents={incidents}
            onSwitchToEmployee={handleSwitchToEmployee}
          />
        )}

        {currentTab === 'employee' && (
          <EmployeePortal
            currentUser={currentUser}
            files={files}
            events={events}
            incidents={incidents}
          />
        )}

        {currentTab === 'scenarios' && (
          <ScenarioGuide
            users={users}
            incidents={incidents}
            onSwitchTab={setCurrentTab}
          />
        )}

        {currentTab === 'ml' && <MlInspector />}
      </main>

      {/* Clean enterprise footer */}
      <footer className="border-t border-slate-900 py-6 px-4 text-center text-xs text-slate-500 font-mono">
        SentinelAI Threat Detection Platform · Isolation Forest + XGBoost + TreeSHAP + OpenCV LBP
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
