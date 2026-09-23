import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Scan,
  RefreshCw,
  Info,
} from 'lucide-react';
import { store } from '../services/store';
import { SecurityIncident, User } from '../types/threat';
import {
  extractLbpEmbeddingFromCanvas,
  generateSyntheticProbeEmbedding,
} from '../services/faceVerification';

interface SecurityGateModalProps {
  incident: SecurityIncident;
  user: User;
  onClose?: () => void;
}

export const SecurityGateModal: React.FC<SecurityGateModalProps> = ({
  incident,
  user,
  onClose,
}) => {
  const [useCamera, setUseCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    similarity: number;
    notes: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUseCamera(true);
    } catch (err: any) {
      setCameraError(
        'Camera access denied or unavailable in this environment. You can use the calibrated test images below.'
      );
      setUseCamera(false);
    }
  };

  const captureFromVideo = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, 128, 128);
    const embedding = extractLbpEmbeddingFromCanvas(canvas);

    setTimeout(() => {
      const res = store.verifyUserFace(user.id, embedding, incident.id);
      setVerificationResult({
        passed: res.passed,
        similarity: res.similarityPercentage,
        notes: res.details,
      });
      setIsProcessing(false);
    }, 600);
  };

  const runSampleVerification = (matchEnrolled: boolean) => {
    setIsProcessing(true);
    setVerificationResult(null);

    setTimeout(() => {
      if (!user.enrolledFaceEmbedding) {
        const res = store.verifyUserFace(user.id, [], incident.id);
        setVerificationResult({
          passed: false,
          similarity: 0,
          notes: res.details,
        });
      } else {
        const probe = generateSyntheticProbeEmbedding(
          user.enrolledFaceEmbedding,
          matchEnrolled
        );
        const res = store.verifyUserFace(user.id, probe, incident.id);
        setVerificationResult({
          passed: res.passed,
          similarity: res.similarityPercentage,
          notes: res.details,
        });
      }
      setIsProcessing(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-750 max-w-xl w-full rounded-2xl p-6 shadow-2xl relative border-amber-500/40">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Security Gate: Identity Verification Required
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Automated telemetry flagged unusual behavioral patterns (Risk Score:{' '}
              <span className="font-mono text-amber-400 font-semibold">
                {incident.riskScore}%
              </span>
              ). Per corporate policy, physical face verification is required to confirm identity.
            </p>
          </div>
        </div>

        {/* Verification Result Display */}
        {verificationResult ? (
          <div
            className={`p-4 rounded-xl border mb-6 ${
              verificationResult.passed
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {verificationResult.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">
                    {verificationResult.passed
                      ? 'Identity Confirmed — Access Restored'
                      : 'Verification Failed — Account Restricted'}
                  </h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/40 border border-white/10">
                    Similarity: {verificationResult.similarity}% (Req: 85%)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {verificationResult.notes}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  {verificationResult.passed ? (
                    <button
                      onClick={onClose}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
                    >
                      Continue to Workspace
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVerificationResult(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        Retry Verification
                      </button>
                      <span className="text-[11px] text-rose-300">
                        Incident escalated to SecOps for manual override.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Camera / Visual Scanner Box */}
            <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center mb-4">
              {useCamera ? (
                <>
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  {/* Facial Scanner HUD Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-56 border-2 border-dashed border-cyan-400/80 rounded-3xl relative animate-pulse">
                      <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-black/60 px-1 rounded">
                        LBP SCAN GRID 3x3
                      </div>
                      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-cyan-400 bg-black/60 px-1 rounded">
                        HAAR CASCADE
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <Scan className="w-8 h-8 text-cyan-400/80 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-medium text-slate-200">
                    Biometric Facial Analysis
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Uses OpenCV Haar-Cascade face detection + 3x3 Local Binary Pattern (LBP) histogram comparison.
                  </p>
                  {cameraError && (
                    <p className="text-[11px] text-amber-400 mt-2 bg-amber-950/40 p-1.5 rounded border border-amber-800/60 max-w-md mx-auto">
                      {cameraError}
                    </p>
                  )}
                </div>
              )}

              {/* Hidden processing canvas */}
              <canvas ref={canvasRef} className="hidden" />

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                  <span className="text-xs font-mono text-cyan-300">
                    Extracting LBP 531-dim Spatial Histogram...
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {!useCamera ? (
                  <button
                    onClick={startCamera}
                    disabled={isProcessing}
                    className="flex-1 py-2 px-3 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Launch Live Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={captureFromVideo}
                    disabled={isProcessing}
                    className="flex-1 py-2 px-3 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center justify-center gap-2 font-mono"
                  >
                    <Scan className="w-4 h-4" />
                    <span>Scan & Verify Frame</span>
                  </button>
                )}
              </div>

              {/* Calibrated Scenario Test Photos */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="font-medium text-slate-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-cyan-400" /> Calibrated Test Verification Modes:
                  </span>
                  <span>Threshold: 85%</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => runSampleVerification(true)}
                    disabled={isProcessing}
                    className="p-2.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-lg text-left transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Legitimate User Match</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enrolled biometric signature (~95% match). Resolves incident to Enhanced Monitoring.
                    </p>
                  </button>

                  <button
                    onClick={() => runSampleVerification(false)}
                    disabled={isProcessing}
                    className="p-2.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-lg text-left transition-colors group"
                  >
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Impostor / Mismatch</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Different individual (~72% similarity). Fails verification and locks account per policy.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Target Identity: {user.name} ({user.email})</span>
          <span className="font-mono">Adaptive Band: {incident.riskBand}</span>
        </div>
      </div>
    </div>
  );
};
