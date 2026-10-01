-- SQL_STORED_PROCEDURE dbo.SP_DailyLogList_Single (modified 2021-06-04T05:18:35.280)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<防沉迷：查询一条用户身份信息>
-- =============================================
CREATE PROCEDURE [dbo].[SP_DailyLogList_Single]
@UserID int
 AS
select * from DailyLogList where  UserID = @UserID

GO
