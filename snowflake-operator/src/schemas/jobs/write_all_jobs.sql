INSERT INTO Jobs 
(pubkey, trigger_type, remaining_runs, next_execution_time, retry_window, owner, actions) 
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (pubkey) DO UPDATE SET
trigger_type = EXCLUDED.trigger_type,
remaining_runs = EXCLUDED.remaining_runs,
next_execution_time = EXCLUDED.next_execution_time,
retry_window = EXCLUDED.retry_window,
owner = EXCLUDED.owner,
actions = EXCLUDED.actions;
