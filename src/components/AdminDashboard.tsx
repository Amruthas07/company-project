import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  Zap,
  CheckCircle2,
  HardDrive,
  Eye,
  Scan,
  RefreshCw,
  Clock,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { ActivityEvent, ActivityEventType, SecurityIncident, User } from '../types/threat';
import { store } from '../services/store';
import { IncidentDetailModal } from './IncidentDetailModal';
import { FaceEnrollmentModal } from './FaceEnrollmentModal';

interface AdminDashboardProps {
  users: User[];
  events: ActivityEvent[];
  incidents: SecurityIncident[];
  onSwitchToEmployee: (userId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  events,
  incidents,
  onSwitchToEmployee,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [enrollingUser, setEnrollingUser] = useState<User | null>(null);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTarget, setSimulationTarget] = useState<string>(users[1]?.id || 'usr_ananya_2');
  const [customEventType, setCustomEventType] = useState<ActivityEventType>('failed_logon');
  const [customIp, setCustomIp] = useState('185.220.101.5');

  const employees = users.filter((u) => u.role !== 'admin');
  const avgRisk =
    employees.length > 0
      ? Math.round(
          employees.reduce((acc, u) => acc + u.currentRiskScore, 0) / employees.length
        )
      : 12;

  const openIncidents = incidents.filter(
    (i) => i.status === 'PENDING_VERIFICATION' || i.status === 'RESTRICTED'
  );

