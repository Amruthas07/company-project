"""
Shared feature engineering pipeline for AI-Based Adaptive Insider Threat Detection System.
Used both during offline training and real-time backend inference.
"""

from datetime import datetime
from typing import Dict, List, Any
import numpy as np

FEATURE_NAMES = [
    "login_hour",
    "is_off_hours",
    "login_hour_deviation",
    "is_new_ip",
    "failed_logins_today",
    "files_accessed_today",
    "downloads_today",
    "download_volume_today",
    "restricted_access_today",
    "files_deviation",
    "downloads_deviation",
    "is_weekend"
]

def extract_features_from_events(
    events: List[Dict[str, Any]],
    baseline_profile: Dict[str, Any],
    reference_time: datetime = None
) -> Dict[str, float]:
    """
    Extracts the 12-dimensional behavioral feature vector from raw activity events
    compared against the user's specific baseline profile.
    """
    if reference_time is None:
        reference_time = datetime.utcnow()

    # 1. Login metrics
    login_events = [e for e in events if e.get("event_type") in ("logon", "LOGIN_SUCCESS")]
    latest_login = login_events[-1] if login_events else None
    
    if latest_login:
        ts = latest_login.get("timestamp")
        if isinstance(ts, str):
            login_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        elif isinstance(ts, datetime):
            login_dt = ts
        else:
            login_dt = reference_time
        login_hour = float(login_dt.hour)
    else:
        login_hour = float(reference_time.hour)

    typical_start = float(baseline_profile.get("typical_login_start", 9))
    typical_end = float(baseline_profile.get("typical_login_end", 18))
    
    is_off_hours = 1.0 if (login_hour < typical_start or login_hour >= typical_end) else 0.0
    
    midpoint = (typical_start + typical_end) / 2.0
    login_hour_deviation = abs(login_hour - midpoint)

    # 2. IP Subnet / Unfamiliar IP
    known_ips = baseline_profile.get("known_ips", [])
    if isinstance(known_ips, str):
        import json
        try:
            known_ips = json.loads(known_ips)
        except Exception:
            known_ips = ["192.168.1.50"]
            
    recent_ips = [e.get("ip_address") for e in events[-5:] if e.get("ip_address")]
    is_new_ip = 1.0 if any(ip not in known_ips for ip in recent_ips) else 0.0

    # 3. Failed Logins Today
    today_start = reference_time.replace(hour=0, minute=0, second=0, microsecond=0)
    failed_logins_today = float(len([
        e for e in events 
        if e.get("event_type") in ("failed_logon", "LOGIN_FAILED")
    ]))

    # 4. Files Accessed & Downloads
    file_views = [e for e in events if e.get("event_type") in ("file_read", "FILE_VIEW")]
    file_downloads = [e for e in events if e.get("event_type") in ("file_download", "FILE_DOWNLOAD")]
    
    files_accessed_today = float(len(file_views))
    downloads_today = float(len(file_downloads))
    
    download_volume_today = float(sum(
        float(e.get("details", {}).get("file_size_mb", 2.5))
        for e in file_downloads
    ))

    # 5. Restricted Resource Access Probes
    restricted_access_today = float(len([
        e for e in events
        if e.get("event_type") in ("privilege_escalation_attempt", "RESTRICTED_RESOURCE_ACCESS")
        or e.get("details", {}).get("file_category") in ("Restricted_Vault", "Confidential")
    ]))

    # 6. Deviations from Employee Baseline
    avg_downloads = float(baseline_profile.get("avg_daily_downloads", 3.0))
    std_downloads = float(baseline_profile.get("std_daily_downloads", 1.0)) or 1.0
    
    downloads_deviation = max(0.0, (downloads_today - avg_downloads) / std_downloads)
    files_deviation = max(0.0, (files_accessed_today - 5.0) / 2.0)

    # 7. Weekend flag
    is_weekend = 1.0 if reference_time.weekday() >= 5 else 0.0

    return {
        "login_hour": login_hour,
        "is_off_hours": is_off_hours,
        "login_hour_deviation": login_hour_deviation,
        "is_new_ip": is_new_ip,
        "failed_logins_today": failed_logins_today,
        "files_accessed_today": files_accessed_today,
        "downloads_today": downloads_today,
        "download_volume_today": download_volume_today,
        "restricted_access_today": restricted_access_today,
        "files_deviation": files_deviation,
        "downloads_deviation": downloads_deviation,
        "is_weekend": is_weekend
    }

def feature_dict_to_vector(features: Dict[str, float]) -> np.ndarray:
    """Converts feature dictionary to ordered numpy array matching model inputs."""
    return np.array([features[name] for name in FEATURE_NAMES], dtype=np.float32).reshape(1, -1)
