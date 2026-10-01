-- SQL_STORED_PROCEDURE dbo.SP_AvatarCollect_Update (modified 2022-03-05T10:01:52.040)
CREATE PROCEDURE [dbo].[SP_AvatarCollect_Update]			
            @ID int
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
    -- Insert statements for procedure here
    UPDATE [dbo].[Sys_Users_AvatarCollection]
    SET
		 UserID = @UserID
		,AvatarID = @AvatarID
		,Sex = @Sex
		,IsActive = @IsActive
		,Data = @Data
		,TimeStart = @TimeStart
		,TimeEnd = @TimeEnd
		,IsExit = @IsExit
	WHERE
		ID = @ID
	
	return 0
	
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
