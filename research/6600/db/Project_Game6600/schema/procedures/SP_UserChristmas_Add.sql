-- SQL_STORED_PROCEDURE dbo.SP_UserChristmas_Add (modified 2015-01-25T14:04:48.243)
CREATE PROCEDURE [dbo].[SP_UserChristmas_Add]			
            @ID int output
           ,@UserID int
           ,@exp int
           ,@awardState int
           ,@count int
           ,@packsNumber int
           ,@lastPacks int
           ,@gameBeginTime datetime
           ,@gameEndTime datetime
           ,@isEnter bit
           ,@dayPacks int
           ,@AvailTime int
AS
BEGIN
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_Users_Christmas]
           ([UserID]
           ,[exp]
           ,[awardState]
           ,[count]
           ,[packsNumber]
           ,[lastPacks]
           ,[gameBeginTime]
           ,[gameEndTime]
           ,[isEnter]
           ,[dayPacks]
           ,[AvailTime])
     VALUES
           (@UserID
           ,@exp
           ,@awardState
           ,@count
           ,@packsNumber
           ,@lastPacks
           ,@gameBeginTime
           ,@gameEndTime
           ,@isEnter
           ,@dayPacks
           ,@AvailTime)
           
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
