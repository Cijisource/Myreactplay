CREATE TABLE IF NOT EXISTS blynk_devices (
    id SERIAL PRIMARY KEY,
    device_name VARCHAR(100) NOT NULL,
    api_token VARCHAR(255) NOT NULL UNIQUE,
    api_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS blynk_pins (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES blynk_devices(id) ON DELETE CASCADE,
    pin_name VARCHAR(20) NOT NULL,
    pin_label VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(device_id, pin_name)
);

CREATE TABLE IF NOT EXISTS blynk_readings (
    id BIGSERIAL PRIMARY KEY,
    device_id INT NOT NULL REFERENCES blynk_devices(id) ON DELETE CASCADE,
    pin_id INT NOT NULL REFERENCES blynk_pins(id) ON DELETE CASCADE,
    pin_name VARCHAR(20) NOT NULL,
    value_numeric DOUBLE PRECISION,
    value_raw TEXT,
    raw_payload JSONB,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blynk_job_status (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'idle',
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blynk_readings_device_pin_time
    ON blynk_readings (device_id, pin_name, fetched_at DESC);
