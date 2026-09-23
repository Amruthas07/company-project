/**
 * Core type definitions for SentinelAI User Behavior & Threat Detection System
 */

export type UserRole = 'admin' | 'employee';

export type ActivityEventType =
  | 'logon'
  | 'logoff'
  | 'file_read'
  | 'file_download'
  | 'file_delete'
  | 'file_copy'
  | 'device_connect'
  | 'privilege_escalation_attempt'
  | 'failed_logon';

export interface BehavioralProfile {
  userId: string;
  typicalLoginHourStart: number; // e.g. 8 (8 AM)
  typicalLoginHourEnd: number;   // e.g. 18 (6 PM)
  knownIps: string[];
  avgDailyDownloads: number;
  stdDailyDownloads: number;
  typicalFileCategories: string[];
  usbAuthorized: boolean;
  baselineAnomalyScore: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  title: string;
  avatarUrl?: string;
  isRestricted: boolean;
  isTerminated: boolean;
  enrolledFaceEmbedding: number[] | null;
  enrolledFaceImage?: string | null;
  lastActive: string;
  currentRiskScore: number;
  currentRiskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'ELEVATED' | 'CRITICAL';
  baseline: BehavioralProfile;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: ActivityEventType;
  timestamp: string; // ISO string
  ipAddress: string;
  userAgent?: string;
  details: {
    fileName?: string;
    fileSizeMb?: number;
    fileCategory?: 'Public' | 'Internal' | 'Confidential' | 'Restricted_Vault';
    deviceName?: string;
    deviceType?: string;
    hourOfDay?: number;
    isOffHours?: boolean;
    reason?: string;
    targetResource?: string;
  };
  threatContribution?: number; // delta on risk
}

export interface FeatureVector {
  off_hours_activity: number;        // 0 to 1 (probability of off-hours)
  failed_logon_count_1h: number;     // integer
  download_volume_ratio: number;     // current download vol / user baseline
  unfamiliar_ip_flag: number;        // 0 or 1
  usb_mass_storage_flag: number;     // 0 or 1
  restricted_file_attempts: number;  // count of sensitive / vault probes
  action_velocity_score: number;     // actions per minute deviation
}

export interface ShapContribution {
  featureKey: keyof FeatureVector;
  featureName: string;
  actualValue: string | number;
  baselineValue: string | number;
  shapValue: number; // impact on risk score (e.g. +22.4 or -8.1)
  description: string;
  isRiskBooster: boolean;
}

export type IncidentStatus =
  | 'PENDING_VERIFICATION'
  | 'ENHANCED_MONITORING'
  | 'RESTRICTED'
  | 'TERMINATED'
  | 'RESOLVED'
  | 'OVERRIDDEN';

export type AdaptiveAction =
  | 'ALLOW_STANDARD'
  | 'ALLOW_ENHANCED'
  | 'REQUIRE_VERIFICATION'
  | 'REQUIRE_VERIFICATION_AND_RESTRICT'
  | 'CRITICAL_TERMINATE';

export interface RiskAssessment {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  isolationForestScore: number;    // 0.0 - 1.0 (anomaly score)
  xgboostThreatProbability: number; // 0.0 - 1.0 (threat classification)
  compositeRiskScore: number;       // 0 - 100
  riskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'ELEVATED' | 'CRITICAL';
  recommendedAction: AdaptiveAction;
  features: FeatureVector;
  shapContributions: ShapContribution[];
}

export interface SecurityIncident {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  riskScore: number;
  status: IncidentStatus;
  triggerEvent: string;
  riskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'ELEVATED' | 'CRITICAL';
  recommendedAction: AdaptiveAction;
  shapSummary: ShapContribution[];
  faceVerification?: {
    attemptedAt: string;
    passed: boolean;
    confidenceScore: number; // 0.00 - 1.00 (e.g. 0.94)
    threshold: number;       // 0.85
    method: 'OPENCV_LBP_HISTOGRAM';
    notes: string;
  };
  adminResolution?: {
    resolvedBy: string;
    resolvedAt: string;
    action: 'RESTORE_ACCESS' | 'CONFIRM_RESTRICTION' | 'TERMINATE_SESSION';
    overrideReason: string;
  };
}

export interface CorporateFile {
  id: string;
  name: string;
  category: 'Public' | 'Internal' | 'Confidential' | 'Restricted_Vault';
  sizeMb: number;
  lastModified: string;
  department: string;
  description: string;
  downloadCount: number;
}
