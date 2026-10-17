-- SQL_STORED_PROCEDURE dbo.Sp_LOG_EXPOTER_PAYMENTS (modified 2012-04-21T07:53:24.780)
-- =============================================
-- Author:		Able
-- Create date: 2010.03.06
-- Description:	for log expoter on payment log
-- =============================================
CREATE PROCEDURE [dbo].[Sp_LOG_EXPOTER_PAYMENTS]
	@date	datetime=null
AS
BEGIN

set @date = ISNULL(@date,GETDATE())

declare @appid int
declare @subid int
SELECT @appid=[ApplicationId],@subid=[SubId] FROM [Db_Count].[dbo].[Count_Application_Sub]

SELECT @appid AS ApplicationId
	  ,@subid AS SubId
	  ,0 AS ChannelId
	  ,[Date]
      ,[UserName]
	  ,[CanUse]
      ,[Money] 
      ,[PayWay]
      ,[NeedMoney]
FROM [Db_Tank].[dbo].[Charge_Money]
WHERE DATEDIFF(DAY,[Date],@date)=0
ORDER BY [Date] DESC

END


GO
