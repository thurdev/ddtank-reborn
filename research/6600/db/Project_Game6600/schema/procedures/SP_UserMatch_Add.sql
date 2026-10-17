-- SQL_STORED_PROCEDURE dbo.SP_UserMatch_Add (modified 2015-01-25T14:04:48.293)
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
           ,[restCount])
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
           ,@restCount)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
