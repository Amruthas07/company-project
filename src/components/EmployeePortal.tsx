import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Copy,
  Trash2,
  HardDrive,
  Lock,
  AlertOctagon,
  ShieldCheck,
  Usb,
  Clock,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { ActivityEvent, CorporateFile, SecurityIncident, User } from '../types/threat';
import { store } from '../services/store';
import { SecurityGateModal } from './SecurityGateModal';

interface EmployeePortalProps {
  currentUser: User;
  files: CorporateFile[];
  events: ActivityEvent[];
  incidents: SecurityIncident[];
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  currentUser,
  files,
  events,
  incidents,
}) => {
  const [activeTab, setActiveTab] = useState<'files' | 'vault' | 'devices' | 'history'>('files');
  const [actionNotice, setActionNotice] = useState<{
    type: 'info' | 'warn' | 'error';
    msg: string;
  } | null>(null);

  // Check if current user has an active pending verification incident
  const pendingIncident = incidents.find(
    (i) => i.userId === currentUser.id && i.status === 'PENDING_VERIFICATION'
  );

  const userEvents = events.filter((e) => e.userId === currentUser.id);
  const connectedUsbDevices = store.getConnectedUsbDevices(currentUser.id);
  const isUsbAttached = connectedUsbDevices.length > 0;

  const showNotice = (type: 'info' | 'warn' | 'error', msg: string) => {
    setActionNotice({ type, msg });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleReadFile = (file: CorporateFile) => {
    store.logEvent('file_read', {
      fileName: file.name,
      fileSizeMb: file.sizeMb,
      fileCategory: file.category,
      reason: 'Routine document reading in web viewer',
    });
    showNotice('info', `Opened "${file.name}" for reading. Activity logged.`);
  };

  const handleDownloadFile = (file: CorporateFile) => {
    if (currentUser.isRestricted && (file.category === 'Restricted_Vault' || file.category === 'Confidential')) {
      showNotice(
        'error',
        `Access Denied: Your account is currently restricted. Classified downloads are blocked.`
      );
      return;
    }

    if (file.category === 'Restricted_Vault') {
      store.logEvent('privilege_escalation_attempt', {
        fileName: file.name,
        fileSizeMb: file.sizeMb,
        fileCategory: file.category,
        reason: 'Unauthorized attempt to export restricted vault archive',
      });
      store.logEvent('file_download', {
        fileName: file.name,
        fileSizeMb: file.sizeMb,
        fileCategory: file.category,
        reason: 'Restricted file download execution',
      });
      showNotice(
        'warn',
        `Security Notice: "${file.name}" contains restricted data. Audit telemetry dispatched.`
      );
      return;
    }

    store.logEvent('file_download', {
      fileName: file.name,
      fileSizeMb: file.sizeMb,
      fileCategory: file.category,
      reason: 'Standard local document download',
    });
    showNotice('info', `Downloaded "${file.name}" (${file.sizeMb} MB).`);
  };

  const handleCopyFile = (file: CorporateFile) => {
    store.logEvent('file_copy', {
      fileName: file.name,
      fileCategory: file.category,
      reason: 'File copied to clipboard/local directory',
    });
    showNotice('info', `Copied "${file.name}" to clipboard.`);
  };

  const handleDeleteFile = (file: CorporateFile) => {
    if (file.category === 'Restricted_Vault') {
      showNotice('error', 'Critical System File: Cannot be deleted from employee portal.');
      return;
    }
    store.logEvent('file_delete', {
      fileName: file.name,
      fileCategory: file.category,
      reason: 'Document removed by employee',
    });
    showNotice('info', `Deleted "${file.name}". Event logged.`);
  };

  const handleToggleUsb = () => {
    const attached = store.toggleUsbDevice(currentUser.id, 'SanDisk_Cruzer_64GB');
    if (attached) {
      showNotice(
        'warn',
        'Hardware Alert: External USB Mass Storage device mounted to workstation.'
      );
    } else {
      showNotice('info', 'External USB storage safely unmounted.');
    }
  };

  const normalFiles = files.filter(
    (f) => f.category === 'Public' || f.category === 'Internal'
  );
  const sensitiveFiles = files.filter(
    (f) => f.category === 'Confidential' || f.category === 'Restricted_Vault'
  );

  return (
    <div className="space-y-6">
      {/* Account Restricted Callout Banner if locked */}
      {currentUser.isRestricted && (
        <div className="p-5 bg-rose-950/40 border-2 border-rose-600 rounded-2xl flex items-start gap-4 shadow-xl shadow-rose-950/30">
          <AlertOctagon className="w-8 h-8 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-rose-200">
                Account Restricted — SentinelAI Adaptive Threat Engine
              </h2>
              <span className="text-xs bg-rose-900 text-rose-100 px-2 py-0.5 rounded font-mono">
                CODE 403-RESTRICTED
              </span>
            </div>
            <p className="text-xs text-rose-300 mt-1 max-w-2xl leading-relaxed">
              Automated telemetry flagged high-risk behavioral anomalies (Current Risk: {currentUser.currentRiskScore}%).
              Access to classified vault archives, key exports, and elevated system commands has been temporarily suspended
              to safeguard enterprise assets.
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="text-rose-400">
                To restore access: Complete required face verification or contact SecOps incident response.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Employee Identity & Operational Status Header */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-lg font-bold">
              {currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {currentUser.name}
              </h1>
              <span className="text-xs text-slate-400">· {currentUser.title}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentUser.department} · {currentUser.email}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400" /> Shift:{' '}
                {currentUser.baseline.typicalLoginHourStart}:00–{currentUser.baseline.typicalLoginHourEnd}:00
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono">
                <Globe className="w-3 h-3 text-cyan-400" /> Subnet: {currentUser.baseline.knownIps[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Health & Compliance Status */}
        <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 self-start md:self-auto">
          <div>
            <div className="text-[11px] text-slate-400">Identity Risk Score</div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-bold font-mono ${
                  currentUser.currentRiskScore >= 80
                    ? 'text-rose-400'
                    : currentUser.currentRiskScore >= 50
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {currentUser.currentRiskScore}%
              </span>
              <span className="text-[10px] text-slate-400">
                ({currentUser.currentRiskBand})
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div>
            <div className="text-[11px] text-slate-400">Biometric Profile</div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              {currentUser.enrolledFaceEmbedding ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Enrolled (LBP 531d)</span>
                </>
              ) : (
                <span className="text-amber-400">Not Enrolled</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
            actionNotice.type === 'error'
              ? 'bg-rose-950/40 border-rose-800 text-rose-200'
              : actionNotice.type === 'warn'
              ? 'bg-amber-950/40 border-amber-800 text-amber-200'
              : 'bg-cyan-950/40 border-cyan-800 text-cyan-200'
          }`}
        >
          <span>{actionNotice.msg}</span>
          <span className="text-[10px] font-mono opacity-60">AUDIT_LOG_RECORDED</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'files'
              ? 'bg-slate-800 text-cyan-300 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Work Documents ({normalFiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'vault'
              ? 'bg-slate-800 text-cyan-300 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Classified Vault ({sensitiveFiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'devices'
              ? 'bg-slate-800 text-cyan-300 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Usb className="w-3.5 h-3.5" />
          <span>Hardware & USB Ports</span>
          {isUsbAttached && (
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-slate-800 text-cyan-300 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>My Activity Log ({userEvents.length})</span>
        </button>
      </div>

      {/* Tab 1: Normal Work Documents */}
      {activeTab === 'files' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Department File Repository
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Routine documentation. Every view, copy, download, and deletion is recorded in the activity stream.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {normalFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <h4 className="text-xs font-semibold text-white truncate max-w-xs">
                        {file.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {file.sizeMb} MB
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {file.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500">
                    Dept: {file.department}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleReadFile(file)}
                      title="View file (logs file_read event)"
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopyFile(file)}
                      title="Copy file (logs file_copy event)"
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      title="Download file (logs file_download event)"
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      title="Delete file (logs file_delete event)"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Classified Vault Files */}
      {activeTab === 'vault' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-white">
                Restricted Corporate Vault & Classified Assets
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Access to these documents is restricted by default. Unauthorized probes or mass downloads trigger instant privilege escalation flags.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sensitiveFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 bg-slate-950/90 border border-amber-800/40 rounded-xl hover:border-amber-700/60 transition-all flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-2">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-amber-500/40 font-bold rotate-12">
                    RESTRICTED
                  </span>
                </div>

                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <h4 className="text-xs font-semibold text-amber-200 truncate max-w-xs font-mono">
                        {file.name}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80">
                      {file.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {file.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Size: {file.sizeMb} MB
                  </span>

                  <button
                    onClick={() => handleDownloadFile(file)}
                    disabled={currentUser.isRestricted}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      currentUser.isRestricted
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Archive</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Hardware & USB Device Manager */}
      {activeTab === 'devices' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Usb className="w-4 h-4 text-purple-400" />
              <span>Peripheral Hardware & USB Controller</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate mounting external storage. Unauthorized USB attachment violates endpoint DLP policy and alerts SecOps.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive
                  className={`w-5 h-5 ${
                    isUsbAttached ? 'text-purple-400' : 'text-slate-500'
                  }`}
                />
                <div>
                  <h4 className="text-xs font-semibold text-white">
                    USB Port 01: Host Bus Controller
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Status: {isUsbAttached ? 'SanDisk Ultra 64GB Mounted' : 'Port Idle / Empty'}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isUsbAttached
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {isUsbAttached ? 'CONNECTED' : 'UNPLUGGED'}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 mb-3 bg-slate-900/80 p-2 rounded border border-slate-800">
              Policy Standing: Employee USB authorization is{' '}
              <strong className="text-slate-200">
                {currentUser.baseline.usbAuthorized ? 'ENABLED' : 'PROHIBITED'}
              </strong>
              . Attaching removable media will generate a device telemetry event.
            </div>

            <button
              onClick={handleToggleUsb}
              className={`w-full py-2 px-3 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isUsbAttached
                  ? 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/50'
              }`}
            >
              <Usb className="w-3.5 h-3.5" />
              <span>
                {isUsbAttached ? 'Eject USB Storage Device' : 'Simulate Connect USB Flash Drive'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Employee Activity History */}
      {activeTab === 'history' && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>My Security Telemetry Log</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              All events recorded during your sessions. This feeds the ML behavioral feature vector.
            </p>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] text-slate-400 border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono text-[11px]">
                {userEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {ev.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{ev.ipAddress}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {ev.details.fileName || ev.details.deviceName || ev.details.reason || 'Normal event'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Security Gate Modal if pending verification */}
      {pendingIncident && (
        <SecurityGateModal
          incident={pendingIncident}
          user={currentUser}
          onClose={() => {
            // Re-check state
            store.setCurrentUser(currentUser.id);
          }}
        />
      )}
    </div>
  );
};
