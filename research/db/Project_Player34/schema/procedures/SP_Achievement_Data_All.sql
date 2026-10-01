-- SQL_STORED_PROCEDURE dbo.SP_Achievement_Data_All (modified 2021-06-04T05:18:34.377)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Achievement_Data_All]
		@UserID int
AS  
 select *  from  dbo.AchievementData where [UserID] = @UserID










GO
