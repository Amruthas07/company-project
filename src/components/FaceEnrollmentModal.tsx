import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Check,
  RefreshCw,
  Scan,
  X,
  AlertCircle,
  ShieldCheck,
  VideoOff,
} from 'lucide-react';
import { User } from '../types/threat';
import { store } from '../services/store';
import {
  extractLbpEmbeddingFromCanvas,
  generateSyntheticEnrolledEmbedding,
  detectFaceInCanvas,
} from '../services/faceVerification';

interface FaceEnrollmentModalProps {
  user: User;
  onClose: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  user,
  onClose,
}) => {
  const [cameraState, setCameraState] = useState<
    'initializing' | 'active' | 'denied' | 'not_found' | 'error'
  >('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [faceCheckError, setFaceCheckError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef(false);

  // Stop camera tracks cleanly
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
  }, []);

  // Safe camera initialization
  const startCamera = useCallback(async () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;
    setCameraState('initializing');
    setErrorMessage(null);
    setFaceCheckError(null);
    setIsVideoReady(false);

    // Stop existing stream if any
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current
          .play()
          .catch((e) => console.log('[Webcam] play prevented or pending interaction:', e));
      }

      setCameraState('active');
    } catch (err: any) {
      console.warn('[Webcam] getUserMedia error:', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage(
          'Camera permission denied. Please allow camera access in your browser settings to proceed with biometric enrollment.'
        );
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraState('not_found');
        setErrorMessage(
          'No camera available on this device. Please connect a webcam or use the synthetic template below.'
        );
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setCameraState('error');
        setErrorMessage(
          'Camera is currently in use by another application or system process. Please release the device and retry.'
        );
      } else if (err?.message === 'NOT_SUPPORTED') {
        setCameraState('error');
        setErrorMessage(
          'Camera API is not supported in this browser environment or insecure context.'
        );
      } else {
        setCameraState('error');
        setErrorMessage(
          'Browser blocked camera access or camera hardware failed to respond. You can enroll with a synthetic standard template.'
        );
      }
    } finally {
      isRequestingRef.current = false;
    }
  }, [stopCamera]);

  // Request camera on modal mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Re-attach stream whenever videoRef attaches or stream changes
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

  // Handle capture & enrollment
  const captureAndEnroll = async () => {
    const video = videoRef.current;
    if (!video) {
      setFaceCheckError('Camera stream not attached.');
      return;
    }

    // Wait until video has usable dimensions
    if (video.videoWidth <= 0 || video.videoHeight <= 0) {
      setFaceCheckError('Camera stream is still initializing. Please wait a moment.');
      return;
    }

    setIsProcessing(true);
    setFaceCheckError(null);

    try {
      // 1. Render frame to canvas using actual video stream dimensions
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Face detection and image quality validation
      const checkResult = await detectFaceInCanvas(canvas);
      if (!checkResult.detected) {
        setFaceCheckError(checkResult.message);
        setIsProcessing(false);
        return;
      }

      // 3. Extract 3x3 LBP histogram embedding
      const embedding = extractLbpEmbeddingFromCanvas(canvas);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // 4. Convert canvas to real File/Blob for multipart/form-data upload
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
      );

      const imageFile = blob
        ? new File([blob], `enrolled_face_${user.id}.jpg`, { type: 'image/jpeg' })
        : undefined;

      // 5. Enroll in local store and sync multipart/form-data to backend
      store.enrollFace(user.id, embedding, photoDataUrl, imageFile);

      setSuccess(true);
    } catch (err: any) {
      setFaceCheckError(err?.message || 'Error processing facial capture.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Synthetic Template Fallback
  const enrollDefaultTemplate = () => {
    setIsProcessing(true);
    setFaceCheckError(null);
    setTimeout(() => {
      const embedding = generateSyntheticEnrolledEmbedding(
        `${user.id}_${user.email}_enrolled_baseline`
      );
      store.enrollFace(user.id, embedding);
      setIsProcessing(false);
      setSuccess(true);
    }, 450);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen overflow-y-auto flex items-center justify-center px-4 py-8 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto my-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Biometric Profile Enrollment
            </h3>
            <p className="text-xs text-slate-400">
              Register baseline facial embedding for{' '}
              <span className="text-cyan-300 font-medium">{user.name}</span>
            </p>
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-base font-semibold text-emerald-300">
              Face enrolled successfully.
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              OpenCV 3×3 spatial Local Binary Patterns (LBP) histogram template has been
              computed and linked to {user.name}&apos;s monitored identity.
            </p>
            <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-950 border border-emerald-800/60 text-[11px] font-mono text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>STATUS: BASELINE_ENROLLED</span>
            </div>
            <button
              onClick={handleClose}
              className="mt-5 w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-lg shadow-emerald-950/40"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Error notifications */}
            {errorMessage && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {faceCheckError && (
              <div className="p-3 bg-amber-950/50 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-tight">{faceCheckError}</span>
              </div>
            )}

            {/* Camera Viewport Container */}
            <div className="relative w-full aspect-[4/3] max-w-[360px] mx-auto overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center shadow-inner">
              {/* Live Video Element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  setIsVideoReady(true);
                  videoRef.current?.play().catch(() => {});
                }}
                onCanPlay={() => {
                  setIsVideoReady(true);
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraState === 'active' && isVideoReady ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transform: 'scaleX(-1)' }} // Mirror user webcam for natural preview
              />

              {/* Initializing Spinner */}
              {cameraState === 'initializing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-400">
                  <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin mb-2" />
                  <span className="text-xs font-medium text-slate-300">
                    Accessing optical webcam...
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 text-center">
                    Please allow camera permissions if prompted
                  </span>
                </div>
              )}

              {/* Inactive / Camera Error Fallback View */}
              {(cameraState === 'denied' ||
                cameraState === 'not_found' ||
                cameraState === 'error') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-400 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-2 text-slate-500">
                    <VideoOff className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">
                    Webcam Unavailable
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                    Use the synthetic standard template below to proceed with testing.
                  </span>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/80 rounded-lg flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry Camera</span>
                  </button>
                </div>
              )}

              {/* HUD Target Overlay for Active Stream */}
              {cameraState === 'active' && isVideoReady && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Outer Frame Guides */}
                  <div className="w-48 h-56 border-2 border-cyan-500/50 rounded-3xl relative shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />

                    {/* 3x3 Spatial Grid Guides */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 border border-cyan-500/30">
                      <div className="border-r border-b border-cyan-500/30" />
                      <div className="border-r border-b border-cyan-500/30" />
                      <div className="border-b border-cyan-500/30" />
                      <div className="border-r border-b border-cyan-500/30" />
                      <div className="border-r border-b border-cyan-500/30" />
                      <div className="border-b border-cyan-500/30" />
                      <div className="border-r border-cyan-500/30" />
                      <div className="border-r border-cyan-500/30" />
                      <div />
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 bg-slate-950/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-cyan-400 flex items-center gap-1 border border-cyan-900/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>OPTICAL_FEED: ACTIVE</span>
                  </div>
                </div>
              )}

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-cyan-400 z-10">
                  <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-white">
                    Extracting LBP Spatial Descriptor...
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Computing Haar landmarks &amp; L2 histogram
                  </span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                onClick={captureAndEnroll}
                disabled={
                  isProcessing ||
                  cameraState !== 'active' ||
                  !isVideoReady
                }
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-800 disabled:cursor-not-allowed border border-cyan-500/40 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
              >
                <Scan className="w-4 h-4" />
                <span>Capture &amp; Enroll Template</span>
              </button>

              <button
                onClick={enrollDefaultTemplate}
                disabled={isProcessing}
                className="w-full py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Enroll Synthetic Standard Template</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
