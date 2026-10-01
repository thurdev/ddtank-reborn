-- SQL_STORED_PROCEDURE dbo.SP_UserMatch_Add (modified 2022-08-05T23:09:14.457)





CREATE PROCEDURE [dbo].[SP_UserMatch_Add]			
            @ID int output
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
BEGIN
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_User_Match_Info]
           ([UserID]
           ,[dailyScore]
           ,[dailyWinCount]
           ,[dailyGameCount]
           ,[DailyLeagueFirst]
           ,[DailyLeagueLastScore]
           ,[weeklyScore]
           ,[weeklyGameCount]
           ,[weeklyRanking]
           ,[addDayPrestge]
           ,[totalPrestige]
           ,[restCount]
		   ,[leagueGrade]
		   ,[leagueItemsGet]
		   ,[WeeklyWinCount])
     VALUES
           (@UserID
           ,@dailyScore
           ,@dailyWinCount
           ,@dailyGameCount
           ,@DailyLeagueFirst
           ,@DailyLeagueLastScore
           ,@weeklyScore
           ,@weeklyGameCount
           ,@weeklyRanking
           ,@addDayPrestge
           ,@totalPrestige
           ,@restCount
		   ,@leagueGrade
		   ,@leagueItemsGet
		   ,@WeeklyWinCount)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END










GO
