import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, RefreshCw, Scan, X } from 'lucide-react';
import { User } from '../types/threat';
import { store } from '../services/store';
import {
  extractLbpEmbeddingFromCanvas,
  generateSyntheticEnrolledEmbedding,
} from '../services/faceVerification';

interface FaceEnrollmentModalProps {
  user: User;
  onClose: () => void;
}

export const FaceEnrollmentModal: React.FC<FaceEnrollmentModalProps> = ({
  user,
  onClose,
}) => {
  const [useCamera, setUseCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
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
    } catch {
      setUseCamera(false);
    }
  };

  const captureAndEnroll = () => {
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
      store.enrollFace(user.id, embedding);
      setIsProcessing(false);
      setSuccess(true);
    }, 600);
  };

  const enrollDefaultTemplate = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const embedding = generateSyntheticEnrolledEmbedding(
        `${user.id}_${user.email}_enrolled_baseline`
      );
      store.enrollFace(user.id, embedding);
      setIsProcessing(false);
      setSuccess(true);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Biometric Profile Enrollment
            </h3>
            <p className="text-xs text-slate-400">
              Register baseline facial embedding for {user.name}
            </p>
          </div>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-center">
            <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-emerald-300">
              Biometric Profile Enrolled
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              531-dimensional LBP histogram template generated and stored in secure user record.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="relative aspect-square w-full max-w-[260px] mx-auto bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center mb-4">
              {useCamera ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className="text-center p-4">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      referrerPolicy="no-referrer"
                      className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-slate-700 mb-2"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-2">
                      <Scan className="w-8 h-8" />
                    </div>
                  )}
                  <span className="text-xs text-slate-400">
                    {user.enrolledFaceEmbedding
                      ? 'Biometric template already active'
                      : 'No active face template enrolled'}
                  </span>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {!useCamera ? (
                <button
                  onClick={startCamera}
                  className="w-full py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Use Live Webcam</span>
                </button>
              ) : (
                <button
                  onClick={captureAndEnroll}
                  disabled={isProcessing}
                  className="w-full py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center justify-center gap-2"
                >
                  <Scan className="w-4 h-4" />
                  <span>Capture & Enroll Template</span>
                </button>
              )}

              <button
                onClick={enrollDefaultTemplate}
                disabled={isProcessing}
                className="w-full py-2 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg"
              >
                Enroll Synthetic Standard Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
