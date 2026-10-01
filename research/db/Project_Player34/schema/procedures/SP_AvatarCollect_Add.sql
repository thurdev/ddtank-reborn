-- SQL_STORED_PROCEDURE dbo.SP_AvatarCollect_Add (modified 2022-03-05T10:01:52.027)
CREATE PROCEDURE [dbo].[SP_AvatarCollect_Add]			
            @ID int output
           ,@UserID int
           ,@AvatarID int
           ,@Sex int
           ,@IsActive bit
           ,@Data nvarchar(500)
           ,@TimeStart datetime
           ,@TimeEnd datetime
           ,@IsExit bit
AS
BEGIN
	DELETE FROM [dbo].[Sys_Users_AvatarCollection] WHERE UserID = @UserID AND AvatarID = @AvatarID
    -- Insert statements for procedure here
    INSERT INTO [dbo].[Sys_Users_AvatarCollection]
           ([UserID]
           ,[AvatarID]
           ,[Sex]
           ,[IsActive]
           ,[Data]
           ,[TimeStart]
           ,[TimeEnd]
           ,[IsExit])
     VALUES
           (@UserID
           ,@AvatarID
           ,@Sex
           ,@IsActive
           ,@Data
           ,@TimeStart
           ,@TimeEnd
           ,@IsExit)
	select @@identity as 'identity'
    set @ID=@@identity 
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
