-- ============================================================
-- ANTI-THEFT: refresh app_config secret value to match .env.local
-- RUN SEKALI setelah migration 016v2/017v2/018.
-- GANTI <ISI_DARI_ENV> dengan nilai MIDTRANS_WEBHOOK_SECRET di .env.local
-- (jangan commit file ini dengan nilai asli).
-- ============================================================

INSERT INTO app_config (key, value)
VALUES ('midtrans_webhook_secret', '<ISI_DARI_ENV>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Verify (hanya tampilkan panjang, bukan isi — jangan bocorkan di log)
SELECT key, length(value) AS len, updated_at FROM app_config WHERE key = 'midtrans_webhook_secret';