  const filteredEvents = events.filter((ev) => {
    if (eventFilter === 'all') return true;
    if (eventFilter === 'logon')
      return ev.eventType === 'logon' || ev.eventType === 'logoff' || ev.eventType === 'failed_logon';
    if (eventFilter === 'file')
      return (
        ev.eventType === 'file_read' ||
        ev.eventType === 'file_download' ||
        ev.eventType === 'file_delete' ||
        ev.eventType === 'file_copy'
      );
    if (eventFilter === 'device') return ev.eventType === 'device_connect';
    if (eventFilter === 'threats')
      return (
        ev.eventType === 'privilege_escalation_attempt' ||
        ev.eventType === 'failed_logon' ||
        ev.details.fileCategory === 'Restricted_Vault'
      );
    return true;
  });

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const incident = store.simulateSuspiciousActivity(simulationTarget);
      setIsSimulating(false);
      if (incident) {
        setSelectedIncident(incident);
      }
    }, 600);
  };

  const injectSingleEvent = () => {
    store.logEvent(
      customEventType,
      {
        reason: 'Manual SecOps audit probe simulation',
        hourOfDay: 2,
        isOffHours: true,
        fileCategory: 'Restricted_Vault',
      },
      customIp
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Operational Overview */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Security Operations Center (SOC) Console
            </h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Inference Pipeline Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time behavioral baseline tracking with Isolation Forest anomaly detection,
            XGBoost insider threat classification, and SHAP explainability.
          </p>
        </div>

        {/* Quick Simulation Trigger */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select
            value={simulationTarget}
            onChange={(e) => setSimulationTarget(e.target.value)}
            className="bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                Target: {e.name}
              </option>
            ))}
          </select>

          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-rose-950/40 whitespace-nowrap"
          >
            {isSimulating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            <span>Simulate Suspicious Activity</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Mean Fleet Risk Score</span>
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{avgRisk}%</span>
            <span className="text-[11px] text-slate-400">
              {avgRisk < 30 ? 'Nominal Baseline' : 'Elevated Exposure'}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                avgRisk >= 50 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${avgRisk}%` }}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">
              {openIncidents.length}
            </span>
            <span className="text-[11px] text-slate-400">
              {incidents.length} total logged
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {openIncidents.length > 0
              ? 'Intervention or verification pending'
              : 'All threat vectors cleared'}
          </p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Monitored Identities</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {employees.length}
            </span>
            <span className="text-[11px] text-slate-400">
              {employees.filter((e) => e.isRestricted).length} restricted
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Continuous telemetry ingestion
          </p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Telemetry Events</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-300">
              {events.length}
            </span>
            <span className="text-[11px] text-slate-400">9 event classes</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Automated feature extraction
          </p>
        </div>
      </div>

      {/* Main Content Grid: Monitored Employees & Security Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Monitored Employees (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 rounded-2xl border border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Monitored Employees & Behavioral Baselines</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time risk scoring, adaptive band, and biometric face enrollment
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {employees.length} Accounts
            </span>
          </div>

          <div className="space-y-3">
            {employees.map((emp) => {
              const isRestricted = emp.isRestricted;
              const hasFace = emp.enrolledFaceEmbedding !== null;

              return (
                <div
                  key={emp.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isRestricted
                      ? 'bg-rose-950/20 border-rose-800/80 shadow-md shadow-rose-950/20'
                      : emp.currentRiskScore >= 50
                      ? 'bg-amber-950/20 border-amber-800/80'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {emp.avatarUrl ? (
                        <img
                          src={emp.avatarUrl}
                          alt={emp.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0">
                          {emp.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-white">
                            {emp.name}
                          </h4>
                          {isRestricted && (
                            <span className="text-[10px] bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded border border-rose-700 font-mono">
                              LOCKED / RESTRICTED
                            </span>
                          )}
                          {!isRestricted && emp.currentRiskScore >= 50 && (
                            <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700 font-mono">
                              GATE ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {emp.title} · {emp.department}
                        </p>
                      </div>
                    </div>

                    {/* Risk Score Pill & Face Status */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-[10px] text-slate-400 font-mono">Risk:</span>
                          <span
                            className={`text-sm font-bold font-mono ${
                              emp.currentRiskScore >= 80
                                ? 'text-rose-400'
                                : emp.currentRiskScore >= 50
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {emp.currentRiskScore}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 justify-end">
                          <span>Band:</span>
                          <span className="font-mono text-cyan-400">
                            {emp.currentRiskBand}
                          </span>
                        </div>
                      </div>

                      {/* Face Enrollment Status */}
                      <button
                        onClick={() => setEnrollingUser(emp)}
                        title={
                          hasFace
                            ? 'Face enrolled. Click to re-enroll or inspect template'
                            : 'No face profile enrolled. Click to enroll'
                        }
                        className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                          hasFace
                            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/40'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Scan className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden sm:inline">
                          {hasFace ? 'Enrolled' : 'Enroll Face'}
                        </span>
                      </button>

                      {/* Action dropdown or quick switch */}
                      <button
                        onClick={() => {
                          store.setCurrentUser(emp.id);
                          onSwitchToEmployee(emp.id);
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Open Workspace
                      </button>
                    </div>
                  </div>

                  {/* Baseline Summary Kicker */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span>
                      Shift: {emp.baseline.typicalLoginHourStart}:00–{emp.baseline.typicalLoginHourEnd}:00
                    </span>
                    <span>·</span>
                    <span>IP: {emp.baseline.knownIps[0]}</span>
                    <span>·</span>
                    <span>Avg: {emp.baseline.avgDailyDownloads} dl/day</span>
                    <span>·</span>
                    <span className="font-mono">
                      USB: {emp.baseline.usbAuthorized ? 'Allowed' : 'Blocked'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Security Incidents (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/60 rounded-2xl border border-slate-800 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Security Incidents & SHAP Attribution</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Incidents requiring biometric confirmation or admin review
              </p>
            </div>
            <span className="text-[11px] font-mono text-amber-400">
              {incidents.length} Records
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px]">
            {incidents.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                <h4 className="text-xs font-semibold text-slate-300">
                  Zero Outstanding Incidents
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Behavior across all monitored employees is within normative baseline limits.
                  Simulate suspicious activity above to test response pipelines.
                </p>
              </div>
            ) : (
              incidents.map((inc) => {
                const isPending = inc.status === 'PENDING_VERIFICATION';
                const isRestricted = inc.status === 'RESTRICTED';
                const isOverridden = inc.status === 'OVERRIDDEN';

                return (
                  <div
                    key={inc.id}
                    className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {inc.userName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {new Date(inc.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {inc.triggerEvent}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold text-xs ${
                            inc.riskScore >= 80
                              ? 'text-rose-400'
                              : inc.riskScore >= 50
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {inc.riskScore}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                          isPending
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                            : isRestricted
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                            : isOverridden
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {inc.status}
                      </span>

                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/80 rounded flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect SHAP</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Real-time Activity Telemetry Stream */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Activity Telemetry Stream (9 Event Types)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live automated activity logging from user sessions feeding feature extraction
            </p>
          </div>

          {/* Event Filters */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
            {['all', 'logon', 'file', 'device', 'threats'].map((filt) => (
              <button
                key={filt}
                onClick={() => setEventFilter(filt)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded capitalize whitespace-nowrap transition-colors ${
                  eventFilter === filt
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filt}
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Parameters & Context</th>
                <th className="py-2.5 px-3">Shift Window</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[11px]">
              {filteredEvents.slice(0, 15).map((ev) => {
                const isThreat =
                  ev.eventType === 'privilege_escalation_attempt' ||
                  ev.eventType === 'failed_logon' ||
                  ev.details.fileCategory === 'Restricted_Vault';

                return (
                  <tr
                    key={ev.id}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      isThreat ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      {ev.userName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          ev.eventType === 'privilege_escalation_attempt'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : ev.eventType === 'failed_logon'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : ev.eventType === 'device_connect'
                            ? 'bg-purple-950 text-purple-300 border border-purple-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {ev.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{ev.ipAddress}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 max-w-xs truncate">
                      {ev.details.fileName && (
                        <span>File: {ev.details.fileName} </span>
                      )}
                      {ev.details.fileCategory && (
                        <span className="text-[10px] text-slate-400">
                          ({ev.details.fileCategory}){' '}
                        </span>
                      )}
                      {ev.details.deviceName && (
                        <span>Device: {ev.details.deviceName} </span>
                      )}
                      {ev.details.reason && (
                        <span className="text-slate-400">
                          · {ev.details.reason}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {ev.details.isOffHours ? (
                        <span className="text-amber-400 text-[10px] font-sans">
                          Off-Hours (Night)
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px] font-sans">
                          Standard Shift
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Attack Vector Injection Tool */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">
            Manual Threat Vector Injection Sandbox
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Inject isolated test anomalies to verify the live pipeline response without triggering the full CERT scenario:
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={customEventType}
            onChange={(e) => setCustomEventType(e.target.value as ActivityEventType)}
            className="bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-2"
          >
            <option value="failed_logon">Failed Authentication (failed_logon)</option>
            <option value="privilege_escalation_attempt">
              Vault Probe (privilege_escalation_attempt)
            </option>
            <option value="device_connect">Unapproved USB Storage (device_connect)</option>
            <option value="file_download">Off-Hours Vault Download (file_download)</option>
          </select>

          <input
            type="text"
            value={customIp}
            onChange={(e) => setCustomIp(e.target.value)}
            placeholder="Simulated IP (e.g. 185.220.101.5)"
            className="bg-slate-950 text-xs text-slate-200 border border-slate-700 rounded-lg px-3 py-2 font-mono w-44"
          />

          <button
            onClick={injectSingleEvent}
            className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            Inject Single Event
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          user={users.find((u) => u.id === selectedIncident.userId)}
          onClose={() => setSelectedIncident(null)}
        />
      )}

      {enrollingUser && (
        <FaceEnrollmentModal
          user={enrollingUser}
          onClose={() => setEnrollingUser(null)}
        />
      )}
    </div>
  );
};
