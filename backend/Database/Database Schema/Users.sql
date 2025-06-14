-- -- schema.sql
-- CREATE DATABASE IF NOT EXISTS foodshare_db;

-- USE foodshare_db;

-- CREATE TABLE IF NOT EXISTS users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   full_name VARCHAR(100) NOT NULL,
--   email VARCHAR(100) NOT NULL UNIQUE,
--   phone VARCHAR(20),
--   password VARCHAR(255) NOT NULL,
--   role ENUM('Donor', 'Charity') NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- =========================================
-- DATABASE SCHEMA: Hybrid Auth System
-- Roles: Donor, Charity, Admin
-- Auth: Single `users` table + role-specific detail tables
-- =========================================
-- schema.sql
CREATE DATABASE IF NOT EXISTS foodshare_db;

USE foodshare_db;
-- Drop existing tables for clean slate (for dev only)
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS charities;
DROP TABLE IF EXISTS donors;
DROP TABLE IF EXISTS users;

-- USERS TABLE (core login info)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('donor', 'charity', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DONORS TABLE (Donor profile info)
CREATE TABLE donors (
    user_id INT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    preferences TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CHARITIES TABLE (Charity org profile info)
CREATE TABLE charities (
    user_id INT PRIMARY KEY,
    org_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    registration_number VARCHAR(50),
    website_url VARCHAR(255),
    doc_url TEXT, -- uploaded documents or verification proofs
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ADMINS TABLE (Admin-specific info)
CREATE TABLE admins (
    user_id INT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    access_key VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
