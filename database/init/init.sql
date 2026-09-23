-- AI-Based Adaptive Insider Threat Detection System
-- PostgreSQL Database Initialization Script

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    hashed_password VARCHAR(256) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'employee',
    department VARCHAR(128) NOT NULL,
    title VARCHAR(128) NOT NULL,
    is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    is_terminated BOOLEAN NOT NULL DEFAULT FALSE,
    enrolled_face_embedding TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS behavioral_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    typical_login_start INT NOT NULL DEFAULT 9,
    typical_login_end INT NOT NULL DEFAULT 18,
    known_ips TEXT NOT NULL DEFAULT '["192.168.1.50"]',
    avg_daily_downloads FLOAT NOT NULL DEFAULT 3.0,
    std_daily_downloads FLOAT NOT NULL DEFAULT 1.0,
    usb_authorized BOOLEAN NOT NULL DEFAULT FALSE,
    baseline_anomaly_score FLOAT NOT NULL DEFAULT 0.08,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_events (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(128) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(64) NOT NULL,
    user_agent VARCHAR(256),
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_events(timestamp);

CREATE TABLE IF NOT EXISTS threat_predictions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    isolation_forest_score FLOAT NOT NULL,
    xgboost_threat_prob FLOAT NOT NULL,
    composite_risk_score INT NOT NULL,
    risk_band VARCHAR(32) NOT NULL,
    recommended_action VARCHAR(64) NOT NULL,
    features JSONB NOT NULL,
    shap_contributions JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS security_incidents (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(128) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    risk_score INT NOT NULL,
    risk_band VARCHAR(32) NOT NULL,
    status VARCHAR(64) NOT NULL,
    trigger_event TEXT NOT NULL,
    recommended_action VARCHAR(64) NOT NULL,
    shap_summary JSONB NOT NULL,
    face_verification_result JSONB,
    admin_resolution JSONB
);

CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON security_incidents(status);
