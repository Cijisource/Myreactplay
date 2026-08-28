/****** Object:  Database [mansion]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE DATABASE [mansion]  (EDITION = 'Basic', SERVICE_OBJECTIVE = 'Basic', MAXSIZE = 2 GB) WITH CATALOG_COLLATION = SQL_Latin1_General_CP1_CI_AS, LEDGER = OFF;
GO
ALTER DATABASE [mansion] SET COMPATIBILITY_LEVEL = 150
GO
ALTER DATABASE [mansion] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [mansion] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [mansion] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [mansion] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [mansion] SET ARITHABORT OFF 
GO
ALTER DATABASE [mansion] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [mansion] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [mansion] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [mansion] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [mansion] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [mansion] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [mansion] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [mansion] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [mansion] SET ALLOW_SNAPSHOT_ISOLATION ON 
GO
ALTER DATABASE [mansion] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [mansion] SET READ_COMMITTED_SNAPSHOT ON 
GO
ALTER DATABASE [mansion] SET  MULTI_USER 
GO
ALTER DATABASE [mansion] SET ENCRYPTION ON
GO
ALTER DATABASE [mansion] SET QUERY_STORE = ON
GO
ALTER DATABASE [mansion] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 7), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 10, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
/*** The scripts of database scoped configurations in Azure should be executed inside the target database connection. ***/
GO
-- ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 8;
GO
/****** Object:  UserDefinedFunction [dbo].[fn_DaysInMonth]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- Create helper function: Get Days In Month
-- =====================================================
CREATE   FUNCTION [dbo].[fn_DaysInMonth]
    (@Year INT, @Month INT)
RETURNS INT
AS
BEGIN
    RETURN DAY(EOMONTH(DATEFROMPARTS(@Year, @Month, 1)));
END
GO
/****** Object:  Table [dbo].[__MigrationHistory]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[__MigrationHistory](
	[MigrationId] [nvarchar](150) NOT NULL,
	[ContextKey] [nvarchar](300) NOT NULL,
	[Model] [varbinary](max) NOT NULL,
	[ProductVersion] [nvarchar](32) NOT NULL,
 CONSTRAINT [PK_dbo.__MigrationHistory] PRIMARY KEY CLUSTERED 
(
	[MigrationId] ASC,
	[ContextKey] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[cart_items]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[cart_items](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[cart_session_id] [nvarchar](255) NOT NULL,
	[product_id] [int] NOT NULL,
	[quantity] [int] NOT NULL,
	[added_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_cart_items] UNIQUE NONCLUSTERED 
(
	[cart_session_id] ASC,
	[product_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[categories]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[categories](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[cities]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[cities](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[city_name] [nvarchar](100) NOT NULL,
	[zip_code] [nvarchar](10) NOT NULL,
	[state] [nvarchar](50) NOT NULL,
	[shipping_zone] [nvarchar](20) NOT NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[city_name] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CollectionReminder]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CollectionReminder](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[OccupancyId] [int] NOT NULL,
	[ReminderSentDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[CollectionVerification]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CollectionVerification](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[OccupancyId] [int] NOT NULL,
	[Comments] [nvarchar](200) NULL,
	[VerifiedBy] [nvarchar](100) NOT NULL,
	[VerifiedOn] [datetime] NOT NULL,
	[IsVerified] [bit] NOT NULL,
	[IsDisputeRaised] [bit] NOT NULL,
	[ReviewMonth] [nchar](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Complains]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Complains](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](1000) NOT NULL,
	[ComplaintTypeId] [int] NOT NULL,
	[ComplaintStatusId] [int] NOT NULL,
	[ClosedDate] [datetime] NULL,
	[ClosureComments] [nvarchar](500) NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[RoomId] [int] NOT NULL,
	[Charges] [money] NULL,
	[ChargesDetails] [nvarchar](500) NULL,
	[Proof1Url] [nvarchar](max) NULL,
	[Proof2Url] [nvarchar](max) NULL,
	[VideoUrl] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ComplaintStatus]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ComplaintStatus](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Status] [nvarchar](20) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ComplainType]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ComplainType](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Type] [varchar](50) NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ConsignmentImport]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ConsignmentImport](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ConsignmentMasterUrl] [varchar](max) NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ConsignmentMasters]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ConsignmentMasters](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[AWB_No] [nvarchar](500) NOT NULL,
	[CONSIGNOR] [nvarchar](500) NOT NULL,
	[Booking_Date] [nvarchar](100) NOT NULL,
	[Store_Coad] [nvarchar](100) NULL,
	[Destination] [nvarchar](300) NULL,
	[No_of_pcs] [smallint] NOT NULL,
	[Weight] [decimal](18, 0) NULL,
	[States] [nvarchar](500) NULL,
	[Description] [nvarchar](1000) NULL,
 CONSTRAINT [PK_ConsignmentMasters] PRIMARY KEY CLUSTERED 
(
	[AWB_No] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[customer_rewards]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[customer_rewards](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[customer_email] [nvarchar](255) NOT NULL,
	[total_points] [int] NULL,
	[redeemed_points] [int] NULL,
	[available_points] [int] NULL,
	[loyalty_tier] [nvarchar](20) NULL,
	[total_spent] [decimal](10, 2) NULL,
	[order_count] [int] NULL,
	[last_order_date] [datetime2](7) NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[customer_email] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DailyGuestCheckIn]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DailyGuestCheckIn](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[DailyStatusId] [int] NOT NULL,
	[GuestName] [nvarchar](150) NOT NULL,
	[PhoneNumber] [varchar](25) NULL,
	[Purpose] [nvarchar](500) NULL,
	[VisitingRoomNo] [varchar](20) NULL,
	[CheckInTime] [datetime] NOT NULL,
	[CheckOutTime] [datetime] NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[RentAmount] [decimal](10, 2) NOT NULL,
	[DepositAmount] [decimal](10, 2) NOT NULL,
	[ProofUrl] [varchar](1000) NULL,
	[PhotoUrl] [varchar](1000) NULL,
 CONSTRAINT [PK_DailyGuestCheckIn] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DailyRoomStatus]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DailyRoomStatus](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Date] [datetime] NOT NULL,
	[RoomStatus] [varchar](1000) NULL,
	[WaterLevelStatus] [varchar](1000) NULL,
	[CreatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DailyRoomStatusMedia]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DailyRoomStatusMedia](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[DailyStatusId] [int] NOT NULL,
	[MediaType] [varchar](50) NOT NULL,
	[SequenceNumber] [int] NOT NULL,
	[FileName] [varchar](500) NOT NULL,
	[FilePath] [varchar](1000) NOT NULL,
	[FileSize] [bigint] NULL,
	[MimeType] [varchar](100) NULL,
	[UploadedDate] [datetime] NOT NULL,
	[CreatedBy] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[discounts]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[discounts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[code] [nvarchar](50) NOT NULL,
	[description] [nvarchar](max) NULL,
	[discount_type] [nvarchar](20) NOT NULL,
	[discount_value] [decimal](10, 2) NOT NULL,
	[max_uses] [int] NULL,
	[current_uses] [int] NULL,
	[min_order_amount] [decimal](10, 2) NULL,
	[max_discount_amount] [decimal](10, 2) NULL,
	[valid_from] [datetime2](7) NULL,
	[valid_until] [datetime2](7) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[code] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[EBServicePayments]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[EBServicePayments](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ServiceId] [int] NOT NULL,
	[BillAmount] [money] NOT NULL,
	[BillDate] [datetime] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[BilledUnits] [int] NULL,
 CONSTRAINT [PK_Table] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Occupancy]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Occupancy](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[TenantId] [int] NOT NULL,
	[RoomId] [int] NOT NULL,
	[CheckInDate] [nchar](10) NOT NULL,
	[CheckOutDate] [nchar](10) NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NOT NULL,
	[RentFixed] [money] NULL,
	[DepositReceived] [money] NULL,
	[Charges] [money] NULL,
	[DepositRefunded] [money] NULL,
	[Depositurl] [nvarchar](max) NULL,
	[Refundurl] [nvarchar](max) NULL,
	[CollectionVerificationId] [int] NULL,
	[TransactionId] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[order_discounts]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[order_discounts](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[order_id] [int] NOT NULL,
	[discount_id] [int] NULL,
	[discount_code] [nvarchar](50) NULL,
	[discount_type] [nvarchar](20) NULL,
	[discount_amount] [decimal](10, 2) NOT NULL,
	[applied_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[order_items]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[order_items](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[order_id] [int] NOT NULL,
	[product_id] [int] NOT NULL,
	[product_name] [nvarchar](255) NOT NULL,
	[quantity] [int] NOT NULL,
	[unit_price] [decimal](10, 2) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[orders]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[orders](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[order_number] [nvarchar](100) NOT NULL,
	[total_amount] [decimal](10, 2) NOT NULL,
	[status] [nvarchar](50) NULL,
	[customer_email] [nvarchar](255) NOT NULL,
	[customer_name] [nvarchar](255) NOT NULL,
	[shipping_address] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
	[payment_screenshot] [nvarchar](max) NULL,
	[subtotal_amount] [decimal](10, 2) NULL,
	[gst_amount] [decimal](10, 2) NULL,
	[shipping_charge] [decimal](10, 2) NULL,
	[discount_code] [nvarchar](50) NULL,
	[discount_amount] [decimal](10, 2) NULL,
	[reward_code_used] [nvarchar](50) NULL,
	[loyalty_points_used] [int] NULL,
	[loyalty_points_earned] [int] NULL,
	[applied_discount_code] [nvarchar](50) NULL,
	[payment_method] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[order_number] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[product_images]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[product_images](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[product_id] [int] NOT NULL,
	[image_url] [nvarchar](max) NOT NULL,
	[filename] [nvarchar](255) NOT NULL,
	[thumbnail_url] [nvarchar](max) NULL,
	[uploaded_at] [datetime2](7) NULL,
	[is_primary] [bit] NULL,
	[display_order] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[products]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[products](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[category_id] [int] NOT NULL,
	[price] [decimal](10, 2) NOT NULL,
	[stock] [int] NULL,
	[sku] [nvarchar](100) NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
	[seller_id] [int] NULL,
	[is_preorder] [bit] NOT NULL,
	[preorder_release_date] [date] NULL,
	[weight_kg] [decimal](10, 2) NOT NULL,
	[model_number] [nvarchar](100) NULL,
	[subcategory_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[sku] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RentalCollection]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RentalCollection](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[OccupancyId] [int] NOT NULL,
	[RentReceivedOn] [nchar](10) NOT NULL,
	[RentBalance] [money] NULL,
	[Charges] [money] NULL,
	[RefundDetails] [text] NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[RentReceived] [money] NULL,
	[ModeofPayment] [nvarchar](10) NULL,
	[screenshoturl] [nvarchar](max) NULL,
	[folder] [nvarchar](50) NULL,
	[CollectionVerificationId] [int] NULL,
	[TransactionId] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[reward_transactions]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[reward_transactions](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[customer_email] [nvarchar](255) NOT NULL,
	[transaction_type] [nvarchar](20) NOT NULL,
	[points_amount] [int] NOT NULL,
	[order_id] [int] NULL,
	[description] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RoleDetail]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RoleDetail](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[RoleName] [nvarchar](50) NOT NULL,
	[RoleType] [nvarchar](50) NOT NULL,
	[createdDate] [date] NULL,
	[updatedDate] [date] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[RoomDetail]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[RoomDetail](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Number] [nchar](10) NOT NULL,
	[Rent] [int] NOT NULL,
	[Beds] [smallint] NOT NULL,
	[RoomNo] [nchar](10) NULL,
	[ParentRoomId] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[search_history]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[search_history](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[session_id] [nvarchar](255) NOT NULL,
	[search_query] [nvarchar](max) NOT NULL,
	[results_count] [int] NULL,
	[searched_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ServiceConsumptionDetails]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ServiceConsumptionDetails](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ServiceAllocId] [int] NOT NULL,
	[ReadingTakenDate] [datetime] NOT NULL,
	[StartingMeterReading] [int] NOT NULL,
	[EndingMeterReading] [nchar](10) NOT NULL,
	[UnitsConsumed] [int] NOT NULL,
	[AmountToBeCollected] [money] NULL,
	[UnitRate] [money] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[MeterPhoto1Url] [nvarchar](max) NULL,
	[MeterPhoto2Url] [nvarchar](max) NULL,
	[MeterPhoto3Url] [nvarchar](max) NULL,
	[IsAutoFilledStartingReading] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ServiceDetails]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ServiceDetails](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ConsumerNo] [nvarchar](50) NOT NULL,
	[MeterNo] [int] NOT NULL,
	[Load] [nvarchar](10) NOT NULL,
	[ServiceCategory] [nvarchar](50) NOT NULL,
	[ConsumerName] [nvarchar](100) NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ServiceRoomAllocation]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ServiceRoomAllocation](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ServiceId] [int] NOT NULL,
	[RoomId] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[shipping_zones]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[shipping_zones](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[zone_name] [nvarchar](50) NOT NULL,
	[zone_code] [nvarchar](20) NOT NULL,
	[shipping_charge] [decimal](10, 2) NOT NULL,
	[description] [nvarchar](255) NULL,
	[is_active] [bit] NULL,
	[created_at] [datetime] NULL,
	[updated_at] [datetime] NULL,
	[seller_id] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StockDetails]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StockDetails](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](50) NOT NULL,
	[Description] [nvarchar](500) NULL,
	[Quantity] [smallint] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[UpdatedBy] [varchar](50) NULL,
	[ImageURL] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[subcategories]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[subcategories](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[category_id] [int] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NULL,
	[created_at] [datetime2](7) NULL,
	[updated_at] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [uq_subcategory_name_per_category] UNIQUE NONCLUSTERED 
(
	[category_id] ASC,
	[name] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Table]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Table](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ConsignmentMasterUrl] [varchar](max) NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Tables]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Tables](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[AWBId] [nvarchar](500) NOT NULL,
	[ShipmentLocation] [nvarchar](500) NOT NULL,
	[DateTime] [datetime] NOT NULL,
	[PhotoUrl] [varchar](max) NULL,
 CONSTRAINT [PK_Tables] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Tenant]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Tenant](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nchar](100) NOT NULL,
	[Phone] [nchar](15) NOT NULL,
	[Address] [nchar](100) NOT NULL,
	[City] [nchar](50) NOT NULL,
	[PhotoUrl] [nvarchar](max) NULL,
	[Proof1Url] [nvarchar](max) NULL,
	[Proof2Url] [nvarchar](max) NULL,
	[Proof3Url] [nvarchar](max) NULL,
	[Photo2Url] [nvarchar](max) NULL,
	[Photo3Url] [nvarchar](max) NULL,
	[Photo4Url] [nvarchar](max) NULL,
	[Photo5Url] [nvarchar](max) NULL,
	[Photo6Url] [nvarchar](max) NULL,
	[Photo7Url] [nvarchar](max) NULL,
	[Photo8Url] [nvarchar](max) NULL,
	[Photo9Url] [nvarchar](max) NULL,
	[Photo10Url] [nvarchar](max) NULL,
	[Proof4Url] [nvarchar](max) NULL,
	[Proof5Url] [nvarchar](max) NULL,
	[Proof6Url] [nvarchar](max) NULL,
	[Proof7Url] [nvarchar](max) NULL,
	[Proof8Url] [nvarchar](max) NULL,
	[Proof9Url] [nvarchar](max) NULL,
	[Proof10Url] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Tenants]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Tenants](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Name] [nvarchar](max) NULL,
 CONSTRAINT [PK_dbo.Tenants] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TenantServiceCharges]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TenantServiceCharges](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[ServiceConsumptionId] [int] NOT NULL,
	[TenantId] [int] NOT NULL,
	[RoomId] [int] NOT NULL,
	[ServiceId] [int] NOT NULL,
	[BillingMonth] [int] NOT NULL,
	[BillingYear] [int] NOT NULL,
	[TotalUnitsForRoom] [int] NOT NULL,
	[ProRataUnits] [decimal](10, 2) NOT NULL,
	[ProRataPercentage] [decimal](5, 2) NOT NULL,
	[ChargePerUnit] [money] NOT NULL,
	[TotalCharge] [money] NOT NULL,
	[CheckInDate] [date] NOT NULL,
	[CheckOutDate] [date] NULL,
	[OccupancyDaysInMonth] [int] NOT NULL,
	[TotalDaysInMonth] [int] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[Status] [nvarchar](20) NULL,
	[Notes] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Transactions]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Transactions](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Description] [nvarchar](500) NOT NULL,
	[TransactionTypeId] [int] NOT NULL,
	[TransactionDate] [datetime] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[Amount] [money] NOT NULL,
	[OccupancyId] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[TransactionType]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[TransactionType](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[TransactionType] [nvarchar](10) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[User]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[User](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[UserName] [nvarchar](100) NOT NULL,
	[Password] [nvarchar](500) NOT NULL,
	[Name] [nvarchar](500) NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
	[NextLoginDuration] [tinyint] NULL,
	[LastLogin] [datetime] NULL,
	[PhoneNumber] [nvarchar](20) NULL,
	[ShippingAddress] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[UserRole]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[UserRole](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[UserId] [int] NOT NULL,
	[RoleId] [int] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[UpdatedDate] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[wishlist]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[wishlist](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[user_id] [int] NOT NULL,
	[product_id] [int] NOT NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [unique_wishlist] UNIQUE NONCLUSTERED 
(
	[user_id] ASC,
	[product_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_city_name]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_city_name] ON [dbo].[cities]
(
	[city_name] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_shipping_zone]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_shipping_zone] ON [dbo].[cities]
(
	[shipping_zone] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_state]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_state] ON [dbo].[cities]
(
	[state] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_zip_code]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_zip_code] ON [dbo].[cities]
(
	[zip_code] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [UX_CollectionVerification_Occupancy_ReviewMonth]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE UNIQUE NONCLUSTERED INDEX [UX_CollectionVerification_Occupancy_ReviewMonth] ON [dbo].[CollectionVerification]
(
	[OccupancyId] ASC,
	[ReviewMonth] ASC
)
WHERE ([ReviewMonth] IS NOT NULL)
WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_customer_email]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_customer_email] ON [dbo].[customer_rewards]
(
	[customer_email] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_loyalty_tier]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_loyalty_tier] ON [dbo].[customer_rewards]
(
	[loyalty_tier] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_DailyGuestCheckIn_CheckInTime]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_DailyGuestCheckIn_CheckInTime] ON [dbo].[DailyGuestCheckIn]
(
	[CheckInTime] DESC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_DailyGuestCheckIn_DailyStatusId]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_DailyGuestCheckIn_DailyStatusId] ON [dbo].[DailyGuestCheckIn]
(
	[GuestName] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_DailyRoomStatusMedia_DailyStatusId]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_DailyRoomStatusMedia_DailyStatusId] ON [dbo].[DailyRoomStatusMedia]
(
	[DailyStatusId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_DailyRoomStatusMedia_MediaType]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_DailyRoomStatusMedia_MediaType] ON [dbo].[DailyRoomStatusMedia]
(
	[MediaType] ASC,
	[SequenceNumber] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_discount_active]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_discount_active] ON [dbo].[discounts]
(
	[is_active] ASC,
	[valid_from] ASC,
	[valid_until] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_discount_code]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_discount_code] ON [dbo].[discounts]
(
	[code] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_discount_id]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_discount_id] ON [dbo].[order_discounts]
(
	[discount_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_order_id]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_order_id] ON [dbo].[order_discounts]
(
	[order_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_products_model_number]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_products_model_number] ON [dbo].[products]
(
	[model_number] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_products_seller]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_products_seller] ON [dbo].[products]
(
	[seller_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_products_subcategory_id]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_products_subcategory_id] ON [dbo].[products]
(
	[subcategory_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_customer_email_trans]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_customer_email_trans] ON [dbo].[reward_transactions]
(
	[customer_email] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_transaction_type]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_transaction_type] ON [dbo].[reward_transactions]
(
	[transaction_type] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ServiceConsumptionDetails_DateAndAlloc]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_ServiceConsumptionDetails_DateAndAlloc] ON [dbo].[ServiceConsumptionDetails]
(
	[ReadingTakenDate] DESC,
	[ServiceAllocId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ServiceConsumptionDetails_ServiceAllocId]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_ServiceConsumptionDetails_ServiceAllocId] ON [dbo].[ServiceConsumptionDetails]
(
	[ServiceAllocId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_shipping_zones_seller]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_shipping_zones_seller] ON [dbo].[shipping_zones]
(
	[seller_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_shipping_zones_zone_code_seller]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_shipping_zones_zone_code_seller] ON [dbo].[shipping_zones]
(
	[zone_code] ASC,
	[seller_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [idx_zone_code]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_zone_code] ON [dbo].[shipping_zones]
(
	[zone_code] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [idx_subcategories_category_id]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [idx_subcategories_category_id] ON [dbo].[subcategories]
(
	[category_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_FK_Table_ToTable]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_FK_Table_ToTable] ON [dbo].[Tables]
(
	[AWBId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_TenantServiceCharges_RoomMonth]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_TenantServiceCharges_RoomMonth] ON [dbo].[TenantServiceCharges]
(
	[RoomId] ASC,
	[BillingYear] ASC,
	[BillingMonth] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_TenantServiceCharges_ServiceConsumption]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_TenantServiceCharges_ServiceConsumption] ON [dbo].[TenantServiceCharges]
(
	[ServiceConsumptionId] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_TenantServiceCharges_Status]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_TenantServiceCharges_Status] ON [dbo].[TenantServiceCharges]
(
	[Status] ASC,
	[BillingYear] ASC,
	[BillingMonth] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_TenantServiceCharges_TenantMonth]    Script Date: 8/17/2026 12:56:30 PM ******/
