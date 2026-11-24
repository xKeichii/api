ALTER TABLE auth_sessions
  ADD COLUMN refresh_token_hash CHAR(64) NULL,
  ADD UNIQUE KEY auth_sessions_refresh_token_hash_unique (refresh_token_hash);
