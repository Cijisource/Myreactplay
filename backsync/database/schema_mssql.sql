IF OBJECT_ID(N'dbo.blynk_devices', N'U') IS NULL
CREATE TABLE dbo.blynk_devices (
    id INT IDENTITY(1,1) PRIMARY KEY,
    device_name NVARCHAR(100) NOT NULL,
    api_token NVARCHAR(255) NOT NULL UNIQUE,
    api_url NVARCHAR(MAX) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    last_seen_at DATETIME2 NULL
);
GO

IF OBJECT_ID(N'dbo.blynk_pins', N'U') IS NULL
CREATE TABLE dbo.blynk_pins (
    id INT IDENTITY(1,1) PRIMARY KEY,
    device_id INT NOT NULL REFERENCES dbo.blynk_devices(id) ON DELETE CASCADE,
    pin_name NVARCHAR(20) NOT NULL,
    pin_label NVARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT uq_blynk_pins_device_pin UNIQUE (device_id, pin_name)
);
GO

IF OBJECT_ID(N'dbo.blynk_readings', N'U') IS NULL
CREATE TABLE dbo.blynk_readings (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    device_id INT NOT NULL REFERENCES dbo.blynk_devices(id),
    pin_id INT NOT NULL REFERENCES dbo.blynk_pins(id),
    pin_name NVARCHAR(20) NOT NULL,
    value_numeric FLOAT NULL,
    value_raw NVARCHAR(MAX) NULL,
    raw_payload NVARCHAR(MAX) NULL,
    fetched_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.blynk_job_status', N'U') IS NULL
CREATE TABLE dbo.blynk_job_status (
    id INT IDENTITY(1,1) PRIMARY KEY,
    job_name NVARCHAR(100) NOT NULL UNIQUE,
    status NVARCHAR(30) NOT NULL DEFAULT 'idle',
    started_at DATETIME2 NULL,
    finished_at DATETIME2 NULL,
    last_success_at DATETIME2 NULL,
    last_error_at DATETIME2 NULL,
    last_error_message NVARCHAR(MAX) NULL,
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'idx_blynk_readings_device_pin_time')
CREATE INDEX idx_blynk_readings_device_pin_time
    ON dbo.blynk_readings (device_id, pin_name, fetched_at DESC);
GO
