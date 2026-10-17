-- SQL_STORED_PROCEDURE dbo.SP_DailyLogList_Update (modified 2015-01-25T14:04:48.533)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_DailyLogList_Update] 
@UserID int,
@UserAwardLog int,
@DayLog nvarchar(2000),
@LastDate datetime
AS  
UPDATE [dbo].[DailyLogList]
   SET [UserID] = @UserID
      ,[UserAwardLog] = @UserAwardLog
      ,[DayLog] = @DayLog
      ,[LastDate] = @LastDate
 WHERE [UserID] =@UserID

GO
