import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Shield,
  RotateCcw,
  Zap,
  Camera,
  UserX,
} from 'lucide-react';
import { store } from '../services/store';
import { User, SecurityIncident } from '../types/threat';

interface ScenarioGuideProps {
  users: User[];
  incidents: SecurityIncident[];
  onSwitchTab: (tab: 'admin' | 'employee' | 'scenarios' | 'ml') => void;
}

export const ScenarioGuide: React.FC<ScenarioGuideProps> = ({
  users,
  incidents,
  onSwitchTab,
}) => {
  const [activeScenario, setActiveScenario] = useState<1 | 2 | 3>(1);
  const [stepStatus, setStepStatus] = useState<string>('');

  const ananya = users.find((u) => u.id === 'usr_ananya_2') || users[1];
  const vikram = users.find((u) => u.id === 'usr_vikram_5') || users[4] || users[users.length - 1];

  // Helper actions
  const runScenario1 = () => {
    store.setCurrentUser(ananya.id);
    store.logEvent('logon', {
      hourOfDay: 10,
      isOffHours: false,
      reason: 'Standard scheduled morning logon',
    });
    store.logEvent('file_read', {
      fileName: 'Engineering_Architecture_2026.pdf',
      fileSizeMb: 4.2,
      fileCategory: 'Internal',
    });
    store.logEvent('file_read', {
      fileName: 'Code_Style_Guide_v3.md',
      fileSizeMb: 0.4,
      fileCategory: 'Public',
    });
    setStepStatus('Scenario 1 executed: Ananya Rao logged on and read 2 normal files. Risk remains LOW (14%).');
    onSwitchTab('employee');
  };

  const runScenario2Step1 = () => {
    // 1. Simulate attack for Ananya
    store.simulateSuspiciousActivity(ananya.id);
    setStepStatus(
      'Suspicious activity injected for Ananya Rao. Risk score elevated. PENDING_VERIFICATION incident generated!'
    );
  };

  const runScenario2Step2 = () => {
    // 2. Switch to Ananya to see security gate
    store.setCurrentUser(ananya.id);
    setStepStatus('Switched to Ananya Rao. The SecurityGate modal is now active in her workspace.');
    onSwitchTab('employee');
  };

  const runScenario3Step1 = () => {
    // 1. Target Vikram Reddy (DevOps contractor, no enrolled face template)
    store.simulateSuspiciousActivity(vikram.id);
    setStepStatus(
      'Suspicious activity injected for Vikram Reddy. High threat level detected. PENDING_VERIFICATION incident generated!'
    );
  };

  const runScenario3Step2 = () => {
    store.setCurrentUser(vikram.id);
    setStepStatus(
      'Switched to Vikram Reddy. At the SecurityGate modal, verification fails (no enrolled template / impostor). Account is immediately restricted!'
    );
    onSwitchTab('employee');
  };

  const runScenario3Step3 = () => {
    store.setCurrentUser('usr_arjun_1');
    setStepStatus('Switched to Arjun Sharma (Lead SecOps Admin). You can inspect the SHAP waterfall and use Admin Override.');
    onSwitchTab('admin');
  };

  return (
    <div className="space-y-6">
      {/* Scenario Selection Cards */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-cyan-400" />
              <span>Interactive Verification Scenarios (README Walkthrough)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              These 3 scenarios demonstrate the end-to-end adaptive response lifecycle:
              from normal activity, to moderate threat with biometric resolution, to high-risk lockout and SecOps override.
            </p>
          </div>

          <button
            onClick={() => {
              store.resetDemo();
              setStepStatus('State reset to baseline.');
            }}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo State</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => setActiveScenario(1)}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeScenario === 1
                ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md shadow-cyan-950/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              <h3 className="text-xs font-semibold text-white">Scenario 1: Normal Access</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Employee logs in during standard hours, views work documents. Risk stays LOW (&lt;30), standard monitoring.
            </p>
          </button>

          <button
            onClick={() => setActiveScenario(2)}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeScenario === 2
                ? 'bg-amber-950/40 border-amber-500/80 shadow-md shadow-amber-950/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                2
              </span>
              <h3 className="text-xs font-semibold text-white">Scenario 2: Moderate Risk & Pass</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Simulate threat triggers (50-80 band). SecurityGate prompts face verification. Matching photo resolves to Enhanced Monitoring.
            </p>
          </button>

          <button
            onClick={() => setActiveScenario(3)}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeScenario === 3
                ? 'bg-rose-950/40 border-rose-500/80 shadow-md shadow-rose-950/40'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              <h3 className="text-xs font-semibold text-white">Scenario 3: High Risk & Restriction</h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Biometric check fails or no enrolled profile. Account flips to RESTRICTED lockout. SecOps reviews SHAP and overrides.
            </p>
          </button>
        </div>
      </div>

      {/* Scenario Execution Flow */}
      {activeScenario === 1 && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">
              Scenario 1 Execution: Normal Access Pipeline
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Simulates Ananya Rao conducting legitimate development work: shift hours (10 AM), authenticated subnet (192.168.1.42),
            and accessing approved architecture documents. The Isolation Forest and XGBoost inference models evaluate the feature vector
            and confirm all parameters align with her historical profile.
          </p>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-200">
                  Target Identity: Ananya Rao (Senior ML Platform Engineer)
                </span>
                <p className="text-[11px] text-slate-400">
                  Expected Risk: &lt;30% (Standard Monitoring Band)
                </p>
              </div>

              <button
                onClick={runScenario1}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-2 transition-colors self-start sm:self-auto"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Execute Scenario 1 (1-Click)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeScenario === 2 && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">
              Scenario 2 Execution: Moderate Risk & Biometric Face Verification Pass
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Ananya has an enrolled face template on file. When suspicious anomalies are triggered (off-hours logon, vault probe, download burst),
            her risk reaches the 50-80 band. Her session prompts the SecurityGate modal. Verifying with a matching photo confirms identity,
            resolving the incident to Enhanced Monitoring without locking her account.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 font-mono">STEP 1</span>
                <h4 className="text-xs font-semibold text-white mt-1">
                  Inject CERT-Style Anomalies for Ananya
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Fires off-hours access, failed logins, and vault probe. Raises risk into verification band.
                </p>
              </div>
              <button
                onClick={runScenario2Step1}
                className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Inject Anomalies</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-cyan-400 font-mono">STEP 2</span>
                <h4 className="text-xs font-semibold text-white mt-1">
                  Switch to Ananya & Verify Face
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Opens Ananya's portal. Click "Legitimate User Match" in the gate to pass (95% similarity) and clear the alert.
                </p>
              </div>
              <button
                onClick={runScenario2Step2}
                className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Open Ananya's Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeScenario === 3 && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-semibold text-white">
              Scenario 3 Execution: High Risk, Failed Face Verification & SecOps Override
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl">
            Demonstrates failure handling: Vikram Reddy has no enrolled biometric template (or an impostor mismatch is submitted).
            When suspicious activity is detected, face verification fails, flipping the account's <code className="text-rose-300">is_restricted</code> flag.
            The employee sees the restricted lockout screen. SecOps inspects the SHAP explanation and uses Admin Override to restore access.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-rose-400 font-mono">STEP 1</span>
                <h4 className="text-xs font-semibold text-white mt-1">
                  Simulate Threat for Vikram Reddy
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Vikram has no face enrolled. Threat reaches elevated threshold.
                </p>
              </div>
              <button
                onClick={runScenario3Step1}
                className="mt-4 px-3 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate Threat</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 font-mono">STEP 2</span>
                <h4 className="text-xs font-semibold text-white mt-1">
                  Trigger Verification & Lockout
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  View Vikram's portal. Verification fails, instantly restricting his account.
                </p>
              </div>
              <button
                onClick={runScenario3Step2}
                className="mt-4 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Trigger Gate</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 font-mono">STEP 3</span>
                <h4 className="text-xs font-semibold text-white mt-1">
                  SecOps Admin Override
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Return to SOC console, open incident, inspect SHAP waterfall, and click "Restore Access".
                </p>
              </div>
              <button
                onClick={runScenario3Step3}
                className="mt-4 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Open Admin Override</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Status Toast */}
      {stepStatus && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-800/80 rounded-xl text-xs text-cyan-200 flex items-center justify-between">
          <span>{stepStatus}</span>
          <button
            onClick={() => setStepStatus('')}
            className="text-[10px] text-slate-400 hover:text-slate-200"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};
