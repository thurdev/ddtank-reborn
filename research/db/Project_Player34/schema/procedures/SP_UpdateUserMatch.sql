-- SQL_STORED_PROCEDURE dbo.SP_UpdateUserMatch (modified 2022-08-05T23:10:23.697)




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
		   ,@leagueGrade int
		   ,@leagueItemsGet int
		   ,@WeeklyWinCount int
                      
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
	  ,[leagueGrade] = @leagueGrade
	  ,[leagueItemsGet] = @leagueItemsGet
	  ,[WeeklyWinCount] = @WeeklyWinCount
 WHERE [UserID] = @UserID

UPDATE [dbo].[Sys_Users_Detail]
   SET [AddWeekLeagueScore] = @weeklyScore
      ,[WeekLeagueRanking] = @weeklyRanking
   WHERE UserID = @UserID

   return 0
   end
if(@@error <> 0)
begin
 return 1 
end











GO
