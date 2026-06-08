-- Migration tracking table (like Laravel's migrations table)
-- Run this ONCE before all other migrations
CREATE TABLE IF NOT EXISTS _migrations (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
