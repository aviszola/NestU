-- ============================================================
-- Setup: Set webhook secret (jalan SEKALI setelah migration 016)
-- GANTI nilai di bawah dengan isi MIDTRANS_WEBHOOK_SECRET dari .env.local
-- JANGAN commit file ini dengan nilai asli.
-- ============================================================

INSERT INTO app_config (key, value)
VALUES ('midtrans_webhook_secret', 'ISI_DARI_ENV_LOCAL_DI_SINI')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Verify
SELECT key, value, updated_at FROM app_config WHERE key = 'midtrans_webhook_secret';
