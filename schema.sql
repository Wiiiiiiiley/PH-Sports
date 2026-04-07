-- Tables for PH Sports Management System

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    password_hash TEXT,
    password_salt TEXT,
    role TEXT DEFAULT 'student', -- 'student', 'teacher', 'admin'
    sport_coached TEXT,
    staff_id TEXT,
    student_id TEXT,
    grade TEXT,
    gender TEXT, -- 'male', 'female', 'other'
    profile_complete BOOLEAN DEFAULT FALSE,
    teacher_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Registrations (Pending Applications)
CREATE TABLE IF NOT EXISTS teacher_registrations (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    user_name TEXT,
    staff_id TEXT,
    sport_coached TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    admin_comment TEXT
);

-- Sessions Table (Auth)
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sport TEXT NOT NULL,
    coach_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id)
);

-- Team Memberships (Connecting students to teams)
CREATE TABLE IF NOT EXISTS team_memberships (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    user_name TEXT,
    team_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Venue Bookings
CREATE TABLE IF NOT EXISTS venue_bookings (
    id TEXT PRIMARY KEY,
    booked_by_email TEXT NOT NULL,
    booked_by_name TEXT,
    sport TEXT NOT NULL,
    venue TEXT NOT NULL,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    duration INTEGER,
    purpose TEXT,
    status TEXT DEFAULT 'pending',
    teacher_comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    teacher_email TEXT,
    teacher_name TEXT,
    sport TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Training Logs
CREATE TABLE IF NOT EXISTS training_logs (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    user_name TEXT,
    sport TEXT,
    date DATE NOT NULL,
    duration INTEGER, -- in minutes
    session_type TEXT,
    intensity TEXT,
    notes TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
