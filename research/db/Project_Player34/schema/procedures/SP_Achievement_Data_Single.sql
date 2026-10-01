-- SQL_STORED_PROCEDURE dbo.SP_Achievement_Data_Single (modified 2021-06-04T05:18:34.380)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<日常奖励>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Achievement_Data_Single]
		@UserID int,
		@AchievementID int
AS  
 select *  from  dbo.AchievementData where [UserID] = @UserID AND [AchievementID] = @AchievementID










GO
