-- SQL_STORED_PROCEDURE dbo.Sp_LOG_EXPOTER_ONLINES (modified 2012-04-21T07:53:24.793)
-- =============================================
-- Author:		Able
-- Create date: 2010.03.06
-- Description:	for log expoter on online log
-- =============================================
CREATE PROCEDURE [dbo].[Sp_LOG_EXPOTER_ONLINES]
@date	datetime=null
AS
BEGIN

set @date = ISNULL(@date,GETDATE())

declare @appid int
declare @subid int
SELECT @appid=[ApplicationId],@subid=[SubId] FROM [Db_Count].[dbo].[Count_Application_Sub]

SELECT @appid AS ApplicationId
	  ,@subid AS SubId
	  ,0 AS [ChannelId]
      ,[EnterTime]
      ,[Online]
      ,[Reg]
FROM [Db_Logs].[dbo].[Log_Server]
WHERE DATEDIFF(DAY,[EnterTime],@date)=0
ORDER BY [EnterTime] DESC

END






GO
