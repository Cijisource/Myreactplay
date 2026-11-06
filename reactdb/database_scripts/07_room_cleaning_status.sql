USE [mansion];
GO

IF OBJECT_ID(N'dbo.RoomCleaningStatus', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[RoomCleaningStatus](
    [RoomId] [int] NOT NULL,
    [CleaningDate] [date] NOT NULL,
    [Status] [varchar](20) NOT NULL
      CONSTRAINT [DF_RoomCleaningStatus_Status] DEFAULT ('pending'),
    [UpdatedAt] [datetime] NOT NULL
      CONSTRAINT [DF_RoomCleaningStatus_UpdatedAt] DEFAULT (GETDATE()),
    CONSTRAINT [PK_RoomCleaningStatus]
      PRIMARY KEY CLUSTERED ([RoomId] ASC, [CleaningDate] ASC),
    CONSTRAINT [FK_RoomCleaningStatus_RoomDetail]
      FOREIGN KEY ([RoomId]) REFERENCES [dbo].[RoomDetail] ([Id]),
    CONSTRAINT [CK_RoomCleaningStatus_Status]
      CHECK ([Status] IN ('cleaned', 'pending'))
  );
END
GO
