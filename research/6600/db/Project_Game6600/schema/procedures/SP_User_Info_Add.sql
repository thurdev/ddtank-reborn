-- SQL_STORED_PROCEDURE dbo.SP_User_Info_Add (modified 2015-01-25T14:04:48.247)
CREATE PROCEDURE [dbo].[SP_User_Info_Add]

@UserID int,
@UserEmail nvarchar(255),
@UserPhone nvarchar(50),
@UserOther1 nvarchar(50),
@UserOther2 nvarchar(50),
@UserOther3 nvarchar(50)
AS
BEGIN

    -- Insert statements for procedure here
	INSERT INTO [dbo].Sys_User_Info([UserID],[UserEmail],[UserPhone])
     VALUES(@UserId,@UserEmail,@UserPhone)
	if(@@error <> 0)
	begin
	  return 1
	end

END

GO
