-- SQL_STORED_PROCEDURE dbo.SP_User_Avatar_Colection_Add (modified 2015-01-25T14:04:48.253)
CREATE PROCEDURE [dbo].[SP_User_Avatar_Colection_Add]			
            @ID int output
		   ,@UserID int
           ,@endTime datetime
           ,@dataId int
           ,@ActiveCount int
           ,@Sex int
AS
BEGIN    
    INSERT INTO [dbo].[User_Avatar_Colection]
           ([UserID]
           ,[endTime]
           ,[dataId]
           ,[ActiveCount]
           ,[Sex])
     VALUES
           (@UserID
           ,@endTime
           ,@dataId
           ,@ActiveCount
           ,@Sex)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
