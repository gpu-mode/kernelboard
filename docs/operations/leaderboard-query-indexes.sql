-- Run each statement outside a transaction. These indexes were built
-- concurrently on production during the 2026-10-23 timeout incident.
-- Match the eligibility predicates in both kernelboard and kernelbot.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_secret_leaderboard_pass
    ON leaderboard.runs (submission_id, runner)
    WHERE secret AND passed AND mode = 'leaderboard';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_runs_secret_fail
    ON leaderboard.runs (submission_id, runner)
    WHERE secret AND passed = FALSE;

-- Keep insert-heavy run metadata eligible for index-only scans between vacuums.
-- The default insert scale factor of 0.2 allowed hundreds of thousands of new
-- runs before vacuum; recent leaderboards then required heap reads per run.
ALTER TABLE leaderboard.runs SET (
    autovacuum_vacuum_scale_factor = 0.02,
    autovacuum_vacuum_insert_scale_factor = 0.02
);
