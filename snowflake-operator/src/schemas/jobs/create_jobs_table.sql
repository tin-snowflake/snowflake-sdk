CREATE TABLE IF NOT EXISTS Jobs (
 pubkey TEXT PRIMARY KEY,
 trigger_type INTEGER NOT NULL,
 remaining_runs INTEGER NOT NULL,
 next_execution_time TIMESTAMP NOT NULL,
 retry_window INTEGER NOT NULL,
 owner TEXT NOT NULL,
 actions TEXT NOT NULL
);