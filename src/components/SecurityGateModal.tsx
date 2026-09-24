import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Scan,
  RefreshCw,
  Info,
  VideoOff,
} from 'lucide-react';
import { store } from '../services/store';
import { SecurityIncident, User } from '../types/threat';
import {
  extractLbpEmbeddingFromCanvas,
  generateSyntheticProbeEmbedding,
  detectFaceInCanvas,
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
  const [cameraState, setCameraState] = useState<
    'idle' | 'initializing' | 'active' | 'denied' | 'not_found' | 'error'
  >('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceCheckError, setFaceCheckError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    similarity: number;
    notes: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef(false);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  }, []);

  // Video ready checker
  const checkVideoReady = useCallback(() => {
    const video = videoRef.current;
    if (video && (video.videoWidth > 0 || video.readyState >= 2)) {
      setIsVideoReady(true);
    }
  }, []);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    setCameraState('initializing');
    setCameraError(null);
    setFaceCheckError(null);
    setIsVideoReady(false);

    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NOT_SUPPORTED');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => console.log('[Webcam] play prevented or pending interaction:', e));
        }
      }

      setCameraState('active');
    } catch (err: any) {
      console.warn('[Webcam] getUserMedia error:', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraError(
          'Camera permission denied. Please allow camera access or use the calibrated test verification modes below.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraState('not_found');
        setCameraError(
          'No camera detected. You can verify using the calibrated test verification modes below.'
        );
      } else {
        setCameraState('error');
        setCameraError(
          'Camera unavailable in this environment. You can use the calibrated test verification modes below.'
        );
      }
    } finally {
      isRequestingRef.current = false;
    }
  }, [stopCamera]);

  // Callback ref guarantees attachment the instant DOM node is mounted
  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.muted = true;
      node.autoplay = true;
      node.playsInline = true;
      const playPromise = node.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => console.log('[Webcam] play prevented or pending interaction:', e));
      }
      if (node.videoWidth > 0) {
        setIsVideoReady(true);
      }
    }
  }, []);

  // Automatically start camera on open for smooth experience
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Polling interval to detect when video dimensions become usable (> 0)
  useEffect(() => {
    if (cameraState !== 'active') return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        setIsVideoReady(true);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [cameraState]);

  const captureFromVideo = async () => {
    const video = videoRef.current;
    if (!video) {
      setFaceCheckError('Camera stream not attached.');
      return;
    }

    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      setFaceCheckError('Camera stream is still initializing. Please wait a moment.');
      return;
    }

    setIsProcessing(true);
    setFaceCheckError(null);

    try {
      // 1. Draw frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Validate face presence & image quality
      const checkResult = await detectFaceInCanvas(canvas);
      if (!checkResult.detected) {
        setFaceCheckError(checkResult.message);
        setIsProcessing(false);
        return;
      }

      // 3. Extract probe LBP embedding
      const probeEmbedding = extractLbpEmbeddingFromCanvas(canvas);

      // 4. Create image File for backend multipart sync
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );
      const imageFile = blob
        ? new File([blob], `probe_face_${user.id}.jpg`, { type: 'image/jpeg' })
        : undefined;

      // 5. Verify against enrolled baseline
      const res = store.verifyUserFace(user.id, probeEmbedding, incident.id, null, imageFile);
      setVerificationResult({
        passed: res.passed,
        similarity: res.similarityPercentage,
        notes: res.details,
      });
    } catch (err: any) {
      setFaceCheckError(err?.message || 'Error processing facial capture.');
    } finally {
      setIsProcessing(false);
    }
  };

  const runSampleVerification = (matchEnrolled: boolean) => {
    setIsProcessing(true);
    setVerificationResult(null);
    setFaceCheckError(null);

    setTimeout(() => {
      if (!user.enrolledFaceEmbedding) {
        const res = store.verifyUserFace(user.id, [], incident.id, matchEnrolled);
        setVerificationResult({
          passed: res.passed,
          similarity: res.similarityPercentage,
          notes: res.details,
        });
      } else {
        const probe = generateSyntheticProbeEmbedding(
          user.enrolledFaceEmbedding,
          matchEnrolled
        );
        const res = store.verifyUserFace(user.id, probe, incident.id, matchEnrolled);
        setVerificationResult({
          passed: res.passed,
          similarity: res.similarityPercentage,
          notes: res.details,
        });
      }
      setIsProcessing(false);
    }, 550);
  };

  const handleClose = () => {
    stopCamera();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen overflow-y-auto flex items-center justify-center px-4 py-8 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-750 max-w-xl w-full rounded-2xl p-6 sm:p-7 shadow-2xl relative border-amber-500/40 max-h-[90vh] overflow-y-auto my-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Security Gate: Identity Verification Required
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Automated telemetry flagged high-risk behavioral anomalies (Risk Score:{' '}
              <span className="font-mono text-amber-400 font-semibold">
                {incident.riskScore}%
              </span>
              ). Corporate zero-trust policy requires live biometric face verification to confirm identity.
            </p>
          </div>
        </div>

        {/* Verification Result Display */}
        {verificationResult ? (
          <div
            className={`p-4 rounded-xl border mb-5 transition-all ${
              verificationResult.passed
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {verificationResult.passed ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">
                    {verificationResult.passed
                      ? 'Identity Confirmed — Access Restored'
                      : 'Verification Failed — Session Restricted'}
                  </h4>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/50 border border-white/10 text-white">
                    Cosine Similarity: {verificationResult.similarity}% (Req: 85%)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {verificationResult.notes}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {verificationResult.passed ? (
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-md shadow-emerald-950/40"
                    >
                      Continue to Monitored Workspace
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setVerificationResult(null);
                          startCamera();
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors"
                      >
                        Retry Verification
                      </button>
                      <span className="text-[11px] text-rose-300 font-mono">
                        ESCALATED_TO_SECOPS_ADMIN
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Error notifications */}
            {cameraError && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{cameraError}</span>
              </div>
            )}

            {faceCheckError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{faceCheckError}</span>
              </div>
            )}

            {/* Camera Viewport Container */}
            <div className="relative w-full aspect-[4/3] max-w-[400px] mx-auto overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center shadow-inner">
              <video
                ref={attachVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={checkVideoReady}
                onLoadedData={checkVideoReady}
                onCanPlay={checkVideoReady}
                onPlaying={checkVideoReady}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Initializing Spinner */}
              {cameraState === 'initializing' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-400">
                  <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-slate-200">
                    Initializing optical verification sensor...
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Requesting optical device permissions
                  </span>
                </div>
              )}

              {/* Inactive View */}
              {(cameraState === 'denied' ||
                cameraState === 'not_found' ||
                cameraState === 'error' ||
                cameraState === 'idle') && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-400 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2 text-slate-500">
                    <VideoOff className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    {cameraState === 'denied'
                      ? 'Camera Permission Denied'
                      : cameraState === 'not_found'
                      ? 'No Camera Detected'
                      : 'Live Optical Sensor Standby'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px]">
                    Use the calibrated test buttons below or launch webcam.
                  </p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/80 rounded-lg flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Launch Webcam</span>
                  </button>
                </div>
              )}

              {/* Active Scanner Reticle Overlay */}
              {cameraState === 'active' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="w-48 h-56 border-2 border-amber-500/60 rounded-3xl relative shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-400" />

                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 border border-amber-500/30">
                      <div className="border-r border-b border-amber-500/30" />
                      <div className="border-r border-b border-amber-500/30" />
                      <div className="border-b border-amber-500/30" />
                      <div className="border-r border-b border-amber-500/30" />
                      <div className="border-r border-b border-amber-500/30" />
                      <div className="border-b border-amber-500/30" />
                      <div className="border-r border-amber-500/30" />
                      <div className="border-r border-amber-500/30" />
                      <div />
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-amber-400 flex items-center gap-1.5 border border-amber-900/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{isVideoReady ? 'LBP_PROBE: MONITORING' : 'Connecting sensor...'}</span>
                  </div>
                </div>
              )}

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-cyan-400 z-20">
                  <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-white">
                    Running OpenCV LBP Verification...
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    Computing Cosine Similarity vs Enrolled Vector
                  </span>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col gap-3">
              {cameraState === 'active' && isVideoReady ? (
                <button
                  onClick={captureFromVideo}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
                >
                  <Scan className="w-4 h-4" />
                  <span>Capture &amp; Verify Identity</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Launch Live Camera</span>
                </button>
              )}

              {/* Calibrated Scenario Test Modes */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="font-medium text-slate-300 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-cyan-400" /> Calibrated Verification Test Scenarios:
                  </span>
                  <span className="font-mono text-slate-400">Req: &gt;= 85%</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => runSampleVerification(true)}
                    disabled={isProcessing}
                    className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-lg text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Legitimate User Match</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Enrolled biometric signature (~94.5% match). Resolves incident to Enhanced Monitoring.
                    </p>
                  </button>

                  <button
                    onClick={() => runSampleVerification(false)}
                    disabled={isProcessing}
                    className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-lg text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Impostor / Mismatch</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Different individual (~42.1% similarity). Fails verification and locks account per policy.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Target Identity: {user.name}</span>
          <span className="font-mono text-cyan-400/80">
            Biometric Profile: {user.enrolledFaceEmbedding ? 'ENROLLED' : 'PENDING'}
          </span>
        </div>
      </div>
    </div>
  );
};
