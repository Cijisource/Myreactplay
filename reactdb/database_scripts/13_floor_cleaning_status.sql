USE [mansion];
GO

IF OBJECT_ID(N'dbo.FloorCleaningStatus', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[FloorCleaningStatus](
    [FloorId] [varchar](20) NOT NULL,
    [CleaningDate] [date] NOT NULL,
    [Status] [varchar](20) NOT NULL
      CONSTRAINT [DF_FloorCleaningStatus_Status] DEFAULT ('pending'),
    [UpdatedAt] [datetime] NOT NULL
      CONSTRAINT [DF_FloorCleaningStatus_UpdatedAt] DEFAULT (GETDATE()),
    CONSTRAINT [PK_FloorCleaningStatus]
      PRIMARY KEY CLUSTERED ([FloorId] ASC, [CleaningDate] ASC),
    CONSTRAINT [CK_FloorCleaningStatus_FloorId]
      CHECK ([FloorId] IN ('ground', 'first', 'second', 'third')),
    CONSTRAINT [CK_FloorCleaningStatus_Status]
      CHECK ([Status] IN ('cleaned', 'pending'))
  );
END
GO
