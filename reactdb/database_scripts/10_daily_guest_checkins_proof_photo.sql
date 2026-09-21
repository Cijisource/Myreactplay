-- =====================================================
-- Daily Guest Check-In Proof2..Proof10 and Photo2..Photo10 Enhancement
-- =====================================================
-- Purpose: Add only proofs/photos 2 through 10 to DailyGuestCheckIn
-- Created: 2026-09-21

USE [mansion];
GO

PRINT 'Applying DailyGuestCheckIn proof2..proof10 / photo2..photo10 enhancements...';
GO

IF OBJECT_ID('dbo.DailyGuestCheckIn', 'U') IS NULL
BEGIN
  PRINT 'DailyGuestCheckIn table does not exist. Run 08_daily_guest_checkins.sql first.';
  RETURN;
END
GO

DECLARE @fieldName sysname;
DECLARE @sql nvarchar(max);
DECLARE @i int = 2;

WHILE @i <= 10
BEGIN
  SET @fieldName = 'Proof' + CAST(@i AS nvarchar(2)) + 'Url';
  IF COL_LENGTH('dbo.DailyGuestCheckIn', @fieldName) IS NULL
  BEGIN
    SET @sql = 'ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [' + @fieldName + '] [nvarchar](1000) NULL;';
    EXEC sp_executesql @sql;
    PRINT 'Added ' + @fieldName + ' column.';
  END
  ELSE
  BEGIN
    PRINT @fieldName + ' already exists. Skipping.';
  END

  SET @fieldName = 'Photo' + CAST(@i AS nvarchar(2)) + 'Url';
  IF COL_LENGTH('dbo.DailyGuestCheckIn', @fieldName) IS NULL
  BEGIN
    SET @sql = 'ALTER TABLE [dbo].[DailyGuestCheckIn] ADD [' + @fieldName + '] [nvarchar](1000) NULL;';
    EXEC sp_executesql @sql;
    PRINT 'Added ' + @fieldName + ' column.';
  END
  ELSE
  BEGIN
    PRINT @fieldName + ' already exists. Skipping.';
  END

  SET @i = @i + 1;
END
GO

PRINT '';
PRINT 'Verification query output:';
SELECT TOP 10
  Id,
  DailyStatusId,
  GuestName,
  Proof2Url,
  Photo2Url,
  Proof10Url,
  Photo10Url,
  CheckInTime,
  UpdatedDate
FROM [dbo].[DailyGuestCheckIn]
ORDER BY CheckInTime DESC, Id DESC;
GO

PRINT 'Daily guest check-in proof2..proof10 / photo2..photo10 script completed.';
GO
