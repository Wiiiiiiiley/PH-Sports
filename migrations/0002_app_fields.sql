-- Align the original schema with the application's profile, booking and training fields.
-- Run after 0001_auth.sql on an existing database, once per database.
ALTER TABLE users ADD COLUMN student_id TEXT;
ALTER TABLE users ADD COLUMN staff_id TEXT;
ALTER TABLE users ADD COLUMN grade TEXT;
ALTER TABLE users ADD COLUMN profile_photo_url TEXT;

ALTER TABLE teacher_registrations ADD COLUMN user_email TEXT;
ALTER TABLE teacher_registrations ADD COLUMN user_name TEXT;
ALTER TABLE teacher_registrations ADD COLUMN staff_id TEXT;
ALTER TABLE teacher_registrations ADD COLUMN sport_coached TEXT;
ALTER TABLE teacher_registrations ADD COLUMN admin_comment TEXT;
UPDATE teacher_registrations SET user_email = email, user_name = full_name, sport_coached = sport;

ALTER TABLE venue_bookings ADD COLUMN booked_by_email TEXT;
ALTER TABLE venue_bookings ADD COLUMN booked_by_name TEXT;
ALTER TABLE venue_bookings ADD COLUMN sport TEXT;
ALTER TABLE venue_bookings ADD COLUMN venue TEXT;
ALTER TABLE venue_bookings ADD COLUMN date TEXT;
ALTER TABLE venue_bookings ADD COLUMN time_slot TEXT;
ALTER TABLE venue_bookings ADD COLUMN duration INTEGER DEFAULT 30;
ALTER TABLE venue_bookings ADD COLUMN teacher_comment TEXT;
UPDATE venue_bookings SET booked_by_name = user_name, venue = venue_name, date = booking_date,
    time_slot = substr(start_time, 1, 5),
    booked_by_email = (SELECT email FROM users WHERE users.id = venue_bookings.user_id),
    duration = MAX(30, (CAST(substr(end_time, 1, 2) AS INTEGER) * 60 + CAST(substr(end_time, 4, 2) AS INTEGER)) - (CAST(substr(start_time, 1, 2) AS INTEGER) * 60 + CAST(substr(start_time, 4, 2) AS INTEGER)));
ALTER TABLE training_logs ADD COLUMN session_type TEXT;
ALTER TABLE training_logs ADD COLUMN data TEXT DEFAULT '{}';

CREATE INDEX IF NOT EXISTS memberships_by_user_sport ON team_memberships(user_email, sport);
CREATE INDEX IF NOT EXISTS training_by_user_sport_date ON training_logs(user_email, sport, date);
CREATE INDEX IF NOT EXISTS training_by_sport_date ON training_logs(sport, date);
CREATE INDEX IF NOT EXISTS bookings_by_venue_date ON venue_bookings(venue, date, status);
CREATE INDEX IF NOT EXISTS registrations_by_user_status ON teacher_registrations(user_id, status);
CREATE INDEX IF NOT EXISTS announcements_by_sport_created ON announcements(sport, created_at);
