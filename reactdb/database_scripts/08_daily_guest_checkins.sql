-- =====================================================
-- Daily Guest Check-In Table Script
-- =====================================================
-- Purpose: Track daily guest check-ins/check-outs linked to daily room status
-- Created: 2026-04-02

USE [mansion];
GO

PRINT 'Creating DailyGuestCheckIn table (if missing)...';
GO

IF NOT EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'DailyGuestCheckIn'
)
BEGIN
  CREATE TABLE [dbo].[DailyGuestCheckIn](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [DailyStatusId] [int] NOT NULL,
    [GuestName] [nvarchar](150) NOT NULL,
    [PhoneNumber] [nvarchar](25) NULL,
    [Purpose] [nvarchar](500) NULL,
    [VisitingRoomNo] [nvarchar](20) NULL,
    [RentAmount] [decimal](10,2) NOT NULL CONSTRAINT [DF_DailyGuestCheckIn_RentAmount] DEFAULT (0),
    [DepositAmount] [decimal](10,2) NOT NULL CONSTRAINT [DF_DailyGuestCheckIn_DepositAmount] DEFAULT (0),
    [CheckInTime] [datetime] NOT NULL,
    [CheckOutTime] [datetime] NULL,
    [CreatedDate] [datetime] NOT NULL CONSTRAINT [DF_DailyGuestCheckIn_CreatedDate] DEFAULT (GETDATE()),
    [UpdatedDate] [datetime] NULL,
    CONSTRAINT [PK_DailyGuestCheckIn] PRIMARY KEY CLUSTERED ([Id] ASC)
      WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
  ) ON [PRIMARY];

  ALTER TABLE [dbo].[DailyGuestCheckIn]
  ADD CONSTRAINT [FK_DailyGuestCheckIn_DailyRoomStatus]
  FOREIGN KEY([DailyStatusId])
  REFERENCES [dbo].[DailyRoomStatus] ([Id])
  ON DELETE CASCADE;

  CREATE NONCLUSTERED INDEX [IX_DailyGuestCheckIn_DailyStatusId]
  ON [dbo].[DailyGuestCheckIn] ([DailyStatusId] ASC)
  INCLUDE ([GuestName], [CheckInTime], [CheckOutTime]);

  CREATE NONCLUSTERED INDEX [IX_DailyGuestCheckIn_CheckInTime]
  ON [dbo].[DailyGuestCheckIn] ([CheckInTime] DESC);

  PRINT 'DailyGuestCheckIn table created successfully.';
END
ELSE
BEGIN
  PRINT 'DailyGuestCheckIn table already exists. Skipping CREATE TABLE.';
END
GO

PRINT 'Applying additive safety checks...';
GO

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.DailyGuestCheckIn')
    AND name = 'GuestName'
    AND system_type_id = 167
)
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ALTER COLUMN [GuestName] [nvarchar](150) NOT NULL;
  PRINT 'Converted GuestName to NVARCHAR(150).';
END
GO

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.DailyGuestCheckIn')
    AND name = 'PhoneNumber'
    AND system_type_id = 167
)
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ALTER COLUMN [PhoneNumber] [nvarchar](25) NULL;
  PRINT 'Converted PhoneNumber to NVARCHAR(25).';
END
GO

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.DailyGuestCheckIn')
    AND name = 'Purpose'
    AND system_type_id = 167
)
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ALTER COLUMN [Purpose] [nvarchar](500) NULL;
  PRINT 'Converted Purpose to NVARCHAR(500).';
END
GO

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.DailyGuestCheckIn')
    AND name = 'VisitingRoomNo'
    AND system_type_id = 167
)
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ALTER COLUMN [VisitingRoomNo] [nvarchar](20) NULL;
  PRINT 'Converted VisitingRoomNo to NVARCHAR(20).';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'UpdatedDate') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn]
  ADD [UpdatedDate] [datetime] NULL;
  PRINT 'Added UpdatedDate column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof2Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof2Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof2Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo2Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo2Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo2Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof3Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof3Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof3Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo3Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo3Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo3Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof4Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof4Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof4Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo4Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo4Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo4Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof5Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof5Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof5Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo5Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo5Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo5Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof6Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof6Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof6Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo6Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo6Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo6Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof7Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof7Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof7Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo7Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo7Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo7Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof8Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof8Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof8Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo8Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo8Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo8Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof9Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof9Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof9Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo9Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo9Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo9Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Proof10Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Proof10Url] [nvarchar](1000) NULL;
  PRINT 'Added Proof10Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'Photo10Url') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [Photo10Url] [nvarchar](1000) NULL;
  PRINT 'Added Photo10Url column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'RentAmount') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn]
  ADD [RentAmount] [decimal](10,2) NOT NULL CONSTRAINT [DF_DailyGuestCheckIn_RentAmount] DEFAULT (0);
  PRINT 'Added RentAmount column.';
END
GO

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'DepositAmount') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn]
  ADD [DepositAmount] [decimal](10,2) NOT NULL CONSTRAINT [DF_DailyGuestCheckIn_DepositAmount] DEFAULT (0);
  PRINT 'Added DepositAmount column.';
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_DailyGuestCheckIn_DailyStatusId'
    AND object_id = OBJECT_ID('dbo.DailyGuestCheckIn')
)
BEGIN
  CREATE NONCLUSTERED INDEX [IX_DailyGuestCheckIn_DailyStatusId]
  ON [dbo].[DailyGuestCheckIn] ([DailyStatusId] ASC)
  INCLUDE ([GuestName], [CheckInTime], [CheckOutTime]);
  PRINT 'Created index IX_DailyGuestCheckIn_DailyStatusId.';
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_DailyGuestCheckIn_CheckInTime'
    AND object_id = OBJECT_ID('dbo.DailyGuestCheckIn')
)
BEGIN
  CREATE NONCLUSTERED INDEX [IX_DailyGuestCheckIn_CheckInTime]
  ON [dbo].[DailyGuestCheckIn] ([CheckInTime] DESC);
  PRINT 'Created index IX_DailyGuestCheckIn_CheckInTime.';
END
GO

PRINT '';
PRINT 'Verification query output:';
SELECT TOP 20
  g.Id,
  g.DailyStatusId,
  g.GuestName,
  g.VisitingRoomNo,
  g.RentAmount,
  g.DepositAmount,
  g.CheckInTime,
  g.CheckOutTime,
  g.CreatedDate,
  g.UpdatedDate
FROM [dbo].[DailyGuestCheckIn] g
ORDER BY g.CheckInTime DESC, g.Id DESC;
GO

PRINT 'Daily guest check-in script completed.';
GO
