-- SQL_STORED_PROCEDURE dbo.SP_Tank_All (modified 2015-01-25T14:04:48.830)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_Tank_All]
	-- Add the parameters for the stored procedure here
	
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements
exec SP_Sys_Clear_All
Truncate table [dbo].[Sys_User_Detail]
Truncate table [dbo].[Sys_User_Info]
Truncate table [dbo].[Sys_User_Goods]
Truncate table [dbo].[Sys_User_Order]
END

GO
