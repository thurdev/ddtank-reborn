-- SQL_STORED_PROCEDURE dbo.SP_Users_UserDrill_Add (modified 2015-01-25T14:04:48.390)
CREATE PROCEDURE [dbo].[SP_Users_UserDrill_Add]
            --@ID int output 
		    @UserID int
           ,@BeadPlace int
           ,@HoleExp int
           ,@HoleLv int 
           ,@DrillPlace int            
           
AS
BEGIN

    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_User_Drills]
           ([UserID]
           ,[BeadPlace]
           ,[HoleExp]
           ,[HoleLv]
           ,[DrillPlace])
     VALUES
           (@UserID
           ,@BeadPlace
           ,@HoleExp
           ,@HoleLv
           ,@DrillPlace)
    --select @@identity as 'identity'
    --set @ID=@@identity    
	if(@@error <> 0)
	begin
	  return 1
	end
END

GO
