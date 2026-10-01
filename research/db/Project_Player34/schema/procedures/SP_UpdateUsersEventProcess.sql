-- SQL_STORED_PROCEDURE dbo.SP_UpdateUsersEventProcess (modified 2021-06-04T05:18:35.923)




-- =============================================
-- Author:		Justin
-- Create date: 2008.11.26
-- Description:	插入用户购买物品信息
-- =============================================
CREATE PROCEDURE [dbo].[SP_UpdateUsersEventProcess]
	@UserID	int,
	@ActiveType int,
	@Conditions int,
	@AwardGot int
AS
BEGIN
	declare @count int 
	select @count = COUNT(UserID) FROM Sys_Users_EventProcess WHERE UserID = @UserID AND ActiveType=@ActiveType
	if @count != 0
	begin
		update Sys_Users_EventProcess SET Conditions=@Conditions, AwardGot=@AwardGot
																WHERE UserID = @UserID AND ActiveType=@ActiveType
	end
	else
	begin
		insert into Sys_Users_EventProcess (UserID,
									ActiveType,
									Conditions,
									AwardGot) VALUES 
									
									(@UserID
									,@ActiveType
									,@Conditions
									,@AwardGot)
	end
	if @@error <> 0
	begin
		return 1
	end
	
	return 0
END






GO
