-- MySQL schema for Spray Records Management System
CREATE DATABASE IF NOT EXISTS spray_records;
USE spray_records;

-- Users table
-- Stores operator/admin accounts. Passwords are stored as bcrypt hashes.
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('OPERATOR','ADMIN') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spray records table:
-- Stores pesticide application records created by operators.
-- Workflow:
-- DRAFT -> SUBMITTED -> (APPROVED | FLAGGED)
CREATE TABLE IF NOT EXISTS spray_records (
  id CHAR(36) PRIMARY KEY,
  operator_email VARCHAR(255) NOT NULL,
  date_applied DATE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  pcp_act_number VARCHAR(64) NOT NULL,
  chemical_volume_l DECIMAL(10,2) NOT NULL,
  water_volume_l DECIMAL(10,2) NOT NULL,
  notes TEXT NULL,
  location_text VARCHAR(255) NULL,
  geometry_lat DECIMAL(10,6) NULL,
  geometry_lng DECIMAL(10,6) NULL,
  status ENUM('DRAFT','SUBMITTED','APPROVED','FLAGGED') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_operator (operator_email),
  INDEX idx_status (status),
  INDEX idx_date (date_applied)
);
-- Index creates an Index on (operator_email, status, date_applied) which helps in
-- Speeding up the queries and filtering them by workflow
-- Audit log table:
-- Records important actions, especially status changes.
-- This supports accountability and traceability.
CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY,
  record_id CHAR(36) NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  action VARCHAR(64) NOT NULL,
  from_status ENUM('DRAFT','SUBMITTED','APPROVED','FLAGGED') NULL,
  to_status ENUM('DRAFT','SUBMITTED','APPROVED','FLAGGED') NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_record (record_id)
);
