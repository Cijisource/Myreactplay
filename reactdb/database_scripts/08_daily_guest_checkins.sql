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
    [GuestName] [varchar](150) NOT NULL,
    [PhoneNumber] [varchar](25) NULL,
    [Purpose] [varchar](500) NULL,
    [VisitingRoomNo] [varchar](20) NULL,
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

IF COL_LENGTH('dbo.DailyGuestCheckIn', 'UpdatedDate') IS NULL
BEGIN
  ALTER TABLE [dbo].[DailyGuestCheckIn]
  ADD [UpdatedDate] [datetime] NULL;
  PRINT 'Added UpdatedDate column.';
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
