-- Migration 001: let alerts watch anywhere destinations, round trips, and
-- flexible (whole-month) dates. Run once in the Neon SQL Editor.

-- Destination can be NULL/empty = "anywhere from origin".
alter table alerts alter column destination drop not null;

-- Optional return date for round-trip alerts.
alter table alerts add column if not exists return_date text;

-- Store dates as text so they can be an exact day (YYYY-MM-DD) or month (YYYY-MM).
alter table alerts alter column depart_date type text using depart_date::text;
alter table price_history alter column depart_date type text using depart_date::text;
