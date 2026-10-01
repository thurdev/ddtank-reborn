-- SQL_STORED_PROCEDURE dbo.SP_UserLeague_Add (modified 2022-05-09T05:51:20.723)

CREATE PROCEDURE [dbo].SP_UserLeague_Add			
            @ID int output
           ,@UserID int
           ,@RankID int
           ,@Point int
           ,@Win int
           ,@Lose int
           ,@IsBanned BIT
           ,@ForbidDate DATETIME
           ,@ForbidReason NVARCHAR(500)
AS
BEGIN    
    INSERT INTO [dbo].Sys_Users_League
           ([UserID]
           ,[RankID]
           ,[Point]
           ,[Win]
           ,[Lose]
           ,[IsBanned]
           ,[ForbidDate]
           ,[ForbidReason])
     VALUES
           (@UserID
           ,@RankID
           ,@Point
           ,@Win
           ,@Lose
           ,@IsBanned
           ,@ForbidDate
           ,@ForbidReason)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
