-- SQL_STORED_PROCEDURE dbo.SP_UpdateFriendHelpTimes (modified 2015-01-25T14:04:48.227)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：更新人物物品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UpdateFriendHelpTimes] 
			@UserID int                      
 AS    
 Declare @treasureAdd Int
 Declare @friendHelpTimes Int
 Select @friendHelpTimes = [friendHelpTimes], @treasureAdd = [treasureAdd] From [dbo].Sys_User_Treasure Where [UserID] = @UserID
 
if(@friendHelpTimes < 5)
begin   
	set @friendHelpTimes= @friendHelpTimes + 1
	if(@friendHelpTimes = 5 and @treasureAdd = 0)
	begin
		set @treasureAdd = @treasureAdd + 1
	end
	--begin
	UPDATE [dbo].[Sys_User_Treasure]
	SET [friendHelpTimes] = @friendHelpTimes, [treasureAdd] = @treasureAdd WHERE [UserID] = @UserID
	return 0 
    --end   
end
if(@@error <> 0)
begin
 return 1 
end

GO
