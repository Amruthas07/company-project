import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  TrendingUp,
  Clock,
  HardDrive,
  Globe,
  UserX,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { SecurityIncident, User } from '../types/threat';
import { store } from '../services/store';

interface IncidentDetailModalProps {
  incident: SecurityIncident;
  user?: User;
  onClose: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  user,
  onClose,
}) => {
  const [overrideReason, setOverrideReason] = useState(
    'Identity verified out-of-band by SecOps via phone confirmation.'
  );
  const [showOverrideForm, setShowOverrideForm] = useState(false);

  const handleOverride = (
    action: 'RESTORE_ACCESS' | 'CONFIRM_RESTRICTION' | 'TERMINATE_SESSION'
  ) => {
    store.overrideIncident(incident.id, action, overrideReason);
    onClose();
  };

  const getStatusBadge = (status: SecurityIncident['status']) => {
    switch (status) {
      case 'PENDING_VERIFICATION':
        return {
          label: 'Pending Face Verification',
          className: 'bg-amber-950 text-amber-300 border-amber-800',
        };
      case 'ENHANCED_MONITORING':
        return {
          label: 'Enhanced Monitoring',
          className: 'bg-cyan-950 text-cyan-300 border-cyan-800',
        };
      case 'RESTRICTED':
        return {
          label: 'Account Restricted',
          className: 'bg-rose-950 text-rose-300 border-rose-800',
        };
      case 'TERMINATED':
        return {
          label: 'Session Terminated',
          className: 'bg-red-950 text-red-200 border-red-800 font-bold',
        };
      case 'OVERRIDDEN':
        return {
          label: 'Admin Overridden',
          className: 'bg-emerald-950 text-emerald-300 border-emerald-800',
        };
      default:
        return {
          label: status,
          className: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const statusBadge = getStatusBadge(incident.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border font-mono ${
                incident.riskScore >= 80
                  ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                  : incident.riskScore >= 50
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              }`}
            >
              {incident.riskScore}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Incident {incident.id}
                </h3>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded border font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                User: <span className="text-slate-200 font-medium">{incident.userName}</span> ·{' '}
                {new Date(incident.timestamp).toLocaleTimeString()} · Band:{' '}
                <span className="font-mono text-cyan-400">{incident.riskBand}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Trigger Event Banner */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-slate-300">Trigger Summary</h4>
              <p className="text-xs text-slate-400 mt-0.5">{incident.triggerEvent}</p>
            </div>
          </div>

          {/* SHAP Feature Contribution Waterfall */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>SHAP Explainability Waterfall (TreeSHAP Decomposition)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Feature attributions to total risk score relative to baseline model expectation (12.0%)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Total Score: <strong className="text-white">{incident.riskScore}%</strong>
              </span>
            </div>

            <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {incident.shapSummary.map((item, idx) => {
                const isPositive = item.shapValue > 0;
                const absVal = Math.abs(item.shapValue);
                const barWidth = Math.min(100, (absVal / 40) * 100);

                return (
                  <div key={idx} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 font-medium">
                        {item.featureName}
                      </span>
                      <span
                        className={`font-mono font-semibold ${
                          isPositive ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isPositive ? `+${item.shapValue}%` : `${item.shapValue}%`}
                      </span>
                    </div>

                    {/* Attribution bar */}
                    <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isPositive
                            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                            : 'bg-gradient-to-r from-teal-500 to-emerald-400'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{item.description}</span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        Observed: {String(item.actualValue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biometric Face Verification Section */}
          <div className="border-t border-slate-800 pt-5">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Biometric Face Verification Audit</span>
            </h4>

            {incident.faceVerification ? (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  incident.faceVerification.passed
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-rose-950/20 border-rose-800/60'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        incident.faceVerification.passed
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                      }`}
                    >
                      {incident.faceVerification.passed
                        ? 'Biometric Verification Passed'
                        : 'Biometric Verification FAILED'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      Similarity: {Math.round(incident.faceVerification.confidenceScore * 1000) / 10}% / Threshold: 85%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {incident.faceVerification.notes}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Algorithm: {incident.faceVerification.method} (Normalized 3x3 LBP Histogram)
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                No biometric verification completed yet. User has not presented face template or prompt is pending in employee session.
              </div>
            )}
          </div>

          {/* Historical Behavioral Baseline Comparison */}
          {user && (
            <div className="border-t border-slate-800 pt-5">
              <h4 className="text-sm font-semibold text-white mb-3">
                Employee Behavioral Profile vs Observed Vector
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5" /> Shift Hours
                  </div>
                  <div className="font-semibold text-slate-200">
                    {user.baseline.typicalLoginHourStart}:00 - {user.baseline.typicalLoginHourEnd}:00
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Expected window
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <Globe className="w-3.5 h-3.5" /> Subnet IPs
                  </div>
                  <div className="font-semibold text-slate-200 truncate font-mono">
                    {user.baseline.knownIps[0]}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {user.baseline.knownIps.length} corporate IP(s)
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5" /> Daily Downloads
                  </div>
                  <div className="font-semibold text-slate-200">
                    ~{user.baseline.avgDailyDownloads} files/day
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    StdDev ±{user.baseline.stdDailyDownloads}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 flex items-center gap-1 mb-1">
                    <HardDrive className="w-3.5 h-3.5" /> USB Policy
                  </div>
                  <div className="font-semibold text-slate-200">
                    {user.baseline.usbAuthorized ? 'Authorized' : 'Prohibited'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Hardware lockdown
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Override Section */}
          <div className="border-t border-slate-800 pt-5">
            {incident.adminResolution ? (
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Admin Resolution Recorded
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  Action: <strong className="font-mono text-white">{incident.adminResolution.action}</strong> by{' '}
                  {incident.adminResolution.resolvedBy}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reason: "{incident.adminResolution.overrideReason}"
                </p>
              </div>
            ) : (
              <div>
                {!showOverrideForm ? (
                  <button
                    onClick={() => setShowOverrideForm(true)}
                    className="w-full py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 text-cyan-400" />
                    <span>Open SecOps Admin Override Console</span>
                  </button>
                ) : (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-200">
                        SecOps Manual Intervention
                      </h4>
                      <button
                        onClick={() => setShowOverrideForm(false)}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Override Justification / Ticket Reference:
                      </label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleOverride('RESTORE_ACCESS')}
                        className="py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Restore Access</span>
                      </button>

                      <button
                        onClick={() => handleOverride('CONFIRM_RESTRICTION')}
                        className="py-2 text-xs font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Enforce Lockout</span>
                      </button>

                      <button
                        onClick={() => handleOverride('TERMINATE_SESSION')}
                        className="py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Terminate User</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>SentinelAI Threat Response Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
