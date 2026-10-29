-- Apply once to an existing database before enabling password authentication.
-- Existing user records intentionally receive no credentials or default password.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized ON users(lower(email));

CREATE TABLE IF NOT EXISTS auth_credentials (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS auth_sessions_last_seen_at ON auth_sessions(last_seen_at);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    bucket_key TEXT PRIMARY KEY,
    window_started_at INTEGER NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0
);
