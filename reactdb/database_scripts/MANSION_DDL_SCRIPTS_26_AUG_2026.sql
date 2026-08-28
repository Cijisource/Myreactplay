/****** Object:  StoredProcedure [dbo].[sp_RecalculateMonthlyCharges]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP PROCEDURE IF EXISTS [dbo].[sp_RecalculateMonthlyCharges]
GO
/****** Object:  StoredProcedure [dbo].[sp_GetTenantMonthlyBill]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP PROCEDURE IF EXISTS [dbo].[sp_GetTenantMonthlyBill]
GO
/****** Object:  StoredProcedure [dbo].[sp_GetTenantChargesForMonth]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP PROCEDURE IF EXISTS [dbo].[sp_GetTenantChargesForMonth]
GO
/****** Object:  StoredProcedure [dbo].[sp_GetServiceAllocationsForReading]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP PROCEDURE IF EXISTS [dbo].[sp_GetServiceAllocationsForReading]
GO
/****** Object:  StoredProcedure [dbo].[sp_GetPreviousMonthEndingReading]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP PROCEDURE IF EXISTS [dbo].[sp_GetPreviousMonthEndingReading]
GO
/****** Object:  StoredProcedure [dbo].[sp_GetMonthlyBillingReport]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP PROCEDURE IF EXISTS [dbo].[sp_GetMonthlyBillingReport]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserRole]') AND type in (N'U'))
ALTER TABLE [dbo].[UserRole] DROP CONSTRAINT IF EXISTS [FK_UserRole_ToUser]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserRole]') AND type in (N'U'))
ALTER TABLE [dbo].[UserRole] DROP CONSTRAINT IF EXISTS [FK_UserRole_ToRoleDetail]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Transactions]') AND type in (N'U'))
ALTER TABLE [dbo].[Transactions] DROP CONSTRAINT IF EXISTS [FK_Transactions_ToTable]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Transactions]') AND type in (N'U'))
ALTER TABLE [dbo].[Transactions] DROP CONSTRAINT IF EXISTS [FK_Transactions_Occupancy]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Tables]') AND type in (N'U'))
ALTER TABLE [dbo].[Tables] DROP CONSTRAINT IF EXISTS [FK_Table_ToTable]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[subcategories]') AND type in (N'U'))
ALTER TABLE [dbo].[subcategories] DROP CONSTRAINT IF EXISTS [fk_subcategories_category]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[shipping_zones]') AND type in (N'U'))
ALTER TABLE [dbo].[shipping_zones] DROP CONSTRAINT IF EXISTS [FK_shipping_zones_User_seller_id]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ServiceRoomAllocation]') AND type in (N'U'))
ALTER TABLE [dbo].[ServiceRoomAllocation] DROP CONSTRAINT IF EXISTS [FK_ServiceRoomAllocation_ServiceDetails]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ServiceRoomAllocation]') AND type in (N'U'))
ALTER TABLE [dbo].[ServiceRoomAllocation] DROP CONSTRAINT IF EXISTS [FK_ServiceRoomAllocation_RoomDetail]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ServiceConsumptionDetails]') AND type in (N'U'))
ALTER TABLE [dbo].[ServiceConsumptionDetails] DROP CONSTRAINT IF EXISTS [FK_ServiceConsumptionDetails_ToTable]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reward_transactions]') AND type in (N'U'))
ALTER TABLE [dbo].[reward_transactions] DROP CONSTRAINT IF EXISTS [fk_reward_transactions_order]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RentalCollection]') AND type in (N'U'))
ALTER TABLE [dbo].[RentalCollection] DROP CONSTRAINT IF EXISTS [FK_RentalCollection_Transactions]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RentalCollection]') AND type in (N'U'))
ALTER TABLE [dbo].[RentalCollection] DROP CONSTRAINT IF EXISTS [FK_RentalCollection_ToOccupancy]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RentalCollection]') AND type in (N'U'))
ALTER TABLE [dbo].[RentalCollection] DROP CONSTRAINT IF EXISTS [FK_RentalCollection_CollectionVerification]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND type in (N'U'))
ALTER TABLE [dbo].[products] DROP CONSTRAINT IF EXISTS [fk_products_subcategory]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND type in (N'U'))
ALTER TABLE [dbo].[products] DROP CONSTRAINT IF EXISTS [fk_products_seller]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[order_discounts]') AND type in (N'U'))
ALTER TABLE [dbo].[order_discounts] DROP CONSTRAINT IF EXISTS [fk_order_discounts_order]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[order_discounts]') AND type in (N'U'))
ALTER TABLE [dbo].[order_discounts] DROP CONSTRAINT IF EXISTS [fk_order_discounts_discount]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Occupancy]') AND type in (N'U'))
ALTER TABLE [dbo].[Occupancy] DROP CONSTRAINT IF EXISTS [FK_Occupancy_Transactions]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Occupancy]') AND type in (N'U'))
ALTER TABLE [dbo].[Occupancy] DROP CONSTRAINT IF EXISTS [FK_Occupancy_Tenant]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Occupancy]') AND type in (N'U'))
ALTER TABLE [dbo].[Occupancy] DROP CONSTRAINT IF EXISTS [FK_Occupancy_RoomDetail]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Occupancy]') AND type in (N'U'))
ALTER TABLE [dbo].[Occupancy] DROP CONSTRAINT IF EXISTS [FK_Occupancy_CollectionVerification]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EBServicePayments]') AND type in (N'U'))
ALTER TABLE [dbo].[EBServicePayments] DROP CONSTRAINT IF EXISTS [FK_EBServicePayments_Service]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DailyRoomStatusMedia]') AND type in (N'U'))
ALTER TABLE [dbo].[DailyRoomStatusMedia] DROP CONSTRAINT IF EXISTS [FK_DailyRoomStatusMedia_DailyRoomStatus]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DailyGuestCheckIn]') AND type in (N'U'))
ALTER TABLE [dbo].[DailyGuestCheckIn] DROP CONSTRAINT IF EXISTS [FK_DailyGuestCheckIn_DailyRoomStatus]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Complains]') AND type in (N'U'))
ALTER TABLE [dbo].[Complains] DROP CONSTRAINT IF EXISTS [FK_Complains_ToTable]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Complains]') AND type in (N'U'))
ALTER TABLE [dbo].[Complains] DROP CONSTRAINT IF EXISTS [FK_Complains_ToStatus]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Complains]') AND type in (N'U'))
ALTER TABLE [dbo].[Complains] DROP CONSTRAINT IF EXISTS [FK_Complains_ToRoomDetail]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CollectionReminder]') AND type in (N'U'))
ALTER TABLE [dbo].[CollectionReminder] DROP CONSTRAINT IF EXISTS [FK_CollectionReminder_Occupancy]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[wishlist]') AND type in (N'U'))
ALTER TABLE [dbo].[wishlist] DROP CONSTRAINT IF EXISTS [DF__wishlist__create__7BB05806]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TenantServiceCharges]') AND type in (N'U'))
ALTER TABLE [dbo].[TenantServiceCharges] DROP CONSTRAINT IF EXISTS [DF__TenantSer__Statu__731B1205]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TenantServiceCharges]') AND type in (N'U'))
ALTER TABLE [dbo].[TenantServiceCharges] DROP CONSTRAINT IF EXISTS [DF__TenantSer__Creat__7226EDCC]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[subcategories]') AND type in (N'U'))
ALTER TABLE [dbo].[subcategories] DROP CONSTRAINT IF EXISTS [DF__subcatego__updat__1940BAED]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[subcategories]') AND type in (N'U'))
ALTER TABLE [dbo].[subcategories] DROP CONSTRAINT IF EXISTS [DF__subcatego__creat__184C96B4]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[shipping_zones]') AND type in (N'U'))
ALTER TABLE [dbo].[shipping_zones] DROP CONSTRAINT IF EXISTS [DF__shipping___updat__53A266AC]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[shipping_zones]') AND type in (N'U'))
ALTER TABLE [dbo].[shipping_zones] DROP CONSTRAINT IF EXISTS [DF__shipping___creat__52AE4273]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[shipping_zones]') AND type in (N'U'))
ALTER TABLE [dbo].[shipping_zones] DROP CONSTRAINT IF EXISTS [DF__shipping___is_ac__51BA1E3A]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ServiceConsumptionDetails]') AND type in (N'U'))
ALTER TABLE [dbo].[ServiceConsumptionDetails] DROP CONSTRAINT IF EXISTS [DF__ServiceCo__IsAut__0C1BC9F9]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ServiceConsumptionDetails]') AND type in (N'U'))
ALTER TABLE [dbo].[ServiceConsumptionDetails] DROP CONSTRAINT IF EXISTS [DF__ServiceCo__UnitR__06CD04F7]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ServiceConsumptionDetails]') AND type in (N'U'))
ALTER TABLE [dbo].[ServiceConsumptionDetails] DROP CONSTRAINT IF EXISTS [DF__ServiceCo__Amoun__05D8E0BE]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RoomDetail]') AND type in (N'U'))
ALTER TABLE [dbo].[RoomDetail] DROP CONSTRAINT IF EXISTS [DF__tmp_ms_xx___Beds__5FB337D6]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reward_transactions]') AND type in (N'U'))
ALTER TABLE [dbo].[reward_transactions] DROP CONSTRAINT IF EXISTS [DF__reward_tr__creat__67A95F59]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND type in (N'U'))
ALTER TABLE [dbo].[products] DROP CONSTRAINT IF EXISTS [DF_products_weight_kg]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND type in (N'U'))
ALTER TABLE [dbo].[products] DROP CONSTRAINT IF EXISTS [DF__products__is_pre__119F9925]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
ALTER TABLE [dbo].[orders] DROP CONSTRAINT IF EXISTS [DF__orders__loyalty___6F4A8121]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
ALTER TABLE [dbo].[orders] DROP CONSTRAINT IF EXISTS [DF__orders__loyalty___6E565CE8]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
ALTER TABLE [dbo].[orders] DROP CONSTRAINT IF EXISTS [DF__orders__discount__3F9B6DFF]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
ALTER TABLE [dbo].[orders] DROP CONSTRAINT IF EXISTS [DF__orders__shipping__370627FE]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
ALTER TABLE [dbo].[orders] DROP CONSTRAINT IF EXISTS [DF__orders__gst_amou__361203C5]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[orders]') AND type in (N'U'))
ALTER TABLE [dbo].[orders] DROP CONSTRAINT IF EXISTS [DF__orders__subtotal__351DDF8C]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[order_discounts]') AND type in (N'U'))
ALTER TABLE [dbo].[order_discounts] DROP CONSTRAINT IF EXISTS [DF__order_dis__appli__6B79F03D]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[discounts]') AND type in (N'U'))
ALTER TABLE [dbo].[discounts] DROP CONSTRAINT IF EXISTS [DF__discounts__updat__5A4F643B]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[discounts]') AND type in (N'U'))
ALTER TABLE [dbo].[discounts] DROP CONSTRAINT IF EXISTS [DF__discounts__creat__595B4002]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[discounts]') AND type in (N'U'))
ALTER TABLE [dbo].[discounts] DROP CONSTRAINT IF EXISTS [DF__discounts__is_ac__58671BC9]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[discounts]') AND type in (N'U'))
ALTER TABLE [dbo].[discounts] DROP CONSTRAINT IF EXISTS [DF__discounts__curre__5772F790]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DailyRoomStatusMedia]') AND type in (N'U'))
ALTER TABLE [dbo].[DailyRoomStatusMedia] DROP CONSTRAINT IF EXISTS [DF__DailyRoom__Uploa__2116E6DF]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DailyGuestCheckIn]') AND type in (N'U'))
ALTER TABLE [dbo].[DailyGuestCheckIn] DROP CONSTRAINT IF EXISTS [DF_DailyGuestCheckIn_DepositAmount]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DailyGuestCheckIn]') AND type in (N'U'))
ALTER TABLE [dbo].[DailyGuestCheckIn] DROP CONSTRAINT IF EXISTS [DF_DailyGuestCheckIn_RentAmount]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DailyGuestCheckIn]') AND type in (N'U'))
ALTER TABLE [dbo].[DailyGuestCheckIn] DROP CONSTRAINT IF EXISTS [DF_DailyGuestCheckIn_CreatedDate]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___updat__64CCF2AE]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___creat__63D8CE75]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___order__62E4AA3C]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___total__61F08603]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___loyal__60FC61CA]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___avail__60083D91]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___redee__5F141958]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[customer_rewards]') AND type in (N'U'))
ALTER TABLE [dbo].[customer_rewards] DROP CONSTRAINT IF EXISTS [DF__customer___total__5E1FF51F]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cities]') AND type in (N'U'))
ALTER TABLE [dbo].[cities] DROP CONSTRAINT IF EXISTS [DF__cities__updated___4CF5691D]
GO
IF  EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[cities]') AND type in (N'U'))
ALTER TABLE [dbo].[cities] DROP CONSTRAINT IF EXISTS [DF__cities__created___4C0144E4]
GO
/****** Object:  Table [dbo].[wishlist]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[wishlist]
GO
/****** Object:  Table [dbo].[UserRole]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[UserRole]
GO
/****** Object:  Table [dbo].[User]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[User]
GO
/****** Object:  Table [dbo].[TransactionType]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[TransactionType]
GO
/****** Object:  Table [dbo].[Transactions]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[Transactions]
GO
/****** Object:  Table [dbo].[TenantServiceCharges]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[TenantServiceCharges]
GO
/****** Object:  Table [dbo].[Tenants]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[Tenants]
GO
/****** Object:  Table [dbo].[Tenant]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[Tenant]
GO
/****** Object:  Table [dbo].[Tables]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[Tables]
GO
/****** Object:  Table [dbo].[Table]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[Table]
GO
/****** Object:  Table [dbo].[subcategories]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[subcategories]
GO
/****** Object:  Table [dbo].[StockDetails]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[StockDetails]
GO
/****** Object:  Table [dbo].[shipping_zones]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[shipping_zones]
GO
/****** Object:  Table [dbo].[ServiceRoomAllocation]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[ServiceRoomAllocation]
GO
/****** Object:  Table [dbo].[ServiceDetails]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[ServiceDetails]
GO
/****** Object:  Table [dbo].[ServiceConsumptionDetails]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[ServiceConsumptionDetails]
GO
/****** Object:  Table [dbo].[search_history]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[search_history]
GO
/****** Object:  Table [dbo].[RoomDetail]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[RoomDetail]
GO
/****** Object:  Table [dbo].[RoleDetail]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[RoleDetail]
GO
/****** Object:  Table [dbo].[reward_transactions]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[reward_transactions]
GO
/****** Object:  Table [dbo].[RentalCollection]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[RentalCollection]
GO
/****** Object:  Table [dbo].[products]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[products]
GO
/****** Object:  Table [dbo].[product_images]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[product_images]
GO
/****** Object:  Table [dbo].[orders]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[orders]
GO
/****** Object:  Table [dbo].[order_items]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[order_items]
GO
/****** Object:  Table [dbo].[order_discounts]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[order_discounts]
GO
/****** Object:  Table [dbo].[Occupancy]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[Occupancy]
GO
/****** Object:  Table [dbo].[EBServicePayments]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[EBServicePayments]
GO
/****** Object:  Table [dbo].[discounts]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[discounts]
GO
/****** Object:  Table [dbo].[DailyRoomStatusMedia]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[DailyRoomStatusMedia]
GO
/****** Object:  Table [dbo].[DailyRoomStatus]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[DailyRoomStatus]
GO
/****** Object:  Table [dbo].[DailyGuestCheckIn]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[DailyGuestCheckIn]
GO
/****** Object:  Table [dbo].[customer_rewards]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[customer_rewards]
GO
/****** Object:  Table [dbo].[ConsignmentMasters]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[ConsignmentMasters]
GO
/****** Object:  Table [dbo].[ConsignmentImport]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[ConsignmentImport]
GO
/****** Object:  Table [dbo].[ComplainType]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[ComplainType]
GO
/****** Object:  Table [dbo].[ComplaintStatus]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[ComplaintStatus]
GO
/****** Object:  Table [dbo].[Complains]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[Complains]
GO
/****** Object:  Table [dbo].[CollectionVerification]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[CollectionVerification]
GO
/****** Object:  Table [dbo].[CollectionReminder]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[CollectionReminder]
GO
/****** Object:  Table [dbo].[cities]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[cities]
GO
/****** Object:  Table [dbo].[categories]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[categories]
GO
/****** Object:  Table [dbo].[cart_items]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[cart_items]
GO
/****** Object:  Table [dbo].[__MigrationHistory]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP TABLE IF EXISTS [dbo].[__MigrationHistory]
GO
/****** Object:  UserDefinedFunction [dbo].[fn_DaysInMonth]    Script Date: 8/26/2026 9:15:38 PM ******/
DROP FUNCTION IF EXISTS [dbo].[fn_DaysInMonth]
GO
/****** Object:  UserDefinedFunction [dbo].[fn_DaysInMonth]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[__MigrationHistory]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[cart_items]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[categories]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[cities]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[CollectionReminder]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[CollectionVerification]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[Complains]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[ComplaintStatus]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[ComplainType]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[ConsignmentImport]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[ConsignmentMasters]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[customer_rewards]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[DailyGuestCheckIn]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[DailyRoomStatus]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[DailyRoomStatusMedia]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[discounts]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[EBServicePayments]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[Occupancy]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[order_discounts]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[order_items]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[orders]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[product_images]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[products]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[RentalCollection]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[reward_transactions]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[RoleDetail]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[RoomDetail]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[search_history]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[ServiceConsumptionDetails]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[ServiceDetails]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[ServiceRoomAllocation]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[shipping_zones]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[StockDetails]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[subcategories]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[Table]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[Tables]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[Tenant]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[Tenants]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[TenantServiceCharges]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[Transactions]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[TransactionType]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[User]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[UserRole]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  Table [dbo].[wishlist]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  StoredProcedure [dbo].[sp_GetMonthlyBillingReport]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  StoredProcedure [dbo].[sp_GetPreviousMonthEndingReading]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  StoredProcedure [dbo].[sp_GetServiceAllocationsForReading]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  StoredProcedure [dbo].[sp_GetTenantChargesForMonth]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  StoredProcedure [dbo].[sp_GetTenantMonthlyBill]    Script Date: 8/26/2026 9:15:38 PM ******/
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
/****** Object:  StoredProcedure [dbo].[sp_RecalculateMonthlyCharges]    Script Date: 8/26/2026 9:15:38 PM ******/
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
