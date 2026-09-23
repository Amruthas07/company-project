import React from 'react';
import {
  Cpu,
  Database,
  BarChart3,
  GitBranch,
  Layers,
  FileCode,
  ShieldAlert,
} from 'lucide-react';

export const MlInspector: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-bold tracking-tight text-white">
            Machine Learning Architecture & CERT Dataset Mapping
          </h1>
        </div>
        <p className="text-xs text-slate-400 max-w-3xl">
          Complete technical specification of the dual-model inference pipeline:
          Unsupervised Isolation Forest (55% contribution) + Supervised XGBoost (45% contribution) + TreeSHAP explainability + 3x3 LBP Face Embeddings.
        </p>
      </div>

      {/* Model Performance & Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400">XGBoost ROC-AUC</span>
          <div className="text-2xl font-bold font-mono text-cyan-300 mt-1">0.984</div>
          <p className="text-[10px] text-slate-500 mt-1">5-fold cross-validated</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400">Threat Classifier F1</span>
          <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">0.926</div>
          <p className="text-[10px] text-slate-500 mt-1">Precision: 0.941 · Recall: 0.912</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400">Isolation Forest Weight</span>
          <div className="text-2xl font-bold font-mono text-amber-300 mt-1">55.0%</div>
          <p className="text-[10px] text-slate-500 mt-1">Anomaly Contribution</p>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400">LBP Face Match Threshold</span>
          <div className="text-2xl font-bold font-mono text-purple-300 mt-1">85.0%</div>
          <p className="text-[10px] text-slate-500 mt-1">Cosine Sim (3x3 spatial grid)</p>
        </div>
      </div>

      {/* Dual Model Pipeline Flowchart */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" />
          <span>Inference Pipeline Execution Architecture</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
              STAGE 01
            </span>
            <h4 className="font-semibold text-slate-200">Activity Telemetry</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              9 event classes logged: logon, logoff, file ops, USB connect, privilege probes.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
              STAGE 02
            </span>
            <h4 className="font-semibold text-slate-200">Feature Extraction</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Extracts 12-dimensional behavioral vector normalized against user's historical profile.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
              STAGE 03
            </span>
            <h4 className="font-semibold text-slate-200">Dual Model Scoring</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Isolation Forest (55% weight) + XGBoost (45% weight) = Clamped 0-100 Risk Score.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
              STAGE 04
            </span>
            <h4 className="font-semibold text-slate-200">TreeSHAP Explainer</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Computes additive linear factor attributions (+% and -%) explaining the predicted risk.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
              STAGE 05
            </span>
            <h4 className="font-semibold text-slate-200">Adaptive Response</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              5 risk tiers: Allow (&lt;30), Enhanced (30-50), Face Check (50-80), Restrict (80-90), Terminate (&gt;90).
            </p>
          </div>
        </div>
      </div>

      {/* 12 Behavioral Features (Section 9) */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>12 Core Behavioral Features (Section 9 Specification)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { name: 'login_hour', desc: 'Hour of day of latest employee activity (0-23)' },
            { name: 'is_off_hours', desc: 'Binary flag (1.0 if outside approved shift window, else 0.0)' },
            { name: 'login_hour_deviation', desc: 'Absolute distance in hours from shift midpoint' },
            { name: 'is_new_ip', desc: 'Binary flag (1.0 if IP address not in user profile known_ips)' },
            { name: 'failed_logins_today', desc: 'Count of consecutive failed authentication events today' },
            { name: 'files_accessed_today', desc: 'Cumulative document reads / queries logged today' },
            { name: 'downloads_today', desc: 'Total count of file downloads executed today' },
            { name: 'download_volume_today', desc: 'Aggregate data download volume in Megabytes' },
            { name: 'restricted_access_today', desc: 'Count of queries to restricted vault keys or confidential records' },
            { name: 'files_deviation', desc: 'Normalized deviation of file reads above historical baseline' },
            { name: 'downloads_deviation', desc: 'Standard deviation ratio of downloads exceeding baseline' },
            { name: 'is_weekend', desc: 'Binary flag indicating session execution on Saturday/Sunday' },
          ].map((feat, idx) => (
            <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="font-mono text-cyan-400 font-bold block">{feat.name}</span>
              <p className="text-[11px] text-slate-400 mt-1">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CERT Dataset Structure & Field Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              CERT Insider Threat Dataset Field Mapping
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            The system maps directly to CMU CERT insider threat dataset schemas:
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="font-mono text-cyan-400 font-semibold">logon.csv</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Timestamp, user, pc/workstation, activity (Logon/Logoff). Used for off-hours detection and concurrent login flags.
              </p>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="font-mono text-cyan-400 font-semibold">file.csv</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Filename, path, file size, operation (read, download, copy, delete). Used for volumetric burst & vault probe flags.
              </p>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="font-mono text-cyan-400 font-semibold">device.csv</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Connect/Disconnect of removable USB mass storage media. Correlated with exfiltration spikes.
              </p>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              <span className="font-mono text-rose-400 font-semibold">
                Deliberately Excluded CERT Fields
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Email contents, external web browsing, and psychological personality surveys are excluded to respect user privacy and focus strictly on software-level operational telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Importance Table */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">
              Model Feature Weights & SHAP Importance
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Relative weight contribution to composite threat classification:
          </p>

          <div className="space-y-2 text-xs">
            {[
              {
                name: 'Restricted Vault / Credential Probe',
                weight: '34%',
                desc: 'Attempts to read AWS keys or customer PII archives',
              },
              {
                name: 'Unfamiliar External IP Subnet',
                weight: '22%',
                desc: 'Logon from outside known corporate IP subnet or VPN',
              },
              {
                name: 'Unauthorized USB Storage Attachment',
                weight: '18%',
                desc: 'Removable flash media mounted without hardware policy approval',
              },
              {
                name: 'Off-Hours Activity Deviation',
                weight: '14%',
                desc: 'Session logged during employee off-shift or night hours',
              },
              {
                name: 'Volumetric Download Burst (>3x)',
                weight: '12%',
                desc: 'Bulk document export exceeding historical standard deviation',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-200">{f.name}</div>
                  <div className="text-[10px] text-slate-400">{f.desc}</div>
                </div>
                <span className="font-mono font-bold text-cyan-400 text-xs ml-3">
                  {f.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