CREATE NONCLUSTERED INDEX [IX_TenantServiceCharges_TenantMonth] ON [dbo].[TenantServiceCharges]
(
	[TenantId] ASC,
	[BillingYear] ASC,
	[BillingMonth] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, DROP_EXISTING = OFF, ONLINE = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[cities] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[cities] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT ((0)) FOR [total_points]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT ((0)) FOR [redeemed_points]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT ((0)) FOR [available_points]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT ('Silver') FOR [loyalty_tier]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT ((0)) FOR [total_spent]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT ((0)) FOR [order_count]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[customer_rewards] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[DailyGuestCheckIn] ADD  CONSTRAINT [DF_DailyGuestCheckIn_CreatedDate]  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[DailyGuestCheckIn] ADD  CONSTRAINT [DF_DailyGuestCheckIn_RentAmount]  DEFAULT ((0)) FOR [RentAmount]
GO
ALTER TABLE [dbo].[DailyGuestCheckIn] ADD  CONSTRAINT [DF_DailyGuestCheckIn_DepositAmount]  DEFAULT ((0)) FOR [DepositAmount]
GO
ALTER TABLE [dbo].[DailyRoomStatusMedia] ADD  DEFAULT (getdate()) FOR [UploadedDate]
GO
ALTER TABLE [dbo].[discounts] ADD  DEFAULT ((0)) FOR [current_uses]
GO
ALTER TABLE [dbo].[discounts] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[discounts] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[discounts] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[order_discounts] ADD  DEFAULT (getdate()) FOR [applied_at]
GO
ALTER TABLE [dbo].[orders] ADD  DEFAULT ((0)) FOR [subtotal_amount]
GO
ALTER TABLE [dbo].[orders] ADD  DEFAULT ((0)) FOR [gst_amount]
GO
ALTER TABLE [dbo].[orders] ADD  DEFAULT ((0)) FOR [shipping_charge]
GO
ALTER TABLE [dbo].[orders] ADD  DEFAULT ((0)) FOR [discount_amount]
GO
ALTER TABLE [dbo].[orders] ADD  DEFAULT ((0)) FOR [loyalty_points_used]
GO
ALTER TABLE [dbo].[orders] ADD  DEFAULT ((0)) FOR [loyalty_points_earned]
GO
ALTER TABLE [dbo].[products] ADD  DEFAULT ((0)) FOR [is_preorder]
GO
ALTER TABLE [dbo].[products] ADD  CONSTRAINT [DF_products_weight_kg]  DEFAULT ((0.50)) FOR [weight_kg]
GO
ALTER TABLE [dbo].[reward_transactions] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[RoomDetail] ADD  DEFAULT ((1)) FOR [Beds]
GO
ALTER TABLE [dbo].[ServiceConsumptionDetails] ADD  DEFAULT ((0)) FOR [AmountToBeCollected]
GO
ALTER TABLE [dbo].[ServiceConsumptionDetails] ADD  DEFAULT ((10)) FOR [UnitRate]
GO
ALTER TABLE [dbo].[ServiceConsumptionDetails] ADD  DEFAULT ((0)) FOR [IsAutoFilledStartingReading]
GO
ALTER TABLE [dbo].[shipping_zones] ADD  DEFAULT ((1)) FOR [is_active]
GO
ALTER TABLE [dbo].[shipping_zones] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[shipping_zones] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[subcategories] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[subcategories] ADD  DEFAULT (getdate()) FOR [updated_at]
GO
ALTER TABLE [dbo].[TenantServiceCharges] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[TenantServiceCharges] ADD  DEFAULT ('Calculated') FOR [Status]
GO
ALTER TABLE [dbo].[wishlist] ADD  DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[CollectionReminder]  WITH CHECK ADD  CONSTRAINT [FK_CollectionReminder_Occupancy] FOREIGN KEY([OccupancyId])
REFERENCES [dbo].[Occupancy] ([Id])
GO
ALTER TABLE [dbo].[CollectionReminder] CHECK CONSTRAINT [FK_CollectionReminder_Occupancy]
GO
ALTER TABLE [dbo].[Complains]  WITH CHECK ADD  CONSTRAINT [FK_Complains_ToRoomDetail] FOREIGN KEY([RoomId])
REFERENCES [dbo].[RoomDetail] ([Id])
GO
ALTER TABLE [dbo].[Complains] CHECK CONSTRAINT [FK_Complains_ToRoomDetail]
GO
ALTER TABLE [dbo].[Complains]  WITH CHECK ADD  CONSTRAINT [FK_Complains_ToStatus] FOREIGN KEY([ComplaintStatusId])
REFERENCES [dbo].[ComplaintStatus] ([Id])
GO
ALTER TABLE [dbo].[Complains] CHECK CONSTRAINT [FK_Complains_ToStatus]
GO
ALTER TABLE [dbo].[Complains]  WITH CHECK ADD  CONSTRAINT [FK_Complains_ToTable] FOREIGN KEY([ComplaintTypeId])
REFERENCES [dbo].[ComplainType] ([Id])
GO
ALTER TABLE [dbo].[Complains] CHECK CONSTRAINT [FK_Complains_ToTable]
GO
ALTER TABLE [dbo].[DailyGuestCheckIn]  WITH CHECK ADD  CONSTRAINT [FK_DailyGuestCheckIn_DailyRoomStatus] FOREIGN KEY([DailyStatusId])
REFERENCES [dbo].[DailyRoomStatus] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[DailyGuestCheckIn] CHECK CONSTRAINT [FK_DailyGuestCheckIn_DailyRoomStatus]
GO
ALTER TABLE [dbo].[DailyRoomStatusMedia]  WITH CHECK ADD  CONSTRAINT [FK_DailyRoomStatusMedia_DailyRoomStatus] FOREIGN KEY([DailyStatusId])
REFERENCES [dbo].[DailyRoomStatus] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[DailyRoomStatusMedia] CHECK CONSTRAINT [FK_DailyRoomStatusMedia_DailyRoomStatus]
GO
ALTER TABLE [dbo].[EBServicePayments]  WITH CHECK ADD  CONSTRAINT [FK_EBServicePayments_Service] FOREIGN KEY([ServiceId])
REFERENCES [dbo].[ServiceDetails] ([Id])
GO
ALTER TABLE [dbo].[EBServicePayments] CHECK CONSTRAINT [FK_EBServicePayments_Service]
GO
ALTER TABLE [dbo].[Occupancy]  WITH CHECK ADD  CONSTRAINT [FK_Occupancy_CollectionVerification] FOREIGN KEY([CollectionVerificationId])
REFERENCES [dbo].[CollectionVerification] ([Id])
GO
ALTER TABLE [dbo].[Occupancy] CHECK CONSTRAINT [FK_Occupancy_CollectionVerification]
GO
ALTER TABLE [dbo].[Occupancy]  WITH CHECK ADD  CONSTRAINT [FK_Occupancy_RoomDetail] FOREIGN KEY([RoomId])
REFERENCES [dbo].[RoomDetail] ([Id])
GO
ALTER TABLE [dbo].[Occupancy] CHECK CONSTRAINT [FK_Occupancy_RoomDetail]
GO
ALTER TABLE [dbo].[Occupancy]  WITH CHECK ADD  CONSTRAINT [FK_Occupancy_Tenant] FOREIGN KEY([TenantId])
REFERENCES [dbo].[Tenant] ([Id])
GO
ALTER TABLE [dbo].[Occupancy] CHECK CONSTRAINT [FK_Occupancy_Tenant]
GO
ALTER TABLE [dbo].[Occupancy]  WITH CHECK ADD  CONSTRAINT [FK_Occupancy_Transactions] FOREIGN KEY([TransactionId])
REFERENCES [dbo].[Transactions] ([Id])
GO
ALTER TABLE [dbo].[Occupancy] CHECK CONSTRAINT [FK_Occupancy_Transactions]
GO
ALTER TABLE [dbo].[order_discounts]  WITH CHECK ADD  CONSTRAINT [fk_order_discounts_discount] FOREIGN KEY([discount_id])
REFERENCES [dbo].[discounts] ([id])
GO
ALTER TABLE [dbo].[order_discounts] CHECK CONSTRAINT [fk_order_discounts_discount]
GO
ALTER TABLE [dbo].[order_discounts]  WITH CHECK ADD  CONSTRAINT [fk_order_discounts_order] FOREIGN KEY([order_id])
REFERENCES [dbo].[orders] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[order_discounts] CHECK CONSTRAINT [fk_order_discounts_order]
GO
ALTER TABLE [dbo].[products]  WITH CHECK ADD  CONSTRAINT [fk_products_seller] FOREIGN KEY([seller_id])
REFERENCES [dbo].[User] ([Id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[products] CHECK CONSTRAINT [fk_products_seller]
GO
ALTER TABLE [dbo].[products]  WITH CHECK ADD  CONSTRAINT [fk_products_subcategory] FOREIGN KEY([subcategory_id])
REFERENCES [dbo].[subcategories] ([id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[products] CHECK CONSTRAINT [fk_products_subcategory]
GO
ALTER TABLE [dbo].[RentalCollection]  WITH CHECK ADD  CONSTRAINT [FK_RentalCollection_CollectionVerification] FOREIGN KEY([CollectionVerificationId])
REFERENCES [dbo].[CollectionVerification] ([Id])
GO
ALTER TABLE [dbo].[RentalCollection] CHECK CONSTRAINT [FK_RentalCollection_CollectionVerification]
GO
ALTER TABLE [dbo].[RentalCollection]  WITH CHECK ADD  CONSTRAINT [FK_RentalCollection_ToOccupancy] FOREIGN KEY([OccupancyId])
REFERENCES [dbo].[Occupancy] ([Id])
GO
ALTER TABLE [dbo].[RentalCollection] CHECK CONSTRAINT [FK_RentalCollection_ToOccupancy]
GO
ALTER TABLE [dbo].[RentalCollection]  WITH CHECK ADD  CONSTRAINT [FK_RentalCollection_Transactions] FOREIGN KEY([TransactionId])
REFERENCES [dbo].[Transactions] ([Id])
GO
ALTER TABLE [dbo].[RentalCollection] CHECK CONSTRAINT [FK_RentalCollection_Transactions]
GO
ALTER TABLE [dbo].[reward_transactions]  WITH CHECK ADD  CONSTRAINT [fk_reward_transactions_order] FOREIGN KEY([order_id])
REFERENCES [dbo].[orders] ([id])
ON DELETE SET NULL
GO
ALTER TABLE [dbo].[reward_transactions] CHECK CONSTRAINT [fk_reward_transactions_order]
GO
ALTER TABLE [dbo].[ServiceConsumptionDetails]  WITH CHECK ADD  CONSTRAINT [FK_ServiceConsumptionDetails_ToTable] FOREIGN KEY([ServiceAllocId])
REFERENCES [dbo].[ServiceRoomAllocation] ([Id])
GO
ALTER TABLE [dbo].[ServiceConsumptionDetails] CHECK CONSTRAINT [FK_ServiceConsumptionDetails_ToTable]
GO
ALTER TABLE [dbo].[ServiceRoomAllocation]  WITH CHECK ADD  CONSTRAINT [FK_ServiceRoomAllocation_RoomDetail] FOREIGN KEY([RoomId])
REFERENCES [dbo].[RoomDetail] ([Id])
GO
ALTER TABLE [dbo].[ServiceRoomAllocation] CHECK CONSTRAINT [FK_ServiceRoomAllocation_RoomDetail]
GO
ALTER TABLE [dbo].[ServiceRoomAllocation]  WITH CHECK ADD  CONSTRAINT [FK_ServiceRoomAllocation_ServiceDetails] FOREIGN KEY([ServiceId])
REFERENCES [dbo].[ServiceDetails] ([Id])
GO
ALTER TABLE [dbo].[ServiceRoomAllocation] CHECK CONSTRAINT [FK_ServiceRoomAllocation_ServiceDetails]
GO
ALTER TABLE [dbo].[shipping_zones]  WITH CHECK ADD  CONSTRAINT [FK_shipping_zones_User_seller_id] FOREIGN KEY([seller_id])
REFERENCES [dbo].[User] ([Id])
GO
ALTER TABLE [dbo].[shipping_zones] CHECK CONSTRAINT [FK_shipping_zones_User_seller_id]
GO
ALTER TABLE [dbo].[subcategories]  WITH CHECK ADD  CONSTRAINT [fk_subcategories_category] FOREIGN KEY([category_id])
REFERENCES [dbo].[categories] ([id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[subcategories] CHECK CONSTRAINT [fk_subcategories_category]
GO
ALTER TABLE [dbo].[Tables]  WITH CHECK ADD  CONSTRAINT [FK_Table_ToTable] FOREIGN KEY([AWBId])
REFERENCES [dbo].[ConsignmentMasters] ([AWB_No])
GO
ALTER TABLE [dbo].[Tables] CHECK CONSTRAINT [FK_Table_ToTable]
GO
ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD  CONSTRAINT [FK_Transactions_Occupancy] FOREIGN KEY([OccupancyId])
REFERENCES [dbo].[Occupancy] ([Id])
GO
ALTER TABLE [dbo].[Transactions] CHECK CONSTRAINT [FK_Transactions_Occupancy]
GO
ALTER TABLE [dbo].[Transactions]  WITH CHECK ADD  CONSTRAINT [FK_Transactions_ToTable] FOREIGN KEY([TransactionTypeId])
REFERENCES [dbo].[TransactionType] ([Id])
GO
ALTER TABLE [dbo].[Transactions] CHECK CONSTRAINT [FK_Transactions_ToTable]
GO
ALTER TABLE [dbo].[UserRole]  WITH CHECK ADD  CONSTRAINT [FK_UserRole_ToRoleDetail] FOREIGN KEY([RoleId])
REFERENCES [dbo].[RoleDetail] ([Id])
GO
ALTER TABLE [dbo].[UserRole] CHECK CONSTRAINT [FK_UserRole_ToRoleDetail]
GO
ALTER TABLE [dbo].[UserRole]  WITH CHECK ADD  CONSTRAINT [FK_UserRole_ToUser] FOREIGN KEY([UserId])
REFERENCES [dbo].[User] ([Id])
GO
ALTER TABLE [dbo].[UserRole] CHECK CONSTRAINT [FK_UserRole_ToUser]
GO
/****** Object:  StoredProcedure [dbo].[sp_GetMonthlyBillingReport]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- Stored Procedure: Get Monthly Billing Report
-- =====================================================
CREATE   PROCEDURE [dbo].[sp_GetMonthlyBillingReport]
    @BillingYear INT,
    @BillingMonth INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Overall summary
    SELECT 
        @BillingMonth as BillingMonth,
        @BillingYear as BillingYear,
        CONCAT(@BillingMonth, '/', @BillingYear) as BillingPeriod,
        COUNT(DISTINCT tsc.[RoomId]) as RoomsWithCharges,
        COUNT(DISTINCT tsc.[ServiceId]) as ServicesInvoiced,
        COUNT(DISTINCT tsc.[TenantId]) as TenantsCharged,
        SUM(tsc.[TotalUnitsForRoom]) as TotalUnitsConsumed,
        CAST(AVG(tsc.[ProRataPercentage]) AS DECIMAL(5, 2)) as AvgOccupancyPercentage,
        SUM(tsc.[TotalCharge]) as TotalChargeAmount,
        @@DATEFIRST as DateFirstDayOfWeek
    FROM [dbo].[TenantServiceCharges] tsc
    WHERE tsc.[BillingYear] = @BillingYear
        AND tsc.[BillingMonth] = @BillingMonth;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_GetPreviousMonthEndingReading]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Stored Procedure to get previous month's ending meter reading for a service allocation
CREATE   PROCEDURE [dbo].[sp_GetPreviousMonthEndingReading]
    @ServiceAllocId INT,
    @CurrentMonth INT,
    @CurrentYear INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Calculate previous month
    DECLARE @PreviousMonth INT = CASE WHEN @CurrentMonth = 1 THEN 12 ELSE @CurrentMonth - 1 END;
    DECLARE @PreviousYear INT = CASE WHEN @CurrentMonth = 1 THEN @CurrentYear - 1 ELSE @CurrentYear END;

    -- Get the last reading of the previous month
    SELECT TOP 1 
        [EndingMeterReading],
        [ReadingTakenDate]
    FROM [dbo].[ServiceConsumptionDetails]
    WHERE [ServiceAllocId] = @ServiceAllocId
        AND YEAR([ReadingTakenDate]) = @PreviousYear
        AND MONTH([ReadingTakenDate]) = @PreviousMonth
    ORDER BY [ReadingTakenDate] DESC;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_GetServiceAllocationsForReading]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Stored Procedure to get service allocations with search capability
CREATE   PROCEDURE [dbo].[sp_GetServiceAllocationsForReading]
    @SearchTerm NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        sra.[Id],
        sra.[ServiceId],
        sra.[RoomId],
        sd.[ConsumerNo],
        sd.[ConsumerName],
        sd.[MeterNo],
        rd.[Number] as [RoomNumber],
        CONCAT(rd.[Number], ' - ', sd.[ConsumerName], ' (', sd.[ConsumerNo], ')') as [DisplayName]
    FROM [dbo].[ServiceRoomAllocation] sra
    INNER JOIN [dbo].[ServiceDetails] sd ON sra.[ServiceId] = sd.[Id]
    INNER JOIN [dbo].[RoomDetail] rd ON sra.[RoomId] = rd.[Id]
    WHERE (@SearchTerm IS NULL 
        OR rd.[Number] LIKE '%' + @SearchTerm + '%'
        OR sd.[ConsumerName] LIKE '%' + @SearchTerm + '%'
        OR sd.[ConsumerNo] LIKE '%' + @SearchTerm + '%')
    ORDER BY rd.[Number] ASC, sd.[ConsumerName] ASC;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_GetTenantChargesForMonth]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- Stored Procedure: Get Tenant Charges for Month/Year
-- =====================================================
CREATE   PROCEDURE [dbo].[sp_GetTenantChargesForMonth]
    @BillingYear INT,
    @BillingMonth INT,
    @TenantId INT = NULL,
    @RoomId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        tsc.[Id],
        tsc.[ServiceConsumptionId],
        tsc.[TenantId],
        t.[Name] as TenantName,
        t.[Phone] as TenantPhone,
        tsc.[RoomId],
        rd.[Number] as RoomNumber,
        tsc.[ServiceId],
        sd.[ConsumerName] as ServiceName,
        sd.[MeterNo],
        tsc.[BillingMonth],
        tsc.[BillingYear],
        CONCAT(tsc.[BillingMonth], '/', tsc.[BillingYear]) as BillingPeriod,
        tsc.[TotalUnitsForRoom],
        tsc.[ProRataUnits],
        tsc.[ProRataPercentage],
        tsc.[ChargePerUnit],
        tsc.[TotalCharge],
        CAST(tsc.[CheckInDate] AS DATE) as CheckInDate,
        CAST(tsc.[CheckOutDate] AS DATE) as CheckOutDate,
        tsc.[OccupancyDaysInMonth],
        tsc.[TotalDaysInMonth],
        tsc.[Status],
        tsc.[CreatedDate],
        tsc.[UpdatedDate]
    FROM [dbo].[TenantServiceCharges] tsc
    INNER JOIN [dbo].[Tenant] t ON tsc.[TenantId] = t.[Id]
    INNER JOIN [dbo].[RoomDetail] rd ON tsc.[RoomId] = rd.[Id]
    INNER JOIN [dbo].[ServiceDetails] sd ON tsc.[ServiceId] = sd.[Id]
    WHERE tsc.[BillingYear] = @BillingYear
        AND tsc.[BillingMonth] = @BillingMonth
        AND (@TenantId IS NULL OR tsc.[TenantId] = @TenantId)
        AND (@RoomId IS NULL OR tsc.[RoomId] = @RoomId)
    ORDER BY tsc.[RoomId], tsc.[TenantId];
END
GO
/****** Object:  StoredProcedure [dbo].[sp_GetTenantMonthlyBill]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- Stored Procedure: Get Tenant Monthly Bill
-- =====================================================
CREATE   PROCEDURE [dbo].[sp_GetTenantMonthlyBill]
    @TenantId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        t.[Id],
        LTRIM(RTRIM(t.[Name])) as TenantName,
        LTRIM(RTRIM(t.[Phone])) as TenantPhone,
        tsc.[BillingMonth],
        tsc.[BillingYear],
        CONCAT(tsc.[BillingMonth], '/', tsc.[BillingYear]) as BillingPeriod,
        LTRIM(RTRIM(rd.[Number])) as RoomNumber,
        sd.[ConsumerName] as ServiceName,
        sd.[MeterNo],
        tsc.[TotalUnitsForRoom],
        tsc.[ProRataUnits],
        tsc.[ProRataPercentage],
        tsc.[ChargePerUnit],
        tsc.[TotalCharge],
        tsc.[OccupancyDaysInMonth],
        tsc.[TotalDaysInMonth],
        tsc.[Status]
    FROM [dbo].[TenantServiceCharges] tsc
    INNER JOIN [dbo].[Tenant] t ON tsc.[TenantId] = t.[Id]
    INNER JOIN [dbo].[RoomDetail] rd ON tsc.[RoomId] = rd.[Id]
    INNER JOIN [dbo].[ServiceDetails] sd ON tsc.[ServiceId] = sd.[Id]
    WHERE tsc.[TenantId] = @TenantId
    ORDER BY tsc.[BillingYear] DESC, tsc.[BillingMonth] DESC;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_RecalculateMonthlyCharges]    Script Date: 8/17/2026 12:56:30 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =====================================================
-- Stored Procedure: Recalculate All Charges for Month
-- =====================================================
CREATE   PROCEDURE [dbo].[sp_RecalculateMonthlyCharges]
    @BillingYear INT,
    @BillingMonth INT,
    @ChargePerUnit MONEY = 15.00
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ServiceConsumptionId INT;
    DECLARE @ServiceCursor CURSOR;
    
    BEGIN TRY
        -- Get all service consumption records for the month
        SET @ServiceCursor = CURSOR FOR
        SELECT DISTINCT scd.[Id]
        FROM [dbo].[ServiceConsumptionDetails] scd
        WHERE YEAR(scd.[ReadingTakenDate]) = @BillingYear
            AND MONTH(scd.[ReadingTakenDate]) = @BillingMonth;
        
        OPEN @ServiceCursor;
        FETCH NEXT FROM @ServiceCursor INTO @ServiceConsumptionId;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            EXEC [dbo].[sp_CalculateProRataCharges] 
                @ServiceConsumptionId = @ServiceConsumptionId,
                @ChargePerUnit = @ChargePerUnit;
            
            FETCH NEXT FROM @ServiceCursor INTO @ServiceConsumptionId;
        END;
        
        CLOSE @ServiceCursor;
        DEALLOCATE @ServiceCursor;
        
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('global', '@ServiceCursor') >= -1
        BEGIN
            CLOSE @ServiceCursor;
            DEALLOCATE @ServiceCursor;
        END
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 50001, @ErrorMessage, 1;
    END CATCH;
END
GO
ALTER DATABASE [mansion] SET  READ_WRITE 
GO
