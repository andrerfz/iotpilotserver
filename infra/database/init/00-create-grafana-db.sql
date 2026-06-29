-- Dedicated database for Grafana.
--
-- Grafana (monitoring profile) keeps its ~80 internal tables — dashboards,
-- orgs, users, alert rules, sessions, etc. — in its configured database.
-- Pointing it at the main `iotpilot` database polluted the application schema
-- and risked name collisions (e.g. Grafana's `migration_log`/`session`/`user`
-- next to the app's `_migrations`/`sessions`/`users`). Giving Grafana its own
-- `grafana` database keeps it on the managed Postgres (so it's covered by the
-- same backups) while isolated from the app schema.
--
-- Runs once at first Postgres init (docker-entrypoint-initdb.d). Idempotent, so
-- re-running it by hand is harmless.
SELECT 'CREATE DATABASE grafana'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'grafana')\gexec
