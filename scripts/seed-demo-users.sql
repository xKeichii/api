-- Local/development demo accounts only. Do not use these credentials in production.
-- Login: demo1@example.com / DemoUser1!2026
-- Login: demo2@example.com / DemoUser2!2026

INSERT IGNORE INTO users (email, password_hash, display_name)
VALUES
  ('demo1@example.com', '$2b$12$IWNHBGFiwz.AKm3WBckiL.7Vxv6jaD1h5IMfv3Fy1tQpTB8lgrvVG', 'Demo User 1'),
  ('demo2@example.com', '$2b$12$zyGJKtPFApa2FLzKmCMGu.0aCmhOptS0q5NUa918KfLzfBNHFfDeW', 'Demo User 2');
