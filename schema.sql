-- Tables for PH Sports Management System

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'student', -- 'student', 'teacher', 'admin'
    sport_coached TEXT,
    profile_complete BOOLEAN DEFAULT FALSE,
    teacher_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    student_id TEXT,
    staff_id TEXT,
    grade TEXT,
    profile_photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Registrations (Pending Applications)
CREATE TABLE IF NOT EXISTS teacher_registrations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    full_name TEXT,
    email TEXT,
    sport TEXT,
    status TEXT DEFAULT 'pending',
    user_email TEXT,
    user_name TEXT,
    staff_id TEXT,
    sport_coached TEXT,
    admin_comment TEXT,
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
    sport TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Venue Bookings
CREATE TABLE IF NOT EXISTS venue_bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    venue_name TEXT NOT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    purpose TEXT,
    status TEXT DEFAULT 'pending',
    booked_by_email TEXT,
    booked_by_name TEXT,
    sport TEXT,
    venue TEXT,
    date TEXT,
    time_slot TEXT,
    duration INTEGER DEFAULT 30,
    teacher_comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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
    intensity TEXT,
    session_type TEXT,
    data TEXT DEFAULT '{}',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS memberships_by_user_sport ON team_memberships(user_email, sport);
CREATE INDEX IF NOT EXISTS training_by_user_sport_date ON training_logs(user_email, sport, date);
CREATE INDEX IF NOT EXISTS training_by_sport_date ON training_logs(sport, date);
CREATE INDEX IF NOT EXISTS bookings_by_venue_date ON venue_bookings(venue, date, status);
CREATE INDEX IF NOT EXISTS registrations_by_user_status ON teacher_registrations(user_id, status);
CREATE INDEX IF NOT EXISTS announcements_by_sport_created ON announcements(sport, created_at);
