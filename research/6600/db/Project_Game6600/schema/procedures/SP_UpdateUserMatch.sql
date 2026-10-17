-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserMatch (modified 2015-01-25T14:04:48.217)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateUserMatch] 
			@ID int
		   ,@UserID int
           ,@dailyScore int
           ,@dailyWinCount int
           ,@dailyGameCount int
           ,@DailyLeagueFirst bit
           ,@DailyLeagueLastScore int
           ,@weeklyScore int
           ,@weeklyGameCount int
           ,@weeklyRanking int
           ,@addDayPrestge int
           ,@totalPrestige int
           ,@restCount int
                      
 AS    
   begin 
UPDATE [dbo].[Sys_User_Match_Info]
   SET [dailyScore] = @dailyScore
      ,[dailyWinCount] = @dailyWinCount
      ,[dailyGameCount] = @dailyGameCount
      ,[DailyLeagueFirst] = @DailyLeagueFirst
      ,[DailyLeagueLastScore] = @DailyLeagueLastScore
      ,[weeklyScore] = @weeklyScore
      ,[weeklyGameCount] = @weeklyGameCount
      ,[weeklyRanking] = @weeklyRanking
      ,[addDayPrestge] = @addDayPrestge
      ,[totalPrestige] = @totalPrestige
      ,[restCount] = @restCount
 WHERE [UserID] = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end

GO
